# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (85.707 ms, trace `8b08ac8d2ac7d268000000000000013e`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (67.767 ms, trace `8b08ac8d2ac7d2680000000000000171`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (31.162 ms, trace `8b08ac8d2ac7d26800000000000000f4`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (46.937 ms, trace `8b08ac8d2ac7d268000000000000021b`); `gw-w/thread-45/gateway.admitted-work` (54.362 ms, trace `8b08ac8d2ac7d2680000000000000167`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-scheduler-a-3-baseline`; source `236dd70bf8077ee0a91acba63376db723e078306`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8288644.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 199 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13397.018 | 253.288 | 3.954 | 454 |
| L1 | 0 | 19974.967 | 338.636 | 9.192 | 668 |
| L4 | 0 | 19299.736 | 309.519 | 17.805 | 625 |
| L16 | 0 | 19479.468 | 313.440 | 12.419 | 686 |
| L64 | 0 | 19792.749 | 450.691 | 12.207 | 847 |
| L256 | 0 | 19963.210 | 311.161 | 10.436 | 708 |
| L1024 | 0 | 19979.462 | 3122.766 | 23.562 | 16968 |
| tail | 0 | 64628.424 | 9725.262 | 72.739 | 52968 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 8b08ac8d2ac7d268000000000000013e | driver.queue.scheduler-dispatch | 0.059 | none | 0 / 32 |
| 8b08ac8d2ac7d268000000000000013e | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 8b08ac8d2ac7d268000000000000013e waited: []

| 8b08ac8d2ac7d2680000000000000171 | driver.queue.scheduler-dispatch | 0.054 | none | 0 / 32 |
| 8b08ac8d2ac7d2680000000000000171 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 8b08ac8d2ac7d2680000000000000171 waited: []

| 8b08ac8d2ac7d26800000000000000f4 | driver.queue.scheduler-dispatch | 0.068 | none | 0 / 32 |
| 8b08ac8d2ac7d26800000000000000f4 | driver.queue.scheduler-late | 0.012 | none | 0 / 32 |

Observed active steps while trace 8b08ac8d2ac7d26800000000000000f4 waited: []

| 8b08ac8d2ac7d268000000000000021b | driver.queue.scheduler-dispatch | 0.088 | none | 0 / 32 |
| 8b08ac8d2ac7d268000000000000021b | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 8b08ac8d2ac7d268000000000000021b waited: []

| 8b08ac8d2ac7d2680000000000000167 | driver.queue.scheduler-dispatch | 0.169 | none | 0 / 32 |
| 8b08ac8d2ac7d2680000000000000167 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace 8b08ac8d2ac7d2680000000000000167 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.101 | 0.266 | 0.000 | 0.572 | 4.603 | 0.503 | 0.000 | 0.136 | 1.367 | 6.216 | 0.045 | n/a | 0.395 | 15.272 | n/a | n/a | 0.031 | 5.132 | 0.173 | 0.031 |
| p99 | 78.742 | 3.000 | 0.000 | 2.876 | 20.030 | n/a | 2.992 | 1.042 | 3.738 | 22.988 | 0.133 | n/a | 4.512 | 44.570 | n/a | n/a | 0.224 | 20.510 | 0.368 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d26800000000000000f4 | 78.742 | 20.030 | 0.400 | 0.000 | 0.080 | 3.738 | 22.988 | 0.130 | n/a | 0.190 | 31.162 | n/a | n/a | 0.025 | 20.510 | 0.260 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| 8b08ac8d2ac7d2680000000000000116 | 61.859 | 6.147 | 0.200 | 0.475 | 0.055 | 1.926 | 7.351 | 0.057 | n/a | 1.059 | 44.570 | n/a | n/a | 0.020 | 6.876 | 0.111 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 8b08ac8d2ac7d26800000000000000f0 | 57.020 | 11.260 | n/a | 0.000 | 0.384 | 1.718 | 12.292 | 0.052 | n/a | 4.512 | 26.615 | n/a | n/a | 0.187 | 11.644 | 0.204 | 0.187 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000122 | 46.908 | 5.264 | 0.182 | 0.370 | 0.056 | 1.619 | 13.513 | 0.044 | n/a | 0.133 | 25.693 | n/a | n/a | 0.035 | 5.872 | 0.125 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| 8b08ac8d2ac7d26800000000000000fc | 44.460 | 4.006 | 0.193 | 0.000 | 0.120 | 1.596 | 14.943 | 0.027 | n/a | 0.267 | 23.274 | n/a | n/a | 0.033 | 4.319 | 0.097 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.012ms |
| 8b08ac8d2ac7d268000000000000010c | 39.599 | 5.315 | 0.251 | 0.000 | 0.079 | 1.614 | 11.261 | 0.058 | n/a | 3.418 | 17.574 | n/a | n/a | 0.030 | 5.645 | 0.143 | 0.030 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 8b08ac8d2ac7d2680000000000000104 | 39.206 | 6.252 | 0.262 | 0.000 | 0.164 | 1.930 | 13.112 | 0.045 | n/a | 0.163 | 17.218 | n/a | n/a | 0.059 | 6.678 | 0.170 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| 8b08ac8d2ac7d26800000000000000f8 | 38.872 | 5.879 | 0.503 | 0.000 | 0.092 | 2.182 | 14.900 | 0.053 | n/a | 0.146 | 15.080 | n/a | n/a | 0.037 | 6.474 | 0.167 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 8b08ac8d2ac7d2680000000000000127 | 36.993 | 4.656 | 0.214 | 0.000 | 0.052 | 1.841 | 9.845 | 0.084 | n/a | 0.202 | 20.077 | n/a | n/a | 0.022 | 4.922 | 0.133 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.144ms; driver.reader-basis.broadcast 0.047ms; driver.publication.persist-deferred 0.019ms |
| 8b08ac8d2ac7d2680000000000000110 | 35.402 | 5.636 | 0.414 | 0.000 | 0.061 | 2.212 | 13.805 | 0.054 | n/a | 3.173 | 10.022 | n/a | n/a | 0.025 | 6.111 | 0.173 | 0.025 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.051ms |
| 8b08ac8d2ac7d268000000000000011a | 34.163 | 4.033 | 0.216 | 0.277 | 0.056 | 1.367 | 9.945 | 0.054 | n/a | 0.349 | 17.846 | n/a | n/a | 0.020 | 4.582 | 0.134 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 8b08ac8d2ac7d268000000000000010a | 32.686 | 4.855 | n/a | 0.000 | 1.042 | 1.180 | 5.267 | 0.058 | n/a | 3.416 | 16.827 | n/a | n/a | 0.040 | 5.898 | 0.180 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000000fe | 32.358 | 5.295 | 0.217 | 0.000 | 0.079 | 2.508 | 11.599 | 0.051 | n/a | 0.395 | 12.174 | n/a | n/a | 0.039 | 5.591 | 0.173 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| 8b08ac8d2ac7d2680000000000000106 | 31.561 | 4.226 | 0.230 | 0.000 | 0.074 | 1.384 | 13.870 | 0.030 | n/a | 0.090 | 11.627 | n/a | n/a | 0.029 | 4.530 | 0.144 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 8b08ac8d2ac7d2680000000000000107 | 31.101 | 7.018 | n/a | 2.992 | 0.943 | 1.060 | 2.313 | 0.021 | n/a | 0.507 | 16.205 | n/a | n/a | 0.041 | 10.953 | 0.352 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 8b08ac8d2ac7d268000000000000011f | 30.664 | 2.424 | n/a | 0.000 | 0.243 | 1.115 | 6.157 | 0.133 | n/a | 0.239 | 20.326 | n/a | n/a | 0.027 | 2.667 | 0.087 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000118 | 30.101 | 6.814 | n/a | 2.369 | 0.742 | 1.242 | 3.266 | 0.068 | n/a | 0.245 | 15.307 | n/a | n/a | 0.047 | 9.925 | 0.330 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000101 | 26.958 | 5.589 | n/a | 0.000 | 0.869 | 1.962 | 6.216 | 0.059 | n/a | 0.717 | 11.522 | n/a | n/a | 0.024 | 6.458 | 0.240 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 8b08ac8d2ac7d26800000000000000f6 | 26.463 | 4.348 | n/a | 0.000 | 1.025 | 1.242 | 3.127 | 0.048 | n/a | 1.177 | 15.272 | n/a | n/a | 0.224 | 5.374 | 0.203 | 0.224 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 8b08ac8d2ac7d26800000000000000fa | 26.226 | 3.092 | n/a | 0.000 | 0.859 | 0.872 | 4.552 | 0.028 | n/a | 0.739 | 16.051 | n/a | n/a | 0.033 | 3.950 | 0.151 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.536 | 0.785 | 0.000 | 0.610 | 2.830 | n/a | 0.000 | 0.690 | 0.872 | 1.515 | 0.028 | n/a | 0.479 | 9.210 | n/a | n/a | 0.031 | 3.561 | 0.203 | 0.031 |
| p99 | 30.664 | 1.526 | 0.000 | 1.167 | 4.348 | n/a | 0.000 | 1.028 | 1.365 | 6.157 | 0.133 | n/a | 1.847 | 20.326 | n/a | n/a | 0.224 | 5.374 | 0.368 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d268000000000000011f | 30.664 | 2.424 | n/a | 0.000 | 0.243 | 1.115 | 6.157 | 0.133 | n/a | 0.239 | 20.326 | n/a | n/a | 0.027 | 2.667 | 0.087 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000000f6 | 26.463 | 4.348 | n/a | 0.000 | 1.025 | 1.242 | 3.127 | 0.048 | n/a | 1.177 | 15.272 | n/a | n/a | 0.224 | 5.374 | 0.203 | 0.224 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 8b08ac8d2ac7d26800000000000000fa | 26.226 | 3.092 | n/a | 0.000 | 0.859 | 0.872 | 4.552 | 0.028 | n/a | 0.739 | 16.051 | n/a | n/a | 0.033 | 3.950 | 0.151 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000113 | 19.459 | 2.401 | n/a | 0.000 | 0.072 | 0.671 | 0.988 | 0.017 | n/a | 0.357 | 14.929 | n/a | n/a | 0.024 | 2.472 | 0.127 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000111 | 16.536 | 3.742 | n/a | 0.000 | 0.481 | 1.365 | 1.379 | 0.022 | n/a | 0.507 | 8.986 | n/a | n/a | 0.053 | 4.224 | 0.255 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000124 | 16.308 | 2.830 | n/a | 0.000 | 0.732 | 1.033 | 2.252 | 0.044 | n/a | 1.847 | 7.554 | n/a | n/a | 0.016 | 3.561 | 0.218 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000011b | 15.324 | 2.281 | n/a | 0.000 | 1.028 | 0.756 | 1.515 | 0.031 | n/a | 0.479 | 9.210 | n/a | n/a | 0.024 | 3.308 | 0.216 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000126 | 13.427 | 1.966 | n/a | 0.000 | 0.421 | 0.812 | 1.486 | 0.024 | n/a | 0.213 | 8.476 | n/a | n/a | 0.031 | 2.386 | 0.178 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000000ff | 10.715 | 3.254 | n/a | 0.000 | 0.690 | 0.839 | 1.317 | 0.018 | n/a | 0.097 | 4.455 | n/a | n/a | 0.045 | 3.944 | 0.368 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.427 | 0.000 | 0.000 | 0.304 | 4.406 | 0.276 | 0.301 | 0.043 | 1.622 | 7.302 | 0.024 | n/a | 0.098 | 8.830 | n/a | n/a | 0.020 | 4.976 | 0.188 | 0.020 |
| p99 | 36.980 | 1.001 | 0.000 | 1.365 | 5.886 | 0.628 | 0.330 | 0.055 | 1.939 | 22.924 | 0.038 | n/a | 2.984 | 10.724 | n/a | n/a | 0.026 | 6.525 | 0.300 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000283 | 36.980 | 3.401 | 0.153 | 0.330 | 0.043 | 1.178 | 22.924 | 0.024 | n/a | 0.078 | 8.830 | n/a | n/a | 0.020 | 3.927 | 0.106 | 0.020 | gw-w/thread-49/gateway.admitted-work | none observed |
| 8b08ac8d2ac7d268000000000000012a | 29.211 | 5.886 | 0.276 | 0.308 | 0.055 | 1.622 | 7.302 | 0.027 | n/a | 2.984 | 10.724 | n/a | n/a | 0.026 | 6.525 | 0.223 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 8b08ac8d2ac7d268000000000000021f | 26.427 | 4.406 | 0.276 | 0.247 | 0.048 | 1.939 | 10.239 | 0.038 | n/a | 0.098 | 9.115 | n/a | n/a | 0.022 | 4.976 | 0.188 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000974 | 18.018 | 4.443 | 0.628 | 0.301 | 0.030 | 1.872 | 6.207 | 0.020 | n/a | 0.100 | 4.402 | n/a | n/a | 0.015 | 5.402 | 0.300 | 0.015 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.094ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.020ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.367 | 0.382 | 0.000 | 0.573 | 3.984 | n/a | 0.000 | 0.210 | 1.344 | 4.810 | 0.031 | n/a | 0.388 | 11.415 | n/a | n/a | 0.025 | 4.653 | 0.173 | 0.025 |
| p99 | 109.358 | 1.480 | 0.037 | 1.565 | 7.400 | n/a | 0.480 | 1.148 | 4.795 | 57.083 | 0.111 | n/a | 3.823 | 85.707 | n/a | n/a | 0.074 | 7.939 | 0.389 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d268000000000000013e | 109.358 | 7.400 | 0.239 | 0.000 | 0.060 | 1.373 | 14.428 | 0.035 | n/a | 0.088 | 85.707 | n/a | n/a | 0.028 | 7.699 | 0.070 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 8b08ac8d2ac7d2680000000000000171 | 91.624 | 5.362 | 0.171 | 0.411 | 0.055 | 4.795 | 9.159 | 0.059 | n/a | 3.823 | 67.767 | n/a | n/a | 0.023 | 5.998 | 0.065 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| 8b08ac8d2ac7d2680000000000000167 | 76.066 | 4.633 | 0.232 | 0.371 | 0.173 | 1.917 | 57.083 | 0.059 | n/a | 3.757 | 7.784 | n/a | n/a | 0.058 | 5.409 | 0.071 | 0.058 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.053ms |
| 8b08ac8d2ac7d2680000000000000140 | 52.581 | 3.869 | 0.250 | 0.000 | 0.083 | 1.850 | 7.746 | 0.036 | n/a | 2.274 | 36.436 | n/a | n/a | 0.036 | 4.202 | 0.080 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 8b08ac8d2ac7d2680000000000000135 | 46.003 | 4.771 | 0.161 | 0.373 | 0.064 | 1.625 | 15.344 | 0.042 | n/a | 0.328 | 23.272 | n/a | n/a | 0.021 | 5.369 | 0.117 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 8b08ac8d2ac7d2680000000000000162 | 45.919 | 3.353 | 0.264 | 0.294 | 0.066 | 1.175 | 26.204 | 0.028 | n/a | 0.375 | 14.138 | n/a | n/a | 0.023 | 3.977 | 0.087 | 0.023 | gw-w/thread-48/gateway.admitted-work | driver.publication.readback 0.065ms; driver.reader-basis.broadcast 0.045ms; driver.publication.persist-deferred 0.016ms |
| 8b08ac8d2ac7d268000000000000012c | 42.695 | 3.984 | 0.201 | 0.000 | 0.079 | 1.748 | 25.575 | 0.111 | n/a | 2.104 | 8.860 | n/a | n/a | 0.033 | 4.263 | 0.100 | 0.033 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.029ms |
| 8b08ac8d2ac7d268000000000000012e | 40.863 | 4.211 | 0.250 | 0.401 | 0.224 | 2.136 | 13.537 | 0.034 | n/a | 0.125 | 19.869 | n/a | n/a | 0.074 | 5.086 | 0.124 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 8b08ac8d2ac7d2680000000000000147 | 36.908 | 4.836 | 0.186 | 0.405 | 0.057 | 1.224 | 10.138 | 0.029 | n/a | 0.388 | 19.622 | n/a | n/a | 0.023 | 5.484 | 0.149 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 8b08ac8d2ac7d268000000000000014f | 35.921 | 4.204 | 1.765 | 0.307 | 0.057 | 1.534 | 13.788 | 0.041 | n/a | 0.146 | 14.052 | n/a | n/a | 0.028 | 6.333 | 0.176 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 8b08ac8d2ac7d268000000000000017d | 35.830 | 5.826 | 0.306 | 0.000 | 0.062 | 4.062 | 6.545 | 0.029 | n/a | 0.074 | 18.904 | n/a | n/a | 0.023 | 6.193 | 0.173 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 8b08ac8d2ac7d2680000000000000173 | 34.720 | 3.964 | 0.302 | 0.313 | 0.073 | 1.584 | 9.667 | 0.032 | n/a | 1.031 | 17.725 | n/a | n/a | 0.027 | 4.653 | 0.134 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.069ms |
| 8b08ac8d2ac7d2680000000000000150 | 34.528 | 5.660 | n/a | 0.000 | 0.320 | 0.657 | 8.298 | 0.046 | n/a | 0.097 | 19.426 | n/a | n/a | 0.024 | 5.980 | 0.173 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000133 | 33.173 | 3.016 | n/a | 0.000 | 0.949 | 0.812 | 1.553 | 0.019 | n/a | 3.045 | 23.755 | n/a | n/a | 0.023 | 3.965 | 0.120 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000138 | 32.562 | 4.739 | 0.286 | 0.382 | 0.070 | 1.460 | 6.375 | 0.029 | n/a | 0.096 | 19.088 | n/a | n/a | 0.038 | 5.476 | 0.168 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 8b08ac8d2ac7d268000000000000017b | 32.428 | 4.600 | 0.166 | 0.000 | 0.060 | 1.249 | 15.560 | 0.027 | n/a | 0.390 | 10.354 | n/a | n/a | 0.022 | 4.827 | 0.149 | 0.022 | gw-w/thread-42/gateway.admitted-work | driver.reader-basis.broadcast 0.042ms |
| 8b08ac8d2ac7d268000000000000014b | 29.238 | 4.740 | 0.257 | 0.403 | 0.117 | 1.184 | 8.247 | 0.031 | n/a | 0.084 | 14.131 | n/a | n/a | 0.045 | 5.517 | 0.189 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 8b08ac8d2ac7d2680000000000000142 | 29.086 | 4.984 | 0.279 | 0.386 | 0.062 | 3.791 | 8.809 | 0.032 | n/a | 0.381 | 10.333 | n/a | n/a | 0.030 | 5.712 | 0.196 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 8b08ac8d2ac7d268000000000000016d | 27.662 | 5.365 | 0.162 | 0.480 | 0.068 | 2.253 | 7.518 | 0.035 | n/a | 2.031 | 9.715 | n/a | n/a | 0.033 | 6.075 | 0.220 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 8b08ac8d2ac7d2680000000000000130 | 26.410 | 4.044 | n/a | 0.000 | 1.133 | 1.402 | 1.248 | 0.021 | n/a | 0.083 | 18.412 | n/a | n/a | 0.068 | 5.177 | 0.196 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.403 | 0.000 | 0.000 | 0.443 | 2.254 | n/a | 0.000 | 0.550 | 0.812 | 1.756 | 0.024 | n/a | 0.399 | 8.014 | n/a | n/a | 0.023 | 2.792 | 0.157 | 0.023 |
| p99 | 33.173 | 1.480 | 0.000 | 0.985 | 5.334 | n/a | 0.000 | 1.046 | 1.699 | 4.810 | 0.078 | n/a | 3.045 | 23.755 | n/a | n/a | 0.038 | 6.349 | 0.389 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000133 | 33.173 | 3.016 | n/a | 0.000 | 0.949 | 0.812 | 1.553 | 0.019 | n/a | 3.045 | 23.755 | n/a | n/a | 0.023 | 3.965 | 0.120 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000015d | 21.926 | 1.746 | n/a | 0.000 | 1.046 | 1.018 | 3.705 | 0.053 | n/a | 0.163 | 14.168 | n/a | n/a | 0.026 | 2.792 | 0.127 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| 8b08ac8d2ac7d2680000000000000136 | 17.185 | 5.334 | n/a | 0.000 | 1.015 | 1.699 | 4.810 | 0.060 | n/a | 0.399 | 3.844 | n/a | n/a | 0.023 | 6.349 | 0.369 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000148 | 16.734 | 2.254 | n/a | 0.000 | 0.373 | 0.834 | 1.462 | 0.021 | n/a | 0.375 | 11.384 | n/a | n/a | 0.031 | 2.627 | 0.157 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000153 | 15.403 | 1.889 | n/a | 0.000 | 0.237 | 0.648 | 4.495 | 0.024 | n/a | 0.081 | 8.014 | n/a | n/a | 0.015 | 2.126 | 0.138 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000016f | 14.876 | 2.848 | n/a | 0.000 | 0.531 | 1.087 | 1.756 | 0.038 | n/a | 0.512 | 8.066 | n/a | n/a | 0.038 | 3.380 | 0.227 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000179 | 10.374 | 3.155 | n/a | 0.000 | 0.876 | 0.698 | 1.040 | 0.020 | n/a | 0.902 | 3.670 | n/a | n/a | 0.012 | 4.031 | 0.389 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000161 | 9.269 | 1.550 | n/a | 0.000 | 0.550 | 0.627 | 2.171 | 0.078 | n/a | 0.658 | 3.616 | n/a | n/a | 0.021 | 2.099 | 0.226 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (36 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.195 | n/a | n/a | n/a | 37.421 | 3.166 | 2.095 | 0.000 | 0.406 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.250 | 52.470 | 0.742 | 16.250 |
| p99 | 235.455 | n/a | n/a | n/a | 121.552 | 80.828 | 17.090 | 0.000 | 29.422 | 56.673 | 3.947 | n/a | 0.003 | 0.000 | n/a | n/a | 103.028 | 217.605 | 0.982 | 103.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000001492 | 235.455 | 98.633 | 78.242 | 13.229 | 0.000 | 0.776 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.576 | 190.104 | 0.807 | 44.576 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.reader-basis.broadcast 0.221ms; driver.publication.readback 0.125ms; driver.publication.readback 0.124ms |
| 8b08ac8d2ac7d2680000000000001493 | 231.692 | 121.552 | 80.828 | 15.225 | 0.000 | 0.323 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.763 | 217.605 | 0.939 | 13.763 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.reader-basis.broadcast 0.221ms; driver.publication.readback 0.125ms; driver.publication.readback 0.124ms |
| 8b08ac8d2ac7d2680000000000001c6d | 154.214 | 76.897 | 0.353 | 5.604 | 0.000 | 10.729 | 56.673 | 3.947 | n/a | 0.003 | 0.000 | n/a | n/a | 0.008 | 82.854 | 0.537 | 0.008 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.315ms; driver.reader-basis.broadcast 0.296ms; driver.publication.readback 0.091ms; driver.publication.readback 0.066ms; driver.publication.readback 0.058ms |
| 8b08ac8d2ac7d2680000000000001487 | 138.494 | 65.472 | 8.310 | 17.090 | 0.000 | 0.603 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.019 | 90.872 | 0.656 | 47.019 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.reader-basis.broadcast 0.473ms; driver.publication.readback 0.129ms; driver.publication.readback 0.125ms |
| 8b08ac8d2ac7d268000000000000148a | 122.472 | 19.974 | 0.312 | 2.993 | 0.000 | 0.427 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.765 | 23.280 | 0.190 | 98.765 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.publication.readback 0.129ms; driver.publication.readback 0.125ms; driver.publication.readback 0.124ms |
| 8b08ac8d2ac7d268000000000000064d | 120.300 | 44.471 | 3.313 | 9.131 | 0.000 | 0.471 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 62.913 | 56.916 | 0.473 | 62.913 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.147ms; driver.reader-basis.broadcast 0.085ms; driver.publication.readback 0.081ms; driver.publication.readback 0.061ms; driver.publication.readback 0.054ms |
| 8b08ac8d2ac7d2680000000000001491 | 116.134 | 12.783 | 0.146 | 0.000 | 0.000 | 0.176 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 103.028 | 12.929 | 0.111 | 103.028 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.publication.readback 0.125ms; driver.publication.readback 0.124ms; driver.publication.readback 0.105ms |
| 8b08ac8d2ac7d2680000000000001490 | 114.839 | 20.251 | 0.510 | 1.007 | 0.000 | 0.310 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 92.760 | 21.769 | 0.190 | 92.760 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.publication.readback 0.125ms; driver.publication.readback 0.124ms; driver.publication.readback 0.105ms |
| 8b08ac8d2ac7d2680000000000001d04 | 100.911 | 43.523 | 2.663 | 2.180 | 0.000 | 0.306 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.238 | 48.367 | 0.479 | 52.238 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.571ms; driver.reader-basis.broadcast 0.691ms; driver.publication.readback 0.535ms; driver.publication.readback 0.095ms; driver.publication.readback 0.057ms |
| 8b08ac8d2ac7d2680000000000001d05 | 98.326 | 16.468 | 80.116 | 0.000 | 0.000 | 0.294 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.449 | 96.583 | 0.982 | 1.449 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.691ms; driver.publication.readback 0.535ms; driver.publication.readback 0.095ms; driver.publication.readback 0.052ms; driver.publication.readback 0.050ms |
| 8b08ac8d2ac7d26800000000000017d2 | 98.254 | 47.051 | 44.279 | 2.095 | 0.000 | 0.494 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.334 | 93.425 | 0.951 | 4.334 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.108ms; driver.publication.readback 0.066ms; driver.publication.readback 0.062ms; driver.publication.readback 0.059ms |
| 8b08ac8d2ac7d268000000000000149a | 96.939 | 23.359 | 56.235 | 1.153 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.953 | 80.747 | 0.833 | 15.953 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.597ms; driver.reader-basis.broadcast 0.543ms; driver.publication.readback 0.124ms; driver.publication.readback 0.105ms; driver.publication.readback 0.103ms |
| 8b08ac8d2ac7d2680000000000000914 | 92.966 | 39.792 | 0.144 | 2.073 | 0.000 | 29.422 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.534 | 42.010 | 0.452 | 21.534 | node-14/thread-3/socket.body-read | driver.publication.readback 0.190ms; driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.063ms; driver.publication.readback 0.058ms; driver.publication.readback 0.047ms |
| 8b08ac8d2ac7d268000000000000091a | 91.687 | 17.573 | 5.688 | 1.406 | 0.000 | 0.169 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 66.850 | 24.667 | 0.269 | 66.850 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.190ms; driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.readback 0.047ms |
| 8b08ac8d2ac7d268000000000000091b | 91.230 | 17.958 | 1.453 | 0.000 | 0.000 | 0.631 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 71.188 | 19.411 | 0.213 | 71.188 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.190ms; driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.readback 0.041ms |
| 8b08ac8d2ac7d26800000000000017cb | 86.239 | 65.676 | 0.188 | 6.065 | 0.000 | 1.007 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.304 | 71.928 | 0.834 | 13.304 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.241ms; driver.publication.readback 0.108ms; driver.publication.readback 0.084ms; driver.publication.readback 0.078ms; driver.publication.readback 0.067ms |
| 8b08ac8d2ac7d2680000000000000920 | 81.983 | 16.291 | 45.663 | 1.698 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.068 | 63.652 | 0.776 | 18.068 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.readback 0.190ms; driver.reader-basis.broadcast 0.104ms; driver.publication.readback 0.069ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d2680000000000000145 | 78.490 | 42.897 | 0.848 | 12.438 | 0.000 | 0.753 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.554 | 56.183 | 0.716 | 21.554 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.077ms; driver.reader-basis.broadcast 0.054ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d268000000000000064e | 77.195 | 33.167 | 38.515 | 1.326 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.845 | 73.008 | 0.946 | 3.845 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.085ms; driver.publication.readback 0.081ms; driver.publication.readback 0.052ms; driver.publication.readback 0.052ms; driver.publication.readback 0.024ms |
| 8b08ac8d2ac7d2680000000000000b33 | 74.756 | 42.054 | 9.787 | 8.451 | 0.000 | 0.590 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.873 | 60.293 | 0.807 | 13.873 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.112ms; driver.publication.readback 0.057ms; driver.publication.readback 0.057ms; driver.publication.readback 0.048ms; driver.publication.readback 0.047ms |

## P2 / L4 / commit (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.581 | 0.000 | 0.000 | 0.505 | 3.721 | 1.230 | 0.000 | 0.222 | 1.160 | 4.987 | 0.033 | n/a | 0.165 | 10.839 | n/a | n/a | 0.030 | 4.350 | 0.193 | 0.030 |
| p99 | 44.205 | 4.132 | 0.000 | 3.773 | 6.733 | n/a | 2.154 | 1.144 | 5.683 | 16.090 | 0.606 | n/a | 3.225 | 21.122 | n/a | n/a | 0.112 | 8.253 | 0.350 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000190 | 44.205 | 4.908 | 0.276 | 0.000 | 0.169 | 5.683 | 16.090 | 0.067 | n/a | 0.134 | 16.828 | n/a | n/a | 0.051 | 5.353 | 0.121 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 8b08ac8d2ac7d26800000000000001ba | 39.642 | 5.631 | 0.335 | 0.000 | 0.071 | 2.239 | 14.317 | 0.102 | n/a | 0.261 | 16.654 | n/a | n/a | 0.032 | 6.037 | 0.152 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| 8b08ac8d2ac7d2680000000000000198 | 35.462 | 4.104 | 0.331 | 0.284 | 0.053 | 2.614 | 11.642 | 0.606 | n/a | 0.363 | 15.441 | n/a | n/a | 0.024 | 4.772 | 0.135 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 8b08ac8d2ac7d2680000000000000189 | 30.041 | 2.856 | n/a | 0.000 | 0.889 | 1.662 | 6.345 | 0.026 | n/a | 0.413 | 17.823 | n/a | n/a | 0.025 | 3.745 | 0.125 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001b0 | 29.555 | 3.748 | 0.315 | 0.325 | 0.085 | 1.927 | 11.073 | 0.071 | n/a | 0.133 | 11.846 | n/a | n/a | 0.031 | 4.474 | 0.151 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 8b08ac8d2ac7d26800000000000001a4 | 28.349 | 3.777 | 0.182 | 0.375 | 0.114 | 1.197 | 8.674 | 0.028 | n/a | 0.358 | 13.567 | n/a | n/a | 0.077 | 4.448 | 0.157 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 8b08ac8d2ac7d2680000000000000185 | 28.283 | 6.733 | 0.343 | 0.000 | 0.052 | 1.419 | 6.301 | 0.029 | n/a | 0.378 | 12.997 | n/a | n/a | 0.032 | 7.128 | 0.252 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 8b08ac8d2ac7d26800000000000001bb | 28.249 | 2.875 | n/a | 0.000 | 0.804 | 1.093 | 2.188 | 0.024 | n/a | 0.106 | 21.122 | n/a | n/a | 0.037 | 3.679 | 0.130 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 8b08ac8d2ac7d26800000000000001aa | 28.123 | 3.721 | 0.258 | 0.253 | 0.057 | 3.537 | 9.016 | 0.044 | n/a | 0.135 | 11.078 | n/a | n/a | 0.025 | 4.288 | 0.152 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000188 | 27.852 | 3.429 | 0.193 | 0.419 | 0.059 | 1.419 | 6.635 | 0.063 | n/a | 0.737 | 14.875 | n/a | n/a | 0.022 | 4.101 | 0.147 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| 8b08ac8d2ac7d26800000000000001be | 27.845 | 4.436 | 0.301 | 0.347 | 0.228 | 1.519 | 11.995 | 0.033 | n/a | 0.096 | 8.818 | n/a | n/a | 0.072 | 5.312 | 0.191 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000019e | 27.646 | 3.185 | 1.230 | 0.236 | 0.118 | 1.097 | 11.668 | 0.028 | n/a | 0.211 | 9.830 | n/a | n/a | 0.043 | 4.769 | 0.172 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 8b08ac8d2ac7d268000000000000019c | 27.391 | 4.616 | 0.170 | 0.457 | 0.056 | 1.638 | 8.780 | 0.089 | n/a | 0.646 | 10.915 | n/a | n/a | 0.025 | 5.299 | 0.193 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| 8b08ac8d2ac7d2680000000000000199 | 26.348 | 5.885 | n/a | 0.000 | 0.880 | 0.982 | 5.215 | 0.049 | n/a | 0.940 | 12.356 | n/a | n/a | 0.042 | 6.765 | 0.257 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001a6 | 26.214 | 5.439 | 0.274 | 0.469 | 0.052 | 2.042 | 9.104 | 0.042 | n/a | 0.143 | 8.623 | n/a | n/a | 0.026 | 6.233 | 0.238 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001b4 | 25.602 | 3.520 | 0.184 | 0.209 | 0.053 | 5.144 | 8.052 | 0.081 | n/a | 0.129 | 8.207 | n/a | n/a | 0.021 | 3.967 | 0.155 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001c2 | 25.466 | 4.449 | 0.273 | 0.000 | 0.102 | 1.014 | 4.987 | 0.028 | n/a | 0.067 | 14.491 | n/a | n/a | 0.055 | 4.824 | 0.189 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001c6 | 25.305 | 5.573 | 0.333 | 0.368 | 0.076 | 1.073 | 1.884 | 0.038 | n/a | 0.385 | 15.544 | n/a | n/a | 0.030 | 6.350 | 0.251 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001b6 | 24.118 | 4.928 | 0.219 | 0.434 | 0.056 | 1.602 | 6.854 | 0.045 | n/a | 0.115 | 9.753 | n/a | n/a | 0.112 | 5.636 | 0.234 | 0.112 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001b7 | 23.581 | 5.307 | n/a | 2.154 | 0.792 | 0.962 | 2.008 | 0.025 | n/a | 0.143 | 12.160 | n/a | n/a | 0.030 | 8.253 | 0.350 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.068 | 0.000 | 0.000 | 0.467 | 1.962 | n/a | 0.000 | 0.604 | 0.659 | 1.177 | 0.021 | n/a | 0.326 | 6.383 | n/a | n/a | 0.027 | 2.707 | 0.198 | 0.027 |
| p99 | 21.554 | 1.010 | 0.000 | 0.886 | 3.047 | n/a | 0.000 | 1.144 | 1.584 | 4.709 | 0.054 | n/a | 3.225 | 14.761 | n/a | n/a | 0.032 | 3.745 | 0.301 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d268000000000000017f | 21.554 | 2.140 | n/a | 0.000 | 0.453 | 0.347 | 4.709 | 0.028 | n/a | 0.084 | 13.760 | n/a | n/a | 0.031 | 2.593 | 0.120 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000018d | 20.539 | 3.047 | n/a | 0.000 | 0.698 | 0.958 | 1.163 | 0.021 | n/a | 0.145 | 14.474 | n/a | n/a | 0.032 | 3.745 | 0.182 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001c7 | 19.757 | 1.962 | n/a | 0.000 | 0.886 | 0.659 | 1.079 | 0.020 | n/a | 0.366 | 14.761 | n/a | n/a | 0.024 | 2.849 | 0.144 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| 8b08ac8d2ac7d26800000000000001c9 | 15.045 | 1.812 | n/a | 0.000 | 0.771 | 0.934 | 1.706 | 0.050 | n/a | 0.165 | 9.580 | n/a | n/a | 0.027 | 2.583 | 0.172 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000183 | 13.439 | 2.510 | n/a | 0.000 | 0.248 | 0.639 | 1.572 | 0.021 | n/a | 0.409 | 8.014 | n/a | n/a | 0.027 | 2.757 | 0.205 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001b1 | 13.068 | 2.382 | n/a | 0.000 | 0.325 | 1.354 | 2.172 | 0.054 | n/a | 0.695 | 6.058 | n/a | n/a | 0.028 | 2.707 | 0.207 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000194 | 12.138 | 1.706 | n/a | 0.000 | 1.014 | 0.399 | 1.057 | 0.021 | n/a | 3.225 | 4.699 | n/a | n/a | 0.017 | 2.720 | 0.224 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001a7 | 11.963 | 2.455 | n/a | 0.000 | 1.144 | 0.796 | 1.042 | 0.019 | n/a | 0.096 | 6.383 | n/a | n/a | 0.029 | 3.599 | 0.301 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 8b08ac8d2ac7d2680000000000000196 | 10.996 | 1.918 | n/a | 0.000 | 0.604 | 0.617 | 1.525 | 0.020 | n/a | 0.363 | 5.931 | n/a | n/a | 0.018 | 2.522 | 0.229 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001bf | 10.082 | 1.588 | n/a | 0.000 | 0.406 | 1.584 | 1.177 | 0.018 | n/a | 0.326 | 4.955 | n/a | n/a | 0.027 | 1.994 | 0.198 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.819 | 0.320 | 0.000 | 0.485 | 3.567 | n/a | 0.000 | 0.125 | 1.095 | 2.899 | 0.027 | n/a | 0.356 | 10.202 | n/a | n/a | 0.027 | 4.129 | 0.189 | 0.027 |
| p99 | 78.588 | 3.001 | 0.056 | 2.045 | 9.621 | n/a | 0.464 | 1.059 | 4.488 | 26.113 | 0.393 | n/a | 4.006 | 63.262 | n/a | n/a | 0.072 | 10.151 | 0.345 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d268000000000000021b | 78.588 | 3.405 | 0.217 | 0.291 | 0.091 | 1.095 | 26.113 | 0.026 | n/a | 0.381 | 46.937 | n/a | n/a | 0.033 | 4.004 | 0.051 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 8b08ac8d2ac7d26800000000000001cc | 72.161 | 3.567 | 0.266 | 0.000 | 0.073 | 1.057 | 3.795 | 0.028 | n/a | 0.088 | 63.262 | n/a | n/a | 0.024 | 3.906 | 0.054 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 8b08ac8d2ac7d26800000000000001f0 | 41.669 | 9.621 | n/a | 0.000 | 0.530 | 2.660 | 16.710 | 0.078 | n/a | 0.619 | 11.424 | n/a | n/a | 0.025 | 10.151 | 0.244 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001db | 39.938 | 3.647 | 0.165 | 0.309 | 0.048 | 1.391 | 7.994 | 0.048 | n/a | 1.038 | 25.275 | n/a | n/a | 0.023 | 4.168 | 0.104 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 8b08ac8d2ac7d26800000000000001fb | 38.877 | 5.017 | 0.290 | 0.406 | 0.061 | 1.523 | 12.856 | 0.030 | n/a | 0.111 | 18.548 | n/a | n/a | 0.034 | 5.775 | 0.149 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 8b08ac8d2ac7d26800000000000001f3 | 35.420 | 5.515 | 0.292 | 0.306 | 0.066 | 3.773 | 9.462 | 0.047 | n/a | 0.156 | 15.761 | n/a | n/a | 0.043 | 6.179 | 0.174 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 8b08ac8d2ac7d26800000000000001df | 34.767 | 5.560 | 0.297 | 0.000 | 0.054 | 1.292 | 10.972 | 0.027 | n/a | 0.352 | 16.188 | n/a | n/a | 0.025 | 5.911 | 0.170 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 8b08ac8d2ac7d2680000000000000212 | 33.658 | 4.363 | n/a | 0.000 | 0.448 | 1.510 | 1.430 | 0.066 | n/a | 3.706 | 22.110 | n/a | n/a | 0.026 | 4.811 | 0.143 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 8b08ac8d2ac7d26800000000000001d8 | 32.892 | 4.324 | 0.383 | 0.000 | 0.053 | 2.139 | 13.923 | 0.057 | n/a | 1.788 | 10.202 | n/a | n/a | 0.025 | 4.759 | 0.145 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000207 | 31.175 | 3.662 | 0.283 | 0.262 | 0.055 | 2.483 | 12.185 | 0.043 | n/a | 0.114 | 12.066 | n/a | n/a | 0.024 | 4.262 | 0.137 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000217 | 29.935 | 3.691 | 0.254 | 0.265 | 0.045 | 1.032 | 5.001 | 0.026 | n/a | 0.371 | 19.228 | n/a | n/a | 0.022 | 4.255 | 0.142 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000020f | 28.336 | 4.632 | 0.202 | 0.438 | 0.071 | 1.642 | 8.926 | 0.393 | n/a | 0.343 | 11.667 | n/a | n/a | 0.023 | 5.343 | 0.189 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001fc | 26.404 | 4.972 | n/a | 0.000 | 0.853 | 0.897 | 1.359 | 0.021 | n/a | 0.099 | 18.133 | n/a | n/a | 0.071 | 5.824 | 0.221 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000020b | 26.068 | 4.971 | 0.225 | 0.464 | 0.075 | 1.495 | 6.162 | 0.033 | n/a | 0.443 | 12.171 | n/a | n/a | 0.028 | 5.736 | 0.220 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000203 | 25.967 | 3.979 | 0.333 | 0.249 | 0.059 | 1.399 | 8.096 | 0.031 | n/a | 0.108 | 11.693 | n/a | n/a | 0.020 | 4.620 | 0.178 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000211 | 25.954 | 4.406 | 0.212 | 0.418 | 0.101 | 1.436 | 10.042 | 0.038 | n/a | 0.345 | 8.920 | n/a | n/a | 0.035 | 5.137 | 0.198 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001d4 | 25.629 | 7.837 | n/a | 0.000 | 1.012 | 1.070 | 2.040 | 0.022 | n/a | 0.571 | 13.006 | n/a | n/a | 0.072 | 8.849 | 0.345 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.018ms |
| 8b08ac8d2ac7d26800000000000001ef | 25.042 | 3.700 | 0.273 | 0.294 | 0.057 | 1.533 | 7.087 | 0.051 | n/a | 0.167 | 11.850 | n/a | n/a | 0.028 | 4.324 | 0.173 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001f9 | 22.432 | 3.531 | 0.181 | 0.252 | 0.058 | 1.070 | 5.591 | 0.045 | n/a | 1.345 | 10.336 | n/a | n/a | 0.022 | 4.022 | 0.179 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000219 | 21.751 | 3.322 | 0.257 | 0.236 | 0.123 | 4.488 | 8.153 | 0.030 | n/a | 0.080 | 5.019 | n/a | n/a | 0.044 | 3.938 | 0.181 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.803 | 0.556 | 0.000 | 0.485 | 2.385 | n/a | 0.000 | 0.448 | 0.819 | 1.301 | 0.021 | n/a | 0.375 | 8.727 | n/a | n/a | 0.026 | 2.594 | 0.193 | 0.026 |
| p99 | 33.658 | 1.135 | 0.056 | 0.781 | 4.363 | n/a | 0.000 | 1.059 | 1.819 | 3.016 | 0.066 | n/a | 4.006 | 22.110 | n/a | n/a | 0.042 | 4.811 | 0.332 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000212 | 33.658 | 4.363 | n/a | 0.000 | 0.448 | 1.510 | 1.430 | 0.066 | n/a | 3.706 | 22.110 | n/a | n/a | 0.026 | 4.811 | 0.143 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 8b08ac8d2ac7d26800000000000001e6 | 17.752 | 1.761 | n/a | 0.000 | 0.674 | 0.619 | 1.311 | 0.020 | n/a | 0.361 | 12.985 | n/a | n/a | 0.021 | 2.435 | 0.137 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000208 | 17.284 | 3.040 | n/a | 0.000 | 0.893 | 0.680 | 1.063 | 0.024 | n/a | 3.338 | 8.203 | n/a | n/a | 0.042 | 3.933 | 0.228 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000200 | 17.041 | 2.861 | n/a | 0.000 | 0.571 | 1.146 | 2.899 | 0.042 | n/a | 0.761 | 8.727 | n/a | n/a | 0.035 | 3.432 | 0.201 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001d3 | 16.859 | 2.385 | n/a | 0.000 | 0.387 | 1.049 | 1.360 | 0.026 | n/a | 0.893 | 10.725 | n/a | n/a | 0.033 | 2.772 | 0.164 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001e4 | 16.379 | 2.072 | n/a | 0.000 | 0.125 | 0.635 | 1.096 | 0.020 | n/a | 0.375 | 12.035 | n/a | n/a | 0.021 | 2.197 | 0.134 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001cf | 15.858 | 3.070 | n/a | 0.000 | 1.059 | 1.024 | 1.677 | 0.041 | n/a | 0.129 | 8.817 | n/a | n/a | 0.040 | 4.129 | 0.260 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001dd | 15.803 | 2.747 | n/a | 0.000 | 0.423 | 0.855 | 3.016 | 0.020 | n/a | 0.283 | 8.430 | n/a | n/a | 0.028 | 3.170 | 0.201 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001f6 | 14.798 | 1.933 | n/a | 0.000 | 0.158 | 0.633 | 1.367 | 0.021 | n/a | 4.006 | 6.652 | n/a | n/a | 0.029 | 2.091 | 0.141 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001ea | 14.651 | 1.950 | n/a | 0.000 | 0.630 | 0.701 | 1.047 | 0.023 | n/a | 0.131 | 10.150 | n/a | n/a | 0.020 | 2.580 | 0.176 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001cd | 13.359 | 2.498 | n/a | 0.000 | 0.096 | 0.747 | 1.301 | 0.020 | n/a | 0.078 | 8.587 | n/a | n/a | 0.032 | 2.594 | 0.194 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| 8b08ac8d2ac7d2680000000000000204 | 13.334 | 2.052 | n/a | 0.000 | 0.391 | 0.963 | 1.027 | 0.021 | n/a | 0.103 | 8.760 | n/a | n/a | 0.018 | 2.443 | 0.183 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000020c | 12.961 | 2.030 | n/a | 0.000 | 0.473 | 1.819 | 1.059 | 0.020 | n/a | 1.999 | 5.543 | n/a | n/a | 0.019 | 2.503 | 0.193 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000001e8 | 11.060 | 1.807 | n/a | 0.000 | 0.402 | 0.738 | 1.106 | 0.023 | n/a | 0.356 | 6.604 | n/a | n/a | 0.025 | 2.208 | 0.200 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000021c | 9.858 | 2.410 | n/a | 0.000 | 0.860 | 0.819 | 1.050 | 0.019 | n/a | 0.531 | 4.149 | n/a | n/a | 0.021 | 3.269 | 0.332 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.053 | 0.209 | 0.000 | 0.497 | 3.707 | n/a | 0.000 | 0.241 | 0.999 | 3.694 | 0.022 | n/a | 0.198 | 8.965 | n/a | n/a | 0.027 | 4.276 | 0.225 | 0.027 |
| p99 | 66.464 | 1.822 | 0.000 | 1.563 | 7.397 | n/a | 0.545 | 1.141 | 4.827 | 15.496 | 3.954 | n/a | 2.580 | 49.618 | n/a | n/a | 0.080 | 8.204 | 0.378 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000271 | 66.464 | 4.414 | 3.359 | 0.371 | 0.060 | 0.962 | 7.539 | 0.021 | n/a | 0.091 | 49.618 | n/a | n/a | 0.029 | 8.204 | 0.123 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 8b08ac8d2ac7d268000000000000022c | 34.675 | 3.709 | 0.234 | 0.360 | 0.045 | 2.332 | 11.943 | 0.037 | n/a | 0.108 | 15.885 | n/a | n/a | 0.021 | 4.349 | 0.125 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000234 | 30.792 | 3.610 | 0.221 | 0.361 | 0.049 | 0.970 | 15.496 | 0.023 | n/a | 0.345 | 9.693 | n/a | n/a | 0.023 | 4.242 | 0.138 | 0.023 | gw-w/thread-47/gateway.admitted-work | none observed |
| 8b08ac8d2ac7d2680000000000000240 | 29.958 | 4.104 | 0.173 | 0.485 | 0.051 | 1.393 | 7.867 | 0.025 | n/a | 0.391 | 15.441 | n/a | n/a | 0.029 | 4.813 | 0.161 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000244 | 29.854 | 4.719 | 0.251 | 0.545 | 0.165 | 2.280 | 8.717 | 0.056 | n/a | 0.726 | 12.315 | n/a | n/a | 0.080 | 5.679 | 0.190 | 0.080 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000024a | 29.399 | 2.629 | n/a | 0.000 | 1.141 | 1.349 | 2.412 | 0.010 | n/a | 0.042 | 21.782 | n/a | n/a | 0.034 | 3.770 | 0.128 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.019ms; driver.publication.persist-deferred 0.016ms |
| 8b08ac8d2ac7d268000000000000025b | 28.564 | 7.397 | n/a | 0.000 | 0.359 | 1.069 | 5.385 | 0.024 | n/a | 0.086 | 14.222 | n/a | n/a | 0.024 | 7.756 | 0.272 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 8b08ac8d2ac7d2680000000000000279 | 28.563 | 4.966 | 0.278 | 0.424 | 0.052 | 1.392 | 11.494 | 0.022 | n/a | 0.108 | 9.801 | n/a | n/a | 0.025 | 5.720 | 0.200 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000222 | 27.379 | 6.088 | 0.203 | 0.249 | 0.046 | 1.171 | 9.045 | 0.086 | n/a | 0.159 | 10.309 | n/a | n/a | 0.023 | 6.586 | 0.241 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000025a | 26.173 | 3.722 | 0.249 | 0.268 | 0.197 | 1.281 | 9.713 | 0.053 | n/a | 0.250 | 10.365 | n/a | n/a | 0.074 | 4.436 | 0.169 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000274 | 24.820 | 2.424 | n/a | 0.000 | 0.894 | 0.555 | 1.168 | 0.015 | n/a | 0.132 | 19.613 | n/a | n/a | 0.020 | 3.317 | 0.134 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000025e | 24.695 | 4.606 | 0.181 | 0.399 | 0.059 | 4.827 | 5.872 | 0.040 | n/a | 0.687 | 7.997 | n/a | n/a | 0.027 | 5.246 | 0.212 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000236 | 24.269 | 3.796 | 0.176 | 0.227 | 0.049 | 1.813 | 6.079 | 0.026 | n/a | 0.466 | 11.615 | n/a | n/a | 0.023 | 4.247 | 0.175 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000248 | 24.157 | 3.368 | 0.298 | 0.233 | 0.125 | 1.395 | 6.167 | 0.037 | n/a | 0.117 | 12.358 | n/a | n/a | 0.059 | 4.023 | 0.167 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000027f | 24.019 | 4.621 | 0.295 | 0.526 | 0.051 | 1.287 | 8.556 | 0.021 | n/a | 0.265 | 8.372 | n/a | n/a | 0.026 | 5.493 | 0.229 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000026b | 23.126 | 3.839 | 0.304 | 0.215 | 0.055 | 1.479 | 9.752 | 0.035 | n/a | 0.161 | 7.258 | n/a | n/a | 0.028 | 4.413 | 0.191 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000269 | 22.699 | 3.757 | n/a | 0.000 | 0.281 | 1.727 | 11.171 | 0.062 | n/a | 0.198 | 5.484 | n/a | n/a | 0.020 | 4.037 | 0.178 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000272 | 22.643 | 4.297 | n/a | 0.000 | 0.807 | 0.617 | 1.419 | 0.020 | n/a | 0.365 | 15.083 | n/a | n/a | 0.035 | 5.104 | 0.225 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000250 | 22.465 | 4.060 | 0.204 | 0.226 | 0.095 | 2.057 | 4.929 | 0.020 | n/a | 0.316 | 10.518 | n/a | n/a | 0.040 | 4.585 | 0.204 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000230 | 22.402 | 2.808 | n/a | 0.000 | 0.239 | 0.829 | 7.222 | 0.017 | n/a | 0.060 | 11.193 | n/a | n/a | 0.035 | 3.046 | 0.136 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.592 | 0.000 | 0.000 | 0.440 | 2.113 | n/a | 0.000 | 0.448 | 0.796 | 1.719 | 0.017 | n/a | 0.198 | 5.716 | n/a | n/a | 0.020 | 2.743 | 0.210 | 0.020 |
| p99 | 29.399 | 1.288 | 0.000 | 0.727 | 3.757 | n/a | 0.000 | 1.141 | 1.916 | 11.171 | 0.062 | n/a | 0.652 | 21.782 | n/a | n/a | 0.046 | 4.125 | 0.326 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d268000000000000024a | 29.399 | 2.629 | n/a | 0.000 | 1.141 | 1.349 | 2.412 | 0.010 | n/a | 0.042 | 21.782 | n/a | n/a | 0.034 | 3.770 | 0.128 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.019ms; driver.publication.persist-deferred 0.016ms |
| 8b08ac8d2ac7d2680000000000000269 | 22.699 | 3.757 | n/a | 0.000 | 0.281 | 1.727 | 11.171 | 0.062 | n/a | 0.198 | 5.484 | n/a | n/a | 0.020 | 4.037 | 0.178 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000237 | 19.053 | 2.053 | n/a | 0.000 | 0.232 | 0.930 | 1.490 | 0.029 | n/a | 0.109 | 14.192 | n/a | n/a | 0.018 | 2.285 | 0.120 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000026e | 17.826 | 3.314 | n/a | 0.000 | 0.812 | 0.962 | 1.812 | 0.051 | n/a | 0.244 | 10.587 | n/a | n/a | 0.046 | 4.125 | 0.231 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000022e | 15.873 | 1.794 | n/a | 0.000 | 0.241 | 0.726 | 1.074 | 0.017 | n/a | 0.360 | 11.634 | n/a | n/a | 0.027 | 2.035 | 0.128 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000022a | 15.299 | 1.638 | n/a | 0.000 | 0.896 | 0.420 | 0.940 | 0.014 | n/a | 0.336 | 11.040 | n/a | n/a | 0.016 | 2.534 | 0.166 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| 8b08ac8d2ac7d2680000000000000276 | 15.077 | 2.318 | n/a | 0.000 | 0.425 | 0.967 | 4.004 | 0.015 | n/a | 0.077 | 7.250 | n/a | n/a | 0.021 | 2.743 | 0.182 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000280 | 15.010 | 1.972 | n/a | 0.000 | 0.247 | 0.935 | 4.380 | 0.021 | n/a | 0.107 | 7.319 | n/a | n/a | 0.029 | 2.219 | 0.148 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000241 | 12.592 | 2.189 | n/a | 0.000 | 0.846 | 0.796 | 1.425 | 0.017 | n/a | 0.371 | 6.916 | n/a | n/a | 0.032 | 3.036 | 0.241 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000221 | 12.364 | 3.584 | n/a | 0.000 | 0.446 | 1.916 | 3.694 | 0.036 | n/a | 0.115 | 2.554 | n/a | n/a | 0.019 | 4.030 | 0.326 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000225 | 11.737 | 3.204 | n/a | 0.000 | 0.559 | 0.869 | 1.219 | 0.014 | n/a | 0.114 | 5.716 | n/a | n/a | 0.041 | 3.763 | 0.321 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 8b08ac8d2ac7d268000000000000027c | 11.250 | 2.995 | n/a | 0.000 | 0.448 | 0.724 | 1.719 | 0.018 | n/a | 0.409 | 4.895 | n/a | n/a | 0.042 | 3.443 | 0.306 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000261 | 10.505 | 1.693 | n/a | 0.000 | 0.738 | 0.631 | 1.885 | 0.030 | n/a | 0.652 | 4.861 | n/a | n/a | 0.014 | 2.431 | 0.231 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000025f | 9.916 | 1.926 | n/a | 0.000 | 0.154 | 0.540 | 2.473 | 0.016 | n/a | 0.361 | 4.430 | n/a | n/a | 0.015 | 2.080 | 0.210 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000255 | 9.560 | 2.113 | n/a | 0.000 | 0.773 | 0.755 | 1.608 | 0.033 | n/a | 0.222 | 4.042 | n/a | n/a | 0.014 | 2.886 | 0.302 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000265 | 9.549 | 1.578 | n/a | 0.000 | 0.957 | 0.478 | 1.292 | 0.014 | n/a | 0.125 | 5.087 | n/a | n/a | 0.016 | 2.535 | 0.265 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.175 | 0.172 | 0.000 | 0.444 | 3.161 | n/a | 0.000 | 0.146 | 1.040 | 2.806 | 0.026 | n/a | 0.232 | 8.917 | n/a | n/a | 0.024 | 3.675 | 0.212 | 0.024 |
| p99 | 61.109 | 1.998 | 0.000 | 1.425 | 7.258 | n/a | 0.746 | 1.185 | 11.248 | 18.485 | 0.058 | n/a | 1.302 | 46.164 | n/a | n/a | 0.087 | 7.940 | 0.479 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d26800000000000002b6 | 61.109 | 4.255 | 0.278 | 0.515 | 0.183 | 1.366 | 8.107 | 0.029 | n/a | 0.125 | 46.164 | n/a | n/a | 0.087 | 5.230 | 0.086 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002aa | 37.087 | 4.517 | 0.194 | 0.503 | 0.059 | 1.759 | 18.485 | 0.029 | n/a | 0.361 | 11.154 | n/a | n/a | 0.028 | 5.272 | 0.142 | 0.028 | gw-w/thread-46/gateway.admitted-work | none observed |
| 8b08ac8d2ac7d268000000000000029c | 35.584 | 3.327 | 0.168 | 0.000 | 0.039 | 1.551 | 18.020 | 0.052 | n/a | 0.226 | 12.181 | n/a | n/a | 0.022 | 3.533 | 0.099 | 0.022 | gw-w/thread-45/gateway.admitted-work | none observed |
| 8b08ac8d2ac7d2680000000000000294 | 33.359 | 3.550 | 0.187 | 0.235 | 0.046 | 1.173 | 9.822 | 0.020 | n/a | 0.061 | 18.242 | n/a | n/a | 0.022 | 4.019 | 0.120 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000029a | 32.433 | 5.896 | 0.188 | 0.746 | 0.048 | 2.013 | 8.119 | 0.047 | n/a | 0.977 | 14.370 | n/a | n/a | 0.028 | 6.878 | 0.212 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002a6 | 28.393 | 7.258 | 0.156 | 0.476 | 0.050 | 1.826 | 9.550 | 0.030 | n/a | 0.099 | 8.917 | n/a | n/a | 0.031 | 7.940 | 0.280 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002c2 | 28.083 | 3.726 | 0.281 | 0.379 | 0.063 | 1.517 | 6.441 | 0.042 | n/a | 0.165 | 15.440 | n/a | n/a | 0.030 | 4.448 | 0.158 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000289 | 27.206 | 4.430 | 0.172 | 0.434 | 0.043 | 2.982 | 9.803 | 0.023 | n/a | 0.344 | 8.955 | n/a | n/a | 0.021 | 5.078 | 0.187 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002d5 | 26.967 | 4.950 | 0.288 | 0.305 | 0.051 | 4.722 | 3.535 | 0.058 | n/a | 0.231 | 12.803 | n/a | n/a | 0.025 | 5.593 | 0.207 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002be | 25.121 | 5.224 | 0.205 | 0.465 | 0.064 | 1.938 | 7.618 | 0.039 | n/a | 0.347 | 9.194 | n/a | n/a | 0.027 | 5.958 | 0.237 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000028a | 23.360 | 3.112 | n/a | 0.000 | 0.710 | 1.482 | 2.730 | 0.054 | n/a | 1.302 | 13.901 | n/a | n/a | 0.069 | 3.822 | 0.164 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002d1 | 23.267 | 3.242 | 0.184 | 0.311 | 0.035 | 1.069 | 8.344 | 0.045 | n/a | 0.541 | 9.477 | n/a | n/a | 0.019 | 3.772 | 0.162 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002d7 | 22.411 | 3.832 | 0.280 | 0.283 | 0.051 | 1.403 | 5.774 | 0.039 | n/a | 0.680 | 10.047 | n/a | n/a | 0.022 | 4.446 | 0.198 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002ae | 21.367 | 5.243 | 0.194 | 0.235 | 0.056 | 1.157 | 5.004 | 0.021 | n/a | 0.094 | 9.336 | n/a | n/a | 0.028 | 5.727 | 0.268 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002b4 | 21.086 | 3.685 | 0.272 | 0.353 | 0.031 | 1.324 | 5.316 | 0.021 | n/a | 0.088 | 9.977 | n/a | n/a | 0.020 | 4.341 | 0.206 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000028d | 21.014 | 6.837 | 0.221 | 0.517 | 0.038 | 1.489 | 3.716 | 0.023 | n/a | 0.407 | 7.743 | n/a | n/a | 0.022 | 7.614 | 0.362 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002b7 | 20.363 | 2.675 | n/a | 0.000 | 0.548 | 0.896 | 5.059 | 0.020 | n/a | 0.105 | 11.031 | n/a | n/a | 0.031 | 3.222 | 0.158 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002a3 | 20.090 | 2.135 | n/a | 0.000 | 0.323 | 1.040 | 5.041 | 0.041 | n/a | 0.232 | 11.255 | n/a | n/a | 0.022 | 2.458 | 0.122 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 8b08ac8d2ac7d26800000000000002ba | 18.812 | 2.865 | 0.168 | 0.305 | 0.035 | 1.073 | 5.751 | 0.031 | n/a | 0.373 | 8.195 | n/a | n/a | 0.017 | 3.373 | 0.179 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002cd | 17.980 | 1.564 | n/a | 0.000 | 0.304 | 11.248 | 4.761 | 0.021 | n/a | 0.060 | 0.000 | n/a | n/a | 0.023 | 1.868 | 0.104 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.253 | 0.657 | 0.000 | 0.508 | 2.394 | n/a | 0.000 | 0.317 | 0.896 | 1.519 | 0.021 | n/a | 0.232 | 6.302 | n/a | n/a | 0.024 | 2.784 | 0.224 | 0.024 |
| p99 | 20.363 | 1.006 | 0.000 | 0.844 | 3.279 | n/a | 0.000 | 1.080 | 11.248 | 5.059 | 0.041 | n/a | 0.649 | 11.255 | n/a | n/a | 0.067 | 3.675 | 0.318 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d26800000000000002b7 | 20.363 | 2.675 | n/a | 0.000 | 0.548 | 0.896 | 5.059 | 0.020 | n/a | 0.105 | 11.031 | n/a | n/a | 0.031 | 3.222 | 0.158 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002a3 | 20.090 | 2.135 | n/a | 0.000 | 0.323 | 1.040 | 5.041 | 0.041 | n/a | 0.232 | 11.255 | n/a | n/a | 0.022 | 2.458 | 0.122 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 8b08ac8d2ac7d26800000000000002cd | 17.980 | 1.564 | n/a | 0.000 | 0.304 | 11.248 | 4.761 | 0.021 | n/a | 0.060 | 0.000 | n/a | n/a | 0.023 | 1.868 | 0.104 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 8b08ac8d2ac7d26800000000000002a7 | 17.246 | 2.166 | n/a | 0.000 | 0.983 | 0.760 | 4.977 | 0.026 | n/a | 0.142 | 8.160 | n/a | n/a | 0.031 | 3.150 | 0.183 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002bf | 15.501 | 2.544 | n/a | 0.000 | 0.923 | 0.977 | 1.566 | 0.026 | n/a | 0.163 | 9.278 | n/a | n/a | 0.025 | 3.466 | 0.224 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000286 | 13.684 | 2.949 | n/a | 0.000 | 0.408 | 0.654 | 1.046 | 0.018 | n/a | 0.401 | 8.183 | n/a | n/a | 0.024 | 3.358 | 0.245 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002bb | 13.552 | 2.394 | n/a | 0.000 | 0.390 | 0.900 | 1.436 | 0.024 | n/a | 0.627 | 7.754 | n/a | n/a | 0.026 | 2.784 | 0.205 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000029d | 12.253 | 3.000 | n/a | 0.000 | 0.195 | 0.755 | 1.455 | 0.020 | n/a | 0.459 | 6.302 | n/a | n/a | 0.067 | 3.195 | 0.261 | 0.067 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000295 | 12.112 | 3.279 | n/a | 0.000 | 0.273 | 0.933 | 1.164 | 0.017 | n/a | 0.425 | 5.996 | n/a | n/a | 0.024 | 3.552 | 0.293 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002c9 | 12.039 | 1.770 | n/a | 0.000 | 0.134 | 0.561 | 0.968 | 0.015 | n/a | 0.302 | 8.266 | n/a | n/a | 0.023 | 1.904 | 0.158 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002af | 11.560 | 2.595 | n/a | 0.000 | 1.080 | 0.569 | 1.320 | 0.017 | n/a | 0.149 | 5.809 | n/a | n/a | 0.021 | 3.675 | 0.318 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d268000000000000029f | 10.672 | 2.234 | n/a | 0.000 | 0.182 | 0.969 | 1.519 | 0.029 | n/a | 0.649 | 5.067 | n/a | n/a | 0.023 | 2.416 | 0.226 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002c7 | 10.285 | 1.825 | n/a | 0.000 | 0.317 | 0.768 | 1.869 | 0.035 | n/a | 0.192 | 5.262 | n/a | n/a | 0.017 | 2.142 | 0.208 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002c3 | 9.886 | 2.452 | n/a | 0.000 | 0.286 | 0.924 | 1.637 | 0.033 | n/a | 0.171 | 4.358 | n/a | n/a | 0.024 | 2.738 | 0.277 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000284 | 6.984 | 1.674 | n/a | 0.000 | 0.065 | 0.453 | 0.885 | 0.014 | n/a | 0.345 | 3.530 | n/a | n/a | 0.018 | 1.739 | 0.249 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |

## P2 / L1024 / commit (844 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.570 | 0.255 | 0.000 | 0.515 | 2.177 | n/a | 0.000 | 0.640 | 0.627 | 1.043 | 0.014 | n/a | 0.121 | 6.249 | n/a | n/a | 0.016 | 2.907 | 0.249 | 0.016 |
| p99 | 47.457 | 2.008 | 0.024 | 2.245 | 6.728 | n/a | 0.302 | 10.600 | 7.552 | 6.887 | 0.053 | n/a | 3.618 | 35.538 | n/a | n/a | 0.051 | 13.488 | 0.642 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000656 | 62.650 | 1.878 | n/a | 0.000 | 0.515 | 1.337 | 0.754 | 0.028 | n/a | 0.890 | 57.242 | n/a | n/a | 0.006 | 2.393 | 0.038 | 0.006 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.147ms; driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000000657 | 54.103 | 4.150 | n/a | 0.000 | 0.351 | 3.658 | 2.873 | 0.042 | n/a | 1.624 | 41.386 | n/a | n/a | 0.019 | 4.501 | 0.083 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.147ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000000655 | 53.891 | 1.694 | n/a | 0.000 | 0.626 | 1.846 | 0.624 | 0.005 | n/a | 0.021 | 49.063 | n/a | n/a | 0.011 | 2.320 | 0.043 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d26800000000000002ea | 50.918 | 2.920 | 0.175 | 0.250 | 0.050 | 0.977 | 32.633 | 0.022 | n/a | 0.094 | 13.775 | n/a | n/a | 0.023 | 3.395 | 0.067 | 0.023 | gw-w/thread-46/gateway.admitted-work | none observed |
| 8b08ac8d2ac7d2680000000000000846 | 49.650 | 2.353 | n/a | 0.000 | 0.848 | 0.701 | 1.327 | 0.020 | n/a | 2.053 | 42.301 | n/a | n/a | 0.047 | 3.200 | 0.064 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d2680000000000000857 | 49.081 | 3.137 | 3.544 | 0.242 | 0.070 | 0.915 | 4.585 | 0.019 | n/a | 0.078 | 36.462 | n/a | n/a | 0.029 | 6.993 | 0.142 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.028ms |
| 8b08ac8d2ac7d26800000000000002e1 | 47.815 | 3.431 | 0.336 | 0.295 | 0.058 | 1.000 | 5.929 | 0.022 | n/a | 1.129 | 35.593 | n/a | n/a | 0.021 | 4.120 | 0.086 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000002e3 | 47.674 | 7.182 | n/a | 0.000 | 0.146 | 2.703 | 6.765 | 0.052 | n/a | 0.914 | 29.897 | n/a | n/a | 0.014 | 7.328 | 0.154 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000004f9 | 47.457 | 8.770 | n/a | 0.000 | 0.161 | 22.740 | 1.436 | 0.020 | n/a | 0.076 | 14.214 | n/a | n/a | 0.040 | 8.931 | 0.188 | 0.040 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.077ms |
| 8b08ac8d2ac7d2680000000000000848 | 47.448 | 2.281 | n/a | 0.000 | 39.893 | 0.606 | 0.851 | 0.013 | n/a | 0.408 | 3.382 | n/a | n/a | 0.014 | 42.174 | 0.889 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.056ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d268000000000000090f | 46.394 | 2.758 | n/a | 0.000 | 35.364 | 1.092 | 1.454 | 0.017 | n/a | 0.078 | 5.611 | n/a | n/a | 0.021 | 38.122 | 0.822 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.676ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.100ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.030ms |
| 8b08ac8d2ac7d268000000000000090c | 46.334 | 5.136 | n/a | 0.000 | 2.019 | 4.677 | 4.811 | 0.022 | n/a | 0.044 | 29.617 | n/a | n/a | 0.008 | 7.155 | 0.154 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.100ms; driver.reader-basis.broadcast 0.078ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d26800000000000003a5 | 44.226 | 2.063 | n/a | 0.000 | 0.464 | 0.775 | 0.993 | 0.017 | n/a | 0.100 | 39.799 | n/a | n/a | 0.015 | 2.527 | 0.057 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.033ms |
| 8b08ac8d2ac7d2680000000000000750 | 44.151 | 2.459 | n/a | 0.000 | 24.271 | 0.511 | 1.435 | 0.013 | n/a | 0.437 | 15.015 | n/a | n/a | 0.011 | 26.730 | 0.605 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.092ms; driver.publication.readback 0.091ms; driver.reader-basis.broadcast 0.071ms; driver.publication.readback 0.066ms; driver.publication.readback 0.054ms |
| 8b08ac8d2ac7d2680000000000000847 | 43.398 | 1.504 | n/a | 0.000 | 0.514 | 1.148 | 1.044 | 0.018 | n/a | 0.575 | 38.583 | n/a | n/a | 0.012 | 2.017 | 0.046 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000447 | 42.817 | 2.388 | n/a | 0.000 | 1.052 | 3.852 | 2.856 | 0.017 | n/a | 0.045 | 32.597 | n/a | n/a | 0.009 | 3.440 | 0.080 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.574ms; driver.publication.readback 0.125ms; driver.reader-basis.broadcast 0.045ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.024ms |
| 8b08ac8d2ac7d26800000000000003a7 | 42.811 | 2.683 | n/a | 0.000 | 0.160 | 3.777 | 1.355 | 0.014 | n/a | 0.072 | 34.735 | n/a | n/a | 0.015 | 2.843 | 0.066 | 0.015 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.088ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.018ms |
| 8b08ac8d2ac7d268000000000000090d | 42.058 | 5.313 | n/a | 0.000 | 1.136 | 1.611 | 0.780 | 0.010 | n/a | 0.037 | 33.163 | n/a | n/a | 0.007 | 6.449 | 0.153 | 0.007 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.100ms; driver.reader-basis.broadcast 0.078ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d26800000000000003a8 | 40.099 | 2.358 | n/a | 0.000 | 0.091 | 0.716 | 1.890 | 0.039 | n/a | 0.104 | 34.879 | n/a | n/a | 0.022 | 2.449 | 0.061 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.088ms; driver.publication.readback 0.086ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.045ms; driver.reader-basis.broadcast 0.038ms |
| 8b08ac8d2ac7d2680000000000000911 | 39.801 | 1.390 | n/a | 0.000 | 31.614 | 0.373 | 0.849 | 0.011 | n/a | 0.095 | 5.459 | n/a | n/a | 0.010 | 33.004 | 0.829 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.676ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.063ms; driver.publication.readback 0.047ms; driver.publication.readback 0.040ms |

## P2 / L1024 / commit / 5-10 facts (490 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.148 | 0.000 | 0.000 | 0.407 | 1.706 | n/a | 0.000 | 0.697 | 0.604 | 0.923 | 0.014 | n/a | 0.123 | 5.436 | n/a | n/a | 0.015 | 2.503 | 0.237 | 0.015 |
| p99 | 47.674 | 1.997 | 0.000 | 0.870 | 4.721 | n/a | 0.000 | 10.600 | 7.984 | 5.864 | 0.053 | n/a | 3.543 | 39.799 | n/a | n/a | 0.051 | 13.488 | 0.645 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000656 | 62.650 | 1.878 | n/a | 0.000 | 0.515 | 1.337 | 0.754 | 0.028 | n/a | 0.890 | 57.242 | n/a | n/a | 0.006 | 2.393 | 0.038 | 0.006 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.147ms; driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000000657 | 54.103 | 4.150 | n/a | 0.000 | 0.351 | 3.658 | 2.873 | 0.042 | n/a | 1.624 | 41.386 | n/a | n/a | 0.019 | 4.501 | 0.083 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.147ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000000655 | 53.891 | 1.694 | n/a | 0.000 | 0.626 | 1.846 | 0.624 | 0.005 | n/a | 0.021 | 49.063 | n/a | n/a | 0.011 | 2.320 | 0.043 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.081ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000000846 | 49.650 | 2.353 | n/a | 0.000 | 0.848 | 0.701 | 1.327 | 0.020 | n/a | 2.053 | 42.301 | n/a | n/a | 0.047 | 3.200 | 0.064 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d26800000000000002e3 | 47.674 | 7.182 | n/a | 0.000 | 0.146 | 2.703 | 6.765 | 0.052 | n/a | 0.914 | 29.897 | n/a | n/a | 0.014 | 7.328 | 0.154 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000848 | 47.448 | 2.281 | n/a | 0.000 | 39.893 | 0.606 | 0.851 | 0.013 | n/a | 0.408 | 3.382 | n/a | n/a | 0.014 | 42.174 | 0.889 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.056ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d26800000000000003a5 | 44.226 | 2.063 | n/a | 0.000 | 0.464 | 0.775 | 0.993 | 0.017 | n/a | 0.100 | 39.799 | n/a | n/a | 0.015 | 2.527 | 0.057 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.033ms |
| 8b08ac8d2ac7d2680000000000000847 | 43.398 | 1.504 | n/a | 0.000 | 0.514 | 1.148 | 1.044 | 0.018 | n/a | 0.575 | 38.583 | n/a | n/a | 0.012 | 2.017 | 0.046 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000911 | 39.801 | 1.390 | n/a | 0.000 | 31.614 | 0.373 | 0.849 | 0.011 | n/a | 0.095 | 5.459 | n/a | n/a | 0.010 | 33.004 | 0.829 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.676ms; driver.expected-state.bind-receipt 1.001ms; driver.publication.readback 0.063ms; driver.publication.readback 0.047ms; driver.publication.readback 0.040ms |
| 8b08ac8d2ac7d26800000000000003a6 | 39.437 | 1.925 | n/a | 0.000 | 0.552 | 0.463 | 0.812 | 0.014 | n/a | 0.111 | 35.538 | n/a | n/a | 0.022 | 2.477 | 0.063 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.088ms; driver.publication.persist-deferred 0.045ms |
| 8b08ac8d2ac7d2680000000000000822 | 39.008 | 1.390 | n/a | 0.000 | 17.444 | 2.067 | 1.218 | 0.022 | n/a | 0.137 | 16.719 | n/a | n/a | 0.011 | 18.834 | 0.483 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.145ms; driver.reader-basis.broadcast 0.087ms; driver.publication.readback 0.075ms; driver.publication.readback 0.054ms; driver.publication.readback 0.052ms |
| 8b08ac8d2ac7d2680000000000000330 | 38.419 | 1.660 | n/a | 0.000 | 29.913 | 0.622 | 0.568 | 0.009 | n/a | 0.038 | 5.576 | n/a | n/a | 0.033 | 31.573 | 0.822 | 0.033 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.136ms; driver.publication.readback 0.116ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.036ms; driver.publication.persist-deferred 0.027ms |
| 8b08ac8d2ac7d2680000000000000858 | 37.268 | 3.277 | n/a | 0.000 | 0.092 | 0.583 | 0.451 | 0.007 | n/a | 0.050 | 32.786 | n/a | n/a | 0.021 | 3.369 | 0.090 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| 8b08ac8d2ac7d268000000000000032e | 35.977 | 2.420 | n/a | 0.000 | 0.384 | 0.779 | 1.491 | 0.023 | n/a | 0.210 | 30.649 | n/a | n/a | 0.020 | 2.804 | 0.078 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| 8b08ac8d2ac7d268000000000000062e | 34.653 | 1.124 | n/a | 0.000 | 0.569 | 8.301 | 0.886 | 0.015 | n/a | 0.062 | 23.687 | n/a | n/a | 0.010 | 1.693 | 0.049 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.147ms; driver.publication.readback 0.208ms; driver.publication.persist-deferred 0.019ms |
| 8b08ac8d2ac7d26800000000000004ac | 34.188 | 1.847 | n/a | 0.000 | 2.111 | 0.510 | 0.645 | 0.006 | n/a | 0.023 | 29.035 | n/a | n/a | 0.010 | 3.959 | 0.116 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.126ms; driver.reader-basis.broadcast 0.105ms; driver.publication.readback 0.075ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.043ms |
| 8b08ac8d2ac7d26800000000000003ec | 33.512 | 2.350 | n/a | 0.000 | 0.679 | 0.400 | 13.357 | 0.019 | n/a | 0.050 | 16.649 | n/a | n/a | 0.008 | 3.029 | 0.090 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000515 | 33.172 | 2.193 | n/a | 0.000 | 1.219 | 0.411 | 0.559 | 0.008 | n/a | 0.156 | 28.613 | n/a | n/a | 0.014 | 3.411 | 0.103 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.006ms |
| 8b08ac8d2ac7d268000000000000074c | 32.976 | 1.619 | n/a | 0.000 | 0.352 | 0.348 | 0.780 | 0.007 | n/a | 0.067 | 29.792 | n/a | n/a | 0.010 | 1.971 | 0.060 | 0.010 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| 8b08ac8d2ac7d268000000000000058e | 32.764 | 1.667 | n/a | 0.000 | 0.277 | 1.125 | 0.712 | 0.010 | n/a | 3.068 | 25.896 | n/a | n/a | 0.009 | 1.943 | 0.059 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms |

## P2 / tail / commit (2623 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.147 | 0.101 | 0.000 | 0.485 | 2.150 | n/a | 0.000 | 0.639 | 0.548 | 0.912 | 0.012 | n/a | 0.085 | 4.856 | n/a | n/a | 0.013 | 2.889 | 0.290 | 0.013 |
| p99 | 33.454 | 2.007 | 0.019 | 1.999 | 6.966 | n/a | 0.000 | 10.007 | 5.698 | 6.121 | 0.043 | n/a | 2.258 | 23.978 | n/a | n/a | 0.043 | 12.428 | 0.668 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d2680000000000000a3c | 45.909 | 3.046 | n/a | 0.000 | 37.416 | 1.446 | 0.875 | 0.013 | n/a | 0.084 | 3.008 | n/a | n/a | 0.021 | 40.462 | 0.881 | 0.021 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.243ms; driver.publication.readback 0.095ms; driver.publication.readback 0.093ms; driver.reader-basis.broadcast 0.086ms; driver.publication.readback 0.051ms |
| 8b08ac8d2ac7d2680000000000000f53 | 45.677 | 2.440 | n/a | 0.000 | 0.765 | 0.933 | 1.463 | 0.017 | n/a | 0.058 | 39.994 | n/a | n/a | 0.007 | 3.205 | 0.070 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d26800000000000011c5 | 44.477 | 1.044 | n/a | 0.000 | 34.437 | 1.794 | 0.596 | 0.011 | n/a | 0.320 | 6.266 | n/a | n/a | 0.010 | 35.481 | 0.798 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.325ms; driver.publication.readback 0.153ms; driver.publication.readback 0.116ms; driver.publication.readback 0.111ms; driver.publication.readback 0.110ms |
| 8b08ac8d2ac7d268000000000000154b | 44.419 | 3.171 | 1.022 | 0.242 | 0.074 | 1.250 | 4.556 | 0.018 | n/a | 0.222 | 33.840 | n/a | n/a | 0.024 | 4.509 | 0.102 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.487ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d26800000000000013ca | 43.369 | 3.196 | n/a | 0.000 | 0.304 | 0.300 | 1.123 | 0.011 | n/a | 0.050 | 38.375 | n/a | n/a | 0.010 | 3.500 | 0.081 | 0.010 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.208ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.013ms |
| 8b08ac8d2ac7d2680000000000001c00 | 43.273 | 4.007 | n/a | 0.000 | 0.162 | 1.609 | 0.851 | 0.007 | n/a | 0.017 | 36.618 | n/a | n/a | 0.004 | 4.169 | 0.096 | 0.004 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.194ms; driver.publication.persist-deferred 0.045ms; driver.publication.persist-deferred 0.002ms |
| 8b08ac8d2ac7d2680000000000001bff | 42.187 | 1.570 | n/a | 0.000 | 0.548 | 2.206 | 0.806 | 0.012 | n/a | 0.912 | 36.100 | n/a | n/a | 0.034 | 2.118 | 0.050 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.194ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d2680000000000000f54 | 42.037 | 1.153 | n/a | 0.000 | 0.901 | 0.283 | 0.868 | 0.011 | n/a | 0.035 | 38.780 | n/a | n/a | 0.006 | 2.054 | 0.049 | 0.006 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000001dcb | 39.252 | 3.209 | 0.270 | 0.000 | 0.107 | 0.926 | 6.121 | 0.019 | n/a | 0.046 | 28.525 | n/a | n/a | 0.029 | 3.586 | 0.091 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000a3b | 37.826 | 4.763 | n/a | 0.000 | 0.339 | 2.519 | 1.114 | 0.013 | n/a | 0.960 | 28.110 | n/a | n/a | 0.007 | 5.102 | 0.135 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms; driver.publication.persist-deferred 0.014ms |
| 8b08ac8d2ac7d2680000000000000b54 | 37.789 | 2.946 | n/a | 0.000 | 0.280 | 0.492 | 1.180 | 0.012 | n/a | 0.357 | 32.504 | n/a | n/a | 0.019 | 3.225 | 0.085 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d26800000000000011c3 | 37.714 | 6.277 | n/a | 0.000 | 0.209 | 10.307 | 2.111 | 0.035 | n/a | 0.115 | 18.650 | n/a | n/a | 0.011 | 6.487 | 0.172 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.325ms; driver.publication.readback 0.153ms; driver.publication.readback 0.116ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.043ms |
| 8b08ac8d2ac7d2680000000000001452 | 36.750 | 2.255 | n/a | 0.000 | 19.850 | 2.847 | 1.354 | 0.024 | n/a | 2.963 | 7.442 | n/a | n/a | 0.014 | 22.105 | 0.601 | 0.014 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.145ms |
| 8b08ac8d2ac7d26800000000000009ed | 36.615 | 2.789 | n/a | 0.000 | 1.108 | 0.659 | 1.244 | 0.021 | n/a | 1.803 | 28.954 | n/a | n/a | 0.036 | 3.897 | 0.106 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.141ms; driver.reader-basis.broadcast 0.108ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.019ms |
| 8b08ac8d2ac7d26800000000000013ea | 36.412 | 3.425 | 0.159 | 0.380 | 0.014 | 0.871 | 9.190 | 0.013 | n/a | 2.163 | 20.183 | n/a | n/a | 0.013 | 3.979 | 0.109 | 0.013 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.046ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d268000000000000107f | 36.140 | 3.844 | n/a | 0.000 | 0.355 | 2.692 | 2.492 | 0.018 | n/a | 0.061 | 26.666 | n/a | n/a | 0.011 | 4.200 | 0.116 | 0.011 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d2680000000000001360 | 35.991 | 1.612 | n/a | 0.000 | 0.644 | 0.263 | 0.816 | 0.008 | n/a | 0.035 | 32.596 | n/a | n/a | 0.018 | 2.256 | 0.063 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms |
| 8b08ac8d2ac7d268000000000000135f | 35.871 | 3.375 | n/a | 0.000 | 0.086 | 0.791 | 1.000 | 0.011 | n/a | 0.060 | 30.517 | n/a | n/a | 0.030 | 3.461 | 0.096 | 0.030 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.480ms |
| 8b08ac8d2ac7d26800000000000010df | 35.463 | 4.139 | n/a | 0.000 | 0.632 | 1.762 | 23.983 | 0.021 | n/a | 0.058 | 4.856 | n/a | n/a | 0.013 | 4.771 | 0.135 | 0.013 | gw-w/thread-64/commit.prepare-and-validate | driver.reader-basis.broadcast 0.212ms |
| 8b08ac8d2ac7d2680000000000001553 | 35.228 | 1.641 | n/a | 0.000 | 28.183 | 0.644 | 1.112 | 0.016 | n/a | 0.291 | 3.330 | n/a | n/a | 0.011 | 29.824 | 0.847 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.050ms; driver.publication.readback 0.050ms; driver.publication.readback 0.035ms |

## P2 / tail / commit / 5-10 facts (1558 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.969 | 0.000 | 0.000 | 0.382 | 1.676 | n/a | 0.000 | 0.648 | 0.533 | 0.778 | 0.012 | n/a | 0.084 | 4.369 | n/a | n/a | 0.013 | 2.439 | 0.276 | 0.013 |
| p99 | 31.329 | 1.725 | 0.000 | 0.877 | 4.815 | n/a | 0.000 | 9.870 | 5.171 | 4.508 | 0.042 | n/a | 1.842 | 21.572 | n/a | n/a | 0.044 | 12.157 | 0.673 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b08ac8d2ac7d26800000000000011c5 | 44.477 | 1.044 | n/a | 0.000 | 34.437 | 1.794 | 0.596 | 0.011 | n/a | 0.320 | 6.266 | n/a | n/a | 0.010 | 35.481 | 0.798 | 0.010 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.325ms; driver.publication.readback 0.153ms; driver.publication.readback 0.116ms; driver.publication.readback 0.111ms; driver.publication.readback 0.110ms |
| 8b08ac8d2ac7d2680000000000001bff | 42.187 | 1.570 | n/a | 0.000 | 0.548 | 2.206 | 0.806 | 0.012 | n/a | 0.912 | 36.100 | n/a | n/a | 0.034 | 2.118 | 0.050 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.194ms; driver.publication.persist-deferred 0.017ms |
| 8b08ac8d2ac7d2680000000000000f54 | 42.037 | 1.153 | n/a | 0.000 | 0.901 | 0.283 | 0.868 | 0.011 | n/a | 0.035 | 38.780 | n/a | n/a | 0.006 | 2.054 | 0.049 | 0.006 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d26800000000000011c3 | 37.714 | 6.277 | n/a | 0.000 | 0.209 | 10.307 | 2.111 | 0.035 | n/a | 0.115 | 18.650 | n/a | n/a | 0.011 | 6.487 | 0.172 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.325ms; driver.publication.readback 0.153ms; driver.publication.readback 0.116ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.043ms |
| 8b08ac8d2ac7d2680000000000001452 | 36.750 | 2.255 | n/a | 0.000 | 19.850 | 2.847 | 1.354 | 0.024 | n/a | 2.963 | 7.442 | n/a | n/a | 0.014 | 22.105 | 0.601 | 0.014 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.145ms |
| 8b08ac8d2ac7d26800000000000009ed | 36.615 | 2.789 | n/a | 0.000 | 1.108 | 0.659 | 1.244 | 0.021 | n/a | 1.803 | 28.954 | n/a | n/a | 0.036 | 3.897 | 0.106 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.141ms; driver.reader-basis.broadcast 0.108ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms; driver.publication.persist-deferred 0.019ms |
| 8b08ac8d2ac7d2680000000000001360 | 35.991 | 1.612 | n/a | 0.000 | 0.644 | 0.263 | 0.816 | 0.008 | n/a | 0.035 | 32.596 | n/a | n/a | 0.018 | 2.256 | 0.063 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.021ms |
| 8b08ac8d2ac7d268000000000000135f | 35.871 | 3.375 | n/a | 0.000 | 0.086 | 0.791 | 1.000 | 0.011 | n/a | 0.060 | 30.517 | n/a | n/a | 0.030 | 3.461 | 0.096 | 0.030 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.480ms |
| 8b08ac8d2ac7d2680000000000001553 | 35.228 | 1.641 | n/a | 0.000 | 28.183 | 0.644 | 1.112 | 0.016 | n/a | 0.291 | 3.330 | n/a | n/a | 0.011 | 29.824 | 0.847 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.050ms; driver.publication.readback 0.050ms; driver.publication.readback 0.035ms |
| 8b08ac8d2ac7d26800000000000018b3 | 34.465 | 2.168 | n/a | 0.000 | 1.521 | 1.916 | 7.089 | 0.020 | n/a | 0.043 | 21.704 | n/a | n/a | 0.003 | 3.689 | 0.107 | 0.003 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.007ms |
| 8b08ac8d2ac7d2680000000000000a3a | 34.350 | 1.499 | n/a | 0.000 | 0.588 | 3.822 | 0.556 | 0.006 | n/a | 0.022 | 27.838 | n/a | n/a | 0.019 | 2.087 | 0.061 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.086ms |
| 8b08ac8d2ac7d2680000000000000dd8 | 33.387 | 1.475 | n/a | 0.000 | 0.336 | 0.438 | 0.857 | 0.011 | n/a | 0.236 | 30.023 | n/a | n/a | 0.012 | 1.811 | 0.054 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.354ms |
| 8b08ac8d2ac7d26800000000000011f0 | 33.182 | 4.423 | n/a | 0.000 | 1.133 | 6.582 | 6.838 | 0.036 | n/a | 0.117 | 14.042 | n/a | n/a | 0.011 | 5.556 | 0.167 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.016ms |
| 8b08ac8d2ac7d2680000000000000f7d | 32.689 | 0.985 | n/a | 0.000 | 0.033 | 0.553 | 1.010 | 0.016 | n/a | 0.070 | 30.019 | n/a | n/a | 0.004 | 1.017 | 0.031 | 0.004 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.111ms; driver.publication.readback 0.063ms; driver.publication.readback 0.050ms; driver.publication.readback 0.026ms; driver.publication.readback 0.025ms |
| 8b08ac8d2ac7d2680000000000001a26 | 32.284 | 1.927 | n/a | 0.000 | 1.268 | 0.376 | 0.729 | 0.009 | n/a | 0.053 | 27.910 | n/a | n/a | 0.011 | 3.196 | 0.099 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.294ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.015ms |
| 8b08ac8d2ac7d2680000000000001a25 | 31.329 | 2.577 | n/a | 0.000 | 0.414 | 0.420 | 0.844 | 0.012 | n/a | 0.051 | 26.988 | n/a | n/a | 0.022 | 2.991 | 0.095 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.294ms |
| 8b08ac8d2ac7d2680000000000000c6d | 30.483 | 1.719 | n/a | 0.000 | 0.558 | 4.253 | 0.576 | 0.008 | n/a | 0.109 | 23.253 | n/a | n/a | 0.008 | 2.277 | 0.075 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.016ms |
| 8b08ac8d2ac7d2680000000000000af0 | 30.306 | 2.668 | n/a | 0.000 | 17.742 | 0.598 | 0.912 | 0.042 | n/a | 0.111 | 8.212 | n/a | n/a | 0.022 | 20.410 | 0.673 | 0.022 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.125ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.043ms |
| 8b08ac8d2ac7d2680000000000000c6e | 29.862 | 1.646 | n/a | 0.000 | 0.604 | 2.779 | 0.677 | 0.010 | n/a | 0.062 | 24.075 | n/a | n/a | 0.008 | 2.250 | 0.075 | 0.008 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 8b08ac8d2ac7d2680000000000000e68 | 29.078 | 4.485 | n/a | 0.000 | 0.155 | 19.867 | 1.893 | 0.041 | n/a | 0.611 | 2.006 | n/a | n/a | 0.021 | 4.639 | 0.160 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.103ms |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.733 | 200.476 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 |
| p99 | 475.050 | n/a | n/a | n/a | 19.019 | n/a | 1.254 | 0.000 | 13.305 | 458.650 | 0.116 | n/a | 0.177 | 0.000 | n/a | n/a | 42.476 | 20.273 | 0.295 | 42.476 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000000002 | 475.050 | 2.577 | n/a | 0.000 | 0.000 | 13.305 | 458.650 | 0.116 | n/a | 0.089 | 0.000 | n/a | n/a | 0.312 | 2.577 | 0.005 | 0.312 | gw-r/thread-44/gateway.admitted-work | none observed |
| c193ccff7955ffcb0000000000000f47 | 204.274 | 0.000 | n/a | 0.000 | 0.000 | 3.733 | 200.423 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-64/journal/page | none observed |
| c193ccff7955ffcb0000000000000005 | 202.876 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.423 | 0.031 | n/a | 0.177 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000006 | 202.544 | 0.000 | n/a | 0.000 | 0.000 | 1.030 | 201.172 | 0.012 | n/a | 0.143 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000f48 | 201.009 | 0.000 | n/a | 0.000 | 0.000 | 0.349 | 200.531 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000f49 | 200.887 | 0.000 | n/a | 0.000 | 0.000 | 0.314 | 200.476 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000f4c | 68.642 | 19.019 | n/a | 1.254 | 0.000 | 5.893 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.476 | 20.273 | 0.295 | 42.476 | node-14/thread-5/socket.wait-first-byte | none observed |
| c193ccff7955ffcb0000000000000f4e | 60.668 | 17.743 | n/a | 0.000 | 0.000 | 4.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.635 | 17.743 | 0.292 | 38.635 | node-14/thread-5/socket.wait-first-byte | none observed |
| c193ccff7955ffcb0000000000000f4d | 56.447 | 14.697 | n/a | 0.000 | 0.000 | 4.802 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.949 | 14.697 | 0.260 | 36.949 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 833.871 | n/a | n/a | n/a | 2.647 | n/a | 0.000 | 0.000 | 1.528 | 812.745 | 0.014 | n/a | 0.251 | 0.000 | n/a | n/a | 1.243 | 2.647 | 0.022 | 1.243 |
| p99 | 1006.577 | n/a | n/a | n/a | 18.524 | n/a | 0.000 | 0.000 | 2.058 | 1003.195 | 0.020 | n/a | 0.306 | 0.000 | n/a | n/a | 1.323 | 18.524 | 0.630 | 1.323 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec683100000000000000a4 | 1006.577 | 0.265 | n/a | 0.000 | 0.000 | 1.528 | 1003.195 | 0.014 | n/a | 0.251 | 0.000 | n/a | n/a | 1.323 | 0.265 | 0.000 | 1.323 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000a5 | 833.871 | 18.524 | n/a | 0.000 | 0.000 | 2.058 | 812.745 | 0.020 | n/a | 0.306 | 0.000 | n/a | n/a | 0.217 | 18.524 | 0.022 | 0.217 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000832 | 4.201 | 2.647 | n/a | 0.000 | 0.000 | 0.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.243 | 2.647 | 0.630 | 1.243 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.735 | n/a | n/a | n/a | 2.567 | n/a | 0.000 | 0.000 | 0.738 | 447.571 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.094 | 2.567 | 0.007 | 0.094 |
| p99 | 1003.306 | n/a | n/a | n/a | 10.416 | n/a | 0.000 | 0.000 | 2.998 | 1001.229 | 0.063 | n/a | 0.159 | 0.000 | n/a | n/a | 26.702 | 10.416 | 0.158 | 26.702 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec683100000000000000bb | 1003.306 | 0.123 | n/a | 0.000 | 0.000 | 0.681 | 1001.229 | 0.014 | n/a | 0.155 | 0.000 | n/a | n/a | 1.104 | 0.123 | 0.000 | 1.104 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000d0 | 995.055 | 7.137 | n/a | 0.000 | 0.000 | 0.871 | 986.878 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.078 | 7.137 | 0.007 | 0.078 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000b4 | 990.874 | 2.307 | n/a | 0.000 | 0.000 | 1.285 | 987.107 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.094 | 2.307 | 0.002 | 0.094 | gw-r/thread-61/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000ae | 985.232 | 2.535 | n/a | 0.000 | 0.000 | 0.691 | 981.815 | 0.014 | n/a | 0.097 | 0.000 | n/a | n/a | 0.080 | 2.535 | 0.003 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000ba | 977.646 | 2.486 | n/a | 0.000 | 0.000 | 0.738 | 974.133 | 0.041 | n/a | 0.159 | 0.000 | n/a | n/a | 0.090 | 2.486 | 0.003 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000ab | 891.146 | 3.851 | n/a | 0.000 | 0.000 | 0.719 | 886.223 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.248 | 3.851 | 0.004 | 0.248 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000a8 | 855.998 | 2.050 | n/a | 0.000 | 0.000 | 2.998 | 850.724 | 0.018 | n/a | 0.118 | 0.000 | n/a | n/a | 0.091 | 2.050 | 0.002 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000c2 | 803.639 | 5.697 | n/a | 0.000 | 0.000 | 0.519 | 797.233 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.108 | 5.697 | 0.007 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000cb | 680.239 | 2.188 | n/a | 0.000 | 0.000 | 2.031 | 675.877 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.074 | 2.188 | 0.003 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000b3 | 622.302 | 2.676 | n/a | 0.000 | 0.000 | 0.752 | 618.697 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.073 | 2.676 | 0.004 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000ca | 570.746 | 4.720 | n/a | 0.000 | 0.000 | 0.778 | 564.987 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.181 | 4.720 | 0.008 | 0.181 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000c1 | 568.774 | 2.347 | n/a | 0.000 | 0.000 | 0.686 | 565.570 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.086 | 2.347 | 0.004 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000c6 | 518.868 | 2.271 | n/a | 0.000 | 0.000 | 1.685 | 514.714 | 0.018 | n/a | 0.110 | 0.000 | n/a | n/a | 0.069 | 2.271 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000c5 | 475.812 | 1.786 | n/a | 0.000 | 0.000 | 0.879 | 473.001 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.067 | 1.786 | 0.004 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000c8 | 450.735 | 2.212 | n/a | 0.000 | 0.000 | 0.767 | 447.571 | 0.018 | n/a | 0.095 | 0.000 | n/a | n/a | 0.072 | 2.212 | 0.005 | 0.072 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000b7 | 435.392 | 2.762 | n/a | 0.000 | 0.000 | 0.502 | 431.952 | 0.039 | n/a | 0.060 | 0.000 | n/a | n/a | 0.076 | 2.762 | 0.006 | 0.076 | gw-r/thread-61/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000a7 | 330.452 | 2.458 | n/a | 0.000 | 0.000 | 0.783 | 326.945 | 0.011 | n/a | 0.142 | 0.000 | n/a | n/a | 0.113 | 2.458 | 0.007 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000b1 | 314.171 | 6.979 | n/a | 0.000 | 0.000 | 0.833 | 306.134 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.122 | 6.979 | 0.022 | 0.122 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000b5 | 289.341 | 10.416 | n/a | 0.000 | 0.000 | 0.488 | 278.153 | 0.018 | n/a | 0.100 | 0.000 | n/a | n/a | 0.166 | 10.416 | 0.036 | 0.166 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000b9 | 282.973 | 5.394 | n/a | 0.000 | 0.000 | 0.436 | 276.854 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.180 | 5.394 | 0.019 | 0.180 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 450.839 | n/a | n/a | n/a | 3.617 | n/a | 0.612 | 0.000 | 0.636 | 445.438 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.102 | 4.211 | 0.013 | 0.102 |
| p99 | 1003.920 | n/a | n/a | n/a | 15.480 | n/a | 5.429 | 0.000 | 3.582 | 1001.768 | 0.216 | n/a | 0.289 | 0.000 | n/a | n/a | 42.822 | 20.909 | 0.671 | 42.822 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec683100000000000000d1 | 1003.920 | 0.206 | n/a | 0.000 | 0.000 | 0.618 | 1001.768 | 0.025 | n/a | 0.160 | 0.000 | n/a | n/a | 1.141 | 0.206 | 0.000 | 1.141 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000d3 | 998.387 | 4.920 | n/a | 0.000 | 0.000 | 0.554 | 992.633 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.198 | 4.920 | 0.005 | 0.198 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000010d | 998.317 | 2.670 | n/a | 0.000 | 0.000 | 3.582 | 991.931 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.056 | 2.670 | 0.003 | 0.056 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000d9 | 989.710 | 4.527 | n/a | 0.000 | 0.000 | 1.122 | 983.806 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.185 | 4.527 | 0.005 | 0.185 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000da | 979.688 | 2.474 | n/a | 0.000 | 0.000 | 0.532 | 976.477 | 0.018 | n/a | 0.113 | 0.000 | n/a | n/a | 0.075 | 2.474 | 0.003 | 0.075 | gw-r/thread-61/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000df | 976.051 | 2.877 | n/a | 0.000 | 0.000 | 0.543 | 972.425 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.084 | 2.877 | 0.003 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000101 | 966.336 | 2.986 | n/a | 0.000 | 0.000 | 0.565 | 962.646 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.067 | 2.986 | 0.003 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000fe | 950.367 | 3.174 | n/a | 1.457 | 0.000 | 1.571 | 944.014 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.068 | 4.631 | 0.005 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000de | 947.649 | 2.243 | n/a | 0.000 | 0.000 | 0.540 | 944.714 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.082 | 2.243 | 0.002 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000105 | 945.941 | 2.833 | n/a | 0.000 | 0.000 | 1.354 | 941.621 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.067 | 2.833 | 0.003 | 0.067 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000e0 | 887.899 | 15.480 | n/a | 5.429 | 0.000 | 2.061 | 864.723 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.126 | 20.909 | 0.024 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000102 | 840.152 | 2.691 | n/a | 0.000 | 0.000 | 0.562 | 836.764 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.065 | 2.691 | 0.003 | 0.065 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000e4 | 760.018 | 3.617 | n/a | 0.665 | 0.000 | 1.449 | 754.110 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.083 | 4.282 | 0.006 | 0.083 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000eb | 659.680 | 2.370 | n/a | 0.000 | 0.000 | 0.630 | 656.531 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.070 | 2.370 | 0.004 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000fb | 620.662 | 6.331 | n/a | 1.447 | 0.000 | 0.618 | 612.078 | 0.024 | n/a | 0.091 | 0.000 | n/a | n/a | 0.073 | 7.777 | 0.013 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000db | 563.616 | 4.156 | n/a | 0.000 | 0.000 | 1.646 | 557.629 | 0.020 | n/a | 0.081 | 0.000 | n/a | n/a | 0.084 | 4.156 | 0.007 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000e8 | 556.439 | 3.578 | n/a | 0.633 | 0.000 | 3.327 | 548.679 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.141 | 4.211 | 0.008 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000dd | 532.415 | 3.385 | n/a | 0.000 | 0.000 | 0.636 | 528.142 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.173 | 3.385 | 0.006 | 0.173 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000107 | 467.255 | 9.410 | n/a | 4.447 | 0.000 | 0.596 | 452.631 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.102 | 13.856 | 0.030 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000000d4 | 460.177 | 2.607 | n/a | 0.000 | 0.000 | 0.603 | 456.820 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.077 | 2.607 | 0.006 | 0.077 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / internal (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 403.000 | n/a | n/a | n/a | 3.169 | n/a | 0.000 | 0.000 | 0.603 | 399.434 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.086 | 3.608 | 0.009 | 0.086 |
| p99 | 1005.178 | n/a | n/a | n/a | 10.971 | n/a | 1.650 | 0.000 | 3.263 | 1000.189 | 1.185 | n/a | 0.104 | 0.000 | n/a | n/a | 40.686 | 11.668 | 0.135 | 40.686 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000000114 | 1005.178 | 6.602 | n/a | 0.000 | 0.000 | 0.941 | 997.399 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.193 | 6.602 | 0.007 | 0.193 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000129 | 1003.689 | 2.792 | n/a | 0.000 | 0.000 | 0.603 | 1000.189 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 2.792 | 0.003 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000125 | 1003.461 | 2.714 | n/a | 0.000 | 0.000 | 0.668 | 999.958 | 0.012 | n/a | 0.039 | 0.000 | n/a | n/a | 0.069 | 2.714 | 0.003 | 0.069 | gw-r/thread-61/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000012a | 1002.750 | 5.060 | n/a | 0.853 | 0.000 | 0.594 | 996.009 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.191 | 5.913 | 0.006 | 0.191 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000136 | 1000.600 | 3.029 | n/a | 0.000 | 0.000 | 0.756 | 996.702 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.068 | 3.029 | 0.003 | 0.068 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000011c | 976.415 | 4.422 | n/a | 0.000 | 0.000 | 0.501 | 971.375 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.075 | 4.422 | 0.005 | 0.075 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000013f | 918.118 | 2.513 | n/a | 0.000 | 0.000 | 0.496 | 915.017 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.061 | 2.513 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000111 | 883.408 | 2.326 | n/a | 0.000 | 0.000 | 1.541 | 879.444 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.062 | 2.326 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000011d | 797.297 | 4.177 | n/a | 0.892 | 0.000 | 0.563 | 791.470 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.151 | 5.069 | 0.006 | 0.151 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000126 | 794.358 | 6.063 | n/a | 0.763 | 0.000 | 1.750 | 785.662 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 6.826 | 0.009 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000147 | 743.453 | 2.294 | n/a | 0.000 | 0.000 | 0.610 | 740.398 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.086 | 2.294 | 0.003 | 0.086 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000010e | 731.372 | 5.199 | n/a | 0.000 | 0.000 | 2.464 | 723.501 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.152 | 5.199 | 0.007 | 0.152 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000133 | 715.895 | 3.094 | n/a | 0.000 | 0.000 | 0.904 | 711.762 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.082 | 3.094 | 0.004 | 0.082 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000013b | 675.577 | 2.766 | n/a | 0.000 | 0.000 | 0.917 | 671.753 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.069 | 2.766 | 0.004 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000132 | 672.510 | 6.345 | n/a | 0.000 | 0.000 | 0.609 | 665.251 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.194 | 6.345 | 0.009 | 0.194 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000140 | 671.422 | 3.624 | n/a | 0.000 | 0.000 | 0.540 | 667.134 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.078 | 3.624 | 0.005 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000123 | 627.483 | 3.169 | n/a | 1.650 | 0.000 | 0.411 | 622.108 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.101 | 4.819 | 0.008 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000137 | 614.812 | 10.971 | n/a | 0.697 | 0.000 | 3.263 | 599.714 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.106 | 11.668 | 0.019 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000012c | 599.205 | 2.422 | n/a | 0.932 | 0.000 | 2.285 | 593.421 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.090 | 3.354 | 0.006 | 0.090 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000138 | 403.000 | 2.786 | n/a | 0.000 | 0.000 | 0.616 | 399.434 | 0.019 | n/a | 0.076 | 0.000 | n/a | n/a | 0.070 | 2.786 | 0.007 | 0.070 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 396.577 | n/a | n/a | n/a | 2.444 | n/a | 0.000 | 0.000 | 0.600 | 393.570 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.071 | 2.500 | 0.006 | 0.071 |
| p99 | 1003.146 | n/a | n/a | n/a | 9.351 | n/a | 0.924 | 0.000 | 4.268 | 1001.274 | 2.292 | n/a | 0.199 | 0.000 | n/a | n/a | 49.159 | 9.351 | 0.465 | 49.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000000162 | 1003.146 | 0.112 | n/a | 0.000 | 0.000 | 0.565 | 1001.274 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 1.104 | 0.112 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000184 | 1002.797 | 0.120 | n/a | 0.000 | 0.000 | 0.514 | 1000.929 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 1.165 | 0.120 | 0.000 | 1.165 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000016c | 1002.678 | 0.100 | n/a | 0.000 | 0.000 | 0.735 | 1000.700 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 1.096 | 0.100 | 0.000 | 1.096 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000152 | 1002.072 | 2.947 | n/a | 0.000 | 0.000 | 0.493 | 998.492 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.109 | 2.947 | 0.003 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000017d | 1002.057 | 2.244 | n/a | 0.000 | 0.000 | 2.198 | 997.465 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.062 | 2.244 | 0.002 | 0.062 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000183 | 995.040 | 6.112 | n/a | 0.000 | 0.000 | 0.674 | 988.041 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.173 | 6.112 | 0.006 | 0.173 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000172 | 914.297 | 3.096 | n/a | 0.000 | 0.000 | 0.590 | 910.513 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.058 | 3.096 | 0.003 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000157 | 793.641 | 5.642 | n/a | 0.000 | 0.000 | 1.201 | 786.232 | 0.348 | n/a | 0.054 | 0.000 | n/a | n/a | 0.165 | 5.642 | 0.007 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000153 | 771.093 | 1.998 | n/a | 0.000 | 0.000 | 0.656 | 766.796 | 1.539 | n/a | 0.041 | 0.000 | n/a | n/a | 0.062 | 1.998 | 0.003 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000179 | 740.878 | 3.191 | n/a | 0.000 | 0.000 | 1.802 | 735.665 | 0.005 | n/a | 0.147 | 0.000 | n/a | n/a | 0.068 | 3.191 | 0.004 | 0.068 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000014d | 647.337 | 3.985 | n/a | 0.000 | 0.000 | 1.698 | 641.402 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.169 | 3.985 | 0.006 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000181 | 598.638 | 2.252 | n/a | 0.000 | 0.000 | 0.485 | 595.764 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.072 | 2.252 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000016b | 589.133 | 2.260 | n/a | 0.000 | 0.000 | 0.480 | 586.287 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.065 | 2.260 | 0.004 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000164 | 584.249 | 9.351 | n/a | 0.000 | 0.000 | 0.733 | 574.035 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.076 | 9.351 | 0.016 | 0.076 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000175 | 556.539 | 2.191 | n/a | 0.000 | 0.000 | 4.268 | 549.944 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.055 | 2.191 | 0.004 | 0.055 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000187 | 546.781 | 2.450 | n/a | 0.808 | 0.000 | 0.963 | 542.424 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.089 | 3.258 | 0.006 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000017b | 541.872 | 2.395 | n/a | 0.000 | 0.000 | 0.437 | 538.871 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.132 | 2.395 | 0.004 | 0.132 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000170 | 527.531 | 2.444 | n/a | 0.000 | 0.000 | 0.661 | 524.252 | 0.009 | n/a | 0.100 | 0.000 | n/a | n/a | 0.064 | 2.444 | 0.005 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000017a | 459.260 | 1.690 | n/a | 0.000 | 0.000 | 0.415 | 457.056 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.071 | 1.690 | 0.004 | 0.071 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000016e | 450.502 | 5.009 | n/a | 0.000 | 0.000 | 0.551 | 444.776 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.128 | 5.009 | 0.011 | 0.128 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 326.463 | n/a | n/a | n/a | 3.019 | n/a | 0.000 | 0.000 | 0.553 | 323.274 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 3.019 | 0.011 | 0.070 |
| p99 | 1007.082 | n/a | n/a | n/a | 10.474 | n/a | 0.698 | 0.000 | 7.701 | 1002.100 | 3.279 | n/a | 0.125 | 0.000 | n/a | n/a | 43.156 | 10.474 | 0.750 | 43.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000000189 | 1007.082 | 10.474 | n/a | 0.000 | 0.000 | 1.835 | 994.587 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.134 | 10.474 | 0.010 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001c2 | 1004.089 | 0.165 | n/a | 0.000 | 0.000 | 0.614 | 1002.100 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 1.161 | 0.165 | 0.000 | 1.161 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001a5 | 1002.557 | 0.124 | n/a | 0.000 | 0.000 | 0.482 | 1000.783 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 1.109 | 0.124 | 0.000 | 1.109 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001c4 | 1002.008 | 3.159 | n/a | 0.000 | 0.000 | 0.388 | 998.310 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.088 | 3.159 | 0.003 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000198 | 992.321 | 3.019 | n/a | 0.000 | 0.000 | 0.423 | 988.708 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.104 | 3.019 | 0.003 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001a4 | 986.884 | 2.306 | n/a | 0.000 | 0.000 | 0.484 | 983.972 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.060 | 2.306 | 0.002 | 0.060 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001a2 | 887.718 | 2.944 | n/a | 0.000 | 0.000 | 0.680 | 883.985 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.064 | 2.944 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000019a | 832.722 | 5.072 | n/a | 0.000 | 0.000 | 0.721 | 826.768 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.120 | 5.072 | 0.006 | 0.120 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001d4 | 794.268 | 1.689 | n/a | 0.000 | 0.000 | 0.364 | 792.092 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.067 | 1.689 | 0.002 | 0.067 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001c0 | 747.728 | 2.413 | n/a | 0.000 | 0.000 | 0.473 | 744.724 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.059 | 2.413 | 0.003 | 0.059 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000019e | 680.072 | 3.545 | n/a | 0.000 | 0.000 | 0.444 | 675.983 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.066 | 3.545 | 0.005 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001c5 | 656.217 | 4.176 | n/a | 0.000 | 0.000 | 0.592 | 651.369 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.054 | 4.176 | 0.006 | 0.054 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001b5 | 633.155 | 2.362 | n/a | 0.000 | 0.000 | 0.452 | 630.132 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.148 | 2.362 | 0.004 | 0.148 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001ae | 627.433 | 3.993 | n/a | 0.000 | 0.000 | 0.570 | 622.771 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.071 | 3.993 | 0.006 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001a7 | 620.249 | 3.731 | n/a | 0.000 | 0.000 | 0.685 | 615.685 | 0.004 | n/a | 0.067 | 0.000 | n/a | n/a | 0.077 | 3.731 | 0.006 | 0.077 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001b8 | 544.467 | 3.785 | n/a | 0.000 | 0.000 | 0.558 | 539.997 | 0.020 | n/a | 0.047 | 0.000 | n/a | n/a | 0.060 | 3.785 | 0.007 | 0.060 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001d0 | 543.667 | 2.226 | n/a | 0.000 | 0.000 | 3.800 | 537.534 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.067 | 2.226 | 0.004 | 0.067 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001cd | 526.848 | 2.453 | n/a | 0.000 | 0.000 | 0.510 | 523.796 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.055 | 2.453 | 0.005 | 0.055 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001b6 | 454.560 | 7.665 | n/a | 0.000 | 0.000 | 1.538 | 445.193 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.106 | 7.665 | 0.017 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000197 | 415.128 | 2.302 | n/a | 0.000 | 0.000 | 1.331 | 411.387 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.065 | 2.302 | 0.006 | 0.065 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 318.349 | n/a | n/a | n/a | 2.606 | n/a | 0.000 | 0.000 | 0.535 | 312.594 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 2.606 | 0.009 | 0.074 |
| p99 | 1003.360 | n/a | n/a | n/a | 11.678 | n/a | 0.000 | 0.000 | 4.625 | 1001.384 | 0.018 | n/a | 0.098 | 0.000 | n/a | n/a | 40.815 | 11.678 | 0.364 | 40.815 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000000212 | 1003.360 | 0.134 | n/a | 0.000 | 0.000 | 0.659 | 1001.384 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 1.112 | 0.134 | 0.000 | 1.112 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001fd | 1002.551 | 0.186 | n/a | 0.000 | 0.000 | 0.574 | 1000.560 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.184 | 0.186 | 0.000 | 1.184 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001e9 | 999.983 | 2.329 | n/a | 0.000 | 0.000 | 0.663 | 996.878 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.063 | 2.329 | 0.002 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000217 | 997.042 | 2.323 | n/a | 0.000 | 0.000 | 0.528 | 994.079 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.078 | 2.323 | 0.002 | 0.078 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000211 | 995.251 | 2.329 | n/a | 0.000 | 0.000 | 0.540 | 992.255 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.070 | 2.329 | 0.002 | 0.070 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000218 | 990.949 | 2.208 | n/a | 0.000 | 0.000 | 0.333 | 988.253 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.071 | 2.208 | 0.002 | 0.071 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000215 | 946.660 | 2.366 | n/a | 0.000 | 0.000 | 0.434 | 943.764 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.366 | 0.002 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000206 | 905.052 | 4.873 | n/a | 0.000 | 0.000 | 0.876 | 899.070 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.171 | 4.873 | 0.005 | 0.171 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001ff | 798.369 | 2.348 | n/a | 0.000 | 0.000 | 1.335 | 794.569 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.080 | 2.348 | 0.003 | 0.080 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001f6 | 786.930 | 2.222 | n/a | 0.000 | 0.000 | 0.406 | 784.190 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.070 | 2.222 | 0.003 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000202 | 782.520 | 4.153 | n/a | 0.000 | 0.000 | 0.685 | 777.534 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 4.153 | 0.005 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001ef | 766.021 | 2.184 | n/a | 0.000 | 0.000 | 0.439 | 763.293 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 2.184 | 0.003 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001dc | 762.712 | 2.611 | n/a | 0.000 | 0.000 | 0.405 | 759.570 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.057 | 2.611 | 0.003 | 0.057 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001f3 | 672.298 | 2.332 | n/a | 0.000 | 0.000 | 0.414 | 669.452 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.332 | 0.003 | 0.063 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001e8 | 636.003 | 2.192 | n/a | 0.000 | 0.000 | 0.481 | 633.187 | 0.018 | n/a | 0.058 | 0.000 | n/a | n/a | 0.067 | 2.192 | 0.003 | 0.067 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001d9 | 618.043 | 1.977 | n/a | 0.000 | 0.000 | 0.373 | 615.562 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.091 | 1.977 | 0.003 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001f8 | 565.368 | 1.780 | n/a | 0.000 | 0.000 | 0.385 | 563.088 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.059 | 1.780 | 0.003 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001e1 | 470.524 | 7.330 | n/a | 0.000 | 0.000 | 0.604 | 462.376 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.155 | 7.330 | 0.016 | 0.155 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000210 | 458.380 | 3.950 | n/a | 0.000 | 0.000 | 0.560 | 453.676 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.166 | 3.950 | 0.009 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec683100000000000001ed | 432.890 | 3.101 | n/a | 0.000 | 0.000 | 1.353 | 428.344 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 3.101 | 0.007 | 0.064 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / internal (759 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.725 | n/a | n/a | n/a | 3.000 | n/a | 0.000 | 0.000 | 0.224 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.989 | 3.000 | 0.250 | 6.989 |
| p99 | 125.746 | n/a | n/a | n/a | 11.461 | n/a | 1.084 | 0.000 | 0.710 | 123.280 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 47.901 | 12.552 | 0.827 | 47.901 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000000224 | 1002.194 | 0.099 | n/a | 0.000 | 0.000 | 0.378 | 1000.575 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 1.093 | 0.099 | 0.000 | 1.093 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000219 | 910.714 | 3.277 | n/a | 0.000 | 0.000 | 0.526 | 906.763 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.112 | 3.277 | 0.004 | 0.112 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000226 | 859.069 | 2.359 | n/a | 0.000 | 0.000 | 1.495 | 855.083 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.073 | 2.359 | 0.003 | 0.073 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000220 | 761.689 | 2.014 | n/a | 0.000 | 0.000 | 0.481 | 759.078 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.014 | 0.003 | 0.072 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000021c | 756.680 | 1.974 | n/a | 0.000 | 0.000 | 0.360 | 754.221 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.058 | 1.974 | 0.003 | 0.058 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000021e | 251.136 | 2.037 | n/a | 0.000 | 0.000 | 0.534 | 248.430 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.064 | 2.037 | 0.008 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000222 | 223.709 | 2.192 | n/a | 0.000 | 0.000 | 0.457 | 220.947 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.061 | 2.192 | 0.010 | 0.061 | gw-r/thread-43/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000312 | 125.746 | 2.020 | n/a | 0.000 | 0.000 | 0.344 | 123.280 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.052 | 2.020 | 0.016 | 0.052 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec683100000000000004ef | 108.723 | 9.529 | n/a | 0.706 | 0.000 | 0.493 | 97.846 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.114 | 10.234 | 0.094 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000635 | 99.109 | 4.024 | n/a | 0.000 | 0.000 | 0.486 | 94.501 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.055 | 4.024 | 0.041 | 0.055 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec683100000000000002f6 | 94.401 | 7.379 | n/a | 0.000 | 0.000 | 0.357 | 86.462 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.161 | 7.379 | 0.078 | 0.161 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000470 | 93.550 | 3.883 | n/a | 0.000 | 0.000 | 0.730 | 88.857 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.058 | 3.883 | 0.042 | 0.058 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000075f | 92.737 | 3.063 | n/a | 0.000 | 0.000 | 0.361 | 89.237 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.061 | 3.063 | 0.033 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000021a | 90.924 | 2.723 | n/a | 0.000 | 0.000 | 0.660 | 87.407 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.071 | 2.723 | 0.030 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec683100000000000005ee | 90.068 | 6.208 | n/a | 0.000 | 0.000 | 0.404 | 83.368 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.064 | 6.208 | 0.069 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000668 | 84.496 | 4.082 | n/a | 0.000 | 0.000 | 0.378 | 79.949 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.066 | 4.082 | 0.048 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000828 | 83.726 | 9.022 | n/a | 0.000 | 0.000 | 0.713 | 73.254 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.694 | 9.022 | 0.108 | 0.694 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec683100000000000007a4 | 82.416 | 2.209 | n/a | 0.000 | 0.000 | 0.499 | 79.611 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.065 | 2.209 | 0.027 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 1b9a2f6d69ec68310000000000000793 | 81.803 | 11.770 | n/a | 0.935 | 0.000 | 0.295 | 68.590 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.204 | 12.704 | 0.155 | 0.204 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec6831000000000000076d | 78.172 | 5.522 | n/a | 0.000 | 0.000 | 0.554 | 71.990 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.074 | 5.522 | 0.071 | 0.074 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / internal (2328 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.120 | n/a | n/a | n/a | 3.707 | n/a | 0.000 | 0.000 | 0.206 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.243 | 3.725 | 0.320 | 6.243 |
| p99 | 336.208 | n/a | n/a | n/a | 14.223 | n/a | 1.404 | 0.000 | 1.079 | 333.749 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 46.642 | 14.815 | 0.839 | 46.642 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1b9a2f6d69ec68310000000000001b08 | 1002.481 | 0.106 | n/a | 0.000 | 0.000 | 0.515 | 1000.685 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 1.133 | 0.106 | 0.000 | 1.133 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001abc | 999.312 | 2.407 | n/a | 0.000 | 0.000 | 0.563 | 996.238 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.067 | 2.407 | 0.002 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001ac0 | 997.739 | 2.210 | n/a | 0.000 | 0.000 | 0.325 | 995.106 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.055 | 2.210 | 0.002 | 0.055 | gw-r/thread-64/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001b03 | 995.052 | 2.122 | n/a | 0.000 | 0.000 | 0.521 | 992.316 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.056 | 2.122 | 0.002 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001ac4 | 962.500 | 4.269 | n/a | 0.000 | 0.000 | 0.422 | 957.691 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.097 | 4.269 | 0.004 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001add | 949.496 | 4.302 | n/a | 0.000 | 0.000 | 0.497 | 944.560 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.108 | 4.302 | 0.005 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001abd | 939.656 | 11.690 | n/a | 1.314 | 0.000 | 0.482 | 925.637 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.492 | 13.005 | 0.014 | 0.492 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001acf | 933.347 | 2.330 | n/a | 0.000 | 0.000 | 0.482 | 930.441 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.067 | 2.330 | 0.002 | 0.067 | gw-r/thread-42/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001afe | 892.394 | 2.249 | n/a | 0.000 | 0.000 | 0.346 | 889.712 | 0.007 | n/a | 0.015 | 0.000 | n/a | n/a | 0.065 | 2.249 | 0.003 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001aba | 882.089 | 4.264 | n/a | 0.000 | 0.000 | 0.440 | 877.237 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.097 | 4.264 | 0.005 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001b00 | 830.195 | 2.120 | n/a | 0.000 | 0.000 | 0.688 | 827.282 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.076 | 2.120 | 0.003 | 0.076 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001ae1 | 723.788 | 2.360 | n/a | 0.000 | 0.000 | 0.644 | 720.684 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.069 | 2.360 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001ac6 | 667.488 | 3.265 | n/a | 0.000 | 0.000 | 0.350 | 663.720 | 0.008 | n/a | 0.024 | 0.000 | n/a | n/a | 0.122 | 3.265 | 0.005 | 0.122 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001afa | 648.471 | 1.847 | n/a | 0.000 | 0.000 | 0.522 | 645.977 | 0.063 | n/a | 0.008 | 0.000 | n/a | n/a | 0.054 | 1.847 | 0.003 | 0.054 | gw-r/thread-64/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001adb | 648.438 | 2.228 | n/a | 0.000 | 0.000 | 0.257 | 645.887 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.056 | 2.228 | 0.003 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001ae2 | 635.184 | 7.805 | n/a | 0.000 | 0.000 | 0.862 | 626.180 | 0.017 | n/a | 0.070 | 0.000 | n/a | n/a | 0.250 | 7.805 | 0.012 | 0.250 | gw-r/thread-47/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001ad5 | 555.197 | 3.550 | n/a | 0.000 | 0.000 | 0.369 | 551.161 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.070 | 3.550 | 0.006 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001af0 | 540.607 | 4.624 | n/a | 0.000 | 0.000 | 0.333 | 535.487 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.123 | 4.624 | 0.009 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001af5 | 489.126 | 2.546 | n/a | 0.000 | 0.000 | 0.295 | 486.190 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.065 | 2.546 | 0.005 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 1b9a2f6d69ec68310000000000001af8 | 461.030 | 2.145 | n/a | 0.000 | 0.000 | 0.337 | 458.468 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.063 | 2.145 | 0.005 | 0.063 | gw-r/thread-47/journal/page | none observed |

## P3 / warmup / read (76 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.322 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 201.003 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 208.538 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.800 | 207.226 | 5.508 | n/a | 0.631 | 0.000 | n/a | n/a | 0.364 | 0.000 | 0.000 | 0.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb0000000000000043 | 208.538 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 207.226 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000015 | 207.984 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 206.930 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000004f | 207.894 | 0.000 | n/a | 0.000 | 0.000 | 3.633 | 200.911 | 3.133 | n/a | 0.117 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb000000000000001e | 207.615 | 0.000 | n/a | 0.000 | 0.000 | 3.485 | 203.822 | 0.019 | n/a | 0.193 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000014 | 206.744 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 205.089 | 0.014 | n/a | 0.166 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-61/journal/page | none observed |
| c193ccff7955ffcb0000000000000012 | 206.541 | 0.000 | n/a | 0.000 | 0.000 | 4.800 | 200.925 | 0.543 | n/a | 0.148 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb000000000000002b | 206.357 | 0.000 | n/a | 0.000 | 0.000 | 1.261 | 204.819 | 0.018 | n/a | 0.144 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000023 | 205.835 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 204.803 | 0.015 | n/a | 0.166 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000050 | 205.304 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 204.328 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb000000000000001b | 205.222 | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 204.402 | 0.021 | n/a | 0.186 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000002e | 205.147 | 0.000 | n/a | 0.000 | 0.000 | 3.444 | 201.444 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000020 | 205.064 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 204.221 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000035 | 205.044 | 0.000 | n/a | 0.000 | 0.000 | 3.703 | 201.065 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000039 | 204.930 | 0.000 | n/a | 0.000 | 0.000 | 3.694 | 201.010 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000049 | 204.702 | 0.000 | n/a | 0.000 | 0.000 | 0.404 | 203.992 | 0.032 | n/a | 0.176 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000051 | 204.462 | 0.000 | n/a | 0.000 | 0.000 | 3.584 | 200.669 | 0.020 | n/a | 0.065 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb000000000000002a | 204.432 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 200.981 | 2.256 | n/a | 0.118 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000001a | 204.219 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 202.982 | 0.026 | n/a | 0.495 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000047 | 203.865 | 0.000 | n/a | 0.000 | 0.000 | 2.115 | 201.492 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000030 | 203.789 | 0.000 | n/a | 0.000 | 0.000 | 2.720 | 200.713 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.912 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.834 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 211.483 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.923 | 206.178 | 23.000 | n/a | 3.566 | 0.000 | n/a | n/a | 0.310 | 0.000 | 0.000 | 0.310 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb0000000000000082 | 211.483 | 0.000 | n/a | 0.000 | 0.000 | 4.923 | 206.178 | 0.013 | n/a | 0.145 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000087 | 206.268 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 204.882 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000062 | 205.956 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 204.478 | 0.022 | n/a | 0.461 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb00000000000000b9 | 205.925 | 0.000 | n/a | 0.000 | 0.000 | 3.667 | 202.045 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb00000000000000a2 | 205.684 | 0.000 | n/a | 0.000 | 0.000 | 0.615 | 204.865 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb00000000000000af | 205.548 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 204.515 | 0.020 | n/a | 0.043 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000079 | 204.650 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 203.638 | 0.024 | n/a | 0.150 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb000000000000009a | 203.583 | 0.000 | n/a | 0.000 | 0.000 | 2.349 | 200.952 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb00000000000000ac | 203.380 | 0.000 | n/a | 0.000 | 0.000 | 1.965 | 201.188 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb000000000000008d | 203.350 | 0.000 | n/a | 0.000 | 0.000 | 1.564 | 201.452 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000098 | 203.277 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 202.441 | 0.016 | n/a | 0.106 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb00000000000000ad | 203.199 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 201.766 | 0.018 | n/a | 0.164 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb00000000000000b6 | 203.081 | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.651 | 0.049 | n/a | 0.108 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb000000000000005b | 203.011 | 0.000 | n/a | 0.000 | 0.000 | 1.979 | 200.797 | 0.012 | n/a | 0.131 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb000000000000007e | 202.959 | 0.000 | n/a | 0.000 | 0.000 | 0.914 | 201.702 | 0.029 | n/a | 0.222 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000066 | 202.930 | 0.000 | n/a | 0.000 | 0.000 | 1.079 | 198.108 | 0.013 | n/a | 3.566 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000069 | 202.892 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 202.048 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb000000000000009e | 202.807 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 201.183 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000000c3 | 202.707 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.518 | 0.021 | n/a | 0.157 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000063 | 202.646 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.663 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-61/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.710 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 200.781 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 207.698 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.905 | 205.171 | 2.213 | n/a | 3.111 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb00000000000000e4 | 207.698 | 0.000 | n/a | 0.000 | 0.000 | 3.337 | 204.207 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb00000000000000d6 | 206.344 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 205.171 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb00000000000000c9 | 205.533 | 0.000 | n/a | 0.000 | 0.000 | 1.281 | 201.028 | 0.010 | n/a | 3.111 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb00000000000000e2 | 205.248 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 204.569 | 0.015 | n/a | 0.088 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-61/journal/page | none observed |
| c193ccff7955ffcb00000000000000fc | 204.927 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 203.949 | 0.007 | n/a | 0.064 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-61/journal/page | none observed |
| c193ccff7955ffcb00000000000000f2 | 204.811 | 0.000 | n/a | 0.000 | 0.000 | 2.122 | 202.343 | 0.014 | n/a | 0.071 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb00000000000000cd | 204.796 | 0.000 | n/a | 0.000 | 0.000 | 3.870 | 200.760 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000000c7 | 204.623 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 203.789 | 0.018 | n/a | 0.126 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000106 | 203.368 | 0.000 | n/a | 0.000 | 0.000 | 2.218 | 200.870 | 0.007 | n/a | 0.082 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000116 | 203.325 | 0.000 | n/a | 0.000 | 0.000 | 1.640 | 201.381 | 0.007 | n/a | 0.109 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb00000000000000c5 | 202.690 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.460 | 0.016 | n/a | 0.163 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb00000000000000cc | 202.543 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.450 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-61/journal/page | none observed |
| c193ccff7955ffcb0000000000000129 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 0.403 | 201.953 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb00000000000000ee | 202.519 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 201.202 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000104 | 202.490 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 201.081 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000011d | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 201.291 | 0.009 | n/a | 0.120 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb00000000000000f0 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.055 | 0.246 | n/a | 0.075 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000000fa | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 1.370 | 200.801 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000010b | 202.375 | 0.000 | n/a | 0.000 | 0.000 | 1.499 | 200.678 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb00000000000000eb | 202.341 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 200.781 | 0.017 | n/a | 0.519 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-40/journal/page | none observed |

## P3 / L16 / read (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.682 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 200.704 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 216.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 11.032 | 204.778 | 2.868 | n/a | 0.141 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb000000000000012d | 216.026 | 0.000 | n/a | 0.000 | 0.000 | 11.032 | 204.778 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000155 | 205.388 | 0.000 | n/a | 0.000 | 0.000 | 3.855 | 201.256 | 0.026 | n/a | 0.140 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb000000000000012f | 205.147 | 0.000 | n/a | 0.000 | 0.000 | 3.781 | 201.071 | 0.037 | n/a | 0.135 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb000000000000017a | 204.674 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 203.884 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb000000000000018e | 203.833 | 0.000 | n/a | 0.000 | 0.000 | 0.848 | 202.727 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000013e | 203.822 | 0.000 | n/a | 0.000 | 0.000 | 1.129 | 202.508 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000177 | 203.528 | 0.000 | n/a | 0.000 | 0.000 | 2.926 | 200.495 | 0.006 | n/a | 0.015 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000015b | 203.401 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 202.697 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000179 | 203.392 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 202.528 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb000000000000014b | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 0.398 | 202.363 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000193 | 202.865 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 201.508 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.435 | 0.000 | 0.000 | 0.435 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb000000000000017b | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 201.258 | 0.007 | n/a | 0.094 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000013c | 202.707 | 0.000 | n/a | 0.000 | 0.000 | 0.981 | 201.448 | 0.010 | n/a | 0.118 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000160 | 202.702 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 201.609 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000016d | 202.617 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.269 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000163 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 0.400 | 201.979 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000165 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.790 | 200.596 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000172 | 202.547 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 201.386 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb000000000000013f | 202.538 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.422 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000186 | 202.527 | 0.000 | n/a | 0.000 | 0.000 | 1.402 | 200.834 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-43/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.502 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.665 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 205.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.096 | 202.142 | 3.504 | n/a | 0.515 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb00000000000001a7 | 205.143 | 0.000 | n/a | 0.000 | 0.000 | 3.728 | 201.203 | 0.010 | n/a | 0.107 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb00000000000001ec | 205.072 | 0.000 | n/a | 0.000 | 0.000 | 4.096 | 200.787 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb00000000000001f8 | 204.103 | 0.000 | n/a | 0.000 | 0.000 | 3.103 | 200.778 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb00000000000001d4 | 203.865 | 0.000 | n/a | 0.000 | 0.000 | 2.651 | 200.993 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000001a4 | 203.472 | 0.000 | n/a | 0.000 | 0.000 | 1.862 | 201.390 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000001bb | 203.403 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 202.514 | 0.014 | n/a | 0.106 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000195 | 203.308 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 202.142 | 0.019 | n/a | 0.145 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000001cf | 203.159 | 0.000 | n/a | 0.000 | 0.000 | 1.741 | 201.227 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb00000000000001c3 | 202.889 | 0.000 | n/a | 0.000 | 0.000 | 1.439 | 201.159 | 0.015 | n/a | 0.070 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb00000000000001fc | 202.702 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 201.831 | 0.028 | n/a | 0.110 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000205 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 199.466 | 0.010 | n/a | 2.194 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb00000000000001dd | 202.443 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.313 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb00000000000001a8 | 202.386 | 0.000 | n/a | 0.000 | 0.000 | 0.970 | 201.149 | 0.006 | n/a | 0.078 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb00000000000001d6 | 202.282 | 0.000 | n/a | 0.000 | 0.000 | 0.654 | 201.385 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb00000000000001d7 | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.234 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000204 | 202.239 | 0.000 | n/a | 0.000 | 0.000 | 1.205 | 200.855 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb00000000000001b9 | 202.201 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 201.248 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb00000000000001c5 | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 201.317 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb00000000000001c0 | 202.152 | 0.000 | n/a | 0.000 | 0.000 | 0.708 | 200.799 | 0.006 | n/a | 0.515 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb000000000000019a | 202.148 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.167 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-40/journal/page | none observed |

## P3 / L256 / read (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.479 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 200.719 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 |
| p99 | 205.328 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.902 | 204.332 | 2.147 | n/a | 0.108 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb0000000000000261 | 205.659 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 204.552 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000259 | 205.328 | 0.000 | n/a | 0.000 | 0.000 | 3.902 | 201.059 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000229 | 205.220 | 0.000 | n/a | 0.000 | 0.000 | 0.688 | 204.251 | 0.026 | n/a | 0.078 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000276 | 204.983 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 204.332 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000023b | 204.905 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 204.039 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000242 | 204.869 | 0.000 | n/a | 0.000 | 0.000 | 3.998 | 200.671 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb000000000000021b | 203.545 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 202.567 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000220 | 203.487 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 202.575 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000232 | 202.674 | 0.000 | n/a | 0.000 | 0.000 | 0.363 | 202.144 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000026e | 202.504 | 0.000 | n/a | 0.000 | 0.000 | 1.499 | 200.751 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000264 | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 201.354 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb000000000000022b | 202.388 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.444 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000279 | 202.236 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 201.393 | 0.011 | n/a | 0.102 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000250 | 202.190 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 201.235 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000026b | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 200.949 | 0.005 | n/a | 0.099 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000237 | 202.144 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 200.688 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000246 | 202.135 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.083 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb000000000000023c | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 201.260 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000251 | 202.110 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 200.805 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000265 | 202.071 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 201.175 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.097 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 69.590 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 205.154 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.095 | 201.882 | 2.504 | n/a | 0.104 | 0.000 | n/a | n/a | 50.760 | 0.000 | 0.000 | 50.760 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb000000000000028e | 205.154 | 0.000 | n/a | 0.000 | 0.000 | 3.095 | 201.882 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000287 | 202.643 | 0.000 | n/a | 0.000 | 0.000 | 1.361 | 200.974 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000295 | 202.389 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 201.581 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000027e | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 201.034 | 0.006 | n/a | 0.081 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb000000000000027f | 202.115 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 200.965 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000291 | 202.058 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 200.948 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000284 | 202.046 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.966 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb000000000000028b | 201.980 | 0.000 | n/a | 0.000 | 0.000 | 0.830 | 200.890 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000283 | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.042 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000293 | 201.898 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.961 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000292 | 201.843 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.745 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000290 | 201.756 | 0.000 | n/a | 0.000 | 0.000 | 0.364 | 201.218 | 0.010 | n/a | 0.104 | 0.000 | n/a | n/a | 0.061 | 0.000 | 0.000 | 0.061 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000280 | 201.711 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.795 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000296 | 201.682 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 200.707 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000285 | 201.643 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.842 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb000000000000027d | 201.623 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.775 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000028c | 201.535 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 200.591 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000297 | 201.446 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.785 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb000000000000028a | 201.244 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 200.627 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000298 | 193.058 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 192.131 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 87.343 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 202.455 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.290 | 201.144 | 1.453 | n/a | 0.086 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c193ccff7955ffcb0000000000000f45 | 205.198 | 0.000 | n/a | 0.000 | 0.000 | 4.180 | 200.848 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000ee4 | 204.329 | 0.000 | n/a | 0.000 | 0.000 | 3.756 | 200.438 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000eed | 202.455 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 201.867 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000ece | 202.232 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 201.048 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000f2e | 202.090 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 201.056 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000edf | 202.053 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 201.144 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000f01 | 201.931 | 0.000 | n/a | 0.000 | 0.000 | 0.482 | 201.267 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| c193ccff7955ffcb0000000000000ef5 | 201.922 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 201.040 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000f2d | 201.775 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 200.739 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| c193ccff7955ffcb0000000000000ed8 | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 201.110 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000f26 | 201.667 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 200.775 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000f09 | 201.656 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.560 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-45/journal/page | none observed |
| c193ccff7955ffcb0000000000000ecf | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 200.916 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000f20 | 201.638 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 200.848 | 0.013 | n/a | 0.136 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000eeb | 201.611 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 200.731 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| c193ccff7955ffcb0000000000000f41 | 201.603 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 200.855 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-44/journal/page | none observed |
| c193ccff7955ffcb0000000000000f07 | 201.598 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 200.846 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-64/journal/page | none observed |
| c193ccff7955ffcb0000000000000f0d | 201.572 | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 200.817 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-42/journal/page | none observed |
| c193ccff7955ffcb0000000000000f14 | 201.558 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 200.753 | 0.020 | n/a | 0.058 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-40/journal/page | none observed |
| c193ccff7955ffcb0000000000000eff | 201.552 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.720 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-40/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3420 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.605/3.879 ms; post-ACK p50/p99: 0.369/1.898 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.723 | 10.230 | 9.582 | reported |
| All-primary p99 ms | 37.268 | 36.327 | 35.438 | <=50 |
| L256 5-10 p50Ms | 12.159 | 11.839 | 11.647 | <=10 |
| L256 5-10 p99Ms | 20.363 | 19.949 | 19.478 | <=50 |
| L256 11-25 p50Ms | 15.167 | 14.783 | 13.759 | <=10 |
| L256 11-25 p99Ms | 17.175 | 16.651 | 16.527 | <=50 |
| L256 26-50 p50Ms | 13.887 | 13.247 | 13.183 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 16.520 | 15.624 | 14.526 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 9.407 | 9.023 | 8.319 | <=10 |
| Burst 11-25 p50 ms | 11.647 | 11.071 | 10.367 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 20.363 | 19.949 | 19.478 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 62.650 | 62.407 | 61.901 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 56.636/56.636 | 54.591 | 31.148 | 97.265 | 0.717/0.103 |
| 5-10 | 250-1000 | 48 | 13.191/33.211 | 12.723 | 8.302 | 20.153 | 0.071/0.022 |
| 5-10 | 50-100 | 67 | 8.576/27.139 | 8.156 | 4.576 | 11.719 | 0.050/0.018 |
| 11-25 | 250-1000 | 29 | 20.516/31.643 | 19.646 | 11.769 | 29.500 | 0.080/0.022 |
| 26-50 | 100-250 | 4 | 15.798/30.158 | 14.335 | 6.179 | 17.202 | 0.085/0.032 |
| 5-10 | 100-250 | 18 | 11.905/20.879 | 11.583 | 8.567 | 19.223 | 0.066/0.022 |
| 26-50 | 250-1000 | 8 | 22.789/41.138 | 19.545 | 10.943 | 22.635 | 0.093/0.022 |
| 26-50 | overlap | 151 | 16.319/44.315 | 15.141 | 8.706 | 21.079 | 0.049/0.018 |
| 11-25 | 100-250 | 10 | 14.495/22.163 | 13.598 | 9.271 | 21.432 | 0.073/0.020 |
| 11-25 | overlap | 379 | 12.188/33.690 | 11.485 | 6.959 | 16.073 | 0.039/0.017 |
| 5-10 | 0-50 | 1145 | 7.879/28.806 | 7.551 | 4.211 | 10.411 | 0.040/0.017 |
| 11-25 | 0-50 | 533 | 9.925/27.382 | 9.402 | 5.147 | 13.118 | 0.046/0.018 |
| 11-25 | 50-100 | 35 | 11.637/34.216 | 10.898 | 6.437 | 16.036 | 0.053/0.018 |
| 5-10 | overlap | 787 | 9.863/35.507 | 9.542 | 5.887 | 13.268 | 0.031/0.016 |
| 26-50 | 0-50 | 191 | 13.784/41.765 | 12.757 | 6.320 | 17.018 | 0.060/0.018 |
| 26-50 | 50-100 | 14 | 14.224/25.351 | 13.573 | 6.345 | 16.396 | 0.069/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 888 | 3 | 173.561 |
| burst | 2532 | 0 | 0.000 |

## Writer heap, GC and scheduler stalls

Source 236dd70bf8077ee0a91acba63376db723e078306; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 343.555 / 537.020 |
| GC events / total duration / maximum ms | 461 / 1089.456 / 26.613 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":451,"4":5,"8":5} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 37.268 / 3 / 173.561 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

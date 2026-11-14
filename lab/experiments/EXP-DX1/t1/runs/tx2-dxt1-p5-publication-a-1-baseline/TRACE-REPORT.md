# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (144.635 ms, trace `e1bc8a4fe563432b000000000000013f`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (99.894 ms, trace `e1bc8a4fe563432b00000000000001b4`); `gw-w/thread-49/gateway.admitted-work` (63.174 ms, trace `e1bc8a4fe563432b000000000000012d`); `node-14/thread-0/driver.queue.subject` (35.460 ms, trace `e1bc8a4fe563432b000000000000040d`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (32.463 ms, trace `e1bc8a4fe563432b0000000000000107`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-publication-a-1-baseline`; source `f9af2506c70dcb8d0320436b5dee5dadd9f024d9`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6881761.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 209 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14613.343 | 318.675 | 3.911 | 311 |
| L1 | 0 | 19969.899 | 526.633 | 16.252 | 462 |
| L4 | 0 | 19980.372 | 372.948 | 21.279 | 426 |
| L16 | 0 | 19980.364 | 539.254 | 16.301 | 474 |
| L64 | 0 | 19944.176 | 434.394 | 7.106 | 610 |
| L256 | 0 | 19931.236 | 373.482 | 8.213 | 472 |
| L1024 | 0 | 19993.255 | 3758.318 | 25.996 | 12292 |
| tail | 0 | 64361.771 | 11098.292 | 95.202 | 37110 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| e1bc8a4fe563432b000000000000013f | driver.queue.scheduler-dispatch | 0.103 | none | 0 / 32 |
| e1bc8a4fe563432b000000000000013f | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace e1bc8a4fe563432b000000000000013f waited: []

| e1bc8a4fe563432b00000000000001b4 | driver.queue.scheduler-dispatch | 0.057 | none | 0 / 32 |
| e1bc8a4fe563432b00000000000001b4 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace e1bc8a4fe563432b00000000000001b4 waited: []

| e1bc8a4fe563432b000000000000012d | driver.queue.scheduler-dispatch | 0.146 | none | 0 / 32 |
| e1bc8a4fe563432b000000000000012d | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace e1bc8a4fe563432b000000000000012d waited: []

| e1bc8a4fe563432b000000000000040d | driver.queue.subject | 35.460 | e1bc8a4fe563432b000000000000040c | 4 / 32 |
| e1bc8a4fe563432b000000000000040d | driver.queue.scheduler-late | 0.551 | none | 4 / 32 |
| e1bc8a4fe563432b000000000000040d | driver.queue.scheduler-dispatch | 0.069 | none | 3 / 32 |

Observed active steps while trace e1bc8a4fe563432b000000000000040d waited: []

| e1bc8a4fe563432b0000000000000107 | driver.queue.scheduler-dispatch | 0.430 | none | 0 / 32 |
| e1bc8a4fe563432b0000000000000107 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace e1bc8a4fe563432b0000000000000107 waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.923 | 0.746 | 0.000 | 0.874 | 5.382 | 0.221 | 0.000 | 0.152 | 1.537 | 7.651 | 0.058 | n/a | 0.435 | 15.272 | n/a | n/a | 0.056 | 5.975 | 0.190 | 0.056 |
| p99 | 89.280 | 7.470 | 0.044 | 9.613 | 18.201 | 0.512 | 5.883 | 1.016 | 6.067 | 28.769 | 0.327 | n/a | 7.283 | 44.075 | n/a | n/a | 0.611 | 24.671 | 0.373 | 0.611 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000107 | 89.280 | 11.168 | 0.394 | 0.000 | 0.434 | 6.067 | 19.630 | 0.153 | n/a | 7.283 | 44.075 | n/a | n/a | 0.075 | 11.997 | 0.134 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.355ms; driver.publication 2.362ms |
| e1bc8a4fe563432b00000000000000f5 | 81.752 | 14.076 | 0.505 | 0.000 | 0.096 | 2.104 | 28.769 | 0.327 | n/a | 5.184 | 30.638 | n/a | n/a | 0.053 | 14.677 | 0.180 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000000f2 | 79.780 | 18.201 | 0.017 | 5.883 | 0.571 | 0.781 | 11.470 | 0.214 | n/a | 3.439 | 38.593 | n/a | n/a | 0.611 | 24.671 | 0.309 | 0.611 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000000f9 | 62.966 | 6.637 | 0.286 | 0.000 | 0.079 | 1.750 | 22.650 | 0.081 | n/a | 0.134 | 31.278 | n/a | n/a | 0.072 | 7.002 | 0.111 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000101 | 48.695 | 4.931 | 0.403 | 0.000 | 0.049 | 3.158 | 19.130 | 0.058 | n/a | 2.619 | 18.287 | n/a | n/a | 0.061 | 5.382 | 0.111 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000118 | 44.856 | 6.603 | 0.006 | 1.627 | 0.948 | 1.178 | 2.777 | 0.041 | n/a | 0.141 | 31.484 | n/a | n/a | 0.051 | 9.184 | 0.205 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000000fa | 43.644 | 5.424 | 0.006 | 0.000 | 0.982 | 1.462 | 3.557 | 0.057 | n/a | 0.579 | 31.508 | n/a | n/a | 0.068 | 6.412 | 0.147 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000117 | 41.594 | 6.462 | 0.380 | 0.566 | 0.067 | 2.648 | 15.595 | 0.076 | n/a | 0.191 | 15.568 | n/a | n/a | 0.041 | 7.475 | 0.180 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000010d | 41.091 | 10.251 | 0.410 | 0.000 | 0.068 | 2.831 | 7.106 | 0.059 | n/a | 0.439 | 19.876 | n/a | n/a | 0.052 | 10.729 | 0.261 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000105 | 40.291 | 6.878 | 0.221 | 0.000 | 0.095 | 1.605 | 8.197 | 0.047 | n/a | 3.329 | 19.857 | n/a | n/a | 0.061 | 7.194 | 0.179 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000102 | 40.226 | 8.378 | 0.069 | 0.000 | 0.226 | 0.921 | 2.734 | 0.098 | n/a | 0.154 | 27.522 | n/a | n/a | 0.125 | 8.673 | 0.216 | 0.125 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000123 | 38.885 | 6.831 | 0.326 | 0.605 | 0.054 | 1.804 | 12.485 | 0.058 | n/a | 0.806 | 15.883 | n/a | n/a | 0.034 | 7.816 | 0.201 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000011f | 38.492 | 5.382 | 0.250 | 0.427 | 0.066 | 1.683 | 12.320 | 0.114 | n/a | 3.739 | 14.469 | n/a | n/a | 0.041 | 6.126 | 0.159 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000010a | 34.353 | 6.263 | 0.009 | 0.000 | 1.016 | 1.165 | 2.644 | 0.040 | n/a | 3.231 | 19.929 | n/a | n/a | 0.056 | 7.288 | 0.212 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000012b | 33.923 | 3.987 | 0.512 | 0.330 | 0.053 | 1.537 | 13.353 | 0.052 | n/a | 0.363 | 13.704 | n/a | n/a | 0.032 | 4.882 | 0.144 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000000fd | 32.906 | 4.719 | 0.267 | 0.000 | 0.152 | 1.749 | 10.693 | 0.056 | n/a | 0.120 | 15.070 | n/a | n/a | 0.082 | 5.138 | 0.156 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000129 | 32.812 | 4.219 | 0.275 | 0.000 | 0.062 | 1.315 | 12.535 | 0.050 | n/a | 0.131 | 14.164 | n/a | n/a | 0.060 | 4.556 | 0.139 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000011b | 30.919 | 4.280 | 0.296 | 0.308 | 0.066 | 1.624 | 7.651 | 0.113 | n/a | 0.192 | 16.348 | n/a | n/a | 0.041 | 4.950 | 0.160 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000010f | 30.498 | 4.771 | 0.421 | 0.408 | 0.064 | 2.056 | 13.397 | 0.063 | n/a | 0.435 | 8.834 | n/a | n/a | 0.048 | 5.665 | 0.186 | 0.048 | gw-w/thread-45/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000113 | 30.239 | 4.992 | 0.330 | 0.311 | 0.116 | 2.640 | 10.279 | 0.122 | n/a | 0.828 | 10.574 | n/a | n/a | 0.047 | 5.749 | 0.190 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.459 | 0.964 | 0.000 | 2.094 | 4.522 | 0.005 | 0.000 | 0.314 | 1.226 | 2.029 | 0.050 | n/a | 0.346 | 10.894 | n/a | n/a | 0.067 | 5.093 | 0.234 | 0.067 |
| p99 | 43.644 | 1.743 | 0.000 | 3.283 | 5.744 | 0.006 | 0.000 | 0.982 | 2.378 | 3.557 | 0.084 | n/a | 2.495 | 31.508 | n/a | n/a | 0.200 | 6.412 | 0.319 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b00000000000000fa | 43.644 | 5.424 | 0.006 | 0.000 | 0.982 | 1.462 | 3.557 | 0.057 | n/a | 0.579 | 31.508 | n/a | n/a | 0.068 | 6.412 | 0.147 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000000f6 | 25.068 | 5.744 | 0.006 | 0.000 | 0.224 | 0.955 | 2.235 | 0.049 | n/a | 0.524 | 15.130 | n/a | n/a | 0.200 | 5.975 | 0.238 | 0.200 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000111 | 23.503 | 4.522 | 0.004 | 0.000 | 0.971 | 2.378 | 2.029 | 0.044 | n/a | 2.495 | 10.894 | n/a | n/a | 0.166 | 5.497 | 0.234 | 0.166 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000114 | 23.276 | 4.047 | 0.005 | 0.000 | 0.137 | 1.456 | 2.096 | 0.069 | n/a | 0.127 | 15.272 | n/a | n/a | 0.067 | 4.189 | 0.180 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000120 | 19.459 | 3.351 | 0.005 | 0.000 | 0.545 | 1.226 | 1.841 | 0.055 | n/a | 0.448 | 11.946 | n/a | n/a | 0.042 | 3.901 | 0.200 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000000fe | 18.373 | 4.799 | 0.006 | 0.000 | 0.657 | 1.379 | 1.476 | 0.050 | n/a | 0.161 | 9.767 | n/a | n/a | 0.079 | 5.462 | 0.297 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000126 | 16.890 | 3.141 | 0.005 | 0.000 | 0.314 | 1.206 | 1.530 | 0.041 | n/a | 0.143 | 10.473 | n/a | n/a | 0.038 | 3.460 | 0.205 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000011c | 15.976 | 4.785 | 0.006 | 0.000 | 0.302 | 1.031 | 2.197 | 0.084 | n/a | 0.181 | 7.335 | n/a | n/a | 0.056 | 5.093 | 0.319 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000124 | 14.958 | 3.696 | 0.005 | 0.000 | 0.201 | 0.981 | 1.436 | 0.042 | n/a | 0.346 | 8.209 | n/a | n/a | 0.042 | 3.902 | 0.261 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.490 | 0.511 | 0.000 | 1.064 | 4.741 | 0.019 | 0.000 | 0.153 | 1.428 | 5.786 | 0.061 | n/a | 0.395 | 12.721 | n/a | n/a | 0.054 | 5.405 | 0.208 | 0.054 |
| p99 | 185.581 | 5.405 | 0.008 | 5.967 | 16.210 | 1.043 | 1.947 | 1.261 | 4.287 | 67.014 | 0.159 | n/a | 3.791 | 144.635 | n/a | n/a | 0.111 | 17.449 | 0.413 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b000000000000013f | 185.581 | 6.543 | 0.449 | 0.455 | 0.104 | 2.263 | 28.323 | 0.137 | n/a | 2.604 | 144.635 | n/a | n/a | 0.067 | 7.552 | 0.041 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000012d | 99.412 | 5.057 | 0.390 | 0.000 | 0.150 | 1.333 | 67.014 | 0.061 | n/a | 0.659 | 24.684 | n/a | n/a | 0.064 | 5.597 | 0.056 | 0.064 | gw-w/thread-49/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000141 | 54.514 | 4.273 | 0.321 | 0.298 | 0.060 | 1.934 | 31.222 | 0.128 | n/a | 0.690 | 15.548 | n/a | n/a | 0.040 | 4.952 | 0.091 | 0.040 | gw-w/thread-49/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000170 | 51.252 | 3.846 | 0.203 | 0.323 | 0.064 | 1.531 | 20.331 | 0.083 | n/a | 0.161 | 24.667 | n/a | n/a | 0.043 | 4.436 | 0.087 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000014e | 47.602 | 16.210 | 0.019 | 0.000 | 1.221 | 1.763 | 9.700 | 0.096 | n/a | 0.210 | 18.273 | n/a | n/a | 0.111 | 17.449 | 0.367 | 0.111 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000143 | 47.065 | 9.568 | 0.252 | 0.518 | 0.122 | 1.462 | 13.881 | 0.122 | n/a | 0.251 | 20.824 | n/a | n/a | 0.065 | 10.460 | 0.222 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000147 | 45.049 | 4.178 | 0.285 | 0.000 | 0.063 | 2.219 | 25.348 | 0.065 | n/a | 0.115 | 12.721 | n/a | n/a | 0.054 | 4.526 | 0.100 | 0.054 | gw-w/thread-49/gateway.admitted-work | driver.publication 1.511ms |
| e1bc8a4fe563432b000000000000012f | 44.151 | 4.850 | 0.365 | 0.288 | 0.057 | 1.428 | 17.231 | 0.095 | n/a | 0.149 | 19.616 | n/a | n/a | 0.073 | 5.559 | 0.126 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000016c | 42.723 | 4.596 | 0.379 | 0.000 | 0.083 | 1.478 | 14.962 | 0.056 | n/a | 0.113 | 20.970 | n/a | n/a | 0.086 | 5.058 | 0.118 | 0.086 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000136 | 39.388 | 5.927 | 0.204 | 0.000 | 0.068 | 2.001 | 5.786 | 0.046 | n/a | 0.443 | 24.873 | n/a | n/a | 0.040 | 6.199 | 0.157 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000014b | 39.253 | 5.659 | 0.207 | 0.760 | 0.116 | 1.848 | 6.160 | 0.062 | n/a | 0.753 | 23.615 | n/a | n/a | 0.072 | 6.742 | 0.172 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000137 | 36.667 | 12.914 | 0.009 | 0.000 | 1.248 | 4.287 | 12.376 | 0.118 | n/a | 0.356 | 5.250 | n/a | n/a | 0.108 | 14.171 | 0.386 | 0.108 | node-14/thread-0/driver.execute | none observed |
| e1bc8a4fe563432b0000000000000133 | 36.083 | 4.171 | 0.005 | 0.000 | 0.577 | 1.197 | 2.376 | 0.080 | n/a | 0.622 | 27.010 | n/a | n/a | 0.045 | 4.753 | 0.132 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000017a | 33.465 | 3.928 | 0.224 | 0.523 | 0.087 | 2.653 | 12.494 | 0.076 | n/a | 3.791 | 9.638 | n/a | n/a | 0.051 | 4.762 | 0.142 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000016a | 32.471 | 3.847 | 0.221 | 0.396 | 0.044 | 4.158 | 12.982 | 0.059 | n/a | 0.101 | 10.604 | n/a | n/a | 0.059 | 4.509 | 0.139 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000164 | 32.075 | 9.780 | 0.011 | 0.000 | 0.852 | 0.866 | 2.340 | 0.050 | n/a | 0.152 | 17.962 | n/a | n/a | 0.063 | 10.643 | 0.332 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000148 | 30.577 | 4.741 | 0.006 | 0.000 | 0.155 | 1.232 | 4.988 | 0.054 | n/a | 0.091 | 19.271 | n/a | n/a | 0.040 | 4.901 | 0.160 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000157 | 30.446 | 3.818 | 0.319 | 0.255 | 0.077 | 1.260 | 14.086 | 0.084 | n/a | 0.395 | 10.088 | n/a | n/a | 0.065 | 4.469 | 0.147 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000139 | 30.358 | 5.454 | 0.212 | 0.651 | 0.078 | 1.706 | 8.026 | 0.068 | n/a | 0.165 | 13.956 | n/a | n/a | 0.042 | 6.395 | 0.211 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000158 | 29.198 | 5.963 | 0.005 | 0.000 | 1.084 | 0.852 | 5.576 | 0.159 | n/a | 0.419 | 15.089 | n/a | n/a | 0.052 | 7.052 | 0.242 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.555 | 0.893 | 0.000 | 1.861 | 4.171 | 0.005 | 0.000 | 0.469 | 1.100 | 1.707 | 0.054 | n/a | 0.192 | 5.779 | n/a | n/a | 0.045 | 4.753 | 0.257 | 0.045 |
| p99 | 36.667 | 2.072 | 0.004 | 3.341 | 12.914 | 0.011 | 0.000 | 1.248 | 4.287 | 12.376 | 0.118 | n/a | 3.200 | 27.010 | n/a | n/a | 0.108 | 14.171 | 0.386 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000137 | 36.667 | 12.914 | 0.009 | 0.000 | 1.248 | 4.287 | 12.376 | 0.118 | n/a | 0.356 | 5.250 | n/a | n/a | 0.108 | 14.171 | 0.386 | 0.108 | node-14/thread-0/driver.execute | none observed |
| e1bc8a4fe563432b0000000000000133 | 36.083 | 4.171 | 0.005 | 0.000 | 0.577 | 1.197 | 2.376 | 0.080 | n/a | 0.622 | 27.010 | n/a | n/a | 0.045 | 4.753 | 0.132 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000148 | 30.577 | 4.741 | 0.006 | 0.000 | 0.155 | 1.232 | 4.988 | 0.054 | n/a | 0.091 | 19.271 | n/a | n/a | 0.040 | 4.901 | 0.160 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000152 | 22.260 | 5.318 | 0.005 | 0.000 | 0.395 | 1.920 | 1.531 | 0.039 | n/a | 0.151 | 12.859 | n/a | n/a | 0.041 | 5.718 | 0.257 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000015c | 18.555 | 3.656 | 0.006 | 0.000 | 0.243 | 0.805 | 1.437 | 0.059 | n/a | 0.166 | 12.139 | n/a | n/a | 0.045 | 3.905 | 0.210 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000016e | 17.872 | 5.050 | 0.011 | 0.000 | 1.058 | 1.100 | 1.930 | 0.052 | n/a | 3.200 | 5.426 | n/a | n/a | 0.047 | 6.119 | 0.342 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000160 | 12.721 | 3.468 | 0.005 | 0.000 | 0.469 | 0.792 | 1.174 | 0.037 | n/a | 0.933 | 5.779 | n/a | n/a | 0.064 | 3.941 | 0.310 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000178 | 12.019 | 3.537 | 0.004 | 0.000 | 0.623 | 0.712 | 1.707 | 0.113 | n/a | 0.192 | 5.102 | n/a | n/a | 0.029 | 4.164 | 0.346 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.175ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.552 | 0.571 | 0.000 | 0.925 | 4.222 | 0.179 | 0.232 | 0.184 | 1.450 | 8.030 | 0.060 | n/a | 0.370 | 11.461 | n/a | n/a | 0.054 | 5.097 | 0.195 | 0.054 |
| p99 | 117.842 | 3.173 | 0.010 | 5.353 | 11.434 | 5.322 | 1.762 | 1.073 | 3.239 | 36.731 | 0.160 | n/a | 3.702 | 99.894 | n/a | n/a | 0.112 | 12.070 | 0.392 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b00000000000001b4 | 117.842 | 4.630 | 0.380 | 0.283 | 0.058 | 1.943 | 9.021 | 0.045 | n/a | 1.528 | 99.894 | n/a | n/a | 0.058 | 5.352 | 0.045 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001ab | 78.984 | 8.747 | 0.010 | 1.762 | 0.572 | 0.809 | 36.731 | 0.054 | n/a | 0.080 | 30.153 | n/a | n/a | 0.065 | 11.091 | 0.140 | 0.065 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| e1bc8a4fe563432b00000000000001a2 | 72.030 | 7.317 | 0.216 | 0.516 | 0.088 | 2.208 | 10.567 | 0.077 | n/a | 0.159 | 50.815 | n/a | n/a | 0.068 | 8.136 | 0.113 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000189 | 61.549 | 7.483 | 0.038 | 0.000 | 1.073 | 0.878 | 21.209 | 0.068 | n/a | 0.081 | 30.668 | n/a | n/a | 0.050 | 8.594 | 0.140 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000187 | 52.967 | 6.526 | 0.387 | 0.457 | 0.172 | 1.831 | 19.141 | 0.151 | n/a | 0.260 | 23.938 | n/a | n/a | 0.106 | 7.541 | 0.142 | 0.106 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000198 | 46.784 | 4.249 | 0.252 | 0.422 | 0.111 | 2.524 | 13.893 | 0.090 | n/a | 0.183 | 24.992 | n/a | n/a | 0.070 | 5.033 | 0.108 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001aa | 42.260 | 3.952 | 5.322 | 0.215 | 0.081 | 2.130 | 15.703 | 0.145 | n/a | 1.010 | 13.647 | n/a | n/a | 0.054 | 9.571 | 0.226 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000180 | 39.125 | 4.726 | 0.361 | 0.248 | 0.184 | 2.576 | 18.667 | 0.116 | n/a | 0.901 | 11.239 | n/a | n/a | 0.106 | 5.519 | 0.141 | 0.106 | gw-w/thread-44/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000190 | 37.006 | 4.058 | 0.222 | 0.306 | 0.079 | 2.754 | 16.758 | 0.097 | n/a | 1.682 | 10.994 | n/a | n/a | 0.056 | 4.665 | 0.126 | 0.056 | gw-w/thread-48/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000184 | 35.014 | 5.154 | 0.278 | 0.469 | 0.063 | 1.335 | 13.329 | 0.066 | n/a | 0.271 | 14.009 | n/a | n/a | 0.040 | 5.964 | 0.170 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000019c | 33.849 | 5.310 | 0.187 | 0.456 | 0.097 | 2.551 | 10.203 | 0.120 | n/a | 0.633 | 14.236 | n/a | n/a | 0.056 | 6.049 | 0.179 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001bb | 31.954 | 3.948 | 0.006 | 0.000 | 0.662 | 2.687 | 8.395 | 0.159 | n/a | 0.180 | 15.883 | n/a | n/a | 0.035 | 4.616 | 0.144 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001b6 | 31.344 | 3.639 | 0.282 | 0.422 | 0.061 | 2.046 | 9.600 | 0.070 | n/a | 0.119 | 15.059 | n/a | n/a | 0.044 | 4.405 | 0.141 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001c0 | 31.131 | 3.778 | 0.209 | 0.359 | 0.074 | 2.151 | 9.265 | 0.060 | n/a | 0.133 | 15.063 | n/a | n/a | 0.041 | 4.419 | 0.142 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001b8 | 30.793 | 11.434 | 0.011 | 0.000 | 0.625 | 1.104 | 1.698 | 0.047 | n/a | 0.608 | 15.197 | n/a | n/a | 0.070 | 12.070 | 0.392 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000192 | 30.729 | 3.807 | 0.288 | 0.328 | 0.081 | 1.469 | 11.847 | 0.057 | n/a | 0.425 | 12.371 | n/a | n/a | 0.057 | 4.504 | 0.147 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001be | 29.756 | 7.813 | 0.009 | 0.000 | 0.244 | 2.049 | 2.596 | 0.160 | n/a | 1.498 | 15.325 | n/a | n/a | 0.063 | 8.066 | 0.271 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001b0 | 29.641 | 5.811 | 0.227 | 0.547 | 0.080 | 3.239 | 10.872 | 0.043 | n/a | 0.453 | 8.319 | n/a | n/a | 0.050 | 6.664 | 0.225 | 0.050 | gw-w/thread-42/gateway.admitted-work | none observed |
| e1bc8a4fe563432b00000000000001a6 | 27.898 | 5.032 | 0.182 | 0.425 | 0.072 | 1.308 | 11.921 | 0.042 | n/a | 0.112 | 8.760 | n/a | n/a | 0.045 | 5.710 | 0.205 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001a4 | 27.552 | 3.994 | 0.343 | 0.394 | 0.146 | 1.967 | 9.333 | 0.117 | n/a | 0.234 | 10.913 | n/a | n/a | 0.112 | 4.877 | 0.177 | 0.112 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.982 | 0.966 | 0.000 | 1.804 | 3.979 | 0.006 | 0.000 | 0.457 | 0.865 | 1.703 | 0.055 | n/a | 0.557 | 9.443 | n/a | n/a | 0.052 | 4.385 | 0.254 | 0.052 |
| p99 | 29.756 | 2.022 | 0.004 | 5.353 | 8.601 | 0.010 | 0.000 | 1.067 | 2.049 | 5.458 | 0.160 | n/a | 1.498 | 15.380 | n/a | n/a | 0.074 | 9.067 | 0.362 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b00000000000001be | 29.756 | 7.813 | 0.009 | 0.000 | 0.244 | 2.049 | 2.596 | 0.160 | n/a | 1.498 | 15.325 | n/a | n/a | 0.063 | 8.066 | 0.271 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001c6 | 25.069 | 8.601 | 0.010 | 0.000 | 0.457 | 1.023 | 1.703 | 0.082 | n/a | 1.037 | 12.083 | n/a | n/a | 0.074 | 9.067 | 0.362 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000196 | 23.918 | 4.222 | 0.006 | 0.000 | 0.868 | 1.043 | 5.458 | 0.102 | n/a | 0.696 | 11.461 | n/a | n/a | 0.061 | 5.097 | 0.213 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000018e | 22.275 | 3.979 | 0.005 | 0.000 | 0.354 | 0.825 | 1.260 | 0.055 | n/a | 0.370 | 15.380 | n/a | n/a | 0.048 | 4.338 | 0.195 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000017e | 21.743 | 4.440 | 0.005 | 0.000 | 1.067 | 0.971 | 4.830 | 0.051 | n/a | 0.123 | 10.204 | n/a | n/a | 0.052 | 5.513 | 0.254 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000194 | 16.982 | 5.094 | 0.006 | 0.000 | 0.434 | 1.222 | 2.099 | 0.066 | n/a | 1.079 | 6.935 | n/a | n/a | 0.047 | 5.534 | 0.326 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000182 | 16.645 | 3.683 | 0.006 | 0.000 | 0.513 | 0.865 | 1.470 | 0.050 | n/a | 0.557 | 9.443 | n/a | n/a | 0.058 | 4.202 | 0.252 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001b2 | 15.810 | 3.406 | 0.006 | 0.000 | 0.363 | 0.742 | 1.418 | 0.034 | n/a | 0.569 | 9.228 | n/a | n/a | 0.044 | 3.775 | 0.239 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001c9 | 13.220 | 3.649 | 0.005 | 0.000 | 0.730 | 0.701 | 0.938 | 0.035 | n/a | 0.297 | 6.814 | n/a | n/a | 0.051 | 4.385 | 0.332 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001a8 | 12.801 | 3.313 | 0.006 | 0.000 | 0.469 | 0.695 | 2.106 | 0.081 | n/a | 0.308 | 5.753 | n/a | n/a | 0.069 | 3.788 | 0.296 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.770 | 0.535 | 0.000 | 1.268 | 4.710 | 0.026 | 0.000 | 0.267 | 1.382 | 4.573 | 0.055 | n/a | 0.411 | 11.913 | n/a | n/a | 0.056 | 5.334 | 0.210 | 0.056 |
| p99 | 72.059 | 3.555 | 0.021 | 4.345 | 14.585 | 0.605 | 0.654 | 1.117 | 6.373 | 39.749 | 0.622 | n/a | 4.201 | 61.818 | n/a | n/a | 1.008 | 15.244 | 0.417 | 1.008 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000213 | 72.059 | 6.411 | 0.026 | 0.000 | 0.720 | 1.146 | 1.406 | 0.036 | n/a | 0.381 | 61.818 | n/a | n/a | 0.114 | 7.157 | 0.099 | 0.114 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000220 | 56.688 | 3.907 | 0.323 | 0.000 | 0.145 | 1.534 | 39.749 | 0.296 | n/a | 0.136 | 10.508 | n/a | n/a | 0.092 | 4.374 | 0.077 | 0.092 | gw-w/thread-42/gateway.admitted-work | none observed |
| e1bc8a4fe563432b000000000000020c | 53.577 | 3.713 | 0.218 | 0.250 | 0.083 | 2.594 | 9.595 | 0.072 | n/a | 0.120 | 36.878 | n/a | n/a | 0.056 | 4.263 | 0.080 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000212 | 50.526 | 5.289 | 0.418 | 0.436 | 0.267 | 6.373 | 18.102 | 0.091 | n/a | 0.688 | 18.759 | n/a | n/a | 0.104 | 6.410 | 0.127 | 0.104 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001f1 | 49.027 | 14.585 | 0.012 | 0.000 | 0.647 | 3.364 | 20.106 | 0.151 | n/a | 1.160 | 8.947 | n/a | n/a | 0.055 | 15.244 | 0.311 | 0.055 | gw-w/thread-44/storage/begin-command! | none observed |
| e1bc8a4fe563432b00000000000001d8 | 37.649 | 5.165 | 0.204 | 0.407 | 0.075 | 1.858 | 7.851 | 0.050 | n/a | 0.720 | 21.269 | n/a | n/a | 0.049 | 5.852 | 0.155 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000218 | 37.065 | 5.316 | 0.496 | 0.308 | 0.252 | 5.724 | 9.701 | 0.173 | n/a | 0.177 | 13.909 | n/a | n/a | 1.008 | 6.372 | 0.172 | 1.008 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000208 | 35.978 | 3.593 | 0.273 | 0.326 | 0.149 | 1.783 | 11.622 | 0.053 | n/a | 0.201 | 17.891 | n/a | n/a | 0.087 | 4.340 | 0.121 | 0.087 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.171ms |
| e1bc8a4fe563432b00000000000001ce | 35.834 | 7.113 | 0.006 | 0.000 | 0.354 | 1.295 | 1.316 | 0.039 | n/a | 0.107 | 25.480 | n/a | n/a | 0.124 | 7.473 | 0.209 | 0.124 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001d2 | 34.909 | 8.814 | 0.605 | 0.374 | 0.086 | 3.256 | 8.082 | 0.070 | n/a | 0.876 | 12.671 | n/a | n/a | 0.075 | 9.879 | 0.283 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001d5 | 34.908 | 7.868 | 0.006 | 0.000 | 0.348 | 0.763 | 2.941 | 0.622 | n/a | 0.576 | 21.737 | n/a | n/a | 0.047 | 8.221 | 0.236 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.597ms |
| e1bc8a4fe563432b00000000000001ef | 32.441 | 4.828 | 0.211 | 0.422 | 0.076 | 1.487 | 9.779 | 0.064 | n/a | 3.412 | 12.100 | n/a | n/a | 0.062 | 5.537 | 0.171 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001e1 | 31.731 | 5.678 | 0.287 | 0.432 | 0.045 | 1.827 | 13.689 | 0.117 | n/a | 0.793 | 8.809 | n/a | n/a | 0.055 | 6.442 | 0.203 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000021c | 31.469 | 3.694 | 0.191 | 0.000 | 0.077 | 1.627 | 10.516 | 0.603 | n/a | 1.389 | 13.324 | n/a | n/a | 0.047 | 3.962 | 0.126 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001d4 | 31.134 | 5.832 | 0.008 | 0.000 | 1.117 | 3.417 | 2.806 | 0.061 | n/a | 4.201 | 13.582 | n/a | n/a | 0.109 | 6.957 | 0.223 | 0.109 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001db | 30.756 | 5.461 | 0.309 | 0.518 | 0.153 | 2.149 | 8.479 | 0.055 | n/a | 1.035 | 12.515 | n/a | n/a | 0.083 | 6.441 | 0.209 | 0.083 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001f9 | 30.583 | 6.841 | 0.237 | 0.374 | 0.201 | 1.419 | 8.512 | 0.097 | n/a | 0.916 | 11.913 | n/a | n/a | 0.072 | 7.653 | 0.250 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001eb | 28.467 | 3.623 | 0.005 | 0.000 | 0.875 | 1.033 | 1.944 | 0.086 | n/a | 0.802 | 20.046 | n/a | n/a | 0.053 | 4.503 | 0.158 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000210 | 27.574 | 3.475 | 0.177 | 0.278 | 0.077 | 1.411 | 7.435 | 0.066 | n/a | 0.466 | 14.138 | n/a | n/a | 0.052 | 4.007 | 0.145 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001fb | 27.167 | 3.943 | 0.247 | 0.245 | 0.149 | 1.804 | 10.327 | 0.053 | n/a | 0.409 | 9.920 | n/a | n/a | 0.071 | 4.583 | 0.169 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.890 | 0.791 | 0.000 | 1.834 | 3.902 | 0.006 | 0.000 | 0.720 | 0.928 | 1.406 | 0.040 | n/a | 0.381 | 12.394 | n/a | n/a | 0.052 | 4.837 | 0.223 | 0.052 |
| p99 | 72.059 | 2.545 | 0.012 | 4.345 | 7.113 | 0.026 | 0.000 | 1.117 | 3.417 | 4.722 | 0.099 | n/a | 4.201 | 61.818 | n/a | n/a | 0.124 | 7.473 | 0.353 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000213 | 72.059 | 6.411 | 0.026 | 0.000 | 0.720 | 1.146 | 1.406 | 0.036 | n/a | 0.381 | 61.818 | n/a | n/a | 0.114 | 7.157 | 0.099 | 0.114 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001ce | 35.834 | 7.113 | 0.006 | 0.000 | 0.354 | 1.295 | 1.316 | 0.039 | n/a | 0.107 | 25.480 | n/a | n/a | 0.124 | 7.473 | 0.209 | 0.124 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001d4 | 31.134 | 5.832 | 0.008 | 0.000 | 1.117 | 3.417 | 2.806 | 0.061 | n/a | 4.201 | 13.582 | n/a | n/a | 0.109 | 6.957 | 0.223 | 0.109 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001eb | 28.467 | 3.623 | 0.005 | 0.000 | 0.875 | 1.033 | 1.944 | 0.086 | n/a | 0.802 | 20.046 | n/a | n/a | 0.053 | 4.503 | 0.158 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000205 | 23.523 | 4.069 | 0.005 | 0.000 | 0.763 | 0.928 | 1.078 | 0.036 | n/a | 0.071 | 16.500 | n/a | n/a | 0.073 | 4.837 | 0.206 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001e9 | 23.092 | 5.254 | 0.005 | 0.000 | 0.179 | 0.857 | 4.722 | 0.099 | n/a | 0.141 | 11.795 | n/a | n/a | 0.040 | 5.438 | 0.236 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001ff | 21.649 | 3.189 | 0.006 | 0.000 | 0.907 | 0.831 | 1.562 | 0.045 | n/a | 0.133 | 14.927 | n/a | n/a | 0.048 | 4.103 | 0.190 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000209 | 20.890 | 4.848 | 0.006 | 0.000 | 0.691 | 0.677 | 1.019 | 0.043 | n/a | 0.116 | 13.432 | n/a | n/a | 0.058 | 5.545 | 0.265 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001dd | 20.610 | 4.810 | 0.012 | 0.000 | 0.512 | 0.950 | 2.279 | 0.035 | n/a | 3.493 | 8.473 | n/a | n/a | 0.046 | 5.334 | 0.259 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001e3 | 20.054 | 3.902 | 0.007 | 0.000 | 0.303 | 0.931 | 4.573 | 0.051 | n/a | 0.411 | 9.827 | n/a | n/a | 0.050 | 4.212 | 0.210 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001e5 | 18.516 | 2.856 | 0.005 | 0.000 | 0.526 | 0.944 | 1.398 | 0.040 | n/a | 0.310 | 12.394 | n/a | n/a | 0.042 | 3.388 | 0.183 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001f7 | 16.715 | 3.221 | 0.005 | 0.000 | 0.990 | 0.662 | 1.041 | 0.037 | n/a | 1.012 | 9.688 | n/a | n/a | 0.058 | 4.217 | 0.252 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000001d0 | 15.080 | 3.095 | 0.005 | 0.000 | 0.857 | 0.713 | 1.560 | 0.036 | n/a | 0.416 | 8.352 | n/a | n/a | 0.045 | 3.958 | 0.262 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000021e | 13.737 | 3.877 | 0.010 | 0.000 | 0.956 | 0.879 | 1.076 | 0.045 | n/a | 0.303 | 6.539 | n/a | n/a | 0.052 | 4.843 | 0.353 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000020e | 9.698 | 2.482 | 0.005 | 0.000 | 0.501 | 0.671 | 0.989 | 0.036 | n/a | 0.423 | 4.554 | n/a | n/a | 0.036 | 2.988 | 0.308 | 0.036 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.815 | 0.655 | 0.000 | 1.655 | 4.661 | 0.011 | 0.000 | 0.275 | 1.428 | 3.737 | 0.046 | n/a | 0.419 | 8.937 | n/a | n/a | 0.057 | 5.308 | 0.259 | 0.057 |
| p99 | 71.931 | 3.127 | 0.013 | 4.361 | 10.042 | 4.218 | 0.000 | 1.390 | 9.022 | 45.475 | 3.006 | n/a | 5.928 | 56.991 | n/a | n/a | 0.141 | 11.445 | 0.449 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000285 | 71.931 | 3.620 | 0.203 | 0.000 | 0.052 | 1.428 | 9.118 | 0.062 | n/a | 0.409 | 56.991 | n/a | n/a | 0.048 | 3.875 | 0.054 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000234 | 69.097 | 4.351 | 0.369 | 0.000 | 0.065 | 1.628 | 45.475 | 0.063 | n/a | 0.142 | 16.921 | n/a | n/a | 0.082 | 4.785 | 0.069 | 0.082 | gw-w/thread-48/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000229 | 44.154 | 10.042 | 0.013 | 0.000 | 1.390 | 1.419 | 2.579 | 0.086 | n/a | 0.257 | 28.261 | n/a | n/a | 0.107 | 11.445 | 0.259 | 0.107 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000244 | 43.360 | 3.621 | 0.263 | 0.000 | 0.068 | 1.556 | 12.346 | 0.052 | n/a | 0.093 | 25.290 | n/a | n/a | 0.072 | 3.952 | 0.091 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000022f | 41.543 | 5.351 | 0.010 | 0.000 | 1.033 | 1.144 | 1.809 | 0.049 | n/a | 0.439 | 31.640 | n/a | n/a | 0.068 | 6.394 | 0.154 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000264 | 41.243 | 5.236 | 0.281 | 0.000 | 0.045 | 2.317 | 9.781 | 0.098 | n/a | 1.679 | 21.758 | n/a | n/a | 0.048 | 5.562 | 0.135 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.725ms |
| e1bc8a4fe563432b000000000000022d | 39.636 | 8.127 | 0.290 | 0.000 | 0.072 | 1.729 | 14.148 | 0.040 | n/a | 0.072 | 15.113 | n/a | n/a | 0.044 | 8.490 | 0.214 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000025a | 38.966 | 6.525 | 0.210 | 0.000 | 0.066 | 2.034 | 20.721 | 0.088 | n/a | 2.908 | 6.366 | n/a | n/a | 0.048 | 6.801 | 0.175 | 0.048 | gw-w/thread-44/gateway.admitted-work | none observed |
| e1bc8a4fe563432b000000000000024b | 36.748 | 2.824 | 0.003 | 0.000 | 0.721 | 0.494 | 1.781 | 3.006 | n/a | 3.698 | 24.195 | n/a | n/a | 0.027 | 3.548 | 0.097 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.639ms |
| e1bc8a4fe563432b0000000000000238 | 33.008 | 4.639 | 0.320 | 0.000 | 0.064 | 2.051 | 7.097 | 0.088 | n/a | 3.692 | 15.006 | n/a | n/a | 0.051 | 5.022 | 0.152 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000273 | 32.277 | 5.175 | 0.209 | 0.000 | 0.067 | 2.164 | 11.848 | 0.046 | n/a | 0.480 | 12.236 | n/a | n/a | 0.052 | 5.451 | 0.169 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000223 | 32.256 | 4.661 | 4.218 | 0.000 | 0.080 | 4.653 | 6.689 | 0.047 | n/a | 0.109 | 11.731 | n/a | n/a | 0.067 | 8.959 | 0.278 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.176ms; driver.expected-state.bind-receipt 1.025ms |
| e1bc8a4fe563432b000000000000027f | 31.376 | 4.213 | 0.329 | 0.000 | 0.138 | 2.259 | 15.155 | 0.085 | n/a | 0.672 | 8.438 | n/a | n/a | 0.087 | 4.680 | 0.149 | 0.087 | gw-w/thread-44/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000248 | 31.360 | 4.834 | 0.278 | 0.000 | 0.097 | 7.118 | 7.042 | 0.086 | n/a | 2.209 | 9.640 | n/a | n/a | 0.056 | 5.209 | 0.166 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000023c | 28.943 | 3.758 | 0.248 | 0.000 | 0.042 | 1.632 | 8.977 | 0.067 | n/a | 5.928 | 8.254 | n/a | n/a | 0.038 | 4.047 | 0.140 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000025c | 28.491 | 5.719 | 0.005 | 0.000 | 0.108 | 0.474 | 4.767 | 0.034 | n/a | 0.435 | 16.913 | n/a | n/a | 0.035 | 5.833 | 0.205 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000024a | 27.799 | 4.920 | 0.006 | 0.000 | 0.873 | 1.095 | 2.507 | 0.075 | n/a | 4.866 | 13.394 | n/a | n/a | 0.063 | 5.799 | 0.209 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000246 | 26.740 | 3.504 | 0.249 | 0.000 | 0.057 | 1.456 | 6.760 | 0.066 | n/a | 0.168 | 14.414 | n/a | n/a | 0.065 | 3.811 | 0.143 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000274 | 25.680 | 6.327 | 0.010 | 0.000 | 0.114 | 1.043 | 1.127 | 0.033 | n/a | 0.399 | 16.535 | n/a | n/a | 0.093 | 6.450 | 0.251 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000271 | 25.012 | 6.099 | 0.007 | 0.000 | 0.891 | 1.237 | 5.441 | 0.036 | n/a | 0.087 | 11.158 | n/a | n/a | 0.057 | 6.996 | 0.280 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.470 | 0.881 | 0.000 | 1.799 | 4.677 | 0.008 | 0.000 | 0.599 | 0.988 | 1.318 | 0.045 | n/a | 0.438 | 6.823 | n/a | n/a | 0.058 | 5.308 | 0.292 | 0.058 |
| p99 | 41.543 | 1.474 | 0.004 | 3.693 | 7.595 | 0.014 | 0.000 | 1.181 | 9.022 | 9.619 | 3.006 | n/a | 3.698 | 31.640 | n/a | n/a | 0.084 | 8.332 | 0.449 | 0.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b000000000000022f | 41.543 | 5.351 | 0.010 | 0.000 | 1.033 | 1.144 | 1.809 | 0.049 | n/a | 0.439 | 31.640 | n/a | n/a | 0.068 | 6.394 | 0.154 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000024b | 36.748 | 2.824 | 0.003 | 0.000 | 0.721 | 0.494 | 1.781 | 3.006 | n/a | 3.698 | 24.195 | n/a | n/a | 0.027 | 3.548 | 0.097 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.639ms |
| e1bc8a4fe563432b0000000000000222 | 24.063 | 7.595 | 0.011 | 0.000 | 0.726 | 3.018 | 9.619 | 0.099 | n/a | 0.529 | 2.400 | n/a | n/a | 0.066 | 8.332 | 0.346 | 0.066 | gw-w/thread-44/storage/begin-command! | none observed |
| e1bc8a4fe563432b000000000000026a | 23.424 | 5.730 | 0.013 | 0.000 | 0.560 | 9.022 | 6.060 | 0.047 | n/a | 0.127 | 1.780 | n/a | n/a | 0.084 | 6.304 | 0.269 | 0.084 | node-14/thread-0/socket.wait-first-byte | none observed |
| e1bc8a4fe563432b0000000000000283 | 22.815 | 6.983 | 0.011 | 0.000 | 0.278 | 1.034 | 1.163 | 0.038 | n/a | 0.438 | 12.796 | n/a | n/a | 0.073 | 7.272 | 0.319 | 0.073 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000027d | 19.398 | 5.006 | 0.012 | 0.000 | 0.418 | 2.175 | 4.424 | 0.037 | n/a | 0.445 | 6.823 | n/a | n/a | 0.058 | 5.437 | 0.280 | 0.058 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000254 | 18.150 | 4.961 | 0.006 | 0.000 | 0.831 | 0.988 | 5.333 | 0.045 | n/a | 0.482 | 5.433 | n/a | n/a | 0.072 | 5.797 | 0.319 | 0.072 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000025e | 17.481 | 3.302 | 0.007 | 0.000 | 0.820 | 0.878 | 1.353 | 0.045 | n/a | 0.478 | 10.552 | n/a | n/a | 0.047 | 4.128 | 0.236 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000265 | 16.470 | 4.503 | 0.010 | 0.000 | 0.584 | 2.398 | 1.253 | 0.037 | n/a | 0.070 | 7.567 | n/a | n/a | 0.048 | 5.097 | 0.309 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000236 | 16.359 | 4.419 | 0.007 | 0.000 | 1.181 | 0.809 | 1.318 | 0.046 | n/a | 0.640 | 7.882 | n/a | n/a | 0.056 | 5.607 | 0.343 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000281 | 16.338 | 4.336 | 0.008 | 0.000 | 0.215 | 4.098 | 1.010 | 0.033 | n/a | 0.082 | 6.477 | n/a | n/a | 0.080 | 4.559 | 0.279 | 0.080 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000026f | 15.266 | 4.694 | 0.014 | 0.000 | 0.599 | 1.080 | 1.914 | 0.050 | n/a | 0.186 | 6.665 | n/a | n/a | 0.064 | 5.308 | 0.348 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000022b | 14.875 | 3.859 | 0.005 | 0.000 | 0.482 | 0.796 | 0.952 | 0.032 | n/a | 0.288 | 8.412 | n/a | n/a | 0.049 | 4.346 | 0.292 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000227 | 14.784 | 4.979 | 0.010 | 0.000 | 0.920 | 0.844 | 1.161 | 0.031 | n/a | 0.130 | 6.668 | n/a | n/a | 0.042 | 5.908 | 0.400 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000240 | 14.324 | 3.318 | 0.006 | 0.000 | 0.356 | 0.828 | 1.202 | 0.042 | n/a | 0.929 | 7.592 | n/a | n/a | 0.051 | 3.680 | 0.257 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000260 | 13.051 | 2.658 | 0.004 | 0.000 | 1.011 | 0.515 | 1.211 | 0.795 | n/a | 0.287 | 6.544 | n/a | n/a | 0.025 | 3.673 | 0.281 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000277 | 11.114 | 4.677 | 0.008 | 0.000 | 0.305 | 0.939 | 1.226 | 0.032 | n/a | 0.436 | 3.426 | n/a | n/a | 0.065 | 4.990 | 0.449 | 0.065 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.684 | 0.263 | 0.000 | 0.984 | 4.038 | 0.016 | 0.000 | 0.160 | 1.288 | 4.559 | 0.043 | n/a | 0.292 | 8.816 | n/a | n/a | 0.057 | 4.672 | 0.235 | 0.057 |
| p99 | 49.889 | 2.628 | 0.014 | 10.467 | 14.164 | n/a | 0.000 | 1.165 | 4.446 | 35.471 | 0.107 | n/a | 2.955 | 18.557 | n/a | n/a | 0.121 | 14.666 | 0.585 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b00000000000002ba | 49.889 | 3.568 | 0.346 | 0.000 | 0.096 | 1.965 | 35.471 | 0.043 | n/a | 0.401 | 7.936 | n/a | n/a | 0.062 | 4.010 | 0.080 | 0.062 | gw-w/thread-48/gateway.admitted-work | none observed |
| e1bc8a4fe563432b0000000000000296 | 44.758 | 7.460 | 0.291 | 0.000 | 0.021 | 1.352 | 16.888 | 0.079 | n/a | 0.705 | 17.910 | n/a | n/a | 0.051 | 7.772 | 0.174 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000028f | 40.969 | 4.641 | 0.190 | 0.000 | 0.017 | 1.553 | 28.523 | 0.107 | n/a | 0.896 | 5.006 | n/a | n/a | 0.035 | 4.848 | 0.118 | 0.035 | gw-w/thread-47/gateway.admitted-work | none observed |
| e1bc8a4fe563432b00000000000002ac | 35.426 | 4.038 | 0.276 | 0.000 | 0.071 | 1.183 | 14.796 | 0.054 | n/a | 0.076 | 14.871 | n/a | n/a | 0.061 | 4.385 | 0.124 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000294 | 34.742 | 8.384 | 0.013 | 0.000 | 1.165 | 1.902 | 4.286 | 0.030 | n/a | 0.324 | 18.557 | n/a | n/a | 0.080 | 9.563 | 0.275 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002ae | 34.444 | 10.803 | 0.307 | 0.000 | 0.160 | 2.576 | 8.016 | 0.065 | n/a | 0.170 | 12.266 | n/a | n/a | 0.081 | 11.270 | 0.327 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002b6 | 33.786 | 5.250 | 0.299 | 0.000 | 0.104 | 2.144 | 10.406 | 0.046 | n/a | 0.100 | 15.339 | n/a | n/a | 0.098 | 5.654 | 0.167 | 0.098 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002d7 | 31.723 | 4.077 | 0.573 | 0.000 | 0.075 | 2.162 | 9.785 | 0.063 | n/a | 1.511 | 13.419 | n/a | n/a | 0.057 | 4.726 | 0.149 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002c4 | 31.309 | 3.596 | 2.932 | 0.000 | 0.110 | 1.589 | 8.978 | 0.089 | n/a | 0.292 | 13.668 | n/a | n/a | 0.055 | 6.638 | 0.212 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000029c | 30.496 | 6.353 | 0.251 | 0.000 | 0.190 | 1.719 | 11.870 | 0.071 | n/a | 0.427 | 9.526 | n/a | n/a | 0.089 | 6.794 | 0.223 | 0.089 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002a6 | 29.440 | 3.289 | 0.224 | 0.000 | 0.083 | 1.193 | 12.172 | 0.053 | n/a | 0.168 | 12.188 | n/a | n/a | 0.069 | 3.596 | 0.122 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000029a | 27.661 | 3.597 | 0.251 | 0.000 | 0.068 | 1.379 | 7.213 | 0.096 | n/a | 0.585 | 14.412 | n/a | n/a | 0.058 | 3.917 | 0.142 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000028d | 27.142 | 4.219 | 0.005 | 0.000 | 0.522 | 0.636 | 4.559 | 0.047 | n/a | 0.164 | 16.942 | n/a | n/a | 0.049 | 4.746 | 0.175 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000028b | 26.929 | 6.352 | 0.015 | 0.000 | 0.592 | 0.850 | 1.193 | 0.033 | n/a | 0.146 | 17.692 | n/a | n/a | 0.057 | 6.958 | 0.258 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000297 | 26.832 | 6.063 | 0.010 | 0.000 | 0.642 | 4.446 | 1.235 | 0.032 | n/a | 2.955 | 11.375 | n/a | n/a | 0.074 | 6.715 | 0.250 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000289 | 26.230 | 3.414 | 0.217 | 0.000 | 0.064 | 1.688 | 9.583 | 0.074 | n/a | 0.729 | 10.406 | n/a | n/a | 0.054 | 3.695 | 0.141 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002a7 | 25.057 | 14.164 | 0.010 | 0.000 | 0.492 | 0.925 | 1.645 | 0.032 | n/a | 0.093 | 7.609 | n/a | n/a | 0.087 | 14.666 | 0.585 | 0.087 | node-14/thread-0/driver.publication | none observed |
| e1bc8a4fe563432b00000000000002c0 | 23.749 | 5.910 | 0.361 | 0.000 | 0.058 | 1.918 | 6.229 | 0.038 | n/a | 0.357 | 8.816 | n/a | n/a | 0.060 | 6.330 | 0.267 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002d3 | 22.624 | 4.202 | 0.180 | 0.000 | 0.059 | 1.336 | 6.216 | 0.046 | n/a | 0.110 | 10.428 | n/a | n/a | 0.049 | 4.440 | 0.196 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002be | 22.387 | 4.404 | 0.016 | 0.000 | 0.839 | 0.848 | 1.709 | 0.036 | n/a | 0.510 | 13.970 | n/a | n/a | 0.054 | 5.259 | 0.235 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.610 | 0.531 | 0.000 | 1.678 | 3.647 | 0.006 | 0.000 | 0.522 | 0.848 | 1.202 | 0.036 | n/a | 0.324 | 7.364 | n/a | n/a | 0.046 | 4.109 | 0.275 | 0.046 |
| p99 | 34.742 | 2.628 | 0.014 | 10.467 | 14.164 | n/a | 0.000 | 1.165 | 3.888 | 9.672 | 0.047 | n/a | 0.510 | 18.557 | n/a | n/a | 0.121 | 14.666 | 0.585 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000294 | 34.742 | 8.384 | 0.013 | 0.000 | 1.165 | 1.902 | 4.286 | 0.030 | n/a | 0.324 | 18.557 | n/a | n/a | 0.080 | 9.563 | 0.275 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002a7 | 25.057 | 14.164 | 0.010 | 0.000 | 0.492 | 0.925 | 1.645 | 0.032 | n/a | 0.093 | 7.609 | n/a | n/a | 0.087 | 14.666 | 0.585 | 0.087 | node-14/thread-0/driver.publication | none observed |
| e1bc8a4fe563432b00000000000002be | 22.387 | 4.404 | 0.016 | 0.000 | 0.839 | 0.848 | 1.709 | 0.036 | n/a | 0.510 | 13.970 | n/a | n/a | 0.054 | 5.259 | 0.235 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002a4 | 17.515 | 3.194 | 0.006 | 0.000 | 0.132 | 0.662 | 4.718 | 0.041 | n/a | 0.438 | 8.278 | n/a | n/a | 0.046 | 3.332 | 0.190 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002c2 | 17.475 | 4.020 | 0.008 | 0.000 | 0.522 | 0.938 | 2.796 | 0.045 | n/a | 0.148 | 8.936 | n/a | n/a | 0.061 | 4.551 | 0.260 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000287 | 16.745 | 3.954 | 0.006 | 0.000 | 1.052 | 1.127 | 1.109 | 0.044 | n/a | 0.476 | 8.856 | n/a | n/a | 0.121 | 5.012 | 0.299 | 0.121 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002a0 | 15.124 | 2.799 | 0.005 | 0.000 | 0.719 | 0.731 | 1.046 | 0.047 | n/a | 0.463 | 9.272 | n/a | n/a | 0.042 | 3.522 | 0.233 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b000000000000029d | 13.610 | 3.769 | 0.006 | 0.000 | 0.543 | 3.888 | 0.992 | 0.031 | n/a | 0.091 | 4.247 | n/a | n/a | 0.043 | 4.318 | 0.317 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002ce | 13.158 | 1.612 | n/a | 0.000 | 0.078 | 1.634 | 9.672 | 0.039 | n/a | 0.080 | 0.000 | n/a | n/a | 0.043 | 1.689 | 0.128 | 0.043 | gw-w/thread-49/gateway.admitted-work | none observed |
| e1bc8a4fe563432b00000000000002b0 | 12.967 | 3.763 | 0.006 | 0.000 | 0.340 | 0.813 | 1.156 | 0.032 | n/a | 0.104 | 6.706 | n/a | n/a | 0.047 | 4.109 | 0.317 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002ca | 12.226 | 3.647 | 0.006 | 0.000 | 0.368 | 0.920 | 1.202 | 0.030 | n/a | 0.094 | 5.914 | n/a | n/a | 0.045 | 4.021 | 0.329 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002c7 | 12.170 | 2.525 | 0.004 | 0.000 | 0.331 | 0.567 | 0.966 | 0.040 | n/a | 0.347 | 7.364 | n/a | n/a | 0.027 | 2.860 | 0.235 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002bc | 10.997 | 3.541 | 0.006 | 0.000 | 1.069 | 0.659 | 1.290 | 0.039 | n/a | 0.431 | 3.905 | n/a | n/a | 0.058 | 4.615 | 0.420 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000002b8 | 10.320 | 3.103 | 0.006 | 0.000 | 0.881 | 0.614 | 1.026 | 0.031 | n/a | 0.397 | 4.227 | n/a | n/a | 0.035 | 3.990 | 0.387 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (865 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.364 | 0.781 | 0.000 | 1.712 | 3.669 | 0.004 | 0.000 | 0.727 | 0.789 | 1.191 | 0.033 | n/a | 0.136 | 7.042 | n/a | n/a | 0.039 | 4.650 | 0.320 | 0.039 |
| p99 | 66.431 | 3.717 | 0.072 | 5.345 | 10.229 | 0.451 | 0.000 | 16.990 | 11.325 | 10.045 | 3.936 | n/a | 3.742 | 42.724 | n/a | n/a | 0.109 | 20.360 | 0.625 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b000000000000040d | 90.014 | 3.684 | 0.005 | 0.000 | 36.080 | 10.871 | 1.375 | 4.704 | n/a | 0.028 | 33.232 | n/a | n/a | 0.035 | 39.769 | 0.442 | 0.035 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.913ms; driver.publication 1.755ms; driver.publication 1.680ms; driver.publication 1.652ms; driver.publication 1.529ms |
| e1bc8a4fe563432b000000000000043f | 87.836 | 7.402 | 0.014 | 0.000 | 0.400 | 0.954 | 1.462 | 0.120 | n/a | 0.353 | 77.058 | n/a | n/a | 0.072 | 7.816 | 0.089 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000441 | 83.401 | 15.592 | 0.017 | 0.000 | 0.304 | 3.613 | 5.027 | 0.036 | n/a | 0.159 | 58.566 | n/a | n/a | 0.088 | 15.913 | 0.191 | 0.088 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.535ms; driver.publication 1.141ms |
| e1bc8a4fe563432b0000000000000442 | 77.328 | 4.815 | 0.023 | 0.000 | 0.677 | 3.637 | 2.163 | 0.062 | n/a | 0.116 | 65.783 | n/a | n/a | 0.051 | 5.515 | 0.071 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 1.535ms; driver.publication 1.141ms |
| e1bc8a4fe563432b0000000000000440 | 75.759 | 6.612 | 0.011 | 0.000 | 0.296 | 3.333 | 2.838 | 0.093 | n/a | 0.691 | 61.815 | n/a | n/a | 0.069 | 6.919 | 0.091 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.535ms |
| e1bc8a4fe563432b0000000000000415 | 70.276 | 3.118 | 0.003 | 0.000 | 7.462 | 12.026 | 1.614 | 3.227 | n/a | 0.080 | 42.724 | n/a | n/a | 0.024 | 10.583 | 0.151 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.913ms; driver.publication 1.680ms; driver.publication 1.452ms; driver.publication 1.410ms; driver.publication 1.399ms |
| e1bc8a4fe563432b00000000000004dd | 69.497 | 11.663 | 0.012 | 0.000 | 0.493 | 1.016 | 1.679 | 0.041 | n/a | 0.131 | 54.403 | n/a | n/a | 0.061 | 12.167 | 0.175 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000828 | 69.492 | 6.664 | 0.008 | 0.000 | 4.232 | 36.671 | 5.181 | 0.131 | n/a | 0.267 | 16.310 | n/a | n/a | 0.028 | 10.903 | 0.157 | 0.028 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.178ms; driver.publication 1.448ms; driver.publication 1.444ms; driver.publication 1.376ms; driver.publication 1.299ms |
| e1bc8a4fe563432b0000000000000371 | 66.431 | 2.966 | 0.004 | 0.000 | 19.523 | 3.381 | 3.181 | 0.099 | n/a | 0.452 | 36.793 | n/a | n/a | 0.032 | 22.493 | 0.339 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.547ms; driver.publication 1.196ms |
| e1bc8a4fe563432b00000000000002dd | 66.346 | 5.497 | 0.354 | 0.000 | 0.062 | 1.434 | 5.472 | 0.040 | n/a | 0.384 | 53.039 | n/a | n/a | 0.063 | 5.913 | 0.089 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000412 | 66.094 | 10.155 | 0.008 | 0.000 | 4.379 | 1.427 | 17.544 | 0.115 | n/a | 1.826 | 30.580 | n/a | n/a | 0.061 | 14.542 | 0.220 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.680ms; driver.publication 1.465ms; driver.publication 1.410ms; client.encode 1.144ms |
| e1bc8a4fe563432b0000000000000413 | 65.457 | 8.580 | 0.029 | 0.000 | 6.334 | 8.387 | 3.211 | 7.284 | n/a | 0.078 | 31.441 | n/a | n/a | 0.113 | 14.943 | 0.228 | 0.113 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.913ms; driver.publication 1.680ms; driver.publication 1.410ms; driver.publication 1.298ms |
| e1bc8a4fe563432b000000000000044e | 55.061 | 8.850 | 0.012 | 0.000 | 0.482 | 0.781 | 2.513 | 0.074 | n/a | 0.126 | 42.135 | n/a | n/a | 0.088 | 9.344 | 0.170 | 0.088 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.558ms; driver.publication 1.162ms |
| e1bc8a4fe563432b0000000000000374 | 54.949 | 4.444 | 0.005 | 0.000 | 1.328 | 0.817 | 0.846 | 0.020 | n/a | 0.070 | 47.367 | n/a | n/a | 0.051 | 5.778 | 0.105 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000004b0 | 54.639 | 4.060 | 0.004 | 0.000 | 3.441 | 0.674 | 1.027 | 0.361 | n/a | 0.482 | 44.563 | n/a | n/a | 0.026 | 7.506 | 0.137 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.498ms; driver.publication 1.460ms; driver.publication 1.342ms |
| e1bc8a4fe563432b0000000000000444 | 51.991 | 2.897 | 0.004 | 0.000 | 2.235 | 5.335 | 1.710 | 0.070 | n/a | 0.603 | 39.104 | n/a | n/a | 0.033 | 5.136 | 0.099 | 0.033 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 1.314ms; driver.publication 1.141ms; driver.publication 1.084ms |
| e1bc8a4fe563432b00000000000004de | 51.669 | 13.936 | 0.011 | 0.000 | 0.677 | 3.488 | 10.131 | 0.022 | n/a | 0.127 | 23.222 | n/a | n/a | 0.055 | 14.625 | 0.283 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.111ms; driver.publication 1.649ms |
| e1bc8a4fe563432b00000000000004df | 51.561 | 3.533 | 0.005 | 0.000 | 8.348 | 14.258 | 0.779 | 0.756 | n/a | 0.374 | 23.479 | n/a | n/a | 0.030 | 11.885 | 0.231 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.141ms; driver.expected-state.bind-receipt 2.111ms; driver.publication 1.649ms; driver.publication 1.332ms |
| e1bc8a4fe563432b00000000000004b2 | 50.884 | 5.553 | 0.192 | 0.000 | 0.623 | 7.500 | 0.539 | 0.607 | n/a | 0.023 | 35.825 | n/a | n/a | 0.021 | 6.368 | 0.125 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.750ms; driver.publication 1.460ms; driver.publication 1.342ms; driver.publication 1.199ms |
| e1bc8a4fe563432b00000000000005fc | 50.068 | 3.211 | 0.002 | 0.000 | 3.287 | 0.567 | 2.118 | 0.059 | n/a | 0.184 | 40.618 | n/a | n/a | 0.022 | 6.500 | 0.130 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.229ms; driver.publication 1.073ms |

## P2 / L1024 / commit / 5-10 facts (506 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.888 | 0.684 | 0.000 | 1.581 | 3.231 | 0.004 | 0.000 | 0.737 | 0.764 | 1.031 | 0.032 | n/a | 0.136 | 6.279 | n/a | n/a | 0.038 | 4.235 | 0.316 | 0.038 |
| p99 | 54.949 | 2.281 | 0.045 | 4.632 | 7.402 | 0.152 | 0.000 | 15.247 | 11.678 | 6.096 | 3.936 | n/a | 2.982 | 36.793 | n/a | n/a | 0.109 | 19.431 | 0.600 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b000000000000040d | 90.014 | 3.684 | 0.005 | 0.000 | 36.080 | 10.871 | 1.375 | 4.704 | n/a | 0.028 | 33.232 | n/a | n/a | 0.035 | 39.769 | 0.442 | 0.035 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.913ms; driver.publication 1.755ms; driver.publication 1.680ms; driver.publication 1.652ms; driver.publication 1.529ms |
| e1bc8a4fe563432b000000000000043f | 87.836 | 7.402 | 0.014 | 0.000 | 0.400 | 0.954 | 1.462 | 0.120 | n/a | 0.353 | 77.058 | n/a | n/a | 0.072 | 7.816 | 0.089 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000440 | 75.759 | 6.612 | 0.011 | 0.000 | 0.296 | 3.333 | 2.838 | 0.093 | n/a | 0.691 | 61.815 | n/a | n/a | 0.069 | 6.919 | 0.091 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.535ms |
| e1bc8a4fe563432b0000000000000415 | 70.276 | 3.118 | 0.003 | 0.000 | 7.462 | 12.026 | 1.614 | 3.227 | n/a | 0.080 | 42.724 | n/a | n/a | 0.024 | 10.583 | 0.151 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.913ms; driver.publication 1.680ms; driver.publication 1.452ms; driver.publication 1.410ms; driver.publication 1.399ms |
| e1bc8a4fe563432b0000000000000371 | 66.431 | 2.966 | 0.004 | 0.000 | 19.523 | 3.381 | 3.181 | 0.099 | n/a | 0.452 | 36.793 | n/a | n/a | 0.032 | 22.493 | 0.339 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.547ms; driver.publication 1.196ms |
| e1bc8a4fe563432b0000000000000374 | 54.949 | 4.444 | 0.005 | 0.000 | 1.328 | 0.817 | 0.846 | 0.020 | n/a | 0.070 | 47.367 | n/a | n/a | 0.051 | 5.778 | 0.105 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000444 | 51.991 | 2.897 | 0.004 | 0.000 | 2.235 | 5.335 | 1.710 | 0.070 | n/a | 0.603 | 39.104 | n/a | n/a | 0.033 | 5.136 | 0.099 | 0.033 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 1.314ms; driver.publication 1.141ms; driver.publication 1.084ms |
| e1bc8a4fe563432b00000000000004df | 51.561 | 3.533 | 0.005 | 0.000 | 8.348 | 14.258 | 0.779 | 0.756 | n/a | 0.374 | 23.479 | n/a | n/a | 0.030 | 11.885 | 0.231 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.141ms; driver.expected-state.bind-receipt 2.111ms; driver.publication 1.649ms; driver.publication 1.332ms |
| e1bc8a4fe563432b00000000000004b2 | 50.884 | 5.553 | 0.192 | 0.000 | 0.623 | 7.500 | 0.539 | 0.607 | n/a | 0.023 | 35.825 | n/a | n/a | 0.021 | 6.368 | 0.125 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.750ms; driver.publication 1.460ms; driver.publication 1.342ms; driver.publication 1.199ms |
| e1bc8a4fe563432b0000000000000452 | 49.720 | 3.249 | 0.005 | 0.000 | 5.887 | 5.987 | 1.249 | 4.688 | n/a | 0.026 | 28.599 | n/a | n/a | 0.030 | 9.141 | 0.184 | 0.030 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.647ms; driver.publication 1.558ms; driver.expected-state.bind-receipt 1.304ms; driver.publication 1.212ms; driver.expected-state.bind-receipt 1.165ms |
| e1bc8a4fe563432b0000000000000450 | 48.716 | 4.316 | 0.006 | 0.000 | 6.685 | 0.575 | 1.125 | 0.032 | n/a | 0.071 | 35.826 | n/a | n/a | 0.078 | 11.008 | 0.226 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.162ms |
| e1bc8a4fe563432b000000000000040e | 46.562 | 4.751 | 0.007 | 0.000 | 15.247 | 1.141 | 1.618 | 0.070 | n/a | 0.170 | 23.500 | n/a | n/a | 0.058 | 20.005 | 0.430 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.755ms; driver.publication 1.652ms; driver.publication 1.529ms; driver.publication 1.410ms; client.encode 1.144ms |
| e1bc8a4fe563432b0000000000000478 | 45.188 | 6.786 | 0.202 | 0.000 | 0.292 | 0.506 | 0.706 | 0.013 | n/a | 0.927 | 35.734 | n/a | n/a | 0.020 | 7.281 | 0.161 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.112ms; driver.publication 1.502ms |
| e1bc8a4fe563432b00000000000006e5 | 43.439 | 4.529 | 0.008 | 0.000 | 15.823 | 11.831 | 0.764 | 0.025 | n/a | 1.296 | 9.112 | n/a | n/a | 0.050 | 20.360 | 0.469 | 0.050 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.714ms; driver.publication 1.409ms; driver.publication 1.160ms |
| e1bc8a4fe563432b00000000000004b4 | 41.704 | 2.653 | 0.005 | 0.000 | 2.878 | 9.278 | 0.727 | 0.036 | n/a | 0.139 | 25.968 | n/a | n/a | 0.021 | 5.536 | 0.133 | 0.021 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.750ms; driver.publication 1.460ms; driver.publication 1.342ms; driver.publication 1.282ms; driver.publication 1.199ms |
| e1bc8a4fe563432b0000000000000306 | 41.226 | 3.806 | 0.005 | 0.000 | 0.840 | 0.624 | 0.926 | 0.044 | n/a | 0.331 | 34.616 | n/a | n/a | 0.032 | 4.652 | 0.113 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000830 | 40.196 | 2.617 | 0.003 | 0.000 | 0.572 | 2.079 | 1.048 | 0.040 | n/a | 0.091 | 33.713 | n/a | n/a | 0.033 | 3.192 | 0.079 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.058ms |
| e1bc8a4fe563432b0000000000000354 | 40.012 | 5.292 | 0.007 | 0.000 | 1.331 | 0.889 | 1.764 | 0.071 | n/a | 0.142 | 30.458 | n/a | n/a | 0.059 | 6.629 | 0.166 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.282ms; driver.publication 1.136ms |
| e1bc8a4fe563432b0000000000000466 | 38.117 | 4.849 | 0.013 | 0.000 | 6.444 | 2.700 | 1.695 | 0.093 | n/a | 0.685 | 21.603 | n/a | n/a | 0.035 | 11.306 | 0.297 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.195ms |
| e1bc8a4fe563432b00000000000005fa | 37.907 | 3.793 | 0.004 | 0.000 | 0.931 | 0.543 | 1.400 | 0.052 | n/a | 0.118 | 31.032 | n/a | n/a | 0.034 | 4.728 | 0.125 | 0.034 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.073ms |

## P2/P4 / read-your-own-write / read (63 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 124.923 | n/a | n/a | n/a | 27.436 | 20.757 | 1.579 | 0.000 | 0.514 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.414 | 77.193 | 0.755 | 26.414 |
| p99 | 463.485 | n/a | n/a | n/a | 135.045 | 400.006 | 23.091 | 0.000 | 171.646 | 92.537 | 107.392 | n/a | 0.089 | 0.000 | n/a | n/a | 175.822 | 434.475 | 1.000 | 175.822 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b000000000000042b | 463.485 | 31.614 | 400.006 | 2.854 | 0.000 | 0.394 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.616 | 434.475 | 0.937 | 28.616 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b0000000000000434 | 448.633 | 15.383 | 393.552 | 0.000 | 0.000 | 0.439 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.260 | 408.935 | 0.912 | 39.260 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.001ms |
| e1bc8a4fe563432b0000000000000428 | 446.379 | 22.651 | 246.764 | 0.000 | 0.000 | 1.142 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 175.822 | 269.416 | 0.604 | 175.822 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b0000000000000422 | 438.752 | 63.874 | 280.556 | 14.383 | 0.000 | 0.679 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 79.260 | 358.813 | 0.818 | 79.260 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b000000000000042a | 433.923 | 15.984 | 334.579 | 0.000 | 0.000 | 7.773 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 75.586 | 350.563 | 0.808 | 75.586 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b0000000000000430 | 428.613 | 18.017 | 321.325 | 0.000 | 0.000 | 0.351 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 88.919 | 339.343 | 0.792 | 88.919 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b0000000000000438 | 421.933 | 12.321 | 396.557 | 0.000 | 0.000 | 0.307 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.748 | 408.878 | 0.969 | 12.748 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.001ms; driver.publication 1.647ms |
| e1bc8a4fe563432b0000000000000437 | 417.390 | 11.845 | 359.351 | 0.000 | 0.000 | 0.310 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.885 | 371.196 | 0.889 | 45.885 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.001ms; driver.publication 1.817ms |
| e1bc8a4fe563432b0000000000000439 | 414.937 | 20.994 | 367.261 | 0.000 | 0.000 | 0.268 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.414 | 388.255 | 0.936 | 26.414 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.001ms; driver.publication 1.647ms; driver.publication 1.558ms |
| e1bc8a4fe563432b0000000000000425 | 362.265 | 15.489 | 260.489 | 0.000 | 0.000 | 0.914 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.374 | 275.978 | 0.762 | 85.374 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b000000000000041f | 358.929 | 58.521 | 115.805 | 16.196 | 0.000 | 2.184 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 166.223 | 190.522 | 0.531 | 166.223 | node-14/thread-3/socket.wait-first-byte | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b0000000000000419 | 313.777 | 19.937 | 10.636 | 1.363 | 0.000 | 171.646 | 2.741 | 107.392 | n/a | 0.027 | 0.000 | n/a | n/a | 0.034 | 31.937 | 0.102 | 0.034 | node-14/thread-3/socket.wait-first-byte | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b000000000000041b | 295.132 | 18.025 | 4.295 | 0.839 | 0.000 | 162.654 | 16.139 | 93.139 | n/a | 0.020 | 0.000 | n/a | n/a | 0.021 | 23.159 | 0.078 | 0.021 | node-14/thread-3/socket.wait-first-byte | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b000000000000041c | 287.032 | 127.487 | 12.049 | 21.447 | 0.000 | 23.318 | 77.308 | 25.320 | n/a | 0.089 | 0.000 | n/a | n/a | 0.015 | 160.983 | 0.561 | 0.015 | gw-r/thread-45/gateway.admitted-work | driver.publication 5.802ms; driver.expected-state.bind-receipt 3.712ms; driver.publication 3.053ms; driver.publication 2.649ms; driver.publication 2.636ms |
| e1bc8a4fe563432b0000000000001673 | 234.353 | 49.269 | 168.365 | 8.091 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.208 | 225.724 | 0.963 | 8.208 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.344ms; driver.publication 1.311ms; driver.publication 1.297ms; driver.publication 1.234ms; driver.publication 1.197ms |
| e1bc8a4fe563432b000000000000166d | 199.623 | 32.833 | 72.707 | 2.729 | 0.000 | 0.339 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 91.015 | 108.269 | 0.542 | 91.015 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.293ms; driver.publication 1.892ms; driver.publication 1.344ms; driver.publication 1.297ms; driver.publication 1.234ms |
| e1bc8a4fe563432b000000000000167a | 186.265 | 15.850 | 117.212 | 0.000 | 0.000 | 1.616 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.587 | 133.062 | 0.714 | 51.587 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.344ms; driver.publication 1.311ms; driver.publication 1.297ms; driver.publication 1.234ms; driver.publication 1.143ms |
| e1bc8a4fe563432b0000000000000416 | 181.526 | 68.871 | 6.342 | 12.667 | 0.000 | 1.006 | 92.537 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.063 | 87.880 | 0.484 | 0.063 | gw-r/thread-44/gateway.admitted-work | driver.publication 5.802ms; driver.publication 2.649ms; driver.publication 2.636ms; driver.publication 2.406ms; driver.publication 2.208ms |
| e1bc8a4fe563432b0000000000000ec6 | 180.739 | 135.045 | 9.542 | 23.091 | 0.000 | 0.536 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.524 | 167.679 | 0.928 | 12.524 | node-14/thread-3/worker.gateway-observer.observe | driver.publication 1.915ms; driver.publication 1.803ms; driver.publication 1.563ms; driver.publication 1.452ms; driver.publication 1.431ms |
| e1bc8a4fe563432b0000000000000ec4 | 171.987 | 113.122 | 3.683 | 13.094 | 0.000 | 0.721 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.368 | 129.899 | 0.755 | 41.368 | node-14/thread-3/worker.gateway-observer.observe | driver.publication 1.915ms; driver.publication 1.803ms; driver.publication 1.431ms; driver.publication 1.352ms; driver.expected-state.bind-receipt 1.243ms |

## P2 / tail / commit (2602 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.185 | 0.744 | 0.000 | 1.639 | 3.564 | 0.004 | 0.000 | 0.730 | 0.691 | 1.087 | 0.029 | n/a | 0.106 | 5.200 | n/a | n/a | 0.032 | 4.493 | 0.365 | 0.032 |
| p99 | 45.685 | 3.020 | 0.053 | 4.909 | 10.581 | 0.368 | 0.000 | 14.000 | 9.665 | 8.462 | 2.063 | n/a | 2.861 | 30.907 | n/a | n/a | 0.093 | 18.604 | 0.688 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000a43 | 68.895 | 3.690 | 0.003 | 0.000 | 0.608 | 9.279 | 1.234 | 0.024 | n/a | 0.071 | 53.955 | n/a | n/a | 0.031 | 4.302 | 0.062 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.912ms; driver.expected-state.bind-receipt 1.056ms |
| e1bc8a4fe563432b0000000000000a41 | 68.098 | 9.097 | 0.006 | 0.000 | 0.177 | 0.426 | 1.306 | 0.030 | n/a | 0.191 | 56.760 | n/a | n/a | 0.104 | 9.280 | 0.136 | 0.104 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.005ms |
| e1bc8a4fe563432b0000000000000a77 | 63.880 | 5.344 | 0.363 | 0.000 | 0.029 | 3.407 | 24.760 | 0.069 | n/a | 0.405 | 29.471 | n/a | n/a | 0.031 | 5.737 | 0.090 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.467ms; driver.publication 1.466ms; driver.publication 1.287ms; driver.publication 1.281ms; driver.publication 1.236ms |
| e1bc8a4fe563432b0000000000000d26 | 60.919 | 7.755 | 0.081 | 0.000 | 6.588 | 2.705 | 2.292 | 0.824 | n/a | 0.392 | 40.263 | n/a | n/a | 0.020 | 14.423 | 0.237 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.020ms; driver.publication 0.698ms |
| e1bc8a4fe563432b0000000000001a5d | 60.392 | 4.845 | 4.303 | 0.000 | 0.031 | 2.395 | 3.440 | 0.034 | n/a | 0.067 | 45.263 | n/a | n/a | 0.014 | 9.178 | 0.152 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.367ms; driver.publication 1.396ms; driver.publication 1.147ms |
| e1bc8a4fe563432b000000000000189c | 59.942 | 3.098 | 0.004 | 0.000 | 1.643 | 0.514 | 0.617 | 0.027 | n/a | 0.071 | 53.940 | n/a | n/a | 0.028 | 4.745 | 0.079 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.328ms; driver.publication 0.808ms |
| e1bc8a4fe563432b000000000000164b | 55.288 | 11.705 | 0.014 | 0.000 | 0.874 | 25.612 | 3.003 | 0.098 | n/a | 0.115 | 13.833 | n/a | n/a | 0.033 | 12.594 | 0.228 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.458ms; driver.publication 1.397ms; driver.publication 1.377ms; driver.publication 1.352ms |
| e1bc8a4fe563432b0000000000000e9c | 53.058 | 2.986 | 0.008 | 0.000 | 1.257 | 3.100 | 1.424 | 0.038 | n/a | 0.070 | 44.153 | n/a | n/a | 0.023 | 4.250 | 0.080 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.608ms; driver.publication 1.341ms; driver.publication 1.019ms |
| e1bc8a4fe563432b0000000000001651 | 51.552 | 3.771 | 0.004 | 0.000 | 31.250 | 4.459 | 0.849 | 0.031 | n/a | 0.067 | 11.083 | n/a | n/a | 0.038 | 35.024 | 0.679 | 0.038 | node-14/thread-0/driver.queue.subject | driver.publication 4.458ms; driver.publication 1.397ms; driver.publication 1.352ms; driver.publication 1.300ms; driver.publication 1.229ms |
| e1bc8a4fe563432b0000000000000ab4 | 51.477 | 2.839 | 0.003 | 0.000 | 0.427 | 0.562 | 35.932 | 0.015 | n/a | 0.075 | 11.601 | n/a | n/a | 0.023 | 3.268 | 0.063 | 0.023 | gw-w/thread-44/commit.prepare-and-validate | none observed |
| e1bc8a4fe563432b0000000000000d50 | 51.087 | 5.584 | 0.005 | 0.000 | 1.924 | 2.759 | 28.990 | 0.096 | n/a | 0.127 | 11.565 | n/a | n/a | 0.036 | 7.513 | 0.147 | 0.036 | gw-w/thread-45/commit.prepare-and-validate | driver.publication 1.421ms |
| e1bc8a4fe563432b0000000000001364 | 49.874 | 6.550 | 0.012 | 0.000 | 0.680 | 13.536 | 2.150 | 0.056 | n/a | 0.102 | 26.745 | n/a | n/a | 0.044 | 7.241 | 0.145 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.010ms |
| e1bc8a4fe563432b0000000000001a91 | 49.050 | 8.921 | 0.257 | 0.000 | 2.271 | 9.665 | 1.778 | 0.075 | n/a | 0.073 | 25.999 | n/a | n/a | 0.011 | 11.449 | 0.233 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.945ms; driver.publication 2.117ms; driver.publication 1.431ms; driver.publication 1.303ms |
| e1bc8a4fe563432b0000000000000a44 | 48.976 | 2.398 | 0.004 | 0.000 | 0.607 | 1.568 | 2.285 | 0.033 | n/a | 0.148 | 41.896 | n/a | n/a | 0.037 | 3.010 | 0.061 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.912ms; driver.publication 1.099ms; driver.expected-state.bind-receipt 1.056ms |
| e1bc8a4fe563432b0000000000001c2b | 48.947 | 2.645 | 0.003 | 0.000 | 11.472 | 0.436 | 0.769 | 0.023 | n/a | 0.189 | 33.376 | n/a | n/a | 0.035 | 14.120 | 0.288 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.publication 1.324ms; driver.publication 1.059ms |
| e1bc8a4fe563432b00000000000011a3 | 48.335 | 3.593 | 0.004 | 0.000 | 2.100 | 4.098 | 0.842 | 0.018 | n/a | 0.036 | 37.626 | n/a | n/a | 0.018 | 5.697 | 0.118 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.594ms; driver.publication 1.080ms |
| e1bc8a4fe563432b00000000000014e5 | 48.227 | 2.104 | 0.002 | 0.000 | 0.707 | 2.415 | 0.851 | 0.603 | n/a | 0.029 | 41.491 | n/a | n/a | 0.024 | 2.813 | 0.058 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000014e4 | 47.611 | 2.900 | 0.005 | 0.000 | 0.183 | 2.101 | 2.072 | 0.021 | n/a | 0.145 | 40.058 | n/a | n/a | 0.128 | 3.088 | 0.065 | 0.128 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000001384 | 47.390 | 4.188 | 0.008 | 0.000 | 1.121 | 0.897 | 1.689 | 0.038 | n/a | 0.335 | 39.051 | n/a | n/a | 0.063 | 5.317 | 0.112 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.808ms |
| e1bc8a4fe563432b00000000000014e6 | 47.381 | 3.302 | 0.002 | 0.000 | 0.915 | 2.565 | 0.967 | 0.021 | n/a | 0.309 | 39.279 | n/a | n/a | 0.020 | 4.219 | 0.089 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (1542 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.821 | 0.626 | 0.000 | 1.517 | 3.146 | 0.004 | 0.000 | 0.744 | 0.683 | 0.936 | 0.028 | n/a | 0.107 | 4.895 | n/a | n/a | 0.032 | 4.020 | 0.353 | 0.032 |
| p99 | 44.042 | 2.159 | 0.047 | 3.948 | 8.456 | 0.134 | 0.000 | 13.103 | 9.947 | 4.744 | 2.461 | n/a | 2.705 | 32.982 | n/a | n/a | 0.097 | 18.542 | 0.687 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b000000000000189c | 59.942 | 3.098 | 0.004 | 0.000 | 1.643 | 0.514 | 0.617 | 0.027 | n/a | 0.071 | 53.940 | n/a | n/a | 0.028 | 4.745 | 0.079 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.328ms; driver.publication 0.808ms |
| e1bc8a4fe563432b000000000000164b | 55.288 | 11.705 | 0.014 | 0.000 | 0.874 | 25.612 | 3.003 | 0.098 | n/a | 0.115 | 13.833 | n/a | n/a | 0.033 | 12.594 | 0.228 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.458ms; driver.publication 1.397ms; driver.publication 1.377ms; driver.publication 1.352ms |
| e1bc8a4fe563432b0000000000000e9c | 53.058 | 2.986 | 0.008 | 0.000 | 1.257 | 3.100 | 1.424 | 0.038 | n/a | 0.070 | 44.153 | n/a | n/a | 0.023 | 4.250 | 0.080 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.608ms; driver.publication 1.341ms; driver.publication 1.019ms |
| e1bc8a4fe563432b0000000000000a44 | 48.976 | 2.398 | 0.004 | 0.000 | 0.607 | 1.568 | 2.285 | 0.033 | n/a | 0.148 | 41.896 | n/a | n/a | 0.037 | 3.010 | 0.061 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.912ms; driver.publication 1.099ms; driver.expected-state.bind-receipt 1.056ms |
| e1bc8a4fe563432b0000000000001c2b | 48.947 | 2.645 | 0.003 | 0.000 | 11.472 | 0.436 | 0.769 | 0.023 | n/a | 0.189 | 33.376 | n/a | n/a | 0.035 | 14.120 | 0.288 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.publication 1.324ms; driver.publication 1.059ms |
| e1bc8a4fe563432b00000000000014e5 | 48.227 | 2.104 | 0.002 | 0.000 | 0.707 | 2.415 | 0.851 | 0.603 | n/a | 0.029 | 41.491 | n/a | n/a | 0.024 | 2.813 | 0.058 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b00000000000014e4 | 47.611 | 2.900 | 0.005 | 0.000 | 0.183 | 2.101 | 2.072 | 0.021 | n/a | 0.145 | 40.058 | n/a | n/a | 0.128 | 3.088 | 0.065 | 0.128 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000001384 | 47.390 | 4.188 | 0.008 | 0.000 | 1.121 | 0.897 | 1.689 | 0.038 | n/a | 0.335 | 39.051 | n/a | n/a | 0.063 | 5.317 | 0.112 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.808ms |
| e1bc8a4fe563432b0000000000001a5f | 47.246 | 2.803 | 0.004 | 0.000 | 1.576 | 1.576 | 0.684 | 0.030 | n/a | 0.127 | 40.358 | n/a | n/a | 0.087 | 4.383 | 0.093 | 0.087 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 0.702ms |
| e1bc8a4fe563432b00000000000011b6 | 46.943 | 1.984 | 0.003 | 0.000 | 37.650 | 4.175 | 0.485 | 0.021 | n/a | 0.209 | 2.395 | n/a | n/a | 0.021 | 39.637 | 0.844 | 0.021 | node-14/thread-0/driver.queue.subject | driver.publication 1.265ms; driver.publication 1.182ms; driver.publication 1.180ms; driver.publication 1.061ms; driver.publication 1.040ms |
| e1bc8a4fe563432b0000000000000b91 | 45.802 | 5.255 | 0.004 | 0.000 | 1.032 | 0.738 | 0.904 | 0.029 | n/a | 0.113 | 37.665 | n/a | n/a | 0.063 | 6.291 | 0.137 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| e1bc8a4fe563432b0000000000000d2a | 45.285 | 2.964 | 0.076 | 0.000 | 1.199 | 1.990 | 1.446 | 1.744 | n/a | 0.176 | 35.664 | n/a | n/a | 0.026 | 4.240 | 0.094 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.568ms; driver.publication 1.215ms |
| e1bc8a4fe563432b00000000000013b4 | 44.907 | 4.380 | 0.005 | 0.000 | 0.856 | 0.768 | 30.295 | 0.026 | n/a | 0.086 | 8.456 | n/a | n/a | 0.036 | 5.241 | 0.117 | 0.036 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| e1bc8a4fe563432b0000000000001c2f | 44.230 | 2.872 | 0.002 | 0.000 | 2.171 | 0.273 | 0.587 | 0.012 | n/a | 0.394 | 37.897 | n/a | n/a | 0.022 | 5.044 | 0.114 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.957ms; driver.publication 1.173ms; driver.publication 0.537ms |
| e1bc8a4fe563432b0000000000000d29 | 44.056 | 3.031 | 0.005 | 0.000 | 1.427 | 2.652 | 1.346 | 0.034 | n/a | 0.361 | 35.174 | n/a | n/a | 0.026 | 4.463 | 0.101 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.568ms |
| e1bc8a4fe563432b0000000000001a60 | 44.042 | 4.087 | 0.004 | 0.000 | 0.890 | 0.539 | 0.931 | 0.038 | n/a | 0.333 | 37.176 | n/a | n/a | 0.044 | 4.981 | 0.113 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.396ms |
| e1bc8a4fe563432b00000000000009b2 | 43.784 | 4.351 | 0.005 | 0.000 | 1.641 | 0.552 | 1.040 | 0.024 | n/a | 0.465 | 35.648 | n/a | n/a | 0.058 | 5.996 | 0.137 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 4.559ms; driver.publication 1.447ms; driver.publication 1.291ms; driver.publication 1.170ms; driver.publication 1.149ms |
| e1bc8a4fe563432b0000000000000fd4 | 42.763 | 2.420 | 0.003 | 0.000 | 1.493 | 0.303 | 0.625 | 0.017 | n/a | 0.056 | 37.825 | n/a | n/a | 0.020 | 3.916 | 0.092 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.040ms; driver.publication 1.083ms |
| e1bc8a4fe563432b00000000000011b4 | 40.965 | 7.980 | 0.007 | 1.832 | 0.313 | 8.638 | 3.640 | 0.090 | n/a | 1.015 | 17.422 | n/a | n/a | 0.027 | 10.132 | 0.247 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.265ms; driver.publication 1.182ms; driver.publication 1.061ms |
| e1bc8a4fe563432b000000000000143c | 40.038 | 11.291 | 0.010 | 0.000 | 4.844 | 2.437 | 1.637 | 0.028 | n/a | 0.188 | 19.540 | n/a | n/a | 0.063 | 16.144 | 0.403 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 10.108ms; client.parse 1.271ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.529 | 0.000 | 0.000 | 0.258 | 3.837 | 0.937 | 0.000 | 0.031 | 3.726 | 19.551 | 0.022 | n/a | 0.438 | 11.958 | n/a | n/a | 0.028 | 4.806 | 0.119 | 0.028 |
| p99 | 40.529 | 0.000 | 0.000 | 0.258 | 3.837 | 0.937 | 0.000 | 0.031 | 3.726 | 19.551 | 0.022 | n/a | 0.438 | 11.958 | n/a | n/a | 0.028 | 4.806 | 0.119 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e1bc8a4fe563432b0000000000000999 | 40.529 | 3.837 | 0.937 | 0.000 | 0.031 | 3.726 | 19.551 | 0.022 | n/a | 0.438 | 11.958 | n/a | n/a | 0.028 | 4.806 | 0.119 | 0.028 | gw-w/thread-42/gateway.admitted-work | driver.publication 1.455ms; driver.publication 1.261ms |

## P3 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.742 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.668 | 200.903 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 |
| p99 | 474.752 | n/a | n/a | n/a | 23.225 | n/a | 1.352 | 0.000 | 10.861 | 462.938 | 0.177 | n/a | 0.201 | 0.000 | n/a | n/a | 47.136 | 23.225 | 0.286 | 47.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a0000000000000002 | 474.752 | 2.793 | n/a | 0.000 | 0.000 | 8.373 | 462.938 | 0.177 | n/a | 0.117 | 0.000 | n/a | n/a | 0.353 | 2.793 | 0.006 | 0.353 | gw-r/thread-43/gateway.admitted-work | none observed |
| 952592642aec87bb0000000000000007 | 204.501 | 0.000 | n/a | 0.000 | 0.000 | 2.510 | 201.383 | 0.013 | n/a | 0.175 | 0.000 | n/a | n/a | 0.420 | 0.000 | 0.000 | 0.420 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000006 | 203.233 | 0.000 | n/a | 0.000 | 0.000 | 1.209 | 201.487 | 0.016 | n/a | 0.201 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000005 | 203.160 | 0.000 | n/a | 0.000 | 0.000 | 1.668 | 201.091 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000f17 | 202.059 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 201.142 | 0.017 | n/a | 0.088 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000f18 | 201.819 | 0.000 | n/a | 0.000 | 0.000 | 0.624 | 201.001 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000f19 | 201.742 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 200.903 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000f1a | 201.203 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 200.605 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000f1e | 81.222 | 23.225 | n/a | 0.000 | 0.000 | 10.861 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.136 | 23.225 | 0.286 | 47.136 | node-14/thread-4/socket.wait-first-byte | none observed |
| 952592642aec87bb0000000000000f1d | 79.278 | 18.495 | n/a | 0.000 | 0.000 | 3.194 | 57.401 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.180 | 18.495 | 0.233 | 0.180 | gw-r/thread-43/gateway.admitted-work | none observed |
| 952592642aec87bb0000000000000f1f | 71.260 | 13.788 | n/a | 1.352 | 0.000 | 2.186 | 53.718 | 0.014 | n/a | 0.022 | 0.000 | n/a | n/a | 0.179 | 15.140 | 0.212 | 0.179 | gw-r/thread-47/gateway.admitted-work | none observed |
| 952592642aec87bb0000000000000f20 | 56.059 | 12.283 | n/a | 0.000 | 0.000 | 10.662 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.114 | 12.283 | 0.219 | 33.114 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 839.317 | n/a | n/a | n/a | 3.915 | n/a | 0.000 | 0.000 | 2.862 | 822.064 | 0.019 | n/a | 0.098 | 0.000 | n/a | n/a | 1.317 | 3.915 | 0.017 | 1.317 |
| p99 | 1006.552 | n/a | n/a | n/a | 13.987 | n/a | 0.000 | 0.000 | 2.972 | 1001.368 | 0.024 | n/a | 0.431 | 0.000 | n/a | n/a | 11.072 | 13.987 | 0.258 | 11.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a00000000000000a4 | 1006.552 | 0.440 | n/a | 0.000 | 0.000 | 2.972 | 1001.368 | 0.024 | n/a | 0.431 | 0.000 | n/a | n/a | 1.317 | 0.440 | 0.000 | 1.317 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000a5 | 839.317 | 13.987 | n/a | 0.000 | 0.000 | 2.862 | 822.064 | 0.019 | n/a | 0.098 | 0.000 | n/a | n/a | 0.287 | 13.987 | 0.017 | 0.287 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000847 | 15.203 | 3.915 | n/a | 0.000 | 0.000 | 0.215 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.072 | 3.915 | 0.258 | 11.072 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.597 | n/a | n/a | n/a | 3.213 | n/a | 0.000 | 0.000 | 0.688 | 433.169 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.125 | 3.213 | 0.007 | 0.125 |
| p99 | 1010.023 | n/a | n/a | n/a | 9.220 | n/a | 0.959 | 0.000 | 3.580 | 1002.268 | 0.048 | n/a | 0.172 | 0.000 | n/a | n/a | 44.365 | 10.179 | 0.103 | 44.365 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a00000000000000b4 | 1010.023 | 6.770 | n/a | 0.000 | 0.000 | 0.724 | 1002.268 | 0.018 | n/a | 0.093 | 0.000 | n/a | n/a | 0.150 | 6.770 | 0.007 | 0.150 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000cf | 1006.021 | 9.220 | n/a | 0.959 | 0.000 | 1.282 | 994.323 | 0.048 | n/a | 0.062 | 0.000 | n/a | n/a | 0.127 | 10.179 | 0.010 | 0.127 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000ba | 991.448 | 3.123 | n/a | 0.000 | 0.000 | 0.928 | 987.162 | 0.009 | n/a | 0.126 | 0.000 | n/a | n/a | 0.101 | 3.123 | 0.003 | 0.101 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000bb | 953.991 | 2.443 | n/a | 0.000 | 0.000 | 3.580 | 947.759 | 0.009 | n/a | 0.103 | 0.000 | n/a | n/a | 0.097 | 2.443 | 0.003 | 0.097 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000b3 | 866.567 | 3.111 | n/a | 0.000 | 0.000 | 0.394 | 862.828 | 0.025 | n/a | 0.118 | 0.000 | n/a | n/a | 0.092 | 3.111 | 0.004 | 0.092 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000c9 | 825.876 | 4.949 | n/a | 0.000 | 0.000 | 1.945 | 818.718 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.185 | 4.949 | 0.006 | 0.185 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000ae | 822.875 | 3.957 | n/a | 0.000 | 0.000 | 2.473 | 816.204 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.140 | 3.957 | 0.005 | 0.140 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000bf | 807.016 | 4.911 | n/a | 0.000 | 0.000 | 2.125 | 799.704 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.186 | 4.911 | 0.006 | 0.186 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000c5 | 783.758 | 2.261 | n/a | 0.000 | 0.000 | 0.396 | 780.939 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.067 | 2.261 | 0.003 | 0.067 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000ab | 620.989 | 2.762 | n/a | 0.000 | 0.000 | 0.457 | 617.553 | 0.015 | n/a | 0.090 | 0.000 | n/a | n/a | 0.111 | 2.762 | 0.004 | 0.111 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000a7 | 597.043 | 3.213 | n/a | 0.000 | 0.000 | 0.661 | 592.775 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.258 | 3.213 | 0.005 | 0.258 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000c1 | 581.383 | 6.062 | n/a | 0.000 | 0.000 | 0.598 | 574.518 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.125 | 6.062 | 0.010 | 0.125 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000a8 | 577.233 | 3.851 | n/a | 0.000 | 0.000 | 1.838 | 571.244 | 0.031 | n/a | 0.117 | 0.000 | n/a | n/a | 0.152 | 3.851 | 0.007 | 0.152 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000b9 | 534.054 | 4.167 | n/a | 0.000 | 0.000 | 1.339 | 528.362 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.107 | 4.167 | 0.008 | 0.107 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000ca | 436.597 | 2.346 | n/a | 0.000 | 0.000 | 0.917 | 433.169 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.076 | 2.346 | 0.005 | 0.076 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000b7 | 414.799 | 2.765 | n/a | 0.000 | 0.000 | 0.809 | 411.038 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.099 | 2.765 | 0.007 | 0.099 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000c3 | 404.617 | 3.027 | n/a | 0.000 | 0.000 | 0.663 | 400.750 | 0.022 | n/a | 0.078 | 0.000 | n/a | n/a | 0.077 | 3.027 | 0.007 | 0.077 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000a9 | 403.709 | 4.851 | n/a | 0.000 | 0.000 | 1.677 | 396.775 | 0.016 | n/a | 0.172 | 0.000 | n/a | n/a | 0.218 | 4.851 | 0.012 | 0.218 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000ac | 347.357 | 2.746 | n/a | 0.000 | 0.000 | 0.605 | 343.719 | 0.040 | n/a | 0.155 | 0.000 | n/a | n/a | 0.092 | 2.746 | 0.008 | 0.092 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000cd | 281.672 | 6.012 | n/a | 0.000 | 0.000 | 0.820 | 274.510 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.242 | 6.012 | 0.021 | 0.242 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 385.451 | n/a | n/a | n/a | 4.424 | n/a | 0.550 | 0.000 | 0.712 | 376.469 | 0.013 | n/a | 0.075 | 0.000 | n/a | n/a | 0.112 | 5.016 | 0.012 | 0.112 |
| p99 | 1006.916 | n/a | n/a | n/a | 23.245 | n/a | 3.202 | 0.000 | 4.899 | 1001.406 | 0.059 | n/a | 0.143 | 0.000 | n/a | n/a | 46.054 | 25.605 | 0.516 | 46.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a00000000000000d0 | 1006.916 | 0.298 | n/a | 0.000 | 0.000 | 3.892 | 1001.406 | 0.025 | n/a | 0.143 | 0.000 | n/a | n/a | 1.151 | 0.298 | 0.000 | 1.151 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000100 | 1002.705 | 0.130 | n/a | 0.000 | 0.000 | 0.633 | 1000.742 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 1.110 | 0.130 | 0.000 | 1.110 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000e4 | 1000.247 | 6.975 | n/a | 0.647 | 0.000 | 2.451 | 989.890 | 0.019 | n/a | 0.075 | 0.000 | n/a | n/a | 0.191 | 7.622 | 0.008 | 0.191 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000d9 | 994.743 | 3.980 | n/a | 0.494 | 0.000 | 0.419 | 989.698 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.080 | 4.474 | 0.004 | 0.080 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a000000000000010d | 988.811 | 2.969 | n/a | 0.000 | 0.000 | 0.570 | 985.105 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.076 | 2.969 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000de | 988.513 | 4.863 | n/a | 0.904 | 0.000 | 0.488 | 982.086 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.096 | 5.767 | 0.006 | 0.096 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000d8 | 987.879 | 4.030 | n/a | 0.884 | 0.000 | 0.941 | 981.816 | 0.025 | n/a | 0.087 | 0.000 | n/a | n/a | 0.096 | 4.914 | 0.005 | 0.096 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000105 | 979.174 | 2.873 | n/a | 0.000 | 0.000 | 0.702 | 975.427 | 0.052 | n/a | 0.057 | 0.000 | n/a | n/a | 0.062 | 2.873 | 0.003 | 0.062 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000d2 | 945.360 | 5.368 | n/a | 1.334 | 0.000 | 0.493 | 937.922 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.163 | 6.702 | 0.007 | 0.163 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000dd | 871.294 | 5.016 | n/a | 0.644 | 0.000 | 0.475 | 864.945 | 0.017 | n/a | 0.115 | 0.000 | n/a | n/a | 0.082 | 5.659 | 0.006 | 0.082 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000db | 855.016 | 4.404 | n/a | 0.715 | 0.000 | 0.695 | 849.010 | 0.017 | n/a | 0.086 | 0.000 | n/a | n/a | 0.090 | 5.119 | 0.006 | 0.090 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000fd | 779.323 | 4.746 | n/a | 0.000 | 0.000 | 0.729 | 773.697 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.102 | 4.746 | 0.006 | 0.102 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000e7 | 616.051 | 23.245 | n/a | 2.360 | 0.000 | 0.891 | 589.191 | 0.034 | n/a | 0.097 | 0.000 | n/a | n/a | 0.232 | 25.605 | 0.042 | 0.232 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000fb | 608.541 | 6.047 | n/a | 0.000 | 0.000 | 1.158 | 601.082 | 0.020 | n/a | 0.049 | 0.000 | n/a | n/a | 0.186 | 6.047 | 0.010 | 0.186 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000df | 595.535 | 5.759 | n/a | 0.463 | 0.000 | 1.860 | 587.285 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 0.102 | 6.221 | 0.010 | 0.102 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000102 | 567.506 | 2.933 | n/a | 0.000 | 0.000 | 0.811 | 563.584 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.079 | 2.933 | 0.005 | 0.079 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000107 | 470.789 | 10.798 | n/a | 3.202 | 0.000 | 2.402 | 454.143 | 0.016 | n/a | 0.086 | 0.000 | n/a | n/a | 0.142 | 14.000 | 0.030 | 0.142 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000ea | 464.990 | 4.477 | n/a | 0.839 | 0.000 | 0.658 | 458.834 | 0.016 | n/a | 0.079 | 0.000 | n/a | n/a | 0.087 | 5.316 | 0.011 | 0.087 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000000d4 | 449.542 | 4.676 | n/a | 0.868 | 0.000 | 1.381 | 442.341 | 0.014 | n/a | 0.132 | 0.000 | n/a | n/a | 0.130 | 5.544 | 0.012 | 0.130 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000104 | 431.179 | 3.082 | n/a | 0.551 | 0.000 | 0.614 | 426.648 | 0.044 | n/a | 0.138 | 0.000 | n/a | n/a | 0.103 | 3.633 | 0.008 | 0.103 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 480.176 | n/a | n/a | n/a | 3.301 | n/a | 0.000 | 0.000 | 0.828 | 476.115 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.099 | 3.812 | 0.007 | 0.099 |
| p99 | 1003.345 | n/a | n/a | n/a | 11.392 | n/a | 1.739 | 0.000 | 6.655 | 1001.078 | 0.152 | n/a | 0.093 | 0.000 | n/a | n/a | 14.400 | 13.131 | 0.478 | 14.400 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a0000000000000114 | 1003.345 | 0.182 | n/a | 0.000 | 0.000 | 0.828 | 1001.078 | 0.019 | n/a | 0.077 | 0.000 | n/a | n/a | 1.160 | 0.182 | 0.000 | 1.160 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000126 | 994.799 | 3.067 | n/a | 0.000 | 0.000 | 0.706 | 990.904 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.070 | 3.067 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a000000000000011d | 993.581 | 3.067 | n/a | 0.000 | 0.000 | 3.768 | 986.612 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.069 | 3.067 | 0.003 | 0.069 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000140 | 993.328 | 3.905 | n/a | 0.000 | 0.000 | 1.129 | 988.157 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.075 | 3.905 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a000000000000012b | 992.167 | 2.813 | n/a | 0.000 | 0.000 | 0.572 | 988.640 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.080 | 2.813 | 0.003 | 0.080 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a000000000000012a | 961.564 | 5.183 | n/a | 0.000 | 0.000 | 0.769 | 955.470 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.081 | 5.183 | 0.005 | 0.081 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000148 | 945.145 | 5.054 | n/a | 0.000 | 0.000 | 0.765 | 939.105 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.173 | 5.054 | 0.005 | 0.173 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000137 | 924.427 | 2.537 | n/a | 0.000 | 0.000 | 2.344 | 919.423 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.062 | 2.537 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000133 | 897.281 | 2.718 | n/a | 0.000 | 0.000 | 1.275 | 893.142 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.070 | 2.718 | 0.003 | 0.070 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000124 | 884.075 | 2.825 | n/a | 0.000 | 0.000 | 0.632 | 880.478 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.067 | 2.825 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a000000000000012d | 858.716 | 3.112 | n/a | 0.699 | 0.000 | 1.340 | 853.442 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.079 | 3.812 | 0.004 | 0.079 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a000000000000013c | 767.345 | 1.622 | n/a | 0.000 | 0.000 | 0.721 | 764.873 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.066 | 1.622 | 0.002 | 0.066 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a000000000000013a | 629.883 | 2.894 | n/a | 0.000 | 0.000 | 0.828 | 626.033 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.076 | 2.894 | 0.005 | 0.076 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000111 | 614.011 | 2.339 | n/a | 0.000 | 0.000 | 1.733 | 609.820 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.060 | 2.339 | 0.004 | 0.060 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000135 | 605.523 | 4.048 | n/a | 0.000 | 0.000 | 1.877 | 599.426 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.093 | 4.048 | 0.007 | 0.093 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a000000000000011b | 588.622 | 2.858 | n/a | 0.537 | 0.000 | 5.359 | 579.686 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.099 | 3.396 | 0.006 | 0.099 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000127 | 549.063 | 7.543 | n/a | 0.000 | 0.000 | 0.941 | 540.367 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.117 | 7.543 | 0.014 | 0.117 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a000000000000010f | 536.310 | 3.287 | n/a | 0.593 | 0.000 | 1.063 | 531.205 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.094 | 3.880 | 0.007 | 0.094 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a000000000000011e | 535.361 | 3.302 | n/a | 0.000 | 0.000 | 0.705 | 531.190 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.100 | 3.302 | 0.006 | 0.100 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000129 | 489.608 | 4.254 | n/a | 0.904 | 0.000 | 0.710 | 483.528 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.127 | 5.158 | 0.011 | 0.127 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 323.802 | n/a | n/a | n/a | 2.711 | n/a | 0.000 | 0.000 | 0.622 | 316.926 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.094 | 2.731 | 0.009 | 0.094 |
| p99 | 1004.720 | n/a | n/a | n/a | 6.763 | n/a | 0.615 | 0.000 | 10.031 | 1001.713 | 1.752 | n/a | 2.551 | 0.000 | n/a | n/a | 48.552 | 6.763 | 0.579 | 48.552 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a000000000000017d | 1004.720 | 0.168 | n/a | 0.000 | 0.000 | 0.544 | 1000.300 | 0.013 | n/a | 2.551 | 0.000 | n/a | n/a | 1.145 | 0.168 | 0.000 | 1.145 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000162 | 1003.683 | 0.122 | n/a | 0.000 | 0.000 | 0.590 | 1001.713 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 1.167 | 0.122 | 0.000 | 1.167 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000172 | 1002.958 | 5.578 | n/a | 0.000 | 0.000 | 2.117 | 995.134 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.078 | 5.578 | 0.006 | 0.078 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000185 | 1002.941 | 0.211 | n/a | 0.000 | 0.000 | 0.510 | 1000.975 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 1.159 | 0.211 | 0.000 | 1.159 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000178 | 1002.454 | 0.111 | n/a | 0.000 | 0.000 | 0.466 | 1000.713 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 1.105 | 0.111 | 0.000 | 1.105 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a000000000000016c | 999.277 | 2.393 | n/a | 0.000 | 0.000 | 0.443 | 996.323 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.393 | 0.002 | 0.070 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000153 | 998.789 | 3.010 | n/a | 0.000 | 0.000 | 2.771 | 992.819 | 0.023 | n/a | 0.084 | 0.000 | n/a | n/a | 0.082 | 3.010 | 0.003 | 0.082 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000184 | 987.149 | 2.731 | n/a | 0.000 | 0.000 | 10.031 | 974.267 | 0.010 | n/a | 0.026 | 0.000 | n/a | n/a | 0.085 | 2.731 | 0.003 | 0.085 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000182 | 853.452 | 2.884 | n/a | 0.000 | 0.000 | 1.074 | 849.320 | 0.012 | n/a | 0.047 | 0.000 | n/a | n/a | 0.115 | 2.884 | 0.003 | 0.115 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a000000000000016b | 843.839 | 2.469 | n/a | 0.000 | 0.000 | 0.771 | 840.455 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.072 | 2.469 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000188 | 825.052 | 2.629 | n/a | 0.615 | 0.000 | 0.622 | 821.004 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.131 | 3.244 | 0.004 | 0.131 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000159 | 799.801 | 2.738 | n/a | 0.000 | 0.000 | 0.543 | 796.392 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.070 | 2.738 | 0.003 | 0.070 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a000000000000017c | 792.096 | 2.711 | n/a | 0.000 | 0.000 | 0.763 | 788.466 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.111 | 2.711 | 0.003 | 0.111 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000175 | 774.884 | 2.095 | n/a | 0.000 | 0.000 | 1.534 | 771.132 | 0.003 | n/a | 0.050 | 0.000 | n/a | n/a | 0.070 | 2.095 | 0.003 | 0.070 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a000000000000016e | 633.959 | 3.940 | n/a | 0.000 | 0.000 | 0.546 | 629.267 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 0.151 | 3.940 | 0.006 | 0.151 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000152 | 600.496 | 2.460 | n/a | 0.000 | 0.000 | 0.474 | 597.449 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.073 | 2.460 | 0.004 | 0.073 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000154 | 527.049 | 4.101 | n/a | 0.000 | 0.000 | 1.269 | 521.509 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.083 | 4.101 | 0.008 | 0.083 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a000000000000014c | 522.330 | 4.743 | n/a | 0.000 | 0.000 | 0.758 | 516.687 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 4.743 | 0.009 | 0.094 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000165 | 520.691 | 2.533 | n/a | 0.000 | 0.000 | 0.550 | 517.439 | 0.026 | n/a | 0.069 | 0.000 | n/a | n/a | 0.074 | 2.533 | 0.005 | 0.074 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000160 | 495.303 | 2.599 | n/a | 0.000 | 0.000 | 0.531 | 492.041 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.073 | 2.599 | 0.005 | 0.073 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 352.083 | n/a | n/a | n/a | 4.073 | n/a | 0.000 | 0.000 | 0.623 | 345.258 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.152 | 4.073 | 0.015 | 0.152 |
| p99 | 1004.381 | n/a | n/a | n/a | 12.163 | n/a | 0.742 | 0.000 | 19.328 | 1002.487 | 0.954 | n/a | 0.102 | 0.000 | n/a | n/a | 46.801 | 12.163 | 0.778 | 46.801 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a00000000000001a7 | 1004.381 | 0.101 | n/a | 0.000 | 0.000 | 0.603 | 1002.487 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 1.111 | 0.101 | 0.000 | 1.111 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001a4 | 1002.543 | 0.157 | n/a | 0.000 | 0.000 | 0.515 | 1000.708 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 1.116 | 0.157 | 0.000 | 1.116 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001c4 | 999.408 | 5.254 | n/a | 0.000 | 0.000 | 0.735 | 993.272 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.105 | 5.254 | 0.005 | 0.105 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001c5 | 994.751 | 4.354 | n/a | 0.000 | 0.000 | 2.283 | 987.958 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.116 | 4.354 | 0.004 | 0.116 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001a6 | 979.334 | 2.987 | n/a | 0.000 | 0.000 | 0.573 | 975.613 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.082 | 2.987 | 0.003 | 0.082 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001c3 | 977.949 | 3.302 | n/a | 0.000 | 0.000 | 0.428 | 974.095 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.077 | 3.302 | 0.003 | 0.077 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a000000000000018a | 976.559 | 4.240 | n/a | 0.000 | 0.000 | 3.237 | 968.903 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.127 | 4.240 | 0.004 | 0.127 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001b7 | 895.171 | 2.437 | n/a | 0.000 | 0.000 | 0.517 | 892.090 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.068 | 2.437 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000199 | 780.204 | 1.970 | n/a | 0.000 | 0.000 | 3.359 | 774.736 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.093 | 1.970 | 0.003 | 0.093 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000197 | 735.590 | 2.637 | n/a | 0.000 | 0.000 | 0.674 | 732.116 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.103 | 2.637 | 0.004 | 0.103 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001ce | 729.460 | 3.513 | n/a | 0.000 | 0.000 | 0.658 | 725.127 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.071 | 3.513 | 0.005 | 0.071 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a000000000000019c | 657.807 | 4.374 | n/a | 0.000 | 0.000 | 0.538 | 652.718 | 0.024 | n/a | 0.069 | 0.000 | n/a | n/a | 0.085 | 4.374 | 0.007 | 0.085 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001ba | 593.824 | 4.676 | n/a | 0.000 | 0.000 | 0.557 | 588.349 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.193 | 4.676 | 0.008 | 0.193 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001d5 | 532.455 | 1.677 | n/a | 0.000 | 0.000 | 0.477 | 530.168 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.075 | 1.677 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001ae | 518.972 | 2.871 | n/a | 0.000 | 0.000 | 1.025 | 514.944 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.093 | 2.871 | 0.006 | 0.093 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001d3 | 508.970 | 3.709 | n/a | 0.000 | 0.000 | 0.733 | 504.198 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.231 | 3.709 | 0.007 | 0.231 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001d2 | 503.439 | 5.220 | n/a | 0.000 | 0.000 | 0.754 | 497.180 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.243 | 5.220 | 0.010 | 0.243 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001a0 | 438.263 | 2.293 | n/a | 0.000 | 0.000 | 1.099 | 434.712 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.080 | 2.293 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000193 | 432.582 | 5.082 | n/a | 0.000 | 0.000 | 0.733 | 426.524 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.181 | 5.082 | 0.012 | 0.181 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a000000000000019f | 416.736 | 4.347 | n/a | 0.000 | 0.000 | 0.466 | 411.719 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.152 | 4.347 | 0.010 | 0.152 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 452.738 | n/a | n/a | n/a | 3.292 | n/a | 0.000 | 0.000 | 0.602 | 445.849 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.115 | 3.292 | 0.010 | 0.115 |
| p99 | 1002.898 | n/a | n/a | n/a | 8.706 | n/a | 0.757 | 0.000 | 4.291 | 1000.937 | 0.091 | n/a | 1.280 | 0.000 | n/a | n/a | 37.218 | 8.706 | 0.405 | 37.218 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a00000000000001fe | 1002.898 | 0.132 | n/a | 0.000 | 0.000 | 0.625 | 1000.937 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 1.117 | 0.132 | 0.000 | 1.117 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000217 | 1002.662 | 0.109 | n/a | 0.000 | 0.000 | 0.503 | 1000.883 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 1.103 | 0.109 | 0.000 | 1.103 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001ea | 1000.688 | 4.230 | n/a | 0.000 | 0.000 | 0.762 | 995.564 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.086 | 4.230 | 0.004 | 0.086 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000212 | 995.545 | 2.335 | n/a | 0.000 | 0.000 | 0.532 | 992.535 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.103 | 2.335 | 0.002 | 0.103 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001f8 | 991.580 | 3.032 | n/a | 0.000 | 0.000 | 0.828 | 987.575 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.100 | 3.032 | 0.003 | 0.100 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000216 | 990.034 | 2.503 | n/a | 0.000 | 0.000 | 0.446 | 986.967 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.071 | 2.503 | 0.003 | 0.071 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000219 | 988.280 | 5.552 | n/a | 0.000 | 0.000 | 0.364 | 982.058 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.269 | 5.552 | 0.006 | 0.269 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000208 | 923.720 | 2.213 | n/a | 0.000 | 0.000 | 0.528 | 920.860 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.095 | 2.213 | 0.002 | 0.095 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001e8 | 880.743 | 4.799 | n/a | 0.000 | 0.000 | 0.834 | 874.824 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.234 | 4.799 | 0.005 | 0.234 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001f4 | 871.378 | 8.706 | n/a | 0.000 | 0.000 | 1.100 | 861.329 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.155 | 8.706 | 0.010 | 0.155 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000213 | 800.359 | 6.340 | n/a | 0.000 | 0.000 | 0.510 | 793.355 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.115 | 6.340 | 0.008 | 0.115 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000210 | 719.412 | 2.729 | n/a | 0.000 | 0.000 | 0.787 | 715.786 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.065 | 2.729 | 0.004 | 0.065 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001ef | 694.610 | 4.512 | n/a | 0.000 | 0.000 | 0.602 | 689.274 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.169 | 4.512 | 0.006 | 0.169 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001dc | 592.798 | 3.314 | n/a | 0.000 | 0.000 | 0.678 | 588.674 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.093 | 3.314 | 0.006 | 0.093 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000200 | 570.926 | 2.219 | n/a | 0.000 | 0.000 | 0.915 | 567.630 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.107 | 2.219 | 0.004 | 0.107 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001e3 | 537.468 | 5.418 | n/a | 0.000 | 0.000 | 0.469 | 531.342 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.177 | 5.418 | 0.010 | 0.177 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001dd | 516.613 | 5.917 | n/a | 0.000 | 0.000 | 0.758 | 509.712 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.161 | 5.917 | 0.011 | 0.161 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001f1 | 511.246 | 2.598 | n/a | 0.000 | 0.000 | 0.531 | 508.007 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.066 | 2.598 | 0.005 | 0.066 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000001f0 | 492.915 | 2.030 | n/a | 0.000 | 0.000 | 0.646 | 490.106 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.081 | 2.030 | 0.004 | 0.081 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000203 | 488.366 | 4.018 | n/a | 0.000 | 0.000 | 0.764 | 483.464 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.073 | 4.018 | 0.008 | 0.073 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (758 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.020 | n/a | n/a | n/a | 3.198 | n/a | 0.000 | 0.000 | 0.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.713 | 3.198 | 0.273 | 7.713 |
| p99 | 264.665 | n/a | n/a | n/a | 18.420 | n/a | 1.350 | 0.000 | 0.837 | 261.100 | 0.014 | n/a | 0.042 | 0.000 | n/a | n/a | 47.597 | 18.781 | 0.786 | 47.597 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a0000000000000225 | 977.479 | 3.029 | n/a | 0.000 | 0.000 | 0.398 | 973.847 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.157 | 3.029 | 0.003 | 0.157 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a000000000000021a | 647.914 | 2.595 | n/a | 0.000 | 0.000 | 0.791 | 644.440 | 0.003 | n/a | 0.015 | 0.000 | n/a | n/a | 0.070 | 2.595 | 0.004 | 0.070 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000226 | 633.806 | 4.101 | n/a | 0.000 | 0.000 | 0.837 | 628.728 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.092 | 4.101 | 0.006 | 0.092 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000222 | 531.094 | 2.153 | n/a | 0.000 | 0.000 | 0.496 | 528.289 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 0.089 | 2.153 | 0.004 | 0.089 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000223 | 478.618 | 2.280 | n/a | 0.000 | 0.000 | 0.648 | 474.459 | 1.112 | n/a | 0.042 | 0.000 | n/a | n/a | 0.075 | 2.280 | 0.005 | 0.075 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a000000000000021d | 454.498 | 2.753 | n/a | 0.000 | 0.000 | 0.880 | 450.736 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.087 | 2.753 | 0.006 | 0.087 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a000000000000021b | 393.187 | 2.515 | n/a | 0.000 | 0.000 | 0.449 | 390.045 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.113 | 2.515 | 0.006 | 0.113 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000220 | 264.665 | 2.798 | n/a | 0.000 | 0.000 | 0.609 | 261.100 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.115 | 2.798 | 0.011 | 0.115 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a000000000000021e | 248.946 | 5.041 | n/a | 0.000 | 0.000 | 1.027 | 242.718 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.114 | 5.041 | 0.020 | 0.114 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a000000000000033c | 114.555 | 28.248 | n/a | 2.394 | 0.000 | 1.800 | 47.494 | 33.850 | n/a | 0.042 | 0.000 | n/a | n/a | 0.727 | 30.642 | 0.267 | 0.727 | gw-r/thread-46/gateway.admission-wait | none observed |
| ef9cb10a731d3a6a0000000000000310 | 110.697 | 2.754 | n/a | 0.000 | 0.000 | 0.308 | 107.366 | 0.166 | n/a | 0.010 | 0.000 | n/a | n/a | 0.093 | 2.754 | 0.025 | 0.093 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a00000000000004de | 109.872 | 6.469 | n/a | 0.809 | 0.000 | 0.535 | 101.900 | 0.002 | n/a | 0.016 | 0.000 | n/a | n/a | 0.140 | 7.278 | 0.066 | 0.140 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a00000000000003e0 | 92.460 | 12.570 | n/a | 0.000 | 0.000 | 0.746 | 78.942 | 0.003 | n/a | 0.045 | 0.000 | n/a | n/a | 0.155 | 12.570 | 0.136 | 0.155 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a000000000000062c | 88.370 | 4.355 | n/a | 0.000 | 0.000 | 0.476 | 83.455 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.070 | 4.355 | 0.049 | 0.070 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a000000000000074e | 88.105 | 3.223 | n/a | 0.000 | 0.000 | 0.361 | 84.424 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.071 | 3.223 | 0.037 | 0.071 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a0000000000000790 | 87.484 | 4.063 | n/a | 0.000 | 0.000 | 0.609 | 82.689 | 0.005 | n/a | 0.015 | 0.000 | n/a | n/a | 0.103 | 4.063 | 0.046 | 0.103 | gw-r/thread-63/journal/page | none observed |
| ef9cb10a731d3a6a00000000000002f4 | 80.088 | 6.875 | n/a | 0.835 | 0.000 | 0.581 | 71.617 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.142 | 7.709 | 0.096 | 0.142 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a000000000000065b | 79.836 | 5.207 | n/a | 0.000 | 0.000 | 0.563 | 73.867 | 0.116 | n/a | 0.013 | 0.000 | n/a | n/a | 0.070 | 5.207 | 0.065 | 0.070 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a00000000000004e6 | 78.080 | 2.387 | n/a | 0.000 | 0.000 | 0.521 | 75.036 | 0.002 | n/a | 0.012 | 0.000 | n/a | n/a | 0.121 | 2.387 | 0.031 | 0.121 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a000000000000048a | 76.626 | 5.409 | n/a | 0.000 | 0.000 | 0.774 | 70.225 | 0.130 | n/a | 0.016 | 0.000 | n/a | n/a | 0.071 | 5.409 | 0.071 | 0.071 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / internal (2284 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.269 | n/a | n/a | n/a | 4.144 | n/a | 0.000 | 0.000 | 0.240 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.075 | 4.156 | 0.341 | 6.075 |
| p99 | 356.188 | n/a | n/a | n/a | 17.583 | n/a | 1.472 | 0.000 | 1.620 | 341.340 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 47.310 | 18.512 | 0.854 | 47.310 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ef9cb10a731d3a6a0000000000001ab3 | 1012.657 | 21.248 | n/a | 2.063 | 0.000 | 1.157 | 987.576 | 0.014 | n/a | 0.044 | 0.000 | n/a | n/a | 0.556 | 23.311 | 0.023 | 0.556 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001a90 | 1004.611 | 3.909 | n/a | 0.000 | 0.000 | 0.267 | 1000.332 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.066 | 3.909 | 0.004 | 0.066 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001a99 | 1003.517 | 0.190 | n/a | 0.000 | 0.000 | 1.620 | 1000.532 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.126 | 0.190 | 0.000 | 1.126 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001adb | 1002.832 | 0.296 | n/a | 0.000 | 0.000 | 0.465 | 1000.800 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 1.201 | 0.296 | 0.000 | 1.201 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001a8e | 1002.394 | 0.180 | n/a | 0.000 | 0.000 | 0.443 | 1000.590 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 1.136 | 0.180 | 0.000 | 1.136 | gw-r/thread-63/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ad7 | 993.001 | 2.463 | n/a | 0.000 | 0.000 | 0.659 | 989.768 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.075 | 2.463 | 0.002 | 0.075 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ad3 | 990.608 | 4.154 | n/a | 0.000 | 0.000 | 0.379 | 985.900 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.144 | 4.154 | 0.004 | 0.144 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ab6 | 983.727 | 3.925 | n/a | 0.000 | 0.000 | 0.278 | 979.190 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.306 | 3.925 | 0.004 | 0.306 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001aa4 | 753.563 | 5.278 | n/a | 0.000 | 0.000 | 0.532 | 747.536 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.179 | 5.278 | 0.007 | 0.179 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001acd | 739.667 | 2.792 | n/a | 0.000 | 0.000 | 0.403 | 736.292 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.137 | 2.792 | 0.004 | 0.137 | gw-r/thread-41/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001a94 | 718.609 | 5.168 | n/a | 0.000 | 0.000 | 0.411 | 712.843 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.148 | 5.168 | 0.007 | 0.148 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001aaf | 707.438 | 3.318 | n/a | 0.000 | 0.000 | 0.438 | 703.361 | 0.010 | n/a | 0.035 | 0.000 | n/a | n/a | 0.275 | 3.318 | 0.005 | 0.275 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001aab | 690.587 | 6.396 | n/a | 0.000 | 0.000 | 1.594 | 682.385 | 0.010 | n/a | 0.023 | 0.000 | n/a | n/a | 0.179 | 6.396 | 0.009 | 0.179 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ac2 | 675.855 | 2.375 | n/a | 0.000 | 0.000 | 0.524 | 672.847 | 0.008 | n/a | 0.025 | 0.000 | n/a | n/a | 0.076 | 2.375 | 0.004 | 0.076 | gw-r/thread-47/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001a91 | 658.508 | 15.385 | n/a | 2.313 | 0.000 | 0.717 | 639.550 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.491 | 17.698 | 0.027 | 0.491 | gw-r/thread-43/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ad4 | 554.208 | 4.219 | n/a | 0.000 | 0.000 | 0.562 | 549.175 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.223 | 4.219 | 0.008 | 0.223 | gw-r/thread-48/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001acf | 454.753 | 2.755 | n/a | 0.000 | 0.000 | 0.470 | 451.364 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.144 | 2.755 | 0.006 | 0.144 | gw-r/thread-46/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ad5 | 451.431 | 2.937 | n/a | 0.000 | 0.000 | 0.529 | 447.871 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.073 | 2.937 | 0.007 | 0.073 | gw-r/thread-44/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001ac7 | 411.020 | 2.170 | n/a | 0.000 | 0.000 | 0.342 | 408.372 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.106 | 2.170 | 0.005 | 0.106 | gw-r/thread-45/journal/page | none observed |
| ef9cb10a731d3a6a0000000000001a9b | 380.272 | 3.812 | n/a | 0.000 | 0.000 | 1.459 | 374.759 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.195 | 3.812 | 0.010 | 0.195 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.389 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.014 | 0.015 | n/a | 0.129 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 209.218 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.634 | 207.501 | 4.956 | n/a | 0.625 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb000000000000001e | 209.218 | 0.000 | n/a | 0.000 | 0.000 | 1.382 | 207.501 | 0.013 | n/a | 0.188 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000012 | 206.376 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 204.866 | 0.012 | n/a | 0.625 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000010 | 206.169 | 0.000 | n/a | 0.000 | 0.000 | 4.084 | 201.660 | 0.035 | n/a | 0.255 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000045 | 206.144 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.214 | 3.870 | n/a | 0.142 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000039 | 205.997 | 0.000 | n/a | 0.000 | 0.000 | 4.634 | 201.035 | 0.026 | n/a | 0.082 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000031 | 205.942 | 0.000 | n/a | 0.000 | 0.000 | 1.652 | 203.936 | 0.011 | n/a | 0.179 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000015 | 205.275 | 0.000 | n/a | 0.000 | 0.000 | 3.195 | 201.735 | 0.012 | n/a | 0.171 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000049 | 205.136 | 0.000 | n/a | 0.000 | 0.000 | 1.115 | 201.347 | 2.397 | n/a | 0.136 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb000000000000002a | 205.103 | 0.000 | n/a | 0.000 | 0.000 | 1.290 | 201.251 | 2.281 | n/a | 0.129 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb000000000000004a | 205.070 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 203.561 | 0.094 | n/a | 0.216 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000034 | 204.918 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 203.838 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000056 | 204.753 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 203.686 | 0.017 | n/a | 0.136 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb000000000000001f | 204.613 | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 203.300 | 0.018 | n/a | 0.162 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb000000000000002f | 204.554 | 0.000 | n/a | 0.000 | 0.000 | 1.566 | 202.603 | 0.015 | n/a | 0.165 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000018 | 204.032 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 202.770 | 0.011 | n/a | 0.301 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000023 | 203.814 | 0.000 | n/a | 0.000 | 0.000 | 1.171 | 201.901 | 0.020 | n/a | 0.291 | 0.000 | n/a | n/a | 0.432 | 0.000 | 0.000 | 0.432 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000044 | 203.707 | 0.000 | n/a | 0.000 | 0.000 | 0.707 | 202.450 | 0.124 | n/a | 0.301 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb000000000000002c | 203.465 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 202.554 | 0.052 | n/a | 0.195 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000054 | 203.433 | 0.000 | n/a | 0.000 | 0.000 | 2.111 | 201.065 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000051 | 203.252 | 0.000 | n/a | 0.000 | 0.000 | 1.839 | 201.117 | 0.016 | n/a | 0.168 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.277 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 201.043 | 0.016 | n/a | 0.118 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 224.242 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.824 | 219.365 | 5.854 | n/a | 3.639 | 0.000 | n/a | n/a | 8.119 | 0.000 | 0.000 | 8.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb000000000000008e | 224.242 | 0.000 | n/a | 0.000 | 0.000 | 2.920 | 219.365 | 1.116 | n/a | 0.522 | 0.000 | n/a | n/a | 0.319 | 0.000 | 0.000 | 0.319 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000075 | 216.612 | 0.000 | n/a | 0.000 | 0.000 | 1.238 | 215.028 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000000a2 | 208.966 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 204.247 | 0.026 | n/a | 3.639 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb00000000000000a5 | 208.197 | 0.000 | n/a | 0.000 | 0.000 | 3.927 | 203.989 | 0.024 | n/a | 0.089 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb000000000000009e | 207.734 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 206.146 | 0.037 | n/a | 0.171 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000000b7 | 207.206 | 0.000 | n/a | 0.000 | 0.000 | 5.824 | 201.122 | 0.011 | n/a | 0.131 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb000000000000005e | 207.047 | 0.000 | n/a | 0.000 | 0.000 | 1.285 | 205.297 | 0.078 | n/a | 0.195 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb00000000000000b9 | 206.988 | 0.000 | n/a | 0.000 | 0.000 | 5.626 | 201.063 | 0.014 | n/a | 0.119 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000098 | 206.544 | 0.000 | n/a | 0.000 | 0.000 | 4.845 | 201.384 | 0.068 | n/a | 0.133 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb00000000000000b3 | 206.296 | 0.000 | n/a | 0.000 | 0.000 | 4.988 | 201.043 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb00000000000000a0 | 206.185 | 0.000 | n/a | 0.000 | 0.000 | 1.315 | 204.626 | 0.017 | n/a | 0.122 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb000000000000005f | 205.841 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 204.590 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000074 | 205.441 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 204.364 | 0.020 | n/a | 0.090 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000058 | 205.375 | 0.000 | n/a | 0.000 | 0.000 | 4.166 | 200.984 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000000ba | 205.177 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 204.289 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb00000000000000a7 | 204.351 | 0.000 | n/a | 0.000 | 0.000 | 2.000 | 201.914 | 0.077 | n/a | 0.220 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000066 | 204.090 | 0.000 | n/a | 0.000 | 0.000 | 2.804 | 201.003 | 0.019 | n/a | 0.122 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb000000000000006b | 204.059 | 0.000 | n/a | 0.000 | 0.000 | 2.517 | 201.162 | 0.016 | n/a | 0.128 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000072 | 203.935 | 0.000 | n/a | 0.000 | 0.000 | 2.188 | 201.496 | 0.016 | n/a | 0.129 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000082 | 203.763 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 202.110 | 0.046 | n/a | 0.226 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-43/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 200.898 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 207.336 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.080 | 206.306 | 12.171 | n/a | 0.190 | 0.000 | n/a | n/a | 49.995 | 0.000 | 0.000 | 49.995 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb00000000000000d4 | 207.336 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 206.306 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000000d7 | 206.245 | 0.000 | n/a | 0.000 | 0.000 | 4.821 | 201.125 | 0.014 | n/a | 0.111 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb000000000000011b | 205.941 | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 204.949 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb00000000000000f1 | 205.383 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 204.574 | 0.054 | n/a | 0.088 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000000e6 | 205.103 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 203.999 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb00000000000000be | 204.416 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 203.736 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000101 | 204.089 | 0.000 | n/a | 0.000 | 0.000 | 2.792 | 201.042 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb00000000000000e2 | 203.351 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 202.183 | 0.018 | n/a | 0.100 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb00000000000000f0 | 203.351 | 0.000 | n/a | 0.000 | 0.000 | 1.881 | 201.172 | 0.024 | n/a | 0.129 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb000000000000011c | 203.298 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 202.473 | 0.033 | n/a | 0.140 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000000e7 | 203.273 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 202.299 | 0.023 | n/a | 0.055 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000000e5 | 203.212 | 0.000 | n/a | 0.000 | 0.000 | 2.040 | 200.919 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb00000000000000e1 | 202.974 | 0.000 | n/a | 0.000 | 0.000 | 1.461 | 201.201 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000000fb | 202.929 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.593 | 0.022 | n/a | 0.110 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000115 | 202.743 | 0.000 | n/a | 0.000 | 0.000 | 1.186 | 201.264 | 0.013 | n/a | 0.096 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000000fd | 202.716 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 201.840 | 0.010 | n/a | 0.135 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb00000000000000c2 | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 201.728 | 0.013 | n/a | 0.117 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000109 | 202.613 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 201.536 | 0.008 | n/a | 0.095 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000000f3 | 202.589 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.375 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb00000000000000ed | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.202 | 201.074 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.767 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.848 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 226.153 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.479 | 225.135 | 4.381 | n/a | 0.168 | 0.000 | n/a | n/a | 0.427 | 0.000 | 0.000 | 0.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb0000000000000166 | 226.153 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 225.135 | 0.014 | n/a | 0.042 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000136 | 208.206 | 0.000 | n/a | 0.000 | 0.000 | 1.146 | 206.825 | 0.028 | n/a | 0.089 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000139 | 207.365 | 0.000 | n/a | 0.000 | 0.000 | 3.864 | 203.256 | 0.019 | n/a | 0.112 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000132 | 205.750 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 204.766 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000169 | 205.745 | 0.000 | n/a | 0.000 | 0.000 | 4.211 | 201.331 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb000000000000012b | 205.727 | 0.000 | n/a | 0.000 | 0.000 | 1.803 | 203.601 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000163 | 204.354 | 0.000 | n/a | 0.000 | 0.000 | 2.854 | 201.210 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb000000000000013c | 203.606 | 0.000 | n/a | 0.000 | 0.000 | 2.329 | 201.109 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000179 | 203.328 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 201.709 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb000000000000015a | 203.250 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 202.313 | 0.018 | n/a | 0.104 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb000000000000014f | 202.958 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 201.763 | 0.027 | n/a | 0.168 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000155 | 202.850 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 201.977 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb000000000000013e | 202.731 | 0.000 | n/a | 0.000 | 0.000 | 1.222 | 201.191 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000174 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 201.092 | 0.008 | n/a | 0.124 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000159 | 202.644 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.466 | 0.028 | n/a | 0.109 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000167 | 202.568 | 0.000 | n/a | 0.000 | 0.000 | 1.513 | 200.776 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000148 | 202.528 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 201.416 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000162 | 202.501 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.383 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000158 | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.080 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.285 | 0.000 | 0.000 | 0.285 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb000000000000017c | 202.439 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.348 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-43/journal/page | none observed |

## P3 / L64 / read (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.809 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 200.902 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 204.999 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.589 | 204.286 | 5.810 | n/a | 0.260 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb0000000000000196 | 205.242 | 0.000 | n/a | 0.000 | 0.000 | 1.308 | 203.662 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb00000000000001a3 | 204.999 | 0.000 | n/a | 0.000 | 0.000 | 0.466 | 204.364 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb00000000000001ba | 204.948 | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 204.286 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000001c1 | 204.933 | 0.000 | n/a | 0.000 | 0.000 | 0.666 | 204.076 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000197 | 204.686 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 203.808 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb00000000000001cb | 204.585 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 203.774 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb00000000000001d8 | 204.013 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 202.802 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000001ae | 203.034 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 201.924 | 0.010 | n/a | 0.095 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000189 | 202.933 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 201.445 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb00000000000001a1 | 202.903 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.662 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000001c5 | 202.866 | 0.000 | n/a | 0.000 | 0.000 | 1.146 | 201.262 | 0.008 | n/a | 0.122 | 0.000 | n/a | n/a | 0.328 | 0.000 | 0.000 | 0.328 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb00000000000001f1 | 202.827 | 0.000 | n/a | 0.000 | 0.000 | 1.131 | 201.327 | 0.013 | n/a | 0.101 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb00000000000001ac | 202.779 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 201.854 | 0.047 | n/a | 0.097 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000192 | 202.754 | 0.000 | n/a | 0.000 | 0.000 | 1.124 | 201.324 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000001b6 | 202.600 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 201.133 | 0.011 | n/a | 0.140 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb00000000000001be | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 201.248 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb000000000000018e | 202.549 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.344 | 0.008 | n/a | 0.123 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb00000000000001c3 | 202.530 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 201.292 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb000000000000019b | 202.430 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 201.284 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000191 | 202.407 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.239 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.799 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 200.853 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 205.531 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.705 | 204.446 | 1.413 | n/a | 0.117 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb000000000000021e | 206.699 | 0.000 | n/a | 0.000 | 0.000 | 1.391 | 204.957 | 0.010 | n/a | 0.117 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000228 | 205.531 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 204.446 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000216 | 205.181 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 203.944 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb000000000000024a | 204.982 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 204.035 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000244 | 204.717 | 0.000 | n/a | 0.000 | 0.000 | 0.504 | 204.025 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb000000000000023d | 204.552 | 0.000 | n/a | 0.000 | 0.000 | 3.705 | 200.684 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb000000000000026c | 204.433 | 0.000 | n/a | 0.000 | 0.000 | 3.725 | 200.556 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb000000000000020b | 204.357 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 203.174 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000212 | 203.497 | 0.000 | n/a | 0.000 | 0.000 | 1.673 | 201.578 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb000000000000021d | 203.262 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.775 | 0.086 | n/a | 0.301 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000251 | 202.997 | 0.000 | n/a | 0.000 | 0.000 | 2.037 | 200.801 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000222 | 202.958 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 201.706 | 0.018 | n/a | 0.091 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000218 | 202.831 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 201.387 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb000000000000020c | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.373 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb000000000000024c | 202.516 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 201.685 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000202 | 202.487 | 0.000 | n/a | 0.000 | 0.000 | 1.644 | 200.633 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000213 | 202.460 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.340 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb000000000000026e | 202.451 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.362 | 0.016 | n/a | 0.089 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000215 | 202.396 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 201.468 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb000000000000021f | 202.337 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.428 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (63 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 71.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 70.189 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 210.425 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.126 | 205.091 | 1.550 | n/a | 0.148 | 0.000 | n/a | n/a | 50.406 | 0.000 | 0.000 | 50.406 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb0000000000000281 | 210.425 | 0.000 | n/a | 0.000 | 0.000 | 5.126 | 205.091 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000272 | 203.016 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.945 | 0.013 | n/a | 0.128 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000273 | 202.446 | 0.000 | n/a | 0.000 | 0.000 | 1.338 | 200.879 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000286 | 202.400 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.220 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb000000000000028a | 202.369 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 201.362 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000275 | 202.109 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 200.968 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000278 | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 201.220 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000287 | 201.925 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 201.067 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000277 | 201.911 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 201.024 | 0.027 | n/a | 0.072 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000285 | 201.907 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 201.060 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb000000000000027f | 201.738 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 200.862 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000282 | 201.650 | 0.000 | n/a | 0.000 | 0.000 | 0.518 | 200.926 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb000000000000027c | 201.526 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 200.790 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000271 | 201.442 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 200.726 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000284 | 201.405 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 200.604 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb000000000000027a | 201.318 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 200.572 | 0.009 | n/a | 0.030 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000289 | 201.289 | 0.000 | n/a | 0.000 | 0.000 | 0.399 | 200.721 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb000000000000027e | 201.156 | 0.000 | n/a | 0.000 | 0.000 | 0.423 | 200.579 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb000000000000028b | 184.381 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 181.702 | 1.550 | n/a | 0.031 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000276 | 147.963 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 147.009 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.805 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 81.186 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 204.069 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.746 | 201.383 | 2.265 | n/a | 0.090 | 0.000 | n/a | n/a | 51.848 | 0.000 | 0.000 | 51.848 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 952592642aec87bb0000000000000ea9 | 206.347 | 0.000 | n/a | 0.000 | 0.000 | 1.493 | 203.607 | 0.052 | n/a | 0.498 | 0.000 | n/a | n/a | 0.698 | 0.000 | 0.000 | 0.698 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000ee4 | 204.464 | 0.000 | n/a | 0.000 | 0.000 | 3.746 | 200.529 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000ed8 | 204.069 | 0.000 | n/a | 0.000 | 0.000 | 3.247 | 200.693 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000e9b | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 1.671 | 200.825 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000f0a | 202.355 | 0.000 | n/a | 0.000 | 0.000 | 1.380 | 200.790 | 0.015 | n/a | 0.054 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000eca | 202.354 | 0.000 | n/a | 0.000 | 0.000 | 1.378 | 200.804 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| 952592642aec87bb0000000000000edd | 202.285 | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 201.383 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000f10 | 201.953 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.202 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000edb | 201.921 | 0.000 | n/a | 0.000 | 0.000 | 0.327 | 201.454 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000f04 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 200.798 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-43/journal/page | none observed |
| 952592642aec87bb0000000000000eb4 | 201.867 | 0.000 | n/a | 0.000 | 0.000 | 0.612 | 201.043 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000ecb | 201.787 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.037 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000ea6 | 201.765 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 201.016 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000eed | 201.751 | 0.000 | n/a | 0.000 | 0.000 | 0.353 | 201.176 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000edc | 201.728 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.987 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 952592642aec87bb0000000000000ecf | 201.725 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.952 | 0.011 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 952592642aec87bb0000000000000eb6 | 201.717 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.906 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-41/journal/page | none observed |
| 952592642aec87bb0000000000000ee9 | 201.675 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 200.808 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-45/journal/page | none observed |
| 952592642aec87bb0000000000000ed5 | 201.669 | 0.000 | n/a | 0.000 | 0.000 | 0.534 | 200.970 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 952592642aec87bb0000000000000ea0 | 201.664 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.819 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-43/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-1321/peer.transact-await (includes order/network/storage)` (497.051 ms, trace `1e1ad46b8a14058a0000000000000161`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (279.714 ms, trace `1e1ad46b8a14058a00000000000000f7`); `gw-w/thread-1325/peer.transact-await (includes order/network/storage)` (215.281 ms, trace `1e1ad46b8a14058a0000000000000084`); `gw-w/thread-1282/peer.transact-await (includes order/network/storage)` (121.711 ms, trace `1e1ad46b8a14058a00000000000000f8`); `gw-w/thread-1350/peer.transact-await (includes order/network/storage)` (111.926 ms, trace `1e1ad46b8a14058a000000000000004c`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-slim-smoke-d`; source `6d4d2852b4595450a2b1e7e29b8184dd8435a0b5`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 19828434.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 216 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: Mac CPU/swap collector missing. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 14257.195 | 1572.574 | 29.772 | 451 |
| L1 | 1 | 19982.652 | 1137.280 | 35.178 | 666 |
| L4 | 4 | 19973.007 | 2128.860 | 36.166 | 626 |
| L16 | 16 | 19985.972 | 1731.783 | 44.530 | 686 |
| tail | 0 | 124735.049 | 12812.963 | 126.945 | 71347 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 1e1ad46b8a14058a0000000000000161 | driver.queue.scheduler-dispatch | 0.064 | none | 0 / 32 |
| 1e1ad46b8a14058a0000000000000161 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 1e1ad46b8a14058a0000000000000161 waited: []

| 1e1ad46b8a14058a00000000000000f7 | driver.queue.scheduler-late | 0.271 | none | 0 / 32 |
| 1e1ad46b8a14058a00000000000000f7 | driver.queue.scheduler-dispatch | 0.065 | none | 0 / 32 |

Observed active steps while trace 1e1ad46b8a14058a00000000000000f7 waited: []

| 1e1ad46b8a14058a0000000000000084 | driver.queue.scheduler-dispatch | 0.112 | none | 0 / 32 |
| 1e1ad46b8a14058a0000000000000084 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 1e1ad46b8a14058a0000000000000084 waited: []

| 1e1ad46b8a14058a00000000000000f8 | driver.queue.scheduler-dispatch | 0.063 | none | 1 / 32 |
| 1e1ad46b8a14058a00000000000000f8 | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace 1e1ad46b8a14058a00000000000000f8 waited: []

| 1e1ad46b8a14058a000000000000004c | driver.queue.scheduler-late | 0.767 | none | 0 / 32 |
| 1e1ad46b8a14058a000000000000004c | driver.queue.scheduler-dispatch | 0.073 | none | 0 / 32 |

Observed active steps while trace 1e1ad46b8a14058a000000000000004c waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.328 | 0.364 | 0.000 | 0.422 | 5.167 | 0.723 | 0.000 | 0.100 | 1.140 | 1.233 | 0.018 | n/a | 0.093 | 5.671 | n/a | n/a | 0.025 | 5.754 | 0.349 | 0.025 |
| p99 | 122.822 | 1.994 | 0.000 | 2.320 | 20.042 | n/a | 0.886 | 1.088 | 5.344 | 3.997 | 1.582 | n/a | 0.524 | 111.926 | n/a | n/a | 0.210 | 20.491 | 0.643 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a000000000000004c | 122.822 | 5.167 | n/a | 0.000 | 0.839 | 0.781 | 3.997 | 0.019 | n/a | 0.066 | 111.926 | n/a | n/a | 0.025 | 6.006 | 0.049 | 0.025 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 1e1ad46b8a14058a0000000000000038 | 32.278 | 20.042 | 0.370 | 0.000 | 0.078 | 5.344 | 1.632 | 0.021 | n/a | 0.413 | 4.352 | n/a | n/a | 0.025 | 20.491 | 0.635 | 0.025 | node-196/thread-8/client.validation-and-staging | driver.reader-basis.broadcast 0.017ms |
| 1e1ad46b8a14058a0000000000000052 | 31.060 | 11.083 | 0.192 | 0.403 | 0.062 | 3.306 | 1.363 | 0.019 | n/a | 0.263 | 14.346 | n/a | n/a | 0.023 | 11.740 | 0.378 | 0.023 | gw-w/thread-1285/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 1e1ad46b8a14058a0000000000000062 | 25.476 | 12.050 | 0.161 | 0.343 | 0.093 | 4.322 | 1.421 | 1.582 | n/a | 0.070 | 5.402 | n/a | n/a | 0.031 | 12.647 | 0.496 | 0.031 | node-196/thread-8/client.persist-and-resolve | driver.reader-basis.broadcast 0.039ms |
| 1e1ad46b8a14058a000000000000005a | 22.432 | 10.989 | 0.242 | 0.886 | 0.062 | 1.305 | 1.258 | 0.019 | n/a | 0.073 | 7.576 | n/a | n/a | 0.021 | 12.179 | 0.543 | 0.021 | gw-w/thread-1274/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 1e1ad46b8a14058a0000000000000066 | 22.406 | 10.195 | 0.193 | 0.000 | 0.061 | 1.622 | 1.779 | 0.026 | n/a | 0.089 | 8.417 | n/a | n/a | 0.024 | 10.448 | 0.466 | 0.024 | gw-w/thread-1278/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 1e1ad46b8a14058a0000000000000054 | 18.794 | 10.926 | 0.723 | 0.377 | 0.061 | 1.383 | 1.213 | 0.019 | n/a | 0.070 | 4.000 | n/a | n/a | 0.021 | 12.087 | 0.643 | 0.021 | node-196/thread-8/client.persist-and-resolve | driver.reader-basis.broadcast 0.027ms |
| 1e1ad46b8a14058a0000000000000036 | 18.271 | 7.626 | n/a | 0.000 | 0.536 | 1.006 | 1.412 | 0.012 | n/a | 0.524 | 7.017 | n/a | n/a | 0.138 | 8.162 | 0.447 | 0.138 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000006e | 17.803 | 5.125 | 0.173 | 0.354 | 0.102 | 1.036 | 1.254 | 0.018 | n/a | 0.259 | 9.451 | n/a | n/a | 0.032 | 5.754 | 0.323 | 0.032 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| 1e1ad46b8a14058a0000000000000042 | 16.592 | 5.741 | 0.215 | 0.000 | 0.063 | 2.466 | 1.254 | 0.025 | n/a | 0.057 | 6.673 | n/a | n/a | 0.098 | 6.019 | 0.363 | 0.098 | gw-w/thread-1334/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 1e1ad46b8a14058a0000000000000050 | 16.303 | 5.485 | 0.141 | 0.000 | 0.062 | 2.557 | 1.611 | 0.018 | n/a | 0.259 | 6.150 | n/a | n/a | 0.020 | 5.688 | 0.349 | 0.020 | gw-w/thread-1345/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| 1e1ad46b8a14058a000000000000003b | 15.616 | 8.869 | 0.214 | 0.000 | 0.054 | 1.565 | 1.004 | 0.018 | n/a | 0.288 | 3.565 | n/a | n/a | 0.040 | 9.137 | 0.585 | 0.040 | node-196/thread-8/client.persist-and-resolve | driver.publication.persist-deferred 1.498ms; driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a000000000000006a | 15.267 | 5.522 | 0.214 | 0.400 | 0.057 | 1.206 | 1.233 | 0.016 | n/a | 0.220 | 6.375 | n/a | n/a | 0.026 | 6.192 | 0.406 | 0.026 | gw-w/thread-1349/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 1e1ad46b8a14058a000000000000005c | 14.464 | 5.310 | n/a | 0.000 | 0.131 | 0.650 | 1.218 | 0.011 | n/a | 0.080 | 7.042 | n/a | n/a | 0.023 | 5.440 | 0.376 | 0.023 | gw-w/thread-1270/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000004e | 14.328 | 2.345 | n/a | 0.000 | 0.410 | 0.551 | 3.759 | 0.012 | n/a | 0.047 | 7.181 | n/a | n/a | 0.023 | 2.755 | 0.192 | 0.023 | gw-w/thread-1284/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000003e | 14.222 | 5.849 | 0.163 | 0.000 | 0.073 | 2.439 | 1.262 | 0.019 | n/a | 0.056 | 4.331 | n/a | n/a | 0.031 | 6.085 | 0.428 | 0.031 | gw-w/thread-1342/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 1e1ad46b8a14058a000000000000005e | 13.185 | 3.594 | 0.181 | 0.300 | 0.057 | 3.164 | 1.181 | 0.020 | n/a | 0.322 | 4.346 | n/a | n/a | 0.022 | 4.131 | 0.313 | 0.022 | gw-w/thread-1340/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 1e1ad46b8a14058a0000000000000068 | 13.077 | 2.966 | n/a | 0.000 | 1.088 | 1.140 | 1.902 | 0.028 | n/a | 0.182 | 5.742 | n/a | n/a | 0.030 | 4.054 | 0.310 | 0.030 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000048 | 13.026 | 5.509 | 0.214 | 0.000 | 0.124 | 1.263 | 1.213 | 0.020 | n/a | 0.093 | 4.541 | n/a | n/a | 0.049 | 5.847 | 0.449 | 0.049 | gw-w/thread-1332/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 1e1ad46b8a14058a0000000000000046 | 12.933 | 4.944 | n/a | 0.000 | 0.821 | 0.516 | 1.045 | 0.011 | n/a | 0.292 | 5.261 | n/a | n/a | 0.043 | 5.765 | 0.446 | 0.043 | gw-w/thread-1320/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.333 | 0.817 | 0.000 | 0.546 | 2.067 | n/a | 0.000 | 0.531 | 0.534 | 0.764 | 0.012 | n/a | 0.102 | 5.375 | n/a | n/a | 0.023 | 2.725 | 0.310 | 0.023 |
| p99 | 13.077 | 1.005 | 0.000 | 0.949 | 3.485 | n/a | 0.000 | 1.088 | 1.140 | 1.902 | 0.028 | n/a | 0.293 | 7.442 | n/a | n/a | 0.210 | 4.054 | 0.320 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a0000000000000068 | 13.077 | 2.966 | n/a | 0.000 | 1.088 | 1.140 | 1.902 | 0.028 | n/a | 0.182 | 5.742 | n/a | n/a | 0.030 | 4.054 | 0.310 | 0.030 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000003a | 12.725 | 3.485 | n/a | 0.000 | 0.531 | 0.702 | 0.685 | 0.010 | n/a | 0.293 | 6.809 | n/a | n/a | 0.210 | 4.016 | 0.316 | 0.210 | gw-w/thread-1274/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a000000000000003f | 11.922 | 2.067 | n/a | 0.000 | 0.658 | 0.534 | 1.107 | 0.013 | n/a | 0.088 | 7.442 | n/a | n/a | 0.012 | 2.725 | 0.229 | 0.012 | gw-w/thread-1347/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000058 | 10.016 | 2.176 | n/a | 0.000 | 0.945 | 0.715 | 1.428 | 0.022 | n/a | 0.107 | 4.602 | n/a | n/a | 0.022 | 3.121 | 0.312 | 0.022 | gw-w/thread-1280/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000060 | 9.333 | 2.691 | n/a | 0.000 | 0.219 | 0.579 | 0.878 | 0.014 | n/a | 0.102 | 4.821 | n/a | n/a | 0.028 | 2.911 | 0.312 | 0.028 | gw-w/thread-1317/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000056 | 8.988 | 1.960 | n/a | 0.000 | 0.100 | 0.477 | 0.764 | 0.012 | n/a | 0.278 | 5.375 | n/a | n/a | 0.021 | 2.060 | 0.229 | 0.021 | gw-w/thread-1313/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000006b | 8.901 | 1.632 | n/a | 0.000 | 0.390 | 0.452 | 0.677 | 0.010 | n/a | 0.051 | 5.671 | n/a | n/a | 0.020 | 2.021 | 0.227 | 0.020 | gw-w/thread-1312/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000044 | 8.066 | 1.879 | n/a | 0.000 | 0.704 | 0.449 | 0.650 | 0.012 | n/a | 0.068 | 4.266 | n/a | n/a | 0.037 | 2.583 | 0.320 | 0.037 | gw-w/thread-1323/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000064 | 8.011 | 1.800 | n/a | 0.000 | 0.090 | 0.482 | 0.731 | 0.010 | n/a | 0.090 | 4.784 | n/a | n/a | 0.023 | 1.891 | 0.236 | 0.023 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.841 | 0.000 | 0.000 | 0.421 | 3.691 | n/a | 0.000 | 0.115 | 0.875 | 1.253 | 0.016 | n/a | 0.084 | 7.840 | n/a | n/a | 0.025 | 4.092 | 0.266 | 0.025 |
| p99 | 231.779 | 3.291 | 0.000 | 2.622 | 7.461 | n/a | 6.225 | 1.088 | 2.112 | 8.317 | 0.034 | n/a | 0.667 | 215.281 | n/a | n/a | 0.060 | 11.530 | 0.543 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a0000000000000084 | 231.779 | 6.143 | 0.183 | 0.499 | 0.115 | 2.112 | 7.165 | 0.020 | n/a | 0.202 | 215.281 | n/a | n/a | 0.060 | 6.939 | 0.030 | 0.060 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms; driver.reader-basis.broadcast 0.049ms; driver.reader-basis.broadcast 0.048ms |
| 1e1ad46b8a14058a0000000000000092 | 35.867 | 5.382 | 0.205 | 0.563 | 0.081 | 1.248 | 4.969 | 0.020 | n/a | 0.059 | 23.313 | n/a | n/a | 0.027 | 6.231 | 0.174 | 0.027 | gw-w/thread-1340/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.119ms |
| 1e1ad46b8a14058a00000000000000c2 | 27.563 | 5.066 | 0.179 | 6.225 | 0.060 | 1.448 | 4.380 | 0.017 | n/a | 0.077 | 10.087 | n/a | n/a | 0.025 | 11.530 | 0.418 | 0.025 | gw-w/thread-1345/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 1e1ad46b8a14058a00000000000000b8 | 26.868 | 4.348 | 0.195 | 0.219 | 0.096 | 1.026 | 4.986 | 0.015 | n/a | 0.064 | 15.883 | n/a | n/a | 0.035 | 4.859 | 0.181 | 0.035 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 1e1ad46b8a14058a000000000000007e | 26.414 | 4.049 | 0.135 | 0.000 | 0.065 | 0.889 | 1.005 | 0.017 | n/a | 0.088 | 20.142 | n/a | n/a | 0.025 | 4.248 | 0.161 | 0.025 | gw-w/thread-1346/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 1e1ad46b8a14058a000000000000008a | 25.352 | 4.135 | 0.128 | 0.404 | 0.054 | 1.046 | 6.687 | 0.022 | n/a | 0.078 | 12.781 | n/a | n/a | 0.018 | 4.720 | 0.186 | 0.018 | gw-w/thread-1313/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 1e1ad46b8a14058a000000000000008e | 24.542 | 3.708 | 0.151 | 0.000 | 0.070 | 1.000 | 5.330 | 0.034 | n/a | 0.079 | 14.147 | n/a | n/a | 0.023 | 3.929 | 0.160 | 0.023 | gw-w/thread-1342/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 1e1ad46b8a14058a0000000000000093 | 24.066 | 7.229 | n/a | 0.000 | 1.001 | 0.657 | 1.547 | 0.010 | n/a | 0.559 | 13.039 | n/a | n/a | 0.025 | 8.230 | 0.342 | 0.025 | gw-w/thread-1332/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000088 | 21.804 | 3.691 | n/a | 0.000 | 0.531 | 0.732 | 1.115 | 0.009 | n/a | 0.049 | 15.655 | n/a | n/a | 0.023 | 4.222 | 0.194 | 0.023 | gw-w/thread-1335/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000a2 | 21.447 | 3.652 | 0.198 | 0.326 | 0.052 | 1.005 | 8.317 | 0.026 | n/a | 0.667 | 7.180 | n/a | n/a | 0.024 | 4.228 | 0.197 | 0.024 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 1e1ad46b8a14058a0000000000000086 | 21.356 | 3.467 | 0.182 | 0.000 | 0.061 | 0.617 | 0.785 | 0.008 | n/a | 0.067 | 16.145 | n/a | n/a | 0.023 | 3.709 | 0.174 | 0.023 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 1e1ad46b8a14058a000000000000009e | 21.279 | 2.853 | n/a | 0.000 | 0.240 | 0.557 | 1.125 | 0.009 | n/a | 0.387 | 16.081 | n/a | n/a | 0.027 | 3.094 | 0.145 | 0.027 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000c0 | 21.023 | 4.541 | 0.136 | 0.200 | 0.039 | 0.945 | 3.368 | 0.016 | n/a | 0.058 | 11.693 | n/a | n/a | 0.028 | 4.916 | 0.234 | 0.028 | gw-w/thread-1344/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| 1e1ad46b8a14058a00000000000000ae | 20.252 | 3.281 | 0.138 | 0.000 | 0.052 | 0.976 | 6.794 | 0.027 | n/a | 0.054 | 8.910 | n/a | n/a | 0.021 | 3.471 | 0.171 | 0.021 | gw-w/thread-1335/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a0000000000000090 | 20.198 | 2.779 | n/a | 0.000 | 0.117 | 0.868 | 1.755 | 0.018 | n/a | 0.565 | 14.069 | n/a | n/a | 0.027 | 2.896 | 0.143 | 0.027 | gw-w/thread-1270/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000b6 | 19.701 | 3.561 | 0.183 | 0.233 | 0.053 | 0.968 | 5.606 | 0.021 | n/a | 0.112 | 8.944 | n/a | n/a | 0.020 | 4.030 | 0.205 | 0.020 | gw-w/thread-1340/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 1e1ad46b8a14058a000000000000008c | 19.626 | 5.368 | n/a | 0.000 | 0.696 | 1.034 | 1.189 | 0.019 | n/a | 0.115 | 11.168 | n/a | n/a | 0.037 | 6.064 | 0.309 | 0.037 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000b2 | 18.088 | 3.744 | 0.185 | 0.733 | 0.067 | 1.186 | 7.478 | 0.027 | n/a | 0.069 | 4.568 | n/a | n/a | 0.031 | 4.729 | 0.261 | 0.031 | gw-w/thread-1333/gateway.admitted-work | driver.reader-basis.broadcast 0.052ms |
| 1e1ad46b8a14058a00000000000000aa | 16.447 | 3.257 | n/a | 0.000 | 0.161 | 0.616 | 1.223 | 0.012 | n/a | 0.334 | 10.812 | n/a | n/a | 0.032 | 3.418 | 0.208 | 0.032 | gw-w/thread-1285/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000ac | 16.069 | 4.657 | 0.182 | 0.000 | 0.089 | 1.177 | 4.789 | 0.016 | n/a | 0.076 | 5.047 | n/a | n/a | 0.035 | 4.928 | 0.307 | 0.035 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.146 | 0.000 | 0.000 | 0.464 | 2.299 | n/a | 0.000 | 0.682 | 0.520 | 0.787 | 0.010 | n/a | 0.084 | 3.790 | n/a | n/a | 0.022 | 2.704 | 0.319 | 0.022 |
| p99 | 19.626 | 0.999 | 0.000 | 0.803 | 5.368 | n/a | 0.000 | 1.088 | 1.493 | 2.157 | 0.027 | n/a | 0.290 | 11.168 | n/a | n/a | 0.050 | 6.064 | 0.530 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a000000000000008c | 19.626 | 5.368 | n/a | 0.000 | 0.696 | 1.034 | 1.189 | 0.019 | n/a | 0.115 | 11.168 | n/a | n/a | 0.037 | 6.064 | 0.309 | 0.037 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000007b | 11.206 | 5.198 | n/a | 0.000 | 0.743 | 1.493 | 2.157 | 0.027 | n/a | 0.084 | 1.479 | n/a | n/a | 0.025 | 5.941 | 0.530 | 0.025 | node-196/thread-0/driver.execute | none observed |
| 1e1ad46b8a14058a00000000000000b4 | 10.656 | 3.448 | n/a | 0.000 | 0.917 | 0.839 | 0.904 | 0.011 | n/a | 0.075 | 4.412 | n/a | n/a | 0.050 | 4.364 | 0.410 | 0.050 | gw-w/thread-1272/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000a3 | 9.335 | 2.771 | n/a | 0.000 | 1.088 | 0.455 | 0.917 | 0.010 | n/a | 0.280 | 3.790 | n/a | n/a | 0.026 | 3.858 | 0.413 | 0.026 | gw-w/thread-1274/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000078 | 8.146 | 1.998 | n/a | 0.000 | 0.149 | 0.464 | 0.676 | 0.008 | n/a | 0.042 | 4.789 | n/a | n/a | 0.019 | 2.147 | 0.264 | 0.019 | gw-w/thread-1347/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000a7 | 8.065 | 1.466 | n/a | 0.000 | 0.682 | 0.550 | 0.724 | 0.008 | n/a | 0.258 | 4.358 | n/a | n/a | 0.021 | 2.147 | 0.266 | 0.021 | gw-w/thread-1271/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000096 | 7.801 | 2.299 | n/a | 0.000 | 0.405 | 0.520 | 0.787 | 0.022 | n/a | 0.290 | 3.456 | n/a | n/a | 0.022 | 2.704 | 0.347 | 0.022 | gw-w/thread-1323/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000be | 6.605 | 1.720 | n/a | 0.000 | 0.388 | 0.468 | 0.659 | 0.008 | n/a | 0.063 | 3.282 | n/a | n/a | 0.017 | 2.108 | 0.319 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.557 | n/a | n/a | n/a | 39.185 | 7.547 | 2.611 | 0.000 | 0.325 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.596 | 61.192 | 0.802 | 17.596 |
| p99 | 429.576 | n/a | n/a | n/a | 85.937 | 252.604 | 15.624 | 0.000 | 30.074 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 135.661 | 309.057 | 1.000 | 135.661 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a0000000000001787 | 439.449 | 45.728 | 252.604 | 5.115 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 135.661 | 303.446 | 0.691 | 135.661 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a000000000000178a | 429.576 | 39.185 | 265.837 | 4.035 | 0.000 | 0.276 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 120.243 | 309.057 | 0.719 | 120.243 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a000000000000178f | 372.520 | 32.588 | 225.594 | 2.462 | 0.000 | 0.188 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 111.688 | 260.643 | 0.700 | 111.688 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a000000000000177c | 360.868 | 45.441 | 209.969 | 5.096 | 0.000 | 0.421 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.940 | 260.507 | 0.722 | 99.940 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms |
| 1e1ad46b8a14058a0000000000001790 | 356.878 | 82.175 | 215.250 | 13.891 | 0.000 | 0.316 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.245 | 311.317 | 0.872 | 45.245 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a0000000000001780 | 310.272 | 41.069 | 171.322 | 1.102 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 96.515 | 213.493 | 0.688 | 96.515 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms |
| 1e1ad46b8a14058a000000000000177b | 306.944 | 63.797 | 211.977 | 2.985 | 0.000 | 3.124 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 25.060 | 278.760 | 0.908 | 25.060 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms |
| 1e1ad46b8a14058a0000000000001783 | 290.136 | 19.968 | 197.923 | 1.689 | 0.000 | 0.278 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.279 | 219.580 | 0.757 | 70.279 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 8.152ms; driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a0000000000001773 | 253.476 | 184.463 | 7.547 | 17.686 | 0.000 | 0.290 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.489 | 209.696 | 0.827 | 43.489 | node-196/thread-3/client.reach | driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.325ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a0000000000001772 | 247.588 | 45.878 | 12.148 | 4.039 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 185.282 | 62.065 | 0.251 | 185.282 | node-196/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.325ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a000000000000177a | 240.894 | 22.144 | 114.340 | 0.000 | 0.000 | 4.411 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.999 | 136.484 | 0.567 | 99.999 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 6.104ms; driver.publication.persist-deferred 5.779ms; driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.197ms |
| 1e1ad46b8a14058a000000000000145e | 198.729 | 60.456 | 2.785 | 7.288 | 0.000 | 84.354 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.845 | 70.529 | 0.355 | 43.845 | node-196/thread-3/socket.body-read | driver.publication.persist-deferred 2.931ms; driver.publication.persist-deferred 1.379ms; driver.publication.persist-deferred 1.326ms; driver.publication.persist-deferred 1.228ms; driver.publication.persist-deferred 1.215ms |
| 1e1ad46b8a14058a0000000000001774 | 196.725 | 53.718 | 4.755 | 3.542 | 0.000 | 0.360 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 134.351 | 62.015 | 0.315 | 134.351 | node-196/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 4.959ms; driver.publication.persist-deferred 4.763ms; driver.publication.persist-deferred 3.569ms |
| 1e1ad46b8a14058a0000000000001cb9 | 195.117 | 76.093 | 61.516 | 4.814 | 0.000 | 1.815 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.878 | 142.423 | 0.730 | 50.878 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.283ms; driver.publication.persist-deferred 1.206ms; driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.163ms; driver.publication.persist-deferred 1.131ms |
| 1e1ad46b8a14058a000000000000114e | 186.904 | 71.806 | 66.311 | 11.761 | 0.000 | 0.659 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.366 | 149.879 | 0.802 | 36.366 | node-196/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.268ms; driver.publication.persist-deferred 1.190ms; driver.publication.persist-deferred 1.121ms; driver.publication.persist-deferred 1.099ms; driver.publication.persist-deferred 1.098ms |
| 1e1ad46b8a14058a000000000000129a | 186.768 | 37.992 | 57.501 | 3.898 | 0.000 | 0.611 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.766 | 99.391 | 0.532 | 86.766 | node-196/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 2.916ms; driver.publication.persist-deferred 1.198ms; driver.publication.persist-deferred 1.182ms; driver.publication.persist-deferred 1.126ms; driver.publication.persist-deferred 1.043ms |
| 1e1ad46b8a14058a0000000000001cb2 | 171.690 | 58.478 | 14.844 | 6.300 | 0.000 | 0.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 91.736 | 79.622 | 0.464 | 91.736 | node-196/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.453ms; driver.publication.persist-deferred 1.283ms; driver.publication.persist-deferred 1.206ms; driver.publication.persist-deferred 1.196ms; driver.publication.persist-deferred 1.163ms |
| 1e1ad46b8a14058a0000000000001771 | 165.227 | 60.772 | 20.749 | 8.905 | 0.000 | 0.580 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 74.220 | 90.427 | 0.547 | 74.220 | node-196/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 5.649ms; driver.publication.persist-deferred 5.407ms; driver.publication.persist-deferred 5.325ms; driver.publication.persist-deferred 4.959ms; driver.publication.persist-deferred 3.569ms |
| 1e1ad46b8a14058a0000000000001a01 | 148.142 | 54.235 | 3.491 | 3.711 | 0.000 | 0.339 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.366 | 61.437 | 0.415 | 86.366 | node-196/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 3.700ms; driver.publication.persist-deferred 3.261ms; driver.publication.persist-deferred 2.896ms; driver.publication.persist-deferred 2.223ms; driver.publication.persist-deferred 1.897ms |
| 1e1ad46b8a14058a0000000000001cac | 138.507 | 72.624 | 1.601 | 9.065 | 0.000 | 0.903 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 54.314 | 83.290 | 0.601 | 54.314 | node-196/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.578ms; driver.publication.persist-deferred 1.453ms; driver.publication.persist-deferred 1.264ms; driver.publication.persist-deferred 1.206ms; driver.publication.persist-deferred 1.115ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.551 | 0.000 | 0.000 | 0.472 | 4.292 | 0.677 | 0.000 | 0.106 | 0.956 | 1.464 | 0.017 | n/a | 0.193 | 9.467 | n/a | n/a | 0.029 | 4.941 | 0.236 | 0.029 |
| p99 | 284.534 | 1.997 | 0.000 | 2.710 | 12.253 | n/a | 1.603 | 1.149 | 7.624 | 10.125 | 0.037 | n/a | 3.389 | 279.714 | n/a | n/a | 0.067 | 12.850 | 0.422 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a00000000000000f7 | 284.534 | 2.221 | n/a | 0.000 | 0.336 | 0.623 | 1.220 | 0.012 | n/a | 0.377 | 279.714 | n/a | n/a | 0.031 | 2.557 | 0.009 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.117ms; driver.reader-basis.broadcast 0.046ms; driver.reader-basis.broadcast 0.045ms |
| 1e1ad46b8a14058a00000000000000f8 | 137.116 | 7.531 | 0.175 | 0.000 | 0.065 | 0.949 | 6.354 | 0.017 | n/a | 0.290 | 121.711 | n/a | n/a | 0.025 | 7.771 | 0.057 | 0.025 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.990ms; driver.reader-basis.broadcast 0.117ms; driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a00000000000000d5 | 55.464 | 12.253 | 0.233 | 0.261 | 0.103 | 2.334 | 8.669 | 0.029 | n/a | 0.166 | 31.380 | n/a | n/a | 0.037 | 12.850 | 0.232 | 0.037 | gw-w/thread-1272/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| 1e1ad46b8a14058a00000000000000d7 | 51.699 | 4.144 | 0.190 | 0.315 | 0.094 | 2.582 | 8.882 | 0.037 | n/a | 0.070 | 35.350 | n/a | n/a | 0.035 | 4.744 | 0.092 | 0.035 | gw-w/thread-1320/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 1e1ad46b8a14058a00000000000000cf | 51.203 | 3.117 | n/a | 0.000 | 0.174 | 0.692 | 1.276 | 0.010 | n/a | 0.103 | 45.793 | n/a | n/a | 0.038 | 3.291 | 0.064 | 0.038 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 1e1ad46b8a14058a00000000000000e3 | 43.780 | 4.855 | 0.199 | 0.234 | 0.075 | 1.410 | 8.492 | 0.029 | n/a | 0.097 | 28.363 | n/a | n/a | 0.027 | 5.363 | 0.123 | 0.027 | gw-w/thread-1318/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 1e1ad46b8a14058a00000000000000e7 | 41.777 | 7.935 | 0.132 | 1.603 | 0.063 | 4.241 | 10.125 | 0.026 | n/a | 3.389 | 14.240 | n/a | n/a | 0.023 | 9.732 | 0.233 | 0.023 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 1e1ad46b8a14058a00000000000000cd | 38.771 | 7.189 | 0.185 | 0.304 | 0.071 | 1.059 | 6.438 | 0.019 | n/a | 0.241 | 23.237 | n/a | n/a | 0.028 | 7.749 | 0.200 | 0.028 | gw-w/thread-1342/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 1e1ad46b8a14058a00000000000000e1 | 33.365 | 10.410 | 0.130 | 0.211 | 0.061 | 1.628 | 5.284 | 0.017 | n/a | 0.075 | 15.523 | n/a | n/a | 0.025 | 10.812 | 0.324 | 0.025 | gw-w/thread-1312/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 1e1ad46b8a14058a00000000000000d1 | 31.311 | 2.331 | n/a | 0.000 | 0.106 | 0.552 | 1.095 | 0.009 | n/a | 0.350 | 26.839 | n/a | n/a | 0.029 | 2.437 | 0.078 | 0.029 | gw-w/thread-1273/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms |
| 1e1ad46b8a14058a00000000000000f5 | 26.901 | 6.821 | 0.677 | 0.362 | 0.073 | 1.713 | 5.306 | 0.019 | n/a | 0.320 | 11.586 | n/a | n/a | 0.025 | 7.933 | 0.295 | 0.025 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 1e1ad46b8a14058a00000000000000fb | 25.705 | 6.678 | 0.171 | 0.333 | 0.101 | 1.914 | 5.337 | 0.029 | n/a | 0.378 | 10.726 | n/a | n/a | 0.037 | 7.283 | 0.283 | 0.037 | gw-w/thread-1345/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 1e1ad46b8a14058a00000000000000dd | 25.360 | 5.219 | 0.161 | 0.260 | 0.094 | 1.154 | 6.521 | 0.022 | n/a | 0.079 | 11.816 | n/a | n/a | 0.034 | 5.733 | 0.226 | 0.034 | gw-w/thread-1278/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 1e1ad46b8a14058a00000000000000e5 | 23.694 | 2.934 | n/a | 0.000 | 0.486 | 0.757 | 1.887 | 0.016 | n/a | 0.102 | 17.486 | n/a | n/a | 0.027 | 3.420 | 0.144 | 0.027 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 1e1ad46b8a14058a00000000000000eb | 23.619 | 7.282 | 0.224 | 0.596 | 0.066 | 4.366 | 5.144 | 0.017 | n/a | 0.326 | 5.574 | n/a | n/a | 0.024 | 8.168 | 0.346 | 0.024 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 1e1ad46b8a14058a0000000000000107 | 23.582 | 4.865 | 0.136 | 0.338 | 0.064 | 7.624 | 1.507 | 0.023 | n/a | 0.072 | 8.930 | n/a | n/a | 0.024 | 5.402 | 0.229 | 0.024 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 1e1ad46b8a14058a00000000000000ff | 22.584 | 5.548 | 0.140 | 0.000 | 0.072 | 1.252 | 6.417 | 0.024 | n/a | 0.076 | 9.028 | n/a | n/a | 0.026 | 5.760 | 0.255 | 0.026 | gw-w/thread-1285/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| 1e1ad46b8a14058a00000000000000df | 21.943 | 4.292 | n/a | 0.000 | 0.814 | 0.640 | 1.234 | 0.009 | n/a | 0.070 | 14.857 | n/a | n/a | 0.025 | 5.106 | 0.233 | 0.025 | gw-w/thread-1344/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000ef | 21.708 | 4.755 | 0.127 | 0.000 | 0.065 | 1.407 | 7.332 | 0.023 | n/a | 0.298 | 7.678 | n/a | n/a | 0.023 | 4.946 | 0.228 | 0.023 | gw-w/thread-1321/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 1e1ad46b8a14058a00000000000000c4 | 21.551 | 4.504 | n/a | 0.000 | 0.580 | 0.956 | 1.001 | 0.011 | n/a | 0.268 | 14.163 | n/a | n/a | 0.067 | 5.085 | 0.236 | 0.067 | gw-w/thread-1274/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.211 | 0.000 | 0.000 | 0.472 | 2.221 | n/a | 0.000 | 0.758 | 0.623 | 0.782 | 0.009 | n/a | 0.073 | 6.737 | n/a | n/a | 0.030 | 3.140 | 0.236 | 0.030 |
| p99 | 284.534 | 1.871 | 0.000 | 1.097 | 4.504 | n/a | 0.000 | 1.149 | 0.956 | 1.220 | 0.012 | n/a | 0.377 | 279.714 | n/a | n/a | 0.067 | 5.085 | 0.368 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a00000000000000f7 | 284.534 | 2.221 | n/a | 0.000 | 0.336 | 0.623 | 1.220 | 0.012 | n/a | 0.377 | 279.714 | n/a | n/a | 0.031 | 2.557 | 0.009 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.117ms; driver.reader-basis.broadcast 0.046ms; driver.reader-basis.broadcast 0.045ms |
| 1e1ad46b8a14058a00000000000000c4 | 21.551 | 4.504 | n/a | 0.000 | 0.580 | 0.956 | 1.001 | 0.011 | n/a | 0.268 | 14.163 | n/a | n/a | 0.067 | 5.085 | 0.236 | 0.067 | gw-w/thread-1274/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000d9 | 17.056 | 2.766 | n/a | 0.000 | 1.088 | 0.734 | 0.934 | 0.010 | n/a | 0.237 | 11.249 | n/a | n/a | 0.039 | 3.854 | 0.226 | 0.039 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.097ms |
| 1e1ad46b8a14058a000000000000010d | 15.274 | 1.909 | n/a | 0.000 | 0.339 | 0.503 | 0.769 | 0.009 | n/a | 0.073 | 11.645 | n/a | n/a | 0.027 | 2.247 | 0.147 | 0.027 | gw-w/thread-1321/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000d3 | 14.277 | 2.569 | n/a | 0.000 | 0.758 | 0.516 | 0.848 | 0.009 | n/a | 0.065 | 9.467 | n/a | n/a | 0.046 | 3.327 | 0.233 | 0.046 | gw-w/thread-1317/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000db | 11.211 | 2.761 | n/a | 0.000 | 1.149 | 0.710 | 0.752 | 0.008 | n/a | 0.043 | 5.755 | n/a | n/a | 0.033 | 3.910 | 0.349 | 0.033 | gw-w/thread-1323/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000c8 | 10.455 | 3.203 | n/a | 0.000 | 0.410 | 0.806 | 0.838 | 0.010 | n/a | 0.060 | 5.098 | n/a | n/a | 0.030 | 3.613 | 0.346 | 0.030 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000105 | 10.443 | 1.572 | n/a | 0.000 | 0.911 | 0.346 | 0.782 | 0.009 | n/a | 0.069 | 6.737 | n/a | n/a | 0.017 | 2.483 | 0.238 | 0.017 | gw-w/thread-1342/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000000ed | 9.973 | 1.963 | n/a | 0.000 | 0.834 | 0.535 | 0.781 | 0.009 | n/a | 0.292 | 5.530 | n/a | n/a | 0.029 | 2.797 | 0.280 | 0.029 | gw-w/thread-1317/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000010f | 8.527 | 2.056 | n/a | 0.000 | 1.084 | 0.668 | 0.733 | 0.009 | n/a | 0.249 | 3.706 | n/a | n/a | 0.023 | 3.140 | 0.368 | 0.023 | gw-w/thread-1332/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.612 | 0.000 | 0.000 | 0.413 | 3.976 | n/a | 0.000 | 0.109 | 0.988 | 2.233 | 0.018 | n/a | 0.132 | 10.399 | n/a | n/a | 0.028 | 4.468 | 0.231 | 0.028 |
| p99 | 506.097 | 1.751 | 0.030 | 1.590 | 12.114 | n/a | 0.845 | 1.180 | 11.679 | 38.040 | 0.087 | n/a | 1.151 | 497.051 | n/a | n/a | 0.093 | 12.965 | 0.464 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a0000000000000161 | 506.097 | 4.187 | 0.151 | 0.231 | 0.066 | 1.184 | 3.052 | 0.044 | n/a | 0.102 | 497.051 | n/a | n/a | 0.028 | 4.636 | 0.009 | 0.028 | gw-w/thread-1321/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.110ms; driver.reader-basis.broadcast 0.081ms; driver.reader-basis.broadcast 0.039ms; driver.reader-basis.broadcast 0.038ms; driver.reader-basis.broadcast 0.037ms |
| 1e1ad46b8a14058a0000000000000141 | 58.281 | 4.265 | 0.134 | 0.000 | 0.069 | 2.056 | 38.040 | 0.029 | n/a | 0.097 | 13.565 | n/a | n/a | 0.025 | 4.468 | 0.077 | 0.025 | gw-w/thread-1342/gateway.admitted-work | driver.reader-basis.broadcast 0.070ms |
| 1e1ad46b8a14058a0000000000000137 | 42.459 | 11.830 | n/a | 0.000 | 1.136 | 2.090 | 7.257 | 0.035 | n/a | 0.143 | 19.877 | n/a | n/a | 0.093 | 12.965 | 0.305 | 0.093 | gw-w/thread-1284/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| 1e1ad46b8a14058a0000000000000120 | 37.719 | 5.235 | 0.183 | 0.287 | 0.067 | 0.988 | 9.007 | 0.018 | n/a | 0.057 | 21.852 | n/a | n/a | 0.026 | 5.773 | 0.153 | 0.026 | gw-w/thread-1280/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 1e1ad46b8a14058a000000000000014f | 36.456 | 3.055 | n/a | 0.000 | 0.931 | 0.554 | 20.698 | 0.087 | n/a | 0.113 | 10.961 | n/a | n/a | 0.058 | 3.986 | 0.109 | 0.058 | gw-w/thread-1271/commit.prepare-and-validate | none observed |
| 1e1ad46b8a14058a0000000000000125 | 34.190 | 7.022 | 0.139 | 0.501 | 0.066 | 1.378 | 4.941 | 0.021 | n/a | 0.083 | 20.015 | n/a | n/a | 0.025 | 7.727 | 0.226 | 0.025 | gw-w/thread-1342/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 1e1ad46b8a14058a0000000000000135 | 34.129 | 6.138 | 0.162 | 0.000 | 0.066 | 1.064 | 5.275 | 0.016 | n/a | 0.057 | 21.327 | n/a | n/a | 0.025 | 6.366 | 0.187 | 0.025 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| 1e1ad46b8a14058a000000000000014d | 33.644 | 4.109 | 0.185 | 0.000 | 0.067 | 1.102 | 5.684 | 0.027 | n/a | 0.422 | 22.021 | n/a | n/a | 0.026 | 4.361 | 0.130 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 1e1ad46b8a14058a000000000000011d | 32.751 | 3.798 | 4.885 | 0.845 | 0.093 | 1.164 | 7.841 | 0.030 | n/a | 0.353 | 13.706 | n/a | n/a | 0.036 | 9.622 | 0.294 | 0.036 | gw-w/thread-1335/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 1e1ad46b8a14058a0000000000000133 | 30.969 | 12.114 | 0.202 | 0.337 | 0.109 | 1.994 | 4.777 | 0.019 | n/a | 0.047 | 11.332 | n/a | n/a | 0.039 | 12.762 | 0.412 | 0.039 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 1e1ad46b8a14058a000000000000013f | 30.677 | 7.115 | 0.221 | 0.000 | 0.063 | 2.057 | 4.534 | 0.016 | n/a | 0.065 | 16.580 | n/a | n/a | 0.025 | 7.399 | 0.241 | 0.025 | gw-w/thread-1348/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 1e1ad46b8a14058a0000000000000122 | 30.432 | 1.758 | n/a | 0.000 | 0.375 | 0.560 | 2.292 | 0.009 | n/a | 0.034 | 25.382 | n/a | n/a | 0.023 | 2.133 | 0.070 | 0.023 | gw-w/thread-1348/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a0000000000000157 | 29.143 | 4.824 | 0.151 | 0.655 | 0.070 | 11.679 | 5.198 | 0.018 | n/a | 0.290 | 6.229 | n/a | n/a | 0.029 | 5.699 | 0.196 | 0.029 | node-196/thread-8/socket.wait-first-byte | driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a000000000000011a | 28.019 | 5.741 | n/a | 0.000 | 1.138 | 2.291 | 2.712 | 0.020 | n/a | 1.151 | 14.925 | n/a | n/a | 0.042 | 6.878 | 0.245 | 0.042 | gw-w/thread-1274/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.942ms |
| 1e1ad46b8a14058a000000000000015f | 27.594 | 7.451 | 0.126 | 0.268 | 0.068 | 2.353 | 10.280 | 0.030 | n/a | 0.386 | 6.601 | n/a | n/a | 0.028 | 7.915 | 0.287 | 0.028 | gw-w/thread-1340/gateway.admitted-work | driver.reader-basis.broadcast 0.037ms |
| 1e1ad46b8a14058a0000000000000127 | 24.653 | 4.364 | n/a | 0.000 | 0.675 | 0.680 | 1.627 | 0.033 | n/a | 0.801 | 16.448 | n/a | n/a | 0.025 | 5.039 | 0.204 | 0.025 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| 1e1ad46b8a14058a000000000000015b | 24.125 | 2.514 | n/a | 0.000 | 0.986 | 0.609 | 1.191 | 0.010 | n/a | 0.345 | 18.445 | n/a | n/a | 0.024 | 3.500 | 0.145 | 0.024 | gw-w/thread-1313/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000143 | 23.424 | 4.801 | n/a | 0.000 | 1.180 | 0.827 | 1.127 | 0.010 | n/a | 0.300 | 15.125 | n/a | n/a | 0.053 | 5.981 | 0.255 | 0.053 | gw-w/thread-1333/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000131 | 21.433 | 2.105 | n/a | 0.000 | 0.412 | 0.868 | 1.553 | 0.020 | n/a | 0.102 | 16.347 | n/a | n/a | 0.027 | 2.517 | 0.117 | 0.027 | gw-w/thread-1332/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000139 | 20.753 | 3.976 | 0.193 | 0.520 | 0.061 | 1.042 | 7.489 | 0.015 | n/a | 0.040 | 7.393 | n/a | n/a | 0.024 | 4.750 | 0.229 | 0.024 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.557 | 0.000 | 0.000 | 0.424 | 2.045 | n/a | 0.000 | 0.666 | 0.554 | 0.956 | 0.011 | n/a | 0.113 | 10.291 | n/a | n/a | 0.029 | 2.517 | 0.183 | 0.029 |
| p99 | 36.456 | 1.751 | 0.030 | 0.668 | 3.055 | n/a | 0.000 | 1.080 | 0.868 | 20.698 | 0.087 | n/a | 0.400 | 25.382 | n/a | n/a | 0.058 | 3.986 | 0.371 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a000000000000014f | 36.456 | 3.055 | n/a | 0.000 | 0.931 | 0.554 | 20.698 | 0.087 | n/a | 0.113 | 10.961 | n/a | n/a | 0.058 | 3.986 | 0.109 | 0.058 | gw-w/thread-1271/commit.prepare-and-validate | none observed |
| 1e1ad46b8a14058a0000000000000122 | 30.432 | 1.758 | n/a | 0.000 | 0.375 | 0.560 | 2.292 | 0.009 | n/a | 0.034 | 25.382 | n/a | n/a | 0.023 | 2.133 | 0.070 | 0.023 | gw-w/thread-1348/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| 1e1ad46b8a14058a0000000000000131 | 21.433 | 2.105 | n/a | 0.000 | 0.412 | 0.868 | 1.553 | 0.020 | n/a | 0.102 | 16.347 | n/a | n/a | 0.027 | 2.517 | 0.117 | 0.027 | gw-w/thread-1332/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000012a | 18.179 | 2.045 | n/a | 0.000 | 0.438 | 0.476 | 1.016 | 0.010 | n/a | 0.057 | 14.108 | n/a | n/a | 0.029 | 2.483 | 0.137 | 0.029 | gw-w/thread-1334/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000012d | 16.960 | 2.336 | n/a | 0.000 | 0.149 | 0.739 | 0.949 | 0.011 | n/a | 0.263 | 12.488 | n/a | n/a | 0.026 | 2.485 | 0.147 | 0.026 | gw-w/thread-1340/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000119 | 15.904 | 1.857 | n/a | 0.000 | 1.051 | 0.840 | 1.644 | 0.030 | n/a | 0.160 | 10.291 | n/a | n/a | 0.031 | 2.907 | 0.183 | 0.031 | gw-w/thread-1345/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000147 | 15.800 | 1.595 | n/a | 0.000 | 0.962 | 0.291 | 0.838 | 0.011 | n/a | 0.070 | 12.016 | n/a | n/a | 0.017 | 2.557 | 0.162 | 0.017 | gw-w/thread-1277/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 1e1ad46b8a14058a000000000000012f | 13.557 | 1.691 | n/a | 0.000 | 0.110 | 0.532 | 0.743 | 0.008 | n/a | 0.047 | 10.399 | n/a | n/a | 0.029 | 1.801 | 0.133 | 0.029 | gw-w/thread-1321/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000013d | 11.260 | 2.685 | n/a | 0.000 | 1.021 | 0.750 | 1.474 | 0.019 | n/a | 0.132 | 5.135 | n/a | n/a | 0.043 | 3.707 | 0.329 | 0.043 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000159 | 10.943 | 2.564 | n/a | 0.000 | 0.666 | 0.518 | 0.720 | 0.009 | n/a | 0.291 | 6.132 | n/a | n/a | 0.043 | 3.230 | 0.295 | 0.043 | gw-w/thread-1348/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000014b | 10.391 | 2.402 | n/a | 0.000 | 0.991 | 0.680 | 0.818 | 0.010 | n/a | 0.083 | 5.377 | n/a | n/a | 0.029 | 3.394 | 0.327 | 0.029 | gw-w/thread-1344/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000153 | 10.119 | 2.673 | n/a | 0.000 | 1.080 | 0.770 | 0.888 | 0.009 | n/a | 0.254 | 4.398 | n/a | n/a | 0.048 | 3.753 | 0.371 | 0.048 | gw-w/thread-1318/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000115 | 10.021 | 1.911 | n/a | 0.000 | 0.071 | 0.541 | 0.956 | 0.011 | n/a | 0.061 | 6.440 | n/a | n/a | 0.029 | 1.982 | 0.198 | 0.029 | gw-w/thread-1323/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000113 | 8.880 | 1.594 | n/a | 0.000 | 0.683 | 0.546 | 0.779 | 0.010 | n/a | 0.245 | 5.001 | n/a | n/a | 0.023 | 2.276 | 0.256 | 0.023 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a0000000000000163 | 8.507 | 1.702 | n/a | 0.000 | 0.266 | 0.506 | 1.336 | 0.014 | n/a | 0.400 | 4.260 | n/a | n/a | 0.022 | 1.968 | 0.231 | 0.022 | gw-w/thread-1346/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.150 | 0.109 | 0.000 | 0.475 | 2.075 | n/a | 0.000 | 0.708 | 0.512 | 0.829 | 0.008 | n/a | 0.057 | 4.874 | n/a | n/a | 0.014 | 3.004 | 0.304 | 0.014 |
| p99 | 45.933 | 2.015 | 0.027 | 1.997 | 6.607 | n/a | 0.269 | 17.040 | 6.488 | 5.376 | 0.033 | n/a | 1.612 | 24.724 | n/a | n/a | 0.051 | 19.366 | 0.749 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a000000000000175f | 114.879 | 3.631 | n/a | 0.000 | 12.245 | 0.367 | 1.350 | 0.009 | n/a | 0.029 | 97.238 | n/a | n/a | 0.011 | 15.876 | 0.138 | 0.011 | gw-w/thread-1284/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 81.331ms; driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 2.885ms; driver.publication.persist-deferred 2.606ms; driver.reader-basis.broadcast 0.260ms |
| 1e1ad46b8a14058a00000000000001bd | 104.017 | 2.974 | 0.137 | 0.256 | 0.046 | 0.857 | 5.321 | 0.026 | n/a | 0.060 | 94.319 | n/a | n/a | 0.021 | 3.414 | 0.033 | 0.021 | gw-w/thread-1344/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.161ms |
| 1e1ad46b8a14058a00000000000019d7 | 72.970 | 8.621 | n/a | 0.000 | 4.521 | 4.448 | 1.912 | 0.023 | n/a | 0.178 | 53.261 | n/a | n/a | 0.007 | 13.141 | 0.180 | 0.007 | gw-w/thread-1285/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.223ms; driver.publication.persist-deferred 1.749ms; driver.publication.persist-deferred 1.275ms; driver.reader-basis.broadcast 0.650ms |
| 1e1ad46b8a14058a00000000000019d8 | 72.093 | 5.795 | n/a | 0.000 | 0.607 | 7.037 | 2.184 | 0.030 | n/a | 0.121 | 56.309 | n/a | n/a | 0.010 | 6.402 | 0.089 | 0.010 | gw-w/thread-1312/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.223ms; driver.publication.persist-deferred 1.749ms; driver.reader-basis.broadcast 0.650ms |
| 1e1ad46b8a14058a000000000000166b | 67.879 | 1.216 | n/a | 0.000 | 0.432 | 3.034 | 0.536 | 0.007 | n/a | 0.028 | 62.613 | n/a | n/a | 0.013 | 1.648 | 0.024 | 0.013 | gw-w/thread-1278/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.063ms |
| 1e1ad46b8a14058a00000000000012e3 | 66.761 | 3.323 | n/a | 0.000 | 0.505 | 0.612 | 0.897 | 0.009 | n/a | 0.067 | 61.322 | n/a | n/a | 0.026 | 3.829 | 0.057 | 0.026 | gw-w/thread-1278/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000018d4 | 62.417 | 1.733 | n/a | 0.000 | 0.269 | 12.760 | 19.616 | 0.002 | n/a | 0.008 | 28.012 | n/a | n/a | 0.017 | 2.002 | 0.032 | 0.017 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 7.575ms; driver.reader-basis.broadcast 0.352ms |
| 1e1ad46b8a14058a0000000000000517 | 61.822 | 1.607 | n/a | 0.000 | 2.825 | 0.460 | 0.719 | 0.008 | n/a | 0.171 | 56.022 | n/a | n/a | 0.010 | 4.432 | 0.072 | 0.010 | gw-w/thread-1347/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.980ms; driver.reader-basis.broadcast 0.230ms |
| 1e1ad46b8a14058a000000000000166c | 61.268 | 4.069 | n/a | 0.000 | 0.420 | 0.418 | 0.739 | 0.004 | n/a | 0.020 | 55.576 | n/a | n/a | 0.021 | 4.489 | 0.073 | 0.021 | gw-w/thread-1277/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a00000000000018d5 | 60.107 | 1.259 | n/a | 0.000 | 1.058 | 11.429 | 19.005 | 0.002 | n/a | 0.006 | 27.342 | n/a | n/a | 0.006 | 2.316 | 0.039 | 0.006 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 7.575ms; driver.reader-basis.broadcast 0.352ms |
| 1e1ad46b8a14058a0000000000000767 | 57.331 | 3.573 | n/a | 0.000 | 43.599 | 0.476 | 1.635 | 0.013 | n/a | 0.349 | 7.676 | n/a | n/a | 0.012 | 47.172 | 0.823 | 0.012 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.424ms; driver.publication.persist-deferred 1.309ms; driver.publication.persist-deferred 1.245ms; driver.publication.persist-deferred 1.243ms; driver.publication.persist-deferred 1.236ms |
| 1e1ad46b8a14058a0000000000001102 | 57.255 | 1.522 | n/a | 0.000 | 43.745 | 0.413 | 0.630 | 0.007 | n/a | 0.030 | 10.895 | n/a | n/a | 0.012 | 45.267 | 0.791 | 0.012 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.128ms; driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.859ms; driver.publication.persist-deferred 0.835ms |
| 1e1ad46b8a14058a0000000000001768 | 56.658 | 1.666 | n/a | 0.000 | 47.809 | 0.326 | 0.839 | 0.009 | n/a | 0.063 | 5.940 | n/a | n/a | 0.008 | 49.475 | 0.873 | 0.008 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 11.157ms; driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 3.991ms; driver.publication.persist-deferred 3.013ms; driver.publication.persist-deferred 2.991ms |
| 1e1ad46b8a14058a0000000000001769 | 55.978 | 1.735 | n/a | 0.000 | 49.394 | 0.247 | 0.674 | 0.007 | n/a | 0.038 | 3.875 | n/a | n/a | 0.007 | 51.129 | 0.913 | 0.007 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 3.991ms; driver.publication.persist-deferred 3.837ms; driver.publication.persist-deferred 3.365ms; driver.publication.persist-deferred 3.013ms |
| 1e1ad46b8a14058a00000000000019da | 54.912 | 5.375 | n/a | 0.000 | 0.266 | 1.826 | 0.925 | 0.010 | n/a | 0.050 | 46.436 | n/a | n/a | 0.025 | 5.641 | 0.103 | 0.025 | gw-w/thread-1346/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.650ms |
| 1e1ad46b8a14058a0000000000001764 | 54.729 | 1.390 | n/a | 0.000 | 42.767 | 0.789 | 0.804 | 0.009 | n/a | 0.029 | 8.926 | n/a | n/a | 0.016 | 44.157 | 0.807 | 0.016 | node-196/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 37.085ms; driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 3.013ms; driver.reader-basis.broadcast 0.260ms |
| 1e1ad46b8a14058a000000000000088a | 54.575 | 1.210 | n/a | 0.000 | 42.759 | 0.376 | 0.894 | 0.017 | n/a | 0.130 | 9.178 | n/a | n/a | 0.010 | 43.969 | 0.806 | 0.010 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 0.929ms |
| 1e1ad46b8a14058a0000000000001770 | 54.093 | 1.218 | n/a | 0.000 | 48.306 | 0.478 | 1.096 | 0.014 | n/a | 0.279 | 2.692 | n/a | n/a | 0.009 | 49.524 | 0.916 | 0.009 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 5.325ms; driver.publication.persist-deferred 3.569ms; driver.publication.persist-deferred 3.365ms; driver.publication.persist-deferred 3.338ms; driver.publication.persist-deferred 2.530ms |
| 1e1ad46b8a14058a0000000000001767 | 53.313 | 2.611 | n/a | 0.000 | 43.254 | 0.283 | 0.885 | 0.009 | n/a | 0.219 | 6.042 | n/a | n/a | 0.009 | 45.866 | 0.860 | 0.009 | node-196/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 16.724ms; driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 3.991ms; driver.publication.persist-deferred 3.013ms; driver.publication.persist-deferred 2.991ms |
| 1e1ad46b8a14058a0000000000000f7f | 51.774 | 1.386 | n/a | 0.000 | 0.800 | 0.331 | 0.649 | 0.007 | n/a | 0.056 | 48.538 | n/a | n/a | 0.009 | 2.185 | 0.042 | 0.009 | gw-w/thread-1334/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (2079 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.686 | 0.000 | 0.000 | 0.369 | 1.621 | n/a | 0.000 | 0.742 | 0.496 | 0.697 | 0.008 | n/a | 0.056 | 4.103 | n/a | n/a | 0.014 | 2.487 | 0.296 | 0.014 |
| p99 | 39.360 | 1.883 | 0.018 | 0.863 | 4.792 | n/a | 0.000 | 16.648 | 7.178 | 2.752 | 0.031 | n/a | 1.581 | 19.676 | n/a | n/a | 0.047 | 17.806 | 0.746 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e1ad46b8a14058a00000000000019d8 | 72.093 | 5.795 | n/a | 0.000 | 0.607 | 7.037 | 2.184 | 0.030 | n/a | 0.121 | 56.309 | n/a | n/a | 0.010 | 6.402 | 0.089 | 0.010 | gw-w/thread-1312/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 4.223ms; driver.publication.persist-deferred 1.749ms; driver.reader-basis.broadcast 0.650ms |
| 1e1ad46b8a14058a000000000000166b | 67.879 | 1.216 | n/a | 0.000 | 0.432 | 3.034 | 0.536 | 0.007 | n/a | 0.028 | 62.613 | n/a | n/a | 0.013 | 1.648 | 0.024 | 0.013 | gw-w/thread-1278/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.063ms |
| 1e1ad46b8a14058a0000000000000517 | 61.822 | 1.607 | n/a | 0.000 | 2.825 | 0.460 | 0.719 | 0.008 | n/a | 0.171 | 56.022 | n/a | n/a | 0.010 | 4.432 | 0.072 | 0.010 | gw-w/thread-1347/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.980ms; driver.reader-basis.broadcast 0.230ms |
| 1e1ad46b8a14058a00000000000018d5 | 60.107 | 1.259 | n/a | 0.000 | 1.058 | 11.429 | 19.005 | 0.002 | n/a | 0.006 | 27.342 | n/a | n/a | 0.006 | 2.316 | 0.039 | 0.006 | gw-w/thread-1282/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 7.575ms; driver.reader-basis.broadcast 0.352ms |
| 1e1ad46b8a14058a0000000000001102 | 57.255 | 1.522 | n/a | 0.000 | 43.745 | 0.413 | 0.630 | 0.007 | n/a | 0.030 | 10.895 | n/a | n/a | 0.012 | 45.267 | 0.791 | 0.012 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.252ms; driver.publication.persist-deferred 1.128ms; driver.publication.persist-deferred 0.963ms; driver.publication.persist-deferred 0.859ms; driver.publication.persist-deferred 0.835ms |
| 1e1ad46b8a14058a0000000000001764 | 54.729 | 1.390 | n/a | 0.000 | 42.767 | 0.789 | 0.804 | 0.009 | n/a | 0.029 | 8.926 | n/a | n/a | 0.016 | 44.157 | 0.807 | 0.016 | node-196/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 37.085ms; driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 3.013ms; driver.reader-basis.broadcast 0.260ms |
| 1e1ad46b8a14058a000000000000088a | 54.575 | 1.210 | n/a | 0.000 | 42.759 | 0.376 | 0.894 | 0.017 | n/a | 0.130 | 9.178 | n/a | n/a | 0.010 | 43.969 | 0.806 | 0.010 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 0.929ms |
| 1e1ad46b8a14058a0000000000001770 | 54.093 | 1.218 | n/a | 0.000 | 48.306 | 0.478 | 1.096 | 0.014 | n/a | 0.279 | 2.692 | n/a | n/a | 0.009 | 49.524 | 0.916 | 0.009 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 5.325ms; driver.publication.persist-deferred 3.569ms; driver.publication.persist-deferred 3.365ms; driver.publication.persist-deferred 3.338ms; driver.publication.persist-deferred 2.530ms |
| 1e1ad46b8a14058a0000000000000f7f | 51.774 | 1.386 | n/a | 0.000 | 0.800 | 0.331 | 0.649 | 0.007 | n/a | 0.056 | 48.538 | n/a | n/a | 0.009 | 2.185 | 0.042 | 0.009 | gw-w/thread-1334/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000166d | 51.690 | 1.401 | n/a | 0.000 | 1.085 | 3.355 | 0.477 | 0.007 | n/a | 0.031 | 45.317 | n/a | n/a | 0.019 | 2.486 | 0.048 | 0.019 | gw-w/thread-1344/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.063ms |
| 1e1ad46b8a14058a000000000000088c | 51.128 | 1.159 | n/a | 0.000 | 43.764 | 1.754 | 0.502 | 0.009 | n/a | 0.042 | 3.886 | n/a | n/a | 0.012 | 44.923 | 0.879 | 0.012 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 1.223ms; driver.publication.persist-deferred 0.929ms; driver.publication.persist-deferred 0.782ms |
| 1e1ad46b8a14058a0000000000000764 | 49.589 | 2.731 | n/a | 0.000 | 27.739 | 1.780 | 0.890 | 0.007 | n/a | 0.037 | 16.376 | n/a | n/a | 0.030 | 30.470 | 0.614 | 0.030 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.424ms; driver.publication.persist-deferred 1.245ms; driver.publication.persist-deferred 1.243ms; driver.publication.persist-deferred 1.236ms; driver.publication.persist-deferred 1.180ms |
| 1e1ad46b8a14058a0000000000000889 | 49.034 | 1.438 | n/a | 0.000 | 0.642 | 0.377 | 0.910 | 0.008 | n/a | 0.037 | 45.610 | n/a | n/a | 0.011 | 2.080 | 0.042 | 0.011 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | none observed |
| 1e1ad46b8a14058a000000000000088e | 48.130 | 1.466 | n/a | 0.000 | 42.318 | 0.380 | 0.717 | 0.009 | n/a | 0.062 | 3.167 | n/a | n/a | 0.011 | 43.784 | 0.910 | 0.011 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 1.223ms; driver.publication.persist-deferred 1.081ms; driver.publication.persist-deferred 0.929ms; driver.publication.persist-deferred 0.782ms |
| 1e1ad46b8a14058a0000000000001765 | 47.755 | 1.527 | n/a | 0.000 | 31.530 | 4.995 | 0.337 | 0.004 | n/a | 0.006 | 9.352 | n/a | n/a | 0.006 | 33.056 | 0.692 | 0.006 | node-196/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 25.633ms; driver.publication.persist-deferred 5.253ms; driver.publication.persist-deferred 3.991ms; driver.publication.persist-deferred 3.013ms; driver.reader-basis.broadcast 0.260ms |
| 1e1ad46b8a14058a000000000000176b | 47.589 | 1.657 | n/a | 0.000 | 38.600 | 1.022 | 0.626 | 0.006 | n/a | 0.036 | 5.635 | n/a | n/a | 0.007 | 40.256 | 0.846 | 0.007 | node-196/thread-0/driver.queue.subject | driver.publication.persist-deferred 5.325ms; driver.publication.persist-deferred 3.991ms; driver.publication.persist-deferred 3.365ms; driver.publication.persist-deferred 2.991ms; driver.publication.persist-deferred 2.667ms |
| 1e1ad46b8a14058a000000000000088b | 45.933 | 4.533 | n/a | 0.000 | 0.797 | 3.672 | 2.217 | 0.019 | n/a | 0.098 | 34.579 | n/a | n/a | 0.018 | 5.330 | 0.116 | 0.018 | gw-w/thread-1270/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.241ms; driver.publication.persist-deferred 0.929ms |
| 1e1ad46b8a14058a000000000000051a | 44.446 | 1.671 | n/a | 0.000 | 1.241 | 1.545 | 1.864 | 0.011 | n/a | 0.033 | 38.067 | n/a | n/a | 0.014 | 2.913 | 0.066 | 0.014 | gw-w/thread-1323/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.182ms; driver.publication.persist-deferred 1.156ms; driver.reader-basis.broadcast 0.230ms |
| 1e1ad46b8a14058a0000000000000f80 | 42.878 | 1.885 | n/a | 0.000 | 0.673 | 0.511 | 0.756 | 0.007 | n/a | 0.040 | 38.982 | n/a | n/a | 0.022 | 2.559 | 0.060 | 0.022 | gw-w/thread-1345/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.078ms |
| 1e1ad46b8a14058a0000000000000852 | 42.002 | 1.807 | n/a | 0.000 | 34.098 | 0.389 | 0.507 | 0.006 | n/a | 0.029 | 5.153 | n/a | n/a | 0.013 | 35.905 | 0.855 | 0.013 | node-196/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.530ms; driver.publication.persist-deferred 1.365ms; driver.publication.persist-deferred 1.146ms; driver.publication.persist-deferred 1.014ms; driver.publication.persist-deferred 0.986ms |

## P1 / warmup / read (2153 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 266.630 | n/a | n/a | n/a | 0.175 | n/a | 0.000 | 266.562 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.142 | 266.629 | 1.000 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3969d97ab397d7fe00000000000448e8 | 371.076 | 0.128 | n/a | 0.000 | 370.947 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 371.074 | 1.000 | 0.002 | node-196/thread-5/reader.straddle-await-ack | none observed |
| ff82687065501985000000000004912a | 370.806 | 0.276 | n/a | 0.000 | 370.529 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.805 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff82687065501985000000000004912b | 370.684 | 0.047 | n/a | 0.000 | 370.634 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 370.681 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff826870655019850000000000049129 | 370.676 | 0.031 | n/a | 0.000 | 370.643 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.675 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000004537a | 370.672 | 0.310 | n/a | 0.000 | 370.361 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 370.671 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000004537b | 370.663 | 0.085 | n/a | 0.000 | 370.577 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.662 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000004537c | 370.656 | 0.042 | n/a | 0.000 | 370.612 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.655 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| ff826870655019850000000000049128 | 370.649 | 0.153 | n/a | 0.000 | 370.493 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 370.646 | 1.000 | 0.003 | node-196/thread-6/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe000000000004492c | 370.235 | 0.013 | n/a | 0.000 | 370.221 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.235 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe000000000004492b | 370.226 | 0.014 | n/a | 0.000 | 370.211 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.225 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe000000000004492a | 370.217 | 0.016 | n/a | 0.000 | 370.200 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.216 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe0000000000044929 | 370.208 | 0.021 | n/a | 0.000 | 370.186 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 370.206 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000000453c2 | 369.884 | 0.026 | n/a | 0.000 | 369.857 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.883 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000000453c1 | 369.864 | 0.015 | n/a | 0.000 | 369.848 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.864 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000000453c0 | 369.857 | 0.025 | n/a | 0.000 | 369.831 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.856 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| ff826870655019850000000000049163 | 369.004 | 0.088 | n/a | 0.000 | 368.914 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.002 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff826870655019850000000000004a1a | 268.438 | 0.031 | n/a | 0.000 | 268.406 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.437 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff826870655019850000000000004a19 | 268.401 | 0.031 | n/a | 0.000 | 268.369 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.400 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff826870655019850000000000004a18 | 268.365 | 0.034 | n/a | 0.000 | 268.330 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.363 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff826870655019850000000000004a17 | 268.331 | 0.064 | n/a | 0.000 | 268.264 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.329 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1 / read (708 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 261.376 | n/a | n/a | n/a | 0.149 | n/a | 0.000 | 261.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.087 | 261.373 | 1.000 | 0.087 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7efb84713a71422d000000000010aa5a | 271.678 | 0.120 | n/a | 0.000 | 271.556 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.676 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 7efb84713a71422d00000000000fb908 | 270.982 | 0.125 | n/a | 0.000 | 270.854 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.980 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000011114b | 270.726 | 0.123 | n/a | 0.000 | 270.601 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.724 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000010726a | 269.365 | 0.098 | n/a | 0.000 | 269.266 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.364 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000000fcf98 | 269.206 | 0.155 | n/a | 0.000 | 269.048 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.203 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000001161e3 | 266.007 | 0.096 | n/a | 0.000 | 265.910 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.006 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d0000000000145ded | 264.810 | 0.112 | n/a | 0.000 | 264.695 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.808 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000000bb4bf | 261.376 | 0.149 | n/a | 0.000 | 261.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 261.373 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d0000000000143b81 | 260.970 | 0.105 | n/a | 0.000 | 260.864 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 260.969 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000000d7e78 | 260.907 | 0.173 | n/a | 0.000 | 260.732 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 260.905 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000001117c0 | 260.517 | 0.126 | n/a | 0.000 | 260.388 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 260.514 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000013518e | 260.351 | 0.159 | n/a | 0.000 | 260.189 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 260.349 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000001236fd | 260.239 | 0.226 | n/a | 0.000 | 260.010 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 260.236 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 7efb84713a71422d00000000001118b9 | 259.136 | 0.100 | n/a | 0.000 | 259.034 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 259.134 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 7efb84713a71422d00000000000bd6ba | 257.431 | 0.140 | n/a | 0.000 | 257.287 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 257.428 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 7efb84713a71422d000000000010fd0a | 257.403 | 0.219 | n/a | 0.000 | 257.180 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 257.399 | 1.000 | 0.004 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000010fd12 | 170.898 | 0.129 | n/a | 0.000 | 170.760 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 170.890 | 1.000 | 0.009 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 7efb84713a71422d00000000001118c1 | 49.677 | 0.116 | n/a | 0.000 | 49.556 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 49.672 | 1.000 | 0.005 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 7efb84713a71422d000000000010fd25 | 48.918 | 16.141 | n/a | 0.000 | 0.000 | 0.645 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.133 | 16.141 | 0.330 | 32.133 | node-196/thread-4/socket.wait-first-byte | replica.apply-delta 0.032ms; replica.apply-delta 0.026ms |
| 7efb84713a71422d000000000009f7a1 | 29.632 | 20.985 | n/a | 3.188 | 0.000 | 0.651 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.808 | 24.173 | 0.816 | 4.808 | node-196/thread-4/reader.execute | none observed |

## P1 / L4 / read (1967 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 270.955 | n/a | n/a | n/a | 0.192 | n/a | 0.000 | 270.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.120 | 270.952 | 1.000 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7efb84713a71422d00000000001ce8fd | 534.216 | 0.027 | n/a | 0.000 | 534.188 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 534.215 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| ff82687065501985000000000010ca0c | 534.214 | 0.088 | n/a | 0.000 | 534.124 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 534.212 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe000000000010815e | 534.189 | 0.118 | n/a | 0.000 | 534.068 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 534.186 | 1.000 | 0.003 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000001ce8fc | 534.163 | 0.103 | n/a | 0.000 | 534.057 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 534.160 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe00000000000b6590 | 300.917 | 0.249 | n/a | 0.000 | 300.666 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.915 | 1.000 | 0.002 | node-196/thread-5/reader.straddle-await-ack | none observed |
| ff8268706550198500000000000baf16 | 300.580 | 0.106 | n/a | 0.000 | 300.471 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.578 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000016fdd5 | 300.357 | 0.131 | n/a | 0.000 | 300.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.355 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d000000000016fdd6 | 300.354 | 0.024 | n/a | 0.000 | 300.330 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.354 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000001a0a4e | 273.199 | 0.246 | n/a | 0.000 | 272.951 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.197 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000001a0a54 | 273.157 | 0.110 | n/a | 0.000 | 273.047 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.156 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| ff8268706550198500000000000e51e4 | 273.048 | 0.117 | n/a | 0.000 | 272.929 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.046 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe00000000000e0605 | 272.918 | 0.313 | n/a | 0.000 | 272.602 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.915 | 1.000 | 0.003 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 7efb84713a71422d0000000000187222 | 271.264 | 0.039 | n/a | 0.000 | 271.224 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.263 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d0000000000187221 | 271.209 | 0.090 | n/a | 0.000 | 271.117 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.207 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe00000000000caa88 | 271.184 | 0.077 | n/a | 0.000 | 271.105 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.182 | 1.000 | 0.002 | node-196/thread-5/reader.straddle-await-ack | none observed |
| ff8268706550198500000000000cec9a | 271.162 | 0.183 | n/a | 0.000 | 270.975 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.158 | 1.000 | 0.004 | node-196/thread-6/reader.straddle-await-ack | none observed |
| ff8268706550198500000000000a7269 | 271.151 | 0.098 | n/a | 0.000 | 271.051 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.149 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | none observed |
| 7efb84713a71422d0000000000157c33 | 270.973 | 0.025 | n/a | 0.000 | 270.947 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.972 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 3969d97ab397d7fe00000000000a1b4a | 270.961 | 0.104 | n/a | 0.000 | 270.856 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.959 | 1.000 | 0.002 | node-196/thread-5/reader.straddle-await-ack | none observed |
| 7efb84713a71422d0000000000157c32 | 270.955 | 0.140 | n/a | 0.000 | 270.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.952 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2244 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 285.790 | n/a | n/a | n/a | 0.216 | n/a | 0.000 | 285.762 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.201 | 285.789 | 1.000 | 0.201 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ff82687065501985000000000016e08a | 292.371 | 0.012 | n/a | 0.000 | 292.358 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.371 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| ff82687065501985000000000016e089 | 292.361 | 0.013 | n/a | 0.000 | 292.347 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.360 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| ff82687065501985000000000016e088 | 292.355 | 0.020 | n/a | 0.000 | 292.334 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.354 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| ff82687065501985000000000016e087 | 292.340 | 0.018 | n/a | 0.000 | 292.321 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.339 | 1.000 | 0.001 | node-196/thread-6/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| ff82687065501985000000000016e086 | 292.328 | 0.104 | n/a | 0.000 | 292.222 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.326 | 1.000 | 0.002 | node-196/thread-6/reader.straddle-await-ack | replica.apply-delta 0.046ms |
| 3969d97ab397d7fe000000000016870f | 291.923 | 0.023 | n/a | 0.000 | 291.899 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.922 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 3969d97ab397d7fe000000000016870e | 291.892 | 0.045 | n/a | 0.000 | 291.846 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.891 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 3969d97ab397d7fe000000000016870d | 291.843 | 0.047 | n/a | 0.000 | 291.795 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.842 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 3969d97ab397d7fe000000000016870c | 291.789 | 0.030 | n/a | 0.000 | 291.758 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.788 | 1.000 | 0.001 | node-196/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 3969d97ab397d7fe000000000016870b | 291.719 | 0.152 | n/a | 0.000 | 291.564 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.716 | 1.000 | 0.003 | node-196/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 7efb84713a71422d0000000000236ada | 291.679 | 0.032 | n/a | 0.000 | 291.646 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.678 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7efb84713a71422d0000000000236ad9 | 291.648 | 0.040 | n/a | 0.000 | 291.607 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.648 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7efb84713a71422d0000000000236ad8 | 291.615 | 0.041 | n/a | 0.000 | 291.573 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.613 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7efb84713a71422d0000000000236ad7 | 291.584 | 0.080 | n/a | 0.000 | 291.504 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.583 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7efb84713a71422d0000000000236ad6 | 291.521 | 0.111 | n/a | 0.000 | 291.409 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.520 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7efb84713a71422d0000000000236ad5 | 291.391 | 0.150 | n/a | 0.000 | 291.238 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.388 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 7efb84713a71422d00000000002632dd | 287.933 | 0.240 | n/a | 0.000 | 287.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 287.928 | 1.000 | 0.004 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000002632f2 | 287.020 | 0.034 | n/a | 0.000 | 286.984 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.018 | 1.000 | 0.002 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000002632f1 | 286.997 | 0.026 | n/a | 0.000 | 286.968 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.994 | 1.000 | 0.003 | node-196/thread-4/reader.straddle-await-ack | none observed |
| 7efb84713a71422d00000000002632f0 | 286.978 | 0.045 | n/a | 0.000 | 286.932 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.977 | 1.000 | 0.001 | node-196/thread-4/reader.straddle-await-ack | none observed |

## P1 / tail / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 0.090 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7efb84713a71422d00000000002a21b7 | 0.090 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | uncovered | none observed |
| ff8268706550198500000000001db3ae | 0.068 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | uncovered | none observed |
| 7efb84713a71422d00000000002a21b5 | 0.056 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.056 | 0.000 | 0.000 | 0.056 | uncovered | none observed |
| 3969d97ab397d7fe00000000001d27fb | 0.045 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 0.000 | 0.000 | 0.045 | uncovered | none observed |
| ff8268706550198500000000001db3ab | 0.036 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.000 | 0.000 | 0.036 | uncovered | none observed |
| ff8268706550198500000000001db3ad | 0.017 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 | uncovered | none observed |
| 3969d97ab397d7fe00000000001d27fc | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| 7efb84713a71422d00000000002a21b8 | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |
| 3969d97ab397d7fe00000000001d27fd | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |
| ff8268706550198500000000001db3ac | 0.011 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 | uncovered | none observed |
| ff8268706550198500000000001db3af | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |
| 7efb84713a71422d00000000002a21b9 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |
| 7efb84713a71422d00000000002a21b6 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |
| 7efb84713a71422d00000000002a21ba | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 | uncovered | none observed |
| 3969d97ab397d7fe00000000001d27fe | 0.007 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 | uncovered | none observed |
| 3969d97ab397d7fe00000000001d27ff | 0.007 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 | uncovered | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1003.226 | n/a | n/a | n/a | 0.204 | n/a | 0.000 | 0.000 | 0.615 | 1001.264 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 1.131 | 0.204 | 0.000 | 1.131 |
| p99 | 1006.108 | n/a | n/a | n/a | 38.614 | n/a | 0.812 | 0.000 | 1.713 | 1002.924 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 1.258 | 39.427 | 0.047 | 1.258 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f1f069d88d63e5ff0000000000000017 | 1006.108 | 0.192 | n/a | 0.000 | 0.000 | 1.713 | 1002.924 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 1.258 | 0.192 | 0.000 | 1.258 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff0000000000000018 | 1003.226 | 0.204 | n/a | 0.000 | 0.000 | 0.615 | 1001.264 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 1.131 | 0.204 | 0.000 | 1.131 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000019 | 838.995 | 38.614 | n/a | 0.812 | 0.000 | 0.531 | 798.566 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.433 | 39.427 | 0.047 | 0.433 | gw-r/thread-43/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 437.411 | n/a | n/a | n/a | 2.507 | n/a | 0.000 | 0.000 | 1.051 | 431.891 | 0.008 | n/a | 0.027 | 0.000 | n/a | n/a | 0.081 | 2.507 | 0.008 | 0.081 |
| p99 | 1003.875 | n/a | n/a | n/a | 7.361 | n/a | 0.000 | 0.000 | 8.364 | 1000.805 | 0.324 | n/a | 0.048 | 0.000 | n/a | n/a | 3.408 | 7.361 | 0.479 | 3.408 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f1f069d88d63e5ff000000000000002e | 1003.875 | 2.213 | n/a | 0.000 | 0.000 | 0.750 | 1000.805 | 0.008 | n/a | 0.026 | 0.000 | n/a | n/a | 0.074 | 2.213 | 0.002 | 0.074 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000022 | 996.878 | 2.598 | n/a | 0.000 | 0.000 | 1.688 | 992.484 | 0.008 | n/a | 0.024 | 0.000 | n/a | n/a | 0.076 | 2.598 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff000000000000001f | 996.498 | 2.584 | n/a | 0.000 | 0.000 | 0.372 | 993.254 | 0.012 | n/a | 0.034 | 0.000 | n/a | n/a | 0.241 | 2.584 | 0.003 | 0.241 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff0000000000000028 | 995.282 | 2.298 | n/a | 0.000 | 0.000 | 3.361 | 989.510 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.081 | 2.298 | 0.002 | 0.081 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff000000000000002f | 994.839 | 4.887 | n/a | 0.000 | 0.000 | 0.545 | 989.297 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.076 | 4.887 | 0.005 | 0.076 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff000000000000001c | 976.402 | 2.173 | n/a | 0.000 | 0.000 | 2.236 | 971.855 | 0.015 | n/a | 0.042 | 0.000 | n/a | n/a | 0.081 | 2.173 | 0.002 | 0.081 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000035 | 928.043 | 7.361 | n/a | 0.000 | 0.000 | 0.579 | 919.909 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.171 | 7.361 | 0.008 | 0.171 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff0000000000000043 | 911.670 | 2.399 | n/a | 0.000 | 0.000 | 3.262 | 905.910 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.084 | 2.399 | 0.003 | 0.084 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff000000000000003e | 815.494 | 2.302 | n/a | 0.000 | 0.000 | 0.669 | 812.383 | 0.013 | n/a | 0.048 | 0.000 | n/a | n/a | 0.079 | 2.302 | 0.003 | 0.079 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000038 | 596.493 | 1.921 | n/a | 0.000 | 0.000 | 1.196 | 592.957 | 0.324 | n/a | 0.017 | 0.000 | n/a | n/a | 0.078 | 1.921 | 0.003 | 0.078 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff000000000000003b | 539.943 | 2.007 | n/a | 0.000 | 0.000 | 2.781 | 535.054 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.073 | 2.007 | 0.004 | 0.073 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff0000000000000027 | 509.916 | 6.403 | n/a | 0.000 | 0.000 | 1.846 | 501.410 | 0.012 | n/a | 0.038 | 0.000 | n/a | n/a | 0.208 | 6.403 | 0.013 | 0.208 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff0000000000000029 | 490.237 | 5.260 | n/a | 0.000 | 0.000 | 0.580 | 484.258 | 0.006 | n/a | 0.016 | 0.000 | n/a | n/a | 0.116 | 5.260 | 0.011 | 0.116 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff000000000000003d | 460.078 | 2.521 | n/a | 0.000 | 0.000 | 0.699 | 455.779 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 1.044 | 2.521 | 0.005 | 1.044 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff0000000000000034 | 437.411 | 4.886 | n/a | 0.000 | 0.000 | 0.523 | 431.891 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.083 | 4.886 | 0.011 | 0.083 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff000000000000003a | 409.992 | 2.362 | n/a | 0.000 | 0.000 | 1.267 | 406.250 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.073 | 2.362 | 0.006 | 0.073 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff000000000000002a | 336.792 | 2.792 | n/a | 0.000 | 0.000 | 3.486 | 330.401 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.076 | 2.792 | 0.008 | 0.076 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000030 | 316.964 | 2.228 | n/a | 0.000 | 0.000 | 0.548 | 314.067 | 0.010 | n/a | 0.029 | 0.000 | n/a | n/a | 0.083 | 2.228 | 0.007 | 0.083 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff0000000000000024 | 303.944 | 4.087 | n/a | 0.000 | 0.000 | 3.829 | 295.895 | 0.013 | n/a | 0.040 | 0.000 | n/a | n/a | 0.081 | 4.087 | 0.013 | 0.081 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff0000000000000031 | 250.768 | 1.885 | n/a | 0.000 | 0.000 | 1.450 | 247.302 | 0.013 | n/a | 0.042 | 0.000 | n/a | n/a | 0.076 | 1.885 | 0.008 | 0.076 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 423.264 | n/a | n/a | n/a | 2.814 | n/a | 0.000 | 0.000 | 0.610 | 416.232 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.101 | 2.814 | 0.008 | 0.101 |
| p99 | 1006.496 | n/a | n/a | n/a | 9.367 | n/a | 0.771 | 0.000 | 6.239 | 1001.771 | 0.043 | n/a | 0.058 | 0.000 | n/a | n/a | 46.488 | 10.139 | 0.588 | 46.488 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f1f069d88d63e5ff0000000000000072 | 1006.496 | 4.463 | n/a | 0.000 | 0.000 | 2.324 | 999.572 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.105 | 4.463 | 0.004 | 0.105 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff0000000000000079 | 1004.682 | 2.194 | n/a | 0.000 | 0.000 | 0.617 | 1001.771 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.069 | 2.194 | 0.002 | 0.069 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000081 | 1003.104 | 0.202 | n/a | 0.000 | 0.000 | 0.670 | 1001.031 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 1.187 | 0.202 | 0.000 | 1.187 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff0000000000000051 | 1002.863 | 0.106 | n/a | 0.000 | 0.000 | 1.074 | 1000.541 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 1.102 | 0.106 | 0.000 | 1.102 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff000000000000004c | 1002.841 | 0.193 | n/a | 0.000 | 0.000 | 0.669 | 1000.779 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 1.156 | 0.193 | 0.000 | 1.156 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000045 | 1002.593 | 2.468 | n/a | 0.000 | 0.000 | 1.303 | 998.681 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.080 | 2.468 | 0.002 | 0.080 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff0000000000000044 | 990.216 | 2.264 | n/a | 0.000 | 0.000 | 3.624 | 984.229 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.077 | 2.264 | 0.002 | 0.077 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff000000000000004b | 981.044 | 2.201 | n/a | 0.000 | 0.000 | 0.541 | 978.214 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.079 | 2.201 | 0.002 | 0.079 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff0000000000000054 | 964.403 | 2.954 | n/a | 0.000 | 0.000 | 0.517 | 960.808 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.092 | 2.954 | 0.003 | 0.092 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff0000000000000076 | 954.198 | 4.507 | n/a | 0.000 | 0.000 | 3.619 | 945.924 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.108 | 4.507 | 0.005 | 0.108 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000075 | 855.025 | 2.706 | n/a | 0.000 | 0.000 | 0.506 | 851.715 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.063 | 2.706 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff0000000000000053 | 784.790 | 2.104 | n/a | 0.000 | 0.000 | 0.557 | 782.030 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.067 | 2.104 | 0.003 | 0.067 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff000000000000005f | 710.807 | 1.915 | n/a | 0.000 | 0.000 | 0.664 | 708.126 | 0.010 | n/a | 0.024 | 0.000 | n/a | n/a | 0.069 | 1.915 | 0.003 | 0.069 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff000000000000006f | 659.411 | 3.621 | n/a | 0.000 | 0.000 | 2.268 | 653.444 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.061 | 3.621 | 0.005 | 0.061 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff0000000000000059 | 644.339 | 2.814 | n/a | 0.000 | 0.000 | 0.987 | 640.382 | 0.011 | n/a | 0.038 | 0.000 | n/a | n/a | 0.107 | 2.814 | 0.004 | 0.107 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff000000000000004e | 644.202 | 4.163 | n/a | 0.000 | 0.000 | 1.092 | 638.814 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.101 | 4.163 | 0.006 | 0.101 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff0000000000000046 | 577.333 | 3.086 | n/a | 0.000 | 0.000 | 3.044 | 571.093 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.077 | 3.086 | 0.005 | 0.077 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff000000000000005a | 555.996 | 2.925 | n/a | 0.000 | 0.000 | 1.036 | 551.900 | 0.008 | n/a | 0.018 | 0.000 | n/a | n/a | 0.108 | 2.925 | 0.005 | 0.108 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff000000000000007a | 496.869 | 3.994 | n/a | 0.000 | 0.000 | 1.267 | 491.513 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 3.994 | 0.008 | 0.064 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff000000000000007b | 470.452 | 9.367 | n/a | 0.771 | 0.000 | 0.512 | 459.676 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.093 | 10.139 | 0.022 | 0.093 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 463.104 | n/a | n/a | n/a | 2.416 | n/a | 0.000 | 0.000 | 0.698 | 458.572 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.071 | 2.416 | 0.009 | 0.071 |
| p99 | 1012.593 | n/a | n/a | n/a | 8.218 | n/a | 0.000 | 0.000 | 5.038 | 1004.757 | 0.015 | n/a | 0.089 | 0.000 | n/a | n/a | 49.134 | 8.218 | 0.458 | 49.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f1f069d88d63e5ff0000000000000089 | 1012.593 | 0.185 | n/a | 0.000 | 0.000 | 3.772 | 1004.757 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 3.837 | 0.185 | 0.000 | 3.837 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff0000000000000092 | 1006.551 | 4.931 | n/a | 0.000 | 0.000 | 2.076 | 999.402 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.104 | 4.931 | 0.005 | 0.104 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff000000000000009b | 1004.052 | 0.187 | n/a | 0.000 | 0.000 | 1.473 | 1001.172 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 1.153 | 0.187 | 0.000 | 1.153 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff00000000000000aa | 1003.035 | 0.110 | n/a | 0.000 | 0.000 | 0.625 | 1001.040 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 1.178 | 0.110 | 0.000 | 1.178 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000a1 | 997.573 | 4.492 | n/a | 0.000 | 0.000 | 0.521 | 992.428 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.095 | 4.492 | 0.005 | 0.095 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000086 | 991.734 | 2.416 | n/a | 0.000 | 0.000 | 0.698 | 988.499 | 0.011 | n/a | 0.041 | 0.000 | n/a | n/a | 0.070 | 2.416 | 0.002 | 0.070 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff00000000000000a0 | 983.371 | 3.827 | n/a | 0.000 | 0.000 | 0.829 | 978.615 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 3.827 | 0.004 | 0.064 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff000000000000009d | 899.707 | 8.218 | n/a | 0.000 | 0.000 | 1.387 | 889.934 | 0.005 | n/a | 0.011 | 0.000 | n/a | n/a | 0.152 | 8.218 | 0.009 | 0.152 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff00000000000000ae | 882.854 | 8.008 | n/a | 0.000 | 0.000 | 0.538 | 874.198 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.063 | 8.008 | 0.009 | 0.063 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff0000000000000093 | 867.955 | 1.823 | n/a | 0.000 | 0.000 | 0.538 | 865.500 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.059 | 1.823 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000083 | 831.212 | 2.091 | n/a | 0.000 | 0.000 | 5.038 | 823.979 | 0.008 | n/a | 0.026 | 0.000 | n/a | n/a | 0.071 | 2.091 | 0.003 | 0.071 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000b6 | 808.292 | 5.788 | n/a | 0.000 | 0.000 | 3.842 | 798.561 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.068 | 5.788 | 0.007 | 0.068 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff00000000000000b8 | 778.013 | 4.229 | n/a | 0.000 | 0.000 | 1.496 | 772.128 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.117 | 4.229 | 0.005 | 0.117 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000af | 711.893 | 6.746 | n/a | 0.000 | 0.000 | 0.675 | 704.356 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 6.746 | 0.009 | 0.077 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff00000000000000be | 578.081 | 2.199 | n/a | 0.000 | 0.000 | 1.031 | 574.747 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.056 | 2.199 | 0.004 | 0.056 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff00000000000000b4 | 566.158 | 2.050 | n/a | 0.000 | 0.000 | 0.759 | 563.209 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.052 | 2.050 | 0.004 | 0.052 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff00000000000000a9 | 562.260 | 2.432 | n/a | 0.000 | 0.000 | 1.714 | 558.008 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.068 | 2.432 | 0.004 | 0.068 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff000000000000009a | 519.545 | 2.406 | n/a | 0.000 | 0.000 | 0.483 | 516.465 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.156 | 2.406 | 0.005 | 0.156 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff00000000000000a2 | 515.135 | 2.594 | n/a | 0.000 | 0.000 | 0.536 | 511.882 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.071 | 2.594 | 0.005 | 0.071 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff00000000000000a4 | 487.852 | 2.674 | n/a | 0.000 | 0.000 | 0.937 | 484.139 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.066 | 2.674 | 0.005 | 0.066 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.101 | n/a | n/a | n/a | 2.337 | n/a | 0.000 | 0.000 | 0.880 | 414.687 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.083 | 2.337 | 0.006 | 0.083 |
| p99 | 1004.080 | n/a | n/a | n/a | 7.503 | n/a | 0.486 | 0.000 | 5.810 | 1002.103 | 0.018 | n/a | 0.053 | 0.000 | n/a | n/a | 23.763 | 7.503 | 0.360 | 23.763 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f1f069d88d63e5ff00000000000000fc | 1004.080 | 0.215 | n/a | 0.000 | 0.000 | 0.590 | 1002.103 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 1.131 | 0.215 | 0.000 | 1.131 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff00000000000000f4 | 1003.984 | 2.199 | n/a | 0.000 | 0.000 | 0.684 | 1001.008 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.056 | 2.199 | 0.002 | 0.056 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff00000000000000da | 1003.416 | 2.104 | n/a | 0.000 | 0.000 | 0.880 | 1000.319 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.104 | 0.002 | 0.064 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff00000000000000fa | 1002.822 | 0.130 | n/a | 0.000 | 0.000 | 0.866 | 1000.675 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 1.108 | 0.130 | 0.000 | 1.108 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff00000000000000e3 | 1002.506 | 0.161 | n/a | 0.000 | 0.000 | 0.610 | 1000.550 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 1.152 | 0.161 | 0.000 | 1.152 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000ca | 999.941 | 2.337 | n/a | 0.000 | 0.000 | 2.173 | 995.285 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.087 | 2.337 | 0.002 | 0.087 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff00000000000000cb | 906.891 | 7.503 | n/a | 0.000 | 0.000 | 2.866 | 896.383 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.105 | 7.503 | 0.008 | 0.105 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000ea | 803.747 | 4.291 | n/a | 0.000 | 0.000 | 0.389 | 798.854 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.148 | 4.291 | 0.005 | 0.148 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff00000000000000c5 | 753.262 | 3.651 | n/a | 0.000 | 0.000 | 1.792 | 747.665 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.120 | 3.651 | 0.005 | 0.120 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff00000000000000db | 697.510 | 5.376 | n/a | 0.486 | 0.000 | 0.496 | 691.019 | 0.010 | n/a | 0.027 | 0.000 | n/a | n/a | 0.096 | 5.862 | 0.008 | 0.096 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000d0 | 670.727 | 3.850 | n/a | 0.000 | 0.000 | 3.283 | 663.480 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 0.096 | 3.850 | 0.006 | 0.096 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff00000000000000ef | 603.160 | 2.123 | n/a | 0.000 | 0.000 | 0.775 | 600.176 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.053 | 2.123 | 0.004 | 0.053 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff00000000000000f1 | 581.571 | 2.962 | n/a | 0.000 | 0.000 | 0.450 | 577.996 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.133 | 2.962 | 0.005 | 0.133 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff00000000000000eb | 551.250 | 2.145 | n/a | 0.000 | 0.000 | 4.438 | 544.573 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 2.145 | 0.004 | 0.064 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff00000000000000e5 | 537.119 | 3.964 | n/a | 0.000 | 0.000 | 2.498 | 530.549 | 0.010 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 3.964 | 0.007 | 0.061 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff00000000000000c0 | 531.128 | 1.585 | n/a | 0.000 | 0.000 | 5.546 | 523.913 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.054 | 1.585 | 0.003 | 0.054 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff00000000000000e2 | 492.906 | 2.201 | n/a | 0.000 | 0.000 | 0.720 | 489.896 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.056 | 2.201 | 0.004 | 0.056 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff00000000000000fd | 478.289 | 2.989 | n/a | 0.000 | 0.000 | 2.122 | 473.075 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.072 | 2.989 | 0.006 | 0.072 | gw-r/thread-41/journal/page | none observed |
| f1f069d88d63e5ff00000000000000f9 | 460.208 | 2.262 | n/a | 0.000 | 0.000 | 1.120 | 456.725 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.262 | 0.005 | 0.063 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff00000000000000ec | 455.333 | 2.238 | n/a | 0.000 | 0.000 | 3.621 | 449.358 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.072 | 2.238 | 0.005 | 0.072 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / internal (3108 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.344 | n/a | n/a | n/a | 4.155 | n/a | 0.000 | 0.000 | 0.219 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.823 | 4.173 | 0.334 | 5.823 |
| p99 | 815.154 | n/a | n/a | n/a | 17.246 | n/a | 1.175 | 0.000 | 1.201 | 812.298 | 0.010 | n/a | 0.036 | 0.000 | n/a | n/a | 47.894 | 17.978 | 0.834 | 47.894 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f1f069d88d63e5ff000000000000011e | 1006.516 | 3.164 | n/a | 0.000 | 0.000 | 0.457 | 1002.724 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.161 | 3.164 | 0.003 | 0.161 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff00000000000019e9 | 1006.358 | 4.330 | n/a | 0.000 | 0.000 | 0.587 | 1001.281 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.111 | 4.330 | 0.004 | 0.111 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000175 | 1006.039 | 3.645 | n/a | 1.469 | 0.000 | 0.484 | 1000.348 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.058 | 5.115 | 0.005 | 0.058 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff0000000000001a35 | 1003.078 | 0.274 | n/a | 0.000 | 0.000 | 1.201 | 1000.408 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 1.171 | 0.274 | 0.000 | 1.171 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000001a30 | 1002.855 | 0.107 | n/a | 0.000 | 0.000 | 1.021 | 1000.569 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 1.094 | 0.107 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff0000000000000101 | 1002.812 | 0.141 | n/a | 0.000 | 0.000 | 0.879 | 1000.641 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 1.111 | 0.141 | 0.000 | 1.111 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff000000000000019b | 1002.665 | 0.150 | n/a | 0.000 | 0.000 | 0.807 | 1000.548 | 0.009 | n/a | 0.024 | 0.000 | n/a | n/a | 1.127 | 0.150 | 0.000 | 1.127 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff0000000000000189 | 1002.527 | 2.759 | n/a | 0.499 | 0.000 | 1.464 | 997.670 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.086 | 3.258 | 0.003 | 0.086 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff000000000000013a | 1002.436 | 0.156 | n/a | 0.000 | 0.000 | 0.543 | 1000.591 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 1.102 | 0.156 | 0.000 | 1.102 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff000000000000018f | 1002.064 | 0.113 | n/a | 0.000 | 0.000 | 0.391 | 1000.435 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 1.094 | 0.113 | 0.000 | 1.094 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff000000000000018d | 1001.104 | 2.366 | n/a | 0.000 | 0.000 | 0.676 | 997.986 | 0.007 | n/a | 0.015 | 0.000 | n/a | n/a | 0.054 | 2.366 | 0.002 | 0.054 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff00000000000019ea | 997.172 | 4.435 | n/a | 0.000 | 0.000 | 0.517 | 992.069 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.125 | 4.435 | 0.004 | 0.125 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff000000000000011d | 996.660 | 2.260 | n/a | 0.000 | 0.000 | 0.444 | 993.863 | 0.006 | n/a | 0.022 | 0.000 | n/a | n/a | 0.066 | 2.260 | 0.002 | 0.066 | gw-r/thread-46/journal/page | none observed |
| f1f069d88d63e5ff000000000000018e | 995.062 | 2.553 | n/a | 0.385 | 0.000 | 0.452 | 991.589 | 0.008 | n/a | 0.021 | 0.000 | n/a | n/a | 0.054 | 2.938 | 0.003 | 0.054 | gw-r/thread-47/journal/page | none observed |
| f1f069d88d63e5ff000000000000019d | 993.315 | 5.036 | n/a | 0.000 | 0.000 | 1.064 | 987.062 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.109 | 5.036 | 0.005 | 0.109 | gw-r/thread-44/journal/page | none observed |
| f1f069d88d63e5ff0000000000000161 | 990.097 | 2.265 | n/a | 0.000 | 0.000 | 0.592 | 987.150 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.265 | 0.002 | 0.057 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000111 | 989.047 | 2.719 | n/a | 0.000 | 0.000 | 0.502 | 985.724 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.066 | 2.719 | 0.003 | 0.066 | gw-r/thread-45/journal/page | none observed |
| f1f069d88d63e5ff000000000000013c | 988.795 | 2.133 | n/a | 0.000 | 0.000 | 1.972 | 984.596 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.065 | 2.133 | 0.002 | 0.065 | gw-r/thread-43/journal/page | none observed |
| f1f069d88d63e5ff0000000000000188 | 986.503 | 2.597 | n/a | 0.300 | 0.000 | 0.657 | 982.851 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.067 | 2.897 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| f1f069d88d63e5ff00000000000019ed | 961.609 | 2.470 | n/a | 0.000 | 0.000 | 0.479 | 958.552 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.072 | 2.470 | 0.003 | 0.072 | gw-r/thread-85/journal/page | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.030 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.436 | 200.358 | 0.004 | n/a | 0.014 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 |
| p99 | 205.296 | n/a | n/a | n/a | 19.920 | n/a | 0.000 | 0.000 | 3.563 | 201.217 | 0.019 | n/a | 0.048 | 0.000 | n/a | n/a | 11.788 | 19.920 | 0.127 | 11.788 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f56b6e3b6f18c8c0000000000000f46 | 205.296 | 19.920 | n/a | 0.000 | 0.000 | 2.188 | 183.021 | 0.003 | n/a | 0.004 | 0.000 | n/a | n/a | 0.159 | 19.920 | 0.097 | 0.159 | gw-r/thread-85/gateway.admitted-work | none observed |
| 3f56b6e3b6f18c8c0000000000000007 | 205.071 | 0.000 | n/a | 0.000 | 0.000 | 3.563 | 201.217 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.273 | 0.000 | 0.000 | 0.273 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000006 | 203.065 | 0.000 | n/a | 0.000 | 0.000 | 2.138 | 200.677 | 0.012 | n/a | 0.043 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000005 | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.192 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000f41 | 201.277 | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 200.624 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000f43 | 201.030 | 0.000 | n/a | 0.000 | 0.000 | 0.544 | 200.358 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000f42 | 200.826 | 0.000 | n/a | 0.000 | 0.000 | 0.336 | 200.392 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000f47 | 136.049 | 15.991 | n/a | 0.000 | 0.000 | 2.328 | 117.463 | 0.009 | n/a | 0.014 | 0.000 | n/a | n/a | 0.242 | 15.991 | 0.118 | 0.242 | gw-r/thread-44/gateway.admitted-work | none observed |
| 3f56b6e3b6f18c8c0000000000000f48 | 123.423 | 15.692 | n/a | 0.000 | 0.000 | 1.436 | 106.038 | 0.004 | n/a | 0.007 | 0.000 | n/a | n/a | 0.246 | 15.692 | 0.127 | 0.246 | gw-r/thread-47/gateway.admitted-work | none observed |
| 3f56b6e3b6f18c8c0000000000000f49 | 82.396 | 7.491 | n/a | 0.000 | 0.000 | 2.516 | 72.210 | 0.019 | n/a | 0.009 | 0.000 | n/a | n/a | 0.152 | 7.491 | 0.091 | 0.152 | gw-r/thread-41/gateway.admitted-work | none observed |
| f1f069d88d63e5ff0000000000000002 | 12.441 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.788 | 0.000 | 0.000 | 11.788 | node-196/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.478 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 200.595 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 207.046 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.602 | 201.925 | 4.276 | n/a | 0.069 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f56b6e3b6f18c8c000000000000003e | 207.046 | 0.000 | n/a | 0.000 | 0.000 | 4.929 | 201.925 | 0.012 | n/a | 0.043 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000001f | 204.609 | 0.000 | n/a | 0.000 | 0.000 | 3.576 | 200.887 | 0.012 | n/a | 0.056 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000032 | 204.135 | 0.000 | n/a | 0.000 | 0.000 | 3.379 | 200.585 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000004b | 203.473 | 0.000 | n/a | 0.000 | 0.000 | 2.491 | 200.820 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000004c | 203.336 | 0.000 | n/a | 0.000 | 0.000 | 2.581 | 200.547 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000052 | 203.102 | 0.000 | n/a | 0.000 | 0.000 | 1.235 | 201.564 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000008 | 202.900 | 0.000 | n/a | 0.000 | 0.000 | 0.986 | 201.753 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000015 | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.748 | 200.858 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000000e | 202.716 | 0.000 | n/a | 0.000 | 0.000 | 1.949 | 200.622 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000009 | 202.537 | 0.000 | n/a | 0.000 | 0.000 | 1.277 | 200.826 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000034 | 202.492 | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 200.833 | 0.013 | n/a | 0.054 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000051 | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 1.582 | 200.664 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000037 | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 1.467 | 200.705 | 0.008 | n/a | 0.043 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000027 | 202.206 | 0.000 | n/a | 0.000 | 0.000 | 1.487 | 200.577 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000002c | 202.163 | 0.000 | n/a | 0.000 | 0.000 | 1.298 | 200.718 | 0.009 | n/a | 0.034 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000057 | 202.145 | 0.000 | n/a | 0.000 | 0.000 | 1.067 | 200.914 | 0.020 | n/a | 0.054 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000003d | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 200.902 | 0.013 | n/a | 0.055 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000026 | 202.041 | 0.000 | n/a | 0.000 | 0.000 | 0.560 | 201.320 | 0.017 | n/a | 0.054 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000013 | 202.032 | 0.000 | n/a | 0.000 | 0.000 | 0.305 | 201.582 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000053 | 202.010 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 200.991 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / read (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.378 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.594 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 211.716 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.427 | 210.496 | 8.239 | n/a | 0.089 | 0.000 | n/a | n/a | 0.362 | 0.000 | 0.000 | 0.362 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f56b6e3b6f18c8c000000000000007b | 211.716 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 210.496 | 0.019 | n/a | 0.036 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000093 | 208.214 | 0.000 | n/a | 0.000 | 0.000 | 7.427 | 200.651 | 0.014 | n/a | 0.030 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000074 | 203.913 | 0.000 | n/a | 0.000 | 0.000 | 0.634 | 203.122 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000005c | 203.551 | 0.000 | n/a | 0.000 | 0.000 | 2.898 | 200.524 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000b7 | 203.505 | 0.000 | n/a | 0.000 | 0.000 | 2.593 | 200.726 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000066 | 203.095 | 0.000 | n/a | 0.000 | 0.000 | 2.080 | 200.866 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000ac | 202.441 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 201.519 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000008d | 202.375 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 201.071 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000a7 | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 200.737 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000079 | 202.202 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 201.237 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000073 | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 201.147 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000bc | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.100 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000083 | 202.091 | 0.000 | n/a | 0.000 | 0.000 | 0.716 | 201.182 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000094 | 202.083 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 200.869 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000005e | 201.836 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 200.719 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000090 | 201.808 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 200.869 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000bd | 201.708 | 0.000 | n/a | 0.000 | 0.000 | 0.534 | 200.988 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000007d | 201.688 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.894 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000c1 | 201.641 | 0.000 | n/a | 0.000 | 0.000 | 0.512 | 200.961 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000088 | 201.638 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 200.894 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.565 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.636 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 |
| p99 | 214.000 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.644 | 205.300 | 6.667 | n/a | 0.072 | 0.000 | n/a | n/a | 3.817 | 0.000 | 0.000 | 3.817 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f56b6e3b6f18c8c00000000000000d1 | 214.000 | 0.000 | n/a | 0.000 | 0.000 | 9.644 | 204.211 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000fd | 207.407 | 0.000 | n/a | 0.000 | 0.000 | 2.832 | 200.707 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 3.817 | 0.000 | 0.000 | 3.817 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000119 | 206.556 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 205.300 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000cd | 206.161 | 0.000 | n/a | 0.000 | 0.000 | 3.159 | 202.857 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000de | 206.121 | 0.000 | n/a | 0.000 | 0.000 | 2.588 | 203.225 | 0.014 | n/a | 0.060 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000fb | 205.667 | 0.000 | n/a | 0.000 | 0.000 | 1.228 | 200.633 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 3.759 | 0.000 | 0.000 | 3.759 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000dc | 203.520 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 202.560 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000100 | 203.221 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 202.222 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000010e | 203.176 | 0.000 | n/a | 0.000 | 0.000 | 1.250 | 201.757 | 0.011 | n/a | 0.047 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000c6 | 203.134 | 0.000 | n/a | 0.000 | 0.000 | 2.365 | 200.606 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000d2 | 202.918 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.842 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000011e | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 1.641 | 200.540 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000d3 | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.081 | 0.010 | n/a | 0.059 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000ef | 202.254 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.295 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000d4 | 202.168 | 0.000 | n/a | 0.000 | 0.000 | 1.261 | 200.761 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000117 | 202.085 | 0.000 | n/a | 0.000 | 0.000 | 1.021 | 200.889 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000e1 | 202.063 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 201.238 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000c8 | 202.052 | 0.000 | n/a | 0.000 | 0.000 | 1.118 | 200.701 | 0.011 | n/a | 0.041 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000000f0 | 202.023 | 0.000 | n/a | 0.000 | 0.000 | 0.952 | 200.853 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000011f | 202.015 | 0.000 | n/a | 0.000 | 0.000 | 1.234 | 200.639 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.433 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.647 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 221.475 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 10.413 | 220.774 | 4.646 | n/a | 0.080 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f56b6e3b6f18c8c0000000000000159 | 221.475 | 0.000 | n/a | 0.000 | 0.000 | 0.540 | 220.774 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000016c | 211.305 | 0.000 | n/a | 0.000 | 0.000 | 10.413 | 200.713 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000173 | 210.191 | 0.000 | n/a | 0.000 | 0.000 | 9.547 | 200.458 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000177 | 205.329 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 204.510 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000187 | 205.167 | 0.000 | n/a | 0.000 | 0.000 | 3.645 | 201.379 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000015b | 204.837 | 0.000 | n/a | 0.000 | 0.000 | 4.020 | 200.651 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000150 | 204.683 | 0.000 | n/a | 0.000 | 0.000 | 2.329 | 200.196 | 2.051 | n/a | 0.008 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000181 | 204.636 | 0.000 | n/a | 0.000 | 0.000 | 3.583 | 200.909 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000017f | 204.386 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 203.330 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000012e | 203.538 | 0.000 | n/a | 0.000 | 0.000 | 2.391 | 200.988 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000139 | 203.328 | 0.000 | n/a | 0.000 | 0.000 | 2.551 | 200.630 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000176 | 202.781 | 0.000 | n/a | 0.000 | 0.000 | 1.846 | 200.803 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000188 | 202.558 | 0.000 | n/a | 0.000 | 0.000 | 1.640 | 200.777 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000162 | 202.441 | 0.000 | n/a | 0.000 | 0.000 | 1.236 | 201.016 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000140 | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 0.383 | 201.769 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000193 | 202.186 | 0.000 | n/a | 0.000 | 0.000 | 1.315 | 200.687 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000167 | 202.182 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 200.875 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000194 | 202.172 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 200.598 | 0.583 | n/a | 0.012 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000016f | 202.140 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.059 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000143 | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.493 | 201.434 | 0.018 | n/a | 0.065 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / read (501 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 162.381 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 161.607 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 204.694 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.149 | 202.054 | 1.733 | n/a | 0.104 | 0.000 | n/a | n/a | 50.089 | 0.000 | 0.000 | 50.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3f56b6e3b6f18c8c0000000000000248 | 205.378 | 0.000 | n/a | 0.000 | 0.000 | 4.020 | 201.205 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000ee4 | 205.341 | 0.000 | n/a | 0.000 | 0.000 | 4.381 | 200.756 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000001ef | 205.037 | 0.000 | n/a | 0.000 | 0.000 | 3.836 | 201.004 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000001f8 | 204.998 | 0.000 | n/a | 0.000 | 0.000 | 4.234 | 200.622 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000026a | 204.873 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 204.063 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000232 | 204.694 | 0.000 | n/a | 0.000 | 0.000 | 1.478 | 202.973 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000204 | 204.220 | 0.000 | n/a | 0.000 | 0.000 | 0.411 | 203.693 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000264 | 203.889 | 0.000 | n/a | 0.000 | 0.000 | 3.233 | 200.532 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000001ec | 203.673 | 0.000 | n/a | 0.000 | 0.000 | 1.838 | 201.664 | 0.015 | n/a | 0.072 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000001e4 | 203.412 | 0.000 | n/a | 0.000 | 0.000 | 0.429 | 202.805 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-45/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000f0b | 203.280 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 202.054 | 0.005 | n/a | 0.094 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000025a | 203.140 | 0.000 | n/a | 0.000 | 0.000 | 0.911 | 201.862 | 0.018 | n/a | 0.126 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-43/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000eee | 203.048 | 0.000 | n/a | 0.000 | 0.000 | 1.540 | 201.287 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000020c | 203.037 | 0.000 | n/a | 0.000 | 0.000 | 1.132 | 201.580 | 0.018 | n/a | 0.106 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000296 | 202.958 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.901 | 0.019 | n/a | 0.111 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000266 | 202.778 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 201.630 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c000000000000022d | 202.763 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 202.084 | 0.021 | n/a | 0.075 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000001c7 | 202.733 | 0.000 | n/a | 0.000 | 0.000 | 2.039 | 200.561 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-41/journal/page | none observed |
| 3f56b6e3b6f18c8c0000000000000f09 | 202.693 | 0.000 | n/a | 0.000 | 0.000 | 1.773 | 200.794 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 3f56b6e3b6f18c8c00000000000001b4 | 202.689 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.539 | 0.019 | n/a | 0.104 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

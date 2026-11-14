# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-1271/peer.transact-await (includes order/network/storage)` (25.067 ms, trace `122d758ad88ea833000000000000004c`); `gw-w/thread-1343/peer.transact-await (includes order/network/storage)` (76.177 ms, trace `122d758ad88ea833000000000000008f`); `node-194/thread-0/socket.wait-first-byte` (62.683 ms, trace `122d758ad88ea833000000000000020f`); `gw-w/thread-1319/peer.transact-await (includes order/network/storage)` (54.650 ms, trace `122d758ad88ea83300000000000001d1`); `gw-w/thread-1320/peer.transact-await (includes order/network/storage)` (35.012 ms, trace `122d758ad88ea8330000000000000601`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p6-candidate-smoke-a`; source `b6aa04e7c7da002c8f6a9cf732e5efe2956e8c0a`; subjects 1000; tracing full.

Recorders: gateway, node, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 249431268.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 205 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1257.283 | 132.059 | 1.247 | 40 |
| L1 | 1 | 1993.627 | 128.109 | 5.136 | 59 |
| L4 | 4 | 1983.478 | 222.665 | 6.890 | 64 |
| L16 | 16 | 1910.425 | 177.921 | 8.770 | 64 |
| tail | 0 | 191699.977 | 14474.711 | 178.714 | 73549 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 122d758ad88ea833000000000000004c | driver.queue.scheduler-dispatch | 0.163 | none | 0 / 32 |
| 122d758ad88ea833000000000000004c | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 122d758ad88ea833000000000000004c waited: []

| 122d758ad88ea833000000000000008f | driver.queue.scheduler-late | 1.082 | none | 0 / 32 |
| 122d758ad88ea833000000000000008f | driver.queue.scheduler-dispatch | 0.131 | none | 0 / 32 |

Observed active steps while trace 122d758ad88ea833000000000000008f waited: []

| 122d758ad88ea833000000000000020f | driver.queue.scheduler-late | 1.038 | none | 0 / 32 |
| 122d758ad88ea833000000000000020f | driver.queue.scheduler-dispatch | 0.038 | none | 0 / 32 |

Observed active steps while trace 122d758ad88ea833000000000000020f waited: []

| 122d758ad88ea83300000000000001d1 | driver.queue.scheduler-late | 0.303 | none | 0 / 32 |
| 122d758ad88ea83300000000000001d1 | driver.queue.scheduler-dispatch | 0.169 | none | 0 / 32 |

Observed active steps while trace 122d758ad88ea83300000000000001d1 waited: []

| 122d758ad88ea8330000000000000601 | driver.queue.scheduler-late | 0.385 | none | 1 / 32 |
| 122d758ad88ea8330000000000000601 | driver.queue.scheduler-dispatch | 0.020 | none | 1 / 32 |

Observed active steps while trace 122d758ad88ea8330000000000000601 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.136 | 0.000 | 0.000 | 0.487 | 5.888 | 0.516 | 0.000 | 0.077 | 0.901 | 1.422 | 0.010 | n/a | 0.202 | 3.966 | 0.530 | n/a | 0.032 | 6.209 | 0.282 | 0.032 |
| p99 | 41.342 | 0.998 | 0.000 | 2.034 | 23.444 | n/a | 0.000 | 1.438 | 9.999 | 3.262 | 0.023 | n/a | 0.710 | 10.000 | 1.321 | n/a | 0.145 | 24.037 | 0.581 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea8330000000000000038 | 41.342 | 23.444 | 0.516 | 0.000 | 0.077 | 9.999 | 3.262 | 0.021 | n/a | 0.710 | 2.774 | 0.515 | n/a | 0.024 | 24.037 | 0.581 | 0.024 | node-194/thread-8/client.validation-and-staging | driver.reader-basis.broadcast 0.022ms |
| 122d758ad88ea833000000000000003b | 21.987 | 5.888 | 0.270 | 0.000 | 0.052 | 2.988 | 2.150 | 0.023 | n/a | 0.156 | 9.108 | 1.321 | n/a | 0.032 | 6.209 | 0.282 | 0.032 | gw-w/thread-1351/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.251ms; driver.reader-basis.broadcast 0.023ms |
| 122d758ad88ea8330000000000000036 | 16.136 | 6.646 | n/a | 0.000 | 1.438 | 0.901 | 1.422 | 0.010 | n/a | 0.468 | 3.966 | 1.139 | n/a | 0.145 | 8.085 | 0.501 | 0.145 | gw-w/thread-1326/peer.transact-await (includes order/network/storage) | none observed |
| 122d758ad88ea833000000000000003a | 14.731 | 2.036 | n/a | 0.000 | 0.348 | 0.515 | 0.990 | 0.009 | n/a | 0.202 | 10.000 | 0.530 | n/a | 0.101 | 2.384 | 0.162 | 0.101 | gw-w/thread-1307/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.731 | 0.000 | 0.000 | 0.531 | 2.036 | n/a | 0.000 | 0.348 | 0.515 | 0.990 | 0.009 | n/a | 0.202 | 10.000 | 0.530 | n/a | 0.101 | 2.384 | 0.162 | 0.101 |
| p99 | 14.731 | 0.000 | 0.000 | 0.531 | 2.036 | n/a | 0.000 | 0.348 | 0.515 | 0.990 | 0.009 | n/a | 0.202 | 10.000 | 0.530 | n/a | 0.101 | 2.384 | 0.162 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea833000000000000003a | 14.731 | 2.036 | n/a | 0.000 | 0.348 | 0.515 | 0.990 | 0.009 | n/a | 0.202 | 10.000 | 0.530 | n/a | 0.101 | 2.384 | 0.162 | 0.101 | gw-w/thread-1307/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.633 | 0.000 | 0.000 | 0.387 | 4.201 | 5.107 | 0.000 | 0.127 | 1.913 | 1.342 | 0.015 | n/a | 0.092 | 5.066 | 0.926 | n/a | 0.025 | 4.560 | 0.274 | 0.025 |
| p99 | 19.892 | 0.000 | 0.000 | 0.616 | 4.987 | n/a | 0.000 | 0.300 | 2.701 | 5.141 | 0.022 | n/a | 0.437 | 5.881 | 1.289 | n/a | 0.239 | 10.149 | 0.510 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea833000000000000003e | 19.892 | 4.987 | 5.107 | 0.000 | 0.055 | 1.913 | 1.342 | 0.015 | n/a | 0.092 | 5.066 | 1.289 | n/a | 0.025 | 10.149 | 0.510 | 0.025 | node-194/thread-0/rpc.probe.transact | driver.publication.persist-deferred 0.896ms; driver.reader-basis.broadcast 0.037ms |
| 122d758ad88ea8330000000000000043 | 16.633 | 4.201 | 0.232 | 0.000 | 0.127 | 2.701 | 5.141 | 0.022 | n/a | 0.437 | 3.044 | 0.488 | n/a | 0.239 | 4.560 | 0.274 | 0.239 | gw-w/thread-1306/gateway.admitted-work | driver.reader-basis.broadcast 0.030ms |
| 122d758ad88ea8330000000000000040 | 10.313 | 2.303 | n/a | 0.000 | 0.300 | 0.403 | 0.469 | 0.003 | n/a | 0.010 | 5.881 | 0.926 | n/a | 0.016 | 2.604 | 0.252 | 0.016 | gw-w/thread-1338/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.313 | 0.000 | 0.000 | 0.616 | 2.303 | n/a | 0.000 | 0.300 | 0.403 | 0.469 | 0.003 | n/a | 0.010 | 5.881 | 0.926 | n/a | 0.016 | 2.604 | 0.252 | 0.016 |
| p99 | 10.313 | 0.000 | 0.000 | 0.616 | 2.303 | n/a | 0.000 | 0.300 | 0.403 | 0.469 | 0.003 | n/a | 0.010 | 5.881 | 0.926 | n/a | 0.016 | 2.604 | 0.252 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea8330000000000000040 | 10.313 | 2.303 | n/a | 0.000 | 0.300 | 0.403 | 0.469 | 0.003 | n/a | 0.010 | 5.881 | 0.926 | n/a | 0.016 | 2.604 | 0.252 | 0.016 | gw-w/thread-1338/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.126 | 0.000 | 0.000 | 0.463 | 4.084 | 0.259 | 0.000 | 0.167 | 0.770 | 1.692 | 0.015 | n/a | 0.090 | 4.028 | 0.652 | n/a | 0.030 | 4.319 | 0.199 | 0.030 |
| p99 | 89.936 | 2.004 | 0.000 | 1.878 | 5.324 | n/a | 0.000 | 0.844 | 2.923 | 46.184 | 0.031 | n/a | 0.485 | 25.067 | 10.892 | n/a | 0.039 | 5.750 | 0.416 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea833000000000000004c | 89.936 | 5.324 | 0.259 | 0.000 | 0.167 | 1.882 | 46.184 | 0.031 | n/a | 0.090 | 25.067 | 10.892 | n/a | 0.039 | 5.750 | 0.064 | 0.039 | gw-w/thread-1271/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 122d758ad88ea8330000000000000049 | 21.735 | 4.084 | 0.154 | 0.000 | 0.081 | 2.923 | 5.135 | 0.015 | n/a | 0.295 | 8.125 | 0.895 | n/a | 0.028 | 4.319 | 0.199 | 0.028 | gw-w/thread-1317/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 122d758ad88ea8330000000000000047 | 13.126 | 4.645 | n/a | 0.000 | 0.806 | 0.770 | 1.692 | 0.017 | n/a | 0.485 | 4.028 | 0.652 | n/a | 0.030 | 5.451 | 0.415 | 0.030 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | none observed |
| 122d758ad88ea8330000000000000045 | 7.706 | 2.363 | n/a | 0.000 | 0.844 | 0.484 | 0.648 | 0.008 | n/a | 0.058 | 2.915 | 0.352 | n/a | 0.035 | 3.206 | 0.416 | 0.035 | gw-w/thread-1321/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.706 | 0.000 | 0.000 | 0.642 | 2.363 | n/a | 0.000 | 0.844 | 0.484 | 0.648 | 0.008 | n/a | 0.058 | 2.915 | 0.352 | n/a | 0.035 | 3.206 | 0.416 | 0.035 |
| p99 | 7.706 | 0.000 | 0.000 | 0.642 | 2.363 | n/a | 0.000 | 0.844 | 0.484 | 0.648 | 0.008 | n/a | 0.058 | 2.915 | 0.352 | n/a | 0.035 | 3.206 | 0.416 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea8330000000000000045 | 7.706 | 2.363 | n/a | 0.000 | 0.844 | 0.484 | 0.648 | 0.008 | n/a | 0.058 | 2.915 | 0.352 | n/a | 0.035 | 3.206 | 0.416 | 0.035 | gw-w/thread-1321/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.906 | 0.478 | 0.000 | 0.495 | 5.018 | 0.266 | 0.000 | 0.070 | 0.834 | 18.523 | 0.013 | n/a | 0.144 | 8.809 | 5.803 | n/a | 0.022 | 5.851 | 0.147 | 0.022 |
| p99 | 50.217 | 2.000 | 0.000 | 1.920 | 8.735 | n/a | 0.508 | 0.833 | 3.234 | 21.984 | 0.027 | n/a | 0.353 | 10.899 | 9.588 | n/a | 0.032 | 9.071 | 0.193 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea8330000000000000055 | 50.217 | 8.138 | 0.223 | 0.508 | 0.068 | 3.234 | 19.759 | 0.027 | n/a | 0.144 | 10.899 | 7.185 | n/a | 0.032 | 8.936 | 0.178 | 0.032 | gw-w/thread-1319/gateway.admitted-work | driver.reader-basis.broadcast 0.026ms |
| 122d758ad88ea8330000000000000052 | 47.094 | 8.735 | 0.266 | 0.000 | 0.070 | 1.332 | 21.984 | 0.020 | n/a | 0.353 | 9.438 | 4.874 | n/a | 0.022 | 9.071 | 0.193 | 0.022 | gw-w/thread-1312/gateway.admitted-work | driver.reader-basis.broadcast 0.027ms |
| 122d758ad88ea833000000000000004e | 39.906 | 5.018 | n/a | 0.000 | 0.833 | 0.834 | 18.523 | 0.013 | n/a | 0.048 | 8.809 | 5.803 | n/a | 0.025 | 5.851 | 0.147 | 0.025 | gw-w/thread-1316/commit.prepare-and-validate | driver.reader-basis.broadcast 0.050ms |
| 122d758ad88ea8330000000000000050 | 19.282 | 2.398 | n/a | 0.000 | 0.195 | 0.577 | 0.992 | 0.008 | n/a | 0.292 | 5.211 | 9.588 | n/a | 0.022 | 2.593 | 0.134 | 0.022 | tx/thread-7487/transactor.triplex-function | none observed |

## P2 / tail / commit (3696 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.463 | 0.177 | 0.000 | 0.488 | 2.202 | n/a | 0.000 | 0.687 | 0.548 | 0.862 | 0.008 | n/a | 0.064 | 3.270 | 0.713 | n/a | 0.013 | 3.101 | 0.331 | 0.013 |
| p99 | 33.971 | 2.011 | 0.038 | 2.103 | 6.919 | n/a | 0.389 | 10.332 | 7.401 | 6.812 | 0.033 | n/a | 1.380 | 11.957 | 3.497 | n/a | 0.057 | 13.894 | 0.684 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea833000000000000008f | 83.326 | 3.334 | n/a | 0.000 | 1.213 | 0.732 | 1.006 | 0.010 | n/a | 0.103 | 76.177 | 0.698 | n/a | 0.054 | 4.548 | 0.055 | 0.054 | gw-w/thread-1343/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.110ms |
| 122d758ad88ea833000000000000020f | 72.742 | 3.927 | n/a | 0.000 | 1.075 | 63.672 | 2.485 | 0.027 | n/a | 0.111 | 1.136 | 0.289 | n/a | 0.021 | 5.002 | 0.069 | 0.021 | node-194/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.053ms |
| 122d758ad88ea83300000000000001d1 | 65.278 | 5.458 | n/a | 0.000 | 0.472 | 1.236 | 2.247 | 0.024 | n/a | 0.119 | 54.650 | 0.998 | n/a | 0.073 | 5.930 | 0.091 | 0.073 | gw-w/thread-1319/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.122ms |
| 122d758ad88ea8330000000000000601 | 57.315 | 6.251 | n/a | 0.000 | 0.405 | 11.409 | 3.785 | 0.016 | n/a | 0.055 | 35.012 | 0.368 | n/a | 0.012 | 6.657 | 0.116 | 0.012 | gw-w/thread-1320/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.670ms; driver.publication.persist-deferred 1.228ms; driver.publication.persist-deferred 0.975ms; driver.publication.persist-deferred 0.722ms; driver.publication.persist-deferred 0.591ms |
| 122d758ad88ea8330000000000000057 | 55.381 | 4.885 | 0.175 | 0.427 | 0.164 | 1.449 | 22.634 | 0.016 | n/a | 0.080 | 18.075 | 7.424 | n/a | 0.053 | 5.651 | 0.102 | 0.053 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| 122d758ad88ea8330000000000001a38 | 52.170 | 1.268 | n/a | 0.000 | 1.050 | 0.334 | 0.634 | 0.008 | n/a | 0.243 | 47.233 | 1.389 | n/a | 0.011 | 2.318 | 0.044 | 0.011 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.628ms |
| 122d758ad88ea8330000000000000eab | 52.117 | 6.986 | n/a | 0.000 | 1.068 | 11.956 | 21.364 | 0.023 | n/a | 0.310 | 8.630 | 1.770 | n/a | 0.009 | 8.054 | 0.155 | 0.009 | gw-w/thread-1351/commit.prepare-and-validate | driver.publication.persist-deferred 5.612ms; driver.publication.persist-deferred 1.557ms; driver.publication.persist-deferred 0.929ms; driver.publication.persist-deferred 0.753ms |
| 122d758ad88ea8330000000000000065 | 51.780 | 3.990 | 0.197 | 0.259 | 0.050 | 1.652 | 28.293 | 0.011 | n/a | 0.072 | 5.929 | 11.304 | n/a | 0.023 | 4.495 | 0.087 | 0.023 | gw-w/thread-1329/gateway.admitted-work | driver.reader-basis.broadcast 0.053ms |
| 122d758ad88ea8330000000000000061 | 49.812 | 4.952 | 0.248 | 0.429 | 0.051 | 1.231 | 31.690 | 0.011 | n/a | 0.233 | 8.429 | 2.520 | n/a | 0.020 | 5.678 | 0.114 | 0.020 | gw-w/thread-45/gateway.admitted-work | driver.reader-basis.broadcast 0.153ms |
| 122d758ad88ea83300000000000011a1 | 49.575 | 1.360 | n/a | 0.000 | 37.361 | 2.201 | 0.879 | 0.010 | n/a | 0.687 | 5.908 | 1.147 | n/a | 0.021 | 38.722 | 0.781 | 0.021 | node-194/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 36.219ms; driver.publication.persist-deferred 1.934ms; driver.publication.persist-deferred 1.473ms |
| 122d758ad88ea833000000000000119e | 46.310 | 3.284 | n/a | 0.000 | 0.954 | 0.274 | 0.961 | 0.005 | n/a | 0.496 | 39.098 | 1.230 | n/a | 0.008 | 4.238 | 0.092 | 0.008 | gw-w/thread-1275/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 36.219ms; driver.reader-basis.broadcast 0.197ms |
| 122d758ad88ea8330000000000000761 | 46.281 | 8.429 | n/a | 0.000 | 7.386 | 17.576 | 2.282 | 0.026 | n/a | 0.197 | 9.736 | 0.642 | n/a | 0.007 | 15.816 | 0.342 | 0.007 | node-194/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.516ms; driver.publication.persist-deferred 1.132ms; driver.publication.persist-deferred 1.011ms; driver.publication.persist-deferred 1.006ms; driver.publication.persist-deferred 0.988ms |
| 122d758ad88ea833000000000000123e | 45.544 | 1.145 | n/a | 0.000 | 1.741 | 3.599 | 0.698 | 0.010 | n/a | 0.023 | 37.218 | 1.103 | n/a | 0.007 | 2.886 | 0.063 | 0.007 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.613ms; driver.publication.persist-deferred 0.839ms |
| 122d758ad88ea833000000000000119f | 45.041 | 1.130 | n/a | 0.000 | 0.381 | 2.721 | 0.381 | 0.004 | n/a | 0.026 | 40.003 | 0.388 | n/a | 0.007 | 1.511 | 0.034 | 0.007 | gw-w/thread-1310/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 36.219ms; driver.publication.persist-deferred 1.934ms; driver.reader-basis.broadcast 0.197ms |
| 122d758ad88ea8330000000000000600 | 44.981 | 4.011 | n/a | 0.000 | 0.110 | 0.452 | 1.351 | 0.008 | n/a | 0.337 | 5.711 | 32.988 | n/a | 0.013 | 4.120 | 0.092 | 0.013 | tx/thread-7487/transactor.triplex-function | driver.reader-basis.broadcast 0.217ms |
| 122d758ad88ea8330000000000000eac | 44.777 | 2.520 | n/a | 0.000 | 1.364 | 24.997 | 0.607 | 0.002 | n/a | 0.909 | 13.026 | 1.346 | n/a | 0.006 | 3.883 | 0.087 | 0.006 | node-194/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 5.612ms; driver.publication.persist-deferred 1.557ms |
| 122d758ad88ea8330000000000001a39 | 44.534 | 2.201 | n/a | 0.000 | 1.000 | 0.365 | 0.891 | 0.006 | n/a | 0.034 | 39.111 | 0.911 | n/a | 0.014 | 3.201 | 0.072 | 0.014 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.768ms; driver.reader-basis.broadcast 0.628ms |
| 122d758ad88ea833000000000000123f | 42.741 | 2.003 | n/a | 0.000 | 0.470 | 0.402 | 1.154 | 0.009 | n/a | 1.353 | 36.881 | 0.467 | n/a | 0.003 | 2.473 | 0.058 | 0.003 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.613ms |
| 122d758ad88ea8330000000000000e3f | 40.238 | 2.363 | n/a | 0.000 | 0.878 | 0.526 | 0.798 | 0.008 | n/a | 0.032 | 34.823 | 0.792 | n/a | 0.019 | 3.240 | 0.081 | 0.019 | gw-w/thread-1273/peer.transact-await (includes order/network/storage) | none observed |
| 122d758ad88ea833000000000000164d | 40.228 | 1.536 | n/a | 0.000 | 1.057 | 0.587 | 0.423 | 0.003 | n/a | 0.014 | 36.303 | 0.300 | n/a | 0.005 | 2.592 | 0.064 | 0.005 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.905ms |

## P2 / tail / commit / 5-10 facts (2118 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.171 | 0.000 | 0.000 | 0.384 | 1.708 | n/a | 0.000 | 0.724 | 0.523 | 0.712 | 0.007 | n/a | 0.063 | 3.008 | 0.551 | n/a | 0.013 | 2.599 | 0.317 | 0.013 |
| p99 | 30.034 | 1.921 | 0.040 | 0.884 | 5.014 | n/a | 0.000 | 9.751 | 6.695 | 2.778 | 0.031 | n/a | 1.052 | 11.870 | 1.786 | n/a | 0.056 | 11.540 | 0.682 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea833000000000000008f | 83.326 | 3.334 | n/a | 0.000 | 1.213 | 0.732 | 1.006 | 0.010 | n/a | 0.103 | 76.177 | 0.698 | n/a | 0.054 | 4.548 | 0.055 | 0.054 | gw-w/thread-1343/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.110ms |
| 122d758ad88ea833000000000000020f | 72.742 | 3.927 | n/a | 0.000 | 1.075 | 63.672 | 2.485 | 0.027 | n/a | 0.111 | 1.136 | 0.289 | n/a | 0.021 | 5.002 | 0.069 | 0.021 | node-194/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.053ms |
| 122d758ad88ea8330000000000001a38 | 52.170 | 1.268 | n/a | 0.000 | 1.050 | 0.334 | 0.634 | 0.008 | n/a | 0.243 | 47.233 | 1.389 | n/a | 0.011 | 2.318 | 0.044 | 0.011 | gw-w/thread-1325/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.628ms |
| 122d758ad88ea83300000000000011a1 | 49.575 | 1.360 | n/a | 0.000 | 37.361 | 2.201 | 0.879 | 0.010 | n/a | 0.687 | 5.908 | 1.147 | n/a | 0.021 | 38.722 | 0.781 | 0.021 | node-194/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 36.219ms; driver.publication.persist-deferred 1.934ms; driver.publication.persist-deferred 1.473ms |
| 122d758ad88ea833000000000000123e | 45.544 | 1.145 | n/a | 0.000 | 1.741 | 3.599 | 0.698 | 0.010 | n/a | 0.023 | 37.218 | 1.103 | n/a | 0.007 | 2.886 | 0.063 | 0.007 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.613ms; driver.publication.persist-deferred 0.839ms |
| 122d758ad88ea833000000000000119f | 45.041 | 1.130 | n/a | 0.000 | 0.381 | 2.721 | 0.381 | 0.004 | n/a | 0.026 | 40.003 | 0.388 | n/a | 0.007 | 1.511 | 0.034 | 0.007 | gw-w/thread-1310/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 36.219ms; driver.publication.persist-deferred 1.934ms; driver.reader-basis.broadcast 0.197ms |
| 122d758ad88ea8330000000000001a39 | 44.534 | 2.201 | n/a | 0.000 | 1.000 | 0.365 | 0.891 | 0.006 | n/a | 0.034 | 39.111 | 0.911 | n/a | 0.014 | 3.201 | 0.072 | 0.014 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.768ms; driver.reader-basis.broadcast 0.628ms |
| 122d758ad88ea833000000000000123f | 42.741 | 2.003 | n/a | 0.000 | 0.470 | 0.402 | 1.154 | 0.009 | n/a | 1.353 | 36.881 | 0.467 | n/a | 0.003 | 2.473 | 0.058 | 0.003 | gw-w/thread-1341/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.613ms |
| 122d758ad88ea8330000000000000e3f | 40.238 | 2.363 | n/a | 0.000 | 0.878 | 0.526 | 0.798 | 0.008 | n/a | 0.032 | 34.823 | 0.792 | n/a | 0.019 | 3.240 | 0.081 | 0.019 | gw-w/thread-1273/peer.transact-await (includes order/network/storage) | none observed |
| 122d758ad88ea833000000000000164d | 40.228 | 1.536 | n/a | 0.000 | 1.057 | 0.587 | 0.423 | 0.003 | n/a | 0.014 | 36.303 | 0.300 | n/a | 0.005 | 2.592 | 0.064 | 0.005 | gw-w/thread-1324/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.905ms |
| 122d758ad88ea8330000000000001a3a | 39.634 | 1.148 | n/a | 0.000 | 18.612 | 0.734 | 0.686 | 0.005 | n/a | 0.024 | 16.267 | 2.148 | n/a | 0.009 | 19.760 | 0.499 | 0.009 | node-194/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.768ms; driver.publication.persist-deferred 2.397ms; driver.publication.persist-deferred 1.303ms; driver.publication.persist-deferred 0.984ms; driver.reader-basis.broadcast 0.628ms |
| 122d758ad88ea8330000000000000602 | 37.165 | 4.626 | n/a | 0.000 | 0.794 | 1.235 | 0.767 | 0.010 | n/a | 0.050 | 28.156 | 1.509 | n/a | 0.018 | 5.420 | 0.146 | 0.018 | gw-w/thread-1350/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.228ms; driver.reader-basis.broadcast 0.217ms |
| 122d758ad88ea8330000000000000eae | 36.936 | 1.432 | n/a | 0.000 | 0.151 | 20.550 | 0.315 | 0.002 | n/a | 0.309 | 13.251 | 0.917 | n/a | 0.008 | 1.583 | 0.043 | 0.008 | node-194/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 5.612ms; driver.publication.persist-deferred 1.557ms |
| 122d758ad88ea83300000000000013a1 | 35.906 | 2.404 | n/a | 0.000 | 0.259 | 2.538 | 24.229 | 0.002 | n/a | 0.100 | 5.729 | 0.618 | n/a | 0.028 | 2.662 | 0.074 | 0.028 | gw-w/thread-1348/commit.prepare-and-validate | driver.publication.persist-deferred 1.530ms |
| 122d758ad88ea8330000000000000a3f | 34.914 | 1.920 | n/a | 0.000 | 0.988 | 3.417 | 21.844 | 0.003 | n/a | 0.014 | 6.250 | 0.463 | n/a | 0.014 | 2.908 | 0.083 | 0.014 | gw-w/thread-1319/commit.prepare-and-validate | driver.publication.persist-deferred 1.071ms |
| 122d758ad88ea8330000000000001a3d | 34.152 | 1.567 | n/a | 0.000 | 25.465 | 0.445 | 0.877 | 0.009 | n/a | 0.375 | 4.507 | 0.898 | n/a | 0.009 | 27.032 | 0.792 | 0.009 | node-194/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.768ms; driver.publication.persist-deferred 2.397ms; driver.publication.persist-deferred 1.679ms; driver.publication.persist-deferred 1.303ms; driver.publication.persist-deferred 0.984ms |
| 122d758ad88ea8330000000000001104 | 33.810 | 2.231 | n/a | 0.000 | 26.656 | 0.845 | 0.557 | 0.007 | n/a | 0.041 | 2.795 | 0.658 | n/a | 0.019 | 28.887 | 0.854 | 0.019 | node-194/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.349ms; driver.publication.persist-deferred 1.063ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.969ms; driver.publication.persist-deferred 0.957ms |
| 122d758ad88ea8330000000000001b8b | 33.300 | 1.305 | n/a | 0.000 | 27.118 | 0.261 | 0.747 | 0.007 | n/a | 0.026 | 3.037 | 0.788 | n/a | 0.011 | 28.424 | 0.854 | 0.011 | node-194/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.427ms; driver.publication.persist-deferred 1.172ms; driver.publication.persist-deferred 1.018ms; driver.publication.persist-deferred 1.016ms; driver.publication.persist-deferred 0.594ms |
| 122d758ad88ea83300000000000018e0 | 32.568 | 2.656 | n/a | 0.000 | 1.206 | 1.125 | 1.568 | 0.067 | n/a | 0.185 | 24.503 | 1.248 | n/a | 0.010 | 3.862 | 0.119 | 0.010 | gw-w/thread-1349/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.174ms |
| 122d758ad88ea8330000000000001c50 | 31.750 | 2.698 | n/a | 0.000 | 0.999 | 8.451 | 0.653 | 0.009 | n/a | 1.111 | 16.461 | 1.340 | n/a | 0.028 | 3.697 | 0.116 | 0.028 | gw-w/thread-1348/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.128ms |

## P2/P4 / read-your-own-write / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.441 | n/a | n/a | n/a | 40.393 | 5.170 | 2.889 | 0.000 | 7.716 | 3.447 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.007 | 62.652 | 0.831 | 0.007 |
| p99 | 271.769 | n/a | n/a | n/a | 83.233 | 189.500 | 22.647 | 0.000 | 182.434 | 50.831 | 45.960 | n/a | 0.035 | 0.000 | n/a | n/a | 0.021 | 245.369 | 1.000 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 122d758ad88ea8330000000000000c6f | 271.769 | 61.634 | 180.846 | 2.889 | 0.000 | 24.542 | 1.844 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 0.005 | 245.369 | 0.903 | 0.005 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.091ms |
| 122d758ad88ea8330000000000000c71 | 267.221 | 40.384 | 189.500 | 0.000 | 0.000 | 36.481 | 0.837 | 0.003 | n/a | 0.008 | 0.000 | n/a | n/a | 0.008 | 229.885 | 0.860 | 0.008 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.091ms |
| 122d758ad88ea8330000000000000c67 | 256.974 | 49.257 | 20.064 | 3.566 | 0.000 | 182.434 | 1.631 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.005 | 72.888 | 0.284 | 0.005 | node-194/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.402ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.097ms |
| 122d758ad88ea8330000000000000c6e | 243.069 | 40.748 | 118.977 | 0.000 | 0.000 | 82.469 | 0.859 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.006 | 159.725 | 0.657 | 0.006 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.091ms |
| 122d758ad88ea8330000000000000c66 | 239.264 | 64.047 | 0.224 | 8.447 | 0.000 | 129.234 | 37.295 | 0.003 | n/a | 0.006 | 0.000 | n/a | n/a | 0.008 | 72.719 | 0.304 | 0.008 | node-194/thread-3/socket.body-read | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.402ms; driver.publication.persist-deferred 1.227ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.097ms |
| 122d758ad88ea8330000000000001337 | 200.208 | 56.902 | 136.504 | 2.572 | 0.000 | 0.508 | 3.700 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.008 | 195.978 | 0.979 | 0.008 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.238ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.896ms; driver.publication.persist-deferred 0.870ms; driver.publication.persist-deferred 0.869ms |
| 122d758ad88ea8330000000000000c65 | 179.448 | 53.816 | 0.343 | 7.484 | 0.000 | 77.781 | 40.014 | 0.002 | n/a | 0.005 | 0.000 | n/a | n/a | 0.005 | 61.642 | 0.344 | 0.005 | node-194/thread-3/socket.body-read | driver.publication.persist-deferred 1.710ms; driver.publication.persist-deferred 1.402ms; driver.publication.persist-deferred 1.175ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.091ms |
| 122d758ad88ea8330000000000001332 | 174.547 | 28.833 | 1.791 | 2.149 | 0.000 | 129.173 | 1.386 | 11.201 | n/a | 0.008 | 0.000 | n/a | n/a | 0.005 | 32.774 | 0.188 | 0.005 | node-194/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.238ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.896ms; driver.publication.persist-deferred 0.870ms |
| 122d758ad88ea833000000000000132e | 162.255 | 35.265 | 0.281 | 2.614 | 0.000 | 109.281 | 3.362 | 11.443 | n/a | 0.004 | 0.000 | n/a | n/a | 0.005 | 38.160 | 0.235 | 0.005 | node-194/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.238ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.896ms; driver.publication.persist-deferred 0.875ms |
| 122d758ad88ea83300000000000013de | 147.826 | 42.902 | 71.728 | 1.356 | 0.000 | 25.484 | 6.343 | 0.002 | n/a | 0.003 | 0.000 | n/a | n/a | 0.010 | 115.985 | 0.785 | 0.010 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.108ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.004ms; driver.publication.persist-deferred 0.991ms |
| 122d758ad88ea833000000000000132c | 141.325 | 80.108 | 0.132 | 14.638 | 0.000 | 34.582 | 8.042 | 3.807 | n/a | 0.012 | 0.000 | n/a | n/a | 0.004 | 94.878 | 0.671 | 0.004 | node-194/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.238ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.896ms; driver.publication.persist-deferred 0.875ms |
| 122d758ad88ea8330000000000001159 | 139.547 | 42.349 | 65.081 | 3.833 | 0.000 | 22.370 | 5.890 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.005 | 111.262 | 0.797 | 0.005 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.452ms; driver.publication.persist-deferred 1.157ms; driver.publication.persist-deferred 1.025ms; driver.publication.persist-deferred 0.953ms; driver.publication.persist-deferred 0.914ms |
| 122d758ad88ea83300000000000013db | 132.885 | 29.440 | 79.192 | 22.647 | 0.000 | 0.347 | 1.244 | 0.003 | n/a | 0.005 | 0.000 | n/a | n/a | 0.007 | 131.280 | 0.988 | 0.007 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.108ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.004ms; driver.publication.persist-deferred 0.991ms |
| 122d758ad88ea8330000000000001b70 | 131.688 | 37.480 | 0.312 | 3.947 | 0.000 | 75.755 | 8.377 | 5.801 | n/a | 0.007 | 0.000 | n/a | n/a | 0.008 | 41.739 | 0.317 | 0.008 | node-194/thread-3/socket.body-read | driver.publication.persist-deferred 1.184ms; driver.publication.persist-deferred 1.156ms; driver.publication.persist-deferred 1.100ms; driver.publication.persist-deferred 0.941ms; driver.publication.persist-deferred 0.866ms |
| 122d758ad88ea83300000000000014d4 | 129.677 | 64.183 | 1.146 | 5.581 | 0.000 | 52.548 | 3.604 | 2.605 | n/a | 0.003 | 0.000 | n/a | n/a | 0.007 | 70.910 | 0.547 | 0.007 | node-194/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.073ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.998ms; driver.publication.persist-deferred 0.961ms; driver.publication.persist-deferred 0.896ms |
| 122d758ad88ea83300000000000013d8 | 124.562 | 37.774 | 20.584 | 4.984 | 0.000 | 49.107 | 7.428 | 4.669 | n/a | 0.011 | 0.000 | n/a | n/a | 0.005 | 63.341 | 0.509 | 0.005 | node-194/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 1.108ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.067ms; driver.publication.persist-deferred 1.004ms; driver.publication.persist-deferred 0.991ms |
| 122d758ad88ea8330000000000000c68 | 124.295 | 53.554 | 60.624 | 0.536 | 0.000 | 7.778 | 1.783 | 0.006 | n/a | 0.010 | 0.000 | n/a | n/a | 0.004 | 114.714 | 0.923 | 0.004 | node-194/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 1.402ms; driver.publication.persist-deferred 1.097ms; driver.publication.persist-deferred 1.091ms; driver.publication.persist-deferred 1.022ms; driver.publication.persist-deferred 0.952ms |
| 122d758ad88ea8330000000000001726 | 124.126 | 77.768 | 5.170 | 7.656 | 0.000 | 22.187 | 10.913 | 0.418 | n/a | 0.010 | 0.000 | n/a | n/a | 0.005 | 90.593 | 0.730 | 0.005 | node-194/thread-3/client.reach-decode-and-cache | driver.publication.persist-deferred 1.038ms; driver.publication.persist-deferred 0.985ms; driver.publication.persist-deferred 0.900ms; driver.publication.persist-deferred 0.859ms; driver.publication.persist-deferred 0.556ms |
| 122d758ad88ea8330000000000001530 | 124.103 | 32.883 | 1.445 | 5.907 | 0.000 | 33.122 | 4.754 | 45.960 | n/a | 0.026 | 0.000 | n/a | n/a | 0.006 | 40.235 | 0.324 | 0.006 | gw-r/thread-43/gateway.admission-wait | driver.publication.persist-deferred 0.964ms; driver.publication.persist-deferred 0.964ms; driver.publication.persist-deferred 0.948ms; driver.publication.persist-deferred 0.909ms; driver.publication.persist-deferred 0.896ms |
| 122d758ad88ea8330000000000001ae8 | 122.252 | 57.179 | 0.281 | 12.904 | 0.000 | 1.028 | 50.831 | 0.006 | n/a | 0.017 | 0.000 | n/a | n/a | 0.007 | 70.363 | 0.576 | 0.007 | gw-r/thread-41/gateway.admitted-work | driver.publication.persist-deferred 6.292ms; driver.publication.persist-deferred 1.774ms; driver.publication.persist-deferred 1.558ms; driver.publication.persist-deferred 1.359ms; driver.publication.persist-deferred 1.115ms |

## P1 / warmup / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.018 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.024 | 0.933 | 0.001 |
| p99 | 264.302 | n/a | n/a | n/a | 49.126 | n/a | 6.152 | 264.231 | 6.568 | 0.879 | 0.009 | n/a | 0.015 | 0.000 | n/a | n/a | 0.015 | 264.301 | 1.000 | 0.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a58672231272cb0b0000000000001bd2 | 264.382 | 0.585 | n/a | 0.000 | 263.793 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 264.379 | 1.000 | 0.003 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000001bd7 | 264.338 | 0.028 | n/a | 0.000 | 264.309 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.337 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000001bd6 | 264.302 | 0.029 | n/a | 0.000 | 264.272 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.301 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000001bd5 | 264.263 | 0.031 | n/a | 0.000 | 264.231 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.262 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000001bd4 | 264.229 | 0.033 | n/a | 0.000 | 264.194 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.228 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000001bd3 | 264.204 | 0.066 | n/a | 0.000 | 264.136 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.202 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| 5625b42525e829820000000000002c0a | 264.204 | 0.273 | n/a | 0.000 | 263.927 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 264.200 | 1.000 | 0.003 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e829820000000000002c0e | 264.175 | 0.017 | n/a | 0.000 | 264.157 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.174 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e829820000000000002c0d | 264.168 | 0.016 | n/a | 0.000 | 264.151 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.167 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e829820000000000002c0c | 264.156 | 0.019 | n/a | 0.000 | 264.136 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.155 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e829820000000000002c0b | 264.149 | 0.033 | n/a | 0.000 | 264.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.148 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000000dffb | 264.096 | 0.083 | n/a | 0.000 | 264.011 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.095 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 5625b42525e82982000000000000dffa | 264.036 | 0.036 | n/a | 0.000 | 263.999 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.035 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 5625b42525e82982000000000000dff8 | 264.021 | 0.150 | n/a | 0.000 | 263.869 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 264.019 | 1.000 | 0.002 | node-194/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 5625b42525e82982000000000000dff9 | 264.021 | 0.034 | n/a | 0.000 | 263.985 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.020 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 2b1bfbafc34d39dd0000000000001ef5 | 263.966 | 0.394 | n/a | 0.000 | 263.570 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.964 | 1.000 | 0.002 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000000e008 | 263.953 | 0.021 | n/a | 0.000 | 263.932 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 263.953 | 1.000 | 0.000 | node-194/thread-6/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 2b1bfbafc34d39dd000000000000e369 | 263.794 | 0.015 | n/a | 0.000 | 263.778 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.793 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 2b1bfbafc34d39dd000000000000e367 | 263.790 | 0.039 | n/a | 0.000 | 263.751 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.790 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| 2b1bfbafc34d39dd000000000000e368 | 263.784 | 0.016 | n/a | 0.000 | 263.768 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.783 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |

## P1 / L1 / read (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.926 | 0.001 |
| p99 | 257.090 | n/a | n/a | n/a | 0.359 | n/a | 0.000 | 256.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 257.087 | 1.000 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a58672231272cb0b000000000001764d | 260.160 | 0.161 | n/a | 0.000 | 259.998 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 260.159 | 1.000 | 0.002 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000023da8 | 257.090 | 0.186 | n/a | 0.000 | 256.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 257.087 | 1.000 | 0.002 | node-194/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| a58672231272cb0b000000000000cad1 | 26.789 | 21.403 | n/a | 1.160 | 0.000 | 0.781 | 3.422 | 0.009 | n/a | 0.009 | 0.000 | n/a | n/a | 0.004 | 22.564 | 0.842 | 0.004 | node-194/thread-4/reader.execute | none observed |
| a58672231272cb0b000000000001fd39 | 0.360 | 0.359 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.359 | 0.998 | 0.001 | node-194/thread-4/reader.execute | none observed |
| a58672231272cb0b000000000002382a | 0.302 | 0.302 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.302 | 0.998 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000013c75 | 0.295 | 0.292 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.292 | 0.989 | 0.003 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001db6b | 0.287 | 0.286 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.286 | 0.997 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001ce7a | 0.281 | 0.280 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.280 | 0.996 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000000caee | 0.281 | 0.279 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.279 | 0.993 | 0.002 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000000cada | 0.279 | 0.277 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.277 | 0.995 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001f2c1 | 0.266 | 0.265 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.265 | 0.997 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000018ecf | 0.258 | 0.257 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.257 | 0.993 | 0.002 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001d82e | 0.258 | 0.257 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.257 | 0.994 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001cf04 | 0.256 | 0.254 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.254 | 0.991 | 0.002 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001ac53 | 0.250 | 0.250 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.250 | 0.997 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001f413 | 0.248 | 0.247 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.247 | 0.994 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001d382 | 0.243 | 0.241 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.241 | 0.993 | 0.002 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000019f65 | 0.240 | 0.239 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.239 | 0.995 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000000cac8 | 0.236 | 0.235 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.235 | 0.995 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b000000000001e08a | 0.235 | 0.233 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.233 | 0.994 | 0.001 | node-194/thread-4/replica.pull-at | none observed |

## P1 / L4 / read (253 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.932 | 0.001 |
| p99 | 260.206 | n/a | n/a | n/a | 6.643 | n/a | 0.000 | 259.977 | 0.695 | 0.256 | 0.003 | n/a | 0.004 | 0.000 | n/a | n/a | 0.029 | 260.198 | 1.000 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a58672231272cb0b000000000002414e | 263.100 | 0.094 | n/a | 0.000 | 263.002 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 263.096 | 1.000 | 0.004 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b000000000002415a | 262.854 | 0.028 | n/a | 0.000 | 262.825 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 262.853 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000000e01f | 260.206 | 0.300 | n/a | 0.000 | 259.897 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 260.198 | 1.000 | 0.009 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000000e5d1 | 260.107 | 0.126 | n/a | 0.000 | 259.977 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 260.103 | 1.000 | 0.004 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000000e37f | 191.972 | 0.132 | n/a | 0.000 | 191.837 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 191.969 | 1.000 | 0.002 | node-194/thread-5/reader.straddle-await-ack | replica.apply-delta 0.025ms |
| a58672231272cb0b0000000000023dab | 191.054 | 0.084 | n/a | 0.000 | 190.969 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 191.052 | 1.000 | 0.002 | node-194/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 5625b42525e82982000000000000e009 | 190.884 | 0.403 | n/a | 0.000 | 190.467 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 190.869 | 1.000 | 0.015 | node-194/thread-6/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| 5625b42525e82982000000000000e012 | 37.273 | 26.392 | n/a | 4.902 | 0.000 | 0.695 | 5.264 | 0.005 | n/a | 0.011 | 0.000 | n/a | n/a | 0.004 | 31.294 | 0.840 | 0.004 | node-194/thread-6/reader.execute | none observed |
| 2b1bfbafc34d39dd000000000000e3b9 | 15.897 | 7.408 | n/a | 0.000 | 0.000 | 7.753 | 0.382 | 0.346 | n/a | 0.005 | 0.000 | n/a | n/a | 0.003 | 7.408 | 0.466 | 0.003 | node-194/thread-5/socket.wait-first-byte | none observed |
| a58672231272cb0b00000000000378f5 | 6.647 | 6.643 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.643 | 0.999 | 0.003 | node-194/thread-4/reader.execute | none observed |
| a58672231272cb0b0000000000036db3 | 6.194 | 6.193 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 6.193 | 1.000 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000036e25 | 6.121 | 6.118 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.118 | 1.000 | 0.003 | node-194/thread-4/replica.pull-at | none observed |
| 2b1bfbafc34d39dd000000000001c907 | 6.047 | 6.043 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 6.043 | 0.999 | 0.004 | node-194/thread-5/replica.pull-at | none observed |
| 5625b42525e82982000000000001b301 | 6.024 | 6.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.021 | 0.999 | 0.003 | node-194/thread-6/replica.pull-at | none observed |
| a58672231272cb0b0000000000037899 | 5.123 | 5.122 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 5.122 | 1.000 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000024114 | 4.819 | 4.816 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.816 | 0.999 | 0.003 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000037570 | 4.716 | 4.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.714 | 1.000 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000036e36 | 4.449 | 4.445 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 4.445 | 0.999 | 0.004 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000037878 | 4.448 | 4.447 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.447 | 1.000 | 0.002 | node-194/thread-4/replica.pull-at | none observed |
| 2b1bfbafc34d39dd000000000001c7dd | 3.792 | 3.789 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.789 | 0.999 | 0.003 | node-194/thread-5/replica.pull-at | none observed |

## P1 / L16 / read (238 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.023 | 0.946 | 0.001 |
| p99 | 285.552 | n/a | n/a | n/a | 10.996 | n/a | 0.000 | 285.525 | 1.087 | 0.913 | 0.005 | n/a | 0.007 | 0.000 | n/a | n/a | 0.025 | 285.551 | 1.000 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2b1bfbafc34d39dd000000000001d261 | 285.964 | 0.164 | n/a | 0.000 | 285.798 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.962 | 1.000 | 0.002 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001d278 | 285.597 | 0.071 | n/a | 0.000 | 285.525 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.596 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001d275 | 285.552 | 0.192 | n/a | 0.000 | 285.359 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.551 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001d276 | 285.542 | 0.034 | n/a | 0.000 | 285.507 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.541 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001d277 | 285.542 | 0.015 | n/a | 0.000 | 285.526 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.541 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000001c4bb | 284.925 | 0.054 | n/a | 0.000 | 284.870 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.924 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000001c4ba | 284.890 | 0.078 | n/a | 0.000 | 284.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.889 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000001c4b9 | 284.815 | 0.028 | n/a | 0.000 | 284.787 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.814 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000001c4b8 | 284.792 | 0.048 | n/a | 0.000 | 284.743 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.791 | 1.000 | 0.001 | node-194/thread-6/reader.straddle-await-ack | none observed |
| 5625b42525e82982000000000001c4b7 | 284.724 | 0.180 | n/a | 0.000 | 284.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 284.722 | 1.000 | 0.002 | node-194/thread-6/reader.straddle-await-ack | none observed |
| a58672231272cb0b00000000000380f7 | 275.664 | 0.048 | n/a | 0.000 | 275.615 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.663 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| a58672231272cb0b00000000000380f6 | 275.602 | 0.126 | n/a | 0.000 | 275.474 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.599 | 1.000 | 0.003 | node-194/thread-4/reader.straddle-await-ack | replica.apply-delta 0.020ms |
| a58672231272cb0b0000000000038121 | 274.714 | 0.013 | n/a | 0.000 | 274.701 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 274.714 | 1.000 | 0.000 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b0000000000038120 | 274.705 | 0.014 | n/a | 0.000 | 274.690 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.704 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b000000000003811f | 274.695 | 0.013 | n/a | 0.000 | 274.681 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.694 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| a58672231272cb0b000000000003811e | 274.692 | 0.030 | n/a | 0.000 | 274.661 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.691 | 1.000 | 0.001 | node-194/thread-4/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001ecde | 268.725 | 0.013 | n/a | 0.000 | 268.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.725 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001ecdd | 268.721 | 0.013 | n/a | 0.000 | 268.706 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.720 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001ecdc | 268.711 | 0.014 | n/a | 0.000 | 268.697 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.710 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |
| 2b1bfbafc34d39dd000000000001ecdb | 268.706 | 0.020 | n/a | 0.000 | 268.685 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.704 | 1.000 | 0.001 | node-194/thread-5/reader.straddle-await-ack | none observed |

## P1 / tail / read (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.925 | 0.001 |
| p99 | 0.055 | n/a | n/a | n/a | 0.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.053 | 0.971 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2b1bfbafc34d39dd000000000002bc1b | 0.055 | 0.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.053 | 0.960 | 0.002 | node-194/thread-5/replica.pull-at | none observed |
| 2b1bfbafc34d39dd000000000002bc1a | 0.035 | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.032 | 0.910 | 0.003 | node-194/thread-5/reader.execute | none observed |
| a58672231272cb0b0000000000047231 | 0.032 | 0.030 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.030 | 0.917 | 0.003 | node-194/thread-4/replica.pull-at | none observed |
| 5625b42525e82982000000000002b690 | 0.026 | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.024 | 0.925 | 0.002 | node-194/thread-6/reader.execute | none observed |
| 5625b42525e82982000000000002b693 | 0.017 | 0.017 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.017 | 0.971 | 0.000 | node-194/thread-6/replica.pull-at | none observed |
| 5625b42525e82982000000000002b694 | 0.015 | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.950 | 0.001 | node-194/thread-6/replica.pull-at | none observed |
| 2b1bfbafc34d39dd000000000002bc1c | 0.014 | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.898 | 0.001 | node-194/thread-5/replica.pull-at | none observed |
| 5625b42525e82982000000000002b691 | 0.013 | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.944 | 0.001 | node-194/thread-6/replica.pull-at | none observed |
| a58672231272cb0b0000000000047233 | 0.010 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.929 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| 5625b42525e82982000000000002b692 | 0.010 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.927 | 0.001 | node-194/thread-6/replica.pull-at | none observed |
| 2b1bfbafc34d39dd000000000002bc1d | 0.010 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.008 | 0.821 | 0.002 | node-194/thread-5/replica.pull-at | none observed |
| a58672231272cb0b0000000000047234 | 0.009 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.009 | 0.947 | 0.000 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000047235 | 0.008 | 0.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.007 | 0.909 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000047232 | 0.006 | 0.005 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.005 | 0.808 | 0.001 | node-194/thread-4/replica.pull-at | none observed |
| a58672231272cb0b0000000000047236 | 0.005 | 0.005 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.005 | 0.909 | 0.000 | node-194/thread-4/replica.pull-at | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1002.223 | n/a | n/a | n/a | 0.260 | n/a | 0.000 | 0.000 | 1.274 | 1000.293 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 1.149 | 0.260 | 0.000 | 1.149 |
| p99 | 1004.998 | n/a | n/a | n/a | 23.759 | n/a | 0.787 | 0.000 | 2.939 | 1002.225 | 0.008 | n/a | 0.030 | 0.000 | n/a | n/a | 1.285 | 24.547 | 0.029 | 1.285 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 507bdb4247cffea20000000000000017 | 1004.998 | 0.177 | n/a | 0.000 | 0.000 | 1.274 | 1002.225 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 1.285 | 0.177 | 0.000 | 1.285 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea20000000000000018 | 1002.223 | 0.260 | n/a | 0.000 | 0.000 | 0.509 | 1000.293 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 1.149 | 0.260 | 0.000 | 1.149 | gw-r/thread-43/journal/page | none observed |
| 507bdb4247cffea20000000000000019 | 833.110 | 23.759 | n/a | 0.787 | 0.000 | 2.939 | 805.322 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.272 | 24.547 | 0.029 | 0.272 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 266.080 | n/a | n/a | n/a | 2.090 | n/a | 0.000 | 0.000 | 0.544 | 255.720 | 0.008 | n/a | 0.021 | 0.000 | n/a | n/a | 0.091 | 2.090 | 0.002 | 0.091 |
| p99 | 954.357 | n/a | n/a | n/a | 2.447 | n/a | 0.000 | 0.000 | 7.776 | 951.593 | 0.018 | n/a | 0.028 | 0.000 | n/a | n/a | 0.101 | 2.447 | 0.009 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 507bdb4247cffea2000000000000001c | 954.357 | 2.090 | n/a | 0.000 | 0.000 | 0.544 | 951.593 | 0.018 | n/a | 0.021 | 0.000 | n/a | n/a | 0.091 | 2.090 | 0.002 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 507bdb4247cffea2000000000000001a | 266.080 | 2.447 | n/a | 0.000 | 0.000 | 7.776 | 255.720 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.101 | 2.447 | 0.009 | 0.101 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.440 | n/a | n/a | n/a | 2.365 | n/a | 0.000 | 0.000 | 1.240 | 16.784 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.099 | 2.365 | 0.005 | 0.099 |
| p99 | 993.671 | n/a | n/a | n/a | 4.995 | n/a | 0.000 | 0.000 | 2.792 | 987.652 | 0.016 | n/a | 0.049 | 0.000 | n/a | n/a | 0.397 | 4.995 | 0.519 | 0.397 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 507bdb4247cffea2000000000000001f | 993.671 | 4.995 | n/a | 0.000 | 0.000 | 0.588 | 987.652 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.397 | 4.995 | 0.005 | 0.397 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea20000000000000022 | 991.926 | 2.365 | n/a | 0.000 | 0.000 | 2.792 | 986.655 | 0.010 | n/a | 0.027 | 0.000 | n/a | n/a | 0.078 | 2.365 | 0.002 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea2000000000000001d | 20.440 | 2.173 | n/a | 0.000 | 0.000 | 1.240 | 16.784 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.183 | 2.173 | 0.106 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea20000000000000020 | 6.706 | 3.479 | n/a | 0.000 | 0.000 | 1.772 | 1.312 | 0.016 | n/a | 0.028 | 0.000 | n/a | n/a | 0.099 | 3.479 | 0.519 | 0.099 | node-194/thread-2/replica.fetch-feed | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 304.367 | n/a | n/a | n/a | 2.535 | n/a | 0.000 | 0.000 | 0.748 | 295.596 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.168 | 2.535 | 0.011 | 0.168 |
| p99 | 1003.058 | n/a | n/a | n/a | 6.418 | n/a | 0.000 | 0.000 | 3.906 | 1000.953 | 0.023 | n/a | 0.079 | 0.000 | n/a | n/a | 1.243 | 6.418 | 0.021 | 1.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 507bdb4247cffea20000000000000028 | 1003.058 | 0.160 | n/a | 0.000 | 0.000 | 0.629 | 1000.953 | 0.023 | n/a | 0.049 | 0.000 | n/a | n/a | 1.243 | 0.160 | 0.000 | 1.243 | gw-r/thread-46/journal/page | none observed |
| 507bdb4247cffea20000000000000026 | 525.785 | 5.672 | n/a | 0.000 | 0.000 | 3.906 | 515.988 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.168 | 5.672 | 0.011 | 0.168 | gw-r/thread-48/journal/page | none observed |
| 507bdb4247cffea20000000000000024 | 304.367 | 6.418 | n/a | 0.000 | 0.000 | 2.222 | 295.596 | 0.009 | n/a | 0.027 | 0.000 | n/a | n/a | 0.094 | 6.418 | 0.021 | 0.094 | gw-r/thread-43/journal/page | none observed |
| 507bdb4247cffea20000000000000023 | 182.101 | 2.535 | n/a | 0.000 | 0.000 | 0.748 | 178.523 | 0.019 | n/a | 0.079 | 0.000 | n/a | n/a | 0.196 | 2.535 | 0.014 | 0.196 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 307.793 | n/a | n/a | n/a | 2.834 | n/a | 0.000 | 0.000 | 0.744 | 301.962 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.087 | 2.834 | 0.012 | 0.087 |
| p99 | 1012.572 | n/a | n/a | n/a | 4.964 | n/a | 0.000 | 0.000 | 1.996 | 1005.375 | 0.024 | n/a | 0.045 | 0.000 | n/a | n/a | 0.177 | 4.964 | 0.028 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 507bdb4247cffea2000000000000002f | 1012.572 | 4.964 | n/a | 0.000 | 0.000 | 1.996 | 1005.375 | 0.014 | n/a | 0.045 | 0.000 | n/a | n/a | 0.177 | 4.964 | 0.005 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 507bdb4247cffea2000000000000002b | 429.334 | 2.834 | n/a | 0.000 | 0.000 | 1.610 | 424.772 | 0.010 | n/a | 0.028 | 0.000 | n/a | n/a | 0.080 | 2.834 | 0.007 | 0.080 | gw-r/thread-44/journal/page | none observed |
| 507bdb4247cffea2000000000000002a | 307.793 | 4.960 | n/a | 0.000 | 0.000 | 0.744 | 301.962 | 0.009 | n/a | 0.031 | 0.000 | n/a | n/a | 0.087 | 4.960 | 0.016 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea2000000000000002e | 193.117 | 2.350 | n/a | 0.000 | 0.000 | 0.573 | 190.070 | 0.009 | n/a | 0.027 | 0.000 | n/a | n/a | 0.087 | 2.350 | 0.012 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 507bdb4247cffea20000000000000029 | 81.724 | 2.294 | n/a | 0.000 | 0.000 | 0.699 | 78.598 | 0.024 | n/a | 0.019 | 0.000 | n/a | n/a | 0.089 | 2.294 | 0.028 | 0.089 | gw-r/thread-41/journal/page | none observed |

## P3 / tail / internal (3243 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.249 | n/a | n/a | n/a | 4.063 | n/a | 0.000 | 0.000 | 0.481 | 8.569 | 0.004 | n/a | 0.008 | 0.000 | n/a | n/a | 0.100 | 4.078 | 0.315 | 0.100 |
| p99 | 995.362 | n/a | n/a | n/a | 19.585 | n/a | 1.704 | 0.000 | 4.554 | 992.708 | 0.188 | n/a | 0.042 | 0.000 | n/a | n/a | 1.730 | 20.381 | 0.862 | 1.730 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 507bdb4247cffea2000000000000018b | 1010.516 | 0.102 | n/a | 0.000 | 0.000 | 0.559 | 1008.723 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 1.099 | 0.102 | 0.000 | 1.099 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea20000000000000047 | 1008.859 | 2.264 | n/a | 0.000 | 0.000 | 0.474 | 1005.975 | 0.032 | n/a | 0.038 | 0.000 | n/a | n/a | 0.076 | 2.264 | 0.002 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea200000000000019e3 | 1005.215 | 4.232 | n/a | 0.000 | 0.000 | 1.488 | 999.396 | 0.008 | n/a | 0.020 | 0.000 | n/a | n/a | 0.072 | 4.232 | 0.004 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 507bdb4247cffea20000000000001a2a | 1004.536 | 5.311 | n/a | 0.000 | 0.000 | 0.515 | 998.572 | 0.010 | n/a | 0.025 | 0.000 | n/a | n/a | 0.102 | 5.311 | 0.005 | 0.102 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea200000000000000ca | 1004.415 | 0.164 | n/a | 0.000 | 0.000 | 0.451 | 1002.583 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 1.163 | 0.164 | 0.000 | 1.163 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea20000000000000185 | 1004.342 | 0.171 | n/a | 0.000 | 0.000 | 3.445 | 1000.609 | 0.011 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 0.171 | 0.000 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 507bdb4247cffea2000000000000015e | 1004.182 | 2.357 | n/a | 0.000 | 0.000 | 0.432 | 1001.274 | 0.011 | n/a | 0.032 | 0.000 | n/a | n/a | 0.075 | 2.357 | 0.002 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 507bdb4247cffea200000000000000ae | 1003.695 | 2.383 | n/a | 0.000 | 0.000 | 0.461 | 1000.770 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.059 | 2.383 | 0.002 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 507bdb4247cffea2000000000000019a | 1003.333 | 2.344 | n/a | 0.000 | 0.000 | 0.844 | 1000.025 | 0.010 | n/a | 0.041 | 0.000 | n/a | n/a | 0.069 | 2.344 | 0.002 | 0.069 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea2000000000000008a | 1002.904 | 0.094 | n/a | 0.000 | 0.000 | 0.322 | 1001.339 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 1.102 | 0.094 | 0.000 | 1.102 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea20000000000000100 | 1002.632 | 5.010 | n/a | 0.000 | 0.000 | 0.517 | 996.958 | 0.010 | n/a | 0.030 | 0.000 | n/a | n/a | 0.106 | 5.010 | 0.005 | 0.106 | gw-r/thread-44/journal/page | none observed |
| 507bdb4247cffea2000000000000004c | 1002.585 | 0.152 | n/a | 0.000 | 0.000 | 0.536 | 1000.730 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 1.110 | 0.152 | 0.000 | 1.110 | gw-r/thread-43/journal/page | none observed |
| 507bdb4247cffea2000000000000009c | 1002.582 | 2.083 | n/a | 0.000 | 0.000 | 1.305 | 999.102 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.059 | 2.083 | 0.002 | 0.059 | gw-r/thread-46/journal/page | none observed |
| 507bdb4247cffea200000000000000e4 | 1002.449 | 0.108 | n/a | 0.000 | 0.000 | 0.758 | 1000.452 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 1.096 | 0.108 | 0.000 | 1.096 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea200000000000000a0 | 1002.447 | 0.138 | n/a | 0.000 | 0.000 | 0.467 | 1000.600 | 0.030 | n/a | 0.043 | 0.000 | n/a | n/a | 1.170 | 0.138 | 0.000 | 1.170 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea20000000000000030 | 1002.239 | 2.334 | n/a | 0.000 | 0.000 | 2.363 | 997.417 | 0.009 | n/a | 0.028 | 0.000 | n/a | n/a | 0.088 | 2.334 | 0.002 | 0.088 | gw-r/thread-41/journal/page | none observed |
| 507bdb4247cffea20000000000001a2e | 1002.217 | 0.101 | n/a | 0.000 | 0.000 | 0.623 | 1000.354 | 0.025 | n/a | 0.027 | 0.000 | n/a | n/a | 1.086 | 0.101 | 0.000 | 1.086 | gw-r/thread-43/journal/page | none observed |
| 507bdb4247cffea20000000000000082 | 1002.047 | 0.095 | n/a | 0.000 | 0.000 | 0.374 | 1000.438 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 1.103 | 0.095 | 0.000 | 1.103 | gw-r/thread-47/journal/page | none observed |
| 507bdb4247cffea20000000000000045 | 1002.007 | 0.114 | n/a | 0.000 | 0.000 | 0.355 | 1000.402 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 1.101 | 0.114 | 0.000 | 1.101 | gw-r/thread-45/journal/page | none observed |
| 507bdb4247cffea200000000000000fb | 1001.727 | 2.341 | n/a | 0.000 | 0.000 | 1.395 | 997.832 | 0.037 | n/a | 0.059 | 0.000 | n/a | n/a | 0.064 | 2.341 | 0.002 | 0.064 | gw-r/thread-43/journal/page | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.140 | n/a | n/a | n/a | 0.056 | n/a | 0.000 | 0.000 | 0.971 | 200.290 | 0.007 | n/a | 0.020 | 0.000 | n/a | n/a | 0.105 | 0.056 | 0.000 | 0.105 |
| p99 | 203.855 | n/a | n/a | n/a | 19.993 | n/a | 1.797 | 0.000 | 3.925 | 200.705 | 0.037 | n/a | 0.051 | 0.000 | n/a | n/a | 0.212 | 21.790 | 0.390 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d75b2942844de640000000000000006 | 203.855 | 0.123 | n/a | 0.000 | 0.000 | 2.990 | 200.604 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.096 | 0.123 | 0.001 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de640000000000000005 | 201.744 | 0.056 | n/a | 0.000 | 0.000 | 0.971 | 200.467 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.212 | 0.056 | 0.000 | 0.212 | gw-r/thread-48/journal/page | none observed |
| 6d75b2942844de640000000000000007 | 201.276 | 0.047 | n/a | 0.000 | 0.000 | 0.793 | 200.290 | 0.003 | n/a | 0.009 | 0.000 | n/a | n/a | 0.134 | 0.047 | 0.000 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 6d75b2942844de640000000000000f3d | 201.209 | 0.027 | n/a | 0.000 | 0.000 | 0.326 | 200.705 | 0.037 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 0.027 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de640000000000000f3e | 201.187 | 0.033 | n/a | 0.000 | 0.000 | 0.510 | 200.508 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.091 | 0.033 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 6d75b2942844de640000000000000f3c | 201.140 | 0.026 | n/a | 0.000 | 0.000 | 0.503 | 200.506 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.054 | 0.026 | 0.000 | 0.054 | gw-r/thread-47/journal/page | none observed |
| 6d75b2942844de640000000000000f43 | 74.847 | 17.273 | n/a | 0.000 | 0.000 | 3.064 | 54.297 | 0.006 | n/a | 0.005 | 0.000 | n/a | n/a | 0.202 | 17.273 | 0.231 | 0.202 | gw-r/thread-43/gateway.admitted-work | none observed |
| 6d75b2942844de640000000000000f42 | 58.487 | 15.125 | n/a | 0.000 | 0.000 | 3.925 | 39.229 | 0.030 | n/a | 0.020 | 0.000 | n/a | n/a | 0.159 | 15.125 | 0.259 | 0.159 | gw-r/thread-48/gateway.admitted-work | none observed |
| 6d75b2942844de640000000000000f41 | 55.904 | 19.993 | n/a | 1.797 | 0.000 | 0.984 | 33.000 | 0.015 | n/a | 0.010 | 0.000 | n/a | n/a | 0.105 | 21.790 | 0.390 | 0.105 | gw-r/thread-46/gateway.admitted-work | none observed |
| 507bdb4247cffea20000000000000002 | 13.459 | 0.150 | n/a | 0.000 | 0.000 | 3.900 | 9.201 | 0.007 | n/a | 0.006 | 0.000 | n/a | n/a | 0.193 | 0.150 | 0.011 | 0.193 | gw-r/thread-41/gateway.admitted-work | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.442 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.773 | 200.615 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 |
| p99 | 208.036 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 2.863 | 207.142 | 0.013 | n/a | 0.052 | 0.000 | n/a | n/a | 0.290 | 0.086 | 0.001 | 0.290 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d75b2942844de640000000000000010 | 208.036 | 0.038 | n/a | 0.000 | 0.000 | 0.727 | 207.142 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.081 | 0.038 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 6d75b2942844de640000000000000009 | 203.678 | 0.042 | n/a | 0.000 | 0.000 | 1.879 | 201.420 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.290 | 0.042 | 0.000 | 0.290 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de640000000000000008 | 202.100 | 0.029 | n/a | 0.000 | 0.000 | 0.974 | 200.948 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.084 | 0.029 | 0.000 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de64000000000000000d | 201.654 | 0.045 | n/a | 0.000 | 0.000 | 0.818 | 200.634 | 0.013 | n/a | 0.044 | 0.000 | n/a | n/a | 0.101 | 0.045 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de64000000000000000f | 201.442 | 0.040 | n/a | 0.000 | 0.000 | 0.729 | 200.555 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 6d75b2942844de64000000000000000b | 201.354 | 0.042 | n/a | 0.000 | 0.000 | 0.773 | 200.413 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 6d75b2942844de64000000000000000e | 201.330 | 0.031 | n/a | 0.000 | 0.000 | 0.579 | 200.615 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 0.031 | 0.000 | 0.063 | gw-r/thread-41/journal/page | none observed |
| 6d75b2942844de64000000000000000a | 128.704 | 0.086 | n/a | 0.000 | 0.000 | 2.863 | 125.615 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.124 | 0.086 | 0.001 | 0.124 | gw-r/thread-41/journal/page | none observed |
| 6d75b2942844de640000000000000011 | 53.581 | 0.035 | n/a | 0.000 | 0.000 | 0.452 | 53.026 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.054 | 0.035 | 0.001 | 0.054 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.253 | n/a | n/a | n/a | 0.030 | n/a | 0.000 | 0.000 | 0.563 | 200.655 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.075 | 0.030 | 0.000 | 0.075 |
| p99 | 201.857 | n/a | n/a | n/a | 0.104 | n/a | 0.000 | 0.000 | 0.899 | 200.860 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.115 | 0.104 | 0.001 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d75b2942844de640000000000000014 | 201.857 | 0.036 | n/a | 0.000 | 0.000 | 0.807 | 200.860 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de640000000000000013 | 201.330 | 0.030 | n/a | 0.000 | 0.000 | 0.536 | 200.655 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.061 | 0.030 | 0.000 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 6d75b2942844de640000000000000016 | 201.253 | 0.028 | n/a | 0.000 | 0.000 | 0.442 | 200.664 | 0.013 | n/a | 0.045 | 0.000 | n/a | n/a | 0.060 | 0.028 | 0.000 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 6d75b2942844de640000000000000015 | 201.239 | 0.028 | n/a | 0.000 | 0.000 | 0.563 | 200.525 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.077 | 0.028 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 6d75b2942844de640000000000000017 | 98.483 | 0.104 | n/a | 0.000 | 0.000 | 0.899 | 97.346 | 0.006 | n/a | 0.013 | 0.000 | n/a | n/a | 0.115 | 0.104 | 0.001 | 0.115 | gw-r/thread-46/journal/page | none observed |

## P3 / tail / read (835 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.008 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.559 | 200.433 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.068 | 0.039 | 0.000 | 0.068 |
| p99 | 204.763 | n/a | n/a | n/a | 0.106 | n/a | 0.000 | 0.000 | 3.817 | 203.553 | 3.081 | n/a | 0.095 | 0.000 | n/a | n/a | 0.216 | 0.106 | 0.001 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6d75b2942844de6400000000000000bf | 214.145 | 0.072 | n/a | 0.000 | 0.000 | 1.225 | 212.621 | 0.006 | n/a | 0.014 | 0.000 | n/a | n/a | 0.206 | 0.072 | 0.000 | 0.206 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de640000000000000195 | 210.489 | 0.031 | n/a | 0.000 | 0.000 | 0.423 | 209.942 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.062 | 0.031 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de640000000000000ee4 | 206.306 | 0.032 | n/a | 0.000 | 0.000 | 5.301 | 200.800 | 0.038 | n/a | 0.054 | 0.000 | n/a | n/a | 0.082 | 0.032 | 0.000 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 6d75b2942844de640000000000000098 | 206.003 | 0.078 | n/a | 0.000 | 0.000 | 1.298 | 204.335 | 0.014 | n/a | 0.039 | 0.000 | n/a | n/a | 0.239 | 0.078 | 0.000 | 0.239 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de64000000000000018d | 205.577 | 0.032 | n/a | 0.000 | 0.000 | 4.337 | 201.060 | 0.019 | n/a | 0.058 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-47/journal/page | none observed |
| 6d75b2942844de6400000000000001da | 205.427 | 0.059 | n/a | 0.000 | 0.000 | 4.705 | 200.475 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.136 | 0.059 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 6d75b2942844de6400000000000001ad | 205.259 | 0.029 | n/a | 0.000 | 0.000 | 0.633 | 204.421 | 0.018 | n/a | 0.093 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 6d75b2942844de6400000000000001dd | 205.137 | 0.048 | n/a | 0.000 | 0.000 | 0.639 | 204.309 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.091 | 0.048 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 6d75b2942844de64000000000000012a | 204.763 | 0.027 | n/a | 0.000 | 0.000 | 3.817 | 200.790 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.069 | 0.027 | 0.000 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de640000000000000291 | 204.679 | 0.061 | n/a | 0.000 | 0.000 | 0.766 | 203.553 | 0.016 | n/a | 0.047 | 0.000 | n/a | n/a | 0.237 | 0.061 | 0.000 | 0.237 | gw-r/thread-47/journal/page | none observed |
| 6d75b2942844de6400000000000001ef | 204.494 | 0.045 | n/a | 0.000 | 0.000 | 0.759 | 203.540 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.112 | 0.045 | 0.000 | 0.112 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de6400000000000001dc | 204.420 | 0.026 | n/a | 0.000 | 0.000 | 3.768 | 200.535 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.057 | 0.026 | 0.000 | 0.057 | gw-r/thread-41/journal/page | none observed |
| 6d75b2942844de6400000000000001cb | 204.384 | 0.030 | n/a | 0.000 | 0.000 | 0.518 | 203.732 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.066 | 0.030 | 0.000 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 6d75b2942844de640000000000000234 | 204.306 | 0.031 | n/a | 0.000 | 0.000 | 0.441 | 203.723 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.062 | 0.031 | 0.000 | 0.062 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de640000000000000237 | 204.233 | 0.028 | n/a | 0.000 | 0.000 | 0.423 | 203.655 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.063 | 0.028 | 0.000 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 6d75b2942844de6400000000000001e2 | 204.091 | 0.031 | n/a | 0.000 | 0.000 | 3.396 | 200.552 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.066 | 0.031 | 0.000 | 0.066 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de640000000000000238 | 204.056 | 0.029 | n/a | 0.000 | 0.000 | 0.538 | 203.358 | 0.025 | n/a | 0.045 | 0.000 | n/a | n/a | 0.061 | 0.029 | 0.000 | 0.061 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de6400000000000001ea | 204.036 | 0.024 | n/a | 0.000 | 0.000 | 0.442 | 203.465 | 0.012 | n/a | 0.040 | 0.000 | n/a | n/a | 0.052 | 0.024 | 0.000 | 0.052 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de640000000000000240 | 204.018 | 0.030 | n/a | 0.000 | 0.000 | 3.267 | 200.582 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.074 | 0.030 | 0.000 | 0.074 | gw-r/thread-43/journal/page | none observed |
| 6d75b2942844de6400000000000000e5 | 203.980 | 0.043 | n/a | 0.000 | 0.000 | 3.203 | 200.607 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.083 | 0.043 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

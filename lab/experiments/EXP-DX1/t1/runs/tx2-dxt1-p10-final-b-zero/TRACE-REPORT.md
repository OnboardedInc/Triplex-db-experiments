# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (587.791 ms, trace `a503e751587f37aa00000000000022be`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (551.710 ms, trace `a503e751587f37aa00000000000022bf`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (440.468 ms, trace `a503e751587f37aa00000000000022c0`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (356.327 ms, trace `a503e751587f37aa00000000000022c1`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (194.172 ms, trace `a503e751587f37aa00000000000022d0`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-final-b-zero`; source `f846bcd77f7858836861a5efb1d3c6fc15d2d22a`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 8532/8534 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 8534/8534. Raw trace bytes: 21482335.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 366 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13366.172 | 517.144 | 7.404 | 454 |
| baseline | 0 | 44265.753 | 826.819 | 27.119 | 1473 |
| L1 | 0 | 44980.331 | 827.946 | 24.493 | 1762 |
| L4 | 0 | 44968.111 | 8564.117 | 70.662 | 34223 |
| L16 | 0 | 44626.907 | 8696.326 | 69.555 | 35876 |
| L64 | 0 | 44831.571 | 918.148 | 20.907 | 1560 |
| L256 | 0 | 44021.781 | 909.869 | 18.453 | 1598 |
| L1024 | 0 | 44917.320 | 947.212 | 21.526 | 1550 |
| recovery | 0 | 59019.085 | 1316.957 | 35.120 | 2434 |
| p4mix | 0 | 44022.092 | 965.588 | 25.534 | 1702 |
| p4h1 | 0 | 44454.003 | 933.443 | 26.748 | 1500 |
| grow3 | 0 | 4493.215 | 1205.327 | 4.283 | 244 |
| p4h3 | 0 | 44993.067 | 982.647 | 18.946 | 1709 |
| grow10 | 0 | 9264.873 | 3947.353 | 14.361 | 317 |
| p4h10 | 0 | 44017.208 | 900.034 | 18.790 | 1420 |
| presweep | 0 | 44420.712 | 999.244 | 14.704 | 1686 |
| sweep | 0 | 44739.028 | 1323.925 | 14.238 | 1588 |
| tail | 0 | 220366.225 | 21161.422 | 201.225 | 75452 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| a503e751587f37aa00000000000022be | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |
| a503e751587f37aa00000000000022be | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace a503e751587f37aa00000000000022be waited: []

| a503e751587f37aa00000000000022bf | driver.queue.scheduler-dispatch | 0.039 | none | 1 / 32 |
| a503e751587f37aa00000000000022bf | driver.queue.scheduler-late | 0.001 | none | 1 / 32 |

Observed active steps while trace a503e751587f37aa00000000000022bf waited: []

| a503e751587f37aa00000000000022c0 | driver.queue.scheduler-late | 2.949 | none | 2 / 32 |
| a503e751587f37aa00000000000022c0 | driver.queue.scheduler-dispatch | 0.021 | none | 2 / 32 |

Observed active steps while trace a503e751587f37aa00000000000022c0 waited: []

| a503e751587f37aa00000000000022c1 | driver.queue.scheduler-dispatch | 0.039 | none | 3 / 32 |
| a503e751587f37aa00000000000022c1 | driver.queue.scheduler-late | 0.002 | none | 3 / 32 |

Observed active steps while trace a503e751587f37aa00000000000022c1 waited: []

| a503e751587f37aa00000000000022d0 | driver.queue.scheduler-dispatch | 0.077 | none | 0 / 32 |
| a503e751587f37aa00000000000022d0 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace a503e751587f37aa00000000000022d0 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.028 | 0.224 | 0.000 | 0.616 | 4.310 | 0.447 | 0.000 | 0.075 | 1.243 | 5.260 | 0.030 | n/a | 0.350 | 12.458 | n/a | n/a | 0.029 | 4.976 | 0.186 | 0.029 |
| p99 | 62.509 | 4.912 | 0.064 | 4.559 | 12.410 | n/a | 3.720 | 2.327 | 3.182 | 22.604 | 3.437 | n/a | 3.947 | 34.661 | n/a | n/a | 0.223 | 12.918 | 0.395 | 0.223 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000000f2 | 62.509 | 12.410 | 0.447 | 0.000 | 0.061 | 1.981 | 22.604 | 0.118 | n/a | 1.805 | 23.056 | n/a | n/a | 0.026 | 12.918 | 0.207 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000ef | 60.426 | 10.857 | n/a | 0.000 | 0.391 | 0.941 | 9.753 | 3.437 | n/a | 0.163 | 34.661 | n/a | n/a | 0.223 | 11.249 | 0.186 | 0.223 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000102 | 43.148 | 6.167 | 0.359 | 0.000 | 0.227 | 2.218 | 13.438 | 0.067 | n/a | 0.604 | 19.965 | n/a | n/a | 0.104 | 6.753 | 0.157 | 0.104 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000ff | 41.202 | 7.008 | n/a | 2.279 | 1.178 | 0.912 | 1.500 | 0.033 | n/a | 0.108 | 28.139 | n/a | n/a | 0.043 | 10.465 | 0.254 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| a503e751587f37aa0000000000000120 | 36.676 | 5.065 | 0.172 | 0.407 | 0.061 | 1.317 | 7.010 | 0.030 | n/a | 0.304 | 22.285 | n/a | n/a | 0.027 | 5.704 | 0.156 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000fc | 36.030 | 4.182 | 0.286 | 0.000 | 0.112 | 2.790 | 13.115 | 0.053 | n/a | 1.072 | 14.377 | n/a | n/a | 0.043 | 4.580 | 0.127 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000104 | 35.532 | 4.310 | 0.209 | 0.000 | 0.077 | 1.847 | 14.025 | 0.052 | n/a | 0.136 | 14.846 | n/a | n/a | 0.029 | 4.596 | 0.129 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000010a | 35.185 | 4.607 | 0.268 | 0.000 | 0.060 | 1.590 | 11.478 | 0.059 | n/a | 3.947 | 13.157 | n/a | n/a | 0.020 | 4.935 | 0.140 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000f6 | 33.605 | 5.691 | 0.282 | 0.000 | 0.056 | 1.465 | 15.156 | 0.030 | n/a | 3.325 | 7.572 | n/a | n/a | 0.029 | 6.029 | 0.179 | 0.029 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa00000000000000fa | 33.204 | 8.519 | 0.311 | 0.000 | 0.052 | 2.189 | 9.633 | 0.038 | n/a | 0.317 | 12.120 | n/a | n/a | 0.026 | 8.882 | 0.267 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.095ms |
| a503e751587f37aa0000000000000116 | 32.198 | 7.186 | n/a | 3.720 | 0.075 | 0.971 | 1.620 | 0.021 | n/a | 0.425 | 18.152 | n/a | n/a | 0.028 | 10.981 | 0.341 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000107 | 32.026 | 2.792 | n/a | 2.428 | 0.057 | 0.754 | 5.260 | 0.023 | n/a | 0.111 | 20.581 | n/a | n/a | 0.020 | 5.277 | 0.165 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000105 | 30.937 | 7.453 | n/a | 3.628 | 0.208 | 0.864 | 5.788 | 0.026 | n/a | 0.462 | 12.458 | n/a | n/a | 0.051 | 11.289 | 0.365 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| a503e751587f37aa0000000000000118 | 30.175 | 3.837 | 0.255 | 0.276 | 0.043 | 1.430 | 6.080 | 0.029 | n/a | 0.105 | 18.101 | n/a | n/a | 0.019 | 4.412 | 0.146 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000114 | 29.028 | 4.580 | 0.294 | 0.351 | 0.191 | 2.117 | 11.987 | 0.045 | n/a | 0.385 | 9.011 | n/a | n/a | 0.066 | 5.416 | 0.187 | 0.066 | gw-w/thread-45/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000000124 | 27.181 | 3.652 | 0.249 | 0.000 | 0.105 | 3.182 | 4.939 | 0.029 | n/a | 0.080 | 14.910 | n/a | n/a | 0.035 | 4.006 | 0.147 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000f8 | 26.842 | 4.863 | n/a | 1.180 | 0.119 | 1.174 | 3.147 | 0.025 | n/a | 0.414 | 15.882 | n/a | n/a | 0.039 | 6.161 | 0.230 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000010e | 25.576 | 5.000 | 0.115 | 0.471 | 0.055 | 1.780 | 6.422 | 0.035 | n/a | 0.439 | 11.240 | n/a | n/a | 0.020 | 5.640 | 0.221 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000011c | 24.254 | 4.084 | 0.232 | 0.271 | 0.146 | 1.123 | 6.845 | 0.287 | n/a | 0.105 | 11.105 | n/a | n/a | 0.054 | 4.733 | 0.195 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000011d | 23.251 | 2.110 | n/a | 0.000 | 0.053 | 0.905 | 3.591 | 0.030 | n/a | 0.102 | 16.439 | n/a | n/a | 0.021 | 2.163 | 0.093 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.890 | 0.757 | 0.000 | 0.617 | 2.698 | n/a | 0.000 | 0.119 | 0.905 | 1.928 | 0.024 | n/a | 0.350 | 11.160 | n/a | n/a | 0.030 | 2.833 | 0.191 | 0.030 |
| p99 | 26.842 | 2.005 | 0.000 | 1.776 | 4.863 | n/a | 1.180 | 2.327 | 1.396 | 4.526 | 0.064 | n/a | 1.031 | 16.439 | n/a | n/a | 0.125 | 6.161 | 0.395 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000000f8 | 26.842 | 4.863 | n/a | 1.180 | 0.119 | 1.174 | 3.147 | 0.025 | n/a | 0.414 | 15.882 | n/a | n/a | 0.039 | 6.161 | 0.230 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000011d | 23.251 | 2.110 | n/a | 0.000 | 0.053 | 0.905 | 3.591 | 0.030 | n/a | 0.102 | 16.439 | n/a | n/a | 0.021 | 2.163 | 0.093 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000010f | 20.813 | 4.037 | n/a | 0.000 | 0.168 | 1.396 | 2.261 | 0.064 | n/a | 1.031 | 11.804 | n/a | n/a | 0.052 | 4.205 | 0.202 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000111 | 17.660 | 2.356 | n/a | 0.000 | 0.328 | 0.707 | 1.481 | 0.023 | n/a | 0.350 | 12.387 | n/a | n/a | 0.028 | 2.683 | 0.152 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000f4 | 16.890 | 2.252 | n/a | 0.000 | 0.065 | 0.701 | 1.928 | 0.026 | n/a | 0.633 | 11.160 | n/a | n/a | 0.125 | 2.317 | 0.137 | 0.125 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| a503e751587f37aa0000000000000121 | 16.058 | 2.785 | n/a | 0.000 | 0.047 | 1.243 | 1.302 | 0.024 | n/a | 0.364 | 10.272 | n/a | n/a | 0.021 | 2.833 | 0.176 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000119 | 15.346 | 3.730 | n/a | 0.000 | 2.327 | 1.068 | 1.142 | 0.023 | n/a | 0.345 | 6.673 | n/a | n/a | 0.037 | 6.058 | 0.395 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| a503e751587f37aa0000000000000125 | 14.424 | 2.698 | n/a | 0.000 | 0.052 | 0.771 | 4.526 | 0.024 | n/a | 0.325 | 6.004 | n/a | n/a | 0.023 | 2.750 | 0.191 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000000fd | 12.494 | 2.467 | n/a | 0.000 | 2.053 | 0.841 | 1.219 | 0.021 | n/a | 0.139 | 5.723 | n/a | n/a | 0.030 | 4.520 | 0.362 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.818 | 0.437 | 0.000 | 0.623 | 3.473 | 0.313 | 0.000 | 0.052 | 0.744 | 1.388 | 0.017 | n/a | 0.073 | 4.882 | n/a | n/a | 0.018 | 3.919 | 0.274 | 0.018 |
| p99 | 33.824 | 2.006 | 0.000 | 1.620 | 9.615 | n/a | 0.549 | 2.458 | 2.235 | 11.543 | 0.079 | n/a | 0.212 | 16.917 | n/a | n/a | 0.040 | 9.908 | 0.601 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000000128 | 33.824 | 5.556 | 0.286 | 0.549 | 0.116 | 1.753 | 8.350 | 0.072 | n/a | 0.187 | 16.917 | n/a | n/a | 0.040 | 6.507 | 0.192 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022e3 | 25.139 | 4.460 | 0.229 | 0.000 | 0.064 | 2.235 | 2.143 | 0.017 | n/a | 0.050 | 15.925 | n/a | n/a | 0.017 | 4.753 | 0.189 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023ef | 23.493 | 3.473 | 0.313 | 0.000 | 0.052 | 0.986 | 5.607 | 0.015 | n/a | 0.212 | 12.815 | n/a | n/a | 0.018 | 3.838 | 0.163 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.376ms |
| a503e751587f37aa00000000000001dd | 22.384 | 3.126 | 0.207 | 0.315 | 0.055 | 1.079 | 11.543 | 0.079 | n/a | 0.095 | 5.859 | n/a | n/a | 0.026 | 3.703 | 0.165 | 0.026 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.059ms |
| a503e751587f37aa00000000000021f9 | 19.466 | 5.032 | 0.204 | 0.000 | 0.094 | 1.354 | 4.269 | 0.017 | n/a | 0.073 | 8.401 | n/a | n/a | 0.022 | 5.330 | 0.274 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022e1 | 16.491 | 9.615 | 0.246 | 0.000 | 0.048 | 1.132 | 1.388 | 0.017 | n/a | 0.191 | 3.839 | n/a | n/a | 0.016 | 9.908 | 0.601 | 0.016 | node-14/thread-6/client.persist-and-resolve | none observed |
| a503e751587f37aa00000000000021fa | 14.818 | 4.766 | n/a | 0.000 | 0.048 | 0.633 | 1.189 | 0.013 | n/a | 0.050 | 8.095 | n/a | n/a | 0.024 | 4.814 | 0.325 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000ff6 | 10.486 | 3.027 | n/a | 0.000 | 2.458 | 0.700 | 0.722 | 0.011 | n/a | 0.069 | 3.482 | n/a | n/a | 0.017 | 5.485 | 0.523 | 0.017 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021fc | 10.313 | 3.877 | n/a | 0.000 | 0.042 | 0.373 | 1.225 | 0.013 | n/a | 0.076 | 4.682 | n/a | n/a | 0.025 | 3.919 | 0.380 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023f0 | 9.420 | 3.296 | n/a | 0.000 | 0.033 | 0.509 | 1.041 | 0.012 | n/a | 0.047 | 4.467 | n/a | n/a | 0.015 | 3.329 | 0.353 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023eb | 9.405 | 3.090 | 0.266 | 0.000 | 0.069 | 0.744 | 1.221 | 0.017 | n/a | 0.050 | 3.927 | n/a | n/a | 0.021 | 3.424 | 0.364 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.391ms |
| a503e751587f37aa00000000000023ec | 8.922 | 1.969 | n/a | 0.000 | 0.033 | 0.411 | 1.496 | 0.024 | n/a | 0.087 | 4.882 | n/a | n/a | 0.018 | 2.003 | 0.224 | 0.018 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021ff | 7.454 | 1.816 | n/a | 0.000 | 0.032 | 0.676 | 0.798 | 0.012 | n/a | 0.050 | 4.055 | n/a | n/a | 0.014 | 1.848 | 0.248 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.848 | 0.251 | 0.000 | 0.455 | 3.628 | n/a | 0.000 | 0.069 | 1.248 | 4.057 | 0.033 | n/a | 0.245 | 10.093 | n/a | n/a | 0.028 | 4.071 | 0.185 | 0.028 |
| p99 | 70.643 | 4.215 | 0.000 | 3.993 | 9.396 | n/a | 2.513 | 2.766 | 6.980 | 16.951 | 0.308 | n/a | 3.682 | 59.989 | n/a | n/a | 0.106 | 9.534 | 0.375 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa000000000000018b | 70.643 | 3.456 | 0.181 | 0.323 | 0.038 | 2.796 | 14.901 | 0.090 | n/a | 0.095 | 48.742 | n/a | n/a | 0.021 | 3.998 | 0.057 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001cf | 66.747 | 4.603 | n/a | 0.000 | 0.016 | 0.675 | 1.339 | 0.018 | n/a | 0.099 | 59.989 | n/a | n/a | 0.010 | 4.618 | 0.069 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa0000000000000130 | 63.705 | 4.608 | n/a | 0.000 | 0.164 | 1.024 | 1.707 | 0.025 | n/a | 0.450 | 55.657 | n/a | n/a | 0.071 | 4.772 | 0.075 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000131 | 57.022 | 7.033 | 0.170 | 0.512 | 0.070 | 5.017 | 16.894 | 0.050 | n/a | 0.221 | 27.032 | n/a | n/a | 0.024 | 7.785 | 0.137 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.078ms; driver.publication.persist-deferred 0.019ms |
| a503e751587f37aa00000000000001b2 | 41.771 | 9.396 | n/a | 0.000 | 0.139 | 1.400 | 10.098 | 0.046 | n/a | 0.127 | 20.502 | n/a | n/a | 0.064 | 9.534 | 0.228 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| a503e751587f37aa00000000000001b9 | 41.234 | 3.312 | 0.204 | 0.236 | 0.058 | 1.983 | 16.219 | 0.058 | n/a | 0.157 | 18.977 | n/a | n/a | 0.029 | 3.810 | 0.092 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| a503e751587f37aa00000000000001d2 | 34.994 | 4.459 | 0.159 | 0.372 | 0.051 | 5.126 | 13.422 | 0.029 | n/a | 0.301 | 11.047 | n/a | n/a | 0.028 | 5.041 | 0.144 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.050ms |
| a503e751587f37aa00000000000001bc | 34.874 | 3.608 | 0.265 | 0.292 | 0.210 | 1.633 | 8.490 | 0.308 | n/a | 0.114 | 19.864 | n/a | n/a | 0.090 | 4.375 | 0.125 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |
| a503e751587f37aa000000000000015a | 34.826 | 3.291 | 0.230 | 0.264 | 0.038 | 2.315 | 16.951 | 0.033 | n/a | 1.129 | 10.559 | n/a | n/a | 0.017 | 3.823 | 0.110 | 0.017 | gw-w/thread-46/gateway.admitted-work | driver.publication.readback 0.121ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| a503e751587f37aa0000000000000138 | 34.490 | 6.835 | n/a | 2.513 | 0.066 | 1.205 | 4.712 | 0.024 | n/a | 0.141 | 18.967 | n/a | n/a | 0.028 | 9.414 | 0.273 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001d4 | 34.122 | 4.481 | 0.251 | 0.401 | 0.095 | 1.534 | 16.801 | 0.031 | n/a | 1.810 | 8.672 | n/a | n/a | 0.046 | 5.228 | 0.153 | 0.046 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.025ms |
| a503e751587f37aa000000000000012a | 34.016 | 5.356 | 0.206 | 0.000 | 0.127 | 6.321 | 9.799 | 0.049 | n/a | 0.144 | 11.969 | n/a | n/a | 0.045 | 5.689 | 0.167 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000143 | 33.559 | 4.536 | 0.131 | 0.359 | 0.041 | 1.320 | 12.749 | 0.029 | n/a | 0.107 | 14.269 | n/a | n/a | 0.018 | 5.067 | 0.151 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000135 | 33.521 | 3.781 | 0.334 | 0.000 | 0.069 | 3.279 | 13.070 | 0.041 | n/a | 0.111 | 12.811 | n/a | n/a | 0.024 | 4.185 | 0.125 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000177 | 33.019 | 3.457 | 0.258 | 0.278 | 0.078 | 0.974 | 14.961 | 0.037 | n/a | 0.683 | 12.260 | n/a | n/a | 0.032 | 4.071 | 0.123 | 0.032 | gw-w/thread-47/gateway.admitted-work | none observed |
| a503e751587f37aa00000000000001be | 32.327 | 5.355 | n/a | 0.000 | 1.499 | 4.043 | 1.228 | 0.021 | n/a | 0.083 | 20.063 | n/a | n/a | 0.036 | 6.854 | 0.212 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000147 | 30.913 | 5.276 | 0.280 | 0.000 | 0.063 | 1.632 | 10.549 | 0.063 | n/a | 1.666 | 11.357 | n/a | n/a | 0.027 | 5.619 | 0.182 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000012c | 30.122 | 5.054 | 0.230 | 0.532 | 0.112 | 1.583 | 8.313 | 0.080 | n/a | 1.589 | 12.582 | n/a | n/a | 0.047 | 5.928 | 0.197 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001a6 | 29.979 | 7.334 | n/a | 0.000 | 0.200 | 1.651 | 7.471 | 0.068 | n/a | 0.240 | 12.937 | n/a | n/a | 0.079 | 7.534 | 0.251 | 0.079 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000017d | 29.106 | 2.979 | 0.176 | 0.215 | 0.109 | 1.378 | 12.011 | 0.054 | n/a | 0.696 | 11.464 | n/a | n/a | 0.024 | 3.479 | 0.120 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.192 | 0.000 | 0.000 | 0.486 | 2.511 | n/a | 0.000 | 0.063 | 0.977 | 1.705 | 0.024 | n/a | 0.529 | 8.342 | n/a | n/a | 0.029 | 3.054 | 0.179 | 0.029 |
| p99 | 63.705 | 1.003 | 0.000 | 0.965 | 7.759 | n/a | 0.000 | 2.766 | 4.851 | 10.051 | 0.152 | n/a | 1.684 | 55.657 | n/a | n/a | 0.106 | 7.816 | 0.366 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000000130 | 63.705 | 4.608 | n/a | 0.000 | 0.164 | 1.024 | 1.707 | 0.025 | n/a | 0.450 | 55.657 | n/a | n/a | 0.071 | 4.772 | 0.075 | 0.071 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000133 | 26.072 | 7.759 | n/a | 0.000 | 0.057 | 2.907 | 10.051 | 0.152 | n/a | 0.671 | 4.441 | n/a | n/a | 0.035 | 7.816 | 0.300 | 0.035 | node-14/thread-0/driver.execute | none observed |
| a503e751587f37aa0000000000000159 | 22.049 | 1.734 | n/a | 0.000 | 0.054 | 4.231 | 6.815 | 0.020 | n/a | 1.684 | 7.485 | n/a | n/a | 0.025 | 1.788 | 0.081 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| a503e751587f37aa000000000000016a | 21.946 | 4.160 | n/a | 0.000 | 2.674 | 4.203 | 4.294 | 0.092 | n/a | 1.003 | 5.479 | n/a | n/a | 0.042 | 6.834 | 0.311 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001ca | 20.121 | 2.961 | n/a | 0.000 | 0.093 | 0.768 | 1.823 | 0.023 | n/a | 0.110 | 14.293 | n/a | n/a | 0.050 | 3.054 | 0.152 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001c2 | 19.141 | 1.922 | n/a | 0.000 | 0.054 | 0.705 | 3.206 | 0.022 | n/a | 0.439 | 12.763 | n/a | n/a | 0.029 | 1.977 | 0.103 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| a503e751587f37aa000000000000018e | 18.144 | 4.002 | n/a | 0.000 | 0.202 | 1.925 | 4.460 | 0.077 | n/a | 0.701 | 6.670 | n/a | n/a | 0.106 | 4.204 | 0.232 | 0.106 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000144 | 17.647 | 2.051 | n/a | 0.000 | 0.051 | 1.004 | 2.818 | 0.060 | n/a | 1.063 | 10.576 | n/a | n/a | 0.023 | 2.102 | 0.119 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000015e | 16.995 | 2.381 | n/a | 0.000 | 1.488 | 0.790 | 1.503 | 0.060 | n/a | 0.651 | 10.093 | n/a | n/a | 0.029 | 3.869 | 0.228 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001c4 | 16.849 | 2.511 | n/a | 0.000 | 0.063 | 1.985 | 1.808 | 0.054 | n/a | 0.668 | 9.730 | n/a | n/a | 0.030 | 2.574 | 0.153 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| a503e751587f37aa0000000000000173 | 16.507 | 2.738 | n/a | 0.000 | 2.766 | 4.851 | 1.050 | 0.021 | n/a | 0.073 | 4.988 | n/a | n/a | 0.019 | 5.504 | 0.333 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.146ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.021ms |
| a503e751587f37aa000000000000017e | 16.192 | 2.171 | n/a | 0.000 | 0.078 | 1.854 | 2.138 | 0.054 | n/a | 1.507 | 8.342 | n/a | n/a | 0.048 | 2.249 | 0.139 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001d6 | 15.763 | 3.016 | n/a | 0.000 | 0.108 | 0.981 | 1.209 | 0.022 | n/a | 0.120 | 10.254 | n/a | n/a | 0.052 | 3.124 | 0.198 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000017a | 15.595 | 2.735 | n/a | 0.000 | 0.055 | 0.862 | 1.273 | 0.023 | n/a | 0.529 | 10.094 | n/a | n/a | 0.025 | 2.790 | 0.179 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001ce | 15.337 | 2.122 | n/a | 0.000 | 1.590 | 0.779 | 1.470 | 0.022 | n/a | 0.101 | 9.233 | n/a | n/a | 0.020 | 3.712 | 0.242 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001ba | 15.145 | 2.351 | n/a | 0.000 | 0.044 | 1.198 | 1.906 | 0.046 | n/a | 0.633 | 8.942 | n/a | n/a | 0.025 | 2.395 | 0.158 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000188 | 12.847 | 1.792 | n/a | 0.000 | 0.044 | 0.644 | 1.097 | 0.019 | n/a | 0.360 | 8.871 | n/a | n/a | 0.020 | 1.836 | 0.143 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001ac | 12.337 | 3.554 | n/a | 0.000 | 0.134 | 0.977 | 1.559 | 0.024 | n/a | 0.174 | 5.862 | n/a | n/a | 0.052 | 3.688 | 0.299 | 0.052 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000190 | 11.607 | 2.648 | n/a | 0.000 | 1.588 | 0.736 | 1.559 | 0.066 | n/a | 0.703 | 4.288 | n/a | n/a | 0.021 | 4.235 | 0.365 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000001a2 | 10.641 | 2.030 | n/a | 0.000 | 0.060 | 0.693 | 1.120 | 0.020 | n/a | 0.116 | 6.573 | n/a | n/a | 0.029 | 2.090 | 0.196 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |

## P2 / L1 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.400 | 0.164 | 0.000 | 0.508 | 3.263 | n/a | 0.000 | 0.063 | 1.049 | 3.545 | 0.028 | n/a | 0.321 | 11.913 | n/a | n/a | 0.031 | 3.658 | 0.159 | 0.031 |
| p99 | 80.417 | 2.004 | 0.000 | 1.909 | 6.987 | n/a | 1.555 | 1.408 | 5.713 | 23.326 | 0.089 | n/a | 3.411 | 60.801 | n/a | n/a | 0.085 | 7.835 | 0.310 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000000200 | 103.443 | 1.914 | n/a | 0.000 | 0.057 | 0.732 | 4.235 | 0.021 | n/a | 0.072 | 96.389 | n/a | n/a | 0.023 | 1.971 | 0.019 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| a503e751587f37aa00000000000001e9 | 80.417 | 6.255 | 0.409 | 0.224 | 0.080 | 1.698 | 16.854 | 0.031 | n/a | 0.772 | 54.045 | n/a | n/a | 0.048 | 6.968 | 0.087 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| a503e751587f37aa000000000000022d | 73.370 | 3.648 | 0.265 | 0.297 | 0.050 | 1.065 | 6.806 | 0.023 | n/a | 0.389 | 60.801 | n/a | n/a | 0.027 | 4.260 | 0.058 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| a503e751587f37aa0000000000000227 | 64.650 | 4.162 | 0.171 | 0.365 | 0.050 | 1.171 | 48.338 | 0.020 | n/a | 0.322 | 10.030 | n/a | n/a | 0.021 | 4.749 | 0.073 | 0.021 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.039ms |
| a503e751587f37aa00000000000001ec | 62.068 | 16.047 | n/a | 1.977 | 0.066 | 5.814 | 13.683 | 0.072 | n/a | 0.639 | 23.738 | n/a | n/a | 0.032 | 18.089 | 0.291 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| a503e751587f37aa0000000000000292 | 54.648 | 6.594 | 0.284 | 0.000 | 0.051 | 1.767 | 11.049 | 0.048 | n/a | 0.366 | 34.457 | n/a | n/a | 0.031 | 6.929 | 0.127 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| a503e751587f37aa0000000000000264 | 54.518 | 3.489 | 0.208 | 0.302 | 0.080 | 1.326 | 8.583 | 0.047 | n/a | 0.796 | 39.645 | n/a | n/a | 0.042 | 4.079 | 0.075 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| a503e751587f37aa000000000000023f | 44.231 | 3.512 | 0.248 | 0.241 | 0.084 | 2.755 | 23.326 | 0.021 | n/a | 0.073 | 13.922 | n/a | n/a | 0.048 | 4.086 | 0.092 | 0.048 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.035ms |
| a503e751587f37aa000000000000029a | 42.350 | 3.247 | 0.219 | 0.309 | 0.142 | 4.794 | 16.290 | 0.040 | n/a | 1.565 | 15.685 | n/a | n/a | 0.058 | 3.918 | 0.093 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| a503e751587f37aa0000000000000214 | 42.053 | 5.715 | 0.272 | 0.373 | 0.075 | 2.547 | 13.231 | 0.045 | n/a | 0.531 | 19.195 | n/a | n/a | 0.071 | 6.435 | 0.153 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.126ms |
| a503e751587f37aa000000000000024d | 39.698 | 6.987 | 0.234 | 0.473 | 0.141 | 1.791 | 12.724 | 0.046 | n/a | 0.117 | 17.133 | n/a | n/a | 0.052 | 7.835 | 0.197 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| a503e751587f37aa000000000000020e | 38.035 | 4.256 | n/a | 0.000 | 0.158 | 1.899 | 6.116 | 0.081 | n/a | 3.303 | 22.146 | n/a | n/a | 0.075 | 4.414 | 0.116 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| a503e751587f37aa00000000000001f6 | 37.335 | 3.521 | 0.255 | 0.231 | 0.064 | 1.245 | 10.471 | 0.028 | n/a | 0.075 | 21.417 | n/a | n/a | 0.028 | 4.071 | 0.109 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| a503e751587f37aa00000000000001ee | 37.129 | 4.551 | 0.319 | 0.235 | 0.068 | 1.332 | 6.552 | 0.026 | n/a | 0.282 | 23.731 | n/a | n/a | 0.032 | 5.174 | 0.139 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| a503e751587f37aa0000000000000249 | 36.379 | 3.764 | 0.269 | 0.277 | 0.123 | 5.713 | 10.338 | 0.024 | n/a | 1.054 | 14.774 | n/a | n/a | 0.043 | 4.433 | 0.122 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.076ms |
| a503e751587f37aa00000000000002a2 | 34.727 | 4.785 | 0.210 | 0.660 | 0.070 | 2.349 | 9.701 | 0.089 | n/a | 0.142 | 16.680 | n/a | n/a | 0.040 | 5.726 | 0.165 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000023d | 34.692 | 3.316 | 0.278 | 0.269 | 0.179 | 3.607 | 9.833 | 0.036 | n/a | 0.137 | 16.951 | n/a | n/a | 0.085 | 4.042 | 0.117 | 0.085 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| a503e751587f37aa0000000000000257 | 34.176 | 3.965 | 0.187 | 0.286 | 0.099 | 1.619 | 8.543 | 0.038 | n/a | 0.439 | 18.957 | n/a | n/a | 0.043 | 4.537 | 0.133 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| a503e751587f37aa0000000000000234 | 32.900 | 2.914 | 0.446 | 0.249 | 0.022 | 0.918 | 13.205 | 0.060 | n/a | 0.091 | 14.982 | n/a | n/a | 0.012 | 3.631 | 0.110 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.157ms; driver.reader-basis.broadcast 0.033ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000000255 | 32.385 | 4.520 | n/a | 0.000 | 0.063 | 0.558 | 5.843 | 0.046 | n/a | 1.137 | 20.191 | n/a | n/a | 0.028 | 4.583 | 0.141 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |

## P2 / L1 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.846 | 0.000 | 0.000 | 0.475 | 2.127 | n/a | 0.000 | 0.057 | 0.733 | 1.425 | 0.021 | n/a | 0.179 | 8.605 | n/a | n/a | 0.028 | 2.217 | 0.179 | 0.028 |
| p99 | 103.443 | 2.004 | 0.000 | 1.382 | 4.270 | n/a | 0.000 | 1.408 | 2.229 | 12.689 | 0.429 | n/a | 3.411 | 96.389 | n/a | n/a | 0.077 | 4.441 | 0.260 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000000200 | 103.443 | 1.914 | n/a | 0.000 | 0.057 | 0.732 | 4.235 | 0.021 | n/a | 0.072 | 96.389 | n/a | n/a | 0.023 | 1.971 | 0.019 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| a503e751587f37aa000000000000020e | 38.035 | 4.256 | n/a | 0.000 | 0.158 | 1.899 | 6.116 | 0.081 | n/a | 3.303 | 22.146 | n/a | n/a | 0.075 | 4.414 | 0.116 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.063ms |
| a503e751587f37aa00000000000001fc | 26.262 | 2.197 | n/a | 0.000 | 0.065 | 0.725 | 1.074 | 0.020 | n/a | 0.073 | 22.082 | n/a | n/a | 0.026 | 2.262 | 0.086 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000229 | 25.511 | 2.332 | n/a | 0.000 | 0.075 | 0.997 | 1.701 | 0.036 | n/a | 0.693 | 19.640 | n/a | n/a | 0.037 | 2.407 | 0.094 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000296 | 24.115 | 4.270 | n/a | 0.000 | 0.172 | 1.151 | 1.330 | 0.027 | n/a | 0.176 | 16.912 | n/a | n/a | 0.077 | 4.441 | 0.184 | 0.077 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000204 | 22.273 | 3.340 | n/a | 0.000 | 0.110 | 1.948 | 5.601 | 0.043 | n/a | 0.109 | 11.072 | n/a | n/a | 0.050 | 3.450 | 0.155 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000021e | 20.315 | 3.608 | n/a | 0.000 | 0.027 | 2.229 | 12.689 | 0.036 | n/a | 0.085 | 1.625 | n/a | n/a | 0.016 | 3.635 | 0.179 | 0.016 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa000000000000027e | 18.605 | 3.891 | n/a | 0.000 | 0.093 | 0.688 | 1.069 | 0.020 | n/a | 0.112 | 12.691 | n/a | n/a | 0.041 | 3.985 | 0.214 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| a503e751587f37aa0000000000000280 | 18.324 | 2.013 | n/a | 0.000 | 0.053 | 0.639 | 1.004 | 0.019 | n/a | 0.394 | 14.177 | n/a | n/a | 0.026 | 2.066 | 0.113 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000244 | 17.475 | 1.635 | n/a | 0.000 | 0.032 | 0.415 | 0.875 | 0.011 | n/a | 0.073 | 14.417 | n/a | n/a | 0.017 | 1.667 | 0.095 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.038ms |
| a503e751587f37aa00000000000001f2 | 16.660 | 3.124 | n/a | 0.000 | 0.593 | 0.845 | 0.994 | 0.019 | n/a | 0.179 | 10.874 | n/a | n/a | 0.032 | 3.717 | 0.223 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000263 | 16.474 | 3.635 | n/a | 0.000 | 0.048 | 1.528 | 8.026 | 0.045 | n/a | 0.413 | 2.753 | n/a | n/a | 0.024 | 3.683 | 0.224 | 0.024 | gw-w/thread-45/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000000225 | 16.348 | 2.117 | n/a | 0.000 | 0.100 | 0.797 | 1.689 | 0.031 | n/a | 0.724 | 10.847 | n/a | n/a | 0.042 | 2.217 | 0.136 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms |
| a503e751587f37aa00000000000001df | 16.124 | 2.102 | n/a | 0.000 | 0.040 | 0.515 | 1.425 | 0.020 | n/a | 0.066 | 11.932 | n/a | n/a | 0.023 | 2.142 | 0.133 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000221 | 15.783 | 2.127 | n/a | 0.000 | 0.058 | 0.658 | 2.594 | 0.019 | n/a | 0.429 | 9.871 | n/a | n/a | 0.027 | 2.185 | 0.138 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.094ms |
| a503e751587f37aa0000000000000208 | 14.342 | 2.073 | n/a | 0.000 | 0.058 | 0.782 | 0.979 | 0.021 | n/a | 0.387 | 10.016 | n/a | n/a | 0.025 | 2.131 | 0.149 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000268 | 13.984 | 1.915 | n/a | 0.000 | 0.056 | 0.823 | 1.665 | 0.033 | n/a | 0.119 | 9.335 | n/a | n/a | 0.039 | 1.970 | 0.141 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000000276 | 13.846 | 1.941 | n/a | 0.000 | 0.042 | 1.173 | 1.489 | 0.031 | n/a | 0.191 | 8.951 | n/a | n/a | 0.028 | 1.984 | 0.143 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.074ms |
| a503e751587f37aa00000000000001e5 | 13.806 | 3.088 | n/a | 0.000 | 0.102 | 0.792 | 1.080 | 0.020 | n/a | 0.071 | 8.605 | n/a | n/a | 0.047 | 3.190 | 0.231 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000025f | 13.474 | 2.092 | n/a | 0.000 | 1.408 | 0.700 | 4.544 | 0.024 | n/a | 0.083 | 4.607 | n/a | n/a | 0.017 | 3.500 | 0.260 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (1699 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.370 | 0.290 | 0.000 | 0.533 | 2.297 | n/a | 0.000 | 0.045 | 0.602 | 1.006 | 0.012 | n/a | 0.105 | 5.669 | n/a | n/a | 0.015 | 2.638 | 0.234 | 0.015 |
| p99 | 48.197 | 2.226 | 0.044 | 1.971 | 6.733 | n/a | 0.237 | 11.429 | 7.218 | 9.427 | 0.050 | n/a | 2.236 | 34.523 | n/a | n/a | 0.054 | 13.385 | 0.624 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa000000000000050c | 83.966 | 2.133 | n/a | 0.000 | 43.972 | 1.832 | 1.342 | 0.046 | n/a | 0.106 | 34.523 | n/a | n/a | 0.011 | 46.105 | 0.549 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa00000000000002b7 | 80.204 | 6.515 | 0.248 | 0.309 | 0.049 | 1.462 | 16.883 | 0.030 | n/a | 0.089 | 54.584 | n/a | n/a | 0.034 | 7.121 | 0.089 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.091ms |
| a503e751587f37aa000000000000050d | 76.999 | 3.428 | n/a | 0.000 | 60.915 | 0.597 | 0.879 | 0.013 | n/a | 0.093 | 11.054 | n/a | n/a | 0.020 | 64.343 | 0.836 | 0.020 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.711ms; driver.publication.persist-deferred 0.089ms; driver.publication.readback 0.059ms; driver.publication.readback 0.054ms; driver.publication.readback 0.046ms |
| a503e751587f37aa0000000000000779 | 57.082 | 2.270 | n/a | 0.000 | 0.024 | 0.517 | 1.123 | 0.012 | n/a | 0.082 | 53.043 | n/a | n/a | 0.011 | 2.294 | 0.040 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.049ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.014ms |
| a503e751587f37aa0000000000000776 | 55.271 | 2.251 | n/a | 0.000 | 0.057 | 0.502 | 2.214 | 0.026 | n/a | 0.160 | 50.035 | n/a | n/a | 0.027 | 2.308 | 0.042 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000003da | 55.249 | 2.310 | n/a | 0.000 | 0.053 | 0.519 | 31.484 | 0.055 | n/a | 0.122 | 20.681 | n/a | n/a | 0.025 | 2.363 | 0.043 | 0.025 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| a503e751587f37aa00000000000008ea | 54.926 | 6.967 | n/a | 0.000 | 0.070 | 0.653 | 18.521 | 0.027 | n/a | 0.052 | 28.607 | n/a | n/a | 0.028 | 7.036 | 0.128 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.014ms |
| a503e751587f37aa000000000000046b | 54.864 | 4.393 | n/a | 0.000 | 1.291 | 1.655 | 1.639 | 0.026 | n/a | 1.282 | 44.564 | n/a | n/a | 0.015 | 5.683 | 0.104 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.readback 0.052ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.016ms |
| a503e751587f37aa0000000000000778 | 54.193 | 1.021 | n/a | 0.000 | 1.133 | 0.290 | 1.016 | 0.016 | n/a | 0.654 | 50.057 | n/a | n/a | 0.007 | 2.153 | 0.040 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.006ms |
| a503e751587f37aa000000000000077a | 53.410 | 1.388 | n/a | 0.000 | 0.015 | 0.257 | 0.652 | 0.006 | n/a | 0.042 | 51.040 | n/a | n/a | 0.009 | 1.404 | 0.026 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms; driver.publication.readback 0.031ms |
| a503e751587f37aa000000000000050b | 53.298 | 2.247 | n/a | 0.000 | 0.551 | 0.439 | 1.300 | 0.015 | n/a | 0.063 | 48.669 | n/a | n/a | 0.014 | 2.797 | 0.052 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa000000000000050f | 52.345 | 1.684 | n/a | 0.000 | 0.016 | 0.383 | 1.084 | 0.011 | n/a | 0.035 | 49.122 | n/a | n/a | 0.009 | 1.700 | 0.032 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa00000000000003a2 | 51.797 | 3.968 | n/a | 0.000 | 0.092 | 0.604 | 0.933 | 0.014 | n/a | 0.099 | 46.047 | n/a | n/a | 0.040 | 4.060 | 0.078 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.128ms; driver.publication.readback 0.112ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.022ms |
| a503e751587f37aa0000000000000777 | 50.504 | 2.130 | n/a | 0.000 | 0.024 | 0.494 | 2.116 | 0.010 | n/a | 0.045 | 45.673 | n/a | n/a | 0.012 | 2.154 | 0.043 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000000d66 | 50.319 | 5.547 | n/a | 0.000 | 0.094 | 8.616 | 0.537 | 0.003 | n/a | 1.025 | 34.461 | n/a | n/a | 0.034 | 5.641 | 0.112 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.114ms; driver.publication.readback 0.113ms; driver.publication.readback 0.095ms; driver.publication.persist-deferred 0.044ms; driver.publication.persist-deferred 0.034ms |
| a503e751587f37aa0000000000000f58 | 49.049 | 7.401 | n/a | 0.000 | 0.018 | 5.980 | 4.448 | 0.031 | n/a | 0.547 | 30.615 | n/a | n/a | 0.008 | 7.420 | 0.151 | 0.008 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.794ms; driver.publication.readback 0.169ms; driver.reader-basis.broadcast 0.162ms; driver.publication.readback 0.053ms; driver.publication.readback 0.029ms |
| a503e751587f37aa00000000000003a1 | 48.197 | 3.346 | n/a | 0.000 | 0.036 | 2.266 | 1.330 | 0.032 | n/a | 0.355 | 40.814 | n/a | n/a | 0.018 | 3.382 | 0.070 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.128ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.022ms |
| a503e751587f37aa0000000000000370 | 47.435 | 2.887 | 1.334 | 0.247 | 0.073 | 2.147 | 7.814 | 0.022 | n/a | 0.255 | 32.629 | n/a | n/a | 0.027 | 4.541 | 0.096 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.059ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.019ms |
| a503e751587f37aa000000000000077b | 47.124 | 1.334 | n/a | 0.000 | 0.040 | 1.784 | 0.611 | 0.009 | n/a | 0.088 | 43.236 | n/a | n/a | 0.021 | 1.375 | 0.029 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms; driver.publication.readback 0.031ms |
| a503e751587f37aa00000000000003a0 | 46.402 | 2.550 | n/a | 0.000 | 0.739 | 0.625 | 1.047 | 0.036 | n/a | 0.411 | 40.976 | n/a | n/a | 0.018 | 3.288 | 0.071 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.028ms |

## P2 / L4 / commit / 5-10 facts (988 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.940 | 0.000 | 0.000 | 0.409 | 1.842 | n/a | 0.000 | 0.045 | 0.587 | 0.857 | 0.012 | n/a | 0.104 | 5.128 | n/a | n/a | 0.015 | 2.130 | 0.216 | 0.015 |
| p99 | 45.177 | 1.998 | 0.027 | 0.968 | 4.380 | n/a | 0.000 | 10.977 | 6.398 | 6.592 | 0.049 | n/a | 2.156 | 33.104 | n/a | n/a | 0.049 | 12.745 | 0.631 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa000000000000050c | 83.966 | 2.133 | n/a | 0.000 | 43.972 | 1.832 | 1.342 | 0.046 | n/a | 0.106 | 34.523 | n/a | n/a | 0.011 | 46.105 | 0.549 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa0000000000000776 | 55.271 | 2.251 | n/a | 0.000 | 0.057 | 0.502 | 2.214 | 0.026 | n/a | 0.160 | 50.035 | n/a | n/a | 0.027 | 2.308 | 0.042 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000003da | 55.249 | 2.310 | n/a | 0.000 | 0.053 | 0.519 | 31.484 | 0.055 | n/a | 0.122 | 20.681 | n/a | n/a | 0.025 | 2.363 | 0.043 | 0.025 | gw-w/thread-47/commit.prepare-and-validate | none observed |
| a503e751587f37aa0000000000000778 | 54.193 | 1.021 | n/a | 0.000 | 1.133 | 0.290 | 1.016 | 0.016 | n/a | 0.654 | 50.057 | n/a | n/a | 0.007 | 2.153 | 0.040 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.006ms |
| a503e751587f37aa000000000000077a | 53.410 | 1.388 | n/a | 0.000 | 0.015 | 0.257 | 0.652 | 0.006 | n/a | 0.042 | 51.040 | n/a | n/a | 0.009 | 1.404 | 0.026 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms; driver.publication.readback 0.031ms |
| a503e751587f37aa000000000000050f | 52.345 | 1.684 | n/a | 0.000 | 0.016 | 0.383 | 1.084 | 0.011 | n/a | 0.035 | 49.122 | n/a | n/a | 0.009 | 1.700 | 0.032 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.023ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa0000000000000777 | 50.504 | 2.130 | n/a | 0.000 | 0.024 | 0.494 | 2.116 | 0.010 | n/a | 0.045 | 45.673 | n/a | n/a | 0.012 | 2.154 | 0.043 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa000000000000077b | 47.124 | 1.334 | n/a | 0.000 | 0.040 | 1.784 | 0.611 | 0.009 | n/a | 0.088 | 43.236 | n/a | n/a | 0.021 | 1.375 | 0.029 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms; driver.publication.readback 0.060ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms; driver.publication.readback 0.031ms |
| a503e751587f37aa00000000000003a0 | 46.402 | 2.550 | n/a | 0.000 | 0.739 | 0.625 | 1.047 | 0.036 | n/a | 0.411 | 40.976 | n/a | n/a | 0.018 | 3.288 | 0.071 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.028ms |
| a503e751587f37aa000000000000039d | 45.177 | 1.530 | n/a | 0.000 | 0.021 | 0.562 | 4.896 | 0.048 | n/a | 0.115 | 37.993 | n/a | n/a | 0.013 | 1.551 | 0.034 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.236ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.023ms |
| a503e751587f37aa0000000000000514 | 44.253 | 1.567 | n/a | 0.000 | 14.095 | 0.410 | 0.727 | 0.010 | n/a | 0.094 | 27.337 | n/a | n/a | 0.012 | 15.662 | 0.354 | 0.012 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.711ms; driver.publication.persist-deferred 0.089ms; driver.publication.readback 0.062ms; driver.reader-basis.broadcast 0.062ms; driver.publication.readback 0.059ms |
| a503e751587f37aa0000000000000df7 | 42.731 | 2.375 | n/a | 0.000 | 5.209 | 0.729 | 1.148 | 0.023 | n/a | 0.133 | 33.104 | n/a | n/a | 0.008 | 7.585 | 0.178 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.173ms; driver.publication.readback 0.101ms; driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa00000000000008ec | 42.195 | 2.195 | n/a | 0.000 | 6.892 | 11.783 | 1.698 | 0.020 | n/a | 0.102 | 19.469 | n/a | n/a | 0.036 | 9.087 | 0.215 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.026ms |
| a503e751587f37aa000000000000036e | 39.676 | 1.481 | n/a | 0.000 | 14.352 | 0.449 | 0.801 | 0.011 | n/a | 0.076 | 22.493 | n/a | n/a | 0.013 | 15.832 | 0.399 | 0.013 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.readback 0.065ms; driver.publication.readback 0.059ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.048ms |
| a503e751587f37aa0000000000000518 | 38.809 | 1.619 | n/a | 0.000 | 15.695 | 0.986 | 0.590 | 0.010 | n/a | 0.065 | 19.829 | n/a | n/a | 0.015 | 17.314 | 0.446 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.711ms; driver.publication.persist-deferred 0.089ms; driver.publication.readback 0.062ms; driver.reader-basis.broadcast 0.062ms; driver.publication.readback 0.059ms |
| a503e751587f37aa00000000000003db | 37.606 | 4.028 | n/a | 0.000 | 0.098 | 11.698 | 10.584 | 0.034 | n/a | 0.409 | 10.712 | n/a | n/a | 0.043 | 4.125 | 0.110 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000000821 | 37.153 | 1.477 | n/a | 0.000 | 23.841 | 6.589 | 0.697 | 0.010 | n/a | 0.089 | 4.435 | n/a | n/a | 0.016 | 25.318 | 0.681 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.074ms; driver.publication.readback 0.054ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000000a41 | 36.301 | 2.297 | n/a | 0.000 | 0.456 | 0.552 | 1.393 | 0.017 | n/a | 0.117 | 31.451 | n/a | n/a | 0.017 | 2.753 | 0.076 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.031ms |
| a503e751587f37aa0000000000000d6a | 35.862 | 2.629 | n/a | 0.000 | 0.031 | 9.814 | 1.894 | 0.029 | n/a | 0.090 | 21.364 | n/a | n/a | 0.012 | 2.660 | 0.074 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.138ms; driver.publication.readback 0.133ms; driver.publication.readback 0.114ms; driver.publication.readback 0.113ms; driver.publication.readback 0.095ms |
| a503e751587f37aa000000000000034a | 35.466 | 1.789 | n/a | 0.000 | 0.031 | 0.583 | 1.668 | 0.016 | n/a | 0.289 | 31.073 | n/a | n/a | 0.017 | 1.820 | 0.051 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (268 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.000 | n/a | n/a | n/a | 32.559 | 13.520 | 2.144 | 0.000 | 0.245 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.429 | 57.133 | 0.855 | 9.429 |
| p99 | 585.359 | n/a | n/a | n/a | 115.712 | 585.080 | 14.673 | 0.000 | 72.672 | 63.501 | 65.571 | n/a | 0.021 | 0.000 | n/a | n/a | 150.658 | 585.353 | 1.000 | 150.658 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000023ba | 672.626 | 14.336 | 630.204 | 1.074 | 0.000 | 0.517 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.495 | 645.614 | 0.960 | 26.495 | node-14/thread-0/rpc.replica.observe | client.encode 19.866ms; driver.reader-basis.broadcast 0.998ms; driver.reader-basis.broadcast 0.969ms; driver.reader-basis.broadcast 0.393ms; driver.reader-basis.broadcast 0.393ms |
| a503e751587f37aa00000000000023ce | 649.454 | 0.419 | 649.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 649.449 | 1.000 | 0.005 | node-14/thread-0/rpc.replica.observe | client.encode 15.821ms; driver.reader-basis.broadcast 0.417ms; driver.reader-basis.broadcast 0.391ms; driver.reader-basis.broadcast 0.389ms; driver.reader-basis.broadcast 0.375ms |
| a503e751587f37aa00000000000023de | 585.359 | 0.273 | 585.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 585.353 | 1.000 | 0.005 | node-14/thread-0/rpc.replica.observe | client.encode 18.701ms; driver.reader-basis.broadcast 0.408ms; driver.reader-basis.broadcast 0.391ms; driver.reader-basis.broadcast 0.382ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000023bd | 534.643 | 27.756 | 498.108 | 1.018 | 0.000 | 0.294 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.467 | 526.881 | 0.985 | 7.467 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.998ms; driver.reader-basis.broadcast 0.969ms; driver.reader-basis.broadcast 0.393ms; driver.reader-basis.broadcast 0.393ms; driver.reader-basis.broadcast 0.376ms |
| a503e751587f37aa00000000000022d2 | 502.594 | 0.620 | 501.966 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 502.586 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | client.encode 22.014ms; driver.reader-basis.broadcast 0.904ms; driver.reader-basis.broadcast 0.366ms; driver.reader-basis.broadcast 0.349ms; driver.publication.readback 0.172ms |
| a503e751587f37aa00000000000023ca | 493.570 | 9.821 | 482.303 | 1.437 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 493.562 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | client.encode 25.913ms; driver.reader-basis.broadcast 0.943ms; driver.reader-basis.broadcast 0.404ms; driver.reader-basis.broadcast 0.375ms; driver.publication.readback 0.165ms |
| a503e751587f37aa00000000000023c7 | 397.523 | 12.709 | 384.805 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 397.514 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.943ms; driver.reader-basis.broadcast 0.549ms; driver.reader-basis.broadcast 0.549ms; driver.reader-basis.broadcast 0.372ms; driver.publication.readback 0.056ms |
| a503e751587f37aa00000000000023e2 | 387.844 | 12.692 | 373.157 | 0.611 | 0.000 | 0.322 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.062 | 386.460 | 0.996 | 1.062 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.391ms; driver.reader-basis.broadcast 0.382ms; driver.reader-basis.broadcast 0.372ms; driver.publication.readback 0.084ms; driver.publication.readback 0.058ms |
| a503e751587f37aa00000000000032ae | 291.202 | 63.657 | 51.098 | 6.431 | 0.000 | 0.236 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 169.780 | 121.187 | 0.416 | 169.780 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.229ms; driver.expected-state.bind-receipt 1.136ms; driver.reader-basis.broadcast 0.529ms; driver.reader-basis.broadcast 0.510ms; driver.reader-basis.broadcast 0.500ms |
| a503e751587f37aa00000000000022d6 | 287.865 | 6.983 | 279.784 | 1.093 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 287.859 | 1.000 | 0.006 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.904ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.366ms; driver.publication.readback 0.076ms; driver.publication.persist-deferred 0.019ms |
| a503e751587f37aa0000000000002704 | 272.409 | 61.262 | 198.197 | 7.373 | 0.000 | 0.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.266 | 266.832 | 0.980 | 5.266 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.140ms; driver.reader-basis.broadcast 0.433ms; driver.reader-basis.broadcast 0.396ms; driver.publication.readback 0.138ms; driver.publication.readback 0.130ms |
| a503e751587f37aa0000000000003dc5 | 268.555 | 74.604 | 150.863 | 5.936 | 0.000 | 1.312 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.840 | 231.403 | 0.862 | 35.840 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.619ms; driver.reader-basis.broadcast 1.432ms; driver.publication.readback 0.625ms; driver.reader-basis.broadcast 0.579ms; driver.reader-basis.broadcast 0.563ms |
| a503e751587f37aa0000000000001d54 | 260.186 | 65.907 | 126.565 | 3.936 | 0.000 | 0.423 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.355 | 196.408 | 0.755 | 63.355 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.529ms; driver.reader-basis.broadcast 0.308ms; driver.publication.readback 0.119ms; driver.publication.readback 0.101ms; driver.publication.readback 0.088ms |
| a503e751587f37aa00000000000026f7 | 247.653 | 109.890 | 10.533 | 18.215 | 0.000 | 40.364 | 42.104 | 26.531 | n/a | 0.012 | 0.000 | n/a | n/a | 0.004 | 138.638 | 0.560 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 1.140ms; driver.reader-basis.broadcast 0.396ms; driver.publication.readback 0.130ms; driver.publication.readback 0.125ms; driver.publication.readback 0.121ms |
| a503e751587f37aa0000000000003fe9 | 244.958 | 29.441 | 0.226 | 1.919 | 0.000 | 127.628 | 20.324 | 65.393 | n/a | 0.019 | 0.000 | n/a | n/a | 0.008 | 31.586 | 0.129 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.773ms; driver.reader-basis.broadcast 0.608ms; driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.134ms; driver.publication.readback 0.123ms |
| a503e751587f37aa00000000000022c5 | 241.812 | 24.639 | 0.195 | 1.220 | 0.000 | 72.672 | 17.771 | 125.090 | n/a | 0.217 | 0.000 | n/a | n/a | 0.009 | 26.054 | 0.108 | 0.009 | gw-r/thread-48/gateway.admission-wait | driver.reader-basis.broadcast 0.390ms; driver.reader-basis.broadcast 0.376ms; driver.publication.readback 0.083ms; driver.publication.readback 0.044ms; driver.publication.readback 0.043ms |
| a503e751587f37aa00000000000032ac | 239.647 | 59.793 | 59.624 | 4.600 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 115.361 | 124.017 | 0.517 | 115.361 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.229ms; driver.expected-state.bind-receipt 1.136ms; driver.reader-basis.broadcast 0.510ms; driver.reader-basis.broadcast 0.500ms; driver.publication.persist-deferred 0.371ms |
| a503e751587f37aa0000000000003fea | 233.516 | 125.035 | 16.169 | 12.826 | 0.000 | 7.729 | 71.746 | 0.003 | n/a | 0.002 | 0.000 | n/a | n/a | 0.006 | 154.031 | 0.660 | 0.006 | gw-r/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 1.773ms; driver.reader-basis.broadcast 0.608ms; driver.publication.readback 0.134ms; driver.publication.readback 0.123ms; driver.publication.readback 0.110ms |
| a503e751587f37aa000000000000270d | 230.695 | 48.467 | 35.918 | 8.304 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 137.750 | 92.689 | 0.402 | 137.750 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.140ms; driver.reader-basis.broadcast 0.433ms; driver.reader-basis.broadcast 0.396ms; driver.publication.readback 0.138ms; driver.publication.readback 0.130ms |
| a503e751587f37aa000000000000386e | 230.694 | 87.833 | 8.671 | 7.064 | 0.000 | 73.558 | 35.380 | 18.174 | n/a | 0.008 | 0.000 | n/a | n/a | 0.006 | 103.568 | 0.449 | 0.006 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.550ms; driver.reader-basis.broadcast 0.528ms; driver.publication.readback 0.111ms; driver.publication.readback 0.090ms; driver.publication.readback 0.053ms |

## P2 / outside-phases / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.922 | 0.437 | 0.000 | 0.700 | 1.969 | n/a | 0.000 | 0.033 | 0.676 | 0.798 | 0.012 | n/a | 0.069 | 4.055 | n/a | n/a | 0.017 | 2.003 | 0.248 | 0.017 |
| p99 | 10.486 | 1.475 | 0.000 | 0.743 | 3.027 | n/a | 0.000 | 2.458 | 0.700 | 1.496 | 0.024 | n/a | 0.087 | 4.882 | n/a | n/a | 0.018 | 5.485 | 0.523 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000000ff6 | 10.486 | 3.027 | n/a | 0.000 | 2.458 | 0.700 | 0.722 | 0.011 | n/a | 0.069 | 3.482 | n/a | n/a | 0.017 | 5.485 | 0.523 | 0.017 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023ec | 8.922 | 1.969 | n/a | 0.000 | 0.033 | 0.411 | 1.496 | 0.024 | n/a | 0.087 | 4.882 | n/a | n/a | 0.018 | 2.003 | 0.224 | 0.018 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021ff | 7.454 | 1.816 | n/a | 0.000 | 0.032 | 0.676 | 0.798 | 0.012 | n/a | 0.050 | 4.055 | n/a | n/a | 0.014 | 1.848 | 0.248 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1777 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.176 | 0.276 | 0.000 | 0.500 | 2.192 | n/a | 0.000 | 0.036 | 0.525 | 0.892 | 0.012 | n/a | 0.083 | 5.136 | n/a | n/a | 0.012 | 2.483 | 0.253 | 0.012 |
| p99 | 47.870 | 2.689 | 0.041 | 1.884 | 7.290 | n/a | 0.000 | 15.590 | 6.830 | 7.609 | 0.043 | n/a | 2.931 | 33.513 | n/a | n/a | 0.038 | 17.760 | 0.654 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000011c4 | 95.935 | 1.040 | n/a | 0.000 | 83.919 | 1.050 | 0.817 | 0.011 | n/a | 1.463 | 7.627 | n/a | n/a | 0.009 | 84.958 | 0.886 | 0.009 | node-14/thread-0/driver.queue.subject | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms |
| a503e751587f37aa00000000000011c1 | 87.197 | 9.473 | n/a | 0.000 | 0.052 | 3.412 | 1.994 | 0.026 | n/a | 0.254 | 71.968 | n/a | n/a | 0.017 | 9.525 | 0.109 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms |
| a503e751587f37aa0000000000001166 | 84.584 | 9.381 | n/a | 0.000 | 41.181 | 2.424 | 3.317 | 0.035 | n/a | 1.016 | 27.221 | n/a | n/a | 0.010 | 50.562 | 0.598 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.190ms; driver.publication.readback 0.051ms; driver.publication.readback 0.050ms; driver.publication.readback 0.048ms; driver.publication.readback 0.048ms |
| a503e751587f37aa000000000000151c | 75.496 | 1.410 | n/a | 0.000 | 55.183 | 0.392 | 0.720 | 0.012 | n/a | 0.054 | 17.712 | n/a | n/a | 0.012 | 56.594 | 0.750 | 0.012 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.242ms; driver.publication.readback 0.149ms; driver.publication.readback 0.125ms; driver.publication.readback 0.069ms; driver.publication.readback 0.056ms |
| a503e751587f37aa0000000000001519 | 69.633 | 2.440 | n/a | 0.000 | 0.704 | 1.778 | 1.062 | 0.011 | n/a | 1.051 | 62.580 | n/a | n/a | 0.008 | 3.144 | 0.045 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.242ms; driver.publication.readback 0.125ms; driver.publication.readback 0.056ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.028ms |
| a503e751587f37aa000000000000165e | 65.390 | 2.334 | n/a | 0.000 | 40.545 | 2.767 | 1.132 | 0.015 | n/a | 0.049 | 18.542 | n/a | n/a | 0.006 | 42.880 | 0.656 | 0.006 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.093ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.034ms; driver.publication.readback 0.031ms |
| a503e751587f37aa000000000000151a | 61.257 | 3.779 | n/a | 0.000 | 0.872 | 1.188 | 1.161 | 0.010 | n/a | 0.029 | 54.214 | n/a | n/a | 0.004 | 4.651 | 0.076 | 0.004 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.242ms; driver.publication.readback 0.056ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.009ms |
| a503e751587f37aa00000000000011c5 | 59.729 | 2.572 | n/a | 0.000 | 0.011 | 0.280 | 0.838 | 0.005 | n/a | 0.030 | 55.988 | n/a | n/a | 0.005 | 2.583 | 0.043 | 0.005 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms; driver.publication.readback 0.096ms |
| a503e751587f37aa0000000000001741 | 57.833 | 6.013 | n/a | 0.000 | 27.480 | 7.907 | 2.756 | 0.031 | n/a | 0.077 | 13.543 | n/a | n/a | 0.025 | 33.493 | 0.579 | 0.025 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.078ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.043ms; driver.publication.readback 0.035ms; driver.publication.readback 0.032ms |
| a503e751587f37aa0000000000001bd8 | 57.653 | 1.892 | n/a | 0.000 | 29.001 | 9.098 | 0.811 | 0.014 | n/a | 1.022 | 15.795 | n/a | n/a | 0.021 | 30.893 | 0.536 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.714ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa000000000000151d | 56.485 | 3.337 | n/a | 0.000 | 0.070 | 3.416 | 0.955 | 0.013 | n/a | 0.066 | 48.592 | n/a | n/a | 0.037 | 3.408 | 0.060 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.242ms; driver.publication.readback 0.125ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000001b0b | 56.340 | 1.720 | n/a | 0.000 | 0.024 | 0.723 | 1.346 | 0.021 | n/a | 0.385 | 52.110 | n/a | n/a | 0.011 | 1.744 | 0.031 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001bd7 | 54.070 | 5.314 | n/a | 0.000 | 0.152 | 41.162 | 2.074 | 0.031 | n/a | 0.186 | 5.121 | n/a | n/a | 0.030 | 5.467 | 0.101 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.714ms |
| a503e751587f37aa0000000000001bd9 | 51.666 | 9.364 | n/a | 0.000 | 23.964 | 1.849 | 1.205 | 0.007 | n/a | 0.021 | 15.250 | n/a | n/a | 0.005 | 33.328 | 0.645 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.714ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.040ms |
| a503e751587f37aa00000000000011c0 | 51.144 | 8.067 | n/a | 2.302 | 0.067 | 6.329 | 2.285 | 0.008 | n/a | 0.071 | 31.994 | n/a | n/a | 0.021 | 10.436 | 0.204 | 0.021 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.022ms |
| a503e751587f37aa00000000000011c7 | 50.503 | 3.229 | n/a | 0.000 | 0.306 | 0.430 | 0.969 | 0.010 | n/a | 0.470 | 45.077 | n/a | n/a | 0.012 | 3.535 | 0.070 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms; driver.publication.readback 0.096ms |
| a503e751587f37aa0000000000001163 | 49.516 | 3.336 | n/a | 0.000 | 20.629 | 0.725 | 1.029 | 0.026 | n/a | 0.124 | 23.631 | n/a | n/a | 0.016 | 23.966 | 0.484 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.694ms; driver.reader-basis.broadcast 0.451ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.039ms |
| a503e751587f37aa00000000000011c8 | 47.870 | 4.729 | n/a | 0.000 | 0.715 | 1.773 | 0.795 | 0.008 | n/a | 0.084 | 39.753 | n/a | n/a | 0.014 | 5.444 | 0.114 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms; driver.publication.readback 0.096ms |
| a503e751587f37aa00000000000011cc | 46.175 | 2.485 | n/a | 0.000 | 29.810 | 1.051 | 0.884 | 0.012 | n/a | 0.220 | 11.701 | n/a | n/a | 0.011 | 32.295 | 0.699 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.044ms; driver.publication.readback 0.040ms; driver.publication.readback 0.040ms |
| a503e751587f37aa0000000000001164 | 45.422 | 1.371 | n/a | 0.000 | 33.601 | 0.407 | 0.753 | 0.013 | n/a | 0.080 | 9.185 | n/a | n/a | 0.012 | 34.971 | 0.770 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.694ms; driver.publication.readback 0.050ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.016ms |

## P2 / L16 / commit / 5-10 facts (1061 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.705 | 0.000 | 0.000 | 0.382 | 1.765 | n/a | 0.000 | 0.035 | 0.512 | 0.781 | 0.012 | n/a | 0.083 | 4.603 | n/a | n/a | 0.012 | 1.948 | 0.236 | 0.012 |
| p99 | 44.430 | 2.000 | 0.015 | 1.010 | 5.305 | n/a | 0.000 | 12.578 | 6.417 | 5.458 | 0.043 | n/a | 2.557 | 29.745 | n/a | n/a | 0.034 | 14.446 | 0.649 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000011c4 | 95.935 | 1.040 | n/a | 0.000 | 83.919 | 1.050 | 0.817 | 0.011 | n/a | 1.463 | 7.627 | n/a | n/a | 0.009 | 84.958 | 0.886 | 0.009 | node-14/thread-0/driver.queue.subject | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms |
| a503e751587f37aa00000000000011c1 | 87.197 | 9.473 | n/a | 0.000 | 0.052 | 3.412 | 1.994 | 0.026 | n/a | 0.254 | 71.968 | n/a | n/a | 0.017 | 9.525 | 0.109 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.oracle-record 2.560ms; driver.expected-state.bind-receipt 1.346ms; driver.publication.readback 0.293ms; driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.164ms |
| a503e751587f37aa000000000000151c | 75.496 | 1.410 | n/a | 0.000 | 55.183 | 0.392 | 0.720 | 0.012 | n/a | 0.054 | 17.712 | n/a | n/a | 0.012 | 56.594 | 0.750 | 0.012 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.242ms; driver.publication.readback 0.149ms; driver.publication.readback 0.125ms; driver.publication.readback 0.069ms; driver.publication.readback 0.056ms |
| a503e751587f37aa0000000000001bd8 | 57.653 | 1.892 | n/a | 0.000 | 29.001 | 9.098 | 0.811 | 0.014 | n/a | 1.022 | 15.795 | n/a | n/a | 0.021 | 30.893 | 0.536 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.714ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.040ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa0000000000001b0b | 56.340 | 1.720 | n/a | 0.000 | 0.024 | 0.723 | 1.346 | 0.021 | n/a | 0.385 | 52.110 | n/a | n/a | 0.011 | 1.744 | 0.031 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001164 | 45.422 | 1.371 | n/a | 0.000 | 33.601 | 0.407 | 0.753 | 0.013 | n/a | 0.080 | 9.185 | n/a | n/a | 0.012 | 34.971 | 0.770 | 0.012 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.694ms; driver.publication.readback 0.050ms; driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.016ms |
| a503e751587f37aa00000000000011bf | 45.222 | 1.667 | n/a | 0.000 | 0.028 | 0.492 | 0.771 | 0.012 | n/a | 0.070 | 42.166 | n/a | n/a | 0.017 | 1.695 | 0.037 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000011f2 | 45.163 | 7.635 | n/a | 0.000 | 1.210 | 3.263 | 5.871 | 0.040 | n/a | 0.205 | 26.919 | n/a | n/a | 0.021 | 8.845 | 0.196 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.105ms; driver.publication.persist-deferred 0.035ms |
| a503e751587f37aa00000000000018bd | 45.099 | 1.423 | n/a | 0.000 | 0.585 | 0.288 | 0.489 | 0.003 | n/a | 0.269 | 42.036 | n/a | n/a | 0.005 | 2.008 | 0.045 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.010ms |
| a503e751587f37aa0000000000001c8d | 44.563 | 3.234 | n/a | 0.000 | 0.028 | 0.569 | 0.694 | 0.009 | n/a | 0.241 | 39.773 | n/a | n/a | 0.015 | 3.261 | 0.073 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.366ms |
| a503e751587f37aa00000000000014e6 | 44.430 | 3.680 | n/a | 0.000 | 31.055 | 0.633 | 0.874 | 0.014 | n/a | 0.101 | 8.044 | n/a | n/a | 0.030 | 34.736 | 0.782 | 0.030 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.565ms |
| a503e751587f37aa000000000000173f | 42.509 | 2.158 | n/a | 0.000 | 8.335 | 0.383 | 19.161 | 0.040 | n/a | 0.091 | 12.331 | n/a | n/a | 0.010 | 10.493 | 0.247 | 0.010 | gw-w/thread-41/commit.prepare-and-validate | driver.reader-basis.broadcast 0.279ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000001660 | 40.636 | 3.729 | n/a | 0.000 | 0.052 | 11.201 | 2.147 | 0.030 | n/a | 0.164 | 23.310 | n/a | n/a | 0.005 | 3.781 | 0.093 | 0.005 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.235ms; driver.publication.readback 0.093ms; driver.publication.persist-deferred 0.054ms; driver.publication.readback 0.051ms |
| a503e751587f37aa000000000000151e | 39.959 | 1.298 | n/a | 0.000 | 0.060 | 3.584 | 0.600 | 0.010 | n/a | 0.080 | 34.311 | n/a | n/a | 0.017 | 1.357 | 0.034 | 0.017 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.242ms; driver.publication.readback 0.125ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa000000000000151f | 37.362 | 1.417 | n/a | 0.000 | 0.050 | 0.373 | 0.937 | 0.023 | n/a | 0.055 | 34.492 | n/a | n/a | 0.015 | 1.467 | 0.039 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.125ms; driver.publication.readback 0.056ms; driver.publication.readback 0.036ms; driver.publication.readback 0.029ms; driver.publication.persist-deferred 0.024ms |
| a503e751587f37aa00000000000011cb | 36.830 | 1.969 | n/a | 0.000 | 0.262 | 3.424 | 1.270 | 0.022 | n/a | 0.129 | 29.745 | n/a | n/a | 0.009 | 2.231 | 0.061 | 0.009 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.198ms; driver.publication.readback 0.096ms; driver.publication.readback 0.044ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.035ms |
| a503e751587f37aa000000000000118b | 36.302 | 2.070 | n/a | 0.000 | 0.039 | 0.752 | 2.771 | 0.008 | n/a | 0.208 | 30.438 | n/a | n/a | 0.018 | 2.108 | 0.058 | 0.018 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001552 | 35.817 | 1.671 | n/a | 0.000 | 28.839 | 0.361 | 0.708 | 0.014 | n/a | 0.297 | 3.916 | n/a | n/a | 0.011 | 30.509 | 0.852 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.155ms; driver.publication.readback 0.063ms; driver.publication.readback 0.051ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa00000000000011d5 | 35.435 | 2.077 | n/a | 0.000 | 0.031 | 0.373 | 0.674 | 0.007 | n/a | 0.065 | 32.195 | n/a | n/a | 0.013 | 2.108 | 0.060 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000001520 | 33.468 | 3.440 | n/a | 0.000 | 0.052 | 0.478 | 0.750 | 0.008 | n/a | 0.057 | 28.666 | n/a | n/a | 0.018 | 3.492 | 0.104 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.149ms; driver.publication.readback 0.125ms; driver.publication.readback 0.056ms; driver.publication.readback 0.036ms; driver.publication.readback 0.029ms |

## P2 / L64 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.984 | 0.000 | 0.000 | 0.381 | 3.244 | n/a | 0.000 | 0.043 | 0.890 | 1.797 | 0.020 | n/a | 0.085 | 6.695 | n/a | n/a | 0.018 | 3.530 | 0.216 | 0.018 |
| p99 | 97.437 | 2.001 | 0.041 | 2.001 | 6.495 | n/a | 0.431 | 1.457 | 2.101 | 38.007 | 0.059 | n/a | 1.928 | 94.225 | n/a | n/a | 0.056 | 6.659 | 0.442 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000001de6 | 97.437 | 1.807 | n/a | 0.000 | 0.047 | 0.447 | 0.832 | 0.012 | n/a | 0.043 | 94.225 | n/a | n/a | 0.021 | 1.855 | 0.019 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.324ms |
| a503e751587f37aa0000000000001e72 | 84.836 | 3.676 | 0.163 | 0.000 | 0.037 | 0.979 | 38.007 | 0.018 | n/a | 0.068 | 41.873 | n/a | n/a | 0.016 | 3.875 | 0.046 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.852ms |
| a503e751587f37aa0000000000001de8 | 37.542 | 4.017 | 0.182 | 0.396 | 0.049 | 1.039 | 6.828 | 0.017 | n/a | 0.273 | 24.723 | n/a | n/a | 0.018 | 4.644 | 0.124 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.330ms |
| a503e751587f37aa0000000000001dee | 34.247 | 4.419 | n/a | 0.000 | 0.085 | 0.778 | 6.410 | 0.015 | n/a | 0.044 | 22.454 | n/a | n/a | 0.042 | 4.504 | 0.132 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001dfc | 32.885 | 2.938 | 0.177 | 0.000 | 0.040 | 1.371 | 22.036 | 0.018 | n/a | 0.071 | 6.216 | n/a | n/a | 0.019 | 3.155 | 0.096 | 0.019 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.847ms |
| a503e751587f37aa0000000000001e38 | 31.551 | 5.027 | 0.233 | 0.000 | 0.052 | 2.077 | 6.039 | 0.045 | n/a | 0.086 | 17.969 | n/a | n/a | 0.022 | 5.312 | 0.168 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.430ms |
| a503e751587f37aa0000000000001e1a | 26.112 | 4.705 | 0.369 | 0.000 | 0.151 | 1.553 | 9.784 | 0.037 | n/a | 0.453 | 9.016 | n/a | n/a | 0.043 | 5.225 | 0.200 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e30 | 25.689 | 5.034 | 0.200 | 0.000 | 0.086 | 1.209 | 1.912 | 0.021 | n/a | 0.091 | 17.108 | n/a | n/a | 0.029 | 5.320 | 0.207 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa0000000000001df8 | 25.525 | 3.424 | 0.251 | 0.260 | 0.036 | 2.063 | 5.618 | 0.017 | n/a | 0.215 | 13.624 | n/a | n/a | 0.018 | 3.970 | 0.156 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.451ms |
| a503e751587f37aa0000000000001e7e | 25.523 | 3.403 | 0.265 | 0.000 | 0.034 | 1.452 | 8.218 | 0.025 | n/a | 0.083 | 12.030 | n/a | n/a | 0.014 | 3.701 | 0.145 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e00 | 24.954 | 4.042 | 0.206 | 0.000 | 0.050 | 1.678 | 9.627 | 0.038 | n/a | 0.202 | 9.087 | n/a | n/a | 0.024 | 4.298 | 0.172 | 0.024 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.359ms |
| a503e751587f37aa0000000000001e44 | 24.898 | 3.500 | 0.289 | 0.000 | 0.035 | 1.594 | 10.426 | 0.040 | n/a | 0.163 | 8.837 | n/a | n/a | 0.014 | 3.825 | 0.154 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e94 | 24.110 | 3.877 | 0.248 | 0.000 | 0.038 | 1.285 | 7.629 | 0.038 | n/a | 0.375 | 10.605 | n/a | n/a | 0.015 | 4.163 | 0.173 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e3e | 23.489 | 4.189 | 0.255 | 0.000 | 0.037 | 1.383 | 12.015 | 0.019 | n/a | 0.087 | 5.489 | n/a | n/a | 0.015 | 4.482 | 0.191 | 0.015 | gw-w/thread-47/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001df0 | 23.446 | 4.098 | 0.178 | 0.431 | 0.046 | 1.526 | 8.486 | 0.024 | n/a | 0.065 | 8.574 | n/a | n/a | 0.018 | 4.752 | 0.203 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e04 | 23.151 | 3.665 | 0.350 | 0.000 | 0.054 | 1.580 | 11.738 | 0.030 | n/a | 0.136 | 5.571 | n/a | n/a | 0.027 | 4.069 | 0.176 | 0.027 | gw-w/thread-41/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001de4 | 23.015 | 3.242 | 1.176 | 0.244 | 0.034 | 0.839 | 8.376 | 0.023 | n/a | 0.296 | 8.770 | n/a | n/a | 0.014 | 4.697 | 0.204 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.923ms |
| a503e751587f37aa0000000000001e3a | 22.501 | 4.359 | 0.181 | 0.000 | 0.076 | 0.890 | 6.846 | 0.017 | n/a | 0.047 | 10.060 | n/a | n/a | 0.027 | 4.615 | 0.205 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001df2 | 22.420 | 3.464 | n/a | 0.000 | 0.067 | 0.504 | 1.541 | 0.012 | n/a | 0.042 | 16.762 | n/a | n/a | 0.029 | 3.530 | 0.157 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e31 | 22.153 | 4.309 | n/a | 0.000 | 0.018 | 0.344 | 0.735 | 0.005 | n/a | 0.192 | 16.541 | n/a | n/a | 0.008 | 4.327 | 0.195 | 0.008 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.866 | 0.000 | 0.000 | 0.414 | 2.160 | n/a | 0.000 | 0.043 | 0.557 | 1.126 | 0.015 | n/a | 0.085 | 5.782 | n/a | n/a | 0.019 | 2.203 | 0.214 | 0.019 |
| p99 | 97.437 | 1.743 | 0.011 | 0.979 | 4.419 | n/a | 0.000 | 0.583 | 1.312 | 6.410 | 0.038 | n/a | 1.928 | 94.225 | n/a | n/a | 0.056 | 4.504 | 0.375 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000001de6 | 97.437 | 1.807 | n/a | 0.000 | 0.047 | 0.447 | 0.832 | 0.012 | n/a | 0.043 | 94.225 | n/a | n/a | 0.021 | 1.855 | 0.019 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.324ms |
| a503e751587f37aa0000000000001dee | 34.247 | 4.419 | n/a | 0.000 | 0.085 | 0.778 | 6.410 | 0.015 | n/a | 0.044 | 22.454 | n/a | n/a | 0.042 | 4.504 | 0.132 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001df2 | 22.420 | 3.464 | n/a | 0.000 | 0.067 | 0.504 | 1.541 | 0.012 | n/a | 0.042 | 16.762 | n/a | n/a | 0.029 | 3.530 | 0.157 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e65 | 19.130 | 2.711 | n/a | 0.000 | 0.093 | 0.637 | 0.870 | 0.015 | n/a | 0.054 | 14.719 | n/a | n/a | 0.031 | 2.804 | 0.147 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.598ms |
| a503e751587f37aa0000000000001e1c | 18.416 | 3.826 | n/a | 0.000 | 0.112 | 0.976 | 1.879 | 0.038 | n/a | 0.132 | 11.415 | n/a | n/a | 0.040 | 3.938 | 0.214 | 0.040 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e08 | 16.606 | 1.738 | n/a | 0.000 | 0.040 | 0.591 | 1.265 | 0.020 | n/a | 0.074 | 12.863 | n/a | n/a | 0.015 | 1.778 | 0.107 | 0.015 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001dec | 15.571 | 1.886 | n/a | 0.000 | 0.041 | 0.356 | 1.170 | 0.015 | n/a | 0.289 | 11.799 | n/a | n/a | 0.016 | 1.927 | 0.124 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e96 | 14.984 | 3.658 | n/a | 0.000 | 0.142 | 0.967 | 1.467 | 0.023 | n/a | 0.126 | 8.558 | n/a | n/a | 0.043 | 3.801 | 0.254 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e90 | 13.826 | 3.629 | n/a | 0.000 | 0.094 | 1.312 | 4.069 | 0.035 | n/a | 0.192 | 4.460 | n/a | n/a | 0.036 | 3.723 | 0.269 | 0.036 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.201ms |
| a503e751587f37aa0000000000001e76 | 13.249 | 2.160 | n/a | 0.000 | 0.043 | 0.791 | 1.777 | 0.028 | n/a | 0.125 | 8.306 | n/a | n/a | 0.020 | 2.203 | 0.166 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001dfe | 12.908 | 3.244 | n/a | 0.000 | 0.090 | 0.696 | 1.052 | 0.015 | n/a | 0.085 | 7.692 | n/a | n/a | 0.033 | 3.335 | 0.258 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e16 | 12.644 | 2.342 | n/a | 0.000 | 0.035 | 0.446 | 0.958 | 0.020 | n/a | 0.419 | 8.410 | n/a | n/a | 0.015 | 2.376 | 0.188 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e4a | 12.522 | 2.077 | n/a | 0.000 | 0.052 | 0.892 | 1.569 | 0.027 | n/a | 0.511 | 7.371 | n/a | n/a | 0.023 | 2.129 | 0.170 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e62 | 12.059 | 2.724 | n/a | 0.000 | 0.104 | 0.544 | 0.910 | 0.028 | n/a | 0.058 | 7.655 | n/a | n/a | 0.037 | 2.828 | 0.234 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e0c | 11.434 | 1.881 | n/a | 0.000 | 0.038 | 0.493 | 0.842 | 0.012 | n/a | 0.085 | 8.064 | n/a | n/a | 0.019 | 1.919 | 0.168 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.311ms |
| a503e751587f37aa0000000000001de0 | 11.381 | 1.976 | n/a | 0.000 | 0.074 | 0.704 | 2.472 | 0.034 | n/a | 1.928 | 4.158 | n/a | n/a | 0.035 | 2.051 | 0.180 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e40 | 11.107 | 1.871 | n/a | 0.000 | 0.033 | 1.181 | 1.370 | 0.028 | n/a | 0.188 | 6.421 | n/a | n/a | 0.015 | 1.904 | 0.171 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.493ms |
| a503e751587f37aa0000000000001e2e | 10.866 | 2.057 | n/a | 0.000 | 0.042 | 0.557 | 1.126 | 0.020 | n/a | 0.216 | 6.831 | n/a | n/a | 0.016 | 2.099 | 0.193 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e5f | 10.738 | 2.007 | n/a | 0.000 | 0.036 | 0.386 | 1.868 | 0.015 | n/a | 0.358 | 6.050 | n/a | n/a | 0.018 | 2.043 | 0.190 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e0f | 10.554 | 2.825 | n/a | 0.000 | 0.093 | 0.839 | 1.465 | 0.027 | n/a | 0.154 | 5.119 | n/a | n/a | 0.032 | 2.918 | 0.277 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.990 | 0.000 | 0.000 | 0.432 | 3.078 | n/a | 0.000 | 0.039 | 0.840 | 1.696 | 0.018 | n/a | 0.093 | 6.400 | n/a | n/a | 0.017 | 3.370 | 0.226 | 0.017 |
| p99 | 36.964 | 2.998 | 0.000 | 1.892 | 5.427 | n/a | 0.000 | 3.541 | 21.696 | 10.947 | 0.075 | n/a | 3.004 | 27.635 | n/a | n/a | 0.048 | 6.346 | 0.443 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000001efd | 36.964 | 3.204 | 0.240 | 0.000 | 0.039 | 0.898 | 4.853 | 0.019 | n/a | 0.061 | 27.635 | n/a | n/a | 0.016 | 3.483 | 0.094 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001eaf | 35.733 | 3.125 | 0.226 | 0.000 | 0.035 | 1.090 | 5.050 | 0.019 | n/a | 0.323 | 25.850 | n/a | n/a | 0.016 | 3.385 | 0.095 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f03 | 34.684 | 3.071 | 0.194 | 0.000 | 0.030 | 21.696 | 2.320 | 0.028 | n/a | 0.077 | 7.253 | n/a | n/a | 0.013 | 3.296 | 0.095 | 0.013 | node-14/thread-6/socket.wait-first-byte | none observed |
| a503e751587f37aa0000000000001eb4 | 31.801 | 3.228 | 0.222 | 0.000 | 0.021 | 0.996 | 10.947 | 0.018 | n/a | 0.055 | 16.301 | n/a | n/a | 0.012 | 3.471 | 0.109 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f11 | 27.169 | 4.686 | 0.175 | 0.000 | 0.039 | 1.487 | 5.895 | 0.036 | n/a | 0.096 | 14.727 | n/a | n/a | 0.030 | 4.900 | 0.180 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ed8 | 26.741 | 2.897 | 0.185 | 0.000 | 0.039 | 1.005 | 7.963 | 0.018 | n/a | 3.004 | 11.615 | n/a | n/a | 0.016 | 3.121 | 0.117 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f04 | 24.733 | 2.760 | n/a | 0.000 | 0.029 | 10.733 | 1.500 | 0.017 | n/a | 0.046 | 9.636 | n/a | n/a | 0.013 | 2.789 | 0.113 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| a503e751587f37aa0000000000001f33 | 24.105 | 3.475 | 0.244 | 0.000 | 0.032 | 1.435 | 6.963 | 0.020 | n/a | 0.314 | 11.609 | n/a | n/a | 0.015 | 3.751 | 0.156 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ebe | 24.100 | 5.017 | 0.270 | 0.000 | 0.036 | 1.656 | 9.828 | 0.021 | n/a | 0.066 | 7.188 | n/a | n/a | 0.018 | 5.323 | 0.221 | 0.018 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001ead | 23.874 | 5.161 | n/a | 0.000 | 0.040 | 0.562 | 1.200 | 0.012 | n/a | 0.042 | 16.837 | n/a | n/a | 0.019 | 5.201 | 0.218 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f1b | 22.533 | 3.417 | 0.291 | 0.000 | 0.091 | 0.995 | 5.922 | 0.026 | n/a | 0.399 | 11.365 | n/a | n/a | 0.027 | 3.799 | 0.169 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001eed | 21.447 | 2.963 | 0.176 | 0.000 | 0.034 | 0.981 | 6.750 | 0.025 | n/a | 0.107 | 10.396 | n/a | n/a | 0.015 | 3.172 | 0.148 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ea7 | 20.944 | 4.891 | 0.254 | 0.000 | 0.030 | 0.989 | 4.302 | 0.015 | n/a | 0.177 | 10.273 | n/a | n/a | 0.013 | 5.175 | 0.247 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f3b | 20.729 | 3.171 | 0.146 | 0.000 | 0.031 | 1.263 | 8.513 | 0.028 | n/a | 0.070 | 7.494 | n/a | n/a | 0.014 | 3.348 | 0.162 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f2f | 20.661 | 5.355 | n/a | 0.000 | 0.081 | 3.042 | 1.179 | 0.012 | n/a | 0.870 | 10.088 | n/a | n/a | 0.033 | 5.436 | 0.263 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.100ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000001f13 | 20.632 | 4.229 | 0.174 | 0.000 | 0.035 | 1.585 | 5.548 | 0.022 | n/a | 0.072 | 8.951 | n/a | n/a | 0.015 | 4.439 | 0.215 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f4b | 20.316 | 3.238 | 0.176 | 0.000 | 0.046 | 1.447 | 7.508 | 0.037 | n/a | 0.101 | 7.748 | n/a | n/a | 0.016 | 3.459 | 0.170 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f41 | 20.106 | 3.352 | 0.337 | 0.000 | 0.041 | 4.803 | 6.481 | 0.023 | n/a | 0.060 | 4.995 | n/a | n/a | 0.015 | 3.730 | 0.185 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f59 | 20.057 | 3.470 | 0.294 | 0.000 | 0.039 | 0.988 | 4.780 | 0.016 | n/a | 0.043 | 10.413 | n/a | n/a | 0.014 | 3.803 | 0.190 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001edc | 19.837 | 5.427 | n/a | 0.000 | 0.043 | 1.919 | 10.836 | 0.039 | n/a | 0.247 | 1.302 | n/a | n/a | 0.024 | 5.471 | 0.276 | 0.024 | gw-w/thread-46/storage/begin-command! | driver.reader-basis.broadcast 0.750ms |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.139 | 0.000 | 0.000 | 0.409 | 2.120 | n/a | 0.000 | 0.043 | 0.523 | 1.007 | 0.015 | n/a | 0.183 | 5.780 | n/a | n/a | 0.019 | 2.189 | 0.229 | 0.019 |
| p99 | 19.837 | 1.755 | 0.000 | 1.542 | 5.427 | n/a | 0.000 | 3.541 | 5.288 | 10.836 | 0.075 | n/a | 0.621 | 11.487 | n/a | n/a | 0.048 | 6.346 | 0.443 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000001edc | 19.837 | 5.427 | n/a | 0.000 | 0.043 | 1.919 | 10.836 | 0.039 | n/a | 0.247 | 1.302 | n/a | n/a | 0.024 | 5.471 | 0.276 | 0.024 | gw-w/thread-46/storage/begin-command! | driver.reader-basis.broadcast 0.750ms |
| a503e751587f37aa0000000000001eee | 17.028 | 3.356 | n/a | 0.000 | 0.090 | 0.661 | 1.310 | 0.017 | n/a | 0.076 | 11.487 | n/a | n/a | 0.031 | 3.446 | 0.202 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001eb3 | 16.416 | 5.330 | n/a | 0.000 | 0.104 | 5.288 | 3.443 | 0.029 | n/a | 0.285 | 1.901 | n/a | n/a | 0.035 | 5.434 | 0.331 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| a503e751587f37aa0000000000001ea8 | 16.301 | 1.809 | n/a | 0.000 | 0.049 | 0.870 | 2.161 | 0.026 | n/a | 0.108 | 11.259 | n/a | n/a | 0.018 | 1.858 | 0.114 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ef3 | 15.113 | 3.517 | n/a | 0.000 | 0.056 | 0.812 | 1.354 | 0.075 | n/a | 0.183 | 9.094 | n/a | n/a | 0.023 | 3.573 | 0.236 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f30 | 14.337 | 2.806 | n/a | 0.000 | 3.541 | 1.380 | 0.531 | 0.004 | n/a | 0.458 | 5.601 | n/a | n/a | 0.016 | 6.346 | 0.443 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ebc | 12.906 | 4.076 | n/a | 0.000 | 0.050 | 0.922 | 1.572 | 0.022 | n/a | 0.458 | 5.780 | n/a | n/a | 0.026 | 4.126 | 0.320 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ec8 | 12.853 | 3.779 | n/a | 0.000 | 0.128 | 1.042 | 1.931 | 0.042 | n/a | 0.621 | 5.262 | n/a | n/a | 0.048 | 3.907 | 0.304 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f3c | 12.156 | 2.120 | n/a | 0.000 | 0.031 | 0.745 | 1.895 | 0.028 | n/a | 0.130 | 7.188 | n/a | n/a | 0.018 | 2.151 | 0.177 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ee5 | 12.044 | 2.476 | n/a | 0.000 | 0.066 | 0.735 | 1.281 | 0.023 | n/a | 0.441 | 6.996 | n/a | n/a | 0.026 | 2.542 | 0.211 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001e9c | 11.801 | 1.918 | n/a | 0.000 | 0.034 | 0.429 | 0.825 | 0.015 | n/a | 0.285 | 8.276 | n/a | n/a | 0.018 | 1.952 | 0.165 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f29 | 11.550 | 1.708 | n/a | 0.000 | 0.033 | 0.497 | 0.891 | 0.013 | n/a | 0.279 | 8.111 | n/a | n/a | 0.017 | 1.742 | 0.151 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ea4 | 11.333 | 2.371 | n/a | 0.000 | 0.096 | 0.595 | 2.302 | 0.016 | n/a | 0.065 | 5.854 | n/a | n/a | 0.033 | 2.467 | 0.218 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001edf | 11.283 | 2.904 | n/a | 0.000 | 0.148 | 0.600 | 0.778 | 0.015 | n/a | 0.056 | 6.743 | n/a | n/a | 0.039 | 3.052 | 0.271 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f51 | 10.888 | 3.044 | n/a | 0.000 | 0.039 | 0.533 | 0.911 | 0.012 | n/a | 0.044 | 6.285 | n/a | n/a | 0.019 | 3.083 | 0.283 | 0.019 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.762ms |
| a503e751587f37aa0000000000001ecd | 10.531 | 2.881 | n/a | 0.000 | 0.021 | 0.671 | 0.863 | 0.013 | n/a | 0.053 | 6.017 | n/a | n/a | 0.012 | 2.902 | 0.276 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f45 | 10.272 | 2.153 | n/a | 0.000 | 0.036 | 0.497 | 1.054 | 0.018 | n/a | 0.282 | 6.215 | n/a | n/a | 0.017 | 2.189 | 0.213 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ed0 | 10.139 | 1.873 | n/a | 0.000 | 0.043 | 0.501 | 1.115 | 0.015 | n/a | 0.228 | 6.341 | n/a | n/a | 0.022 | 1.916 | 0.189 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ee6 | 9.973 | 1.895 | n/a | 0.000 | 1.872 | 0.451 | 1.068 | 0.012 | n/a | 0.034 | 4.627 | n/a | n/a | 0.013 | 3.766 | 0.378 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.044ms |
| a503e751587f37aa0000000000001ef0 | 9.950 | 1.759 | n/a | 0.000 | 0.022 | 0.348 | 0.776 | 0.011 | n/a | 0.048 | 6.975 | n/a | n/a | 0.011 | 1.781 | 0.179 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.540 | 0.000 | 0.000 | 0.452 | 3.209 | n/a | 0.000 | 0.042 | 0.882 | 1.943 | 0.017 | n/a | 0.129 | 7.083 | n/a | n/a | 0.017 | 3.436 | 0.229 | 0.017 |
| p99 | 66.687 | 2.001 | 0.037 | 2.349 | 6.829 | n/a | 0.000 | 2.278 | 4.757 | 30.677 | 0.056 | n/a | 2.687 | 53.174 | n/a | n/a | 0.051 | 6.874 | 0.460 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000001fde | 66.687 | 4.521 | 0.222 | 0.000 | 0.009 | 1.236 | 7.202 | 0.017 | n/a | 0.298 | 53.174 | n/a | n/a | 0.008 | 4.752 | 0.071 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.020ms |
| a503e751587f37aa0000000000001fdd | 49.840 | 1.792 | n/a | 0.000 | 0.046 | 0.548 | 1.471 | 0.014 | n/a | 2.687 | 43.264 | n/a | n/a | 0.017 | 1.839 | 0.037 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f7a | 47.973 | 5.705 | 0.166 | 0.000 | 0.025 | 0.932 | 30.677 | 0.019 | n/a | 0.058 | 10.379 | n/a | n/a | 0.011 | 5.897 | 0.123 | 0.011 | gw-w/thread-41/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001f65 | 27.901 | 3.807 | n/a | 0.000 | 0.153 | 0.903 | 5.821 | 0.022 | n/a | 0.322 | 16.827 | n/a | n/a | 0.046 | 3.960 | 0.142 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| a503e751587f37aa0000000000001f8a | 27.229 | 3.053 | 0.215 | 0.000 | 0.026 | 0.947 | 12.070 | 0.017 | n/a | 0.073 | 10.799 | n/a | n/a | 0.029 | 3.294 | 0.121 | 0.029 | gw-w/thread-47/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001ff2 | 25.589 | 3.129 | 0.169 | 0.000 | 0.028 | 1.129 | 8.319 | 0.019 | n/a | 0.053 | 12.733 | n/a | n/a | 0.011 | 3.325 | 0.130 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f64 | 24.477 | 4.809 | 0.252 | 0.000 | 0.047 | 1.056 | 5.099 | 0.017 | n/a | 0.041 | 13.138 | n/a | n/a | 0.017 | 5.108 | 0.209 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f6e | 24.126 | 3.697 | 0.226 | 0.000 | 0.045 | 0.955 | 6.206 | 0.019 | n/a | 0.075 | 12.881 | n/a | n/a | 0.021 | 3.969 | 0.164 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001faf | 23.861 | 6.829 | n/a | 0.000 | 0.045 | 0.882 | 2.489 | 0.022 | n/a | 0.590 | 12.980 | n/a | n/a | 0.024 | 6.874 | 0.288 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fa5 | 23.821 | 3.119 | 0.252 | 0.000 | 0.039 | 4.757 | 6.697 | 0.030 | n/a | 0.059 | 8.854 | n/a | n/a | 0.013 | 3.411 | 0.143 | 0.013 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f7e | 23.309 | 3.444 | 0.218 | 0.000 | 0.038 | 1.159 | 10.496 | 0.031 | n/a | 0.602 | 7.305 | n/a | n/a | 0.017 | 3.699 | 0.159 | 0.017 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001fc3 | 23.092 | 3.914 | n/a | 0.000 | 0.037 | 0.542 | 1.249 | 0.012 | n/a | 0.083 | 17.237 | n/a | n/a | 0.018 | 3.950 | 0.171 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002012 | 22.614 | 3.267 | 0.172 | 0.000 | 0.049 | 0.997 | 9.924 | 0.025 | n/a | 0.099 | 8.067 | n/a | n/a | 0.014 | 3.488 | 0.154 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ff8 | 22.327 | 4.763 | 0.312 | 0.000 | 0.046 | 1.586 | 4.707 | 0.015 | n/a | 0.046 | 10.838 | n/a | n/a | 0.014 | 5.121 | 0.229 | 0.014 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f7c | 21.520 | 3.370 | 0.251 | 0.000 | 0.044 | 1.097 | 7.482 | 0.017 | n/a | 0.294 | 8.951 | n/a | n/a | 0.013 | 3.665 | 0.170 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f9b | 21.156 | 3.463 | 0.222 | 0.000 | 0.042 | 1.009 | 5.366 | 0.018 | n/a | 0.051 | 10.970 | n/a | n/a | 0.016 | 3.727 | 0.176 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fc5 | 20.347 | 3.763 | 0.245 | 0.000 | 0.037 | 1.230 | 2.096 | 0.036 | n/a | 0.132 | 12.794 | n/a | n/a | 0.013 | 4.045 | 0.199 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000200e | 19.834 | 4.658 | 0.313 | 0.000 | 0.040 | 1.024 | 4.274 | 0.018 | n/a | 0.211 | 9.281 | n/a | n/a | 0.016 | 5.011 | 0.253 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f68 | 19.647 | 4.255 | 0.249 | 0.000 | 0.047 | 1.474 | 6.660 | 0.018 | n/a | 0.065 | 6.863 | n/a | n/a | 0.016 | 4.551 | 0.232 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fc1 | 18.912 | 3.253 | 0.281 | 0.000 | 0.091 | 1.165 | 6.077 | 0.028 | n/a | 0.152 | 7.841 | n/a | n/a | 0.024 | 3.625 | 0.192 | 0.024 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.272 | 0.000 | 0.000 | 0.450 | 2.371 | n/a | 0.000 | 0.046 | 0.667 | 1.095 | 0.016 | n/a | 0.226 | 6.510 | n/a | n/a | 0.020 | 2.624 | 0.211 | 0.020 |
| p99 | 49.840 | 1.723 | 0.037 | 1.527 | 4.950 | n/a | 0.000 | 2.278 | 4.689 | 7.365 | 0.056 | n/a | 2.687 | 43.264 | n/a | n/a | 0.051 | 4.990 | 0.408 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000001fdd | 49.840 | 1.792 | n/a | 0.000 | 0.046 | 0.548 | 1.471 | 0.014 | n/a | 2.687 | 43.264 | n/a | n/a | 0.017 | 1.839 | 0.037 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f65 | 27.901 | 3.807 | n/a | 0.000 | 0.153 | 0.903 | 5.821 | 0.022 | n/a | 0.322 | 16.827 | n/a | n/a | 0.046 | 3.960 | 0.142 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| a503e751587f37aa0000000000002014 | 18.860 | 3.072 | n/a | 0.000 | 0.060 | 0.871 | 0.994 | 0.015 | n/a | 0.162 | 13.657 | n/a | n/a | 0.029 | 3.132 | 0.166 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fab | 18.605 | 3.397 | n/a | 0.000 | 0.039 | 0.389 | 0.897 | 0.016 | n/a | 0.383 | 13.470 | n/a | n/a | 0.015 | 3.436 | 0.185 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fe3 | 16.738 | 4.950 | n/a | 0.000 | 0.040 | 1.729 | 4.285 | 0.029 | n/a | 0.139 | 5.541 | n/a | n/a | 0.025 | 4.990 | 0.298 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.314ms |
| a503e751587f37aa0000000000001fe6 | 16.392 | 1.943 | n/a | 0.000 | 0.871 | 0.413 | 0.913 | 0.014 | n/a | 0.051 | 12.175 | n/a | n/a | 0.014 | 2.813 | 0.172 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f8f | 16.061 | 4.733 | n/a | 0.000 | 0.098 | 1.271 | 7.365 | 0.056 | n/a | 0.531 | 1.974 | n/a | n/a | 0.034 | 4.831 | 0.301 | 0.034 | gw-w/thread-43/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000001f80 | 15.939 | 4.313 | n/a | 0.000 | 0.115 | 0.898 | 1.378 | 0.026 | n/a | 0.460 | 8.708 | n/a | n/a | 0.042 | 4.427 | 0.278 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f72 | 15.860 | 2.093 | n/a | 0.000 | 1.354 | 4.196 | 0.865 | 0.013 | n/a | 0.052 | 7.275 | n/a | n/a | 0.011 | 3.447 | 0.217 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ffa | 14.452 | 1.623 | n/a | 0.000 | 0.056 | 4.689 | 0.807 | 0.011 | n/a | 0.054 | 7.191 | n/a | n/a | 0.020 | 1.679 | 0.116 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001ff4 | 14.230 | 3.287 | n/a | 0.000 | 0.144 | 0.720 | 1.778 | 0.047 | n/a | 0.634 | 7.570 | n/a | n/a | 0.051 | 3.431 | 0.241 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f91 | 13.634 | 2.627 | n/a | 0.000 | 0.080 | 0.622 | 1.080 | 0.016 | n/a | 0.062 | 9.098 | n/a | n/a | 0.049 | 2.707 | 0.199 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fa2 | 13.546 | 2.475 | n/a | 0.000 | 0.025 | 1.619 | 1.173 | 0.029 | n/a | 0.063 | 8.145 | n/a | n/a | 0.017 | 2.500 | 0.185 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fbb | 13.409 | 2.570 | n/a | 0.000 | 0.054 | 0.754 | 1.314 | 0.037 | n/a | 0.141 | 8.513 | n/a | n/a | 0.025 | 2.624 | 0.196 | 0.025 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fbf | 13.272 | 2.371 | n/a | 0.000 | 0.051 | 0.888 | 1.952 | 0.037 | n/a | 0.226 | 7.720 | n/a | n/a | 0.027 | 2.421 | 0.182 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f93 | 13.036 | 2.717 | n/a | 0.000 | 0.037 | 0.508 | 0.827 | 0.013 | n/a | 0.241 | 8.678 | n/a | n/a | 0.015 | 2.754 | 0.211 | 0.015 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fcf | 12.705 | 2.973 | n/a | 0.000 | 0.033 | 0.826 | 3.310 | 0.026 | n/a | 0.096 | 5.414 | n/a | n/a | 0.027 | 3.006 | 0.237 | 0.027 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001f83 | 11.046 | 2.228 | n/a | 0.000 | 0.042 | 1.153 | 2.894 | 0.022 | n/a | 0.580 | 4.106 | n/a | n/a | 0.021 | 2.270 | 0.206 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000001fdb | 10.963 | 2.195 | n/a | 0.000 | 2.278 | 0.507 | 1.095 | 0.016 | n/a | 0.110 | 4.738 | n/a | n/a | 0.023 | 4.473 | 0.408 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000200b | 9.756 | 1.938 | n/a | 0.000 | 0.012 | 0.465 | 0.752 | 0.010 | n/a | 0.056 | 6.510 | n/a | n/a | 0.011 | 1.950 | 0.200 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (142 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.344 | 0.000 | 0.000 | 0.430 | 3.103 | n/a | 0.000 | 0.045 | 0.731 | 1.328 | 0.017 | n/a | 0.104 | 5.852 | n/a | n/a | 0.017 | 3.296 | 0.260 | 0.017 |
| p99 | 55.211 | 2.491 | 0.009 | 2.575 | 6.993 | n/a | 0.000 | 1.451 | 2.863 | 27.580 | 0.050 | n/a | 1.069 | 16.348 | n/a | n/a | 0.067 | 7.034 | 0.483 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000020bd | 56.323 | 3.637 | n/a | 0.000 | 0.048 | 0.611 | 1.572 | 0.020 | n/a | 0.461 | 49.951 | n/a | n/a | 0.023 | 3.685 | 0.065 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002075 | 55.211 | 3.244 | 0.164 | 0.000 | 0.051 | 1.048 | 44.156 | 0.024 | n/a | 0.093 | 6.414 | n/a | n/a | 0.016 | 3.459 | 0.063 | 0.016 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa00000000000020db | 47.923 | 2.737 | 0.167 | 0.000 | 0.031 | 0.960 | 27.580 | 0.022 | n/a | 0.067 | 16.348 | n/a | n/a | 0.013 | 2.934 | 0.061 | 0.013 | gw-w/thread-43/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000002065 | 31.579 | 2.945 | 0.184 | 0.000 | 0.076 | 0.831 | 13.076 | 0.028 | n/a | 0.082 | 14.338 | n/a | n/a | 0.020 | 3.205 | 0.101 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002129 | 24.583 | 4.877 | 0.294 | 0.000 | 0.041 | 1.296 | 4.197 | 0.017 | n/a | 0.055 | 13.788 | n/a | n/a | 0.018 | 5.212 | 0.212 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.417ms |
| a503e751587f37aa0000000000002027 | 24.502 | 2.671 | 0.135 | 0.000 | 0.009 | 1.474 | 9.275 | 0.031 | n/a | 0.830 | 10.073 | n/a | n/a | 0.004 | 2.815 | 0.115 | 0.004 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020ff | 24.134 | 3.301 | 0.209 | 0.000 | 0.059 | 1.253 | 5.565 | 0.022 | n/a | 0.063 | 13.644 | n/a | n/a | 0.018 | 3.569 | 0.148 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.992ms |
| a503e751587f37aa00000000000020ef | 23.191 | 4.279 | 0.255 | 0.000 | 0.048 | 1.252 | 5.543 | 0.015 | n/a | 0.060 | 11.723 | n/a | n/a | 0.016 | 4.582 | 0.198 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.381ms |
| a503e751587f37aa0000000000002020 | 22.657 | 2.982 | 0.237 | 0.000 | 0.077 | 0.907 | 10.330 | 0.028 | n/a | 0.153 | 7.924 | n/a | n/a | 0.020 | 3.296 | 0.145 | 0.020 | gw-w/thread-43/gateway.admitted-work | none observed |
| a503e751587f37aa00000000000020d7 | 22.041 | 3.432 | 0.607 | 0.000 | 0.043 | 0.775 | 4.478 | 0.016 | n/a | 0.067 | 12.607 | n/a | n/a | 0.014 | 4.083 | 0.185 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000201a | 21.098 | 2.996 | 0.173 | 0.000 | 0.044 | 0.928 | 7.548 | 0.020 | n/a | 0.055 | 9.320 | n/a | n/a | 0.014 | 3.213 | 0.152 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002023 | 20.626 | 9.017 | n/a | 0.000 | 0.076 | 1.708 | 1.251 | 0.015 | n/a | 0.062 | 8.468 | n/a | n/a | 0.029 | 9.093 | 0.441 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002048 | 20.531 | 2.908 | 0.178 | 0.000 | 0.038 | 0.878 | 6.732 | 0.025 | n/a | 3.567 | 6.191 | n/a | n/a | 0.013 | 3.125 | 0.152 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002026 | 20.109 | 6.043 | n/a | 0.000 | 0.037 | 1.052 | 4.149 | 0.023 | n/a | 0.065 | 8.722 | n/a | n/a | 0.017 | 6.080 | 0.302 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020e9 | 20.096 | 3.476 | 0.322 | 0.000 | 0.091 | 1.014 | 1.338 | 0.016 | n/a | 0.222 | 13.595 | n/a | n/a | 0.023 | 3.888 | 0.193 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.869ms |
| a503e751587f37aa0000000000002055 | 20.020 | 2.845 | n/a | 0.000 | 0.045 | 0.653 | 1.450 | 0.023 | n/a | 0.134 | 14.854 | n/a | n/a | 0.017 | 2.890 | 0.144 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020b3 | 19.444 | 4.090 | 0.238 | 0.000 | 0.111 | 1.735 | 8.472 | 0.019 | n/a | 0.331 | 4.425 | n/a | n/a | 0.024 | 4.439 | 0.228 | 0.024 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa000000000000202b | 19.020 | 5.465 | n/a | 0.000 | 0.041 | 2.012 | 3.927 | 0.050 | n/a | 1.069 | 6.437 | n/a | n/a | 0.019 | 5.507 | 0.290 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000206b | 18.686 | 3.217 | 0.157 | 0.000 | 0.046 | 1.001 | 2.141 | 0.028 | n/a | 0.104 | 11.978 | n/a | n/a | 0.015 | 3.420 | 0.183 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020d1 | 18.462 | 4.295 | 0.233 | 0.000 | 0.040 | 1.323 | 7.213 | 0.024 | n/a | 0.224 | 5.095 | n/a | n/a | 0.014 | 4.567 | 0.247 | 0.014 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2 / recovery / commit / 5-10 facts (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.988 | 0.000 | 0.000 | 0.412 | 2.456 | n/a | 0.000 | 0.047 | 0.529 | 0.974 | 0.017 | n/a | 0.136 | 5.232 | n/a | n/a | 0.018 | 2.530 | 0.235 | 0.018 |
| p99 | 17.789 | 2.004 | 0.000 | 1.395 | 5.055 | n/a | 0.000 | 1.451 | 2.863 | 6.561 | 0.037 | n/a | 0.457 | 12.504 | n/a | n/a | 0.067 | 6.029 | 0.483 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002083 | 17.789 | 2.939 | n/a | 0.000 | 0.073 | 0.837 | 1.289 | 0.021 | n/a | 0.097 | 12.504 | n/a | n/a | 0.028 | 3.011 | 0.169 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms |
| a503e751587f37aa0000000000002109 | 16.097 | 2.775 | n/a | 0.000 | 0.124 | 0.297 | 1.107 | 0.022 | n/a | 0.114 | 11.591 | n/a | n/a | 0.067 | 2.899 | 0.180 | 0.067 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.236ms |
| a503e751587f37aa0000000000002091 | 15.509 | 4.578 | n/a | 0.000 | 1.451 | 0.933 | 1.726 | 0.029 | n/a | 0.271 | 6.504 | n/a | n/a | 0.018 | 6.029 | 0.389 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.294ms |
| a503e751587f37aa0000000000002054 | 15.279 | 3.476 | n/a | 0.000 | 0.038 | 2.863 | 6.561 | 0.021 | n/a | 0.222 | 2.080 | n/a | n/a | 0.018 | 3.514 | 0.230 | 0.018 | gw-w/thread-44/gateway.admitted-work | none observed |
| a503e751587f37aa00000000000020d9 | 15.055 | 2.750 | n/a | 0.000 | 0.090 | 0.713 | 0.853 | 0.033 | n/a | 0.269 | 10.310 | n/a | n/a | 0.037 | 2.840 | 0.189 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020ea | 14.982 | 5.055 | n/a | 0.000 | 0.100 | 0.386 | 1.824 | 0.037 | n/a | 0.136 | 7.408 | n/a | n/a | 0.036 | 5.155 | 0.344 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000211d | 14.447 | 2.759 | n/a | 0.000 | 0.093 | 0.580 | 1.564 | 0.012 | n/a | 0.146 | 9.260 | n/a | n/a | 0.032 | 2.852 | 0.197 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.395ms |
| a503e751587f37aa0000000000002069 | 14.349 | 2.903 | n/a | 0.000 | 0.085 | 0.729 | 0.912 | 0.015 | n/a | 0.070 | 9.603 | n/a | n/a | 0.032 | 2.989 | 0.208 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000208a | 13.807 | 2.456 | n/a | 0.000 | 0.092 | 0.420 | 0.827 | 0.018 | n/a | 0.122 | 9.831 | n/a | n/a | 0.040 | 2.547 | 0.184 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000209e | 13.410 | 1.780 | n/a | 0.000 | 0.041 | 0.473 | 0.991 | 0.017 | n/a | 0.071 | 10.020 | n/a | n/a | 0.018 | 1.821 | 0.136 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002060 | 12.825 | 3.407 | n/a | 0.000 | 0.093 | 0.713 | 1.279 | 0.017 | n/a | 0.072 | 7.212 | n/a | n/a | 0.032 | 3.499 | 0.273 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000206c | 12.253 | 1.770 | n/a | 0.000 | 0.016 | 0.445 | 0.999 | 0.013 | n/a | 0.096 | 8.906 | n/a | n/a | 0.008 | 1.786 | 0.146 | 0.008 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020cf | 12.192 | 1.942 | n/a | 0.000 | 0.033 | 0.467 | 0.866 | 0.017 | n/a | 0.388 | 8.463 | n/a | n/a | 0.015 | 1.975 | 0.162 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000204c | 12.073 | 2.485 | n/a | 0.000 | 0.045 | 0.825 | 1.206 | 0.020 | n/a | 0.293 | 7.173 | n/a | n/a | 0.026 | 2.530 | 0.210 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020d5 | 12.011 | 4.095 | n/a | 0.000 | 0.116 | 0.758 | 1.127 | 0.022 | n/a | 0.093 | 5.753 | n/a | n/a | 0.047 | 4.211 | 0.351 | 0.047 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002037 | 11.895 | 2.921 | n/a | 0.000 | 0.032 | 1.036 | 1.221 | 0.023 | n/a | 0.147 | 6.499 | n/a | n/a | 0.016 | 2.953 | 0.248 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.263ms |
| a503e751587f37aa0000000000002117 | 11.486 | 4.049 | n/a | 0.000 | 1.238 | 0.584 | 0.667 | 0.013 | n/a | 0.071 | 4.832 | n/a | n/a | 0.033 | 5.287 | 0.460 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002032 | 10.752 | 3.239 | n/a | 0.000 | 0.097 | 0.842 | 1.697 | 0.027 | n/a | 0.177 | 4.635 | n/a | n/a | 0.037 | 3.336 | 0.310 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020e7 | 10.449 | 3.051 | n/a | 0.000 | 0.060 | 0.782 | 1.160 | 0.023 | n/a | 0.100 | 5.246 | n/a | n/a | 0.028 | 3.111 | 0.298 | 0.028 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000020e0 | 10.385 | 1.840 | n/a | 0.000 | 0.039 | 0.499 | 0.901 | 0.017 | n/a | 0.107 | 6.968 | n/a | n/a | 0.014 | 1.879 | 0.181 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.732 | 0.000 | 0.000 | 0.472 | 3.142 | n/a | 0.000 | 0.054 | 0.770 | 1.352 | 0.021 | n/a | 0.095 | 6.117 | n/a | n/a | 0.021 | 3.437 | 0.270 | 0.021 |
| p99 | 37.565 | 2.999 | 0.000 | 2.180 | 5.458 | n/a | 0.704 | 0.678 | 1.930 | 11.146 | 0.043 | n/a | 1.308 | 10.342 | n/a | n/a | 0.046 | 6.115 | 0.408 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000021bf | 52.488 | 2.238 | n/a | 0.000 | 0.068 | 0.818 | 4.265 | 0.019 | n/a | 0.068 | 44.988 | n/a | n/a | 0.022 | 2.307 | 0.044 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.366ms |
| a503e751587f37aa00000000000021c9 | 37.565 | 3.349 | 0.222 | 0.000 | 0.069 | 1.570 | 26.522 | 0.031 | n/a | 0.098 | 5.665 | n/a | n/a | 0.039 | 3.640 | 0.097 | 0.039 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.940ms |
| a503e751587f37aa00000000000021dd | 25.360 | 3.492 | 0.314 | 0.000 | 0.150 | 1.068 | 11.146 | 0.029 | n/a | 0.100 | 9.020 | n/a | n/a | 0.042 | 3.956 | 0.156 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| a503e751587f37aa00000000000021ee | 23.492 | 3.778 | 0.480 | 0.000 | 0.072 | 1.726 | 8.766 | 0.033 | n/a | 0.080 | 8.534 | n/a | n/a | 0.023 | 4.330 | 0.184 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002163 | 21.340 | 5.045 | 0.300 | 0.000 | 0.067 | 1.919 | 5.813 | 0.024 | n/a | 0.065 | 8.087 | n/a | n/a | 0.021 | 5.411 | 0.254 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000212f | 20.921 | 3.415 | 0.285 | 0.366 | 0.085 | 1.226 | 5.723 | 0.032 | n/a | 0.086 | 9.677 | n/a | n/a | 0.026 | 4.151 | 0.198 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.379ms |
| a503e751587f37aa0000000000002171 | 20.610 | 4.838 | 0.329 | 0.000 | 0.063 | 1.651 | 5.563 | 0.041 | n/a | 0.182 | 7.923 | n/a | n/a | 0.021 | 5.229 | 0.254 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000217d | 20.203 | 3.015 | 0.250 | 0.000 | 0.056 | 3.664 | 2.728 | 0.034 | n/a | 0.091 | 10.342 | n/a | n/a | 0.023 | 3.321 | 0.164 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002147 | 19.832 | 3.662 | 0.232 | 0.421 | 0.058 | 1.620 | 6.095 | 0.038 | n/a | 0.143 | 7.541 | n/a | n/a | 0.021 | 4.372 | 0.220 | 0.021 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021f6 | 19.592 | 4.420 | 0.285 | 0.000 | 0.075 | 1.312 | 6.603 | 0.024 | n/a | 0.416 | 6.432 | n/a | n/a | 0.025 | 4.780 | 0.244 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002175 | 19.060 | 4.140 | n/a | 0.000 | 0.032 | 0.346 | 4.594 | 0.014 | n/a | 0.047 | 9.876 | n/a | n/a | 0.012 | 4.171 | 0.219 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002133 | 18.541 | 4.931 | 0.277 | 0.547 | 0.053 | 1.812 | 4.160 | 0.025 | n/a | 0.094 | 6.625 | n/a | n/a | 0.018 | 5.807 | 0.313 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.093ms |
| a503e751587f37aa0000000000002151 | 18.247 | 3.754 | 0.286 | 0.447 | 0.157 | 1.421 | 2.731 | 0.033 | n/a | 0.099 | 9.276 | n/a | n/a | 0.042 | 4.644 | 0.255 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000218b | 17.902 | 3.140 | 0.238 | 0.000 | 0.166 | 0.920 | 5.245 | 0.023 | n/a | 0.084 | 8.051 | n/a | n/a | 0.034 | 3.544 | 0.198 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002131 | 17.628 | 4.911 | 0.180 | 0.724 | 0.054 | 1.907 | 2.608 | 0.043 | n/a | 0.117 | 7.064 | n/a | n/a | 0.018 | 5.870 | 0.333 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.042ms |
| a503e751587f37aa00000000000021e7 | 17.610 | 3.124 | 0.231 | 0.000 | 0.099 | 1.002 | 6.037 | 0.029 | n/a | 0.071 | 6.988 | n/a | n/a | 0.028 | 3.454 | 0.196 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002159 | 17.444 | 3.446 | 0.238 | 0.000 | 0.038 | 0.842 | 4.373 | 0.031 | n/a | 0.135 | 8.324 | n/a | n/a | 0.017 | 3.722 | 0.213 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002177 | 16.839 | 3.801 | n/a | 0.000 | 0.120 | 0.744 | 4.430 | 0.017 | n/a | 0.065 | 7.627 | n/a | n/a | 0.035 | 3.921 | 0.233 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002161 | 16.795 | 3.724 | 0.239 | 0.000 | 0.063 | 0.948 | 1.301 | 0.016 | n/a | 0.219 | 10.272 | n/a | n/a | 0.014 | 4.025 | 0.240 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000214d | 16.642 | 5.171 | 0.328 | 0.559 | 0.057 | 1.560 | 1.679 | 0.027 | n/a | 0.092 | 7.149 | n/a | n/a | 0.019 | 6.115 | 0.367 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.907 | 0.000 | 0.000 | 0.418 | 2.322 | n/a | 0.000 | 0.053 | 0.632 | 1.045 | 0.020 | n/a | 0.090 | 5.313 | n/a | n/a | 0.022 | 2.365 | 0.229 | 0.022 |
| p99 | 52.488 | 1.986 | 0.003 | 0.848 | 4.128 | n/a | 0.000 | 0.678 | 1.010 | 4.449 | 0.032 | n/a | 0.447 | 44.988 | n/a | n/a | 0.040 | 4.224 | 0.403 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000021bf | 52.488 | 2.238 | n/a | 0.000 | 0.068 | 0.818 | 4.265 | 0.019 | n/a | 0.068 | 44.988 | n/a | n/a | 0.022 | 2.307 | 0.044 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.366ms |
| a503e751587f37aa0000000000002172 | 12.825 | 1.899 | n/a | 0.000 | 0.032 | 0.396 | 4.449 | 0.012 | n/a | 0.046 | 5.968 | n/a | n/a | 0.023 | 1.931 | 0.151 | 0.023 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002137 | 12.541 | 3.647 | n/a | 0.000 | 0.057 | 0.778 | 1.409 | 0.022 | n/a | 0.090 | 6.513 | n/a | n/a | 0.025 | 3.704 | 0.295 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002157 | 11.947 | 3.175 | n/a | 0.000 | 0.100 | 0.690 | 0.858 | 0.015 | n/a | 0.099 | 6.969 | n/a | n/a | 0.040 | 3.275 | 0.274 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002143 | 11.920 | 2.238 | n/a | 0.000 | 0.037 | 0.573 | 1.212 | 0.020 | n/a | 0.087 | 7.735 | n/a | n/a | 0.019 | 2.275 | 0.191 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021b3 | 11.760 | 3.912 | n/a | 0.000 | 0.097 | 0.790 | 1.137 | 0.023 | n/a | 0.180 | 5.588 | n/a | n/a | 0.033 | 4.010 | 0.341 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021ca | 11.522 | 3.200 | n/a | 0.000 | 0.076 | 0.691 | 1.045 | 0.032 | n/a | 0.067 | 6.384 | n/a | n/a | 0.029 | 3.276 | 0.284 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002148 | 11.495 | 2.788 | n/a | 0.000 | 0.028 | 0.551 | 0.873 | 0.015 | n/a | 0.058 | 7.164 | n/a | n/a | 0.018 | 2.815 | 0.245 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002188 | 11.244 | 2.115 | n/a | 0.000 | 0.057 | 0.632 | 0.958 | 0.022 | n/a | 0.353 | 7.085 | n/a | n/a | 0.022 | 2.172 | 0.193 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021a4 | 10.963 | 2.906 | n/a | 0.000 | 0.049 | 0.960 | 1.101 | 0.023 | n/a | 0.397 | 5.501 | n/a | n/a | 0.026 | 2.955 | 0.270 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.118ms |
| a503e751587f37aa0000000000002183 | 10.902 | 2.322 | n/a | 0.000 | 0.043 | 0.517 | 0.901 | 0.022 | n/a | 0.444 | 6.632 | n/a | n/a | 0.021 | 2.365 | 0.217 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021e1 | 10.889 | 3.415 | n/a | 0.000 | 0.077 | 0.770 | 1.323 | 0.031 | n/a | 0.131 | 5.108 | n/a | n/a | 0.034 | 3.491 | 0.321 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002164 | 10.778 | 2.393 | n/a | 0.000 | 0.080 | 1.010 | 0.877 | 0.014 | n/a | 0.065 | 6.309 | n/a | n/a | 0.030 | 2.473 | 0.229 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021e8 | 10.486 | 4.128 | n/a | 0.000 | 0.096 | 0.767 | 0.945 | 0.019 | n/a | 0.049 | 4.447 | n/a | n/a | 0.036 | 4.224 | 0.403 | 0.036 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021c6 | 10.398 | 2.257 | n/a | 0.000 | 0.053 | 0.626 | 1.283 | 0.020 | n/a | 0.447 | 5.690 | n/a | n/a | 0.021 | 2.310 | 0.222 | 0.021 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002152 | 10.314 | 2.738 | n/a | 0.000 | 0.086 | 0.697 | 0.906 | 0.016 | n/a | 0.093 | 5.744 | n/a | n/a | 0.033 | 2.825 | 0.274 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.121ms |
| a503e751587f37aa0000000000002192 | 9.907 | 3.146 | n/a | 0.000 | 0.101 | 0.586 | 0.889 | 0.016 | n/a | 0.071 | 5.061 | n/a | n/a | 0.039 | 3.247 | 0.328 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000021d8 | 9.841 | 2.180 | n/a | 0.000 | 0.050 | 0.652 | 1.188 | 0.023 | n/a | 0.094 | 5.627 | n/a | n/a | 0.026 | 2.230 | 0.227 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.552ms |
| a503e751587f37aa00000000000021cc | 9.729 | 2.732 | n/a | 0.000 | 0.094 | 0.654 | 1.045 | 0.017 | n/a | 0.065 | 5.093 | n/a | n/a | 0.029 | 2.826 | 0.291 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.666ms |
| a503e751587f37aa000000000000218c | 9.567 | 3.534 | n/a | 0.000 | 0.050 | 0.928 | 1.876 | 0.029 | n/a | 0.104 | 3.023 | n/a | n/a | 0.022 | 3.584 | 0.375 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.500 | 0.000 | 0.000 | 0.427 | 3.103 | n/a | 0.000 | 0.049 | 0.761 | 1.635 | 0.019 | n/a | 0.077 | 6.521 | n/a | n/a | 0.019 | 3.392 | 0.232 | 0.019 |
| p99 | 44.109 | 2.444 | 0.050 | 1.813 | 8.576 | n/a | 0.000 | 0.943 | 4.246 | 23.209 | 0.057 | n/a | 1.330 | 31.944 | n/a | n/a | 0.045 | 8.675 | 0.500 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002205 | 44.109 | 7.858 | 0.239 | 0.000 | 0.044 | 1.144 | 2.814 | 0.016 | n/a | 0.035 | 31.944 | n/a | n/a | 0.014 | 8.141 | 0.185 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.371ms |
| a503e751587f37aa000000000000226c | 35.250 | 2.739 | 0.185 | 0.000 | 0.024 | 0.801 | 23.209 | 0.028 | n/a | 0.056 | 8.194 | n/a | n/a | 0.013 | 2.948 | 0.084 | 0.013 | gw-w/thread-41/commit.prepare-and-validate | none observed |
| a503e751587f37aa000000000000222d | 29.960 | 5.419 | 0.314 | 0.000 | 0.061 | 2.081 | 6.203 | 0.027 | n/a | 0.053 | 15.778 | n/a | n/a | 0.023 | 5.795 | 0.193 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002217 | 29.841 | 3.484 | 0.258 | 0.000 | 0.131 | 1.323 | 8.720 | 0.043 | n/a | 0.088 | 15.757 | n/a | n/a | 0.036 | 3.873 | 0.130 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002258 | 29.326 | 8.576 | n/a | 0.000 | 0.099 | 0.609 | 1.478 | 0.013 | n/a | 0.048 | 18.470 | n/a | n/a | 0.034 | 8.675 | 0.296 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002201 | 27.797 | 3.538 | 0.343 | 0.000 | 0.051 | 1.285 | 8.529 | 0.019 | n/a | 0.244 | 13.769 | n/a | n/a | 0.020 | 3.931 | 0.141 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000220f | 25.295 | 4.484 | 0.214 | 0.000 | 0.066 | 1.529 | 5.028 | 0.032 | n/a | 0.087 | 13.838 | n/a | n/a | 0.018 | 4.763 | 0.188 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002223 | 22.451 | 3.539 | 0.287 | 0.000 | 0.167 | 1.293 | 9.444 | 0.033 | n/a | 0.093 | 7.560 | n/a | n/a | 0.036 | 3.992 | 0.178 | 0.036 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002221 | 22.040 | 4.307 | 0.191 | 0.000 | 0.057 | 1.766 | 7.019 | 0.031 | n/a | 0.083 | 8.566 | n/a | n/a | 0.019 | 4.555 | 0.207 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022b0 | 21.707 | 3.338 | 0.213 | 0.000 | 0.069 | 1.320 | 6.311 | 0.023 | n/a | 0.055 | 10.353 | n/a | n/a | 0.024 | 3.620 | 0.167 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002227 | 21.659 | 2.703 | 0.159 | 0.000 | 0.045 | 0.666 | 5.075 | 0.015 | n/a | 0.053 | 12.928 | n/a | n/a | 0.014 | 2.906 | 0.134 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000220b | 20.739 | 2.946 | 0.187 | 0.000 | 0.053 | 0.888 | 6.699 | 0.019 | n/a | 0.066 | 9.864 | n/a | n/a | 0.016 | 3.187 | 0.154 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002231 | 19.739 | 3.612 | 0.318 | 0.000 | 0.065 | 1.000 | 1.795 | 0.028 | n/a | 0.082 | 12.820 | n/a | n/a | 0.019 | 3.995 | 0.202 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002207 | 19.646 | 3.397 | 0.236 | 0.000 | 0.054 | 1.461 | 4.094 | 0.032 | n/a | 0.088 | 10.262 | n/a | n/a | 0.020 | 3.688 | 0.188 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000224d | 19.322 | 4.416 | 0.332 | 0.000 | 0.042 | 1.351 | 4.432 | 0.020 | n/a | 0.057 | 8.657 | n/a | n/a | 0.015 | 4.791 | 0.248 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002268 | 19.271 | 3.103 | 0.267 | 0.000 | 0.100 | 0.939 | 4.518 | 0.020 | n/a | 0.317 | 9.981 | n/a | n/a | 0.027 | 3.469 | 0.180 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002229 | 19.219 | 3.774 | 0.253 | 0.000 | 0.046 | 1.720 | 5.598 | 0.033 | n/a | 0.081 | 7.698 | n/a | n/a | 0.017 | 4.073 | 0.212 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000229e | 19.114 | 3.873 | 0.219 | 0.000 | 0.030 | 1.153 | 2.730 | 0.015 | n/a | 0.066 | 11.016 | n/a | n/a | 0.011 | 4.122 | 0.216 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002278 | 18.720 | 3.082 | 0.260 | 0.000 | 0.053 | 0.761 | 4.139 | 0.016 | n/a | 0.051 | 10.339 | n/a | n/a | 0.019 | 3.396 | 0.181 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002280 | 18.351 | 3.426 | 0.249 | 0.000 | 0.098 | 1.304 | 1.186 | 0.017 | n/a | 0.039 | 12.007 | n/a | n/a | 0.025 | 3.772 | 0.206 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.170 | 0.000 | 0.000 | 0.438 | 2.179 | n/a | 0.000 | 0.043 | 0.547 | 0.849 | 0.016 | n/a | 0.094 | 5.306 | n/a | n/a | 0.019 | 2.242 | 0.230 | 0.019 |
| p99 | 14.869 | 1.723 | 0.050 | 1.228 | 4.803 | n/a | 0.000 | 0.943 | 4.246 | 3.324 | 0.038 | n/a | 1.330 | 10.452 | n/a | n/a | 0.035 | 4.869 | 0.421 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002234 | 14.869 | 2.883 | n/a | 0.000 | 0.060 | 0.568 | 0.812 | 0.013 | n/a | 0.055 | 10.452 | n/a | n/a | 0.025 | 2.943 | 0.198 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002290 | 13.579 | 4.803 | n/a | 0.000 | 0.066 | 1.201 | 1.970 | 0.037 | n/a | 0.143 | 5.333 | n/a | n/a | 0.025 | 4.869 | 0.359 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002208 | 13.048 | 1.939 | n/a | 0.000 | 0.045 | 0.661 | 1.522 | 0.025 | n/a | 0.634 | 8.206 | n/a | n/a | 0.015 | 1.984 | 0.152 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000222e | 12.993 | 2.929 | n/a | 0.000 | 0.038 | 1.022 | 1.965 | 0.038 | n/a | 0.094 | 6.888 | n/a | n/a | 0.018 | 2.968 | 0.228 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002266 | 12.519 | 2.657 | n/a | 0.000 | 0.031 | 4.246 | 0.714 | 0.013 | n/a | 0.032 | 4.811 | n/a | n/a | 0.013 | 2.688 | 0.215 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000229c | 12.211 | 2.822 | n/a | 0.000 | 0.038 | 1.152 | 2.211 | 0.037 | n/a | 0.144 | 5.787 | n/a | n/a | 0.020 | 2.860 | 0.234 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002210 | 12.175 | 2.493 | n/a | 0.000 | 0.039 | 0.532 | 0.867 | 0.017 | n/a | 0.040 | 8.168 | n/a | n/a | 0.019 | 2.532 | 0.208 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000224f | 11.991 | 1.942 | n/a | 0.000 | 0.029 | 0.503 | 0.754 | 0.015 | n/a | 0.046 | 8.677 | n/a | n/a | 0.025 | 1.971 | 0.164 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000226a | 11.885 | 2.644 | n/a | 0.000 | 0.048 | 0.586 | 1.407 | 0.018 | n/a | 0.334 | 6.828 | n/a | n/a | 0.021 | 2.692 | 0.227 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000223a | 11.792 | 2.525 | n/a | 0.000 | 0.057 | 0.526 | 0.796 | 0.013 | n/a | 1.330 | 6.521 | n/a | n/a | 0.023 | 2.582 | 0.219 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000223e | 11.580 | 2.306 | n/a | 0.000 | 0.088 | 0.447 | 0.814 | 0.016 | n/a | 0.073 | 7.804 | n/a | n/a | 0.030 | 2.395 | 0.207 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000220c | 11.411 | 1.724 | n/a | 0.000 | 0.943 | 0.677 | 1.284 | 0.020 | n/a | 0.340 | 6.412 | n/a | n/a | 0.011 | 2.667 | 0.234 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000226d | 10.860 | 1.813 | n/a | 0.000 | 0.050 | 0.412 | 0.896 | 0.015 | n/a | 0.288 | 7.367 | n/a | n/a | 0.019 | 1.863 | 0.172 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.416ms |
| a503e751587f37aa000000000000224e | 10.331 | 4.119 | n/a | 0.000 | 0.041 | 1.389 | 3.324 | 0.023 | n/a | 0.228 | 1.192 | n/a | n/a | 0.014 | 4.160 | 0.403 | 0.014 | node-14/thread-0/driver.execute | none observed |
| a503e751587f37aa0000000000002264 | 10.182 | 2.862 | n/a | 0.000 | 0.082 | 0.671 | 1.023 | 0.019 | n/a | 0.066 | 5.424 | n/a | n/a | 0.035 | 2.943 | 0.289 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002298 | 10.170 | 1.926 | n/a | 0.000 | 0.052 | 0.641 | 1.353 | 0.025 | n/a | 0.834 | 5.317 | n/a | n/a | 0.021 | 1.978 | 0.195 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022ac | 9.963 | 2.115 | n/a | 0.000 | 0.036 | 0.727 | 1.685 | 0.028 | n/a | 0.110 | 5.241 | n/a | n/a | 0.021 | 2.150 | 0.216 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.156ms |
| a503e751587f37aa000000000000228a | 9.556 | 2.852 | n/a | 0.000 | 0.043 | 0.703 | 1.088 | 0.023 | n/a | 0.080 | 4.746 | n/a | n/a | 0.022 | 2.895 | 0.303 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002213 | 9.219 | 2.179 | n/a | 0.000 | 0.043 | 0.655 | 0.849 | 0.018 | n/a | 0.344 | 5.111 | n/a | n/a | 0.021 | 2.223 | 0.241 | 0.021 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002261 | 9.082 | 1.656 | n/a | 0.000 | 0.023 | 0.438 | 1.394 | 0.023 | n/a | 0.365 | 5.172 | n/a | n/a | 0.011 | 1.678 | 0.185 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 292.870 | 0.000 | 0.000 | 0.377 | 2.646 | n/a | 0.000 | 0.053 | 12.292 | 1.317 | 0.016 | n/a | 0.108 | 152.451 | n/a | n/a | 0.019 | 3.233 | 0.015 | 0.019 |
| p99 | 689.070 | 1.005 | 0.000 | 0.691 | 8.089 | n/a | 0.000 | 95.704 | 189.681 | 6.951 | 0.040 | n/a | 0.508 | 587.791 | n/a | n/a | 0.044 | 195.688 | 0.888 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000022be | 689.070 | 3.169 | n/a | 0.000 | 0.065 | 96.823 | 0.889 | 0.014 | n/a | 0.276 | 587.791 | n/a | n/a | 0.044 | 3.233 | 0.005 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.372ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000022bf | 654.044 | 2.319 | n/a | 0.000 | 0.041 | 98.114 | 1.317 | 0.025 | n/a | 0.501 | 551.710 | n/a | n/a | 0.019 | 2.359 | 0.004 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.372ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000022c0 | 545.843 | 1.574 | n/a | 0.000 | 2.970 | 100.140 | 0.635 | 0.012 | n/a | 0.032 | 440.468 | n/a | n/a | 0.010 | 4.545 | 0.008 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.372ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000022c1 | 459.829 | 8.089 | 87.494 | 0.000 | 0.041 | 1.754 | 2.275 | 0.034 | n/a | 0.508 | 359.619 | n/a | n/a | 0.015 | 95.624 | 0.208 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.372ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000022d0 | 388.020 | 2.994 | n/a | 0.000 | 0.079 | 189.681 | 0.834 | 0.014 | n/a | 0.216 | 194.172 | n/a | n/a | 0.030 | 3.073 | 0.008 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.384ms; driver.reader-basis.broadcast 0.380ms; driver.reader-basis.broadcast 0.374ms; driver.publication.persist-deferred 0.042ms |
| a503e751587f37aa00000000000022d1 | 354.938 | 5.389 | 190.248 | 0.000 | 0.050 | 1.211 | 5.383 | 0.024 | n/a | 0.162 | 152.451 | n/a | n/a | 0.019 | 195.688 | 0.551 | 0.019 | node-14/thread-0/rpc.probe.transact | driver.reader-basis.broadcast 0.384ms; driver.reader-basis.broadcast 0.380ms; driver.reader-basis.broadcast 0.374ms; driver.publication.readback 0.172ms; driver.publication.persist-deferred 0.042ms |
| a503e751587f37aa00000000000022d7 | 328.807 | 1.433 | n/a | 0.000 | 0.038 | 88.758 | 1.174 | 0.025 | n/a | 0.341 | 237.023 | n/a | n/a | 0.016 | 1.471 | 0.004 | 0.016 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.389ms; driver.reader-basis.broadcast 0.377ms; driver.reader-basis.broadcast 0.355ms; driver.publication.persist-deferred 0.036ms |
| a503e751587f37aa00000000000022d8 | 292.870 | 4.260 | 87.216 | 0.000 | 0.053 | 1.802 | 6.951 | 0.023 | n/a | 0.064 | 192.479 | n/a | n/a | 0.021 | 91.530 | 0.313 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.389ms; driver.reader-basis.broadcast 0.377ms; driver.reader-basis.broadcast 0.355ms; driver.publication.readback 0.072ms; driver.publication.persist-deferred 0.036ms |
| a503e751587f37aa00000000000022c2 | 198.310 | 1.768 | n/a | 0.000 | 0.447 | 99.464 | 0.679 | 0.013 | n/a | 0.280 | 95.635 | n/a | n/a | 0.026 | 2.214 | 0.011 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.385ms; driver.publication.persist-deferred 0.052ms |
| a503e751587f37aa00000000000022d9 | 181.300 | 2.646 | n/a | 0.000 | 0.044 | 88.669 | 1.641 | 0.023 | n/a | 0.089 | 88.166 | n/a | n/a | 0.021 | 2.690 | 0.015 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.377ms; driver.reader-basis.broadcast 0.355ms; driver.publication.persist-deferred 0.036ms |
| a503e751587f37aa00000000000022d4 | 110.455 | 2.329 | n/a | 0.000 | 95.704 | 0.389 | 5.248 | 0.014 | n/a | 0.042 | 6.718 | n/a | n/a | 0.012 | 98.032 | 0.888 | 0.012 | node-14/thread-0/driver.queue.scheduler-late | client.encode 22.014ms; driver.reader-basis.broadcast 0.349ms |
| a503e751587f37aa00000000000022ce | 29.642 | 4.644 | 0.271 | 0.000 | 0.022 | 12.292 | 4.055 | 0.040 | n/a | 0.108 | 8.197 | n/a | n/a | 0.013 | 4.937 | 0.167 | 0.013 | node-14/thread-6/socket.wait-first-byte | driver.reader-basis.broadcast 23.444ms |
| a503e751587f37aa00000000000022b9 | 25.371 | 3.160 | 0.228 | 0.000 | 0.078 | 3.743 | 2.355 | 0.016 | n/a | 0.045 | 15.722 | n/a | n/a | 0.023 | 3.467 | 0.137 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022ba | 9.393 | 2.336 | n/a | 0.000 | 0.065 | 0.595 | 0.600 | 0.013 | n/a | 0.081 | 5.676 | n/a | n/a | 0.027 | 2.401 | 0.256 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 328.807 | 0.000 | 0.000 | 0.368 | 1.768 | n/a | 0.000 | 0.065 | 96.823 | 0.679 | 0.013 | n/a | 0.216 | 194.172 | n/a | n/a | 0.026 | 2.401 | 0.008 | 0.026 |
| p99 | 689.070 | 0.000 | 0.000 | 0.691 | 3.169 | n/a | 0.000 | 2.970 | 189.681 | 1.174 | 0.025 | n/a | 0.341 | 587.791 | n/a | n/a | 0.044 | 4.545 | 0.256 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000022be | 689.070 | 3.169 | n/a | 0.000 | 0.065 | 96.823 | 0.889 | 0.014 | n/a | 0.276 | 587.791 | n/a | n/a | 0.044 | 3.233 | 0.005 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.372ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000022c0 | 545.843 | 1.574 | n/a | 0.000 | 2.970 | 100.140 | 0.635 | 0.012 | n/a | 0.032 | 440.468 | n/a | n/a | 0.010 | 4.545 | 0.008 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.372ms; driver.reader-basis.broadcast 0.372ms |
| a503e751587f37aa00000000000022d0 | 388.020 | 2.994 | n/a | 0.000 | 0.079 | 189.681 | 0.834 | 0.014 | n/a | 0.216 | 194.172 | n/a | n/a | 0.030 | 3.073 | 0.008 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.384ms; driver.reader-basis.broadcast 0.380ms; driver.reader-basis.broadcast 0.374ms; driver.publication.persist-deferred 0.042ms |
| a503e751587f37aa00000000000022d7 | 328.807 | 1.433 | n/a | 0.000 | 0.038 | 88.758 | 1.174 | 0.025 | n/a | 0.341 | 237.023 | n/a | n/a | 0.016 | 1.471 | 0.004 | 0.016 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.389ms; driver.reader-basis.broadcast 0.377ms; driver.reader-basis.broadcast 0.355ms; driver.publication.persist-deferred 0.036ms |
| a503e751587f37aa00000000000022c2 | 198.310 | 1.768 | n/a | 0.000 | 0.447 | 99.464 | 0.679 | 0.013 | n/a | 0.280 | 95.635 | n/a | n/a | 0.026 | 2.214 | 0.011 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.908ms; driver.reader-basis.broadcast 0.385ms; driver.publication.persist-deferred 0.052ms |
| a503e751587f37aa00000000000022ba | 9.393 | 2.336 | n/a | 0.000 | 0.065 | 0.595 | 0.600 | 0.013 | n/a | 0.081 | 5.676 | n/a | n/a | 0.027 | 2.401 | 0.256 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.208 | 0.000 | 0.000 | 0.433 | 3.294 | n/a | 0.000 | 0.052 | 0.813 | 1.657 | 0.020 | n/a | 0.075 | 6.387 | n/a | n/a | 0.020 | 3.505 | 0.259 | 0.020 |
| p99 | 22.298 | 2.004 | 0.000 | 1.672 | 5.202 | n/a | 0.311 | 2.386 | 2.192 | 8.633 | 0.050 | n/a | 0.523 | 12.401 | n/a | n/a | 0.060 | 5.501 | 0.458 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa000000000000234c | 23.669 | 5.026 | 0.294 | 0.000 | 0.181 | 2.192 | 5.528 | 0.038 | n/a | 0.091 | 10.281 | n/a | n/a | 0.039 | 5.501 | 0.232 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.606ms |
| a503e751587f37aa0000000000002356 | 22.298 | 3.857 | 0.207 | 0.000 | 0.066 | 1.370 | 6.576 | 0.041 | n/a | 0.127 | 10.032 | n/a | n/a | 0.021 | 4.130 | 0.185 | 0.021 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.198ms |
| a503e751587f37aa000000000000236e | 21.998 | 4.138 | 0.335 | 0.000 | 0.165 | 1.019 | 1.925 | 0.037 | n/a | 0.088 | 14.251 | n/a | n/a | 0.039 | 4.639 | 0.211 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.485ms |
| a503e751587f37aa00000000000022e5 | 21.733 | 3.269 | 0.174 | 0.000 | 0.045 | 1.106 | 8.633 | 0.040 | n/a | 0.086 | 8.366 | n/a | n/a | 0.013 | 3.488 | 0.160 | 0.013 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000233c | 21.372 | 3.673 | 0.386 | 0.000 | 0.059 | 1.595 | 6.143 | 0.026 | n/a | 0.078 | 9.392 | n/a | n/a | 0.020 | 4.118 | 0.193 | 0.020 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.426ms |
| a503e751587f37aa000000000000238d | 21.071 | 4.015 | 0.217 | 0.000 | 0.053 | 1.222 | 3.389 | 0.050 | n/a | 0.609 | 11.498 | n/a | n/a | 0.018 | 4.285 | 0.203 | 0.018 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.557ms |
| a503e751587f37aa000000000000236a | 20.562 | 3.640 | 0.339 | 0.000 | 0.163 | 1.179 | 2.553 | 0.044 | n/a | 0.205 | 12.401 | n/a | n/a | 0.037 | 4.142 | 0.201 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.402ms |
| a503e751587f37aa0000000000002368 | 19.781 | 2.980 | 0.207 | 0.000 | 0.077 | 1.359 | 8.180 | 0.052 | n/a | 0.108 | 6.796 | n/a | n/a | 0.022 | 3.264 | 0.165 | 0.022 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.488ms |
| a503e751587f37aa0000000000002308 | 19.675 | 2.258 | n/a | 0.000 | 0.041 | 0.796 | 11.175 | 0.012 | n/a | 0.038 | 5.328 | n/a | n/a | 0.027 | 2.299 | 0.117 | 0.027 | gw-w/thread-71/gateway.route | none observed |
| a503e751587f37aa0000000000002379 | 19.239 | 3.376 | 0.201 | 0.000 | 0.063 | 1.189 | 3.305 | 0.048 | n/a | 0.134 | 10.902 | n/a | n/a | 0.021 | 3.640 | 0.189 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.338ms |
| a503e751587f37aa000000000000234e | 19.189 | 3.542 | 0.274 | 0.000 | 0.043 | 1.161 | 6.279 | 0.020 | n/a | 0.060 | 7.792 | n/a | n/a | 0.016 | 3.860 | 0.201 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.226ms |
| a503e751587f37aa0000000000002340 | 18.990 | 3.729 | 0.271 | 0.000 | 0.059 | 1.109 | 3.921 | 0.025 | n/a | 0.123 | 9.732 | n/a | n/a | 0.020 | 4.059 | 0.214 | 0.020 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.506ms |
| a503e751587f37aa00000000000022f7 | 18.763 | 3.321 | 0.239 | 0.000 | 0.087 | 1.257 | 6.604 | 0.033 | n/a | 0.069 | 7.128 | n/a | n/a | 0.023 | 3.648 | 0.194 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002373 | 18.115 | 4.842 | 0.290 | 0.000 | 0.046 | 1.569 | 2.004 | 0.026 | n/a | 0.070 | 9.246 | n/a | n/a | 0.021 | 5.178 | 0.286 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.502ms |
| a503e751587f37aa0000000000002323 | 18.020 | 3.404 | 0.177 | 0.000 | 0.048 | 1.418 | 6.051 | 0.048 | n/a | 0.071 | 6.789 | n/a | n/a | 0.014 | 3.629 | 0.201 | 0.014 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000235e | 17.951 | 5.019 | 0.268 | 0.000 | 0.033 | 1.222 | 2.522 | 0.019 | n/a | 0.214 | 8.635 | n/a | n/a | 0.020 | 5.321 | 0.296 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.433ms |
| a503e751587f37aa0000000000002303 | 17.781 | 3.014 | 0.203 | 0.362 | 0.021 | 1.021 | 6.441 | 0.024 | n/a | 0.295 | 6.387 | n/a | n/a | 0.013 | 3.600 | 0.202 | 0.013 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002375 | 17.696 | 3.176 | 0.195 | 0.000 | 0.068 | 1.124 | 6.897 | 0.021 | n/a | 0.079 | 6.109 | n/a | n/a | 0.027 | 3.439 | 0.194 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.475ms |
| a503e751587f37aa00000000000022f3 | 17.634 | 5.202 | n/a | 0.000 | 0.089 | 0.758 | 0.819 | 0.013 | n/a | 0.267 | 10.448 | n/a | n/a | 0.038 | 5.291 | 0.300 | 0.038 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002332 | 17.436 | 4.194 | 0.300 | 0.000 | 0.052 | 1.619 | 2.950 | 0.019 | n/a | 0.301 | 7.985 | n/a | n/a | 0.015 | 4.546 | 0.261 | 0.015 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.487ms |

## P4 / p4h3 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.335 | 0.443 | 0.000 | 0.425 | 2.125 | n/a | 0.000 | 0.048 | 0.627 | 0.933 | 0.017 | n/a | 0.067 | 5.424 | n/a | n/a | 0.020 | 2.189 | 0.229 | 0.020 |
| p99 | 19.675 | 2.705 | 0.000 | 0.826 | 5.202 | n/a | 0.000 | 2.387 | 1.108 | 11.175 | 0.042 | n/a | 0.523 | 10.448 | n/a | n/a | 0.060 | 5.291 | 0.458 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002308 | 19.675 | 2.258 | n/a | 0.000 | 0.041 | 0.796 | 11.175 | 0.012 | n/a | 0.038 | 5.328 | n/a | n/a | 0.027 | 2.299 | 0.117 | 0.027 | gw-w/thread-71/gateway.route | none observed |
| a503e751587f37aa00000000000022f3 | 17.634 | 5.202 | n/a | 0.000 | 0.089 | 0.758 | 0.819 | 0.013 | n/a | 0.267 | 10.448 | n/a | n/a | 0.038 | 5.291 | 0.300 | 0.038 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022f0 | 17.224 | 1.697 | n/a | 0.000 | 0.036 | 0.410 | 4.598 | 0.014 | n/a | 0.361 | 10.093 | n/a | n/a | 0.015 | 1.734 | 0.101 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.378ms |
| a503e751587f37aa00000000000022e9 | 15.170 | 3.343 | n/a | 0.000 | 0.130 | 0.813 | 1.966 | 0.042 | n/a | 0.523 | 8.311 | n/a | n/a | 0.043 | 3.473 | 0.229 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002333 | 13.661 | 2.178 | n/a | 0.000 | 0.064 | 0.618 | 1.439 | 0.022 | n/a | 0.305 | 9.006 | n/a | n/a | 0.030 | 2.242 | 0.164 | 0.030 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002330 | 13.208 | 4.109 | n/a | 0.000 | 0.047 | 1.016 | 1.171 | 0.021 | n/a | 0.441 | 6.377 | n/a | n/a | 0.027 | 4.156 | 0.315 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002396 | 13.156 | 3.431 | n/a | 0.000 | 0.051 | 1.072 | 5.719 | 0.031 | n/a | 0.085 | 2.749 | n/a | n/a | 0.018 | 3.482 | 0.265 | 0.018 | gw-w/thread-66/gateway.admitted-work | none observed |
| a503e751587f37aa0000000000002371 | 13.036 | 2.161 | n/a | 0.000 | 2.387 | 0.622 | 1.171 | 0.024 | n/a | 0.061 | 6.582 | n/a | n/a | 0.028 | 4.548 | 0.349 | 0.028 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000230b | 12.999 | 2.119 | n/a | 0.000 | 0.048 | 0.810 | 1.469 | 0.024 | n/a | 0.101 | 8.409 | n/a | n/a | 0.019 | 2.167 | 0.167 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.208ms |
| a503e751587f37aa0000000000002376 | 12.919 | 3.118 | n/a | 0.000 | 0.042 | 0.966 | 1.203 | 0.016 | n/a | 0.241 | 7.312 | n/a | n/a | 0.021 | 3.160 | 0.245 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.999ms |
| a503e751587f37aa000000000000232d | 12.664 | 3.709 | n/a | 0.000 | 0.038 | 1.108 | 4.730 | 0.023 | n/a | 0.052 | 2.986 | n/a | n/a | 0.017 | 3.748 | 0.296 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002391 | 12.396 | 3.932 | n/a | 0.000 | 0.053 | 0.801 | 1.187 | 0.024 | n/a | 0.067 | 6.309 | n/a | n/a | 0.024 | 3.985 | 0.321 | 0.024 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002301 | 11.622 | 1.723 | n/a | 0.000 | 0.048 | 0.494 | 1.355 | 0.023 | n/a | 0.522 | 7.437 | n/a | n/a | 0.020 | 1.771 | 0.152 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.406ms |
| a503e751587f37aa000000000000237d | 11.072 | 2.682 | n/a | 0.000 | 2.386 | 0.753 | 0.883 | 0.017 | n/a | 0.095 | 4.230 | n/a | n/a | 0.026 | 5.069 | 0.458 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002339 | 10.843 | 2.581 | n/a | 0.000 | 2.221 | 0.460 | 0.870 | 0.015 | n/a | 0.047 | 4.634 | n/a | n/a | 0.015 | 4.801 | 0.443 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023a1 | 10.739 | 2.029 | n/a | 0.000 | 0.064 | 0.636 | 1.104 | 0.017 | n/a | 0.062 | 6.802 | n/a | n/a | 0.025 | 2.093 | 0.195 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000236b | 10.521 | 1.654 | n/a | 0.000 | 0.037 | 0.438 | 0.809 | 0.013 | n/a | 0.050 | 7.503 | n/a | n/a | 0.016 | 1.691 | 0.161 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022eb | 10.335 | 2.615 | n/a | 0.000 | 0.095 | 0.902 | 0.774 | 0.014 | n/a | 0.066 | 5.836 | n/a | n/a | 0.033 | 2.709 | 0.262 | 0.033 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002327 | 10.189 | 2.125 | n/a | 0.000 | 0.064 | 0.765 | 1.148 | 0.023 | n/a | 0.292 | 5.749 | n/a | n/a | 0.023 | 2.189 | 0.215 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000022fd | 9.770 | 1.402 | n/a | 0.000 | 0.025 | 0.377 | 0.731 | 0.013 | n/a | 0.048 | 7.158 | n/a | n/a | 0.015 | 1.427 | 0.146 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 115.382 | 0.413 | 0.000 | 0.564 | 3.002 | n/a | 0.000 | 0.048 | 2.436 | 1.298 | 0.022 | n/a | 0.206 | 13.543 | n/a | n/a | 0.018 | 4.134 | 0.223 | 0.018 |
| p99 | 321.601 | 2.000 | 0.201 | 2.069 | 6.906 | n/a | 0.000 | 92.602 | 117.861 | 10.235 | 0.039 | n/a | 2.502 | 234.932 | n/a | n/a | 0.174 | 102.747 | 0.885 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000023d8 | 321.601 | 3.032 | 81.583 | 0.000 | 0.033 | 0.902 | 1.042 | 0.016 | n/a | 0.048 | 234.932 | n/a | n/a | 0.013 | 84.647 | 0.263 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.986ms; driver.reader-basis.broadcast 0.408ms; driver.reader-basis.broadcast 0.337ms; driver.publication.persist-deferred 0.029ms |
| a503e751587f37aa00000000000023b5 | 290.545 | 3.502 | 83.567 | 0.000 | 0.081 | 1.107 | 2.396 | 0.037 | n/a | 0.172 | 199.660 | n/a | n/a | 0.023 | 87.150 | 0.300 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.930ms; driver.reader-basis.broadcast 0.391ms; driver.reader-basis.broadcast 0.335ms; driver.publication.readback 0.182ms; driver.publication.readback 0.020ms |
| a503e751587f37aa00000000000023c8 | 273.464 | 3.798 | n/a | 0.000 | 0.064 | 101.473 | 1.638 | 0.027 | n/a | 0.083 | 166.354 | n/a | n/a | 0.026 | 3.862 | 0.014 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.943ms; driver.reader-basis.broadcast 0.581ms; driver.reader-basis.broadcast 0.389ms; driver.publication.persist-deferred 0.046ms |
| a503e751587f37aa00000000000023cd | 259.625 | 2.756 | n/a | 0.000 | 0.034 | 97.790 | 1.519 | 0.020 | n/a | 0.478 | 157.012 | n/a | n/a | 0.017 | 2.790 | 0.011 | 0.017 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.356ms; driver.reader-basis.broadcast 0.278ms; driver.publication.persist-deferred 0.029ms |
| a503e751587f37aa00000000000023e6 | 237.774 | 1.714 | n/a | 0.000 | 0.044 | 77.155 | 1.115 | 0.019 | n/a | 0.407 | 157.295 | n/a | n/a | 0.026 | 1.758 | 0.007 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.923ms; driver.reader-basis.broadcast 0.373ms; driver.publication.persist-deferred 0.025ms |
| a503e751587f37aa00000000000023dd | 178.119 | 1.422 | n/a | 0.000 | 0.050 | 87.566 | 0.991 | 0.022 | n/a | 0.339 | 87.711 | n/a | n/a | 0.018 | 1.473 | 0.008 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.360ms; driver.reader-basis.broadcast 0.322ms; driver.publication.persist-deferred 0.025ms |
| a503e751587f37aa00000000000023e3 | 172.832 | 3.091 | 99.594 | 0.000 | 0.062 | 0.880 | 1.113 | 0.018 | n/a | 0.206 | 67.849 | n/a | n/a | 0.019 | 102.747 | 0.594 | 0.019 | node-14/thread-0/rpc.probe.transact | driver.reader-basis.broadcast 0.391ms; driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.031ms |
| a503e751587f37aa00000000000023d1 | 136.882 | 6.779 | 86.688 | 0.000 | 0.037 | 7.110 | 7.312 | 0.028 | n/a | 0.061 | 28.853 | n/a | n/a | 0.015 | 93.503 | 0.683 | 0.015 | node-14/thread-0/rpc.probe.transact | driver.reader-basis.broadcast 0.363ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.048ms |
| a503e751587f37aa00000000000023bb | 128.257 | 2.625 | n/a | 0.000 | 1.509 | 117.861 | 1.157 | 0.014 | n/a | 0.325 | 4.754 | n/a | n/a | 0.013 | 4.134 | 0.032 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.encode 19.866ms; driver.reader-basis.broadcast 0.374ms; driver.publication.readback 0.088ms |
| a503e751587f37aa00000000000023d5 | 118.117 | 3.203 | 0.235 | 0.000 | 0.048 | 18.218 | 5.403 | 0.039 | n/a | 0.065 | 90.889 | n/a | n/a | 0.019 | 3.485 | 0.030 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.400ms |
| a503e751587f37aa00000000000023b6 | 115.382 | 2.377 | n/a | 0.000 | 0.044 | 81.626 | 4.431 | 0.029 | n/a | 0.062 | 26.794 | n/a | n/a | 0.019 | 2.421 | 0.021 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| a503e751587f37aa00000000000023c6 | 112.589 | 2.495 | n/a | 0.000 | 92.602 | 2.436 | 1.298 | 0.023 | n/a | 0.170 | 13.543 | n/a | n/a | 0.022 | 95.096 | 0.845 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | client.encode 22.087ms; driver.reader-basis.broadcast 0.395ms |
| a503e751587f37aa00000000000023bf | 94.171 | 2.091 | n/a | 0.000 | 81.291 | 0.683 | 1.437 | 0.029 | n/a | 0.458 | 8.010 | n/a | n/a | 0.174 | 83.381 | 0.885 | 0.174 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.376ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.031ms |
| a503e751587f37aa00000000000023cc | 25.539 | 3.347 | 0.296 | 0.000 | 0.027 | 0.821 | 10.235 | 0.024 | n/a | 2.502 | 8.274 | n/a | n/a | 0.013 | 3.670 | 0.144 | 0.013 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023c2 | 23.752 | 6.906 | 6.962 | 0.000 | 0.023 | 1.390 | 2.152 | 0.033 | n/a | 0.110 | 6.164 | n/a | n/a | 0.011 | 13.891 | 0.585 | 0.011 | node-14/thread-0/rpc.probe.transact | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.021ms |
| a503e751587f37aa00000000000023b1 | 22.001 | 6.110 | 8.726 | 0.000 | 0.037 | 0.714 | 0.984 | 0.021 | n/a | 0.438 | 4.952 | n/a | n/a | 0.017 | 14.874 | 0.676 | 0.017 | node-14/thread-0/rpc.probe.transact | none observed |
| a503e751587f37aa00000000000023ae | 21.125 | 3.002 | n/a | 0.000 | 0.043 | 3.376 | 1.103 | 0.020 | n/a | 0.052 | 13.511 | n/a | n/a | 0.019 | 3.045 | 0.144 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023b9 | 19.141 | 2.915 | n/a | 0.000 | 5.170 | 5.878 | 0.911 | 0.015 | n/a | 0.316 | 3.911 | n/a | n/a | 0.025 | 8.085 | 0.422 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| a503e751587f37aa00000000000023db | 18.848 | 4.072 | 0.845 | 0.000 | 0.053 | 1.329 | 3.568 | 0.027 | n/a | 0.533 | 8.405 | n/a | n/a | 0.017 | 4.970 | 0.264 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.139ms |
| a503e751587f37aa00000000000023e1 | 10.290 | 2.240 | n/a | 0.000 | 0.054 | 0.424 | 0.713 | 0.012 | n/a | 2.071 | 4.757 | n/a | n/a | 0.018 | 2.294 | 0.223 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 94.171 | 0.000 | 0.000 | 0.358 | 2.091 | n/a | 0.000 | 0.054 | 2.436 | 0.991 | 0.019 | n/a | 0.339 | 8.010 | n/a | n/a | 0.022 | 2.294 | 0.223 | 0.022 |
| p99 | 237.774 | 0.927 | 0.040 | 0.990 | 2.915 | n/a | 0.000 | 92.602 | 87.566 | 1.437 | 0.029 | n/a | 2.071 | 157.295 | n/a | n/a | 0.174 | 95.096 | 0.885 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000023e6 | 237.774 | 1.714 | n/a | 0.000 | 0.044 | 77.155 | 1.115 | 0.019 | n/a | 0.407 | 157.295 | n/a | n/a | 0.026 | 1.758 | 0.007 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.923ms; driver.reader-basis.broadcast 0.373ms; driver.publication.persist-deferred 0.025ms |
| a503e751587f37aa00000000000023dd | 178.119 | 1.422 | n/a | 0.000 | 0.050 | 87.566 | 0.991 | 0.022 | n/a | 0.339 | 87.711 | n/a | n/a | 0.018 | 1.473 | 0.008 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.360ms; driver.reader-basis.broadcast 0.322ms; driver.publication.persist-deferred 0.025ms |
| a503e751587f37aa00000000000023c6 | 112.589 | 2.495 | n/a | 0.000 | 92.602 | 2.436 | 1.298 | 0.023 | n/a | 0.170 | 13.543 | n/a | n/a | 0.022 | 95.096 | 0.845 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | client.encode 22.087ms; driver.reader-basis.broadcast 0.395ms |
| a503e751587f37aa00000000000023bf | 94.171 | 2.091 | n/a | 0.000 | 81.291 | 0.683 | 1.437 | 0.029 | n/a | 0.458 | 8.010 | n/a | n/a | 0.174 | 83.381 | 0.885 | 0.174 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.376ms; driver.publication.readback 0.097ms; driver.publication.persist-deferred 0.031ms |
| a503e751587f37aa00000000000023b9 | 19.141 | 2.915 | n/a | 0.000 | 5.170 | 5.878 | 0.911 | 0.015 | n/a | 0.316 | 3.911 | n/a | n/a | 0.025 | 8.085 | 0.422 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| a503e751587f37aa00000000000023e1 | 10.290 | 2.240 | n/a | 0.000 | 0.054 | 0.424 | 0.713 | 0.012 | n/a | 2.071 | 4.757 | n/a | n/a | 0.018 | 2.294 | 0.223 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (88 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.687 | 0.000 | 0.000 | 0.409 | 3.042 | 0.428 | 0.000 | 0.046 | 0.840 | 1.550 | 0.022 | n/a | 0.085 | 7.248 | n/a | n/a | 0.019 | 3.373 | 0.230 | 0.019 |
| p99 | 41.827 | 1.962 | 0.050 | 0.931 | 6.333 | n/a | 0.000 | 2.637 | 3.192 | 17.647 | 0.098 | n/a | 0.599 | 19.217 | n/a | n/a | 0.083 | 6.660 | 0.424 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002410 | 41.827 | 6.230 | 0.178 | 0.000 | 0.039 | 0.946 | 14.877 | 0.018 | n/a | 0.305 | 19.217 | n/a | n/a | 0.016 | 6.448 | 0.154 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.026ms |
| a503e751587f37aa00000000000023f3 | 37.131 | 3.336 | 0.157 | 0.000 | 0.039 | 1.119 | 17.319 | 0.030 | n/a | 0.055 | 15.060 | n/a | n/a | 0.016 | 3.531 | 0.095 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.410ms |
| a503e751587f37aa00000000000023f7 | 33.959 | 3.291 | 0.251 | 0.000 | 0.145 | 1.199 | 17.647 | 0.026 | n/a | 0.386 | 10.973 | n/a | n/a | 0.042 | 3.686 | 0.109 | 0.042 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.273ms |
| a503e751587f37aa000000000000243c | 25.375 | 3.042 | 3.530 | 0.000 | 0.036 | 1.007 | 9.659 | 0.024 | n/a | 0.269 | 7.781 | n/a | n/a | 0.028 | 6.608 | 0.260 | 0.028 | gw-w/thread-71/gateway.admitted-work | driver.reader-basis.broadcast 0.688ms |
| a503e751587f37aa0000000000002455 | 23.651 | 2.376 | n/a | 0.000 | 0.050 | 0.957 | 2.016 | 0.040 | n/a | 0.195 | 17.989 | n/a | n/a | 0.029 | 2.426 | 0.103 | 0.029 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002488 | 23.070 | 3.872 | 0.352 | 0.000 | 0.044 | 1.377 | 7.952 | 0.039 | n/a | 0.075 | 9.342 | n/a | n/a | 0.016 | 4.268 | 0.185 | 0.016 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002418 | 22.104 | 4.376 | 0.344 | 0.000 | 0.047 | 1.279 | 3.731 | 0.023 | n/a | 0.062 | 12.221 | n/a | n/a | 0.020 | 4.768 | 0.216 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.435ms |
| a503e751587f37aa0000000000002493 | 21.497 | 2.391 | n/a | 0.000 | 0.023 | 0.624 | 1.814 | 0.024 | n/a | 0.115 | 16.495 | n/a | n/a | 0.011 | 2.414 | 0.112 | 0.011 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002460 | 20.703 | 4.394 | 0.428 | 0.000 | 0.058 | 1.681 | 5.119 | 0.033 | n/a | 0.077 | 8.892 | n/a | n/a | 0.021 | 4.880 | 0.236 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002438 | 20.674 | 3.680 | 0.308 | 0.000 | 0.153 | 0.740 | 1.468 | 0.098 | n/a | 0.171 | 13.980 | n/a | n/a | 0.077 | 4.141 | 0.200 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.379ms |
| a503e751587f37aa0000000000002442 | 20.374 | 3.049 | 0.249 | 0.000 | 0.083 | 0.982 | 6.135 | 0.036 | n/a | 0.116 | 9.703 | n/a | n/a | 0.022 | 3.380 | 0.166 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000243a | 20.062 | 4.919 | 0.397 | 0.000 | 0.060 | 1.412 | 5.172 | 0.029 | n/a | 0.073 | 7.968 | n/a | n/a | 0.032 | 5.375 | 0.268 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.415ms |
| a503e751587f37aa000000000000240e | 19.963 | 2.819 | 0.157 | 0.000 | 0.033 | 2.038 | 3.923 | 0.024 | n/a | 0.056 | 10.899 | n/a | n/a | 0.013 | 3.009 | 0.151 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.690ms |
| a503e751587f37aa0000000000002484 | 19.817 | 3.991 | 0.380 | 0.000 | 0.055 | 2.035 | 6.289 | 0.027 | n/a | 0.063 | 6.958 | n/a | n/a | 0.019 | 4.427 | 0.223 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000249c | 19.782 | 3.243 | 0.215 | 0.000 | 0.048 | 0.815 | 3.365 | 0.030 | n/a | 0.064 | 11.982 | n/a | n/a | 0.020 | 3.506 | 0.177 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023fd | 19.674 | 1.889 | n/a | 0.000 | 0.045 | 0.887 | 7.964 | 0.039 | n/a | 0.074 | 8.756 | n/a | n/a | 0.019 | 1.934 | 0.098 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.181ms |
| a503e751587f37aa0000000000002444 | 19.493 | 3.251 | 0.211 | 0.000 | 0.057 | 1.147 | 3.506 | 0.028 | n/a | 0.320 | 10.952 | n/a | n/a | 0.019 | 3.520 | 0.181 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002454 | 19.134 | 4.705 | 0.312 | 0.000 | 0.040 | 1.293 | 2.157 | 0.034 | n/a | 0.107 | 10.469 | n/a | n/a | 0.018 | 5.056 | 0.264 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002478 | 18.830 | 4.047 | 0.270 | 0.000 | 0.041 | 1.260 | 3.384 | 0.020 | n/a | 0.506 | 9.289 | n/a | n/a | 0.013 | 4.357 | 0.231 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002404 | 18.621 | 3.530 | 0.281 | 0.000 | 0.152 | 0.856 | 1.836 | 0.028 | n/a | 0.418 | 11.483 | n/a | n/a | 0.037 | 3.963 | 0.213 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.317ms |

## P4 / p4h10 / commit / 5-10 facts (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.124 | 0.000 | 0.000 | 0.418 | 2.202 | n/a | 0.000 | 0.050 | 0.613 | 1.044 | 0.018 | n/a | 0.082 | 5.904 | n/a | n/a | 0.022 | 2.323 | 0.236 | 0.022 |
| p99 | 23.651 | 1.859 | 0.000 | 0.813 | 3.838 | n/a | 0.000 | 2.637 | 1.116 | 7.964 | 0.045 | n/a | 0.563 | 17.989 | n/a | n/a | 0.083 | 5.564 | 0.424 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002455 | 23.651 | 2.376 | n/a | 0.000 | 0.050 | 0.957 | 2.016 | 0.040 | n/a | 0.195 | 17.989 | n/a | n/a | 0.029 | 2.426 | 0.103 | 0.029 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023fd | 19.674 | 1.889 | n/a | 0.000 | 0.045 | 0.887 | 7.964 | 0.039 | n/a | 0.074 | 8.756 | n/a | n/a | 0.019 | 1.934 | 0.098 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.181ms |
| a503e751587f37aa000000000000246f | 15.969 | 2.728 | n/a | 0.000 | 0.114 | 0.613 | 1.396 | 0.022 | n/a | 0.320 | 10.693 | n/a | n/a | 0.083 | 2.843 | 0.178 | 0.083 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002415 | 15.246 | 1.560 | n/a | 0.000 | 0.032 | 0.647 | 1.514 | 0.027 | n/a | 0.098 | 11.351 | n/a | n/a | 0.018 | 1.591 | 0.104 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000248b | 15.141 | 1.865 | n/a | 0.000 | 0.038 | 0.517 | 0.816 | 0.015 | n/a | 0.070 | 11.798 | n/a | n/a | 0.023 | 1.903 | 0.126 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002448 | 14.903 | 3.235 | n/a | 0.000 | 0.082 | 0.665 | 1.174 | 0.022 | n/a | 0.074 | 9.598 | n/a | n/a | 0.053 | 3.316 | 0.223 | 0.053 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002425 | 14.689 | 2.928 | n/a | 0.000 | 2.637 | 0.598 | 0.908 | 0.016 | n/a | 0.063 | 7.517 | n/a | n/a | 0.022 | 5.564 | 0.379 | 0.022 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000243f | 13.310 | 3.220 | n/a | 0.000 | 0.086 | 0.683 | 0.903 | 0.017 | n/a | 0.101 | 8.265 | n/a | n/a | 0.035 | 3.306 | 0.248 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000243d | 12.634 | 2.847 | n/a | 0.000 | 2.486 | 0.453 | 0.861 | 0.013 | n/a | 0.048 | 5.904 | n/a | n/a | 0.022 | 5.333 | 0.422 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.688ms |
| a503e751587f37aa000000000000241f | 12.532 | 2.202 | n/a | 0.000 | 0.029 | 0.649 | 1.493 | 0.024 | n/a | 0.099 | 8.019 | n/a | n/a | 0.017 | 2.231 | 0.178 | 0.017 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002405 | 12.331 | 1.811 | n/a | 0.000 | 0.034 | 0.640 | 1.358 | 0.024 | n/a | 0.563 | 7.881 | n/a | n/a | 0.020 | 1.845 | 0.150 | 0.020 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002461 | 11.923 | 3.838 | n/a | 0.000 | 0.070 | 0.914 | 1.248 | 0.024 | n/a | 0.085 | 5.706 | n/a | n/a | 0.037 | 3.909 | 0.328 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002489 | 11.689 | 1.824 | n/a | 0.000 | 0.044 | 0.435 | 1.033 | 0.045 | n/a | 0.083 | 8.208 | n/a | n/a | 0.017 | 1.868 | 0.160 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000242a | 11.554 | 1.035 | n/a | 0.000 | 0.765 | 1.116 | 0.899 | 0.012 | n/a | 0.018 | 7.705 | n/a | n/a | 0.005 | 1.800 | 0.156 | 0.005 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.087ms; driver.publication.persist-deferred 0.016ms |
| a503e751587f37aa000000000000244f | 11.301 | 2.673 | n/a | 0.000 | 0.099 | 0.600 | 1.296 | 0.018 | n/a | 0.329 | 6.250 | n/a | n/a | 0.037 | 2.771 | 0.245 | 0.037 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000249d | 11.124 | 2.138 | n/a | 0.000 | 2.573 | 0.617 | 1.003 | 0.018 | n/a | 0.063 | 4.690 | n/a | n/a | 0.022 | 4.711 | 0.424 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002407 | 11.106 | 3.571 | n/a | 0.000 | 0.126 | 0.852 | 1.189 | 0.021 | n/a | 0.401 | 4.901 | n/a | n/a | 0.047 | 3.697 | 0.333 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000245d | 10.129 | 3.280 | n/a | 0.000 | 0.095 | 0.715 | 1.044 | 0.016 | n/a | 0.054 | 4.890 | n/a | n/a | 0.035 | 3.375 | 0.333 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000023f4 | 10.037 | 1.395 | n/a | 0.000 | 0.045 | 0.422 | 2.381 | 0.012 | n/a | 0.230 | 5.539 | n/a | n/a | 0.014 | 1.440 | 0.143 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002471 | 10.007 | 1.884 | n/a | 0.000 | 0.036 | 0.738 | 1.502 | 0.026 | n/a | 0.082 | 5.722 | n/a | n/a | 0.017 | 1.920 | 0.192 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.654 | 0.000 | 0.000 | 0.447 | 3.002 | n/a | 0.000 | 0.045 | 0.686 | 1.281 | 0.021 | n/a | 0.065 | 6.026 | n/a | n/a | 0.019 | 3.283 | 0.255 | 0.019 |
| p99 | 29.134 | 2.287 | 0.000 | 2.362 | 6.513 | n/a | 0.000 | 0.209 | 1.246 | 15.802 | 0.054 | n/a | 0.564 | 10.305 | n/a | n/a | 0.064 | 6.591 | 0.488 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa000000000000252d | 40.341 | 2.983 | 0.274 | 0.000 | 0.030 | 1.070 | 27.758 | 0.018 | n/a | 0.042 | 8.156 | n/a | n/a | 0.009 | 3.287 | 0.081 | 0.009 | gw-w/thread-43/gateway.request-parse | none observed |
| a503e751587f37aa0000000000002565 | 29.134 | 2.765 | 0.214 | 0.000 | 0.035 | 1.052 | 15.802 | 0.024 | n/a | 0.076 | 9.151 | n/a | n/a | 0.015 | 3.014 | 0.103 | 0.015 | gw-w/thread-43/gateway.admitted-work | none observed |
| a503e751587f37aa000000000000253a | 21.436 | 4.207 | 0.230 | 0.000 | 0.029 | 2.208 | 6.541 | 0.042 | n/a | 0.086 | 8.081 | n/a | n/a | 0.011 | 4.466 | 0.208 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002540 | 19.386 | 3.188 | 0.194 | 0.000 | 0.041 | 1.246 | 6.904 | 0.039 | n/a | 0.086 | 7.655 | n/a | n/a | 0.034 | 3.423 | 0.177 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024f7 | 18.553 | 2.789 | 0.151 | 0.000 | 0.025 | 0.784 | 5.951 | 0.017 | n/a | 0.272 | 8.555 | n/a | n/a | 0.010 | 2.965 | 0.160 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024f9 | 17.704 | 3.098 | 0.171 | 0.000 | 0.037 | 0.982 | 4.840 | 0.033 | n/a | 0.564 | 7.965 | n/a | n/a | 0.012 | 3.306 | 0.187 | 0.012 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024fc | 17.558 | 6.858 | n/a | 0.000 | 0.071 | 0.871 | 1.984 | 0.024 | n/a | 0.093 | 7.633 | n/a | n/a | 0.024 | 6.929 | 0.395 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002546 | 17.481 | 3.584 | 0.245 | 0.000 | 0.071 | 1.185 | 2.306 | 0.054 | n/a | 0.196 | 9.800 | n/a | n/a | 0.040 | 3.901 | 0.223 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002567 | 17.454 | 3.729 | 0.277 | 0.000 | 0.149 | 0.771 | 3.720 | 0.021 | n/a | 0.085 | 8.657 | n/a | n/a | 0.044 | 4.154 | 0.238 | 0.044 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024d2 | 17.067 | 4.157 | 0.237 | 0.000 | 0.041 | 1.037 | 3.669 | 0.015 | n/a | 0.190 | 7.707 | n/a | n/a | 0.014 | 4.435 | 0.260 | 0.014 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.133ms; driver.publication.persist-deferred 0.030ms |
| a503e751587f37aa00000000000024ae | 16.584 | 3.298 | 0.250 | 0.000 | 0.130 | 1.093 | 6.477 | 0.040 | n/a | 0.064 | 5.183 | n/a | n/a | 0.048 | 3.678 | 0.222 | 0.048 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000255d | 16.323 | 3.339 | 0.267 | 0.000 | 0.139 | 0.934 | 1.343 | 0.023 | n/a | 0.336 | 9.879 | n/a | n/a | 0.064 | 3.745 | 0.229 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024d0 | 16.043 | 3.224 | 0.262 | 0.000 | 0.128 | 1.043 | 3.494 | 0.024 | n/a | 0.043 | 7.788 | n/a | n/a | 0.036 | 3.614 | 0.225 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024dd | 15.879 | 3.688 | n/a | 0.000 | 0.078 | 0.608 | 1.116 | 0.013 | n/a | 0.045 | 10.305 | n/a | n/a | 0.026 | 3.766 | 0.237 | 0.026 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024a2 | 15.710 | 2.860 | 0.231 | 0.000 | 0.035 | 0.593 | 0.962 | 0.016 | n/a | 0.053 | 10.947 | n/a | n/a | 0.013 | 3.126 | 0.199 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024b6 | 15.695 | 3.156 | 0.309 | 0.000 | 0.179 | 0.774 | 3.528 | 0.029 | n/a | 0.065 | 7.604 | n/a | n/a | 0.052 | 3.644 | 0.232 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000253c | 15.423 | 4.401 | 0.356 | 0.000 | 0.049 | 0.861 | 1.166 | 0.021 | n/a | 0.111 | 8.439 | n/a | n/a | 0.019 | 4.805 | 0.312 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024ed | 15.296 | 3.459 | 0.219 | 0.000 | 0.052 | 1.023 | 1.544 | 0.024 | n/a | 0.055 | 8.902 | n/a | n/a | 0.018 | 3.730 | 0.244 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002507 | 15.220 | 3.819 | 0.260 | 0.000 | 0.040 | 1.116 | 1.251 | 0.019 | n/a | 0.052 | 8.646 | n/a | n/a | 0.017 | 4.119 | 0.271 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024f5 | 15.085 | 2.174 | n/a | 0.000 | 0.034 | 0.848 | 5.585 | 0.053 | n/a | 0.078 | 6.297 | n/a | n/a | 0.016 | 2.208 | 0.146 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.769ms |

## P5 / presweep / commit / 5-10 facts (36 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.992 | 0.000 | 0.000 | 0.431 | 1.973 | n/a | 0.000 | 0.042 | 0.582 | 1.033 | 0.020 | n/a | 0.061 | 4.795 | n/a | n/a | 0.019 | 2.009 | 0.226 | 0.019 |
| p99 | 15.085 | 2.287 | 0.000 | 1.159 | 5.059 | n/a | 0.000 | 0.163 | 0.880 | 5.585 | 0.055 | n/a | 0.310 | 9.803 | n/a | n/a | 0.056 | 5.145 | 0.401 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000024f5 | 15.085 | 2.174 | n/a | 0.000 | 0.034 | 0.848 | 5.585 | 0.053 | n/a | 0.078 | 6.297 | n/a | n/a | 0.016 | 2.208 | 0.146 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.769ms |
| a503e751587f37aa00000000000024cd | 14.151 | 2.482 | n/a | 0.000 | 0.053 | 0.798 | 1.528 | 0.027 | n/a | 0.083 | 9.161 | n/a | n/a | 0.019 | 2.535 | 0.179 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000254a | 14.094 | 1.894 | n/a | 0.000 | 0.037 | 0.476 | 1.697 | 0.055 | n/a | 0.117 | 9.803 | n/a | n/a | 0.016 | 1.931 | 0.137 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024bd | 13.519 | 2.859 | n/a | 0.000 | 0.047 | 0.770 | 1.509 | 0.023 | n/a | 0.087 | 8.204 | n/a | n/a | 0.020 | 2.906 | 0.215 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024b9 | 13.065 | 2.413 | n/a | 0.000 | 0.073 | 0.572 | 0.700 | 0.012 | n/a | 0.251 | 9.000 | n/a | n/a | 0.044 | 2.486 | 0.190 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024fe | 13.013 | 2.472 | n/a | 0.000 | 0.068 | 0.873 | 1.325 | 0.025 | n/a | 0.060 | 8.165 | n/a | n/a | 0.024 | 2.541 | 0.195 | 0.024 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000250c | 12.817 | 5.059 | n/a | 0.000 | 0.086 | 0.655 | 0.893 | 0.017 | n/a | 0.056 | 6.002 | n/a | n/a | 0.050 | 5.145 | 0.401 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002518 | 11.442 | 2.013 | n/a | 0.000 | 0.039 | 0.880 | 1.670 | 0.028 | n/a | 0.102 | 6.693 | n/a | n/a | 0.018 | 2.052 | 0.179 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000252a | 11.083 | 1.983 | n/a | 0.000 | 0.055 | 0.682 | 1.097 | 0.025 | n/a | 0.068 | 7.138 | n/a | n/a | 0.035 | 2.038 | 0.184 | 0.035 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002555 | 10.876 | 3.225 | n/a | 0.000 | 0.071 | 0.870 | 3.606 | 0.021 | n/a | 0.063 | 3.001 | n/a | n/a | 0.019 | 3.296 | 0.303 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002568 | 10.717 | 1.888 | n/a | 0.000 | 0.046 | 0.627 | 1.303 | 0.023 | n/a | 0.086 | 6.725 | n/a | n/a | 0.018 | 1.935 | 0.181 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024c9 | 10.375 | 2.626 | n/a | 0.000 | 0.053 | 0.603 | 1.479 | 0.021 | n/a | 0.055 | 5.517 | n/a | n/a | 0.021 | 2.679 | 0.258 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024a3 | 10.231 | 1.953 | n/a | 0.000 | 0.056 | 0.648 | 1.099 | 0.021 | n/a | 0.070 | 6.354 | n/a | n/a | 0.029 | 2.009 | 0.196 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.589ms |
| a503e751587f37aa0000000000002522 | 10.134 | 3.121 | n/a | 0.000 | 0.163 | 0.690 | 1.137 | 0.022 | n/a | 0.310 | 4.635 | n/a | n/a | 0.056 | 3.283 | 0.324 | 0.056 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024b7 | 10.133 | 1.973 | n/a | 0.000 | 0.013 | 0.456 | 0.700 | 0.013 | n/a | 0.036 | 6.931 | n/a | n/a | 0.011 | 1.987 | 0.196 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024a9 | 9.577 | 1.764 | n/a | 0.000 | 0.042 | 0.479 | 1.033 | 0.035 | n/a | 0.057 | 6.145 | n/a | n/a | 0.022 | 1.806 | 0.189 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024e5 | 9.313 | 1.478 | n/a | 0.000 | 0.042 | 0.694 | 0.813 | 0.016 | n/a | 0.225 | 6.026 | n/a | n/a | 0.019 | 1.520 | 0.163 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002563 | 9.185 | 2.391 | n/a | 0.000 | 0.033 | 0.322 | 1.060 | 0.021 | n/a | 0.306 | 5.038 | n/a | n/a | 0.015 | 2.424 | 0.264 | 0.015 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002526 | 8.992 | 2.357 | n/a | 0.000 | 0.100 | 0.453 | 0.783 | 0.015 | n/a | 0.046 | 5.207 | n/a | n/a | 0.032 | 2.458 | 0.273 | 0.032 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000024c3 | 8.782 | 2.638 | n/a | 0.000 | 0.041 | 0.582 | 0.929 | 0.015 | n/a | 0.053 | 4.502 | n/a | n/a | 0.022 | 2.679 | 0.305 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.644 | 0.152 | 0.000 | 0.449 | 3.185 | n/a | 0.000 | 0.050 | 0.760 | 1.291 | 0.020 | n/a | 0.063 | 6.078 | n/a | n/a | 0.030 | 3.603 | 0.277 | 0.030 |
| p99 | 35.622 | 3.542 | 0.031 | 3.312 | 7.456 | n/a | 3.212 | 4.354 | 4.669 | 10.140 | 0.066 | n/a | 0.563 | 25.644 | n/a | n/a | 0.094 | 8.834 | 0.591 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000025f1 | 35.622 | 3.760 | n/a | 0.000 | 0.042 | 4.669 | 1.180 | 0.015 | n/a | 0.285 | 25.644 | n/a | n/a | 0.027 | 3.802 | 0.107 | 0.027 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.495ms |
| a503e751587f37aa00000000000025b2 | 24.683 | 3.651 | 0.213 | 0.000 | 0.040 | 1.248 | 10.140 | 0.031 | n/a | 0.072 | 9.260 | n/a | n/a | 0.029 | 3.904 | 0.158 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002583 | 24.399 | 3.549 | 0.231 | 0.000 | 0.053 | 1.478 | 6.251 | 0.045 | n/a | 0.089 | 12.668 | n/a | n/a | 0.034 | 3.833 | 0.157 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025d2 | 24.076 | 3.922 | 0.375 | 0.000 | 0.128 | 0.890 | 7.308 | 0.066 | n/a | 0.112 | 11.181 | n/a | n/a | 0.094 | 4.425 | 0.184 | 0.094 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002600 | 22.218 | 2.714 | n/a | 0.000 | 0.043 | 0.671 | 0.894 | 0.014 | n/a | 0.042 | 17.811 | n/a | n/a | 0.028 | 2.758 | 0.124 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025ee | 20.756 | 3.546 | 0.163 | 0.000 | 0.040 | 0.898 | 4.475 | 0.017 | n/a | 0.046 | 11.550 | n/a | n/a | 0.022 | 3.749 | 0.181 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000257f | 19.319 | 5.025 | 1.691 | 0.000 | 0.046 | 3.517 | 1.832 | 0.022 | n/a | 0.317 | 6.827 | n/a | n/a | 0.042 | 6.762 | 0.350 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025fa | 19.220 | 6.639 | n/a | 0.000 | 0.046 | 0.765 | 2.625 | 0.026 | n/a | 0.066 | 9.028 | n/a | n/a | 0.024 | 6.685 | 0.348 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025ae | 18.344 | 2.885 | 0.212 | 0.000 | 0.045 | 0.783 | 4.161 | 0.028 | n/a | 0.057 | 10.141 | n/a | n/a | 0.032 | 3.143 | 0.171 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025c2 | 18.304 | 7.456 | 0.183 | 0.000 | 0.040 | 0.769 | 2.171 | 0.016 | n/a | 0.044 | 7.590 | n/a | n/a | 0.035 | 7.679 | 0.420 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002588 | 17.808 | 5.585 | n/a | 3.212 | 0.037 | 0.642 | 1.136 | 0.016 | n/a | 0.048 | 7.100 | n/a | n/a | 0.031 | 8.834 | 0.496 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.202ms |
| a503e751587f37aa00000000000025b0 | 17.664 | 3.959 | 0.362 | 0.000 | 0.161 | 1.368 | 4.724 | 0.027 | n/a | 0.056 | 6.921 | n/a | n/a | 0.087 | 4.482 | 0.254 | 0.087 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002594 | 17.506 | 2.856 | 0.196 | 0.000 | 0.034 | 0.714 | 5.081 | 0.022 | n/a | 0.052 | 8.511 | n/a | n/a | 0.040 | 3.086 | 0.176 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002573 | 16.458 | 2.746 | 0.203 | 0.000 | 0.047 | 1.069 | 5.860 | 0.026 | n/a | 0.053 | 6.436 | n/a | n/a | 0.017 | 2.997 | 0.182 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000260d | 16.457 | 3.346 | 0.253 | 0.000 | 0.055 | 0.990 | 3.719 | 0.029 | n/a | 0.079 | 7.949 | n/a | n/a | 0.036 | 3.655 | 0.222 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025d8 | 16.266 | 6.464 | n/a | 0.000 | 0.136 | 0.851 | 1.099 | 0.021 | n/a | 0.058 | 7.543 | n/a | n/a | 0.094 | 6.599 | 0.406 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025e6 | 16.262 | 2.761 | 0.218 | 0.000 | 0.029 | 0.790 | 3.535 | 0.019 | n/a | 0.057 | 8.835 | n/a | n/a | 0.019 | 3.009 | 0.185 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025be | 16.248 | 3.222 | 0.223 | 0.000 | 0.033 | 0.637 | 3.410 | 0.020 | n/a | 0.069 | 8.611 | n/a | n/a | 0.024 | 3.479 | 0.214 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002618 | 16.072 | 3.957 | n/a | 0.000 | 0.050 | 0.951 | 2.488 | 0.036 | n/a | 0.228 | 8.327 | n/a | n/a | 0.035 | 4.007 | 0.249 | 0.035 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025c3 | 15.965 | 4.684 | n/a | 0.000 | 1.594 | 0.622 | 2.189 | 0.024 | n/a | 0.086 | 6.738 | n/a | n/a | 0.028 | 6.278 | 0.393 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.348ms |

## P5 / sweep / commit / 5-10 facts (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.331 | 0.000 | 0.000 | 0.432 | 2.321 | n/a | 0.000 | 0.084 | 0.616 | 0.917 | 0.016 | n/a | 0.058 | 4.708 | n/a | n/a | 0.032 | 2.758 | 0.290 | 0.032 |
| p99 | 22.218 | 1.997 | 0.000 | 1.561 | 6.464 | n/a | 0.000 | 4.354 | 1.416 | 3.440 | 0.049 | n/a | 0.305 | 17.811 | n/a | n/a | 0.094 | 8.020 | 0.591 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa0000000000002600 | 22.218 | 2.714 | n/a | 0.000 | 0.043 | 0.671 | 0.894 | 0.014 | n/a | 0.042 | 17.811 | n/a | n/a | 0.028 | 2.758 | 0.124 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025d8 | 16.266 | 6.464 | n/a | 0.000 | 0.136 | 0.851 | 1.099 | 0.021 | n/a | 0.058 | 7.543 | n/a | n/a | 0.094 | 6.599 | 0.406 | 0.094 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000257c | 15.789 | 3.139 | n/a | 0.000 | 0.094 | 0.782 | 0.917 | 0.017 | n/a | 0.305 | 10.499 | n/a | n/a | 0.038 | 3.232 | 0.205 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025cd | 14.530 | 3.156 | n/a | 0.000 | 0.116 | 0.683 | 0.883 | 0.016 | n/a | 0.054 | 9.542 | n/a | n/a | 0.080 | 3.272 | 0.225 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002585 | 14.275 | 2.969 | n/a | 0.000 | 2.793 | 0.537 | 0.845 | 0.022 | n/a | 0.089 | 6.987 | n/a | n/a | 0.032 | 5.762 | 0.404 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.418ms |
| a503e751587f37aa0000000000002580 | 13.575 | 3.666 | n/a | 0.000 | 4.354 | 0.616 | 0.776 | 0.013 | n/a | 0.046 | 4.056 | n/a | n/a | 0.048 | 8.020 | 0.591 | 0.048 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.829ms |
| a503e751587f37aa000000000000259e | 12.060 | 4.830 | n/a | 0.000 | 0.113 | 0.825 | 1.231 | 0.017 | n/a | 0.056 | 4.897 | n/a | n/a | 0.091 | 4.943 | 0.410 | 0.091 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025b5 | 11.719 | 4.035 | n/a | 0.000 | 0.093 | 1.416 | 1.338 | 0.023 | n/a | 0.159 | 4.596 | n/a | n/a | 0.058 | 4.128 | 0.352 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025eb | 11.691 | 3.202 | n/a | 0.000 | 0.055 | 1.149 | 1.182 | 0.023 | n/a | 0.097 | 5.945 | n/a | n/a | 0.037 | 3.258 | 0.279 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025f5 | 11.680 | 3.618 | n/a | 0.000 | 1.723 | 1.023 | 3.440 | 0.034 | n/a | 0.135 | 1.687 | n/a | n/a | 0.021 | 5.341 | 0.457 | 0.021 | node-14/thread-0/driver.execute | none observed |
| a503e751587f37aa00000000000025cf | 11.300 | 2.033 | n/a | 0.000 | 0.054 | 0.744 | 0.888 | 0.016 | n/a | 0.248 | 7.285 | n/a | n/a | 0.033 | 2.087 | 0.185 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025ef | 10.828 | 2.321 | n/a | 0.000 | 1.634 | 0.593 | 0.837 | 0.013 | n/a | 0.040 | 5.367 | n/a | n/a | 0.023 | 3.955 | 0.365 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025a5 | 10.765 | 4.160 | n/a | 0.000 | 0.084 | 0.658 | 0.910 | 0.017 | n/a | 0.052 | 4.822 | n/a | n/a | 0.062 | 4.244 | 0.394 | 0.062 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002574 | 10.559 | 1.632 | n/a | 0.000 | 0.030 | 0.438 | 0.999 | 0.014 | n/a | 0.051 | 7.382 | n/a | n/a | 0.013 | 1.661 | 0.157 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000258c | 10.461 | 1.996 | n/a | 0.000 | 1.242 | 0.595 | 0.896 | 0.017 | n/a | 0.061 | 5.617 | n/a | n/a | 0.037 | 3.238 | 0.310 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000025e3 | 10.451 | 4.216 | n/a | 0.000 | 0.109 | 0.777 | 1.036 | 0.013 | n/a | 0.133 | 4.114 | n/a | n/a | 0.054 | 4.324 | 0.414 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002620 | 10.331 | 2.127 | n/a | 0.000 | 2.552 | 0.555 | 0.944 | 0.014 | n/a | 0.061 | 4.054 | n/a | n/a | 0.023 | 4.680 | 0.453 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000259b | 10.110 | 1.984 | n/a | 0.000 | 0.054 | 0.484 | 1.271 | 0.021 | n/a | 0.123 | 6.130 | n/a | n/a | 0.043 | 2.038 | 0.202 | 0.043 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002604 | 10.043 | 2.084 | n/a | 0.000 | 0.457 | 0.385 | 1.011 | 0.014 | n/a | 0.045 | 6.024 | n/a | n/a | 0.023 | 2.541 | 0.253 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.396ms |
| a503e751587f37aa000000000000262a | 9.642 | 2.329 | n/a | 0.000 | 0.064 | 0.573 | 0.898 | 0.013 | n/a | 0.069 | 5.662 | n/a | n/a | 0.034 | 2.393 | 0.248 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3779 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.399 | 0.178 | 0.000 | 0.493 | 2.244 | n/a | 0.000 | 0.033 | 0.472 | 0.874 | 0.010 | n/a | 0.050 | 4.497 | n/a | n/a | 0.014 | 2.558 | 0.280 | 0.014 |
| p99 | 40.355 | 2.006 | 0.038 | 1.870 | 7.086 | n/a | 0.000 | 10.153 | 6.172 | 5.526 | 0.040 | n/a | 1.202 | 23.893 | n/a | n/a | 0.055 | 13.661 | 0.659 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000026e9 | 87.581 | 3.424 | n/a | 0.000 | 1.091 | 0.452 | 0.684 | 0.006 | n/a | 0.030 | 81.875 | n/a | n/a | 0.019 | 4.515 | 0.052 | 0.019 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.461ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa00000000000034dc | 79.457 | 9.248 | 0.738 | 0.000 | 0.025 | 0.800 | 2.023 | 0.022 | n/a | 0.061 | 66.528 | n/a | n/a | 0.012 | 10.010 | 0.126 | 0.012 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.527ms; driver.publication.readback 0.056ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa00000000000026ec | 75.969 | 2.670 | n/a | 0.000 | 0.044 | 0.607 | 0.884 | 0.013 | n/a | 0.042 | 71.680 | n/a | n/a | 0.029 | 2.714 | 0.036 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.007ms |
| a503e751587f37aa0000000000004115 | 75.087 | 4.745 | n/a | 0.000 | 0.073 | 2.186 | 1.281 | 0.002 | n/a | 0.010 | 66.764 | n/a | n/a | 0.027 | 4.817 | 0.064 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000003146 | 74.964 | 5.816 | n/a | 0.000 | 0.047 | 6.918 | 3.331 | 0.020 | n/a | 0.051 | 58.761 | n/a | n/a | 0.020 | 5.863 | 0.078 | 0.020 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.497ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa00000000000026eb | 73.104 | 2.036 | n/a | 0.000 | 0.033 | 1.343 | 1.572 | 0.028 | n/a | 0.099 | 67.972 | n/a | n/a | 0.021 | 2.069 | 0.028 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.016ms |
| a503e751587f37aa0000000000004116 | 70.027 | 1.118 | n/a | 0.000 | 0.718 | 0.994 | 0.468 | 0.006 | n/a | 0.549 | 66.165 | n/a | n/a | 0.008 | 1.835 | 0.026 | 0.008 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa00000000000034dd | 69.555 | 2.295 | n/a | 0.000 | 0.009 | 1.452 | 0.664 | 0.005 | n/a | 0.022 | 65.100 | n/a | n/a | 0.007 | 2.304 | 0.033 | 0.007 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000002e26 | 69.093 | 7.309 | n/a | 0.000 | 1.130 | 5.760 | 4.373 | 0.044 | n/a | 0.100 | 50.370 | n/a | n/a | 0.007 | 8.438 | 0.122 | 0.007 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.444ms; driver.publication.readback 0.073ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.027ms |
| a503e751587f37aa0000000000004129 | 68.114 | 5.114 | n/a | 0.000 | 9.231 | 0.304 | 1.188 | 0.007 | n/a | 0.280 | 51.974 | n/a | n/a | 0.015 | 14.345 | 0.211 | 0.015 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.628ms; driver.publication.persist-deferred 0.048ms; driver.publication.readback 0.040ms |
| a503e751587f37aa0000000000003cc0 | 67.151 | 3.226 | n/a | 0.000 | 1.289 | 0.467 | 0.917 | 0.007 | n/a | 0.190 | 61.041 | n/a | n/a | 0.014 | 4.514 | 0.067 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.436ms |
| a503e751587f37aa00000000000026ed | 67.112 | 3.211 | n/a | 0.000 | 54.021 | 0.331 | 1.790 | 0.004 | n/a | 0.190 | 7.542 | n/a | n/a | 0.023 | 57.232 | 0.853 | 0.023 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.452ms; driver.publication.readback 0.085ms; driver.publication.readback 0.072ms; driver.publication.readback 0.063ms; driver.publication.readback 0.057ms |
| a503e751587f37aa0000000000003cc1 | 64.939 | 1.285 | n/a | 0.000 | 0.014 | 0.638 | 1.029 | 0.004 | n/a | 0.029 | 61.932 | n/a | n/a | 0.007 | 1.300 | 0.020 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| a503e751587f37aa00000000000034df | 63.215 | 1.241 | n/a | 0.000 | 53.246 | 1.371 | 0.836 | 0.013 | n/a | 0.049 | 6.451 | n/a | n/a | 0.009 | 54.487 | 0.862 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.527ms; driver.publication.readback 0.056ms; driver.publication.readback 0.044ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.021ms |
| a503e751587f37aa0000000000003926 | 62.535 | 4.015 | n/a | 0.000 | 0.051 | 0.423 | 0.779 | 0.006 | n/a | 0.424 | 56.815 | n/a | n/a | 0.023 | 4.065 | 0.065 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.574ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000003147 | 62.014 | 1.775 | n/a | 0.000 | 0.026 | 0.240 | 0.551 | 0.006 | n/a | 0.043 | 59.359 | n/a | n/a | 0.015 | 1.801 | 0.029 | 0.015 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.497ms |
| a503e751587f37aa0000000000002a69 | 61.687 | 2.786 | n/a | 0.000 | 1.017 | 0.437 | 1.460 | 0.024 | n/a | 0.069 | 55.879 | n/a | n/a | 0.013 | 3.803 | 0.062 | 0.013 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000033d6 | 60.641 | 4.114 | n/a | 0.000 | 45.123 | 3.534 | 0.826 | 0.008 | n/a | 0.900 | 6.121 | n/a | n/a | 0.015 | 49.237 | 0.812 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.028ms |
| a503e751587f37aa0000000000004118 | 58.017 | 2.016 | n/a | 0.000 | 0.048 | 1.735 | 0.924 | 0.010 | n/a | 0.035 | 53.230 | n/a | n/a | 0.021 | 2.064 | 0.036 | 0.021 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa0000000000003cc2 | 57.731 | 1.537 | n/a | 0.000 | 48.530 | 0.387 | 1.494 | 0.015 | n/a | 0.048 | 5.710 | n/a | n/a | 0.010 | 50.067 | 0.867 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.063ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.008ms |

## P2 / tail / commit / 5-10 facts (2162 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.012 | 0.000 | 0.000 | 0.383 | 1.733 | n/a | 0.000 | 0.032 | 0.450 | 0.719 | 0.009 | n/a | 0.048 | 3.944 | n/a | n/a | 0.013 | 1.971 | 0.258 | 0.013 |
| p99 | 36.234 | 1.999 | 0.033 | 1.015 | 5.266 | n/a | 0.000 | 11.270 | 6.360 | 3.273 | 0.039 | n/a | 1.061 | 19.809 | n/a | n/a | 0.051 | 13.622 | 0.675 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| a503e751587f37aa00000000000026ec | 75.969 | 2.670 | n/a | 0.000 | 0.044 | 0.607 | 0.884 | 0.013 | n/a | 0.042 | 71.680 | n/a | n/a | 0.029 | 2.714 | 0.036 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.007ms |
| a503e751587f37aa0000000000004116 | 70.027 | 1.118 | n/a | 0.000 | 0.718 | 0.994 | 0.468 | 0.006 | n/a | 0.549 | 66.165 | n/a | n/a | 0.008 | 1.835 | 0.026 | 0.008 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000003cc1 | 64.939 | 1.285 | n/a | 0.000 | 0.014 | 0.638 | 1.029 | 0.004 | n/a | 0.029 | 61.932 | n/a | n/a | 0.007 | 1.300 | 0.020 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| a503e751587f37aa00000000000034df | 63.215 | 1.241 | n/a | 0.000 | 53.246 | 1.371 | 0.836 | 0.013 | n/a | 0.049 | 6.451 | n/a | n/a | 0.009 | 54.487 | 0.862 | 0.009 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.527ms; driver.publication.readback 0.056ms; driver.publication.readback 0.044ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.021ms |
| a503e751587f37aa0000000000003147 | 62.014 | 1.775 | n/a | 0.000 | 0.026 | 0.240 | 0.551 | 0.006 | n/a | 0.043 | 59.359 | n/a | n/a | 0.015 | 1.801 | 0.029 | 0.015 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.497ms |
| a503e751587f37aa0000000000003cc2 | 57.731 | 1.537 | n/a | 0.000 | 48.530 | 0.387 | 1.494 | 0.015 | n/a | 0.048 | 5.710 | n/a | n/a | 0.010 | 50.067 | 0.867 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.063ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.008ms |
| a503e751587f37aa0000000000002e27 | 53.624 | 2.233 | n/a | 0.000 | 0.017 | 0.510 | 1.505 | 0.019 | n/a | 0.050 | 49.280 | n/a | n/a | 0.010 | 2.250 | 0.042 | 0.010 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa000000000000412a | 53.391 | 1.559 | n/a | 0.000 | 0.031 | 0.225 | 0.719 | 0.004 | n/a | 0.039 | 50.801 | n/a | n/a | 0.014 | 1.590 | 0.030 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.628ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.023ms |
| a503e751587f37aa0000000000002e41 | 49.987 | 2.846 | n/a | 0.000 | 0.703 | 2.087 | 0.324 | 0.003 | n/a | 0.008 | 44.011 | n/a | n/a | 0.005 | 3.549 | 0.071 | 0.005 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.408ms; driver.publication.readback 0.132ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000003cc4 | 48.330 | 2.078 | n/a | 0.000 | 2.813 | 0.796 | 0.681 | 0.017 | n/a | 0.036 | 41.897 | n/a | n/a | 0.012 | 4.891 | 0.101 | 0.012 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.readback 0.027ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.008ms |
| a503e751587f37aa0000000000003148 | 46.042 | 3.561 | n/a | 0.000 | 0.039 | 6.360 | 1.537 | 0.022 | n/a | 0.199 | 34.306 | n/a | n/a | 0.018 | 3.599 | 0.078 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.497ms; driver.publication.readback 0.052ms; driver.publication.readback 0.033ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa00000000000026ef | 43.937 | 5.998 | n/a | 0.000 | 0.058 | 5.969 | 1.406 | 0.030 | n/a | 0.091 | 30.350 | n/a | n/a | 0.035 | 6.055 | 0.138 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.007ms |
| a503e751587f37aa00000000000034e0 | 43.936 | 1.255 | n/a | 0.000 | 0.028 | 3.923 | 0.495 | 0.006 | n/a | 0.127 | 38.090 | n/a | n/a | 0.012 | 1.283 | 0.029 | 0.012 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.527ms; driver.publication.persist-deferred 0.021ms |
| a503e751587f37aa00000000000028fa | 40.054 | 5.266 | n/a | 0.000 | 20.994 | 3.163 | 1.991 | 0.029 | n/a | 1.486 | 7.111 | n/a | n/a | 0.014 | 26.260 | 0.656 | 0.014 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 1.103ms; driver.publication.readback 0.124ms; driver.publication.readback 0.059ms; driver.publication.persist-deferred 0.039ms; driver.publication.readback 0.027ms |
| a503e751587f37aa0000000000002a27 | 39.891 | 1.317 | n/a | 0.000 | 26.947 | 2.657 | 1.074 | 0.021 | n/a | 0.070 | 7.793 | n/a | n/a | 0.011 | 28.264 | 0.709 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.105ms; driver.publication.readback 0.054ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.017ms |
| a503e751587f37aa0000000000002e42 | 39.452 | 1.147 | n/a | 0.000 | 0.011 | 3.623 | 0.846 | 0.013 | n/a | 0.028 | 33.777 | n/a | n/a | 0.006 | 1.159 | 0.029 | 0.006 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.132ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa00000000000026be | 39.137 | 3.925 | n/a | 0.000 | 0.128 | 0.985 | 4.933 | 0.023 | n/a | 0.079 | 29.000 | n/a | n/a | 0.063 | 4.053 | 0.104 | 0.063 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| a503e751587f37aa00000000000035a6 | 37.999 | 2.070 | n/a | 0.000 | 0.031 | 18.687 | 1.283 | 0.027 | n/a | 0.055 | 15.827 | n/a | n/a | 0.020 | 2.101 | 0.055 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| a503e751587f37aa00000000000026bf | 37.220 | 2.868 | n/a | 0.000 | 0.045 | 0.560 | 0.515 | 0.007 | n/a | 0.029 | 33.164 | n/a | n/a | 0.032 | 2.913 | 0.078 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.018ms |
| a503e751587f37aa0000000000002e4c | 36.873 | 4.073 | n/a | 0.000 | 0.011 | 2.841 | 2.221 | 0.032 | n/a | 0.514 | 27.174 | n/a | n/a | 0.007 | 4.084 | 0.111 | 0.007 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.051ms; driver.publication.readback 0.043ms; driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.030ms; driver.publication.persist-deferred 0.019ms |

## P3 / outside-phases / read (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.066 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 200.501 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 411.238 | n/a | n/a | n/a | 63.436 | n/a | 18.536 | 0.000 | 29.983 | 407.297 | 4.656 | n/a | 0.148 | 0.000 | n/a | n/a | 39.446 | 81.972 | 0.331 | 39.446 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000000002 | 411.238 | 2.504 | n/a | 0.000 | 0.000 | 0.961 | 407.297 | 0.100 | n/a | 0.077 | 0.000 | n/a | n/a | 0.299 | 2.504 | 0.006 | 0.299 | gw-r/thread-43/gateway.admitted-work | none observed |
| bc97183a5092a68c000000000000291e | 250.025 | 63.436 | n/a | 18.536 | 0.000 | 8.174 | 159.707 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.162 | 81.972 | 0.328 | 0.162 | gw-r/thread-71/gateway.admitted-work | none observed |
| bc97183a5092a68c000000000000152e | 231.473 | 0.000 | n/a | 0.000 | 0.000 | 29.983 | 201.319 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001411 | 203.818 | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 203.046 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000000005 | 202.774 | 0.000 | n/a | 0.000 | 0.000 | 1.016 | 201.382 | 0.013 | n/a | 0.148 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000166f | 202.710 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 202.069 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000152f | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.264 | 0.004 | n/a | 0.117 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000002915 | 202.083 | 0.000 | n/a | 0.000 | 0.000 | 1.031 | 200.766 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000006 | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 200.844 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000002917 | 201.562 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 200.501 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000002916 | 201.392 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.590 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000140f | 201.368 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 200.669 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001669 | 201.249 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 200.554 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001666 | 201.235 | 0.000 | n/a | 0.000 | 0.000 | 0.492 | 200.574 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001668 | 201.224 | 0.000 | n/a | 0.000 | 0.000 | 0.437 | 200.631 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000166c | 201.212 | 0.000 | n/a | 0.000 | 0.000 | 0.367 | 200.700 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001530 | 201.108 | 0.000 | n/a | 0.000 | 0.000 | 0.370 | 200.579 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000002914 | 201.066 | 0.000 | n/a | 0.000 | 0.000 | 0.415 | 200.500 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-75/journal/page | none observed |
| bc97183a5092a68c000000000000140d | 201.019 | 0.000 | n/a | 0.000 | 0.000 | 0.337 | 200.557 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000166d | 200.986 | 0.000 | n/a | 0.000 | 0.000 | 0.356 | 200.516 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-44/journal/page | none observed |

## P3 / outside-phases / internal (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 345.559 | n/a | n/a | n/a | 3.854 | n/a | 0.000 | 0.000 | 0.392 | 296.928 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.287 | 3.854 | 0.019 | 0.287 |
| p99 | 1007.521 | n/a | n/a | n/a | 525.313 | n/a | 48.211 | 0.000 | 3.971 | 1003.763 | 0.012 | n/a | 0.343 | 0.000 | n/a | n/a | 10.817 | 573.524 | 0.887 | 10.817 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a00000000000000a4 | 1007.521 | 0.352 | n/a | 0.000 | 0.000 | 1.872 | 1003.763 | 0.012 | n/a | 0.250 | 0.000 | n/a | n/a | 1.272 | 0.352 | 0.000 | 1.272 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000a5 | 812.031 | 15.827 | n/a | 0.000 | 0.000 | 3.971 | 791.591 | 0.011 | n/a | 0.343 | 0.000 | n/a | n/a | 0.287 | 15.827 | 0.019 | 0.287 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f83 | 745.206 | 5.704 | n/a | 2.014 | 0.000 | 0.392 | 736.974 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.094 | 7.718 | 0.010 | 0.094 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f7d | 646.830 | 525.313 | n/a | 48.211 | 0.000 | 3.461 | 61.947 | 0.006 | n/a | 0.009 | 0.000 | n/a | n/a | 7.884 | 573.524 | 0.887 | 7.884 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f82 | 614.500 | 2.347 | n/a | 0.000 | 0.000 | 0.416 | 611.656 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.049 | 2.347 | 0.004 | 0.049 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ec3 | 431.681 | 2.272 | n/a | 0.000 | 0.000 | 0.288 | 429.031 | 0.009 | n/a | 0.037 | 0.000 | n/a | n/a | 0.043 | 2.272 | 0.005 | 0.043 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e20 | 345.559 | 2.740 | n/a | 0.000 | 0.000 | 0.336 | 342.384 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.064 | 2.740 | 0.008 | 0.064 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e1c | 311.581 | 12.930 | n/a | 1.028 | 0.000 | 0.378 | 296.928 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.296 | 13.958 | 0.045 | 0.296 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e1e | 260.455 | 2.451 | n/a | 0.000 | 0.000 | 0.459 | 257.435 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.080 | 2.451 | 0.009 | 0.080 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e1b | 93.988 | 5.693 | n/a | 0.000 | 0.000 | 0.675 | 87.455 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.135 | 5.693 | 0.061 | 0.135 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f80 | 18.571 | 7.573 | n/a | 0.000 | 0.000 | 0.180 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.817 | 7.573 | 0.408 | 10.817 | node-14/thread-2/socket.wait-first-byte | none observed |
| c3a9aaa2c14b786a0000000000001ec2 | 5.325 | 3.854 | n/a | 0.000 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.116 | 3.854 | 0.724 | 1.116 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f7f | 3.712 | 2.507 | n/a | 0.000 | 0.000 | 0.382 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.823 | 2.507 | 0.675 | 0.823 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 440.800 | n/a | n/a | n/a | 2.515 | n/a | 0.000 | 0.000 | 0.704 | 437.176 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.082 | 2.515 | 0.006 | 0.082 |
| p99 | 1031.552 | n/a | n/a | n/a | 8.792 | n/a | 0.000 | 0.000 | 5.466 | 1024.082 | 0.052 | n/a | 0.126 | 0.000 | n/a | n/a | 46.846 | 8.792 | 0.101 | 46.846 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a00000000000000ae | 1031.552 | 2.452 | n/a | 0.000 | 0.000 | 4.851 | 1024.082 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.071 | 2.452 | 0.002 | 0.071 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000bb | 1003.046 | 2.510 | n/a | 0.000 | 0.000 | 0.871 | 999.429 | 0.015 | n/a | 0.126 | 0.000 | n/a | n/a | 0.094 | 2.510 | 0.003 | 0.094 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000b4 | 994.388 | 2.515 | n/a | 0.000 | 0.000 | 4.679 | 986.982 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.082 | 2.515 | 0.003 | 0.082 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000ba | 982.770 | 5.663 | n/a | 0.000 | 0.000 | 0.673 | 976.197 | 0.015 | n/a | 0.074 | 0.000 | n/a | n/a | 0.148 | 5.663 | 0.006 | 0.148 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000ab | 968.610 | 5.159 | n/a | 0.000 | 0.000 | 0.493 | 962.453 | 0.052 | n/a | 0.074 | 0.000 | n/a | n/a | 0.379 | 5.159 | 0.005 | 0.379 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000cf | 954.621 | 2.516 | n/a | 0.000 | 0.000 | 0.915 | 951.022 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.078 | 2.516 | 0.003 | 0.078 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000a8 | 917.188 | 2.168 | n/a | 0.000 | 0.000 | 0.588 | 914.256 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.098 | 2.168 | 0.002 | 0.098 | gw-r/thread-41/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000c1 | 906.433 | 8.792 | n/a | 0.000 | 0.000 | 1.616 | 895.834 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.122 | 8.792 | 0.010 | 0.122 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000ca | 763.552 | 2.171 | n/a | 0.000 | 0.000 | 0.557 | 760.671 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.069 | 2.171 | 0.003 | 0.069 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000b2 | 547.649 | 2.677 | n/a | 0.000 | 0.000 | 0.783 | 543.981 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.106 | 2.677 | 0.005 | 0.106 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000c4 | 542.905 | 1.984 | n/a | 0.000 | 0.000 | 0.429 | 540.350 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.072 | 1.984 | 0.004 | 0.072 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000c7 | 511.928 | 2.262 | n/a | 0.000 | 0.000 | 4.429 | 505.079 | 0.014 | n/a | 0.070 | 0.000 | n/a | n/a | 0.075 | 2.262 | 0.004 | 0.075 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000c8 | 503.118 | 2.388 | n/a | 0.000 | 0.000 | 0.676 | 499.888 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.073 | 2.388 | 0.005 | 0.073 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000bf | 474.346 | 2.910 | n/a | 0.000 | 0.000 | 0.752 | 470.456 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.122 | 2.910 | 0.006 | 0.122 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000c6 | 440.800 | 2.658 | n/a | 0.000 | 0.000 | 0.837 | 437.176 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.072 | 2.658 | 0.006 | 0.072 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000b7 | 437.676 | 2.509 | n/a | 0.000 | 0.000 | 0.764 | 434.248 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.075 | 2.509 | 0.006 | 0.075 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000b5 | 346.966 | 6.913 | n/a | 0.000 | 0.000 | 5.466 | 334.387 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.097 | 6.913 | 0.020 | 0.097 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000b1 | 323.107 | 4.133 | n/a | 0.000 | 0.000 | 0.510 | 318.167 | 0.015 | n/a | 0.085 | 0.000 | n/a | n/a | 0.198 | 4.133 | 0.013 | 0.198 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000bc | 291.268 | 2.119 | n/a | 0.000 | 0.000 | 3.385 | 285.586 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.075 | 2.119 | 0.007 | 0.075 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000a6 | 280.666 | 3.698 | n/a | 0.000 | 0.000 | 0.704 | 275.966 | 0.012 | n/a | 0.110 | 0.000 | n/a | n/a | 0.177 | 3.698 | 0.013 | 0.177 | gw-r/thread-65/journal/page | none observed |

## P3 / baseline / internal (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 466.980 | n/a | n/a | n/a | 3.181 | n/a | 0.000 | 0.000 | 0.623 | 453.145 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 3.615 | 0.010 | 0.098 |
| p99 | 1007.260 | n/a | n/a | n/a | 13.061 | n/a | 2.184 | 0.000 | 5.055 | 1000.706 | 1.694 | n/a | 3.633 | 0.000 | n/a | n/a | 44.595 | 13.904 | 0.704 | 44.595 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a00000000000000d0 | 1007.260 | 9.184 | n/a | 0.834 | 0.000 | 0.633 | 996.376 | 0.018 | n/a | 0.093 | 0.000 | n/a | n/a | 0.122 | 10.018 | 0.010 | 0.122 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000128 | 1002.721 | 0.181 | n/a | 0.000 | 0.000 | 0.603 | 1000.706 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 1.150 | 0.181 | 0.000 | 1.150 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000135 | 1001.388 | 5.951 | n/a | 0.000 | 0.000 | 0.872 | 994.345 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.165 | 5.951 | 0.006 | 0.165 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000112 | 1001.173 | 2.935 | n/a | 0.680 | 0.000 | 0.330 | 997.012 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.091 | 3.615 | 0.004 | 0.091 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000d1 | 997.910 | 3.615 | n/a | 0.478 | 0.000 | 0.718 | 992.824 | 0.025 | n/a | 0.141 | 0.000 | n/a | n/a | 0.109 | 4.093 | 0.004 | 0.109 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000151 | 995.782 | 2.935 | n/a | 0.000 | 0.000 | 0.649 | 991.963 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.193 | 2.935 | 0.003 | 0.193 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000103 | 995.541 | 2.881 | n/a | 0.595 | 0.000 | 0.369 | 991.572 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.062 | 3.476 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000123 | 994.388 | 2.542 | n/a | 0.000 | 0.000 | 1.029 | 990.652 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.063 | 2.542 | 0.003 | 0.063 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000dd | 993.735 | 3.748 | n/a | 0.479 | 0.000 | 0.586 | 988.753 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.116 | 4.228 | 0.004 | 0.116 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000dc | 991.937 | 2.797 | n/a | 0.649 | 0.000 | 0.364 | 987.977 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.076 | 3.447 | 0.003 | 0.076 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000d8 | 991.782 | 6.667 | n/a | 0.673 | 0.000 | 0.636 | 983.503 | 0.019 | n/a | 0.101 | 0.000 | n/a | n/a | 0.183 | 7.340 | 0.007 | 0.183 | gw-r/thread-41/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000fc | 989.188 | 2.615 | n/a | 0.558 | 0.000 | 0.499 | 985.394 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.094 | 3.173 | 0.003 | 0.094 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000127 | 986.814 | 2.905 | n/a | 0.000 | 0.000 | 1.396 | 982.367 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.072 | 2.905 | 0.003 | 0.072 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000010b | 983.167 | 2.835 | n/a | 0.000 | 0.000 | 0.618 | 979.579 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.067 | 2.835 | 0.003 | 0.067 | gw-r/thread-41/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000d7 | 972.531 | 3.181 | n/a | 0.496 | 0.000 | 0.956 | 967.689 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.130 | 3.677 | 0.004 | 0.130 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a000000000000011a | 955.575 | 3.894 | n/a | 0.573 | 0.000 | 0.474 | 950.448 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.098 | 4.467 | 0.005 | 0.098 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a000000000000010f | 946.120 | 4.610 | n/a | 0.532 | 0.000 | 0.702 | 940.105 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.093 | 5.142 | 0.005 | 0.093 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000000de | 936.183 | 4.057 | n/a | 0.480 | 0.000 | 1.364 | 930.091 | 0.015 | n/a | 0.095 | 0.000 | n/a | n/a | 0.081 | 4.537 | 0.005 | 0.081 | gw-r/thread-41/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000100 | 918.976 | 2.497 | n/a | 0.618 | 0.000 | 0.623 | 915.057 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.101 | 3.115 | 0.003 | 0.101 | gw-r/thread-41/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000124 | 896.923 | 4.591 | n/a | 0.818 | 0.000 | 0.566 | 890.758 | 0.020 | n/a | 0.072 | 0.000 | n/a | n/a | 0.099 | 5.409 | 0.006 | 0.099 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (107 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 346.514 | n/a | n/a | n/a | 2.738 | n/a | 0.000 | 0.000 | 0.552 | 343.418 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 2.760 | 0.009 | 0.067 |
| p99 | 1005.543 | n/a | n/a | n/a | 9.316 | n/a | 0.648 | 0.000 | 3.905 | 1000.905 | 0.026 | n/a | 0.077 | 0.000 | n/a | n/a | 33.939 | 9.316 | 0.453 | 33.939 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000000182 | 1006.200 | 0.199 | n/a | 0.000 | 0.000 | 3.905 | 1000.866 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 1.152 | 0.199 | 0.000 | 1.152 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001a3 | 1005.543 | 0.169 | n/a | 0.000 | 0.000 | 3.278 | 1000.879 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 1.148 | 0.169 | 0.000 | 1.148 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001c1 | 1004.457 | 0.134 | n/a | 0.000 | 0.000 | 0.433 | 1002.741 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 1.098 | 0.134 | 0.000 | 1.098 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000161 | 1002.860 | 0.190 | n/a | 0.000 | 0.000 | 0.569 | 1000.905 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 1.129 | 0.190 | 0.000 | 1.129 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a000000000000017c | 1002.729 | 2.299 | n/a | 0.000 | 0.000 | 0.472 | 999.847 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.058 | 2.299 | 0.002 | 0.058 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a000000000000016b | 1002.307 | 0.115 | n/a | 0.000 | 0.000 | 0.452 | 1000.586 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 1.099 | 0.115 | 0.000 | 1.099 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000188 | 1001.953 | 2.821 | n/a | 0.000 | 0.000 | 0.500 | 998.533 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.821 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001a5 | 980.858 | 2.230 | n/a | 0.000 | 0.000 | 0.302 | 978.204 | 0.012 | n/a | 0.050 | 0.000 | n/a | n/a | 0.060 | 2.230 | 0.002 | 0.060 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000184 | 979.329 | 2.393 | n/a | 0.000 | 0.000 | 0.426 | 976.398 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.059 | 2.393 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001e8 | 976.812 | 2.199 | n/a | 0.000 | 0.000 | 0.501 | 974.029 | 0.002 | n/a | 0.018 | 0.000 | n/a | n/a | 0.063 | 2.199 | 0.002 | 0.063 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001c3 | 968.796 | 2.887 | n/a | 0.000 | 0.000 | 0.427 | 965.377 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.062 | 2.887 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000197 | 950.641 | 3.251 | n/a | 0.000 | 0.000 | 0.501 | 946.729 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.125 | 3.251 | 0.003 | 0.125 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001d3 | 856.020 | 1.542 | n/a | 0.000 | 0.000 | 0.416 | 853.915 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.072 | 1.542 | 0.002 | 0.072 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001db | 838.370 | 2.676 | n/a | 0.000 | 0.000 | 0.439 | 835.164 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.055 | 2.676 | 0.003 | 0.055 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a000000000000019a | 832.358 | 3.438 | n/a | 0.000 | 0.000 | 0.455 | 828.332 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.063 | 3.438 | 0.004 | 0.063 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000171 | 826.787 | 2.819 | n/a | 0.000 | 0.000 | 0.282 | 823.572 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.069 | 2.819 | 0.003 | 0.069 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001a1 | 824.405 | 4.220 | n/a | 0.000 | 0.000 | 0.552 | 819.531 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.066 | 4.220 | 0.005 | 0.066 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001ee | 790.404 | 1.617 | n/a | 0.000 | 0.000 | 0.377 | 788.316 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 1.617 | 0.002 | 0.057 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000019d | 737.341 | 3.492 | n/a | 0.000 | 0.000 | 0.339 | 733.410 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.071 | 3.492 | 0.005 | 0.071 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001c4 | 723.694 | 2.887 | n/a | 0.000 | 0.000 | 1.125 | 719.543 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.065 | 2.887 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / internal (1525 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.353 | n/a | n/a | n/a | 3.203 | n/a | 0.000 | 0.000 | 0.216 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.159 | 3.207 | 0.265 | 7.159 |
| p99 | 239.256 | n/a | n/a | n/a | 12.822 | n/a | 1.022 | 0.000 | 1.120 | 236.558 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 47.483 | 13.202 | 0.834 | 47.483 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000000215 | 1007.983 | 2.227 | n/a | 0.000 | 0.000 | 0.595 | 1005.031 | 0.024 | n/a | 0.050 | 0.000 | n/a | n/a | 0.057 | 2.227 | 0.002 | 0.057 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000210 | 1003.196 | 0.215 | n/a | 0.000 | 0.000 | 0.775 | 1000.957 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 1.187 | 0.215 | 0.000 | 1.187 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001fc | 1001.520 | 2.462 | n/a | 0.000 | 0.000 | 0.536 | 998.424 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.462 | 0.002 | 0.063 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000216 | 998.869 | 2.265 | n/a | 0.000 | 0.000 | 1.009 | 995.455 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.080 | 2.265 | 0.002 | 0.080 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a000000000000020f | 994.907 | 2.214 | n/a | 0.000 | 0.000 | 0.448 | 992.143 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.063 | 2.214 | 0.002 | 0.063 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000222 | 973.289 | 2.252 | n/a | 0.000 | 0.000 | 0.467 | 970.457 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.071 | 2.252 | 0.002 | 0.071 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000217 | 965.877 | 1.744 | n/a | 0.000 | 0.000 | 0.756 | 963.267 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.081 | 1.744 | 0.002 | 0.081 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000223 | 964.753 | 2.477 | n/a | 0.000 | 0.000 | 1.079 | 960.972 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.167 | 2.477 | 0.003 | 0.167 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000001fd | 904.710 | 2.302 | n/a | 0.000 | 0.000 | 0.551 | 901.747 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 2.302 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000213 | 878.527 | 2.275 | n/a | 0.000 | 0.000 | 0.727 | 875.399 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.062 | 2.275 | 0.003 | 0.062 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000200 | 847.595 | 2.198 | n/a | 0.000 | 0.000 | 0.482 | 844.791 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.061 | 2.198 | 0.003 | 0.061 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000205 | 815.200 | 2.229 | n/a | 0.000 | 0.000 | 0.464 | 812.386 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.067 | 2.229 | 0.003 | 0.067 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a000000000000021a | 808.013 | 4.494 | n/a | 0.000 | 0.000 | 0.771 | 802.619 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.081 | 4.494 | 0.006 | 0.081 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a000000000000021e | 793.268 | 3.019 | n/a | 0.000 | 0.000 | 0.462 | 789.661 | 0.025 | n/a | 0.041 | 0.000 | n/a | n/a | 0.061 | 3.019 | 0.004 | 0.061 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a000000000000020d | 396.287 | 2.251 | n/a | 0.000 | 0.000 | 0.435 | 393.504 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.055 | 2.251 | 0.006 | 0.055 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000206 | 239.256 | 2.100 | n/a | 0.000 | 0.000 | 0.494 | 236.558 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.060 | 2.100 | 0.009 | 0.060 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a000000000000020c | 227.600 | 2.015 | n/a | 0.000 | 0.000 | 1.063 | 224.427 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.062 | 2.015 | 0.009 | 0.062 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000202 | 209.064 | 2.196 | n/a | 0.000 | 0.000 | 1.095 | 204.252 | 1.402 | n/a | 0.060 | 0.000 | n/a | n/a | 0.059 | 2.196 | 0.011 | 0.059 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000021b | 181.407 | 2.290 | n/a | 0.000 | 0.000 | 0.428 | 178.573 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.061 | 2.290 | 0.013 | 0.061 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000000221 | 163.437 | 2.554 | n/a | 0.000 | 0.000 | 0.925 | 159.853 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 2.554 | 0.016 | 0.064 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / internal (1560 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.318 | n/a | n/a | n/a | 3.919 | n/a | 0.000 | 0.000 | 0.201 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.583 | 3.955 | 0.329 | 5.583 |
| p99 | 369.232 | n/a | n/a | n/a | 16.328 | n/a | 1.775 | 0.000 | 1.137 | 366.820 | 0.011 | n/a | 0.033 | 0.000 | n/a | n/a | 47.932 | 16.923 | 0.859 | 47.932 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001aad | 1001.921 | 0.084 | n/a | 0.000 | 0.000 | 0.278 | 1000.385 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 1.145 | 0.084 | 0.000 | 1.145 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ab2 | 995.615 | 2.405 | n/a | 0.000 | 0.000 | 0.338 | 992.767 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.054 | 2.405 | 0.002 | 0.054 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001aaf | 992.834 | 8.984 | n/a | 0.000 | 0.000 | 0.389 | 983.083 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.324 | 8.984 | 0.009 | 0.324 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ab7 | 906.358 | 2.790 | n/a | 0.000 | 0.000 | 0.529 | 902.961 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.051 | 2.790 | 0.003 | 0.051 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001acf | 886.944 | 2.111 | n/a | 0.000 | 0.000 | 0.385 | 884.335 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.093 | 2.111 | 0.002 | 0.093 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ac1 | 873.958 | 3.802 | n/a | 0.000 | 0.000 | 0.507 | 869.554 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.059 | 3.802 | 0.004 | 0.059 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001aab | 815.772 | 3.638 | n/a | 0.000 | 0.000 | 0.481 | 811.563 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.052 | 3.638 | 0.004 | 0.052 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ab8 | 719.907 | 3.240 | n/a | 0.000 | 0.000 | 0.269 | 716.239 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.114 | 3.240 | 0.005 | 0.114 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ad4 | 705.809 | 10.452 | n/a | 1.158 | 0.000 | 0.407 | 693.349 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.393 | 11.611 | 0.016 | 0.393 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ad2 | 658.270 | 2.514 | n/a | 0.000 | 0.000 | 1.097 | 654.541 | 0.022 | n/a | 0.029 | 0.000 | n/a | n/a | 0.066 | 2.514 | 0.004 | 0.066 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ae2 | 604.358 | 2.522 | n/a | 0.000 | 0.000 | 0.400 | 601.331 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.062 | 2.522 | 0.004 | 0.062 | gw-r/thread-46/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001acc | 584.642 | 3.612 | n/a | 0.000 | 0.000 | 0.277 | 580.643 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.066 | 3.612 | 0.006 | 0.066 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ae7 | 569.082 | 2.581 | n/a | 0.000 | 0.000 | 0.369 | 566.039 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.064 | 2.581 | 0.005 | 0.064 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ac7 | 492.052 | 2.342 | n/a | 0.000 | 0.000 | 0.432 | 489.169 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.067 | 2.342 | 0.005 | 0.067 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001aea | 395.619 | 2.769 | n/a | 0.000 | 0.000 | 0.420 | 392.342 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.057 | 2.769 | 0.007 | 0.057 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ac5 | 369.232 | 1.931 | n/a | 0.000 | 0.000 | 0.374 | 366.820 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 1.931 | 0.005 | 0.065 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ae4 | 336.823 | 1.884 | n/a | 0.000 | 0.000 | 0.334 | 334.490 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.068 | 1.884 | 0.006 | 0.068 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ad1 | 333.680 | 12.691 | n/a | 1.032 | 0.000 | 0.491 | 319.229 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.222 | 13.722 | 0.041 | 0.222 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ad9 | 330.838 | 6.417 | n/a | 1.074 | 0.000 | 0.310 | 322.903 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.103 | 7.491 | 0.023 | 0.103 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ae0 | 324.155 | 2.967 | n/a | 0.000 | 0.000 | 0.344 | 320.741 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.071 | 2.967 | 0.009 | 0.071 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 352.817 | n/a | n/a | n/a | 3.324 | n/a | 0.000 | 0.000 | 0.436 | 350.567 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.087 | 3.445 | 0.010 | 0.087 |
| p99 | 1002.560 | n/a | n/a | n/a | 15.055 | n/a | 2.572 | 0.000 | 3.335 | 1000.716 | 0.136 | n/a | 0.091 | 0.000 | n/a | n/a | 48.492 | 17.627 | 0.727 | 48.492 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001b43 | 1002.560 | 0.089 | n/a | 0.000 | 0.000 | 0.570 | 1000.716 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 1.115 | 0.089 | 0.000 | 1.115 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b4c | 1002.316 | 0.131 | n/a | 0.000 | 0.000 | 0.416 | 1000.581 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.147 | 0.131 | 0.000 | 1.147 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b5f | 1001.980 | 0.083 | n/a | 0.000 | 0.000 | 0.329 | 1000.444 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 1.085 | 0.083 | 0.000 | 1.085 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b72 | 1001.873 | 5.580 | n/a | 0.820 | 0.000 | 0.405 | 994.912 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.126 | 6.399 | 0.006 | 0.126 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b45 | 1000.742 | 4.483 | n/a | 0.000 | 0.000 | 0.384 | 995.744 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 0.085 | 4.483 | 0.004 | 0.085 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b3f | 1000.275 | 2.734 | n/a | 0.000 | 0.000 | 1.035 | 996.424 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.050 | 2.734 | 0.003 | 0.050 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b73 | 999.919 | 3.245 | n/a | 0.000 | 0.000 | 0.487 | 996.037 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.093 | 3.245 | 0.003 | 0.093 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b6e | 997.534 | 5.093 | n/a | 0.000 | 0.000 | 0.646 | 991.645 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.118 | 5.093 | 0.005 | 0.118 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b3e | 992.495 | 2.537 | n/a | 0.000 | 0.000 | 0.632 | 989.235 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.054 | 2.537 | 0.003 | 0.054 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b5c | 992.381 | 4.340 | n/a | 0.874 | 0.000 | 3.049 | 983.205 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.880 | 5.214 | 0.005 | 0.880 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b31 | 990.483 | 3.012 | n/a | 0.000 | 0.000 | 1.484 | 985.866 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.095 | 3.012 | 0.003 | 0.095 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b35 | 988.725 | 2.296 | n/a | 0.000 | 0.000 | 0.282 | 986.071 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.049 | 2.296 | 0.002 | 0.049 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001af5 | 981.170 | 2.649 | n/a | 0.000 | 0.000 | 0.493 | 977.926 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.058 | 2.649 | 0.003 | 0.058 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b49 | 973.670 | 3.601 | n/a | 0.000 | 0.000 | 0.375 | 969.573 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.087 | 3.601 | 0.004 | 0.087 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001af2 | 966.917 | 2.097 | n/a | 0.000 | 0.000 | 0.776 | 963.941 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.075 | 2.097 | 0.002 | 0.075 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b40 | 944.400 | 2.744 | n/a | 0.000 | 0.000 | 0.633 | 940.929 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.058 | 2.744 | 0.003 | 0.058 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b6b | 944.137 | 7.433 | n/a | 1.115 | 0.000 | 0.358 | 935.045 | 0.005 | n/a | 0.019 | 0.000 | n/a | n/a | 0.164 | 8.547 | 0.009 | 0.164 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b04 | 910.121 | 2.214 | n/a | 0.000 | 0.000 | 0.396 | 907.407 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.053 | 2.214 | 0.002 | 0.053 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b70 | 879.410 | 5.009 | n/a | 0.771 | 0.000 | 0.542 | 872.995 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.072 | 5.780 | 0.007 | 0.072 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b20 | 870.926 | 6.393 | n/a | 0.000 | 0.000 | 0.393 | 863.884 | 0.002 | n/a | 0.008 | 0.000 | n/a | n/a | 0.247 | 6.393 | 0.007 | 0.247 | gw-r/thread-71/journal/page | none observed |

## P3 / L256 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 396.141 | n/a | n/a | n/a | 3.276 | n/a | 0.000 | 0.000 | 0.463 | 391.324 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.102 | 3.276 | 0.010 | 0.102 |
| p99 | 1002.364 | n/a | n/a | n/a | 13.313 | n/a | 0.800 | 0.000 | 4.530 | 1000.752 | 0.137 | n/a | 0.053 | 0.000 | n/a | n/a | 50.197 | 13.313 | 0.874 | 50.197 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001bcc | 1002.364 | 0.118 | n/a | 0.000 | 0.000 | 0.335 | 1000.752 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 1.099 | 0.118 | 0.000 | 1.099 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bfa | 1002.156 | 2.768 | n/a | 0.000 | 0.000 | 0.466 | 998.813 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.080 | 2.768 | 0.003 | 0.080 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bd1 | 1001.756 | 0.105 | n/a | 0.000 | 0.000 | 1.089 | 1000.347 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.170 | 0.105 | 0.000 | 0.170 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001be5 | 1001.297 | 3.887 | n/a | 0.000 | 0.000 | 0.323 | 996.912 | 0.015 | n/a | 0.039 | 0.000 | n/a | n/a | 0.121 | 3.887 | 0.004 | 0.121 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bac | 1001.063 | 2.407 | n/a | 0.000 | 0.000 | 0.902 | 997.651 | 0.002 | n/a | 0.029 | 0.000 | n/a | n/a | 0.071 | 2.407 | 0.002 | 0.071 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c00 | 1000.658 | 4.823 | n/a | 0.000 | 0.000 | 0.549 | 995.152 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.107 | 4.823 | 0.005 | 0.107 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001baf | 999.939 | 2.949 | n/a | 0.000 | 0.000 | 0.352 | 996.529 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.067 | 2.949 | 0.003 | 0.067 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bd6 | 999.173 | 2.842 | n/a | 0.000 | 0.000 | 0.399 | 995.829 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.069 | 2.842 | 0.003 | 0.069 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bde | 994.574 | 2.196 | n/a | 0.000 | 0.000 | 0.303 | 991.986 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.062 | 2.196 | 0.002 | 0.062 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c12 | 993.948 | 3.779 | n/a | 0.000 | 0.000 | 0.449 | 989.613 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.074 | 3.779 | 0.004 | 0.074 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bf6 | 993.878 | 4.421 | n/a | 0.000 | 0.000 | 0.961 | 988.383 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.061 | 4.421 | 0.004 | 0.061 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bdd | 993.015 | 2.325 | n/a | 0.000 | 0.000 | 0.324 | 990.263 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.064 | 2.325 | 0.002 | 0.064 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001be4 | 988.500 | 2.525 | n/a | 0.000 | 0.000 | 0.437 | 985.415 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.069 | 2.525 | 0.003 | 0.069 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bd5 | 958.374 | 2.311 | n/a | 0.000 | 0.000 | 0.593 | 955.286 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.155 | 2.311 | 0.002 | 0.155 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b80 | 884.906 | 4.449 | n/a | 0.000 | 0.000 | 0.620 | 879.689 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.124 | 4.449 | 0.005 | 0.124 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c05 | 868.096 | 3.793 | n/a | 0.000 | 0.000 | 0.496 | 863.702 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.064 | 3.793 | 0.004 | 0.064 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001beb | 859.790 | 2.666 | n/a | 0.000 | 0.000 | 0.365 | 856.627 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.089 | 2.666 | 0.003 | 0.089 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001bec | 856.224 | 3.703 | n/a | 0.000 | 0.000 | 0.482 | 851.946 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 0.069 | 3.703 | 0.004 | 0.069 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ba9 | 844.768 | 2.558 | n/a | 0.000 | 0.000 | 1.018 | 841.083 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.078 | 2.558 | 0.003 | 0.078 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001b9f | 841.870 | 11.231 | n/a | 0.606 | 0.000 | 0.955 | 828.720 | 0.016 | n/a | 0.039 | 0.000 | n/a | n/a | 0.302 | 11.837 | 0.014 | 0.302 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 384.757 | n/a | n/a | n/a | 2.843 | n/a | 0.000 | 0.000 | 0.421 | 375.009 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.107 | 2.843 | 0.009 | 0.107 |
| p99 | 1004.359 | n/a | n/a | n/a | 15.436 | n/a | 2.208 | 0.000 | 3.063 | 1001.544 | 0.087 | n/a | 0.059 | 0.000 | n/a | n/a | 47.438 | 16.257 | 0.796 | 47.438 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001c18 | 1004.359 | 2.408 | n/a | 0.000 | 0.000 | 0.318 | 1001.514 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.075 | 2.408 | 0.002 | 0.075 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c64 | 1004.327 | 2.286 | n/a | 0.000 | 0.000 | 0.344 | 1001.544 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.110 | 2.286 | 0.002 | 0.110 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c38 | 1003.740 | 2.444 | n/a | 0.000 | 0.000 | 0.379 | 1000.739 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.138 | 2.444 | 0.002 | 0.138 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c9d | 1002.979 | 0.088 | n/a | 0.000 | 0.000 | 0.315 | 1001.419 | 0.015 | n/a | 0.054 | 0.000 | n/a | n/a | 1.088 | 0.088 | 0.000 | 1.088 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c16 | 1002.226 | 0.146 | n/a | 0.000 | 0.000 | 0.434 | 1000.483 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 1.113 | 0.146 | 0.000 | 1.113 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c8a | 1002.135 | 0.100 | n/a | 0.000 | 0.000 | 0.395 | 1000.522 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 1.093 | 0.100 | 0.000 | 1.093 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c94 | 1001.272 | 5.212 | n/a | 0.000 | 0.000 | 0.463 | 995.389 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.177 | 5.212 | 0.005 | 0.177 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c41 | 1000.857 | 0.086 | n/a | 0.000 | 0.000 | 0.289 | 1000.403 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.040 | 0.086 | 0.000 | 0.040 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c57 | 1000.250 | 3.992 | n/a | 0.000 | 0.000 | 0.604 | 995.552 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.065 | 3.992 | 0.004 | 0.065 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c2c | 1000.141 | 2.611 | n/a | 0.000 | 0.000 | 0.320 | 996.999 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.183 | 2.611 | 0.003 | 0.183 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c98 | 999.647 | 2.257 | n/a | 0.000 | 0.000 | 0.325 | 996.977 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.057 | 2.257 | 0.002 | 0.057 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c9c | 998.090 | 2.815 | n/a | 0.000 | 0.000 | 0.344 | 994.843 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.058 | 2.815 | 0.003 | 0.058 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c43 | 995.481 | 2.476 | n/a | 0.000 | 0.000 | 3.063 | 989.836 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.068 | 2.476 | 0.002 | 0.068 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c63 | 992.995 | 4.547 | n/a | 0.000 | 0.000 | 0.614 | 987.725 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.072 | 4.547 | 0.005 | 0.072 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c37 | 989.556 | 2.327 | n/a | 0.000 | 0.000 | 2.767 | 984.365 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.053 | 2.327 | 0.002 | 0.053 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c9a | 978.299 | 2.266 | n/a | 0.000 | 0.000 | 0.333 | 975.571 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.106 | 2.266 | 0.002 | 0.106 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c2b | 977.256 | 4.700 | n/a | 0.000 | 0.000 | 0.613 | 971.821 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.078 | 4.700 | 0.005 | 0.078 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c60 | 963.038 | 7.862 | n/a | 0.000 | 0.000 | 0.654 | 954.382 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.104 | 7.862 | 0.008 | 0.104 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c78 | 951.081 | 3.882 | n/a | 0.000 | 0.000 | 0.786 | 946.271 | 0.002 | n/a | 0.032 | 0.000 | n/a | n/a | 0.107 | 3.882 | 0.004 | 0.107 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001c8c | 948.949 | 3.581 | n/a | 0.000 | 0.000 | 2.870 | 942.353 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.120 | 3.581 | 0.004 | 0.120 | gw-r/thread-43/journal/page | none observed |

## P3 / recovery / internal (140 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 315.055 | n/a | n/a | n/a | 3.241 | n/a | 0.000 | 0.000 | 0.460 | 303.238 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.102 | 3.241 | 0.013 | 0.102 |
| p99 | 1004.728 | n/a | n/a | n/a | 14.854 | n/a | 1.378 | 0.000 | 3.140 | 1000.537 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 27.459 | 15.209 | 0.649 | 27.459 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001ce8 | 1008.247 | 0.162 | n/a | 0.000 | 0.000 | 3.581 | 1001.128 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 3.305 | 0.162 | 0.000 | 3.305 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d42 | 1004.728 | 4.327 | n/a | 0.000 | 0.000 | 0.514 | 999.751 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.105 | 4.327 | 0.004 | 0.105 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001cb3 | 1004.637 | 5.182 | n/a | 0.000 | 0.000 | 0.538 | 998.709 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.153 | 5.182 | 0.005 | 0.153 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d6e | 1003.509 | 5.136 | n/a | 0.000 | 0.000 | 0.440 | 997.780 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.120 | 5.136 | 0.005 | 0.120 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001cd7 | 1003.327 | 2.356 | n/a | 0.000 | 0.000 | 0.346 | 1000.537 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.062 | 2.356 | 0.002 | 0.062 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ce7 | 1003.295 | 2.811 | n/a | 0.000 | 0.000 | 0.306 | 1000.065 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.085 | 2.811 | 0.003 | 0.085 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d73 | 1003.271 | 4.684 | n/a | 0.000 | 0.000 | 0.503 | 997.949 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.100 | 4.684 | 0.005 | 0.100 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001cc0 | 1003.031 | 3.075 | n/a | 0.000 | 0.000 | 0.536 | 999.328 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.063 | 3.075 | 0.003 | 0.063 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d56 | 1002.385 | 0.142 | n/a | 0.000 | 0.000 | 0.537 | 1000.515 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 1.148 | 0.142 | 0.000 | 1.148 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d09 | 1002.312 | 0.074 | n/a | 0.000 | 0.000 | 0.460 | 1000.466 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 1.268 | 0.074 | 0.000 | 1.268 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d1a | 1001.624 | 2.446 | n/a | 0.000 | 0.000 | 1.889 | 997.200 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.063 | 2.446 | 0.002 | 0.063 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d2b | 1001.135 | 2.357 | n/a | 0.000 | 0.000 | 0.497 | 998.192 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.055 | 2.357 | 0.002 | 0.055 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d72 | 1000.780 | 4.583 | n/a | 0.000 | 0.000 | 0.408 | 995.684 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.070 | 4.583 | 0.005 | 0.070 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d55 | 998.571 | 2.132 | n/a | 0.000 | 0.000 | 0.536 | 995.820 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.051 | 2.132 | 0.002 | 0.051 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d7a | 997.204 | 2.302 | n/a | 0.000 | 0.000 | 0.549 | 994.241 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.054 | 2.302 | 0.002 | 0.054 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d6f | 996.577 | 1.977 | n/a | 0.000 | 0.000 | 0.474 | 994.008 | 0.009 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 1.977 | 0.002 | 0.070 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d13 | 993.262 | 2.277 | n/a | 0.000 | 0.000 | 0.437 | 990.431 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.277 | 0.002 | 0.070 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001cef | 993.002 | 2.202 | n/a | 0.000 | 0.000 | 0.427 | 990.270 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.066 | 2.202 | 0.002 | 0.066 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d4b | 991.732 | 5.107 | n/a | 0.000 | 0.000 | 0.407 | 986.068 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.124 | 5.107 | 0.005 | 0.124 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d79 | 987.986 | 2.434 | n/a | 0.000 | 0.000 | 0.416 | 985.047 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.060 | 2.434 | 0.002 | 0.060 | gw-r/thread-71/journal/page | none observed |

## P3 / p4mix / internal (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 354.748 | n/a | n/a | n/a | 3.458 | n/a | 0.000 | 0.000 | 0.495 | 351.238 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.090 | 3.601 | 0.011 | 0.090 |
| p99 | 1003.900 | n/a | n/a | n/a | 11.417 | n/a | 1.615 | 0.000 | 2.963 | 1000.636 | 0.198 | n/a | 0.057 | 0.000 | n/a | n/a | 32.921 | 12.144 | 0.751 | 32.921 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001da3 | 1004.926 | 3.048 | n/a | 0.000 | 0.000 | 0.379 | 1001.373 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.073 | 3.048 | 0.003 | 0.073 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001dd5 | 1003.900 | 3.458 | n/a | 0.000 | 0.000 | 0.646 | 999.639 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.115 | 3.458 | 0.003 | 0.115 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e05 | 1002.518 | 0.196 | n/a | 0.000 | 0.000 | 0.677 | 1000.480 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 1.120 | 0.196 | 0.000 | 1.120 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d7b | 1002.382 | 0.086 | n/a | 0.000 | 0.000 | 0.488 | 1000.636 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 1.119 | 0.086 | 0.000 | 1.119 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e12 | 1002.372 | 0.148 | n/a | 0.000 | 0.000 | 0.614 | 1000.493 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 1.082 | 0.148 | 0.000 | 1.082 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ddd | 1002.118 | 0.130 | n/a | 0.000 | 0.000 | 0.405 | 1000.447 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 1.097 | 0.130 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d8d | 1001.911 | 0.102 | n/a | 0.000 | 0.000 | 0.318 | 1000.392 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 1.056 | 0.102 | 0.000 | 1.056 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d7e | 1000.049 | 3.224 | n/a | 0.000 | 0.000 | 0.633 | 996.098 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.070 | 3.224 | 0.003 | 0.070 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001dba | 1000.048 | 5.743 | n/a | 0.000 | 0.000 | 0.773 | 993.402 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.080 | 5.743 | 0.006 | 0.080 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d7f | 999.287 | 2.309 | n/a | 0.000 | 0.000 | 0.281 | 996.594 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 2.309 | 0.002 | 0.059 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e1a | 999.046 | 2.319 | n/a | 0.000 | 0.000 | 0.408 | 996.220 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.071 | 2.319 | 0.002 | 0.071 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d7d | 996.546 | 4.027 | n/a | 0.000 | 0.000 | 0.452 | 991.917 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.114 | 4.027 | 0.004 | 0.114 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d80 | 991.973 | 6.355 | n/a | 0.000 | 0.000 | 0.829 | 984.486 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.237 | 6.355 | 0.006 | 0.237 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001dc5 | 991.252 | 3.229 | n/a | 0.000 | 0.000 | 0.488 | 987.440 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.067 | 3.229 | 0.003 | 0.067 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d9d | 920.105 | 7.640 | n/a | 1.220 | 0.000 | 1.055 | 910.026 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.131 | 8.860 | 0.010 | 0.131 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001da8 | 874.319 | 5.234 | n/a | 0.000 | 0.000 | 0.681 | 868.302 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.073 | 5.234 | 0.006 | 0.073 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001da2 | 871.875 | 2.811 | n/a | 0.000 | 0.000 | 0.336 | 868.655 | 0.002 | n/a | 0.010 | 0.000 | n/a | n/a | 0.061 | 2.811 | 0.003 | 0.061 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ddf | 866.672 | 4.673 | n/a | 0.000 | 0.000 | 1.553 | 860.314 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.087 | 4.673 | 0.005 | 0.087 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001d95 | 845.927 | 5.092 | n/a | 1.286 | 0.000 | 1.007 | 838.380 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.125 | 6.378 | 0.008 | 0.125 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e14 | 819.429 | 2.371 | n/a | 0.000 | 0.000 | 0.342 | 816.617 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.371 | 0.003 | 0.063 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h1 / internal (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 441.687 | n/a | n/a | n/a | 3.183 | n/a | 0.000 | 0.000 | 0.420 | 438.023 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.097 | 3.183 | 0.010 | 0.097 |
| p99 | 1006.338 | n/a | n/a | n/a | 10.995 | n/a | 1.165 | 0.000 | 3.153 | 1000.965 | 0.076 | n/a | 0.089 | 0.000 | n/a | n/a | 49.081 | 12.074 | 0.820 | 49.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001ea7 | 1006.338 | 4.636 | n/a | 0.000 | 0.000 | 0.552 | 1000.965 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.157 | 4.636 | 0.005 | 0.157 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e3f | 1002.450 | 2.222 | n/a | 0.000 | 0.000 | 0.280 | 999.824 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.069 | 2.222 | 0.002 | 0.069 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e87 | 1002.310 | 0.106 | n/a | 0.000 | 0.000 | 0.413 | 1000.666 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 1.092 | 0.106 | 0.000 | 1.092 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e39 | 1002.190 | 0.120 | n/a | 0.000 | 0.000 | 0.470 | 1000.428 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.134 | 0.120 | 0.000 | 1.134 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e3b | 1001.781 | 4.541 | n/a | 0.000 | 0.000 | 0.534 | 996.550 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.102 | 4.541 | 0.005 | 0.102 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e86 | 1001.621 | 2.776 | n/a | 0.000 | 0.000 | 0.458 | 998.283 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.071 | 2.776 | 0.003 | 0.071 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e31 | 1001.209 | 0.114 | n/a | 0.000 | 0.000 | 0.308 | 1000.669 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.044 | 0.114 | 0.000 | 0.044 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e54 | 999.896 | 2.238 | n/a | 0.000 | 0.000 | 0.335 | 997.227 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.059 | 2.238 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e7e | 998.250 | 2.495 | n/a | 0.000 | 0.000 | 0.419 | 995.242 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.064 | 2.495 | 0.002 | 0.064 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e7f | 995.958 | 2.047 | n/a | 0.000 | 0.000 | 0.304 | 993.519 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.058 | 2.047 | 0.002 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e4a | 995.591 | 2.483 | n/a | 0.000 | 0.000 | 0.482 | 992.519 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.070 | 2.483 | 0.002 | 0.070 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e46 | 992.403 | 2.140 | n/a | 0.000 | 0.000 | 0.332 | 989.813 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.058 | 2.140 | 0.002 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e66 | 988.716 | 4.011 | n/a | 0.000 | 0.000 | 3.153 | 981.397 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.122 | 4.011 | 0.004 | 0.122 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e25 | 984.348 | 3.882 | n/a | 0.000 | 0.000 | 1.083 | 979.252 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.097 | 3.882 | 0.004 | 0.097 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e42 | 952.479 | 4.138 | n/a | 0.000 | 0.000 | 1.147 | 947.085 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.074 | 4.138 | 0.004 | 0.074 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e98 | 939.647 | 2.418 | n/a | 0.000 | 0.000 | 0.360 | 936.751 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.080 | 2.418 | 0.003 | 0.080 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e71 | 923.567 | 6.235 | n/a | 0.000 | 0.000 | 0.515 | 916.469 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.291 | 6.235 | 0.007 | 0.291 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e2b | 919.951 | 2.310 | n/a | 0.000 | 0.000 | 0.632 | 916.872 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.075 | 2.310 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e8d | 916.379 | 2.555 | n/a | 0.000 | 0.000 | 0.385 | 913.310 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.097 | 2.555 | 0.003 | 0.097 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001e89 | 883.800 | 2.552 | n/a | 0.000 | 0.000 | 1.666 | 879.402 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.151 | 2.552 | 0.003 | 0.151 | gw-r/thread-43/journal/page | none observed |

## P3 / grow3 / internal (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 747.504 | n/a | n/a | n/a | 7.812 | n/a | 0.000 | 0.000 | 0.885 | 159.153 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 1.610 | 7.812 | 0.539 | 1.610 |
| p99 | 1004.362 | n/a | n/a | n/a | 546.000 | n/a | 56.575 | 0.000 | 3.142 | 1000.651 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 27.059 | 580.221 | 0.829 | 27.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001eb8 | 1004.362 | 0.107 | n/a | 0.000 | 0.000 | 2.461 | 1000.651 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 1.090 | 0.107 | 0.000 | 1.090 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001eaf | 1002.317 | 0.117 | n/a | 0.000 | 0.000 | 0.454 | 1000.597 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.102 | 0.117 | 0.000 | 1.102 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ebd | 980.624 | 488.203 | n/a | 40.404 | 0.000 | 1.263 | 444.716 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 5.971 | 528.607 | 0.539 | 5.971 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001eb1 | 932.826 | 503.784 | n/a | 56.575 | 0.000 | 3.142 | 358.580 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 10.712 | 560.360 | 0.601 | 10.712 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001eb9 | 821.090 | 526.267 | n/a | 36.248 | 0.000 | 1.243 | 247.217 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 10.083 | 562.516 | 0.685 | 10.083 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001ec1 | 747.504 | 546.000 | n/a | 34.220 | 0.000 | 0.885 | 159.153 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 7.229 | 580.221 | 0.776 | 7.229 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001eb7 | 142.477 | 7.321 | n/a | 0.000 | 0.000 | 1.808 | 133.215 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.086 | 7.321 | 0.051 | 0.086 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001eae | 85.662 | 1.776 | n/a | 0.000 | 0.000 | 0.373 | 83.399 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.068 | 1.776 | 0.021 | 0.068 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001eb6 | 35.375 | 8.026 | n/a | 0.000 | 0.000 | 0.290 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 27.059 | 8.026 | 0.227 | 27.059 | node-14/thread-2/socket.wait-first-byte | none observed |
| c3a9aaa2c14b786a0000000000001ec0 | 9.678 | 7.812 | n/a | 0.000 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.610 | 7.812 | 0.807 | 1.610 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001eba | 9.110 | 6.459 | n/a | 1.093 | 0.000 | 0.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.356 | 7.552 | 0.829 | 1.356 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 363.362 | n/a | n/a | n/a | 3.291 | n/a | 0.000 | 0.000 | 0.424 | 360.232 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.085 | 3.291 | 0.011 | 0.085 |
| p99 | 1003.557 | n/a | n/a | n/a | 16.320 | n/a | 1.024 | 0.000 | 1.796 | 1000.942 | 0.131 | n/a | 0.051 | 0.000 | n/a | n/a | 48.776 | 17.294 | 0.734 | 48.776 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001f3f | 1003.938 | 2.083 | n/a | 0.000 | 0.000 | 0.351 | 1001.372 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.078 | 2.083 | 0.002 | 0.078 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f4e | 1003.557 | 4.302 | n/a | 0.000 | 0.000 | 0.496 | 998.585 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.101 | 4.302 | 0.004 | 0.101 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f2e | 1003.098 | 0.178 | n/a | 0.000 | 0.000 | 0.812 | 1000.942 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 1.119 | 0.178 | 0.000 | 1.119 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f45 | 1002.411 | 2.344 | n/a | 0.000 | 0.000 | 0.394 | 999.567 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.068 | 2.344 | 0.002 | 0.068 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f1f | 1002.142 | 0.117 | n/a | 0.000 | 0.000 | 0.424 | 1000.407 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 1.158 | 0.117 | 0.000 | 1.158 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f17 | 1001.961 | 0.114 | n/a | 0.000 | 0.000 | 0.427 | 1000.303 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 1.091 | 0.114 | 0.000 | 1.091 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f50 | 1001.010 | 5.266 | n/a | 0.000 | 0.000 | 1.059 | 994.549 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.091 | 5.266 | 0.005 | 0.091 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f37 | 998.727 | 3.410 | n/a | 0.000 | 0.000 | 0.510 | 994.726 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.047 | 3.410 | 0.003 | 0.047 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f4f | 998.491 | 4.338 | n/a | 0.000 | 0.000 | 0.620 | 993.385 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.114 | 4.338 | 0.004 | 0.114 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f3b | 998.197 | 4.380 | n/a | 0.000 | 0.000 | 0.573 | 993.124 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.092 | 4.380 | 0.004 | 0.092 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ef9 | 997.771 | 4.895 | n/a | 0.000 | 0.000 | 0.552 | 992.223 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.066 | 4.895 | 0.005 | 0.066 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ec5 | 997.502 | 2.734 | n/a | 0.000 | 0.000 | 0.278 | 994.377 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.071 | 2.734 | 0.003 | 0.071 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f30 | 992.913 | 2.363 | n/a | 0.000 | 0.000 | 0.378 | 990.085 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.055 | 2.363 | 0.002 | 0.055 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f19 | 992.561 | 2.209 | n/a | 0.000 | 0.000 | 0.324 | 989.944 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.057 | 2.209 | 0.002 | 0.057 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ec4 | 986.125 | 2.334 | n/a | 0.000 | 0.000 | 0.337 | 983.368 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.048 | 2.334 | 0.002 | 0.048 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f23 | 941.622 | 2.158 | n/a | 0.000 | 0.000 | 0.713 | 938.666 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.047 | 2.158 | 0.002 | 0.047 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ee7 | 886.097 | 6.246 | n/a | 0.000 | 0.000 | 0.439 | 879.191 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.191 | 6.246 | 0.007 | 0.191 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ee1 | 878.927 | 2.402 | n/a | 0.000 | 0.000 | 0.340 | 876.108 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.053 | 2.402 | 0.003 | 0.053 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f34 | 836.998 | 1.906 | n/a | 0.000 | 0.000 | 0.481 | 834.497 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.085 | 1.906 | 0.002 | 0.085 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001efa | 817.691 | 2.618 | n/a | 0.000 | 0.000 | 0.469 | 814.476 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 2.618 | 0.003 | 0.087 | gw-r/thread-65/journal/page | none observed |

## P3 / grow10 / internal (18 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 630.634 | n/a | n/a | n/a | 479.973 | n/a | 38.171 | 0.000 | 1.136 | 58.144 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 6.924 | 522.552 | 0.736 | 6.924 |
| p99 | 1133.375 | n/a | n/a | n/a | 575.915 | n/a | 63.620 | 0.000 | 3.644 | 616.490 | 0.786 | n/a | 0.037 | 0.000 | n/a | n/a | 55.535 | 610.597 | 0.910 | 55.535 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000001f61 | 1133.375 | 477.666 | n/a | 30.138 | 0.000 | 1.150 | 616.490 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 7.906 | 507.803 | 0.448 | 7.906 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f64 | 872.553 | 544.200 | n/a | 39.680 | 0.000 | 3.644 | 271.007 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 13.984 | 583.880 | 0.669 | 13.984 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f76 | 865.662 | 519.998 | n/a | 42.384 | 0.000 | 2.129 | 293.821 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 7.292 | 562.383 | 0.650 | 7.292 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f70 | 749.735 | 557.466 | n/a | 40.694 | 0.000 | 1.148 | 138.191 | 0.607 | n/a | 0.017 | 0.000 | n/a | n/a | 11.612 | 598.160 | 0.798 | 11.612 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f75 | 712.822 | 479.973 | n/a | 38.844 | 0.000 | 0.950 | 185.931 | 0.016 | n/a | 0.029 | 0.000 | n/a | n/a | 7.078 | 518.818 | 0.728 | 7.078 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f6d | 709.886 | 484.630 | n/a | 37.923 | 0.000 | 1.136 | 178.782 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 7.375 | 522.552 | 0.736 | 7.375 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f65 | 678.991 | 575.915 | n/a | 34.682 | 0.000 | 2.333 | 58.144 | 0.005 | n/a | 0.005 | 0.000 | n/a | n/a | 7.907 | 610.597 | 0.899 | 7.907 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f78 | 668.421 | 513.087 | n/a | 51.448 | 0.000 | 0.971 | 96.372 | 0.786 | n/a | 0.030 | 0.000 | n/a | n/a | 5.726 | 564.535 | 0.845 | 5.726 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f71 | 645.193 | 516.256 | n/a | 42.557 | 0.000 | 0.584 | 79.088 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 6.700 | 558.813 | 0.866 | 6.700 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f67 | 630.634 | 510.053 | n/a | 63.620 | 0.000 | 1.426 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 55.535 | 573.673 | 0.910 | 55.535 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f7a | 629.596 | 509.684 | n/a | 45.376 | 0.000 | 1.453 | 66.689 | 0.007 | n/a | 0.010 | 0.000 | n/a | n/a | 6.376 | 555.060 | 0.882 | 6.376 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f73 | 582.098 | 476.958 | n/a | 38.171 | 0.000 | 2.252 | 57.782 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 6.924 | 515.130 | 0.885 | 6.924 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f79 | 579.752 | 479.360 | n/a | 46.343 | 0.000 | 1.351 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 52.698 | 525.703 | 0.907 | 52.698 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f6b | 13.570 | 11.969 | n/a | 0.000 | 0.000 | 0.219 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.382 | 11.969 | 0.882 | 1.382 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f6e | 11.779 | 7.041 | n/a | 1.437 | 0.000 | 0.227 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.075 | 8.478 | 0.720 | 3.075 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f63 | 4.950 | 3.351 | n/a | 0.000 | 0.000 | 0.216 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.382 | 3.351 | 0.677 | 1.382 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f74 | 3.693 | 2.194 | n/a | 0.000 | 0.000 | 0.236 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.264 | 2.194 | 0.594 | 1.264 | node-14/thread-2/replica.fetch-feed | none observed |
| c3a9aaa2c14b786a0000000000001f77 | 3.214 | 2.190 | n/a | 0.000 | 0.000 | 0.213 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.811 | 2.190 | 0.682 | 0.811 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 423.282 | n/a | n/a | n/a | 2.534 | n/a | 0.000 | 0.000 | 0.413 | 416.190 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.059 | 2.534 | 0.007 | 0.059 |
| p99 | 1004.006 | n/a | n/a | n/a | 28.515 | n/a | 1.720 | 0.000 | 3.225 | 1000.603 | 0.121 | n/a | 0.052 | 0.000 | n/a | n/a | 37.220 | 30.178 | 0.602 | 37.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000002009 | 1004.006 | 4.078 | n/a | 0.000 | 0.000 | 1.125 | 998.723 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.052 | 4.078 | 0.004 | 0.052 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fce | 1003.010 | 2.502 | n/a | 0.000 | 0.000 | 0.381 | 1000.042 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.056 | 2.502 | 0.002 | 0.056 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ff3 | 1002.375 | 0.230 | n/a | 0.000 | 0.000 | 0.545 | 1000.462 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 1.107 | 0.230 | 0.000 | 1.107 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fbc | 1002.219 | 2.404 | n/a | 0.000 | 0.000 | 2.749 | 996.989 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.051 | 2.404 | 0.002 | 0.051 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fa5 | 1002.112 | 2.147 | n/a | 0.000 | 0.000 | 0.439 | 999.442 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.048 | 2.147 | 0.002 | 0.048 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001f9b | 1002.109 | 0.098 | n/a | 0.000 | 0.000 | 0.269 | 1000.603 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 1.082 | 0.098 | 0.000 | 1.082 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fea | 1002.094 | 0.107 | n/a | 0.000 | 0.000 | 0.443 | 1000.416 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 1.086 | 0.107 | 0.000 | 1.086 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ffd | 1001.762 | 2.526 | n/a | 0.000 | 0.000 | 0.403 | 998.749 | 0.005 | n/a | 0.021 | 0.000 | n/a | n/a | 0.058 | 2.526 | 0.003 | 0.058 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002002 | 1001.761 | 2.534 | n/a | 0.000 | 0.000 | 0.419 | 998.723 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.052 | 2.534 | 0.003 | 0.052 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fc2 | 1001.033 | 3.639 | n/a | 0.000 | 0.000 | 0.450 | 996.866 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.050 | 3.639 | 0.004 | 0.050 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fbb | 997.674 | 2.738 | n/a | 0.000 | 0.000 | 0.380 | 994.424 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.081 | 2.738 | 0.003 | 0.081 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fec | 996.350 | 2.219 | n/a | 0.000 | 0.000 | 0.315 | 993.725 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.054 | 2.219 | 0.002 | 0.054 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fa3 | 996.332 | 2.259 | n/a | 0.000 | 0.000 | 0.349 | 993.616 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.050 | 2.259 | 0.002 | 0.050 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fdb | 995.828 | 2.089 | n/a | 0.000 | 0.000 | 0.381 | 993.252 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.089 | 0.002 | 0.061 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ffe | 994.450 | 2.079 | n/a | 0.000 | 0.000 | 0.279 | 992.000 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.047 | 2.079 | 0.002 | 0.047 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fb7 | 993.384 | 2.175 | n/a | 0.000 | 0.000 | 0.495 | 990.629 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.052 | 2.175 | 0.002 | 0.052 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fa4 | 992.458 | 2.146 | n/a | 0.000 | 0.000 | 0.409 | 989.808 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.050 | 2.146 | 0.002 | 0.050 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001ff7 | 967.039 | 2.566 | n/a | 0.000 | 0.000 | 0.378 | 964.015 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.056 | 2.566 | 0.003 | 0.056 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fa7 | 965.963 | 2.085 | n/a | 0.000 | 0.000 | 0.404 | 963.395 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.052 | 2.085 | 0.002 | 0.052 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000001fef | 961.355 | 2.527 | n/a | 0.000 | 0.000 | 0.365 | 958.378 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.052 | 2.527 | 0.003 | 0.052 | gw-r/thread-71/journal/page | none observed |

## P3 / presweep / internal (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 391.775 | n/a | n/a | n/a | 3.127 | n/a | 0.000 | 0.000 | 0.410 | 386.874 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.062 | 3.127 | 0.009 | 0.062 |
| p99 | 1000.996 | n/a | n/a | n/a | 9.796 | n/a | 1.552 | 0.000 | 2.083 | 998.464 | 0.062 | n/a | 0.059 | 0.000 | n/a | n/a | 38.008 | 11.881 | 0.716 | 38.008 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000002042 | 1001.495 | 2.244 | n/a | 0.000 | 0.000 | 0.396 | 998.773 | 0.002 | n/a | 0.024 | 0.000 | n/a | n/a | 0.056 | 2.244 | 0.002 | 0.056 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002060 | 1000.996 | 2.343 | n/a | 0.000 | 0.000 | 0.341 | 998.234 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.052 | 2.343 | 0.002 | 0.052 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002021 | 1000.974 | 2.131 | n/a | 0.000 | 0.000 | 0.270 | 998.464 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.048 | 2.131 | 0.002 | 0.048 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002041 | 999.850 | 3.927 | n/a | 0.000 | 0.000 | 0.367 | 995.442 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.083 | 3.927 | 0.004 | 0.083 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a000000000000200d | 998.710 | 2.110 | n/a | 0.000 | 0.000 | 0.368 | 996.160 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.043 | 2.110 | 0.002 | 0.043 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a000000000000204b | 997.954 | 3.691 | n/a | 0.000 | 0.000 | 0.526 | 993.640 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.058 | 3.691 | 0.004 | 0.058 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002013 | 997.389 | 4.335 | n/a | 0.000 | 0.000 | 0.492 | 992.459 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.077 | 4.335 | 0.004 | 0.077 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000207f | 995.556 | 4.801 | n/a | 0.000 | 0.000 | 0.334 | 990.258 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.113 | 4.801 | 0.005 | 0.113 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a000000000000202d | 995.088 | 2.842 | n/a | 0.000 | 0.000 | 0.464 | 991.672 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.079 | 2.842 | 0.003 | 0.079 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002099 | 994.229 | 4.115 | n/a | 0.000 | 0.000 | 0.529 | 989.467 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.085 | 4.115 | 0.004 | 0.085 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002093 | 992.542 | 2.230 | n/a | 0.000 | 0.000 | 0.429 | 989.794 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.060 | 2.230 | 0.002 | 0.060 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a000000000000209f | 986.486 | 2.058 | n/a | 0.000 | 0.000 | 0.430 | 983.870 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.062 | 2.058 | 0.002 | 0.062 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a000000000000201c | 892.311 | 2.205 | n/a | 0.000 | 0.000 | 0.397 | 889.630 | 0.007 | n/a | 0.020 | 0.000 | n/a | n/a | 0.052 | 2.205 | 0.002 | 0.052 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002072 | 851.172 | 3.225 | n/a | 0.000 | 0.000 | 0.878 | 846.945 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.086 | 3.225 | 0.004 | 0.086 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002061 | 813.110 | 1.491 | n/a | 0.000 | 0.000 | 0.307 | 811.234 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.051 | 1.491 | 0.002 | 0.051 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002018 | 811.413 | 3.127 | n/a | 0.000 | 0.000 | 0.308 | 807.904 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.051 | 3.127 | 0.004 | 0.051 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002090 | 808.806 | 3.204 | n/a | 0.000 | 0.000 | 0.596 | 804.909 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.058 | 3.204 | 0.004 | 0.058 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000208e | 789.391 | 2.137 | n/a | 0.000 | 0.000 | 0.302 | 786.862 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.047 | 2.137 | 0.003 | 0.047 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002048 | 755.825 | 3.619 | n/a | 0.000 | 0.000 | 0.481 | 751.584 | 0.036 | n/a | 0.046 | 0.000 | n/a | n/a | 0.059 | 3.619 | 0.005 | 0.059 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002022 | 726.030 | 5.539 | n/a | 0.000 | 0.000 | 0.414 | 719.793 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.219 | 5.539 | 0.008 | 0.219 | gw-r/thread-71/journal/page | none observed |

## P3 / sweep / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 439.769 | n/a | n/a | n/a | 3.111 | n/a | 0.000 | 0.000 | 0.449 | 432.564 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.088 | 3.708 | 0.011 | 0.088 |
| p99 | 1004.376 | n/a | n/a | n/a | 15.719 | n/a | 2.902 | 0.000 | 3.358 | 1001.340 | 0.149 | n/a | 0.127 | 0.000 | n/a | n/a | 50.619 | 17.404 | 0.847 | 50.619 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a00000000000020eb | 1004.376 | 2.540 | n/a | 0.000 | 0.000 | 0.348 | 1001.340 | 0.021 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 2.540 | 0.003 | 0.078 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020a5 | 1003.264 | 4.260 | n/a | 0.000 | 0.000 | 0.489 | 998.354 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.093 | 4.260 | 0.004 | 0.093 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020e2 | 1003.123 | 2.814 | n/a | 0.000 | 0.000 | 0.313 | 999.883 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.071 | 2.814 | 0.003 | 0.071 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020d8 | 1003.117 | 0.125 | n/a | 0.000 | 0.000 | 0.689 | 1001.053 | 0.023 | n/a | 0.127 | 0.000 | n/a | n/a | 1.099 | 0.125 | 0.000 | 1.099 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a000000000000211a | 1002.982 | 2.206 | n/a | 0.000 | 0.000 | 0.381 | 1000.206 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.120 | 2.206 | 0.002 | 0.120 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000211b | 1002.387 | 2.468 | n/a | 0.000 | 0.000 | 0.302 | 999.434 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.151 | 2.468 | 0.002 | 0.151 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020d6 | 1001.964 | 3.944 | n/a | 0.000 | 0.000 | 0.463 | 997.448 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.079 | 3.944 | 0.004 | 0.079 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020f8 | 1001.228 | 3.213 | n/a | 0.000 | 0.000 | 0.961 | 996.945 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.069 | 3.213 | 0.003 | 0.069 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020e4 | 999.716 | 2.636 | n/a | 0.000 | 0.000 | 3.358 | 993.632 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.060 | 2.636 | 0.003 | 0.060 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020d7 | 999.694 | 3.035 | n/a | 1.029 | 0.000 | 0.395 | 995.146 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.062 | 4.064 | 0.004 | 0.062 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020e3 | 998.266 | 2.983 | n/a | 1.061 | 0.000 | 0.413 | 993.705 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.069 | 4.044 | 0.004 | 0.069 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020f7 | 996.850 | 2.622 | n/a | 1.086 | 0.000 | 0.715 | 992.303 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.088 | 3.708 | 0.004 | 0.088 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020f4 | 965.118 | 3.524 | n/a | 0.000 | 0.000 | 0.388 | 961.111 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.074 | 3.524 | 0.004 | 0.074 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020b7 | 942.347 | 2.896 | n/a | 0.000 | 0.000 | 0.257 | 939.020 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.136 | 2.896 | 0.003 | 0.136 | gw-r/thread-45/journal/page | none observed |
| c3a9aaa2c14b786a000000000000210a | 938.208 | 9.998 | n/a | 1.262 | 0.000 | 0.600 | 926.236 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.083 | 11.260 | 0.012 | 0.083 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a000000000000210d | 922.396 | 15.359 | n/a | 0.000 | 0.000 | 0.742 | 905.857 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.407 | 15.359 | 0.017 | 0.407 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020c9 | 860.100 | 3.624 | n/a | 0.913 | 0.000 | 0.638 | 854.712 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.172 | 4.537 | 0.005 | 0.172 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020ba | 857.886 | 3.916 | n/a | 0.000 | 0.000 | 0.350 | 853.530 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.058 | 3.916 | 0.005 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002131 | 854.783 | 3.080 | n/a | 0.000 | 0.000 | 0.443 | 851.166 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.064 | 3.080 | 0.004 | 0.064 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a00000000000020c4 | 850.988 | 3.548 | n/a | 0.863 | 0.000 | 0.530 | 845.922 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.083 | 4.411 | 0.005 | 0.083 | gw-r/thread-71/journal/page | none observed |

## P3 / tail / internal (3184 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.129 | n/a | n/a | n/a | 4.433 | n/a | 0.000 | 0.000 | 0.209 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.572 | 4.487 | 0.375 | 4.572 |
| p99 | 1000.380 | n/a | n/a | n/a | 24.269 | n/a | 2.726 | 0.000 | 2.367 | 996.293 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 46.542 | 26.483 | 0.873 | 46.542 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a9aaa2c14b786a0000000000002190 | 1005.322 | 4.210 | n/a | 0.000 | 0.000 | 0.440 | 1000.521 | 0.008 | n/a | 0.033 | 0.000 | n/a | n/a | 0.110 | 4.210 | 0.004 | 0.110 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003abf | 1005.139 | 2.771 | n/a | 0.000 | 0.000 | 0.713 | 1001.529 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.064 | 2.771 | 0.003 | 0.064 | gw-r/thread-75/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003a0a | 1005.126 | 3.986 | n/a | 0.000 | 0.000 | 0.431 | 1000.617 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.062 | 3.986 | 0.004 | 0.062 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002155 | 1004.695 | 3.717 | n/a | 0.000 | 0.000 | 0.806 | 1000.040 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.098 | 3.717 | 0.004 | 0.098 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a00000000000039f9 | 1003.926 | 0.125 | n/a | 0.000 | 0.000 | 2.132 | 1000.496 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 1.129 | 0.125 | 0.000 | 1.129 | gw-r/thread-75/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003ad2 | 1003.651 | 2.456 | n/a | 0.000 | 0.000 | 0.455 | 1000.631 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 2.456 | 0.002 | 0.068 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003b02 | 1003.615 | 2.776 | n/a | 0.000 | 0.000 | 0.434 | 1000.306 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.068 | 2.776 | 0.003 | 0.068 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003a21 | 1003.489 | 3.150 | n/a | 0.000 | 0.000 | 0.588 | 999.643 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.064 | 3.150 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000039e8 | 1003.207 | 3.435 | n/a | 0.000 | 0.000 | 0.382 | 999.259 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 3.435 | 0.003 | 0.080 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003a74 | 1003.206 | 2.564 | n/a | 0.000 | 0.000 | 0.412 | 1000.094 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.074 | 2.564 | 0.003 | 0.074 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a000000000000218b | 1003.104 | 2.826 | n/a | 0.000 | 0.000 | 0.473 | 999.713 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.066 | 2.826 | 0.003 | 0.066 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003aaf | 1003.103 | 4.119 | n/a | 0.000 | 0.000 | 0.554 | 998.324 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.067 | 4.119 | 0.004 | 0.067 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003ada | 1003.083 | 0.098 | n/a | 0.000 | 0.000 | 0.416 | 1001.382 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 1.147 | 0.098 | 0.000 | 1.147 | gw-r/thread-65/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003ab5 | 1002.759 | 0.173 | n/a | 0.000 | 0.000 | 0.698 | 1000.664 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 1.163 | 0.173 | 0.000 | 1.163 | gw-r/thread-44/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003a2d | 1002.701 | 0.092 | n/a | 0.000 | 0.000 | 0.514 | 1000.856 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 1.176 | 0.092 | 0.000 | 1.176 | gw-r/thread-71/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003b17 | 1002.375 | 0.144 | n/a | 0.000 | 0.000 | 0.426 | 1000.640 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 1.089 | 0.144 | 0.000 | 1.089 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003aa8 | 1002.317 | 0.101 | n/a | 0.000 | 0.000 | 0.428 | 1000.631 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 1.093 | 0.101 | 0.000 | 1.093 | gw-r/thread-47/journal/page | none observed |
| c3a9aaa2c14b786a00000000000039f4 | 1002.263 | 6.181 | n/a | 0.000 | 0.000 | 0.557 | 995.407 | 0.007 | n/a | 0.027 | 0.000 | n/a | n/a | 0.084 | 6.181 | 0.006 | 0.084 | gw-r/thread-48/journal/page | none observed |
| c3a9aaa2c14b786a0000000000002196 | 1002.207 | 0.131 | n/a | 0.000 | 0.000 | 0.403 | 1000.526 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 1.099 | 0.131 | 0.000 | 1.099 | gw-r/thread-43/journal/page | none observed |
| c3a9aaa2c14b786a0000000000003a6b | 1002.197 | 0.131 | n/a | 0.000 | 0.000 | 0.420 | 1000.494 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 1.104 | 0.131 | 0.000 | 1.104 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.360 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 200.980 | 0.014 | n/a | 0.113 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 209.718 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.387 | 206.991 | 26.158 | n/a | 2.535 | 0.000 | n/a | n/a | 49.710 | 0.000 | 0.000 | 49.710 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c000000000000000d | 209.718 | 0.000 | n/a | 0.000 | 0.000 | 5.387 | 203.996 | 0.014 | n/a | 0.144 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000052 | 207.955 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 206.991 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-41/journal/page | none observed |
| bc97183a5092a68c0000000000000032 | 206.285 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 204.946 | 0.026 | n/a | 0.233 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000016 | 206.065 | 0.000 | n/a | 0.000 | 0.000 | 3.672 | 202.160 | 0.013 | n/a | 0.124 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-41/journal/page | none observed |
| bc97183a5092a68c0000000000000030 | 205.794 | 0.000 | n/a | 0.000 | 0.000 | 3.805 | 201.635 | 0.029 | n/a | 0.223 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000021 | 205.759 | 0.000 | n/a | 0.000 | 0.000 | 0.838 | 204.632 | 0.014 | n/a | 0.176 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000015 | 205.734 | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 204.635 | 0.162 | n/a | 0.308 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000053 | 205.710 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 202.019 | 0.034 | n/a | 2.535 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000019 | 205.679 | 0.000 | n/a | 0.000 | 0.000 | 4.101 | 201.246 | 0.016 | n/a | 0.151 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000001b | 205.241 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 204.362 | 0.013 | n/a | 0.137 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-41/journal/page | none observed |
| bc97183a5092a68c0000000000000041 | 205.164 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 204.214 | 0.012 | n/a | 0.088 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000054 | 204.405 | 0.000 | n/a | 0.000 | 0.000 | 2.720 | 201.400 | 0.021 | n/a | 0.154 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000031 | 204.294 | 0.000 | n/a | 0.000 | 0.000 | 2.909 | 200.904 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.367 | 0.000 | 0.000 | 0.367 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000046 | 204.116 | 0.000 | n/a | 0.000 | 0.000 | 2.914 | 200.877 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000000f | 204.059 | 0.000 | n/a | 0.000 | 0.000 | 1.065 | 202.657 | 0.021 | n/a | 0.152 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c000000000000004c | 204.012 | 0.000 | n/a | 0.000 | 0.000 | 2.765 | 200.998 | 0.015 | n/a | 0.124 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000039 | 203.924 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 202.431 | 0.055 | n/a | 0.319 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000022 | 203.851 | 0.000 | n/a | 0.000 | 0.000 | 1.474 | 202.070 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-41/journal/page | none observed |
| bc97183a5092a68c0000000000000043 | 203.846 | 0.000 | n/a | 0.000 | 0.000 | 2.211 | 201.351 | 0.020 | n/a | 0.099 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c000000000000000e | 203.742 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 202.854 | 0.016 | n/a | 0.145 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.860 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 200.826 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 206.708 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.979 | 203.968 | 2.960 | n/a | 0.430 | 0.000 | n/a | n/a | 0.341 | 0.000 | 0.000 | 0.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000000091 | 208.022 | 0.000 | n/a | 0.000 | 0.000 | 3.893 | 203.721 | 0.023 | n/a | 0.189 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000000c9 | 207.493 | 0.000 | n/a | 0.000 | 0.000 | 4.046 | 202.945 | 0.039 | n/a | 0.360 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-41/journal/page | none observed |
| bc97183a5092a68c0000000000000086 | 206.708 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 205.513 | 0.022 | n/a | 0.159 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000159 | 205.885 | 0.000 | n/a | 0.000 | 0.000 | 4.926 | 200.743 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c00000000000000ec | 205.328 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 204.390 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000064 | 205.009 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 203.790 | 0.016 | n/a | 0.102 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000127 | 204.901 | 0.000 | n/a | 0.000 | 0.000 | 1.925 | 202.650 | 0.021 | n/a | 0.185 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000015a | 204.685 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 203.968 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000000d6 | 204.522 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 203.354 | 0.025 | n/a | 0.094 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000000c2 | 204.332 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 203.277 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000140 | 204.193 | 0.000 | n/a | 0.000 | 0.000 | 3.532 | 200.520 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000065 | 203.919 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 202.556 | 0.029 | n/a | 0.414 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000000fc | 203.875 | 0.000 | n/a | 0.000 | 0.000 | 1.756 | 201.657 | 0.017 | n/a | 0.231 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000084 | 203.793 | 0.000 | n/a | 0.000 | 0.000 | 2.545 | 200.943 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000000ab | 203.792 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 203.065 | 0.050 | n/a | 0.087 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000092 | 203.791 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 202.653 | 0.023 | n/a | 0.186 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000060 | 203.696 | 0.000 | n/a | 0.000 | 0.000 | 2.326 | 201.135 | 0.022 | n/a | 0.118 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000013e | 203.621 | 0.000 | n/a | 0.000 | 0.000 | 2.376 | 201.070 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000137 | 203.608 | 0.000 | n/a | 0.000 | 0.000 | 0.422 | 202.982 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000074 | 203.603 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 201.608 | 0.015 | n/a | 0.143 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.359 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 200.605 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 205.273 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.320 | 203.448 | 4.564 | n/a | 0.168 | 0.000 | n/a | n/a | 0.364 | 0.000 | 0.000 | 0.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000000165 | 211.622 | 0.000 | n/a | 0.000 | 0.000 | 4.420 | 206.796 | 0.061 | n/a | 0.168 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000184 | 206.985 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 206.158 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000205 | 205.273 | 0.000 | n/a | 0.000 | 0.000 | 4.319 | 200.726 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000248 | 205.110 | 0.000 | n/a | 0.000 | 0.000 | 4.320 | 200.635 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000017d | 205.000 | 0.000 | n/a | 0.000 | 0.000 | 3.615 | 201.198 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000001ce | 204.416 | 0.000 | n/a | 0.000 | 0.000 | 3.495 | 200.737 | 0.007 | n/a | 0.099 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c00000000000001af | 204.212 | 0.000 | n/a | 0.000 | 0.000 | 3.032 | 200.928 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000231 | 204.198 | 0.000 | n/a | 0.000 | 0.000 | 3.362 | 200.702 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000234 | 203.977 | 0.000 | n/a | 0.000 | 0.000 | 0.368 | 203.448 | 0.010 | n/a | 0.069 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000019d | 203.742 | 0.000 | n/a | 0.000 | 0.000 | 0.479 | 203.039 | 0.018 | n/a | 0.073 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000001b9 | 203.512 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 202.677 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000233 | 203.263 | 0.000 | n/a | 0.000 | 0.000 | 2.534 | 200.583 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000001d0 | 203.249 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.921 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c00000000000001fe | 203.143 | 0.000 | n/a | 0.000 | 0.000 | 2.218 | 200.764 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c000000000000018a | 203.045 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.982 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000018f | 203.014 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 201.974 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000001d5 | 202.947 | 0.000 | n/a | 0.000 | 0.000 | 1.352 | 201.344 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000222 | 202.885 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.995 | 0.017 | n/a | 0.162 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c000000000000023a | 202.842 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 201.769 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c000000000000022d | 202.705 | 0.000 | n/a | 0.000 | 0.000 | 2.001 | 200.490 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (152 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.521 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 78.594 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 203.518 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.048 | 202.662 | 4.145 | n/a | 0.115 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000000269 | 205.806 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 204.980 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000263 | 203.518 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 202.662 | 0.013 | n/a | 0.018 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c000000000000027c | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 0.878 | 201.740 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000255 | 202.671 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 201.533 | 0.011 | n/a | 0.163 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000287 | 202.603 | 0.000 | n/a | 0.000 | 0.000 | 0.960 | 201.296 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000025b | 202.505 | 0.000 | n/a | 0.000 | 0.000 | 1.567 | 200.784 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000273 | 202.424 | 0.000 | n/a | 0.000 | 0.000 | 1.209 | 200.989 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000298 | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 201.165 | 0.009 | n/a | 0.101 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000026d | 202.359 | 0.000 | n/a | 0.000 | 0.000 | 1.680 | 200.538 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000261 | 202.200 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 201.240 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000266 | 202.192 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 201.088 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000292 | 202.157 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 201.318 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000259 | 202.132 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 200.992 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000295 | 202.127 | 0.000 | n/a | 0.000 | 0.000 | 0.488 | 201.434 | 0.013 | n/a | 0.078 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000278 | 202.103 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 201.096 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000256 | 202.094 | 0.000 | n/a | 0.000 | 0.000 | 1.006 | 200.809 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000296 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 201.018 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000297 | 202.029 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 200.940 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c000000000000029c | 202.006 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 201.177 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000286 | 201.951 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 200.893 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-45/journal/page | none observed |

## P3 / L16 / read (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.167 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 79.157 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 |
| p99 | 202.490 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.977 | 201.294 | 1.527 | n/a | 0.114 | 0.000 | n/a | n/a | 50.456 | 0.000 | 0.000 | 50.456 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000000ea1 | 202.503 | 0.000 | n/a | 0.000 | 0.000 | 1.801 | 200.490 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000e8d | 202.490 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 201.361 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000000e53 | 202.475 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.294 | 0.027 | n/a | 0.058 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000e8f | 202.440 | 0.000 | n/a | 0.000 | 0.000 | 1.841 | 200.411 | 0.004 | n/a | 0.018 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000e54 | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 1.232 | 200.832 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000000e5c | 202.309 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.162 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000e8b | 202.121 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 201.122 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000e91 | 202.096 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 200.976 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000e66 | 201.782 | 0.000 | n/a | 0.000 | 0.000 | 0.398 | 201.190 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000e7b | 201.769 | 0.000 | n/a | 0.000 | 0.000 | 0.320 | 201.282 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000e63 | 201.758 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 200.906 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000e6a | 201.655 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 200.734 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000e5f | 201.653 | 0.000 | n/a | 0.000 | 0.000 | 0.546 | 200.922 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000e86 | 201.618 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 200.648 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000000e71 | 201.612 | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 200.954 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000e85 | 201.608 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 200.746 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000e65 | 201.596 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 200.579 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| bc97183a5092a68c0000000000000e64 | 201.594 | 0.000 | n/a | 0.000 | 0.000 | 0.584 | 200.738 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000e8c | 201.570 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 200.811 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000e78 | 201.556 | 0.000 | n/a | 0.000 | 0.000 | 0.694 | 200.734 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.150 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 200.546 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 204.911 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.280 | 202.957 | 1.125 | n/a | 0.095 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000000ec2 | 206.939 | 0.000 | n/a | 0.000 | 0.000 | 3.808 | 202.957 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000f1e | 206.601 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 205.776 | 0.030 | n/a | 0.073 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000ece | 204.911 | 0.000 | n/a | 0.000 | 0.000 | 3.740 | 200.935 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000fa6 | 204.196 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 203.504 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000f35 | 203.109 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.981 | 0.019 | n/a | 0.178 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000eb1 | 202.941 | 0.000 | n/a | 0.000 | 0.000 | 2.237 | 200.535 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000f7c | 202.934 | 0.000 | n/a | 0.000 | 0.000 | 2.280 | 200.529 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000f0b | 202.558 | 0.000 | n/a | 0.000 | 0.000 | 1.789 | 200.567 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000f45 | 202.359 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.417 | 0.043 | n/a | 0.062 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000f89 | 202.324 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.062 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000f3a | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 1.287 | 200.585 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.412 | 0.000 | 0.000 | 0.412 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000000f20 | 202.185 | 0.000 | n/a | 0.000 | 0.000 | 0.722 | 201.251 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000f01 | 202.171 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 201.552 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000f50 | 202.143 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 200.995 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000f54 | 202.121 | 0.000 | n/a | 0.000 | 0.000 | 1.337 | 200.646 | 0.037 | n/a | 0.024 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000edc | 202.077 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 200.876 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000000f39 | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 200.927 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000000f4f | 201.990 | 0.000 | n/a | 0.000 | 0.000 | 0.471 | 201.169 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000f36 | 201.954 | 0.000 | n/a | 0.000 | 0.000 | 0.509 | 201.259 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000000ebe | 201.939 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.995 | 0.004 | n/a | 0.078 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.038 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.450 | 200.508 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 202.621 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.160 | 201.180 | 2.221 | n/a | 0.098 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000000fb5 | 205.213 | 0.000 | n/a | 0.000 | 0.000 | 4.437 | 200.636 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000fde | 203.271 | 0.000 | n/a | 0.000 | 0.000 | 2.703 | 200.424 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001060 | 202.621 | 0.000 | n/a | 0.000 | 0.000 | 2.003 | 200.510 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000ff7 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 1.973 | 200.470 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000fd5 | 202.573 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.362 | 0.016 | n/a | 0.064 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001029 | 202.530 | 0.000 | n/a | 0.000 | 0.000 | 1.580 | 200.748 | 0.020 | n/a | 0.086 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000109b | 202.443 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.415 | 0.013 | n/a | 0.110 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000108b | 202.336 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 201.079 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001016 | 202.289 | 0.000 | n/a | 0.000 | 0.000 | 1.303 | 200.838 | 0.011 | n/a | 0.057 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000104c | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 201.073 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000fc3 | 202.256 | 0.000 | n/a | 0.000 | 0.000 | 1.485 | 200.601 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000000ff0 | 202.233 | 0.000 | n/a | 0.000 | 0.000 | 1.420 | 200.647 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000101b | 202.225 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 200.647 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.485 | 0.000 | 0.000 | 0.485 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000000fec | 202.149 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 200.974 | 0.007 | n/a | 0.098 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001024 | 202.032 | 0.000 | n/a | 0.000 | 0.000 | 0.648 | 201.180 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000000ff2 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.046 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001056 | 201.958 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 201.034 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001002 | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 201.014 | 0.011 | n/a | 0.125 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000107c | 201.902 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 200.815 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001062 | 201.892 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 201.110 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.119 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.450 | 200.511 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 204.479 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.325 | 201.705 | 2.574 | n/a | 0.127 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c00000000000010bb | 209.273 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 208.531 | 0.017 | n/a | 0.075 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001104 | 204.774 | 0.000 | n/a | 0.000 | 0.000 | 3.706 | 200.829 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000010e9 | 204.479 | 0.000 | n/a | 0.000 | 0.000 | 3.937 | 200.362 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000010f0 | 203.235 | 0.000 | n/a | 0.000 | 0.000 | 1.713 | 200.906 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 0.549 | 0.000 | 0.000 | 0.549 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000010ab | 202.654 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 202.002 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001101 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 201.705 | 0.043 | n/a | 0.167 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000010fd | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 201.262 | 0.010 | n/a | 0.107 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001158 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 201.447 | 0.002 | n/a | 0.011 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001162 | 202.116 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 201.028 | 0.012 | n/a | 0.075 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000110c | 201.961 | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 200.579 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001135 | 201.944 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 200.687 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000010b2 | 201.939 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 200.719 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.338 | 0.000 | 0.000 | 0.338 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000119e | 201.902 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.954 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000010d3 | 201.888 | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 201.195 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000011aa | 201.876 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.781 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000010b3 | 201.865 | 0.000 | n/a | 0.000 | 0.000 | 0.650 | 200.968 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c000000000000116c | 201.858 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 200.535 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000118a | 201.838 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.017 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001145 | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.922 | 0.009 | n/a | 0.131 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000010be | 201.809 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 200.687 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.258 | 0.000 | 0.000 | 0.258 | gw-r/thread-44/journal/page | none observed |

## P3 / recovery / read (307 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.082 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 200.517 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 204.593 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.240 | 201.472 | 1.999 | n/a | 0.106 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c00000000000011c3 | 221.275 | 0.000 | n/a | 0.000 | 0.000 | 16.527 | 204.585 | 0.017 | n/a | 0.063 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c00000000000012ff | 205.022 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 204.106 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000012e6 | 204.841 | 0.000 | n/a | 0.000 | 0.000 | 3.583 | 200.759 | 0.012 | n/a | 0.257 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001217 | 204.593 | 0.000 | n/a | 0.000 | 0.000 | 3.624 | 200.779 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000011f1 | 203.936 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 203.205 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000012aa | 203.859 | 0.000 | n/a | 0.000 | 0.000 | 3.240 | 200.482 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c000000000000120c | 203.428 | 0.000 | n/a | 0.000 | 0.000 | 2.854 | 200.447 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001205 | 203.341 | 0.000 | n/a | 0.000 | 0.000 | 2.451 | 200.605 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000124a | 202.949 | 0.000 | n/a | 0.000 | 0.000 | 2.068 | 200.722 | 0.023 | n/a | 0.035 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000012e0 | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 1.221 | 200.984 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000011db | 202.242 | 0.000 | n/a | 0.000 | 0.000 | 1.363 | 200.705 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001214 | 202.195 | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 201.472 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001227 | 202.054 | 0.000 | n/a | 0.000 | 0.000 | 1.208 | 200.683 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001278 | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 200.802 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001298 | 201.955 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 201.240 | 0.020 | n/a | 0.133 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000121f | 201.949 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 200.831 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001276 | 201.914 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 201.031 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c00000000000012c2 | 201.888 | 0.000 | n/a | 0.000 | 0.000 | 0.628 | 201.014 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c000000000000123c | 201.880 | 0.000 | n/a | 0.000 | 0.000 | 0.745 | 200.931 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000123b | 201.866 | 0.000 | n/a | 0.000 | 0.000 | 0.493 | 201.130 | 0.013 | n/a | 0.088 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |

## P3 / p4mix / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 200.495 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 |
| p99 | 203.049 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.021 | 201.263 | 2.224 | n/a | 0.113 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c00000000000013aa | 204.741 | 0.000 | n/a | 0.000 | 0.000 | 3.867 | 200.728 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000137e | 203.638 | 0.000 | n/a | 0.000 | 0.000 | 3.021 | 200.493 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001334 | 203.049 | 0.000 | n/a | 0.000 | 0.000 | 2.386 | 200.467 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000013bb | 202.691 | 0.000 | n/a | 0.000 | 0.000 | 2.118 | 200.439 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c000000000000133f | 202.477 | 0.000 | n/a | 0.000 | 0.000 | 1.452 | 200.865 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000013ae | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 0.441 | 201.447 | 0.072 | n/a | 0.116 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000013a2 | 202.081 | 0.000 | n/a | 0.000 | 0.000 | 0.462 | 201.368 | 0.017 | n/a | 0.148 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000013dc | 201.991 | 0.000 | n/a | 0.000 | 0.000 | 0.852 | 200.847 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000013ff | 201.991 | 0.000 | n/a | 0.000 | 0.000 | 0.967 | 200.839 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001369 | 201.961 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 200.851 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000013df | 201.955 | 0.000 | n/a | 0.000 | 0.000 | 0.456 | 201.263 | 0.025 | n/a | 0.113 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000013a6 | 201.836 | 0.000 | n/a | 0.000 | 0.000 | 0.439 | 201.154 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000136f | 201.812 | 0.000 | n/a | 0.000 | 0.000 | 1.181 | 200.495 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001354 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 0.700 | 200.949 | 0.004 | n/a | 0.051 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000013e8 | 201.692 | 0.000 | n/a | 0.000 | 0.000 | 0.534 | 200.937 | 0.007 | n/a | 0.095 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000013d2 | 201.649 | 0.000 | n/a | 0.000 | 0.000 | 0.364 | 201.101 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000013a5 | 201.631 | 0.000 | n/a | 0.000 | 0.000 | 0.519 | 200.870 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001363 | 201.629 | 0.000 | n/a | 0.000 | 0.000 | 0.505 | 200.897 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001314 | 201.607 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 200.862 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000130e | 201.606 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 200.940 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |

## P3 / p4h1 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.078 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.441 | 200.527 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 |
| p99 | 203.257 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.836 | 201.131 | 2.861 | n/a | 0.105 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000001440 | 208.603 | 0.000 | n/a | 0.000 | 0.000 | 8.033 | 200.458 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001492 | 204.100 | 0.000 | n/a | 0.000 | 0.000 | 3.431 | 200.533 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000149c | 203.257 | 0.000 | n/a | 0.000 | 0.000 | 2.734 | 200.410 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001503 | 202.488 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 200.831 | 0.014 | n/a | 0.072 | 0.000 | n/a | n/a | 0.489 | 0.000 | 0.000 | 0.489 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001479 | 202.383 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 200.929 | 0.010 | n/a | 0.076 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000147b | 202.085 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 201.131 | 0.048 | n/a | 0.132 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000014ad | 201.996 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 200.992 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001421 | 201.944 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 201.037 | 0.012 | n/a | 0.066 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000145f | 201.934 | 0.000 | n/a | 0.000 | 0.000 | 0.457 | 201.277 | 0.011 | n/a | 0.107 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000014f6 | 201.847 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 200.719 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001427 | 201.843 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 200.902 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c000000000000149a | 201.838 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 201.052 | 0.030 | n/a | 0.075 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001459 | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.850 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001457 | 201.784 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 200.501 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001426 | 201.771 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 200.707 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000148d | 201.749 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 201.028 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001434 | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.405 | 201.145 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001428 | 201.729 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 200.909 | 0.004 | n/a | 0.059 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000141a | 201.728 | 0.000 | n/a | 0.000 | 0.000 | 0.465 | 201.070 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001413 | 201.679 | 0.000 | n/a | 0.000 | 0.000 | 0.394 | 201.104 | 0.009 | n/a | 0.081 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |

## P3 / grow3 / read (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.165 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 200.485 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 |
| p99 | 289.734 | n/a | n/a | n/a | 4.131 | n/a | 0.000 | 0.000 | 1.136 | 200.734 | 97.716 | n/a | 0.049 | 0.000 | n/a | n/a | 53.655 | 4.131 | 0.027 | 53.655 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000001529 | 289.734 | 2.017 | n/a | 0.000 | 0.000 | 0.667 | 196.880 | 90.057 | n/a | 0.013 | 0.000 | n/a | n/a | 0.101 | 2.017 | 0.007 | 0.101 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000151c | 265.338 | 3.711 | n/a | 0.000 | 0.000 | 0.873 | 179.113 | 81.419 | n/a | 0.019 | 0.000 | n/a | n/a | 0.202 | 3.711 | 0.014 | 0.202 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c000000000000151d | 202.030 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 200.719 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000152b | 202.002 | 0.000 | n/a | 0.000 | 0.000 | 1.136 | 200.734 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000151e | 201.476 | 0.000 | n/a | 0.000 | 0.000 | 0.701 | 200.622 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001518 | 201.454 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 200.485 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001521 | 201.401 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 200.554 | 0.003 | n/a | 0.030 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000151a | 201.297 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 200.714 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000151b | 201.262 | 0.000 | n/a | 0.000 | 0.000 | 0.484 | 200.643 | 0.003 | n/a | 0.041 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001523 | 201.213 | 0.000 | n/a | 0.000 | 0.000 | 0.421 | 200.659 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001528 | 201.192 | 0.000 | n/a | 0.000 | 0.000 | 0.464 | 200.589 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001527 | 201.165 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.500 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001522 | 201.056 | 0.000 | n/a | 0.000 | 0.000 | 0.389 | 200.531 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001517 | 201.024 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 200.474 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001520 | 201.019 | 0.000 | n/a | 0.000 | 0.000 | 0.419 | 200.461 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001519 | 200.977 | 0.000 | n/a | 0.000 | 0.000 | 0.342 | 200.511 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001524 | 200.934 | 0.000 | n/a | 0.000 | 0.000 | 0.356 | 200.456 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000152c | 152.859 | 4.131 | n/a | 0.000 | 0.000 | 0.714 | 147.798 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.179 | 4.131 | 0.027 | 0.179 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001525 | 137.685 | 2.547 | n/a | 0.000 | 0.000 | 0.698 | 36.570 | 97.716 | n/a | 0.016 | 0.000 | n/a | n/a | 0.138 | 2.547 | 0.019 | 0.138 | gw-r/thread-43/gateway.admission-wait | none observed |
| bc97183a5092a68c0000000000001515 | 122.536 | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 121.357 | 0.574 | n/a | 0.021 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-45/journal/page | none observed |

## P3 / p4h3 / read (238 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.161 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.494 | 200.501 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 203.315 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.625 | 201.404 | 2.909 | n/a | 0.106 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c000000000000161c | 204.250 | 0.000 | n/a | 0.000 | 0.000 | 3.033 | 200.982 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000015d3 | 203.470 | 0.000 | n/a | 0.000 | 0.000 | 2.625 | 200.591 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000015a8 | 203.315 | 0.000 | n/a | 0.000 | 0.000 | 2.640 | 200.501 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000015a0 | 202.884 | 0.000 | n/a | 0.000 | 0.000 | 1.934 | 200.795 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000154b | 202.476 | 0.000 | n/a | 0.000 | 0.000 | 0.315 | 201.997 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001623 | 202.450 | 0.000 | n/a | 0.000 | 0.000 | 1.513 | 200.691 | 0.016 | n/a | 0.070 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000155d | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 1.081 | 201.135 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000015b1 | 202.384 | 0.000 | n/a | 0.000 | 0.000 | 1.658 | 200.446 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001610 | 202.339 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 201.378 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000015f6 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 0.314 | 201.837 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000155f | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 201.404 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000015ab | 202.244 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.240 | 0.060 | n/a | 0.101 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000015eb | 202.203 | 0.000 | n/a | 0.000 | 0.000 | 1.102 | 200.742 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001549 | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 200.939 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001533 | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 200.718 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000155e | 202.001 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 201.016 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001577 | 201.955 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 201.095 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000015db | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 201.093 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001595 | 201.888 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 200.872 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001535 | 201.847 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 200.781 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-65/journal/page | none observed |

## P3 / grow10 / read (33 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.055 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 200.448 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 206.834 | n/a | n/a | n/a | 4.155 | n/a | 0.358 | 0.000 | 1.352 | 206.059 | 53.167 | n/a | 0.066 | 0.000 | n/a | n/a | 49.399 | 4.155 | 0.049 | 49.399 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c000000000000163d | 206.834 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 206.059 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001643 | 204.944 | 1.939 | n/a | 0.000 | 0.000 | 1.119 | 201.696 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.119 | 1.939 | 0.009 | 0.119 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000165c | 204.404 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 203.604 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c000000000000163f | 201.539 | 0.000 | n/a | 0.000 | 0.000 | 0.782 | 200.556 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001646 | 201.449 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 200.708 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001659 | 201.387 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 200.632 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001656 | 201.282 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 200.642 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001642 | 201.264 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 200.579 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001647 | 201.263 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.565 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000164b | 201.256 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 200.559 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001654 | 201.224 | 0.000 | n/a | 0.000 | 0.000 | 0.415 | 200.648 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001639 | 201.205 | 0.000 | n/a | 0.000 | 0.000 | 0.374 | 200.667 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001657 | 201.201 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 200.479 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001638 | 201.186 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 200.405 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000164e | 201.139 | 0.000 | n/a | 0.000 | 0.000 | 0.442 | 200.569 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001660 | 201.069 | 0.000 | n/a | 0.000 | 0.000 | 0.412 | 200.532 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000163c | 201.055 | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 200.448 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001663 | 201.014 | 0.000 | n/a | 0.000 | 0.000 | 0.425 | 200.472 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001651 | 200.878 | 0.000 | n/a | 0.000 | 0.000 | 0.319 | 200.446 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001653 | 196.270 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 195.314 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-43/journal/page | none observed |

## P3 / p4h10 / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.210 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 200.533 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 |
| p99 | 202.934 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.138 | 201.231 | 2.530 | n/a | 0.109 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000001703 | 203.487 | 0.000 | n/a | 0.000 | 0.000 | 2.138 | 201.121 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000169b | 203.066 | 0.000 | n/a | 0.000 | 0.000 | 2.452 | 200.381 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001696 | 202.934 | 0.000 | n/a | 0.000 | 0.000 | 1.946 | 200.739 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000176d | 202.860 | 0.000 | n/a | 0.000 | 0.000 | 1.496 | 201.044 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000175d | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 0.778 | 201.839 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000016d3 | 202.633 | 0.000 | n/a | 0.000 | 0.000 | 2.054 | 200.420 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000167f | 202.434 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 201.231 | 0.006 | n/a | 0.089 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001758 | 202.388 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.294 | 0.016 | n/a | 0.086 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000016d1 | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 1.376 | 200.678 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000016e2 | 202.361 | 0.000 | n/a | 0.000 | 0.000 | 1.057 | 201.057 | 0.032 | n/a | 0.041 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000167e | 202.299 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.195 | 0.014 | n/a | 0.094 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000016a9 | 202.207 | 0.000 | n/a | 0.000 | 0.000 | 0.435 | 200.903 | 0.010 | n/a | 0.773 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000016f8 | 202.199 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 201.003 | 0.005 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001702 | 202.141 | 0.000 | n/a | 0.000 | 0.000 | 1.043 | 200.783 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000016bf | 202.097 | 0.000 | n/a | 0.000 | 0.000 | 1.497 | 200.479 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001685 | 202.049 | 0.000 | n/a | 0.000 | 0.000 | 1.058 | 200.735 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001757 | 202.037 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 201.156 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000016d6 | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 201.057 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000016a7 | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 200.987 | 0.005 | n/a | 0.070 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000016ea | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 200.679 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |

## P3 / presweep / read (236 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.079 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.506 | 200.458 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 |
| p99 | 202.652 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.974 | 201.125 | 0.999 | n/a | 0.096 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000001810 | 203.118 | 0.000 | n/a | 0.000 | 0.000 | 2.220 | 200.744 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c000000000000184f | 202.803 | 0.000 | n/a | 0.000 | 0.000 | 1.895 | 200.775 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000017c5 | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 1.195 | 201.125 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000017ee | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.538 | 200.599 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000017da | 202.311 | 0.000 | n/a | 0.000 | 0.000 | 0.932 | 201.104 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000017b0 | 202.156 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 201.297 | 0.011 | n/a | 0.110 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000001788 | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 200.525 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000184a | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 1.358 | 200.422 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000017e4 | 201.889 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 200.736 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000017ec | 201.881 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 200.661 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c000000000000176f | 201.855 | 0.000 | n/a | 0.000 | 0.000 | 1.101 | 200.572 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000017c4 | 201.855 | 0.000 | n/a | 0.000 | 0.000 | 0.497 | 201.129 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000017ab | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 1.146 | 200.524 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c00000000000017a5 | 201.777 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 200.755 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000017d8 | 201.761 | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 200.484 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001782 | 201.742 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 200.520 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001862 | 201.732 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 200.900 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000017a0 | 201.715 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 200.891 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c0000000000001780 | 201.702 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 200.991 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000017bc | 201.672 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 200.849 | 0.005 | n/a | 0.061 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |

## P3 / sweep / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.049 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 200.490 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 |
| p99 | 202.848 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.343 | 201.154 | 2.021 | n/a | 0.095 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c00000000000018ad | 204.882 | 0.000 | n/a | 0.000 | 0.000 | 4.139 | 200.547 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000018ab | 204.255 | 0.000 | n/a | 0.000 | 0.000 | 3.679 | 200.457 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001927 | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 2.049 | 200.662 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001897 | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 200.964 | 0.014 | n/a | 0.053 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000018fe | 202.516 | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 201.223 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c00000000000018c6 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.316 | 0.020 | n/a | 0.088 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000001943 | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 1.310 | 200.522 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c00000000000018d7 | 202.008 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 201.154 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001870 | 201.870 | 0.000 | n/a | 0.000 | 0.000 | 1.084 | 200.618 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c00000000000018c1 | 201.863 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.795 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c0000000000001959 | 201.789 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 200.771 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c0000000000001969 | 201.782 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 200.871 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001873 | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.965 | 200.564 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001953 | 201.715 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 200.702 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000018bb | 201.695 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 200.929 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000018e2 | 201.682 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 200.879 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001947 | 201.676 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 201.003 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c000000000000193d | 201.667 | 0.000 | n/a | 0.000 | 0.000 | 0.404 | 201.077 | 0.027 | n/a | 0.055 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000001936 | 201.658 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 200.698 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-43/journal/page | none observed |
| bc97183a5092a68c000000000000188c | 201.637 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 200.527 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-71/journal/page | none observed |

## P3 / tail / read (998 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.433 | 200.468 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 203.499 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.810 | 201.315 | 0.997 | n/a | 0.106 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc97183a5092a68c0000000000001986 | 220.535 | 0.000 | n/a | 0.000 | 0.000 | 1.947 | 218.425 | 0.005 | n/a | 0.055 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000286a | 205.763 | 0.000 | n/a | 0.000 | 0.000 | 2.259 | 203.363 | 0.014 | n/a | 0.055 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-75/journal/page | none observed |
| bc97183a5092a68c00000000000028eb | 204.955 | 0.000 | n/a | 0.000 | 0.000 | 2.740 | 201.995 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c0000000000002778 | 204.944 | 0.000 | n/a | 0.000 | 0.000 | 4.296 | 200.423 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000028d4 | 204.824 | 0.000 | n/a | 0.000 | 0.000 | 3.760 | 200.832 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-75/journal/page | none observed |
| bc97183a5092a68c0000000000002723 | 204.761 | 0.000 | n/a | 0.000 | 0.000 | 4.007 | 200.530 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c00000000000019e3 | 204.626 | 0.000 | n/a | 0.000 | 0.000 | 3.965 | 200.512 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c000000000000282e | 203.882 | 0.000 | n/a | 0.000 | 0.000 | 2.605 | 201.035 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-44/journal/page | none observed |
| bc97183a5092a68c000000000000197f | 203.626 | 0.000 | n/a | 0.000 | 0.000 | 3.038 | 200.404 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c00000000000019e6 | 203.499 | 0.000 | n/a | 0.000 | 0.000 | 2.578 | 200.754 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |
| bc97183a5092a68c00000000000027aa | 203.454 | 0.000 | n/a | 0.000 | 0.000 | 2.810 | 200.478 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000002684 | 203.272 | 0.000 | n/a | 0.000 | 0.000 | 2.684 | 200.421 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c0000000000001a49 | 203.020 | 0.000 | n/a | 0.000 | 0.000 | 2.278 | 200.523 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000027f8 | 202.874 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 202.108 | 0.027 | n/a | 0.054 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c0000000000002888 | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 0.464 | 202.074 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| bc97183a5092a68c000000000000290a | 202.694 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 201.472 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-75/journal/page | none observed |
| bc97183a5092a68c000000000000287b | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 0.478 | 201.982 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-65/journal/page | none observed |
| bc97183a5092a68c00000000000019ea | 202.611 | 0.000 | n/a | 0.000 | 0.000 | 1.702 | 200.704 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| bc97183a5092a68c00000000000026c3 | 202.548 | 0.000 | n/a | 0.000 | 0.000 | 1.846 | 200.541 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-71/journal/page | none observed |
| bc97183a5092a68c0000000000002697 | 202.477 | 0.000 | n/a | 0.000 | 0.000 | 0.208 | 201.931 | 0.073 | n/a | 0.178 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 7408 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.001/3.822 ms; post-ACK p50/p99: 0.375/1.683 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.033 | 9.569 | 9.299 | reported |
| All-primary p99 ms | 51.130 | 50.281 | 48.570 | <=50 |
| L256 5-10 p50Ms | 9.983 | 9.727 | 9.663 | <=10 |
| L256 5-10 p99Ms | 17.028 | 16.757 | 16.755 | <=50 |
| L256 11-25 p50Ms | 12.543 | 12.031 | 11.135 | <=10 |
| L256 11-25 p99Ms | 24.733 | 24.290 | 24.289 | <=50 |
| L256 26-50 p50Ms | 23.874 | 22.350 | 22.348 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 23.874 | 22.350 | 22.348 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.511 | 8.191 | 7.967 | <=10 |
| Burst 11-25 p50 ms | 10.687 | 10.111 | 9.855 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 24.733 | 24.290 | 24.289 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 49.840 | 49.611 | 49.609 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 60.035/60.035 | 58.660 | 38.242 | 100.655 | 1.293/0.098 |
| 5-10 | 250-1000 | 280 | 10.671/328.769 | 10.380 | 6.039 | 14.617 | 0.067/0.021 |
| 5-10 | 100-250 | 125 | 9.971/26.197 | 9.595 | 5.521 | 13.740 | 0.059/0.020 |
| 11-25 | 250-1000 | 160 | 12.416/56.275 | 11.819 | 6.572 | 16.157 | 0.075/0.021 |
| 26-50 | 250-1000 | 44 | 18.039/62.002 | 16.897 | 8.890 | 21.080 | 0.092/0.023 |
| 5-10 | 0-50 | 2320 | 7.648/25.838 | 7.313 | 4.046 | 10.057 | 0.039/0.017 |
| 26-50 | 50-100 | 28 | 13.971/23.403 | 12.764 | 6.329 | 16.402 | 0.072/0.020 |
| 11-25 | 100-250 | 55 | 10.960/259.591 | 10.484 | 6.560 | 15.760 | 0.057/0.020 |
| 11-25 | overlap | 765 | 11.580/57.969 | 11.010 | 6.605 | 15.305 | 0.035/0.016 |
| 11-25 | 50-100 | 78 | 10.227/53.918 | 9.610 | 5.321 | 14.430 | 0.051/0.018 |
| 5-10 | 50-100 | 162 | 8.111/23.678 | 7.786 | 4.391 | 10.972 | 0.046/0.018 |
| 11-25 | 0-50 | 1108 | 9.854/33.339 | 9.247 | 4.820 | 12.174 | 0.045/0.018 |
| 26-50 | overlap | 264 | 15.078/60.385 | 14.003 | 7.808 | 20.225 | 0.048/0.017 |
| 5-10 | overlap | 1595 | 9.532/46.003 | 9.244 | 5.683 | 12.804 | 0.031/0.016 |
| 26-50 | 100-250 | 16 | 12.666/23.207 | 11.642 | 6.261 | 15.674 | 0.067/0.021 |
| 26-50 | 0-50 | 407 | 13.429/43.404 | 12.362 | 6.388 | 16.651 | 0.058/0.019 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 648 | 8 | 562.636 |
| burst | 6740 | 54 | 3391.015 |
| growth | 20 | 16 | 4495.229 |

## Writer heap, GC and scheduler stalls

Source f846bcd77f7858836861a5efb1d3c6fc15d2d22a; 7408 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 542.481 / 867.888 |
| GC events / total duration / maximum ms | 1844 / 4690.679 / 60.035 |
| GC events >50 ms / total duration ms | 1 / 60.035 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":1818,"4":13,"8":13} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 3 / 269.513 |
| Union stall episodes / duration ms | 3 / 269.513 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 51.130 / 78 / 8448.880 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

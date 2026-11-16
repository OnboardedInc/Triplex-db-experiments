# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-68/peer.transact-await (includes order/network/storage)` (944.741 ms, trace `ab38e516a9e073ba00000000000022cb`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (913.431 ms, trace `ab38e516a9e073ba00000000000022cc`); `gw-w/thread-74/peer.transact-await (includes order/network/storage)` (830.708 ms, trace `ab38e516a9e073ba00000000000022dd`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (801.892 ms, trace `ab38e516a9e073ba00000000000022cd`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (698.916 ms, trace `ab38e516a9e073ba00000000000022ce`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-final-a-zero`; source `dce01797d3015f243262c70bdc6605186a090e06`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 8532/8534 (99.977%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 8534/8534. Raw trace bytes: 21498783.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 395 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13374.262 | 534.715 | 5.984 | 454 |
| baseline | 0 | 44969.654 | 825.053 | 21.346 | 1476 |
| L1 | 0 | 44981.809 | 831.803 | 26.969 | 1762 |
| L4 | 0 | 44963.613 | 8509.072 | 62.897 | 34243 |
| L16 | 0 | 44608.313 | 8839.686 | 74.969 | 35856 |
| L64 | 0 | 44821.147 | 936.062 | 16.421 | 1560 |
| L256 | 0 | 44031.542 | 1124.821 | 22.466 | 1598 |
| L1024 | 0 | 44898.099 | 1077.608 | 22.076 | 1550 |
| recovery | 0 | 59017.878 | 1561.939 | 36.970 | 2434 |
| p4mix | 0 | 44015.461 | 1075.416 | 25.515 | 1702 |
| p4h1 | 0 | 44443.479 | 948.635 | 26.925 | 1500 |
| grow3 | 0 | 5100.123 | 1420.440 | 9.754 | 256 |
| p4h3 | 0 | 44014.874 | 1009.267 | 20.338 | 1720 |
| grow10 | 0 | 9149.913 | 3967.227 | 10.288 | 344 |
| p4h10 | 0 | 44018.462 | 944.101 | 22.976 | 1400 |
| presweep | 0 | 44018.643 | 1015.745 | 15.933 | 1666 |
| sweep | 0 | 44517.596 | 1324.819 | 21.791 | 1630 |
| tail | 0 | 218428.946 | 21326.490 | 210.757 | 75386 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| ab38e516a9e073ba00000000000022cb | driver.queue.scheduler-dispatch | 0.050 | none | 0 / 32 |
| ab38e516a9e073ba00000000000022cb | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace ab38e516a9e073ba00000000000022cb waited: []

| ab38e516a9e073ba00000000000022cc | driver.queue.scheduler-dispatch | 0.046 | none | 1 / 32 |
| ab38e516a9e073ba00000000000022cc | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace ab38e516a9e073ba00000000000022cc waited: []

| ab38e516a9e073ba00000000000022dd | driver.queue.scheduler-dispatch | 0.057 | none | 0 / 32 |
| ab38e516a9e073ba00000000000022dd | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace ab38e516a9e073ba00000000000022dd waited: []

| ab38e516a9e073ba00000000000022cd | driver.queue.scheduler-dispatch | 0.041 | none | 2 / 32 |
| ab38e516a9e073ba00000000000022cd | driver.queue.scheduler-late | 0.002 | none | 2 / 32 |

Observed active steps while trace ab38e516a9e073ba00000000000022cd waited: []

| ab38e516a9e073ba00000000000022ce | driver.queue.scheduler-dispatch | 0.051 | none | 3 / 32 |
| ab38e516a9e073ba00000000000022ce | driver.queue.scheduler-late | 0.002 | none | 3 / 32 |

Observed active steps while trace ab38e516a9e073ba00000000000022ce waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.465 | 0.760 | 0.000 | 0.708 | 5.009 | 26.991 | 0.000 | 0.115 | 1.556 | 7.258 | 0.042 | n/a | 0.351 | 13.347 | n/a | n/a | 0.031 | 5.664 | 0.209 | 0.031 |
| p99 | 82.380 | 4.010 | 0.012 | 4.479 | 23.248 | n/a | 4.093 | 2.231 | 5.794 | 22.033 | 0.164 | n/a | 2.255 | 52.099 | n/a | n/a | 0.202 | 33.048 | 0.494 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000000f2 | 82.380 | 23.248 | 0.712 | 0.000 | 0.091 | 2.559 | 22.033 | 0.164 | n/a | 1.537 | 32.009 | n/a | n/a | 0.028 | 24.050 | 0.292 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| ab38e516a9e073ba000000000000010a | 74.882 | 6.677 | 0.316 | 0.000 | 0.057 | 1.636 | 13.957 | 0.035 | n/a | 0.083 | 52.099 | n/a | n/a | 0.021 | 7.050 | 0.094 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.024ms |
| ab38e516a9e073ba00000000000000f6 | 66.938 | 5.910 | 26.991 | 0.000 | 0.147 | 4.115 | 16.372 | 0.069 | n/a | 0.924 | 12.345 | n/a | n/a | 0.064 | 33.048 | 0.494 | 0.064 | node-14/thread-0/rpc.probe.transact | none observed |
| ab38e516a9e073ba00000000000000ef | 53.310 | 10.511 | n/a | 0.000 | 0.247 | 1.236 | 10.557 | 0.028 | n/a | 0.120 | 30.445 | n/a | n/a | 0.167 | 10.758 | 0.202 | 0.167 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000104 | 44.691 | 5.000 | 0.333 | 0.000 | 0.155 | 1.648 | 13.326 | 0.075 | n/a | 0.245 | 23.867 | n/a | n/a | 0.042 | 5.488 | 0.123 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000011c | 40.708 | 5.188 | 0.167 | 0.000 | 0.044 | 5.794 | 8.976 | 0.062 | n/a | 0.175 | 20.281 | n/a | n/a | 0.022 | 5.399 | 0.133 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000000fc | 39.305 | 5.258 | 0.247 | 1.677 | 0.059 | 2.561 | 13.993 | 0.046 | n/a | 0.531 | 14.906 | n/a | n/a | 0.028 | 7.240 | 0.184 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000118 | 38.504 | 4.075 | 0.238 | 0.337 | 0.052 | 1.424 | 8.931 | 0.064 | n/a | 0.121 | 23.241 | n/a | n/a | 0.021 | 4.703 | 0.122 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000010e | 37.719 | 7.885 | 0.266 | 0.411 | 0.128 | 2.384 | 8.993 | 0.029 | n/a | 0.081 | 17.505 | n/a | n/a | 0.038 | 8.690 | 0.230 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000115 | 34.356 | 7.567 | n/a | 3.046 | 0.102 | 0.834 | 5.454 | 0.043 | n/a | 0.088 | 17.175 | n/a | n/a | 0.045 | 10.716 | 0.312 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000000fa | 34.210 | 4.182 | 0.256 | 1.428 | 0.063 | 1.790 | 11.332 | 0.037 | n/a | 2.255 | 12.845 | n/a | n/a | 0.023 | 5.929 | 0.173 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000107 | 33.491 | 5.404 | n/a | 0.000 | 0.152 | 1.431 | 5.435 | 0.038 | n/a | 0.144 | 20.838 | n/a | n/a | 0.049 | 5.556 | 0.166 | 0.049 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000102 | 32.681 | 5.009 | 0.254 | 0.000 | 0.115 | 1.629 | 7.818 | 0.043 | n/a | 0.351 | 17.417 | n/a | n/a | 0.045 | 5.377 | 0.165 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000000ff | 30.156 | 9.698 | n/a | 4.093 | 0.083 | 1.082 | 2.159 | 0.024 | n/a | 0.557 | 12.431 | n/a | n/a | 0.031 | 13.873 | 0.460 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000114 | 28.465 | 6.007 | 0.279 | 0.000 | 0.142 | 1.990 | 7.578 | 0.058 | n/a | 0.141 | 12.222 | n/a | n/a | 0.049 | 6.427 | 0.226 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000000f4 | 28.344 | 9.834 | n/a | 0.000 | 0.381 | 1.383 | 1.507 | 0.025 | n/a | 0.868 | 14.145 | n/a | n/a | 0.202 | 10.215 | 0.360 | 0.202 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| ab38e516a9e073ba0000000000000120 | 28.183 | 3.979 | 0.199 | 0.000 | 0.060 | 1.941 | 8.304 | 0.045 | n/a | 0.157 | 13.459 | n/a | n/a | 0.039 | 4.238 | 0.150 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000000f8 | 27.583 | 3.779 | n/a | 0.000 | 1.950 | 1.099 | 7.258 | 0.025 | n/a | 0.096 | 13.347 | n/a | n/a | 0.028 | 5.730 | 0.208 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| ab38e516a9e073ba0000000000000124 | 26.951 | 4.801 | 0.394 | 0.399 | 0.045 | 1.556 | 9.919 | 0.042 | n/a | 0.079 | 9.695 | n/a | n/a | 0.021 | 5.639 | 0.209 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000011d | 25.881 | 2.978 | n/a | 0.000 | 0.059 | 1.014 | 5.552 | 0.056 | n/a | 0.187 | 16.006 | n/a | n/a | 0.030 | 3.037 | 0.117 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.404 | 0.760 | 0.000 | 0.904 | 3.667 | n/a | 0.000 | 1.532 | 1.168 | 3.140 | 0.027 | n/a | 0.547 | 10.817 | n/a | n/a | 0.041 | 5.508 | 0.217 | 0.041 |
| p99 | 28.344 | 1.692 | 0.000 | 1.679 | 9.834 | n/a | 0.000 | 2.231 | 5.015 | 7.258 | 0.069 | n/a | 0.868 | 16.006 | n/a | n/a | 0.202 | 10.215 | 0.360 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000000f4 | 28.344 | 9.834 | n/a | 0.000 | 0.381 | 1.383 | 1.507 | 0.025 | n/a | 0.868 | 14.145 | n/a | n/a | 0.202 | 10.215 | 0.360 | 0.202 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| ab38e516a9e073ba00000000000000f8 | 27.583 | 3.779 | n/a | 0.000 | 1.950 | 1.099 | 7.258 | 0.025 | n/a | 0.096 | 13.347 | n/a | n/a | 0.028 | 5.730 | 0.208 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| ab38e516a9e073ba000000000000011d | 25.881 | 2.978 | n/a | 0.000 | 0.059 | 1.014 | 5.552 | 0.056 | n/a | 0.187 | 16.006 | n/a | n/a | 0.030 | 3.037 | 0.117 | 0.030 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000111 | 23.345 | 3.470 | n/a | 0.000 | 1.532 | 4.810 | 1.812 | 0.045 | n/a | 0.643 | 11.009 | n/a | n/a | 0.025 | 5.001 | 0.214 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000125 | 22.404 | 4.747 | n/a | 0.000 | 0.120 | 0.992 | 4.896 | 0.069 | n/a | 0.718 | 10.817 | n/a | n/a | 0.045 | 4.867 | 0.217 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000119 | 18.011 | 3.667 | n/a | 0.000 | 2.228 | 1.168 | 1.313 | 0.027 | n/a | 0.547 | 9.021 | n/a | n/a | 0.041 | 5.895 | 0.327 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000010f | 17.100 | 2.727 | n/a | 0.000 | 0.709 | 5.015 | 3.360 | 0.038 | n/a | 0.362 | 4.868 | n/a | n/a | 0.020 | 3.436 | 0.201 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.013ms |
| ab38e516a9e073ba00000000000000fd | 16.462 | 3.277 | n/a | 0.000 | 2.231 | 0.882 | 3.140 | 0.021 | n/a | 0.398 | 6.439 | n/a | n/a | 0.073 | 5.508 | 0.335 | 0.073 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000121 | 16.256 | 3.885 | n/a | 0.000 | 1.728 | 1.286 | 1.412 | 0.024 | n/a | 0.865 | 6.966 | n/a | n/a | 0.092 | 5.613 | 0.345 | 0.092 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |

## P2 / outside-phases / commit (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.000 | 0.000 | 0.000 | 0.346 | 3.102 | 0.337 | 0.000 | 0.047 | 0.728 | 1.850 | 0.021 | n/a | 0.188 | 7.090 | n/a | n/a | 0.022 | 3.309 | 0.252 | 0.022 |
| p99 | 38.867 | 0.784 | 0.000 | 1.315 | 6.373 | n/a | 0.000 | 0.228 | 1.510 | 10.367 | 0.036 | n/a | 0.479 | 23.045 | n/a | n/a | 0.036 | 6.572 | 0.371 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000002205 | 38.867 | 4.299 | 0.195 | 0.000 | 0.044 | 1.075 | 9.835 | 0.025 | n/a | 0.328 | 23.045 | n/a | n/a | 0.021 | 4.538 | 0.117 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000128 | 31.583 | 3.632 | 0.201 | 0.000 | 0.066 | 1.510 | 10.367 | 0.035 | n/a | 0.109 | 15.635 | n/a | n/a | 0.028 | 3.899 | 0.123 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002208 | 21.449 | 3.920 | n/a | 0.000 | 0.049 | 0.449 | 1.332 | 0.013 | n/a | 0.330 | 15.333 | n/a | n/a | 0.025 | 3.969 | 0.185 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022f3 | 20.051 | 6.373 | 0.156 | 0.000 | 0.043 | 0.898 | 4.635 | 0.023 | n/a | 0.057 | 7.844 | n/a | n/a | 0.022 | 6.572 | 0.328 | 0.022 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002405 | 17.390 | 3.102 | 0.337 | 0.000 | 0.050 | 0.994 | 2.394 | 0.036 | n/a | 0.108 | 10.351 | n/a | n/a | 0.018 | 3.489 | 0.201 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002401 | 14.789 | 2.887 | 0.175 | 0.000 | 0.041 | 0.799 | 2.651 | 0.019 | n/a | 0.049 | 8.152 | n/a | n/a | 0.016 | 3.103 | 0.210 | 0.016 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002206 | 14.000 | 3.958 | n/a | 0.000 | 0.047 | 1.324 | 1.146 | 0.013 | n/a | 0.398 | 7.090 | n/a | n/a | 0.023 | 4.005 | 0.286 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022f1 | 12.348 | 2.918 | 0.163 | 0.000 | 0.034 | 0.728 | 3.623 | 0.018 | n/a | 0.202 | 4.646 | n/a | n/a | 0.016 | 3.115 | 0.252 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000023ff | 11.277 | 3.241 | n/a | 0.000 | 0.068 | 0.659 | 1.850 | 0.021 | n/a | 0.479 | 4.923 | n/a | n/a | 0.036 | 3.309 | 0.293 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002406 | 9.830 | 2.540 | n/a | 0.000 | 0.040 | 0.565 | 1.819 | 0.021 | n/a | 0.479 | 4.344 | n/a | n/a | 0.022 | 2.580 | 0.262 | 0.022 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000220b | 7.783 | 2.426 | n/a | 0.000 | 0.066 | 0.457 | 0.575 | 0.011 | n/a | 0.049 | 4.170 | n/a | n/a | 0.029 | 2.492 | 0.320 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002402 | 6.772 | 2.282 | n/a | 0.000 | 0.228 | 0.562 | 0.759 | 0.027 | n/a | 0.188 | 2.696 | n/a | n/a | 0.028 | 2.511 | 0.371 | 0.028 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.118ms |

## P2 / baseline / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.306 | 0.258 | 0.000 | 0.580 | 3.690 | n/a | 0.000 | 0.060 | 1.207 | 3.210 | 0.031 | n/a | 0.328 | 9.579 | n/a | n/a | 0.028 | 4.112 | 0.192 | 0.028 |
| p99 | 80.144 | 3.368 | 0.000 | 3.698 | 10.577 | n/a | 2.271 | 1.834 | 14.560 | 35.763 | 0.121 | n/a | 4.019 | 59.565 | n/a | n/a | 0.074 | 11.249 | 0.423 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000001d9 | 80.144 | 5.940 | 0.281 | 0.260 | 0.048 | 1.419 | 11.842 | 0.052 | n/a | 0.713 | 59.565 | n/a | n/a | 0.024 | 6.529 | 0.081 | 0.024 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| ab38e516a9e073ba000000000000017a | 62.210 | 4.148 | 0.344 | 0.000 | 0.035 | 1.082 | 7.162 | 0.034 | n/a | 0.519 | 48.870 | n/a | n/a | 0.015 | 4.527 | 0.073 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000178 | 58.564 | 3.690 | 0.188 | 0.000 | 0.035 | 6.256 | 27.300 | 0.032 | n/a | 0.246 | 20.800 | n/a | n/a | 0.017 | 3.914 | 0.067 | 0.017 | gw-w/thread-45/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000000170 | 57.913 | 3.677 | 0.191 | 0.000 | 0.047 | 1.460 | 35.763 | 0.044 | n/a | 0.124 | 16.584 | n/a | n/a | 0.022 | 3.915 | 0.068 | 0.022 | gw-w/thread-45/gateway.admitted-work | none observed |
| ab38e516a9e073ba00000000000001d3 | 40.446 | 3.488 | 0.207 | 0.311 | 0.152 | 4.776 | 16.560 | 0.039 | n/a | 0.141 | 14.716 | n/a | n/a | 0.057 | 4.157 | 0.103 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.017ms |
| ab38e516a9e073ba00000000000001d0 | 38.535 | 7.066 | n/a | 0.000 | 0.065 | 0.653 | 1.073 | 0.010 | n/a | 0.073 | 29.565 | n/a | n/a | 0.030 | 7.131 | 0.185 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.117ms; driver.reader-basis.broadcast 0.046ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba000000000000012c | 37.570 | 6.217 | 0.238 | 0.000 | 0.042 | 2.573 | 11.191 | 0.044 | n/a | 0.429 | 16.815 | n/a | n/a | 0.021 | 6.497 | 0.173 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001d5 | 35.726 | 4.491 | 0.232 | 0.000 | 0.054 | 4.644 | 7.993 | 0.029 | n/a | 0.116 | 18.135 | n/a | n/a | 0.031 | 4.778 | 0.134 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| ab38e516a9e073ba0000000000000133 | 35.160 | 6.637 | n/a | 0.000 | 0.062 | 14.560 | 4.949 | 0.091 | n/a | 0.380 | 8.447 | n/a | n/a | 0.034 | 6.699 | 0.191 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.028ms |
| ab38e516a9e073ba0000000000000147 | 33.141 | 6.001 | 0.254 | 0.844 | 0.051 | 2.239 | 12.614 | 0.048 | n/a | 0.407 | 10.660 | n/a | n/a | 0.024 | 7.150 | 0.216 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000013b | 31.869 | 4.258 | 0.403 | 0.546 | 0.070 | 1.750 | 9.405 | 0.038 | n/a | 0.101 | 15.271 | n/a | n/a | 0.028 | 5.276 | 0.166 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000016a | 31.631 | 3.961 | 0.187 | 0.000 | 0.051 | 1.563 | 14.174 | 0.076 | n/a | 0.164 | 11.431 | n/a | n/a | 0.024 | 4.199 | 0.133 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001b3 | 30.704 | 6.268 | n/a | 0.000 | 0.121 | 0.929 | 3.974 | 0.024 | n/a | 0.116 | 19.214 | n/a | n/a | 0.057 | 6.389 | 0.208 | 0.057 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001ab | 30.404 | 3.988 | 0.327 | 0.393 | 0.056 | 1.715 | 14.159 | 0.081 | n/a | 0.927 | 8.729 | n/a | n/a | 0.029 | 4.764 | 0.157 | 0.029 | gw-w/thread-41/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000000137 | 30.139 | 3.884 | 0.167 | 0.000 | 0.061 | 1.375 | 10.733 | 0.070 | n/a | 0.188 | 13.632 | n/a | n/a | 0.029 | 4.112 | 0.136 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000171 | 29.586 | 3.201 | n/a | 0.000 | 0.069 | 3.902 | 1.550 | 0.026 | n/a | 3.254 | 17.539 | n/a | n/a | 0.044 | 3.271 | 0.111 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000143 | 29.482 | 4.407 | 0.165 | 0.000 | 0.091 | 1.502 | 7.918 | 0.036 | n/a | 0.102 | 15.227 | n/a | n/a | 0.034 | 4.663 | 0.158 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001bd | 29.426 | 4.227 | 0.263 | 0.000 | 0.067 | 3.634 | 9.845 | 0.038 | n/a | 0.337 | 10.966 | n/a | n/a | 0.050 | 4.557 | 0.155 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| ab38e516a9e073ba0000000000000184 | 29.195 | 7.076 | 0.253 | 0.000 | 0.046 | 1.786 | 6.885 | 0.044 | n/a | 0.328 | 12.757 | n/a | n/a | 0.019 | 7.375 | 0.253 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001b1 | 28.712 | 4.310 | 0.351 | 0.240 | 0.058 | 1.582 | 7.449 | 0.032 | n/a | 0.096 | 14.565 | n/a | n/a | 0.029 | 4.959 | 0.173 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |

## P2 / baseline / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.065 | 0.494 | 0.000 | 0.491 | 2.217 | n/a | 0.000 | 0.065 | 0.949 | 1.247 | 0.024 | n/a | 0.380 | 7.087 | n/a | n/a | 0.031 | 2.382 | 0.190 | 0.031 |
| p99 | 35.160 | 1.714 | 0.000 | 1.024 | 6.637 | n/a | 0.000 | 1.834 | 14.560 | 4.949 | 0.091 | n/a | 2.772 | 24.076 | n/a | n/a | 0.045 | 6.699 | 0.313 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000000133 | 35.160 | 6.637 | n/a | 0.000 | 0.062 | 14.560 | 4.949 | 0.091 | n/a | 0.380 | 8.447 | n/a | n/a | 0.034 | 6.699 | 0.191 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.028ms |
| ab38e516a9e073ba00000000000001cf | 28.479 | 2.084 | n/a | 0.000 | 0.065 | 1.027 | 1.041 | 0.021 | n/a | 0.123 | 24.076 | n/a | n/a | 0.042 | 2.148 | 0.075 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| ab38e516a9e073ba000000000000015a | 22.414 | 2.328 | n/a | 0.000 | 0.043 | 7.395 | 4.589 | 0.076 | n/a | 1.694 | 6.270 | n/a | n/a | 0.020 | 2.371 | 0.106 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.060ms |
| ab38e516a9e073ba00000000000001c3 | 18.992 | 2.489 | n/a | 0.000 | 0.066 | 0.949 | 1.198 | 0.022 | n/a | 0.438 | 13.798 | n/a | n/a | 0.031 | 2.554 | 0.135 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000017b | 18.327 | 3.104 | n/a | 0.000 | 0.079 | 1.390 | 1.183 | 0.037 | n/a | 0.482 | 12.007 | n/a | n/a | 0.045 | 3.183 | 0.174 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| ab38e516a9e073ba0000000000000130 | 18.268 | 2.689 | n/a | 0.000 | 0.035 | 1.444 | 1.610 | 0.034 | n/a | 0.142 | 12.295 | n/a | n/a | 0.018 | 2.725 | 0.149 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| ab38e516a9e073ba00000000000001c9 | 16.209 | 2.740 | n/a | 0.000 | 0.073 | 1.163 | 1.822 | 0.054 | n/a | 0.216 | 10.099 | n/a | n/a | 0.042 | 2.812 | 0.173 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000018f | 15.036 | 3.312 | n/a | 0.000 | 1.393 | 0.850 | 1.116 | 0.021 | n/a | 0.088 | 8.220 | n/a | n/a | 0.036 | 4.705 | 0.313 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000189 | 14.957 | 3.210 | n/a | 0.000 | 0.100 | 0.977 | 1.658 | 0.037 | n/a | 0.132 | 8.801 | n/a | n/a | 0.041 | 3.310 | 0.221 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001cb | 14.898 | 3.038 | n/a | 0.000 | 0.070 | 0.923 | 1.247 | 0.022 | n/a | 0.163 | 9.403 | n/a | n/a | 0.031 | 3.108 | 0.209 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000144 | 14.360 | 2.021 | n/a | 0.000 | 0.057 | 0.688 | 2.083 | 0.055 | n/a | 0.810 | 8.619 | n/a | n/a | 0.027 | 2.078 | 0.145 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001ad | 14.065 | 3.899 | n/a | 0.000 | 0.071 | 1.413 | 1.196 | 0.023 | n/a | 0.392 | 7.036 | n/a | n/a | 0.036 | 3.970 | 0.282 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| ab38e516a9e073ba00000000000001d7 | 13.536 | 2.847 | n/a | 0.000 | 0.067 | 1.372 | 2.096 | 0.049 | n/a | 2.772 | 4.295 | n/a | n/a | 0.038 | 2.914 | 0.215 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001c5 | 12.739 | 1.847 | n/a | 0.000 | 1.834 | 0.624 | 0.979 | 0.024 | n/a | 0.386 | 7.020 | n/a | n/a | 0.025 | 3.681 | 0.289 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001bb | 12.035 | 1.643 | n/a | 0.000 | 0.045 | 0.530 | 1.545 | 0.021 | n/a | 0.401 | 7.827 | n/a | n/a | 0.025 | 1.688 | 0.140 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000014e | 11.907 | 2.050 | n/a | 0.000 | 0.084 | 1.207 | 1.747 | 0.049 | n/a | 1.059 | 5.677 | n/a | n/a | 0.034 | 2.134 | 0.179 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000016b | 11.643 | 2.217 | n/a | 0.000 | 0.165 | 2.340 | 1.417 | 0.025 | n/a | 0.133 | 5.318 | n/a | n/a | 0.028 | 2.382 | 0.205 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001a3 | 11.299 | 2.089 | n/a | 0.000 | 0.059 | 0.837 | 1.245 | 0.024 | n/a | 0.142 | 6.871 | n/a | n/a | 0.033 | 2.148 | 0.190 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000175 | 10.708 | 1.792 | n/a | 0.000 | 0.012 | 0.583 | 1.098 | 0.021 | n/a | 0.103 | 7.087 | n/a | n/a | 0.011 | 1.804 | 0.168 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms |
| ab38e516a9e073ba000000000000017f | 9.668 | 2.188 | n/a | 0.000 | 0.055 | 0.732 | 1.213 | 0.024 | n/a | 0.506 | 4.921 | n/a | n/a | 0.029 | 2.242 | 0.232 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (284 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 92.792 | n/a | n/a | n/a | 34.552 | 13.774 | 2.508 | 0.000 | 0.285 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.032 | 62.002 | 0.808 | 17.032 |
| p99 | 738.669 | n/a | n/a | n/a | 140.630 | 664.932 | 18.082 | 0.000 | 28.188 | 70.253 | 0.005 | n/a | 0.013 | 0.000 | n/a | n/a | 192.648 | 705.662 | 1.000 | 192.648 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000023c8 | 852.471 | 13.426 | 746.190 | 0.810 | 0.000 | 0.163 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 91.881 | 760.427 | 0.892 | 91.881 | node-14/thread-0/rpc.replica.observe | client.encode 17.788ms; client.encode 16.893ms; driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.944ms; driver.reader-basis.broadcast 0.486ms |
| ab38e516a9e073ba00000000000023c9 | 851.484 | 27.213 | 757.075 | 3.314 | 0.000 | 0.170 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.711 | 787.603 | 0.925 | 63.711 | node-14/thread-0/rpc.replica.observe | client.encode 17.788ms; client.encode 16.893ms; driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.944ms; driver.reader-basis.broadcast 0.486ms |
| ab38e516a9e073ba00000000000023c7 | 738.669 | 37.630 | 664.932 | 3.100 | 0.000 | 0.591 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.417 | 705.662 | 0.955 | 32.417 | node-14/thread-0/rpc.replica.observe | client.encode 17.788ms; driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.944ms; driver.reader-basis.broadcast 0.486ms; driver.reader-basis.broadcast 0.412ms |
| ab38e516a9e073ba00000000000023d8 | 695.252 | 27.980 | 658.867 | 1.691 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.371 | 688.539 | 0.990 | 6.371 | node-14/thread-0/rpc.replica.observe | client.encode 17.223ms; driver.reader-basis.broadcast 1.025ms; driver.reader-basis.broadcast 1.003ms; driver.reader-basis.broadcast 0.931ms; driver.reader-basis.broadcast 0.595ms |
| ab38e516a9e073ba00000000000023f9 | 593.146 | 10.741 | 582.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 593.135 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | client.encode 15.321ms; driver.reader-basis.broadcast 1.256ms; driver.reader-basis.broadcast 0.736ms; driver.reader-basis.broadcast 0.409ms; driver.reader-basis.broadcast 0.383ms |
| ab38e516a9e073ba00000000000023ec | 551.055 | 4.660 | 546.387 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 551.048 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | client.encode 19.678ms; driver.reader-basis.broadcast 0.945ms; driver.reader-basis.broadcast 0.499ms; driver.reader-basis.broadcast 0.431ms; driver.reader-basis.broadcast 0.419ms |
| ab38e516a9e073ba0000000000004123 | 492.161 | 65.469 | 326.625 | 5.204 | 0.000 | 0.338 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 94.525 | 397.298 | 0.807 | 94.525 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.509ms; driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.627ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms |
| ab38e516a9e073ba000000000000411b | 490.109 | 18.739 | 385.556 | 0.000 | 0.000 | 0.361 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 85.453 | 404.295 | 0.825 | 85.453 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.509ms; driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.627ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms |
| ab38e516a9e073ba000000000000411a | 481.208 | 71.593 | 183.017 | 7.367 | 0.000 | 0.691 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 218.540 | 261.978 | 0.544 | 218.540 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 1.509ms; driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.627ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms |
| ab38e516a9e073ba0000000000004125 | 464.731 | 36.233 | 391.899 | 1.525 | 0.000 | 0.244 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.831 | 429.656 | 0.925 | 34.831 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.509ms; driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms; driver.publication.readback 0.153ms |
| ab38e516a9e073ba0000000000003942 | 429.521 | 86.718 | 216.809 | 9.204 | 0.000 | 0.417 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 116.373 | 312.730 | 0.728 | 116.373 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 1.383ms; driver.reader-basis.broadcast 0.563ms; driver.reader-basis.broadcast 0.548ms; driver.reader-basis.broadcast 0.532ms; driver.reader-basis.broadcast 0.525ms |
| ab38e516a9e073ba00000000000022e8 | 423.156 | 5.342 | 417.804 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 423.147 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 0.972ms; driver.reader-basis.broadcast 0.402ms; driver.reader-basis.broadcast 0.387ms; driver.reader-basis.broadcast 0.382ms; driver.publication.readback 0.119ms |
| ab38e516a9e073ba0000000000004116 | 409.325 | 195.886 | 110.607 | 17.854 | 0.000 | 0.584 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 84.393 | 324.348 | 0.792 | 84.393 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.627ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms; driver.publication.readback 0.148ms |
| ab38e516a9e073ba000000000000411e | 401.335 | 66.542 | 193.667 | 5.204 | 0.000 | 0.272 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 135.650 | 265.413 | 0.661 | 135.650 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.627ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms; driver.publication.readback 0.148ms |
| ab38e516a9e073ba0000000000004113 | 397.085 | 122.976 | 85.662 | 10.234 | 0.000 | 0.376 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 177.837 | 218.871 | 0.551 | 177.837 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.645ms; driver.reader-basis.broadcast 0.627ms; driver.reader-basis.broadcast 0.613ms; driver.reader-basis.broadcast 0.588ms; driver.publication.readback 0.148ms |
| ab38e516a9e073ba00000000000023f4 | 386.037 | 8.722 | 377.304 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 386.026 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.reader-basis.broadcast 1.066ms; driver.reader-basis.broadcast 0.499ms; driver.reader-basis.broadcast 0.413ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.027ms |
| ab38e516a9e073ba0000000000003940 | 375.701 | 117.970 | 75.551 | 7.228 | 0.000 | 0.584 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 174.366 | 200.750 | 0.534 | 174.366 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.563ms; driver.reader-basis.broadcast 0.548ms; driver.reader-basis.broadcast 0.532ms; driver.reader-basis.broadcast 0.525ms; driver.publication.readback 0.309ms |
| ab38e516a9e073ba000000000000271b | 354.545 | 75.954 | 249.526 | 6.694 | 0.000 | 0.457 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 21.914 | 332.174 | 0.937 | 21.914 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.682ms; driver.expected-state.bind-receipt 1.214ms; driver.reader-basis.broadcast 1.156ms; driver.reader-basis.broadcast 0.727ms; driver.reader-basis.broadcast 0.605ms |
| ab38e516a9e073ba000000000000270a | 333.090 | 86.129 | 50.169 | 6.637 | 0.000 | 0.397 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 189.757 | 142.936 | 0.429 | 189.757 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.682ms; driver.expected-state.bind-receipt 1.182ms; driver.reader-basis.broadcast 1.156ms; client.encode 1.087ms; driver.reader-basis.broadcast 0.727ms |
| ab38e516a9e073ba0000000000003939 | 330.029 | 85.940 | 104.961 | 7.362 | 0.000 | 0.308 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 131.458 | 198.263 | 0.601 | 131.458 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.563ms; driver.reader-basis.broadcast 0.532ms; driver.reader-basis.broadcast 0.525ms; driver.publication.readback 0.309ms; driver.publication.readback 0.125ms |

## P2 / L1 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.967 | 0.141 | 0.000 | 0.502 | 3.358 | n/a | 0.000 | 0.064 | 1.105 | 3.901 | 0.026 | n/a | 0.288 | 11.529 | n/a | n/a | 0.031 | 3.774 | 0.164 | 0.031 |
| p99 | 89.283 | 1.998 | 0.000 | 1.500 | 8.052 | n/a | 0.529 | 0.250 | 5.427 | 24.431 | 0.106 | n/a | 3.656 | 70.698 | n/a | n/a | 0.074 | 8.199 | 0.304 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000000200 | 91.173 | 4.076 | n/a | 0.000 | 0.129 | 1.162 | 14.916 | 0.043 | n/a | 0.086 | 70.698 | n/a | n/a | 0.062 | 4.206 | 0.046 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000257 | 89.283 | 5.202 | 0.307 | 0.368 | 0.047 | 1.408 | 10.520 | 0.023 | n/a | 0.073 | 71.310 | n/a | n/a | 0.026 | 5.924 | 0.066 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.087ms |
| ab38e516a9e073ba0000000000000266 | 59.945 | 3.644 | 0.206 | 0.248 | 0.053 | 5.880 | 33.785 | 0.034 | n/a | 2.007 | 14.043 | n/a | n/a | 0.044 | 4.151 | 0.069 | 0.044 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.042ms |
| ab38e516a9e073ba00000000000001ec | 59.737 | 14.591 | n/a | 0.000 | 0.057 | 3.421 | 13.759 | 0.106 | n/a | 1.131 | 26.640 | n/a | n/a | 0.033 | 14.647 | 0.245 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000002a4 | 57.667 | 3.298 | n/a | 0.000 | 0.055 | 2.197 | 1.460 | 0.022 | n/a | 0.551 | 50.055 | n/a | n/a | 0.030 | 3.353 | 0.058 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001f8 | 44.357 | 4.681 | n/a | 0.000 | 0.082 | 0.731 | 1.521 | 0.019 | n/a | 0.443 | 36.826 | n/a | n/a | 0.054 | 4.763 | 0.107 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001ee | 40.712 | 5.704 | 0.164 | 0.445 | 0.061 | 1.556 | 24.431 | 0.040 | n/a | 0.110 | 8.175 | n/a | n/a | 0.027 | 6.373 | 0.157 | 0.027 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.070ms |
| ab38e516a9e073ba0000000000000255 | 39.237 | 8.052 | n/a | 0.000 | 0.147 | 0.792 | 5.239 | 0.024 | n/a | 0.099 | 24.813 | n/a | n/a | 0.070 | 8.199 | 0.209 | 0.070 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| ab38e516a9e073ba000000000000029a | 37.956 | 4.420 | 0.222 | 0.000 | 0.105 | 5.427 | 9.184 | 0.033 | n/a | 3.656 | 14.867 | n/a | n/a | 0.042 | 4.747 | 0.125 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| ab38e516a9e073ba0000000000000210 | 37.123 | 2.768 | n/a | 0.000 | 0.034 | 0.604 | 1.488 | 0.020 | n/a | 0.101 | 32.092 | n/a | n/a | 0.016 | 2.802 | 0.075 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000028c | 37.034 | 3.358 | 0.201 | 0.000 | 0.136 | 1.423 | 16.590 | 0.052 | n/a | 0.112 | 15.110 | n/a | n/a | 0.052 | 3.695 | 0.100 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| ab38e516a9e073ba00000000000001fe | 36.648 | 5.046 | 0.222 | 0.278 | 0.063 | 1.736 | 8.310 | 0.046 | n/a | 0.714 | 20.202 | n/a | n/a | 0.032 | 5.608 | 0.153 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| ab38e516a9e073ba00000000000001f4 | 36.637 | 3.739 | 0.210 | 0.000 | 0.074 | 0.867 | 12.586 | 0.066 | n/a | 1.767 | 17.304 | n/a | n/a | 0.024 | 4.023 | 0.110 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| ab38e516a9e073ba0000000000000249 | 35.785 | 3.731 | 0.248 | 0.347 | 0.039 | 1.074 | 18.702 | 0.023 | n/a | 0.069 | 11.529 | n/a | n/a | 0.023 | 4.365 | 0.122 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| ab38e516a9e073ba0000000000000212 | 35.558 | 3.803 | 0.205 | 0.251 | 0.157 | 5.123 | 7.500 | 0.030 | n/a | 0.122 | 18.334 | n/a | n/a | 0.033 | 4.416 | 0.124 | 0.033 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| ab38e516a9e073ba00000000000002a6 | 34.591 | 3.751 | 0.272 | 0.251 | 0.100 | 1.182 | 18.690 | 0.039 | n/a | 0.090 | 10.169 | n/a | n/a | 0.045 | 4.374 | 0.126 | 0.045 | gw-w/thread-44/gateway.admitted-work | none observed |
| ab38e516a9e073ba00000000000001e9 | 33.627 | 4.654 | 0.179 | 0.000 | 0.070 | 1.788 | 6.523 | 0.033 | n/a | 0.694 | 19.636 | n/a | n/a | 0.049 | 4.904 | 0.146 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.027ms |
| ab38e516a9e073ba0000000000000202 | 33.350 | 4.361 | 0.310 | 0.306 | 0.079 | 2.035 | 9.311 | 0.058 | n/a | 0.898 | 15.958 | n/a | n/a | 0.033 | 5.056 | 0.152 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| ab38e516a9e073ba0000000000000239 | 33.234 | 5.283 | 0.350 | 0.443 | 0.146 | 2.083 | 6.852 | 0.032 | n/a | 0.411 | 17.580 | n/a | n/a | 0.055 | 6.222 | 0.187 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| ab38e516a9e073ba000000000000021c | 31.840 | 3.191 | 1.336 | 0.250 | 0.066 | 1.379 | 9.931 | 0.060 | n/a | 0.573 | 15.022 | n/a | n/a | 0.032 | 4.844 | 0.152 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |

## P2 / L1 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.469 | 0.000 | 0.000 | 0.498 | 2.391 | n/a | 0.000 | 0.065 | 0.754 | 1.526 | 0.022 | n/a | 0.395 | 10.284 | n/a | n/a | 0.031 | 2.475 | 0.169 | 0.031 |
| p99 | 91.173 | 2.002 | 0.000 | 0.952 | 5.818 | n/a | 0.000 | 1.283 | 2.983 | 17.227 | 0.075 | n/a | 1.644 | 70.698 | n/a | n/a | 0.089 | 5.855 | 0.313 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000000200 | 91.173 | 4.076 | n/a | 0.000 | 0.129 | 1.162 | 14.916 | 0.043 | n/a | 0.086 | 70.698 | n/a | n/a | 0.062 | 4.206 | 0.046 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001df | 27.116 | 2.815 | n/a | 0.000 | 0.037 | 1.051 | 1.867 | 0.049 | n/a | 1.031 | 20.244 | n/a | n/a | 0.022 | 2.852 | 0.105 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000280 | 26.883 | 2.400 | n/a | 0.000 | 0.075 | 0.912 | 4.856 | 0.033 | n/a | 0.127 | 18.447 | n/a | n/a | 0.033 | 2.475 | 0.092 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.089ms |
| ab38e516a9e073ba0000000000000218 | 25.745 | 2.910 | n/a | 0.000 | 0.053 | 0.923 | 17.227 | 0.066 | n/a | 0.111 | 4.426 | n/a | n/a | 0.029 | 2.963 | 0.115 | 0.029 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| ab38e516a9e073ba0000000000000229 | 22.967 | 1.906 | n/a | 0.000 | 0.049 | 0.739 | 1.148 | 0.020 | n/a | 0.136 | 18.928 | n/a | n/a | 0.041 | 1.955 | 0.085 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000208 | 22.594 | 2.165 | n/a | 0.000 | 0.077 | 0.937 | 1.719 | 0.025 | n/a | 0.977 | 16.654 | n/a | n/a | 0.041 | 2.242 | 0.099 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000021d | 21.672 | 5.818 | n/a | 0.000 | 0.037 | 2.983 | 7.715 | 0.075 | n/a | 1.644 | 3.376 | n/a | n/a | 0.025 | 5.855 | 0.270 | 0.025 | node-14/thread-0/driver.execute | none observed |
| ab38e516a9e073ba0000000000000221 | 21.418 | 2.831 | n/a | 0.000 | 0.065 | 0.877 | 1.177 | 0.031 | n/a | 1.135 | 15.275 | n/a | n/a | 0.027 | 2.896 | 0.135 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000244 | 20.873 | 3.035 | n/a | 0.000 | 0.125 | 0.648 | 0.897 | 0.012 | n/a | 0.046 | 16.060 | n/a | n/a | 0.050 | 3.161 | 0.151 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba00000000000001f2 | 19.899 | 2.391 | n/a | 0.000 | 0.060 | 0.753 | 1.075 | 0.019 | n/a | 0.104 | 15.468 | n/a | n/a | 0.028 | 2.451 | 0.123 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001e3 | 19.156 | 2.298 | n/a | 0.000 | 0.068 | 2.038 | 1.678 | 0.029 | n/a | 0.496 | 12.505 | n/a | n/a | 0.042 | 2.366 | 0.124 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| ab38e516a9e073ba000000000000020e | 19.058 | 3.137 | n/a | 0.000 | 0.123 | 1.630 | 1.820 | 0.048 | n/a | 0.288 | 11.957 | n/a | n/a | 0.055 | 3.261 | 0.171 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000231 | 18.379 | 2.838 | n/a | 0.000 | 0.101 | 0.623 | 1.946 | 0.018 | n/a | 0.113 | 12.697 | n/a | n/a | 0.043 | 2.939 | 0.160 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000001e1 | 18.233 | 1.735 | n/a | 0.000 | 0.057 | 0.578 | 1.005 | 0.020 | n/a | 1.530 | 13.284 | n/a | n/a | 0.025 | 1.792 | 0.098 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| ab38e516a9e073ba00000000000001e5 | 18.062 | 3.944 | n/a | 0.000 | 0.066 | 1.025 | 1.213 | 0.023 | n/a | 0.440 | 11.316 | n/a | n/a | 0.034 | 4.010 | 0.222 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| ab38e516a9e073ba0000000000000298 | 17.851 | 1.903 | n/a | 0.000 | 0.062 | 0.669 | 1.938 | 0.022 | n/a | 0.131 | 13.094 | n/a | n/a | 0.033 | 1.965 | 0.110 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.040ms |
| ab38e516a9e073ba00000000000001fc | 16.580 | 1.807 | n/a | 0.000 | 0.046 | 0.567 | 1.241 | 0.019 | n/a | 0.133 | 12.742 | n/a | n/a | 0.024 | 1.853 | 0.112 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000259 | 16.469 | 2.824 | n/a | 0.000 | 0.108 | 1.534 | 1.268 | 0.016 | n/a | 0.395 | 10.284 | n/a | n/a | 0.041 | 2.932 | 0.178 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.026ms |
| ab38e516a9e073ba0000000000000263 | 16.185 | 3.771 | n/a | 0.000 | 0.053 | 2.009 | 6.640 | 0.053 | n/a | 0.242 | 3.385 | n/a | n/a | 0.031 | 3.824 | 0.236 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.049ms |
| ab38e516a9e073ba00000000000002a0 | 15.783 | 3.893 | n/a | 0.000 | 0.132 | 0.957 | 1.526 | 0.020 | n/a | 0.819 | 8.371 | n/a | n/a | 0.066 | 4.025 | 0.255 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (1700 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.322 | 0.418 | 0.000 | 0.516 | 2.224 | n/a | 0.000 | 0.042 | 0.593 | 1.008 | 0.012 | n/a | 0.109 | 5.645 | n/a | n/a | 0.015 | 2.532 | 0.231 | 0.015 |
| p99 | 58.130 | 2.322 | 0.033 | 2.046 | 6.957 | n/a | 0.280 | 14.793 | 7.885 | 8.899 | 0.050 | n/a | 3.401 | 45.359 | n/a | n/a | 0.049 | 16.725 | 0.650 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000036b | 146.940 | 1.451 | n/a | 0.000 | 133.938 | 0.683 | 0.962 | 0.018 | n/a | 0.258 | 9.620 | n/a | n/a | 0.011 | 135.389 | 0.921 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.146ms; driver.publication.readback 0.136ms |
| ab38e516a9e073ba000000000000036a | 135.622 | 1.861 | n/a | 0.000 | 88.640 | 0.722 | 2.172 | 0.045 | n/a | 0.188 | 41.980 | n/a | n/a | 0.012 | 90.501 | 0.667 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.146ms; driver.publication.readback 0.136ms |
| ab38e516a9e073ba0000000000000361 | 122.725 | 4.577 | n/a | 0.000 | 64.240 | 4.485 | 2.349 | 0.050 | n/a | 0.180 | 46.815 | n/a | n/a | 0.029 | 68.817 | 0.561 | 0.029 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.136ms; driver.publication.readback 0.112ms |
| ab38e516a9e073ba0000000000000366 | 86.191 | 1.160 | n/a | 0.000 | 2.073 | 2.141 | 1.353 | 0.017 | n/a | 0.703 | 78.733 | n/a | n/a | 0.010 | 3.233 | 0.038 | 0.010 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.146ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.070ms |
| ab38e516a9e073ba0000000000000364 | 85.871 | 1.689 | n/a | 0.000 | 0.043 | 1.960 | 1.410 | 0.023 | n/a | 0.311 | 80.412 | n/a | n/a | 0.023 | 1.732 | 0.020 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.146ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.070ms |
| ab38e516a9e073ba000000000000036f | 79.710 | 4.444 | 2.497 | 0.258 | 0.062 | 1.678 | 19.532 | 0.045 | n/a | 1.211 | 49.954 | n/a | n/a | 0.029 | 7.261 | 0.091 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.136ms; driver.publication.readback 0.112ms; driver.reader-basis.broadcast 0.110ms |
| ab38e516a9e073ba0000000000000359 | 73.184 | 3.251 | n/a | 0.000 | 7.505 | 6.422 | 2.579 | 0.045 | n/a | 2.893 | 50.478 | n/a | n/a | 0.012 | 10.756 | 0.147 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.110ms; driver.publication.readback 0.091ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba0000000000000376 | 70.722 | 1.668 | n/a | 0.000 | 63.555 | 0.467 | 1.276 | 0.021 | n/a | 0.155 | 3.567 | n/a | n/a | 0.013 | 65.223 | 0.922 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.099ms; driver.publication.readback 0.060ms; driver.publication.readback 0.053ms; driver.publication.readback 0.045ms |
| ab38e516a9e073ba000000000000035c | 69.537 | 3.378 | n/a | 0.000 | 0.052 | 1.833 | 4.472 | 0.030 | n/a | 2.743 | 57.008 | n/a | n/a | 0.021 | 3.429 | 0.049 | 0.021 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.110ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba0000000000000820 | 69.099 | 2.394 | n/a | 0.000 | 47.073 | 6.556 | 0.669 | 0.010 | n/a | 0.065 | 12.318 | n/a | n/a | 0.013 | 49.467 | 0.716 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.614ms; driver.publication.readback 0.172ms; driver.reader-basis.broadcast 0.105ms; driver.publication.readback 0.091ms; driver.publication.readback 0.072ms |
| ab38e516a9e073ba000000000000035f | 66.728 | 3.137 | n/a | 0.000 | 0.066 | 1.710 | 0.946 | 0.012 | n/a | 0.437 | 60.385 | n/a | n/a | 0.033 | 3.203 | 0.048 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.146ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms |
| ab38e516a9e073ba000000000000036d | 65.960 | 1.905 | n/a | 0.000 | 0.627 | 0.654 | 1.506 | 0.037 | n/a | 0.184 | 61.035 | n/a | n/a | 0.012 | 2.532 | 0.038 | 0.012 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.112ms; driver.publication.readback 0.092ms; driver.publication.persist-deferred 0.070ms |
| ab38e516a9e073ba000000000000034f | 63.645 | 3.871 | n/a | 0.000 | 0.015 | 3.387 | 1.220 | 0.008 | n/a | 0.355 | 54.779 | n/a | n/a | 0.009 | 3.886 | 0.061 | 0.009 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.068ms; driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.026ms |
| ab38e516a9e073ba0000000000000825 | 62.303 | 6.430 | n/a | 0.000 | 0.042 | 15.656 | 1.587 | 0.019 | n/a | 0.064 | 38.463 | n/a | n/a | 0.041 | 6.472 | 0.104 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.614ms; driver.publication.readback 0.172ms; driver.reader-basis.broadcast 0.105ms; driver.publication.readback 0.091ms; driver.publication.readback 0.064ms |
| ab38e516a9e073ba0000000000000358 | 61.810 | 2.529 | n/a | 0.000 | 1.315 | 8.517 | 4.997 | 0.016 | n/a | 3.931 | 40.496 | n/a | n/a | 0.008 | 3.844 | 0.062 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.110ms; driver.publication.readback 0.091ms; driver.publication.readback 0.071ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba0000000000000352 | 61.789 | 2.260 | n/a | 0.000 | 0.032 | 1.860 | 1.207 | 0.013 | n/a | 0.133 | 56.267 | n/a | n/a | 0.017 | 2.292 | 0.037 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.091ms; driver.publication.readback 0.068ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms |
| ab38e516a9e073ba0000000000000403 | 58.806 | 2.024 | n/a | 0.000 | 0.810 | 4.208 | 0.761 | 0.014 | n/a | 1.023 | 49.950 | n/a | n/a | 0.015 | 2.834 | 0.048 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.083ms; driver.publication.readback 0.074ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms |
| ab38e516a9e073ba0000000000000375 | 58.130 | 2.260 | n/a | 0.000 | 0.229 | 0.695 | 4.451 | 0.038 | n/a | 0.124 | 50.323 | n/a | n/a | 0.011 | 2.489 | 0.043 | 0.011 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.136ms; driver.reader-basis.broadcast 0.110ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.027ms |
| ab38e516a9e073ba0000000000000824 | 57.906 | 5.024 | n/a | 0.000 | 25.012 | 0.425 | 1.348 | 0.015 | n/a | 0.110 | 25.957 | n/a | n/a | 0.014 | 30.037 | 0.519 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.172ms; driver.reader-basis.broadcast 0.105ms; driver.publication.readback 0.091ms; driver.publication.readback 0.072ms; driver.publication.readback 0.064ms |
| ab38e516a9e073ba0000000000000851 | 57.618 | 2.757 | 0.229 | 0.000 | 0.070 | 1.025 | 7.022 | 0.017 | n/a | 0.064 | 46.406 | n/a | n/a | 0.028 | 3.056 | 0.053 | 0.028 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (989 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.604 | 0.000 | 0.000 | 0.404 | 1.763 | n/a | 0.000 | 0.042 | 0.583 | 0.867 | 0.012 | n/a | 0.109 | 5.052 | n/a | n/a | 0.015 | 1.984 | 0.217 | 0.015 |
| p99 | 51.760 | 2.002 | 0.017 | 0.894 | 4.608 | n/a | 0.000 | 13.456 | 8.067 | 5.699 | 0.050 | n/a | 3.114 | 41.450 | n/a | n/a | 0.050 | 15.755 | 0.651 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000036b | 146.940 | 1.451 | n/a | 0.000 | 133.938 | 0.683 | 0.962 | 0.018 | n/a | 0.258 | 9.620 | n/a | n/a | 0.011 | 135.389 | 0.921 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.210ms; driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.146ms; driver.publication.readback 0.136ms |
| ab38e516a9e073ba0000000000000366 | 86.191 | 1.160 | n/a | 0.000 | 2.073 | 2.141 | 1.353 | 0.017 | n/a | 0.703 | 78.733 | n/a | n/a | 0.010 | 3.233 | 0.038 | 0.010 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.146ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.070ms |
| ab38e516a9e073ba0000000000000364 | 85.871 | 1.689 | n/a | 0.000 | 0.043 | 1.960 | 1.410 | 0.023 | n/a | 0.311 | 80.412 | n/a | n/a | 0.023 | 1.732 | 0.020 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.146ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.070ms |
| ab38e516a9e073ba0000000000000376 | 70.722 | 1.668 | n/a | 0.000 | 63.555 | 0.467 | 1.276 | 0.021 | n/a | 0.155 | 3.567 | n/a | n/a | 0.013 | 65.223 | 0.922 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.146ms; driver.publication.readback 0.099ms; driver.publication.readback 0.060ms; driver.publication.readback 0.053ms; driver.publication.readback 0.045ms |
| ab38e516a9e073ba0000000000000820 | 69.099 | 2.394 | n/a | 0.000 | 47.073 | 6.556 | 0.669 | 0.010 | n/a | 0.065 | 12.318 | n/a | n/a | 0.013 | 49.467 | 0.716 | 0.013 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.614ms; driver.publication.readback 0.172ms; driver.reader-basis.broadcast 0.105ms; driver.publication.readback 0.091ms; driver.publication.readback 0.072ms |
| ab38e516a9e073ba000000000000035f | 66.728 | 3.137 | n/a | 0.000 | 0.066 | 1.710 | 0.946 | 0.012 | n/a | 0.437 | 60.385 | n/a | n/a | 0.033 | 3.203 | 0.048 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.210ms; driver.publication.readback 0.146ms; driver.publication.readback 0.092ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms |
| ab38e516a9e073ba000000000000036d | 65.960 | 1.905 | n/a | 0.000 | 0.627 | 0.654 | 1.506 | 0.037 | n/a | 0.184 | 61.035 | n/a | n/a | 0.012 | 2.532 | 0.038 | 0.012 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.178ms; driver.publication.readback 0.146ms; driver.publication.readback 0.112ms; driver.publication.readback 0.092ms; driver.publication.persist-deferred 0.070ms |
| ab38e516a9e073ba0000000000000403 | 58.806 | 2.024 | n/a | 0.000 | 0.810 | 4.208 | 0.761 | 0.014 | n/a | 1.023 | 49.950 | n/a | n/a | 0.015 | 2.834 | 0.048 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.083ms; driver.publication.readback 0.074ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.018ms |
| ab38e516a9e073ba0000000000000354 | 52.614 | 1.808 | n/a | 0.000 | 0.030 | 1.523 | 8.595 | 0.044 | n/a | 0.127 | 40.473 | n/a | n/a | 0.015 | 1.838 | 0.035 | 0.015 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.091ms; driver.publication.readback 0.068ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.019ms |
| ab38e516a9e073ba000000000000034e | 51.760 | 1.584 | n/a | 0.000 | 0.016 | 0.488 | 0.891 | 0.012 | n/a | 0.084 | 48.676 | n/a | n/a | 0.009 | 1.600 | 0.031 | 0.009 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.063ms; driver.reader-basis.broadcast 0.037ms; driver.publication.persist-deferred 0.026ms; driver.publication.persist-deferred 0.015ms |
| ab38e516a9e073ba0000000000000349 | 51.037 | 2.240 | n/a | 0.000 | 0.102 | 0.600 | 1.263 | 0.019 | n/a | 0.063 | 46.706 | n/a | n/a | 0.044 | 2.342 | 0.046 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.028ms |
| ab38e516a9e073ba0000000000000351 | 49.782 | 1.539 | n/a | 0.000 | 0.037 | 1.977 | 0.877 | 0.017 | n/a | 0.270 | 45.048 | n/a | n/a | 0.017 | 1.576 | 0.032 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.readback 0.068ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba0000000000000356 | 49.594 | 1.636 | n/a | 0.000 | 0.395 | 1.603 | 1.003 | 0.046 | n/a | 0.306 | 44.594 | n/a | n/a | 0.011 | 2.031 | 0.041 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.110ms; driver.publication.readback 0.091ms; driver.publication.readback 0.071ms; driver.publication.readback 0.068ms |
| ab38e516a9e073ba0000000000000852 | 48.032 | 3.272 | n/a | 0.000 | 1.562 | 0.799 | 0.855 | 0.009 | n/a | 0.052 | 41.450 | n/a | n/a | 0.033 | 4.834 | 0.101 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000000357 | 44.370 | 1.808 | n/a | 0.000 | 0.036 | 9.803 | 5.241 | 0.051 | n/a | 0.103 | 27.310 | n/a | n/a | 0.018 | 1.844 | 0.042 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.167ms; driver.publication.readback 0.110ms; driver.publication.readback 0.091ms; driver.publication.readback 0.071ms; driver.publication.readback 0.070ms |
| ab38e516a9e073ba00000000000004eb | 42.365 | 1.453 | n/a | 0.000 | 0.037 | 4.859 | 1.219 | 0.028 | n/a | 0.064 | 34.687 | n/a | n/a | 0.018 | 1.490 | 0.035 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.073ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba000000000000068d | 41.342 | 2.766 | n/a | 0.000 | 0.086 | 0.711 | 0.856 | 0.011 | n/a | 0.246 | 36.627 | n/a | n/a | 0.038 | 2.852 | 0.069 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.099ms |
| ab38e516a9e073ba000000000000094b | 40.397 | 4.373 | n/a | 0.000 | 0.640 | 0.852 | 0.990 | 0.013 | n/a | 0.341 | 33.159 | n/a | n/a | 0.032 | 5.012 | 0.124 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba000000000000046f | 40.288 | 1.283 | n/a | 0.000 | 0.581 | 0.515 | 1.156 | 0.027 | n/a | 2.706 | 34.011 | n/a | n/a | 0.009 | 1.864 | 0.046 | 0.009 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.054ms; driver.publication.readback 0.052ms; driver.publication.readback 0.033ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.014ms |
| ab38e516a9e073ba000000000000074a | 38.028 | 1.675 | n/a | 0.000 | 0.086 | 5.395 | 0.553 | 0.008 | n/a | 0.076 | 30.226 | n/a | n/a | 0.009 | 1.761 | 0.046 | 0.009 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1777 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.302 | 0.287 | 0.000 | 0.512 | 2.232 | n/a | 0.000 | 0.038 | 0.525 | 0.916 | 0.012 | n/a | 0.082 | 5.008 | n/a | n/a | 0.013 | 2.527 | 0.252 | 0.013 |
| p99 | 49.472 | 2.007 | 0.041 | 1.988 | 7.198 | n/a | 0.235 | 14.198 | 6.627 | 6.825 | 0.046 | n/a | 2.439 | 36.603 | n/a | n/a | 0.039 | 17.490 | 0.677 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000018c2 | 135.506 | 2.100 | n/a | 0.000 | 2.271 | 2.443 | 29.039 | 0.029 | n/a | 0.069 | 99.543 | n/a | n/a | 0.012 | 4.371 | 0.032 | 0.012 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.043ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.401ms; driver.publication.readback 0.130ms; driver.publication.readback 0.084ms |
| ab38e516a9e073ba00000000000018c1 | 116.434 | 2.814 | n/a | 0.000 | 2.234 | 2.668 | 1.437 | 0.025 | n/a | 0.047 | 107.193 | n/a | n/a | 0.016 | 5.048 | 0.043 | 0.016 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.043ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.401ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.042ms |
| ab38e516a9e073ba00000000000018c3 | 102.708 | 3.737 | n/a | 0.000 | 0.056 | 5.109 | 1.865 | 0.025 | n/a | 0.073 | 91.817 | n/a | n/a | 0.026 | 3.793 | 0.037 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.043ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.401ms; driver.publication.readback 0.130ms; driver.publication.readback 0.084ms |
| ab38e516a9e073ba00000000000018c5 | 98.608 | 5.869 | n/a | 0.000 | 62.097 | 0.687 | 1.607 | 0.014 | n/a | 0.075 | 28.219 | n/a | n/a | 0.040 | 67.966 | 0.689 | 0.040 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.043ms; driver.reader-basis.broadcast 0.845ms; driver.publication.readback 0.401ms; driver.publication.readback 0.201ms; driver.publication.readback 0.084ms |
| ab38e516a9e073ba00000000000018c0 | 85.017 | 4.752 | n/a | 0.000 | 2.604 | 1.446 | 1.849 | 0.031 | n/a | 0.074 | 74.246 | n/a | n/a | 0.016 | 7.356 | 0.087 | 0.016 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.042ms |
| ab38e516a9e073ba000000000000116f | 81.084 | 9.337 | n/a | 0.000 | 46.568 | 4.427 | 3.824 | 0.042 | n/a | 0.129 | 16.748 | n/a | n/a | 0.009 | 55.905 | 0.689 | 0.009 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.080ms; driver.reader-basis.broadcast 0.229ms; driver.publication.readback 0.095ms; driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.056ms |
| ab38e516a9e073ba00000000000019b0 | 59.448 | 2.219 | n/a | 0.000 | 9.427 | 0.500 | 1.704 | 0.025 | n/a | 0.073 | 45.492 | n/a | n/a | 0.009 | 11.645 | 0.196 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.065ms; driver.publication.readback 0.064ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba0000000000001b45 | 57.291 | 2.065 | n/a | 0.000 | 15.426 | 0.402 | 0.893 | 0.010 | n/a | 0.045 | 38.438 | n/a | n/a | 0.012 | 17.490 | 0.305 | 0.012 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.773ms; driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba0000000000001a8f | 53.608 | 9.055 | n/a | 0.000 | 18.687 | 8.222 | 5.182 | 0.094 | n/a | 0.198 | 12.166 | n/a | n/a | 0.005 | 27.742 | 0.517 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 18.396ms; driver.reader-basis.broadcast 0.632ms; driver.publication.readback 0.132ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.047ms |
| ab38e516a9e073ba00000000000019b4 | 53.580 | 2.146 | n/a | 0.000 | 0.021 | 2.705 | 0.736 | 0.011 | n/a | 0.032 | 47.915 | n/a | n/a | 0.014 | 2.167 | 0.040 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba00000000000018c8 | 52.897 | 7.560 | n/a | 0.000 | 1.021 | 3.882 | 3.171 | 0.030 | n/a | 0.129 | 37.088 | n/a | n/a | 0.016 | 8.581 | 0.162 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.845ms; driver.publication.readback 0.201ms; driver.publication.readback 0.084ms; driver.publication.readback 0.073ms; driver.publication.readback 0.055ms |
| ab38e516a9e073ba000000000000116c | 51.326 | 3.657 | n/a | 0.000 | 14.629 | 0.829 | 1.631 | 0.024 | n/a | 0.144 | 30.397 | n/a | n/a | 0.014 | 18.286 | 0.356 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.019ms |
| ab38e516a9e073ba00000000000013d6 | 51.070 | 3.394 | n/a | 0.000 | 0.009 | 0.409 | 5.767 | 0.028 | n/a | 0.664 | 40.791 | n/a | n/a | 0.008 | 3.403 | 0.067 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.225ms; driver.publication.readback 0.063ms |
| ab38e516a9e073ba000000000000116e | 50.820 | 3.634 | n/a | 0.000 | 35.623 | 0.659 | 0.892 | 0.015 | n/a | 0.278 | 9.702 | n/a | n/a | 0.018 | 39.256 | 0.772 | 0.018 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.080ms; driver.publication.readback 0.095ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.056ms |
| ab38e516a9e073ba00000000000018cb | 50.582 | 4.823 | n/a | 0.000 | 19.615 | 0.442 | 1.960 | 0.014 | n/a | 0.087 | 23.623 | n/a | n/a | 0.018 | 24.439 | 0.483 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.845ms; driver.publication.readback 0.201ms; driver.publication.readback 0.073ms; driver.publication.readback 0.067ms; driver.publication.readback 0.060ms |
| ab38e516a9e073ba0000000000001a8e | 50.511 | 7.314 | n/a | 0.000 | 20.735 | 9.859 | 3.088 | 0.035 | n/a | 1.230 | 8.229 | n/a | n/a | 0.022 | 28.049 | 0.555 | 0.022 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 20.677ms; driver.reader-basis.broadcast 0.632ms; driver.publication.readback 0.132ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.047ms |
| ab38e516a9e073ba000000000000151d | 49.657 | 1.974 | n/a | 0.000 | 0.733 | 2.622 | 0.834 | 0.010 | n/a | 0.723 | 42.749 | n/a | n/a | 0.013 | 2.707 | 0.055 | 0.013 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.433ms; driver.reader-basis.broadcast 0.244ms; driver.publication.persist-deferred 0.164ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.024ms |
| ab38e516a9e073ba000000000000187b | 49.472 | 1.656 | n/a | 0.000 | 0.017 | 0.262 | 0.621 | 0.007 | n/a | 0.062 | 46.837 | n/a | n/a | 0.010 | 1.673 | 0.034 | 0.010 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.621ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba000000000000151e | 48.910 | 3.719 | n/a | 0.000 | 0.933 | 1.052 | 0.919 | 0.005 | n/a | 0.014 | 42.265 | n/a | n/a | 0.004 | 4.652 | 0.095 | 0.004 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.433ms; driver.reader-basis.broadcast 0.244ms; driver.publication.persist-deferred 0.164ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.024ms |
| ab38e516a9e073ba00000000000018c7 | 48.148 | 5.468 | n/a | 0.000 | 0.060 | 1.685 | 1.423 | 0.036 | n/a | 0.121 | 39.327 | n/a | n/a | 0.027 | 5.528 | 0.115 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.201ms; driver.publication.readback 0.084ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.052ms; driver.publication.persist-deferred 0.022ms |

## P2 / L16 / commit / 5-10 facts (1061 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.784 | 0.000 | 0.000 | 0.391 | 1.759 | n/a | 0.000 | 0.036 | 0.508 | 0.779 | 0.012 | n/a | 0.082 | 4.532 | n/a | n/a | 0.012 | 1.956 | 0.230 | 0.012 |
| p99 | 44.834 | 2.000 | 0.029 | 1.028 | 4.955 | n/a | 0.000 | 14.070 | 6.627 | 4.917 | 0.052 | n/a | 2.251 | 29.979 | n/a | n/a | 0.031 | 16.816 | 0.677 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000018c1 | 116.434 | 2.814 | n/a | 0.000 | 2.234 | 2.668 | 1.437 | 0.025 | n/a | 0.047 | 107.193 | n/a | n/a | 0.016 | 5.048 | 0.043 | 0.016 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.043ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.401ms; driver.publication.readback 0.130ms; driver.publication.persist-deferred 0.042ms |
| ab38e516a9e073ba00000000000018c3 | 102.708 | 3.737 | n/a | 0.000 | 0.056 | 5.109 | 1.865 | 0.025 | n/a | 0.073 | 91.817 | n/a | n/a | 0.026 | 3.793 | 0.037 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.043ms; driver.reader-basis.broadcast 0.480ms; driver.publication.readback 0.401ms; driver.publication.readback 0.130ms; driver.publication.readback 0.084ms |
| ab38e516a9e073ba0000000000001a8f | 53.608 | 9.055 | n/a | 0.000 | 18.687 | 8.222 | 5.182 | 0.094 | n/a | 0.198 | 12.166 | n/a | n/a | 0.005 | 27.742 | 0.517 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 18.396ms; driver.reader-basis.broadcast 0.632ms; driver.publication.readback 0.132ms; driver.publication.readback 0.113ms; driver.publication.persist-deferred 0.047ms |
| ab38e516a9e073ba00000000000019b4 | 53.580 | 2.146 | n/a | 0.000 | 0.021 | 2.705 | 0.736 | 0.011 | n/a | 0.032 | 47.915 | n/a | n/a | 0.014 | 2.167 | 0.040 | 0.014 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba000000000000116e | 50.820 | 3.634 | n/a | 0.000 | 35.623 | 0.659 | 0.892 | 0.015 | n/a | 0.278 | 9.702 | n/a | n/a | 0.018 | 39.256 | 0.772 | 0.018 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.080ms; driver.publication.readback 0.095ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.056ms |
| ab38e516a9e073ba000000000000187b | 49.472 | 1.656 | n/a | 0.000 | 0.017 | 0.262 | 0.621 | 0.007 | n/a | 0.062 | 46.837 | n/a | n/a | 0.010 | 1.673 | 0.034 | 0.010 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.621ms; driver.publication.readback 0.108ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba00000000000018c7 | 48.148 | 5.468 | n/a | 0.000 | 0.060 | 1.685 | 1.423 | 0.036 | n/a | 0.121 | 39.327 | n/a | n/a | 0.027 | 5.528 | 0.115 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.201ms; driver.publication.readback 0.084ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.052ms; driver.publication.persist-deferred 0.022ms |
| ab38e516a9e073ba00000000000011ce | 46.029 | 1.120 | n/a | 0.000 | 38.465 | 0.700 | 0.583 | 0.011 | n/a | 0.373 | 4.767 | n/a | n/a | 0.009 | 39.585 | 0.860 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.304ms; driver.publication.readback 0.168ms; driver.publication.readback 0.068ms; driver.publication.readback 0.065ms; driver.publication.readback 0.061ms |
| ab38e516a9e073ba0000000000001520 | 45.229 | 1.290 | n/a | 0.000 | 35.170 | 0.674 | 0.845 | 0.014 | n/a | 0.049 | 7.179 | n/a | n/a | 0.008 | 36.459 | 0.806 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.064ms; driver.publication.readback 0.030ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba0000000000001c41 | 44.853 | 1.202 | n/a | 0.000 | 38.636 | 0.293 | 0.724 | 0.014 | n/a | 0.143 | 3.829 | n/a | n/a | 0.012 | 39.838 | 0.888 | 0.012 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.301ms; driver.publication.readback 0.108ms; driver.publication.readback 0.068ms; driver.publication.readback 0.066ms; driver.publication.readback 0.061ms |
| ab38e516a9e073ba00000000000011fa | 44.834 | 6.834 | n/a | 0.000 | 0.031 | 4.579 | 14.159 | 0.055 | n/a | 0.309 | 18.849 | n/a | n/a | 0.019 | 6.865 | 0.153 | 0.019 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.109ms; driver.publication.persist-deferred 0.027ms |
| ab38e516a9e073ba00000000000018c9 | 44.680 | 1.672 | n/a | 0.000 | 0.048 | 0.867 | 0.850 | 0.011 | n/a | 0.077 | 41.137 | n/a | n/a | 0.019 | 1.719 | 0.038 | 0.019 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.845ms; driver.publication.readback 0.201ms; driver.publication.readback 0.084ms; driver.publication.readback 0.073ms; driver.publication.readback 0.055ms |
| ab38e516a9e073ba0000000000001b47 | 43.666 | 2.238 | n/a | 0.000 | 1.228 | 2.605 | 0.431 | 0.006 | n/a | 0.041 | 37.113 | n/a | n/a | 0.004 | 3.466 | 0.079 | 0.004 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.773ms; driver.publication.readback 0.137ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba00000000000011cb | 41.750 | 4.736 | n/a | 0.000 | 0.047 | 1.932 | 3.321 | 0.070 | n/a | 1.650 | 29.979 | n/a | n/a | 0.016 | 4.783 | 0.115 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.168ms; driver.publication.readback 0.065ms; driver.publication.readback 0.061ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.018ms |
| ab38e516a9e073ba00000000000019b6 | 40.774 | 2.591 | n/a | 0.000 | 0.045 | 0.584 | 0.691 | 0.017 | n/a | 0.218 | 36.603 | n/a | n/a | 0.025 | 2.635 | 0.065 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba00000000000019b7 | 39.891 | 1.351 | n/a | 0.000 | 29.352 | 0.303 | 0.768 | 0.009 | n/a | 0.053 | 8.043 | n/a | n/a | 0.012 | 30.703 | 0.770 | 0.012 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.267ms; driver.publication.readback 0.158ms; driver.publication.persist-deferred 0.091ms; driver.publication.readback 0.073ms; driver.publication.readback 0.033ms |
| ab38e516a9e073ba000000000000187a | 39.583 | 1.933 | n/a | 0.000 | 0.073 | 0.437 | 0.971 | 0.012 | n/a | 0.066 | 35.969 | n/a | n/a | 0.122 | 2.006 | 0.051 | 0.122 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001c3f | 37.740 | 1.614 | n/a | 0.000 | 22.492 | 0.386 | 0.471 | 0.004 | n/a | 0.161 | 12.604 | n/a | n/a | 0.007 | 24.106 | 0.639 | 0.007 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.301ms; driver.publication.readback 0.108ms; driver.publication.readback 0.066ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.042ms |
| ab38e516a9e073ba0000000000001d2a | 35.460 | 1.839 | n/a | 0.000 | 0.025 | 1.240 | 1.120 | 0.019 | n/a | 0.147 | 31.060 | n/a | n/a | 0.010 | 1.864 | 0.053 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.018ms |
| ab38e516a9e073ba00000000000014e2 | 34.410 | 1.687 | n/a | 0.000 | 0.072 | 25.677 | 0.765 | 0.013 | n/a | 0.088 | 6.087 | n/a | n/a | 0.021 | 1.759 | 0.051 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L64 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.412 | 0.222 | 0.000 | 0.476 | 3.313 | n/a | 0.000 | 0.039 | 0.868 | 1.845 | 0.017 | n/a | 0.121 | 5.910 | n/a | n/a | 0.020 | 3.552 | 0.240 | 0.020 |
| p99 | 48.237 | 3.009 | 0.047 | 2.030 | 7.866 | n/a | 0.500 | 3.632 | 4.575 | 12.581 | 0.083 | n/a | 4.253 | 40.083 | n/a | n/a | 0.066 | 8.486 | 0.533 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000001e17 | 48.237 | 3.357 | 0.180 | 0.295 | 0.039 | 1.063 | 3.043 | 0.035 | n/a | 0.121 | 40.083 | n/a | n/a | 0.019 | 3.872 | 0.080 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.236ms |
| ab38e516a9e073ba0000000000001e91 | 34.609 | 4.379 | 0.255 | 0.000 | 0.070 | 4.575 | 9.224 | 0.017 | n/a | 2.520 | 13.533 | n/a | n/a | 0.036 | 4.704 | 0.136 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.350ms |
| ab38e516a9e073ba0000000000001e57 | 26.291 | 4.112 | 0.158 | 0.000 | 0.036 | 0.842 | 5.306 | 0.017 | n/a | 0.304 | 15.496 | n/a | n/a | 0.020 | 4.305 | 0.164 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.351ms |
| ab38e516a9e073ba0000000000001def | 25.520 | 2.107 | n/a | 0.000 | 0.052 | 0.555 | 1.482 | 0.030 | n/a | 0.564 | 20.701 | n/a | n/a | 0.029 | 2.159 | 0.085 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.325ms |
| ab38e516a9e073ba0000000000001e3d | 24.685 | 3.993 | 0.256 | 0.000 | 0.048 | 1.392 | 12.581 | 0.017 | n/a | 0.056 | 6.316 | n/a | n/a | 0.024 | 4.297 | 0.174 | 0.024 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.370ms |
| ab38e516a9e073ba0000000000001ded | 23.750 | 7.866 | 0.156 | 0.432 | 0.031 | 1.528 | 8.682 | 0.018 | n/a | 0.039 | 4.984 | n/a | n/a | 0.014 | 8.486 | 0.357 | 0.014 | gw-w/thread-48/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000001df5 | 23.637 | 3.275 | n/a | 0.000 | 0.068 | 0.956 | 4.029 | 0.014 | n/a | 0.051 | 15.210 | n/a | n/a | 0.034 | 3.343 | 0.141 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e63 | 22.380 | 3.981 | 0.190 | 0.000 | 0.039 | 1.189 | 5.439 | 0.015 | n/a | 0.290 | 11.220 | n/a | n/a | 0.017 | 4.210 | 0.188 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.364ms |
| ab38e516a9e073ba0000000000001e2b | 22.116 | 6.480 | n/a | 0.000 | 0.069 | 0.493 | 1.597 | 0.014 | n/a | 0.340 | 13.097 | n/a | n/a | 0.027 | 6.549 | 0.296 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e47 | 22.049 | 3.541 | 0.243 | 0.000 | 0.077 | 3.013 | 8.625 | 0.016 | n/a | 0.050 | 6.460 | n/a | n/a | 0.024 | 3.861 | 0.175 | 0.024 | gw-w/thread-41/gateway.admitted-work | driver.reader-basis.broadcast 0.570ms |
| ab38e516a9e073ba0000000000001e35 | 21.961 | 3.484 | 0.175 | 0.000 | 0.039 | 1.148 | 3.414 | 0.016 | n/a | 0.289 | 13.380 | n/a | n/a | 0.018 | 3.698 | 0.168 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.221ms |
| ab38e516a9e073ba0000000000001e87 | 21.796 | 5.967 | 0.175 | 0.000 | 0.039 | 0.814 | 3.277 | 0.017 | n/a | 0.093 | 11.390 | n/a | n/a | 0.023 | 6.182 | 0.284 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| ab38e516a9e073ba0000000000001e79 | 21.258 | 2.991 | 0.258 | 0.000 | 0.025 | 1.165 | 7.858 | 0.024 | n/a | 0.242 | 8.684 | n/a | n/a | 0.012 | 3.273 | 0.154 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.350ms |
| ab38e516a9e073ba0000000000001e5d | 21.003 | 4.417 | 0.272 | 0.000 | 0.078 | 1.179 | 4.756 | 0.016 | n/a | 0.299 | 9.962 | n/a | n/a | 0.024 | 4.767 | 0.227 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.369ms |
| ab38e516a9e073ba0000000000001e83 | 20.719 | 3.744 | 0.174 | 0.000 | 0.039 | 1.293 | 8.265 | 0.019 | n/a | 0.087 | 7.083 | n/a | n/a | 0.015 | 3.957 | 0.191 | 0.015 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.865ms |
| ab38e516a9e073ba0000000000001e73 | 20.539 | 5.521 | n/a | 0.000 | 0.071 | 1.586 | 2.515 | 0.032 | n/a | 0.578 | 10.206 | n/a | n/a | 0.030 | 5.592 | 0.272 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001df1 | 20.267 | 3.987 | 0.295 | 0.263 | 0.038 | 1.187 | 5.324 | 0.030 | n/a | 0.076 | 9.051 | n/a | n/a | 0.014 | 4.584 | 0.226 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e4f | 20.126 | 3.447 | 0.324 | 0.000 | 0.033 | 1.301 | 7.275 | 0.020 | n/a | 0.369 | 7.337 | n/a | n/a | 0.020 | 3.805 | 0.189 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.251ms |
| ab38e516a9e073ba0000000000001e89 | 19.889 | 3.402 | n/a | 0.000 | 0.059 | 0.625 | 1.203 | 0.012 | n/a | 0.113 | 14.450 | n/a | n/a | 0.025 | 3.461 | 0.174 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e5b | 19.814 | 3.650 | n/a | 0.000 | 0.034 | 0.392 | 1.049 | 0.014 | n/a | 0.054 | 14.605 | n/a | n/a | 0.017 | 3.684 | 0.186 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.422 | 0.000 | 0.000 | 0.476 | 2.058 | n/a | 0.000 | 0.039 | 0.587 | 1.085 | 0.016 | n/a | 0.224 | 5.555 | n/a | n/a | 0.019 | 2.104 | 0.219 | 0.019 |
| p99 | 25.520 | 1.580 | 0.000 | 0.878 | 4.344 | n/a | 0.000 | 3.632 | 1.430 | 4.644 | 0.083 | n/a | 4.253 | 20.701 | n/a | n/a | 0.066 | 7.977 | 0.533 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000001def | 25.520 | 2.107 | n/a | 0.000 | 0.052 | 0.555 | 1.482 | 0.030 | n/a | 0.564 | 20.701 | n/a | n/a | 0.029 | 2.159 | 0.085 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.325ms |
| ab38e516a9e073ba0000000000001df5 | 23.637 | 3.275 | n/a | 0.000 | 0.068 | 0.956 | 4.029 | 0.014 | n/a | 0.051 | 15.210 | n/a | n/a | 0.034 | 3.343 | 0.141 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e6b | 18.866 | 4.198 | n/a | 0.000 | 0.142 | 1.046 | 1.688 | 0.021 | n/a | 0.097 | 11.607 | n/a | n/a | 0.066 | 4.340 | 0.230 | 0.066 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e11 | 16.373 | 2.372 | n/a | 0.000 | 0.036 | 0.766 | 1.076 | 0.016 | n/a | 0.070 | 12.007 | n/a | n/a | 0.030 | 2.408 | 0.147 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e5f | 15.893 | 3.185 | n/a | 0.000 | 0.067 | 0.649 | 0.867 | 0.013 | n/a | 0.345 | 10.739 | n/a | n/a | 0.028 | 3.251 | 0.205 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001dfb | 15.808 | 2.243 | n/a | 0.000 | 0.051 | 0.623 | 3.727 | 0.013 | n/a | 0.045 | 9.089 | n/a | n/a | 0.018 | 2.294 | 0.145 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e29 | 14.962 | 4.344 | n/a | 0.000 | 3.632 | 1.094 | 1.712 | 0.023 | n/a | 0.102 | 4.026 | n/a | n/a | 0.029 | 7.977 | 0.533 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e07 | 14.805 | 2.348 | n/a | 0.000 | 0.057 | 0.984 | 2.376 | 0.083 | n/a | 0.133 | 8.802 | n/a | n/a | 0.023 | 2.405 | 0.162 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001df7 | 14.621 | 2.421 | n/a | 0.000 | 0.059 | 0.749 | 4.110 | 0.026 | n/a | 0.121 | 7.107 | n/a | n/a | 0.028 | 2.479 | 0.170 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e18 | 13.884 | 1.802 | n/a | 0.000 | 0.040 | 0.761 | 1.831 | 0.036 | n/a | 4.253 | 5.140 | n/a | n/a | 0.020 | 1.842 | 0.133 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e53 | 13.272 | 3.907 | n/a | 0.000 | 0.090 | 0.914 | 1.156 | 0.022 | n/a | 0.436 | 6.705 | n/a | n/a | 0.042 | 3.997 | 0.301 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001dfd | 13.257 | 1.647 | n/a | 0.000 | 0.021 | 0.624 | 1.199 | 0.020 | n/a | 0.109 | 9.627 | n/a | n/a | 0.010 | 1.668 | 0.126 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e99 | 12.796 | 1.830 | n/a | 0.000 | 0.025 | 0.484 | 4.644 | 0.023 | n/a | 0.224 | 5.555 | n/a | n/a | 0.011 | 1.855 | 0.145 | 0.011 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e9b | 12.303 | 2.031 | n/a | 0.000 | 0.807 | 0.664 | 1.599 | 0.022 | n/a | 1.404 | 5.762 | n/a | n/a | 0.014 | 2.837 | 0.231 | 0.014 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.206ms |
| ab38e516a9e073ba0000000000001e68 | 12.128 | 2.243 | n/a | 0.000 | 0.042 | 0.875 | 2.075 | 0.038 | n/a | 0.112 | 6.725 | n/a | n/a | 0.018 | 2.285 | 0.188 | 0.018 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e9f | 11.382 | 1.969 | n/a | 0.000 | 0.039 | 0.766 | 1.896 | 0.028 | n/a | 0.155 | 6.512 | n/a | n/a | 0.017 | 2.008 | 0.176 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e33 | 11.049 | 1.954 | n/a | 0.000 | 0.034 | 0.395 | 1.044 | 0.011 | n/a | 0.049 | 7.524 | n/a | n/a | 0.039 | 1.988 | 0.180 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.267ms |
| ab38e516a9e073ba0000000000001de6 | 10.422 | 2.956 | n/a | 0.000 | 0.050 | 0.872 | 1.786 | 0.020 | n/a | 0.284 | 4.429 | n/a | n/a | 0.024 | 3.006 | 0.288 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001de9 | 9.814 | 1.532 | n/a | 0.000 | 0.028 | 0.587 | 1.389 | 0.021 | n/a | 0.609 | 5.634 | n/a | n/a | 0.013 | 1.561 | 0.159 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001e1f | 9.649 | 2.014 | n/a | 0.000 | 0.038 | 0.403 | 0.811 | 0.015 | n/a | 0.343 | 6.009 | n/a | n/a | 0.017 | 2.052 | 0.213 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.725 | 0.000 | 0.000 | 0.496 | 3.152 | n/a | 0.000 | 0.051 | 0.815 | 1.717 | 0.017 | n/a | 0.125 | 6.422 | n/a | n/a | 0.021 | 3.532 | 0.234 | 0.021 |
| p99 | 57.704 | 3.544 | 0.045 | 3.422 | 8.123 | n/a | 2.574 | 3.079 | 7.353 | 41.803 | 0.059 | n/a | 4.247 | 35.150 | n/a | n/a | 0.095 | 8.477 | 0.523 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000001ecf | 57.704 | 3.150 | 0.198 | 0.000 | 0.039 | 3.640 | 41.803 | 0.016 | n/a | 0.071 | 8.776 | n/a | n/a | 0.013 | 3.386 | 0.059 | 0.013 | gw-w/thread-68/gateway.admitted-work | driver.reader-basis.broadcast 0.397ms |
| ab38e516a9e073ba0000000000001f2d | 56.346 | 4.979 | 0.955 | 0.000 | 0.038 | 3.463 | 40.567 | 0.038 | n/a | 0.759 | 5.527 | n/a | n/a | 0.019 | 5.973 | 0.106 | 0.019 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 1.027ms |
| ab38e516a9e073ba0000000000001f35 | 41.455 | 3.152 | 0.281 | 0.000 | 0.099 | 0.953 | 1.458 | 0.018 | n/a | 0.317 | 35.150 | n/a | n/a | 0.028 | 3.532 | 0.085 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.385ms |
| ab38e516a9e073ba0000000000001eb1 | 34.716 | 2.269 | n/a | 0.000 | 0.072 | 0.925 | 4.095 | 0.023 | n/a | 0.067 | 27.233 | n/a | n/a | 0.031 | 2.341 | 0.067 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.338ms |
| ab38e516a9e073ba0000000000001ebd | 34.603 | 4.001 | 0.237 | 0.000 | 0.032 | 1.268 | 9.221 | 0.017 | n/a | 0.289 | 19.525 | n/a | n/a | 0.013 | 4.271 | 0.123 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.329ms |
| ab38e516a9e073ba0000000000001f64 | 29.435 | 4.490 | 0.260 | 0.000 | 0.172 | 1.729 | 12.065 | 0.032 | n/a | 0.180 | 10.409 | n/a | n/a | 0.095 | 4.923 | 0.167 | 0.095 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001eba | 28.373 | 2.011 | n/a | 0.000 | 0.040 | 0.449 | 0.883 | 0.013 | n/a | 0.066 | 24.893 | n/a | n/a | 0.018 | 2.051 | 0.072 | 0.018 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001eb8 | 27.331 | 4.627 | 0.242 | 0.000 | 0.046 | 1.046 | 4.795 | 0.018 | n/a | 0.068 | 16.471 | n/a | n/a | 0.017 | 4.916 | 0.180 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.343ms |
| ab38e516a9e073ba0000000000001ebc | 26.838 | 6.399 | n/a | 0.000 | 0.049 | 7.353 | 6.551 | 0.044 | n/a | 3.767 | 2.654 | n/a | n/a | 0.022 | 6.448 | 0.240 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| ab38e516a9e073ba0000000000001ec1 | 26.779 | 4.554 | 0.216 | 0.000 | 0.087 | 0.838 | 5.247 | 0.016 | n/a | 0.316 | 15.479 | n/a | n/a | 0.026 | 4.857 | 0.181 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.354ms |
| ab38e516a9e073ba0000000000001f40 | 23.793 | 5.284 | 0.347 | 0.000 | 0.064 | 1.799 | 6.356 | 0.021 | n/a | 0.052 | 9.849 | n/a | n/a | 0.020 | 5.695 | 0.239 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f1d | 22.396 | 3.195 | 0.194 | 0.000 | 0.049 | 1.062 | 5.012 | 0.016 | n/a | 0.289 | 12.563 | n/a | n/a | 0.017 | 3.438 | 0.154 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f1b | 22.388 | 3.679 | 0.274 | 0.000 | 0.051 | 1.296 | 5.312 | 0.022 | n/a | 0.061 | 11.675 | n/a | n/a | 0.019 | 4.004 | 0.179 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f07 | 21.394 | 3.188 | 0.987 | 0.000 | 0.048 | 0.792 | 5.206 | 0.017 | n/a | 0.056 | 11.080 | n/a | n/a | 0.019 | 4.224 | 0.197 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ec9 | 20.669 | 4.136 | n/a | 0.000 | 0.064 | 0.395 | 1.009 | 0.014 | n/a | 0.082 | 14.945 | n/a | n/a | 0.024 | 4.200 | 0.203 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.385ms |
| ab38e516a9e073ba0000000000001ee5 | 20.109 | 6.471 | n/a | 0.000 | 0.157 | 2.136 | 8.565 | 0.030 | n/a | 0.155 | 2.538 | n/a | n/a | 0.057 | 6.628 | 0.330 | 0.057 | node-14/thread-0/driver.execute | driver.reader-basis.broadcast 0.335ms |
| ab38e516a9e073ba0000000000001ea7 | 20.022 | 5.152 | 0.766 | 0.000 | 0.056 | 1.550 | 8.113 | 0.023 | n/a | 0.252 | 4.087 | n/a | n/a | 0.024 | 5.973 | 0.298 | 0.024 | gw-w/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.960ms |
| ab38e516a9e073ba0000000000001f33 | 19.737 | 3.537 | n/a | 0.000 | 0.371 | 0.747 | 1.633 | 0.023 | n/a | 0.573 | 12.813 | n/a | n/a | 0.041 | 3.908 | 0.198 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f05 | 19.699 | 2.716 | 0.191 | 0.000 | 0.045 | 0.754 | 3.615 | 0.017 | n/a | 0.061 | 12.284 | n/a | n/a | 0.017 | 2.952 | 0.150 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001eff | 19.197 | 3.184 | 0.260 | 0.000 | 0.039 | 1.130 | 4.867 | 0.017 | n/a | 0.288 | 9.396 | n/a | n/a | 0.015 | 3.484 | 0.181 | 0.015 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.783 | 0.457 | 0.000 | 0.472 | 2.406 | n/a | 0.000 | 0.068 | 0.661 | 1.110 | 0.017 | n/a | 0.104 | 6.033 | n/a | n/a | 0.024 | 2.853 | 0.240 | 0.024 |
| p99 | 34.716 | 1.852 | 0.000 | 0.829 | 6.471 | n/a | 2.574 | 3.079 | 7.353 | 8.565 | 0.044 | n/a | 3.767 | 27.233 | n/a | n/a | 0.057 | 6.655 | 0.416 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000001eb1 | 34.716 | 2.269 | n/a | 0.000 | 0.072 | 0.925 | 4.095 | 0.023 | n/a | 0.067 | 27.233 | n/a | n/a | 0.031 | 2.341 | 0.067 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.338ms |
| ab38e516a9e073ba0000000000001ebc | 26.838 | 6.399 | n/a | 0.000 | 0.049 | 7.353 | 6.551 | 0.044 | n/a | 3.767 | 2.654 | n/a | n/a | 0.022 | 6.448 | 0.240 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| ab38e516a9e073ba0000000000001ee5 | 20.109 | 6.471 | n/a | 0.000 | 0.157 | 2.136 | 8.565 | 0.030 | n/a | 0.155 | 2.538 | n/a | n/a | 0.057 | 6.628 | 0.330 | 0.057 | node-14/thread-0/driver.execute | driver.reader-basis.broadcast 0.335ms |
| ab38e516a9e073ba0000000000001f33 | 19.737 | 3.537 | n/a | 0.000 | 0.371 | 0.747 | 1.633 | 0.023 | n/a | 0.573 | 12.813 | n/a | n/a | 0.041 | 3.908 | 0.198 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ea5 | 18.037 | 2.523 | n/a | 0.000 | 0.074 | 0.760 | 1.500 | 0.023 | n/a | 0.129 | 12.994 | n/a | n/a | 0.035 | 2.597 | 0.144 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f50 | 17.038 | 4.025 | n/a | 0.000 | 0.128 | 0.932 | 1.073 | 0.017 | n/a | 0.093 | 10.725 | n/a | n/a | 0.046 | 4.153 | 0.244 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f5c | 16.431 | 4.034 | n/a | 2.574 | 0.046 | 0.601 | 1.110 | 0.012 | n/a | 0.052 | 7.957 | n/a | n/a | 0.044 | 6.655 | 0.405 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.260ms |
| ab38e516a9e073ba0000000000001ecd | 15.793 | 3.116 | n/a | 0.000 | 0.087 | 0.915 | 1.452 | 0.023 | n/a | 0.101 | 10.066 | n/a | n/a | 0.033 | 3.203 | 0.203 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.438ms |
| ab38e516a9e073ba0000000000001eea | 15.239 | 2.899 | n/a | 0.000 | 0.084 | 0.732 | 1.564 | 0.016 | n/a | 0.066 | 9.848 | n/a | n/a | 0.029 | 2.984 | 0.196 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ed9 | 14.987 | 2.595 | n/a | 0.000 | 1.183 | 0.593 | 1.121 | 0.017 | n/a | 0.125 | 9.327 | n/a | n/a | 0.026 | 3.779 | 0.252 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ed1 | 14.402 | 3.250 | n/a | 0.000 | 0.095 | 2.170 | 2.614 | 0.033 | n/a | 0.668 | 5.527 | n/a | n/a | 0.045 | 3.345 | 0.232 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f15 | 14.399 | 2.362 | n/a | 0.000 | 3.079 | 0.721 | 1.306 | 0.022 | n/a | 0.459 | 6.410 | n/a | n/a | 0.040 | 5.441 | 0.378 | 0.040 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001eab | 12.826 | 2.392 | n/a | 0.000 | 0.058 | 0.739 | 1.386 | 0.023 | n/a | 0.104 | 8.100 | n/a | n/a | 0.024 | 2.450 | 0.191 | 0.024 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f58 | 12.657 | 2.987 | n/a | 0.000 | 0.121 | 1.168 | 2.157 | 0.037 | n/a | 1.022 | 5.118 | n/a | n/a | 0.046 | 3.108 | 0.246 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f2e | 12.632 | 3.065 | n/a | 0.000 | 0.094 | 0.725 | 0.845 | 0.012 | n/a | 0.277 | 7.583 | n/a | n/a | 0.031 | 3.159 | 0.250 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ed6 | 12.238 | 2.786 | n/a | 0.000 | 0.068 | 0.738 | 1.600 | 0.027 | n/a | 0.125 | 6.861 | n/a | n/a | 0.033 | 2.853 | 0.233 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001eee | 12.009 | 1.883 | n/a | 0.000 | 0.027 | 0.389 | 0.864 | 0.014 | n/a | 0.281 | 8.537 | n/a | n/a | 0.014 | 1.909 | 0.159 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f3a | 11.783 | 1.360 | n/a | 0.000 | 2.829 | 1.267 | 1.307 | 0.022 | n/a | 0.520 | 4.472 | n/a | n/a | 0.007 | 4.188 | 0.355 | 0.007 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.022ms |
| ab38e516a9e073ba0000000000001ed3 | 11.678 | 2.868 | n/a | 0.000 | 0.100 | 0.956 | 1.282 | 0.031 | n/a | 0.385 | 6.010 | n/a | n/a | 0.046 | 2.968 | 0.254 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f22 | 11.123 | 2.955 | n/a | 0.000 | 1.618 | 0.491 | 0.677 | 0.010 | n/a | 0.035 | 5.318 | n/a | n/a | 0.018 | 4.574 | 0.411 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.103 | 0.257 | 0.000 | 0.445 | 3.294 | n/a | 0.000 | 0.052 | 1.006 | 2.402 | 0.021 | n/a | 0.133 | 7.369 | n/a | n/a | 0.033 | 3.734 | 0.235 | 0.033 |
| p99 | 57.254 | 4.160 | 0.035 | 3.737 | 8.290 | n/a | 2.090 | 2.849 | 4.929 | 26.981 | 0.161 | n/a | 2.886 | 46.479 | n/a | n/a | 0.088 | 11.958 | 0.529 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000001ffd | 57.254 | 3.793 | 0.268 | 0.000 | 0.030 | 1.111 | 5.487 | 0.016 | n/a | 0.047 | 46.479 | n/a | n/a | 0.023 | 4.091 | 0.071 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fbc | 41.684 | 4.647 | n/a | 0.000 | 0.069 | 1.258 | 1.354 | 0.022 | n/a | 0.087 | 34.201 | n/a | n/a | 0.045 | 4.716 | 0.113 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fbd | 35.419 | 3.430 | n/a | 0.000 | 0.072 | 0.504 | 26.981 | 0.023 | n/a | 0.036 | 4.328 | n/a | n/a | 0.046 | 3.502 | 0.099 | 0.046 | gw-w/thread-45/commit.prepare-and-validate | driver.publication.readback 0.136ms; driver.publication.persist-deferred 0.019ms |
| ab38e516a9e073ba0000000000002019 | 33.825 | 3.294 | 0.227 | 0.000 | 0.049 | 1.080 | 19.100 | 0.027 | n/a | 0.136 | 9.877 | n/a | n/a | 0.035 | 3.570 | 0.106 | 0.035 | gw-w/thread-47/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000001f87 | 32.434 | 4.331 | 0.235 | 0.000 | 0.049 | 1.484 | 11.852 | 0.036 | n/a | 0.425 | 13.980 | n/a | n/a | 0.042 | 4.615 | 0.142 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f70 | 30.448 | 3.008 | n/a | 0.000 | 0.049 | 1.280 | 9.633 | 0.013 | n/a | 0.292 | 16.139 | n/a | n/a | 0.035 | 3.057 | 0.100 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.362ms |
| ab38e516a9e073ba000000000000201d | 29.794 | 3.286 | 0.198 | 0.000 | 0.054 | 1.259 | 13.419 | 0.034 | n/a | 0.358 | 11.151 | n/a | n/a | 0.035 | 3.538 | 0.119 | 0.035 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f85 | 26.750 | 3.437 | 0.267 | 0.000 | 0.030 | 1.264 | 12.066 | 0.019 | n/a | 0.047 | 9.592 | n/a | n/a | 0.028 | 3.734 | 0.140 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f73 | 26.302 | 3.431 | 0.269 | 0.000 | 0.045 | 1.302 | 13.977 | 0.020 | n/a | 0.343 | 6.879 | n/a | n/a | 0.037 | 3.745 | 0.142 | 0.037 | gw-w/thread-48/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000001f6d | 25.625 | 3.265 | 0.177 | 0.000 | 0.052 | 1.003 | 5.126 | 0.022 | n/a | 0.044 | 15.904 | n/a | n/a | 0.032 | 3.495 | 0.136 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f79 | 25.504 | 4.832 | 0.335 | 0.000 | 0.058 | 2.319 | 6.935 | 0.065 | n/a | 0.458 | 10.458 | n/a | n/a | 0.042 | 5.226 | 0.205 | 0.042 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fb4 | 25.330 | 3.697 | 0.368 | 0.000 | 0.029 | 1.001 | 6.840 | 0.015 | n/a | 0.305 | 13.049 | n/a | n/a | 0.026 | 4.094 | 0.162 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f6f | 25.198 | 4.006 | 0.241 | 0.000 | 0.052 | 1.033 | 1.380 | 0.016 | n/a | 0.318 | 18.113 | n/a | n/a | 0.039 | 4.300 | 0.171 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fb8 | 24.123 | 3.885 | 0.245 | 0.000 | 0.055 | 1.411 | 7.721 | 0.017 | n/a | 0.271 | 10.482 | n/a | n/a | 0.035 | 4.185 | 0.173 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f97 | 23.545 | 4.517 | 0.369 | 0.000 | 0.051 | 2.061 | 8.714 | 0.023 | n/a | 0.083 | 7.681 | n/a | n/a | 0.046 | 4.938 | 0.210 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002005 | 22.872 | 3.763 | n/a | 0.000 | 0.148 | 4.929 | 1.968 | 0.034 | n/a | 0.144 | 11.810 | n/a | n/a | 0.077 | 3.911 | 0.171 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002001 | 22.736 | 3.953 | 0.175 | 0.000 | 0.039 | 1.272 | 7.414 | 0.020 | n/a | 0.071 | 9.770 | n/a | n/a | 0.023 | 4.167 | 0.183 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fba | 22.600 | 8.290 | n/a | 2.090 | 1.578 | 0.616 | 1.815 | 0.018 | n/a | 0.610 | 7.533 | n/a | n/a | 0.050 | 11.958 | 0.529 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fa6 | 22.143 | 4.239 | 0.276 | 0.000 | 0.055 | 1.175 | 5.368 | 0.036 | n/a | 0.427 | 10.530 | n/a | n/a | 0.038 | 4.569 | 0.206 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f7f | 22.113 | 3.202 | 0.221 | 0.000 | 0.113 | 1.236 | 7.836 | 0.072 | n/a | 0.379 | 8.992 | n/a | n/a | 0.063 | 3.536 | 0.160 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.123 | 0.212 | 0.000 | 0.438 | 2.338 | n/a | 0.000 | 0.048 | 0.803 | 1.345 | 0.019 | n/a | 0.103 | 5.579 | n/a | n/a | 0.033 | 2.758 | 0.234 | 0.033 |
| p99 | 35.419 | 2.277 | 0.031 | 0.970 | 4.178 | n/a | 0.000 | 2.849 | 4.929 | 26.981 | 0.060 | n/a | 1.030 | 16.139 | n/a | n/a | 0.077 | 4.991 | 0.362 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000001fbd | 35.419 | 3.430 | n/a | 0.000 | 0.072 | 0.504 | 26.981 | 0.023 | n/a | 0.036 | 4.328 | n/a | n/a | 0.046 | 3.502 | 0.099 | 0.046 | gw-w/thread-45/commit.prepare-and-validate | driver.publication.readback 0.136ms; driver.publication.persist-deferred 0.019ms |
| ab38e516a9e073ba0000000000001f70 | 30.448 | 3.008 | n/a | 0.000 | 0.049 | 1.280 | 9.633 | 0.013 | n/a | 0.292 | 16.139 | n/a | n/a | 0.035 | 3.057 | 0.100 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.362ms |
| ab38e516a9e073ba0000000000002005 | 22.872 | 3.763 | n/a | 0.000 | 0.148 | 4.929 | 1.968 | 0.034 | n/a | 0.144 | 11.810 | n/a | n/a | 0.077 | 3.911 | 0.171 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f8b | 20.326 | 2.061 | n/a | 0.000 | 0.030 | 0.911 | 1.488 | 0.034 | n/a | 0.742 | 15.032 | n/a | n/a | 0.027 | 2.091 | 0.103 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f68 | 18.177 | 2.280 | n/a | 0.000 | 1.998 | 0.889 | 5.162 | 0.036 | n/a | 0.145 | 7.624 | n/a | n/a | 0.044 | 4.278 | 0.235 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ff1 | 16.989 | 1.918 | n/a | 0.000 | 1.169 | 0.633 | 1.537 | 0.026 | n/a | 0.133 | 11.558 | n/a | n/a | 0.016 | 3.087 | 0.182 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000201f | 15.728 | 2.469 | n/a | 0.000 | 0.072 | 0.819 | 1.261 | 0.021 | n/a | 0.103 | 10.941 | n/a | n/a | 0.041 | 2.541 | 0.162 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f7d | 15.147 | 1.979 | n/a | 0.000 | 0.034 | 4.411 | 0.975 | 0.011 | n/a | 0.035 | 7.676 | n/a | n/a | 0.027 | 2.013 | 0.133 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fe8 | 15.050 | 1.737 | n/a | 0.000 | 0.033 | 0.899 | 0.914 | 0.017 | n/a | 0.060 | 11.368 | n/a | n/a | 0.023 | 1.770 | 0.118 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f9a | 14.875 | 3.906 | n/a | 0.000 | 0.048 | 1.227 | 7.727 | 0.035 | n/a | 0.297 | 1.601 | n/a | n/a | 0.033 | 3.955 | 0.266 | 0.033 | gw-w/thread-68/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000001f9c | 14.863 | 2.389 | n/a | 0.000 | 0.047 | 0.937 | 2.003 | 0.037 | n/a | 0.156 | 9.253 | n/a | n/a | 0.041 | 2.437 | 0.164 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fe6 | 14.090 | 2.142 | n/a | 0.000 | 2.849 | 0.769 | 1.336 | 0.015 | n/a | 0.077 | 6.870 | n/a | n/a | 0.032 | 4.991 | 0.354 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001ffb | 13.771 | 2.925 | n/a | 0.000 | 0.072 | 0.696 | 1.393 | 0.020 | n/a | 0.359 | 8.269 | n/a | n/a | 0.039 | 2.996 | 0.218 | 0.039 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fee | 13.443 | 3.719 | n/a | 0.000 | 0.037 | 1.519 | 5.490 | 0.043 | n/a | 0.165 | 2.441 | n/a | n/a | 0.029 | 3.756 | 0.279 | 0.029 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.416ms |
| ab38e516a9e073ba0000000000001f9e | 13.123 | 3.293 | n/a | 0.000 | 0.045 | 0.942 | 0.981 | 0.016 | n/a | 0.299 | 7.507 | n/a | n/a | 0.041 | 3.338 | 0.254 | 0.041 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f81 | 12.735 | 2.839 | n/a | 0.000 | 0.048 | 1.513 | 1.345 | 0.019 | n/a | 0.102 | 6.830 | n/a | n/a | 0.040 | 2.886 | 0.227 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.449ms |
| ab38e516a9e073ba0000000000001fc6 | 12.551 | 4.178 | n/a | 0.000 | 0.186 | 0.803 | 0.972 | 0.017 | n/a | 0.084 | 6.235 | n/a | n/a | 0.076 | 4.364 | 0.348 | 0.076 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000200b | 11.124 | 2.586 | n/a | 0.000 | 0.057 | 0.899 | 1.522 | 0.060 | n/a | 1.030 | 4.936 | n/a | n/a | 0.034 | 2.643 | 0.238 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001f8e | 10.758 | 1.958 | n/a | 0.000 | 1.623 | 0.621 | 2.718 | 0.025 | n/a | 0.428 | 3.357 | n/a | n/a | 0.027 | 3.581 | 0.333 | 0.027 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000001fda | 10.553 | 2.173 | n/a | 0.000 | 0.034 | 0.770 | 1.890 | 0.016 | n/a | 0.068 | 5.579 | n/a | n/a | 0.024 | 2.206 | 0.209 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (142 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.247 | 0.228 | 0.000 | 0.474 | 3.269 | n/a | 0.000 | 0.047 | 0.874 | 1.656 | 0.021 | n/a | 0.092 | 5.967 | n/a | n/a | 0.034 | 3.472 | 0.263 | 0.034 |
| p99 | 48.389 | 3.001 | 0.000 | 3.915 | 8.390 | n/a | 1.464 | 2.459 | 4.095 | 28.159 | 0.055 | n/a | 1.269 | 18.373 | n/a | n/a | 0.089 | 10.253 | 0.531 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000020d4 | 61.454 | 2.608 | n/a | 0.000 | 0.063 | 0.609 | 1.030 | 0.012 | n/a | 0.056 | 57.029 | n/a | n/a | 0.047 | 2.670 | 0.043 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000202b | 48.389 | 3.603 | 0.188 | 0.000 | 0.050 | 1.435 | 28.159 | 0.034 | n/a | 0.073 | 14.811 | n/a | n/a | 0.036 | 3.841 | 0.079 | 0.036 | gw-w/thread-43/commit.prepare-and-validate | none observed |
| ab38e516a9e073ba00000000000020f1 | 44.628 | 3.880 | 0.159 | 0.000 | 0.040 | 1.165 | 32.403 | 0.019 | n/a | 0.066 | 6.857 | n/a | n/a | 0.039 | 4.079 | 0.091 | 0.039 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.459ms |
| ab38e516a9e073ba0000000000002070 | 33.451 | 3.616 | 0.171 | 0.000 | 0.040 | 1.592 | 18.074 | 0.033 | n/a | 0.489 | 9.381 | n/a | n/a | 0.056 | 3.827 | 0.114 | 0.056 | gw-w/thread-68/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000002099 | 31.152 | 4.136 | 0.429 | 0.000 | 0.135 | 1.427 | 10.474 | 0.032 | n/a | 0.090 | 14.348 | n/a | n/a | 0.079 | 4.701 | 0.151 | 0.079 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.803ms |
| ab38e516a9e073ba00000000000020a7 | 30.781 | 6.675 | 0.393 | 0.000 | 0.058 | 2.298 | 3.115 | 0.035 | n/a | 0.127 | 18.038 | n/a | n/a | 0.042 | 7.125 | 0.231 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.852ms |
| ab38e516a9e073ba00000000000020fd | 27.742 | 3.969 | 0.320 | 0.000 | 0.053 | 1.333 | 3.461 | 0.045 | n/a | 0.145 | 18.373 | n/a | n/a | 0.042 | 4.343 | 0.157 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.254ms |
| ab38e516a9e073ba0000000000002051 | 27.169 | 10.813 | n/a | 0.000 | 1.581 | 0.881 | 4.327 | 0.032 | n/a | 0.758 | 8.730 | n/a | n/a | 0.047 | 12.394 | 0.456 | 0.047 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.262ms |
| ab38e516a9e073ba0000000000002053 | 26.193 | 3.498 | 0.321 | 0.000 | 0.156 | 1.239 | 7.511 | 0.023 | n/a | 2.811 | 10.571 | n/a | n/a | 0.063 | 3.975 | 0.152 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002036 | 25.641 | 8.390 | n/a | 0.000 | 0.059 | 4.095 | 3.932 | 0.063 | n/a | 0.413 | 8.649 | n/a | n/a | 0.040 | 8.449 | 0.329 | 0.040 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000206a | 23.739 | 3.269 | 0.222 | 0.000 | 0.043 | 0.975 | 5.825 | 0.039 | n/a | 0.136 | 13.199 | n/a | n/a | 0.031 | 3.534 | 0.149 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000020fb | 23.342 | 3.525 | 0.254 | 0.000 | 0.046 | 1.331 | 6.093 | 0.032 | n/a | 0.079 | 11.944 | n/a | n/a | 0.037 | 3.826 | 0.164 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.161ms |
| ab38e516a9e073ba000000000000204b | 22.628 | 3.101 | 0.180 | 0.000 | 0.054 | 1.021 | 8.557 | 0.042 | n/a | 0.160 | 9.479 | n/a | n/a | 0.034 | 3.335 | 0.147 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000212f | 22.524 | 3.231 | 0.197 | 0.000 | 0.055 | 0.996 | 5.943 | 0.027 | n/a | 0.071 | 11.962 | n/a | n/a | 0.043 | 3.483 | 0.155 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002109 | 22.083 | 3.177 | 0.248 | 0.000 | 0.046 | 0.874 | 3.052 | 0.017 | n/a | 0.213 | 14.422 | n/a | n/a | 0.034 | 3.472 | 0.157 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.566ms |
| ab38e516a9e073ba00000000000020e9 | 20.647 | 4.721 | 1.209 | 0.000 | 0.150 | 1.598 | 4.110 | 0.023 | n/a | 0.057 | 8.690 | n/a | n/a | 0.089 | 6.080 | 0.294 | 0.089 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.460ms |
| ab38e516a9e073ba00000000000020c0 | 20.417 | 3.354 | n/a | 0.000 | 0.063 | 0.755 | 0.559 | 0.008 | n/a | 0.034 | 15.598 | n/a | n/a | 0.045 | 3.417 | 0.167 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.240ms |
| ab38e516a9e073ba00000000000020bf | 20.051 | 5.775 | 0.393 | 0.000 | 0.049 | 1.646 | 5.747 | 0.026 | n/a | 0.079 | 6.293 | n/a | n/a | 0.043 | 6.218 | 0.310 | 0.043 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.600ms |
| ab38e516a9e073ba000000000000210f | 19.656 | 4.148 | 0.380 | 0.000 | 0.051 | 1.688 | 6.309 | 0.024 | n/a | 0.078 | 6.934 | n/a | n/a | 0.044 | 4.579 | 0.233 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002022 | 19.296 | 8.038 | n/a | 2.174 | 0.041 | 0.819 | 1.576 | 0.015 | n/a | 0.184 | 6.423 | n/a | n/a | 0.027 | 10.253 | 0.531 | 0.027 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.665 | 0.000 | 0.000 | 0.424 | 2.200 | n/a | 0.000 | 0.047 | 0.556 | 1.013 | 0.015 | n/a | 0.083 | 4.825 | n/a | n/a | 0.032 | 2.226 | 0.220 | 0.032 |
| p99 | 61.454 | 1.549 | 0.061 | 1.015 | 6.232 | n/a | 0.000 | 3.153 | 4.570 | 8.318 | 0.055 | n/a | 0.659 | 57.029 | n/a | n/a | 0.067 | 7.099 | 0.516 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000020d4 | 61.454 | 2.608 | n/a | 0.000 | 0.063 | 0.609 | 1.030 | 0.012 | n/a | 0.056 | 57.029 | n/a | n/a | 0.047 | 2.670 | 0.043 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000020c0 | 20.417 | 3.354 | n/a | 0.000 | 0.063 | 0.755 | 0.559 | 0.008 | n/a | 0.034 | 15.598 | n/a | n/a | 0.045 | 3.417 | 0.167 | 0.045 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.240ms |
| ab38e516a9e073ba000000000000205f | 18.843 | 3.500 | n/a | 0.000 | 0.052 | 4.570 | 8.318 | 0.036 | n/a | 0.361 | 1.967 | n/a | n/a | 0.038 | 3.552 | 0.189 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| ab38e516a9e073ba000000000000209d | 17.893 | 6.232 | n/a | 0.000 | 0.131 | 1.844 | 2.956 | 0.051 | n/a | 0.409 | 6.203 | n/a | n/a | 0.067 | 6.363 | 0.356 | 0.067 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000206e | 15.153 | 1.573 | n/a | 0.000 | 0.059 | 4.086 | 1.391 | 0.020 | n/a | 0.058 | 7.938 | n/a | n/a | 0.028 | 1.632 | 0.108 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000020aa | 14.803 | 1.962 | n/a | 0.000 | 0.041 | 0.598 | 0.731 | 0.011 | n/a | 0.073 | 11.359 | n/a | n/a | 0.028 | 2.003 | 0.135 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002057 | 14.528 | 2.462 | n/a | 0.000 | 0.050 | 0.883 | 1.938 | 0.038 | n/a | 0.171 | 8.943 | n/a | n/a | 0.042 | 2.512 | 0.173 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002066 | 13.749 | 3.946 | n/a | 0.000 | 3.153 | 1.566 | 2.787 | 0.036 | n/a | 0.486 | 1.743 | n/a | n/a | 0.032 | 7.099 | 0.516 | 0.032 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.351ms |
| ab38e516a9e073ba0000000000002129 | 13.452 | 3.996 | n/a | 0.000 | 0.049 | 1.212 | 1.951 | 0.039 | n/a | 0.146 | 6.014 | n/a | n/a | 0.045 | 4.045 | 0.301 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000208f | 13.397 | 1.819 | n/a | 0.000 | 0.035 | 0.486 | 0.949 | 0.014 | n/a | 0.069 | 9.984 | n/a | n/a | 0.041 | 1.854 | 0.138 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002054 | 13.247 | 1.406 | n/a | 0.000 | 0.030 | 0.276 | 0.700 | 0.006 | n/a | 0.036 | 10.771 | n/a | n/a | 0.023 | 1.436 | 0.108 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002115 | 13.145 | 2.323 | n/a | 0.000 | 0.038 | 1.784 | 1.472 | 0.024 | n/a | 0.100 | 7.375 | n/a | n/a | 0.029 | 2.362 | 0.180 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000020ba | 11.562 | 2.454 | n/a | 0.000 | 0.067 | 0.437 | 1.013 | 0.013 | n/a | 0.058 | 7.466 | n/a | n/a | 0.053 | 2.521 | 0.218 | 0.053 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000020e5 | 11.531 | 3.785 | n/a | 0.000 | 0.062 | 1.260 | 1.288 | 0.025 | n/a | 0.104 | 4.958 | n/a | n/a | 0.049 | 3.848 | 0.334 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002076 | 11.505 | 2.085 | n/a | 0.000 | 0.034 | 0.540 | 1.722 | 0.014 | n/a | 0.066 | 7.014 | n/a | n/a | 0.029 | 2.120 | 0.184 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.440ms |
| ab38e516a9e073ba00000000000020a1 | 11.312 | 3.396 | n/a | 0.000 | 0.059 | 0.767 | 1.195 | 0.023 | n/a | 0.109 | 5.719 | n/a | n/a | 0.044 | 3.455 | 0.305 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002093 | 10.489 | 2.206 | n/a | 0.000 | 0.032 | 2.064 | 0.833 | 0.015 | n/a | 0.059 | 5.255 | n/a | n/a | 0.027 | 2.238 | 0.213 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.913ms |
| ab38e516a9e073ba00000000000020db | 10.478 | 2.733 | n/a | 0.000 | 0.077 | 0.942 | 1.198 | 0.022 | n/a | 0.135 | 5.310 | n/a | n/a | 0.060 | 2.810 | 0.268 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.512ms |
| ab38e516a9e073ba0000000000002074 | 10.195 | 2.520 | n/a | 0.000 | 0.129 | 0.506 | 0.987 | 0.016 | n/a | 0.339 | 5.645 | n/a | n/a | 0.052 | 2.649 | 0.260 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000203a | 10.094 | 1.935 | n/a | 0.000 | 0.040 | 0.556 | 1.073 | 0.015 | n/a | 0.071 | 6.376 | n/a | n/a | 0.029 | 1.974 | 0.196 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.234 | 0.185 | 0.000 | 0.435 | 3.224 | n/a | 0.000 | 0.052 | 0.930 | 1.651 | 0.021 | n/a | 0.098 | 6.028 | n/a | n/a | 0.033 | 3.628 | 0.272 | 0.033 |
| p99 | 43.035 | 3.418 | 0.042 | 2.989 | 7.784 | n/a | 2.320 | 1.623 | 2.807 | 10.004 | 0.044 | n/a | 1.337 | 29.954 | n/a | n/a | 0.106 | 8.169 | 0.481 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000021d6 | 57.003 | 2.839 | n/a | 0.000 | 0.039 | 0.911 | 1.912 | 0.034 | n/a | 0.142 | 51.097 | n/a | n/a | 0.029 | 2.878 | 0.050 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021a7 | 43.035 | 4.555 | 0.389 | 0.000 | 0.042 | 1.349 | 6.511 | 0.024 | n/a | 0.178 | 29.954 | n/a | n/a | 0.033 | 4.986 | 0.116 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.426ms |
| ab38e516a9e073ba0000000000002182 | 27.519 | 5.171 | n/a | 1.420 | 1.578 | 0.608 | 6.343 | 0.042 | n/a | 1.337 | 10.987 | n/a | n/a | 0.034 | 8.169 | 0.297 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.382ms |
| ab38e516a9e073ba00000000000021e9 | 25.922 | 4.061 | 0.396 | 0.000 | 0.054 | 1.752 | 9.070 | 0.033 | n/a | 0.085 | 10.444 | n/a | n/a | 0.028 | 4.511 | 0.174 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002198 | 24.847 | 4.332 | 0.334 | 0.000 | 0.050 | 1.800 | 5.457 | 0.022 | n/a | 0.275 | 12.537 | n/a | n/a | 0.042 | 4.716 | 0.190 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002161 | 24.840 | 4.256 | 1.092 | 0.000 | 0.054 | 1.665 | 10.004 | 0.028 | n/a | 0.109 | 7.585 | n/a | n/a | 0.048 | 5.402 | 0.217 | 0.048 | gw-w/thread-48/gateway.admitted-work | none observed |
| ab38e516a9e073ba000000000000217e | 24.067 | 3.089 | 0.187 | 0.000 | 0.058 | 0.964 | 5.682 | 0.036 | n/a | 0.094 | 13.915 | n/a | n/a | 0.042 | 3.334 | 0.139 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021f3 | 23.927 | 3.800 | 0.190 | 0.000 | 0.052 | 1.336 | 10.896 | 0.020 | n/a | 0.057 | 7.539 | n/a | n/a | 0.037 | 4.042 | 0.169 | 0.037 | gw-w/thread-43/gateway.admitted-work | none observed |
| ab38e516a9e073ba00000000000021fa | 20.427 | 3.147 | 0.195 | 0.000 | 0.063 | 0.931 | 4.948 | 0.020 | n/a | 3.679 | 7.415 | n/a | n/a | 0.029 | 3.405 | 0.167 | 0.029 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002165 | 18.894 | 4.914 | 0.440 | 0.000 | 0.041 | 1.573 | 3.658 | 0.021 | n/a | 0.075 | 8.143 | n/a | n/a | 0.030 | 5.394 | 0.285 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002176 | 18.819 | 4.945 | n/a | 0.000 | 0.174 | 1.473 | 1.497 | 0.025 | n/a | 0.101 | 10.508 | n/a | n/a | 0.096 | 5.119 | 0.272 | 0.096 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms |
| ab38e516a9e073ba000000000000214b | 18.813 | 5.743 | 0.258 | 0.000 | 0.194 | 1.721 | 4.188 | 0.023 | n/a | 0.074 | 6.527 | n/a | n/a | 0.083 | 6.196 | 0.329 | 0.083 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002151 | 18.712 | 4.452 | 0.307 | 0.000 | 0.067 | 1.575 | 6.251 | 0.038 | n/a | 0.148 | 5.833 | n/a | n/a | 0.041 | 4.826 | 0.258 | 0.041 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002148 | 18.487 | 5.012 | n/a | 2.100 | 0.909 | 0.892 | 2.419 | 0.019 | n/a | 0.077 | 7.033 | n/a | n/a | 0.026 | 8.021 | 0.434 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021db | 18.000 | 3.246 | 0.245 | 0.000 | 0.144 | 1.192 | 2.116 | 0.033 | n/a | 0.087 | 10.869 | n/a | n/a | 0.068 | 3.635 | 0.202 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021d1 | 17.966 | 7.784 | 0.277 | 0.000 | 0.037 | 1.922 | 2.892 | 0.048 | n/a | 0.616 | 4.366 | n/a | n/a | 0.024 | 8.098 | 0.451 | 0.024 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021e3 | 17.806 | 4.901 | 0.347 | 0.000 | 0.052 | 1.265 | 1.313 | 0.022 | n/a | 0.099 | 9.775 | n/a | n/a | 0.032 | 5.300 | 0.298 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021b9 | 17.560 | 6.972 | 0.378 | 0.000 | 0.053 | 2.076 | 2.659 | 0.043 | n/a | 0.126 | 5.215 | n/a | n/a | 0.038 | 7.403 | 0.422 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000216f | 16.790 | 3.822 | 0.234 | 0.000 | 0.051 | 1.108 | 5.357 | 0.028 | n/a | 0.100 | 6.047 | n/a | n/a | 0.043 | 4.107 | 0.245 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000213d | 16.699 | 5.580 | 0.381 | 0.000 | 0.157 | 2.308 | 1.914 | 0.028 | n/a | 0.344 | 5.837 | n/a | n/a | 0.151 | 6.118 | 0.366 | 0.151 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.742 | 0.246 | 0.000 | 0.422 | 2.286 | n/a | 0.000 | 0.052 | 0.665 | 1.125 | 0.017 | n/a | 0.098 | 5.103 | n/a | n/a | 0.029 | 2.569 | 0.230 | 0.029 |
| p99 | 57.003 | 2.005 | 0.000 | 0.858 | 4.103 | n/a | 0.000 | 2.027 | 2.109 | 4.213 | 0.044 | n/a | 0.726 | 51.097 | n/a | n/a | 0.106 | 4.226 | 0.395 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000021d6 | 57.003 | 2.839 | n/a | 0.000 | 0.039 | 0.911 | 1.912 | 0.034 | n/a | 0.142 | 51.097 | n/a | n/a | 0.029 | 2.878 | 0.050 | 0.029 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002177 | 15.466 | 2.399 | n/a | 0.000 | 1.209 | 1.993 | 0.454 | 0.007 | n/a | 0.028 | 9.345 | n/a | n/a | 0.031 | 3.608 | 0.233 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.373ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba0000000000002170 | 13.901 | 1.703 | n/a | 0.000 | 0.032 | 0.433 | 0.788 | 0.025 | n/a | 0.208 | 10.680 | n/a | n/a | 0.031 | 1.736 | 0.125 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021ca | 13.733 | 3.077 | n/a | 0.000 | 0.082 | 1.009 | 3.429 | 0.016 | n/a | 0.052 | 6.028 | n/a | n/a | 0.041 | 3.159 | 0.230 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021bf | 13.564 | 3.394 | n/a | 0.000 | 0.069 | 1.188 | 2.126 | 0.042 | n/a | 0.149 | 6.544 | n/a | n/a | 0.052 | 3.463 | 0.255 | 0.052 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002157 | 13.234 | 2.750 | n/a | 0.000 | 1.477 | 0.442 | 0.902 | 0.016 | n/a | 0.099 | 7.504 | n/a | n/a | 0.044 | 4.226 | 0.319 | 0.044 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002195 | 12.858 | 2.534 | n/a | 0.000 | 0.034 | 0.873 | 4.213 | 0.014 | n/a | 0.063 | 5.103 | n/a | n/a | 0.023 | 2.569 | 0.200 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000217b | 12.839 | 1.935 | n/a | 0.000 | 0.919 | 0.649 | 1.428 | 0.021 | n/a | 0.400 | 7.462 | n/a | n/a | 0.026 | 2.853 | 0.222 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021cf | 12.704 | 1.766 | n/a | 0.000 | 0.011 | 0.360 | 0.931 | 0.012 | n/a | 0.042 | 9.572 | n/a | n/a | 0.011 | 1.777 | 0.140 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms |
| ab38e516a9e073ba00000000000021ed | 12.327 | 2.672 | n/a | 0.000 | 0.161 | 0.787 | 1.125 | 0.021 | n/a | 0.091 | 7.395 | n/a | n/a | 0.075 | 2.833 | 0.230 | 0.075 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021b0 | 12.186 | 2.712 | n/a | 0.000 | 0.054 | 0.972 | 1.246 | 0.018 | n/a | 0.085 | 7.067 | n/a | n/a | 0.032 | 2.766 | 0.227 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002163 | 11.847 | 2.286 | n/a | 0.000 | 0.064 | 0.665 | 1.195 | 0.022 | n/a | 0.098 | 7.458 | n/a | n/a | 0.058 | 2.351 | 0.198 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021d8 | 11.810 | 1.626 | n/a | 0.000 | 0.059 | 0.445 | 0.849 | 0.013 | n/a | 0.059 | 8.727 | n/a | n/a | 0.031 | 1.685 | 0.143 | 0.031 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021c5 | 11.568 | 3.962 | n/a | 0.000 | 0.103 | 2.109 | 0.991 | 0.020 | n/a | 0.106 | 4.223 | n/a | n/a | 0.055 | 4.065 | 0.351 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002143 | 10.879 | 2.185 | n/a | 0.000 | 2.027 | 0.644 | 1.135 | 0.024 | n/a | 0.094 | 4.731 | n/a | n/a | 0.039 | 4.212 | 0.387 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021fc | 10.788 | 2.663 | n/a | 0.000 | 0.047 | 0.879 | 1.762 | 0.030 | n/a | 0.726 | 4.653 | n/a | n/a | 0.029 | 2.709 | 0.251 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000214f | 10.742 | 1.576 | n/a | 0.000 | 0.032 | 0.861 | 1.699 | 0.029 | n/a | 0.128 | 6.394 | n/a | n/a | 0.024 | 1.608 | 0.150 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002199 | 10.547 | 4.103 | n/a | 0.000 | 0.062 | 1.172 | 1.648 | 0.021 | n/a | 0.086 | 3.414 | n/a | n/a | 0.041 | 4.165 | 0.395 | 0.041 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.388ms |
| ab38e516a9e073ba00000000000021e4 | 10.153 | 1.690 | n/a | 0.000 | 1.048 | 0.665 | 1.530 | 0.026 | n/a | 0.146 | 5.027 | n/a | n/a | 0.022 | 2.738 | 0.270 | 0.022 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000021b5 | 9.936 | 2.236 | n/a | 0.000 | 0.052 | 0.373 | 0.752 | 0.014 | n/a | 0.062 | 6.421 | n/a | n/a | 0.025 | 2.288 | 0.230 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 6.772 | 0.000 | 0.000 | 0.346 | 2.282 | n/a | 0.000 | 0.066 | 0.457 | 0.575 | 0.011 | n/a | 0.049 | 2.696 | n/a | n/a | 0.028 | 2.492 | 0.320 | 0.028 |
| p99 | 7.783 | 0.566 | 0.000 | 0.396 | 2.426 | n/a | 0.000 | 0.228 | 0.562 | 0.759 | 0.027 | n/a | 0.188 | 4.170 | n/a | n/a | 0.029 | 2.511 | 0.371 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000220b | 7.783 | 2.426 | n/a | 0.000 | 0.066 | 0.457 | 0.575 | 0.011 | n/a | 0.049 | 4.170 | n/a | n/a | 0.029 | 2.492 | 0.320 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002402 | 6.772 | 2.282 | n/a | 0.000 | 0.228 | 0.562 | 0.759 | 0.027 | n/a | 0.188 | 2.696 | n/a | n/a | 0.028 | 2.511 | 0.371 | 0.028 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.118ms |

## P4 / p4h1 / commit (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.549 | 0.154 | 0.000 | 0.514 | 3.130 | n/a | 0.000 | 0.053 | 0.831 | 1.643 | 0.022 | n/a | 0.084 | 6.433 | n/a | n/a | 0.027 | 3.484 | 0.242 | 0.027 |
| p99 | 35.644 | 3.009 | 0.030 | 3.437 | 12.083 | n/a | 0.000 | 1.921 | 5.134 | 13.167 | 0.084 | n/a | 0.505 | 30.415 | n/a | n/a | 0.136 | 12.184 | 0.542 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000226a | 35.644 | 2.657 | n/a | 0.000 | 0.048 | 0.530 | 1.837 | 0.029 | n/a | 0.091 | 30.415 | n/a | n/a | 0.037 | 2.705 | 0.076 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.399ms |
| ab38e516a9e073ba0000000000002295 | 33.650 | 3.777 | 0.317 | 0.000 | 0.116 | 5.134 | 13.167 | 0.028 | n/a | 0.094 | 10.962 | n/a | n/a | 0.054 | 4.210 | 0.125 | 0.054 | gw-w/thread-68/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000002217 | 29.943 | 4.934 | 0.296 | 0.000 | 0.168 | 1.413 | 5.961 | 0.022 | n/a | 0.274 | 16.816 | n/a | n/a | 0.058 | 5.398 | 0.180 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002223 | 26.026 | 3.162 | 0.292 | 0.000 | 0.154 | 1.017 | 6.734 | 0.021 | n/a | 0.393 | 14.193 | n/a | n/a | 0.060 | 3.608 | 0.139 | 0.060 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002279 | 25.805 | 2.943 | 0.185 | 0.000 | 0.033 | 0.785 | 8.502 | 0.018 | n/a | 0.055 | 13.270 | n/a | n/a | 0.015 | 3.160 | 0.122 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000220d | 25.546 | 3.269 | 0.204 | 0.000 | 0.055 | 1.433 | 8.252 | 0.024 | n/a | 0.061 | 12.223 | n/a | n/a | 0.026 | 3.527 | 0.138 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002289 | 24.848 | 3.469 | 0.154 | 0.000 | 0.062 | 1.316 | 9.874 | 0.036 | n/a | 0.424 | 9.485 | n/a | n/a | 0.030 | 3.684 | 0.148 | 0.030 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000222d | 23.826 | 4.196 | 0.461 | 0.000 | 0.059 | 1.337 | 6.715 | 0.023 | n/a | 0.054 | 10.951 | n/a | n/a | 0.030 | 4.716 | 0.198 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000221b | 22.626 | 3.068 | 0.270 | 0.000 | 0.146 | 0.994 | 10.472 | 0.034 | n/a | 0.115 | 7.390 | n/a | n/a | 0.136 | 3.484 | 0.154 | 0.136 | gw-w/thread-48/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000002265 | 22.479 | 12.083 | n/a | 0.000 | 0.101 | 0.775 | 1.924 | 0.023 | n/a | 0.505 | 6.998 | n/a | n/a | 0.070 | 12.184 | 0.542 | 0.070 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002245 | 22.095 | 3.432 | 1.978 | 0.000 | 0.050 | 0.987 | 4.432 | 0.029 | n/a | 0.080 | 11.083 | n/a | n/a | 0.027 | 5.459 | 0.247 | 0.027 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002239 | 21.374 | 3.238 | 0.203 | 0.000 | 0.056 | 1.237 | 6.392 | 0.035 | n/a | 0.129 | 10.055 | n/a | n/a | 0.029 | 3.497 | 0.164 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002233 | 20.765 | 4.603 | 0.285 | 0.000 | 0.057 | 1.048 | 6.224 | 0.024 | n/a | 0.061 | 8.436 | n/a | n/a | 0.028 | 4.945 | 0.238 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002285 | 20.704 | 3.481 | 0.201 | 0.000 | 0.078 | 1.056 | 5.287 | 0.017 | n/a | 0.042 | 10.512 | n/a | n/a | 0.029 | 3.761 | 0.182 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000226d | 20.080 | 3.594 | 0.251 | 0.000 | 0.046 | 1.161 | 7.246 | 0.036 | n/a | 0.089 | 7.629 | n/a | n/a | 0.028 | 3.891 | 0.194 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002269 | 19.506 | 3.119 | 0.195 | 0.000 | 0.052 | 0.927 | 6.322 | 0.022 | n/a | 0.058 | 8.784 | n/a | n/a | 0.027 | 3.366 | 0.173 | 0.027 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000222f | 19.289 | 3.333 | 0.182 | 0.000 | 0.064 | 1.133 | 5.959 | 0.022 | n/a | 0.052 | 8.516 | n/a | n/a | 0.027 | 3.579 | 0.186 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022bb | 19.089 | 3.187 | 0.276 | 0.000 | 0.028 | 0.929 | 6.528 | 0.035 | n/a | 0.112 | 7.977 | n/a | n/a | 0.018 | 3.491 | 0.183 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002267 | 18.657 | 3.084 | 0.162 | 0.000 | 0.045 | 0.710 | 9.105 | 0.031 | n/a | 0.099 | 5.403 | n/a | n/a | 0.019 | 3.291 | 0.176 | 0.019 | gw-w/thread-47/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000002235 | 18.573 | 3.135 | 0.198 | 0.000 | 0.052 | 1.244 | 3.469 | 0.050 | n/a | 0.142 | 10.244 | n/a | n/a | 0.039 | 3.385 | 0.182 | 0.039 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.182 | 0.000 | 0.000 | 0.509 | 2.227 | n/a | 0.000 | 0.057 | 0.615 | 1.106 | 0.017 | n/a | 0.068 | 5.431 | n/a | n/a | 0.026 | 2.291 | 0.235 | 0.026 |
| p99 | 16.969 | 1.333 | 0.000 | 0.818 | 4.332 | n/a | 0.000 | 1.803 | 1.381 | 6.679 | 0.038 | n/a | 0.425 | 12.838 | n/a | n/a | 0.092 | 4.574 | 0.381 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000225b | 16.969 | 1.815 | n/a | 0.000 | 0.047 | 0.645 | 1.481 | 0.027 | n/a | 0.090 | 12.838 | n/a | n/a | 0.025 | 1.862 | 0.110 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.433ms |
| ab38e516a9e073ba0000000000002252 | 16.276 | 2.015 | n/a | 0.000 | 0.041 | 0.667 | 1.462 | 0.022 | n/a | 0.068 | 11.977 | n/a | n/a | 0.023 | 2.057 | 0.126 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002283 | 12.781 | 4.332 | n/a | 0.000 | 0.111 | 0.878 | 1.160 | 0.021 | n/a | 0.064 | 6.123 | n/a | n/a | 0.092 | 4.443 | 0.348 | 0.092 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000225a | 12.531 | 3.016 | n/a | 0.000 | 0.024 | 0.961 | 6.679 | 0.033 | n/a | 0.062 | 1.741 | n/a | n/a | 0.015 | 3.040 | 0.243 | 0.015 | gw-w/thread-44/storage/begin-command! | none observed |
| ab38e516a9e073ba00000000000022b9 | 12.457 | 2.802 | n/a | 0.000 | 0.057 | 1.381 | 2.149 | 0.038 | n/a | 0.191 | 5.801 | n/a | n/a | 0.038 | 2.859 | 0.230 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000229d | 12.322 | 4.261 | n/a | 0.000 | 0.108 | 1.074 | 1.274 | 0.023 | n/a | 0.084 | 5.431 | n/a | n/a | 0.066 | 4.369 | 0.355 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002240 | 12.088 | 2.227 | n/a | 0.000 | 0.064 | 0.885 | 0.911 | 0.013 | n/a | 0.052 | 7.910 | n/a | n/a | 0.026 | 2.291 | 0.190 | 0.026 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.951ms |
| ab38e516a9e073ba0000000000002257 | 12.021 | 1.908 | n/a | 0.000 | 0.043 | 0.594 | 1.106 | 0.015 | n/a | 0.049 | 8.286 | n/a | n/a | 0.020 | 1.951 | 0.162 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000221c | 11.989 | 2.771 | n/a | 0.000 | 1.803 | 0.619 | 1.118 | 0.017 | n/a | 0.063 | 5.575 | n/a | n/a | 0.023 | 4.574 | 0.381 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000227a | 11.872 | 1.728 | n/a | 0.000 | 0.034 | 0.401 | 0.972 | 0.017 | n/a | 0.254 | 8.443 | n/a | n/a | 0.024 | 1.762 | 0.148 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002246 | 11.865 | 2.532 | n/a | 0.000 | 0.071 | 0.505 | 0.722 | 0.012 | n/a | 0.045 | 7.942 | n/a | n/a | 0.036 | 2.603 | 0.219 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000224a | 11.828 | 2.443 | n/a | 0.000 | 1.244 | 0.738 | 1.640 | 0.027 | n/a | 0.425 | 5.292 | n/a | n/a | 0.019 | 3.687 | 0.312 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002277 | 11.540 | 2.662 | n/a | 0.000 | 0.077 | 0.648 | 1.481 | 0.028 | n/a | 0.175 | 6.433 | n/a | n/a | 0.036 | 2.739 | 0.237 | 0.036 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002214 | 11.419 | 2.017 | n/a | 0.000 | 0.052 | 0.456 | 2.078 | 0.012 | n/a | 0.057 | 6.720 | n/a | n/a | 0.028 | 2.068 | 0.181 | 0.028 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002218 | 10.365 | 2.536 | n/a | 0.000 | 0.065 | 0.534 | 0.743 | 0.011 | n/a | 0.048 | 6.395 | n/a | n/a | 0.034 | 2.601 | 0.251 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000223a | 10.182 | 3.077 | n/a | 0.000 | 0.068 | 0.615 | 0.856 | 0.013 | n/a | 0.052 | 5.466 | n/a | n/a | 0.034 | 3.146 | 0.309 | 0.034 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022a5 | 10.005 | 2.514 | n/a | 0.000 | 0.057 | 0.778 | 1.215 | 0.022 | n/a | 0.086 | 5.301 | n/a | n/a | 0.032 | 2.571 | 0.257 | 0.032 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002297 | 9.824 | 3.378 | n/a | 0.000 | 0.104 | 0.831 | 0.917 | 0.016 | n/a | 0.271 | 4.264 | n/a | n/a | 0.044 | 3.482 | 0.354 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002271 | 9.574 | 3.264 | n/a | 0.000 | 0.095 | 0.456 | 0.813 | 0.016 | n/a | 0.060 | 4.820 | n/a | n/a | 0.050 | 3.359 | 0.351 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000226e | 9.534 | 2.750 | n/a | 0.000 | 0.040 | 0.508 | 1.132 | 0.030 | n/a | 0.086 | 4.962 | n/a | n/a | 0.025 | 2.789 | 0.293 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 561.669 | 0.000 | 0.000 | 0.387 | 2.934 | n/a | 0.000 | 0.048 | 25.094 | 1.160 | 0.023 | n/a | 0.095 | 455.999 | n/a | n/a | 0.022 | 4.200 | 0.088 | 0.022 |
| p99 | 1055.832 | 2.814 | 0.146 | 2.864 | 8.447 | n/a | 1.756 | 0.089 | 105.509 | 4.537 | 10.125 | n/a | 2.238 | 944.741 | n/a | n/a | 0.036 | 103.104 | 0.890 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000022cb | 1055.832 | 2.207 | n/a | 0.000 | 0.051 | 104.363 | 2.165 | 0.044 | n/a | 2.238 | 944.741 | n/a | n/a | 0.023 | 2.257 | 0.002 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.389ms |
| ab38e516a9e073ba00000000000022cc | 1021.277 | 1.779 | n/a | 0.000 | 0.048 | 105.050 | 0.894 | 0.014 | n/a | 0.038 | 913.431 | n/a | n/a | 0.022 | 1.827 | 0.002 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.389ms |
| ab38e516a9e073ba00000000000022dd | 932.053 | 5.564 | 92.356 | 0.000 | 0.058 | 0.994 | 1.938 | 0.028 | n/a | 0.386 | 830.708 | n/a | n/a | 0.020 | 97.978 | 0.105 | 0.020 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.958ms; driver.reader-basis.broadcast 0.426ms; driver.reader-basis.broadcast 0.412ms; driver.reader-basis.broadcast 0.404ms; driver.reader-basis.broadcast 0.403ms |
| ab38e516a9e073ba00000000000022cd | 910.768 | 1.446 | n/a | 0.000 | 0.043 | 104.914 | 2.174 | 0.014 | n/a | 0.263 | 801.892 | n/a | n/a | 0.023 | 1.489 | 0.002 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.381ms |
| ab38e516a9e073ba00000000000022ce | 813.608 | 6.361 | 96.689 | 0.000 | 0.053 | 1.748 | 4.537 | 0.044 | n/a | 0.575 | 703.578 | n/a | n/a | 0.022 | 103.104 | 0.127 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.381ms; driver.reader-basis.broadcast 0.380ms |
| ab38e516a9e073ba00000000000022de | 783.891 | 2.036 | n/a | 0.000 | 0.056 | 94.672 | 0.777 | 0.012 | n/a | 0.060 | 686.254 | n/a | n/a | 0.023 | 2.092 | 0.003 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.426ms; driver.reader-basis.broadcast 0.412ms; driver.reader-basis.broadcast 0.404ms; driver.reader-basis.broadcast 0.403ms; driver.reader-basis.broadcast 0.390ms |
| ab38e516a9e073ba00000000000022cf | 564.266 | 1.502 | n/a | 0.000 | 0.041 | 105.509 | 0.829 | 0.012 | n/a | 0.354 | 455.999 | n/a | n/a | 0.021 | 1.543 | 0.003 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.379ms; driver.reader-basis.broadcast 0.351ms |
| ab38e516a9e073ba00000000000022e9 | 561.669 | 3.267 | n/a | 1.756 | 0.047 | 94.951 | 1.756 | 0.023 | n/a | 0.129 | 459.714 | n/a | n/a | 0.026 | 5.069 | 0.009 | 0.026 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.972ms; driver.reader-basis.broadcast 0.413ms; driver.reader-basis.broadcast 0.402ms; driver.reader-basis.broadcast 0.387ms; driver.reader-basis.broadcast 0.380ms |
| ab38e516a9e073ba00000000000022df | 284.269 | 4.171 | n/a | 0.000 | 0.041 | 94.716 | 0.919 | 0.012 | n/a | 0.043 | 184.345 | n/a | n/a | 0.022 | 4.212 | 0.015 | 0.022 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.426ms; driver.reader-basis.broadcast 0.322ms; driver.publication.persist-deferred 0.028ms |
| ab38e516a9e073ba00000000000022e5 | 110.109 | 2.934 | 95.064 | 0.000 | 0.034 | 2.379 | 2.408 | 0.043 | n/a | 0.088 | 7.141 | n/a | n/a | 0.019 | 98.032 | 0.890 | 0.019 | node-14/thread-0/rpc.probe.transact | client.encode 19.552ms; driver.reader-basis.broadcast 0.361ms |
| ab38e516a9e073ba00000000000022c6 | 47.864 | 3.755 | 0.355 | 0.000 | 0.089 | 25.094 | 1.118 | 10.125 | n/a | 0.038 | 7.254 | n/a | n/a | 0.036 | 4.200 | 0.088 | 0.036 | node-14/thread-6/socket.wait-first-byte | none observed |
| ab38e516a9e073ba00000000000022da | 26.599 | 6.545 | 0.648 | 0.000 | 0.046 | 8.282 | 1.160 | 3.050 | n/a | 0.042 | 6.808 | n/a | n/a | 0.018 | 7.240 | 0.272 | 0.018 | node-14/thread-6/socket.wait-first-byte | driver.reader-basis.broadcast 0.373ms |
| ab38e516a9e073ba00000000000022ee | 20.462 | 8.447 | 0.247 | 0.000 | 0.036 | 2.960 | 1.265 | 0.021 | n/a | 0.041 | 7.424 | n/a | n/a | 0.020 | 8.730 | 0.427 | 0.020 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022e7 | 11.723 | 1.647 | n/a | 0.000 | 0.050 | 0.527 | 0.732 | 0.013 | n/a | 1.582 | 7.145 | n/a | n/a | 0.027 | 1.697 | 0.145 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022c7 | 8.553 | 2.703 | n/a | 0.000 | 0.052 | 0.538 | 1.155 | 0.024 | n/a | 0.095 | 3.958 | n/a | n/a | 0.029 | 2.755 | 0.322 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 564.266 | 0.000 | 0.000 | 0.362 | 1.647 | n/a | 0.000 | 0.050 | 94.672 | 0.829 | 0.013 | n/a | 0.263 | 455.999 | n/a | n/a | 0.023 | 1.697 | 0.003 | 0.023 |
| p99 | 1055.832 | 0.998 | 0.004 | 0.892 | 2.703 | n/a | 0.000 | 0.056 | 105.509 | 2.174 | 0.044 | n/a | 2.238 | 944.741 | n/a | n/a | 0.029 | 2.755 | 0.322 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000022cb | 1055.832 | 2.207 | n/a | 0.000 | 0.051 | 104.363 | 2.165 | 0.044 | n/a | 2.238 | 944.741 | n/a | n/a | 0.023 | 2.257 | 0.002 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.389ms |
| ab38e516a9e073ba00000000000022cd | 910.768 | 1.446 | n/a | 0.000 | 0.043 | 104.914 | 2.174 | 0.014 | n/a | 0.263 | 801.892 | n/a | n/a | 0.023 | 1.489 | 0.002 | 0.023 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.381ms |
| ab38e516a9e073ba00000000000022de | 783.891 | 2.036 | n/a | 0.000 | 0.056 | 94.672 | 0.777 | 0.012 | n/a | 0.060 | 686.254 | n/a | n/a | 0.023 | 2.092 | 0.003 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.426ms; driver.reader-basis.broadcast 0.412ms; driver.reader-basis.broadcast 0.404ms; driver.reader-basis.broadcast 0.403ms; driver.reader-basis.broadcast 0.390ms |
| ab38e516a9e073ba00000000000022cf | 564.266 | 1.502 | n/a | 0.000 | 0.041 | 105.509 | 0.829 | 0.012 | n/a | 0.354 | 455.999 | n/a | n/a | 0.021 | 1.543 | 0.003 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.993ms; driver.reader-basis.broadcast 0.918ms; driver.reader-basis.broadcast 0.420ms; driver.reader-basis.broadcast 0.379ms; driver.reader-basis.broadcast 0.351ms |
| ab38e516a9e073ba00000000000022e7 | 11.723 | 1.647 | n/a | 0.000 | 0.050 | 0.527 | 0.732 | 0.013 | n/a | 1.582 | 7.145 | n/a | n/a | 0.027 | 1.697 | 0.145 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022c7 | 8.553 | 2.703 | n/a | 0.000 | 0.052 | 0.538 | 1.155 | 0.024 | n/a | 0.095 | 3.958 | n/a | n/a | 0.029 | 2.755 | 0.322 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.257 | 0.000 | 0.000 | 0.434 | 3.349 | n/a | 0.000 | 0.051 | 0.821 | 1.531 | 0.022 | n/a | 0.083 | 5.926 | n/a | n/a | 0.024 | 3.596 | 0.260 | 0.024 |
| p99 | 37.350 | 2.356 | 0.000 | 1.518 | 7.120 | n/a | 0.000 | 1.748 | 2.260 | 11.106 | 0.052 | n/a | 0.790 | 19.473 | n/a | n/a | 0.058 | 7.207 | 0.478 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000002316 | 46.058 | 1.677 | n/a | 0.000 | 0.048 | 0.625 | 1.531 | 0.026 | n/a | 0.075 | 42.052 | n/a | n/a | 0.025 | 1.724 | 0.037 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.091ms |
| ab38e516a9e073ba00000000000022f5 | 37.350 | 3.560 | 0.260 | 0.550 | 0.091 | 1.317 | 11.650 | 0.046 | n/a | 0.372 | 19.473 | n/a | n/a | 0.031 | 4.461 | 0.119 | 0.031 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002323 | 28.099 | 5.533 | 0.279 | 0.000 | 0.051 | 1.977 | 10.715 | 0.040 | n/a | 0.083 | 9.394 | n/a | n/a | 0.026 | 5.864 | 0.209 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022fc | 25.598 | 7.808 | n/a | 0.000 | 0.116 | 0.768 | 1.543 | 0.016 | n/a | 0.060 | 15.240 | n/a | n/a | 0.046 | 7.924 | 0.310 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.222ms |
| ab38e516a9e073ba00000000000022f9 | 21.994 | 3.000 | 0.157 | 0.000 | 0.035 | 1.185 | 11.106 | 0.022 | n/a | 0.060 | 6.409 | n/a | n/a | 0.021 | 3.192 | 0.145 | 0.021 | gw-w/thread-43/gateway.admitted-work | none observed |
| ab38e516a9e073ba000000000000231d | 20.526 | 5.775 | n/a | 0.000 | 0.104 | 0.821 | 1.826 | 0.021 | n/a | 0.078 | 11.844 | n/a | n/a | 0.058 | 5.879 | 0.286 | 0.058 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002378 | 20.511 | 3.175 | 0.161 | 0.000 | 0.045 | 0.969 | 6.175 | 0.031 | n/a | 0.073 | 9.860 | n/a | n/a | 0.022 | 3.381 | 0.165 | 0.022 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002340 | 20.502 | 2.669 | 0.185 | 0.000 | 0.044 | 0.800 | 4.644 | 0.029 | n/a | 3.844 | 8.272 | n/a | n/a | 0.015 | 2.898 | 0.141 | 0.015 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000235c | 19.845 | 4.729 | 0.400 | 0.000 | 0.052 | 1.505 | 5.600 | 0.032 | n/a | 0.082 | 7.419 | n/a | n/a | 0.026 | 5.182 | 0.261 | 0.026 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000233c | 19.673 | 4.802 | 0.269 | 0.000 | 0.033 | 1.816 | 7.237 | 0.038 | n/a | 0.115 | 5.350 | n/a | n/a | 0.013 | 5.104 | 0.259 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000023ac | 19.398 | 4.611 | 0.260 | 0.000 | 0.048 | 1.334 | 5.396 | 0.032 | n/a | 0.056 | 7.638 | n/a | n/a | 0.022 | 4.919 | 0.254 | 0.022 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.498ms |
| ab38e516a9e073ba000000000000235a | 19.265 | 3.438 | 0.268 | 0.000 | 0.048 | 1.237 | 6.201 | 0.052 | n/a | 0.220 | 7.774 | n/a | n/a | 0.026 | 3.755 | 0.195 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002333 | 19.060 | 4.095 | 0.263 | 0.000 | 0.058 | 1.500 | 2.391 | 0.040 | n/a | 0.082 | 10.606 | n/a | n/a | 0.025 | 4.416 | 0.232 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002329 | 18.989 | 4.024 | n/a | 0.000 | 1.748 | 0.970 | 1.353 | 0.023 | n/a | 0.522 | 10.286 | n/a | n/a | 0.063 | 5.772 | 0.304 | 0.063 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.507ms |
| ab38e516a9e073ba000000000000233b | 18.273 | 4.104 | n/a | 0.000 | 0.042 | 1.585 | 9.697 | 0.052 | n/a | 0.543 | 2.230 | n/a | n/a | 0.019 | 4.146 | 0.227 | 0.019 | gw-w/thread-74/storage/begin-command! | none observed |
| ab38e516a9e073ba000000000000231a | 17.996 | 3.905 | 0.326 | 0.000 | 0.024 | 1.245 | 3.525 | 0.034 | n/a | 0.060 | 8.866 | n/a | n/a | 0.012 | 4.254 | 0.236 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.017ms |
| ab38e516a9e073ba00000000000023ba | 17.989 | 3.551 | 0.261 | 0.000 | 0.050 | 1.195 | 6.406 | 0.047 | n/a | 0.110 | 6.343 | n/a | n/a | 0.025 | 3.862 | 0.215 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.468ms |
| ab38e516a9e073ba0000000000002352 | 17.940 | 3.699 | n/a | 0.000 | 0.057 | 0.812 | 1.367 | 0.022 | n/a | 0.082 | 11.872 | n/a | n/a | 0.028 | 3.756 | 0.209 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002324 | 17.624 | 4.896 | n/a | 0.000 | 0.093 | 0.754 | 1.134 | 0.017 | n/a | 0.063 | 10.623 | n/a | n/a | 0.045 | 4.989 | 0.283 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000237d | 17.565 | 4.526 | n/a | 0.000 | 0.037 | 1.491 | 4.523 | 0.029 | n/a | 0.083 | 6.852 | n/a | n/a | 0.024 | 4.563 | 0.260 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.363 | 0.000 | 0.000 | 0.400 | 1.863 | n/a | 0.000 | 0.046 | 0.625 | 1.015 | 0.016 | n/a | 0.076 | 5.545 | n/a | n/a | 0.022 | 1.932 | 0.208 | 0.022 |
| p99 | 46.058 | 1.270 | 0.000 | 0.912 | 4.505 | n/a | 0.000 | 3.009 | 1.817 | 9.697 | 0.052 | n/a | 0.598 | 42.052 | n/a | n/a | 0.044 | 7.100 | 0.457 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000002316 | 46.058 | 1.677 | n/a | 0.000 | 0.048 | 0.625 | 1.531 | 0.026 | n/a | 0.075 | 42.052 | n/a | n/a | 0.025 | 1.724 | 0.037 | 0.025 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.091ms |
| ab38e516a9e073ba000000000000233b | 18.273 | 4.104 | n/a | 0.000 | 0.042 | 1.585 | 9.697 | 0.052 | n/a | 0.543 | 2.230 | n/a | n/a | 0.019 | 4.146 | 0.227 | 0.019 | gw-w/thread-74/storage/begin-command! | none observed |
| ab38e516a9e073ba0000000000002384 | 15.552 | 4.091 | n/a | 0.000 | 3.009 | 0.785 | 1.015 | 0.017 | n/a | 0.058 | 6.541 | n/a | n/a | 0.036 | 7.100 | 0.457 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002365 | 14.021 | 1.776 | n/a | 0.000 | 0.058 | 0.921 | 1.117 | 0.015 | n/a | 0.057 | 10.051 | n/a | n/a | 0.026 | 1.834 | 0.131 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002319 | 13.661 | 1.710 | n/a | 0.000 | 0.041 | 0.469 | 1.024 | 0.015 | n/a | 0.237 | 10.142 | n/a | n/a | 0.022 | 1.751 | 0.128 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002344 | 13.465 | 3.058 | n/a | 0.000 | 0.051 | 0.750 | 1.397 | 0.022 | n/a | 0.454 | 7.704 | n/a | n/a | 0.028 | 3.109 | 0.231 | 0.028 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.201ms |
| ab38e516a9e073ba0000000000002303 | 13.257 | 1.463 | n/a | 0.000 | 0.031 | 0.373 | 0.767 | 0.012 | n/a | 0.250 | 10.346 | n/a | n/a | 0.015 | 1.494 | 0.113 | 0.015 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000022fe | 13.028 | 2.408 | n/a | 0.000 | 0.026 | 0.545 | 4.590 | 0.012 | n/a | 0.206 | 5.224 | n/a | n/a | 0.017 | 2.434 | 0.187 | 0.017 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002379 | 12.873 | 1.954 | n/a | 0.000 | 0.054 | 0.696 | 1.311 | 0.021 | n/a | 0.349 | 8.467 | n/a | n/a | 0.022 | 2.008 | 0.156 | 0.022 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000023a4 | 12.427 | 4.505 | n/a | 0.000 | 0.044 | 1.817 | 3.772 | 0.033 | n/a | 0.067 | 2.157 | n/a | n/a | 0.032 | 4.549 | 0.366 | 0.032 | node-14/thread-0/driver.execute | none observed |
| ab38e516a9e073ba00000000000022f7 | 12.251 | 1.727 | n/a | 0.000 | 0.036 | 0.828 | 1.406 | 0.024 | n/a | 0.123 | 8.084 | n/a | n/a | 0.023 | 1.763 | 0.144 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002310 | 12.247 | 1.703 | n/a | 0.000 | 0.036 | 0.466 | 0.809 | 0.012 | n/a | 0.182 | 9.013 | n/a | n/a | 0.024 | 1.739 | 0.142 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000023ad | 12.115 | 4.128 | n/a | 0.000 | 0.083 | 0.687 | 0.897 | 0.016 | n/a | 0.339 | 5.926 | n/a | n/a | 0.039 | 4.211 | 0.348 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000233e | 12.110 | 2.106 | n/a | 0.000 | 0.052 | 0.676 | 1.252 | 0.022 | n/a | 0.092 | 7.878 | n/a | n/a | 0.032 | 2.157 | 0.178 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002301 | 12.061 | 1.561 | n/a | 0.000 | 0.038 | 0.361 | 0.910 | 0.012 | n/a | 0.060 | 9.102 | n/a | n/a | 0.018 | 1.599 | 0.133 | 0.018 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002335 | 11.266 | 1.878 | n/a | 0.000 | 0.053 | 0.926 | 1.915 | 0.038 | n/a | 0.125 | 6.299 | n/a | n/a | 0.032 | 1.932 | 0.171 | 0.032 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000239f | 11.003 | 2.526 | n/a | 0.000 | 0.046 | 0.610 | 1.128 | 0.021 | n/a | 0.066 | 6.582 | n/a | n/a | 0.023 | 2.573 | 0.234 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000239c | 10.363 | 3.698 | n/a | 0.000 | 0.117 | 0.698 | 0.948 | 0.015 | n/a | 0.049 | 4.792 | n/a | n/a | 0.044 | 3.816 | 0.368 | 0.044 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002341 | 10.109 | 1.863 | n/a | 0.000 | 1.716 | 0.493 | 0.998 | 0.016 | n/a | 0.334 | 4.671 | n/a | n/a | 0.019 | 3.579 | 0.354 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002338 | 10.073 | 2.600 | n/a | 0.000 | 0.033 | 0.827 | 0.784 | 0.012 | n/a | 0.313 | 5.487 | n/a | n/a | 0.018 | 2.632 | 0.261 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 108.017 | 0.000 | 0.000 | 0.382 | 3.111 | n/a | 0.000 | 0.045 | 3.471 | 1.544 | 0.018 | n/a | 0.052 | 23.997 | n/a | n/a | 0.020 | 5.740 | 0.231 | 0.020 |
| p99 | 488.993 | 2.007 | 0.025 | 1.764 | 7.045 | n/a | 0.000 | 13.899 | 94.607 | 6.190 | 0.048 | n/a | 1.342 | 401.460 | n/a | n/a | 0.037 | 103.991 | 0.908 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000023c3 | 488.993 | 2.423 | n/a | 0.000 | 0.057 | 84.070 | 0.899 | 0.014 | n/a | 0.050 | 401.460 | n/a | n/a | 0.020 | 2.480 | 0.005 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.940ms; driver.reader-basis.broadcast 0.397ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.394ms; driver.reader-basis.broadcast 0.378ms |
| ab38e516a9e073ba00000000000023f1 | 450.816 | 3.111 | 100.836 | 0.000 | 0.044 | 0.888 | 5.717 | 0.016 | n/a | 0.032 | 340.144 | n/a | n/a | 0.028 | 103.991 | 0.231 | 0.028 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.945ms; driver.reader-basis.broadcast 0.499ms; driver.reader-basis.broadcast 0.419ms; driver.reader-basis.broadcast 0.412ms; driver.reader-basis.broadcast 0.346ms |
| ab38e516a9e073ba00000000000023cc | 417.075 | 2.893 | n/a | 0.000 | 0.016 | 87.949 | 0.754 | 0.011 | n/a | 0.023 | 325.409 | n/a | n/a | 0.021 | 2.908 | 0.007 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.944ms; driver.reader-basis.broadcast 0.486ms; driver.reader-basis.broadcast 0.402ms; driver.publication.persist-deferred 0.028ms |
| ab38e516a9e073ba00000000000023e6 | 352.791 | 3.111 | 81.620 | 0.000 | 0.043 | 3.471 | 2.332 | 0.038 | n/a | 0.064 | 262.093 | n/a | n/a | 0.019 | 84.774 | 0.240 | 0.019 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.036ms; driver.reader-basis.broadcast 0.413ms; driver.reader-basis.broadcast 0.405ms; driver.reader-basis.broadcast 0.324ms; driver.publication.persist-deferred 0.029ms |
| ab38e516a9e073ba00000000000023c4 | 321.111 | 1.237 | n/a | 0.000 | 0.032 | 84.694 | 1.544 | 0.012 | n/a | 0.040 | 233.535 | n/a | n/a | 0.017 | 1.269 | 0.004 | 0.017 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.940ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.378ms; driver.publication.persist-deferred 0.030ms |
| ab38e516a9e073ba00000000000023c5 | 299.058 | 2.507 | n/a | 0.000 | 0.037 | 84.842 | 0.854 | 0.008 | n/a | 0.027 | 210.765 | n/a | n/a | 0.018 | 2.544 | 0.009 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.940ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.378ms; driver.publication.persist-deferred 0.030ms |
| ab38e516a9e073ba00000000000023cd | 222.811 | 2.931 | n/a | 0.000 | 0.078 | 87.321 | 1.567 | 0.029 | n/a | 0.143 | 130.705 | n/a | n/a | 0.037 | 3.009 | 0.014 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.486ms; driver.publication.persist-deferred 0.028ms |
| ab38e516a9e073ba00000000000023f8 | 222.474 | 1.764 | n/a | 0.000 | 0.038 | 76.714 | 0.678 | 0.013 | n/a | 0.202 | 143.046 | n/a | n/a | 0.020 | 1.802 | 0.008 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.499ms; driver.reader-basis.broadcast 0.468ms; driver.reader-basis.broadcast 0.393ms; driver.publication.persist-deferred 0.030ms |
| ab38e516a9e073ba00000000000023eb | 188.648 | 1.685 | n/a | 0.000 | 0.048 | 94.607 | 0.652 | 0.013 | n/a | 0.216 | 91.403 | n/a | n/a | 0.024 | 1.733 | 0.009 | 0.024 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.375ms; driver.publication.persist-deferred 0.033ms |
| ab38e516a9e073ba00000000000023f6 | 110.104 | 4.148 | 92.091 | 0.000 | 0.047 | 1.440 | 3.905 | 0.038 | n/a | 0.914 | 7.504 | n/a | n/a | 0.018 | 96.286 | 0.874 | 0.018 | node-14/thread-0/rpc.probe.transact | driver.reader-basis.broadcast 0.487ms; driver.reader-basis.broadcast 0.435ms; driver.publication.persist-deferred 0.094ms; driver.publication.readback 0.083ms |
| ab38e516a9e073ba00000000000023c1 | 108.017 | 4.880 | 93.155 | 0.000 | 0.038 | 1.178 | 2.786 | 0.019 | n/a | 0.051 | 5.894 | n/a | n/a | 0.017 | 98.073 | 0.908 | 0.017 | node-14/thread-0/rpc.probe.transact | client.encode 13.471ms; driver.reader-basis.broadcast 1.059ms |
| ab38e516a9e073ba00000000000023ef | 42.375 | 1.586 | n/a | 0.000 | 10.867 | 0.519 | 1.585 | 0.030 | n/a | 1.342 | 26.432 | n/a | n/a | 0.016 | 12.452 | 0.294 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 9.320ms; driver.reader-basis.broadcast 0.431ms |
| ab38e516a9e073ba00000000000023df | 35.832 | 3.598 | 2.768 | 0.000 | 0.032 | 0.911 | 4.436 | 0.022 | n/a | 0.052 | 23.997 | n/a | n/a | 0.017 | 6.398 | 0.179 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.139ms |
| ab38e516a9e073ba00000000000023f3 | 26.559 | 2.408 | n/a | 0.000 | 13.899 | 0.493 | 0.741 | 0.014 | n/a | 0.042 | 8.944 | n/a | n/a | 0.017 | 16.308 | 0.614 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | client.encode 12.775ms; driver.reader-basis.broadcast 0.403ms |
| ab38e516a9e073ba00000000000023e9 | 26.317 | 3.327 | 4.465 | 0.000 | 0.048 | 3.018 | 6.190 | 0.020 | n/a | 0.053 | 9.171 | n/a | n/a | 0.025 | 7.840 | 0.298 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000023dc | 22.992 | 3.941 | n/a | 0.000 | 5.538 | 2.400 | 1.191 | 0.013 | n/a | 0.041 | 9.854 | n/a | n/a | 0.014 | 9.479 | 0.412 | 0.014 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | client.encode 3.813ms; driver.reader-basis.broadcast 0.398ms |
| ab38e516a9e073ba00000000000023d9 | 20.435 | 7.045 | 1.072 | 0.000 | 0.047 | 4.623 | 1.340 | 0.018 | n/a | 0.050 | 6.217 | n/a | n/a | 0.023 | 8.163 | 0.399 | 0.023 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.025ms; driver.publication.readback 0.214ms |
| ab38e516a9e073ba00000000000023fc | 19.562 | 3.306 | 0.251 | 0.000 | 0.021 | 3.864 | 1.895 | 0.031 | n/a | 0.070 | 10.101 | n/a | n/a | 0.023 | 3.578 | 0.183 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.383ms |
| ab38e516a9e073ba00000000000023cb | 19.025 | 5.508 | 0.188 | 0.000 | 0.044 | 4.185 | 1.539 | 0.019 | n/a | 0.044 | 7.475 | n/a | n/a | 0.023 | 5.740 | 0.302 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000023e3 | 18.881 | 3.251 | 0.215 | 0.000 | 0.045 | 1.053 | 6.059 | 0.048 | n/a | 0.122 | 8.059 | n/a | n/a | 0.028 | 3.510 | 0.186 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit / 5-10 facts (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 222.474 | 0.000 | 0.000 | 0.377 | 1.764 | n/a | 0.000 | 0.048 | 84.694 | 0.754 | 0.013 | n/a | 0.143 | 130.705 | n/a | n/a | 0.020 | 2.908 | 0.009 | 0.020 |
| p99 | 417.075 | 1.001 | 0.000 | 0.708 | 2.931 | n/a | 0.000 | 13.899 | 94.607 | 1.585 | 0.030 | n/a | 1.342 | 325.409 | n/a | n/a | 0.037 | 16.308 | 0.614 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000023cc | 417.075 | 2.893 | n/a | 0.000 | 0.016 | 87.949 | 0.754 | 0.011 | n/a | 0.023 | 325.409 | n/a | n/a | 0.021 | 2.908 | 0.007 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.944ms; driver.reader-basis.broadcast 0.486ms; driver.reader-basis.broadcast 0.402ms; driver.publication.persist-deferred 0.028ms |
| ab38e516a9e073ba00000000000023c4 | 321.111 | 1.237 | n/a | 0.000 | 0.032 | 84.694 | 1.544 | 0.012 | n/a | 0.040 | 233.535 | n/a | n/a | 0.017 | 1.269 | 0.004 | 0.017 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.940ms; driver.reader-basis.broadcast 0.396ms; driver.reader-basis.broadcast 0.378ms; driver.publication.persist-deferred 0.030ms |
| ab38e516a9e073ba00000000000023cd | 222.811 | 2.931 | n/a | 0.000 | 0.078 | 87.321 | 1.567 | 0.029 | n/a | 0.143 | 130.705 | n/a | n/a | 0.037 | 3.009 | 0.014 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.037ms; driver.reader-basis.broadcast 0.486ms; driver.publication.persist-deferred 0.028ms |
| ab38e516a9e073ba00000000000023f8 | 222.474 | 1.764 | n/a | 0.000 | 0.038 | 76.714 | 0.678 | 0.013 | n/a | 0.202 | 143.046 | n/a | n/a | 0.020 | 1.802 | 0.008 | 0.020 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.499ms; driver.reader-basis.broadcast 0.468ms; driver.reader-basis.broadcast 0.393ms; driver.publication.persist-deferred 0.030ms |
| ab38e516a9e073ba00000000000023eb | 188.648 | 1.685 | n/a | 0.000 | 0.048 | 94.607 | 0.652 | 0.013 | n/a | 0.216 | 91.403 | n/a | n/a | 0.024 | 1.733 | 0.009 | 0.024 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.385ms; driver.reader-basis.broadcast 0.375ms; driver.publication.persist-deferred 0.033ms |
| ab38e516a9e073ba00000000000023ef | 42.375 | 1.586 | n/a | 0.000 | 10.867 | 0.519 | 1.585 | 0.030 | n/a | 1.342 | 26.432 | n/a | n/a | 0.016 | 12.452 | 0.294 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 9.320ms; driver.reader-basis.broadcast 0.431ms |
| ab38e516a9e073ba00000000000023f3 | 26.559 | 2.408 | n/a | 0.000 | 13.899 | 0.493 | 0.741 | 0.014 | n/a | 0.042 | 8.944 | n/a | n/a | 0.017 | 16.308 | 0.614 | 0.017 | node-14/thread-0/driver.queue.scheduler-late | client.encode 12.775ms; driver.reader-basis.broadcast 0.403ms |

## P4 / p4h10 / commit (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.957 | 0.000 | 0.000 | 0.485 | 3.346 | 1.359 | 0.000 | 0.051 | 0.835 | 1.894 | 0.023 | n/a | 0.074 | 6.347 | n/a | n/a | 0.029 | 3.614 | 0.255 | 0.029 |
| p99 | 101.677 | 2.006 | 0.010 | 1.140 | 11.969 | n/a | 0.000 | 1.541 | 2.758 | 11.128 | 0.075 | n/a | 1.461 | 94.149 | n/a | n/a | 0.106 | 12.500 | 0.515 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000002444 | 101.677 | 5.482 | n/a | 0.000 | 0.081 | 0.725 | 1.133 | 0.014 | n/a | 0.048 | 94.149 | n/a | n/a | 0.046 | 5.563 | 0.055 | 0.046 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.478ms |
| ab38e516a9e073ba0000000000002412 | 42.568 | 11.969 | 0.438 | 0.000 | 0.093 | 1.651 | 9.238 | 0.047 | n/a | 0.105 | 18.983 | n/a | n/a | 0.044 | 12.500 | 0.294 | 0.044 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002409 | 31.418 | 3.893 | 1.070 | 0.000 | 0.045 | 1.323 | 11.128 | 0.028 | n/a | 0.066 | 13.825 | n/a | n/a | 0.040 | 5.008 | 0.159 | 0.040 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002487 | 28.315 | 6.248 | 0.549 | 0.000 | 0.046 | 2.525 | 7.660 | 0.066 | n/a | 0.114 | 11.080 | n/a | n/a | 0.029 | 6.843 | 0.242 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000241f | 25.797 | 3.490 | 0.302 | 0.000 | 0.139 | 0.964 | 6.474 | 0.029 | n/a | 0.064 | 14.270 | n/a | n/a | 0.065 | 3.930 | 0.152 | 0.065 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002473 | 23.622 | 3.013 | 0.172 | 0.000 | 0.042 | 0.933 | 7.406 | 0.030 | n/a | 0.060 | 11.946 | n/a | n/a | 0.020 | 3.227 | 0.137 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002497 | 22.833 | 3.906 | 0.279 | 0.000 | 0.133 | 1.590 | 7.583 | 0.031 | n/a | 0.074 | 9.161 | n/a | n/a | 0.077 | 4.317 | 0.189 | 0.077 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024a7 | 21.786 | 3.716 | 0.318 | 0.000 | 0.156 | 1.658 | 7.963 | 0.040 | n/a | 0.101 | 7.780 | n/a | n/a | 0.055 | 4.189 | 0.192 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000244b | 21.768 | 3.719 | 0.383 | 0.000 | 0.048 | 1.516 | 7.472 | 0.041 | n/a | 0.114 | 8.449 | n/a | n/a | 0.026 | 4.150 | 0.191 | 0.026 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002431 | 21.190 | 3.375 | 0.277 | 0.000 | 0.169 | 1.078 | 5.265 | 0.033 | n/a | 0.060 | 10.876 | n/a | n/a | 0.055 | 3.822 | 0.180 | 0.055 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000240d | 21.178 | 4.583 | 0.238 | 0.000 | 0.031 | 1.535 | 6.063 | 0.032 | n/a | 0.091 | 8.587 | n/a | n/a | 0.017 | 4.853 | 0.229 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000243d | 20.980 | 3.869 | 0.196 | 0.000 | 0.049 | 1.256 | 6.569 | 0.025 | n/a | 0.302 | 8.691 | n/a | n/a | 0.023 | 4.114 | 0.196 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024a5 | 20.933 | 7.552 | 0.284 | 0.000 | 0.158 | 0.943 | 1.904 | 0.038 | n/a | 0.084 | 9.905 | n/a | n/a | 0.065 | 7.994 | 0.382 | 0.065 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002429 | 20.012 | 5.363 | 0.372 | 0.000 | 0.053 | 1.981 | 5.738 | 0.027 | n/a | 0.325 | 6.128 | n/a | n/a | 0.024 | 5.789 | 0.289 | 0.024 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002467 | 19.634 | 3.792 | 0.310 | 0.000 | 0.110 | 1.302 | 3.834 | 0.040 | n/a | 0.306 | 9.905 | n/a | n/a | 0.036 | 4.212 | 0.215 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002427 | 19.478 | 3.626 | 0.208 | 0.000 | 0.055 | 1.298 | 5.872 | 0.033 | n/a | 0.361 | 7.996 | n/a | n/a | 0.028 | 3.890 | 0.200 | 0.028 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002493 | 18.822 | 5.093 | 0.304 | 0.000 | 0.148 | 1.614 | 6.697 | 0.028 | n/a | 0.058 | 4.819 | n/a | n/a | 0.061 | 5.545 | 0.295 | 0.061 | gw-w/thread-44/gateway.admitted-work | none observed |
| ab38e516a9e073ba00000000000024a2 | 18.373 | 9.248 | n/a | 0.000 | 0.214 | 0.603 | 1.173 | 0.013 | n/a | 0.037 | 6.992 | n/a | n/a | 0.094 | 9.461 | 0.515 | 0.094 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002447 | 18.327 | 3.017 | 0.275 | 0.000 | 0.046 | 0.619 | 0.976 | 0.014 | n/a | 0.328 | 13.031 | n/a | n/a | 0.020 | 3.338 | 0.182 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000246f | 18.298 | 3.876 | 0.300 | 0.000 | 0.049 | 1.172 | 2.685 | 0.018 | n/a | 0.070 | 10.110 | n/a | n/a | 0.019 | 4.225 | 0.231 | 0.019 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.915 | 0.000 | 0.000 | 0.485 | 2.172 | n/a | 0.000 | 0.048 | 0.544 | 0.913 | 0.015 | n/a | 0.060 | 5.810 | n/a | n/a | 0.030 | 2.351 | 0.229 | 0.030 |
| p99 | 17.978 | 2.006 | 0.000 | 0.927 | 3.937 | n/a | 0.000 | 1.541 | 2.758 | 4.527 | 0.042 | n/a | 0.962 | 10.253 | n/a | n/a | 0.060 | 4.042 | 0.379 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000240b | 17.978 | 2.235 | n/a | 0.000 | 0.051 | 0.797 | 4.527 | 0.025 | n/a | 0.057 | 10.253 | n/a | n/a | 0.031 | 2.286 | 0.127 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.783ms |
| ab38e516a9e073ba000000000000242e | 14.560 | 2.408 | n/a | 0.000 | 0.031 | 0.506 | 2.559 | 0.036 | n/a | 0.133 | 8.865 | n/a | n/a | 0.024 | 2.438 | 0.167 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000240e | 13.565 | 2.718 | n/a | 0.000 | 0.100 | 0.696 | 0.875 | 0.015 | n/a | 0.060 | 9.056 | n/a | n/a | 0.046 | 2.818 | 0.208 | 0.046 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000249b | 13.255 | 2.132 | n/a | 0.000 | 0.027 | 0.474 | 0.842 | 0.015 | n/a | 0.052 | 9.689 | n/a | n/a | 0.024 | 2.159 | 0.163 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002439 | 12.815 | 1.556 | n/a | 0.000 | 1.541 | 2.758 | 0.654 | 0.006 | n/a | 0.012 | 6.278 | n/a | n/a | 0.009 | 3.098 | 0.242 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.507ms; driver.publication.readback 0.120ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba000000000000246d | 12.099 | 3.937 | n/a | 0.000 | 0.105 | 0.758 | 1.054 | 0.023 | n/a | 0.358 | 5.810 | n/a | n/a | 0.054 | 4.042 | 0.334 | 0.054 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002498 | 12.062 | 1.939 | n/a | 0.000 | 0.039 | 0.444 | 0.831 | 0.018 | n/a | 0.048 | 8.723 | n/a | n/a | 0.019 | 1.978 | 0.164 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002471 | 11.851 | 2.662 | n/a | 0.000 | 0.045 | 0.407 | 0.894 | 0.021 | n/a | 0.091 | 7.696 | n/a | n/a | 0.036 | 2.707 | 0.228 | 0.036 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000240f | 11.644 | 3.859 | n/a | 0.000 | 0.041 | 1.235 | 4.526 | 0.042 | n/a | 0.067 | 1.854 | n/a | n/a | 0.020 | 3.900 | 0.335 | 0.020 | gw-w/thread-74/storage/begin-command! | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.016ms |
| ab38e516a9e073ba0000000000002424 | 11.304 | 2.308 | n/a | 0.000 | 0.042 | 0.566 | 0.746 | 0.012 | n/a | 0.036 | 7.561 | n/a | n/a | 0.031 | 2.351 | 0.208 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000244e | 11.290 | 1.999 | n/a | 0.000 | 0.053 | 0.665 | 1.038 | 0.014 | n/a | 0.045 | 7.456 | n/a | n/a | 0.021 | 2.052 | 0.182 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002416 | 11.200 | 3.161 | n/a | 0.000 | 0.095 | 0.544 | 1.192 | 0.021 | n/a | 0.067 | 6.079 | n/a | n/a | 0.039 | 3.256 | 0.291 | 0.039 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000247e | 10.935 | 2.072 | n/a | 0.000 | 0.033 | 0.532 | 1.404 | 0.021 | n/a | 0.508 | 6.347 | n/a | n/a | 0.019 | 2.104 | 0.192 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002478 | 10.915 | 3.294 | n/a | 0.000 | 0.088 | 0.772 | 0.862 | 0.015 | n/a | 0.052 | 5.792 | n/a | n/a | 0.040 | 3.382 | 0.310 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002484 | 10.407 | 1.597 | n/a | 0.000 | 0.042 | 0.420 | 0.782 | 0.013 | n/a | 0.048 | 7.484 | n/a | n/a | 0.021 | 1.638 | 0.157 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002413 | 9.915 | 2.617 | n/a | 0.000 | 0.050 | 0.628 | 0.917 | 0.013 | n/a | 0.047 | 5.606 | n/a | n/a | 0.036 | 2.667 | 0.269 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002436 | 9.893 | 2.948 | n/a | 0.000 | 0.081 | 0.646 | 1.146 | 0.016 | n/a | 0.064 | 4.952 | n/a | n/a | 0.040 | 3.028 | 0.306 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002438 | 9.818 | 2.011 | n/a | 0.000 | 0.048 | 0.545 | 1.255 | 0.017 | n/a | 0.962 | 4.948 | n/a | n/a | 0.032 | 2.059 | 0.210 | 0.032 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.507ms |
| ab38e516a9e073ba00000000000024ad | 9.623 | 3.543 | n/a | 0.000 | 0.099 | 0.363 | 0.955 | 0.021 | n/a | 0.333 | 4.249 | n/a | n/a | 0.060 | 3.642 | 0.379 | 0.060 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002457 | 9.533 | 1.954 | n/a | 0.000 | 0.027 | 0.413 | 0.803 | 0.012 | n/a | 0.206 | 6.094 | n/a | n/a | 0.025 | 1.981 | 0.208 | 0.025 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.945 | 0.215 | 0.000 | 0.512 | 3.339 | n/a | 0.000 | 0.053 | 0.740 | 1.338 | 0.020 | n/a | 0.065 | 5.518 | n/a | n/a | 0.027 | 3.736 | 0.280 | 0.027 |
| p99 | 26.724 | 2.006 | 0.000 | 2.215 | 6.826 | n/a | 0.000 | 1.223 | 1.801 | 7.595 | 0.046 | n/a | 0.461 | 12.250 | n/a | n/a | 0.070 | 6.927 | 0.455 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000002574 | 46.984 | 4.477 | 0.351 | 0.000 | 0.127 | 1.256 | 35.420 | 0.024 | n/a | 0.053 | 5.234 | n/a | n/a | 0.043 | 4.954 | 0.105 | 0.043 | gw-w/thread-68/gateway.admitted-work | driver.reader-basis.broadcast 0.563ms |
| ab38e516a9e073ba00000000000024fc | 26.724 | 9.194 | n/a | 0.000 | 1.949 | 0.748 | 1.448 | 0.015 | n/a | 0.049 | 13.295 | n/a | n/a | 0.024 | 11.144 | 0.417 | 0.024 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024cf | 21.792 | 3.800 | 0.469 | 0.000 | 0.138 | 1.213 | 7.595 | 0.049 | n/a | 0.571 | 7.906 | n/a | n/a | 0.052 | 4.407 | 0.202 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002507 | 19.887 | 3.619 | 0.283 | 0.000 | 0.048 | 0.926 | 6.801 | 0.030 | n/a | 0.065 | 8.095 | n/a | n/a | 0.021 | 3.951 | 0.199 | 0.021 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002515 | 19.126 | 4.543 | 0.313 | 0.000 | 0.042 | 1.071 | 4.465 | 0.023 | n/a | 0.052 | 8.597 | n/a | n/a | 0.020 | 4.898 | 0.256 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002512 | 18.402 | 4.630 | n/a | 0.000 | 0.052 | 0.991 | 5.555 | 0.036 | n/a | 0.130 | 6.977 | n/a | n/a | 0.031 | 4.682 | 0.254 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002553 | 17.174 | 3.693 | 0.263 | 0.000 | 0.057 | 1.209 | 2.470 | 0.036 | n/a | 0.091 | 9.291 | n/a | n/a | 0.064 | 4.012 | 0.234 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.450ms |
| ab38e516a9e073ba0000000000002549 | 16.860 | 2.693 | 0.193 | 0.000 | 0.041 | 0.607 | 0.984 | 0.017 | n/a | 0.056 | 12.250 | n/a | n/a | 0.019 | 2.928 | 0.174 | 0.019 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.393ms |
| ab38e516a9e073ba0000000000002544 | 16.564 | 6.826 | n/a | 0.000 | 0.101 | 0.742 | 1.577 | 0.026 | n/a | 0.352 | 6.895 | n/a | n/a | 0.047 | 6.927 | 0.418 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024ff | 16.520 | 4.681 | 0.633 | 0.000 | 0.098 | 1.801 | 3.467 | 0.023 | n/a | 0.047 | 5.731 | n/a | n/a | 0.037 | 5.412 | 0.328 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002547 | 16.450 | 3.951 | 0.254 | 0.000 | 0.036 | 1.046 | 5.344 | 0.023 | n/a | 0.050 | 5.716 | n/a | n/a | 0.030 | 4.241 | 0.258 | 0.030 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.329ms |
| ab38e516a9e073ba00000000000024bf | 16.449 | 3.694 | 0.214 | 0.000 | 0.052 | 0.935 | 1.158 | 0.022 | n/a | 0.461 | 9.886 | n/a | n/a | 0.026 | 3.960 | 0.241 | 0.026 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000255d | 16.433 | 3.366 | 0.974 | 0.000 | 0.042 | 0.740 | 1.712 | 0.019 | n/a | 0.051 | 9.503 | n/a | n/a | 0.025 | 4.383 | 0.267 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.432ms |
| ab38e516a9e073ba00000000000024f9 | 16.396 | 4.801 | 0.279 | 0.000 | 0.046 | 1.748 | 3.292 | 0.044 | n/a | 0.093 | 6.056 | n/a | n/a | 0.036 | 5.126 | 0.313 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000253e | 16.381 | 5.688 | n/a | 0.000 | 0.043 | 0.538 | 1.250 | 0.012 | n/a | 0.074 | 8.753 | n/a | n/a | 0.023 | 5.731 | 0.350 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002521 | 16.355 | 6.116 | 0.346 | 0.000 | 0.142 | 1.763 | 1.968 | 0.033 | n/a | 0.094 | 5.847 | n/a | n/a | 0.046 | 6.604 | 0.404 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002529 | 16.221 | 4.572 | 0.559 | 0.000 | 0.045 | 1.608 | 4.152 | 0.033 | n/a | 0.068 | 5.149 | n/a | n/a | 0.035 | 5.176 | 0.319 | 0.035 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002503 | 16.209 | 4.414 | n/a | 0.000 | 0.057 | 1.379 | 5.466 | 0.031 | n/a | 0.081 | 4.752 | n/a | n/a | 0.030 | 4.471 | 0.276 | 0.030 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024fb | 16.151 | 5.204 | 0.344 | 0.000 | 0.055 | 1.562 | 2.510 | 0.046 | n/a | 0.087 | 6.312 | n/a | n/a | 0.031 | 5.603 | 0.347 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024bd | 16.064 | 5.303 | 0.224 | 0.000 | 0.052 | 1.530 | 4.699 | 0.028 | n/a | 0.046 | 4.158 | n/a | n/a | 0.025 | 5.578 | 0.347 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.299 | 0.000 | 0.000 | 0.466 | 2.478 | n/a | 0.000 | 0.057 | 0.598 | 0.943 | 0.015 | n/a | 0.065 | 5.062 | n/a | n/a | 0.030 | 2.539 | 0.259 | 0.030 |
| p99 | 16.209 | 2.006 | 0.000 | 1.177 | 5.290 | n/a | 0.000 | 1.223 | 1.596 | 5.466 | 0.031 | n/a | 0.431 | 8.543 | n/a | n/a | 0.088 | 5.385 | 0.421 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba0000000000002503 | 16.209 | 4.414 | n/a | 0.000 | 0.057 | 1.379 | 5.466 | 0.031 | n/a | 0.081 | 4.752 | n/a | n/a | 0.030 | 4.471 | 0.276 | 0.030 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002557 | 15.783 | 4.769 | n/a | 0.000 | 0.125 | 1.198 | 1.137 | 0.021 | n/a | 0.079 | 8.394 | n/a | n/a | 0.059 | 4.894 | 0.310 | 0.059 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024cc | 13.617 | 4.448 | n/a | 0.000 | 0.115 | 0.980 | 1.045 | 0.018 | n/a | 0.065 | 6.858 | n/a | n/a | 0.088 | 4.564 | 0.335 | 0.088 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000250d | 13.449 | 2.869 | n/a | 0.000 | 0.102 | 0.695 | 1.128 | 0.020 | n/a | 0.068 | 8.543 | n/a | n/a | 0.025 | 2.971 | 0.221 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002562 | 12.786 | 5.290 | n/a | 0.000 | 0.096 | 1.596 | 3.984 | 0.023 | n/a | 0.058 | 1.679 | n/a | n/a | 0.060 | 5.385 | 0.421 | 0.060 | gw-w/thread-68/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000002526 | 11.761 | 3.750 | n/a | 0.000 | 0.059 | 0.882 | 1.014 | 0.018 | n/a | 0.267 | 5.745 | n/a | n/a | 0.027 | 3.809 | 0.324 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024c8 | 11.652 | 2.984 | n/a | 0.000 | 0.084 | 0.675 | 0.753 | 0.013 | n/a | 0.037 | 7.072 | n/a | n/a | 0.034 | 3.067 | 0.263 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002516 | 11.423 | 2.996 | n/a | 0.000 | 0.091 | 0.828 | 1.015 | 0.018 | n/a | 0.063 | 6.359 | n/a | n/a | 0.053 | 3.087 | 0.270 | 0.053 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002577 | 11.342 | 2.421 | n/a | 0.000 | 0.077 | 0.705 | 3.180 | 0.019 | n/a | 0.049 | 4.858 | n/a | n/a | 0.033 | 2.498 | 0.220 | 0.033 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024f1 | 11.278 | 2.520 | n/a | 0.000 | 0.035 | 0.825 | 1.486 | 0.029 | n/a | 0.135 | 6.225 | n/a | n/a | 0.022 | 2.555 | 0.227 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002530 | 11.148 | 2.658 | n/a | 0.000 | 0.057 | 0.856 | 1.120 | 0.021 | n/a | 0.310 | 6.087 | n/a | n/a | 0.038 | 2.715 | 0.244 | 0.038 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002570 | 11.081 | 3.743 | n/a | 0.000 | 0.064 | 0.633 | 0.753 | 0.012 | n/a | 0.049 | 5.794 | n/a | n/a | 0.033 | 3.808 | 0.344 | 0.033 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002500 | 11.048 | 3.323 | n/a | 0.000 | 0.093 | 0.719 | 1.461 | 0.025 | n/a | 0.114 | 5.264 | n/a | n/a | 0.048 | 3.417 | 0.309 | 0.048 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002539 | 10.301 | 3.195 | n/a | 0.000 | 0.100 | 0.604 | 0.774 | 0.019 | n/a | 0.079 | 5.468 | n/a | n/a | 0.062 | 3.295 | 0.320 | 0.062 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000255a | 9.545 | 3.904 | n/a | 0.000 | 0.084 | 0.652 | 0.834 | 0.014 | n/a | 0.220 | 3.794 | n/a | n/a | 0.042 | 3.988 | 0.418 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024c6 | 9.453 | 1.598 | n/a | 0.000 | 0.033 | 0.378 | 0.659 | 0.011 | n/a | 0.034 | 6.708 | n/a | n/a | 0.032 | 1.631 | 0.173 | 0.032 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024d3 | 9.353 | 1.724 | n/a | 0.000 | 1.223 | 0.248 | 0.579 | 0.011 | n/a | 0.037 | 5.518 | n/a | n/a | 0.013 | 2.947 | 0.315 | 0.013 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000255f | 9.299 | 2.269 | n/a | 0.000 | 0.037 | 0.598 | 1.197 | 0.021 | n/a | 0.097 | 5.062 | n/a | n/a | 0.019 | 2.306 | 0.248 | 0.019 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002523 | 8.942 | 2.044 | n/a | 0.000 | 0.044 | 0.527 | 1.151 | 0.022 | n/a | 0.206 | 4.929 | n/a | n/a | 0.020 | 2.088 | 0.233 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000024b8 | 8.934 | 2.257 | n/a | 0.000 | 0.056 | 0.576 | 1.581 | 0.025 | n/a | 0.093 | 4.314 | n/a | n/a | 0.032 | 2.313 | 0.259 | 0.032 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.703 | 0.136 | 0.000 | 0.528 | 3.322 | n/a | 0.000 | 0.047 | 0.808 | 1.531 | 0.022 | n/a | 0.071 | 5.803 | n/a | n/a | 0.031 | 3.663 | 0.284 | 0.031 |
| p99 | 40.445 | 5.746 | 0.032 | 5.011 | 7.889 | n/a | 2.595 | 2.090 | 2.256 | 30.072 | 0.079 | n/a | 0.646 | 15.927 | n/a | n/a | 0.093 | 11.372 | 0.541 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000025b2 | 40.445 | 3.046 | 0.274 | 0.000 | 0.059 | 1.421 | 30.072 | 0.042 | n/a | 0.082 | 5.426 | n/a | n/a | 0.023 | 3.380 | 0.084 | 0.023 | gw-w/thread-74/gateway.admitted-work | driver.reader-basis.broadcast 0.478ms |
| ab38e516a9e073ba0000000000002605 | 29.092 | 5.789 | n/a | 1.740 | 1.858 | 0.720 | 2.821 | 0.041 | n/a | 0.160 | 15.927 | n/a | n/a | 0.035 | 9.387 | 0.323 | 0.035 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025bc | 22.334 | 4.845 | 0.211 | 0.000 | 0.047 | 1.358 | 5.364 | 0.028 | n/a | 0.057 | 10.393 | n/a | n/a | 0.031 | 5.103 | 0.228 | 0.031 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.447ms |
| ab38e516a9e073ba00000000000025cc | 21.266 | 3.396 | 0.294 | 0.000 | 0.041 | 1.325 | 6.010 | 0.068 | n/a | 0.102 | 10.005 | n/a | n/a | 0.026 | 3.730 | 0.175 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025d1 | 21.034 | 7.322 | n/a | 2.595 | 1.456 | 1.858 | 1.396 | 0.016 | n/a | 0.049 | 6.290 | n/a | n/a | 0.052 | 11.372 | 0.541 | 0.052 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.992ms |
| ab38e516a9e073ba00000000000025ec | 20.986 | 3.947 | 0.406 | 0.000 | 0.063 | 1.670 | 5.904 | 0.079 | n/a | 0.122 | 8.747 | n/a | n/a | 0.048 | 4.415 | 0.210 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025f4 | 20.239 | 5.031 | 0.255 | 0.000 | 0.063 | 1.464 | 5.504 | 0.025 | n/a | 0.234 | 7.619 | n/a | n/a | 0.045 | 5.348 | 0.264 | 0.045 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000263d | 19.597 | 3.512 | 0.443 | 0.000 | 0.052 | 1.270 | 4.475 | 0.030 | n/a | 0.646 | 9.134 | n/a | n/a | 0.035 | 4.007 | 0.204 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.084ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba00000000000025e0 | 18.824 | 3.246 | 0.220 | 0.000 | 0.049 | 1.202 | 5.419 | 0.066 | n/a | 0.106 | 8.483 | n/a | n/a | 0.033 | 3.515 | 0.187 | 0.033 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002581 | 18.565 | 3.061 | 0.211 | 0.000 | 0.065 | 1.049 | 8.018 | 0.038 | n/a | 0.073 | 6.018 | n/a | n/a | 0.035 | 3.336 | 0.180 | 0.035 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.449ms |
| ab38e516a9e073ba000000000000258d | 17.750 | 2.951 | 0.163 | 0.000 | 0.029 | 1.000 | 7.445 | 0.023 | n/a | 0.046 | 6.071 | n/a | n/a | 0.021 | 3.144 | 0.177 | 0.021 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.451ms |
| ab38e516a9e073ba000000000000260e | 17.572 | 3.322 | n/a | 0.000 | 0.056 | 0.767 | 0.885 | 0.018 | n/a | 0.033 | 12.437 | n/a | n/a | 0.053 | 3.378 | 0.192 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025d0 | 17.507 | 4.151 | 0.335 | 0.000 | 0.059 | 1.246 | 3.192 | 0.021 | n/a | 0.060 | 8.403 | n/a | n/a | 0.041 | 4.545 | 0.260 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002617 | 17.137 | 3.403 | 0.207 | 0.000 | 0.053 | 0.834 | 2.201 | 0.036 | n/a | 0.083 | 10.281 | n/a | n/a | 0.039 | 3.663 | 0.214 | 0.039 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002611 | 17.126 | 5.724 | 0.508 | 0.000 | 0.058 | 1.531 | 1.735 | 0.034 | n/a | 0.064 | 7.427 | n/a | n/a | 0.047 | 6.289 | 0.367 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025f0 | 17.094 | 3.203 | 0.220 | 0.000 | 0.088 | 0.771 | 2.162 | 0.035 | n/a | 0.065 | 10.498 | n/a | n/a | 0.052 | 3.511 | 0.205 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025ff | 17.088 | 4.051 | n/a | 0.000 | 0.034 | 0.923 | 1.889 | 0.026 | n/a | 0.097 | 10.039 | n/a | n/a | 0.030 | 4.085 | 0.239 | 0.030 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000261f | 17.036 | 4.400 | 0.277 | 0.000 | 0.051 | 1.759 | 3.811 | 0.061 | n/a | 0.101 | 6.490 | n/a | n/a | 0.086 | 4.728 | 0.278 | 0.086 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002599 | 16.636 | 3.284 | 0.256 | 0.000 | 0.034 | 1.190 | 4.434 | 0.039 | n/a | 0.075 | 7.301 | n/a | n/a | 0.022 | 3.573 | 0.215 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002627 | 16.620 | 7.889 | n/a | 0.000 | 0.125 | 0.790 | 1.570 | 0.022 | n/a | 0.401 | 5.748 | n/a | n/a | 0.076 | 8.014 | 0.482 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit / 5-10 facts (34 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.983 | 0.472 | 0.000 | 0.509 | 2.433 | n/a | 0.000 | 0.044 | 0.625 | 0.955 | 0.017 | n/a | 0.060 | 4.775 | n/a | n/a | 0.030 | 2.501 | 0.266 | 0.030 |
| p99 | 17.572 | 1.994 | 0.000 | 1.982 | 5.002 | n/a | 1.458 | 1.645 | 2.256 | 4.804 | 0.049 | n/a | 0.352 | 12.437 | n/a | n/a | 0.093 | 5.092 | 0.449 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba000000000000260e | 17.572 | 3.322 | n/a | 0.000 | 0.056 | 0.767 | 0.885 | 0.018 | n/a | 0.033 | 12.437 | n/a | n/a | 0.053 | 3.378 | 0.192 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025e1 | 14.640 | 2.742 | n/a | 0.000 | 0.043 | 1.069 | 1.969 | 0.041 | n/a | 0.159 | 8.575 | n/a | n/a | 0.041 | 2.785 | 0.190 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002603 | 13.365 | 5.002 | n/a | 0.000 | 0.090 | 2.256 | 3.861 | 0.029 | n/a | 0.078 | 1.956 | n/a | n/a | 0.093 | 5.092 | 0.381 | 0.093 | gw-w/thread-48/gateway.admitted-work | none observed |
| ab38e516a9e073ba0000000000002588 | 13.015 | 2.911 | n/a | 0.000 | 0.068 | 0.471 | 1.231 | 0.020 | n/a | 0.057 | 8.226 | n/a | n/a | 0.032 | 2.979 | 0.229 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002612 | 12.457 | 4.102 | n/a | 0.000 | 0.717 | 0.896 | 1.158 | 0.016 | n/a | 0.065 | 5.473 | n/a | n/a | 0.030 | 4.819 | 0.387 | 0.030 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.840ms |
| ab38e516a9e073ba00000000000025b3 | 12.296 | 2.770 | n/a | 0.000 | 0.074 | 0.870 | 1.513 | 0.030 | n/a | 0.098 | 6.859 | n/a | n/a | 0.082 | 2.844 | 0.231 | 0.082 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002638 | 12.071 | 2.429 | n/a | 0.000 | 0.026 | 0.609 | 0.922 | 0.019 | n/a | 0.051 | 7.997 | n/a | n/a | 0.019 | 2.454 | 0.203 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025ad | 11.375 | 3.264 | n/a | 0.000 | 0.057 | 0.498 | 2.808 | 0.049 | n/a | 0.108 | 4.565 | n/a | n/a | 0.026 | 3.321 | 0.292 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025dd | 11.370 | 2.265 | n/a | 1.458 | 0.045 | 0.657 | 1.497 | 0.024 | n/a | 0.087 | 5.307 | n/a | n/a | 0.030 | 3.768 | 0.331 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002640 | 11.345 | 1.890 | n/a | 0.000 | 0.580 | 0.729 | 1.374 | 0.027 | n/a | 0.098 | 6.623 | n/a | n/a | 0.024 | 2.470 | 0.218 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba0000000000002632 | 10.740 | 2.577 | n/a | 0.000 | 0.043 | 0.574 | 0.965 | 0.017 | n/a | 0.055 | 6.481 | n/a | n/a | 0.028 | 2.620 | 0.244 | 0.028 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000257e | 10.441 | 2.153 | n/a | 0.000 | 0.045 | 0.877 | 1.729 | 0.034 | n/a | 0.133 | 5.446 | n/a | n/a | 0.024 | 2.198 | 0.210 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000263e | 10.301 | 2.490 | n/a | 0.000 | 0.020 | 1.126 | 0.753 | 0.007 | n/a | 0.025 | 5.863 | n/a | n/a | 0.016 | 2.510 | 0.244 | 0.016 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025f5 | 10.286 | 2.090 | n/a | 0.000 | 0.044 | 0.705 | 1.225 | 0.021 | n/a | 0.075 | 6.081 | n/a | n/a | 0.045 | 2.134 | 0.207 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000262e | 10.245 | 3.781 | n/a | 0.000 | 0.053 | 1.402 | 0.907 | 0.013 | n/a | 0.046 | 4.011 | n/a | n/a | 0.031 | 3.834 | 0.374 | 0.031 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000259e | 10.172 | 3.299 | n/a | 0.000 | 0.084 | 1.905 | 4.804 | 0.016 | n/a | 0.028 | 0.000 | n/a | n/a | 0.036 | 3.383 | 0.333 | 0.036 | node-14/thread-0/driver.execute | none observed |
| ab38e516a9e073ba00000000000025f1 | 10.163 | 2.917 | n/a | 0.000 | 1.645 | 0.687 | 0.836 | 0.012 | n/a | 0.051 | 3.986 | n/a | n/a | 0.029 | 4.563 | 0.449 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025f9 | 9.983 | 2.686 | n/a | 0.000 | 0.035 | 0.582 | 0.955 | 0.017 | n/a | 0.352 | 5.324 | n/a | n/a | 0.031 | 2.721 | 0.273 | 0.031 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba00000000000025db | 9.977 | 2.925 | n/a | 0.000 | 0.092 | 0.600 | 0.795 | 0.014 | n/a | 0.049 | 5.442 | n/a | n/a | 0.061 | 3.017 | 0.302 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ab38e516a9e073ba000000000000258a | 9.954 | 1.655 | n/a | 0.000 | 0.041 | 0.454 | 0.798 | 0.015 | n/a | 0.052 | 6.919 | n/a | n/a | 0.021 | 1.696 | 0.170 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3775 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.764 | 0.216 | 0.000 | 0.499 | 2.207 | n/a | 0.000 | 0.036 | 0.477 | 0.882 | 0.010 | n/a | 0.053 | 4.816 | n/a | n/a | 0.013 | 2.562 | 0.272 | 0.013 |
| p99 | 46.514 | 2.383 | 0.037 | 2.133 | 7.225 | n/a | 0.000 | 11.351 | 6.357 | 5.955 | 0.043 | n/a | 1.720 | 25.563 | n/a | n/a | 0.057 | 14.593 | 0.660 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000042f0 | 121.475 | 2.148 | n/a | 0.000 | 0.040 | 0.473 | 1.018 | 0.010 | n/a | 0.049 | 117.720 | n/a | n/a | 0.017 | 2.188 | 0.018 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.732ms |
| ab38e516a9e073ba00000000000027d7 | 107.436 | 9.134 | n/a | 0.000 | 0.073 | 5.946 | 5.377 | 0.103 | n/a | 0.596 | 86.156 | n/a | n/a | 0.050 | 9.208 | 0.086 | 0.050 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.488ms; driver.publication.readback 0.146ms; driver.publication.readback 0.135ms; driver.publication.readback 0.083ms; driver.publication.persist-deferred 0.023ms |
| ab38e516a9e073ba0000000000003dc5 | 97.146 | 1.391 | n/a | 0.000 | 81.845 | 0.333 | 0.626 | 0.009 | n/a | 0.906 | 12.029 | n/a | n/a | 0.008 | 83.236 | 0.857 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.117ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba0000000000002b6e | 95.098 | 3.866 | n/a | 0.000 | 4.719 | 0.552 | 2.236 | 0.018 | n/a | 0.048 | 83.638 | n/a | n/a | 0.021 | 8.585 | 0.090 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.488ms; driver.publication.readback 0.482ms; driver.publication.persist-deferred 0.185ms; driver.publication.readback 0.038ms |
| ab38e516a9e073ba0000000000003dc4 | 94.177 | 4.436 | n/a | 0.000 | 0.007 | 0.460 | 1.628 | 0.010 | n/a | 0.016 | 87.614 | n/a | n/a | 0.008 | 4.442 | 0.047 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba0000000000002fb6 | 92.585 | 4.396 | n/a | 0.000 | 0.017 | 0.595 | 2.293 | 0.007 | n/a | 0.020 | 85.248 | n/a | n/a | 0.010 | 4.413 | 0.048 | 0.010 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms |
| ab38e516a9e073ba0000000000003dc3 | 90.677 | 3.532 | n/a | 0.000 | 0.030 | 0.459 | 1.945 | 0.015 | n/a | 2.030 | 82.655 | n/a | n/a | 0.012 | 3.562 | 0.039 | 0.012 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.844ms |
| ab38e516a9e073ba0000000000002fb7 | 90.486 | 1.057 | n/a | 0.000 | 0.493 | 2.324 | 0.842 | 0.003 | n/a | 0.285 | 85.474 | n/a | n/a | 0.008 | 1.551 | 0.017 | 0.008 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba0000000000002fb8 | 85.592 | 2.296 | n/a | 0.000 | 0.054 | 0.444 | 1.078 | 0.043 | n/a | 0.155 | 81.500 | n/a | n/a | 0.021 | 2.351 | 0.027 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms; driver.publication.persist-deferred 0.106ms; driver.publication.readback 0.076ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba00000000000026f6 | 84.770 | 5.638 | n/a | 0.000 | 4.429 | 2.941 | 2.013 | 0.029 | n/a | 1.561 | 68.125 | n/a | n/a | 0.034 | 10.067 | 0.119 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.470ms; driver.publication.readback 0.160ms; driver.publication.persist-deferred 0.058ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba00000000000026f5 | 83.576 | 7.649 | n/a | 0.000 | 0.154 | 14.628 | 1.531 | 0.032 | n/a | 0.115 | 59.421 | n/a | n/a | 0.047 | 7.803 | 0.093 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.470ms; driver.publication.readback 0.160ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba0000000000002fb9 | 81.019 | 2.867 | n/a | 0.000 | 0.063 | 0.944 | 1.148 | 0.017 | n/a | 0.083 | 75.870 | n/a | n/a | 0.027 | 2.931 | 0.036 | 0.027 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms; driver.publication.persist-deferred 0.106ms; driver.publication.readback 0.076ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.024ms |
| ab38e516a9e073ba0000000000003dc6 | 79.911 | 2.658 | n/a | 0.000 | 0.112 | 0.750 | 0.748 | 0.010 | n/a | 0.045 | 75.563 | n/a | n/a | 0.024 | 2.771 | 0.035 | 0.024 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba0000000000003908 | 78.871 | 0.979 | n/a | 0.000 | 0.628 | 0.674 | 0.679 | 0.003 | n/a | 0.098 | 75.803 | n/a | n/a | 0.005 | 1.608 | 0.020 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.463ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba0000000000003907 | 77.950 | 3.237 | n/a | 0.000 | 0.028 | 0.353 | 1.042 | 0.008 | n/a | 0.027 | 73.240 | n/a | n/a | 0.015 | 3.265 | 0.042 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.463ms |
| ab38e516a9e073ba00000000000026fa | 77.008 | 8.282 | n/a | 0.000 | 52.751 | 0.996 | 1.240 | 0.014 | n/a | 0.046 | 13.619 | n/a | n/a | 0.060 | 61.033 | 0.793 | 0.060 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.225ms; driver.expected-state.bind-receipt 1.031ms; driver.reader-basis.broadcast 0.423ms; driver.publication.readback 0.359ms; driver.publication.readback 0.167ms |
| ab38e516a9e073ba00000000000026f8 | 75.321 | 22.974 | n/a | 0.000 | 0.073 | 7.780 | 13.375 | 0.049 | n/a | 0.518 | 30.464 | n/a | n/a | 0.088 | 23.048 | 0.306 | 0.088 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.225ms; driver.publication.readback 0.110ms; driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.058ms; driver.publication.persist-deferred 0.030ms |
| ab38e516a9e073ba0000000000003dc7 | 74.717 | 1.862 | n/a | 0.000 | 0.023 | 0.320 | 0.457 | 0.005 | n/a | 0.019 | 72.020 | n/a | n/a | 0.011 | 1.885 | 0.025 | 0.011 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.117ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba00000000000026f9 | 74.667 | 23.504 | n/a | 0.000 | 12.189 | 26.332 | 1.040 | 0.016 | n/a | 2.296 | 9.249 | n/a | n/a | 0.041 | 35.693 | 0.478 | 0.041 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 1.225ms; driver.expected-state.bind-receipt 1.031ms; driver.publication.readback 0.167ms; driver.publication.readback 0.144ms; driver.publication.readback 0.110ms |
| ab38e516a9e073ba0000000000003dc8 | 72.349 | 1.240 | n/a | 0.000 | 0.013 | 0.438 | 0.295 | 0.003 | n/a | 0.027 | 70.327 | n/a | n/a | 0.006 | 1.253 | 0.017 | 0.006 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.117ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms |

## P2 / tail / commit / 5-10 facts (2160 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.334 | 0.000 | 0.000 | 0.392 | 1.739 | n/a | 0.000 | 0.035 | 0.458 | 0.732 | 0.009 | n/a | 0.053 | 4.238 | n/a | n/a | 0.013 | 1.958 | 0.251 | 0.013 |
| p99 | 46.430 | 2.001 | 0.010 | 1.132 | 5.183 | n/a | 0.000 | 12.314 | 6.169 | 4.044 | 0.036 | n/a | 1.734 | 25.563 | n/a | n/a | 0.053 | 14.378 | 0.678 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ab38e516a9e073ba00000000000042f0 | 121.475 | 2.148 | n/a | 0.000 | 0.040 | 0.473 | 1.018 | 0.010 | n/a | 0.049 | 117.720 | n/a | n/a | 0.017 | 2.188 | 0.018 | 0.017 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.732ms |
| ab38e516a9e073ba0000000000003dc5 | 97.146 | 1.391 | n/a | 0.000 | 81.845 | 0.333 | 0.626 | 0.009 | n/a | 0.906 | 12.029 | n/a | n/a | 0.008 | 83.236 | 0.857 | 0.008 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.117ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba0000000000002fb7 | 90.486 | 1.057 | n/a | 0.000 | 0.493 | 2.324 | 0.842 | 0.003 | n/a | 0.285 | 85.474 | n/a | n/a | 0.008 | 1.551 | 0.017 | 0.008 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba0000000000002fb8 | 85.592 | 2.296 | n/a | 0.000 | 0.054 | 0.444 | 1.078 | 0.043 | n/a | 0.155 | 81.500 | n/a | n/a | 0.021 | 2.351 | 0.027 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms; driver.publication.persist-deferred 0.106ms; driver.publication.readback 0.076ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba00000000000026f5 | 83.576 | 7.649 | n/a | 0.000 | 0.154 | 14.628 | 1.531 | 0.032 | n/a | 0.115 | 59.421 | n/a | n/a | 0.047 | 7.803 | 0.093 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.470ms; driver.publication.readback 0.160ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba0000000000002fb9 | 81.019 | 2.867 | n/a | 0.000 | 0.063 | 0.944 | 1.148 | 0.017 | n/a | 0.083 | 75.870 | n/a | n/a | 0.027 | 2.931 | 0.036 | 0.027 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.510ms; driver.publication.persist-deferred 0.106ms; driver.publication.readback 0.076ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.024ms |
| ab38e516a9e073ba0000000000003dc6 | 79.911 | 2.658 | n/a | 0.000 | 0.112 | 0.750 | 0.748 | 0.010 | n/a | 0.045 | 75.563 | n/a | n/a | 0.024 | 2.771 | 0.035 | 0.024 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.021ms |
| ab38e516a9e073ba0000000000003908 | 78.871 | 0.979 | n/a | 0.000 | 0.628 | 0.674 | 0.679 | 0.003 | n/a | 0.098 | 75.803 | n/a | n/a | 0.005 | 1.608 | 0.020 | 0.005 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.463ms; driver.publication.readback 0.067ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba0000000000003dc7 | 74.717 | 1.862 | n/a | 0.000 | 0.023 | 0.320 | 0.457 | 0.005 | n/a | 0.019 | 72.020 | n/a | n/a | 0.011 | 1.885 | 0.025 | 0.011 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.117ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba00000000000026f9 | 74.667 | 23.504 | n/a | 0.000 | 12.189 | 26.332 | 1.040 | 0.016 | n/a | 2.296 | 9.249 | n/a | n/a | 0.041 | 35.693 | 0.478 | 0.041 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 1.225ms; driver.expected-state.bind-receipt 1.031ms; driver.publication.readback 0.167ms; driver.publication.readback 0.144ms; driver.publication.readback 0.110ms |
| ab38e516a9e073ba0000000000003dc8 | 72.349 | 1.240 | n/a | 0.000 | 0.013 | 0.438 | 0.295 | 0.003 | n/a | 0.027 | 70.327 | n/a | n/a | 0.006 | 1.253 | 0.017 | 0.006 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.375ms; driver.reader-basis.broadcast 0.844ms; driver.publication.readback 0.117ms; driver.publication.readback 0.073ms; driver.publication.readback 0.071ms |
| ab38e516a9e073ba0000000000002b70 | 62.556 | 2.444 | n/a | 0.000 | 0.049 | 0.542 | 1.717 | 0.024 | n/a | 0.063 | 57.697 | n/a | n/a | 0.021 | 2.493 | 0.040 | 0.021 | gw-w/thread-74/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.022ms |
| ab38e516a9e073ba0000000000002fba | 61.105 | 1.403 | n/a | 0.000 | 0.050 | 0.351 | 0.842 | 0.012 | n/a | 0.179 | 58.250 | n/a | n/a | 0.016 | 1.453 | 0.024 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.106ms; driver.publication.readback 0.076ms; driver.publication.readback 0.050ms; driver.publication.readback 0.035ms; driver.publication.readback 0.026ms |
| ab38e516a9e073ba0000000000002b71 | 59.609 | 1.657 | n/a | 0.000 | 0.026 | 0.329 | 1.301 | 0.023 | n/a | 0.312 | 55.949 | n/a | n/a | 0.011 | 1.684 | 0.028 | 0.011 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.018ms |
| ab38e516a9e073ba0000000000002920 | 58.354 | 2.680 | n/a | 0.000 | 25.793 | 6.169 | 0.518 | 0.007 | n/a | 0.015 | 23.167 | n/a | n/a | 0.005 | 28.473 | 0.488 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.459ms; driver.publication.readback 0.073ms; driver.publication.readback 0.060ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.024ms |
| ab38e516a9e073ba000000000000347e | 51.555 | 1.213 | n/a | 0.000 | 0.015 | 0.262 | 1.021 | 0.005 | n/a | 0.014 | 49.014 | n/a | n/a | 0.011 | 1.228 | 0.024 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.539ms; driver.publication.readback 0.061ms; driver.publication.readback 0.024ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.007ms |
| ab38e516a9e073ba00000000000026f4 | 50.873 | 1.760 | n/a | 0.000 | 0.826 | 1.089 | 8.071 | 0.017 | n/a | 0.043 | 39.049 | n/a | n/a | 0.018 | 2.586 | 0.051 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.470ms; driver.publication.readback 0.129ms; driver.publication.persist-deferred 0.018ms |
| ab38e516a9e073ba000000000000291e | 49.206 | 1.905 | n/a | 0.000 | 0.045 | 26.482 | 12.804 | 0.017 | n/a | 0.025 | 7.911 | n/a | n/a | 0.017 | 1.950 | 0.040 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.459ms |
| ab38e516a9e073ba000000000000390a | 48.035 | 1.234 | n/a | 0.000 | 42.358 | 0.216 | 0.544 | 0.009 | n/a | 0.521 | 3.144 | n/a | n/a | 0.010 | 43.591 | 0.907 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.067ms; driver.publication.readback 0.061ms; driver.publication.readback 0.052ms; driver.publication.readback 0.041ms; driver.publication.persist-deferred 0.020ms |
| ab38e516a9e073ba0000000000002b72 | 47.845 | 1.739 | n/a | 0.000 | 0.040 | 0.470 | 0.842 | 0.010 | n/a | 0.041 | 44.683 | n/a | n/a | 0.020 | 1.779 | 0.037 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.097ms; driver.publication.readback 0.075ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.018ms |

## P3 / outside-phases / read (38 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 200.461 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 |
| p99 | 430.745 | n/a | n/a | n/a | 62.734 | n/a | 20.508 | 0.000 | 8.847 | 424.132 | 0.144 | n/a | 0.190 | 0.000 | n/a | n/a | 47.938 | 83.242 | 0.345 | 47.938 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000000002 | 430.745 | 2.550 | n/a | 0.000 | 0.000 | 3.445 | 424.132 | 0.144 | n/a | 0.153 | 0.000 | n/a | n/a | 0.321 | 2.550 | 0.006 | 0.321 | gw-r/thread-44/gateway.admitted-work | none observed |
| d7c749112bfbbe44000000000000294b | 266.048 | 62.734 | n/a | 20.508 | 0.000 | 6.405 | 176.184 | 0.006 | n/a | 0.011 | 0.000 | n/a | n/a | 0.201 | 83.242 | 0.313 | 0.201 | gw-r/thread-44/gateway.admitted-work | none observed |
| d7c749112bfbbe440000000000001532 | 206.973 | 0.000 | n/a | 0.000 | 0.000 | 2.359 | 204.419 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000166e | 206.271 | 0.000 | n/a | 0.000 | 0.000 | 1.330 | 204.771 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001411 | 206.024 | 0.000 | n/a | 0.000 | 0.000 | 0.423 | 205.438 | 0.017 | n/a | 0.061 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000002944 | 204.401 | 0.000 | n/a | 0.000 | 0.000 | 3.251 | 200.963 | 0.029 | n/a | 0.052 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001665 | 204.068 | 0.000 | n/a | 0.000 | 0.000 | 0.370 | 203.559 | 0.013 | n/a | 0.050 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000006 | 203.008 | 0.000 | n/a | 0.000 | 0.000 | 1.208 | 201.389 | 0.018 | n/a | 0.190 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000005 | 203.003 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 201.903 | 0.016 | n/a | 0.094 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000002943 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 200.781 | 0.003 | n/a | 0.058 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-76/journal/page | none observed |
| d7c749112bfbbe44000000000000166c | 201.606 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.720 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000152b | 201.524 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 200.748 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000166a | 201.484 | 0.000 | n/a | 0.000 | 0.000 | 0.474 | 200.861 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000140d | 201.420 | 0.000 | n/a | 0.000 | 0.000 | 0.404 | 200.850 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000152f | 201.375 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.664 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000002941 | 201.221 | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 200.580 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001669 | 201.204 | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 200.473 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000152e | 201.167 | 0.000 | n/a | 0.000 | 0.000 | 0.461 | 200.514 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000140f | 201.088 | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 200.518 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001668 | 201.012 | 0.000 | n/a | 0.000 | 0.000 | 0.331 | 200.561 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |

## P3 / outside-phases / internal (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.156 | n/a | n/a | n/a | 2.976 | n/a | 0.000 | 0.000 | 0.508 | 354.131 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.138 | 2.976 | 0.010 | 0.138 |
| p99 | 1005.222 | n/a | n/a | n/a | 31.431 | n/a | 2.056 | 0.000 | 1.443 | 1001.421 | 0.752 | n/a | 0.506 | 0.000 | n/a | n/a | 15.386 | 33.487 | 0.782 | 15.386 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea4600000000000000a4 | 1005.222 | 0.191 | n/a | 0.000 | 0.000 | 1.355 | 1001.421 | 0.752 | n/a | 0.249 | 0.000 | n/a | n/a | 1.255 | 0.191 | 0.000 | 1.255 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001ebc | 1002.997 | 0.102 | n/a | 0.000 | 0.000 | 0.764 | 1000.956 | 0.015 | n/a | 0.070 | 0.000 | n/a | n/a | 1.089 | 0.102 | 0.000 | 1.089 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001ebb | 925.685 | 3.892 | n/a | 0.000 | 0.000 | 0.352 | 921.357 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.059 | 3.892 | 0.004 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001f80 | 832.356 | 2.764 | n/a | 0.000 | 0.000 | 0.583 | 828.922 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.049 | 2.764 | 0.003 | 0.049 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000000a5 | 816.296 | 20.325 | n/a | 0.000 | 0.000 | 1.144 | 794.065 | 0.011 | n/a | 0.506 | 0.000 | n/a | n/a | 0.244 | 20.325 | 0.025 | 0.244 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001f82 | 610.898 | 2.437 | n/a | 0.000 | 0.000 | 0.508 | 607.849 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.045 | 2.437 | 0.004 | 0.045 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001f81 | 408.886 | 4.217 | n/a | 0.000 | 0.000 | 0.733 | 403.837 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.079 | 4.217 | 0.010 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001e17 | 357.156 | 2.513 | n/a | 0.000 | 0.000 | 0.415 | 354.131 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.067 | 2.513 | 0.007 | 0.067 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001e13 | 316.570 | 6.590 | n/a | 0.682 | 0.000 | 0.317 | 308.824 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.130 | 7.273 | 0.023 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001e15 | 256.431 | 2.258 | n/a | 0.000 | 0.000 | 0.310 | 253.775 | 0.002 | n/a | 0.025 | 0.000 | n/a | n/a | 0.062 | 2.258 | 0.009 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001f7d | 102.290 | 31.431 | n/a | 2.056 | 0.000 | 0.356 | 68.040 | 0.001 | n/a | 0.009 | 0.000 | n/a | n/a | 0.397 | 33.487 | 0.327 | 0.397 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001e12 | 63.820 | 5.886 | n/a | 0.000 | 0.000 | 0.555 | 57.209 | 0.002 | n/a | 0.030 | 0.000 | n/a | n/a | 0.138 | 5.886 | 0.092 | 0.138 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001e11 | 18.485 | 2.932 | n/a | 0.000 | 0.000 | 0.167 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.386 | 2.932 | 0.159 | 15.386 | node-14/thread-2/socket.wait-first-byte | none observed |
| 840752184625ea460000000000001f7c | 8.941 | 6.990 | n/a | 0.000 | 0.000 | 1.443 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.507 | 6.990 | 0.782 | 0.507 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001eba | 4.494 | 2.976 | n/a | 0.000 | 0.000 | 0.391 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.128 | 2.976 | 0.662 | 1.128 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 451.711 | n/a | n/a | n/a | 2.490 | n/a | 0.000 | 0.000 | 0.674 | 447.987 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.124 | 2.490 | 0.009 | 0.124 |
| p99 | 1008.211 | n/a | n/a | n/a | 10.173 | n/a | 0.000 | 0.000 | 7.443 | 1004.833 | 0.462 | n/a | 0.419 | 0.000 | n/a | n/a | 50.621 | 10.173 | 0.501 | 50.621 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea4600000000000000ae | 1008.211 | 2.430 | n/a | 0.000 | 0.000 | 0.779 | 1004.833 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.073 | 2.430 | 0.002 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000000bc | 1003.840 | 0.169 | n/a | 0.000 | 0.000 | 1.587 | 1000.852 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 1.121 | 0.169 | 0.000 | 1.121 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000000b4 | 1003.412 | 0.118 | n/a | 0.000 | 0.000 | 0.661 | 1001.365 | 0.017 | n/a | 0.151 | 0.000 | n/a | n/a | 1.100 | 0.118 | 0.000 | 1.100 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000000d0 | 967.467 | 2.312 | n/a | 0.000 | 0.000 | 0.980 | 964.020 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.073 | 2.312 | 0.002 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000000ab | 942.387 | 3.031 | n/a | 0.000 | 0.000 | 1.730 | 937.134 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.390 | 3.031 | 0.003 | 0.390 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000000bb | 941.349 | 2.339 | n/a | 0.000 | 0.000 | 7.443 | 931.391 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.088 | 2.339 | 0.002 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000000c3 | 895.126 | 10.173 | n/a | 0.000 | 0.000 | 0.631 | 884.147 | 0.010 | n/a | 0.054 | 0.000 | n/a | n/a | 0.112 | 10.173 | 0.011 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000000a8 | 891.027 | 3.702 | n/a | 0.000 | 0.000 | 1.501 | 882.548 | 0.011 | n/a | 0.419 | 0.000 | n/a | n/a | 2.846 | 3.702 | 0.004 | 2.846 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000000cc | 752.681 | 2.176 | n/a | 0.000 | 0.000 | 0.956 | 749.377 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.073 | 2.176 | 0.003 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000000b2 | 564.366 | 5.156 | n/a | 0.000 | 0.000 | 0.855 | 558.078 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.183 | 5.156 | 0.009 | 0.183 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000000c6 | 528.807 | 1.832 | n/a | 0.000 | 0.000 | 0.986 | 525.812 | 0.012 | n/a | 0.091 | 0.000 | n/a | n/a | 0.074 | 1.832 | 0.003 | 0.074 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000000ca | 510.870 | 2.225 | n/a | 0.000 | 0.000 | 0.573 | 507.871 | 0.027 | n/a | 0.101 | 0.000 | n/a | n/a | 0.073 | 2.225 | 0.004 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000000c2 | 484.798 | 2.266 | n/a | 0.000 | 0.000 | 0.550 | 481.818 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.089 | 2.266 | 0.005 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000000c9 | 481.163 | 2.327 | n/a | 0.000 | 0.000 | 1.061 | 477.618 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.081 | 2.327 | 0.005 | 0.081 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000000c8 | 474.233 | 4.655 | n/a | 0.000 | 0.000 | 0.771 | 468.566 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.167 | 4.655 | 0.010 | 0.167 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000000b8 | 451.711 | 2.490 | n/a | 0.000 | 0.000 | 0.667 | 447.987 | 0.462 | n/a | 0.023 | 0.000 | n/a | n/a | 0.083 | 2.490 | 0.006 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000000b1 | 314.610 | 8.024 | n/a | 0.000 | 0.000 | 0.568 | 305.783 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.124 | 8.024 | 0.026 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000000a7 | 311.928 | 2.667 | n/a | 0.000 | 0.000 | 0.748 | 308.228 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.178 | 2.667 | 0.009 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000000b6 | 309.851 | 5.995 | n/a | 0.000 | 0.000 | 0.582 | 303.056 | 0.026 | n/a | 0.109 | 0.000 | n/a | n/a | 0.083 | 5.995 | 0.019 | 0.083 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000000ba | 270.112 | 4.770 | n/a | 0.000 | 0.000 | 0.674 | 264.387 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.208 | 4.770 | 0.018 | 0.208 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / internal (92 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 432.779 | n/a | n/a | n/a | 3.309 | n/a | 0.000 | 0.000 | 0.683 | 425.176 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.077 | 3.562 | 0.011 | 0.077 |
| p99 | 1005.974 | n/a | n/a | n/a | 9.744 | n/a | 7.037 | 0.000 | 5.263 | 1004.182 | 0.433 | n/a | 0.425 | 0.000 | n/a | n/a | 45.983 | 15.942 | 0.643 | 45.983 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea46000000000000010e | 1005.974 | 0.095 | n/a | 0.000 | 0.000 | 0.503 | 1004.182 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 1.106 | 0.095 | 0.000 | 1.106 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000000fe | 1005.259 | 2.989 | n/a | 0.000 | 0.000 | 1.883 | 1000.270 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.062 | 2.989 | 0.003 | 0.062 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000000138 | 1005.254 | 2.976 | n/a | 0.000 | 0.000 | 0.728 | 1000.960 | 0.433 | n/a | 0.097 | 0.000 | n/a | n/a | 0.061 | 2.976 | 0.003 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000000d3 | 1004.668 | 2.298 | n/a | 0.000 | 0.000 | 0.476 | 1001.739 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.075 | 2.298 | 0.002 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea46000000000000012c | 1003.931 | 4.784 | n/a | 0.590 | 0.000 | 1.242 | 997.175 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.066 | 5.374 | 0.005 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000000da | 1003.889 | 2.359 | n/a | 0.000 | 0.000 | 1.338 | 1000.023 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.077 | 2.359 | 0.002 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000000105 | 1003.884 | 0.125 | n/a | 0.000 | 0.000 | 1.733 | 1000.828 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 1.095 | 0.125 | 0.000 | 1.095 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea460000000000000127 | 1001.186 | 6.144 | n/a | 0.000 | 0.000 | 0.798 | 993.917 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.202 | 6.144 | 0.006 | 0.202 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000000116 | 1000.029 | 2.832 | n/a | 0.000 | 0.000 | 1.928 | 995.069 | 0.028 | n/a | 0.110 | 0.000 | n/a | n/a | 0.061 | 2.832 | 0.003 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000000d2 | 999.835 | 2.271 | n/a | 0.000 | 0.000 | 0.482 | 996.926 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.075 | 2.271 | 0.002 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea46000000000000012b | 998.309 | 2.758 | n/a | 0.000 | 0.000 | 0.580 | 994.762 | 0.049 | n/a | 0.093 | 0.000 | n/a | n/a | 0.067 | 2.758 | 0.003 | 0.067 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea46000000000000011e | 997.836 | 2.909 | n/a | 0.000 | 0.000 | 0.719 | 994.067 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.070 | 2.909 | 0.003 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000000df | 996.294 | 2.417 | n/a | 0.000 | 0.000 | 0.745 | 992.989 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.082 | 2.417 | 0.002 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000000d9 | 995.226 | 4.151 | n/a | 0.000 | 0.000 | 0.520 | 990.394 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.101 | 4.151 | 0.004 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000154 | 988.619 | 3.653 | n/a | 0.000 | 0.000 | 1.496 | 983.352 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.077 | 3.653 | 0.004 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000000de | 986.640 | 2.330 | n/a | 0.000 | 0.000 | 0.375 | 983.790 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.078 | 2.330 | 0.002 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000000e0 | 933.401 | 8.906 | n/a | 7.037 | 0.000 | 1.383 | 915.772 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.230 | 15.942 | 0.017 | 0.230 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000000113 | 932.935 | 4.636 | n/a | 0.000 | 0.000 | 0.497 | 927.666 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.060 | 4.636 | 0.005 | 0.060 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000000101 | 913.653 | 4.028 | n/a | 0.792 | 0.000 | 0.562 | 908.061 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.145 | 4.821 | 0.005 | 0.145 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000000102 | 890.866 | 3.401 | n/a | 0.000 | 0.000 | 1.196 | 886.115 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.072 | 3.401 | 0.004 | 0.072 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / internal (105 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 365.109 | n/a | n/a | n/a | 2.573 | n/a | 0.000 | 0.000 | 0.554 | 360.947 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.065 | 2.591 | 0.009 | 0.065 |
| p99 | 1006.441 | n/a | n/a | n/a | 6.891 | n/a | 0.593 | 0.000 | 2.775 | 1001.632 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 38.634 | 6.891 | 0.479 | 38.634 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea4600000000000001a5 | 1010.017 | 3.164 | n/a | 0.000 | 0.000 | 0.890 | 1005.817 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.106 | 3.164 | 0.003 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000189 | 1006.441 | 6.576 | n/a | 0.000 | 0.000 | 1.621 | 998.037 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.171 | 6.576 | 0.007 | 0.171 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000001e9 | 1004.442 | 2.305 | n/a | 0.000 | 0.000 | 0.393 | 1001.632 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.059 | 2.305 | 0.002 | 0.059 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000001c1 | 1003.383 | 0.146 | n/a | 0.000 | 0.000 | 0.398 | 1001.630 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 1.135 | 0.146 | 0.000 | 1.135 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000001c3 | 1003.012 | 0.226 | n/a | 0.000 | 0.000 | 0.557 | 1000.984 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 1.161 | 0.226 | 0.000 | 1.161 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000164 | 1002.706 | 0.104 | n/a | 0.000 | 0.000 | 0.508 | 1000.919 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 1.096 | 0.104 | 0.000 | 1.096 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000001a4 | 1001.853 | 2.619 | n/a | 0.000 | 0.000 | 0.473 | 998.660 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.068 | 2.619 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea46000000000000016e | 1001.554 | 4.086 | n/a | 0.000 | 0.000 | 0.579 | 996.764 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.067 | 4.086 | 0.004 | 0.067 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000000184 | 996.617 | 3.597 | n/a | 0.000 | 0.000 | 1.041 | 991.854 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.062 | 3.597 | 0.004 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000000185 | 995.533 | 2.540 | n/a | 0.000 | 0.000 | 0.435 | 992.466 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.057 | 2.540 | 0.003 | 0.057 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000000198 | 994.375 | 4.490 | n/a | 0.000 | 0.000 | 0.523 | 989.243 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.070 | 4.490 | 0.005 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea46000000000000017e | 994.361 | 2.496 | n/a | 0.000 | 0.000 | 2.048 | 989.710 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.496 | 0.003 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000000173 | 870.300 | 4.538 | n/a | 0.000 | 0.000 | 0.688 | 864.916 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.118 | 4.538 | 0.005 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea46000000000000019b | 835.896 | 3.487 | n/a | 0.000 | 0.000 | 0.494 | 831.779 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.087 | 3.487 | 0.004 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000001d4 | 834.268 | 1.675 | n/a | 0.000 | 0.000 | 0.468 | 832.023 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.061 | 1.675 | 0.002 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000001a3 | 832.251 | 2.494 | n/a | 0.000 | 0.000 | 0.449 | 829.206 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.058 | 2.494 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000001dc | 809.366 | 2.759 | n/a | 0.000 | 0.000 | 0.925 | 805.593 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.058 | 2.759 | 0.003 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000001ef | 782.263 | 2.147 | n/a | 0.000 | 0.000 | 0.624 | 779.390 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.058 | 2.147 | 0.003 | 0.058 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea46000000000000019e | 737.232 | 4.102 | n/a | 0.000 | 0.000 | 0.338 | 732.686 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.065 | 4.102 | 0.006 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000001f6 | 711.209 | 4.043 | n/a | 0.000 | 0.000 | 0.852 | 706.073 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.173 | 4.043 | 0.006 | 0.173 | gw-r/thread-42/journal/page | none observed |

## P3 / L4 / internal (1524 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.735 | n/a | n/a | n/a | 3.215 | n/a | 0.000 | 0.000 | 0.217 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.312 | 3.220 | 0.251 | 7.312 |
| p99 | 249.039 | n/a | n/a | n/a | 13.495 | n/a | 1.029 | 0.000 | 1.205 | 244.545 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 46.029 | 13.850 | 0.827 | 46.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000000213 | 1003.825 | 3.647 | n/a | 0.000 | 0.000 | 0.656 | 999.397 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.093 | 3.647 | 0.004 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000000225 | 1003.233 | 0.142 | n/a | 0.000 | 0.000 | 1.040 | 1000.860 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 1.111 | 0.142 | 0.000 | 1.111 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000211 | 1002.587 | 0.129 | n/a | 0.000 | 0.000 | 0.433 | 1000.861 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 1.112 | 0.129 | 0.000 | 1.112 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000000217 | 1002.350 | 0.134 | n/a | 0.000 | 0.000 | 0.341 | 1000.707 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 1.106 | 0.134 | 0.000 | 1.106 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000001fd | 1002.022 | 0.104 | n/a | 0.000 | 0.000 | 0.317 | 1000.480 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 1.083 | 0.104 | 0.000 | 1.083 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000000219 | 1001.823 | 2.536 | n/a | 0.000 | 0.000 | 0.877 | 998.240 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.104 | 2.536 | 0.003 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea46000000000000021a | 945.782 | 1.916 | n/a | 0.000 | 0.000 | 0.608 | 943.139 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.063 | 1.916 | 0.002 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000227 | 919.124 | 2.299 | n/a | 0.000 | 0.000 | 2.323 | 914.377 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.078 | 2.299 | 0.003 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000000215 | 887.519 | 2.200 | n/a | 0.000 | 0.000 | 0.351 | 884.876 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.055 | 2.200 | 0.002 | 0.055 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea4600000000000001ff | 881.338 | 5.722 | n/a | 0.000 | 0.000 | 0.583 | 874.900 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.111 | 5.722 | 0.006 | 0.111 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000207 | 839.372 | 2.251 | n/a | 0.000 | 0.000 | 0.295 | 836.729 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.057 | 2.251 | 0.003 | 0.057 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000000202 | 821.729 | 2.845 | n/a | 0.000 | 0.000 | 0.514 | 818.272 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.845 | 0.003 | 0.063 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea46000000000000021d | 797.485 | 2.697 | n/a | 0.000 | 0.000 | 0.640 | 794.044 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 2.697 | 0.003 | 0.061 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea460000000000000221 | 789.059 | 1.996 | n/a | 0.000 | 0.000 | 0.570 | 786.388 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 1.996 | 0.003 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea46000000000000020f | 402.992 | 2.326 | n/a | 0.000 | 0.000 | 0.563 | 399.993 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.056 | 2.326 | 0.006 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea46000000000000020e | 249.039 | 1.873 | n/a | 0.000 | 0.000 | 2.526 | 244.545 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.052 | 1.873 | 0.008 | 0.052 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000000208 | 228.291 | 2.811 | n/a | 0.000 | 0.000 | 2.543 | 222.720 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.179 | 2.811 | 0.012 | 0.179 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea46000000000000021e | 205.455 | 2.414 | n/a | 0.000 | 0.000 | 0.611 | 202.338 | 0.002 | n/a | 0.022 | 0.000 | n/a | n/a | 0.069 | 2.414 | 0.012 | 0.069 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000000203 | 202.633 | 4.102 | n/a | 0.000 | 0.000 | 0.443 | 193.738 | 1.500 | n/a | 0.039 | 0.000 | n/a | n/a | 2.811 | 4.102 | 0.020 | 2.811 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000000223 | 169.522 | 2.277 | n/a | 0.000 | 0.000 | 0.460 | 166.684 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.277 | 0.013 | 0.062 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / internal (1549 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.581 | n/a | n/a | n/a | 3.912 | n/a | 0.000 | 0.000 | 0.206 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.589 | 3.949 | 0.323 | 6.589 |
| p99 | 370.919 | n/a | n/a | n/a | 16.923 | n/a | 1.586 | 0.000 | 1.423 | 368.087 | 0.017 | n/a | 0.036 | 0.000 | n/a | n/a | 46.431 | 17.558 | 0.854 | 46.431 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001aa3 | 1000.967 | 2.525 | n/a | 0.000 | 0.000 | 0.269 | 998.092 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.061 | 2.525 | 0.003 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001aa7 | 991.133 | 4.693 | n/a | 0.000 | 0.000 | 0.372 | 985.938 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.105 | 4.693 | 0.005 | 0.105 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001aa4 | 972.865 | 7.882 | n/a | 0.000 | 0.000 | 0.385 | 964.361 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.213 | 7.882 | 0.008 | 0.213 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001aab | 928.431 | 3.237 | n/a | 0.000 | 0.000 | 0.828 | 924.139 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.198 | 3.237 | 0.003 | 0.198 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001ac5 | 891.547 | 2.544 | n/a | 0.000 | 0.000 | 0.303 | 888.608 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.077 | 2.544 | 0.003 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001ab5 | 885.725 | 5.006 | n/a | 0.000 | 0.000 | 0.443 | 880.115 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.132 | 5.006 | 0.006 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001aa1 | 839.084 | 3.176 | n/a | 0.000 | 0.000 | 0.735 | 835.083 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.058 | 3.176 | 0.004 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 840752184625ea460000000000001aad | 712.959 | 2.884 | n/a | 0.000 | 0.000 | 0.617 | 709.296 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.125 | 2.884 | 0.004 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001ac9 | 688.041 | 10.223 | n/a | 1.200 | 0.000 | 0.565 | 675.769 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.252 | 11.424 | 0.017 | 0.252 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001ac7 | 677.092 | 2.865 | n/a | 0.000 | 0.000 | 0.370 | 673.749 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.086 | 2.865 | 0.004 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001ac1 | 593.187 | 2.527 | n/a | 0.000 | 0.000 | 0.477 | 590.041 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.075 | 2.527 | 0.004 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001ad7 | 588.099 | 2.456 | n/a | 0.000 | 0.000 | 0.387 | 585.121 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.090 | 2.456 | 0.004 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001adc | 563.366 | 2.590 | n/a | 0.000 | 0.000 | 0.406 | 560.256 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.077 | 2.590 | 0.005 | 0.077 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001abc | 505.765 | 5.085 | n/a | 0.000 | 0.000 | 0.312 | 500.169 | 0.017 | n/a | 0.040 | 0.000 | n/a | n/a | 0.142 | 5.085 | 0.010 | 0.142 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001ae0 | 404.960 | 2.296 | n/a | 0.000 | 0.000 | 0.292 | 402.260 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.076 | 2.296 | 0.006 | 0.076 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001aba | 370.919 | 2.202 | n/a | 0.000 | 0.000 | 0.488 | 368.087 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.097 | 2.202 | 0.006 | 0.097 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001ad8 | 340.948 | 2.163 | n/a | 0.000 | 0.000 | 0.380 | 338.263 | 0.009 | n/a | 0.036 | 0.000 | n/a | n/a | 0.097 | 2.163 | 0.006 | 0.097 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001ad5 | 340.053 | 3.813 | n/a | 0.000 | 0.000 | 2.158 | 333.963 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.080 | 3.813 | 0.011 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001ace | 331.177 | 7.800 | n/a | 2.084 | 0.000 | 1.423 | 319.640 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.149 | 9.884 | 0.030 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001ac6 | 327.481 | 13.468 | n/a | 1.283 | 0.000 | 0.423 | 312.040 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.240 | 14.750 | 0.045 | 0.240 | gw-r/thread-68/journal/page | none observed |

## P3 / L64 / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 347.812 | n/a | n/a | n/a | 3.524 | n/a | 0.000 | 0.000 | 0.488 | 343.413 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.125 | 3.603 | 0.010 | 0.125 |
| p99 | 1005.291 | n/a | n/a | n/a | 10.586 | n/a | 2.693 | 0.000 | 2.969 | 1000.799 | 0.232 | n/a | 0.060 | 0.000 | n/a | n/a | 41.953 | 12.329 | 0.627 | 41.953 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001b64 | 1005.291 | 6.623 | n/a | 0.000 | 0.000 | 0.551 | 997.938 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.139 | 6.623 | 0.007 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001b34 | 1002.399 | 0.099 | n/a | 0.000 | 0.000 | 0.346 | 1000.799 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 1.092 | 0.099 | 0.000 | 1.092 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001b26 | 1002.358 | 0.124 | n/a | 0.000 | 0.000 | 0.385 | 1000.623 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 1.160 | 0.124 | 0.000 | 1.160 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001b3a | 1002.266 | 0.109 | n/a | 0.000 | 0.000 | 0.473 | 1000.546 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 1.093 | 0.109 | 0.000 | 1.093 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001b43 | 1001.809 | 0.090 | n/a | 0.000 | 0.000 | 0.297 | 1000.295 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 1.104 | 0.090 | 0.000 | 1.104 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001b2b | 1000.312 | 2.923 | n/a | 0.000 | 0.000 | 0.438 | 996.744 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.154 | 2.923 | 0.003 | 0.154 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001aea | 996.875 | 4.747 | n/a | 0.000 | 0.000 | 0.624 | 991.338 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.129 | 4.747 | 0.005 | 0.129 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001b36 | 995.093 | 2.724 | n/a | 0.000 | 0.000 | 0.254 | 992.029 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.055 | 2.724 | 0.003 | 0.055 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001b69 | 994.497 | 4.730 | n/a | 0.000 | 0.000 | 0.401 | 989.216 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.129 | 4.730 | 0.005 | 0.129 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001b56 | 992.045 | 3.048 | n/a | 0.000 | 0.000 | 0.374 | 988.490 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.104 | 3.048 | 0.003 | 0.104 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001b3c | 990.588 | 9.199 | n/a | 1.725 | 0.000 | 1.021 | 978.474 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.133 | 10.924 | 0.011 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001b68 | 981.988 | 4.439 | n/a | 0.000 | 0.000 | 1.082 | 976.348 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.076 | 4.439 | 0.005 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001b53 | 968.488 | 2.765 | n/a | 0.565 | 0.000 | 0.424 | 964.573 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.131 | 3.331 | 0.003 | 0.131 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001b40 | 955.484 | 3.477 | n/a | 1.022 | 0.000 | 0.581 | 950.285 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.090 | 4.499 | 0.005 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001b61 | 935.238 | 7.278 | n/a | 0.000 | 0.000 | 2.265 | 925.483 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.180 | 7.278 | 0.008 | 0.180 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001b37 | 929.749 | 4.491 | n/a | 0.000 | 0.000 | 0.501 | 924.585 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.140 | 4.491 | 0.005 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001b67 | 914.286 | 2.304 | n/a | 0.665 | 0.000 | 0.459 | 910.716 | 0.014 | n/a | 0.046 | 0.000 | n/a | n/a | 0.081 | 2.969 | 0.003 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001af9 | 913.353 | 2.211 | n/a | 0.000 | 0.000 | 0.491 | 910.559 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.058 | 2.211 | 0.002 | 0.058 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001ae7 | 893.548 | 2.095 | n/a | 0.000 | 0.000 | 0.529 | 890.815 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.073 | 2.095 | 0.002 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001b4e | 892.610 | 4.209 | n/a | 0.000 | 0.000 | 0.378 | 887.801 | 0.008 | n/a | 0.021 | 0.000 | n/a | n/a | 0.193 | 4.209 | 0.005 | 0.193 | gw-r/thread-44/journal/page | none observed |

## P3 / L256 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 396.399 | n/a | n/a | n/a | 2.878 | n/a | 0.000 | 0.000 | 0.457 | 389.741 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.086 | 2.878 | 0.010 | 0.086 |
| p99 | 1003.116 | n/a | n/a | n/a | 11.429 | n/a | 1.375 | 0.000 | 1.913 | 1000.617 | 4.700 | n/a | 0.057 | 0.000 | n/a | n/a | 35.001 | 11.988 | 0.712 | 35.001 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001bd8 | 1003.116 | 2.597 | n/a | 0.000 | 0.000 | 0.524 | 999.889 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.076 | 2.597 | 0.003 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001bea | 1002.488 | 0.102 | n/a | 0.000 | 0.000 | 0.641 | 1000.617 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 1.089 | 0.102 | 0.000 | 1.089 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001bd2 | 1000.638 | 2.877 | n/a | 0.000 | 0.000 | 0.463 | 997.167 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.079 | 2.877 | 0.003 | 0.079 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001bc2 | 1000.334 | 3.000 | n/a | 0.000 | 0.000 | 0.448 | 996.769 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.085 | 3.000 | 0.003 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001bd1 | 999.891 | 2.204 | n/a | 0.000 | 0.000 | 0.422 | 997.167 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.058 | 2.204 | 0.002 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001bf5 | 999.821 | 3.029 | n/a | 0.000 | 0.000 | 0.428 | 996.230 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.103 | 3.029 | 0.003 | 0.103 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001bc6 | 998.424 | 7.952 | n/a | 1.375 | 0.000 | 0.410 | 988.249 | 0.008 | n/a | 0.048 | 0.000 | n/a | n/a | 0.382 | 9.327 | 0.009 | 0.382 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001bd9 | 997.786 | 2.856 | n/a | 0.000 | 0.000 | 0.322 | 994.497 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.066 | 2.856 | 0.003 | 0.066 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001bef | 996.257 | 2.327 | n/a | 0.000 | 0.000 | 0.564 | 993.236 | 0.017 | n/a | 0.037 | 0.000 | n/a | n/a | 0.075 | 2.327 | 0.002 | 0.075 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001ba5 | 996.125 | 2.915 | n/a | 0.000 | 0.000 | 0.498 | 992.609 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.081 | 2.915 | 0.003 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001bc9 | 996.049 | 2.398 | n/a | 0.000 | 0.000 | 0.374 | 993.169 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.065 | 2.398 | 0.002 | 0.065 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001ba2 | 993.583 | 4.545 | n/a | 0.000 | 0.000 | 0.389 | 988.549 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.083 | 4.545 | 0.005 | 0.083 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001bca | 993.282 | 2.213 | n/a | 0.000 | 0.000 | 0.480 | 990.457 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.087 | 2.213 | 0.002 | 0.087 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001c07 | 986.860 | 4.258 | n/a | 0.000 | 0.000 | 0.575 | 981.911 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.092 | 4.258 | 0.004 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001bde | 886.131 | 2.103 | n/a | 0.000 | 0.000 | 0.407 | 883.529 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.060 | 2.103 | 0.002 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001bfa | 880.319 | 2.345 | n/a | 0.000 | 0.000 | 0.476 | 877.400 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.070 | 2.345 | 0.003 | 0.070 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001b76 | 870.576 | 2.178 | n/a | 0.000 | 0.000 | 0.410 | 867.871 | 0.009 | n/a | 0.030 | 0.000 | n/a | n/a | 0.079 | 2.178 | 0.003 | 0.079 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001b9e | 852.646 | 3.164 | n/a | 0.000 | 0.000 | 0.427 | 848.883 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.145 | 3.164 | 0.004 | 0.145 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001be0 | 840.060 | 2.666 | n/a | 0.000 | 0.000 | 0.446 | 836.845 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.068 | 2.666 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001bc3 | 839.391 | 8.148 | n/a | 0.000 | 0.000 | 0.798 | 830.227 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.184 | 8.148 | 0.010 | 0.184 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.813 | n/a | n/a | n/a | 2.964 | n/a | 0.000 | 0.000 | 0.474 | 382.814 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.103 | 2.964 | 0.011 | 0.103 |
| p99 | 1007.761 | n/a | n/a | n/a | 14.382 | n/a | 1.328 | 0.000 | 3.005 | 1001.332 | 0.102 | n/a | 0.094 | 0.000 | n/a | n/a | 49.340 | 15.710 | 0.749 | 49.340 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001c37 | 1007.761 | 5.486 | n/a | 0.000 | 0.000 | 0.816 | 1001.332 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.082 | 5.486 | 0.005 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001c93 | 1003.777 | 0.184 | n/a | 0.000 | 0.000 | 1.175 | 1001.180 | 0.016 | n/a | 0.094 | 0.000 | n/a | n/a | 1.128 | 0.184 | 0.000 | 1.128 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001c20 | 1003.341 | 0.103 | n/a | 0.000 | 0.000 | 0.351 | 1000.659 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 2.170 | 0.103 | 0.000 | 2.170 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001c8d | 1002.435 | 5.055 | n/a | 0.000 | 0.000 | 2.600 | 994.619 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.139 | 5.055 | 0.005 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001c0b | 1002.339 | 0.105 | n/a | 0.000 | 0.000 | 0.379 | 1000.696 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 1.097 | 0.105 | 0.000 | 1.097 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001c59 | 1002.091 | 0.094 | n/a | 0.000 | 0.000 | 0.345 | 1000.512 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 1.092 | 0.094 | 0.000 | 1.092 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001c8f | 1002.000 | 0.097 | n/a | 0.000 | 0.000 | 0.388 | 1000.395 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 1.088 | 0.097 | 0.000 | 1.088 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001c2d | 1001.468 | 3.295 | n/a | 0.000 | 0.000 | 0.581 | 997.423 | 0.018 | n/a | 0.030 | 0.000 | n/a | n/a | 0.121 | 3.295 | 0.003 | 0.121 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001c58 | 1001.462 | 2.388 | n/a | 0.000 | 0.000 | 0.290 | 998.683 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.056 | 2.388 | 0.002 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001c4c | 1000.621 | 2.140 | n/a | 0.000 | 0.000 | 0.364 | 998.015 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.072 | 2.140 | 0.002 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001c38 | 999.975 | 5.675 | n/a | 0.000 | 0.000 | 0.600 | 993.542 | 0.012 | n/a | 0.036 | 0.000 | n/a | n/a | 0.110 | 5.675 | 0.006 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001c6e | 999.592 | 2.358 | n/a | 0.000 | 0.000 | 0.479 | 996.662 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.066 | 2.358 | 0.002 | 0.066 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001c0d | 999.039 | 2.226 | n/a | 0.000 | 0.000 | 0.526 | 996.178 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.075 | 2.226 | 0.002 | 0.075 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001c89 | 997.345 | 2.690 | n/a | 0.000 | 0.000 | 0.527 | 994.013 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.083 | 2.690 | 0.003 | 0.083 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001c80 | 994.187 | 2.203 | n/a | 0.000 | 0.000 | 0.397 | 991.445 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.062 | 2.203 | 0.002 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001c2e | 994.059 | 2.394 | n/a | 0.000 | 0.000 | 0.638 | 990.920 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.063 | 2.394 | 0.002 | 0.063 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001c92 | 989.940 | 2.606 | n/a | 0.000 | 0.000 | 0.394 | 986.852 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.065 | 2.606 | 0.003 | 0.065 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001c22 | 988.946 | 4.923 | n/a | 0.000 | 0.000 | 0.458 | 983.387 | 0.009 | n/a | 0.035 | 0.000 | n/a | n/a | 0.135 | 4.923 | 0.005 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001c81 | 945.315 | 1.814 | n/a | 0.000 | 0.000 | 1.200 | 942.188 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.080 | 1.814 | 0.002 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001c55 | 943.669 | 7.931 | n/a | 0.000 | 0.000 | 0.347 | 935.226 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.121 | 7.931 | 0.008 | 0.121 | gw-r/thread-44/journal/page | none observed |

## P3 / recovery / internal (143 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 315.753 | n/a | n/a | n/a | 3.140 | n/a | 0.000 | 0.000 | 0.427 | 309.758 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.118 | 3.140 | 0.013 | 0.118 |
| p99 | 1004.265 | n/a | n/a | n/a | 12.934 | n/a | 1.144 | 0.000 | 2.764 | 1000.719 | 0.021 | n/a | 0.107 | 0.000 | n/a | n/a | 36.929 | 13.292 | 0.672 | 36.929 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001cce | 1005.553 | 3.871 | n/a | 0.000 | 0.000 | 0.752 | 1000.781 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.110 | 3.871 | 0.004 | 0.110 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d43 | 1004.265 | 3.166 | n/a | 0.000 | 0.000 | 0.583 | 1000.405 | 0.003 | n/a | 0.017 | 0.000 | n/a | n/a | 0.091 | 3.166 | 0.003 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001d08 | 1003.392 | 3.056 | n/a | 0.000 | 0.000 | 0.318 | 999.919 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.075 | 3.056 | 0.003 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001cde | 1003.208 | 5.424 | n/a | 0.000 | 0.000 | 0.425 | 997.204 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.128 | 5.424 | 0.005 | 0.128 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001d32 | 1003.039 | 0.149 | n/a | 0.000 | 0.000 | 0.855 | 1000.719 | 0.014 | n/a | 0.201 | 0.000 | n/a | n/a | 1.100 | 0.149 | 0.000 | 1.100 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001d6b | 1002.824 | 0.176 | n/a | 0.000 | 0.000 | 0.771 | 1000.698 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 1.122 | 0.176 | 0.000 | 1.122 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001d66 | 1002.523 | 2.329 | n/a | 0.000 | 0.000 | 0.314 | 999.798 | 0.003 | n/a | 0.018 | 0.000 | n/a | n/a | 0.061 | 2.329 | 0.002 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d20 | 1002.321 | 0.154 | n/a | 0.000 | 0.000 | 0.531 | 1000.473 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 1.128 | 0.154 | 0.000 | 1.128 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001cb6 | 1002.265 | 0.092 | n/a | 0.000 | 0.000 | 0.445 | 1000.619 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 1.062 | 0.092 | 0.000 | 1.062 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001d39 | 1002.203 | 0.125 | n/a | 0.000 | 0.000 | 0.471 | 1000.469 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 1.106 | 0.125 | 0.000 | 1.106 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001d4d | 1001.846 | 0.074 | n/a | 0.000 | 0.000 | 0.287 | 1000.366 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 1.087 | 0.074 | 0.000 | 1.087 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001d0f | 1000.747 | 3.087 | n/a | 0.000 | 0.000 | 0.326 | 997.214 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.078 | 3.087 | 0.003 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001d73 | 997.165 | 3.335 | n/a | 0.000 | 0.000 | 0.312 | 993.424 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.070 | 3.335 | 0.003 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001cdf | 996.951 | 4.668 | n/a | 0.000 | 0.000 | 0.629 | 991.519 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.109 | 4.668 | 0.005 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001ca9 | 996.606 | 3.313 | n/a | 0.000 | 0.000 | 0.399 | 992.695 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.158 | 3.313 | 0.003 | 0.158 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001ce5 | 995.857 | 2.667 | n/a | 0.000 | 0.000 | 0.379 | 992.695 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.073 | 2.667 | 0.003 | 0.073 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001d6a | 994.515 | 2.466 | n/a | 0.000 | 0.000 | 0.283 | 991.653 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.066 | 2.466 | 0.002 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001d4f | 993.948 | 4.317 | n/a | 0.000 | 0.000 | 0.287 | 989.203 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.118 | 4.317 | 0.004 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001c9b | 993.695 | 2.811 | n/a | 0.000 | 0.000 | 0.406 | 990.382 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.062 | 2.811 | 0.003 | 0.062 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d72 | 993.688 | 3.649 | n/a | 0.000 | 0.000 | 0.584 | 989.358 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.064 | 3.649 | 0.004 | 0.064 | gw-r/thread-42/journal/page | none observed |

## P3 / p4mix / internal (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.147 | n/a | n/a | n/a | 3.607 | n/a | 0.000 | 0.000 | 0.457 | 351.666 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.087 | 3.607 | 0.009 | 0.087 |
| p99 | 1003.391 | n/a | n/a | n/a | 11.610 | n/a | 0.993 | 0.000 | 2.040 | 1000.666 | 0.195 | n/a | 0.049 | 0.000 | n/a | n/a | 42.279 | 12.423 | 0.743 | 42.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001d74 | 1003.498 | 4.348 | n/a | 0.000 | 0.000 | 0.330 | 998.586 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.213 | 4.348 | 0.004 | 0.213 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001dcc | 1003.391 | 2.893 | n/a | 0.000 | 0.000 | 0.355 | 1000.039 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.072 | 2.893 | 0.003 | 0.072 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d75 | 1003.189 | 3.478 | n/a | 0.000 | 0.000 | 0.802 | 998.813 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.067 | 3.478 | 0.003 | 0.067 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001dfb | 1002.380 | 0.099 | n/a | 0.000 | 0.000 | 0.463 | 1000.666 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 1.093 | 0.099 | 0.000 | 1.093 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001e10 | 1002.271 | 0.088 | n/a | 0.000 | 0.000 | 0.572 | 1000.483 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 1.087 | 0.088 | 0.000 | 1.087 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001e08 | 1002.229 | 0.087 | n/a | 0.000 | 0.000 | 0.313 | 1000.686 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 1.088 | 0.087 | 0.000 | 1.088 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d85 | 1000.860 | 4.755 | n/a | 0.000 | 0.000 | 0.822 | 995.139 | 0.002 | n/a | 0.038 | 0.000 | n/a | n/a | 0.104 | 4.755 | 0.005 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001d9a | 1000.051 | 2.448 | n/a | 0.000 | 0.000 | 0.637 | 996.856 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.081 | 2.448 | 0.002 | 0.081 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001db1 | 998.986 | 2.226 | n/a | 0.000 | 0.000 | 0.290 | 996.373 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.069 | 2.226 | 0.002 | 0.069 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001d77 | 998.944 | 2.345 | n/a | 0.000 | 0.000 | 0.422 | 996.081 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.066 | 2.345 | 0.002 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001dd4 | 997.341 | 2.662 | n/a | 0.000 | 0.000 | 0.501 | 994.072 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.081 | 2.662 | 0.003 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001d76 | 997.095 | 4.908 | n/a | 0.000 | 0.000 | 0.493 | 991.497 | 0.009 | n/a | 0.024 | 0.000 | n/a | n/a | 0.165 | 4.908 | 0.005 | 0.165 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001dbc | 983.004 | 2.185 | n/a | 0.000 | 0.000 | 0.459 | 980.246 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.070 | 2.185 | 0.002 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001d78 | 977.997 | 5.792 | n/a | 0.000 | 0.000 | 0.637 | 971.272 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.270 | 5.792 | 0.006 | 0.270 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001d94 | 901.650 | 4.392 | n/a | 0.779 | 0.000 | 0.413 | 895.911 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.132 | 5.171 | 0.006 | 0.132 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001d98 | 888.199 | 3.607 | n/a | 0.000 | 0.000 | 0.609 | 883.892 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.069 | 3.607 | 0.004 | 0.069 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d9f | 884.462 | 4.476 | n/a | 0.000 | 0.000 | 0.457 | 879.457 | 0.001 | n/a | 0.011 | 0.000 | n/a | n/a | 0.061 | 4.476 | 0.005 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d8c | 852.614 | 4.455 | n/a | 0.000 | 0.000 | 0.543 | 847.454 | 0.002 | n/a | 0.038 | 0.000 | n/a | n/a | 0.122 | 4.455 | 0.005 | 0.122 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001dd5 | 849.448 | 4.646 | n/a | 0.000 | 0.000 | 0.566 | 844.097 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.086 | 4.646 | 0.005 | 0.086 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001d7e | 824.913 | 2.694 | n/a | 0.000 | 0.000 | 0.518 | 821.581 | 0.012 | n/a | 0.042 | 0.000 | n/a | n/a | 0.065 | 2.694 | 0.003 | 0.065 | gw-r/thread-68/journal/page | none observed |

## P3 / p4h1 / internal (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.395 | n/a | n/a | n/a | 2.653 | n/a | 0.000 | 0.000 | 0.382 | 422.473 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.085 | 2.653 | 0.009 | 0.085 |
| p99 | 1004.206 | n/a | n/a | n/a | 9.402 | n/a | 1.448 | 0.000 | 3.220 | 1002.719 | 0.182 | n/a | 0.085 | 0.000 | n/a | n/a | 44.609 | 10.263 | 0.799 | 44.609 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001e41 | 1004.206 | 0.080 | n/a | 0.000 | 0.000 | 0.293 | 1002.719 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 1.089 | 0.080 | 0.000 | 1.089 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001e30 | 1002.926 | 0.099 | n/a | 0.000 | 0.000 | 0.332 | 1001.239 | 0.024 | n/a | 0.085 | 0.000 | n/a | n/a | 1.148 | 0.099 | 0.000 | 1.148 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001e80 | 1002.665 | 0.156 | n/a | 0.000 | 0.000 | 0.491 | 1000.841 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 1.113 | 0.156 | 0.000 | 1.113 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001e28 | 1002.020 | 0.081 | n/a | 0.000 | 0.000 | 0.346 | 1000.463 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 1.092 | 0.081 | 0.000 | 1.092 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001e77 | 1001.969 | 0.086 | n/a | 0.000 | 0.000 | 0.344 | 1000.422 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 1.090 | 0.086 | 0.000 | 1.090 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001e3d | 1001.847 | 4.674 | n/a | 0.000 | 0.000 | 0.389 | 996.617 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.113 | 4.674 | 0.005 | 0.113 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001e7f | 1000.883 | 2.376 | n/a | 0.000 | 0.000 | 0.599 | 997.782 | 0.013 | n/a | 0.048 | 0.000 | n/a | n/a | 0.065 | 2.376 | 0.002 | 0.065 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001ea0 | 1000.601 | 2.225 | n/a | 0.000 | 0.000 | 0.273 | 998.010 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.058 | 2.225 | 0.002 | 0.058 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001e1c | 1000.301 | 2.474 | n/a | 0.000 | 0.000 | 0.509 | 997.207 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.074 | 2.474 | 0.002 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001e5e | 999.471 | 2.246 | n/a | 0.000 | 0.000 | 0.351 | 996.794 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.055 | 2.246 | 0.002 | 0.055 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001e4c | 998.737 | 2.244 | n/a | 0.000 | 0.000 | 0.354 | 996.031 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.063 | 2.244 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001e36 | 997.762 | 2.273 | n/a | 0.000 | 0.000 | 0.289 | 995.068 | 0.024 | n/a | 0.032 | 0.000 | n/a | n/a | 0.075 | 2.273 | 0.002 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001e76 | 997.141 | 2.401 | n/a | 0.000 | 0.000 | 0.410 | 994.232 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.067 | 2.401 | 0.002 | 0.067 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001e32 | 992.570 | 2.453 | n/a | 0.000 | 0.000 | 0.314 | 989.630 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.143 | 2.453 | 0.002 | 0.143 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001e39 | 961.806 | 5.484 | n/a | 0.000 | 0.000 | 0.764 | 955.391 | 0.007 | n/a | 0.032 | 0.000 | n/a | n/a | 0.128 | 5.484 | 0.006 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001e21 | 932.975 | 2.095 | n/a | 0.000 | 0.000 | 0.294 | 930.464 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.073 | 2.095 | 0.002 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001e91 | 918.060 | 2.342 | n/a | 0.000 | 0.000 | 0.392 | 915.234 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 2.342 | 0.003 | 0.064 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001e86 | 915.179 | 2.212 | n/a | 0.000 | 0.000 | 0.418 | 912.441 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.089 | 2.212 | 0.002 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001e69 | 911.839 | 6.321 | n/a | 0.000 | 0.000 | 0.953 | 904.228 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.300 | 6.321 | 0.007 | 0.300 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001e82 | 858.895 | 3.708 | n/a | 0.000 | 0.000 | 1.021 | 854.050 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.083 | 3.708 | 0.004 | 0.083 | gw-r/thread-46/journal/page | none observed |

## P3 / grow3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 693.775 | n/a | n/a | n/a | 4.151 | n/a | 0.000 | 0.000 | 0.523 | 93.344 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 1.630 | 4.151 | 0.583 | 1.630 |
| p99 | 1495.728 | n/a | n/a | n/a | 598.555 | n/a | 57.548 | 0.000 | 5.145 | 1000.639 | 0.035 | n/a | 0.049 | 0.000 | n/a | n/a | 44.080 | 656.103 | 0.840 | 44.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001eaa | 1495.728 | 598.555 | n/a | 57.548 | 0.000 | 5.145 | 823.526 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 10.920 | 656.103 | 0.439 | 10.920 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001eb0 | 1002.565 | 0.142 | n/a | 0.000 | 0.000 | 0.623 | 1000.639 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 1.108 | 0.142 | 0.000 | 1.108 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001ea8 | 1002.287 | 0.134 | n/a | 0.000 | 0.000 | 0.523 | 1000.466 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 1.117 | 0.134 | 0.000 | 1.117 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001eb1 | 960.900 | 553.272 | n/a | 36.630 | 0.000 | 0.647 | 360.946 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 9.360 | 589.902 | 0.614 | 9.360 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001eb6 | 885.253 | 551.015 | n/a | 36.027 | 0.000 | 3.099 | 284.338 | 0.008 | n/a | 0.038 | 0.000 | n/a | n/a | 10.729 | 587.042 | 0.663 | 10.729 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001eb9 | 693.775 | 543.515 | n/a | 39.485 | 0.000 | 1.093 | 93.344 | 0.035 | n/a | 0.013 | 0.000 | n/a | n/a | 16.290 | 583.000 | 0.840 | 16.290 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001ea7 | 46.826 | 2.525 | n/a | 0.000 | 0.000 | 0.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 44.080 | 2.525 | 0.054 | 44.080 | node-14/thread-2/socket.wait-first-byte | none observed |
| 840752184625ea460000000000001eaf | 11.298 | 9.414 | n/a | 0.000 | 0.000 | 0.254 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.630 | 9.414 | 0.833 | 1.630 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001eb4 | 5.480 | 4.151 | n/a | 0.000 | 0.000 | 0.221 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.109 | 4.151 | 0.757 | 1.109 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001eb8 | 4.283 | 2.496 | n/a | 0.000 | 0.000 | 0.199 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.588 | 2.496 | 0.583 | 1.588 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (102 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.130 | n/a | n/a | n/a | 2.857 | n/a | 0.000 | 0.000 | 0.422 | 380.927 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.071 | 2.857 | 0.012 | 0.071 |
| p99 | 1006.654 | n/a | n/a | n/a | 27.013 | n/a | 1.472 | 0.000 | 1.453 | 1000.060 | 0.038 | n/a | 0.134 | 0.000 | n/a | n/a | 47.825 | 28.005 | 0.606 | 47.825 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001f59 | 1408.490 | 498.652 | n/a | 37.843 | 0.000 | 0.647 | 863.940 | 1.107 | n/a | 0.038 | 0.000 | n/a | n/a | 6.262 | 536.495 | 0.381 | 6.262 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001f45 | 1006.654 | 5.845 | n/a | 0.000 | 0.000 | 0.550 | 1000.060 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.147 | 5.845 | 0.006 | 0.147 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001f25 | 1002.963 | 2.178 | n/a | 0.000 | 0.000 | 2.872 | 997.820 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.054 | 2.178 | 0.002 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001f44 | 1002.843 | 3.841 | n/a | 0.000 | 0.000 | 0.366 | 998.542 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.061 | 3.841 | 0.004 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001f2c | 1002.421 | 0.102 | n/a | 0.000 | 0.000 | 0.322 | 1000.842 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 1.101 | 0.102 | 0.000 | 1.101 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001f35 | 1000.583 | 4.608 | n/a | 0.000 | 0.000 | 0.673 | 995.152 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.104 | 4.608 | 0.005 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001ef1 | 1000.099 | 2.354 | n/a | 0.000 | 0.000 | 0.362 | 997.306 | 0.004 | n/a | 0.019 | 0.000 | n/a | n/a | 0.054 | 2.354 | 0.002 | 0.054 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001f46 | 999.867 | 2.318 | n/a | 0.000 | 0.000 | 0.431 | 997.011 | 0.011 | n/a | 0.040 | 0.000 | n/a | n/a | 0.055 | 2.318 | 0.002 | 0.055 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001f10 | 999.606 | 2.876 | n/a | 0.000 | 0.000 | 0.350 | 996.299 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.052 | 2.876 | 0.003 | 0.052 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001f16 | 999.455 | 2.237 | n/a | 0.000 | 0.000 | 0.532 | 996.593 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.237 | 0.002 | 0.063 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001edf | 998.876 | 12.542 | n/a | 1.170 | 0.000 | 1.453 | 983.369 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.295 | 13.711 | 0.014 | 0.295 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001f31 | 998.792 | 2.423 | n/a | 0.000 | 0.000 | 0.426 | 995.841 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.050 | 2.423 | 0.002 | 0.050 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001f24 | 989.680 | 2.478 | n/a | 0.000 | 0.000 | 0.485 | 986.615 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.059 | 2.478 | 0.003 | 0.059 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001f0f | 970.102 | 2.210 | n/a | 0.000 | 0.000 | 0.297 | 967.512 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.047 | 2.210 | 0.002 | 0.047 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001f29 | 945.782 | 1.742 | n/a | 0.000 | 0.000 | 0.280 | 943.682 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.050 | 1.742 | 0.002 | 0.050 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001f3a | 945.713 | 2.517 | n/a | 0.000 | 0.000 | 0.496 | 942.601 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 2.517 | 0.003 | 0.064 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000001ef2 | 922.559 | 2.798 | n/a | 0.000 | 0.000 | 0.591 | 919.048 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.093 | 2.798 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001f32 | 897.282 | 2.463 | n/a | 0.000 | 0.000 | 0.432 | 894.315 | 0.003 | n/a | 0.011 | 0.000 | n/a | n/a | 0.058 | 2.463 | 0.003 | 0.058 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001f18 | 823.501 | 2.188 | n/a | 0.000 | 0.000 | 0.492 | 820.690 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.047 | 2.188 | 0.003 | 0.047 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001ef8 | 820.616 | 2.186 | n/a | 0.000 | 0.000 | 0.399 | 817.945 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.055 | 2.186 | 0.003 | 0.055 | gw-r/thread-49/journal/page | none observed |

## P3 / grow10 / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 646.336 | n/a | n/a | n/a | 493.980 | n/a | 35.984 | 0.000 | 1.010 | 55.748 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 6.646 | 539.489 | 0.752 | 6.646 |
| p99 | 912.877 | n/a | n/a | n/a | 591.490 | n/a | 68.604 | 0.000 | 2.242 | 331.010 | 7.833 | n/a | 0.036 | 0.000 | n/a | n/a | 11.844 | 633.665 | 0.904 | 11.844 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001f5b | 912.877 | 535.298 | n/a | 35.984 | 0.000 | 1.008 | 331.010 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 9.552 | 571.282 | 0.626 | 9.552 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f7b | 837.012 | 557.338 | n/a | 46.890 | 0.000 | 1.302 | 222.177 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 9.274 | 604.228 | 0.722 | 9.274 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f69 | 836.836 | 508.552 | n/a | 38.599 | 0.000 | 1.358 | 280.934 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 7.368 | 547.151 | 0.654 | 7.368 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f6b | 804.785 | 520.786 | n/a | 36.455 | 0.000 | 1.010 | 237.388 | 0.068 | n/a | 0.011 | 0.000 | n/a | n/a | 9.066 | 557.241 | 0.692 | 9.066 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f6c | 770.755 | 475.523 | n/a | 39.855 | 0.000 | 1.216 | 246.830 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 7.293 | 515.379 | 0.669 | 7.293 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f74 | 724.696 | 545.690 | n/a | 45.007 | 0.000 | 1.759 | 125.596 | 0.100 | n/a | 0.012 | 0.000 | n/a | n/a | 6.532 | 590.697 | 0.815 | 6.532 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f67 | 717.322 | 508.000 | n/a | 31.489 | 0.000 | 1.093 | 164.587 | 4.149 | n/a | 0.033 | 0.000 | n/a | n/a | 7.972 | 539.489 | 0.752 | 7.972 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f6e | 714.126 | 550.861 | n/a | 40.435 | 0.000 | 1.291 | 113.053 | 0.867 | n/a | 0.024 | 0.000 | n/a | n/a | 7.595 | 591.296 | 0.828 | 7.595 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f70 | 704.858 | 530.402 | n/a | 43.143 | 0.000 | 2.242 | 117.186 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 11.844 | 573.544 | 0.814 | 11.844 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f60 | 702.909 | 591.490 | n/a | 42.174 | 0.000 | 0.689 | 61.892 | 0.007 | n/a | 0.010 | 0.000 | n/a | n/a | 6.646 | 633.665 | 0.901 | 6.646 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f77 | 660.411 | 529.744 | n/a | 44.399 | 0.000 | 2.127 | 73.279 | 1.552 | n/a | 0.030 | 0.000 | n/a | n/a | 9.280 | 574.143 | 0.869 | 9.280 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f78 | 646.336 | 515.500 | n/a | 68.604 | 0.000 | 1.259 | 46.816 | 7.833 | n/a | 0.023 | 0.000 | n/a | n/a | 6.301 | 584.104 | 0.904 | 6.301 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f63 | 607.095 | 493.980 | n/a | 49.114 | 0.000 | 1.222 | 55.748 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 7.021 | 543.094 | 0.895 | 7.021 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f5c | 60.739 | 42.830 | n/a | 5.830 | 0.000 | 0.311 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.768 | 48.659 | 0.801 | 11.768 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f79 | 13.417 | 9.879 | n/a | 0.000 | 0.000 | 0.234 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.304 | 9.879 | 0.736 | 3.304 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f75 | 8.109 | 6.177 | n/a | 0.000 | 0.000 | 0.229 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.703 | 6.177 | 0.762 | 1.703 | node-14/thread-2/replica.publish | none observed |
| 840752184625ea460000000000001f65 | 6.962 | 4.399 | n/a | 1.180 | 0.000 | 0.219 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.163 | 5.580 | 0.801 | 1.163 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f71 | 5.378 | 3.707 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.327 | 3.707 | 0.689 | 1.327 | node-14/thread-2/replica.fetch-feed | none observed |
| 840752184625ea460000000000001f68 | 5.248 | 2.830 | n/a | 0.000 | 0.000 | 1.771 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.647 | 2.830 | 0.539 | 0.647 | node-14/thread-2/socket.queue-and-write | none observed |
| 840752184625ea460000000000001f6d | 5.204 | 4.111 | n/a | 0.000 | 0.000 | 0.227 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.866 | 4.111 | 0.790 | 0.866 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 448.689 | n/a | n/a | n/a | 2.614 | n/a | 0.000 | 0.000 | 0.420 | 446.694 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.064 | 2.614 | 0.008 | 0.064 |
| p99 | 1005.440 | n/a | n/a | n/a | 11.278 | n/a | 1.814 | 0.000 | 3.518 | 1000.753 | 0.026 | n/a | 0.070 | 0.000 | n/a | n/a | 33.747 | 12.684 | 0.674 | 33.747 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000001f9d | 1005.440 | 4.877 | n/a | 0.000 | 0.000 | 0.623 | 999.805 | 0.003 | n/a | 0.021 | 0.000 | n/a | n/a | 0.111 | 4.877 | 0.005 | 0.111 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001ff5 | 1004.892 | 3.367 | n/a | 0.000 | 0.000 | 0.729 | 1000.684 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.059 | 3.367 | 0.003 | 0.059 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000001ffa | 1002.993 | 4.326 | n/a | 0.000 | 0.000 | 3.518 | 995.006 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.104 | 4.326 | 0.004 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001fbb | 1002.510 | 3.339 | n/a | 0.000 | 0.000 | 0.542 | 998.528 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.052 | 3.339 | 0.003 | 0.052 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001f93 | 1002.451 | 0.138 | n/a | 0.000 | 0.000 | 0.614 | 1000.536 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 1.118 | 0.138 | 0.000 | 1.118 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001feb | 1002.407 | 0.101 | n/a | 0.000 | 0.000 | 0.377 | 1000.753 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 1.106 | 0.101 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001faf | 1002.269 | 2.585 | n/a | 0.000 | 0.000 | 2.319 | 997.259 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.054 | 2.585 | 0.003 | 0.054 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001fb4 | 1001.910 | 0.087 | n/a | 0.000 | 0.000 | 0.297 | 1000.384 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 1.097 | 0.087 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000002001 | 1001.582 | 3.099 | n/a | 0.000 | 0.000 | 0.439 | 997.966 | 0.003 | n/a | 0.019 | 0.000 | n/a | n/a | 0.055 | 3.099 | 0.003 | 0.055 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001fe3 | 998.789 | 4.644 | n/a | 0.000 | 0.000 | 0.801 | 993.170 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.117 | 4.644 | 0.005 | 0.117 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001f9b | 998.740 | 2.172 | n/a | 0.000 | 0.000 | 0.555 | 995.903 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.051 | 2.172 | 0.002 | 0.051 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000002005 | 998.408 | 2.381 | n/a | 0.000 | 0.000 | 0.510 | 995.422 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.056 | 2.381 | 0.002 | 0.056 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001fd4 | 997.021 | 2.291 | n/a | 0.000 | 0.000 | 0.298 | 994.335 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.052 | 2.291 | 0.002 | 0.052 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001fc7 | 996.614 | 2.651 | n/a | 0.000 | 0.000 | 0.387 | 993.486 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.058 | 2.651 | 0.003 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001fb3 | 993.651 | 3.795 | n/a | 0.000 | 0.000 | 0.617 | 989.150 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.050 | 3.795 | 0.004 | 0.050 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000001ff6 | 993.497 | 2.277 | n/a | 0.000 | 0.000 | 1.175 | 989.962 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.051 | 2.277 | 0.002 | 0.051 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000001f9c | 990.545 | 2.166 | n/a | 0.000 | 0.000 | 0.308 | 987.979 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.048 | 2.166 | 0.002 | 0.048 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000001fe4 | 986.295 | 3.482 | n/a | 0.000 | 0.000 | 0.448 | 982.217 | 0.010 | n/a | 0.037 | 0.000 | n/a | n/a | 0.102 | 3.482 | 0.004 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000001f9f | 942.855 | 2.100 | n/a | 0.000 | 0.000 | 0.302 | 940.350 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.060 | 2.100 | 0.002 | 0.060 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000001fef | 938.579 | 2.372 | n/a | 0.000 | 0.000 | 0.371 | 935.743 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.059 | 2.372 | 0.003 | 0.059 | gw-r/thread-49/journal/page | none observed |

## P3 / presweep / internal (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 390.658 | n/a | n/a | n/a | 3.459 | n/a | 0.000 | 0.000 | 0.511 | 377.662 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.093 | 3.674 | 0.011 | 0.093 |
| p99 | 1008.095 | n/a | n/a | n/a | 15.518 | n/a | 3.094 | 0.000 | 3.463 | 1000.610 | 0.035 | n/a | 0.053 | 0.000 | n/a | n/a | 38.596 | 19.825 | 0.402 | 38.596 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000002025 | 1010.337 | 14.597 | n/a | 2.204 | 0.000 | 1.366 | 991.924 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.215 | 16.801 | 0.017 | 0.215 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000002043 | 1008.095 | 3.948 | n/a | 0.000 | 0.000 | 0.773 | 1003.273 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.076 | 3.948 | 0.004 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000002097 | 1003.559 | 0.109 | n/a | 0.000 | 0.000 | 1.704 | 1000.610 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 1.097 | 0.109 | 0.000 | 1.097 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000002039 | 1002.384 | 3.061 | n/a | 0.000 | 0.000 | 0.579 | 998.603 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.097 | 3.061 | 0.003 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000002077 | 1000.693 | 2.553 | n/a | 0.000 | 0.000 | 0.347 | 997.695 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.070 | 2.553 | 0.003 | 0.070 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea46000000000000203a | 999.994 | 3.142 | n/a | 0.956 | 0.000 | 0.693 | 995.102 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.070 | 4.098 | 0.004 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000002091 | 999.840 | 2.444 | n/a | 0.000 | 0.000 | 3.463 | 993.816 | 0.002 | n/a | 0.050 | 0.000 | n/a | n/a | 0.064 | 2.444 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea46000000000000209e | 998.038 | 3.683 | n/a | 0.000 | 0.000 | 0.366 | 993.818 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.131 | 3.683 | 0.004 | 0.131 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea46000000000000208b | 997.729 | 2.360 | n/a | 0.000 | 0.000 | 0.543 | 994.709 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 2.360 | 0.002 | 0.074 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea46000000000000200b | 996.178 | 3.477 | n/a | 0.000 | 0.000 | 0.638 | 991.925 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.091 | 3.477 | 0.003 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000002019 | 995.335 | 2.135 | n/a | 0.000 | 0.000 | 0.987 | 992.110 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.050 | 2.135 | 0.002 | 0.050 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000002057 | 985.010 | 4.999 | n/a | 0.000 | 0.000 | 0.511 | 979.367 | 0.003 | n/a | 0.034 | 0.000 | n/a | n/a | 0.095 | 4.999 | 0.005 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea46000000000000206a | 879.192 | 4.185 | n/a | 0.000 | 0.000 | 0.967 | 873.863 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.137 | 4.185 | 0.005 | 0.137 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000002014 | 863.240 | 2.304 | n/a | 0.000 | 0.000 | 0.322 | 860.535 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.050 | 2.304 | 0.003 | 0.050 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000002059 | 839.653 | 2.424 | n/a | 0.000 | 0.000 | 1.271 | 835.845 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.078 | 2.424 | 0.003 | 0.078 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000002088 | 836.185 | 2.542 | n/a | 0.000 | 0.000 | 0.422 | 833.095 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.093 | 2.542 | 0.003 | 0.093 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea46000000000000200f | 782.472 | 2.656 | n/a | 0.000 | 0.000 | 0.577 | 779.135 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.053 | 2.656 | 0.003 | 0.053 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000002086 | 761.375 | 2.465 | n/a | 0.000 | 0.000 | 0.478 | 758.313 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.088 | 2.465 | 0.003 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea46000000000000201a | 757.363 | 8.348 | n/a | 1.552 | 0.000 | 0.551 | 746.628 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.222 | 9.901 | 0.013 | 0.222 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea460000000000002040 | 746.205 | 3.612 | n/a | 0.000 | 0.000 | 0.390 | 742.076 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.078 | 3.612 | 0.005 | 0.078 | gw-r/thread-49/journal/page | none observed |

## P3 / sweep / internal (99 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 394.582 | n/a | n/a | n/a | 3.033 | n/a | 0.000 | 0.000 | 0.487 | 387.988 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.101 | 3.033 | 0.010 | 0.101 |
| p99 | 1019.699 | n/a | n/a | n/a | 18.181 | n/a | 1.515 | 0.000 | 3.330 | 1002.431 | 0.141 | n/a | 0.058 | 0.000 | n/a | n/a | 46.258 | 19.696 | 0.874 | 46.258 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000002105 | 1019.699 | 16.155 | n/a | 0.000 | 0.000 | 0.543 | 1002.431 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.523 | 16.155 | 0.016 | 0.523 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000002131 | 1006.844 | 5.897 | n/a | 0.000 | 0.000 | 0.893 | 999.754 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.267 | 5.897 | 0.006 | 0.267 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000020de | 1002.914 | 2.398 | n/a | 0.000 | 0.000 | 0.444 | 999.958 | 0.006 | n/a | 0.025 | 0.000 | n/a | n/a | 0.083 | 2.398 | 0.002 | 0.083 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea4600000000000020db | 1002.370 | 0.114 | n/a | 0.000 | 0.000 | 0.491 | 1000.615 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 1.098 | 0.114 | 0.000 | 1.098 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000020cf | 1002.278 | 0.113 | n/a | 0.000 | 0.000 | 0.445 | 1000.601 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 1.074 | 0.113 | 0.000 | 1.074 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea4600000000000020f2 | 1002.135 | 0.110 | n/a | 0.000 | 0.000 | 0.485 | 1000.402 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 1.100 | 0.110 | 0.000 | 1.100 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000020b0 | 1001.038 | 4.498 | n/a | 0.000 | 0.000 | 0.530 | 995.854 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.131 | 4.498 | 0.004 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000020e5 | 1000.724 | 2.260 | n/a | 0.000 | 0.000 | 0.907 | 997.460 | 0.003 | n/a | 0.023 | 0.000 | n/a | n/a | 0.071 | 2.260 | 0.002 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000002114 | 1000.016 | 3.730 | n/a | 0.000 | 0.000 | 0.832 | 995.358 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.062 | 3.730 | 0.004 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000020ee | 998.771 | 2.693 | n/a | 0.000 | 0.000 | 0.650 | 995.302 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.097 | 2.693 | 0.003 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000020d1 | 997.347 | 4.121 | n/a | 0.000 | 0.000 | 0.602 | 992.496 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.076 | 4.121 | 0.004 | 0.076 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000002115 | 996.853 | 2.885 | n/a | 0.000 | 0.000 | 0.327 | 993.506 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.072 | 2.885 | 0.003 | 0.072 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000020d2 | 995.926 | 2.397 | n/a | 0.000 | 0.000 | 0.413 | 993.020 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.397 | 0.002 | 0.066 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000020dd | 993.254 | 2.718 | n/a | 0.000 | 0.000 | 2.257 | 988.136 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.112 | 2.718 | 0.003 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000020f0 | 984.971 | 4.954 | n/a | 0.000 | 0.000 | 0.435 | 979.422 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.121 | 4.954 | 0.005 | 0.121 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000002107 | 961.548 | 18.181 | n/a | 1.515 | 0.000 | 0.832 | 940.466 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.516 | 19.696 | 0.020 | 0.516 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea4600000000000020b3 | 909.067 | 6.239 | n/a | 0.000 | 0.000 | 0.717 | 901.985 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.099 | 6.239 | 0.007 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000020f4 | 896.196 | 8.426 | n/a | 0.937 | 0.000 | 0.512 | 885.844 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.443 | 9.363 | 0.010 | 0.443 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000002135 | 861.951 | 2.468 | n/a | 0.000 | 0.000 | 0.441 | 858.926 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.062 | 2.468 | 0.003 | 0.062 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea4600000000000020cc | 857.282 | 4.204 | n/a | 0.000 | 0.000 | 0.495 | 852.467 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.082 | 4.204 | 0.005 | 0.082 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / internal (3127 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.280 | n/a | n/a | n/a | 4.650 | n/a | 0.000 | 0.000 | 0.226 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.563 | 4.684 | 0.370 | 4.563 |
| p99 | 1000.271 | n/a | n/a | n/a | 24.178 | n/a | 2.482 | 0.000 | 2.159 | 996.201 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 46.564 | 26.428 | 0.873 | 46.564 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 840752184625ea460000000000003a96 | 1004.491 | 5.346 | n/a | 0.000 | 0.000 | 0.694 | 998.299 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.115 | 5.346 | 0.005 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000003a38 | 1003.824 | 2.366 | n/a | 0.000 | 0.000 | 0.480 | 1000.889 | 0.004 | n/a | 0.022 | 0.000 | n/a | n/a | 0.063 | 2.366 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000039c1 | 1003.802 | 5.413 | n/a | 0.787 | 0.000 | 0.414 | 997.094 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.064 | 6.200 | 0.006 | 0.064 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea460000000000003a98 | 1003.629 | 2.710 | n/a | 0.000 | 0.000 | 2.340 | 998.453 | 0.012 | n/a | 0.050 | 0.000 | n/a | n/a | 0.065 | 2.710 | 0.003 | 0.065 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000039d6 | 1003.305 | 5.998 | n/a | 0.000 | 0.000 | 0.674 | 996.525 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.071 | 5.998 | 0.006 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea46000000000000216c | 1003.292 | 2.349 | n/a | 0.000 | 0.000 | 0.606 | 1000.230 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.065 | 2.349 | 0.002 | 0.065 | gw-r/thread-68/journal/page | none observed |
| 840752184625ea460000000000002189 | 1003.274 | 6.159 | n/a | 0.000 | 0.000 | 0.572 | 996.344 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.165 | 6.159 | 0.006 | 0.165 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000003ac8 | 1002.720 | 2.908 | n/a | 0.000 | 0.000 | 0.338 | 999.385 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.059 | 2.908 | 0.003 | 0.059 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea4600000000000039e7 | 1002.697 | 2.515 | n/a | 0.000 | 0.000 | 0.490 | 999.586 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.049 | 2.515 | 0.003 | 0.049 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000003a7a | 1002.483 | 2.834 | n/a | 0.000 | 0.000 | 0.503 | 999.052 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.060 | 2.834 | 0.003 | 0.060 | gw-r/thread-76/journal/page | none observed |
| 840752184625ea4600000000000039e6 | 1002.253 | 3.178 | n/a | 0.000 | 0.000 | 0.493 | 998.473 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.076 | 3.178 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000003aa0 | 1002.197 | 0.096 | n/a | 0.000 | 0.000 | 0.421 | 1000.517 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 1.097 | 0.096 | 0.000 | 1.097 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea460000000000003a6d | 1002.185 | 0.093 | n/a | 0.000 | 0.000 | 0.298 | 1000.645 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 1.093 | 0.093 | 0.000 | 1.093 | gw-r/thread-48/journal/page | none observed |
| 840752184625ea460000000000002196 | 1002.149 | 3.287 | n/a | 0.000 | 0.000 | 0.614 | 998.153 | 0.003 | n/a | 0.024 | 0.000 | n/a | n/a | 0.067 | 3.287 | 0.003 | 0.067 | gw-r/thread-46/journal/page | none observed |
| 840752184625ea4600000000000039ce | 1002.130 | 0.088 | n/a | 0.000 | 0.000 | 0.292 | 1000.603 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 1.095 | 0.088 | 0.000 | 1.095 | gw-r/thread-45/journal/page | none observed |
| 840752184625ea4600000000000039b9 | 1002.127 | 0.131 | n/a | 0.000 | 0.000 | 0.458 | 1000.401 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 1.098 | 0.131 | 0.000 | 1.098 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea46000000000000398d | 1002.102 | 0.113 | n/a | 0.000 | 0.000 | 0.328 | 1000.535 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 1.089 | 0.113 | 0.000 | 1.089 | gw-r/thread-49/journal/page | none observed |
| 840752184625ea460000000000003a84 | 1002.094 | 0.083 | n/a | 0.000 | 0.000 | 0.371 | 1000.493 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.102 | 0.083 | 0.000 | 1.102 | gw-r/thread-44/journal/page | none observed |
| 840752184625ea4600000000000039f2 | 1002.028 | 0.086 | n/a | 0.000 | 0.000 | 0.341 | 1000.471 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 1.087 | 0.086 | 0.000 | 1.087 | gw-r/thread-42/journal/page | none observed |
| 840752184625ea460000000000003a61 | 1001.953 | 0.107 | n/a | 0.000 | 0.000 | 0.302 | 1000.421 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 1.093 | 0.107 | 0.000 | 1.093 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.211 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.090 | 0.012 | n/a | 0.118 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 208.737 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.876 | 204.145 | 0.475 | n/a | 1.010 | 0.000 | n/a | n/a | 0.670 | 0.000 | 0.000 | 0.670 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000000030 | 208.737 | 0.000 | n/a | 0.000 | 0.000 | 7.876 | 200.625 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000009 | 206.024 | 0.000 | n/a | 0.000 | 0.000 | 3.736 | 201.429 | 0.014 | n/a | 0.175 | 0.000 | n/a | n/a | 0.670 | 0.000 | 0.000 | 0.670 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000000e | 205.591 | 0.000 | n/a | 0.000 | 0.000 | 1.096 | 204.145 | 0.021 | n/a | 0.147 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000001f | 205.513 | 0.000 | n/a | 0.000 | 0.000 | 4.175 | 201.089 | 0.012 | n/a | 0.133 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe44000000000000001b | 205.076 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 204.034 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe440000000000000008 | 204.775 | 0.000 | n/a | 0.000 | 0.000 | 1.403 | 202.848 | 0.026 | n/a | 0.376 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000038 | 204.749 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 203.843 | 0.010 | n/a | 0.056 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000016 | 204.729 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 203.351 | 0.019 | n/a | 0.183 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000035 | 204.712 | 0.000 | n/a | 0.000 | 0.000 | 3.726 | 200.753 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000031 | 204.624 | 0.000 | n/a | 0.000 | 0.000 | 0.492 | 203.908 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000007 | 204.599 | 0.000 | n/a | 0.000 | 0.000 | 0.840 | 203.257 | 0.023 | n/a | 0.325 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe44000000000000000d | 204.471 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 203.735 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000002c | 203.973 | 0.000 | n/a | 0.000 | 0.000 | 1.360 | 202.229 | 0.014 | n/a | 0.150 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000004b | 203.670 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 202.581 | 0.046 | n/a | 0.289 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000010 | 203.396 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 202.308 | 0.016 | n/a | 0.184 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000041 | 203.270 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 202.086 | 0.020 | n/a | 0.164 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000042 | 203.244 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 202.019 | 0.031 | n/a | 0.175 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000022 | 203.132 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 202.017 | 0.029 | n/a | 0.226 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000048 | 203.128 | 0.000 | n/a | 0.000 | 0.000 | 1.821 | 201.074 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000001c | 203.091 | 0.000 | n/a | 0.000 | 0.000 | 1.790 | 201.100 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.964 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 200.866 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 |
| p99 | 205.302 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.979 | 203.783 | 1.676 | n/a | 0.396 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe4400000000000000b4 | 205.902 | 0.000 | n/a | 0.000 | 0.000 | 4.806 | 200.859 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe440000000000000066 | 205.310 | 0.000 | n/a | 0.000 | 0.000 | 0.464 | 201.018 | 0.045 | n/a | 3.702 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000012e | 205.302 | 0.000 | n/a | 0.000 | 0.000 | 0.651 | 200.826 | 3.572 | n/a | 0.076 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000000a6 | 205.212 | 0.000 | n/a | 0.000 | 0.000 | 0.980 | 203.969 | 0.012 | n/a | 0.109 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000062 | 205.165 | 0.000 | n/a | 0.000 | 0.000 | 1.230 | 203.713 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000000ba | 205.131 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 204.095 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000096 | 204.859 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 203.783 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000013a | 204.845 | 0.000 | n/a | 0.000 | 0.000 | 3.979 | 200.644 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000078 | 204.829 | 0.000 | n/a | 0.000 | 0.000 | 2.377 | 201.949 | 0.028 | n/a | 0.254 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000000c9 | 204.691 | 0.000 | n/a | 0.000 | 0.000 | 2.954 | 201.436 | 0.013 | n/a | 0.138 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000000d4 | 204.592 | 0.000 | n/a | 0.000 | 0.000 | 3.270 | 201.108 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000000ce | 204.397 | 0.000 | n/a | 0.000 | 0.000 | 3.820 | 200.453 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000011b | 204.356 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 203.015 | 0.170 | n/a | 0.071 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000000e6 | 204.319 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 203.391 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000100 | 204.314 | 0.000 | n/a | 0.000 | 0.000 | 1.871 | 202.152 | 0.020 | n/a | 0.178 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000075 | 204.048 | 0.000 | n/a | 0.000 | 0.000 | 2.361 | 201.449 | 0.012 | n/a | 0.119 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe44000000000000014c | 204.047 | 0.000 | n/a | 0.000 | 0.000 | 2.893 | 200.914 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000000df | 203.985 | 0.000 | n/a | 0.000 | 0.000 | 3.032 | 200.723 | 0.010 | n/a | 0.096 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000015b | 203.949 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 203.153 | 0.037 | n/a | 0.091 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000142 | 203.820 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 202.749 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-42/journal/page | none observed |

## P3 / L1 / read (223 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.453 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 200.688 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 |
| p99 | 205.817 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.066 | 204.028 | 4.750 | n/a | 0.135 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000000184 | 207.222 | 0.000 | n/a | 0.000 | 0.000 | 2.314 | 204.658 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000001af | 207.031 | 0.000 | n/a | 0.000 | 0.000 | 6.234 | 200.585 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000001ef | 205.817 | 0.000 | n/a | 0.000 | 0.000 | 4.130 | 201.470 | 0.012 | n/a | 0.132 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000016c | 205.537 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 204.713 | 0.022 | n/a | 0.056 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000017c | 205.232 | 0.000 | n/a | 0.000 | 0.000 | 4.066 | 200.967 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000001bb | 205.156 | 0.000 | n/a | 0.000 | 0.000 | 3.572 | 201.385 | 0.009 | n/a | 0.097 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000001a2 | 204.832 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 204.028 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000179 | 204.470 | 0.000 | n/a | 0.000 | 0.000 | 0.445 | 203.882 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000020d | 204.465 | 0.000 | n/a | 0.000 | 0.000 | 3.611 | 200.679 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000001c0 | 204.383 | 0.000 | n/a | 0.000 | 0.000 | 3.070 | 201.043 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000185 | 203.875 | 0.000 | n/a | 0.000 | 0.000 | 1.023 | 202.605 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000228 | 203.695 | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 202.645 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000001aa | 203.422 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 202.328 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000001da | 203.304 | 0.000 | n/a | 0.000 | 0.000 | 1.682 | 201.412 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe440000000000000215 | 203.047 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 200.419 | 1.842 | n/a | 0.025 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000001fc | 202.950 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 202.108 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000001a7 | 202.930 | 0.000 | n/a | 0.000 | 0.000 | 2.148 | 200.563 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000238 | 202.889 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 202.119 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000001de | 202.820 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 201.938 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe4400000000000001bc | 202.720 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 201.355 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-44/journal/page | none observed |

## P3 / L4 / read (156 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.748 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.515 | 78.151 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 205.185 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.209 | 202.472 | 2.059 | n/a | 0.136 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe44000000000000026d | 205.213 | 0.000 | n/a | 0.000 | 0.000 | 4.500 | 200.560 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000285 | 205.185 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 204.332 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe44000000000000025b | 203.777 | 0.000 | n/a | 0.000 | 0.000 | 2.831 | 200.796 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000286 | 203.458 | 0.000 | n/a | 0.000 | 0.000 | 0.710 | 202.472 | 0.020 | n/a | 0.182 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000296 | 202.574 | 0.000 | n/a | 0.000 | 0.000 | 0.734 | 201.625 | 0.010 | n/a | 0.120 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000027d | 202.506 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 201.786 | 0.012 | n/a | 0.136 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000292 | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 201.386 | 0.008 | n/a | 0.114 | 0.000 | n/a | n/a | 0.051 | 0.000 | 0.000 | 0.051 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000028b | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 201.388 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000297 | 202.351 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.065 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000273 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 201.454 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000027e | 202.227 | 0.000 | n/a | 0.000 | 0.000 | 0.772 | 201.251 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000029c | 202.173 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.127 | 0.005 | n/a | 0.077 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000269 | 202.154 | 0.000 | n/a | 0.000 | 0.000 | 1.154 | 200.751 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000279 | 202.061 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.120 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000255 | 202.050 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 201.065 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000295 | 202.035 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 201.296 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-47/journal/page | none observed |
| d7c749112bfbbe440000000000000298 | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 200.772 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000291 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 201.283 | 0.010 | n/a | 0.113 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000287 | 201.952 | 0.000 | n/a | 0.000 | 0.000 | 0.572 | 201.166 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000256 | 201.930 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 200.743 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |

## P3 / L16 / read (143 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 92.450 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 91.914 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 202.150 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.396 | 201.296 | 18.316 | n/a | 0.086 | 0.000 | n/a | n/a | 49.957 | 0.000 | 0.000 | 49.957 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000000e89 | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 1.327 | 201.073 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000e98 | 202.150 | 0.000 | n/a | 0.000 | 0.000 | 1.548 | 200.482 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000e92 | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 201.444 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000e7c | 201.961 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 201.202 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000e9d | 201.941 | 0.000 | n/a | 0.000 | 0.000 | 0.460 | 201.281 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e70 | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.137 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.081 | 0.000 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e7d | 201.829 | 0.000 | n/a | 0.000 | 0.000 | 0.567 | 201.044 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000e65 | 201.821 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 201.089 | 0.005 | n/a | 0.075 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000e49 | 201.808 | 0.000 | n/a | 0.000 | 0.000 | 0.418 | 201.226 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000e8c | 201.791 | 0.000 | n/a | 0.000 | 0.000 | 0.356 | 201.296 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e83 | 201.750 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 200.925 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000e61 | 201.733 | 0.000 | n/a | 0.000 | 0.000 | 0.829 | 200.630 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e82 | 201.677 | 0.000 | n/a | 0.000 | 0.000 | 0.365 | 201.116 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e74 | 201.675 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.816 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e59 | 201.633 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 200.677 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000e77 | 201.627 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.824 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000000ea4 | 201.614 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 200.945 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000e9a | 201.557 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 200.563 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e87 | 201.529 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 200.573 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000e5b | 201.523 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 200.618 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.147 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 200.548 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 |
| p99 | 204.435 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.204 | 202.117 | 2.427 | n/a | 0.091 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000000ebc | 205.735 | 0.000 | n/a | 0.000 | 0.000 | 2.204 | 203.319 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000f78 | 205.511 | 0.000 | n/a | 0.000 | 0.000 | 0.316 | 205.033 | 0.009 | n/a | 0.054 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000ee4 | 204.435 | 0.000 | n/a | 0.000 | 0.000 | 3.430 | 200.814 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000fa9 | 203.870 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.283 | 1.476 | n/a | 0.018 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000f40 | 203.317 | 0.000 | n/a | 0.000 | 0.000 | 2.262 | 200.882 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000f1b | 202.769 | 0.000 | n/a | 0.000 | 0.000 | 0.401 | 202.117 | 0.031 | n/a | 0.082 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000f04 | 202.482 | 0.000 | n/a | 0.000 | 0.000 | 1.747 | 200.569 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000eaf | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.242 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000000f4b | 202.200 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 200.998 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000f27 | 202.166 | 0.000 | n/a | 0.000 | 0.000 | 0.441 | 201.512 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000000f71 | 202.150 | 0.000 | n/a | 0.000 | 0.000 | 0.909 | 201.057 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000000f8b | 202.112 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.051 | 0.004 | n/a | 0.071 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000f6b | 201.984 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 200.938 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000f3c | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.643 | 201.107 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000f00 | 201.920 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 200.937 | 0.005 | n/a | 0.076 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000f3a | 201.913 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.037 | 0.054 | n/a | 0.080 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000000f7d | 201.839 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 201.195 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000f51 | 201.804 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 200.597 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000000f1e | 201.799 | 0.000 | n/a | 0.000 | 0.000 | 0.517 | 201.101 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000000fa4 | 201.754 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 201.048 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |

## P3 / L256 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.110 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.472 | 200.515 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 203.100 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.078 | 201.755 | 2.733 | n/a | 0.105 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000000fb6 | 204.924 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 204.217 | 0.003 | n/a | 0.043 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000000ffe | 203.219 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 202.130 | 0.002 | n/a | 0.031 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001047 | 203.100 | 0.000 | n/a | 0.000 | 0.000 | 2.025 | 200.893 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001051 | 203.076 | 0.000 | n/a | 0.000 | 0.000 | 1.504 | 201.192 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.284 | 0.000 | 0.000 | 0.284 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000103f | 202.938 | 0.000 | n/a | 0.000 | 0.000 | 2.156 | 200.598 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001025 | 202.894 | 0.000 | n/a | 0.000 | 0.000 | 2.078 | 200.605 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001030 | 202.860 | 0.000 | n/a | 0.000 | 0.000 | 1.421 | 201.194 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001028 | 202.571 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 201.531 | 0.008 | n/a | 0.124 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001075 | 202.545 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 201.755 | 0.011 | n/a | 0.105 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001004 | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 201.395 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001053 | 202.276 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 200.992 | 0.028 | n/a | 0.069 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001070 | 202.080 | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 200.873 | 0.013 | n/a | 0.064 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000105d | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.122 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001086 | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 201.236 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000000ff5 | 201.939 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 200.987 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001095 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 201.267 | 0.008 | n/a | 0.120 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000000fed | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 200.822 | 0.004 | n/a | 0.075 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001005 | 201.891 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 200.640 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000010a6 | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.571 | 201.070 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000106e | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.969 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (225 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.164 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 200.533 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 203.513 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.741 | 201.489 | 3.824 | n/a | 0.118 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe4400000000000010ba | 204.663 | 0.000 | n/a | 0.000 | 0.000 | 0.317 | 204.203 | 0.010 | n/a | 0.034 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000114e | 203.717 | 0.000 | n/a | 0.000 | 0.000 | 2.920 | 200.649 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000010c0 | 203.513 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 198.334 | 4.584 | n/a | 0.012 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000010cb | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 0.323 | 201.032 | 2.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001108 | 202.785 | 0.000 | n/a | 0.000 | 0.000 | 1.741 | 200.889 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001131 | 202.376 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.193 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000011a0 | 202.363 | 0.000 | n/a | 0.000 | 0.000 | 1.391 | 200.787 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000115c | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 201.402 | 0.009 | n/a | 0.112 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000010ed | 202.242 | 0.000 | n/a | 0.000 | 0.000 | 1.226 | 200.835 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001144 | 202.151 | 0.000 | n/a | 0.000 | 0.000 | 0.632 | 201.262 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000010fe | 202.141 | 0.000 | n/a | 0.000 | 0.000 | 0.418 | 201.532 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001179 | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 0.704 | 201.247 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000011a7 | 202.066 | 0.000 | n/a | 0.000 | 0.000 | 1.288 | 200.615 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000010c4 | 201.954 | 0.000 | n/a | 0.000 | 0.000 | 0.299 | 201.489 | 0.014 | n/a | 0.062 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000111e | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 201.208 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000010b2 | 201.928 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.861 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000113d | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.475 | 201.273 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000010ab | 201.920 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 200.591 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000010e4 | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.526 | 201.094 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000110f | 201.889 | 0.000 | n/a | 0.000 | 0.000 | 0.854 | 200.889 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-49/journal/page | none observed |

## P3 / recovery / read (311 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.468 | 200.500 | 0.004 | n/a | 0.033 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 204.040 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.231 | 203.703 | 2.030 | n/a | 0.088 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000001252 | 205.140 | 0.000 | n/a | 0.000 | 0.000 | 0.322 | 204.710 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000012d2 | 204.750 | 0.000 | n/a | 0.000 | 0.000 | 0.395 | 204.186 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001223 | 204.583 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 203.765 | 0.005 | n/a | 0.063 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001247 | 204.040 | 0.000 | n/a | 0.000 | 0.000 | 0.211 | 203.703 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001217 | 203.280 | 0.000 | n/a | 0.000 | 0.000 | 1.197 | 201.771 | 0.005 | n/a | 0.115 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001222 | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 0.392 | 202.663 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000123d | 203.049 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 201.633 | 0.005 | n/a | 0.114 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000011d7 | 202.863 | 0.000 | n/a | 0.000 | 0.000 | 1.670 | 200.961 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000012e5 | 202.796 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 201.591 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000011b0 | 202.641 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.448 | 0.005 | n/a | 0.088 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000124d | 202.588 | 0.000 | n/a | 0.000 | 0.000 | 1.602 | 200.825 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001295 | 202.254 | 0.000 | n/a | 0.000 | 0.000 | 0.950 | 201.124 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000012fd | 202.107 | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 200.889 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000121d | 202.063 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 201.130 | 0.030 | n/a | 0.067 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000012ed | 202.017 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 200.746 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001284 | 202.011 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 200.801 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000012fc | 202.004 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.910 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001279 | 201.986 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 200.783 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000012bf | 201.946 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 200.656 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000011c0 | 201.882 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 201.176 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-49/journal/page | none observed |

## P3 / p4mix / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.169 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.494 | 200.544 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 |
| p99 | 203.773 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.883 | 201.365 | 1.072 | n/a | 0.108 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000001322 | 205.263 | 0.000 | n/a | 0.000 | 0.000 | 4.314 | 200.745 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000013f7 | 204.703 | 0.000 | n/a | 0.000 | 0.000 | 3.834 | 200.747 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000130f | 203.773 | 0.000 | n/a | 0.000 | 0.000 | 2.815 | 200.753 | 0.003 | n/a | 0.053 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000013e6 | 203.450 | 0.000 | n/a | 0.000 | 0.000 | 2.883 | 200.436 | 0.014 | n/a | 0.033 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001405 | 203.363 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 202.761 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.061 | 0.000 | 0.000 | 0.061 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001362 | 203.193 | 0.000 | n/a | 0.000 | 0.000 | 2.559 | 200.530 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000130a | 202.820 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 201.833 | 0.008 | n/a | 0.104 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000133c | 202.613 | 0.000 | n/a | 0.000 | 0.000 | 1.652 | 200.802 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000139e | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 201.336 | 0.007 | n/a | 0.098 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000013bc | 202.224 | 0.000 | n/a | 0.000 | 0.000 | 1.368 | 200.641 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000013aa | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 200.927 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001319 | 202.114 | 0.000 | n/a | 0.000 | 0.000 | 0.975 | 200.980 | 0.004 | n/a | 0.062 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000132d | 202.107 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 201.159 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001387 | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 201.365 | 0.009 | n/a | 0.108 | 0.000 | n/a | n/a | 0.065 | 0.000 | 0.000 | 0.065 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000013ac | 202.068 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 201.196 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000013ba | 202.064 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.096 | 0.008 | n/a | 0.081 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001393 | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.552 | 201.308 | 0.008 | n/a | 0.105 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001316 | 202.045 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 201.294 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000138b | 202.043 | 0.000 | n/a | 0.000 | 0.000 | 1.111 | 200.787 | 0.004 | n/a | 0.057 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000013a1 | 202.024 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 200.754 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-42/journal/page | none observed |

## P3 / p4h1 / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.112 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.453 | 200.532 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 |
| p99 | 202.384 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 201.193 | 4.561 | n/a | 0.101 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe4400000000000014e4 | 204.741 | 0.000 | n/a | 0.000 | 0.000 | 3.804 | 200.784 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000141c | 202.945 | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 201.400 | 0.010 | n/a | 0.135 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001441 | 202.384 | 0.000 | n/a | 0.000 | 0.000 | 1.138 | 201.035 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001460 | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.252 | 200.870 | 0.008 | n/a | 0.067 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000148b | 202.012 | 0.000 | n/a | 0.000 | 0.000 | 0.555 | 201.176 | 0.009 | n/a | 0.101 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000014b1 | 201.994 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 201.218 | 0.007 | n/a | 0.104 | 0.000 | n/a | n/a | 0.059 | 0.000 | 0.000 | 0.059 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001467 | 201.986 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.111 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000014fb | 201.983 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 200.954 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000014c8 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.872 | 200.886 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001458 | 201.962 | 0.000 | n/a | 0.000 | 0.000 | 0.774 | 200.947 | 0.005 | n/a | 0.078 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001462 | 201.900 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 200.806 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000014dd | 201.873 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 200.622 | 0.010 | n/a | 0.044 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000146c | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 201.065 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000014a4 | 201.815 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 200.620 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000014ba | 201.809 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 200.937 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000014ff | 201.757 | 0.000 | n/a | 0.000 | 0.000 | 0.382 | 201.193 | 0.009 | n/a | 0.098 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000014ab | 201.751 | 0.000 | n/a | 0.000 | 0.000 | 0.428 | 201.107 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001442 | 201.725 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.029 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000014a2 | 201.719 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.976 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000014a1 | 201.689 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 200.434 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-45/journal/page | none observed |

## P3 / grow3 / read (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.211 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.484 | 200.552 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 |
| p99 | 287.827 | n/a | n/a | n/a | 3.805 | n/a | 0.000 | 0.000 | 3.183 | 201.653 | 130.101 | n/a | 0.075 | 0.000 | n/a | n/a | 9.298 | 3.805 | 0.021 | 9.298 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe44000000000000151a | 287.827 | 2.607 | n/a | 0.000 | 0.000 | 1.113 | 144.692 | 130.101 | n/a | 0.016 | 0.000 | n/a | n/a | 9.298 | 2.607 | 0.009 | 9.298 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001523 | 221.589 | 3.805 | n/a | 0.000 | 0.000 | 1.312 | 112.141 | 104.044 | n/a | 0.027 | 0.000 | n/a | n/a | 0.259 | 3.805 | 0.017 | 0.259 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001525 | 204.012 | 0.000 | n/a | 0.000 | 0.000 | 3.183 | 200.674 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000151e | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 0.456 | 201.653 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001529 | 201.498 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 200.752 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001522 | 201.450 | 0.000 | n/a | 0.000 | 0.000 | 0.484 | 200.806 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001519 | 201.357 | 0.000 | n/a | 0.000 | 0.000 | 0.519 | 200.672 | 0.014 | n/a | 0.047 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000151d | 201.335 | 0.000 | n/a | 0.000 | 0.000 | 0.569 | 200.648 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001515 | 201.309 | 0.000 | n/a | 0.000 | 0.000 | 0.411 | 200.726 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001514 | 201.304 | 0.000 | n/a | 0.000 | 0.000 | 0.400 | 200.763 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001518 | 201.235 | 0.000 | n/a | 0.000 | 0.000 | 0.565 | 200.495 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001526 | 201.211 | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 200.518 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001520 | 201.207 | 0.000 | n/a | 0.000 | 0.000 | 0.363 | 200.677 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000151c | 201.149 | 0.000 | n/a | 0.000 | 0.000 | 0.376 | 200.636 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001521 | 201.135 | 0.000 | n/a | 0.000 | 0.000 | 0.423 | 200.552 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001517 | 201.081 | 0.000 | n/a | 0.000 | 0.000 | 0.410 | 200.545 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001516 | 201.065 | 0.000 | n/a | 0.000 | 0.000 | 0.396 | 200.547 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001513 | 201.015 | 0.000 | n/a | 0.000 | 0.000 | 0.232 | 200.670 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000151f | 201.004 | 0.000 | n/a | 0.000 | 0.000 | 0.405 | 200.476 | 0.003 | n/a | 0.031 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001527 | 199.670 | 2.082 | n/a | 0.000 | 0.000 | 1.002 | 113.880 | 82.550 | n/a | 0.035 | 0.000 | n/a | n/a | 0.121 | 2.082 | 0.010 | 0.121 | gw-r/thread-44/journal/page | none observed |

## P3 / p4h3 / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.107 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.496 | 200.504 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 202.158 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.455 | 201.280 | 1.861 | n/a | 0.103 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe4400000000000015cb | 207.111 | 0.000 | n/a | 0.000 | 0.000 | 3.172 | 203.739 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000015ca | 203.605 | 0.000 | n/a | 0.000 | 0.000 | 2.574 | 200.808 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001589 | 202.158 | 0.000 | n/a | 0.000 | 0.000 | 1.415 | 200.599 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001631 | 202.138 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 201.280 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000015dd | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 0.671 | 201.173 | 0.037 | n/a | 0.061 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001612 | 202.076 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 200.922 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001563 | 202.036 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 200.993 | 0.004 | n/a | 0.067 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001583 | 202.023 | 0.000 | n/a | 0.000 | 0.000 | 0.438 | 201.367 | 0.009 | n/a | 0.101 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000015fc | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 201.013 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000015eb | 201.919 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 201.243 | 0.011 | n/a | 0.103 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe44000000000000160a | 201.915 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 200.673 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000161e | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.709 | 200.856 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000015bb | 201.820 | 0.000 | n/a | 0.000 | 0.000 | 0.532 | 201.096 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000015fd | 201.782 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 200.736 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001582 | 201.773 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 200.997 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe44000000000000155b | 201.746 | 0.000 | n/a | 0.000 | 0.000 | 0.489 | 201.052 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000015db | 201.733 | 0.000 | n/a | 0.000 | 0.000 | 0.680 | 200.835 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001559 | 201.722 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 200.417 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000015d2 | 201.718 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 200.765 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001600 | 201.710 | 0.000 | n/a | 0.000 | 0.000 | 0.545 | 200.999 | 0.008 | n/a | 0.071 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-42/journal/page | none observed |

## P3 / grow10 / read (36 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.212 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.498 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 217.498 | n/a | n/a | n/a | 4.272 | n/a | 0.000 | 0.000 | 3.500 | 210.811 | 67.754 | n/a | 0.092 | 0.000 | n/a | n/a | 0.223 | 4.272 | 0.051 | 0.223 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000001663 | 217.498 | 1.930 | n/a | 0.000 | 0.000 | 0.603 | 181.534 | 33.294 | n/a | 0.020 | 0.000 | n/a | n/a | 0.116 | 1.930 | 0.009 | 0.116 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001645 | 216.979 | 4.272 | n/a | 0.000 | 0.000 | 2.007 | 210.462 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.180 | 4.272 | 0.020 | 0.180 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000164c | 214.215 | 2.264 | n/a | 0.000 | 0.000 | 0.994 | 210.811 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.110 | 2.264 | 0.011 | 0.110 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000163a | 209.596 | 3.425 | n/a | 0.000 | 0.000 | 1.166 | 137.030 | 67.754 | n/a | 0.010 | 0.000 | n/a | n/a | 0.211 | 3.425 | 0.016 | 0.211 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000164d | 204.605 | 0.000 | n/a | 0.000 | 0.000 | 3.500 | 200.944 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001662 | 201.792 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 201.057 | 0.002 | n/a | 0.016 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001634 | 201.756 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 200.941 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001654 | 201.660 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.848 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000164b | 201.468 | 0.000 | n/a | 0.000 | 0.000 | 0.459 | 200.875 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 0.000 | 0.000 | 0.078 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001650 | 201.442 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.573 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001639 | 201.440 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.624 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000164e | 201.427 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 200.571 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001640 | 201.414 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 200.696 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001653 | 201.402 | 0.000 | n/a | 0.000 | 0.000 | 0.371 | 200.847 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001657 | 201.384 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 200.628 | 0.003 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001635 | 201.353 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.550 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000165e | 201.325 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 200.530 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000163c | 201.293 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 200.576 | 0.004 | n/a | 0.038 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000165b | 201.212 | 0.000 | n/a | 0.000 | 0.000 | 0.357 | 200.714 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001648 | 201.183 | 0.000 | n/a | 0.000 | 0.000 | 0.529 | 200.498 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |

## P3 / p4h10 / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.139 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.502 | 200.526 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 203.524 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 201.452 | 6.302 | n/a | 0.094 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000001759 | 221.065 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 220.298 | 0.004 | n/a | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000016b5 | 203.638 | 0.000 | n/a | 0.000 | 0.000 | 2.767 | 200.687 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000016d2 | 203.524 | 0.000 | n/a | 0.000 | 0.000 | 2.645 | 200.621 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000016bc | 202.674 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 201.571 | 0.009 | n/a | 0.102 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000170e | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 200.509 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000016c1 | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 0.968 | 201.338 | 0.008 | n/a | 0.094 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001744 | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.938 | 200.383 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001698 | 202.382 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 201.452 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000174d | 202.363 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 201.410 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000016e8 | 202.306 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 201.228 | 0.013 | n/a | 0.093 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001736 | 202.151 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 200.675 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.279 | 0.000 | 0.000 | 0.279 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000016ec | 202.067 | 0.000 | n/a | 0.000 | 0.000 | 1.038 | 200.713 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.262 | 0.000 | 0.000 | 0.262 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000016fc | 202.035 | 0.000 | n/a | 0.000 | 0.000 | 1.098 | 200.640 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001685 | 201.988 | 0.000 | n/a | 0.000 | 0.000 | 1.387 | 200.467 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe440000000000001763 | 201.978 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 201.050 | 0.004 | n/a | 0.056 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001756 | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 1.238 | 200.504 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000001764 | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 200.794 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000016a0 | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 200.874 | 0.004 | n/a | 0.059 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001741 | 201.856 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 200.917 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000175b | 201.842 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.852 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |

## P3 / presweep / read (233 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.085 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.469 | 200.486 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 |
| p99 | 202.538 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.978 | 201.379 | 1.146 | n/a | 0.092 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe4400000000000017ac | 204.964 | 0.000 | n/a | 0.000 | 0.000 | 4.321 | 200.496 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001794 | 202.578 | 0.000 | n/a | 0.000 | 0.000 | 1.912 | 200.473 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000017f0 | 202.538 | 0.000 | n/a | 0.000 | 0.000 | 1.978 | 200.449 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.075 | 0.000 | 0.000 | 0.075 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001803 | 202.304 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 201.236 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000017f5 | 202.269 | 0.000 | n/a | 0.000 | 0.000 | 0.687 | 201.379 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001850 | 202.257 | 0.000 | n/a | 0.000 | 0.000 | 0.286 | 201.843 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000017d5 | 202.210 | 0.000 | n/a | 0.000 | 0.000 | 1.185 | 200.800 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001852 | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 1.642 | 200.433 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001771 | 202.108 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.035 | 0.009 | n/a | 0.091 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000017e6 | 202.070 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 200.881 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000178b | 202.067 | 0.000 | n/a | 0.000 | 0.000 | 1.046 | 200.834 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000017a5 | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 0.424 | 201.392 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe4400000000000017ad | 201.914 | 0.000 | n/a | 0.000 | 0.000 | 0.791 | 200.876 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe44000000000000181a | 201.905 | 0.000 | n/a | 0.000 | 0.000 | 0.856 | 200.855 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000177d | 201.897 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 200.685 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.233 | 0.000 | 0.000 | 0.233 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000017c3 | 201.895 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 200.786 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe44000000000000178d | 201.861 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.024 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000017cc | 201.808 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 200.735 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000017f6 | 201.789 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 200.861 | 0.003 | n/a | 0.050 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001772 | 201.785 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 200.995 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-68/journal/page | none observed |

## P3 / sweep / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.124 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 200.490 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 |
| p99 | 203.477 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.394 | 201.187 | 1.697 | n/a | 0.103 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe4400000000000018a3 | 204.112 | 0.000 | n/a | 0.000 | 0.000 | 3.452 | 200.521 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000018cb | 203.552 | 0.000 | n/a | 0.000 | 0.000 | 3.001 | 200.422 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000018d6 | 203.477 | 0.000 | n/a | 0.000 | 0.000 | 2.394 | 200.892 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000018cd | 202.318 | 0.000 | n/a | 0.000 | 0.000 | 1.387 | 200.747 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe44000000000000193f | 202.196 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 200.643 | 0.003 | n/a | 0.049 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000001937 | 202.110 | 0.000 | n/a | 0.000 | 0.000 | 1.173 | 200.767 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe4400000000000018e8 | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 201.187 | 0.008 | n/a | 0.103 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe44000000000000194a | 202.085 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 200.920 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001965 | 202.041 | 0.000 | n/a | 0.000 | 0.000 | 1.141 | 200.731 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001908 | 202.013 | 0.000 | n/a | 0.000 | 0.000 | 0.483 | 201.312 | 0.010 | n/a | 0.110 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000018af | 201.985 | 0.000 | n/a | 0.000 | 0.000 | 0.597 | 201.203 | 0.010 | n/a | 0.100 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000018e0 | 201.950 | 0.000 | n/a | 0.000 | 0.000 | 1.353 | 200.446 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000018a2 | 201.928 | 0.000 | n/a | 0.000 | 0.000 | 0.944 | 200.823 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001887 | 201.871 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 201.009 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000018b9 | 201.868 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 200.869 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000018d7 | 201.846 | 0.000 | n/a | 0.000 | 0.000 | 0.513 | 201.136 | 0.004 | n/a | 0.097 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001946 | 201.836 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 200.858 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-68/journal/page | none observed |
| d7c749112bfbbe440000000000001903 | 201.770 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.791 | 0.003 | n/a | 0.048 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000001917 | 201.753 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 200.907 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000018dd | 201.742 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 200.576 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / read (984 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 200.991 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.439 | 200.465 | 0.004 | n/a | 0.035 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 |
| p99 | 203.130 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.692 | 201.207 | 1.044 | n/a | 0.093 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7c749112bfbbe440000000000002916 | 232.748 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 184.030 | 47.916 | n/a | 0.039 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000002917 | 210.110 | 0.000 | n/a | 0.000 | 0.000 | 9.061 | 200.878 | 0.004 | n/a | 0.065 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-42/journal/page | none observed |
| d7c749112bfbbe4400000000000019a6 | 204.459 | 0.000 | n/a | 0.000 | 0.000 | 2.900 | 201.430 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.074 | 0.000 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe440000000000001a35 | 204.277 | 0.000 | n/a | 0.000 | 0.000 | 0.638 | 203.453 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe440000000000001a1b | 204.189 | 0.000 | n/a | 0.000 | 0.000 | 3.445 | 200.547 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000028ed | 203.664 | 0.000 | n/a | 0.000 | 0.000 | 2.762 | 200.726 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-76/journal/page | none observed |
| d7c749112bfbbe440000000000002713 | 203.661 | 0.000 | n/a | 0.000 | 0.000 | 0.727 | 202.809 | 0.003 | n/a | 0.049 | 0.000 | n/a | n/a | 0.073 | 0.000 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000027bf | 203.529 | 0.000 | n/a | 0.000 | 0.000 | 2.692 | 200.648 | 0.020 | n/a | 0.058 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000028c2 | 203.280 | 0.000 | n/a | 0.000 | 0.000 | 2.084 | 200.967 | 0.008 | n/a | 0.064 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000026ba | 203.130 | 0.000 | n/a | 0.000 | 0.000 | 2.298 | 200.669 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe4400000000000019ff | 202.876 | 0.613 | n/a | 0.000 | 0.000 | 0.734 | 201.207 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.227 | 0.613 | 0.003 | 0.227 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe440000000000002818 | 202.790 | 0.000 | n/a | 0.000 | 0.000 | 1.534 | 201.079 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-76/journal/page | none observed |
| d7c749112bfbbe440000000000001982 | 202.737 | 0.000 | n/a | 0.000 | 0.000 | 0.318 | 202.284 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe4400000000000019e3 | 202.633 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 201.801 | 0.005 | n/a | 0.023 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-46/journal/page | none observed |
| d7c749112bfbbe4400000000000028ca | 202.571 | 0.000 | n/a | 0.000 | 0.000 | 1.916 | 200.444 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-44/journal/page | none observed |
| d7c749112bfbbe440000000000002762 | 202.560 | 0.000 | n/a | 0.000 | 0.000 | 1.711 | 200.701 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-76/journal/page | none observed |
| d7c749112bfbbe440000000000002896 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 1.754 | 200.492 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| d7c749112bfbbe44000000000000283e | 202.322 | 0.000 | n/a | 0.000 | 0.000 | 1.482 | 200.694 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-45/journal/page | none observed |
| d7c749112bfbbe440000000000002924 | 202.299 | 0.000 | n/a | 0.000 | 0.000 | 1.297 | 200.801 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| d7c749112bfbbe4400000000000028ec | 202.298 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 201.506 | 0.010 | n/a | 0.133 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-42/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 7408 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.001/3.875 ms; post-ACK p50/p99: 0.385/1.893 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.184 | 9.698 | 9.463 | reported |
| All-primary p99 ms | 57.291 | 56.291 | 53.105 | <=50 |
| L256 5-10 p50Ms | 11.711 | 11.455 | 10.687 | <=10 |
| L256 5-10 p99Ms | 34.716 | 34.116 | 34.110 | <=50 |
| L256 11-25 p50Ms | 12.863 | 12.543 | 12.543 | <=10 |
| L256 11-25 p99Ms | 28.373 | 27.974 | 27.973 | <=50 |
| L256 26-50 p50Ms | 18.910 | 17.409 | 17.407 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 18.910 | 17.409 | 17.407 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.703 | 8.383 | 8.159 | <=10 |
| Burst 11-25 p50 ms | 10.815 | 10.239 | 9.983 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 34.716 | 34.116 | 34.110 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 41.684 | 41.075 | 41.075 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 53.063/53.063 | 50.155 | 30.574 | 89.891 | 0.725/0.192 |
| 5-10 | 250-1000 | 268 | 11.067/188.600 | 10.607 | 6.086 | 14.658 | 0.071/0.022 |
| 5-10 | 50-100 | 159 | 8.258/26.942 | 7.942 | 4.372 | 10.995 | 0.048/0.018 |
| 11-25 | 250-1000 | 158 | 13.845/41.615 | 13.053 | 7.243 | 17.596 | 0.081/0.021 |
| 26-50 | 250-1000 | 45 | 19.138/59.680 | 17.693 | 8.833 | 22.124 | 0.103/0.022 |
| 5-10 | 100-250 | 129 | 9.959/61.392 | 9.644 | 5.570 | 13.612 | 0.059/0.019 |
| 5-10 | 0-50 | 2307 | 7.760/25.016 | 7.389 | 4.113 | 10.208 | 0.038/0.017 |
| 26-50 | 50-100 | 26 | 16.589/25.420 | 14.942 | 7.511 | 20.691 | 0.070/0.019 |
| 11-25 | 100-250 | 58 | 12.989/561.622 | 12.303 | 7.035 | 17.189 | 0.072/0.020 |
| 11-25 | overlap | 772 | 11.976/69.486 | 11.332 | 6.742 | 15.417 | 0.037/0.017 |
| 11-25 | 50-100 | 77 | 10.620/59.682 | 9.638 | 5.406 | 13.870 | 0.057/0.018 |
| 11-25 | 0-50 | 1101 | 9.844/36.697 | 9.322 | 5.031 | 12.595 | 0.044/0.017 |
| 26-50 | overlap | 270 | 15.649/63.629 | 14.516 | 8.225 | 20.243 | 0.049/0.018 |
| 26-50 | 100-250 | 15 | 15.063/57.612 | 14.021 | 7.118 | 19.947 | 0.078/0.022 |
| 5-10 | overlap | 1619 | 9.840/72.336 | 9.541 | 5.931 | 13.495 | 0.031/0.015 |
| 26-50 | 0-50 | 403 | 13.386/51.061 | 12.377 | 6.398 | 16.487 | 0.057/0.018 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 649 | 7 | 482.020 |
| burst | 6739 | 71 | 5284.965 |
| growth | 20 | 14 | 7342.141 |

## Writer heap, GC and scheduler stalls

Source dce01797d3015f243262c70bdc6605186a090e06; 7408 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 510.597 / 875.936 |
| GC events / total duration / maximum ms | 1945 / 4885.293 / 49.743 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":1913,"4":16,"8":16} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 57.291 / 92 / 13109.126 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

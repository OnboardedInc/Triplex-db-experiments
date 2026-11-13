# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (154.555 ms, trace `eb902191bc0966c000000000000000be`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (175.944 ms, trace `eb902191bc0966c000000000000000b5`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (151.379 ms, trace `eb902191bc0966c000000000000000c4`); `gw-w/thread-54/gateway.admission-wait` (62.662 ms, trace `eb902191bc0966c000000000000000d0`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (60.158 ms, trace `eb902191bc0966c000000000000000d2`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-c`; source `a516a31eb0753ff89c4a613509ab2823c23b0b57`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 7267970.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 106 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1495.097 | 200.986 | 296.164 | 39 |
| baseline | 0 | 1965.347 | 38.965 | 0.266 | 44 |
| L1 | 1 | 1960.953 | 153.754 | 12.017 | 30 |
| L4 | 4 | 1977.572 | 251.943 | 230.591 | 44 |
| L16 | 16 | 1958.673 | 215.696 | 236.767 | 44 |
| L64 | 16 | 1876.030 | 210.981 | 189.495 | 44 |
| L256 | 16 | 1888.503 | 193.756 | 136.219 | 58 |
| L1024 | 16 | 1849.392 | 327.491 | 291.737 | 21 |
| recovery | 16 | 1051.188 | 90.810 | 68.651 | 44 |
| p4mix | 1 | 1751.448 | 32.755 | 27.071 | 38 |
| p4h1 | 1 | 1758.790 | 34.497 | 11.472 | 30 |
| grow3 | 0 | 1064.189 | 96.196 | 0.150 | 30 |
| p4h3 | 1 | 1833.871 | 54.339 | 38.173 | 100 |
| grow10 | 0 | 1147.147 | 183.092 | 20.775 | 30 |
| p4h10 | 1 | 2356.482 | 50.094 | 31.825 | 72 |
| presweep | 16 | 1026.111 | 99.479 | 151.215 | 30 |
| sweep | 16 | 149.101 | 38.732 | 43.321 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| eb902191bc0966c000000000000000be | driver.queue.scheduler-dispatch | 0.104 | none | 0 / 32 |
| eb902191bc0966c000000000000000be | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace eb902191bc0966c000000000000000be waited: []

| eb902191bc0966c000000000000000b5 | driver.queue.scheduler-late | 0.430 | none | 0 / 32 |
| eb902191bc0966c000000000000000b5 | driver.queue.scheduler-dispatch | 0.060 | none | 0 / 32 |

Observed active steps while trace eb902191bc0966c000000000000000b5 waited: []

| eb902191bc0966c000000000000000c4 | driver.queue.scheduler-late | 0.753 | none | 0 / 32 |
| eb902191bc0966c000000000000000c4 | driver.queue.scheduler-dispatch | 0.118 | none | 0 / 32 |

Observed active steps while trace eb902191bc0966c000000000000000c4 waited: []

| eb902191bc0966c000000000000000d0 | driver.queue.scheduler-dispatch | 0.609 | none | 0 / 32 |
| eb902191bc0966c000000000000000d0 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace eb902191bc0966c000000000000000d0 waited: []

| eb902191bc0966c000000000000000d2 | driver.queue.scheduler-dispatch | 0.216 | none | 0 / 32 |
| eb902191bc0966c000000000000000d2 | driver.queue.scheduler-late | 0.009 | none | 0 / 32 |

Observed active steps while trace eb902191bc0966c000000000000000d2 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.312 | 0.408 | 0.000 | 0.554 | 7.917 | 0.009 | 0.000 | 0.229 | 1.753 | 4.368 | 0.109 | 0.000 | 0.697 | 11.677 | 0.585 | n/a | 0.083 | 8.847 | 0.278 | 0.083 |
| p99 | 55.472 | 1.627 | 0.000 | 3.097 | 24.323 | 1.432 | 0.000 | 0.922 | 4.974 | 10.760 | 2.199 | 0.000 | 1.124 | 16.055 | 1.116 | n/a | 0.266 | 25.983 | 0.468 | 0.266 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000095 | 55.472 | 24.323 | 1.432 | 0.000 | 0.229 | 4.974 | 10.760 | 0.532 | 0.000 | 0.697 | 11.677 | 0.768 | n/a | 0.083 | 25.983 | 0.468 | 0.083 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.worker-message 1.181ms; driver.worker-message 1.000ms |
| eb902191bc0966c00000000000000099 | 35.175 | 9.378 | 0.337 | 0.000 | 0.073 | 3.434 | 6.453 | 0.089 | 0.000 | 1.124 | 13.766 | 0.464 | n/a | 0.059 | 9.787 | 0.278 | 0.059 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000092 | 28.312 | 7.917 | 0.009 | 0.000 | 0.922 | 1.753 | 4.368 | 2.199 | 0.000 | 0.296 | 9.466 | 1.116 | n/a | 0.266 | 8.847 | 0.312 | 0.266 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000096 | 28.002 | 4.135 | 0.006 | 0.000 | 0.823 | 0.854 | 4.346 | 0.109 | 0.000 | 0.998 | 16.055 | 0.585 | n/a | 0.092 | 4.963 | 0.177 | 0.092 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.002 | 1.627 | 0.000 | 2.398 | 4.135 | 0.006 | 0.000 | 0.823 | 0.854 | 4.346 | 0.109 | 0.000 | 0.998 | 16.055 | 0.585 | n/a | 0.092 | 4.963 | 0.177 | 0.092 |
| p99 | 28.002 | 1.627 | 0.000 | 2.398 | 4.135 | 0.006 | 0.000 | 0.823 | 0.854 | 4.346 | 0.109 | 0.000 | 0.998 | 16.055 | 0.585 | n/a | 0.092 | 4.963 | 0.177 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000096 | 28.002 | 4.135 | 0.006 | 0.000 | 0.823 | 0.854 | 4.346 | 0.109 | 0.000 | 0.998 | 16.055 | 0.585 | n/a | 0.092 | 4.963 | 0.177 | 0.092 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.613 | 0.000 | 0.000 | 0.345 | 3.952 | 0.005 | 0.000 | 0.088 | 2.424 | 2.348 | 0.050 | 0.000 | 0.417 | 9.655 | 0.336 | n/a | 0.060 | 4.744 | 0.175 | 0.060 |
| p99 | 39.965 | 0.884 | 0.000 | 1.982 | 5.429 | 0.197 | 0.000 | 0.903 | 3.352 | 2.934 | 0.110 | 0.000 | 1.450 | 26.050 | 0.710 | n/a | 0.196 | 5.691 | 0.290 | 0.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000a1 | 39.965 | 5.429 | 0.191 | 0.000 | 0.072 | 3.352 | 2.934 | 0.085 | 0.000 | 1.450 | 26.050 | 0.336 | n/a | 0.067 | 5.691 | 0.142 | 0.067 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000009f | 23.133 | 3.256 | 0.005 | 0.000 | 0.793 | 2.424 | 2.436 | 0.041 | 0.000 | 0.534 | 12.738 | 0.710 | n/a | 0.196 | 4.054 | 0.175 | 0.196 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000009a | 18.613 | 3.952 | 0.005 | 0.000 | 0.903 | 1.066 | 2.107 | 0.110 | 0.000 | 0.417 | 9.655 | 0.339 | n/a | 0.060 | 4.859 | 0.261 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000009d | 16.383 | 4.458 | 0.197 | 0.000 | 0.088 | 2.581 | 2.348 | 0.050 | 0.000 | 0.279 | 6.043 | 0.285 | n/a | 0.053 | 4.744 | 0.290 | 0.053 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.613 | 0.724 | 0.000 | 1.642 | 3.256 | 0.005 | 0.000 | 0.793 | 1.066 | 2.107 | 0.041 | 0.000 | 0.417 | 9.655 | 0.339 | n/a | 0.060 | 4.054 | 0.175 | 0.060 |
| p99 | 23.133 | 0.884 | 0.000 | 1.982 | 3.952 | 0.005 | 0.000 | 0.903 | 2.424 | 2.436 | 0.110 | 0.000 | 0.534 | 12.738 | 0.710 | n/a | 0.196 | 4.859 | 0.261 | 0.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000009f | 23.133 | 3.256 | 0.005 | 0.000 | 0.793 | 2.424 | 2.436 | 0.041 | 0.000 | 0.534 | 12.738 | 0.710 | n/a | 0.196 | 4.054 | 0.175 | 0.196 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000009a | 18.613 | 3.952 | 0.005 | 0.000 | 0.903 | 1.066 | 2.107 | 0.110 | 0.000 | 0.417 | 9.655 | 0.339 | n/a | 0.060 | 4.859 | 0.261 | 0.060 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.471 | 0.000 | 0.000 | 0.359 | 6.525 | 0.192 | 0.000 | 0.193 | 1.867 | 4.058 | 0.108 | 0.000 | 0.841 | 8.691 | 0.420 | n/a | 0.071 | 6.956 | 0.250 | 0.071 |
| p99 | 27.853 | 3.635 | 0.000 | 3.259 | 9.042 | 0.240 | 0.000 | 0.678 | 5.914 | 4.478 | 0.111 | 0.000 | 1.139 | 10.423 | 4.154 | n/a | 0.135 | 9.733 | 0.415 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000a5 | 27.853 | 6.525 | 0.240 | 0.000 | 0.191 | 5.914 | 4.058 | 0.111 | 0.000 | 0.841 | 5.749 | 4.154 | n/a | 0.071 | 6.956 | 0.250 | 0.071 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000a2 | 23.471 | 9.042 | 0.013 | 0.000 | 0.678 | 1.334 | 2.816 | 0.050 | 0.000 | 0.292 | 8.691 | 0.420 | n/a | 0.135 | 9.733 | 0.415 | 0.135 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000a8 | 22.778 | 4.052 | 0.192 | 0.000 | 0.193 | 1.867 | 4.478 | 0.108 | 0.000 | 1.139 | 10.423 | 0.283 | n/a | 0.043 | 4.438 | 0.195 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.429 | 0.183 | 0.000 | 0.577 | 6.894 | 0.006 | 0.000 | 0.296 | 1.132 | 4.354 | 0.051 | 0.000 | 0.581 | 17.924 | 0.846 | n/a | 0.038 | 8.020 | 0.152 | 0.038 |
| p99 | 76.101 | 2.483 | 0.000 | 2.635 | 10.746 | 0.364 | 0.422 | 1.120 | 4.878 | 12.346 | 0.213 | 0.000 | 8.514 | 42.465 | 3.151 | n/a | 0.064 | 11.386 | 0.220 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000ae | 76.101 | 10.746 | 0.194 | 0.000 | 0.447 | 4.878 | 12.346 | 0.213 | 0.000 | 1.598 | 42.465 | 3.151 | n/a | 0.064 | 11.386 | 0.150 | 0.064 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000b1 | 42.651 | 8.523 | 0.364 | 0.422 | 0.062 | 1.854 | 4.354 | 0.139 | 0.000 | 8.514 | 17.535 | 0.846 | n/a | 0.038 | 9.372 | 0.220 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000a9 | 38.429 | 6.894 | 0.006 | 0.000 | 1.120 | 1.132 | 5.164 | 0.051 | 0.000 | 0.270 | 23.166 | 0.571 | n/a | 0.055 | 8.020 | 0.209 | 0.055 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000ab | 25.625 | 3.607 | 0.004 | 0.000 | 0.296 | 0.838 | 1.297 | 0.037 | 0.000 | 0.581 | 17.924 | 1.003 | n/a | 0.036 | 3.907 | 0.152 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 104.648 | 0.602 | 0.000 | 0.661 | 3.934 | 0.005 | 0.000 | 0.075 | 2.937 | 6.949 | 0.078 | 0.000 | 0.667 | 25.914 | 15.266 | n/a | 0.039 | 4.496 | 0.043 | 0.039 |
| p99 | 283.943 | 1.557 | 0.009 | 1.937 | 9.749 | 0.296 | 0.541 | 0.557 | 11.755 | 50.440 | 0.238 | 0.000 | 4.112 | 175.944 | 87.915 | n/a | 0.059 | 10.583 | 0.163 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000b5 | 283.943 | 3.309 | 0.005 | 0.000 | 0.490 | 11.755 | 4.112 | 0.078 | 0.000 | 0.300 | 175.944 | 87.915 | n/a | 0.037 | 3.803 | 0.013 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000ba | 127.031 | 9.749 | 0.229 | 0.541 | 0.064 | 4.525 | 15.777 | 0.238 | 0.000 | 1.037 | 79.567 | 15.266 | n/a | 0.039 | 10.583 | 0.083 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 2.665ms |
| eb902191bc0966c000000000000000b6 | 104.648 | 3.934 | 0.005 | 0.000 | 0.557 | 1.264 | 50.440 | 0.135 | 0.000 | 4.112 | 25.914 | 18.228 | n/a | 0.059 | 4.496 | 0.043 | 0.059 | gw-w/thread-53/commit.prepare-and-validate | driver.publication 1.558ms |
| eb902191bc0966c000000000000000b3 | 37.918 | 5.427 | 0.296 | 0.366 | 0.075 | 2.937 | 6.949 | 0.076 | 0.000 | 0.667 | 20.713 | 0.356 | n/a | 0.056 | 6.164 | 0.163 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 104.648 | 0.879 | 0.000 | 1.902 | 3.309 | 0.005 | 0.000 | 0.490 | 1.264 | 4.112 | 0.078 | 0.000 | 0.300 | 25.914 | 18.228 | n/a | 0.037 | 3.803 | 0.013 | 0.037 |
| p99 | 283.943 | 1.557 | 0.009 | 1.937 | 3.934 | 0.005 | 0.000 | 0.557 | 11.755 | 50.440 | 0.135 | 0.000 | 4.112 | 175.944 | 87.915 | n/a | 0.059 | 4.496 | 0.043 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000b5 | 283.943 | 3.309 | 0.005 | 0.000 | 0.490 | 11.755 | 4.112 | 0.078 | 0.000 | 0.300 | 175.944 | 87.915 | n/a | 0.037 | 3.803 | 0.013 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000b6 | 104.648 | 3.934 | 0.005 | 0.000 | 0.557 | 1.264 | 50.440 | 0.135 | 0.000 | 4.112 | 25.914 | 18.228 | n/a | 0.059 | 4.496 | 0.043 | 0.059 | gw-w/thread-53/commit.prepare-and-validate | driver.publication 1.558ms |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 113.467 | 1.106 | 0.000 | 1.065 | 7.373 | 0.010 | 0.000 | 0.107 | 2.769 | 18.921 | 0.146 | 0.000 | 1.917 | 54.601 | 21.916 | n/a | 0.046 | 9.408 | 0.081 | 0.046 |
| p99 | 329.524 | 2.511 | 0.000 | 3.732 | 14.819 | 0.530 | 1.572 | 2.026 | 4.997 | 106.696 | 0.239 | 0.000 | 9.863 | 154.555 | 54.079 | n/a | 0.120 | 15.436 | 0.137 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000be | 329.524 | 6.115 | 0.530 | 1.572 | 0.107 | 3.738 | 106.696 | 0.146 | 0.000 | 1.917 | 154.555 | 54.079 | n/a | 0.072 | 8.323 | 0.025 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.726ms |
| eb902191bc0966c000000000000000c0 | 116.476 | 7.373 | 0.010 | 0.000 | 2.026 | 2.769 | 7.925 | 0.239 | 0.000 | 9.863 | 54.263 | 31.888 | n/a | 0.120 | 9.408 | 0.081 | 0.120 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000bb | 113.467 | 8.600 | 0.006 | 0.000 | 0.999 | 1.231 | 18.921 | 0.062 | 0.000 | 0.259 | 61.429 | 21.916 | n/a | 0.043 | 9.605 | 0.085 | 0.043 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000c3 | 112.827 | 14.819 | 0.299 | 0.253 | 0.064 | 4.997 | 20.571 | 0.160 | 0.000 | 7.320 | 54.601 | 9.696 | n/a | 0.046 | 15.436 | 0.137 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 116.476 | 1.582 | 0.000 | 2.585 | 7.373 | 0.010 | 0.000 | 2.026 | 2.769 | 7.925 | 0.239 | 0.000 | 9.863 | 54.263 | 31.888 | n/a | 0.120 | 9.408 | 0.081 | 0.120 |
| p99 | 116.476 | 1.582 | 0.000 | 2.585 | 7.373 | 0.010 | 0.000 | 2.026 | 2.769 | 7.925 | 0.239 | 0.000 | 9.863 | 54.263 | 31.888 | n/a | 0.120 | 9.408 | 0.081 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000c0 | 116.476 | 7.373 | 0.010 | 0.000 | 2.026 | 2.769 | 7.925 | 0.239 | 0.000 | 9.863 | 54.263 | 31.888 | n/a | 0.120 | 9.408 | 0.081 | 0.120 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 120.242 | 0.839 | 0.000 | 1.907 | 8.000 | 0.023 | 0.000 | 0.612 | 1.865 | 15.940 | 0.189 | 0.000 | 2.280 | 58.757 | 12.011 | n/a | 0.066 | 8.709 | 0.072 | 0.066 |
| p99 | 212.833 | 2.611 | 0.018 | 2.955 | 34.206 | 0.328 | 1.937 | 0.871 | 10.507 | 41.633 | 62.944 | 0.000 | 3.274 | 151.379 | 32.922 | n/a | 0.076 | 37.083 | 0.183 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000c4 | 212.833 | 8.112 | 0.023 | 0.000 | 0.871 | 1.086 | 15.940 | 0.144 | 0.000 | 2.280 | 151.379 | 32.922 | n/a | 0.076 | 9.006 | 0.042 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000d0 | 202.553 | 34.206 | 0.328 | 1.937 | 0.612 | 5.987 | 41.633 | 62.944 | 0.000 | 2.359 | 34.880 | 17.605 | n/a | 0.061 | 37.083 | 0.183 | 0.061 | gw-w/thread-54/gateway.admission-wait | driver.worker-message 0.750ms; driver.worker-message 0.524ms |
| eb902191bc0966c000000000000000c8 | 120.242 | 8.000 | 0.262 | 0.352 | 0.096 | 10.507 | 31.618 | 0.189 | 0.000 | 0.905 | 61.211 | 7.034 | n/a | 0.067 | 8.709 | 0.072 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 0.698ms |
| eb902191bc0966c000000000000000cd | 86.515 | 3.776 | 0.004 | 0.000 | 0.787 | 0.877 | 9.904 | 0.065 | 0.000 | 0.267 | 58.757 | 12.011 | n/a | 0.066 | 4.567 | 0.053 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000ca | 43.538 | 6.712 | 0.006 | 0.000 | 0.229 | 1.865 | 2.306 | 0.414 | 0.000 | 3.274 | 27.621 | 1.052 | n/a | 0.061 | 6.947 | 0.160 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.515 | 1.486 | 0.009 | 2.370 | 6.712 | 0.006 | 0.000 | 0.787 | 1.086 | 9.904 | 0.144 | 0.000 | 2.280 | 58.757 | 12.011 | n/a | 0.066 | 6.947 | 0.053 | 0.066 |
| p99 | 212.833 | 2.611 | 0.018 | 2.955 | 8.112 | 0.023 | 0.000 | 0.871 | 1.865 | 15.940 | 0.414 | 0.000 | 3.274 | 151.379 | 32.922 | n/a | 0.076 | 9.006 | 0.160 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000c4 | 212.833 | 8.112 | 0.023 | 0.000 | 0.871 | 1.086 | 15.940 | 0.144 | 0.000 | 2.280 | 151.379 | 32.922 | n/a | 0.076 | 9.006 | 0.042 | 0.076 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000cd | 86.515 | 3.776 | 0.004 | 0.000 | 0.787 | 0.877 | 9.904 | 0.065 | 0.000 | 0.267 | 58.757 | 12.011 | n/a | 0.066 | 4.567 | 0.053 | 0.066 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000ca | 43.538 | 6.712 | 0.006 | 0.000 | 0.229 | 1.865 | 2.306 | 0.414 | 0.000 | 3.274 | 27.621 | 1.052 | n/a | 0.061 | 6.947 | 0.160 | 0.061 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.078 | n/a | n/a | n/a | 11.195 | 2.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 13.477 | 0.998 | 0.015 |
| p99 | 229.268 | n/a | n/a | n/a | 58.510 | 58.105 | 4.625 | 0.000 | 4.211 | 124.513 | 0.025 | 0.000 | 1.527 | 0.000 | n/a | n/a | 0.060 | 102.542 | 1.000 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000ce | 229.268 | 58.510 | 44.032 | 0.000 | 0.000 | 2.142 | 124.513 | 0.013 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.033 | 102.542 | 0.447 | 0.033 | gw-w/thread-47/gateway.admitted-work | driver.worker-message 2.401ms; driver.worker-message 0.750ms; driver.worker-message 0.658ms; driver.worker-message 0.524ms |
| eb902191bc0966c000000000000000e6 | 148.279 | 28.494 | 18.265 | 1.486 | 0.000 | 2.374 | 97.544 | 0.009 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.023 | 48.245 | 0.325 | 0.023 | gw-w/thread-51/gateway.admitted-work | none observed |
| eb902191bc0966c000000000000000c5 | 89.169 | 19.632 | 3.678 | 0.000 | 0.000 | 0.962 | 64.561 | 0.016 | 0.000 | 0.297 | 0.000 | n/a | n/a | 0.022 | 23.310 | 0.261 | 0.022 | gw-w/thread-53/gateway.admitted-work | none observed |
| eb902191bc0966c0000000000000012a | 64.619 | 6.500 | 58.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 64.605 | 1.000 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| eb902191bc0966c000000000000000fb | 62.415 | 18.321 | 13.691 | 0.000 | 0.000 | 0.634 | 29.728 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.011 | 32.012 | 0.513 | 0.011 | gw-w/thread-54/gateway.admitted-work | none observed |
| eb902191bc0966c000000000000000db | 46.775 | 12.586 | 0.891 | 0.000 | 0.000 | 4.211 | 27.521 | 0.025 | 0.000 | 1.527 | 0.000 | n/a | n/a | 0.014 | 13.477 | 0.288 | 0.014 | gw-w/thread-53/gateway.admitted-work | none observed |
| eb902191bc0966c000000000000000bc | 44.859 | 39.952 | 0.266 | 4.625 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 44.844 | 1.000 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c00000000000000093 | 36.227 | 35.059 | 0.256 | 0.878 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 36.192 | 0.999 | 0.035 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c000000000000000c1 | 18.379 | 15.524 | 2.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.060 | 18.319 | 0.997 | 0.060 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c000000000000000ff | 17.948 | 17.041 | 0.074 | 0.819 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 17.933 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c000000000000000d9 | 15.078 | 11.496 | 3.568 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 15.064 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c00000000000000130 | 11.322 | 11.195 | 0.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 11.308 | 0.999 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c000000000000000b8 | 9.540 | 6.691 | 2.827 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 9.518 | 0.998 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c0000000000000010a | 9.199 | 8.936 | 0.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 9.185 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c00000000000000097 | 9.053 | 8.295 | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 9.027 | 0.997 | 0.025 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c00000000000000108 | 8.972 | 8.836 | 0.106 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 8.942 | 0.997 | 0.030 | node-14/thread-2/replica.pull-at | none observed |
| eb902191bc0966c000000000000000aa | 8.629 | 0.365 | 8.251 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 8.616 | 0.999 | 0.013 | node-14/thread-0/rpc.replica.observe | driver.worker-message 0.774ms |
| eb902191bc0966c00000000000000114 | 8.299 | 0.403 | 7.883 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 8.286 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| eb902191bc0966c000000000000000cb | 7.825 | 0.706 | 7.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 7.810 | 0.998 | 0.016 | node-14/thread-0/rpc.replica.observe | none observed |
| eb902191bc0966c000000000000000f4 | 7.701 | 7.567 | 0.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.675 | 0.997 | 0.026 | node-14/thread-2/replica.pull-at | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 50.861 | 0.547 | 0.000 | 0.444 | 4.424 | 0.357 | 0.000 | 0.115 | 2.925 | 12.479 | 0.079 | 0.000 | 0.342 | 20.479 | 9.596 | n/a | 0.065 | 4.896 | 0.096 | 0.065 |
| p99 | 169.146 | 1.210 | 0.014 | 1.528 | 17.522 | 0.396 | 0.340 | 0.225 | 4.985 | 43.164 | 0.318 | 0.000 | 3.396 | 60.158 | 38.465 | n/a | 0.178 | 18.483 | 0.109 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000d2 | 169.146 | 17.522 | 0.396 | 0.340 | 0.225 | 4.985 | 43.164 | 0.318 | 0.000 | 3.396 | 60.158 | 38.465 | n/a | 0.178 | 18.483 | 0.109 | 0.178 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000d5 | 50.861 | 4.424 | 0.357 | 0.000 | 0.115 | 2.925 | 12.479 | 0.079 | 0.000 | 0.342 | 20.479 | 9.596 | n/a | 0.065 | 4.896 | 0.096 | 0.065 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.674 | 0.775 | 0.000 | 1.036 | 4.321 | 0.009 | 0.000 | 0.073 | 1.880 | 5.314 | 0.114 | 0.000 | 0.318 | 16.953 | 9.523 | n/a | 0.046 | 5.160 | 0.134 | 0.046 |
| p99 | 115.519 | 0.903 | 0.000 | 1.943 | 18.713 | 3.049 | 0.252 | 0.834 | 2.576 | 19.955 | 0.139 | 0.000 | 0.418 | 34.541 | 38.704 | n/a | 0.058 | 19.345 | 0.167 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000d7 | 115.519 | 18.713 | 0.308 | 0.252 | 0.073 | 2.486 | 19.955 | 0.114 | 0.000 | 0.318 | 34.541 | 38.704 | n/a | 0.058 | 19.345 | 0.167 | 0.058 | tx/thread-89/transactor.triplex-function | none observed |
| eb902191bc0966c000000000000000de | 51.173 | 5.151 | 3.049 | 0.212 | 0.061 | 2.576 | 17.386 | 0.139 | 0.000 | 0.364 | 12.654 | 9.523 | n/a | 0.058 | 8.473 | 0.166 | 0.058 | gw-w/thread-52/gateway.admitted-work | none observed |
| eb902191bc0966c000000000000000d8 | 38.674 | 3.762 | 0.009 | 0.000 | 0.195 | 1.880 | 2.209 | 0.114 | 0.000 | 0.418 | 24.889 | 5.154 | n/a | 0.046 | 3.966 | 0.103 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000da | 38.465 | 4.321 | 0.005 | 0.000 | 0.834 | 0.869 | 5.314 | 0.050 | 0.000 | 0.292 | 16.953 | 9.783 | n/a | 0.045 | 5.160 | 0.134 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.465 | 0.838 | 0.000 | 1.943 | 4.321 | 0.005 | 0.000 | 0.834 | 0.869 | 5.314 | 0.050 | 0.000 | 0.292 | 16.953 | 9.783 | n/a | 0.045 | 5.160 | 0.134 | 0.045 |
| p99 | 38.465 | 0.838 | 0.000 | 1.943 | 4.321 | 0.005 | 0.000 | 0.834 | 0.869 | 5.314 | 0.050 | 0.000 | 0.292 | 16.953 | 9.783 | n/a | 0.045 | 5.160 | 0.134 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000da | 38.465 | 4.321 | 0.005 | 0.000 | 0.834 | 0.869 | 5.314 | 0.050 | 0.000 | 0.292 | 16.953 | 9.783 | n/a | 0.045 | 5.160 | 0.134 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.710 | 0.000 | 0.000 | 0.308 | 4.492 | 0.267 | 0.227 | 0.108 | 3.016 | 10.171 | 0.120 | 0.000 | 1.208 | 11.211 | 5.523 | n/a | 0.056 | 5.217 | 0.174 | 0.056 |
| p99 | 40.171 | 1.099 | 0.000 | 0.346 | 5.763 | 0.268 | 0.373 | 0.110 | 3.453 | 15.929 | 0.168 | 0.000 | 1.678 | 12.662 | 6.018 | n/a | 0.063 | 5.837 | 0.178 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000e1 | 40.171 | 4.468 | 0.268 | 0.373 | 0.108 | 2.712 | 15.929 | 0.168 | 0.000 | 1.208 | 8.856 | 6.018 | n/a | 0.063 | 5.217 | 0.130 | 0.063 | gw-w/thread-53/gateway.admitted-work | none observed |
| eb902191bc0966c000000000000000df | 32.710 | 5.763 | 0.004 | 0.000 | 0.069 | 3.016 | 10.171 | 0.090 | 0.000 | 1.678 | 11.211 | 0.658 | n/a | 0.049 | 5.837 | 0.178 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000e3 | 29.292 | 4.492 | 0.267 | 0.227 | 0.110 | 3.453 | 1.959 | 0.120 | 0.000 | 0.423 | 12.662 | 5.523 | n/a | 0.056 | 5.096 | 0.174 | 0.056 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.710 | 1.099 | 0.000 | 0.220 | 5.763 | 0.004 | 0.000 | 0.069 | 3.016 | 10.171 | 0.090 | 0.000 | 1.678 | 11.211 | 0.658 | n/a | 0.049 | 5.837 | 0.178 | 0.049 |
| p99 | 32.710 | 1.099 | 0.000 | 0.220 | 5.763 | 0.004 | 0.000 | 0.069 | 3.016 | 10.171 | 0.090 | 0.000 | 1.678 | 11.211 | 0.658 | n/a | 0.049 | 5.837 | 0.178 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000df | 32.710 | 5.763 | 0.004 | 0.000 | 0.069 | 3.016 | 10.171 | 0.090 | 0.000 | 1.678 | 11.211 | 0.658 | n/a | 0.049 | 5.837 | 0.178 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.777 | 0.817 | 0.000 | 0.743 | 6.326 | 0.008 | 0.000 | 0.147 | 1.312 | 4.866 | 0.072 | 0.000 | 0.885 | 15.741 | 3.532 | n/a | 0.061 | 7.123 | 0.195 | 0.061 |
| p99 | 60.969 | 2.373 | 0.009 | 9.109 | 11.423 | 0.373 | 0.606 | 1.032 | 3.289 | 15.516 | 0.186 | 0.000 | 2.758 | 37.883 | 9.967 | n/a | 0.130 | 11.866 | 0.300 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000103 | 60.969 | 11.423 | 0.005 | 0.000 | 0.438 | 1.178 | 2.168 | 0.066 | 0.000 | 2.758 | 37.883 | 4.919 | n/a | 0.130 | 11.866 | 0.195 | 0.130 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000fe | 50.340 | 6.326 | 0.006 | 0.000 | 0.599 | 1.040 | 4.866 | 0.047 | 0.000 | 0.263 | 27.163 | 9.967 | n/a | 0.063 | 6.931 | 0.138 | 0.063 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000106 | 44.535 | 6.911 | 0.318 | 0.606 | 0.147 | 3.289 | 6.653 | 0.165 | 0.000 | 1.872 | 23.419 | 1.027 | n/a | 0.128 | 7.982 | 0.179 | 0.128 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000e9 | 40.229 | 4.550 | 0.326 | 0.264 | 0.140 | 2.086 | 15.516 | 0.132 | 0.000 | 1.404 | 11.143 | 4.606 | n/a | 0.061 | 5.281 | 0.131 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000101 | 38.832 | 8.605 | 0.005 | 0.000 | 0.875 | 1.288 | 1.582 | 0.186 | 0.000 | 0.468 | 22.245 | 3.532 | n/a | 0.045 | 9.485 | 0.244 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000e5 | 36.777 | 6.086 | 0.005 | 0.000 | 1.032 | 1.766 | 4.909 | 0.129 | 0.000 | 1.270 | 16.464 | 5.056 | n/a | 0.059 | 7.123 | 0.194 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000100 | 34.045 | 7.351 | 0.373 | 0.000 | 0.122 | 2.676 | 5.649 | 0.102 | 0.000 | 0.885 | 15.741 | 1.078 | n/a | 0.068 | 7.846 | 0.230 | 0.068 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000012c | 28.911 | 8.043 | 0.297 | 0.281 | 0.058 | 1.963 | 8.210 | 0.072 | 0.000 | 0.257 | 6.586 | 3.093 | n/a | 0.052 | 8.679 | 0.300 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000012e | 22.159 | 5.508 | 0.255 | 0.000 | 0.076 | 1.312 | 3.334 | 0.041 | 0.000 | 2.411 | 4.448 | 4.716 | n/a | 0.058 | 5.839 | 0.264 | 0.058 | tx/thread-89/transactor.triplex-function | none observed |
| eb902191bc0966c000000000000000fa | 16.924 | 4.270 | 0.008 | 0.000 | 0.281 | 1.221 | 1.645 | 0.041 | 0.000 | 0.614 | 7.961 | 0.821 | n/a | 0.063 | 4.559 | 0.269 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.649 | 0.489 | 0.000 | 0.556 | 6.095 | 0.232 | 0.337 | 0.073 | 1.420 | 2.979 | 0.112 | 0.000 | 0.878 | 26.686 | 8.879 | n/a | 0.054 | 6.825 | 0.102 | 0.054 |
| p99 | 82.245 | 1.967 | 0.000 | 2.857 | 8.201 | 0.798 | 0.429 | 1.029 | 2.137 | 12.753 | 0.217 | 0.000 | 4.661 | 43.833 | 16.147 | n/a | 0.066 | 9.238 | 0.244 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000eb | 82.245 | 6.095 | 0.232 | 0.429 | 0.070 | 2.137 | 12.753 | 0.217 | 0.000 | 0.277 | 43.833 | 16.147 | n/a | 0.054 | 6.825 | 0.083 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000ed | 49.649 | 3.850 | 0.798 | 0.337 | 0.073 | 1.232 | 2.979 | 0.112 | 0.000 | 4.661 | 26.686 | 8.879 | n/a | 0.042 | 5.058 | 0.102 | 0.042 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000ee | 37.819 | 8.201 | 0.008 | 0.000 | 1.029 | 1.420 | 2.281 | 0.054 | 0.000 | 0.878 | 16.791 | 7.092 | n/a | 0.066 | 9.238 | 0.244 | 0.066 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 63.840 | 0.000 | 0.000 | 0.357 | 6.026 | 0.266 | 0.000 | 0.213 | 28.104 | 3.785 | 0.167 | 0.000 | 1.196 | 14.433 | 3.853 | n/a | 0.070 | 6.327 | 0.128 | 0.070 |
| p99 | 90.612 | 2.148 | 0.000 | 2.462 | 7.515 | 0.460 | 0.516 | 0.291 | 52.417 | 7.378 | 6.936 | 0.000 | 8.289 | 33.760 | 4.460 | n/a | 0.083 | 8.572 | 0.134 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000f2 | 90.612 | 4.240 | 0.266 | 0.000 | 0.213 | 52.417 | 7.378 | 6.936 | 0.000 | 0.807 | 14.433 | 3.853 | n/a | 0.070 | 4.719 | 0.052 | 0.070 | node-14/thread-8/socket.wait-first-byte | none observed |
| eb902191bc0966c000000000000000f7 | 63.840 | 7.515 | 0.460 | 0.516 | 0.081 | 4.763 | 3.785 | 0.167 | 0.000 | 8.289 | 33.760 | 4.460 | n/a | 0.043 | 8.572 | 0.134 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c000000000000000f3 | 49.542 | 6.026 | 0.010 | 0.000 | 0.291 | 28.104 | 1.229 | 0.050 | 0.000 | 1.196 | 9.965 | 2.588 | n/a | 0.083 | 6.327 | 0.128 | 0.083 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.542 | 2.148 | 0.000 | 2.462 | 6.026 | 0.010 | 0.000 | 0.291 | 28.104 | 1.229 | 0.050 | 0.000 | 1.196 | 9.965 | 2.588 | n/a | 0.083 | 6.327 | 0.128 | 0.083 |
| p99 | 49.542 | 2.148 | 0.000 | 2.462 | 6.026 | 0.010 | 0.000 | 0.291 | 28.104 | 1.229 | 0.050 | 0.000 | 1.196 | 9.965 | 2.588 | n/a | 0.083 | 6.327 | 0.128 | 0.083 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c000000000000000f3 | 49.542 | 6.026 | 0.010 | 0.000 | 0.291 | 28.104 | 1.229 | 0.050 | 0.000 | 1.196 | 9.965 | 2.588 | n/a | 0.083 | 6.327 | 0.128 | 0.083 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.832 | 1.072 | 0.000 | 6.792 | 8.605 | 0.005 | 0.000 | 0.875 | 1.288 | 1.582 | 0.186 | 0.000 | 0.468 | 22.245 | 3.532 | n/a | 0.045 | 9.485 | 0.244 | 0.045 |
| p99 | 38.832 | 1.072 | 0.000 | 6.792 | 8.605 | 0.005 | 0.000 | 0.875 | 1.288 | 1.582 | 0.186 | 0.000 | 0.468 | 22.245 | 3.532 | n/a | 0.045 | 9.485 | 0.244 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000101 | 38.832 | 8.605 | 0.005 | 0.000 | 0.875 | 1.288 | 1.582 | 0.186 | 0.000 | 0.468 | 22.245 | 3.532 | n/a | 0.045 | 9.485 | 0.244 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.997 | 0.426 | 0.000 | 1.664 | 4.475 | 0.006 | 0.000 | 0.596 | 1.364 | 1.457 | 0.044 | 0.000 | 0.256 | 11.098 | 4.436 | n/a | 0.056 | 5.809 | 0.194 | 0.056 |
| p99 | 74.734 | 1.073 | 1.908 | 5.246 | 7.894 | 0.367 | 0.527 | 3.469 | 4.718 | 9.840 | 0.135 | 0.000 | 3.510 | 43.011 | 13.384 | n/a | 0.066 | 8.500 | 0.409 | 0.066 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000107 | 74.734 | 4.853 | 0.006 | 0.000 | 0.974 | 0.914 | 7.889 | 0.135 | 0.000 | 3.510 | 43.011 | 13.384 | n/a | 0.056 | 5.833 | 0.078 | 0.056 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000116 | 33.482 | 6.419 | 0.367 | 0.527 | 0.116 | 2.180 | 5.990 | 0.047 | 0.000 | 0.248 | 11.238 | 6.284 | n/a | 0.066 | 7.428 | 0.222 | 0.066 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000112 | 33.416 | 5.394 | 0.285 | 0.000 | 0.131 | 1.864 | 9.840 | 0.057 | 0.000 | 0.256 | 11.098 | 4.436 | n/a | 0.056 | 5.809 | 0.174 | 0.056 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000109 | 27.922 | 3.348 | 0.005 | 0.000 | 0.793 | 4.718 | 1.303 | 0.038 | 0.000 | 0.250 | 11.438 | 5.981 | n/a | 0.047 | 4.146 | 0.148 | 0.047 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000010d | 24.997 | 2.558 | 0.004 | 0.000 | 3.469 | 1.010 | 2.353 | 0.094 | 0.000 | 0.348 | 11.440 | 3.696 | n/a | 0.024 | 6.031 | 0.241 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.825ms |
| eb902191bc0966c00000000000000113 | 24.710 | 4.475 | 0.006 | 0.000 | 0.303 | 1.694 | 1.457 | 0.041 | 0.000 | 0.276 | 10.718 | 5.694 | n/a | 0.046 | 4.784 | 0.194 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000010b | 20.795 | 7.894 | 0.010 | 0.000 | 0.596 | 0.961 | 1.337 | 0.044 | 0.000 | 2.949 | 6.577 | 0.368 | n/a | 0.058 | 8.500 | 0.409 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000010f | 13.055 | 4.423 | 0.011 | 0.000 | 0.647 | 1.364 | 0.982 | 0.037 | 0.000 | 0.206 | 5.026 | 0.300 | n/a | 0.059 | 5.082 | 0.389 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.055 | 0.426 | 0.347 | 1.964 | 4.423 | 0.010 | 0.000 | 0.596 | 0.961 | 0.982 | 0.037 | 0.000 | 0.206 | 5.026 | 0.300 | n/a | 0.058 | 5.082 | 0.389 | 0.058 |
| p99 | 20.795 | 0.499 | 1.908 | 5.246 | 7.894 | 0.011 | 0.000 | 0.647 | 1.364 | 1.337 | 0.044 | 0.000 | 2.949 | 6.577 | 0.368 | n/a | 0.059 | 8.500 | 0.409 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000010b | 20.795 | 7.894 | 0.010 | 0.000 | 0.596 | 0.961 | 1.337 | 0.044 | 0.000 | 2.949 | 6.577 | 0.368 | n/a | 0.058 | 8.500 | 0.409 | 0.058 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000010f | 13.055 | 4.423 | 0.011 | 0.000 | 0.647 | 1.364 | 0.982 | 0.037 | 0.000 | 0.206 | 5.026 | 0.300 | n/a | 0.059 | 5.082 | 0.389 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.851 | 0.000 | 0.000 | 0.346 | 5.188 | 0.009 | 0.000 | 0.138 | 1.028 | 2.662 | 0.073 | 0.000 | 0.456 | 19.025 | 0.934 | n/a | 0.041 | 10.791 | 0.237 | 0.041 |
| p99 | 93.330 | 1.704 | 0.000 | 2.180 | 5.293 | 9.302 | 0.000 | 6.782 | 1.961 | 10.493 | 0.194 | 0.000 | 6.077 | 74.140 | 2.277 | n/a | 0.079 | 13.399 | 0.328 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000011b | 93.330 | 5.188 | 0.293 | 0.000 | 0.138 | 1.961 | 9.119 | 0.072 | 0.000 | 0.235 | 74.140 | 2.127 | n/a | 0.059 | 5.618 | 0.060 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000122 | 56.557 | 4.020 | 9.302 | 0.000 | 0.078 | 1.560 | 10.493 | 0.073 | 0.000 | 0.546 | 29.511 | 0.934 | n/a | 0.041 | 13.399 | 0.237 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000128 | 36.851 | 5.293 | 0.009 | 0.000 | 6.782 | 1.028 | 1.845 | 0.097 | 0.000 | 0.456 | 19.025 | 2.277 | n/a | 0.038 | 12.084 | 0.328 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000119 | 34.094 | 5.247 | 0.008 | 0.000 | 5.536 | 0.887 | 2.662 | 0.194 | 0.000 | 6.077 | 12.787 | 0.616 | n/a | 0.079 | 10.791 | 0.316 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | client.encode 3.310ms |

## P2 / grow10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.851 | 1.704 | 0.000 | 2.037 | 5.293 | 0.009 | 0.000 | 6.782 | 1.028 | 1.845 | 0.097 | 0.000 | 0.456 | 19.025 | 2.277 | n/a | 0.038 | 12.084 | 0.328 | 0.038 |
| p99 | 36.851 | 1.704 | 0.000 | 2.037 | 5.293 | 0.009 | 0.000 | 6.782 | 1.028 | 1.845 | 0.097 | 0.000 | 0.456 | 19.025 | 2.277 | n/a | 0.038 | 12.084 | 0.328 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000128 | 36.851 | 5.293 | 0.009 | 0.000 | 6.782 | 1.028 | 1.845 | 0.097 | 0.000 | 0.456 | 19.025 | 2.277 | n/a | 0.038 | 12.084 | 0.328 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.655 | 0.251 | 0.000 | 1.955 | 3.998 | 0.005 | 0.000 | 0.514 | 0.835 | 2.398 | 0.061 | 0.000 | 0.528 | 10.319 | 5.148 | n/a | 0.045 | 4.564 | 0.169 | 0.045 |
| p99 | 64.572 | 1.419 | 0.686 | 2.458 | 5.942 | 0.271 | 0.000 | 4.676 | 1.618 | 6.131 | 0.561 | 0.000 | 2.316 | 44.278 | 10.382 | n/a | 0.093 | 10.622 | 0.608 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000012f | 64.572 | 3.998 | 0.005 | 0.000 | 0.561 | 0.835 | 3.379 | 0.561 | 0.000 | 0.528 | 44.278 | 10.382 | n/a | 0.045 | 4.564 | 0.071 | 0.045 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000136 | 29.369 | 5.144 | 0.271 | 0.000 | 0.067 | 1.618 | 5.290 | 0.061 | 0.000 | 0.564 | 11.155 | 5.148 | n/a | 0.052 | 5.482 | 0.187 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000138 | 29.200 | 3.881 | 0.175 | 0.000 | 0.066 | 1.541 | 6.131 | 0.082 | 0.000 | 0.634 | 9.317 | 7.334 | n/a | 0.039 | 4.122 | 0.141 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000139 | 26.655 | 3.985 | 0.005 | 0.000 | 0.514 | 1.270 | 1.818 | 0.116 | 0.000 | 2.316 | 10.319 | 6.219 | n/a | 0.093 | 4.504 | 0.169 | 0.093 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000131 | 23.780 | 5.829 | 0.005 | 0.000 | 1.124 | 0.724 | 2.398 | 0.038 | 0.000 | 0.527 | 10.646 | 2.443 | n/a | 0.046 | 6.958 | 0.293 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000132 | 17.478 | 5.942 | 0.004 | 0.000 | 4.676 | 0.643 | 1.230 | 0.039 | 0.000 | 0.298 | 4.292 | 0.316 | n/a | 0.038 | 10.622 | 0.608 | 0.038 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.093ms |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.478 | 0.192 | 0.000 | 2.028 | 3.985 | 0.004 | 0.000 | 0.514 | 0.643 | 1.230 | 0.039 | 0.000 | 0.298 | 4.292 | 0.316 | n/a | 0.038 | 4.504 | 0.169 | 0.038 |
| p99 | 26.655 | 1.209 | 0.686 | 2.285 | 5.942 | 0.005 | 0.000 | 4.676 | 1.270 | 1.818 | 0.116 | 0.000 | 2.316 | 10.319 | 6.219 | n/a | 0.093 | 10.622 | 0.608 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c00000000000000139 | 26.655 | 3.985 | 0.005 | 0.000 | 0.514 | 1.270 | 1.818 | 0.116 | 0.000 | 2.316 | 10.319 | 6.219 | n/a | 0.093 | 4.504 | 0.169 | 0.093 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000132 | 17.478 | 5.942 | 0.004 | 0.000 | 4.676 | 0.643 | 1.230 | 0.039 | 0.000 | 0.298 | 4.292 | 0.316 | n/a | 0.038 | 10.622 | 0.608 | 0.038 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 1.093ms |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.330 | 0.527 | 0.000 | 0.714 | 4.048 | 0.203 | 0.000 | 0.077 | 0.832 | 1.138 | 0.048 | 0.000 | 0.265 | 14.260 | 2.294 | n/a | 0.056 | 5.263 | 0.303 | 0.056 |
| p99 | 39.458 | 0.771 | 0.000 | 2.205 | 11.584 | 0.647 | 0.000 | 1.209 | 4.704 | 4.758 | 0.053 | 0.000 | 0.363 | 17.634 | 2.956 | n/a | 0.064 | 12.308 | 0.312 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000013c | 39.458 | 11.584 | 0.647 | 0.000 | 0.077 | 4.704 | 4.758 | 0.053 | 0.000 | 0.363 | 14.260 | 2.956 | n/a | 0.056 | 12.308 | 0.312 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c00000000000000140 | 26.330 | 3.815 | 0.203 | 0.000 | 0.057 | 0.832 | 1.138 | 0.048 | 0.000 | 0.265 | 17.634 | 2.294 | n/a | 0.043 | 4.076 | 0.155 | 0.043 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | none observed |
| eb902191bc0966c0000000000000013d | 17.354 | 4.048 | 0.006 | 0.000 | 1.209 | 0.779 | 1.105 | 0.041 | 0.000 | 0.264 | 8.969 | 0.868 | n/a | 0.064 | 5.263 | 0.303 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.354 | 0.527 | 0.000 | 2.205 | 4.048 | 0.006 | 0.000 | 1.209 | 0.779 | 1.105 | 0.041 | 0.000 | 0.264 | 8.969 | 0.868 | n/a | 0.064 | 5.263 | 0.303 | 0.064 |
| p99 | 17.354 | 0.527 | 0.000 | 2.205 | 4.048 | 0.006 | 0.000 | 1.209 | 0.779 | 1.105 | 0.041 | 0.000 | 0.264 | 8.969 | 0.868 | n/a | 0.064 | 5.263 | 0.303 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000013d | 17.354 | 4.048 | 0.006 | 0.000 | 1.209 | 0.779 | 1.105 | 0.041 | 0.000 | 0.264 | 8.969 | 0.868 | n/a | 0.064 | 5.263 | 0.303 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.841 | 0.934 | 0.491 | 2.865 | 6.830 | 22.467 | 0.000 | 0.026 | 3.498 | 1.194 | 0.071 | 0.000 | 0.248 | 45.087 | 6.571 | n/a | 0.038 | 28.635 | 0.261 | 0.038 |
| p99 | 146.718 | 1.832 | 2.903 | 5.788 | 11.048 | 43.068 | 0.000 | 0.086 | 12.264 | 4.739 | 3.167 | 0.000 | 0.827 | 83.495 | 13.756 | n/a | 0.099 | 50.510 | 0.354 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eb902191bc0966c0000000000000014a | 146.718 | 7.414 | 43.068 | 0.000 | 0.029 | 2.016 | 0.782 | 3.167 | 0.000 | 0.102 | 83.495 | 6.571 | n/a | 0.075 | 50.510 | 0.344 | 0.075 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 5.340ms; driver.publication 5.283ms; driver.publication 3.255ms; driver.publication 2.781ms; driver.publication 2.556ms |
| eb902191bc0966c00000000000000149 | 137.736 | 8.511 | 31.718 | 0.000 | 0.010 | 11.763 | 4.739 | 0.118 | 0.000 | 0.341 | 71.925 | 8.512 | n/a | 0.099 | 40.239 | 0.292 | 0.099 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 5.340ms; driver.publication 5.283ms; driver.publication 3.255ms; driver.publication 2.556ms; driver.publication 2.099ms |
| eb902191bc0966c00000000000000148 | 127.940 | 11.048 | 30.477 | 0.000 | 0.021 | 4.178 | 1.057 | 0.047 | 0.000 | 0.218 | 77.112 | 3.752 | n/a | 0.029 | 41.547 | 0.325 | 0.029 | gw-w/thread-54/peer.transact-await (includes order/network/storage) | driver.publication 5.283ms; driver.publication 3.255ms; driver.publication 2.556ms; driver.publication 2.099ms; driver.publication 1.332ms |
| eb902191bc0966c00000000000000147 | 114.768 | 6.012 | 23.884 | 0.000 | 0.026 | 7.611 | 1.194 | 0.055 | 0.000 | 0.223 | 66.016 | 9.658 | n/a | 0.089 | 29.922 | 0.261 | 0.089 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 5.283ms; driver.publication 3.255ms; driver.publication 2.556ms; driver.publication 2.099ms; driver.publication 1.153ms |
| eb902191bc0966c00000000000000146 | 105.693 | 9.915 | 22.951 | 0.000 | 0.026 | 2.357 | 1.512 | 0.071 | 0.000 | 0.248 | 57.390 | 11.195 | n/a | 0.028 | 32.891 | 0.311 | 0.028 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 3.255ms; driver.publication 2.556ms; driver.publication 2.099ms; driver.publication 1.153ms; driver.publication 1.123ms |
| eb902191bc0966c00000000000000145 | 80.841 | 6.144 | 22.467 | 0.000 | 0.025 | 1.303 | 0.974 | 0.025 | 0.000 | 0.105 | 45.087 | 4.682 | n/a | 0.031 | 28.635 | 0.354 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 3.255ms; driver.publication 2.556ms; driver.publication 2.099ms; driver.publication 1.123ms |
| eb902191bc0966c00000000000000144 | 74.411 | 6.830 | 10.245 | 0.000 | 0.044 | 12.264 | 1.604 | 0.048 | 0.000 | 0.248 | 35.304 | 7.766 | n/a | 0.058 | 17.119 | 0.230 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 3.255ms; driver.publication 2.556ms; driver.publication 2.099ms |
| eb902191bc0966c00000000000000143 | 59.317 | 6.819 | 2.323 | 0.000 | 0.028 | 8.603 | 1.808 | 0.099 | 0.000 | 0.827 | 25.016 | 13.756 | n/a | 0.038 | 9.170 | 0.155 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.255ms; driver.publication 2.556ms |
| eb902191bc0966c00000000000000142 | 48.441 | 7.902 | 2.107 | 0.000 | 0.024 | 3.498 | 0.998 | 2.590 | 0.000 | 0.376 | 25.432 | 5.479 | n/a | 0.036 | 10.032 | 0.207 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.556ms |
| eb902191bc0966c00000000000000141 | 27.324 | 6.776 | 0.019 | 0.000 | 0.086 | 3.245 | 2.986 | 0.136 | 0.000 | 0.734 | 10.709 | 2.572 | n/a | 0.061 | 6.880 | 0.252 | 0.061 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (192 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.031 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.030 | 0.931 | 0.001 |
| p99 | 276.404 | n/a | n/a | n/a | 48.118 | n/a | 6.403 | 276.385 | 8.922 | 3.782 | 0.013 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.230 | 276.403 | 1.000 | 0.230 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d77d1d4ca34d9d070000000000009a50 | 276.636 | 0.459 | n/a | 0.000 | 276.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.633 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000009b9b | 276.404 | 0.014 | n/a | 0.000 | 276.389 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.403 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000009b99 | 276.401 | 0.017 | n/a | 0.000 | 276.383 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.400 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000009b9a | 276.400 | 0.015 | n/a | 0.000 | 276.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.399 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000009b98 | 276.400 | 0.020 | n/a | 0.000 | 276.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.399 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000009b97 | 276.398 | 0.041 | n/a | 0.000 | 276.356 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.397 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000009a60 | 276.397 | 0.026 | n/a | 0.000 | 276.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.396 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000009a61 | 276.396 | 0.022 | n/a | 0.000 | 276.373 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.395 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000009a5f | 276.393 | 0.064 | n/a | 0.000 | 276.327 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.391 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000009b96 | 276.379 | 0.275 | n/a | 0.000 | 276.102 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.376 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000009a4f | 276.310 | 0.322 | n/a | 0.000 | 275.985 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.307 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000008d45 | 275.894 | 0.040 | n/a | 0.000 | 275.853 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.893 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000008d44 | 275.880 | 0.017 | n/a | 0.000 | 275.862 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.879 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000008d43 | 275.870 | 0.025 | n/a | 0.000 | 275.844 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.869 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000008d42 | 275.856 | 0.161 | n/a | 0.000 | 275.694 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.854 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000008d41 | 275.745 | 0.189 | n/a | 0.000 | 275.553 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.743 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000000899 | 273.411 | 1.090 | n/a | 0.000 | 272.311 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 273.400 | 1.000 | 0.011 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000000089e | 272.814 | 0.067 | n/a | 0.000 | 272.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.812 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000000089d | 272.750 | 0.031 | n/a | 0.000 | 272.717 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.748 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000000089c | 272.713 | 0.031 | n/a | 0.000 | 272.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.711 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (85 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.947 | 0.001 |
| p99 | 289.602 | n/a | n/a | n/a | 5.035 | n/a | 0.000 | 289.417 | 1.448 | 2.041 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 1.186 | 289.597 | 1.000 | 1.186 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88265751aa6816b2000000000001e046 | 289.602 | 0.181 | n/a | 0.000 | 289.417 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 289.597 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 88265751aa6816b2000000000000c2fc | 259.902 | 0.173 | n/a | 0.000 | 259.723 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 259.896 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 88265751aa6816b2000000000000c32a | 5.635 | 2.113 | n/a | 0.000 | 0.000 | 1.448 | 2.041 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.003 | 2.113 | 0.375 | 0.003 | gw-r/thread-55/gateway.admitted-work | none observed |
| 88265751aa6816b2000000000000c303 | 5.038 | 5.035 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.035 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.191ms |
| 88265751aa6816b200000000000119df | 2.050 | 0.864 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.186 | 0.864 | 0.421 | 1.186 | uncovered | none observed |
| 88265751aa6816b20000000000011a0a | 1.370 | 0.741 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.630 | 0.741 | 0.541 | 0.630 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000153e7 | 0.640 | 0.634 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.634 | 0.990 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000011a08 | 0.584 | 0.582 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.582 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000174f5 | 0.581 | 0.580 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.580 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000001cce4 | 0.578 | 0.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.577 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000015236 | 0.524 | 0.522 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.522 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000018f2b | 0.492 | 0.489 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.489 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000148e6 | 0.452 | 0.450 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.450 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000018f5e | 0.418 | 0.416 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.416 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000019885 | 0.410 | 0.408 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.408 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000000c30d | 0.402 | 0.400 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.400 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000014889 | 0.399 | 0.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.397 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000194c6 | 0.392 | 0.385 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.385 | 0.981 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000142a6 | 0.391 | 0.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.389 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000140df | 0.386 | 0.384 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.384 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (239 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.941 | 0.001 |
| p99 | 274.104 | n/a | n/a | n/a | 3.113 | n/a | 0.000 | 274.082 | 1.017 | 1.691 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.239 | 274.103 | 1.000 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f978a50477bb65eb000000000000c0d3 | 275.497 | 0.189 | n/a | 0.000 | 275.305 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.494 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d07000000000000cd1f | 275.329 | 0.104 | n/a | 0.000 | 275.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.327 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000001f592 | 274.104 | 0.021 | n/a | 0.000 | 274.082 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.103 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000001f591 | 274.101 | 0.116 | n/a | 0.000 | 273.982 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.098 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000001e049 | 170.540 | 0.065 | n/a | 0.000 | 170.473 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 170.539 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| d77d1d4ca34d9d07000000000000c009 | 168.851 | 0.537 | n/a | 0.000 | 168.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 168.839 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| f978a50477bb65eb000000000000b291 | 166.735 | 0.195 | n/a | 0.000 | 166.538 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 166.732 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| d77d1d4ca34d9d07000000000000c012 | 27.644 | 23.779 | n/a | 1.116 | 0.000 | 1.017 | 1.691 | 0.008 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.003 | 24.895 | 0.901 | 0.003 | node-14/thread-5/reader.execute | none observed |
| 88265751aa6816b2000000000001e114 | 11.882 | 1.469 | n/a | 0.000 | 0.000 | 3.523 | 6.812 | 0.021 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.002 | 1.469 | 0.124 | 0.002 | gw-r/thread-51/gateway.admitted-work | none observed |
| f978a50477bb65eb000000000000b2cb | 9.892 | 2.218 | n/a | 0.000 | 0.000 | 1.236 | 6.410 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.003 | 2.218 | 0.224 | 0.003 | gw-r/thread-52/gateway.admitted-work | replica.apply-delta 0.027ms |
| f978a50477bb65eb000000000000fbf2 | 3.289 | 3.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.288 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 88265751aa6816b20000000000026150 | 3.115 | 3.113 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.113 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000026151 | 3.113 | 3.095 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.095 | 0.994 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000000c06a | 2.882 | 2.878 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.878 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| f978a50477bb65eb00000000000156f1 | 2.180 | 2.178 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.178 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| d77d1d4ca34d9d070000000000016b9b | 1.843 | 1.841 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.841 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000000d8e3 | 1.417 | 1.416 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.416 | 0.999 | 0.001 | node-14/thread-5/reader.execute | none observed |
| f978a50477bb65eb000000000000c3f2 | 1.220 | 1.219 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.219 | 0.998 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 88265751aa6816b20000000000023ffd | 0.965 | 0.963 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.963 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| d77d1d4ca34d9d070000000000012905 | 0.872 | 0.868 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.868 | 0.996 | 0.003 | node-14/thread-5/replica.pull-at | none observed |

## P1 / L16 / read (235 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.027 | 0.953 | 0.001 |
| p99 | 535.917 | n/a | n/a | n/a | 6.119 | n/a | 0.000 | 535.904 | 1.606 | 2.421 | 0.008 | 0.000 | 0.030 | 0.000 | n/a | n/a | 2.789 | 535.917 | 1.000 | 2.789 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f978a50477bb65eb000000000002067a | 536.540 | 0.218 | n/a | 0.000 | 536.319 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 536.537 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| f978a50477bb65eb000000000002067b | 536.486 | 0.033 | n/a | 0.000 | 536.452 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 536.485 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| f978a50477bb65eb00000000000206ab | 535.917 | 0.012 | n/a | 0.000 | 535.904 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 535.917 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| f978a50477bb65eb00000000000206a9 | 535.916 | 0.026 | n/a | 0.000 | 535.889 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 535.915 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| f978a50477bb65eb00000000000206aa | 535.909 | 0.014 | n/a | 0.000 | 535.895 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 535.908 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.029ms |
| 88265751aa6816b2000000000003641c | 534.507 | 0.180 | n/a | 0.000 | 534.210 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.117 | 534.390 | 1.000 | 0.117 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.031ms |
| d77d1d4ca34d9d070000000000021a93 | 534.023 | 0.265 | n/a | 0.000 | 533.750 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 534.015 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms; replica.apply-delta 0.028ms |
| d77d1d4ca34d9d070000000000021a94 | 533.929 | 0.037 | n/a | 0.000 | 533.889 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 533.927 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms; replica.apply-delta 0.028ms |
| 88265751aa6816b2000000000003642c | 533.923 | 0.066 | n/a | 0.000 | 533.855 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 533.921 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.031ms |
| 88265751aa6816b2000000000003642d | 533.882 | 0.022 | n/a | 0.000 | 533.858 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 533.880 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.031ms |
| 88265751aa6816b2000000000003642e | 533.876 | 0.018 | n/a | 0.000 | 533.856 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 533.874 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.031ms |
| 88265751aa6816b2000000000003642f | 533.869 | 0.017 | n/a | 0.000 | 533.850 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 533.867 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.031ms |
| 88265751aa6816b20000000000036430 | 533.858 | 0.017 | n/a | 0.000 | 533.839 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 533.857 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.031ms |
| d77d1d4ca34d9d070000000000021aa6 | 533.761 | 0.014 | n/a | 0.000 | 533.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 533.760 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms; replica.apply-delta 0.028ms |
| d77d1d4ca34d9d070000000000021aa4 | 533.752 | 0.027 | n/a | 0.000 | 533.725 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 533.751 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms; replica.apply-delta 0.028ms |
| d77d1d4ca34d9d070000000000021aa5 | 533.751 | 0.014 | n/a | 0.000 | 533.736 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 533.750 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms; replica.apply-delta 0.028ms |
| f978a50477bb65eb00000000000206f3 | 63.615 | 0.050 | n/a | 0.000 | 63.563 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 63.613 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb00000000000206f2 | 63.579 | 0.026 | n/a | 0.000 | 63.552 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 63.578 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb00000000000206f1 | 63.547 | 0.030 | n/a | 0.000 | 63.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 63.545 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb00000000000206f0 | 63.519 | 0.056 | n/a | 0.000 | 63.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 63.518 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L64 / read (147 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.061 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.059 | 0.969 | 0.002 |
| p99 | 366.286 | n/a | n/a | n/a | 11.355 | n/a | 0.000 | 366.242 | 5.254 | 47.378 | 0.014 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.048 | 366.285 | 1.000 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88265751aa6816b2000000000003f35a | 367.380 | 0.516 | n/a | 0.000 | 366.855 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 367.371 | 1.000 | 0.009 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.094ms |
| 88265751aa6816b2000000000003f377 | 366.286 | 0.043 | n/a | 0.000 | 366.242 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.285 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.094ms |
| 88265751aa6816b2000000000003f370 | 366.285 | 0.043 | n/a | 0.000 | 366.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.283 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.094ms |
| 88265751aa6816b2000000000003f36f | 366.238 | 0.034 | n/a | 0.000 | 366.202 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.236 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.094ms |
| 88265751aa6816b2000000000003f376 | 366.216 | 0.045 | n/a | 0.000 | 366.169 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.214 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.094ms |
| 88265751aa6816b2000000000003f36e | 366.185 | 0.067 | n/a | 0.000 | 366.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.183 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.094ms |
| f978a50477bb65eb00000000000293e7 | 365.535 | 0.131 | n/a | 0.000 | 365.402 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.533 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| f978a50477bb65eb00000000000293e6 | 365.404 | 0.292 | n/a | 0.000 | 365.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 365.401 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| d77d1d4ca34d9d07000000000002b128 | 365.167 | 0.031 | n/a | 0.000 | 365.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 365.166 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.796ms |
| d77d1d4ca34d9d07000000000002b127 | 365.117 | 0.156 | n/a | 0.000 | 364.958 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 365.114 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.796ms |
| f978a50477bb65eb000000000002940e | 364.988 | 0.016 | n/a | 0.000 | 364.971 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.987 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| f978a50477bb65eb000000000002940d | 364.979 | 0.031 | n/a | 0.000 | 364.947 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.979 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| f978a50477bb65eb000000000002940c | 364.946 | 0.069 | n/a | 0.000 | 364.876 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.945 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| d77d1d4ca34d9d07000000000002b137 | 364.942 | 0.063 | n/a | 0.000 | 364.877 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.941 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.796ms |
| d77d1d4ca34d9d07000000000002b139 | 364.929 | 0.019 | n/a | 0.000 | 364.909 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.928 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.796ms |
| d77d1d4ca34d9d07000000000002b138 | 364.924 | 0.032 | n/a | 0.000 | 364.890 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 364.922 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.796ms |
| d77d1d4ca34d9d070000000000029b4f | 362.551 | 0.070 | n/a | 0.000 | 362.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 362.548 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000029b4e | 362.472 | 0.170 | n/a | 0.000 | 362.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 362.470 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000029b51 | 362.455 | 0.030 | n/a | 0.000 | 362.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 362.453 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d070000000000029b4d | 361.201 | 0.319 | n/a | 0.000 | 360.880 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 361.199 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L256 / read (129 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.167 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.149 | 0.981 | 0.002 |
| p99 | 463.536 | n/a | n/a | n/a | 9.234 | n/a | 0.000 | 463.332 | 1.940 | 20.997 | 0.012 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.034 | 463.534 | 1.000 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f978a50477bb65eb000000000002d7e5 | 464.802 | 0.255 | n/a | 0.000 | 464.527 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 464.781 | 1.000 | 0.020 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| f978a50477bb65eb000000000002d7e9 | 463.536 | 0.203 | n/a | 0.000 | 463.332 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 463.534 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| f978a50477bb65eb000000000002d7e6 | 463.342 | 0.134 | n/a | 0.000 | 463.196 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 463.329 | 1.000 | 0.013 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| f978a50477bb65eb000000000002d7e8 | 463.285 | 0.026 | n/a | 0.000 | 463.259 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 463.284 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| f978a50477bb65eb000000000002d7e7 | 463.268 | 0.039 | n/a | 0.000 | 463.227 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 463.266 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 88265751aa6816b200000000000434ee | 461.680 | 0.049 | n/a | 0.000 | 461.628 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 461.677 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.166ms |
| 88265751aa6816b200000000000434ef | 461.678 | 0.029 | n/a | 0.000 | 461.648 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 461.677 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.166ms |
| 88265751aa6816b200000000000434ed | 461.643 | 0.031 | n/a | 0.000 | 461.611 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 461.641 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.166ms |
| 88265751aa6816b200000000000434ec | 461.634 | 0.062 | n/a | 0.000 | 461.571 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 461.632 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.166ms |
| 88265751aa6816b200000000000434eb | 461.543 | 0.176 | n/a | 0.000 | 461.362 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 461.539 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.166ms |
| d77d1d4ca34d9d07000000000002f809 | 454.309 | 0.017 | n/a | 0.000 | 454.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 454.308 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| d77d1d4ca34d9d07000000000002f808 | 454.302 | 0.022 | n/a | 0.000 | 454.279 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 454.301 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| d77d1d4ca34d9d07000000000002f806 | 454.289 | 0.166 | n/a | 0.000 | 454.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 454.286 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| d77d1d4ca34d9d07000000000002f807 | 454.288 | 0.027 | n/a | 0.000 | 454.260 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 454.286 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| 88265751aa6816b200000000000434f7 | 447.079 | 0.038 | n/a | 0.000 | 447.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 447.077 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.166ms |
| d77d1d4ca34d9d07000000000002f80a | 362.827 | 0.043 | n/a | 0.000 | 362.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 362.821 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.023ms |
| f978a50477bb65eb00000000000324d3 | 317.518 | 0.031 | n/a | 0.000 | 317.484 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.515 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f978a50477bb65eb00000000000324d2 | 317.507 | 0.033 | n/a | 0.000 | 317.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.505 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f978a50477bb65eb00000000000324d1 | 317.473 | 0.044 | n/a | 0.000 | 317.427 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.471 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f978a50477bb65eb00000000000324d0 | 317.429 | 0.080 | n/a | 0.000 | 317.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 317.425 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |

## P1 / L1024 / read (204 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.045 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.043 | 0.958 | 0.002 |
| p99 | 43.833 | n/a | n/a | n/a | 10.924 | n/a | 0.000 | 0.000 | 1.708 | 8.416 | 0.028 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.073 | 10.924 | 1.000 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d77d1d4ca34d9d070000000000035438 | 132.092 | 93.139 | n/a | 7.621 | 0.000 | 6.557 | 24.714 | 0.028 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.009 | 100.760 | 0.763 | 0.009 | node-14/thread-5/reader.execute | none observed |
| 88265751aa6816b20000000000048d27 | 106.833 | 62.925 | n/a | 2.878 | 0.000 | 5.229 | 35.580 | 0.082 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.047 | 65.804 | 0.616 | 0.047 | node-14/thread-3/reader.execute | none observed |
| f978a50477bb65eb0000000000032b4e | 43.833 | 10.924 | n/a | 0.000 | 0.000 | 1.708 | 8.416 | 22.754 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.003 | 10.924 | 0.249 | 0.003 | gw-r/thread-54/gateway.admission-wait | none observed |
| d77d1d4ca34d9d07000000000003ab4c | 9.838 | 9.833 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 9.833 | 1.000 | 0.005 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| d77d1d4ca34d9d07000000000003ab4d | 9.797 | 9.775 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 9.775 | 0.998 | 0.022 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| d77d1d4ca34d9d07000000000003ab4e | 9.720 | 9.697 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 9.697 | 0.998 | 0.024 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| d77d1d4ca34d9d07000000000003ab4f | 9.697 | 9.673 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 9.673 | 0.998 | 0.024 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| d77d1d4ca34d9d07000000000003ab50 | 9.600 | 9.574 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 9.574 | 0.997 | 0.026 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.037ms |
| d77d1d4ca34d9d07000000000003a21d | 7.200 | 7.180 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 7.180 | 0.997 | 0.021 | node-14/thread-5/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000003a21c | 7.194 | 7.192 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 7.192 | 1.000 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000003aee0 | 6.585 | 6.582 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.582 | 1.000 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000003aee1 | 6.583 | 6.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 6.566 | 0.997 | 0.018 | node-14/thread-5/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000003aee2 | 6.547 | 6.527 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 6.527 | 0.997 | 0.020 | node-14/thread-5/replica.pull-at | none observed |
| f978a50477bb65eb0000000000032b32 | 6.330 | 6.325 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 6.325 | 0.999 | 0.005 | node-14/thread-4/reader.execute | none observed |
| f978a50477bb65eb0000000000032b33 | 6.316 | 6.304 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 6.304 | 0.998 | 0.012 | node-14/thread-4/reader.execute | none observed |
| f978a50477bb65eb00000000000372fe | 6.269 | 6.267 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 6.267 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 88265751aa6816b20000000000048d5a | 4.893 | 4.878 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.878 | 0.997 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000048d59 | 4.891 | 4.888 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.888 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000048d5b | 4.854 | 4.838 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.838 | 0.997 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000048d5c | 4.844 | 4.827 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.827 | 0.996 | 0.017 | node-14/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (206 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.025 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.031 | 0.967 | 0.001 |
| p99 | 287.809 | n/a | n/a | n/a | 6.255 | n/a | 0.000 | 287.771 | 2.928 | 0.527 | 0.006 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.032 | 287.807 | 1.000 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f978a50477bb65eb0000000000049914 | 287.880 | 0.026 | n/a | 0.000 | 287.852 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.878 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000049913 | 287.845 | 0.028 | n/a | 0.000 | 287.815 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.844 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000049912 | 287.809 | 0.037 | n/a | 0.000 | 287.771 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.807 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000005ff37 | 287.759 | 0.161 | n/a | 0.000 | 287.594 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 287.755 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.075ms |
| f978a50477bb65eb0000000000048ad8 | 287.758 | 0.064 | n/a | 0.000 | 287.690 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.754 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| f978a50477bb65eb0000000000048ad6 | 287.756 | 0.031 | n/a | 0.000 | 287.723 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.754 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| f978a50477bb65eb0000000000048ad5 | 287.755 | 0.029 | n/a | 0.000 | 287.723 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 287.752 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| f978a50477bb65eb0000000000048ad4 | 287.749 | 0.148 | n/a | 0.000 | 287.593 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 287.741 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| f978a50477bb65eb0000000000048ad7 | 287.740 | 0.019 | n/a | 0.000 | 287.718 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.737 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| f978a50477bb65eb0000000000049911 | 287.722 | 0.134 | n/a | 0.000 | 287.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.720 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000005ff36 | 287.642 | 0.277 | n/a | 0.000 | 287.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 287.637 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.075ms |
| f978a50477bb65eb0000000000049910 | 287.544 | 0.103 | n/a | 0.000 | 287.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.542 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000060f6c | 287.281 | 0.126 | n/a | 0.000 | 287.153 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.279 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b20000000000060f6d | 287.279 | 0.027 | n/a | 0.000 | 287.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.277 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d07000000000004c12e | 287.156 | 0.043 | n/a | 0.000 | 287.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 287.155 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| d77d1d4ca34d9d07000000000004d1e6 | 287.141 | 0.095 | n/a | 0.000 | 287.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 287.139 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d07000000000004c12d | 287.135 | 0.160 | n/a | 0.000 | 286.971 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 287.132 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| d77d1d4ca34d9d07000000000004d1e5 | 287.107 | 0.084 | n/a | 0.000 | 287.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.104 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d07000000000004d1e7 | 287.070 | 0.042 | n/a | 0.000 | 287.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 287.068 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 88265751aa6816b2000000000005ff46 | 286.923 | 0.121 | n/a | 0.000 | 286.798 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.919 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.075ms |

## P4 / p4mix / read (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.943 | 0.001 |
| p99 | 1.492 | n/a | n/a | n/a | 1.489 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 1.489 | 0.998 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88265751aa6816b2000000000006321f | 49.644 | 37.553 | n/a | 3.506 | 0.000 | 0.679 | 7.882 | 0.007 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.004 | 41.059 | 0.827 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b2000000000006e209 | 1.492 | 1.489 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.489 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000635ad | 0.883 | 0.882 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.882 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000077774 | 0.655 | 0.037 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.618 | 0.037 | 0.057 | 0.618 | uncovered | none observed |
| 88265751aa6816b2000000000007605b | 0.597 | 0.596 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.596 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000006c88e | 0.589 | 0.587 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.587 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000721db | 0.574 | 0.571 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.571 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000065eb5 | 0.510 | 0.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.506 | 0.991 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000006b32f | 0.504 | 0.502 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.502 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000006666d | 0.486 | 0.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.481 | 0.990 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000007e23a | 0.482 | 0.479 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.479 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000007d74d | 0.477 | 0.473 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.473 | 0.991 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000007cf64 | 0.467 | 0.465 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.465 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000075dd4 | 0.439 | 0.438 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.438 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000007da1a | 0.430 | 0.424 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.424 | 0.987 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000064d4b | 0.427 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.425 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000082c74 | 0.418 | 0.413 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.413 | 0.989 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000007779c | 0.418 | 0.390 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 0.390 | 0.935 | 0.027 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000006e27a | 0.412 | 0.407 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.407 | 0.988 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000007d2cc | 0.411 | 0.410 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.410 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (176 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.923 | 0.001 |
| p99 | 3.749 | n/a | n/a | n/a | 1.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.577 | 0.998 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88265751aa6816b2000000000008345a | 11.903 | 1.577 | n/a | 0.000 | 0.000 | 1.256 | 9.012 | 0.019 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.002 | 1.577 | 0.133 | 0.002 | gw-r/thread-54/gateway.admitted-work | none observed |
| 88265751aa6816b2000000000009fd2d | 3.749 | 3.748 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.748 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000084a9d | 1.136 | 1.135 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.135 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000ac3d0 | 0.800 | 0.797 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.797 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000ac30d | 0.694 | 0.691 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.691 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000a3bce | 0.594 | 0.592 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.592 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000009ebeb | 0.580 | 0.578 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.578 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000a7f75 | 0.577 | 0.575 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.575 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000083398 | 0.564 | 0.561 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.561 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000089bc2 | 0.514 | 0.513 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.513 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b20000000000084e09 | 0.506 | 0.505 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.505 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000ac59a | 0.500 | 0.498 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.498 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000acf95 | 0.492 | 0.491 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.491 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000a7a53 | 0.492 | 0.490 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.490 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000084a9f | 0.483 | 0.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.481 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000a8b61 | 0.480 | 0.479 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.479 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000088eb9 | 0.469 | 0.466 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.466 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000ac33e | 0.454 | 0.451 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.451 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b20000000000085baf | 0.442 | 0.438 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.438 | 0.990 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b2000000000009dbf8 | 0.441 | 0.436 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.436 | 0.988 | 0.005 | node-14/thread-3/reader.execute | none observed |

## P4 / p4h3 / read (168 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.923 | 0.001 |
| p99 | 3.737 | n/a | n/a | n/a | 2.890 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.890 | 1.000 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88265751aa6816b200000000000ad206 | 26.760 | 2.890 | n/a | 0.000 | 0.000 | 1.216 | 11.093 | 0.014 | 11.513 | 0.031 | 0.000 | n/a | n/a | 0.003 | 2.890 | 0.108 | 0.003 | gw-r/thread--1/jdk.GCPhasePause | none observed |
| 88265751aa6816b200000000000c0621 | 3.737 | 3.735 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.735 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.037ms |
| 88265751aa6816b200000000000b4536 | 2.330 | 2.329 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.329 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000c331e | 0.636 | 0.634 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.634 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000bffde | 0.586 | 0.584 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.584 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000ca989 | 0.573 | 0.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.569 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000bf3a1 | 0.560 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.558 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b2141 | 0.547 | 0.544 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.544 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b02ab | 0.541 | 0.539 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.539 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000c9e57 | 0.495 | 0.493 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.493 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000c001a | 0.483 | 0.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.481 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b73b1 | 0.462 | 0.457 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.457 | 0.988 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000d3932 | 0.461 | 0.455 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.455 | 0.988 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b8e2f | 0.458 | 0.456 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.456 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b1d81 | 0.455 | 0.454 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.454 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b1a7f | 0.440 | 0.435 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.435 | 0.989 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000cd8b7 | 0.430 | 0.427 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.427 | 0.993 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b200000000000cc60d | 0.425 | 0.424 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.424 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000c9018 | 0.424 | 0.421 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.421 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000b19ce | 0.424 | 0.422 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.422 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (179 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.919 | 0.001 |
| p99 | 2.992 | n/a | n/a | n/a | 1.900 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 1.900 | 0.999 | 0.009 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 88265751aa6816b200000000000d7bb1 | 8.890 | 8.888 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 8.888 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 88265751aa6816b200000000000d3990 | 2.992 | 1.512 | n/a | 0.000 | 0.000 | 0.809 | 0.645 | 0.008 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.002 | 1.512 | 0.505 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b200000000000dfed2 | 1.903 | 1.900 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.900 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000dfedd | 1.356 | 1.353 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.353 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000dfede | 1.330 | 1.322 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 1.322 | 0.994 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000e94f9 | 1.056 | 1.055 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.055 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000f6797 | 1.042 | 0.115 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.927 | 0.115 | 0.111 | 0.927 | uncovered | none observed |
| 88265751aa6816b200000000000f64f3 | 0.975 | 0.971 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.971 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000f6280 | 0.753 | 0.751 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.751 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000e8192 | 0.732 | 0.730 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.730 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000e8295 | 0.649 | 0.648 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.648 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b200000000000f1fd1 | 0.630 | 0.628 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.628 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000d84a4 | 0.611 | 0.610 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.610 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b200000000000edc52 | 0.605 | 0.602 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.602 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000f046d | 0.584 | 0.583 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.583 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.027ms |
| 88265751aa6816b200000000000f5d83 | 0.578 | 0.576 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.576 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000f673b | 0.573 | 0.571 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.571 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000f746f | 0.557 | 0.555 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.555 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000eb68c | 0.531 | 0.530 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.530 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 88265751aa6816b200000000000dd5bf | 0.504 | 0.502 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.502 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.042 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.039 | 0.965 | 0.001 |
| p99 | 266.713 | n/a | n/a | n/a | 5.074 | n/a | 1.781 | 266.668 | 1.365 | 2.172 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.082 | 266.712 | 1.000 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d77d1d4ca34d9d0700000000000540b1 | 266.831 | 0.173 | n/a | 0.000 | 266.654 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.827 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000050d70 | 266.718 | 0.015 | n/a | 0.000 | 266.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.717 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000050d6f | 266.713 | 0.022 | n/a | 0.000 | 266.690 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.712 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000050d6e | 266.708 | 0.039 | n/a | 0.000 | 266.668 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.707 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000050d6d | 266.698 | 0.102 | n/a | 0.000 | 266.595 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.697 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f978a50477bb65eb0000000000050d6c | 266.591 | 0.120 | n/a | 0.000 | 266.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.589 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 88265751aa6816b200000000000ff8fe | 266.497 | 0.100 | n/a | 0.000 | 266.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.495 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d0700000000000540c8 | 265.862 | 0.040 | n/a | 0.000 | 265.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.860 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d0700000000000540cb | 265.853 | 0.070 | n/a | 0.000 | 265.781 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.851 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d0700000000000540c9 | 265.850 | 0.023 | n/a | 0.000 | 265.825 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.848 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d77d1d4ca34d9d0700000000000540ca | 265.844 | 0.019 | n/a | 0.000 | 265.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.842 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 88265751aa6816b200000000000ff912 | 265.404 | 0.015 | n/a | 0.000 | 265.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.403 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b200000000000ff911 | 265.400 | 0.022 | n/a | 0.000 | 265.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.399 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b200000000000ff935 | 264.927 | 0.013 | n/a | 0.000 | 264.912 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.926 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b200000000000ff934 | 264.921 | 0.014 | n/a | 0.000 | 264.906 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.920 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 88265751aa6816b200000000000ff933 | 264.918 | 0.017 | n/a | 0.000 | 264.900 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 264.917 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f978a50477bb65eb000000000004c1d4 | 35.341 | 12.794 | n/a | 2.316 | 0.000 | 2.945 | 10.627 | 0.006 | 6.636 | 0.014 | 0.000 | n/a | n/a | 0.003 | 15.110 | 0.428 | 0.003 | node-14/thread-4/reader.execute | none observed |
| d77d1d4ca34d9d07000000000004f4b9 | 21.188 | 15.457 | n/a | 1.781 | 0.000 | 1.759 | 2.172 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.004 | 17.238 | 0.814 | 0.004 | node-14/thread-5/reader.execute | none observed |
| 88265751aa6816b200000000000faac2 | 10.504 | 3.218 | n/a | 2.521 | 0.000 | 1.365 | 3.367 | 0.008 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.003 | 5.739 | 0.546 | 0.003 | gw-r/thread-53/gateway.admitted-work | none observed |
| f978a50477bb65eb0000000000054b94 | 5.077 | 5.074 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.074 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | none observed |

## P5 / sweep / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.355 | n/a | n/a | n/a | 3.172 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.343 | 0.995 | 0.015 |
| p99 | 40.326 | n/a | n/a | n/a | 23.129 | n/a | 8.885 | 3.443 | 2.726 | 5.901 | 0.013 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.287 | 31.673 | 1.000 | 1.287 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d77d1d4ca34d9d07000000000005bd5a | 40.326 | 22.788 | n/a | 8.885 | 0.000 | 2.706 | 5.901 | 0.013 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.003 | 31.673 | 0.785 | 0.003 | node-14/thread-5/reader.execute | none observed |
| 88265751aa6816b20000000000107f20 | 29.270 | 23.129 | n/a | 2.328 | 0.000 | 2.681 | 1.101 | 0.008 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.006 | 25.457 | 0.870 | 0.006 | node-14/thread-3/reader.execute | none observed |
| f978a50477bb65eb0000000000058b35 | 10.930 | 7.018 | n/a | 0.000 | 0.000 | 2.726 | 1.155 | 0.009 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.003 | 7.018 | 0.642 | 0.003 | node-14/thread-4/reader.execute | none observed |
| d814692929e712700000000000000153 | 10.728 | 2.692 | n/a | 6.749 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.287 | 9.441 | 0.880 | 1.287 | node-14/thread-6/node.gc | none observed |
| d814692929e712700000000000000154 | 10.530 | 3.744 | n/a | 6.749 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 10.493 | 0.996 | 0.038 | node-14/thread-6/node.gc | none observed |
| d814692929e712700000000000000155 | 10.464 | 3.685 | n/a | 6.749 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 10.433 | 0.997 | 0.031 | node-14/thread-6/node.gc | none observed |
| d814692929e712700000000000000156 | 10.373 | 3.589 | n/a | 6.749 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 10.337 | 0.997 | 0.035 | node-14/thread-6/node.gc | none observed |
| d814692929e712700000000000000233 | 10.307 | 10.278 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 10.278 | 0.997 | 0.029 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e712700000000000000157 | 10.304 | 3.519 | n/a | 6.749 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 10.268 | 0.997 | 0.036 | node-14/thread-6/node.gc | none observed |
| d814692929e712700000000000000234 | 10.287 | 10.240 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 10.240 | 0.995 | 0.047 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e712700000000000000235 | 10.270 | 10.220 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 10.220 | 0.995 | 0.050 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e712700000000000000236 | 10.255 | 10.203 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 10.203 | 0.995 | 0.052 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e712700000000000000237 | 10.174 | 10.118 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 10.118 | 0.995 | 0.056 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e712700000000000000238 | 10.147 | 10.090 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.057 | 10.090 | 0.994 | 0.057 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e71270000000000000023a | 10.120 | 10.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.098 | 10.022 | 0.990 | 0.098 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e712700000000000000239 | 10.105 | 10.044 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 10.044 | 0.994 | 0.062 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e71270000000000000023b | 10.058 | 9.952 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.106 | 9.952 | 0.989 | 0.106 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e71270000000000000023c | 10.031 | 9.923 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.108 | 9.923 | 0.989 | 0.108 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e71270000000000000023d | 10.003 | 9.894 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.109 | 9.894 | 0.989 | 0.109 | node-14/thread-6/replica.pull-at | none observed |
| d814692929e71270000000000000023e | 9.963 | 9.854 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.109 | 9.854 | 0.989 | 0.109 | node-14/thread-6/replica.pull-at | none observed |

## P1 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.290 | n/a | n/a | n/a | 0.257 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 0.257 | 0.886 | 0.029 |
| p99 | 0.358 | n/a | n/a | n/a | 0.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.350 | 0.977 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f978a50477bb65eb0000000000059309 | 0.358 | 0.350 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.350 | 0.977 | 0.008 | node-14/thread-4/replica.pull-at | none observed |
| f978a50477bb65eb000000000005930a | 0.327 | 0.299 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 0.299 | 0.914 | 0.028 | node-14/thread-4/replica.pull-at | none observed |
| f978a50477bb65eb000000000005930b | 0.316 | 0.285 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.285 | 0.901 | 0.031 | node-14/thread-4/replica.pull-at | none observed |
| f978a50477bb65eb000000000005930c | 0.308 | 0.276 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 0.276 | 0.897 | 0.032 | node-14/thread-4/replica.pull-at | none observed |
| f978a50477bb65eb000000000005930d | 0.290 | 0.257 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 0.257 | 0.886 | 0.033 | node-14/thread-4/replica.pull-at | none observed |
| d77d1d4ca34d9d07000000000005c536 | 0.098 | 0.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 0.063 | 0.638 | 0.036 | node-14/thread-5/reader.execute | none observed |
| 88265751aa6816b20000000000108359 | 0.059 | 0.040 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 0.040 | 0.674 | 0.019 | node-14/thread-3/reader.execute | none observed |
| 88265751aa6816b2000000000010835a | 0.049 | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 0.020 | 0.408 | 0.029 | uncovered | none observed |

## P3 / outside-phases / read (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.133 | n/a | n/a | n/a | 0.053 | n/a | 0.000 | 0.000 | 0.973 | 200.854 | 0.016 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.121 | 0.053 | 0.000 | 0.121 |
| p99 | 209.049 | n/a | n/a | n/a | 0.645 | n/a | 0.000 | 0.000 | 3.168 | 205.385 | 8.563 | 11.513 | 2.129 | 0.000 | n/a | n/a | 0.382 | 0.645 | 0.010 | 0.382 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000046 | 209.049 | 0.058 | n/a | 0.000 | 0.000 | 1.287 | 205.385 | 0.062 | 0.000 | 2.129 | 0.000 | n/a | n/a | 0.127 | 0.058 | 0.000 | 0.127 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000082 | 205.318 | 0.091 | n/a | 0.000 | 0.000 | 3.168 | 189.953 | 0.015 | 11.513 | 0.330 | 0.000 | n/a | n/a | 0.247 | 0.091 | 0.000 | 0.247 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000006 | 204.587 | 0.201 | n/a | 0.000 | 0.000 | 2.557 | 201.380 | 0.028 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.215 | 0.201 | 0.001 | 0.215 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000080 | 204.163 | 0.058 | n/a | 0.000 | 0.000 | 1.541 | 202.170 | 0.065 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.146 | 0.058 | 0.000 | 0.146 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec612700000000000000aa | 203.722 | 0.045 | n/a | 0.000 | 0.000 | 0.958 | 202.370 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.207 | 0.045 | 0.000 | 0.207 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000005 | 203.615 | 0.090 | n/a | 0.000 | 0.000 | 1.887 | 201.060 | 0.014 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.382 | 0.090 | 0.000 | 0.382 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000005d | 203.444 | 0.065 | n/a | 0.000 | 0.000 | 1.133 | 201.939 | 0.014 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.091 | 0.065 | 0.000 | 0.091 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000007d | 203.060 | 0.049 | n/a | 0.000 | 0.000 | 0.934 | 201.771 | 0.063 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.111 | 0.049 | 0.000 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000078 | 202.696 | 0.041 | n/a | 0.000 | 0.000 | 1.556 | 200.900 | 0.014 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.083 | 0.041 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000079 | 202.679 | 0.044 | n/a | 0.000 | 0.000 | 1.085 | 201.279 | 0.021 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.115 | 0.044 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000007 | 202.510 | 0.044 | n/a | 0.000 | 0.000 | 1.047 | 200.974 | 0.008 | 0.000 | 0.290 | 0.000 | n/a | n/a | 0.147 | 0.044 | 0.000 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000005e | 202.452 | 0.078 | n/a | 0.000 | 0.000 | 0.984 | 201.108 | 0.016 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.142 | 0.078 | 0.000 | 0.142 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec612700000000000000cf | 202.253 | 0.052 | n/a | 0.000 | 0.000 | 0.973 | 200.978 | 0.017 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.144 | 0.052 | 0.000 | 0.144 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec612700000000000000a8 | 202.195 | 0.051 | n/a | 0.000 | 0.000 | 1.092 | 200.798 | 0.013 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.148 | 0.051 | 0.000 | 0.148 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000d0 | 202.175 | 0.059 | n/a | 0.000 | 0.000 | 0.845 | 200.942 | 0.019 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.141 | 0.059 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000060 | 202.133 | 0.049 | n/a | 0.000 | 0.000 | 0.881 | 200.966 | 0.012 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.101 | 0.049 | 0.000 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec612700000000000000d2 | 202.126 | 0.052 | n/a | 0.000 | 0.000 | 0.942 | 200.854 | 0.014 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.162 | 0.052 | 0.000 | 0.162 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec612700000000000000a6 | 202.113 | 0.044 | n/a | 0.000 | 0.000 | 0.915 | 200.928 | 0.018 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.108 | 0.044 | 0.000 | 0.108 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000a7 | 201.937 | 0.043 | n/a | 0.000 | 0.000 | 0.850 | 200.809 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.114 | 0.043 | 0.000 | 0.114 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000007c | 201.728 | 0.032 | n/a | 0.000 | 0.000 | 0.650 | 200.818 | 0.021 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.081 | 0.032 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |

## P3 / outside-phases / internal (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 465.174 | n/a | n/a | n/a | 2.460 | n/a | 0.000 | 0.000 | 1.052 | 453.755 | 0.015 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.228 | 2.460 | 0.011 | 0.228 |
| p99 | 1072.947 | n/a | n/a | n/a | 118.517 | n/a | 4.519 | 0.000 | 67.797 | 1005.750 | 0.193 | 18.849 | 2.315 | 0.000 | n/a | n/a | 3.877 | 123.036 | 0.806 | 3.877 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000017 | 1072.947 | 0.349 | n/a | 0.000 | 0.000 | 67.797 | 984.047 | 0.126 | 18.849 | 0.420 | 0.000 | n/a | n/a | 1.360 | 0.349 | 0.000 | 1.360 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b50000000000000046 | 1009.206 | 0.169 | n/a | 0.000 | 0.000 | 1.950 | 1005.750 | 0.031 | 0.000 | 0.166 | 0.000 | n/a | n/a | 1.140 | 0.169 | 0.000 | 1.140 | gw-r/thread-50/journal/page | none observed |
| 7557fe358737e4b50000000000000019 | 1007.031 | 1.316 | n/a | 0.000 | 0.000 | 1.568 | 1002.791 | 0.008 | 0.000 | 0.177 | 0.000 | n/a | n/a | 1.171 | 1.316 | 0.001 | 1.171 | gw-r/thread-50/journal/page | none observed |
| 7557fe358737e4b50000000000000018 | 1003.878 | 0.145 | n/a | 0.000 | 0.000 | 1.111 | 1001.211 | 0.022 | 0.000 | 0.286 | 0.000 | n/a | n/a | 1.102 | 0.145 | 0.000 | 1.102 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000052 | 1003.026 | 0.132 | n/a | 0.000 | 0.000 | 0.673 | 1000.985 | 0.019 | 0.000 | 0.108 | 0.000 | n/a | n/a | 1.108 | 0.132 | 0.000 | 1.108 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000081 | 997.073 | 2.295 | n/a | 0.000 | 0.000 | 0.969 | 991.362 | 0.069 | 0.000 | 2.315 | 0.000 | n/a | n/a | 0.063 | 2.295 | 0.002 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b50000000000000051 | 581.219 | 2.460 | n/a | 0.000 | 0.000 | 1.244 | 577.159 | 0.193 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.096 | 2.460 | 0.004 | 0.096 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b50000000000000060 | 577.834 | 6.335 | n/a | 0.000 | 0.000 | 0.743 | 570.199 | 0.013 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.438 | 6.335 | 0.011 | 0.438 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b5000000000000005d | 465.174 | 8.988 | n/a | 0.819 | 0.000 | 1.008 | 453.755 | 0.033 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.433 | 9.807 | 0.021 | 0.433 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b50000000000000082 | 318.335 | 4.584 | n/a | 0.000 | 0.000 | 4.301 | 309.293 | 0.015 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.063 | 4.584 | 0.014 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000065 | 243.573 | 3.602 | n/a | 0.000 | 0.000 | 0.747 | 227.491 | 0.015 | 11.513 | 0.130 | 0.000 | n/a | n/a | 0.074 | 3.602 | 0.015 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 7557fe358737e4b50000000000000063 | 228.773 | 2.402 | n/a | 0.000 | 0.000 | 1.574 | 224.567 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.127 | 2.402 | 0.010 | 0.127 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000080 | 212.013 | 2.266 | n/a | 0.000 | 0.000 | 0.535 | 209.078 | 0.013 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.058 | 2.266 | 0.011 | 0.058 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000061 | 196.658 | 7.105 | n/a | 0.000 | 0.000 | 1.964 | 187.186 | 0.039 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.228 | 7.105 | 0.036 | 0.228 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b5000000000000005b | 152.636 | 118.517 | n/a | 4.519 | 0.000 | 1.052 | 24.643 | 0.010 | 0.000 | 0.018 | 0.000 | n/a | n/a | 3.877 | 123.036 | 0.806 | 3.877 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b5000000000000005f | 78.793 | 3.837 | n/a | 0.000 | 0.000 | 0.867 | 73.889 | 0.014 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.082 | 3.837 | 0.049 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b5000000000000007e | 6.431 | 4.475 | n/a | 0.000 | 0.000 | 0.862 | 1.016 | 0.009 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.054 | 4.475 | 0.696 | 0.054 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 464.823 | n/a | n/a | n/a | 5.031 | n/a | 0.000 | 0.000 | 1.285 | 432.453 | 0.020 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.249 | 5.031 | 0.012 | 0.249 |
| p99 | 728.160 | n/a | n/a | n/a | 29.216 | n/a | 0.878 | 0.000 | 2.352 | 721.190 | 0.337 | 0.000 | 2.385 | 0.000 | n/a | n/a | 0.484 | 30.094 | 0.065 | 0.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000001d | 728.160 | 5.031 | n/a | 0.000 | 0.000 | 1.499 | 721.190 | 0.020 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.310 | 5.031 | 0.007 | 0.310 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b5000000000000001c | 494.737 | 5.978 | n/a | 0.000 | 0.000 | 1.285 | 484.795 | 0.045 | 0.000 | 2.385 | 0.000 | n/a | n/a | 0.249 | 5.978 | 0.012 | 0.249 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b5000000000000001a | 464.823 | 29.216 | n/a | 0.878 | 0.000 | 1.285 | 432.453 | 0.337 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.484 | 30.094 | 0.065 | 0.484 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b5000000000000001f | 245.019 | 3.275 | n/a | 0.000 | 0.000 | 2.352 | 239.065 | 0.015 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.222 | 3.275 | 0.013 | 0.222 | gw-r/thread-55/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 228.162 | n/a | n/a | n/a | 2.391 | n/a | 0.000 | 0.000 | 0.573 | 224.748 | 0.014 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.084 | 2.391 | 0.006 | 0.084 |
| p99 | 955.554 | n/a | n/a | n/a | 4.440 | n/a | 0.000 | 0.000 | 1.276 | 953.070 | 0.041 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.282 | 4.440 | 0.078 | 0.282 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000023 | 955.554 | 1.668 | n/a | 0.000 | 0.000 | 0.536 | 953.070 | 0.013 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.084 | 1.668 | 0.002 | 0.084 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000020 | 752.102 | 4.156 | n/a | 0.000 | 0.000 | 0.573 | 747.153 | 0.014 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.107 | 4.156 | 0.006 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 7557fe358737e4b50000000000000021 | 228.162 | 2.391 | n/a | 0.000 | 0.000 | 0.736 | 224.748 | 0.041 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.080 | 2.391 | 0.010 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000024 | 56.568 | 4.440 | n/a | 0.000 | 0.000 | 1.276 | 50.376 | 0.034 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.282 | 4.440 | 0.078 | 0.282 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 751.856 | n/a | n/a | n/a | 2.604 | n/a | 0.000 | 0.000 | 0.915 | 747.903 | 0.027 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.095 | 2.604 | 0.003 | 0.095 |
| p99 | 996.760 | n/a | n/a | n/a | 4.118 | n/a | 0.000 | 0.000 | 1.119 | 993.385 | 0.046 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.106 | 4.118 | 0.017 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000029 | 996.760 | 2.436 | n/a | 0.000 | 0.000 | 0.643 | 993.385 | 0.046 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.106 | 2.436 | 0.002 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b50000000000000028 | 751.856 | 2.604 | n/a | 0.000 | 0.000 | 1.119 | 747.903 | 0.017 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.085 | 2.604 | 0.003 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b50000000000000026 | 248.104 | 4.118 | n/a | 0.000 | 0.000 | 0.915 | 242.726 | 0.027 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.095 | 4.118 | 0.017 | 0.095 | gw-r/thread-55/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 424.839 | n/a | n/a | n/a | 2.476 | n/a | 0.000 | 0.000 | 0.813 | 420.611 | 0.015 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.087 | 2.476 | 0.005 | 0.087 |
| p99 | 963.143 | n/a | n/a | n/a | 10.825 | n/a | 0.000 | 0.000 | 1.467 | 959.693 | 0.027 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.220 | 10.825 | 0.067 | 0.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000002f | 963.143 | 2.417 | n/a | 0.000 | 0.000 | 0.813 | 959.693 | 0.027 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.083 | 2.417 | 0.003 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b5000000000000002d | 460.302 | 2.476 | n/a | 0.000 | 0.000 | 1.142 | 456.430 | 0.017 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.087 | 2.476 | 0.005 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b5000000000000002b | 424.839 | 3.213 | n/a | 0.000 | 0.000 | 0.797 | 420.611 | 0.015 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.093 | 3.213 | 0.008 | 0.093 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b5000000000000002a | 160.389 | 10.825 | n/a | 0.000 | 0.000 | 1.467 | 147.757 | 0.014 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.220 | 10.825 | 0.067 | 0.220 | gw-r/thread-55/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 333.619 | n/a | n/a | n/a | 2.526 | n/a | 0.000 | 0.000 | 1.190 | 329.518 | 0.017 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.169 | 2.526 | 0.008 | 0.169 |
| p99 | 998.875 | n/a | n/a | n/a | 10.727 | n/a | 0.000 | 0.000 | 6.574 | 989.716 | 0.020 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.326 | 10.727 | 0.032 | 0.326 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000030 | 998.875 | 2.358 | n/a | 0.000 | 0.000 | 6.574 | 989.716 | 0.013 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.093 | 2.358 | 0.002 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b50000000000000035 | 731.480 | 10.727 | n/a | 0.000 | 0.000 | 3.531 | 716.694 | 0.019 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.326 | 10.727 | 0.015 | 0.326 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000031 | 333.619 | 2.751 | n/a | 0.000 | 0.000 | 1.068 | 329.518 | 0.017 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.169 | 2.751 | 0.008 | 0.169 | gw-r/thread-51/journal/page | none observed |
| 7557fe358737e4b50000000000000032 | 79.090 | 2.526 | n/a | 0.000 | 0.000 | 1.190 | 75.046 | 0.020 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.201 | 2.526 | 0.032 | 0.201 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 510.787 | n/a | n/a | n/a | 9.623 | n/a | 0.000 | 0.000 | 1.799 | 426.135 | 0.063 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.333 | 9.623 | 0.024 | 0.333 |
| p99 | 670.175 | n/a | n/a | n/a | 27.893 | n/a | 4.625 | 0.000 | 71.153 | 635.220 | 0.333 | 0.000 | 0.415 | 0.000 | n/a | n/a | 0.434 | 32.518 | 0.049 | 0.434 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000036 | 670.175 | 27.893 | n/a | 4.625 | 0.000 | 1.765 | 635.220 | 0.090 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.363 | 32.518 | 0.049 | 0.363 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b5000000000000003b | 643.787 | 9.623 | n/a | 0.000 | 0.000 | 2.133 | 631.445 | 0.063 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.324 | 9.623 | 0.015 | 0.324 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000038 | 510.787 | 12.418 | n/a | 0.000 | 0.000 | 71.153 | 426.135 | 0.333 | 0.000 | 0.415 | 0.000 | n/a | n/a | 0.333 | 12.418 | 0.024 | 0.333 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000039 | 127.575 | 5.252 | n/a | 0.000 | 0.000 | 1.799 | 119.794 | 0.024 | 0.000 | 0.272 | 0.000 | n/a | n/a | 0.434 | 5.252 | 0.041 | 0.434 | gw-r/thread-54/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 403.162 | n/a | n/a | n/a | 7.078 | n/a | 0.000 | 0.000 | 1.416 | 393.030 | 0.126 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.276 | 7.078 | 0.015 | 0.276 |
| p99 | 617.131 | n/a | n/a | n/a | 13.551 | n/a | 0.000 | 0.000 | 4.017 | 590.124 | 0.404 | 20.202 | 0.273 | 0.000 | n/a | n/a | 0.342 | 13.551 | 0.053 | 0.342 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000003e | 617.131 | 4.793 | n/a | 0.000 | 0.000 | 1.416 | 590.124 | 0.165 | 20.202 | 0.153 | 0.000 | n/a | n/a | 0.277 | 4.793 | 0.008 | 0.277 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b5000000000000003f | 475.855 | 7.078 | n/a | 0.000 | 0.000 | 1.517 | 466.387 | 0.404 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.276 | 7.078 | 0.015 | 0.276 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b5000000000000003c | 403.162 | 5.817 | n/a | 0.000 | 0.000 | 4.017 | 393.030 | 0.020 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.129 | 5.817 | 0.014 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 7557fe358737e4b50000000000000040 | 336.411 | 7.518 | n/a | 0.000 | 0.000 | 1.017 | 327.550 | 0.019 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.198 | 7.518 | 0.022 | 0.198 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b50000000000000043 | 255.836 | 13.551 | n/a | 0.000 | 0.000 | 1.104 | 240.440 | 0.126 | 0.000 | 0.273 | 0.000 | n/a | n/a | 0.342 | 13.551 | 0.053 | 0.342 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 875.752 | n/a | n/a | n/a | 6.876 | n/a | 0.000 | 0.000 | 1.407 | 867.017 | 0.024 | 0.000 | 0.244 | 0.000 | n/a | n/a | 0.105 | 6.876 | 0.008 | 0.105 |
| p99 | 965.753 | n/a | n/a | n/a | 14.250 | n/a | 0.000 | 0.000 | 1.656 | 949.424 | 0.103 | 0.000 | 0.276 | 0.000 | n/a | n/a | 0.124 | 14.250 | 0.015 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000044 | 965.753 | 14.250 | n/a | 0.000 | 0.000 | 1.656 | 949.424 | 0.024 | 0.000 | 0.276 | 0.000 | n/a | n/a | 0.124 | 14.250 | 0.015 | 0.124 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000045 | 875.752 | 6.876 | n/a | 0.000 | 0.000 | 1.407 | 867.017 | 0.103 | 0.000 | 0.244 | 0.000 | n/a | n/a | 0.105 | 6.876 | 0.008 | 0.105 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 236.152 | n/a | n/a | n/a | 2.331 | n/a | 0.000 | 0.000 | 0.668 | 219.730 | 0.032 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.093 | 2.331 | 0.010 | 0.093 |
| p99 | 442.743 | n/a | n/a | n/a | 4.245 | n/a | 0.000 | 0.000 | 1.958 | 432.627 | 3.677 | 13.120 | 0.129 | 0.000 | n/a | n/a | 0.168 | 4.245 | 0.047 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000004a | 442.743 | 4.245 | n/a | 0.000 | 0.000 | 1.958 | 432.627 | 3.677 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.168 | 4.245 | 0.010 | 0.168 | gw-r/thread-50/journal/page | none observed |
| 7557fe358737e4b50000000000000048 | 268.069 | 2.605 | n/a | 0.000 | 0.000 | 0.460 | 264.750 | 0.032 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.093 | 2.605 | 0.010 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b5000000000000004c | 236.152 | 2.225 | n/a | 0.000 | 0.000 | 0.847 | 219.730 | 0.016 | 13.120 | 0.124 | 0.000 | n/a | n/a | 0.090 | 2.225 | 0.009 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000047 | 50.004 | 2.331 | n/a | 0.000 | 0.000 | 0.668 | 43.589 | 3.203 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.106 | 2.331 | 0.047 | 0.106 | gw-r/thread-54/journal/page | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 978.940 | n/a | n/a | n/a | 2.876 | n/a | 0.000 | 0.000 | 0.734 | 971.605 | 0.184 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.082 | 2.876 | 0.003 | 0.082 |
| p99 | 987.203 | n/a | n/a | n/a | 5.708 | n/a | 0.000 | 0.000 | 1.145 | 982.802 | 3.585 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.319 | 5.708 | 0.013 | 0.319 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000004e | 987.203 | 2.876 | n/a | 0.000 | 0.000 | 1.145 | 982.802 | 0.184 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.080 | 2.876 | 0.003 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b5000000000000004d | 978.940 | 2.811 | n/a | 0.000 | 0.000 | 0.734 | 971.605 | 3.585 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.082 | 2.811 | 0.003 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 7557fe358737e4b5000000000000004f | 433.346 | 5.708 | n/a | 0.000 | 0.000 | 0.593 | 426.669 | 0.025 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.319 | 5.708 | 0.013 | 0.319 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 329.286 | n/a | n/a | n/a | 2.135 | n/a | 0.000 | 0.000 | 0.676 | 323.112 | 0.016 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.086 | 2.135 | 0.005 | 0.086 |
| p99 | 964.271 | n/a | n/a | n/a | 4.972 | n/a | 0.000 | 0.000 | 0.748 | 961.194 | 0.213 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.195 | 4.972 | 0.060 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000054 | 964.271 | 2.127 | n/a | 0.000 | 0.000 | 0.748 | 961.194 | 0.016 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.073 | 2.127 | 0.002 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000055 | 713.355 | 3.441 | n/a | 0.000 | 0.000 | 0.743 | 708.987 | 0.017 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.086 | 3.441 | 0.005 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000057 | 329.286 | 4.972 | n/a | 0.000 | 0.000 | 0.676 | 323.112 | 0.213 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.195 | 4.972 | 0.015 | 0.195 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000053 | 35.781 | 2.135 | n/a | 0.000 | 0.000 | 0.635 | 32.843 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.094 | 2.135 | 0.060 | 0.094 | gw-r/thread-54/journal/page | none observed |

## P3 / grow3 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.644 | n/a | n/a | n/a | 3.627 | n/a | 0.000 | 0.000 | 0.644 | 72.022 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.161 | 3.627 | 0.047 | 0.161 |
| p99 | 1167.613 | n/a | n/a | n/a | 109.527 | n/a | 8.771 | 0.000 | 0.947 | 1004.589 | 0.073 | 37.504 | 0.117 | 0.000 | n/a | n/a | 6.227 | 118.298 | 0.101 | 6.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000005a | 1167.613 | 109.527 | n/a | 8.771 | 0.000 | 0.947 | 1004.589 | 0.008 | 37.504 | 0.040 | 0.000 | n/a | n/a | 6.227 | 118.298 | 0.101 | 6.227 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b50000000000000058 | 76.644 | 3.627 | n/a | 0.000 | 0.000 | 0.644 | 72.022 | 0.073 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.161 | 3.627 | 0.047 | 0.161 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h3 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 253.141 | n/a | n/a | n/a | 2.812 | n/a | 0.000 | 0.000 | 0.703 | 249.196 | 0.014 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.068 | 2.812 | 0.011 | 0.068 |
| p99 | 903.570 | n/a | n/a | n/a | 6.573 | n/a | 0.000 | 0.000 | 1.093 | 898.434 | 0.037 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.099 | 6.573 | 0.086 | 0.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000073 | 903.570 | 4.216 | n/a | 0.000 | 0.000 | 0.743 | 898.434 | 0.012 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.099 | 4.216 | 0.005 | 0.099 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b50000000000000071 | 506.710 | 3.235 | n/a | 0.000 | 0.000 | 0.684 | 502.636 | 0.013 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.083 | 3.235 | 0.006 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b50000000000000070 | 489.299 | 3.647 | n/a | 0.000 | 0.000 | 0.703 | 484.789 | 0.015 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.066 | 3.647 | 0.007 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b50000000000000067 | 260.790 | 6.573 | n/a | 0.000 | 0.000 | 1.093 | 252.867 | 0.037 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.089 | 6.573 | 0.025 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b50000000000000069 | 253.141 | 2.812 | n/a | 0.000 | 0.000 | 0.936 | 249.196 | 0.027 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.068 | 2.812 | 0.011 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b5000000000000006e | 174.528 | 2.362 | n/a | 0.000 | 0.000 | 0.566 | 171.393 | 0.032 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.066 | 2.362 | 0.014 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 7557fe358737e4b5000000000000006d | 40.385 | 1.581 | n/a | 0.000 | 0.000 | 0.738 | 37.919 | 0.011 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.068 | 1.581 | 0.039 | 0.068 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b5000000000000006a | 26.502 | 2.269 | n/a | 0.000 | 0.000 | 0.611 | 23.453 | 0.014 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.074 | 2.269 | 0.086 | 0.074 | gw-r/thread-54/journal/page | none observed |

## P3 / grow10 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 132.238 | n/a | n/a | n/a | 85.174 | n/a | 3.347 | 0.000 | 1.076 | 47.942 | 0.026 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.418 | 88.298 | 0.602 | 1.418 |
| p99 | 885.352 | n/a | n/a | n/a | 88.549 | n/a | 8.182 | 0.000 | 2.772 | 771.785 | 16.818 | 18.096 | 0.112 | 0.000 | n/a | n/a | 3.396 | 95.135 | 0.871 | 3.396 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000076 | 885.352 | 88.549 | n/a | 3.865 | 0.000 | 0.754 | 771.785 | 0.026 | 18.096 | 0.100 | 0.000 | n/a | n/a | 2.176 | 92.414 | 0.104 | 2.176 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b50000000000000077 | 174.042 | 85.174 | n/a | 3.137 | 0.000 | 1.404 | 65.857 | 16.818 | 0.000 | 0.112 | 0.000 | n/a | n/a | 1.541 | 88.311 | 0.507 | 1.541 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b50000000000000074 | 159.984 | 2.103 | n/a | 0.000 | 0.000 | 0.789 | 156.773 | 0.158 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.061 | 2.103 | 0.013 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b5000000000000007a | 155.728 | 86.953 | n/a | 8.182 | 0.000 | 1.076 | 54.950 | 1.107 | 0.000 | 0.063 | 0.000 | n/a | n/a | 3.396 | 95.135 | 0.611 | 3.396 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b50000000000000079 | 132.238 | 76.230 | n/a | 3.347 | 0.000 | 2.772 | 47.942 | 0.452 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.418 | 79.576 | 0.602 | 1.418 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b5000000000000007b | 123.941 | 78.378 | n/a | 4.871 | 0.000 | 2.035 | 30.068 | 0.020 | 7.140 | 0.102 | 0.000 | n/a | n/a | 1.326 | 83.250 | 0.672 | 1.326 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b5000000000000007d | 119.805 | 85.849 | n/a | 2.449 | 0.000 | 1.588 | 27.486 | 0.022 | 0.000 | 0.084 | 0.000 | n/a | n/a | 2.327 | 88.298 | 0.737 | 2.327 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b5000000000000007c | 108.569 | 87.418 | n/a | 7.095 | 0.000 | 0.643 | 11.981 | 0.008 | 0.000 | 0.013 | 0.000 | n/a | n/a | 1.410 | 94.513 | 0.871 | 1.410 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b50000000000000078 | 8.212 | 2.589 | n/a | 0.000 | 0.000 | 0.780 | 4.728 | 0.009 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.090 | 2.589 | 0.315 | 0.090 | gw-r/thread-51/gateway.admitted-work | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 401.682 | n/a | n/a | n/a | 2.320 | n/a | 0.000 | 0.000 | 0.696 | 391.873 | 0.016 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.062 | 2.320 | 0.006 | 0.062 |
| p99 | 1004.930 | n/a | n/a | n/a | 9.241 | n/a | 0.000 | 0.000 | 0.944 | 1001.661 | 0.117 | 6.636 | 0.193 | 0.000 | n/a | n/a | 0.112 | 9.241 | 0.473 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000089 | 1004.930 | 2.432 | n/a | 0.000 | 0.000 | 0.538 | 1001.661 | 0.049 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.057 | 2.432 | 0.002 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b5000000000000008a | 591.762 | 2.763 | n/a | 0.000 | 0.000 | 0.511 | 588.283 | 0.021 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.089 | 2.763 | 0.005 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b50000000000000084 | 411.519 | 9.241 | n/a | 0.000 | 0.000 | 0.944 | 401.150 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.112 | 9.241 | 0.022 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 7557fe358737e4b5000000000000008c | 401.682 | 2.320 | n/a | 0.000 | 0.000 | 0.696 | 391.873 | 0.016 | 6.636 | 0.076 | 0.000 | n/a | n/a | 0.066 | 2.320 | 0.006 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 7557fe358737e4b50000000000000087 | 271.667 | 2.248 | n/a | 0.000 | 0.000 | 0.743 | 268.499 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.062 | 2.248 | 0.008 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 7557fe358737e4b50000000000000085 | 4.562 | 2.160 | n/a | 0.000 | 0.000 | 0.850 | 1.352 | 0.117 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.061 | 2.160 | 0.473 | 0.061 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 740.337 | n/a | n/a | n/a | 5.451 | n/a | 0.000 | 0.000 | 1.929 | 736.725 | 0.016 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.114 | 5.451 | 0.010 | 0.114 |
| p99 | 804.787 | n/a | n/a | n/a | 7.754 | n/a | 0.000 | 0.000 | 1.936 | 794.870 | 0.119 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.144 | 7.754 | 0.021 | 0.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b50000000000000090 | 804.787 | 7.754 | n/a | 0.000 | 0.000 | 1.936 | 794.870 | 0.014 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.144 | 7.754 | 0.010 | 0.144 | gw-r/thread-55/journal/page | none observed |
| 7557fe358737e4b5000000000000008d | 740.337 | 1.989 | n/a | 0.000 | 0.000 | 1.393 | 736.725 | 0.016 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.059 | 1.989 | 0.003 | 0.059 | gw-r/thread-54/journal/page | none observed |
| 7557fe358737e4b5000000000000008f | 263.031 | 5.451 | n/a | 0.000 | 0.000 | 1.929 | 255.240 | 0.119 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.114 | 5.451 | 0.021 | 0.114 | gw-r/thread-50/journal/page | none observed |

## P3 / sweep / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.845 | n/a | n/a | n/a | 2.409 | n/a | 0.000 | 0.000 | 0.954 | 5.884 | 0.013 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.076 | 2.409 | 0.254 | 0.076 |
| p99 | 1003.001 | n/a | n/a | n/a | 10.301 | n/a | 0.000 | 0.000 | 5.409 | 1000.746 | 0.163 | 0.000 | 0.609 | 0.000 | n/a | n/a | 1.161 | 10.301 | 0.629 | 1.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7557fe358737e4b5000000000000009a | 1003.001 | 0.165 | n/a | 0.000 | 0.000 | 0.839 | 1000.746 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.161 | 0.165 | 0.000 | 1.161 | gw-r/thread-48/journal/page | none observed |
| 7557fe358737e4b50000000000000092 | 19.679 | 7.011 | n/a | 0.000 | 0.000 | 4.999 | 7.509 | 0.013 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.078 | 7.011 | 0.356 | 0.078 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7557fe358737e4b50000000000000093 | 18.710 | 6.611 | n/a | 0.000 | 0.000 | 5.409 | 6.498 | 0.037 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.076 | 6.611 | 0.353 | 0.076 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b50000000000000094 | 16.371 | 10.301 | n/a | 0.000 | 0.000 | 2.904 | 3.054 | 0.008 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.095 | 10.301 | 0.629 | 0.095 | node-14/thread-2/replica.fetch-feed | none observed |
| 7557fe358737e4b50000000000000091 | 12.157 | 5.297 | n/a | 0.000 | 0.000 | 5.016 | 1.068 | 0.039 | 0.000 | 0.609 | 0.000 | n/a | n/a | 0.128 | 5.297 | 0.436 | 0.128 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7557fe358737e4b50000000000000099 | 9.845 | 1.780 | n/a | 0.000 | 0.000 | 0.954 | 6.799 | 0.163 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.062 | 1.780 | 0.181 | 0.062 | gw-r/thread-52/gateway.admitted-work | none observed |
| 7557fe358737e4b50000000000000095 | 9.501 | 2.409 | n/a | 0.000 | 0.000 | 0.662 | 6.308 | 0.009 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.098 | 2.409 | 0.254 | 0.098 | gw-r/thread-52/gateway.admitted-work | none observed |
| 7557fe358737e4b50000000000000096 | 9.382 | 2.546 | n/a | 0.000 | 0.000 | 0.798 | 5.884 | 0.055 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.073 | 2.546 | 0.271 | 0.073 | gw-r/thread-54/gateway.admitted-work | none observed |
| 7557fe358737e4b50000000000000097 | 8.627 | 1.816 | n/a | 0.000 | 0.000 | 3.275 | 3.447 | 0.010 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.061 | 1.816 | 0.211 | 0.061 | gw-r/thread-48/gateway.admitted-work | none observed |
| 7557fe358737e4b50000000000000098 | 6.619 | 1.661 | n/a | 0.000 | 0.000 | 0.643 | 4.220 | 0.010 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.069 | 1.661 | 0.251 | 0.069 | gw-r/thread-52/gateway.admitted-work | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.325 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 1.056 | 201.047 | 0.021 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.104 | 0.043 | 0.000 | 0.104 |
| p99 | 205.901 | n/a | n/a | n/a | 0.093 | n/a | 0.000 | 0.000 | 4.428 | 201.763 | 0.147 | 0.000 | 0.576 | 0.000 | n/a | n/a | 0.338 | 0.093 | 0.001 | 0.338 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000008 | 205.901 | 0.035 | n/a | 0.000 | 0.000 | 4.428 | 201.047 | 0.025 | 0.000 | 0.261 | 0.000 | n/a | n/a | 0.104 | 0.035 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000000b | 204.189 | 0.063 | n/a | 0.000 | 0.000 | 2.352 | 201.323 | 0.024 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.202 | 0.063 | 0.000 | 0.202 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec6127000000000000000e | 203.710 | 0.050 | n/a | 0.000 | 0.000 | 1.052 | 201.763 | 0.147 | 0.000 | 0.576 | 0.000 | n/a | n/a | 0.121 | 0.050 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec6127000000000000000d | 203.321 | 0.050 | n/a | 0.000 | 0.000 | 1.151 | 201.700 | 0.076 | 0.000 | 0.260 | 0.000 | n/a | n/a | 0.085 | 0.050 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec6127000000000000000a | 202.325 | 0.043 | n/a | 0.000 | 0.000 | 0.942 | 201.002 | 0.020 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.118 | 0.043 | 0.000 | 0.118 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000011 | 202.286 | 0.037 | n/a | 0.000 | 0.000 | 0.643 | 201.363 | 0.021 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec6127000000000000000f | 202.274 | 0.031 | n/a | 0.000 | 0.000 | 1.056 | 200.906 | 0.019 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000009 | 162.424 | 0.093 | n/a | 0.000 | 0.000 | 1.634 | 160.219 | 0.015 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.338 | 0.093 | 0.001 | 0.338 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000010 | 55.959 | 0.041 | n/a | 0.000 | 0.000 | 0.913 | 54.864 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.001 | 0.072 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.973 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.876 | 200.936 | 0.014 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.103 | 0.043 | 0.000 | 0.103 |
| p99 | 202.705 | n/a | n/a | n/a | 0.061 | n/a | 0.000 | 0.000 | 1.206 | 201.325 | 0.094 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.134 | 0.061 | 0.001 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000013 | 202.705 | 0.050 | n/a | 0.000 | 0.000 | 1.206 | 201.141 | 0.014 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.108 | 0.050 | 0.000 | 0.108 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000015 | 202.597 | 0.040 | n/a | 0.000 | 0.000 | 0.876 | 201.325 | 0.094 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.094 | 0.040 | 0.000 | 0.094 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000014 | 201.973 | 0.043 | n/a | 0.000 | 0.000 | 0.716 | 200.936 | 0.014 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.134 | 0.043 | 0.000 | 0.134 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000016 | 75.982 | 0.061 | n/a | 0.000 | 0.000 | 0.977 | 74.779 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.103 | 0.061 | 0.001 | 0.103 | gw-r/thread-53/journal/page | none observed |

## P3 / L16 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.543 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 1.903 | 201.269 | 0.054 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.078 | 0.047 | 0.000 | 0.078 |
| p99 | 217.436 | n/a | n/a | n/a | 0.055 | n/a | 0.000 | 0.000 | 4.644 | 212.443 | 11.490 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.131 | 0.055 | 0.001 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000020 | 217.436 | 0.047 | n/a | 0.000 | 0.000 | 4.644 | 212.443 | 0.054 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.078 | 0.047 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000025 | 210.042 | 0.055 | n/a | 0.000 | 0.000 | 2.786 | 206.848 | 0.036 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.131 | 0.055 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000023 | 204.042 | 0.044 | n/a | 0.000 | 0.000 | 1.903 | 201.770 | 0.039 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.074 | 0.044 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000024 | 202.543 | 0.034 | n/a | 0.000 | 0.000 | 0.941 | 201.269 | 0.064 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000022 | 77.449 | 0.049 | n/a | 0.000 | 0.000 | 3.510 | 72.021 | 1.650 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.069 | 0.049 | 0.001 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000021 | 70.761 | 0.051 | n/a | 0.000 | 0.000 | 1.657 | 57.311 | 11.490 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.084 | 0.051 | 0.001 | 0.084 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 204.170 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 1.264 | 166.499 | 0.057 | 0.000 | 0.235 | 0.000 | n/a | n/a | 0.145 | 0.069 | 0.000 | 0.145 |
| p99 | 232.050 | n/a | n/a | n/a | 0.575 | n/a | 0.000 | 0.000 | 2.803 | 205.939 | 17.142 | 94.512 | 1.920 | 0.000 | n/a | n/a | 1.484 | 0.575 | 0.003 | 1.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec6127000000000000002a | 232.050 | 0.335 | n/a | 0.000 | 0.000 | 2.803 | 133.999 | 0.021 | 94.512 | 0.235 | 0.000 | n/a | n/a | 0.145 | 0.335 | 0.001 | 0.145 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000002b | 209.586 | 0.096 | n/a | 0.000 | 0.000 | 2.135 | 205.849 | 0.103 | 0.000 | 1.056 | 0.000 | n/a | n/a | 0.347 | 0.096 | 0.000 | 0.347 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000028 | 207.342 | 0.035 | n/a | 0.000 | 0.000 | 0.962 | 205.939 | 0.055 | 0.000 | 0.275 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000002e | 205.243 | 0.063 | n/a | 0.000 | 0.000 | 1.145 | 201.916 | 0.057 | 0.000 | 1.920 | 0.000 | n/a | n/a | 0.143 | 0.063 | 0.000 | 0.143 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000027 | 204.968 | 0.044 | n/a | 0.000 | 0.000 | 1.264 | 203.066 | 0.170 | 0.000 | 0.344 | 0.000 | n/a | n/a | 0.080 | 0.044 | 0.000 | 0.080 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000002f | 204.170 | 0.065 | n/a | 0.000 | 0.000 | 1.236 | 201.230 | 0.019 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.484 | 0.065 | 0.000 | 1.484 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000030 | 182.475 | 0.575 | n/a | 0.000 | 0.000 | 2.249 | 166.499 | 12.823 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.207 | 0.575 | 0.003 | 0.207 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000029 | 164.511 | 0.122 | n/a | 0.000 | 0.000 | 1.200 | 162.745 | 0.048 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.167 | 0.122 | 0.001 | 0.167 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000002d | 114.062 | 0.069 | n/a | 0.000 | 0.000 | 2.200 | 106.660 | 4.808 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.115 | 0.069 | 0.001 | 0.115 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000002c | 58.902 | 0.127 | n/a | 0.000 | 0.000 | 1.686 | 39.309 | 17.142 | 0.000 | 0.334 | 0.000 | n/a | n/a | 0.304 | 0.127 | 0.002 | 0.304 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.177 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 1.388 | 201.526 | 0.046 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.115 | 0.048 | 0.000 | 0.115 |
| p99 | 229.460 | n/a | n/a | n/a | 0.080 | n/a | 0.000 | 0.000 | 23.455 | 211.964 | 16.907 | 0.000 | 0.567 | 0.000 | n/a | n/a | 0.196 | 0.080 | 0.001 | 0.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000036 | 229.460 | 0.048 | n/a | 0.000 | 0.000 | 23.455 | 205.304 | 0.154 | 0.000 | 0.303 | 0.000 | n/a | n/a | 0.196 | 0.048 | 0.000 | 0.196 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000031 | 213.392 | 0.041 | n/a | 0.000 | 0.000 | 0.948 | 211.964 | 0.056 | 0.000 | 0.268 | 0.000 | n/a | n/a | 0.115 | 0.041 | 0.000 | 0.115 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000039 | 208.131 | 0.067 | n/a | 0.000 | 0.000 | 2.742 | 204.961 | 0.031 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.153 | 0.067 | 0.000 | 0.153 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000037 | 204.851 | 0.047 | n/a | 0.000 | 0.000 | 1.412 | 202.652 | 0.046 | 0.000 | 0.567 | 0.000 | n/a | n/a | 0.126 | 0.047 | 0.000 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000033 | 204.131 | 0.057 | n/a | 0.000 | 0.000 | 1.706 | 201.958 | 0.049 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.090 | 0.057 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000003b | 203.177 | 0.047 | n/a | 0.000 | 0.000 | 1.260 | 201.526 | 0.037 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.114 | 0.047 | 0.000 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000034 | 202.886 | 0.037 | n/a | 0.000 | 0.000 | 1.154 | 201.406 | 0.020 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.086 | 0.037 | 0.000 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000032 | 164.922 | 0.078 | n/a | 0.000 | 0.000 | 7.300 | 143.158 | 14.060 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.130 | 0.078 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000035 | 124.560 | 0.080 | n/a | 0.000 | 0.000 | 1.388 | 122.757 | 0.017 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.132 | 0.080 | 0.001 | 0.132 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000003a | 100.719 | 0.070 | n/a | 0.000 | 0.000 | 1.050 | 82.489 | 16.907 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.092 | 0.070 | 0.001 | 0.092 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.553 | n/a | n/a | n/a | 0.054 | n/a | 0.000 | 0.000 | 1.593 | 201.191 | 0.040 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.118 | 0.054 | 0.000 | 0.118 |
| p99 | 207.318 | n/a | n/a | n/a | 0.126 | n/a | 0.000 | 0.000 | 3.986 | 204.521 | 0.164 | 0.000 | 0.493 | 0.000 | n/a | n/a | 0.242 | 0.126 | 0.001 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec6127000000000000003e | 207.318 | 0.058 | n/a | 0.000 | 0.000 | 3.542 | 203.179 | 0.086 | 0.000 | 0.333 | 0.000 | n/a | n/a | 0.118 | 0.058 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec6127000000000000003d | 207.139 | 0.126 | n/a | 0.000 | 0.000 | 1.593 | 204.521 | 0.164 | 0.000 | 0.493 | 0.000 | n/a | n/a | 0.242 | 0.126 | 0.001 | 0.242 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000003f | 205.902 | 0.052 | n/a | 0.000 | 0.000 | 3.986 | 201.336 | 0.040 | 0.000 | 0.392 | 0.000 | n/a | n/a | 0.097 | 0.052 | 0.000 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000042 | 204.561 | 0.066 | n/a | 0.000 | 0.000 | 1.751 | 202.218 | 0.105 | 0.000 | 0.254 | 0.000 | n/a | n/a | 0.167 | 0.066 | 0.000 | 0.167 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000040 | 202.553 | 0.064 | n/a | 0.000 | 0.000 | 1.002 | 201.191 | 0.020 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.125 | 0.064 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000043 | 202.518 | 0.050 | n/a | 0.000 | 0.000 | 1.051 | 201.145 | 0.018 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.123 | 0.050 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000044 | 202.482 | 0.042 | n/a | 0.000 | 0.000 | 1.128 | 201.075 | 0.017 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000045 | 182.595 | 0.054 | n/a | 0.000 | 0.000 | 1.605 | 180.620 | 0.115 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.084 | 0.054 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.631 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 1.021 | 200.962 | 0.019 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.093 | 0.049 | 0.000 | 0.093 |
| p99 | 204.209 | n/a | n/a | n/a | 0.060 | n/a | 0.000 | 0.000 | 2.490 | 202.744 | 0.106 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.176 | 0.060 | 0.000 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec6127000000000000004f | 204.209 | 0.051 | n/a | 0.000 | 0.000 | 1.063 | 202.744 | 0.085 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.093 | 0.051 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec6127000000000000004d | 203.792 | 0.048 | n/a | 0.000 | 0.000 | 2.490 | 200.901 | 0.106 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.114 | 0.048 | 0.000 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec61270000000000000047 | 203.541 | 0.060 | n/a | 0.000 | 0.000 | 1.396 | 201.670 | 0.060 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.176 | 0.060 | 0.000 | 0.176 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000048 | 203.340 | 0.049 | n/a | 0.000 | 0.000 | 1.042 | 201.990 | 0.019 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.120 | 0.049 | 0.000 | 0.120 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000049 | 202.631 | 0.044 | n/a | 0.000 | 0.000 | 0.903 | 201.400 | 0.042 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.101 | 0.044 | 0.000 | 0.101 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000004e | 201.911 | 0.050 | n/a | 0.000 | 0.000 | 0.704 | 200.962 | 0.011 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.072 | 0.050 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec6127000000000000004b | 201.650 | 0.031 | n/a | 0.000 | 0.000 | 0.516 | 200.886 | 0.018 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec6127000000000000004a | 154.802 | 0.055 | n/a | 0.000 | 0.000 | 1.021 | 153.515 | 0.012 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.073 | 0.055 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.296 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 0.981 | 201.052 | 0.016 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.116 | 0.050 | 0.000 | 0.116 |
| p99 | 204.156 | n/a | n/a | n/a | 0.087 | n/a | 0.000 | 0.000 | 2.668 | 201.354 | 0.030 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.164 | 0.087 | 0.001 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000058 | 204.156 | 0.087 | n/a | 0.000 | 0.000 | 2.668 | 201.088 | 0.021 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.164 | 0.087 | 0.000 | 0.164 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000056 | 203.119 | 0.059 | n/a | 0.000 | 0.000 | 2.037 | 200.790 | 0.015 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.120 | 0.059 | 0.000 | 0.120 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000059 | 202.544 | 0.050 | n/a | 0.000 | 0.000 | 0.981 | 201.259 | 0.015 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.104 | 0.050 | 0.000 | 0.104 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000054 | 202.503 | 0.058 | n/a | 0.000 | 0.000 | 1.078 | 201.079 | 0.020 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.139 | 0.058 | 0.000 | 0.139 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec6127000000000000005b | 202.370 | 0.035 | n/a | 0.000 | 0.000 | 0.735 | 201.354 | 0.030 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000053 | 202.296 | 0.043 | n/a | 0.000 | 0.000 | 0.956 | 201.078 | 0.014 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.086 | 0.043 | 0.000 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000051 | 202.258 | 0.045 | n/a | 0.000 | 0.000 | 0.917 | 201.030 | 0.013 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000052 | 202.097 | 0.044 | n/a | 0.000 | 0.000 | 0.738 | 201.052 | 0.030 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.116 | 0.044 | 0.000 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000057 | 201.991 | 0.032 | n/a | 0.000 | 0.000 | 0.740 | 200.983 | 0.016 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.087 | 0.032 | 0.000 | 0.087 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000005a | 86.007 | 0.076 | n/a | 0.000 | 0.000 | 1.265 | 84.408 | 0.011 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.150 | 0.076 | 0.001 | 0.150 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000055 | 80.914 | 0.067 | n/a | 0.000 | 0.000 | 1.014 | 79.624 | 0.018 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.137 | 0.067 | 0.001 | 0.137 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.293 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.891 | 201.048 | 0.015 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.077 | 0.042 | 0.000 | 0.077 |
| p99 | 205.399 | n/a | n/a | n/a | 0.075 | n/a | 0.000 | 0.000 | 1.263 | 204.442 | 4.260 | 0.000 | 1.248 | 0.000 | n/a | n/a | 0.168 | 0.075 | 0.001 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000063 | 205.399 | 0.035 | n/a | 0.000 | 0.000 | 0.748 | 204.442 | 0.011 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000067 | 203.002 | 0.035 | n/a | 0.000 | 0.000 | 1.263 | 201.402 | 0.023 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.073 | 0.035 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec6127000000000000006e | 202.795 | 0.051 | n/a | 0.000 | 0.000 | 1.039 | 201.417 | 0.021 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.137 | 0.051 | 0.000 | 0.137 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec6127000000000000006c | 202.656 | 0.042 | n/a | 0.000 | 0.000 | 1.079 | 201.266 | 0.014 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.108 | 0.042 | 0.000 | 0.108 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000066 | 202.522 | 0.069 | n/a | 0.000 | 0.000 | 1.224 | 200.983 | 0.014 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.133 | 0.069 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000062 | 202.496 | 0.043 | n/a | 0.000 | 0.000 | 1.163 | 201.048 | 0.014 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.121 | 0.043 | 0.000 | 0.121 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec6127000000000000006a | 202.293 | 0.034 | n/a | 0.000 | 0.000 | 0.891 | 201.132 | 0.013 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.070 | 0.034 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000065 | 202.233 | 0.046 | n/a | 0.000 | 0.000 | 0.732 | 201.094 | 0.056 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.081 | 0.046 | 0.000 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec6127000000000000006b | 202.018 | 0.031 | n/a | 0.000 | 0.000 | 0.737 | 201.048 | 0.023 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000061 | 201.982 | 0.036 | n/a | 0.000 | 0.000 | 0.833 | 200.909 | 0.014 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000068 | 201.947 | 0.036 | n/a | 0.000 | 0.000 | 0.792 | 200.920 | 0.015 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000064 | 148.133 | 0.075 | n/a | 0.000 | 0.000 | 1.255 | 141.127 | 4.260 | 0.000 | 1.248 | 0.000 | n/a | n/a | 0.168 | 0.075 | 0.001 | 0.168 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec61270000000000000069 | 67.852 | 0.042 | n/a | 0.000 | 0.000 | 0.782 | 64.673 | 2.241 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.001 | 0.072 | gw-r/thread-51/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.136 | n/a | n/a | n/a | 0.053 | n/a | 0.000 | 0.000 | 1.086 | 189.796 | 0.027 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.082 | 0.053 | 0.000 | 0.082 |
| p99 | 205.400 | n/a | n/a | n/a | 0.956 | n/a | 0.000 | 0.000 | 3.036 | 201.955 | 140.910 | 12.189 | 0.208 | 0.000 | n/a | n/a | 0.202 | 0.956 | 0.006 | 0.202 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000071 | 205.400 | 0.034 | n/a | 0.000 | 0.000 | 3.036 | 201.955 | 0.090 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000074 | 203.344 | 0.039 | n/a | 0.000 | 0.000 | 1.086 | 189.796 | 0.020 | 12.189 | 0.131 | 0.000 | n/a | n/a | 0.082 | 0.039 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000073 | 202.263 | 0.053 | n/a | 0.000 | 0.000 | 0.948 | 200.955 | 0.096 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.097 | 0.053 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000072 | 202.136 | 0.037 | n/a | 0.000 | 0.000 | 0.582 | 201.271 | 0.021 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.079 | 0.037 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000075 | 152.036 | 0.956 | n/a | 0.000 | 0.000 | 1.286 | 8.567 | 140.910 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.202 | 0.956 | 0.006 | 0.202 | gw-r/thread-52/gateway.admission-wait | none observed |
| 717a334b9fec6127000000000000006f | 97.406 | 0.083 | n/a | 0.000 | 0.000 | 1.536 | 95.506 | 0.018 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.109 | 0.083 | 0.001 | 0.109 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000070 | 71.382 | 0.053 | n/a | 0.000 | 0.000 | 1.015 | 70.089 | 0.027 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.078 | 0.053 | 0.001 | 0.078 | gw-r/thread-55/journal/page | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.012 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.736 | 200.908 | 0.018 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.079 | 0.036 | 0.000 | 0.079 |
| p99 | 202.586 | n/a | n/a | n/a | 0.077 | n/a | 0.000 | 0.000 | 1.222 | 201.534 | 2.720 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.112 | 0.077 | 0.001 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000084 | 202.586 | 0.036 | n/a | 0.000 | 0.000 | 0.752 | 201.534 | 0.045 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.080 | 0.036 | 0.000 | 0.080 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec6127000000000000008c | 202.433 | 0.077 | n/a | 0.000 | 0.000 | 1.222 | 200.900 | 0.015 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.112 | 0.077 | 0.000 | 0.112 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec61270000000000000093 | 202.354 | 0.035 | n/a | 0.000 | 0.000 | 0.827 | 201.225 | 0.022 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.086 | 0.035 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000092 | 202.259 | 0.031 | n/a | 0.000 | 0.000 | 0.460 | 201.519 | 0.036 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.075 | 0.031 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec61270000000000000094 | 202.038 | 0.032 | n/a | 0.000 | 0.000 | 0.884 | 200.908 | 0.017 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.079 | 0.032 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec6127000000000000008b | 202.018 | 0.045 | n/a | 0.000 | 0.000 | 0.959 | 200.773 | 0.052 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.112 | 0.045 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec61270000000000000086 | 202.012 | 0.046 | n/a | 0.000 | 0.000 | 0.797 | 200.945 | 0.018 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.108 | 0.046 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec6127000000000000008e | 201.943 | 0.032 | n/a | 0.000 | 0.000 | 0.535 | 201.148 | 0.034 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec6127000000000000008f | 201.822 | 0.031 | n/a | 0.000 | 0.000 | 0.674 | 200.936 | 0.016 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000091 | 201.680 | 0.038 | n/a | 0.000 | 0.000 | 0.675 | 200.765 | 0.013 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.092 | 0.038 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec6127000000000000008a | 169.746 | 0.042 | n/a | 0.000 | 0.000 | 0.538 | 166.349 | 2.720 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.066 | 0.042 | 0.000 | 0.066 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000090 | 56.989 | 0.067 | n/a | 0.000 | 0.000 | 0.736 | 56.010 | 0.009 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.068 | 0.067 | 0.001 | 0.068 | gw-r/thread-53/journal/page | none observed |

## P3 / grow10 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.383 | n/a | n/a | n/a | 0.417 | n/a | 0.000 | 0.000 | 1.018 | 79.427 | 0.017 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.088 | 0.417 | 0.005 | 0.088 |
| p99 | 202.538 | n/a | n/a | n/a | 0.839 | n/a | 0.000 | 0.000 | 1.549 | 201.547 | 124.552 | 7.140 | 0.194 | 0.000 | n/a | n/a | 0.177 | 0.839 | 0.008 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec61270000000000000097 | 202.538 | 0.036 | n/a | 0.000 | 0.000 | 0.661 | 201.547 | 0.020 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.081 | 0.036 | 0.000 | 0.081 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000099 | 202.071 | 0.040 | n/a | 0.000 | 0.000 | 1.011 | 200.800 | 0.013 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.096 | 0.040 | 0.000 | 0.096 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec61270000000000000098 | 201.915 | 0.048 | n/a | 0.000 | 0.000 | 0.653 | 200.999 | 0.016 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.088 | 0.048 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec61270000000000000096 | 153.675 | 0.089 | n/a | 0.000 | 0.000 | 0.906 | 152.404 | 0.017 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.094 | 0.089 | 0.001 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec6127000000000000009a | 128.383 | 0.839 | n/a | 0.000 | 0.000 | 1.182 | 1.619 | 124.552 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.177 | 0.839 | 0.007 | 0.177 | gw-r/thread-52/gateway.admission-wait | none observed |
| 717a334b9fec6127000000000000009f | 81.315 | 0.464 | n/a | 0.000 | 0.000 | 1.205 | 72.286 | 0.013 | 7.140 | 0.123 | 0.000 | n/a | n/a | 0.084 | 0.464 | 0.006 | 0.084 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec6127000000000000009d | 81.063 | 0.417 | n/a | 0.000 | 0.000 | 1.018 | 79.427 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.080 | 0.417 | 0.005 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec6127000000000000009e | 62.582 | 0.422 | n/a | 0.000 | 0.000 | 1.549 | 60.408 | 0.019 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.076 | 0.422 | 0.007 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec612700000000000000a1 | 52.891 | 0.433 | n/a | 0.000 | 0.000 | 1.220 | 51.010 | 0.022 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.091 | 0.433 | 0.008 | 0.091 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.903 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.839 | 200.897 | 0.018 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 |
| p99 | 203.544 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 2.281 | 201.290 | 7.548 | 6.636 | 0.128 | 0.000 | n/a | n/a | 0.110 | 0.068 | 0.001 | 0.110 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec612700000000000000b4 | 203.544 | 0.038 | n/a | 0.000 | 0.000 | 2.281 | 201.042 | 0.014 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec612700000000000000b6 | 202.996 | 0.035 | n/a | 0.000 | 0.000 | 1.710 | 201.046 | 0.018 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec612700000000000000b3 | 202.184 | 0.034 | n/a | 0.000 | 0.000 | 0.702 | 201.216 | 0.027 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.078 | 0.034 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000af | 202.140 | 0.039 | n/a | 0.000 | 0.000 | 0.600 | 201.290 | 0.066 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.067 | 0.039 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec612700000000000000b1 | 202.069 | 0.045 | n/a | 0.000 | 0.000 | 0.889 | 200.911 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.107 | 0.045 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000b7 | 201.970 | 0.032 | n/a | 0.000 | 0.000 | 0.839 | 200.890 | 0.015 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.092 | 0.032 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec612700000000000000b2 | 201.903 | 0.032 | n/a | 0.000 | 0.000 | 0.669 | 201.029 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec612700000000000000ac | 201.850 | 0.034 | n/a | 0.000 | 0.000 | 0.723 | 200.897 | 0.014 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec612700000000000000b9 | 201.805 | 0.048 | n/a | 0.000 | 0.000 | 0.988 | 193.988 | 0.012 | 6.636 | 0.068 | 0.000 | n/a | n/a | 0.066 | 0.048 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000ad | 182.559 | 0.068 | n/a | 0.000 | 0.000 | 0.989 | 179.169 | 2.212 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.083 | 0.068 | 0.000 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 717a334b9fec612700000000000000b8 | 148.326 | 0.066 | n/a | 0.000 | 0.000 | 1.163 | 143.183 | 3.734 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.110 | 0.066 | 0.000 | 0.110 | gw-r/thread-55/journal/page | none observed |
| 717a334b9fec612700000000000000b5 | 100.625 | 0.043 | n/a | 0.000 | 0.000 | 0.645 | 99.789 | 0.023 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.069 | 0.043 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000ab | 90.025 | 0.050 | n/a | 0.000 | 0.000 | 0.650 | 81.618 | 7.548 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.085 | 0.050 | 0.001 | 0.085 | gw-r/thread-50/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.529 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 1.247 | 200.975 | 0.018 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 |
| p99 | 205.886 | n/a | n/a | n/a | 0.097 | n/a | 0.000 | 0.000 | 4.739 | 204.628 | 5.446 | 0.000 | 0.315 | 0.000 | n/a | n/a | 0.174 | 0.097 | 0.002 | 0.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec612700000000000000c1 | 205.886 | 0.038 | n/a | 0.000 | 0.000 | 1.000 | 204.628 | 0.021 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.074 | 0.038 | 0.000 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec612700000000000000c3 | 205.800 | 0.056 | n/a | 0.000 | 0.000 | 4.196 | 201.263 | 0.018 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.119 | 0.056 | 0.000 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 717a334b9fec612700000000000000c2 | 203.408 | 0.048 | n/a | 0.000 | 0.000 | 1.404 | 201.604 | 0.050 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.100 | 0.048 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000bd | 202.849 | 0.078 | n/a | 0.000 | 0.000 | 1.189 | 201.284 | 0.015 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.149 | 0.078 | 0.000 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec612700000000000000bc | 202.649 | 0.032 | n/a | 0.000 | 0.000 | 1.577 | 200.857 | 0.016 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.068 | 0.032 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec612700000000000000bb | 202.529 | 0.039 | n/a | 0.000 | 0.000 | 0.867 | 201.393 | 0.021 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.079 | 0.039 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 717a334b9fec612700000000000000bf | 202.169 | 0.050 | n/a | 0.000 | 0.000 | 0.941 | 200.975 | 0.018 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 | gw-r/thread-51/journal/page | none observed |
| 717a334b9fec612700000000000000ba | 176.370 | 0.074 | n/a | 0.000 | 0.000 | 1.677 | 174.361 | 0.008 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.174 | 0.074 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 717a334b9fec612700000000000000c4 | 122.169 | 0.050 | n/a | 0.000 | 0.000 | 4.739 | 111.765 | 5.446 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.089 | 0.050 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 717a334b9fec612700000000000000be | 52.448 | 0.097 | n/a | 0.000 | 0.000 | 1.247 | 49.039 | 1.624 | 0.000 | 0.315 | 0.000 | n/a | n/a | 0.127 | 0.097 | 0.002 | 0.127 | gw-r/thread-51/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.859 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 0.734 | 200.857 | 0.016 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.086 | 0.079 | 0.000 | 0.086 |
| p99 | 201.859 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 0.734 | 200.857 | 0.016 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.086 | 0.079 | 0.000 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 717a334b9fec612700000000000000ce | 201.859 | 0.079 | n/a | 0.000 | 0.000 | 0.734 | 200.857 | 0.016 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.086 | 0.079 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

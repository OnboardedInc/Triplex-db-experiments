# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (134.241 ms, trace `262d64311a3ff3e900000000000000b4`); `gw-w/thread-61/peer.transact-await (includes order/network/storage)` (105.076 ms, trace `262d64311a3ff3e9000000000000013f`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (96.351 ms, trace `262d64311a3ff3e9000000000000013e`); `gw-w/thread-62/peer.transact-await (includes order/network/storage)` (86.334 ms, trace `262d64311a3ff3e9000000000000013d`); `gw-w/thread-41/peer.transact-await (includes order/network/storage)` (87.734 ms, trace `262d64311a3ff3e9000000000000013c`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p3-smoke-a`; source `3f59403d87c87549399afea0b842c639a2dec389`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 83/83 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 83/83. Raw trace bytes: 769533.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 97 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1278.382 | 185.532 | 231.662 | 36 |
| baseline | 0 | 1999.862 | 30.499 | 1.962 | 33 |
| L1 | 1 | 1977.222 | 143.604 | 12.961 | 44 |
| L4 | 4 | 1978.423 | 235.504 | 225.033 | 44 |
| L16 | 16 | 1960.544 | 210.506 | 218.255 | 44 |
| L64 | 16 | 1935.199 | 198.259 | 215.267 | 44 |
| L256 | 16 | 1891.049 | 183.555 | 196.041 | 58 |
| L1024 | 16 | 1888.334 | 238.987 | 314.463 | 16 |
| recovery | 16 | 1960.836 | 199.700 | 256.297 | 44 |
| p4mix | 1 | 1980.815 | 37.392 | 35.045 | 43 |
| p4h1 | 1 | 1033.854 | 13.826 | 7.702 | 16 |
| grow3 | 0 | 421.501 | 12.557 | 0.031 | 36 |
| p4h3 | 1 | 2176.230 | 61.093 | 27.614 | 122 |
| grow10 | 0 | 97.534 | 27.673 | 18.487 | 22 |
| p4h10 | 1 | 1047.492 | 27.136 | 9.225 | 58 |
| presweep | 16 | 1028.437 | 93.686 | 133.352 | 30 |
| sweep | 16 | 87.517 | 26.433 | 9.750 | 100 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 262d64311a3ff3e900000000000000b4 | driver.queue.scheduler-late | 1.287 | none | 0 / 32 |
| 262d64311a3ff3e900000000000000b4 | driver.queue.scheduler-dispatch | 0.053 | none | 0 / 32 |

Observed active steps while trace 262d64311a3ff3e900000000000000b4 waited: []

| 262d64311a3ff3e9000000000000013f | driver.queue.scheduler-dispatch | 0.005 | none | 9 / 32 |
| 262d64311a3ff3e9000000000000013f | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 262d64311a3ff3e9000000000000013f waited: []

| 262d64311a3ff3e9000000000000013e | driver.queue.scheduler-dispatch | 0.006 | none | 8 / 32 |

Observed active steps while trace 262d64311a3ff3e9000000000000013e waited: []

| 262d64311a3ff3e9000000000000013d | driver.queue.scheduler-dispatch | 0.007 | none | 7 / 32 |

Observed active steps while trace 262d64311a3ff3e9000000000000013d waited: []

| 262d64311a3ff3e9000000000000013c | driver.queue.scheduler-dispatch | 0.005 | none | 6 / 32 |

Observed active steps while trace 262d64311a3ff3e9000000000000013c waited: []

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.166 | 1.137 | 0.000 | 2.111 | 10.456 | 0.010 | 0.000 | 0.503 | 1.126 | 8.273 | 0.136 | n/a | 3.549 | 11.639 | n/a | n/a | 0.083 | 10.968 | 0.280 | 0.083 |
| p99 | 44.957 | 4.256 | 0.046 | 4.977 | 21.033 | 0.748 | 0.000 | 1.085 | 3.129 | 11.321 | 0.161 | n/a | 3.807 | 15.729 | n/a | n/a | 0.427 | 21.893 | 0.487 | 0.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000094 | 44.957 | 21.033 | 0.748 | 0.000 | 0.112 | 3.129 | 8.273 | 0.161 | n/a | 0.337 | 11.082 | n/a | n/a | 0.083 | 21.893 | 0.487 | 0.083 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000092 | 39.166 | 10.456 | 0.009 | 0.000 | 0.503 | 1.126 | 11.321 | 0.136 | n/a | 3.549 | 11.639 | n/a | n/a | 0.427 | 10.968 | 0.280 | 0.427 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000096 | 27.609 | 4.603 | 0.010 | 0.000 | 1.085 | 0.969 | 1.291 | 0.039 | n/a | 3.807 | 15.729 | n/a | n/a | 0.076 | 5.698 | 0.206 | 0.076 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.609 | 0.963 | 0.046 | 2.111 | 4.603 | 0.010 | 0.000 | 1.085 | 0.969 | 1.291 | 0.039 | n/a | 3.807 | 15.729 | n/a | n/a | 0.076 | 5.698 | 0.206 | 0.076 |
| p99 | 27.609 | 0.963 | 0.046 | 2.111 | 4.603 | 0.010 | 0.000 | 1.085 | 0.969 | 1.291 | 0.039 | n/a | 3.807 | 15.729 | n/a | n/a | 0.076 | 5.698 | 0.206 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000096 | 27.609 | 4.603 | 0.010 | 0.000 | 1.085 | 0.969 | 1.291 | 0.039 | n/a | 3.807 | 15.729 | n/a | n/a | 0.076 | 5.698 | 0.206 | 0.076 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.186 | 0.200 | 0.000 | 0.495 | 4.748 | 0.198 | 0.000 | 0.062 | 2.125 | 2.020 | 0.050 | n/a | 0.696 | 8.396 | n/a | n/a | 0.053 | 5.062 | 0.281 | 0.053 |
| p99 | 25.210 | 1.518 | 0.000 | 2.317 | 7.132 | 0.877 | 0.000 | 0.424 | 2.935 | 4.470 | 0.137 | n/a | 2.445 | 10.259 | n/a | n/a | 0.207 | 7.392 | 0.318 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000098 | 25.210 | 6.160 | 0.877 | 0.000 | 0.058 | 2.550 | 4.470 | 0.055 | n/a | 0.696 | 10.259 | n/a | n/a | 0.085 | 7.095 | 0.281 | 0.085 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000009e | 23.378 | 7.132 | 0.198 | 0.000 | 0.062 | 2.935 | 2.020 | 0.137 | n/a | 2.445 | 8.396 | n/a | n/a | 0.053 | 7.392 | 0.316 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000009a | 17.186 | 4.278 | 0.005 | 0.000 | 0.424 | 0.771 | 1.429 | 0.042 | n/a | 1.120 | 8.910 | n/a | n/a | 0.207 | 4.706 | 0.274 | 0.207 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000009c | 15.920 | 4.748 | 0.248 | 0.000 | 0.066 | 2.125 | 2.702 | 0.050 | n/a | 0.257 | 5.672 | n/a | n/a | 0.052 | 5.062 | 0.318 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.186 | 1.518 | 0.000 | 2.317 | 4.278 | 0.005 | 0.000 | 0.424 | 0.771 | 1.429 | 0.042 | n/a | 1.120 | 8.910 | n/a | n/a | 0.207 | 4.706 | 0.274 | 0.207 |
| p99 | 17.186 | 1.518 | 0.000 | 2.317 | 4.278 | 0.005 | 0.000 | 0.424 | 0.771 | 1.429 | 0.042 | n/a | 1.120 | 8.910 | n/a | n/a | 0.207 | 4.706 | 0.274 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e9000000000000009a | 17.186 | 4.278 | 0.005 | 0.000 | 0.424 | 0.771 | 1.429 | 0.042 | n/a | 1.120 | 8.910 | n/a | n/a | 0.207 | 4.706 | 0.274 | 0.207 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.064 | 0.294 | 0.000 | 0.354 | 4.407 | 0.009 | 0.000 | 0.190 | 1.006 | 3.276 | 0.106 | n/a | 0.354 | 10.067 | n/a | n/a | 0.052 | 4.877 | 0.189 | 0.052 |
| p99 | 32.681 | 1.496 | 0.000 | 2.245 | 6.393 | 0.218 | 0.000 | 0.253 | 5.654 | 5.723 | 0.136 | n/a | 1.694 | 17.329 | n/a | n/a | 0.061 | 6.651 | 0.316 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000a4 | 32.681 | 4.780 | 0.149 | 0.000 | 0.068 | 5.654 | 4.334 | 0.063 | n/a | 0.259 | 17.329 | n/a | n/a | 0.045 | 4.997 | 0.153 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000a7 | 21.656 | 4.407 | 0.218 | 0.000 | 0.253 | 1.602 | 3.276 | 0.106 | n/a | 0.660 | 11.082 | n/a | n/a | 0.052 | 4.877 | 0.225 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000a1 | 21.064 | 6.393 | 0.009 | 0.000 | 0.250 | 1.006 | 1.448 | 0.136 | n/a | 1.694 | 10.067 | n/a | n/a | 0.061 | 6.651 | 0.316 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000009f | 19.397 | 3.479 | 0.005 | 0.000 | 0.190 | 0.860 | 5.723 | 0.107 | n/a | 0.354 | 8.619 | n/a | n/a | 0.061 | 3.673 | 0.189 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.397 | 1.496 | 0.000 | 1.627 | 3.479 | 0.005 | 0.000 | 0.190 | 0.860 | 5.723 | 0.107 | n/a | 0.354 | 8.619 | n/a | n/a | 0.061 | 3.673 | 0.189 | 0.061 |
| p99 | 19.397 | 1.496 | 0.000 | 1.627 | 3.479 | 0.005 | 0.000 | 0.190 | 0.860 | 5.723 | 0.107 | n/a | 0.354 | 8.619 | n/a | n/a | 0.061 | 3.673 | 0.189 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e9000000000000009f | 19.397 | 3.479 | 0.005 | 0.000 | 0.190 | 0.860 | 5.723 | 0.107 | n/a | 0.354 | 8.619 | n/a | n/a | 0.061 | 3.673 | 0.189 | 0.061 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.974 | 0.351 | 0.000 | 0.359 | 5.382 | 0.008 | 0.000 | 0.066 | 0.833 | 3.726 | 0.079 | n/a | 0.279 | 22.104 | n/a | n/a | 0.037 | 5.781 | 0.191 | 0.037 |
| p99 | 43.836 | 2.871 | 0.000 | 4.163 | 8.785 | 0.392 | 0.000 | 0.681 | 4.936 | 9.140 | 0.141 | n/a | 1.082 | 25.346 | n/a | n/a | 0.046 | 9.237 | 0.231 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000ad | 43.836 | 5.382 | 0.333 | 0.000 | 0.066 | 3.110 | 9.140 | 0.141 | n/a | 0.279 | 25.346 | n/a | n/a | 0.037 | 5.781 | 0.132 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000b0 | 39.989 | 8.785 | 0.392 | 0.000 | 0.060 | 4.936 | 3.321 | 0.079 | n/a | 0.276 | 22.104 | n/a | n/a | 0.037 | 9.237 | 0.231 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000a8 | 36.974 | 7.278 | 0.005 | 0.000 | 0.117 | 0.833 | 3.726 | 0.047 | n/a | 0.729 | 24.194 | n/a | n/a | 0.046 | 7.400 | 0.200 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000ab | 27.736 | 4.607 | 0.008 | 0.000 | 0.681 | 0.578 | 6.241 | 0.092 | n/a | 1.082 | 14.417 | n/a | n/a | 0.031 | 5.295 | 0.191 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.177 | 0.000 | 0.000 | 0.339 | 3.475 | 0.005 | 0.000 | 0.056 | 0.761 | 11.586 | 0.058 | n/a | 0.275 | 50.273 | n/a | n/a | 0.032 | 4.812 | 0.045 | 0.032 |
| p99 | 160.143 | 0.558 | 0.000 | 1.878 | 6.690 | 0.256 | 0.392 | 1.340 | 2.000 | 24.410 | 0.104 | n/a | 2.198 | 134.241 | n/a | n/a | 0.040 | 7.390 | 0.113 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000b4 | 160.143 | 3.467 | 0.005 | 0.000 | 1.340 | 0.739 | 19.982 | 0.058 | n/a | 0.275 | 134.241 | n/a | n/a | 0.036 | 4.812 | 0.030 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000b6 | 80.669 | 3.475 | 0.004 | 0.000 | 0.159 | 0.761 | 11.586 | 0.067 | n/a | 0.269 | 64.307 | n/a | n/a | 0.040 | 3.639 | 0.045 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000ba | 65.177 | 6.690 | 0.256 | 0.392 | 0.052 | 2.000 | 24.410 | 0.104 | n/a | 2.198 | 29.043 | n/a | n/a | 0.031 | 7.390 | 0.113 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000b2 | 59.973 | 4.817 | 0.184 | 0.326 | 0.056 | 1.600 | 1.945 | 0.045 | n/a | 0.696 | 50.273 | n/a | n/a | 0.032 | 5.383 | 0.090 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.669 | 0.361 | 0.000 | 1.600 | 3.467 | 0.004 | 0.000 | 0.159 | 0.739 | 11.586 | 0.058 | n/a | 0.269 | 64.307 | n/a | n/a | 0.036 | 3.639 | 0.030 | 0.036 |
| p99 | 160.143 | 0.558 | 0.000 | 1.878 | 3.475 | 0.005 | 0.000 | 1.340 | 0.761 | 19.982 | 0.067 | n/a | 0.275 | 134.241 | n/a | n/a | 0.040 | 4.812 | 0.045 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000b4 | 160.143 | 3.467 | 0.005 | 0.000 | 1.340 | 0.739 | 19.982 | 0.058 | n/a | 0.275 | 134.241 | n/a | n/a | 0.036 | 4.812 | 0.030 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000b6 | 80.669 | 3.475 | 0.004 | 0.000 | 0.159 | 0.761 | 11.586 | 0.067 | n/a | 0.269 | 64.307 | n/a | n/a | 0.040 | 3.639 | 0.045 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.899 | n/a | n/a | n/a | 4.558 | 1.860 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.885 | 0.997 | 0.015 |
| p99 | 94.931 | n/a | n/a | n/a | 25.414 | 20.032 | 2.352 | 0.000 | 2.935 | 52.939 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 41.919 | 39.014 | 0.999 | 41.919 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000118 | 94.931 | 22.814 | 16.201 | 0.000 | 0.000 | 2.935 | 52.939 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.015 | 39.014 | 0.411 | 0.015 | gw-w/thread-46/gateway.admitted-work | client.encode 2.636ms |
| 262d64311a3ff3e900000000000000b7 | 58.090 | 13.732 | 2.106 | 0.000 | 0.000 | 0.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.919 | 15.838 | 0.273 | 41.919 | node-14/thread-0/socket.wait-first-byte | none observed |
| 262d64311a3ff3e90000000000000093 | 28.943 | 25.414 | 1.115 | 2.352 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.063 | 28.880 | 0.998 | 0.063 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e9000000000000012c | 20.746 | 0.694 | 20.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 20.727 | 0.999 | 0.019 | node-14/thread-0/rpc.replica.observe | driver.publication 1.293ms |
| 262d64311a3ff3e900000000000000b5 | 11.634 | 11.445 | 0.172 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 11.617 | 0.999 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e900000000000000d7 | 9.553 | 9.427 | 0.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 9.541 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e900000000000000fb | 9.099 | 0.238 | 8.847 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 9.085 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| 262d64311a3ff3e90000000000000106 | 8.569 | 8.481 | 0.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 8.536 | 0.996 | 0.032 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e90000000000000100 | 8.312 | 8.217 | 0.072 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 8.289 | 0.997 | 0.023 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e900000000000000a9 | 7.930 | 0.626 | 7.287 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 7.913 | 0.998 | 0.017 | node-14/thread-0/rpc.replica.observe | none observed |
| 262d64311a3ff3e90000000000000128 | 7.899 | 7.617 | 0.269 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.885 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e9000000000000010a | 7.400 | 0.153 | 7.234 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.387 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| 262d64311a3ff3e90000000000000133 | 7.073 | 4.935 | 2.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.055 | 0.997 | 0.018 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e900000000000000a2 | 6.129 | 0.395 | 5.724 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 6.118 | 0.998 | 0.011 | node-14/thread-0/rpc.replica.observe | none observed |
| 262d64311a3ff3e900000000000000c5 | 6.021 | 1.613 | 4.381 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.993 | 0.995 | 0.028 | node-14/thread-0/rpc.replica.observe | none observed |
| 262d64311a3ff3e900000000000000e3 | 5.481 | 5.393 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.466 | 0.997 | 0.015 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e90000000000000097 | 5.159 | 3.286 | 1.860 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 5.146 | 0.998 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e90000000000000110 | 4.692 | 4.558 | 0.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.679 | 0.997 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e9000000000000010c | 4.568 | 4.398 | 0.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.556 | 0.997 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 262d64311a3ff3e900000000000000da | 4.390 | 0.223 | 4.154 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.377 | 0.997 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 53.688 | 0.401 | 0.000 | 0.729 | 5.716 | 0.010 | 0.000 | 0.091 | 1.466 | 10.116 | 0.050 | n/a | 0.633 | 29.705 | n/a | n/a | 0.044 | 6.669 | 0.118 | 0.044 |
| p99 | 108.748 | 2.412 | 3.101 | 6.604 | 10.783 | 0.456 | 0.713 | 0.805 | 6.061 | 27.397 | 0.146 | n/a | 3.438 | 68.160 | n/a | n/a | 0.055 | 11.598 | 0.216 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000c3 | 108.748 | 5.986 | 0.409 | 0.713 | 0.091 | 2.353 | 27.397 | 0.146 | n/a | 3.438 | 68.160 | n/a | n/a | 0.055 | 7.199 | 0.066 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000be | 56.332 | 5.716 | 0.456 | 0.411 | 0.086 | 6.061 | 12.183 | 0.050 | n/a | 1.612 | 29.705 | n/a | n/a | 0.051 | 6.669 | 0.118 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000bc | 53.688 | 10.783 | 0.010 | 0.000 | 0.805 | 1.466 | 10.116 | 0.096 | n/a | 0.385 | 29.984 | n/a | n/a | 0.044 | 11.598 | 0.216 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000c0 | 22.574 | 3.995 | 0.005 | 0.000 | 0.181 | 0.792 | 1.084 | 0.033 | n/a | 0.633 | 15.813 | n/a | n/a | 0.037 | 4.181 | 0.185 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.574 | 0.887 | 0.000 | 2.470 | 3.995 | 0.005 | 0.000 | 0.181 | 0.792 | 1.084 | 0.033 | n/a | 0.633 | 15.813 | n/a | n/a | 0.037 | 4.181 | 0.185 | 0.037 |
| p99 | 22.574 | 0.887 | 0.000 | 2.470 | 3.995 | 0.005 | 0.000 | 0.181 | 0.792 | 1.084 | 0.033 | n/a | 0.633 | 15.813 | n/a | n/a | 0.037 | 4.181 | 0.185 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000c0 | 22.574 | 3.995 | 0.005 | 0.000 | 0.181 | 0.792 | 1.084 | 0.033 | n/a | 0.633 | 15.813 | n/a | n/a | 0.037 | 4.181 | 0.185 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.174 | 0.764 | 0.000 | 1.888 | 4.798 | 0.010 | 0.000 | 0.329 | 1.946 | 4.952 | 0.055 | n/a | 0.415 | 18.792 | n/a | n/a | 0.049 | 5.622 | 0.227 | 0.049 |
| p99 | 113.186 | 1.261 | 0.080 | 2.626 | 7.871 | 0.256 | 0.393 | 0.814 | 3.483 | 30.122 | 0.188 | n/a | 0.507 | 72.201 | n/a | n/a | 0.077 | 8.519 | 0.268 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000ce | 113.186 | 6.029 | 0.256 | 0.393 | 0.062 | 3.483 | 30.122 | 0.188 | n/a | 0.415 | 72.201 | n/a | n/a | 0.036 | 6.740 | 0.060 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000c7 | 37.509 | 7.871 | 0.252 | 0.338 | 0.059 | 1.946 | 6.901 | 0.105 | n/a | 0.507 | 19.495 | n/a | n/a | 0.036 | 8.519 | 0.227 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000c4 | 26.174 | 3.918 | 0.005 | 0.000 | 0.679 | 1.109 | 1.363 | 0.035 | n/a | 0.224 | 18.792 | n/a | n/a | 0.049 | 4.603 | 0.176 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000cc | 20.974 | 4.798 | 0.010 | 0.000 | 0.814 | 2.812 | 2.224 | 0.035 | n/a | 0.474 | 9.731 | n/a | n/a | 0.077 | 5.622 | 0.268 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000ca | 19.125 | 4.627 | 0.009 | 0.000 | 0.329 | 1.026 | 4.952 | 0.055 | n/a | 0.222 | 7.844 | n/a | n/a | 0.060 | 4.964 | 0.260 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.974 | 1.261 | 0.000 | 2.143 | 4.627 | 0.009 | 0.000 | 0.679 | 1.109 | 2.224 | 0.035 | n/a | 0.224 | 9.731 | n/a | n/a | 0.060 | 4.964 | 0.260 | 0.060 |
| p99 | 26.174 | 1.261 | 0.000 | 2.626 | 4.798 | 0.010 | 0.000 | 0.814 | 2.812 | 4.952 | 0.055 | n/a | 0.474 | 18.792 | n/a | n/a | 0.077 | 5.622 | 0.268 | 0.077 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000c4 | 26.174 | 3.918 | 0.005 | 0.000 | 0.679 | 1.109 | 1.363 | 0.035 | n/a | 0.224 | 18.792 | n/a | n/a | 0.049 | 4.603 | 0.176 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000cc | 20.974 | 4.798 | 0.010 | 0.000 | 0.814 | 2.812 | 2.224 | 0.035 | n/a | 0.474 | 9.731 | n/a | n/a | 0.077 | 5.622 | 0.268 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000ca | 19.125 | 4.627 | 0.009 | 0.000 | 0.329 | 1.026 | 4.952 | 0.055 | n/a | 0.222 | 7.844 | n/a | n/a | 0.060 | 4.964 | 0.260 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.650 | 0.000 | 0.000 | 0.301 | 3.968 | 0.203 | 0.238 | 0.063 | 1.562 | 10.042 | 0.066 | n/a | 0.242 | 23.097 | n/a | n/a | 0.038 | 4.593 | 0.081 | 0.038 |
| p99 | 61.559 | 0.000 | 0.000 | 0.313 | 4.464 | 0.227 | 0.311 | 0.087 | 3.359 | 27.172 | 0.070 | n/a | 0.684 | 25.271 | n/a | n/a | 0.043 | 4.968 | 0.116 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000d0 | 61.559 | 4.464 | 0.203 | 0.238 | 0.063 | 3.359 | 27.172 | 0.066 | n/a | 0.684 | 25.271 | n/a | n/a | 0.038 | 4.968 | 0.081 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 1.685ms |
| 262d64311a3ff3e900000000000000d3 | 39.650 | 3.968 | 0.227 | 0.311 | 0.087 | 1.562 | 10.042 | 0.070 | n/a | 0.242 | 23.097 | n/a | n/a | 0.043 | 4.593 | 0.116 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.522 | 0.249 | 0.000 | 0.387 | 5.713 | 0.009 | 0.000 | 0.084 | 1.113 | 4.358 | 0.034 | n/a | 0.553 | 14.480 | n/a | n/a | 0.047 | 5.929 | 0.165 | 0.047 |
| p99 | 93.008 | 1.032 | 0.000 | 2.106 | 8.013 | 0.718 | 0.000 | 0.207 | 3.358 | 18.254 | 0.164 | n/a | 0.743 | 63.215 | n/a | n/a | 0.055 | 8.819 | 0.224 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000d5 | 93.008 | 8.013 | 0.718 | 0.000 | 0.088 | 2.096 | 18.254 | 0.164 | n/a | 0.404 | 63.215 | n/a | n/a | 0.055 | 8.819 | 0.095 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000db | 41.449 | 7.673 | 0.257 | 0.000 | 0.065 | 3.358 | 15.595 | 0.142 | n/a | 0.599 | 13.714 | n/a | n/a | 0.047 | 7.995 | 0.193 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000d9 | 26.522 | 5.713 | 0.009 | 0.000 | 0.207 | 1.113 | 4.358 | 0.034 | n/a | 0.553 | 14.480 | n/a | n/a | 0.054 | 5.929 | 0.224 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000d6 | 21.088 | 3.392 | 0.005 | 0.000 | 0.084 | 0.979 | 1.162 | 0.033 | n/a | 0.743 | 14.654 | n/a | n/a | 0.037 | 3.481 | 0.165 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.522 | 1.032 | 0.000 | 2.106 | 5.713 | 0.009 | 0.000 | 0.207 | 1.113 | 4.358 | 0.034 | n/a | 0.553 | 14.480 | n/a | n/a | 0.054 | 5.929 | 0.224 | 0.054 |
| p99 | 26.522 | 1.032 | 0.000 | 2.106 | 5.713 | 0.009 | 0.000 | 0.207 | 1.113 | 4.358 | 0.034 | n/a | 0.553 | 14.480 | n/a | n/a | 0.054 | 5.929 | 0.224 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000d9 | 26.522 | 5.713 | 0.009 | 0.000 | 0.207 | 1.113 | 4.358 | 0.034 | n/a | 0.553 | 14.480 | n/a | n/a | 0.054 | 5.929 | 0.224 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.072 | 0.000 | 0.000 | 0.355 | 5.891 | 0.242 | 0.000 | 0.066 | 1.917 | 7.209 | 0.069 | n/a | 0.353 | 10.854 | n/a | n/a | 0.043 | 6.812 | 0.252 | 0.043 |
| p99 | 30.976 | 0.000 | 0.000 | 0.520 | 6.089 | 2.075 | 0.000 | 0.718 | 6.279 | 9.773 | 0.379 | n/a | 0.459 | 16.487 | n/a | n/a | 0.047 | 8.032 | 0.373 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000de | 30.976 | 4.295 | 0.242 | 0.000 | 0.057 | 1.917 | 7.209 | 0.379 | n/a | 0.353 | 16.487 | n/a | n/a | 0.037 | 4.594 | 0.148 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000dc | 27.072 | 6.089 | 0.004 | 0.000 | 0.718 | 6.279 | 9.773 | 0.069 | n/a | 0.459 | 3.637 | n/a | n/a | 0.043 | 6.812 | 0.252 | 0.043 | gw-w/thread-43/storage/begin-command! | none observed |
| 262d64311a3ff3e900000000000000e0 | 21.529 | 5.891 | 2.075 | 0.000 | 0.066 | 0.913 | 1.365 | 0.045 | n/a | 0.272 | 10.854 | n/a | n/a | 0.047 | 8.032 | 0.373 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.072 | 0.000 | 0.000 | 0.287 | 6.089 | 0.004 | 0.000 | 0.718 | 6.279 | 9.773 | 0.069 | n/a | 0.459 | 3.637 | n/a | n/a | 0.043 | 6.812 | 0.252 | 0.043 |
| p99 | 27.072 | 0.000 | 0.000 | 0.287 | 6.089 | 0.004 | 0.000 | 0.718 | 6.279 | 9.773 | 0.069 | n/a | 0.459 | 3.637 | n/a | n/a | 0.043 | 6.812 | 0.252 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000dc | 27.072 | 6.089 | 0.004 | 0.000 | 0.718 | 6.279 | 9.773 | 0.069 | n/a | 0.459 | 3.637 | n/a | n/a | 0.043 | 6.812 | 0.252 | 0.043 | gw-w/thread-43/storage/begin-command! | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.924 | 0.505 | 0.000 | 0.653 | 3.794 | 0.012 | 0.000 | 0.119 | 0.994 | 1.957 | 0.045 | n/a | 0.581 | 12.362 | n/a | n/a | 0.040 | 4.546 | 0.186 | 0.040 |
| p99 | 36.585 | 1.574 | 2.397 | 5.279 | 8.382 | 0.255 | 0.382 | 1.125 | 3.782 | 14.484 | 0.091 | n/a | 4.675 | 29.058 | n/a | n/a | 0.071 | 8.752 | 0.316 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000fa | 36.585 | 3.770 | 0.157 | 0.308 | 0.058 | 0.994 | 1.576 | 0.047 | n/a | 0.581 | 29.058 | n/a | n/a | 0.036 | 4.292 | 0.117 | 0.036 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.319ms |
| 262d64311a3ff3e900000000000000e5 | 33.705 | 3.794 | 0.255 | 0.378 | 0.119 | 2.671 | 14.484 | 0.079 | n/a | 0.393 | 11.469 | n/a | n/a | 0.064 | 4.546 | 0.135 | 0.064 | gw-w/thread-48/gateway.admitted-work | none observed |
| 262d64311a3ff3e90000000000000124 | 33.473 | 3.725 | 0.219 | 0.260 | 0.073 | 2.912 | 9.009 | 0.063 | n/a | 0.728 | 16.445 | n/a | n/a | 0.039 | 4.277 | 0.128 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000f9 | 32.622 | 5.355 | 0.005 | 0.000 | 0.466 | 0.691 | 1.957 | 0.035 | n/a | 4.675 | 19.403 | n/a | n/a | 0.036 | 5.826 | 0.179 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000e2 | 29.851 | 8.382 | 0.012 | 0.000 | 0.358 | 0.933 | 2.052 | 0.032 | n/a | 1.565 | 16.479 | n/a | n/a | 0.038 | 8.752 | 0.293 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000f6 | 23.924 | 3.922 | 0.005 | 0.000 | 0.741 | 0.792 | 1.140 | 0.035 | n/a | 2.988 | 14.254 | n/a | n/a | 0.047 | 4.668 | 0.195 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000120 | 21.627 | 4.392 | 0.201 | 0.361 | 0.074 | 3.782 | 6.286 | 0.091 | n/a | 0.440 | 5.960 | n/a | n/a | 0.040 | 5.028 | 0.233 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000f5 | 19.742 | 5.507 | 0.238 | 0.382 | 0.103 | 3.703 | 2.642 | 0.075 | n/a | 0.646 | 6.375 | n/a | n/a | 0.071 | 6.230 | 0.316 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000fd | 18.166 | 3.212 | 0.005 | 0.000 | 0.160 | 0.777 | 1.276 | 0.045 | n/a | 0.289 | 12.362 | n/a | n/a | 0.040 | 3.378 | 0.186 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000122 | 15.333 | 3.130 | 0.005 | 0.000 | 1.125 | 1.084 | 1.041 | 0.033 | n/a | 0.539 | 8.331 | n/a | n/a | 0.044 | 4.260 | 0.278 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.550 | 0.000 | 0.000 | 0.307 | 3.370 | 0.195 | 0.000 | 0.065 | 0.837 | 1.287 | 0.035 | n/a | 0.254 | 27.029 | n/a | n/a | 0.049 | 4.052 | 0.076 | 0.049 |
| p99 | 61.670 | 0.000 | 0.000 | 0.531 | 4.383 | 0.232 | 0.386 | 0.101 | 1.969 | 14.112 | 0.100 | n/a | 0.438 | 40.323 | n/a | n/a | 0.055 | 4.680 | 0.121 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000e7 | 61.670 | 4.383 | 0.232 | 0.000 | 0.065 | 1.969 | 14.112 | 0.100 | n/a | 0.438 | 40.323 | n/a | n/a | 0.049 | 4.680 | 0.076 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000e9 | 33.550 | 3.370 | 0.195 | 0.386 | 0.101 | 0.837 | 1.287 | 0.035 | n/a | 0.254 | 27.029 | n/a | n/a | 0.055 | 4.052 | 0.121 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.749 | 0.922 | 0.000 | 1.868 | 4.010 | 0.009 | 0.000 | 0.097 | 1.597 | 1.728 | 0.061 | n/a | 0.290 | 23.396 | n/a | n/a | 0.037 | 4.541 | 0.129 | 0.037 |
| p99 | 49.948 | 1.238 | 0.000 | 1.913 | 5.306 | 0.288 | 0.386 | 1.134 | 2.136 | 2.011 | 7.277 | n/a | 1.531 | 32.665 | n/a | n/a | 0.043 | 6.077 | 0.165 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000ee | 49.948 | 5.306 | 0.288 | 0.386 | 0.097 | 1.597 | 2.011 | 7.277 | n/a | 0.278 | 32.665 | n/a | n/a | 0.043 | 6.077 | 0.122 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000ec | 31.749 | 4.010 | 0.009 | 0.000 | 0.086 | 2.136 | 1.728 | 0.057 | n/a | 0.290 | 23.396 | n/a | n/a | 0.037 | 4.106 | 0.129 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e900000000000000ef | 27.595 | 3.403 | 0.004 | 0.000 | 1.134 | 0.842 | 1.396 | 0.061 | n/a | 1.531 | 19.190 | n/a | n/a | 0.035 | 4.541 | 0.165 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.595 | 1.238 | 0.000 | 1.868 | 3.403 | 0.004 | 0.000 | 1.134 | 0.842 | 1.396 | 0.061 | n/a | 1.531 | 19.190 | n/a | n/a | 0.035 | 4.541 | 0.165 | 0.035 |
| p99 | 27.595 | 1.238 | 0.000 | 1.868 | 3.403 | 0.004 | 0.000 | 1.134 | 0.842 | 1.396 | 0.061 | n/a | 1.531 | 19.190 | n/a | n/a | 0.035 | 4.541 | 0.165 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000ef | 27.595 | 3.403 | 0.004 | 0.000 | 1.134 | 0.842 | 1.396 | 0.061 | n/a | 1.531 | 19.190 | n/a | n/a | 0.035 | 4.541 | 0.165 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.333 | 0.505 | 0.000 | 1.614 | 3.130 | 0.005 | 0.000 | 0.160 | 0.777 | 1.041 | 0.033 | n/a | 0.289 | 8.331 | n/a | n/a | 0.040 | 3.378 | 0.186 | 0.040 |
| p99 | 18.166 | 1.574 | 0.000 | 1.857 | 3.212 | 0.005 | 0.000 | 1.125 | 1.084 | 1.276 | 0.045 | n/a | 0.539 | 12.362 | n/a | n/a | 0.044 | 4.260 | 0.278 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000fd | 18.166 | 3.212 | 0.005 | 0.000 | 0.160 | 0.777 | 1.276 | 0.045 | n/a | 0.289 | 12.362 | n/a | n/a | 0.040 | 3.378 | 0.186 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000122 | 15.333 | 3.130 | 0.005 | 0.000 | 1.125 | 1.084 | 1.041 | 0.033 | n/a | 0.539 | 8.331 | n/a | n/a | 0.044 | 4.260 | 0.278 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.936 | 0.775 | 0.000 | 1.810 | 3.942 | 0.010 | 0.000 | 0.891 | 0.944 | 1.946 | 0.046 | n/a | 0.385 | 15.729 | n/a | n/a | 0.044 | 4.955 | 0.185 | 0.044 |
| p99 | 64.570 | 1.869 | 0.003 | 2.649 | 5.938 | 0.204 | 0.265 | 1.250 | 5.021 | 9.257 | 0.137 | n/a | 1.351 | 51.020 | n/a | n/a | 0.079 | 6.812 | 0.365 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e900000000000000ff | 64.570 | 4.789 | 0.010 | 0.000 | 1.149 | 0.752 | 6.519 | 0.046 | n/a | 0.207 | 51.020 | n/a | n/a | 0.079 | 5.948 | 0.092 | 0.079 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000101 | 37.029 | 3.605 | 0.158 | 0.235 | 0.061 | 1.391 | 9.257 | 0.058 | n/a | 0.234 | 21.997 | n/a | n/a | 0.033 | 4.060 | 0.110 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000010d | 36.831 | 4.450 | 0.204 | 0.265 | 0.049 | 5.021 | 6.199 | 0.046 | n/a | 0.230 | 20.323 | n/a | n/a | 0.044 | 4.968 | 0.135 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000102 | 28.199 | 5.938 | 0.009 | 0.000 | 0.865 | 1.071 | 2.443 | 0.072 | n/a | 1.351 | 16.391 | n/a | n/a | 0.059 | 6.812 | 0.242 | 0.059 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000010f | 25.311 | 3.794 | 0.004 | 0.000 | 0.891 | 0.729 | 1.591 | 0.035 | n/a | 0.824 | 17.404 | n/a | n/a | 0.038 | 4.690 | 0.185 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000109 | 24.936 | 4.496 | 0.010 | 0.000 | 1.250 | 0.994 | 1.946 | 0.116 | n/a | 0.373 | 15.729 | n/a | n/a | 0.023 | 5.756 | 0.231 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 0.622ms |
| 262d64311a3ff3e90000000000000105 | 23.749 | 4.747 | 0.010 | 0.000 | 1.146 | 0.593 | 1.354 | 0.033 | n/a | 0.670 | 15.146 | n/a | n/a | 0.050 | 5.903 | 0.249 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000111 | 22.340 | 3.618 | 0.155 | 0.210 | 0.058 | 1.180 | 6.114 | 0.042 | n/a | 0.730 | 10.198 | n/a | n/a | 0.034 | 4.042 | 0.181 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000107 | 18.573 | 3.711 | 0.006 | 0.000 | 1.146 | 0.911 | 1.126 | 0.137 | n/a | 0.385 | 11.096 | n/a | n/a | 0.054 | 4.863 | 0.262 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000010b | 13.567 | 3.942 | 0.007 | 0.000 | 1.006 | 0.944 | 0.984 | 0.034 | n/a | 0.469 | 6.122 | n/a | n/a | 0.060 | 4.955 | 0.365 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.567 | 0.775 | 0.000 | 1.769 | 3.711 | 0.006 | 0.000 | 1.006 | 0.911 | 0.984 | 0.034 | n/a | 0.385 | 6.122 | n/a | n/a | 0.054 | 4.863 | 0.262 | 0.054 |
| p99 | 18.573 | 1.020 | 0.001 | 1.965 | 3.942 | 0.007 | 0.000 | 1.146 | 0.944 | 1.126 | 0.137 | n/a | 0.469 | 11.096 | n/a | n/a | 0.060 | 4.955 | 0.365 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000107 | 18.573 | 3.711 | 0.006 | 0.000 | 1.146 | 0.911 | 1.126 | 0.137 | n/a | 0.385 | 11.096 | n/a | n/a | 0.054 | 4.863 | 0.262 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000010b | 13.567 | 3.942 | 0.007 | 0.000 | 1.006 | 0.944 | 0.984 | 0.034 | n/a | 0.469 | 6.122 | n/a | n/a | 0.060 | 4.955 | 0.365 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.616 | 0.254 | 0.000 | 0.589 | 3.845 | 0.005 | 0.000 | 0.060 | 8.650 | 1.277 | 0.053 | n/a | 0.843 | 47.788 | n/a | n/a | 0.019 | 4.900 | 0.052 | 0.019 |
| p99 | 97.581 | 0.439 | 0.013 | 1.644 | 15.059 | 1.949 | 0.631 | 1.050 | 32.144 | 19.488 | 0.110 | n/a | 7.436 | 50.738 | n/a | n/a | 0.053 | 17.698 | 0.181 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000116 | 97.581 | 15.059 | 1.949 | 0.631 | 0.060 | 8.650 | 19.488 | 0.110 | n/a | 0.843 | 50.738 | n/a | n/a | 0.053 | 17.698 | 0.181 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.006ms |
| 262d64311a3ff3e90000000000000117 | 93.616 | 3.845 | 0.005 | 0.000 | 1.050 | 32.144 | 1.277 | 0.053 | n/a | 7.436 | 47.788 | n/a | n/a | 0.019 | 4.900 | 0.052 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.869 | 0.577 | 0.000 | 2.062 | 3.864 | 0.008 | 0.000 | 0.363 | 1.148 | 2.142 | 0.053 | n/a | 0.277 | 17.791 | n/a | n/a | 0.041 | 4.232 | 0.196 | 0.041 |
| p99 | 89.494 | 1.564 | 0.516 | 3.513 | 6.651 | 0.180 | 0.284 | 9.814 | 1.420 | 23.666 | 0.090 | n/a | 0.746 | 60.457 | n/a | n/a | 0.057 | 13.820 | 0.519 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000126 | 89.494 | 3.401 | 0.177 | 0.000 | 0.065 | 1.359 | 23.666 | 0.053 | n/a | 0.277 | 60.457 | n/a | n/a | 0.038 | 3.644 | 0.041 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000012e | 48.042 | 3.564 | 0.180 | 0.284 | 0.063 | 1.420 | 17.960 | 0.067 | n/a | 0.256 | 24.209 | n/a | n/a | 0.039 | 4.091 | 0.085 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000012a | 28.869 | 6.651 | 0.006 | 0.000 | 0.999 | 0.696 | 1.888 | 0.035 | n/a | 0.746 | 17.791 | n/a | n/a | 0.057 | 7.656 | 0.265 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e9000000000000012b | 26.619 | 3.999 | 0.008 | 0.000 | 9.814 | 1.148 | 1.544 | 0.090 | n/a | 0.377 | 9.590 | n/a | n/a | 0.050 | 13.820 | 0.519 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.750ms; driver.publication 1.270ms |
| 262d64311a3ff3e90000000000000127 | 21.585 | 3.864 | 0.005 | 0.000 | 0.363 | 1.018 | 2.142 | 0.036 | n/a | 0.248 | 13.867 | n/a | n/a | 0.041 | 4.232 | 0.196 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.619 | 0.888 | 0.516 | 2.118 | 3.999 | 0.008 | 0.000 | 9.814 | 1.148 | 1.544 | 0.090 | n/a | 0.377 | 9.590 | n/a | n/a | 0.050 | 13.820 | 0.519 | 0.050 |
| p99 | 26.619 | 0.888 | 0.516 | 2.118 | 3.999 | 0.008 | 0.000 | 9.814 | 1.148 | 1.544 | 0.090 | n/a | 0.377 | 9.590 | n/a | n/a | 0.050 | 13.820 | 0.519 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e9000000000000012b | 26.619 | 3.999 | 0.008 | 0.000 | 9.814 | 1.148 | 1.544 | 0.090 | n/a | 0.377 | 9.590 | n/a | n/a | 0.050 | 13.820 | 0.519 | 0.050 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.750ms; driver.publication 1.270ms |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.485 | 0.243 | 0.000 | 0.842 | 5.765 | 0.134 | 0.000 | 0.107 | 3.003 | 5.954 | 0.081 | n/a | 0.566 | 10.696 | n/a | n/a | 0.043 | 6.055 | 0.219 | 0.043 |
| p99 | 32.237 | 1.148 | 0.532 | 2.013 | 5.861 | 0.497 | 1.186 | 0.136 | 4.608 | 8.109 | 0.093 | n/a | 0.814 | 14.977 | n/a | n/a | 0.051 | 7.555 | 0.265 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000130 | 32.237 | 5.861 | 0.134 | 0.000 | 0.060 | 4.608 | 5.954 | 0.043 | n/a | 0.566 | 14.977 | n/a | n/a | 0.035 | 6.055 | 0.188 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000134 | 28.485 | 5.765 | 0.497 | 1.186 | 0.107 | 3.003 | 8.109 | 0.093 | n/a | 0.418 | 9.256 | n/a | n/a | 0.051 | 7.555 | 0.265 | 0.051 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 262d64311a3ff3e90000000000000132 | 18.296 | 3.859 | 0.006 | 0.000 | 0.136 | 1.023 | 1.637 | 0.081 | n/a | 0.814 | 10.696 | n/a | n/a | 0.043 | 4.001 | 0.219 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.296 | 1.148 | 0.000 | 2.013 | 3.859 | 0.006 | 0.000 | 0.136 | 1.023 | 1.637 | 0.081 | n/a | 0.814 | 10.696 | n/a | n/a | 0.043 | 4.001 | 0.219 | 0.043 |
| p99 | 18.296 | 1.148 | 0.000 | 2.013 | 3.859 | 0.006 | 0.000 | 0.136 | 1.023 | 1.637 | 0.081 | n/a | 0.814 | 10.696 | n/a | n/a | 0.043 | 4.001 | 0.219 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000132 | 18.296 | 3.859 | 0.006 | 0.000 | 0.136 | 1.023 | 1.637 | 0.081 | n/a | 0.814 | 10.696 | n/a | n/a | 0.043 | 4.001 | 0.219 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.660 | 0.492 | 0.000 | 1.462 | 4.813 | 5.238 | 0.000 | 0.007 | 4.564 | 1.156 | 9.234 | n/a | 0.299 | 73.605 | n/a | n/a | 0.028 | 9.846 | 0.112 | 0.028 |
| p99 | 138.037 | 1.730 | 1.431 | 3.628 | 6.047 | 10.732 | 0.000 | 0.660 | 6.271 | 3.850 | 12.753 | n/a | 6.593 | 105.076 | n/a | n/a | 0.059 | 15.551 | 0.248 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e9000000000000013f | 138.037 | 4.813 | 10.732 | 0.000 | 0.005 | 4.182 | 1.518 | 11.574 | n/a | 0.077 | 105.076 | n/a | n/a | 0.059 | 15.551 | 0.113 | 0.059 | gw-w/thread-61/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.395ms; driver.publication 1.208ms; driver.publication 1.156ms |
| 262d64311a3ff3e9000000000000013e | 129.195 | 4.846 | 9.567 | 0.000 | 0.006 | 4.564 | 0.794 | 12.753 | n/a | 0.284 | 96.351 | n/a | n/a | 0.028 | 14.420 | 0.112 | 0.028 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.395ms; driver.publication 1.208ms; driver.publication 1.156ms |
| 262d64311a3ff3e9000000000000013d | 118.836 | 4.879 | 8.449 | 0.000 | 0.007 | 5.253 | 0.768 | 9.234 | n/a | 3.895 | 86.334 | n/a | n/a | 0.017 | 13.335 | 0.112 | 0.017 | gw-w/thread-62/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.395ms; driver.publication 1.208ms; driver.publication 1.156ms |
| 262d64311a3ff3e9000000000000013c | 114.788 | 4.728 | 7.315 | 0.000 | 0.005 | 5.213 | 3.850 | 5.627 | n/a | 0.298 | 87.734 | n/a | n/a | 0.018 | 12.048 | 0.105 | 0.018 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.395ms; driver.publication 1.208ms; driver.publication 1.156ms |
| 262d64311a3ff3e9000000000000013b | 100.575 | 4.890 | 6.340 | 0.000 | 0.006 | 3.955 | 0.677 | 9.386 | n/a | 1.697 | 73.605 | n/a | n/a | 0.020 | 11.235 | 0.112 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.208ms; driver.publication 1.156ms; driver.publication 1.149ms |
| 262d64311a3ff3e90000000000000140 | 93.660 | 3.187 | 0.009 | 0.000 | 0.660 | 1.669 | 0.843 | 0.041 | n/a | 0.701 | 86.514 | n/a | n/a | 0.036 | 3.855 | 0.041 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.740ms; driver.publication 1.395ms; driver.publication 1.208ms; driver.publication 1.156ms; driver.publication 1.149ms |
| 262d64311a3ff3e9000000000000013a | 86.949 | 4.601 | 5.238 | 0.000 | 0.007 | 6.271 | 0.912 | 7.382 | n/a | 0.673 | 61.846 | n/a | n/a | 0.020 | 9.846 | 0.113 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.208ms; driver.publication 1.149ms |
| 262d64311a3ff3e90000000000000139 | 79.821 | 4.774 | 4.228 | 0.000 | 0.009 | 5.209 | 1.156 | 9.321 | n/a | 0.131 | 54.962 | n/a | n/a | 0.032 | 9.010 | 0.113 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 2.740ms; driver.publication 1.208ms |
| 262d64311a3ff3e90000000000000138 | 73.102 | 6.047 | 2.983 | 0.000 | 0.013 | 3.507 | 3.070 | 10.387 | n/a | 0.261 | 46.810 | n/a | n/a | 0.023 | 9.043 | 0.124 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms; driver.publication 1.208ms |
| 262d64311a3ff3e90000000000000137 | 55.463 | 4.437 | 1.664 | 0.000 | 0.010 | 4.755 | 1.450 | 0.077 | n/a | 6.593 | 36.423 | n/a | n/a | 0.056 | 6.110 | 0.110 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 3.337ms |
| 262d64311a3ff3e90000000000000136 | 24.089 | 5.911 | 0.017 | 0.000 | 0.039 | 3.011 | 1.265 | 0.034 | n/a | 0.299 | 13.477 | n/a | n/a | 0.036 | 5.967 | 0.248 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.660 | 0.240 | 0.000 | 1.136 | 3.187 | 0.009 | 0.000 | 0.660 | 1.669 | 0.843 | 0.041 | n/a | 0.701 | 86.514 | n/a | n/a | 0.036 | 3.855 | 0.041 | 0.036 |
| p99 | 93.660 | 0.240 | 0.000 | 1.136 | 3.187 | 0.009 | 0.000 | 0.660 | 1.669 | 0.843 | 0.041 | n/a | 0.701 | 86.514 | n/a | n/a | 0.036 | 3.855 | 0.041 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 262d64311a3ff3e90000000000000140 | 93.660 | 3.187 | 0.009 | 0.000 | 0.660 | 1.669 | 0.843 | 0.041 | n/a | 0.701 | 86.514 | n/a | n/a | 0.036 | 3.855 | 0.041 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.740ms; driver.publication 1.395ms; driver.publication 1.208ms; driver.publication 1.156ms; driver.publication 1.149ms |

## P1 / warmup / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.020 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 288.383 | n/a | n/a | n/a | 40.827 | n/a | 4.442 | 288.342 | 3.146 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.657 | 288.380 | 1.000 | 6.657 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f5dce4c6c373b95a0000000000002070 | 288.562 | 0.375 | n/a | 0.000 | 288.184 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.559 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a0000000000002071 | 288.418 | 0.052 | n/a | 0.000 | 288.364 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.416 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a0000000000002072 | 288.383 | 0.029 | n/a | 0.000 | 288.352 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.380 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a0000000000002073 | 288.367 | 0.023 | n/a | 0.000 | 288.342 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.365 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000000207d | 288.068 | 0.042 | n/a | 0.000 | 288.024 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 288.066 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000134c | 285.820 | 0.035 | n/a | 0.000 | 285.783 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.818 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000134b | 285.768 | 0.038 | n/a | 0.000 | 285.728 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.766 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000001348 | 285.736 | 0.600 | n/a | 0.000 | 285.133 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.733 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000134a | 285.722 | 0.041 | n/a | 0.000 | 285.679 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.721 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000001349 | 285.672 | 0.098 | n/a | 0.000 | 285.572 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.670 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000018f3 | 285.498 | 0.415 | n/a | 0.000 | 285.081 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.496 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000018f6 | 285.438 | 0.023 | n/a | 0.000 | 285.414 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.437 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000018f5 | 285.422 | 0.032 | n/a | 0.000 | 285.388 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.420 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000018f4 | 285.404 | 0.058 | n/a | 0.000 | 285.345 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.402 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000001902 | 285.302 | 0.056 | n/a | 0.000 | 285.245 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.301 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000001903 | 285.272 | 0.016 | n/a | 0.000 | 285.255 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.271 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000c768 | 279.129 | 0.144 | n/a | 0.000 | 278.983 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.127 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000c767 | 278.971 | 0.049 | n/a | 0.000 | 278.920 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.969 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000c766 | 277.378 | 0.134 | n/a | 0.000 | 277.244 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.377 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000000c765 | 277.215 | 0.556 | n/a | 0.000 | 276.656 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.212 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 270.322 | n/a | n/a | n/a | 2.739 | n/a | 0.000 | 270.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.059 | 270.319 | 1.000 | 1.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e4640000000000022c0b | 285.429 | 0.157 | n/a | 0.000 | 285.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.427 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 8eb8660bda75e464000000000000f237 | 270.322 | 0.122 | n/a | 0.000 | 270.197 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.319 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e464000000000000ef53 | 57.990 | 0.101 | n/a | 0.000 | 57.886 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 57.987 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.110ms; replica.apply-delta 0.031ms |
| 8eb8660bda75e464000000000000ef81 | 5.118 | 2.739 | n/a | 0.000 | 0.000 | 0.443 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.937 | 2.739 | 0.535 | 1.937 | node-14/thread-3/socket.wait-first-byte | none observed |
| 8eb8660bda75e464000000000000f257 | 4.645 | 4.644 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.644 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.088ms |
| 8eb8660bda75e4640000000000020557 | 1.059 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.059 | 0.000 | 0.000 | 1.059 | uncovered | none observed |
| 8eb8660bda75e4640000000000019631 | 0.758 | 0.753 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.753 | 0.995 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e4640000000000019d22 | 0.658 | 0.655 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.655 | 0.994 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e46400000000000184a7 | 0.564 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.564 | 0.000 | 0.000 | 0.564 | uncovered | none observed |
| 8eb8660bda75e464000000000002111f | 0.561 | 0.559 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.559 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000001d8ca | 0.486 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.486 | 0.000 | 0.000 | 0.486 | uncovered | none observed |
| 8eb8660bda75e464000000000001d7a1 | 0.478 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.478 | 0.000 | 0.000 | 0.478 | uncovered | none observed |
| 8eb8660bda75e4640000000000011077 | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| 8eb8660bda75e4640000000000011cb3 | 0.416 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.416 | 0.000 | 0.000 | 0.416 | uncovered | none observed |
| 8eb8660bda75e46400000000000110f9 | 0.401 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 | uncovered | none observed |
| 8eb8660bda75e464000000000001e25e | 0.391 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.391 | 0.000 | 0.000 | 0.391 | uncovered | none observed |
| 8eb8660bda75e464000000000001dfdf | 0.389 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.389 | 0.000 | 0.000 | 0.389 | uncovered | none observed |
| 8eb8660bda75e4640000000000012236 | 0.381 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.381 | 0.000 | 0.000 | 0.381 | uncovered | none observed |
| 8eb8660bda75e464000000000001b09a | 0.357 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.357 | 0.000 | 0.000 | 0.357 | uncovered | none observed |
| 8eb8660bda75e46400000000000122df | 0.354 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | uncovered | none observed |

## P1 / L4 / read (211 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 277.397 | n/a | n/a | n/a | 5.998 | n/a | 0.000 | 277.286 | 0.450 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.616 | 277.395 | 1.000 | 1.616 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f5dce4c6c373b95a000000000000eda6 | 277.447 | 0.133 | n/a | 0.000 | 277.311 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.443 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 8eb8660bda75e4640000000000024124 | 277.424 | 0.135 | n/a | 0.000 | 277.286 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.421 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| ac7683f29ca27f46000000000000ec66 | 277.397 | 0.117 | n/a | 0.000 | 277.278 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.395 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| 8eb8660bda75e4640000000000024125 | 277.338 | 0.032 | n/a | 0.000 | 277.302 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.334 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| f5dce4c6c373b95a000000000000e435 | 265.557 | 0.247 | n/a | 0.000 | 265.299 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 265.547 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| ac7683f29ca27f46000000000000dff3 | 263.786 | 0.256 | n/a | 0.000 | 263.526 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 263.782 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 8eb8660bda75e4640000000000022c0e | 262.785 | 0.073 | n/a | 0.000 | 262.710 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.783 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| f5dce4c6c373b95a000000000000e43e | 40.082 | 28.371 | n/a | 1.256 | 0.000 | 0.673 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.782 | 29.627 | 0.739 | 9.782 | node-14/thread-5/reader.execute | replica.apply-delta 0.021ms |
| ac7683f29ca27f46000000000000e02d | 14.560 | 2.618 | n/a | 0.000 | 0.000 | 0.450 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.493 | 2.618 | 0.180 | 11.493 | node-14/thread-4/socket.wait-first-byte | none observed |
| f5dce4c6c373b95a000000000000e79c | 6.262 | 6.259 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.259 | 1.000 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| ac7683f29ca27f46000000000000e63a | 5.999 | 5.998 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 5.998 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000022cb5 | 4.384 | 2.271 | n/a | 0.000 | 0.000 | 0.497 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.616 | 2.271 | 0.518 | 1.616 | node-14/thread-3/reader.execute | replica.apply-delta 0.016ms |
| 8eb8660bda75e464000000000002d428 | 3.135 | 3.133 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.133 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| ac7683f29ca27f46000000000000e036 | 3.078 | 3.076 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.076 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| ac7683f29ca27f46000000000000e2f6 | 3.042 | 3.038 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.038 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| f5dce4c6c373b95a000000000000e7cf | 3.013 | 3.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.009 | 0.999 | 0.004 | node-14/thread-5/reader.execute | none observed |
| ac7683f29ca27f46000000000000e774 | 2.769 | 2.764 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.764 | 0.998 | 0.005 | node-14/thread-4/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000023b5b | 2.465 | 2.461 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.461 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000023b5c | 2.456 | 2.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 2.434 | 0.991 | 0.022 | node-14/thread-3/replica.pull-at | none observed |
| ac7683f29ca27f46000000000000e756 | 2.356 | 2.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.352 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |

## P1 / L16 / read (235 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 411.024 | n/a | n/a | n/a | 5.608 | n/a | 0.000 | 410.988 | 0.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.220 | 411.024 | 1.000 | 2.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e464000000000003cb13 | 411.076 | 0.047 | n/a | 0.000 | 411.028 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 411.075 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 8eb8660bda75e464000000000003cb14 | 411.074 | 0.016 | n/a | 0.000 | 411.058 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 411.073 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 8eb8660bda75e464000000000003cb1d | 411.024 | 0.099 | n/a | 0.000 | 410.924 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 411.024 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 8eb8660bda75e464000000000003cb12 | 411.017 | 0.143 | n/a | 0.000 | 410.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 411.015 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 8eb8660bda75e464000000000003cb1c | 411.014 | 0.025 | n/a | 0.000 | 410.988 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 411.013 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 8eb8660bda75e464000000000003cb1e | 410.962 | 0.013 | n/a | 0.000 | 410.948 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 410.961 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| f5dce4c6c373b95a0000000000024afd | 409.983 | 0.349 | n/a | 0.000 | 409.631 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 409.980 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5dce4c6c373b95a0000000000024b12 | 409.630 | 0.087 | n/a | 0.000 | 409.543 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.630 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5dce4c6c373b95a0000000000024b13 | 409.627 | 0.026 | n/a | 0.000 | 409.599 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.625 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5dce4c6c373b95a0000000000024b10 | 409.603 | 0.131 | n/a | 0.000 | 409.470 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 409.601 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5dce4c6c373b95a0000000000024b11 | 409.584 | 0.042 | n/a | 0.000 | 409.541 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.583 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| ac7683f29ca27f46000000000002449f | 409.354 | 0.013 | n/a | 0.000 | 409.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.353 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| ac7683f29ca27f46000000000002449e | 409.343 | 0.014 | n/a | 0.000 | 409.329 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.343 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| ac7683f29ca27f46000000000002449d | 409.330 | 0.016 | n/a | 0.000 | 409.314 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.329 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| ac7683f29ca27f46000000000002449c | 409.326 | 0.042 | n/a | 0.000 | 409.283 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 409.326 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| ac7683f29ca27f46000000000002449b | 409.304 | 0.218 | n/a | 0.000 | 409.083 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 409.302 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| f5dce4c6c373b95a0000000000024b30 | 167.553 | 0.028 | n/a | 0.000 | 167.524 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 167.552 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| f5dce4c6c373b95a0000000000024b2f | 167.519 | 0.101 | n/a | 0.000 | 167.416 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 167.516 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| f5dce4c6c373b95a0000000000024b42 | 167.135 | 0.013 | n/a | 0.000 | 167.121 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 167.134 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |
| f5dce4c6c373b95a0000000000024b41 | 167.132 | 0.016 | n/a | 0.000 | 167.115 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 167.131 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.026ms |

## P1 / L64 / read (261 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.000 | 0.000 | 0.013 |
| p99 | 298.521 | n/a | n/a | n/a | 8.618 | n/a | 0.000 | 298.474 | 0.415 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.818 | 298.521 | 1.000 | 9.818 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e46400000000000484ec | 298.567 | 0.237 | n/a | 0.000 | 298.328 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.565 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003071f | 298.535 | 0.236 | n/a | 0.000 | 298.296 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.532 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000484ee | 298.521 | 0.076 | n/a | 0.000 | 298.445 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.521 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000484f1 | 298.508 | 0.012 | n/a | 0.000 | 298.495 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.508 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000484ed | 298.506 | 0.035 | n/a | 0.000 | 298.470 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.505 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000484f0 | 298.498 | 0.012 | n/a | 0.000 | 298.485 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.498 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000484ef | 298.488 | 0.014 | n/a | 0.000 | 298.474 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.487 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a0000000000030720 | 298.483 | 0.084 | n/a | 0.000 | 298.398 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.482 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a0000000000030721 | 298.448 | 0.029 | n/a | 0.000 | 298.418 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.448 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000002f652 | 298.257 | 0.048 | n/a | 0.000 | 298.208 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.256 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000002f653 | 298.253 | 0.015 | n/a | 0.000 | 298.238 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.252 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000002f651 | 298.213 | 0.119 | n/a | 0.000 | 298.092 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.211 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000002f669 | 298.016 | 0.027 | n/a | 0.000 | 297.989 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.016 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000002f66a | 298.011 | 0.013 | n/a | 0.000 | 297.997 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.010 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a0000000000030750 | 297.859 | 0.080 | n/a | 0.000 | 297.777 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.858 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003074f | 297.857 | 0.029 | n/a | 0.000 | 297.827 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.856 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000032fbc | 272.085 | 0.110 | n/a | 0.000 | 271.973 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.083 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| f5dce4c6c373b95a00000000000342ae | 271.826 | 0.086 | n/a | 0.000 | 271.737 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.823 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| f5dce4c6c373b95a00000000000342b2 | 271.714 | 0.014 | n/a | 0.000 | 271.699 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 271.713 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| f5dce4c6c373b95a00000000000342b1 | 271.707 | 0.014 | n/a | 0.000 | 271.692 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.706 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.043ms |

## P1 / L256 / read (213 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 275.366 | n/a | n/a | n/a | 14.648 | n/a | 0.000 | 275.349 | 0.536 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.255 | 275.365 | 1.000 | 8.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac7683f29ca27f460000000000039a22 | 275.378 | 0.013 | n/a | 0.000 | 275.364 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.377 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000039a21 | 275.373 | 0.013 | n/a | 0.000 | 275.359 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.372 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000039a20 | 275.366 | 0.016 | n/a | 0.000 | 275.349 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.365 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000039a1f | 275.357 | 0.021 | n/a | 0.000 | 275.336 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.357 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000039a1e | 275.351 | 0.110 | n/a | 0.000 | 275.238 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.348 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000054316 | 275.158 | 0.061 | n/a | 0.000 | 275.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.156 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000054315 | 275.139 | 0.115 | n/a | 0.000 | 275.021 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.135 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e464000000000005432b | 274.662 | 0.033 | n/a | 0.000 | 274.628 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.661 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000054329 | 274.658 | 0.022 | n/a | 0.000 | 274.635 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.657 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e464000000000005432a | 274.654 | 0.014 | n/a | 0.000 | 274.639 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.653 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e464000000000005432c | 274.646 | 0.013 | n/a | 0.000 | 274.632 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.646 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003bfbf | 272.638 | 0.133 | n/a | 0.000 | 272.502 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.634 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003bfc0 | 272.616 | 0.026 | n/a | 0.000 | 272.588 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.614 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003bfc1 | 272.607 | 0.019 | n/a | 0.000 | 272.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.604 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003bfc2 | 272.597 | 0.018 | n/a | 0.000 | 272.578 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.595 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000003bfc5 | 272.480 | 0.021 | n/a | 0.000 | 272.457 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.478 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000004714d | 272.409 | 0.052 | n/a | 0.000 | 272.355 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.407 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000004714c | 272.331 | 0.132 | n/a | 0.000 | 272.196 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.328 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000004714b | 272.137 | 0.148 | n/a | 0.000 | 271.988 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.136 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a000000000004714a | 272.047 | 0.300 | n/a | 0.000 | 271.745 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.045 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (313 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 3.591 | n/a | n/a | n/a | 3.583 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.341 | 3.583 | 0.999 | 3.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f5dce4c6c373b95a000000000004799c | 50.969 | 29.900 | n/a | 8.221 | 0.000 | 1.032 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.815 | 38.121 | 0.748 | 11.815 | node-14/thread-5/reader.execute | none observed |
| 8eb8660bda75e464000000000005fbb4 | 28.791 | 13.482 | n/a | 2.622 | 0.000 | 0.552 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.134 | 16.105 | 0.559 | 12.134 | node-14/thread-3/reader.execute | none observed |
| ac7683f29ca27f460000000000045270 | 27.769 | 12.517 | n/a | 0.000 | 0.000 | 0.728 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.524 | 12.517 | 0.451 | 14.524 | node-14/thread-4/socket.wait-first-byte | none observed |
| 8eb8660bda75e464000000000006656b | 3.591 | 3.575 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.575 | 0.996 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000006656c | 3.585 | 3.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.569 | 0.995 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000006656a | 3.585 | 3.583 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.583 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| ac7683f29ca27f46000000000004b5d6 | 3.508 | 3.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.506 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| ac7683f29ca27f46000000000004b5d7 | 3.506 | 3.491 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.491 | 0.996 | 0.015 | node-14/thread-4/replica.pull-at | none observed |
| ac7683f29ca27f46000000000004b523 | 3.382 | 3.377 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.377 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| ac7683f29ca27f46000000000004b524 | 3.380 | 3.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.355 | 0.993 | 0.025 | node-14/thread-4/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000071603 | 3.341 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.341 | 0.000 | 0.000 | 3.341 | uncovered | none observed |
| 8eb8660bda75e4640000000000071602 | 3.338 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.338 | 0.000 | 0.000 | 3.338 | uncovered | none observed |
| ac7683f29ca27f46000000000004b525 | 3.306 | 3.279 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.279 | 0.992 | 0.027 | node-14/thread-4/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000071604 | 3.295 | 3.251 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.043 | 3.251 | 0.987 | 0.043 | node-14/thread-3/reader.execute | none observed |
| ac7683f29ca27f46000000000004c2bf | 3.277 | 3.275 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.275 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000071605 | 3.272 | 3.233 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.039 | 3.233 | 0.988 | 0.039 | node-14/thread-3/reader.execute | none observed |
| ac7683f29ca27f46000000000004b572 | 3.144 | 3.129 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.129 | 0.995 | 0.015 | node-14/thread-4/replica.pull-at | none observed |
| ac7683f29ca27f46000000000004b571 | 3.137 | 3.135 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.135 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| ac7683f29ca27f46000000000004b573 | 3.119 | 3.103 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.103 | 0.995 | 0.016 | node-14/thread-4/reader.execute | none observed |
| f5dce4c6c373b95a000000000004de79 | 2.688 | 2.662 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.026 | 2.662 | 0.990 | 0.026 | node-14/thread-5/reader.execute | none observed |

## P1 / recovery / read (235 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 275.979 | n/a | n/a | n/a | 3.232 | n/a | 0.000 | 275.857 | 0.501 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.228 | 275.977 | 1.000 | 6.228 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e46400000000000829dc | 276.176 | 0.130 | n/a | 0.000 | 276.044 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.174 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000829dd | 276.150 | 0.030 | n/a | 0.000 | 276.117 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.147 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a00000000000699ff | 275.979 | 0.120 | n/a | 0.000 | 275.857 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.977 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a00000000000699fe | 275.868 | 0.014 | n/a | 0.000 | 275.853 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.867 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a00000000000699fd | 275.855 | 0.017 | n/a | 0.000 | 275.838 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.854 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a00000000000699fc | 275.838 | 0.032 | n/a | 0.000 | 275.806 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.837 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| f5dce4c6c373b95a00000000000699fb | 275.767 | 0.092 | n/a | 0.000 | 275.673 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.765 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000829f4 | 275.312 | 0.031 | n/a | 0.000 | 275.278 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.309 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000829f5 | 275.291 | 0.020 | n/a | 0.000 | 275.270 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.290 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000829f6 | 275.283 | 0.020 | n/a | 0.000 | 275.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.282 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e46400000000000829f7 | 275.281 | 0.020 | n/a | 0.000 | 275.260 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.279 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000067151 | 274.783 | 0.097 | n/a | 0.000 | 274.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.781 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000006716b | 274.388 | 0.015 | n/a | 0.000 | 274.372 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 274.387 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000006716a | 274.381 | 0.016 | n/a | 0.000 | 274.365 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.381 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000067169 | 274.376 | 0.037 | n/a | 0.000 | 274.337 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.375 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| ac7683f29ca27f460000000000067168 | 274.350 | 0.038 | n/a | 0.000 | 274.311 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.349 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000080d4d | 270.498 | 0.017 | n/a | 0.000 | 270.480 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.497 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000080d4c | 270.490 | 0.048 | n/a | 0.000 | 270.441 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 270.489 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000080d4b | 270.427 | 0.131 | n/a | 0.000 | 270.294 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.425 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000080d64 | 269.786 | 0.076 | n/a | 0.000 | 269.708 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.785 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (145 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 2.614 | n/a | n/a | n/a | 2.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.224 | 2.612 | 0.999 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e4640000000000083f42 | 23.409 | 10.881 | n/a | 1.264 | 0.000 | 0.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.902 | 12.145 | 0.519 | 10.902 | node-14/thread-3/socket.wait-first-byte | none observed |
| 8eb8660bda75e4640000000000083f92 | 2.614 | 2.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.612 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000009ac9e | 2.363 | 2.361 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.361 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000009ac92 | 2.164 | 2.162 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.162 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000856b5 | 1.966 | 1.964 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.964 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000083fc9 | 1.787 | 1.785 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.785 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000009688c | 1.399 | 1.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.397 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000841bd | 0.934 | 0.933 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.933 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000098144 | 0.912 | 0.910 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.910 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000008f1d5 | 0.859 | 0.857 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.857 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000008bc41 | 0.835 | 0.833 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.833 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000009d754 | 0.768 | 0.767 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.767 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000087276 | 0.705 | 0.703 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.703 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000096976 | 0.661 | 0.660 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.660 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000009ac0d | 0.604 | 0.602 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.602 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000096456 | 0.592 | 0.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.586 | 0.990 | 0.006 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e464000000000009671b | 0.571 | 0.569 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.569 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000084fb4 | 0.565 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.563 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000096a1b | 0.562 | 0.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.560 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000090ebd | 0.558 | 0.556 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.556 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (197 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.000 | 0.000 | 0.007 |
| p99 | 0.732 | n/a | n/a | n/a | 0.730 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.491 | 0.730 | 0.997 | 0.491 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e46400000000000a4365 | 7.899 | 4.255 | n/a | 0.000 | 0.000 | 0.419 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.225 | 4.255 | 0.539 | 3.225 | node-14/thread-3/socket.wait-first-byte | none observed |
| 8eb8660bda75e46400000000000c6e70 | 0.732 | 0.730 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.730 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000bca63 | 0.613 | 0.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.611 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000b7505 | 0.559 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.558 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000c4d01 | 0.510 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.507 | 0.995 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e46400000000000c6e06 | 0.491 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 | uncovered | none observed |
| 8eb8660bda75e46400000000000aa9cd | 0.476 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.476 | 0.000 | 0.000 | 0.476 | uncovered | none observed |
| 8eb8660bda75e46400000000000b1c64 | 0.476 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.476 | 0.000 | 0.000 | 0.476 | uncovered | none observed |
| 8eb8660bda75e46400000000000c354d | 0.459 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.459 | 0.000 | 0.000 | 0.459 | uncovered | none observed |
| 8eb8660bda75e46400000000000b03f7 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 8eb8660bda75e46400000000000a9346 | 0.408 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.408 | 0.000 | 0.000 | 0.408 | uncovered | none observed |
| 8eb8660bda75e46400000000000bfcb6 | 0.407 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.407 | 0.000 | 0.000 | 0.407 | uncovered | none observed |
| 8eb8660bda75e46400000000000c4c4d | 0.396 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | uncovered | none observed |
| 8eb8660bda75e46400000000000c4d36 | 0.391 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.391 | 0.000 | 0.000 | 0.391 | uncovered | none observed |
| 8eb8660bda75e46400000000000c34e6 | 0.365 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 | uncovered | none observed |
| 8eb8660bda75e46400000000000bb5c6 | 0.355 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.355 | 0.000 | 0.000 | 0.355 | uncovered | none observed |
| 8eb8660bda75e46400000000000c3557 | 0.352 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.352 | 0.000 | 0.000 | 0.352 | uncovered | none observed |
| 8eb8660bda75e46400000000000bc990 | 0.348 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.348 | 0.000 | 0.000 | 0.348 | uncovered | none observed |
| 8eb8660bda75e46400000000000a6e89 | 0.343 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.343 | 0.000 | 0.000 | 0.343 | uncovered | none observed |
| 8eb8660bda75e46400000000000cf1f2 | 0.337 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | uncovered | none observed |

## P4 / p4h3 / read (166 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 1.275 | n/a | n/a | n/a | 0.954 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 1.274 | 0.998 | 0.461 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e46400000000000cfc41 | 16.901 | 1.769 | n/a | 0.000 | 0.000 | 0.448 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.685 | 1.769 | 0.105 | 14.685 | node-14/thread-3/socket.wait-first-byte | none observed |
| 8eb8660bda75e46400000000000cfc5a | 1.275 | 0.056 | n/a | 1.219 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.274 | 0.999 | 0.001 | node-14/thread-3/node.gc | none observed |
| 8eb8660bda75e46400000000000f0259 | 0.955 | 0.954 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.954 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000e974d | 0.736 | 0.734 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.734 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000d7171 | 0.669 | 0.667 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.667 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000e4118 | 0.573 | 0.571 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.571 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000dad7d | 0.554 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.552 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e46400000000000daeb3 | 0.551 | 0.549 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.549 | 0.995 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e46400000000000f14a6 | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| 8eb8660bda75e46400000000000d662a | 0.444 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.444 | 0.000 | 0.000 | 0.444 | uncovered | none observed |
| 8eb8660bda75e46400000000000d5954 | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| 8eb8660bda75e46400000000000d8dd6 | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 8eb8660bda75e46400000000000ebf7c | 0.411 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.411 | 0.000 | 0.000 | 0.411 | uncovered | none observed |
| 8eb8660bda75e46400000000000e18ee | 0.382 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | uncovered | none observed |
| 8eb8660bda75e46400000000000e514c | 0.380 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.380 | 0.000 | 0.000 | 0.380 | uncovered | none observed |
| 8eb8660bda75e46400000000000d617c | 0.371 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | uncovered | none observed |
| 8eb8660bda75e46400000000000de4fc | 0.365 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.365 | 0.000 | 0.000 | 0.365 | uncovered | none observed |
| 8eb8660bda75e46400000000000e2a01 | 0.359 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.359 | 0.000 | 0.000 | 0.359 | uncovered | none observed |
| 8eb8660bda75e46400000000000e2f83 | 0.355 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.355 | 0.000 | 0.000 | 0.355 | uncovered | none observed |
| 8eb8660bda75e46400000000000eb41b | 0.354 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | uncovered | none observed |

## P4 / p4h10 / read (197 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 4.606 | n/a | n/a | n/a | 3.283 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 3.283 | 0.999 | 0.461 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8eb8660bda75e46400000000000f4119 | 13.881 | 3.283 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.183 | 3.283 | 0.237 | 10.183 | node-14/thread-3/socket.wait-first-byte | none observed |
| 8eb8660bda75e4640000000000111444 | 4.606 | 4.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.604 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000112ec0 | 1.107 | 0.712 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.395 | 0.712 | 0.643 | 0.395 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e4640000000000101388 | 1.054 | 1.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.052 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000112ed2 | 0.964 | 0.961 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.961 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000112e33 | 0.833 | 0.826 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.826 | 0.992 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000112e32 | 0.661 | 0.658 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.658 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000011159f | 0.546 | 0.544 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.544 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e464000000000011144c | 0.535 | 0.534 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.534 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 8eb8660bda75e4640000000000112e90 | 0.518 | 0.504 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.504 | 0.972 | 0.014 | node-14/thread-3/reader.execute | none observed |
| 8eb8660bda75e4640000000000112ec1 | 0.461 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.461 | 0.000 | 0.000 | 0.461 | uncovered | none observed |
| 8eb8660bda75e4640000000000117566 | 0.434 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.434 | 0.000 | 0.000 | 0.434 | uncovered | none observed |
| 8eb8660bda75e4640000000000112f56 | 0.433 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.433 | 0.000 | 0.000 | 0.433 | uncovered | none observed |
| 8eb8660bda75e46400000000000f6e0f | 0.417 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.417 | 0.000 | 0.000 | 0.417 | uncovered | none observed |
| 8eb8660bda75e4640000000000108c41 | 0.414 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | uncovered | none observed |
| 8eb8660bda75e4640000000000115ec3 | 0.412 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.412 | 0.000 | 0.000 | 0.412 | uncovered | none observed |
| 8eb8660bda75e4640000000000117432 | 0.401 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 | uncovered | none observed |
| 8eb8660bda75e464000000000010879e | 0.384 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.384 | 0.000 | 0.000 | 0.384 | uncovered | none observed |
| 8eb8660bda75e46400000000000f411a | 0.382 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | uncovered | none observed |
| 8eb8660bda75e4640000000000102978 | 0.376 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.376 | 0.000 | 0.000 | 0.376 | uncovered | none observed |

## P5 / presweep / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 343.285 | n/a | n/a | n/a | 11.680 | n/a | 6.386 | 343.239 | 0.578 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.065 | 343.282 | 1.000 | 9.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ac7683f29ca27f460000000000075aca | 343.404 | 0.098 | n/a | 0.000 | 343.304 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.403 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms; replica.apply-delta 0.040ms; replica.apply-delta 0.038ms; replica.apply-delta 0.038ms; replica.apply-delta 0.035ms |
| f5dce4c6c373b95a00000000000783fb | 343.312 | 0.091 | n/a | 0.000 | 343.219 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.310 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms; replica.apply-delta 0.034ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms |
| f5dce4c6c373b95a00000000000783fc | 343.285 | 0.044 | n/a | 0.000 | 343.239 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.282 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms; replica.apply-delta 0.034ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms |
| f5dce4c6c373b95a00000000000783fd | 343.275 | 0.032 | n/a | 0.000 | 343.241 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.273 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms; replica.apply-delta 0.034ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms |
| f5dce4c6c373b95a00000000000783fe | 343.275 | 0.044 | n/a | 0.000 | 343.229 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 343.273 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms; replica.apply-delta 0.034ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms |
| f5dce4c6c373b95a00000000000783fa | 343.234 | 0.248 | n/a | 0.000 | 342.983 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 343.230 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms; replica.apply-delta 0.034ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms; replica.apply-delta 0.033ms |
| 8eb8660bda75e464000000000012b4b4 | 342.934 | 0.079 | n/a | 0.000 | 342.854 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.932 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.041ms; replica.apply-delta 0.041ms; replica.apply-delta 0.036ms |
| 8eb8660bda75e464000000000012b4b3 | 342.916 | 0.108 | n/a | 0.000 | 342.806 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.913 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.041ms; replica.apply-delta 0.041ms; replica.apply-delta 0.036ms |
| 8eb8660bda75e464000000000012b4b5 | 342.893 | 0.020 | n/a | 0.000 | 342.871 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.891 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.041ms; replica.apply-delta 0.041ms; replica.apply-delta 0.036ms |
| 8eb8660bda75e464000000000012b4bc | 342.669 | 0.082 | n/a | 0.000 | 342.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.667 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.041ms; replica.apply-delta 0.041ms; replica.apply-delta 0.036ms |
| 8eb8660bda75e464000000000012b4bd | 342.668 | 0.052 | n/a | 0.000 | 342.615 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.667 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.041ms; replica.apply-delta 0.041ms; replica.apply-delta 0.036ms |
| 8eb8660bda75e464000000000012b4bb | 342.634 | 0.025 | n/a | 0.000 | 342.607 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 342.632 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.041ms; replica.apply-delta 0.041ms; replica.apply-delta 0.036ms |
| ac7683f29ca27f460000000000075b08 | 342.516 | 0.015 | n/a | 0.000 | 342.500 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.515 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms; replica.apply-delta 0.040ms; replica.apply-delta 0.038ms; replica.apply-delta 0.038ms; replica.apply-delta 0.035ms |
| ac7683f29ca27f460000000000075b07 | 342.503 | 0.015 | n/a | 0.000 | 342.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.502 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms; replica.apply-delta 0.040ms; replica.apply-delta 0.038ms; replica.apply-delta 0.038ms; replica.apply-delta 0.035ms |
| ac7683f29ca27f460000000000075b06 | 342.495 | 0.016 | n/a | 0.000 | 342.478 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.494 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms; replica.apply-delta 0.040ms; replica.apply-delta 0.038ms; replica.apply-delta 0.038ms; replica.apply-delta 0.035ms |
| ac7683f29ca27f460000000000075b05 | 342.486 | 0.027 | n/a | 0.000 | 342.458 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 342.485 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms; replica.apply-delta 0.040ms; replica.apply-delta 0.038ms; replica.apply-delta 0.038ms; replica.apply-delta 0.035ms |
| 8eb8660bda75e4640000000000122bae | 266.430 | 0.147 | n/a | 0.000 | 266.280 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.427 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000122baf | 266.428 | 0.030 | n/a | 0.000 | 266.397 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.427 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 8eb8660bda75e4640000000000122bb0 | 266.427 | 0.019 | n/a | 0.000 | 266.407 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 266.426 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| ac7683f29ca27f46000000000006cd61 | 265.418 | 0.013 | n/a | 0.000 | 265.404 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.417 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / baseline / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 0.057 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f5dce4c6c373b95a000000000000e434 | 0.057 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 | uncovered | none observed |
| f5dce4c6c373b95a000000000000e430 | 0.048 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.048 | 0.000 | 0.000 | 0.048 | uncovered | none observed |
| f5dce4c6c373b95a000000000000e432 | 0.016 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 | uncovered | none observed |
| f5dce4c6c373b95a000000000000e431 | 0.012 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 | uncovered | none observed |
| f5dce4c6c373b95a000000000000e433 | 0.009 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 | uncovered | none observed |

## P5 / sweep / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.664 | n/a | n/a | n/a | 2.092 | n/a | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 2.575 | 0.982 | 0.045 |
| p99 | 3.548 | n/a | n/a | n/a | 3.201 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.272 | 3.484 | 0.997 | 0.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ff75c85004b8827a0000000000000003 | 3.548 | 2.992 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.064 | 3.484 | 0.982 | 0.064 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000243 | 3.210 | 3.201 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.201 | 0.997 | 0.009 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000244 | 3.189 | 3.174 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.174 | 0.995 | 0.016 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a00000000000002f3 | 3.176 | 3.167 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.167 | 0.997 | 0.009 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000245 | 3.165 | 3.147 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.147 | 0.994 | 0.018 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000246 | 3.140 | 3.121 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.121 | 0.994 | 0.019 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000247 | 3.119 | 3.095 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.095 | 0.992 | 0.024 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000248 | 3.098 | 3.073 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.073 | 0.992 | 0.025 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000043 | 2.828 | 2.365 | n/a | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 2.803 | 0.991 | 0.025 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000004 | 2.808 | 2.234 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.082 | 2.726 | 0.971 | 0.082 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000005 | 2.664 | 2.083 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.089 | 2.575 | 0.967 | 0.089 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000006 | 2.623 | 2.020 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.111 | 2.512 | 0.958 | 0.111 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000007 | 2.581 | 1.968 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.122 | 2.459 | 0.953 | 0.122 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000044 | 2.575 | 2.092 | n/a | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 2.530 | 0.983 | 0.045 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000008 | 2.497 | 1.876 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.129 | 2.368 | 0.948 | 0.129 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000045 | 2.470 | 1.987 | n/a | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.045 | 2.425 | 0.982 | 0.045 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a0000000000000009 | 2.454 | 1.827 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.135 | 2.319 | 0.945 | 0.135 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a000000000000000a | 2.415 | 1.779 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.144 | 2.271 | 0.940 | 0.144 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a000000000000000b | 2.381 | 1.726 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.163 | 2.218 | 0.931 | 0.163 | node-14/thread-6/replica.pull-at | none observed |
| ff75c85004b8827a000000000000000d | 2.337 | 1.573 | n/a | 0.492 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.272 | 2.065 | 0.884 | 0.272 | node-14/thread-6/replica.pull-at | none observed |

## P3 / outside-phases / read (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.072 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 200.864 | 0.017 | n/a | 0.112 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 204.155 | n/a | n/a | n/a | 0.591 | n/a | 0.000 | 0.000 | 2.247 | 202.013 | 5.382 | n/a | 0.232 | 0.000 | n/a | n/a | 0.519 | 0.591 | 0.007 | 0.519 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000006 | 204.155 | 0.000 | n/a | 0.000 | 0.000 | 2.247 | 201.213 | 0.015 | n/a | 0.162 | 0.000 | n/a | n/a | 0.519 | 0.000 | 0.000 | 0.519 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f5420171000000000000005f | 203.540 | 0.000 | n/a | 0.000 | 0.000 | 2.162 | 201.113 | 0.022 | n/a | 0.102 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f54201710000000000000007 | 203.495 | 0.000 | n/a | 0.000 | 0.000 | 1.185 | 202.013 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000005 | 202.725 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 201.256 | 0.036 | n/a | 0.232 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f5420171000000000000009c | 202.709 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.310 | 0.050 | n/a | 0.114 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f542017100000000000000c4 | 202.681 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.256 | 0.046 | n/a | 0.188 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000077 | 202.675 | 0.000 | n/a | 0.000 | 0.000 | 0.825 | 201.524 | 0.026 | n/a | 0.186 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000074 | 202.523 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.146 | 0.019 | n/a | 0.129 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f542017100000000000000c3 | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 200.789 | 0.017 | n/a | 0.119 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f542017100000000000000c6 | 202.291 | 0.000 | n/a | 0.000 | 0.000 | 0.534 | 201.493 | 0.016 | n/a | 0.141 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f5420171000000000000007a | 202.151 | 0.000 | n/a | 0.000 | 0.000 | 1.049 | 200.824 | 0.019 | n/a | 0.114 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f5420171000000000000009b | 202.147 | 0.000 | n/a | 0.000 | 0.000 | 0.828 | 201.035 | 0.015 | n/a | 0.141 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f5420171000000000000005a | 202.113 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 200.964 | 0.016 | n/a | 0.128 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f5420171000000000000005c | 202.103 | 0.000 | n/a | 0.000 | 0.000 | 0.626 | 201.208 | 0.020 | n/a | 0.144 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000098 | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 200.864 | 0.010 | n/a | 0.087 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f5420171000000000000005d | 202.072 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.962 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000007c | 202.028 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 201.004 | 0.025 | n/a | 0.132 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f5420171000000000000007b | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.665 | 201.033 | 0.018 | n/a | 0.156 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f5420171000000000000007e | 201.975 | 0.000 | n/a | 0.000 | 0.000 | 1.243 | 200.499 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f542017100000000000000c7 | 201.915 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.820 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-48/journal/page | none observed |

## P3 / outside-phases / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 245.470 | n/a | n/a | n/a | 2.210 | n/a | 0.000 | 0.000 | 0.721 | 241.877 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 1.181 | 2.210 | 0.012 | 1.181 |
| p99 | 1005.494 | n/a | n/a | n/a | 75.583 | n/a | 3.417 | 0.000 | 1.688 | 1002.892 | 1.536 | n/a | 0.296 | 0.000 | n/a | n/a | 19.975 | 79.000 | 0.792 | 19.975 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000018 | 1005.494 | 0.264 | n/a | 0.000 | 0.000 | 1.020 | 1002.892 | 0.017 | n/a | 0.120 | 0.000 | n/a | n/a | 1.181 | 0.264 | 0.000 | 1.181 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd4054770000000000000017 | 1005.119 | 0.294 | n/a | 0.000 | 0.000 | 1.688 | 1001.379 | 0.031 | n/a | 0.296 | 0.000 | n/a | n/a | 1.431 | 0.294 | 0.000 | 1.431 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd4054770000000000000019 | 1003.945 | 0.183 | n/a | 0.000 | 0.000 | 1.076 | 1001.360 | 0.011 | n/a | 0.180 | 0.000 | n/a | n/a | 1.135 | 0.183 | 0.000 | 1.135 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd4054770000000000000082 | 1003.063 | 0.121 | n/a | 0.000 | 0.000 | 0.809 | 1000.930 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 1.109 | 0.121 | 0.000 | 1.109 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd405477000000000000009a | 1002.999 | 0.198 | n/a | 0.000 | 0.000 | 0.987 | 1000.585 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 1.142 | 0.198 | 0.000 | 1.142 | gw-r/thread-64/journal/page | none observed |
| 98b7fe27bd4054770000000000000053 | 1002.950 | 0.140 | n/a | 0.000 | 0.000 | 0.522 | 1000.959 | 0.020 | n/a | 0.120 | 0.000 | n/a | n/a | 1.189 | 0.140 | 0.000 | 1.189 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd405477000000000000007f | 800.195 | 2.250 | n/a | 0.000 | 0.000 | 0.721 | 797.085 | 0.009 | n/a | 0.068 | 0.000 | n/a | n/a | 0.061 | 2.250 | 0.003 | 0.061 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd4054770000000000000063 | 658.655 | 3.120 | n/a | 0.000 | 0.000 | 0.620 | 654.753 | 0.021 | n/a | 0.067 | 0.000 | n/a | n/a | 0.073 | 3.120 | 0.005 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd405477000000000000005f | 589.625 | 8.421 | n/a | 0.000 | 0.000 | 0.901 | 580.020 | 0.020 | n/a | 0.104 | 0.000 | n/a | n/a | 0.159 | 8.421 | 0.014 | 0.159 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd4054770000000000000052 | 493.411 | 3.300 | n/a | 0.000 | 0.000 | 0.863 | 488.829 | 0.183 | n/a | 0.109 | 0.000 | n/a | n/a | 0.127 | 3.300 | 0.007 | 0.127 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd405477000000000000005e | 350.788 | 2.841 | n/a | 0.000 | 0.000 | 0.813 | 346.929 | 0.017 | n/a | 0.077 | 0.000 | n/a | n/a | 0.110 | 2.841 | 0.008 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd405477000000000000007e | 245.470 | 2.720 | n/a | 0.000 | 0.000 | 0.734 | 241.877 | 0.013 | n/a | 0.057 | 0.000 | n/a | n/a | 0.069 | 2.720 | 0.011 | 0.069 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd4054770000000000000064 | 222.337 | 2.746 | n/a | 0.000 | 0.000 | 0.750 | 217.099 | 1.536 | n/a | 0.123 | 0.000 | n/a | n/a | 0.083 | 2.746 | 0.012 | 0.083 | gw-r/thread-64/journal/page | none observed |
| 98b7fe27bd4054770000000000000080 | 209.549 | 4.953 | n/a | 0.000 | 0.000 | 0.674 | 203.718 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.138 | 4.953 | 0.024 | 0.138 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd405477000000000000005c | 99.721 | 75.583 | n/a | 3.417 | 0.000 | 0.746 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.975 | 79.000 | 0.792 | 19.975 | node-14/thread-2/replica.fetch-feed | none observed |
| 98b7fe27bd4054770000000000000061 | 12.075 | 2.210 | n/a | 0.000 | 0.000 | 0.449 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.415 | 2.210 | 0.183 | 9.415 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000095 | 11.994 | 1.763 | n/a | 0.000 | 0.000 | 0.293 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.937 | 1.763 | 0.147 | 9.937 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000098 | 10.352 | 1.736 | n/a | 0.000 | 0.000 | 0.271 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.345 | 1.736 | 0.168 | 8.345 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000094 | 8.117 | 1.791 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.980 | 1.791 | 0.221 | 5.980 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000097 | 6.944 | 1.757 | n/a | 0.000 | 0.000 | 0.286 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.901 | 1.757 | 0.253 | 4.901 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 144.490 | n/a | n/a | n/a | 2.618 | n/a | 0.000 | 0.000 | 0.740 | 140.519 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.192 | 2.618 | 0.016 | 0.192 |
| p99 | 836.208 | n/a | n/a | n/a | 23.292 | n/a | 2.352 | 0.000 | 0.911 | 832.702 | 0.167 | n/a | 0.110 | 0.000 | n/a | n/a | 11.801 | 25.643 | 0.680 | 11.801 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000001d | 836.208 | 2.326 | n/a | 0.000 | 0.000 | 0.740 | 832.702 | 0.167 | n/a | 0.083 | 0.000 | n/a | n/a | 0.192 | 2.326 | 0.003 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd405477000000000000001c | 379.205 | 5.884 | n/a | 0.000 | 0.000 | 0.816 | 372.223 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.156 | 5.884 | 0.016 | 0.156 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd405477000000000000001f | 144.490 | 2.618 | n/a | 0.000 | 0.000 | 0.911 | 140.519 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.341 | 2.618 | 0.018 | 0.341 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd405477000000000000001a | 37.727 | 23.292 | n/a | 2.352 | 0.000 | 0.282 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.801 | 25.643 | 0.680 | 11.801 | node-14/thread-2/replica.publish | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 853.084 | n/a | n/a | n/a | 3.241 | n/a | 0.000 | 0.000 | 1.266 | 848.925 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.093 | 3.241 | 0.003 | 0.093 |
| p99 | 1002.803 | n/a | n/a | n/a | 4.005 | n/a | 0.000 | 0.000 | 1.331 | 998.593 | 0.016 | n/a | 0.262 | 0.000 | n/a | n/a | 0.102 | 4.005 | 0.028 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000023 | 1002.803 | 3.241 | n/a | 0.000 | 0.000 | 0.598 | 998.593 | 0.016 | n/a | 0.262 | 0.000 | n/a | n/a | 0.093 | 3.241 | 0.003 | 0.093 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd4054770000000000000020 | 853.084 | 2.634 | n/a | 0.000 | 0.000 | 1.331 | 848.925 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.102 | 2.634 | 0.003 | 0.102 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd4054770000000000000021 | 144.890 | 4.005 | n/a | 0.000 | 0.000 | 1.266 | 139.430 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.084 | 4.005 | 0.028 | 0.084 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 304.620 | n/a | n/a | n/a | 2.332 | n/a | 0.000 | 0.000 | 0.995 | 294.885 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.087 | 2.332 | 0.004 | 0.087 |
| p99 | 996.505 | n/a | n/a | n/a | 8.183 | n/a | 0.000 | 0.000 | 1.219 | 992.701 | 0.022 | n/a | 0.146 | 0.000 | n/a | n/a | 36.626 | 8.183 | 0.050 | 36.626 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000029 | 996.505 | 2.336 | n/a | 0.000 | 0.000 | 1.219 | 992.701 | 0.022 | n/a | 0.146 | 0.000 | n/a | n/a | 0.083 | 2.336 | 0.002 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 98b7fe27bd4054770000000000000027 | 657.387 | 2.332 | n/a | 0.000 | 0.000 | 0.995 | 653.851 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.087 | 2.332 | 0.004 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000025 | 304.620 | 8.183 | n/a | 0.000 | 0.000 | 1.129 | 294.885 | 0.010 | n/a | 0.105 | 0.000 | n/a | n/a | 0.307 | 8.183 | 0.027 | 0.307 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd4054770000000000000024 | 39.004 | 1.954 | n/a | 0.000 | 0.000 | 0.425 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.626 | 1.954 | 0.050 | 36.626 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 340.272 | n/a | n/a | n/a | 2.904 | n/a | 0.000 | 0.000 | 0.879 | 332.761 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.086 | 2.904 | 0.007 | 0.086 |
| p99 | 985.214 | n/a | n/a | n/a | 10.588 | n/a | 0.000 | 0.000 | 2.161 | 981.497 | 0.048 | n/a | 0.201 | 0.000 | n/a | n/a | 0.198 | 10.588 | 0.042 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000002f | 985.214 | 2.216 | n/a | 0.000 | 0.000 | 1.286 | 981.497 | 0.012 | n/a | 0.116 | 0.000 | n/a | n/a | 0.086 | 2.216 | 0.002 | 0.086 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd405477000000000000002b | 430.709 | 2.904 | n/a | 0.000 | 0.000 | 2.161 | 425.485 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.085 | 2.904 | 0.007 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd405477000000000000002d | 340.272 | 6.391 | n/a | 0.000 | 0.000 | 0.741 | 332.761 | 0.048 | n/a | 0.201 | 0.000 | n/a | n/a | 0.130 | 6.391 | 0.019 | 0.130 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd405477000000000000002a | 251.273 | 10.588 | n/a | 0.000 | 0.000 | 0.879 | 239.506 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.198 | 10.588 | 0.042 | 0.198 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 295.623 | n/a | n/a | n/a | 3.452 | n/a | 0.000 | 0.000 | 0.737 | 290.335 | 0.021 | n/a | 0.095 | 0.000 | n/a | n/a | 0.183 | 3.452 | 0.014 | 0.183 |
| p99 | 1003.044 | n/a | n/a | n/a | 5.163 | n/a | 0.000 | 0.000 | 1.166 | 1000.907 | 8.370 | n/a | 0.109 | 0.000 | n/a | n/a | 16.236 | 5.163 | 0.172 | 16.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000030 | 1003.044 | 0.139 | n/a | 0.000 | 0.000 | 0.737 | 1000.907 | 0.018 | n/a | 0.083 | 0.000 | n/a | n/a | 1.159 | 0.139 | 0.000 | 1.159 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000036 | 547.053 | 2.124 | n/a | 0.000 | 0.000 | 0.682 | 544.027 | 0.021 | n/a | 0.108 | 0.000 | n/a | n/a | 0.091 | 2.124 | 0.004 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd4054770000000000000032 | 295.623 | 4.102 | n/a | 0.000 | 0.000 | 0.865 | 290.335 | 0.029 | n/a | 0.109 | 0.000 | n/a | n/a | 0.183 | 4.102 | 0.014 | 0.183 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd4054770000000000000034 | 173.792 | 5.163 | n/a | 0.000 | 0.000 | 1.166 | 158.908 | 8.370 | n/a | 0.095 | 0.000 | n/a | n/a | 0.090 | 5.163 | 0.030 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd4054770000000000000031 | 20.030 | 3.452 | n/a | 0.000 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.236 | 3.452 | 0.172 | 16.236 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 392.962 | n/a | n/a | n/a | 2.259 | n/a | 0.000 | 0.000 | 1.324 | 388.732 | 0.018 | n/a | 0.088 | 0.000 | n/a | n/a | 0.081 | 2.259 | 0.005 | 0.081 |
| p99 | 766.884 | n/a | n/a | n/a | 5.551 | n/a | 0.000 | 0.000 | 2.297 | 759.582 | 0.241 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 5.551 | 0.010 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000037 | 766.884 | 5.551 | n/a | 0.000 | 0.000 | 1.324 | 759.582 | 0.241 | n/a | 0.094 | 0.000 | n/a | n/a | 0.091 | 5.551 | 0.007 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd405477000000000000003b | 642.103 | 2.259 | n/a | 0.000 | 0.000 | 0.770 | 638.902 | 0.018 | n/a | 0.078 | 0.000 | n/a | n/a | 0.077 | 2.259 | 0.004 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd405477000000000000003a | 392.962 | 2.076 | n/a | 0.000 | 0.000 | 1.966 | 388.732 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.084 | 2.076 | 0.005 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000038 | 242.603 | 2.436 | n/a | 0.000 | 0.000 | 2.297 | 237.682 | 0.019 | n/a | 0.088 | 0.000 | n/a | n/a | 0.081 | 2.436 | 0.010 | 0.081 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 314.193 | n/a | n/a | n/a | 3.349 | n/a | 0.000 | 0.000 | 0.762 | 308.284 | 0.023 | n/a | 0.125 | 0.000 | n/a | n/a | 0.136 | 3.349 | 0.012 | 0.136 |
| p99 | 650.416 | n/a | n/a | n/a | 5.165 | n/a | 0.000 | 0.000 | 1.163 | 646.324 | 3.518 | n/a | 0.150 | 0.000 | n/a | n/a | 0.255 | 5.165 | 0.032 | 0.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000040 | 650.416 | 3.221 | n/a | 0.000 | 0.000 | 0.632 | 646.324 | 0.012 | n/a | 0.125 | 0.000 | n/a | n/a | 0.101 | 3.221 | 0.005 | 0.101 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd405477000000000000003e | 611.885 | 2.484 | n/a | 0.000 | 0.000 | 0.597 | 608.581 | 0.023 | n/a | 0.114 | 0.000 | n/a | n/a | 0.084 | 2.484 | 0.004 | 0.084 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd405477000000000000003d | 314.193 | 4.439 | n/a | 0.000 | 0.000 | 1.163 | 308.284 | 0.031 | n/a | 0.139 | 0.000 | n/a | n/a | 0.136 | 4.439 | 0.014 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd4054770000000000000041 | 274.864 | 3.349 | n/a | 0.000 | 0.000 | 0.762 | 270.503 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.158 | 3.349 | 0.012 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd4054770000000000000043 | 159.991 | 5.165 | n/a | 0.000 | 0.000 | 1.104 | 149.800 | 3.518 | n/a | 0.150 | 0.000 | n/a | n/a | 0.255 | 5.165 | 0.032 | 0.255 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 944.984 | n/a | n/a | n/a | 2.236 | n/a | 0.000 | 0.000 | 1.495 | 935.869 | 0.014 | n/a | 0.089 | 0.000 | n/a | n/a | 0.092 | 2.236 | 0.002 | 0.092 |
| p99 | 969.617 | n/a | n/a | n/a | 4.383 | n/a | 0.000 | 0.000 | 4.377 | 965.686 | 0.025 | n/a | 0.095 | 0.000 | n/a | n/a | 0.242 | 4.383 | 0.005 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000046 | 969.617 | 2.236 | n/a | 0.000 | 0.000 | 1.495 | 965.686 | 0.014 | n/a | 0.095 | 0.000 | n/a | n/a | 0.092 | 2.236 | 0.002 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000045 | 944.984 | 4.383 | n/a | 0.000 | 0.000 | 4.377 | 935.869 | 0.025 | n/a | 0.089 | 0.000 | n/a | n/a | 0.242 | 4.383 | 0.005 | 0.242 | gw-r/thread-47/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.387 | n/a | n/a | n/a | 4.085 | n/a | 0.000 | 0.000 | 1.136 | 350.656 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.262 | 4.085 | 0.011 | 0.262 |
| p99 | 1006.349 | n/a | n/a | n/a | 5.378 | n/a | 0.000 | 0.000 | 3.988 | 1000.950 | 0.032 | n/a | 0.126 | 0.000 | n/a | n/a | 50.869 | 5.378 | 0.095 | 50.869 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000047 | 1006.349 | 0.124 | n/a | 0.000 | 0.000 | 3.988 | 1000.950 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 1.144 | 0.124 | 0.000 | 1.144 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd405477000000000000004b | 439.108 | 4.546 | n/a | 0.000 | 0.000 | 0.729 | 433.510 | 0.010 | n/a | 0.050 | 0.000 | n/a | n/a | 0.262 | 4.546 | 0.010 | 0.262 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000049 | 357.387 | 4.085 | n/a | 0.000 | 0.000 | 2.430 | 350.656 | 0.018 | n/a | 0.101 | 0.000 | n/a | n/a | 0.097 | 4.085 | 0.011 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd405477000000000000004c | 141.793 | 2.333 | n/a | 0.000 | 0.000 | 1.136 | 138.116 | 0.032 | n/a | 0.083 | 0.000 | n/a | n/a | 0.093 | 2.333 | 0.016 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd4054770000000000000048 | 56.786 | 5.378 | n/a | 0.000 | 0.000 | 0.539 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.869 | 5.378 | 0.095 | 50.869 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 985.740 | n/a | n/a | n/a | 2.260 | n/a | 0.000 | 0.000 | 0.578 | 982.557 | 0.210 | n/a | 0.073 | 0.000 | n/a | n/a | 0.085 | 2.260 | 0.002 | 0.085 |
| p99 | 992.333 | n/a | n/a | n/a | 4.422 | n/a | 0.000 | 0.000 | 0.642 | 989.281 | 0.346 | n/a | 0.077 | 0.000 | n/a | n/a | 0.114 | 4.422 | 0.008 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000004e | 992.333 | 2.048 | n/a | 0.000 | 0.000 | 0.642 | 989.281 | 0.210 | n/a | 0.077 | 0.000 | n/a | n/a | 0.076 | 2.048 | 0.002 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd405477000000000000004f | 985.740 | 2.260 | n/a | 0.000 | 0.000 | 0.578 | 982.557 | 0.187 | n/a | 0.073 | 0.000 | n/a | n/a | 0.085 | 2.260 | 0.002 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd4054770000000000000050 | 523.637 | 4.422 | n/a | 0.000 | 0.000 | 0.445 | 518.248 | 0.346 | n/a | 0.063 | 0.000 | n/a | n/a | 0.114 | 4.422 | 0.008 | 0.114 | gw-r/thread-44/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 800.538 | n/a | n/a | n/a | 2.175 | n/a | 0.000 | 0.000 | 0.544 | 796.196 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.090 | 2.175 | 0.004 | 0.090 |
| p99 | 969.000 | n/a | n/a | n/a | 3.123 | n/a | 0.000 | 0.000 | 0.800 | 966.199 | 0.160 | n/a | 0.168 | 0.000 | n/a | n/a | 28.180 | 3.123 | 0.071 | 28.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000055 | 969.000 | 2.105 | n/a | 0.000 | 0.000 | 0.544 | 966.199 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.072 | 2.105 | 0.002 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 98b7fe27bd4054770000000000000056 | 800.538 | 3.123 | n/a | 0.000 | 0.000 | 0.800 | 796.196 | 0.160 | n/a | 0.168 | 0.000 | n/a | n/a | 0.090 | 3.123 | 0.004 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd4054770000000000000054 | 30.766 | 2.175 | n/a | 0.000 | 0.000 | 0.411 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.180 | 2.175 | 0.071 | 28.180 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 211.978 | n/a | n/a | n/a | 3.106 | n/a | 0.000 | 0.000 | 0.822 | 207.866 | 0.018 | n/a | 0.071 | 0.000 | n/a | n/a | 0.098 | 3.106 | 0.015 | 0.098 |
| p99 | 739.852 | n/a | n/a | n/a | 107.591 | n/a | 6.491 | 0.000 | 1.240 | 621.393 | 0.134 | n/a | 0.106 | 0.000 | n/a | n/a | 3.015 | 114.082 | 0.154 | 3.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000005b | 739.852 | 107.591 | n/a | 6.491 | 0.000 | 1.240 | 621.393 | 0.017 | n/a | 0.106 | 0.000 | n/a | n/a | 3.015 | 114.082 | 0.154 | 3.015 | gw-r/thread-46/journal/page | none observed |
| 98b7fe27bd4054770000000000000057 | 211.978 | 3.106 | n/a | 0.000 | 0.000 | 0.822 | 207.866 | 0.018 | n/a | 0.068 | 0.000 | n/a | n/a | 0.098 | 3.106 | 0.015 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 98b7fe27bd4054770000000000000059 | 187.266 | 1.737 | n/a | 0.000 | 0.000 | 0.761 | 184.491 | 0.134 | n/a | 0.071 | 0.000 | n/a | n/a | 0.073 | 1.737 | 0.009 | 0.073 | gw-r/thread-47/journal/page | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 256.686 | n/a | n/a | n/a | 3.212 | n/a | 0.000 | 0.000 | 0.685 | 253.899 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.076 | 3.212 | 0.015 | 0.076 |
| p99 | 946.696 | n/a | n/a | n/a | 100.291 | n/a | 5.774 | 0.000 | 3.032 | 837.737 | 0.182 | n/a | 0.130 | 0.000 | n/a | n/a | 38.901 | 106.065 | 0.172 | 38.901 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000076 | 946.696 | 100.291 | n/a | 5.774 | 0.000 | 1.170 | 837.737 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 1.623 | 106.065 | 0.112 | 1.623 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000073 | 580.562 | 3.599 | n/a | 0.000 | 0.000 | 0.651 | 576.164 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.066 | 3.599 | 0.006 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000075 | 400.824 | 2.186 | n/a | 0.000 | 0.000 | 0.685 | 397.778 | 0.022 | n/a | 0.089 | 0.000 | n/a | n/a | 0.063 | 2.186 | 0.005 | 0.063 | gw-r/thread-64/journal/page | none observed |
| 98b7fe27bd4054770000000000000069 | 312.520 | 2.714 | n/a | 0.000 | 0.000 | 0.555 | 309.087 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.068 | 2.714 | 0.009 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 98b7fe27bd4054770000000000000068 | 276.661 | 4.037 | n/a | 0.000 | 0.000 | 1.045 | 271.343 | 0.015 | n/a | 0.120 | 0.000 | n/a | n/a | 0.102 | 4.037 | 0.015 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd405477000000000000006c | 256.686 | 2.043 | n/a | 0.000 | 0.000 | 0.563 | 253.899 | 0.023 | n/a | 0.086 | 0.000 | n/a | n/a | 0.072 | 2.043 | 0.008 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 98b7fe27bd4054770000000000000067 | 127.056 | 6.468 | n/a | 0.000 | 0.000 | 1.450 | 118.582 | 0.182 | n/a | 0.130 | 0.000 | n/a | n/a | 0.244 | 6.468 | 0.051 | 0.244 | gw-r/thread-64/journal/page | none observed |
| 98b7fe27bd4054770000000000000072 | 79.147 | 2.357 | n/a | 0.000 | 0.000 | 1.311 | 75.335 | 0.009 | n/a | 0.059 | 0.000 | n/a | n/a | 0.076 | 2.357 | 0.030 | 0.076 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd405477000000000000006f | 45.145 | 3.212 | n/a | 0.000 | 0.000 | 3.032 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.901 | 3.212 | 0.071 | 38.901 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd405477000000000000006d | 27.427 | 4.719 | n/a | 0.000 | 0.000 | 0.344 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.363 | 4.719 | 0.172 | 22.363 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 129.901 | n/a | n/a | n/a | 86.275 | n/a | 4.824 | 0.000 | 1.013 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.971 | 94.033 | 0.671 | 10.971 |
| p99 | 149.791 | n/a | n/a | n/a | 101.069 | n/a | 10.744 | 0.000 | 2.078 | 62.065 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 47.208 | 106.098 | 0.899 | 47.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000007b | 149.791 | 86.275 | n/a | 7.759 | 0.000 | 1.013 | 52.925 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 1.779 | 94.033 | 0.628 | 1.779 | node-14/thread-2/replica.fetch-feed | none observed |
| 98b7fe27bd405477000000000000007d | 146.801 | 87.734 | n/a | 10.744 | 0.000 | 1.115 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.208 | 98.479 | 0.671 | 47.208 | node-14/thread-2/replica.fetch-feed | none observed |
| 98b7fe27bd405477000000000000007c | 145.366 | 77.589 | n/a | 2.912 | 0.000 | 1.292 | 62.065 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 1.442 | 80.501 | 0.554 | 1.442 | node-14/thread-2/replica.fetch-feed | none observed |
| 98b7fe27bd4054770000000000000078 | 129.901 | 99.424 | n/a | 4.824 | 0.000 | 2.078 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.575 | 104.248 | 0.803 | 23.575 | node-14/thread-2/replica.fetch-feed | none observed |
| 98b7fe27bd4054770000000000000077 | 117.972 | 101.069 | n/a | 5.029 | 0.000 | 0.903 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.971 | 106.098 | 0.899 | 10.971 | node-14/thread-2/replica.fetch-feed | none observed |
| 98b7fe27bd405477000000000000007a | 114.101 | 76.535 | n/a | 2.715 | 0.000 | 0.665 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.186 | 79.250 | 0.695 | 34.186 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 187.461 | n/a | n/a | n/a | 2.399 | n/a | 0.000 | 0.000 | 0.491 | 181.678 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.100 | 2.399 | 0.021 | 0.100 |
| p99 | 979.056 | n/a | n/a | n/a | 18.002 | n/a | 0.633 | 0.000 | 1.650 | 975.075 | 1.882 | n/a | 0.102 | 0.000 | n/a | n/a | 1.382 | 18.636 | 0.568 | 1.382 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000008b | 979.056 | 2.170 | n/a | 0.000 | 0.000 | 1.650 | 975.075 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.065 | 2.170 | 0.002 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 98b7fe27bd4054770000000000000086 | 473.000 | 18.002 | n/a | 0.633 | 0.000 | 1.054 | 452.842 | 0.192 | n/a | 0.102 | 0.000 | n/a | n/a | 0.175 | 18.636 | 0.039 | 0.175 | gw-r/thread-44/journal/page | none observed |
| 98b7fe27bd4054770000000000000084 | 291.311 | 5.747 | n/a | 0.000 | 0.000 | 0.489 | 284.829 | 0.012 | n/a | 0.071 | 0.000 | n/a | n/a | 0.164 | 5.747 | 0.020 | 0.164 | gw-r/thread-64/journal/page | none observed |
| 98b7fe27bd405477000000000000008a | 187.461 | 3.972 | n/a | 0.000 | 0.000 | 1.471 | 181.678 | 0.149 | n/a | 0.091 | 0.000 | n/a | n/a | 0.100 | 3.972 | 0.021 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 98b7fe27bd4054770000000000000083 | 64.893 | 2.207 | n/a | 0.000 | 0.000 | 0.491 | 60.233 | 1.882 | n/a | 0.023 | 0.000 | n/a | n/a | 0.058 | 2.207 | 0.034 | 0.058 | gw-r/thread-47/journal/page | none observed |
| 98b7fe27bd4054770000000000000087 | 4.226 | 2.399 | n/a | 0.000 | 0.000 | 0.445 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.382 | 2.399 | 0.568 | 1.382 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 681.688 | n/a | n/a | n/a | 4.089 | n/a | 0.000 | 0.000 | 0.953 | 676.438 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.123 | 4.089 | 0.006 | 0.123 |
| p99 | 789.660 | n/a | n/a | n/a | 7.409 | n/a | 0.000 | 0.000 | 1.231 | 785.898 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.149 | 7.409 | 0.023 | 0.149 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd405477000000000000008f | 789.660 | 2.312 | n/a | 0.000 | 0.000 | 1.231 | 785.898 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.123 | 2.312 | 0.003 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 98b7fe27bd405477000000000000008c | 681.688 | 4.089 | n/a | 0.000 | 0.000 | 0.953 | 676.438 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.100 | 4.089 | 0.006 | 0.100 | gw-r/thread-47/journal/page | none observed |
| 98b7fe27bd405477000000000000008e | 315.268 | 7.409 | n/a | 0.000 | 0.000 | 0.676 | 306.937 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.149 | 7.409 | 0.023 | 0.149 | gw-r/thread-50/journal/page | none observed |

## P3 / sweep / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.955 | n/a | n/a | n/a | 1.797 | n/a | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.754 | 1.797 | 0.152 | 6.754 |
| p99 | 30.107 | n/a | n/a | n/a | 3.032 | n/a | 0.000 | 0.000 | 0.402 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.168 | 3.032 | 0.297 | 28.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 98b7fe27bd4054770000000000000090 | 30.107 | 1.663 | n/a | 0.000 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.168 | 1.663 | 0.055 | 28.168 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000091 | 19.891 | 3.032 | n/a | 0.000 | 0.000 | 0.250 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.610 | 3.032 | 0.152 | 16.610 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000093 | 9.955 | 2.960 | n/a | 0.000 | 0.000 | 0.402 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.593 | 2.960 | 0.297 | 6.593 | node-14/thread-2/socket.wait-first-byte | none observed |
| 98b7fe27bd4054770000000000000092 | 8.872 | 1.797 | n/a | 0.000 | 0.000 | 0.321 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.754 | 1.797 | 0.203 | 6.754 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.927 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 200.857 | 0.014 | n/a | 0.121 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 205.787 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.579 | 201.507 | 3.477 | n/a | 0.238 | 0.000 | n/a | n/a | 0.425 | 0.000 | 0.000 | 0.425 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000008 | 205.787 | 0.000 | n/a | 0.000 | 0.000 | 4.579 | 200.860 | 0.014 | n/a | 0.132 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f5420171000000000000000e | 203.992 | 0.000 | n/a | 0.000 | 0.000 | 2.129 | 201.507 | 0.046 | n/a | 0.177 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000009 | 203.089 | 0.000 | n/a | 0.000 | 0.000 | 1.603 | 200.917 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 0.425 | 0.000 | 0.000 | 0.425 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f5420171000000000000000b | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 1.160 | 200.857 | 0.028 | n/a | 0.238 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000000d | 202.383 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 200.929 | 0.014 | n/a | 0.154 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f5420171000000000000000f | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 200.905 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000010 | 163.042 | 0.000 | n/a | 0.000 | 0.000 | 1.121 | 161.302 | 0.429 | n/a | 0.061 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f5420171000000000000000c | 152.552 | 0.000 | n/a | 0.000 | 0.000 | 1.721 | 147.101 | 3.477 | n/a | 0.106 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000011 | 141.876 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 141.128 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000000a | 96.667 | 0.000 | n/a | 0.000 | 0.000 | 1.808 | 94.557 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.813 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 200.717 | 0.013 | n/a | 0.123 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 202.155 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 201.291 | 0.023 | n/a | 0.167 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000013 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.564 | 201.291 | 0.018 | n/a | 0.167 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000014 | 202.057 | 0.000 | n/a | 0.000 | 0.000 | 0.631 | 201.136 | 0.023 | n/a | 0.160 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000012 | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.764 | 200.717 | 0.013 | n/a | 0.123 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000015 | 183.223 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 181.988 | 0.011 | n/a | 0.109 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 183.512 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 175.313 | 0.023 | n/a | 0.087 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 203.357 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.548 | 201.787 | 7.029 | n/a | 0.233 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000021 | 203.357 | 0.000 | n/a | 0.000 | 0.000 | 1.548 | 201.557 | 0.017 | n/a | 0.125 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000022 | 203.299 | 0.000 | n/a | 0.000 | 0.000 | 1.090 | 201.787 | 0.023 | n/a | 0.233 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f5420171000000000000001f | 183.512 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 175.313 | 7.029 | n/a | 0.087 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000020 | 162.340 | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 161.511 | 0.023 | n/a | 0.067 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000023 | 105.861 | 0.000 | n/a | 0.000 | 0.000 | 1.029 | 101.252 | 3.364 | n/a | 0.087 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.533 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.137 | 0.023 | n/a | 0.164 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 208.566 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.661 | 206.745 | 6.846 | n/a | 0.216 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f5420171000000000000002c | 208.566 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 206.745 | 0.059 | n/a | 0.201 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f54201710000000000000025 | 203.268 | 0.000 | n/a | 0.000 | 0.000 | 1.590 | 201.388 | 0.021 | n/a | 0.164 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000024 | 202.951 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.653 | 0.046 | n/a | 0.213 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000002d | 202.686 | 0.000 | n/a | 0.000 | 0.000 | 1.040 | 201.244 | 0.023 | n/a | 0.198 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000028 | 202.576 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.340 | 0.043 | n/a | 0.192 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000002a | 202.533 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 201.137 | 0.013 | n/a | 0.216 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000026 | 201.968 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 200.975 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000002e | 186.693 | 0.000 | n/a | 0.000 | 0.000 | 1.661 | 178.019 | 6.846 | n/a | 0.051 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000002b | 166.001 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 164.969 | 0.073 | n/a | 0.042 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000027 | 83.480 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 82.446 | 0.014 | n/a | 0.060 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.743 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 200.833 | 0.025 | n/a | 0.135 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 202.870 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.741 | 201.539 | 3.345 | n/a | 0.167 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000037 | 202.870 | 0.000 | n/a | 0.000 | 0.000 | 1.106 | 201.351 | 0.042 | n/a | 0.147 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f5420171000000000000002f | 202.732 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.475 | 0.015 | n/a | 0.147 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000032 | 202.616 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.539 | 0.025 | n/a | 0.157 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f54201710000000000000031 | 202.263 | 0.000 | n/a | 0.000 | 0.000 | 0.718 | 201.237 | 0.021 | n/a | 0.167 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000034 | 202.128 | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 201.243 | 0.027 | n/a | 0.135 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000035 | 201.743 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 200.833 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000036 | 200.181 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 195.706 | 3.345 | n/a | 0.161 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f54201710000000000000033 | 165.333 | 0.000 | n/a | 0.000 | 0.000 | 1.641 | 160.977 | 2.508 | n/a | 0.103 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000039 | 141.009 | 0.000 | n/a | 0.000 | 0.000 | 1.741 | 138.987 | 0.023 | n/a | 0.130 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000030 | 82.357 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 79.372 | 2.137 | n/a | 0.045 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.213 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 200.949 | 0.032 | n/a | 0.124 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 202.807 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.278 | 201.660 | 5.523 | n/a | 0.203 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f5420171000000000000003d | 202.807 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 201.660 | 0.038 | n/a | 0.203 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f54201710000000000000042 | 202.530 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.318 | 0.032 | n/a | 0.157 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f5420171000000000000003b | 202.491 | 0.000 | n/a | 0.000 | 0.000 | 0.849 | 201.315 | 0.045 | n/a | 0.157 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000003c | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 201.111 | 0.027 | n/a | 0.133 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f54201710000000000000040 | 202.345 | 0.000 | n/a | 0.000 | 0.000 | 0.684 | 201.327 | 0.054 | n/a | 0.166 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000041 | 202.213 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 200.949 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f5420171000000000000003a | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 200.900 | 0.016 | n/a | 0.114 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000003f | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.930 | 0.017 | n/a | 0.110 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000043 | 79.072 | 0.000 | n/a | 0.000 | 0.000 | 2.278 | 71.964 | 4.516 | n/a | 0.105 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f5420171000000000000003e | 51.261 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 44.549 | 5.523 | n/a | 0.096 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-44/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.511 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 201.120 | 0.019 | n/a | 0.123 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 |
| p99 | 206.569 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.716 | 205.197 | 3.766 | n/a | 0.248 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f5420171000000000000004c | 206.569 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 205.197 | 0.086 | n/a | 0.123 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f54201710000000000000044 | 204.872 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 203.691 | 0.020 | n/a | 0.134 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000047 | 203.184 | 0.000 | n/a | 0.000 | 0.000 | 1.399 | 201.346 | 0.016 | n/a | 0.148 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000045 | 203.009 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.759 | 0.054 | n/a | 0.218 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000046 | 202.917 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 201.577 | 0.019 | n/a | 0.155 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000049 | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.365 | 200.855 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000004b | 202.441 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.120 | 0.016 | n/a | 0.122 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000048 | 148.183 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 147.141 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f5420171000000000000004a | 139.560 | 0.000 | n/a | 0.000 | 0.000 | 2.716 | 133.326 | 3.344 | n/a | 0.060 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f5420171000000000000004e | 114.041 | 0.000 | n/a | 0.000 | 0.000 | 1.170 | 108.600 | 3.766 | n/a | 0.248 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-48/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.825 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.427 | 0.021 | n/a | 0.147 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 220.923 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.546 | 219.843 | 0.059 | n/a | 0.324 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000055 | 220.923 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 219.843 | 0.014 | n/a | 0.110 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f5420171000000000000004f | 206.114 | 0.000 | n/a | 0.000 | 0.000 | 1.254 | 204.510 | 0.021 | n/a | 0.225 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000056 | 203.785 | 0.000 | n/a | 0.000 | 0.000 | 1.300 | 201.909 | 0.059 | n/a | 0.324 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f54201710000000000000054 | 203.328 | 0.000 | n/a | 0.000 | 0.000 | 1.546 | 201.482 | 0.021 | n/a | 0.168 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000057 | 203.125 | 0.000 | n/a | 0.000 | 0.000 | 1.150 | 201.574 | 0.026 | n/a | 0.222 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000052 | 202.825 | 0.000 | n/a | 0.000 | 0.000 | 1.060 | 201.427 | 0.026 | n/a | 0.147 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000051 | 202.317 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.377 | 0.037 | n/a | 0.163 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f54201710000000000000050 | 202.038 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 200.918 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000059 | 201.773 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.828 | 0.013 | n/a | 0.102 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000053 | 88.462 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 87.151 | 0.020 | n/a | 0.076 | 0.000 | n/a | n/a | 0.289 | 0.000 | 0.000 | 0.289 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f54201710000000000000058 | 73.269 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 72.208 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.991 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 200.840 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 203.067 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.683 | 201.304 | 6.948 | n/a | 0.140 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000064 | 203.067 | 0.000 | n/a | 0.000 | 0.000 | 1.772 | 201.042 | 0.015 | n/a | 0.106 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f5420171000000000000006a | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 0.864 | 201.304 | 0.018 | n/a | 0.140 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f54201710000000000000067 | 202.163 | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 200.940 | 0.031 | n/a | 0.135 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000060 | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 201.025 | 0.012 | n/a | 0.114 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000065 | 202.117 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 200.922 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000062 | 202.067 | 0.000 | n/a | 0.000 | 0.000 | 0.619 | 201.194 | 0.019 | n/a | 0.135 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000061 | 201.991 | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 200.835 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f5420171000000000000006b | 201.922 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 200.826 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000066 | 201.765 | 0.000 | n/a | 0.000 | 0.000 | 0.693 | 200.840 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000069 | 201.608 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.742 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000063 | 135.689 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 134.734 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f5420171000000000000006c | 121.037 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 120.062 | 0.011 | n/a | 0.066 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f54201710000000000000068 | 90.473 | 0.000 | n/a | 0.000 | 0.000 | 6.683 | 76.696 | 6.948 | n/a | 0.035 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-51/journal/page | none observed |

## P3 / grow3 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 199.962 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 196.709 | 0.018 | n/a | 0.073 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 |
| p99 | 202.100 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.134 | 120.437 | n/a | 0.125 | 0.000 | n/a | n/a | 0.586 | 0.000 | 0.000 | 0.586 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f5420171000000000000006f | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 200.938 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f54201710000000000000070 | 202.099 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 201.134 | 0.018 | n/a | 0.125 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f5420171000000000000006d | 199.962 | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 196.709 | 2.341 | n/a | 0.041 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f5420171000000000000006e | 183.070 | 0.000 | n/a | 0.000 | 0.000 | 0.678 | 182.098 | 0.018 | n/a | 0.069 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f54201710000000000000071 | 180.375 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 58.389 | 120.437 | n/a | 0.073 | 0.000 | n/a | n/a | 0.586 | 0.000 | 0.000 | 0.586 | gw-r/thread-51/gateway.admission-wait | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.987 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 200.733 | 0.026 | n/a | 0.115 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 202.708 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 201.427 | 7.069 | n/a | 0.201 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000084 | 202.708 | 0.000 | n/a | 0.000 | 0.000 | 0.817 | 201.427 | 0.120 | n/a | 0.201 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000080 | 202.526 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 201.317 | 0.023 | n/a | 0.175 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000089 | 202.433 | 0.000 | n/a | 0.000 | 0.000 | 0.861 | 201.261 | 0.054 | n/a | 0.143 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f5420171000000000000008c | 202.107 | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.975 | 0.024 | n/a | 0.129 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f5420171000000000000008e | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 200.733 | 0.023 | n/a | 0.099 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f54201710000000000000082 | 202.075 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 201.299 | 0.026 | n/a | 0.184 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f5420171000000000000008a | 201.987 | 0.000 | n/a | 0.000 | 0.000 | 0.765 | 200.904 | 0.019 | n/a | 0.140 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f5420171000000000000008d | 177.151 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 173.998 | 2.342 | n/a | 0.046 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f5420171000000000000008b | 139.500 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 135.628 | 2.810 | n/a | 0.074 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 94d61be0f5420171000000000000007f | 121.920 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 120.895 | 0.017 | n/a | 0.076 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000083 | 86.671 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 78.363 | 7.069 | n/a | 0.080 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f54201710000000000000088 | 71.237 | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 70.129 | 0.023 | n/a | 0.115 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f54201710000000000000081 | 54.782 | 0.000 | n/a | 0.000 | 0.000 | 0.713 | 53.215 | 0.653 | n/a | 0.073 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-44/journal/page | none observed |

## P3 / grow10 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 99.251 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 84.330 | 0.015 | n/a | 0.093 | 0.000 | n/a | n/a | 0.519 | 0.000 | 0.000 | 0.519 |
| p99 | 390.260 | n/a | n/a | n/a | 1.739 | n/a | 0.000 | 0.000 | 5.921 | 229.851 | 158.852 | n/a | 0.252 | 0.000 | n/a | n/a | 0.587 | 1.739 | 0.018 | 0.587 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f54201710000000000000090 | 390.260 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 229.851 | 158.852 | n/a | 0.093 | 0.000 | n/a | n/a | 0.587 | 0.000 | 0.000 | 0.587 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f5420171000000000000008f | 202.569 | 0.000 | n/a | 0.000 | 0.000 | 1.081 | 201.156 | 0.015 | n/a | 0.154 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f54201710000000000000095 | 117.218 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 115.609 | 0.010 | n/a | 0.252 | 0.000 | n/a | n/a | 0.530 | 0.000 | 0.000 | 0.530 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000096 | 99.251 | 1.739 | n/a | 0.000 | 0.000 | 5.921 | 76.718 | 14.545 | n/a | 0.070 | 0.000 | n/a | n/a | 0.258 | 1.739 | 0.018 | 0.258 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f54201710000000000000094 | 86.624 | 0.000 | n/a | 0.000 | 0.000 | 1.694 | 84.330 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.519 | 0.000 | 0.000 | 0.519 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f54201710000000000000097 | 51.678 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 49.856 | 0.221 | n/a | 0.094 | 0.000 | n/a | n/a | 0.560 | 0.000 | 0.000 | 0.560 | gw-r/thread-44/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.932 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 200.876 | 0.014 | n/a | 0.121 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 202.449 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 201.278 | 3.808 | n/a | 0.137 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f542017100000000000000a7 | 202.449 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 201.190 | 0.025 | n/a | 0.126 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f542017100000000000000ad | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.278 | 0.029 | n/a | 0.137 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f542017100000000000000ae | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 200.839 | 0.011 | n/a | 0.128 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-51/journal/page | none observed |
| 94d61be0f542017100000000000000a2 | 202.098 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 201.075 | 0.016 | n/a | 0.128 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f542017100000000000000a0 | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 201.070 | 0.015 | n/a | 0.122 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 94d61be0f542017100000000000000ab | 201.973 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 200.914 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f542017100000000000000a6 | 201.932 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 201.065 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f542017100000000000000a1 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 200.876 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f542017100000000000000a4 | 201.687 | 0.000 | n/a | 0.000 | 0.000 | 0.607 | 200.865 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f542017100000000000000ac | 201.495 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.676 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f542017100000000000000aa | 182.132 | 0.000 | n/a | 0.000 | 0.000 | 0.473 | 181.394 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| 94d61be0f542017100000000000000a3 | 167.391 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 166.309 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f542017100000000000000a5 | 69.741 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 64.839 | 3.808 | n/a | 0.070 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.739 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 200.852 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 202.784 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.555 | 201.546 | 3.259 | n/a | 0.135 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 94d61be0f542017100000000000000b2 | 202.784 | 0.000 | n/a | 0.000 | 0.000 | 0.761 | 201.546 | 0.153 | n/a | 0.135 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f542017100000000000000b1 | 202.271 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 200.984 | 0.010 | n/a | 0.106 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f542017100000000000000b7 | 202.183 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.084 | 0.018 | n/a | 0.126 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f542017100000000000000b6 | 202.134 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.273 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f542017100000000000000b8 | 202.017 | 0.000 | n/a | 0.000 | 0.000 | 0.723 | 201.059 | 0.015 | n/a | 0.122 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 94d61be0f542017100000000000000b4 | 201.739 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 200.756 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f542017100000000000000b0 | 201.723 | 0.000 | n/a | 0.000 | 0.000 | 0.640 | 200.852 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 94d61be0f542017100000000000000b9 | 113.952 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 109.688 | 3.259 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 94d61be0f542017100000000000000b5 | 90.668 | 0.000 | n/a | 0.000 | 0.000 | 3.555 | 86.896 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-64/journal/page | none observed |
| 94d61be0f542017100000000000000af | 85.232 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 81.544 | 2.300 | n/a | 0.122 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

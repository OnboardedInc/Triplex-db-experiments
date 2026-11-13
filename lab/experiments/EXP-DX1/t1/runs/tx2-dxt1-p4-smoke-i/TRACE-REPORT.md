# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (156.631 ms, trace `727872374d05bf1c00000000000000b5`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (139.195 ms, trace `727872374d05bf1c00000000000000c9`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (83.103 ms, trace `727872374d05bf1c00000000000000b9`); `gw-w/thread-64/peer.transact-await (includes order/network/storage)` (85.078 ms, trace `727872374d05bf1c0000000000000141`); `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (93.413 ms, trace `727872374d05bf1c00000000000000cf`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-i`; source `a057992d28395c9431fc578a145f4678ae26ea21`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 788795.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 95 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1403.223 | 179.194 | 241.889 | 39 |
| baseline | 0 | 1963.056 | 30.193 | 5.886 | 30 |
| L1 | 1 | 1977.650 | 147.221 | 8.589 | 44 |
| L4 | 4 | 1979.820 | 239.666 | 234.671 | 44 |
| L16 | 16 | 1963.308 | 208.153 | 251.196 | 44 |
| L64 | 16 | 1920.188 | 193.811 | 218.417 | 49 |
| L256 | 16 | 1644.380 | 151.637 | 183.413 | 58 |
| L1024 | 16 | 1054.829 | 128.930 | 185.951 | 16 |
| recovery | 16 | 1043.635 | 88.421 | 111.606 | 44 |
| p4mix | 1 | 1649.831 | 33.013 | 39.104 | 38 |
| p4h1 | 1 | 1818.375 | 27.745 | 14.917 | 21 |
| grow3 | 0 | 421.224 | 12.554 | 1.144 | 31 |
| p4h3 | 1 | 2189.947 | 74.486 | 29.049 | 122 |
| grow10 | 0 | 122.703 | 26.295 | 12.753 | 22 |
| p4h10 | 1 | 2349.847 | 49.471 | 58.180 | 72 |
| presweep | 16 | 1024.168 | 82.176 | 164.239 | 30 |
| sweep | 16 | 139.173 | 36.230 | 36.810 | 140 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 727872374d05bf1c00000000000000b5 | driver.queue.scheduler-late | 0.280 | none | 0 / 32 |
| 727872374d05bf1c00000000000000b5 | driver.queue.scheduler-dispatch | 0.070 | none | 0 / 32 |

Observed active steps while trace 727872374d05bf1c00000000000000b5 waited: []

| 727872374d05bf1c00000000000000c9 | driver.queue.scheduler-late | 0.993 | none | 0 / 32 |
| 727872374d05bf1c00000000000000c9 | driver.queue.scheduler-dispatch | 0.077 | none | 0 / 32 |

Observed active steps while trace 727872374d05bf1c00000000000000c9 waited: []

| 727872374d05bf1c00000000000000b9 | driver.queue.scheduler-dispatch | 0.065 | none | 0 / 32 |
| 727872374d05bf1c00000000000000b9 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 727872374d05bf1c00000000000000b9 waited: []

| 727872374d05bf1c0000000000000141 | driver.queue.scheduler-dispatch | 0.010 | none | 9 / 32 |
| 727872374d05bf1c0000000000000141 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 727872374d05bf1c0000000000000141 waited: []

| 727872374d05bf1c00000000000000cf | driver.queue.scheduler-dispatch | 0.067 | none | 0 / 32 |
| 727872374d05bf1c00000000000000cf | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 727872374d05bf1c00000000000000cf waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.276 | 0.378 | 0.000 | 0.739 | 8.773 | 0.016 | 0.000 | 0.124 | 3.354 | 7.715 | 0.210 | n/a | 0.870 | 17.569 | n/a | n/a | 0.085 | 9.570 | 0.202 | 0.085 |
| p99 | 72.418 | 1.752 | 0.000 | 3.372 | 35.612 | 1.466 | 0.000 | 1.519 | 4.935 | 10.136 | 0.371 | n/a | 3.827 | 43.065 | n/a | n/a | 0.375 | 36.227 | 0.500 | 0.375 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000094 | 72.418 | 35.612 | 0.492 | 0.000 | 0.124 | 4.935 | 9.419 | 0.371 | n/a | 3.827 | 17.569 | n/a | n/a | 0.070 | 36.227 | 0.500 | 0.070 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 1.403ms |
| 727872374d05bf1c0000000000000096 | 63.592 | 6.518 | 0.016 | 0.000 | 1.519 | 3.354 | 7.715 | 0.228 | n/a | 0.870 | 43.065 | n/a | n/a | 0.308 | 8.053 | 0.127 | 0.308 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000092 | 47.276 | 8.773 | 0.010 | 0.000 | 0.787 | 1.339 | 10.136 | 0.078 | n/a | 0.398 | 25.380 | n/a | n/a | 0.375 | 9.570 | 0.202 | 0.375 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000098 | 37.966 | 9.690 | 1.466 | 0.000 | 0.077 | 4.469 | 5.308 | 0.210 | n/a | 1.162 | 15.499 | n/a | n/a | 0.085 | 11.233 | 0.296 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 63.592 | 1.626 | 0.000 | 2.502 | 6.518 | 0.016 | 0.000 | 1.519 | 3.354 | 7.715 | 0.228 | n/a | 0.870 | 43.065 | n/a | n/a | 0.308 | 8.053 | 0.127 | 0.308 |
| p99 | 63.592 | 1.626 | 0.000 | 2.502 | 6.518 | 0.016 | 0.000 | 1.519 | 3.354 | 7.715 | 0.228 | n/a | 0.870 | 43.065 | n/a | n/a | 0.308 | 8.053 | 0.127 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000096 | 63.592 | 6.518 | 0.016 | 0.000 | 1.519 | 3.354 | 7.715 | 0.228 | n/a | 0.870 | 43.065 | n/a | n/a | 0.308 | 8.053 | 0.127 | 0.308 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.490 | 0.457 | 0.000 | 0.696 | 4.439 | 0.184 | 0.000 | 0.086 | 2.377 | 2.420 | 0.057 | n/a | 0.308 | 6.944 | n/a | n/a | 0.075 | 5.203 | 0.265 | 0.075 |
| p99 | 23.941 | 0.555 | 0.000 | 1.803 | 5.616 | 0.323 | 0.000 | 0.754 | 2.860 | 6.584 | 0.097 | n/a | 0.365 | 7.935 | n/a | n/a | 0.079 | 6.025 | 0.340 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c000000000000009e | 23.941 | 5.616 | 0.323 | 0.000 | 0.086 | 2.860 | 6.584 | 0.097 | n/a | 0.365 | 7.935 | n/a | n/a | 0.075 | 6.025 | 0.252 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000009c | 15.490 | 3.846 | 0.184 | 0.000 | 0.078 | 2.377 | 2.420 | 0.057 | n/a | 0.307 | 6.171 | n/a | n/a | 0.051 | 4.108 | 0.265 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000009a | 15.285 | 4.439 | 0.010 | 0.000 | 0.754 | 0.975 | 1.735 | 0.042 | n/a | 0.308 | 6.944 | n/a | n/a | 0.079 | 5.203 | 0.340 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.285 | 0.555 | 0.000 | 1.803 | 4.439 | 0.010 | 0.000 | 0.754 | 0.975 | 1.735 | 0.042 | n/a | 0.308 | 6.944 | n/a | n/a | 0.079 | 5.203 | 0.340 | 0.079 |
| p99 | 15.285 | 0.555 | 0.000 | 1.803 | 4.439 | 0.010 | 0.000 | 0.754 | 0.975 | 1.735 | 0.042 | n/a | 0.308 | 6.944 | n/a | n/a | 0.079 | 5.203 | 0.340 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c000000000000009a | 15.285 | 4.439 | 0.010 | 0.000 | 0.754 | 0.975 | 1.735 | 0.042 | n/a | 0.308 | 6.944 | n/a | n/a | 0.079 | 5.203 | 0.340 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.063 | 0.717 | 0.000 | 0.889 | 4.330 | 0.016 | 0.000 | 0.345 | 1.113 | 2.048 | 0.041 | n/a | 0.402 | 7.941 | n/a | n/a | 0.053 | 5.090 | 0.235 | 0.053 |
| p99 | 23.590 | 0.930 | 0.000 | 1.942 | 4.956 | 0.284 | 0.000 | 0.943 | 2.612 | 2.890 | 0.101 | n/a | 3.522 | 12.349 | n/a | n/a | 0.184 | 5.279 | 0.337 | 0.184 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000a4 | 23.590 | 4.956 | 0.157 | 0.000 | 0.070 | 2.612 | 2.890 | 0.101 | n/a | 0.402 | 12.349 | n/a | n/a | 0.053 | 5.183 | 0.220 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000a7 | 21.661 | 4.461 | 0.284 | 0.000 | 0.345 | 1.262 | 2.497 | 0.048 | n/a | 3.522 | 9.058 | n/a | n/a | 0.184 | 5.090 | 0.235 | 0.184 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000a2 | 16.063 | 4.330 | 0.006 | 0.000 | 0.943 | 0.984 | 1.459 | 0.038 | n/a | 0.313 | 7.941 | n/a | n/a | 0.050 | 5.279 | 0.329 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000009f | 13.159 | 3.631 | 0.016 | 0.000 | 0.787 | 1.113 | 2.048 | 0.041 | n/a | 0.416 | 5.039 | n/a | n/a | 0.069 | 4.433 | 0.337 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.159 | 0.930 | 0.000 | 1.593 | 3.631 | 0.016 | 0.000 | 0.787 | 1.113 | 2.048 | 0.041 | n/a | 0.416 | 5.039 | n/a | n/a | 0.069 | 4.433 | 0.337 | 0.069 |
| p99 | 13.159 | 0.930 | 0.000 | 1.593 | 3.631 | 0.016 | 0.000 | 0.787 | 1.113 | 2.048 | 0.041 | n/a | 0.416 | 5.039 | n/a | n/a | 0.069 | 4.433 | 0.337 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c000000000000009f | 13.159 | 3.631 | 0.016 | 0.000 | 0.787 | 1.113 | 2.048 | 0.041 | n/a | 0.416 | 5.039 | n/a | n/a | 0.069 | 4.433 | 0.337 | 0.069 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.247 | 0.259 | 0.000 | 0.384 | 6.223 | 0.011 | 0.000 | 0.201 | 1.108 | 2.446 | 0.088 | n/a | 1.591 | 18.659 | n/a | n/a | 0.051 | 6.458 | 0.164 | 0.051 |
| p99 | 81.889 | 0.640 | 0.000 | 3.564 | 8.870 | 0.288 | 1.759 | 0.581 | 3.942 | 8.083 | 0.127 | n/a | 4.167 | 61.862 | n/a | n/a | 0.055 | 11.079 | 0.297 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000ad | 81.889 | 6.223 | 0.166 | 0.000 | 0.070 | 1.977 | 8.083 | 0.112 | n/a | 3.361 | 61.862 | n/a | n/a | 0.035 | 6.458 | 0.079 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 0.832ms |
| 727872374d05bf1c00000000000000a9 | 37.564 | 8.870 | 0.011 | 0.000 | 0.346 | 1.108 | 1.891 | 0.049 | n/a | 1.121 | 24.117 | n/a | n/a | 0.051 | 9.227 | 0.246 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000b0 | 37.247 | 8.831 | 0.288 | 1.759 | 0.201 | 3.942 | 3.768 | 0.127 | n/a | 1.591 | 16.688 | n/a | n/a | 0.054 | 11.079 | 0.297 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000ab | 31.607 | 4.601 | 0.006 | 0.000 | 0.581 | 1.004 | 2.446 | 0.088 | n/a | 4.167 | 18.659 | n/a | n/a | 0.055 | 5.189 | 0.164 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.148 | 0.147 | 0.000 | 0.324 | 4.150 | 0.010 | 0.000 | 0.122 | 2.433 | 9.337 | 0.061 | n/a | 0.389 | 23.572 | n/a | n/a | 0.041 | 4.989 | 0.081 | 0.041 |
| p99 | 195.999 | 0.775 | 0.000 | 1.700 | 8.111 | 1.469 | 1.976 | 0.830 | 4.386 | 40.213 | 0.151 | n/a | 6.730 | 156.631 | n/a | n/a | 0.072 | 11.624 | 0.192 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000b5 | 195.999 | 3.037 | 0.006 | 0.000 | 0.351 | 3.324 | 31.783 | 0.081 | n/a | 0.746 | 156.631 | n/a | n/a | 0.041 | 3.394 | 0.017 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000b9 | 144.292 | 8.111 | 1.469 | 1.976 | 0.068 | 2.433 | 40.213 | 0.151 | n/a | 6.730 | 83.103 | n/a | n/a | 0.038 | 11.624 | 0.081 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000b7 | 34.148 | 4.150 | 0.010 | 0.000 | 0.830 | 0.905 | 4.318 | 0.043 | n/a | 0.250 | 23.572 | n/a | n/a | 0.072 | 4.989 | 0.146 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000b2 | 33.776 | 5.440 | 0.199 | 0.715 | 0.122 | 4.386 | 9.337 | 0.061 | n/a | 0.389 | 13.061 | n/a | n/a | 0.066 | 6.476 | 0.192 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.148 | 0.428 | 0.000 | 1.510 | 3.037 | 0.006 | 0.000 | 0.351 | 0.905 | 4.318 | 0.043 | n/a | 0.250 | 23.572 | n/a | n/a | 0.041 | 3.394 | 0.017 | 0.041 |
| p99 | 195.999 | 0.775 | 0.000 | 1.700 | 4.150 | 0.010 | 0.000 | 0.830 | 3.324 | 31.783 | 0.081 | n/a | 0.746 | 156.631 | n/a | n/a | 0.072 | 4.989 | 0.146 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000b5 | 195.999 | 3.037 | 0.006 | 0.000 | 0.351 | 3.324 | 31.783 | 0.081 | n/a | 0.746 | 156.631 | n/a | n/a | 0.041 | 3.394 | 0.017 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000b7 | 34.148 | 4.150 | 0.010 | 0.000 | 0.830 | 0.905 | 4.318 | 0.043 | n/a | 0.250 | 23.572 | n/a | n/a | 0.072 | 4.989 | 0.146 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.522 | 0.381 | 0.000 | 0.579 | 7.642 | 0.010 | 0.000 | 0.113 | 1.076 | 6.515 | 0.064 | n/a | 1.019 | 15.367 | n/a | n/a | 0.049 | 8.465 | 0.180 | 0.049 |
| p99 | 63.970 | 1.408 | 0.000 | 3.738 | 10.762 | 1.018 | 0.643 | 0.813 | 7.535 | 20.203 | 0.108 | n/a | 1.634 | 41.405 | n/a | n/a | 0.094 | 11.545 | 0.242 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000c2 | 63.970 | 10.762 | 0.304 | 0.365 | 0.113 | 5.393 | 20.203 | 0.061 | n/a | 0.356 | 26.319 | n/a | n/a | 0.094 | 11.545 | 0.180 | 0.094 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.249ms |
| 727872374d05bf1c00000000000000bb | 59.108 | 7.642 | 0.010 | 0.000 | 0.813 | 0.966 | 6.515 | 0.064 | n/a | 1.634 | 41.405 | n/a | n/a | 0.060 | 8.465 | 0.143 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000bd | 52.522 | 8.946 | 1.018 | 0.643 | 0.070 | 7.535 | 17.744 | 0.108 | n/a | 1.044 | 15.367 | n/a | n/a | 0.047 | 10.677 | 0.203 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000c0 | 25.488 | 5.369 | 0.006 | 0.000 | 0.804 | 1.076 | 2.767 | 0.083 | n/a | 1.019 | 14.313 | n/a | n/a | 0.049 | 6.179 | 0.242 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.488 | 0.619 | 0.000 | 3.738 | 5.369 | 0.006 | 0.000 | 0.804 | 1.076 | 2.767 | 0.083 | n/a | 1.019 | 14.313 | n/a | n/a | 0.049 | 6.179 | 0.242 | 0.049 |
| p99 | 25.488 | 0.619 | 0.000 | 3.738 | 5.369 | 0.006 | 0.000 | 0.804 | 1.076 | 2.767 | 0.083 | n/a | 1.019 | 14.313 | n/a | n/a | 0.049 | 6.179 | 0.242 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000c0 | 25.488 | 5.369 | 0.006 | 0.000 | 0.804 | 1.076 | 2.767 | 0.083 | n/a | 1.019 | 14.313 | n/a | n/a | 0.049 | 6.179 | 0.242 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.747 | 0.644 | 0.000 | 1.655 | 6.567 | 0.012 | 0.000 | 0.112 | 1.107 | 4.803 | 0.057 | n/a | 0.539 | 17.040 | n/a | n/a | 0.053 | 7.124 | 0.156 | 0.053 |
| p99 | 150.448 | 1.581 | 0.000 | 5.597 | 10.097 | 0.276 | 1.703 | 1.070 | 4.260 | 18.475 | 0.107 | n/a | 1.037 | 139.195 | n/a | n/a | 0.093 | 12.166 | 0.278 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000c9 | 150.448 | 7.199 | 0.006 | 0.000 | 1.070 | 1.017 | 1.502 | 0.064 | n/a | 0.357 | 139.195 | n/a | n/a | 0.038 | 8.275 | 0.055 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000c4 | 68.278 | 5.341 | 0.012 | 0.000 | 0.516 | 1.107 | 4.331 | 0.041 | n/a | 0.219 | 56.659 | n/a | n/a | 0.053 | 5.868 | 0.086 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000c6 | 45.747 | 6.567 | 0.209 | 0.288 | 0.060 | 4.193 | 18.475 | 0.107 | n/a | 1.037 | 14.772 | n/a | n/a | 0.039 | 7.124 | 0.156 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000cd | 43.759 | 10.097 | 0.276 | 1.703 | 0.090 | 4.260 | 9.605 | 0.057 | n/a | 0.539 | 17.040 | n/a | n/a | 0.093 | 12.166 | 0.278 | 0.093 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000cb | 16.750 | 3.694 | 0.006 | 0.000 | 0.112 | 0.811 | 4.803 | 0.034 | n/a | 0.664 | 6.550 | n/a | n/a | 0.075 | 3.812 | 0.228 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.278 | 1.236 | 0.000 | 2.936 | 5.341 | 0.006 | 0.000 | 0.516 | 1.017 | 4.331 | 0.041 | n/a | 0.357 | 56.659 | n/a | n/a | 0.053 | 5.868 | 0.086 | 0.053 |
| p99 | 150.448 | 1.581 | 0.000 | 5.597 | 7.199 | 0.012 | 0.000 | 1.070 | 1.107 | 4.803 | 0.064 | n/a | 0.664 | 139.195 | n/a | n/a | 0.075 | 8.275 | 0.228 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000c9 | 150.448 | 7.199 | 0.006 | 0.000 | 1.070 | 1.017 | 1.502 | 0.064 | n/a | 0.357 | 139.195 | n/a | n/a | 0.038 | 8.275 | 0.055 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000c4 | 68.278 | 5.341 | 0.012 | 0.000 | 0.516 | 1.107 | 4.331 | 0.041 | n/a | 0.219 | 56.659 | n/a | n/a | 0.053 | 5.868 | 0.086 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000cb | 16.750 | 3.694 | 0.006 | 0.000 | 0.112 | 0.811 | 4.803 | 0.034 | n/a | 0.664 | 6.550 | n/a | n/a | 0.075 | 3.812 | 0.228 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.552 | 0.000 | 0.000 | 0.322 | 5.200 | 0.348 | 0.000 | 0.069 | 1.718 | 6.455 | 0.050 | n/a | 0.244 | 27.861 | n/a | n/a | 0.051 | 5.857 | 0.044 | 0.051 |
| p99 | 131.772 | 0.315 | 0.000 | 0.594 | 16.561 | 1.511 | 0.239 | 0.102 | 1.961 | 29.487 | 0.181 | n/a | 0.795 | 93.413 | n/a | n/a | 0.078 | 18.173 | 0.333 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000cf | 131.772 | 5.200 | 0.348 | 0.239 | 0.069 | 1.961 | 29.487 | 0.181 | n/a | 0.795 | 93.413 | n/a | n/a | 0.078 | 5.857 | 0.044 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000d2 | 54.552 | 16.561 | 1.511 | 0.000 | 0.102 | 1.718 | 6.455 | 0.050 | n/a | 0.244 | 27.861 | n/a | n/a | 0.051 | 18.173 | 0.333 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.162 | 0.385 | 0.000 | 0.341 | 4.446 | 0.013 | 0.000 | 0.058 | 1.330 | 7.363 | 0.066 | n/a | 0.782 | 18.252 | n/a | n/a | 0.036 | 4.985 | 0.140 | 0.036 |
| p99 | 55.576 | 1.641 | 0.000 | 2.039 | 7.115 | 0.240 | 0.921 | 0.525 | 5.461 | 13.816 | 0.119 | n/a | 2.083 | 39.639 | n/a | n/a | 0.058 | 7.664 | 0.178 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000d6 | 55.576 | 4.446 | 0.013 | 0.000 | 0.525 | 1.330 | 7.363 | 0.119 | n/a | 2.083 | 39.639 | n/a | n/a | 0.058 | 4.985 | 0.090 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000d4 | 43.894 | 5.813 | 0.240 | 0.921 | 0.055 | 1.600 | 13.816 | 0.089 | n/a | 0.782 | 20.532 | n/a | n/a | 0.045 | 7.029 | 0.160 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000da | 43.162 | 7.115 | 0.213 | 0.278 | 0.058 | 5.461 | 11.927 | 0.066 | n/a | 0.297 | 17.710 | n/a | n/a | 0.036 | 7.664 | 0.178 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000d8 | 25.873 | 3.360 | 0.006 | 0.000 | 0.267 | 0.801 | 1.625 | 0.036 | n/a | 1.492 | 18.252 | n/a | n/a | 0.035 | 3.632 | 0.140 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.873 | 1.641 | 0.000 | 1.661 | 3.360 | 0.006 | 0.000 | 0.267 | 0.801 | 1.625 | 0.036 | n/a | 1.492 | 18.252 | n/a | n/a | 0.035 | 3.632 | 0.140 | 0.035 |
| p99 | 25.873 | 1.641 | 0.000 | 1.661 | 3.360 | 0.006 | 0.000 | 0.267 | 0.801 | 1.625 | 0.036 | n/a | 1.492 | 18.252 | n/a | n/a | 0.035 | 3.632 | 0.140 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000d8 | 25.873 | 3.360 | 0.006 | 0.000 | 0.267 | 0.801 | 1.625 | 0.036 | n/a | 1.492 | 18.252 | n/a | n/a | 0.035 | 3.632 | 0.140 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.283 | 0.000 | 0.000 | 0.363 | 5.729 | 0.231 | 0.430 | 0.121 | 2.081 | 7.423 | 0.069 | n/a | 0.653 | 12.866 | n/a | n/a | 0.050 | 6.287 | 0.274 | 0.050 |
| p99 | 41.226 | 0.000 | 0.000 | 0.730 | 5.733 | 0.308 | 0.468 | 0.553 | 4.027 | 11.945 | 0.182 | n/a | 1.074 | 17.863 | n/a | n/a | 0.078 | 6.534 | 0.296 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000dd | 41.226 | 5.733 | 0.308 | 0.430 | 0.063 | 4.027 | 11.945 | 0.182 | n/a | 0.637 | 17.863 | n/a | n/a | 0.039 | 6.534 | 0.158 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000df | 22.283 | 5.284 | 0.231 | 0.468 | 0.121 | 1.135 | 1.404 | 0.042 | n/a | 0.653 | 12.866 | n/a | n/a | 0.078 | 6.104 | 0.274 | 0.078 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000dc | 21.269 | 5.729 | 0.005 | 0.000 | 0.553 | 2.081 | 7.423 | 0.069 | n/a | 1.074 | 4.285 | n/a | n/a | 0.050 | 6.287 | 0.296 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.269 | 0.000 | 0.000 | 0.193 | 5.729 | 0.005 | 0.000 | 0.553 | 2.081 | 7.423 | 0.069 | n/a | 1.074 | 4.285 | n/a | n/a | 0.050 | 6.287 | 0.296 | 0.050 |
| p99 | 21.269 | 0.000 | 0.000 | 0.193 | 5.729 | 0.005 | 0.000 | 0.553 | 2.081 | 7.423 | 0.069 | n/a | 1.074 | 4.285 | n/a | n/a | 0.050 | 6.287 | 0.296 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000dc | 21.269 | 5.729 | 0.005 | 0.000 | 0.553 | 2.081 | 7.423 | 0.069 | n/a | 1.074 | 4.285 | n/a | n/a | 0.050 | 6.287 | 0.296 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.733 | 0.436 | 0.000 | 0.821 | 4.887 | 0.208 | 0.000 | 0.130 | 1.644 | 5.103 | 0.072 | n/a | 0.277 | 14.465 | n/a | n/a | 0.074 | 6.793 | 0.182 | 0.074 |
| p99 | 57.540 | 1.795 | 0.007 | 2.928 | 8.429 | 3.606 | 0.543 | 1.152 | 5.123 | 23.730 | 0.188 | n/a | 2.107 | 30.775 | n/a | n/a | 0.088 | 10.834 | 0.397 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000f8 | 57.540 | 8.429 | 0.012 | 0.000 | 1.152 | 1.136 | 14.512 | 0.145 | n/a | 1.304 | 30.775 | n/a | n/a | 0.076 | 9.593 | 0.167 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000e4 | 53.266 | 4.466 | 2.872 | 0.280 | 0.050 | 3.239 | 23.730 | 0.045 | n/a | 0.249 | 18.295 | n/a | n/a | 0.041 | 7.667 | 0.144 | 0.041 | gw-w/thread-46/gateway.admitted-work | none observed |
| 727872374d05bf1c00000000000000f9 | 42.652 | 6.649 | 0.463 | 0.543 | 0.125 | 1.852 | 4.575 | 0.188 | n/a | 2.107 | 26.098 | n/a | n/a | 0.053 | 7.780 | 0.182 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.697ms |
| 727872374d05bf1c000000000000011e | 33.483 | 6.328 | 0.358 | 0.000 | 0.108 | 2.219 | 9.496 | 0.077 | n/a | 0.345 | 14.465 | n/a | n/a | 0.088 | 6.793 | 0.203 | 0.088 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000120 | 33.170 | 4.887 | 0.015 | 0.000 | 0.929 | 0.968 | 1.243 | 0.072 | n/a | 0.267 | 24.712 | n/a | n/a | 0.078 | 5.831 | 0.176 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000122 | 32.733 | 3.892 | 0.257 | 0.000 | 0.068 | 5.123 | 14.275 | 0.098 | n/a | 0.586 | 8.387 | n/a | n/a | 0.047 | 4.217 | 0.129 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000e2 | 29.024 | 6.992 | 0.006 | 0.000 | 0.649 | 0.903 | 1.877 | 0.036 | n/a | 0.219 | 18.298 | n/a | n/a | 0.046 | 7.647 | 0.263 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000f4 | 27.285 | 6.916 | 3.606 | 0.244 | 0.067 | 1.693 | 3.192 | 0.132 | n/a | 0.326 | 11.068 | n/a | n/a | 0.041 | 10.834 | 0.397 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000124 | 24.599 | 3.665 | 0.208 | 0.000 | 0.130 | 1.644 | 11.456 | 0.051 | n/a | 0.222 | 7.139 | n/a | n/a | 0.083 | 4.004 | 0.163 | 0.083 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000f6 | 20.496 | 4.854 | 0.007 | 0.000 | 0.738 | 0.923 | 4.699 | 0.035 | n/a | 0.232 | 8.927 | n/a | n/a | 0.079 | 5.600 | 0.273 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000fc | 19.343 | 4.826 | 0.007 | 0.000 | 0.701 | 1.249 | 5.103 | 0.041 | n/a | 0.277 | 7.065 | n/a | n/a | 0.074 | 5.534 | 0.286 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.646 | 0.545 | 0.000 | 0.645 | 4.801 | 0.259 | 0.232 | 0.122 | 1.104 | 1.727 | 0.039 | n/a | 0.625 | 14.845 | n/a | n/a | 0.064 | 5.412 | 0.216 | 0.064 |
| p99 | 83.664 | 1.093 | 0.000 | 2.188 | 4.834 | 0.264 | 0.390 | 0.605 | 1.835 | 26.965 | 0.095 | n/a | 1.676 | 48.797 | n/a | n/a | 0.069 | 5.606 | 0.220 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000e6 | 83.664 | 4.834 | 0.259 | 0.390 | 0.122 | 1.835 | 26.965 | 0.095 | n/a | 0.303 | 48.797 | n/a | n/a | 0.064 | 5.606 | 0.067 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000ea | 24.646 | 4.801 | 0.005 | 0.000 | 0.605 | 0.894 | 1.727 | 0.039 | n/a | 1.676 | 14.845 | n/a | n/a | 0.055 | 5.412 | 0.220 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000e8 | 21.358 | 4.012 | 0.264 | 0.232 | 0.103 | 1.104 | 1.377 | 0.036 | n/a | 0.625 | 13.537 | n/a | n/a | 0.069 | 4.611 | 0.216 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.770 | 0.000 | 0.000 | 0.480 | 4.041 | 0.008 | 0.000 | 0.068 | 1.278 | 1.284 | 0.031 | n/a | 0.174 | 21.820 | n/a | n/a | 0.039 | 4.606 | 0.119 | 0.039 |
| p99 | 49.444 | 0.840 | 0.017 | 2.119 | 4.798 | 0.263 | 0.233 | 1.092 | 3.915 | 2.802 | 5.214 | n/a | 0.374 | 40.691 | n/a | n/a | 0.089 | 5.898 | 0.119 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000ef | 49.444 | 4.798 | 0.008 | 0.000 | 1.092 | 1.278 | 1.284 | 0.031 | n/a | 0.174 | 40.691 | n/a | n/a | 0.089 | 5.898 | 0.119 | 0.089 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000ed | 38.770 | 4.041 | 0.263 | 0.233 | 0.068 | 3.915 | 2.802 | 5.214 | n/a | 0.374 | 21.820 | n/a | n/a | 0.039 | 4.606 | 0.119 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.444 | 0.840 | 0.017 | 2.119 | 4.798 | 0.008 | 0.000 | 1.092 | 1.278 | 1.284 | 0.031 | n/a | 0.174 | 40.691 | n/a | n/a | 0.089 | 5.898 | 0.119 | 0.089 |
| p99 | 49.444 | 0.840 | 0.017 | 2.119 | 4.798 | 0.008 | 0.000 | 1.092 | 1.278 | 1.284 | 0.031 | n/a | 0.174 | 40.691 | n/a | n/a | 0.089 | 5.898 | 0.119 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000ef | 49.444 | 4.798 | 0.008 | 0.000 | 1.092 | 1.278 | 1.284 | 0.031 | n/a | 0.174 | 40.691 | n/a | n/a | 0.089 | 5.898 | 0.119 | 0.089 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.343 | 0.436 | 0.000 | 2.029 | 4.826 | 0.007 | 0.000 | 0.701 | 0.968 | 1.243 | 0.041 | n/a | 0.267 | 7.065 | n/a | n/a | 0.074 | 5.534 | 0.176 | 0.074 |
| p99 | 33.170 | 0.669 | 0.000 | 2.115 | 4.887 | 0.015 | 0.000 | 0.929 | 1.249 | 5.103 | 0.072 | n/a | 0.277 | 24.712 | n/a | n/a | 0.078 | 5.831 | 0.286 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000120 | 33.170 | 4.887 | 0.015 | 0.000 | 0.929 | 0.968 | 1.243 | 0.072 | n/a | 0.267 | 24.712 | n/a | n/a | 0.078 | 5.831 | 0.176 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c00000000000000fc | 19.343 | 4.826 | 0.007 | 0.000 | 0.701 | 1.249 | 5.103 | 0.041 | n/a | 0.277 | 7.065 | n/a | n/a | 0.074 | 5.534 | 0.286 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.000 | 0.797 | 0.000 | 1.891 | 4.300 | 0.010 | 0.000 | 0.511 | 1.280 | 1.999 | 0.046 | n/a | 0.410 | 14.058 | n/a | n/a | 0.066 | 4.942 | 0.250 | 0.066 |
| p99 | 57.836 | 2.007 | 0.069 | 3.283 | 9.714 | 0.261 | 0.397 | 1.411 | 4.312 | 8.177 | 0.111 | n/a | 3.659 | 38.809 | n/a | n/a | 0.179 | 10.482 | 0.359 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c00000000000000fe | 57.836 | 7.504 | 0.023 | 0.000 | 1.411 | 1.280 | 7.992 | 0.046 | n/a | 0.593 | 38.809 | n/a | n/a | 0.179 | 8.938 | 0.155 | 0.179 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000110 | 36.708 | 3.870 | 0.233 | 0.225 | 0.121 | 2.671 | 8.177 | 0.110 | n/a | 3.659 | 17.568 | n/a | n/a | 0.074 | 4.449 | 0.121 | 0.074 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000010c | 36.152 | 9.714 | 0.261 | 0.397 | 0.110 | 3.001 | 7.965 | 0.097 | n/a | 0.482 | 14.058 | n/a | n/a | 0.066 | 10.482 | 0.290 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000010e | 32.718 | 8.057 | 0.012 | 0.000 | 0.511 | 1.468 | 2.781 | 0.104 | n/a | 0.410 | 19.265 | n/a | n/a | 0.111 | 8.579 | 0.262 | 0.111 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000100 | 30.718 | 4.300 | 0.257 | 0.276 | 0.108 | 1.473 | 7.552 | 0.055 | n/a | 0.265 | 16.352 | n/a | n/a | 0.079 | 4.942 | 0.161 | 0.079 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000104 | 24.000 | 6.032 | 0.010 | 0.000 | 0.888 | 1.160 | 1.999 | 0.038 | n/a | 0.757 | 13.035 | n/a | n/a | 0.081 | 6.931 | 0.289 | 0.081 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000108 | 23.410 | 3.946 | 0.004 | 0.000 | 0.642 | 0.966 | 1.635 | 0.038 | n/a | 1.107 | 15.030 | n/a | n/a | 0.043 | 4.593 | 0.196 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000102 | 20.785 | 5.064 | 0.006 | 0.000 | 0.121 | 4.312 | 1.387 | 0.039 | n/a | 0.280 | 9.526 | n/a | n/a | 0.051 | 5.191 | 0.250 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000106 | 12.082 | 3.483 | 0.006 | 0.000 | 0.851 | 0.987 | 1.593 | 0.111 | n/a | 0.391 | 4.616 | n/a | n/a | 0.044 | 4.340 | 0.359 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000010a | 10.104 | 2.757 | 0.006 | 0.000 | 0.711 | 0.952 | 1.015 | 0.038 | n/a | 0.263 | 4.323 | n/a | n/a | 0.039 | 3.474 | 0.344 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.104 | 0.461 | 0.000 | 1.458 | 2.757 | 0.006 | 0.000 | 0.711 | 0.952 | 1.015 | 0.038 | n/a | 0.263 | 4.323 | n/a | n/a | 0.039 | 3.474 | 0.344 | 0.039 |
| p99 | 12.082 | 0.797 | 0.000 | 1.933 | 3.483 | 0.006 | 0.000 | 0.851 | 0.987 | 1.593 | 0.111 | n/a | 0.391 | 4.616 | n/a | n/a | 0.044 | 4.340 | 0.359 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000106 | 12.082 | 3.483 | 0.006 | 0.000 | 0.851 | 0.987 | 1.593 | 0.111 | n/a | 0.391 | 4.616 | n/a | n/a | 0.044 | 4.340 | 0.359 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000010a | 10.104 | 2.757 | 0.006 | 0.000 | 0.711 | 0.952 | 1.015 | 0.038 | n/a | 0.263 | 4.323 | n/a | n/a | 0.039 | 3.474 | 0.344 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 122.291 | 0.548 | 0.000 | 0.254 | 6.607 | 0.012 | 0.000 | 0.108 | 7.285 | 1.648 | 0.091 | n/a | 1.231 | 66.890 | n/a | n/a | 0.022 | 6.930 | 0.057 | 0.022 |
| p99 | 122.783 | 0.916 | 0.011 | 3.191 | 14.713 | 2.767 | 4.632 | 0.311 | 32.204 | 24.960 | 0.149 | n/a | 10.504 | 70.892 | n/a | n/a | 0.048 | 22.221 | 0.181 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000116 | 122.783 | 14.713 | 2.767 | 4.632 | 0.108 | 7.285 | 24.960 | 0.149 | n/a | 1.231 | 66.890 | n/a | n/a | 0.048 | 22.221 | 0.181 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.439ms |
| 727872374d05bf1c0000000000000117 | 122.291 | 6.607 | 0.012 | 0.000 | 0.311 | 32.204 | 1.648 | 0.091 | n/a | 10.504 | 70.892 | n/a | n/a | 0.022 | 6.930 | 0.057 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.073 | n/a | n/a | n/a | 0.644 | 3.686 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.058 | 0.998 | 0.015 |
| p99 | 102.838 | n/a | n/a | n/a | 16.787 | 102.446 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 102.825 | 1.000 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000118 | 102.838 | 0.378 | 102.446 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 102.825 | 1.000 | 0.013 | node-13/thread-0/rpc.replica.observe | client.encode 2.949ms |
| 727872374d05bf1c000000000000012a | 18.898 | 0.644 | 18.227 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 18.871 | 0.999 | 0.027 | node-13/thread-0/rpc.replica.observe | driver.publication 2.432ms |
| 727872374d05bf1c00000000000000e3 | 18.075 | 0.562 | 17.499 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 18.060 | 0.999 | 0.015 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c00000000000000fa | 16.988 | 16.787 | 0.185 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 16.972 | 0.999 | 0.016 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c0000000000000093 | 16.263 | 1.178 | 15.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 16.223 | 0.998 | 0.040 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c00000000000000ff | 12.326 | 12.160 | 0.151 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 12.311 | 0.999 | 0.015 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c00000000000000b6 | 10.931 | 10.821 | 0.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 10.913 | 0.998 | 0.018 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c00000000000000d7 | 10.789 | 10.205 | 0.570 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 10.775 | 0.999 | 0.014 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c00000000000000bc | 8.959 | 6.603 | 2.342 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.945 | 0.998 | 0.014 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c000000000000012b | 8.491 | 7.399 | 1.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.477 | 0.998 | 0.015 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c0000000000000103 | 8.073 | 0.263 | 7.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.058 | 0.998 | 0.015 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c000000000000010f | 7.553 | 7.385 | 0.141 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.027 | 7.526 | 0.996 | 0.027 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c00000000000000ec | 7.517 | 0.644 | 6.859 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.502 | 0.998 | 0.014 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c00000000000000d9 | 7.059 | 6.720 | 0.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.046 | 0.998 | 0.013 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c0000000000000131 | 5.675 | 0.257 | 5.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 5.662 | 0.998 | 0.013 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c0000000000000097 | 5.582 | 0.494 | 5.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.567 | 0.997 | 0.015 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c0000000000000107 | 4.853 | 0.406 | 4.436 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.841 | 0.997 | 0.012 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c00000000000000a3 | 4.672 | 0.412 | 4.249 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 4.661 | 0.998 | 0.011 | node-13/thread-0/rpc.replica.observe | none observed |
| 727872374d05bf1c00000000000000c5 | 4.611 | 3.857 | 0.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.590 | 0.995 | 0.021 | node-13/thread-2/replica.pull-at | none observed |
| 727872374d05bf1c00000000000000aa | 4.091 | 0.385 | 3.686 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.071 | 0.995 | 0.020 | node-13/thread-0/rpc.replica.observe | driver.worker-message 0.835ms |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.713 | 0.273 | 0.000 | 1.501 | 4.304 | 0.011 | 0.000 | 0.155 | 0.988 | 2.850 | 0.048 | n/a | 0.260 | 13.597 | n/a | n/a | 0.048 | 5.463 | 0.166 | 0.048 |
| p99 | 74.860 | 1.141 | 0.000 | 2.864 | 8.986 | 0.273 | 0.000 | 10.823 | 5.553 | 8.817 | 0.115 | n/a | 0.812 | 61.002 | n/a | n/a | 0.078 | 15.131 | 0.606 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000126 | 74.860 | 4.525 | 0.011 | 0.000 | 0.927 | 0.988 | 6.886 | 0.115 | n/a | 0.358 | 61.002 | n/a | n/a | 0.048 | 5.463 | 0.073 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000012e | 39.712 | 8.986 | 0.273 | 0.000 | 0.115 | 5.553 | 8.817 | 0.077 | n/a | 0.260 | 15.554 | n/a | n/a | 0.078 | 9.373 | 0.236 | 0.078 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000128 | 29.929 | 6.776 | 0.015 | 0.000 | 0.305 | 0.696 | 2.850 | 0.039 | n/a | 0.241 | 18.959 | n/a | n/a | 0.048 | 7.096 | 0.237 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c000000000000012c | 25.713 | 3.565 | 0.176 | 0.000 | 0.064 | 1.452 | 6.522 | 0.060 | n/a | 0.236 | 13.597 | n/a | n/a | 0.042 | 3.804 | 0.148 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000129 | 24.958 | 4.304 | 0.004 | 0.000 | 10.823 | 0.724 | 1.043 | 0.040 | n/a | 0.558 | 7.412 | n/a | n/a | 0.050 | 15.131 | 0.606 | 0.050 | node-13/thread-0/driver.queue.subject | driver.publication 1.152ms |
| 727872374d05bf1c0000000000000130 | 20.387 | 3.226 | 0.006 | 0.000 | 0.155 | 1.055 | 1.564 | 0.048 | n/a | 0.812 | 13.466 | n/a | n/a | 0.056 | 3.387 | 0.166 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.387 | 0.273 | 0.000 | 1.501 | 3.226 | 0.004 | 0.000 | 0.155 | 0.724 | 1.043 | 0.040 | n/a | 0.558 | 7.412 | n/a | n/a | 0.050 | 3.387 | 0.166 | 0.050 |
| p99 | 24.958 | 0.560 | 0.000 | 2.864 | 4.304 | 0.006 | 0.000 | 10.823 | 1.055 | 1.564 | 0.048 | n/a | 0.812 | 13.466 | n/a | n/a | 0.056 | 15.131 | 0.606 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000129 | 24.958 | 4.304 | 0.004 | 0.000 | 10.823 | 0.724 | 1.043 | 0.040 | n/a | 0.558 | 7.412 | n/a | n/a | 0.050 | 15.131 | 0.606 | 0.050 | node-13/thread-0/driver.queue.subject | driver.publication 1.152ms |
| 727872374d05bf1c0000000000000130 | 20.387 | 3.226 | 0.006 | 0.000 | 0.155 | 1.055 | 1.564 | 0.048 | n/a | 0.812 | 13.466 | n/a | n/a | 0.056 | 3.387 | 0.166 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.908 | 0.147 | 0.000 | 0.369 | 5.546 | 0.190 | 0.000 | 0.109 | 0.882 | 2.172 | 0.073 | n/a | 0.818 | 11.943 | n/a | n/a | 0.053 | 5.851 | 0.267 | 0.053 |
| p99 | 24.273 | 0.970 | 0.000 | 2.015 | 8.097 | 0.196 | 0.000 | 0.954 | 2.630 | 4.904 | 0.095 | n/a | 0.949 | 11.999 | n/a | n/a | 0.059 | 8.380 | 0.345 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000136 | 24.273 | 8.097 | 0.190 | 0.000 | 0.093 | 0.882 | 2.172 | 0.039 | n/a | 0.749 | 11.999 | n/a | n/a | 0.053 | 8.380 | 0.345 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000132 | 21.908 | 5.546 | 0.196 | 0.000 | 0.109 | 2.630 | 4.904 | 0.095 | n/a | 0.949 | 7.426 | n/a | n/a | 0.053 | 5.851 | 0.267 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 727872374d05bf1c0000000000000134 | 20.486 | 3.859 | 0.005 | 0.000 | 0.954 | 0.812 | 1.963 | 0.073 | n/a | 0.818 | 11.943 | n/a | n/a | 0.059 | 4.819 | 0.235 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.486 | 0.970 | 0.000 | 2.015 | 3.859 | 0.005 | 0.000 | 0.954 | 0.812 | 1.963 | 0.073 | n/a | 0.818 | 11.943 | n/a | n/a | 0.059 | 4.819 | 0.235 | 0.059 |
| p99 | 20.486 | 0.970 | 0.000 | 2.015 | 3.859 | 0.005 | 0.000 | 0.954 | 0.812 | 1.963 | 0.073 | n/a | 0.818 | 11.943 | n/a | n/a | 0.059 | 4.819 | 0.235 | 0.059 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000134 | 20.486 | 3.859 | 0.005 | 0.000 | 0.954 | 0.812 | 1.963 | 0.073 | n/a | 0.818 | 11.943 | n/a | n/a | 0.059 | 4.819 | 0.235 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 98.639 | 0.644 | 0.006 | 1.965 | 6.446 | 6.064 | 0.000 | 0.008 | 4.364 | 1.517 | 0.144 | n/a | 0.257 | 76.952 | n/a | n/a | 0.022 | 10.952 | 0.174 | 0.022 |
| p99 | 137.977 | 1.177 | 5.313 | 7.223 | 9.916 | 25.417 | 0.000 | 0.046 | 12.009 | 8.334 | 5.944 | n/a | 4.613 | 87.949 | n/a | n/a | 0.089 | 34.602 | 0.251 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 727872374d05bf1c0000000000000141 | 137.977 | 9.175 | 25.417 | 0.000 | 0.010 | 12.009 | 1.517 | 0.070 | n/a | 4.613 | 85.078 | n/a | n/a | 0.089 | 34.602 | 0.251 | 0.089 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.publication 3.502ms; driver.worker-message 3.185ms; driver.publication 3.093ms; driver.publication 2.542ms |
| 727872374d05bf1c0000000000000140 | 128.798 | 6.454 | 24.480 | 0.000 | 0.006 | 2.320 | 1.479 | 5.944 | n/a | 0.143 | 87.949 | n/a | n/a | 0.022 | 30.940 | 0.240 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.publication 3.502ms; driver.worker-message 3.185ms; driver.publication 3.093ms; driver.publication 2.542ms |
| 727872374d05bf1c000000000000013f | 120.485 | 7.726 | 21.689 | 0.000 | 0.005 | 4.319 | 8.334 | 0.144 | n/a | 0.405 | 77.843 | n/a | n/a | 0.021 | 29.419 | 0.244 | 0.021 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.publication 3.502ms; driver.worker-message 3.185ms; driver.publication 2.542ms; driver.publication 2.077ms |
| 727872374d05bf1c000000000000013e | 112.901 | 8.312 | 17.460 | 0.000 | 0.008 | 5.323 | 1.632 | 0.089 | n/a | 0.330 | 79.724 | n/a | n/a | 0.023 | 25.780 | 0.228 | 0.023 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.worker-message 3.185ms; driver.publication 2.542ms; driver.publication 2.077ms; driver.publication 1.179ms |
| 727872374d05bf1c000000000000013d | 102.977 | 6.446 | 11.475 | 0.000 | 0.011 | 6.261 | 1.211 | 0.105 | n/a | 0.494 | 76.952 | n/a | n/a | 0.022 | 17.932 | 0.174 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.worker-message 3.185ms; driver.publication 2.542ms; driver.publication 1.179ms |
| 727872374d05bf1c000000000000013c | 98.639 | 4.881 | 6.064 | 0.000 | 0.007 | 6.004 | 2.666 | 0.513 | n/a | 0.038 | 78.441 | n/a | n/a | 0.025 | 10.952 | 0.111 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.worker-message 3.185ms; driver.publication 2.542ms; driver.publication 1.179ms |
| 727872374d05bf1c000000000000013b | 78.175 | 5.074 | 4.543 | 0.000 | 0.011 | 4.364 | 0.727 | 5.089 | n/a | 0.040 | 58.305 | n/a | n/a | 0.022 | 9.628 | 0.123 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.worker-message 3.185ms; driver.publication 2.542ms |
| 727872374d05bf1c000000000000013a | 66.464 | 6.396 | 2.948 | 0.000 | 0.007 | 5.386 | 1.089 | 5.617 | n/a | 0.075 | 44.925 | n/a | n/a | 0.021 | 9.351 | 0.141 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms; driver.worker-message 3.185ms |
| 727872374d05bf1c0000000000000139 | 51.238 | 4.210 | 2.084 | 0.000 | 0.011 | 1.829 | 7.719 | 4.033 | n/a | 0.257 | 31.074 | n/a | n/a | 0.021 | 6.305 | 0.123 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 6.934ms |
| 727872374d05bf1c0000000000000138 | 49.013 | 9.916 | 0.017 | 0.000 | 0.046 | 3.376 | 5.382 | 0.093 | n/a | 1.837 | 28.300 | n/a | n/a | 0.045 | 9.979 | 0.204 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 312.972 | n/a | n/a | n/a | 40.773 | n/a | 6.393 | 312.877 | 3.452 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.264 | 312.970 | 1.000 | 7.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd000000000000ca95 | 312.990 | 0.033 | n/a | 0.000 | 312.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.988 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000000ca94 | 312.978 | 0.038 | n/a | 0.000 | 312.938 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.976 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000000ca93 | 312.972 | 0.093 | n/a | 0.000 | 312.877 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.970 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000000ca92 | 312.923 | 0.076 | n/a | 0.000 | 312.845 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 312.921 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000000ca91 | 312.824 | 0.141 | n/a | 0.000 | 312.679 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 312.820 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000000ca90 | 312.717 | 0.479 | n/a | 0.000 | 312.231 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 312.710 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000b9f7 | 311.328 | 0.306 | n/a | 0.000 | 311.018 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 311.324 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000b9f8 | 311.302 | 0.209 | n/a | 0.000 | 311.089 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 311.298 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000000b3a8 | 311.095 | 0.018 | n/a | 0.000 | 311.076 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.094 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000000b3a7 | 311.079 | 0.123 | n/a | 0.000 | 310.955 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.078 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000000b3a6 | 310.958 | 0.023 | n/a | 0.000 | 310.934 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.957 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000000b3a4 | 310.942 | 0.195 | n/a | 0.000 | 310.744 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 310.939 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000000b3a5 | 310.941 | 0.032 | n/a | 0.000 | 310.908 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.940 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000ba0f | 310.755 | 0.035 | n/a | 0.000 | 310.719 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 310.754 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000ba10 | 309.523 | 0.041 | n/a | 0.000 | 309.478 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 309.519 | 1.000 | 0.005 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000ba11 | 309.507 | 0.018 | n/a | 0.000 | 309.489 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.506 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000000fa0 | 299.466 | 0.561 | n/a | 0.000 | 298.901 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 299.462 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000000fa1 | 299.063 | 0.071 | n/a | 0.000 | 298.988 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 299.059 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd0000000000001398 | 298.804 | 0.414 | n/a | 0.000 | 298.387 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.801 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000000fb1 | 298.492 | 0.051 | n/a | 0.000 | 298.439 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.490 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 286.545 | n/a | n/a | n/a | 2.702 | n/a | 0.000 | 286.204 | 0.465 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.601 | 286.542 | 1.000 | 1.601 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd00000000000215d9 | 286.545 | 0.338 | n/a | 0.000 | 286.204 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 286.542 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| f2ba1c77a49353bd000000000000dd25 | 265.413 | 0.166 | n/a | 0.000 | 265.244 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.410 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000000d8ad | 45.998 | 0.085 | n/a | 0.000 | 45.911 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 45.996 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| f2ba1c77a49353bd000000000000d8db | 4.768 | 2.702 | n/a | 0.000 | 0.000 | 0.465 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.601 | 2.702 | 0.567 | 1.601 | node-13/thread-4/reader.execute | replica.apply-delta 0.021ms |
| f2ba1c77a49353bd000000000000de56 | 0.890 | 0.886 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.886 | 0.996 | 0.004 | node-13/thread-4/reader.execute | none observed |
| f2ba1c77a49353bd00000000000188aa | 0.854 | 0.853 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.853 | 0.998 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000011d81 | 0.600 | 0.598 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.598 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000010665 | 0.594 | 0.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.593 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000015786 | 0.413 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.413 | 0.000 | 0.000 | 0.413 | uncovered | none observed |
| f2ba1c77a49353bd000000000001c8b1 | 0.413 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.413 | 0.000 | 0.000 | 0.413 | uncovered | none observed |
| f2ba1c77a49353bd000000000001ce6a | 0.402 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.402 | 0.000 | 0.000 | 0.402 | uncovered | none observed |
| f2ba1c77a49353bd000000000000fb9d | 0.399 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.399 | 0.000 | 0.000 | 0.399 | uncovered | none observed |
| f2ba1c77a49353bd000000000001e460 | 0.336 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.336 | 0.000 | 0.000 | 0.336 | uncovered | none observed |
| f2ba1c77a49353bd000000000001767d | 0.320 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 | uncovered | none observed |
| f2ba1c77a49353bd000000000000e2e4 | 0.317 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.317 | 0.000 | 0.000 | 0.317 | uncovered | none observed |
| f2ba1c77a49353bd000000000000de49 | 0.309 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | uncovered | none observed |
| f2ba1c77a49353bd0000000000020e83 | 0.309 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 | uncovered | none observed |
| f2ba1c77a49353bd000000000000e2ff | 0.308 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.308 | 0.000 | 0.000 | 0.308 | uncovered | none observed |
| f2ba1c77a49353bd0000000000012f5f | 0.302 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.302 | 0.000 | 0.000 | 0.302 | uncovered | none observed |
| f2ba1c77a49353bd000000000001d069 | 0.295 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | uncovered | none observed |

## P1 / L4 / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 280.803 | n/a | n/a | n/a | 5.191 | n/a | 0.000 | 280.648 | 0.493 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.404 | 280.800 | 1.000 | 2.404 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd0000000000022933 | 280.951 | 0.155 | n/a | 0.000 | 280.793 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.948 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd0000000000022934 | 280.905 | 0.028 | n/a | 0.000 | 280.875 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 280.903 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000000cb45 | 280.803 | 0.152 | n/a | 0.000 | 280.648 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.800 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000d038 | 280.706 | 0.137 | n/a | 0.000 | 280.566 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 280.703 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000000c4e8 | 259.090 | 0.305 | n/a | 0.000 | 258.775 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 259.080 | 1.000 | 0.010 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.022ms |
| f2ba1c77a49353bd00000000000215dc | 258.371 | 0.105 | n/a | 0.000 | 258.263 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 258.368 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 8517fd79459152f4000000000000bf63 | 256.308 | 0.222 | n/a | 0.000 | 256.079 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 256.301 | 1.000 | 0.007 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 7f06a7bc1422e532000000000000c4f1 | 38.262 | 29.708 | n/a | 5.329 | 0.000 | 0.821 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.404 | 35.038 | 0.916 | 2.404 | node-13/thread-6/reader.execute | replica.apply-delta 0.025ms |
| 8517fd79459152f4000000000000bf9d | 8.851 | 5.191 | n/a | 0.000 | 0.000 | 0.658 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.002 | 5.191 | 0.586 | 3.002 | node-13/thread-5/reader.execute | replica.apply-delta 0.019ms |
| f2ba1c77a49353bd000000000002161f | 6.048 | 2.135 | n/a | 0.000 | 0.000 | 0.493 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.420 | 2.135 | 0.353 | 3.420 | node-13/thread-4/socket.wait-first-byte | none observed |
| 7f06a7bc1422e5320000000000012d21 | 5.631 | 5.627 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 5.627 | 0.999 | 0.003 | node-13/thread-6/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000271f9 | 2.988 | 2.979 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.979 | 0.997 | 0.010 | node-13/thread-4/replica.pull-at | none observed |
| 7f06a7bc1422e532000000000001182d | 2.907 | 2.905 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.905 | 0.999 | 0.002 | node-13/thread-6/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000002a863 | 2.890 | 2.889 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.889 | 0.999 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000002ae1c | 2.039 | 2.037 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.037 | 0.999 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 7f06a7bc1422e532000000000000c4fe | 1.985 | 1.982 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.982 | 0.999 | 0.002 | node-13/thread-6/replica.pull-at | none observed |
| 8517fd79459152f40000000000011a2d | 1.912 | 1.909 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.909 | 0.998 | 0.003 | node-13/thread-5/replica.pull-at | none observed |
| 7f06a7bc1422e5320000000000013061 | 1.882 | 1.880 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.880 | 0.999 | 0.002 | node-13/thread-6/replica.pull-at | none observed |
| 8517fd79459152f400000000000100d0 | 1.534 | 1.531 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.531 | 0.998 | 0.003 | node-13/thread-5/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000301ce | 1.444 | 1.443 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.443 | 0.999 | 0.001 | node-13/thread-4/replica.pull-at | none observed |

## P1 / L16 / read (262 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 445.012 | n/a | n/a | n/a | 6.467 | n/a | 0.000 | 444.986 | 0.372 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.243 | 445.011 | 1.000 | 4.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f06a7bc1422e5320000000000020fab | 445.090 | 0.251 | n/a | 0.000 | 444.836 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 445.087 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 7f06a7bc1422e5320000000000020faf | 445.029 | 0.013 | n/a | 0.000 | 445.015 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 445.028 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 7f06a7bc1422e5320000000000020fae | 445.012 | 0.013 | n/a | 0.000 | 444.998 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 445.011 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 8517fd79459152f400000000000215df | 445.010 | 0.025 | n/a | 0.000 | 444.984 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 445.009 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 7f06a7bc1422e5320000000000020fac | 445.004 | 0.032 | n/a | 0.000 | 444.971 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 445.003 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 7f06a7bc1422e5320000000000020fad | 445.002 | 0.015 | n/a | 0.000 | 444.986 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 445.001 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| f2ba1c77a49353bd000000000003ac3a | 444.971 | 0.117 | n/a | 0.000 | 444.853 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.971 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 8517fd79459152f400000000000215de | 444.970 | 0.030 | n/a | 0.000 | 444.939 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.969 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| f2ba1c77a49353bd000000000003ac39 | 444.937 | 0.020 | n/a | 0.000 | 444.916 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.936 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 8517fd79459152f400000000000215dd | 444.931 | 0.027 | n/a | 0.000 | 444.903 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.930 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| f2ba1c77a49353bd000000000003ac3c | 444.921 | 0.038 | n/a | 0.000 | 444.883 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.921 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| f2ba1c77a49353bd000000000003ac3d | 444.913 | 0.013 | n/a | 0.000 | 444.899 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 444.912 | 1.000 | 0.000 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 8517fd79459152f400000000000215dc | 444.908 | 0.054 | n/a | 0.000 | 444.853 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.907 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 8517fd79459152f400000000000215db | 444.902 | 0.326 | n/a | 0.000 | 444.573 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 444.899 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| f2ba1c77a49353bd000000000003ac3b | 444.902 | 0.015 | n/a | 0.000 | 444.886 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 444.901 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| f2ba1c77a49353bd000000000003ac38 | 444.894 | 0.115 | n/a | 0.000 | 444.777 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 444.892 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| f2ba1c77a49353bd000000000003ac54 | 86.976 | 0.102 | n/a | 0.000 | 86.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 86.974 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| f2ba1c77a49353bd000000000003ac83 | 85.898 | 0.022 | n/a | 0.000 | 85.875 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 85.897 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 7f06a7bc1422e5320000000000020fc6 | 85.624 | 0.014 | n/a | 0.000 | 85.609 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 85.623 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| 7f06a7bc1422e5320000000000020fc5 | 85.621 | 0.020 | n/a | 0.000 | 85.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 85.620 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.027ms |

## P1 / L64 / read (239 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 306.793 | n/a | n/a | n/a | 9.235 | n/a | 0.000 | 306.749 | 0.725 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 14.306 | 306.792 | 1.000 | 14.306 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8517fd79459152f4000000000002d3ec | 307.333 | 0.156 | n/a | 0.000 | 307.173 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.329 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000002ca2d | 306.911 | 0.670 | n/a | 0.000 | 306.237 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 306.907 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000002d406 | 306.793 | 0.043 | n/a | 0.000 | 306.749 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.792 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000002d407 | 306.782 | 0.015 | n/a | 0.000 | 306.766 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.781 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000002d408 | 306.708 | 0.053 | n/a | 0.000 | 306.641 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 306.695 | 1.000 | 0.013 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000002ca2e | 306.592 | 0.268 | n/a | 0.000 | 306.319 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 306.587 | 1.000 | 0.005 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000002d409 | 306.520 | 0.026 | n/a | 0.000 | 306.490 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 306.515 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000002ca42 | 305.415 | 0.354 | n/a | 0.000 | 305.058 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 305.413 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000002ca43 | 305.115 | 0.129 | n/a | 0.000 | 304.983 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 305.112 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000002ca52 | 303.554 | 0.100 | n/a | 0.000 | 303.451 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.551 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd00000000000473ca | 301.130 | 0.232 | n/a | 0.000 | 300.896 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 301.128 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd00000000000473cc | 301.082 | 0.088 | n/a | 0.000 | 300.993 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.081 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd00000000000473ce | 301.064 | 0.014 | n/a | 0.000 | 301.049 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.063 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd00000000000473cd | 301.057 | 0.027 | n/a | 0.000 | 301.029 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.056 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd00000000000473cb | 301.056 | 0.035 | n/a | 0.000 | 301.020 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 301.055 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd00000000000473dc | 300.836 | 0.025 | n/a | 0.000 | 300.810 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.835 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8517fd79459152f400000000000306c1 | 275.791 | 0.065 | n/a | 0.000 | 275.723 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.788 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f400000000000306c0 | 275.757 | 0.122 | n/a | 0.000 | 275.633 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.755 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f400000000000306bf | 275.720 | 0.308 | n/a | 0.000 | 275.411 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.719 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f400000000000306b5 | 275.577 | 0.165 | n/a | 0.000 | 275.409 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.574 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L256 / read (193 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.036 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 401.645 | n/a | n/a | n/a | 12.081 | n/a | 1.066 | 401.460 | 1.027 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.376 | 401.644 | 1.000 | 40.376 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f06a7bc1422e53200000000000402f7 | 401.649 | 0.231 | n/a | 0.000 | 401.417 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 401.648 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e53200000000000402f8 | 401.645 | 0.089 | n/a | 0.000 | 401.555 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 401.644 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e53200000000000402f6 | 401.475 | 0.014 | n/a | 0.000 | 401.460 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 401.474 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e53200000000000402f5 | 401.469 | 0.021 | n/a | 0.000 | 401.445 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 401.466 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e53200000000000402f4 | 401.420 | 0.111 | n/a | 0.000 | 401.307 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 401.418 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000005bbf9 | 400.309 | 0.015 | n/a | 0.000 | 400.293 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 400.308 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000005bbf8 | 400.294 | 0.019 | n/a | 0.000 | 400.274 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 400.293 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000005bbf7 | 400.253 | 0.117 | n/a | 0.000 | 400.134 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 400.251 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000005bc26 | 399.205 | 0.049 | n/a | 0.000 | 399.154 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 399.203 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000005bc27 | 399.147 | 0.016 | n/a | 0.000 | 399.131 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 399.146 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000040f4e | 399.100 | 0.024 | n/a | 0.000 | 399.074 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 399.098 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000040f4d | 399.089 | 0.133 | n/a | 0.000 | 398.953 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 399.086 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000005bc2b | 399.058 | 0.022 | n/a | 0.000 | 399.036 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 399.057 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000040f61 | 398.430 | 0.042 | n/a | 0.000 | 398.386 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 398.428 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000040f62 | 398.408 | 0.018 | n/a | 0.000 | 398.387 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 398.406 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000040f63 | 398.394 | 0.017 | n/a | 0.000 | 398.374 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 398.392 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000003632d | 316.094 | 0.125 | n/a | 0.000 | 315.967 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 316.092 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000003632e | 316.046 | 0.035 | n/a | 0.000 | 316.010 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.045 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e5320000000000036330 | 316.035 | 0.033 | n/a | 0.000 | 316.001 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.034 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000003632f | 316.034 | 0.015 | n/a | 0.000 | 316.018 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.033 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (293 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 12.306 | n/a | n/a | n/a | 7.512 | n/a | 0.000 | 0.000 | 0.605 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.508 | 7.512 | 1.000 | 5.508 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8517fd79459152f40000000000042222 | 21.478 | 13.585 | n/a | 1.667 | 0.000 | 0.717 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.508 | 15.253 | 0.710 | 5.508 | node-13/thread-5/reader.execute | none observed |
| f2ba1c77a49353bd000000000005d062 | 13.433 | 6.116 | n/a | 0.000 | 0.000 | 0.789 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.529 | 6.116 | 0.455 | 6.529 | node-13/thread-4/socket.wait-first-byte | none observed |
| 7f06a7bc1422e5320000000000041689 | 12.306 | 3.577 | n/a | 0.000 | 0.000 | 0.605 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.124 | 3.577 | 0.291 | 8.124 | node-13/thread-6/socket.wait-first-byte | none observed |
| 8517fd79459152f400000000000561ee | 7.544 | 7.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 7.542 | 1.000 | 0.003 | node-13/thread-5/replica.pull-at | none observed |
| 8517fd79459152f400000000000561ef | 7.532 | 7.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 7.512 | 0.997 | 0.020 | node-13/thread-5/replica.pull-at | none observed |
| 8517fd79459152f400000000000561f0 | 7.492 | 7.472 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 7.472 | 0.997 | 0.020 | node-13/thread-5/replica.pull-at | none observed |
| 8517fd79459152f400000000000561f1 | 7.466 | 7.444 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 7.444 | 0.997 | 0.022 | node-13/thread-5/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000006beae | 7.189 | 7.187 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 7.187 | 1.000 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 8517fd79459152f40000000000055fb6 | 6.015 | 5.990 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 5.990 | 0.996 | 0.025 | node-13/thread-5/replica.pull-at | none observed |
| 8517fd79459152f40000000000055fb5 | 5.996 | 5.995 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.995 | 1.000 | 0.002 | node-13/thread-5/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000071626 | 5.156 | 5.154 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 5.154 | 1.000 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000071627 | 5.152 | 5.135 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.135 | 0.997 | 0.016 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000071628 | 5.148 | 5.130 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.130 | 0.996 | 0.018 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000071629 | 5.146 | 5.126 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 5.126 | 0.996 | 0.020 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000007162a | 5.142 | 5.121 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.121 | 0.996 | 0.021 | node-13/thread-4/reader.execute | none observed |
| 7f06a7bc1422e5320000000000045fb3 | 3.944 | 3.812 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.133 | 3.812 | 0.966 | 0.133 | node-13/thread-6/replica.pull-at | none observed |
| 7f06a7bc1422e5320000000000045fb4 | 3.932 | 3.794 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.137 | 3.794 | 0.965 | 0.137 | node-13/thread-6/replica.pull-at | none observed |
| 7f06a7bc1422e5320000000000045fb5 | 3.923 | 3.783 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.140 | 3.783 | 0.964 | 0.140 | node-13/thread-6/replica.pull-at | none observed |
| 7f06a7bc1422e5320000000000045fb2 | 3.837 | 3.833 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.833 | 0.999 | 0.005 | node-13/thread-6/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000006243d | 3.796 | 3.778 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.778 | 0.995 | 0.018 | node-13/thread-4/replica.pull-at | none observed |

## P1 / recovery / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 |
| p99 | 304.776 | n/a | n/a | n/a | 4.794 | n/a | 0.000 | 304.662 | 0.504 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.438 | 304.774 | 1.000 | 4.438 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8517fd79459152f40000000000061311 | 305.258 | 0.245 | n/a | 0.000 | 305.010 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 305.255 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000005fa35 | 304.828 | 0.021 | n/a | 0.000 | 304.806 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.827 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000005fa34 | 304.776 | 0.113 | n/a | 0.000 | 304.662 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.774 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000005fa4a | 304.616 | 0.013 | n/a | 0.000 | 304.602 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.615 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000005fa48 | 304.614 | 0.026 | n/a | 0.000 | 304.587 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.613 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000005fa49 | 304.610 | 0.014 | n/a | 0.000 | 304.595 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.609 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007cdf1 | 304.595 | 0.153 | n/a | 0.000 | 304.438 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 304.591 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007cdf4 | 304.591 | 0.019 | n/a | 0.000 | 304.571 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.589 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007cdf3 | 304.589 | 0.020 | n/a | 0.000 | 304.569 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.588 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007cdf2 | 304.585 | 0.024 | n/a | 0.000 | 304.560 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.584 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007cdf7 | 304.385 | 0.042 | n/a | 0.000 | 304.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 304.383 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007cdf8 | 304.359 | 0.015 | n/a | 0.000 | 304.344 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.359 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000061324 | 303.746 | 0.100 | n/a | 0.000 | 303.638 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 303.738 | 1.000 | 0.008 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000061327 | 303.729 | 0.030 | n/a | 0.000 | 303.697 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.727 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000061326 | 303.710 | 0.032 | n/a | 0.000 | 303.676 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.708 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 8517fd79459152f40000000000061325 | 303.695 | 0.033 | n/a | 0.000 | 303.660 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.692 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e5320000000000060b6e | 274.809 | 0.269 | n/a | 0.000 | 274.532 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 274.802 | 1.000 | 0.007 | node-13/thread-6/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007dccb | 274.599 | 0.016 | n/a | 0.000 | 274.583 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.598 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007dcca | 274.590 | 0.021 | n/a | 0.000 | 274.568 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.589 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000007dcc9 | 274.527 | 0.125 | n/a | 0.000 | 274.399 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.524 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 1.417 | n/a | n/a | n/a | 1.417 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.494 | 1.417 | 0.998 | 0.494 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd000000000007fc1a | 8.313 | 2.969 | n/a | 0.000 | 0.000 | 0.475 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.869 | 2.969 | 0.357 | 4.869 | node-13/thread-4/socket.wait-first-byte | none observed |
| f2ba1c77a49353bd000000000007ffce | 1.417 | 1.417 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.417 | 0.999 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000008f9fa | 0.723 | 0.693 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 0.693 | 0.958 | 0.030 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000009a4b4 | 0.694 | 0.690 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.690 | 0.994 | 0.004 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000009510e | 0.643 | 0.641 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.641 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000008ba15 | 0.582 | 0.580 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.580 | 0.997 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000009a23a | 0.572 | 0.570 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.570 | 0.998 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd000000000008f70c | 0.531 | 0.527 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.527 | 0.993 | 0.004 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000097eab | 0.510 | 0.505 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.505 | 0.989 | 0.005 | node-13/thread-4/reader.execute | none observed |
| f2ba1c77a49353bd000000000009a1be | 0.494 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.494 | 0.000 | 0.000 | 0.494 | uncovered | none observed |
| f2ba1c77a49353bd000000000009a21b | 0.491 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 | uncovered | none observed |
| f2ba1c77a49353bd00000000000952eb | 0.455 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.455 | 0.000 | 0.000 | 0.455 | uncovered | none observed |
| f2ba1c77a49353bd000000000008fafc | 0.453 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.453 | 0.000 | 0.000 | 0.453 | uncovered | none observed |
| f2ba1c77a49353bd000000000008e7bb | 0.450 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.450 | 0.000 | 0.000 | 0.450 | uncovered | none observed |
| f2ba1c77a49353bd000000000008d3ff | 0.441 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.441 | 0.000 | 0.000 | 0.441 | uncovered | none observed |
| f2ba1c77a49353bd0000000000083c3f | 0.434 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.434 | 0.000 | 0.000 | 0.434 | uncovered | none observed |
| f2ba1c77a49353bd000000000009a210 | 0.413 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.413 | 0.000 | 0.000 | 0.413 | uncovered | none observed |
| f2ba1c77a49353bd000000000009acde | 0.406 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.406 | 0.000 | 0.000 | 0.406 | uncovered | none observed |
| f2ba1c77a49353bd000000000009f421 | 0.397 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.397 | 0.000 | 0.000 | 0.397 | uncovered | none observed |
| f2ba1c77a49353bd000000000008b9e1 | 0.396 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.396 | 0.000 | 0.000 | 0.396 | uncovered | none observed |

## P4 / p4h1 / read (186 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 |
| p99 | 0.758 | n/a | n/a | n/a | 0.753 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.495 | 0.753 | 0.997 | 0.495 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd000000000009f592 | 8.843 | 1.311 | n/a | 0.000 | 0.000 | 0.420 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.112 | 1.311 | 0.148 | 7.112 | node-13/thread-4/socket.wait-first-byte | none observed |
| f2ba1c77a49353bd00000000000b7466 | 0.758 | 0.753 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.753 | 0.994 | 0.004 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000b846d | 0.672 | 0.670 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.670 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000b7534 | 0.534 | 0.533 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.533 | 0.997 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000ba268 | 0.526 | 0.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.524 | 0.997 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000a6ded | 0.511 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.507 | 0.991 | 0.004 | node-13/thread-4/reader.execute | none observed |
| f2ba1c77a49353bd00000000000b8bc2 | 0.495 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.495 | 0.000 | 0.000 | 0.495 | uncovered | none observed |
| f2ba1c77a49353bd00000000000a43c8 | 0.474 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.474 | 0.000 | 0.000 | 0.474 | uncovered | none observed |
| f2ba1c77a49353bd00000000000b3138 | 0.465 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.465 | 0.000 | 0.000 | 0.465 | uncovered | none observed |
| f2ba1c77a49353bd00000000000a6ea0 | 0.422 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.422 | 0.000 | 0.000 | 0.422 | uncovered | none observed |
| f2ba1c77a49353bd00000000000a9141 | 0.412 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.412 | 0.000 | 0.000 | 0.412 | uncovered | none observed |
| f2ba1c77a49353bd00000000000bfcdd | 0.412 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.412 | 0.000 | 0.000 | 0.412 | uncovered | none observed |
| f2ba1c77a49353bd00000000000a6605 | 0.398 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | uncovered | none observed |
| f2ba1c77a49353bd00000000000c1379 | 0.398 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | uncovered | none observed |
| f2ba1c77a49353bd00000000000c6c93 | 0.394 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | uncovered | none observed |
| f2ba1c77a49353bd00000000000a8f91 | 0.385 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.385 | 0.000 | 0.000 | 0.385 | uncovered | none observed |
| f2ba1c77a49353bd00000000000ca24d | 0.378 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.378 | 0.000 | 0.000 | 0.378 | uncovered | none observed |
| f2ba1c77a49353bd00000000000c6caf | 0.371 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | uncovered | none observed |
| f2ba1c77a49353bd00000000000b73f4 | 0.370 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.370 | 0.000 | 0.000 | 0.370 | uncovered | none observed |
| f2ba1c77a49353bd00000000000a57fb | 0.363 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | uncovered | none observed |

## P4 / p4h3 / read (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 1.431 | n/a | n/a | n/a | 1.427 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.501 | 1.427 | 0.998 | 0.501 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd00000000000ca386 | 9.498 | 1.687 | n/a | 0.000 | 0.000 | 0.735 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.076 | 1.687 | 0.178 | 7.076 | node-13/thread-4/socket.wait-first-byte | none observed |
| f2ba1c77a49353bd00000000000e0749 | 1.431 | 1.427 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.427 | 0.997 | 0.004 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000e178b | 0.800 | 0.796 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.796 | 0.995 | 0.004 | node-13/thread-4/reader.execute | none observed |
| f2ba1c77a49353bd00000000000defce | 0.783 | 0.781 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.781 | 0.998 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000e076b | 0.759 | 0.757 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.757 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000e0783 | 0.678 | 0.676 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.676 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000e075c | 0.614 | 0.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.611 | 0.996 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000e7913 | 0.583 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.579 | 0.993 | 0.004 | node-13/thread-4/reader.execute | none observed |
| f2ba1c77a49353bd00000000000dfb85 | 0.559 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.558 | 0.998 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000e104d | 0.551 | 0.550 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.550 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000d6581 | 0.501 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.501 | 0.000 | 0.000 | 0.501 | uncovered | none observed |
| f2ba1c77a49353bd00000000000eb9a0 | 0.488 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 | uncovered | none observed |
| f2ba1c77a49353bd00000000000d6bd7 | 0.488 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.488 | 0.000 | 0.000 | 0.488 | uncovered | none observed |
| f2ba1c77a49353bd00000000000e077c | 0.459 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.459 | 0.000 | 0.000 | 0.459 | uncovered | none observed |
| f2ba1c77a49353bd00000000000e3699 | 0.443 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.443 | 0.000 | 0.000 | 0.443 | uncovered | none observed |
| f2ba1c77a49353bd00000000000e075e | 0.442 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 | uncovered | none observed |
| f2ba1c77a49353bd00000000000d660d | 0.442 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.442 | 0.000 | 0.000 | 0.442 | uncovered | none observed |
| f2ba1c77a49353bd00000000000d680e | 0.436 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.436 | 0.000 | 0.000 | 0.436 | uncovered | none observed |
| f2ba1c77a49353bd00000000000d67fe | 0.419 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.419 | 0.000 | 0.000 | 0.419 | uncovered | none observed |
| f2ba1c77a49353bd00000000000e8c84 | 0.418 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.418 | 0.000 | 0.000 | 0.418 | uncovered | none observed |

## P4 / p4h10 / read (190 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.000 | 0.000 | 0.009 |
| p99 | 3.183 | n/a | n/a | n/a | 1.493 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.493 | 1.493 | 0.998 | 0.493 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f2ba1c77a49353bd00000000000ec619 | 10.163 | 1.493 | n/a | 0.000 | 0.000 | 0.393 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.277 | 1.493 | 0.147 | 8.277 | node-13/thread-4/socket.wait-first-byte | none observed |
| f2ba1c77a49353bd00000000000f3aca | 3.183 | 3.182 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.182 | 1.000 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000001091d4 | 1.213 | 1.211 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.211 | 0.998 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000108f39 | 0.739 | 0.738 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.738 | 0.998 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000001022f9 | 0.614 | 0.613 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.613 | 0.997 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd00000000000fd966 | 0.563 | 0.560 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.560 | 0.995 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| f2ba1c77a49353bd0000000000100c4f | 0.493 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.493 | 0.000 | 0.000 | 0.493 | uncovered | none observed |
| f2ba1c77a49353bd0000000000110c2f | 0.486 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.486 | 0.000 | 0.000 | 0.486 | uncovered | none observed |
| f2ba1c77a49353bd00000000000f2aad | 0.486 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.486 | 0.000 | 0.000 | 0.486 | uncovered | none observed |
| f2ba1c77a49353bd0000000000112220 | 0.451 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.451 | 0.000 | 0.000 | 0.451 | uncovered | none observed |
| f2ba1c77a49353bd0000000000103980 | 0.448 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.448 | 0.000 | 0.000 | 0.448 | uncovered | none observed |
| f2ba1c77a49353bd00000000000ed046 | 0.446 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.446 | 0.000 | 0.000 | 0.446 | uncovered | none observed |
| f2ba1c77a49353bd0000000000102492 | 0.431 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.431 | 0.000 | 0.000 | 0.431 | uncovered | none observed |
| f2ba1c77a49353bd00000000001091db | 0.422 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.422 | 0.000 | 0.000 | 0.422 | uncovered | none observed |
| f2ba1c77a49353bd0000000000105021 | 0.418 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.418 | 0.000 | 0.000 | 0.418 | uncovered | none observed |
| f2ba1c77a49353bd00000000000f57e7 | 0.409 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.409 | 0.000 | 0.000 | 0.409 | uncovered | none observed |
| f2ba1c77a49353bd00000000000f1643 | 0.389 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.389 | 0.000 | 0.000 | 0.389 | uncovered | none observed |
| f2ba1c77a49353bd000000000011067e | 0.382 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.382 | 0.000 | 0.000 | 0.382 | uncovered | none observed |
| f2ba1c77a49353bd00000000000fd979 | 0.371 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.371 | 0.000 | 0.000 | 0.371 | uncovered | none observed |
| f2ba1c77a49353bd00000000001030bb | 0.362 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.362 | 0.000 | 0.000 | 0.362 | uncovered | none observed |

## P5 / presweep / read (227 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.038 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 269.063 | n/a | n/a | n/a | 9.585 | n/a | 3.652 | 269.022 | 0.552 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.517 | 269.062 | 1.000 | 1.517 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8517fd79459152f4000000000006a255 | 269.123 | 0.027 | n/a | 0.000 | 269.094 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.122 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 8517fd79459152f4000000000006a254 | 269.093 | 0.036 | n/a | 0.000 | 269.055 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.091 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 8517fd79459152f4000000000006a253 | 269.063 | 0.062 | n/a | 0.000 | 269.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.062 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 7f06a7bc1422e5320000000000069172 | 269.054 | 0.031 | n/a | 0.000 | 269.022 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.053 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e5320000000000069170 | 269.042 | 0.036 | n/a | 0.000 | 269.004 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.041 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e532000000000006916f | 269.042 | 0.101 | n/a | 0.000 | 268.938 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 269.039 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 7f06a7bc1422e5320000000000069171 | 269.038 | 0.019 | n/a | 0.000 | 269.019 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.037 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| 8517fd79459152f4000000000006a252 | 269.031 | 0.131 | n/a | 0.000 | 268.898 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.029 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 7f06a7bc1422e532000000000006916e | 268.977 | 0.156 | n/a | 0.000 | 268.812 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 268.968 | 1.000 | 0.010 | node-13/thread-6/reader.straddle-await-ack | none observed |
| f2ba1c77a49353bd000000000011a9d2 | 268.926 | 0.060 | n/a | 0.000 | 268.865 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.926 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| f2ba1c77a49353bd000000000011a9d1 | 268.910 | 0.014 | n/a | 0.000 | 268.896 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.909 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 8517fd79459152f4000000000006a251 | 268.907 | 0.166 | n/a | 0.000 | 268.738 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.904 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| f2ba1c77a49353bd000000000011a9d0 | 268.901 | 0.013 | n/a | 0.000 | 268.887 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.900 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| f2ba1c77a49353bd000000000011a9cf | 268.891 | 0.018 | n/a | 0.000 | 268.872 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.890 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| f2ba1c77a49353bd000000000011a9ce | 268.881 | 0.034 | n/a | 0.000 | 268.845 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.880 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| f2ba1c77a49353bd000000000011a9cd | 268.856 | 0.149 | n/a | 0.000 | 268.702 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 268.851 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 8517fd79459152f4000000000006429a | 23.890 | 13.311 | n/a | 5.674 | 0.000 | 1.112 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.793 | 18.985 | 0.795 | 3.793 | node-13/thread-5/reader.execute | none observed |
| f2ba1c77a49353bd00000000001137dc | 16.931 | 9.585 | n/a | 0.000 | 0.000 | 0.552 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.794 | 9.585 | 0.566 | 6.794 | node-13/thread-4/reader.execute | none observed |
| 7f06a7bc1422e5320000000000062ee0 | 15.235 | 10.576 | n/a | 1.884 | 0.000 | 1.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.517 | 12.460 | 0.818 | 1.517 | node-13/thread-6/reader.execute | none observed |
| 7f06a7bc1422e532000000000006421c | 7.169 | 7.167 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 7.167 | 1.000 | 0.002 | node-13/thread-6/replica.pull-at | none observed |

## P5 / sweep / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.133 | n/a | n/a | n/a | 3.112 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.125 | 0.996 | 0.015 |
| p99 | 43.820 | n/a | n/a | n/a | 33.786 | n/a | 8.416 | 0.000 | 0.775 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.849 | 40.783 | 1.000 | 3.849 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8517fd79459152f400000000000728e5 | 43.820 | 33.786 | n/a | 6.998 | 0.000 | 0.393 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.644 | 40.783 | 0.931 | 2.644 | node-13/thread-5/reader.execute | none observed |
| f2ba1c77a49353bd0000000000122d88 | 43.406 | 30.366 | n/a | 8.416 | 0.000 | 0.775 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.849 | 38.783 | 0.893 | 3.849 | node-13/thread-4/reader.execute | none observed |
| 7f06a7bc1422e5320000000000071365 | 11.028 | 7.786 | n/a | 0.000 | 0.000 | 0.741 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.501 | 7.786 | 0.706 | 2.501 | node-13/thread-6/reader.execute | none observed |
| e7c8aa34cc0baeed0000000000000153 | 9.389 | 4.506 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.083 | 9.307 | 0.991 | 0.083 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000154 | 9.367 | 4.468 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.098 | 9.269 | 0.989 | 0.098 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000155 | 9.316 | 4.414 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.102 | 9.214 | 0.989 | 0.102 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000156 | 9.284 | 4.378 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.105 | 9.179 | 0.989 | 0.105 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000157 | 9.254 | 4.346 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.107 | 9.146 | 0.988 | 0.107 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000158 | 9.071 | 4.226 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 9.027 | 0.995 | 0.044 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000159 | 8.993 | 4.147 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.046 | 8.947 | 0.995 | 0.046 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000233 | 8.170 | 8.150 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.150 | 0.998 | 0.020 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed0000000000000234 | 8.154 | 8.124 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.030 | 8.124 | 0.996 | 0.030 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed0000000000000235 | 8.079 | 8.047 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.032 | 8.047 | 0.996 | 0.032 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed0000000000000236 | 8.061 | 8.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.034 | 8.026 | 0.996 | 0.034 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed0000000000000237 | 8.044 | 8.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.025 | 8.019 | 0.997 | 0.025 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed000000000000015a | 7.768 | 2.887 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.081 | 7.687 | 0.990 | 0.081 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed000000000000015b | 7.514 | 2.660 | n/a | 4.801 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.054 | 7.460 | 0.993 | 0.054 | node-13/thread-7/node.gc | none observed |
| e7c8aa34cc0baeed0000000000000303 | 7.315 | 4.534 | n/a | 2.773 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 7.307 | 0.999 | 0.009 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed00000000000001e3 | 6.795 | 6.779 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.779 | 0.998 | 0.016 | node-13/thread-7/replica.pull-at | none observed |
| e7c8aa34cc0baeed00000000000001e4 | 6.703 | 6.682 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 6.682 | 0.997 | 0.021 | node-13/thread-7/replica.pull-at | none observed |

## P1 / outside-phases / read (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.128 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 0.433 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.433 | 0.000 | 0.000 | 0.433 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7f06a7bc1422e5320000000000071bde | 0.433 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.433 | 0.000 | 0.000 | 0.433 | uncovered | none observed |
| 7f06a7bc1422e5320000000000071bdf | 0.323 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.323 | 0.000 | 0.000 | 0.323 | uncovered | none observed |
| 7f06a7bc1422e5320000000000071be0 | 0.252 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.252 | 0.000 | 0.000 | 0.252 | uncovered | none observed |
| 7f06a7bc1422e5320000000000071be1 | 0.212 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | uncovered | none observed |
| 8517fd79459152f40000000000073297 | 0.184 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | uncovered | none observed |
| 8517fd79459152f40000000000073298 | 0.158 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | uncovered | none observed |
| 8517fd79459152f40000000000073299 | 0.149 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | uncovered | none observed |
| f2ba1c77a49353bd0000000000123577 | 0.136 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | uncovered | none observed |
| 7f06a7bc1422e5320000000000071be2 | 0.128 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | uncovered | none observed |
| f2ba1c77a49353bd0000000000123578 | 0.120 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | uncovered | none observed |
| f2ba1c77a49353bd0000000000123579 | 0.098 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | uncovered | none observed |
| 8517fd79459152f4000000000007329a | 0.076 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.076 | 0.000 | 0.000 | 0.076 | uncovered | none observed |
| f2ba1c77a49353bd000000000012357a | 0.072 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.072 | 0.000 | 0.000 | 0.072 | uncovered | none observed |
| 8517fd79459152f4000000000007329b | 0.057 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.057 | 0.000 | 0.000 | 0.057 | uncovered | none observed |
| f2ba1c77a49353bd000000000012357b | 0.053 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 | uncovered | none observed |
| f2ba1c77a49353bd000000000012357c | 0.044 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.044 | 0.000 | 0.000 | 0.044 | uncovered | none observed |

## P3 / outside-phases / read (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.048 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 200.942 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 204.593 | n/a | n/a | n/a | 0.627 | n/a | 0.000 | 0.000 | 3.021 | 203.115 | 2.330 | n/a | 0.264 | 0.000 | n/a | n/a | 0.433 | 0.627 | 0.006 | 0.433 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000007 | 204.593 | 0.000 | n/a | 0.000 | 0.000 | 1.112 | 203.115 | 0.025 | n/a | 0.172 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000005b | 203.662 | 0.000 | n/a | 0.000 | 0.000 | 1.696 | 201.474 | 0.038 | n/a | 0.180 | 0.000 | n/a | n/a | 0.275 | 0.000 | 0.000 | 0.275 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c200000000000000c7 | 203.538 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 202.048 | 0.079 | n/a | 0.193 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000006 | 202.993 | 0.000 | n/a | 0.000 | 0.000 | 1.373 | 201.071 | 0.019 | n/a | 0.238 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000c8 | 202.754 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 201.421 | 0.021 | n/a | 0.193 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c2000000000000005e | 202.686 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 201.485 | 0.019 | n/a | 0.163 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c20000000000000098 | 202.607 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 201.295 | 0.020 | n/a | 0.132 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000005 | 202.593 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 201.296 | 0.025 | n/a | 0.207 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000007c | 202.560 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 201.333 | 0.014 | n/a | 0.143 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000097 | 202.465 | 0.000 | n/a | 0.000 | 0.000 | 1.073 | 201.123 | 0.016 | n/a | 0.101 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000079 | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 1.063 | 201.135 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000059 | 202.302 | 0.000 | n/a | 0.000 | 0.000 | 1.002 | 200.990 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000009c | 202.250 | 0.000 | n/a | 0.000 | 0.000 | 0.859 | 201.103 | 0.026 | n/a | 0.128 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000c9 | 202.248 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 200.927 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c200000000000000a1 | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 200.997 | 0.015 | n/a | 0.109 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000009a | 202.177 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.002 | 0.011 | n/a | 0.125 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000074 | 202.082 | 0.000 | n/a | 0.000 | 0.000 | 0.604 | 201.208 | 0.035 | n/a | 0.127 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000009f | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.026 | 0.040 | n/a | 0.125 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000a2 | 201.911 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.803 | 0.012 | n/a | 0.095 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000a4 | 201.896 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 200.908 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-47/journal/page | none observed |

## P3 / outside-phases / internal (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 624.856 | n/a | n/a | n/a | 3.138 | n/a | 0.000 | 0.000 | 0.940 | 613.095 | 0.017 | n/a | 0.097 | 0.000 | n/a | n/a | 0.154 | 3.138 | 0.012 | 0.154 |
| p99 | 1006.672 | n/a | n/a | n/a | 101.274 | n/a | 5.286 | 0.000 | 2.164 | 1002.488 | 0.164 | n/a | 0.429 | 0.000 | n/a | n/a | 18.594 | 106.560 | 0.847 | 18.594 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000017 | 1006.672 | 0.244 | n/a | 0.000 | 0.000 | 2.164 | 1002.488 | 0.052 | n/a | 0.429 | 0.000 | n/a | n/a | 1.296 | 0.244 | 0.000 | 1.296 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000053 | 1004.056 | 0.177 | n/a | 0.000 | 0.000 | 1.342 | 1001.242 | 0.019 | n/a | 0.149 | 0.000 | n/a | n/a | 1.126 | 0.177 | 0.000 | 1.126 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000018 | 1003.690 | 0.134 | n/a | 0.000 | 0.000 | 0.940 | 1001.272 | 0.031 | n/a | 0.207 | 0.000 | n/a | n/a | 1.107 | 0.134 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| fe855a233e6123390000000000000019 | 1003.171 | 0.201 | n/a | 0.000 | 0.000 | 0.691 | 1000.948 | 0.016 | n/a | 0.162 | 0.000 | n/a | n/a | 1.154 | 0.201 | 0.000 | 1.154 | gw-r/thread-45/journal/page | none observed |
| fe855a233e6123390000000000000081 | 998.531 | 3.826 | n/a | 0.000 | 0.000 | 0.534 | 993.968 | 0.047 | n/a | 0.096 | 0.000 | n/a | n/a | 0.059 | 3.826 | 0.004 | 0.059 | gw-r/thread-48/journal/page | none observed |
| fe855a233e612339000000000000007e | 798.585 | 2.596 | n/a | 0.000 | 0.000 | 1.065 | 794.607 | 0.164 | n/a | 0.086 | 0.000 | n/a | n/a | 0.067 | 2.596 | 0.003 | 0.067 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000061 | 636.293 | 2.567 | n/a | 0.000 | 0.000 | 0.673 | 632.858 | 0.021 | n/a | 0.097 | 0.000 | n/a | n/a | 0.076 | 2.567 | 0.004 | 0.076 | gw-r/thread-42/journal/page | none observed |
| fe855a233e612339000000000000005e | 624.856 | 10.233 | n/a | 0.000 | 0.000 | 1.115 | 613.095 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.318 | 10.233 | 0.016 | 0.318 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000051 | 505.785 | 5.012 | n/a | 3.196 | 0.000 | 1.437 | 495.810 | 0.017 | n/a | 0.159 | 0.000 | n/a | n/a | 0.154 | 8.208 | 0.016 | 0.154 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000082 | 411.565 | 6.325 | n/a | 0.000 | 0.000 | 0.815 | 404.144 | 0.011 | n/a | 0.176 | 0.000 | n/a | n/a | 0.094 | 6.325 | 0.015 | 0.094 | gw-r/thread-48/journal/page | none observed |
| fe855a233e612339000000000000007d | 370.385 | 5.722 | n/a | 0.000 | 0.000 | 1.944 | 362.364 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.222 | 5.722 | 0.015 | 0.222 | gw-r/thread-45/journal/page | none observed |
| fe855a233e612339000000000000005d | 260.729 | 3.138 | n/a | 0.000 | 0.000 | 0.764 | 256.667 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.078 | 3.138 | 0.012 | 0.078 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000062 | 220.543 | 3.816 | n/a | 0.000 | 0.000 | 0.795 | 215.756 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.077 | 3.816 | 0.017 | 0.077 | gw-r/thread-49/journal/page | none observed |
| fe855a233e612339000000000000007f | 196.857 | 2.325 | n/a | 0.000 | 0.000 | 0.997 | 193.261 | 0.138 | n/a | 0.077 | 0.000 | n/a | n/a | 0.059 | 2.325 | 0.012 | 0.059 | gw-r/thread-47/journal/page | none observed |
| fe855a233e612339000000000000005c | 125.762 | 101.274 | n/a | 5.286 | 0.000 | 0.609 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 18.594 | 106.560 | 0.847 | 18.594 | node-13/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 340.426 | n/a | n/a | n/a | 5.755 | n/a | 0.000 | 0.000 | 1.372 | 320.429 | 0.023 | n/a | 0.133 | 0.000 | n/a | n/a | 0.272 | 5.755 | 0.021 | 0.272 |
| p99 | 841.396 | n/a | n/a | n/a | 17.872 | n/a | 0.591 | 0.000 | 1.632 | 833.404 | 0.386 | n/a | 0.306 | 0.000 | n/a | n/a | 0.439 | 18.463 | 0.054 | 0.439 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000001d | 841.396 | 5.755 | n/a | 0.000 | 0.000 | 1.632 | 833.404 | 0.023 | n/a | 0.142 | 0.000 | n/a | n/a | 0.439 | 5.755 | 0.007 | 0.439 | gw-r/thread-46/journal/page | none observed |
| fe855a233e612339000000000000001b | 415.968 | 8.640 | n/a | 0.000 | 0.000 | 1.372 | 405.261 | 0.065 | n/a | 0.306 | 0.000 | n/a | n/a | 0.324 | 8.640 | 0.021 | 0.324 | gw-r/thread-48/journal/page | none observed |
| fe855a233e612339000000000000001a | 340.426 | 17.872 | n/a | 0.591 | 0.000 | 0.743 | 320.429 | 0.386 | n/a | 0.133 | 0.000 | n/a | n/a | 0.272 | 18.463 | 0.054 | 0.272 | gw-r/thread-42/journal/page | none observed |
| fe855a233e612339000000000000001e | 123.312 | 4.698 | n/a | 0.000 | 0.000 | 1.490 | 116.809 | 0.018 | n/a | 0.118 | 0.000 | n/a | n/a | 0.179 | 4.698 | 0.038 | 0.179 | gw-r/thread-49/journal/page | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 837.069 | n/a | n/a | n/a | 2.295 | n/a | 0.000 | 0.000 | 0.717 | 832.989 | 0.030 | n/a | 0.128 | 0.000 | n/a | n/a | 0.094 | 2.295 | 0.003 | 0.094 |
| p99 | 1005.698 | n/a | n/a | n/a | 2.550 | n/a | 0.000 | 0.000 | 1.532 | 1003.483 | 0.037 | n/a | 0.156 | 0.000 | n/a | n/a | 1.139 | 2.550 | 0.018 | 1.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000023 | 1005.698 | 0.167 | n/a | 0.000 | 0.000 | 0.717 | 1003.483 | 0.037 | n/a | 0.156 | 0.000 | n/a | n/a | 1.139 | 0.167 | 0.000 | 1.139 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000020 | 837.069 | 2.295 | n/a | 0.000 | 0.000 | 1.532 | 832.989 | 0.030 | n/a | 0.128 | 0.000 | n/a | n/a | 0.094 | 2.295 | 0.003 | 0.094 | gw-r/thread-47/journal/page | none observed |
| fe855a233e6123390000000000000021 | 140.505 | 2.550 | n/a | 0.000 | 0.000 | 0.617 | 137.151 | 0.017 | n/a | 0.086 | 0.000 | n/a | n/a | 0.085 | 2.550 | 0.018 | 0.085 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 302.865 | n/a | n/a | n/a | 3.991 | n/a | 0.000 | 0.000 | 0.570 | 298.034 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.233 | 3.991 | 0.013 | 0.233 |
| p99 | 998.476 | n/a | n/a | n/a | 6.264 | n/a | 0.000 | 0.000 | 0.868 | 991.086 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 29.431 | 6.264 | 0.533 | 29.431 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000002a | 998.476 | 6.264 | n/a | 0.000 | 0.000 | 0.750 | 991.086 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 0.233 | 6.264 | 0.006 | 0.233 | gw-r/thread-49/journal/page | none observed |
| fe855a233e6123390000000000000028 | 665.907 | 3.991 | n/a | 0.000 | 0.000 | 0.868 | 660.836 | 0.017 | n/a | 0.101 | 0.000 | n/a | n/a | 0.094 | 3.991 | 0.006 | 0.094 | gw-r/thread-43/journal/page | none observed |
| fe855a233e6123390000000000000026 | 302.865 | 4.078 | n/a | 0.000 | 0.000 | 0.570 | 298.034 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.087 | 4.078 | 0.013 | 0.087 | gw-r/thread-48/journal/page | none observed |
| fe855a233e6123390000000000000025 | 31.595 | 1.925 | n/a | 0.000 | 0.000 | 0.239 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 29.431 | 1.925 | 0.061 | 29.431 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000024 | 4.554 | 2.426 | n/a | 0.000 | 0.000 | 0.291 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.837 | 2.426 | 0.533 | 1.837 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.322 | n/a | n/a | n/a | 4.446 | n/a | 0.000 | 0.000 | 1.290 | 371.298 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.143 | 4.446 | 0.009 | 0.143 |
| p99 | 951.365 | n/a | n/a | n/a | 8.299 | n/a | 0.000 | 0.000 | 2.238 | 941.471 | 0.022 | n/a | 5.255 | 0.000 | n/a | n/a | 0.163 | 8.299 | 0.024 | 0.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000030 | 951.365 | 8.299 | n/a | 0.000 | 0.000 | 1.290 | 941.471 | 0.019 | n/a | 0.144 | 0.000 | n/a | n/a | 0.143 | 8.299 | 0.009 | 0.143 | gw-r/thread-46/journal/page | none observed |
| fe855a233e612339000000000000002c | 436.089 | 3.509 | n/a | 0.000 | 0.000 | 2.023 | 425.146 | 0.012 | n/a | 5.255 | 0.000 | n/a | n/a | 0.145 | 3.509 | 0.008 | 0.145 | gw-r/thread-49/journal/page | none observed |
| fe855a233e612339000000000000002e | 378.322 | 4.446 | n/a | 0.000 | 0.000 | 2.238 | 371.298 | 0.022 | n/a | 0.155 | 0.000 | n/a | n/a | 0.163 | 4.446 | 0.012 | 0.163 | gw-r/thread-47/journal/page | none observed |
| fe855a233e612339000000000000002b | 247.273 | 6.007 | n/a | 0.000 | 0.000 | 0.744 | 240.298 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.113 | 6.007 | 0.024 | 0.113 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 349.260 | n/a | n/a | n/a | 2.107 | n/a | 0.000 | 0.000 | 0.596 | 343.611 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.087 | 2.107 | 0.006 | 0.087 |
| p99 | 994.851 | n/a | n/a | n/a | 6.020 | n/a | 0.000 | 0.000 | 1.143 | 987.464 | 0.017 | n/a | 0.101 | 0.000 | n/a | n/a | 0.142 | 6.020 | 0.024 | 0.142 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000031 | 994.851 | 6.020 | n/a | 0.000 | 0.000 | 1.143 | 987.464 | 0.017 | n/a | 0.101 | 0.000 | n/a | n/a | 0.107 | 6.020 | 0.006 | 0.107 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000035 | 695.638 | 2.107 | n/a | 0.000 | 0.000 | 0.596 | 692.758 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.087 | 2.107 | 0.003 | 0.087 | gw-r/thread-45/journal/page | none observed |
| fe855a233e6123390000000000000032 | 349.260 | 4.309 | n/a | 0.000 | 0.000 | 1.082 | 343.611 | 0.017 | n/a | 0.099 | 0.000 | n/a | n/a | 0.142 | 4.309 | 0.012 | 0.142 | gw-r/thread-49/journal/page | none observed |
| fe855a233e6123390000000000000034 | 76.779 | 1.810 | n/a | 0.000 | 0.000 | 0.548 | 74.296 | 0.008 | n/a | 0.031 | 0.000 | n/a | n/a | 0.085 | 1.810 | 0.024 | 0.085 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 409.576 | n/a | n/a | n/a | 5.341 | n/a | 0.000 | 0.000 | 1.050 | 404.384 | 0.021 | n/a | 0.143 | 0.000 | n/a | n/a | 0.101 | 5.341 | 0.009 | 0.101 |
| p99 | 695.969 | n/a | n/a | n/a | 15.688 | n/a | 0.000 | 0.000 | 5.834 | 687.467 | 0.161 | n/a | 0.478 | 0.000 | n/a | n/a | 0.148 | 15.688 | 0.071 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000037 | 695.969 | 5.546 | n/a | 0.000 | 0.000 | 2.727 | 687.467 | 0.017 | n/a | 0.113 | 0.000 | n/a | n/a | 0.098 | 5.546 | 0.008 | 0.098 | gw-r/thread-46/journal/page | none observed |
| fe855a233e612339000000000000003b | 586.343 | 5.341 | n/a | 0.000 | 0.000 | 0.708 | 580.045 | 0.021 | n/a | 0.107 | 0.000 | n/a | n/a | 0.121 | 5.341 | 0.009 | 0.121 | gw-r/thread-42/journal/page | none observed |
| fe855a233e612339000000000000003d | 409.576 | 4.041 | n/a | 0.000 | 0.000 | 0.829 | 404.384 | 0.009 | n/a | 0.239 | 0.000 | n/a | n/a | 0.075 | 4.041 | 0.010 | 0.075 | gw-r/thread-48/journal/page | none observed |
| fe855a233e612339000000000000003a | 403.266 | 3.121 | n/a | 0.000 | 0.000 | 1.050 | 398.355 | 0.161 | n/a | 0.478 | 0.000 | n/a | n/a | 0.101 | 3.121 | 0.008 | 0.101 | gw-r/thread-47/journal/page | none observed |
| fe855a233e6123390000000000000039 | 219.677 | 15.688 | n/a | 0.000 | 0.000 | 5.834 | 197.840 | 0.024 | n/a | 0.143 | 0.000 | n/a | n/a | 0.148 | 15.688 | 0.071 | 0.148 | gw-r/thread-45/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 578.397 | n/a | n/a | n/a | 2.809 | n/a | 0.000 | 0.000 | 0.720 | 574.855 | 0.024 | n/a | 0.117 | 0.000 | n/a | n/a | 0.235 | 2.809 | 0.006 | 0.235 |
| p99 | 1003.694 | n/a | n/a | n/a | 5.050 | n/a | 0.000 | 0.000 | 2.353 | 1001.017 | 0.177 | n/a | 0.148 | 0.000 | n/a | n/a | 1.592 | 5.050 | 0.066 | 1.592 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000045 | 1003.694 | 0.232 | n/a | 0.000 | 0.000 | 0.720 | 1001.017 | 0.016 | n/a | 0.117 | 0.000 | n/a | n/a | 1.592 | 0.232 | 0.000 | 1.592 | gw-r/thread-43/journal/page | none observed |
| fe855a233e6123390000000000000040 | 772.156 | 4.506 | n/a | 0.000 | 0.000 | 0.590 | 766.802 | 0.020 | n/a | 0.087 | 0.000 | n/a | n/a | 0.151 | 4.506 | 0.006 | 0.151 | gw-r/thread-46/journal/page | none observed |
| fe855a233e612339000000000000003f | 578.397 | 2.557 | n/a | 0.000 | 0.000 | 0.606 | 574.855 | 0.177 | n/a | 0.121 | 0.000 | n/a | n/a | 0.081 | 2.557 | 0.004 | 0.081 | gw-r/thread-43/journal/page | none observed |
| fe855a233e6123390000000000000041 | 143.979 | 2.809 | n/a | 0.000 | 0.000 | 0.888 | 139.883 | 0.024 | n/a | 0.115 | 0.000 | n/a | n/a | 0.259 | 2.809 | 0.020 | 0.259 | gw-r/thread-45/journal/page | none observed |
| fe855a233e6123390000000000000043 | 76.393 | 5.050 | n/a | 0.000 | 0.000 | 2.353 | 68.578 | 0.029 | n/a | 0.148 | 0.000 | n/a | n/a | 0.235 | 5.050 | 0.066 | 0.235 | gw-r/thread-42/journal/page | none observed |

## P3 / L1024 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 917.022 | n/a | n/a | n/a | 2.421 | n/a | 0.000 | 0.000 | 0.977 | 903.564 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.107 | 2.421 | 0.014 | 0.107 |
| p99 | 989.579 | n/a | n/a | n/a | 12.517 | n/a | 0.000 | 0.000 | 1.673 | 985.967 | 0.084 | n/a | 0.093 | 0.000 | n/a | n/a | 0.145 | 12.517 | 0.026 | 0.145 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000048 | 989.579 | 2.362 | n/a | 0.000 | 0.000 | 0.977 | 985.967 | 0.084 | n/a | 0.083 | 0.000 | n/a | n/a | 0.107 | 2.362 | 0.002 | 0.107 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000047 | 917.022 | 12.517 | n/a | 0.000 | 0.000 | 0.738 | 903.564 | 0.012 | n/a | 0.046 | 0.000 | n/a | n/a | 0.145 | 12.517 | 0.014 | 0.145 | gw-r/thread-43/journal/page | none observed |
| fe855a233e6123390000000000000046 | 93.455 | 2.421 | n/a | 0.000 | 0.000 | 1.673 | 89.169 | 0.017 | n/a | 0.093 | 0.000 | n/a | n/a | 0.083 | 2.421 | 0.026 | 0.083 | gw-r/thread-49/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 407.254 | n/a | n/a | n/a | 2.633 | n/a | 0.000 | 0.000 | 1.303 | 401.941 | 0.016 | n/a | 0.084 | 0.000 | n/a | n/a | 0.110 | 2.633 | 0.007 | 0.110 |
| p99 | 1006.068 | n/a | n/a | n/a | 6.136 | n/a | 0.666 | 0.000 | 2.523 | 997.749 | 1.100 | n/a | 0.135 | 0.000 | n/a | n/a | 0.211 | 6.802 | 0.017 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000004e | 1006.068 | 6.136 | n/a | 0.666 | 0.000 | 1.303 | 997.749 | 0.016 | n/a | 0.084 | 0.000 | n/a | n/a | 0.114 | 6.802 | 0.007 | 0.114 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000049 | 449.218 | 2.633 | n/a | 0.000 | 0.000 | 1.629 | 444.537 | 0.089 | n/a | 0.120 | 0.000 | n/a | n/a | 0.211 | 2.633 | 0.006 | 0.211 | gw-r/thread-48/journal/page | none observed |
| fe855a233e612339000000000000004b | 407.254 | 4.276 | n/a | 0.000 | 0.000 | 0.846 | 401.941 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.110 | 4.276 | 0.010 | 0.110 | gw-r/thread-45/journal/page | none observed |
| fe855a233e612339000000000000004d | 138.537 | 2.397 | n/a | 0.000 | 0.000 | 2.523 | 132.297 | 1.100 | n/a | 0.135 | 0.000 | n/a | n/a | 0.085 | 2.397 | 0.017 | 0.085 | gw-r/thread-48/journal/page | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 500.164 | n/a | n/a | n/a | 3.851 | n/a | 0.270 | 0.000 | 0.602 | 484.374 | 0.020 | n/a | 0.080 | 0.000 | n/a | n/a | 0.079 | 4.121 | 0.004 | 0.079 |
| p99 | 1002.606 | n/a | n/a | n/a | 13.258 | n/a | 1.367 | 0.000 | 0.851 | 997.499 | 0.225 | n/a | 0.114 | 0.000 | n/a | n/a | 0.179 | 14.626 | 0.029 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000004f | 1002.606 | 3.851 | n/a | 0.270 | 0.000 | 0.602 | 997.499 | 0.225 | n/a | 0.080 | 0.000 | n/a | n/a | 0.079 | 4.121 | 0.004 | 0.079 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000050 | 500.164 | 13.258 | n/a | 1.367 | 0.000 | 0.851 | 484.374 | 0.020 | n/a | 0.114 | 0.000 | n/a | n/a | 0.179 | 14.626 | 0.029 | 0.179 | gw-r/thread-42/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 818.267 | n/a | n/a | n/a | 4.181 | n/a | 0.298 | 0.000 | 0.738 | 807.369 | 0.013 | n/a | 0.069 | 0.000 | n/a | n/a | 0.132 | 4.479 | 0.012 | 0.132 |
| p99 | 937.094 | n/a | n/a | n/a | 8.897 | n/a | 0.657 | 0.000 | 1.128 | 931.509 | 0.227 | n/a | 0.072 | 0.000 | n/a | n/a | 26.944 | 9.554 | 0.095 | 26.944 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000055 | 937.094 | 4.181 | n/a | 0.298 | 0.000 | 0.738 | 931.509 | 0.227 | n/a | 0.069 | 0.000 | n/a | n/a | 0.073 | 4.479 | 0.005 | 0.073 | gw-r/thread-47/journal/page | none observed |
| fe855a233e6123390000000000000056 | 818.267 | 8.897 | n/a | 0.657 | 0.000 | 1.128 | 807.369 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.132 | 9.554 | 0.012 | 0.132 | gw-r/thread-49/journal/page | none observed |
| fe855a233e6123390000000000000054 | 30.072 | 2.597 | n/a | 0.264 | 0.000 | 0.267 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.944 | 2.861 | 0.095 | 26.944 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 222.686 | n/a | n/a | n/a | 3.790 | n/a | 0.276 | 0.000 | 1.019 | 219.514 | 0.016 | n/a | 0.125 | 0.000 | n/a | n/a | 0.096 | 4.066 | 0.021 | 0.096 |
| p99 | 787.011 | n/a | n/a | n/a | 106.579 | n/a | 13.093 | 0.000 | 1.212 | 661.102 | 0.149 | n/a | 0.140 | 0.000 | n/a | n/a | 5.067 | 119.672 | 0.152 | 5.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000005a | 787.011 | 106.579 | n/a | 13.093 | 0.000 | 1.019 | 661.102 | 0.011 | n/a | 0.140 | 0.000 | n/a | n/a | 5.067 | 119.672 | 0.152 | 5.067 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000059 | 222.686 | 2.143 | n/a | 0.000 | 0.000 | 0.848 | 219.514 | 0.016 | n/a | 0.094 | 0.000 | n/a | n/a | 0.072 | 2.143 | 0.010 | 0.072 | gw-r/thread-48/journal/page | none observed |
| fe855a233e6123390000000000000057 | 191.275 | 3.790 | n/a | 0.276 | 0.000 | 1.212 | 185.627 | 0.149 | n/a | 0.125 | 0.000 | n/a | n/a | 0.096 | 4.066 | 0.021 | 0.096 | gw-r/thread-45/journal/page | none observed |

## P3 / p4h3 / internal (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 259.657 | n/a | n/a | n/a | 2.989 | n/a | 0.000 | 0.000 | 0.740 | 254.971 | 0.015 | n/a | 0.100 | 0.000 | n/a | n/a | 0.101 | 2.989 | 0.020 | 0.101 |
| p99 | 841.153 | n/a | n/a | n/a | 109.898 | n/a | 7.940 | 0.000 | 1.250 | 718.480 | 1.110 | n/a | 0.152 | 0.000 | n/a | n/a | 45.347 | 117.838 | 0.140 | 45.347 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000074 | 841.153 | 109.898 | n/a | 7.940 | 0.000 | 1.250 | 718.480 | 1.110 | n/a | 0.082 | 0.000 | n/a | n/a | 2.393 | 117.838 | 0.140 | 2.393 | gw-r/thread-48/journal/page | none observed |
| fe855a233e6123390000000000000071 | 599.542 | 6.547 | n/a | 0.000 | 0.000 | 1.054 | 591.474 | 0.179 | n/a | 0.110 | 0.000 | n/a | n/a | 0.178 | 6.547 | 0.011 | 0.178 | gw-r/thread-45/journal/page | none observed |
| fe855a233e6123390000000000000073 | 404.892 | 2.162 | n/a | 0.000 | 0.000 | 0.877 | 401.682 | 0.015 | n/a | 0.085 | 0.000 | n/a | n/a | 0.072 | 2.162 | 0.005 | 0.072 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000067 | 305.567 | 2.989 | n/a | 0.000 | 0.000 | 0.850 | 301.533 | 0.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.072 | 2.989 | 0.010 | 0.072 | gw-r/thread-48/journal/page | none observed |
| fe855a233e6123390000000000000066 | 289.544 | 10.004 | n/a | 0.000 | 0.000 | 0.821 | 278.417 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.163 | 10.004 | 0.035 | 0.163 | gw-r/thread-48/journal/page | none observed |
| fe855a233e6123390000000000000069 | 259.657 | 3.784 | n/a | 0.000 | 0.000 | 0.625 | 254.971 | 0.023 | n/a | 0.152 | 0.000 | n/a | n/a | 0.101 | 3.784 | 0.015 | 0.101 | gw-r/thread-47/journal/page | none observed |
| fe855a233e6123390000000000000065 | 117.747 | 2.382 | n/a | 0.000 | 0.000 | 0.620 | 114.559 | 0.020 | n/a | 0.100 | 0.000 | n/a | n/a | 0.066 | 2.382 | 0.020 | 0.066 | gw-r/thread-45/journal/page | none observed |
| fe855a233e612339000000000000006f | 76.624 | 3.226 | n/a | 0.000 | 0.000 | 0.740 | 72.465 | 0.015 | n/a | 0.103 | 0.000 | n/a | n/a | 0.075 | 3.226 | 0.042 | 0.075 | gw-r/thread-42/journal/page | none observed |
| fe855a233e612339000000000000006d | 47.222 | 1.586 | n/a | 0.000 | 0.000 | 0.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.347 | 1.586 | 0.034 | 45.347 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e612339000000000000006b | 23.028 | 2.633 | n/a | 0.000 | 0.000 | 0.344 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.052 | 2.633 | 0.114 | 20.052 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 125.705 | n/a | n/a | n/a | 84.671 | n/a | 3.574 | 0.000 | 1.203 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.866 | 87.852 | 0.669 | 24.866 |
| p99 | 150.665 | n/a | n/a | n/a | 107.947 | n/a | 7.981 | 0.000 | 3.564 | 50.326 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 43.886 | 115.928 | 0.829 | 43.886 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000007c | 150.665 | 107.947 | n/a | 7.981 | 0.000 | 0.606 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.131 | 115.928 | 0.769 | 34.131 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e612339000000000000007a | 143.294 | 92.157 | n/a | 3.688 | 0.000 | 3.564 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.886 | 95.844 | 0.669 | 43.886 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e612339000000000000007b | 141.256 | 84.671 | n/a | 3.180 | 0.000 | 1.203 | 50.326 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 1.811 | 87.852 | 0.622 | 1.811 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e6123390000000000000077 | 125.705 | 96.008 | n/a | 3.574 | 0.000 | 1.257 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.866 | 99.583 | 0.792 | 24.866 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e6123390000000000000075 | 120.509 | 75.245 | n/a | 2.344 | 0.000 | 0.612 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.308 | 77.590 | 0.644 | 42.308 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e6123390000000000000076 | 95.659 | 75.510 | n/a | 3.786 | 0.000 | 3.538 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.824 | 79.296 | 0.829 | 12.824 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e6123390000000000000078 | 3.849 | 2.157 | n/a | 0.000 | 0.000 | 0.280 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.413 | 2.157 | 0.560 | 1.413 | node-13/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 305.696 | n/a | n/a | n/a | 3.150 | n/a | 0.000 | 0.000 | 0.700 | 302.190 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.147 | 3.150 | 0.020 | 0.147 |
| p99 | 1002.808 | n/a | n/a | n/a | 14.489 | n/a | 0.608 | 0.000 | 0.919 | 1000.812 | 0.150 | n/a | 0.090 | 0.000 | n/a | n/a | 7.931 | 15.097 | 0.737 | 7.931 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e6123390000000000000089 | 1002.808 | 0.130 | n/a | 0.000 | 0.000 | 0.649 | 1000.812 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 1.114 | 0.130 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| fe855a233e612339000000000000008b | 666.515 | 2.459 | n/a | 0.000 | 0.000 | 0.901 | 663.010 | 0.010 | n/a | 0.080 | 0.000 | n/a | n/a | 0.055 | 2.459 | 0.004 | 0.055 | gw-r/thread-42/journal/page | none observed |
| fe855a233e6123390000000000000083 | 423.998 | 14.489 | n/a | 0.608 | 0.000 | 0.700 | 407.984 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.147 | 15.097 | 0.036 | 0.147 | gw-r/thread-49/journal/page | none observed |
| fe855a233e612339000000000000008c | 305.696 | 2.469 | n/a | 0.000 | 0.000 | 0.753 | 302.190 | 0.150 | n/a | 0.078 | 0.000 | n/a | n/a | 0.055 | 2.469 | 0.008 | 0.055 | gw-r/thread-47/journal/page | none observed |
| fe855a233e6123390000000000000088 | 154.829 | 3.150 | n/a | 0.000 | 0.000 | 0.919 | 150.481 | 0.132 | n/a | 0.069 | 0.000 | n/a | n/a | 0.078 | 3.150 | 0.020 | 0.078 | gw-r/thread-49/journal/page | none observed |
| fe855a233e612339000000000000008a | 19.090 | 10.897 | n/a | 0.000 | 0.000 | 0.262 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.931 | 10.897 | 0.571 | 7.931 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e6123390000000000000085 | 8.543 | 6.297 | n/a | 0.000 | 0.000 | 0.314 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.932 | 6.297 | 0.737 | 1.932 | node-13/thread-2/replica.publish | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 817.785 | n/a | n/a | n/a | 2.130 | n/a | 0.000 | 0.000 | 1.003 | 807.804 | 0.028 | n/a | 0.075 | 0.000 | n/a | n/a | 0.058 | 2.130 | 0.008 | 0.058 |
| p99 | 843.865 | n/a | n/a | n/a | 6.526 | n/a | 0.000 | 0.000 | 3.032 | 840.886 | 0.147 | n/a | 0.110 | 0.000 | n/a | n/a | 2.315 | 6.526 | 0.013 | 2.315 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000008e | 843.865 | 2.130 | n/a | 0.000 | 0.000 | 0.702 | 840.886 | 0.014 | n/a | 0.075 | 0.000 | n/a | n/a | 0.058 | 2.130 | 0.003 | 0.058 | gw-r/thread-46/journal/page | none observed |
| fe855a233e6123390000000000000091 | 817.785 | 6.526 | n/a | 0.000 | 0.000 | 1.003 | 807.804 | 0.028 | n/a | 0.110 | 0.000 | n/a | n/a | 2.315 | 6.526 | 0.008 | 2.315 | gw-r/thread-43/journal/page | none observed |
| fe855a233e612339000000000000008f | 159.624 | 2.119 | n/a | 0.000 | 0.000 | 3.032 | 154.208 | 0.147 | n/a | 0.060 | 0.000 | n/a | n/a | 0.058 | 2.119 | 0.013 | 0.058 | gw-r/thread-45/journal/page | none observed |

## P3 / sweep / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.883 | n/a | n/a | n/a | 3.140 | n/a | 0.000 | 0.000 | 0.352 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.114 | 3.140 | 0.289 | 6.114 |
| p99 | 1003.188 | n/a | n/a | n/a | 7.160 | n/a | 0.000 | 0.000 | 3.439 | 1001.276 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 12.930 | 7.160 | 0.726 | 12.930 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fe855a233e612339000000000000009a | 1003.188 | 0.140 | n/a | 0.000 | 0.000 | 0.617 | 1001.276 | 0.014 | n/a | 0.129 | 0.000 | n/a | n/a | 1.012 | 0.140 | 0.000 | 1.012 | gw-r/thread-43/journal/page | none observed |
| fe855a233e6123390000000000000093 | 18.632 | 5.388 | n/a | 0.000 | 0.000 | 0.313 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.930 | 5.388 | 0.289 | 12.930 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000095 | 16.978 | 5.912 | n/a | 0.000 | 0.000 | 0.352 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.714 | 5.912 | 0.348 | 10.714 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000098 | 14.916 | 5.363 | n/a | 0.000 | 0.000 | 3.439 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.114 | 5.363 | 0.360 | 6.114 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000094 | 10.883 | 3.116 | n/a | 0.000 | 0.000 | 0.379 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.388 | 3.116 | 0.286 | 7.388 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000096 | 10.769 | 1.793 | n/a | 0.000 | 0.000 | 0.309 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 8.667 | 1.793 | 0.167 | 8.667 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000092 | 9.868 | 7.160 | n/a | 0.000 | 0.000 | 0.463 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.246 | 7.160 | 0.726 | 2.246 | node-13/thread-2/replica.fetch-feed | none observed |
| fe855a233e6123390000000000000097 | 9.161 | 3.140 | n/a | 0.000 | 0.000 | 0.287 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.734 | 3.140 | 0.343 | 5.734 | node-13/thread-2/socket.wait-first-byte | none observed |
| fe855a233e6123390000000000000099 | 8.035 | 1.703 | n/a | 0.000 | 0.000 | 0.328 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.004 | 1.703 | 0.212 | 6.004 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.284 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.567 | 200.969 | 0.018 | n/a | 0.176 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 203.853 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 5.314 | 201.979 | 0.239 | n/a | 1.314 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000009 | 203.853 | 0.000 | n/a | 0.000 | 0.000 | 2.221 | 200.969 | 0.017 | n/a | 0.154 | 0.000 | n/a | n/a | 0.491 | 0.000 | 0.000 | 0.491 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c2000000000000000e | 203.600 | 0.000 | n/a | 0.000 | 0.000 | 1.888 | 201.392 | 0.017 | n/a | 0.178 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000008 | 203.581 | 0.000 | n/a | 0.000 | 0.000 | 1.504 | 201.512 | 0.043 | n/a | 0.254 | 0.000 | n/a | n/a | 0.267 | 0.000 | 0.000 | 0.267 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000000f | 203.411 | 0.000 | n/a | 0.000 | 0.000 | 1.189 | 201.791 | 0.039 | n/a | 0.264 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c2000000000000000b | 203.294 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.979 | 0.018 | n/a | 0.176 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000000d | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 1.899 | 201.057 | 0.017 | n/a | 0.170 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c2000000000000000c | 166.733 | 0.000 | n/a | 0.000 | 0.000 | 1.567 | 164.653 | 0.015 | n/a | 0.220 | 0.000 | n/a | n/a | 0.278 | 0.000 | 0.000 | 0.278 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000010 | 152.932 | 0.000 | n/a | 0.000 | 0.000 | 5.314 | 145.911 | 0.239 | n/a | 1.314 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000011 | 114.310 | 0.000 | n/a | 0.000 | 0.000 | 0.823 | 113.151 | 0.039 | n/a | 0.164 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c2000000000000000a | 59.826 | 0.000 | n/a | 0.000 | 0.000 | 1.749 | 57.504 | 0.059 | n/a | 0.154 | 0.000 | n/a | n/a | 0.360 | 0.000 | 0.000 | 0.360 | gw-r/thread-46/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.174 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.187 | 0.015 | n/a | 0.177 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 |
| p99 | 202.559 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 201.311 | 0.020 | n/a | 0.217 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000012 | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 201.283 | 0.015 | n/a | 0.188 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000014 | 202.258 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 201.187 | 0.020 | n/a | 0.217 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000013 | 202.174 | 0.000 | n/a | 0.000 | 0.000 | 0.549 | 201.311 | 0.020 | n/a | 0.177 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000015 | 170.887 | 0.000 | n/a | 0.000 | 0.000 | 1.025 | 169.581 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-42/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.589 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.158 | 0.018 | n/a | 0.122 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 208.079 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.413 | 206.656 | 0.226 | n/a | 0.208 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000021 | 208.079 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 206.656 | 0.226 | n/a | 0.122 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c20000000000000022 | 202.922 | 0.000 | n/a | 0.000 | 0.000 | 1.413 | 201.158 | 0.029 | n/a | 0.208 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000023 | 202.589 | 0.000 | n/a | 0.000 | 0.000 | 1.092 | 201.269 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c20000000000000020 | 73.895 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 73.008 | 0.018 | n/a | 0.145 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.582 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 201.178 | 0.020 | n/a | 0.157 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 |
| p99 | 203.284 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.121 | 201.875 | 5.834 | n/a | 0.277 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c2000000000000002d | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 201.875 | 0.061 | n/a | 0.277 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c2000000000000002f | 202.860 | 0.000 | n/a | 0.000 | 0.000 | 1.201 | 201.278 | 0.012 | n/a | 0.172 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000026 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 1.312 | 201.094 | 0.036 | n/a | 0.243 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000027 | 202.798 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 201.340 | 0.019 | n/a | 0.164 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000025 | 202.718 | 0.000 | n/a | 0.000 | 0.000 | 1.072 | 201.178 | 0.020 | n/a | 0.157 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c2000000000000002a | 202.582 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 201.193 | 0.013 | n/a | 0.188 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000002c | 202.431 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 201.226 | 0.024 | n/a | 0.145 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000029 | 202.046 | 0.000 | n/a | 0.000 | 0.000 | 9.121 | 186.785 | 5.834 | n/a | 0.088 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c2000000000000002b | 177.190 | 0.000 | n/a | 0.000 | 0.000 | 0.672 | 176.305 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000002e | 134.297 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 128.936 | 4.356 | n/a | 0.058 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.933 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 200.852 | 0.021 | n/a | 0.118 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 203.075 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.129 | 201.687 | 8.457 | n/a | 0.204 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000035 | 203.075 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.687 | 0.016 | n/a | 0.142 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000032 | 202.789 | 0.000 | n/a | 0.000 | 0.000 | 1.129 | 201.316 | 0.021 | n/a | 0.159 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c2000000000000003a | 202.392 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.134 | 0.015 | n/a | 0.137 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000034 | 202.347 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 201.396 | 0.027 | n/a | 0.204 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000036 | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 201.001 | 0.018 | n/a | 0.118 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000031 | 201.933 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 200.852 | 0.017 | n/a | 0.133 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000030 | 179.543 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 170.064 | 8.457 | n/a | 0.045 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000038 | 137.150 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 133.272 | 2.848 | n/a | 0.073 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000033 | 122.479 | 0.000 | n/a | 0.000 | 0.000 | 0.656 | 121.473 | 0.019 | n/a | 0.088 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000037 | 102.354 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 99.942 | 1.240 | n/a | 0.090 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000039 | 65.522 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 60.340 | 4.034 | n/a | 0.093 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.257 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 201.226 | 0.018 | n/a | 0.138 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 207.607 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.268 | 204.972 | 9.054 | n/a | 0.173 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000041 | 207.607 | 0.000 | n/a | 0.000 | 0.000 | 2.268 | 204.972 | 0.026 | n/a | 0.142 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000040 | 203.209 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 201.859 | 0.032 | n/a | 0.173 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000003c | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 1.066 | 201.294 | 0.016 | n/a | 0.149 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c2000000000000003f | 202.568 | 0.000 | n/a | 0.000 | 0.000 | 1.039 | 201.226 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000042 | 202.257 | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 201.229 | 0.018 | n/a | 0.108 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000003d | 202.253 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 200.967 | 0.016 | n/a | 0.125 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c2000000000000003b | 202.172 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.058 | 0.032 | n/a | 0.172 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000044 | 201.927 | 0.000 | n/a | 0.000 | 0.000 | 0.657 | 201.020 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000003e | 201.380 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 191.290 | 9.054 | n/a | 0.094 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.222 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.086 | 0.024 | n/a | 0.107 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 212.731 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.374 | 204.216 | 8.855 | n/a | 0.320 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c2000000000000004a | 212.731 | 0.000 | n/a | 0.000 | 0.000 | 2.426 | 201.303 | 8.855 | n/a | 0.040 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000049 | 207.973 | 0.000 | n/a | 0.000 | 0.000 | 3.374 | 204.216 | 0.029 | n/a | 0.219 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000047 | 203.523 | 0.000 | n/a | 0.000 | 0.000 | 1.796 | 201.421 | 0.024 | n/a | 0.148 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c2000000000000004b | 202.888 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.474 | 0.039 | n/a | 0.320 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c20000000000000046 | 202.370 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.086 | 0.036 | n/a | 0.191 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000004e | 202.222 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 201.286 | 0.023 | n/a | 0.130 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000045 | 202.004 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.006 | 0.015 | n/a | 0.097 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c2000000000000004c | 176.278 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 171.238 | 4.001 | n/a | 0.033 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c2000000000000004d | 126.779 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 125.574 | 0.017 | n/a | 0.107 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000048 | 89.706 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 88.648 | 0.014 | n/a | 0.079 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-42/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.366 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.044 | 0.015 | n/a | 0.111 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 |
| p99 | 203.267 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 201.778 | 3.408 | n/a | 0.221 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000054 | 203.267 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.778 | 0.033 | n/a | 0.221 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c2000000000000004f | 202.749 | 0.000 | n/a | 0.000 | 0.000 | 1.188 | 201.218 | 0.014 | n/a | 0.111 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000053 | 202.711 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.613 | 0.075 | n/a | 0.176 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000056 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.298 | 0.021 | n/a | 0.194 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000055 | 202.475 | 0.000 | n/a | 0.000 | 0.000 | 1.086 | 201.042 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000050 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.276 | 0.017 | n/a | 0.171 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000051 | 202.135 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.044 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000058 | 201.849 | 0.000 | n/a | 0.000 | 0.000 | 0.767 | 200.813 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000052 | 105.163 | 0.000 | n/a | 0.000 | 0.000 | 0.926 | 100.542 | 3.408 | n/a | 0.048 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000057 | 102.485 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 101.185 | 0.011 | n/a | 0.055 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-42/journal/page | none observed |

## P3 / p4h1 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.910 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 200.889 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 |
| p99 | 204.942 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.296 | 203.972 | 2.375 | n/a | 0.172 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000064 | 204.942 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 203.972 | 0.027 | n/a | 0.111 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000006a | 202.390 | 0.000 | n/a | 0.000 | 0.000 | 1.296 | 200.859 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000066 | 202.277 | 0.000 | n/a | 0.000 | 0.000 | 1.069 | 200.897 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000060 | 202.201 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 200.915 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000065 | 202.176 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.002 | 0.022 | n/a | 0.121 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000061 | 202.086 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 201.074 | 0.014 | n/a | 0.121 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000068 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 0.523 | 201.116 | 0.020 | n/a | 0.154 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000005f | 201.803 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 200.889 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c20000000000000063 | 201.700 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.872 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000069 | 201.699 | 0.000 | n/a | 0.000 | 0.000 | 0.582 | 200.879 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000006b | 145.130 | 0.000 | n/a | 0.000 | 0.000 | 0.942 | 141.589 | 2.375 | n/a | 0.032 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000062 | 138.984 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 137.771 | 0.025 | n/a | 0.172 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |

## P3 / grow3 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.083 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.818 | 0.015 | n/a | 0.105 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 |
| p99 | 211.701 | n/a | n/a | n/a | 0.701 | n/a | 0.000 | 0.000 | 3.504 | 201.099 | 124.256 | n/a | 0.117 | 0.000 | n/a | n/a | 0.180 | 0.701 | 0.003 | 0.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000071 | 211.701 | 0.701 | n/a | 0.000 | 0.000 | 0.768 | 85.773 | 124.256 | n/a | 0.046 | 0.000 | n/a | n/a | 0.156 | 0.701 | 0.003 | 0.156 | gw-r/thread-45/gateway.admission-wait | none observed |
| bbc0f6366795a0c20000000000000070 | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 1.161 | 201.099 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000006f | 202.083 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.929 | 0.014 | n/a | 0.117 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c2000000000000006d | 201.645 | 0.000 | n/a | 0.000 | 0.000 | 0.573 | 200.818 | 0.020 | n/a | 0.105 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c2000000000000006c | 185.069 | 0.000 | n/a | 0.000 | 0.000 | 3.504 | 181.305 | 0.015 | n/a | 0.077 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-49/journal/page | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.729 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.795 | 0.020 | n/a | 0.101 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 203.045 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.608 | 201.428 | 4.213 | n/a | 0.148 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c20000000000000083 | 203.045 | 0.000 | n/a | 0.000 | 0.000 | 1.608 | 201.152 | 0.020 | n/a | 0.132 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c2000000000000008b | 202.706 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 201.428 | 0.018 | n/a | 0.148 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c20000000000000081 | 202.448 | 0.000 | n/a | 0.000 | 0.000 | 0.895 | 201.270 | 0.020 | n/a | 0.146 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000089 | 202.125 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 201.160 | 0.044 | n/a | 0.132 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c20000000000000088 | 201.936 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.821 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000008d | 201.748 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 201.032 | 0.031 | n/a | 0.121 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000007f | 201.729 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 200.795 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c2000000000000008c | 181.069 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 180.183 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c2000000000000008a | 146.769 | 0.000 | n/a | 0.000 | 0.000 | 0.835 | 141.507 | 4.213 | n/a | 0.079 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c2000000000000007e | 104.810 | 0.000 | n/a | 0.000 | 0.000 | 0.677 | 101.895 | 1.950 | n/a | 0.083 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000082 | 85.802 | 0.000 | n/a | 0.000 | 0.000 | 0.962 | 82.627 | 1.969 | n/a | 0.036 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000087 | 73.254 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 68.661 | 3.510 | n/a | 0.025 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000080 | 54.911 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 54.094 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |

## P3 / grow10 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 102.954 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.367 | 98.721 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.309 | 0.000 | 0.000 | 0.309 |
| p99 | 202.345 | n/a | n/a | n/a | 6.345 | n/a | 0.000 | 0.000 | 14.823 | 201.139 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.626 | 6.345 | 0.048 | 0.626 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c2000000000000008e | 202.345 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.139 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c20000000000000090 | 132.079 | 6.345 | n/a | 0.000 | 0.000 | 14.823 | 110.491 | 0.015 | n/a | 0.097 | 0.000 | n/a | n/a | 0.309 | 6.345 | 0.048 | 0.309 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c2000000000000008f | 112.555 | 0.554 | n/a | 0.000 | 0.000 | 1.367 | 110.420 | 0.015 | n/a | 0.068 | 0.000 | n/a | n/a | 0.132 | 0.554 | 0.005 | 0.132 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000095 | 110.987 | 0.728 | n/a | 0.000 | 0.000 | 1.749 | 108.127 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 0.289 | 0.728 | 0.007 | 0.289 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c20000000000000092 | 102.954 | 0.000 | n/a | 0.000 | 0.000 | 3.579 | 98.721 | 0.014 | n/a | 0.080 | 0.000 | n/a | n/a | 0.561 | 0.000 | 0.000 | 0.561 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c20000000000000091 | 96.385 | 0.000 | n/a | 0.000 | 0.000 | 1.334 | 94.390 | 0.011 | n/a | 0.092 | 0.000 | n/a | n/a | 0.557 | 0.000 | 0.000 | 0.557 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c20000000000000094 | 66.480 | 0.000 | n/a | 0.000 | 0.000 | 1.761 | 64.015 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.626 | 0.000 | 0.000 | 0.626 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c20000000000000096 | 63.842 | 0.000 | n/a | 0.000 | 0.000 | 1.071 | 62.150 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.514 | 0.000 | 0.000 | 0.514 | gw-r/thread-45/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.984 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 200.888 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 203.080 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.388 | 201.217 | 3.431 | n/a | 0.135 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c200000000000000af | 203.080 | 0.000 | n/a | 0.000 | 0.000 | 1.947 | 200.865 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000b3 | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 200.994 | 0.041 | n/a | 0.128 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c200000000000000b1 | 202.369 | 0.000 | n/a | 0.000 | 0.000 | 0.999 | 201.065 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000ac | 202.150 | 0.000 | n/a | 0.000 | 0.000 | 0.679 | 201.217 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c200000000000000a6 | 202.039 | 0.000 | n/a | 0.000 | 0.000 | 0.664 | 201.114 | 0.019 | n/a | 0.135 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c200000000000000b0 | 201.999 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 200.913 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-48/journal/page | none observed |
| bbc0f6366795a0c200000000000000ab | 201.984 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 200.899 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c200000000000000ad | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 200.888 | 0.012 | n/a | 0.098 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| bbc0f6366795a0c200000000000000aa | 201.671 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 200.828 | 0.012 | n/a | 0.092 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c200000000000000a7 | 187.767 | 0.000 | n/a | 0.000 | 0.000 | 1.034 | 184.981 | 1.530 | n/a | 0.053 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c200000000000000a5 | 183.591 | 0.000 | n/a | 0.000 | 0.000 | 0.993 | 178.921 | 3.431 | n/a | 0.117 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c200000000000000a9 | 153.239 | 0.000 | n/a | 0.000 | 0.000 | 0.845 | 152.155 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c200000000000000ae | 121.771 | 0.000 | n/a | 0.000 | 0.000 | 4.388 | 117.067 | 0.041 | n/a | 0.082 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-42/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.042 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 200.897 | 0.016 | n/a | 0.099 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 202.548 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.558 | 201.085 | 2.088 | n/a | 0.208 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c200000000000000bc | 202.548 | 0.000 | n/a | 0.000 | 0.000 | 1.306 | 200.955 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c200000000000000b7 | 202.411 | 0.000 | n/a | 0.000 | 0.000 | 1.090 | 201.054 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c200000000000000b5 | 202.249 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 201.085 | 0.016 | n/a | 0.104 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-45/journal/page | none observed |
| bbc0f6366795a0c200000000000000ba | 202.087 | 0.000 | n/a | 0.000 | 0.000 | 0.660 | 201.070 | 0.018 | n/a | 0.208 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c200000000000000bb | 202.044 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 200.897 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-42/journal/page | none observed |
| bbc0f6366795a0c200000000000000b6 | 202.042 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 200.899 | 0.017 | n/a | 0.104 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c200000000000000b8 | 169.892 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 168.031 | 0.949 | n/a | 0.052 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| bbc0f6366795a0c200000000000000b9 | 149.415 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 148.505 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-46/journal/page | none observed |
| bbc0f6366795a0c200000000000000bd | 140.460 | 0.000 | n/a | 0.000 | 0.000 | 1.120 | 136.952 | 2.088 | n/a | 0.099 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-47/journal/page | none observed |
| bbc0f6366795a0c200000000000000b4 | 80.442 | 0.000 | n/a | 0.000 | 0.000 | 3.558 | 76.634 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |

## P3 / sweep / read (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.579 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.034 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |
| p99 | 202.579 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.034 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bbc0f6366795a0c200000000000000c5 | 202.579 | 0.000 | n/a | 0.000 | 0.000 | 1.319 | 201.034 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-45/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

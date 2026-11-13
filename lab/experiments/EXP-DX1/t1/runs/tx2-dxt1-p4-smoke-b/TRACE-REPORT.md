# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (138.197 ms, trace `01ba1106ac8871d800000000000000b4`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (91.810 ms, trace `01ba1106ac8871d80000000000000146`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (95.691 ms, trace `01ba1106ac8871d800000000000000d0`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (80.068 ms, trace `01ba1106ac8871d80000000000000106`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (83.326 ms, trace `01ba1106ac8871d80000000000000145`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-b`; source `9cb8f287cd6d62bfa0c2c887d75b23c16b20d976`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 83/83 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 83/83. Raw trace bytes: 6906566.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 92 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1381.494 | 176.280 | 257.114 | 39 |
| baseline | 0 | 1970.412 | 29.049 | 0.262 | 30 |
| L1 | 1 | 1984.353 | 139.285 | 6.375 | 44 |
| L4 | 4 | 1982.001 | 237.104 | 193.227 | 44 |
| L16 | 16 | 1963.874 | 210.401 | 246.718 | 44 |
| L64 | 16 | 1889.931 | 186.323 | 223.009 | 44 |
| L256 | 16 | 1910.813 | 181.156 | 227.698 | 49 |
| L1024 | 16 | 1976.499 | 274.241 | 314.567 | 25 |
| recovery | 16 | 1945.427 | 190.724 | 234.761 | 44 |
| p4mix | 1 | 1981.919 | 37.959 | 18.299 | 43 |
| p4h1 | 1 | 1022.509 | 15.960 | 18.405 | 16 |
| grow3 | 0 | 1214.740 | 175.723 | 5.200 | 44 |
| p4h3 | 1 | 2032.333 | 54.977 | 59.830 | 108 |
| grow10 | 0 | 45.781 | 8.266 | 7.506 | 22 |
| p4h10 | 1 | 1023.212 | 24.653 | 10.656 | 58 |
| presweep | 16 | 1026.625 | 86.055 | 156.441 | 30 |
| sweep | 16 | 98.482 | 20.506 | 11.670 | 127 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 01ba1106ac8871d800000000000000b4 | driver.queue.scheduler-late | 0.953 | none | 0 / 32 |
| 01ba1106ac8871d800000000000000b4 | driver.queue.scheduler-dispatch | 0.066 | none | 0 / 32 |

Observed active steps while trace 01ba1106ac8871d800000000000000b4 waited: []

| 01ba1106ac8871d80000000000000146 | driver.queue.scheduler-dispatch | 0.005 | none | 9 / 32 |
| 01ba1106ac8871d80000000000000146 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace 01ba1106ac8871d80000000000000146 waited: []

| 01ba1106ac8871d800000000000000d0 | driver.queue.scheduler-dispatch | 0.060 | none | 0 / 32 |
| 01ba1106ac8871d800000000000000d0 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 01ba1106ac8871d800000000000000d0 waited: []

| 01ba1106ac8871d80000000000000106 | driver.queue.scheduler-dispatch | 0.124 | none | 0 / 32 |
| 01ba1106ac8871d80000000000000106 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace 01ba1106ac8871d80000000000000106 waited: []

| 01ba1106ac8871d80000000000000145 | driver.queue.scheduler-dispatch | 0.006 | none | 8 / 32 |

Observed active steps while trace 01ba1106ac8871d80000000000000145 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.641 | 0.368 | 0.000 | 0.377 | 5.679 | 0.098 | 0.000 | 0.074 | 2.243 | 4.694 | 0.117 | 0.000 | 0.365 | 11.361 | n/a | n/a | 0.055 | 6.551 | 0.214 | 0.055 |
| p99 | 53.474 | 5.418 | 1.224 | 6.691 | 18.384 | 0.800 | 0.000 | 2.781 | 2.746 | 8.567 | 0.160 | 0.000 | 3.754 | 17.015 | n/a | n/a | 0.487 | 21.263 | 0.417 | 0.487 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000092 | 53.474 | 18.384 | 0.098 | 0.000 | 2.781 | 2.243 | 8.567 | 0.145 | 0.000 | 3.754 | 17.015 | n/a | n/a | 0.487 | 21.263 | 0.398 | 0.487 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000094 | 33.027 | 13.112 | 0.596 | 0.000 | 0.074 | 2.617 | 4.694 | 0.160 | 0.000 | 0.365 | 11.361 | n/a | n/a | 0.046 | 13.782 | 0.417 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000098 | 30.641 | 5.679 | 0.800 | 0.000 | 0.072 | 2.746 | 5.465 | 0.057 | 0.000 | 0.262 | 15.500 | n/a | n/a | 0.059 | 6.551 | 0.214 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000096 | 19.002 | 3.094 | 0.005 | 0.000 | 0.818 | 0.905 | 2.976 | 0.117 | 0.000 | 1.958 | 9.074 | n/a | n/a | 0.055 | 3.917 | 0.206 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.757 | n/a | n/a | n/a | 6.582 | 2.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 8.734 | 0.998 | 0.017 |
| p99 | 111.657 | n/a | n/a | n/a | 49.693 | 15.372 | 1.188 | 0.000 | 1.483 | 69.526 | 0.028 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.050 | 51.076 | 0.999 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000cd | 111.657 | 27.274 | 12.479 | 1.188 | 0.000 | 0.914 | 69.526 | 0.028 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.017 | 40.942 | 0.367 | 0.017 | gw-w/thread-46/gateway.admitted-work | driver.worker-message 1.804ms |
| 01ba1106ac8871d8000000000000011e | 54.380 | 13.154 | 14.748 | 0.000 | 0.000 | 0.615 | 25.822 | 0.006 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.020 | 27.902 | 0.513 | 0.020 | gw-w/thread-52/gateway.admitted-work | none observed |
| 01ba1106ac8871d80000000000000093 | 51.126 | 49.693 | 0.754 | 0.630 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 51.076 | 0.999 | 0.050 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d800000000000000da | 29.111 | 12.132 | 1.640 | 0.000 | 0.000 | 1.483 | 13.790 | 0.014 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.020 | 13.772 | 0.473 | 0.020 | gw-w/thread-48/gateway.admitted-work | none observed |
| 01ba1106ac8871d80000000000000132 | 18.021 | 12.804 | 5.206 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 18.010 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | driver.publication 2.977ms |
| 01ba1106ac8871d80000000000000105 | 15.677 | 0.294 | 15.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 15.665 | 0.999 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |
| 01ba1106ac8871d800000000000000a9 | 15.498 | 4.971 | 10.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 15.486 | 0.999 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |
| 01ba1106ac8871d800000000000000d7 | 13.528 | 13.423 | 0.085 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 13.508 | 0.999 | 0.019 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d800000000000000bc | 12.659 | 11.649 | 0.975 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 12.624 | 0.997 | 0.035 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d800000000000000b5 | 10.823 | 8.298 | 2.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 10.803 | 0.998 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d80000000000000100 | 8.757 | 8.636 | 0.098 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 8.734 | 0.997 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d800000000000000ee | 8.625 | 8.545 | 0.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.612 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d8000000000000013a | 8.398 | 0.466 | 7.910 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 8.376 | 0.997 | 0.022 | node-14/thread-0/rpc.replica.observe | none observed |
| 01ba1106ac8871d800000000000000e5 | 7.971 | 0.733 | 7.222 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 7.955 | 0.998 | 0.016 | node-14/thread-0/rpc.replica.observe | none observed |
| 01ba1106ac8871d800000000000000c0 | 7.558 | 5.473 | 2.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 7.531 | 0.996 | 0.027 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d80000000000000115 | 6.836 | 6.513 | 0.309 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 6.822 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d80000000000000097 | 6.687 | 3.310 | 3.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 6.676 | 0.998 | 0.010 | node-14/thread-0/rpc.replica.observe | none observed |
| 01ba1106ac8871d80000000000000108 | 6.662 | 6.582 | 0.069 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 6.651 | 0.998 | 0.011 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d80000000000000148 | 6.249 | 5.882 | 0.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 6.236 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| 01ba1106ac8871d800000000000000fc | 6.096 | 0.548 | 5.528 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.077 | 0.997 | 0.019 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.002 | 1.429 | 0.000 | 1.545 | 3.094 | 0.005 | 0.000 | 0.818 | 0.905 | 2.976 | 0.117 | 0.000 | 1.958 | 9.074 | n/a | n/a | 0.055 | 3.917 | 0.206 | 0.055 |
| p99 | 19.002 | 1.429 | 0.000 | 1.545 | 3.094 | 0.005 | 0.000 | 0.818 | 0.905 | 2.976 | 0.117 | 0.000 | 1.958 | 9.074 | n/a | n/a | 0.055 | 3.917 | 0.206 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000096 | 19.002 | 3.094 | 0.005 | 0.000 | 0.818 | 0.905 | 2.976 | 0.117 | 0.000 | 1.958 | 9.074 | n/a | n/a | 0.055 | 3.917 | 0.206 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.388 | 0.000 | 0.000 | 0.365 | 4.291 | 0.261 | 0.000 | 0.124 | 1.887 | 2.114 | 0.047 | 0.000 | 0.556 | 6.350 | n/a | n/a | 0.081 | 4.676 | 0.291 | 0.081 |
| p99 | 18.398 | 0.543 | 0.000 | 1.755 | 6.038 | 0.263 | 0.000 | 0.768 | 2.970 | 2.245 | 0.051 | 0.000 | 1.547 | 10.805 | n/a | n/a | 0.303 | 6.353 | 0.345 | 0.303 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d8000000000000009a | 18.398 | 3.489 | 0.005 | 0.000 | 0.768 | 0.674 | 1.985 | 0.037 | 0.000 | 0.556 | 10.805 | n/a | n/a | 0.081 | 4.261 | 0.232 | 0.081 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000009c | 18.388 | 6.038 | 0.263 | 0.000 | 0.051 | 2.970 | 2.114 | 0.047 | 0.000 | 0.512 | 6.350 | n/a | n/a | 0.042 | 6.353 | 0.345 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000009e | 16.065 | 4.291 | 0.261 | 0.000 | 0.124 | 1.887 | 2.245 | 0.051 | 0.000 | 1.547 | 5.356 | n/a | n/a | 0.303 | 4.676 | 0.291 | 0.303 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.398 | 0.543 | 0.000 | 1.755 | 3.489 | 0.005 | 0.000 | 0.768 | 0.674 | 1.985 | 0.037 | 0.000 | 0.556 | 10.805 | n/a | n/a | 0.081 | 4.261 | 0.232 | 0.081 |
| p99 | 18.398 | 0.543 | 0.000 | 1.755 | 3.489 | 0.005 | 0.000 | 0.768 | 0.674 | 1.985 | 0.037 | 0.000 | 0.556 | 10.805 | n/a | n/a | 0.081 | 4.261 | 0.232 | 0.081 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d8000000000000009a | 18.398 | 3.489 | 0.005 | 0.000 | 0.768 | 0.674 | 1.985 | 0.037 | 0.000 | 0.556 | 10.805 | n/a | n/a | 0.081 | 4.261 | 0.232 | 0.081 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.938 | 0.000 | 0.000 | 0.350 | 3.967 | 0.006 | 0.000 | 0.159 | 0.958 | 3.025 | 0.045 | 0.000 | 0.258 | 8.907 | n/a | n/a | 0.049 | 4.218 | 0.207 | 0.049 |
| p99 | 25.386 | 2.445 | 0.000 | 2.762 | 6.246 | 0.258 | 0.000 | 1.236 | 1.647 | 5.679 | 0.075 | 0.000 | 0.672 | 13.834 | n/a | n/a | 0.126 | 7.488 | 0.363 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000a4 | 25.386 | 3.967 | 0.176 | 0.000 | 0.075 | 1.273 | 5.679 | 0.075 | 0.000 | 0.258 | 13.834 | n/a | n/a | 0.049 | 4.218 | 0.166 | 0.049 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000a1 | 20.632 | 6.246 | 0.006 | 0.000 | 1.236 | 0.958 | 1.417 | 0.036 | 0.000 | 0.672 | 9.935 | n/a | n/a | 0.126 | 7.488 | 0.363 | 0.126 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000a7 | 18.938 | 4.241 | 0.258 | 0.000 | 0.159 | 1.647 | 3.025 | 0.063 | 0.000 | 0.601 | 8.907 | n/a | n/a | 0.037 | 4.658 | 0.246 | 0.037 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000009f | 16.196 | 2.803 | 0.005 | 0.000 | 0.544 | 0.706 | 4.855 | 0.045 | 0.000 | 0.249 | 6.929 | n/a | n/a | 0.061 | 3.352 | 0.207 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.196 | 0.666 | 0.000 | 1.270 | 2.803 | 0.005 | 0.000 | 0.544 | 0.706 | 4.855 | 0.045 | 0.000 | 0.249 | 6.929 | n/a | n/a | 0.061 | 3.352 | 0.207 | 0.061 |
| p99 | 16.196 | 0.666 | 0.000 | 1.270 | 2.803 | 0.005 | 0.000 | 0.544 | 0.706 | 4.855 | 0.045 | 0.000 | 0.249 | 6.929 | n/a | n/a | 0.061 | 3.352 | 0.207 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d8000000000000009f | 16.196 | 2.803 | 0.005 | 0.000 | 0.544 | 0.706 | 4.855 | 0.045 | 0.000 | 0.249 | 6.929 | n/a | n/a | 0.061 | 3.352 | 0.207 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.418 | 0.419 | 0.000 | 0.376 | 4.787 | 0.005 | 0.000 | 0.472 | 2.288 | 1.977 | 0.079 | 0.000 | 0.298 | 16.904 | n/a | n/a | 0.038 | 5.264 | 0.160 | 0.038 |
| p99 | 92.182 | 2.027 | 0.000 | 2.179 | 10.552 | 0.882 | 0.486 | 1.050 | 5.018 | 10.481 | 0.138 | 0.000 | 1.617 | 64.706 | n/a | n/a | 0.049 | 11.505 | 0.288 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000ad | 92.182 | 10.552 | 0.882 | 0.000 | 0.071 | 5.018 | 10.481 | 0.138 | 0.000 | 0.285 | 64.706 | n/a | n/a | 0.049 | 11.505 | 0.125 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 0.810ms |
| 01ba1106ac8871d800000000000000b0 | 36.652 | 8.660 | 0.374 | 0.486 | 1.050 | 2.999 | 5.765 | 0.079 | 0.000 | 0.298 | 16.904 | n/a | n/a | 0.038 | 10.570 | 0.288 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000ab | 27.418 | 3.723 | 0.005 | 0.000 | 0.657 | 1.147 | 1.977 | 0.088 | 0.000 | 0.552 | 19.232 | n/a | n/a | 0.037 | 4.385 | 0.160 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000a8 | 25.273 | 4.787 | 0.005 | 0.000 | 0.472 | 2.288 | 1.766 | 0.037 | 0.000 | 1.617 | 14.261 | n/a | n/a | 0.040 | 5.264 | 0.208 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.637 | 0.000 | 0.000 | 0.297 | 3.526 | 0.005 | 0.000 | 0.063 | 1.112 | 5.985 | 0.090 | 0.000 | 0.390 | 29.127 | n/a | n/a | 0.034 | 4.550 | 0.069 | 0.034 |
| p99 | 191.899 | 0.682 | 0.000 | 1.706 | 6.970 | 1.471 | 0.300 | 1.146 | 2.805 | 47.451 | 0.105 | 0.000 | 1.600 | 138.197 | n/a | n/a | 0.047 | 8.500 | 0.281 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000b4 | 191.899 | 3.526 | 0.005 | 0.000 | 1.020 | 0.718 | 47.451 | 0.076 | 0.000 | 0.860 | 138.197 | n/a | n/a | 0.047 | 4.550 | 0.024 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000b9 | 110.346 | 6.896 | 0.388 | 0.300 | 0.063 | 2.805 | 18.461 | 0.092 | 0.000 | 1.600 | 79.705 | n/a | n/a | 0.034 | 7.648 | 0.069 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000b6 | 39.637 | 3.151 | 0.004 | 0.000 | 1.146 | 1.112 | 4.633 | 0.090 | 0.000 | 0.332 | 29.127 | n/a | n/a | 0.041 | 4.301 | 0.109 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000b2 | 30.264 | 6.970 | 1.471 | 0.000 | 0.058 | 1.925 | 5.985 | 0.105 | 0.000 | 0.390 | 13.328 | n/a | n/a | 0.032 | 8.500 | 0.281 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.637 | 0.241 | 0.000 | 1.522 | 3.151 | 0.004 | 0.000 | 1.020 | 0.718 | 4.633 | 0.076 | 0.000 | 0.332 | 29.127 | n/a | n/a | 0.041 | 4.301 | 0.024 | 0.041 |
| p99 | 191.899 | 0.682 | 0.000 | 1.706 | 3.526 | 0.005 | 0.000 | 1.146 | 1.112 | 47.451 | 0.090 | 0.000 | 0.860 | 138.197 | n/a | n/a | 0.047 | 4.550 | 0.109 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000b4 | 191.899 | 3.526 | 0.005 | 0.000 | 1.020 | 0.718 | 47.451 | 0.076 | 0.000 | 0.860 | 138.197 | n/a | n/a | 0.047 | 4.550 | 0.024 | 0.047 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000b6 | 39.637 | 3.151 | 0.004 | 0.000 | 1.146 | 1.112 | 4.633 | 0.090 | 0.000 | 0.332 | 29.127 | n/a | n/a | 0.041 | 4.301 | 0.109 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.283 | 0.365 | 0.000 | 0.355 | 4.964 | 0.005 | 0.000 | 0.062 | 0.893 | 2.819 | 0.044 | 0.000 | 0.665 | 23.629 | n/a | n/a | 0.036 | 6.162 | 0.146 | 0.036 |
| p99 | 90.088 | 1.938 | 0.043 | 3.501 | 7.349 | 0.334 | 0.474 | 1.193 | 2.862 | 28.446 | 0.095 | 0.000 | 1.228 | 52.341 | n/a | n/a | 0.076 | 8.104 | 0.229 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000c2 | 90.088 | 4.605 | 0.218 | 0.298 | 0.058 | 2.862 | 28.446 | 0.095 | 0.000 | 1.130 | 52.341 | n/a | n/a | 0.035 | 5.179 | 0.057 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.worker-message 0.727ms |
| 01ba1106ac8871d800000000000000bd | 55.521 | 7.234 | 0.334 | 0.474 | 0.062 | 2.131 | 11.689 | 0.063 | 0.000 | 0.274 | 33.222 | n/a | n/a | 0.036 | 8.104 | 0.146 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000bb | 36.283 | 7.349 | 0.005 | 0.000 | 0.245 | 0.893 | 2.819 | 0.044 | 0.000 | 1.228 | 23.629 | n/a | n/a | 0.072 | 7.600 | 0.209 | 0.072 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000bf | 26.867 | 4.964 | 0.005 | 0.000 | 1.193 | 0.830 | 1.685 | 0.044 | 0.000 | 0.665 | 17.405 | n/a | n/a | 0.076 | 6.162 | 0.229 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.867 | 0.847 | 0.000 | 2.050 | 4.964 | 0.005 | 0.000 | 1.193 | 0.830 | 1.685 | 0.044 | 0.000 | 0.665 | 17.405 | n/a | n/a | 0.076 | 6.162 | 0.229 | 0.076 |
| p99 | 26.867 | 0.847 | 0.000 | 2.050 | 4.964 | 0.005 | 0.000 | 1.193 | 0.830 | 1.685 | 0.044 | 0.000 | 0.665 | 17.405 | n/a | n/a | 0.076 | 6.162 | 0.229 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000bf | 26.867 | 4.964 | 0.005 | 0.000 | 1.193 | 0.830 | 1.685 | 0.044 | 0.000 | 0.665 | 17.405 | n/a | n/a | 0.076 | 6.162 | 0.229 | 0.076 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.635 | 0.737 | 0.000 | 1.992 | 4.693 | 0.011 | 0.000 | 0.333 | 1.201 | 9.043 | 0.050 | 0.000 | 0.268 | 13.429 | n/a | n/a | 0.043 | 5.745 | 0.208 | 0.043 |
| p99 | 63.111 | 2.553 | 0.146 | 2.359 | 8.319 | 3.083 | 0.721 | 1.042 | 2.442 | 22.065 | 0.067 | 0.000 | 1.924 | 43.030 | n/a | n/a | 0.050 | 12.205 | 0.354 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000cc | 63.111 | 5.420 | 0.152 | 0.323 | 0.072 | 2.442 | 22.035 | 0.054 | 0.000 | 1.564 | 31.007 | n/a | n/a | 0.041 | 5.968 | 0.095 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.433ms |
| 01ba1106ac8871d800000000000000cb | 57.595 | 3.661 | 0.004 | 0.000 | 0.333 | 1.201 | 9.043 | 0.050 | 0.000 | 0.223 | 43.030 | n/a | n/a | 0.050 | 3.998 | 0.069 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000c6 | 51.635 | 8.319 | 3.083 | 0.721 | 0.081 | 2.328 | 22.065 | 0.067 | 0.000 | 1.924 | 13.004 | n/a | n/a | 0.043 | 12.205 | 0.236 | 0.043 | gw-w/thread-48/gateway.admitted-work | none observed |
| 01ba1106ac8871d800000000000000c3 | 23.348 | 3.902 | 0.004 | 0.000 | 0.942 | 0.957 | 3.841 | 0.034 | 0.000 | 0.205 | 13.429 | n/a | n/a | 0.034 | 4.848 | 0.208 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000c9 | 16.238 | 4.693 | 0.011 | 0.000 | 1.042 | 1.086 | 1.728 | 0.033 | 0.000 | 0.268 | 7.335 | n/a | n/a | 0.044 | 5.745 | 0.354 | 0.044 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.348 | 1.127 | 0.000 | 1.996 | 3.902 | 0.004 | 0.000 | 0.942 | 1.086 | 3.841 | 0.034 | 0.000 | 0.223 | 13.429 | n/a | n/a | 0.044 | 4.848 | 0.208 | 0.044 |
| p99 | 57.595 | 2.553 | 0.000 | 2.359 | 4.693 | 0.011 | 0.000 | 1.042 | 1.201 | 9.043 | 0.050 | 0.000 | 0.268 | 43.030 | n/a | n/a | 0.050 | 5.745 | 0.354 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000cb | 57.595 | 3.661 | 0.004 | 0.000 | 0.333 | 1.201 | 9.043 | 0.050 | 0.000 | 0.223 | 43.030 | n/a | n/a | 0.050 | 3.998 | 0.069 | 0.050 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000c3 | 23.348 | 3.902 | 0.004 | 0.000 | 0.942 | 0.957 | 3.841 | 0.034 | 0.000 | 0.205 | 13.429 | n/a | n/a | 0.034 | 4.848 | 0.208 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000c9 | 16.238 | 4.693 | 0.011 | 0.000 | 1.042 | 1.086 | 1.728 | 0.033 | 0.000 | 0.268 | 7.335 | n/a | n/a | 0.044 | 5.745 | 0.354 | 0.044 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.325 | 0.000 | 0.000 | 0.290 | 5.979 | 0.153 | 0.219 | 0.059 | 1.851 | 11.356 | 0.083 | 0.000 | 0.226 | 23.121 | n/a | n/a | 0.046 | 6.631 | 0.063 | 0.046 |
| p99 | 116.950 | 0.323 | 0.000 | 0.607 | 6.903 | 0.365 | 0.228 | 0.061 | 2.211 | 20.371 | 0.105 | 0.000 | 3.199 | 95.691 | n/a | n/a | 0.047 | 7.336 | 0.120 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000d0 | 116.950 | 6.903 | 0.153 | 0.219 | 0.061 | 2.211 | 11.356 | 0.083 | 0.000 | 0.226 | 95.691 | n/a | n/a | 0.047 | 7.336 | 0.063 | 0.047 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000d3 | 55.325 | 5.979 | 0.365 | 0.228 | 0.059 | 1.851 | 20.371 | 0.105 | 0.000 | 3.199 | 23.121 | n/a | n/a | 0.046 | 6.631 | 0.120 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.198 | 0.235 | 0.000 | 0.337 | 4.673 | 0.010 | 0.000 | 0.062 | 2.107 | 7.944 | 0.055 | 0.000 | 0.739 | 21.739 | n/a | n/a | 0.037 | 5.454 | 0.132 | 0.037 |
| p99 | 73.269 | 0.824 | 0.000 | 1.949 | 6.895 | 1.650 | 0.000 | 1.146 | 6.384 | 16.794 | 0.116 | 0.000 | 1.252 | 56.885 | n/a | n/a | 0.075 | 8.603 | 0.174 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000d6 | 73.269 | 4.302 | 0.005 | 0.000 | 1.146 | 2.118 | 7.944 | 0.055 | 0.000 | 0.739 | 56.885 | n/a | n/a | 0.075 | 5.454 | 0.074 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000d5 | 49.574 | 6.895 | 1.650 | 0.000 | 0.059 | 2.107 | 14.499 | 0.075 | 0.000 | 1.252 | 23.001 | n/a | n/a | 0.037 | 8.603 | 0.174 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000dc | 42.198 | 5.331 | 0.162 | 0.000 | 0.062 | 6.384 | 16.794 | 0.116 | 0.000 | 0.823 | 12.489 | n/a | n/a | 0.037 | 5.555 | 0.132 | 0.037 | gw-w/thread-51/gateway.admitted-work | none observed |
| 01ba1106ac8871d800000000000000d9 | 30.687 | 4.673 | 0.010 | 0.000 | 0.167 | 1.072 | 2.281 | 0.040 | 0.000 | 0.643 | 21.739 | n/a | n/a | 0.062 | 4.850 | 0.158 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.687 | 0.505 | 0.000 | 1.548 | 4.673 | 0.010 | 0.000 | 0.167 | 1.072 | 2.281 | 0.040 | 0.000 | 0.643 | 21.739 | n/a | n/a | 0.062 | 4.850 | 0.158 | 0.062 |
| p99 | 30.687 | 0.505 | 0.000 | 1.548 | 4.673 | 0.010 | 0.000 | 0.167 | 1.072 | 2.281 | 0.040 | 0.000 | 0.643 | 21.739 | n/a | n/a | 0.062 | 4.850 | 0.158 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000d9 | 30.687 | 4.673 | 0.010 | 0.000 | 0.167 | 1.072 | 2.281 | 0.040 | 0.000 | 0.643 | 21.739 | n/a | n/a | 0.062 | 4.850 | 0.158 | 0.062 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.903 | 0.000 | 0.000 | 0.326 | 6.299 | 0.250 | 0.000 | 0.073 | 1.602 | 7.120 | 0.056 | 0.000 | 0.549 | 11.649 | n/a | n/a | 0.046 | 6.774 | 0.261 | 0.046 |
| p99 | 31.070 | 0.000 | 0.000 | 0.504 | 6.801 | 0.276 | 0.449 | 0.465 | 2.960 | 8.241 | 0.113 | 0.000 | 4.500 | 15.833 | n/a | n/a | 0.070 | 7.566 | 0.329 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000df | 31.070 | 4.381 | 0.276 | 0.000 | 0.073 | 1.602 | 8.241 | 0.045 | 0.000 | 0.549 | 15.833 | n/a | n/a | 0.070 | 4.730 | 0.152 | 0.070 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000dd | 25.903 | 6.299 | 0.010 | 0.000 | 0.465 | 2.960 | 7.120 | 0.113 | 0.000 | 4.500 | 4.391 | n/a | n/a | 0.046 | 6.774 | 0.261 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000e1 | 23.005 | 6.801 | 0.250 | 0.449 | 0.066 | 0.948 | 2.351 | 0.056 | 0.000 | 0.394 | 11.649 | n/a | n/a | 0.043 | 7.566 | 0.329 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.903 | 0.000 | 0.000 | 0.326 | 6.299 | 0.010 | 0.000 | 0.465 | 2.960 | 7.120 | 0.113 | 0.000 | 4.500 | 4.391 | n/a | n/a | 0.046 | 6.774 | 0.261 | 0.046 |
| p99 | 25.903 | 0.000 | 0.000 | 0.326 | 6.299 | 0.010 | 0.000 | 0.465 | 2.960 | 7.120 | 0.113 | 0.000 | 4.500 | 4.391 | n/a | n/a | 0.046 | 6.774 | 0.261 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000dd | 25.903 | 6.299 | 0.010 | 0.000 | 0.465 | 2.960 | 7.120 | 0.113 | 0.000 | 4.500 | 4.391 | n/a | n/a | 0.046 | 6.774 | 0.261 | 0.046 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.225 | 1.050 | 0.000 | 1.683 | 4.375 | 0.008 | 0.000 | 0.210 | 1.342 | 4.215 | 0.038 | 0.000 | 0.290 | 15.036 | n/a | n/a | 0.049 | 4.594 | 0.168 | 0.049 |
| p99 | 89.921 | 1.723 | 1.077 | 3.380 | 7.737 | 0.720 | 0.588 | 1.042 | 11.670 | 9.776 | 3.081 | 0.000 | 2.048 | 59.713 | n/a | n/a | 0.078 | 9.035 | 0.371 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000fe | 89.921 | 6.611 | 0.193 | 0.588 | 0.111 | 11.670 | 6.919 | 3.081 | 0.000 | 0.986 | 59.713 | n/a | n/a | 0.050 | 7.502 | 0.083 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.245ms |
| 01ba1106ac8871d800000000000000ff | 61.762 | 6.224 | 0.005 | 0.000 | 0.352 | 1.756 | 6.599 | 0.038 | 0.000 | 0.290 | 46.449 | n/a | n/a | 0.049 | 6.581 | 0.107 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000e6 | 47.411 | 5.064 | 0.173 | 0.242 | 0.060 | 1.498 | 9.776 | 0.051 | 0.000 | 0.202 | 30.304 | n/a | n/a | 0.040 | 5.539 | 0.117 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000129 | 38.359 | 3.509 | 0.005 | 0.000 | 0.225 | 0.685 | 1.016 | 0.034 | 0.000 | 0.179 | 32.651 | n/a | n/a | 0.055 | 3.740 | 0.097 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000e3 | 26.954 | 5.148 | 0.005 | 0.000 | 1.042 | 0.855 | 1.619 | 0.035 | 0.000 | 1.162 | 17.040 | n/a | n/a | 0.046 | 6.196 | 0.230 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000102 | 26.225 | 4.091 | 0.008 | 0.000 | 0.309 | 1.379 | 5.065 | 0.063 | 0.000 | 0.224 | 15.036 | n/a | n/a | 0.049 | 4.409 | 0.168 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000127 | 24.332 | 7.737 | 0.720 | 0.446 | 0.133 | 2.296 | 7.527 | 0.044 | 0.000 | 0.207 | 5.165 | n/a | n/a | 0.060 | 9.035 | 0.371 | 0.060 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000104 | 19.535 | 4.375 | 0.009 | 0.000 | 0.210 | 1.317 | 1.157 | 0.037 | 0.000 | 2.048 | 10.304 | n/a | n/a | 0.078 | 4.594 | 0.235 | 0.078 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000012b | 19.091 | 3.801 | 0.265 | 0.000 | 0.076 | 1.342 | 4.215 | 0.038 | 0.000 | 1.047 | 8.268 | n/a | n/a | 0.039 | 4.142 | 0.217 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000fb | 18.791 | 3.862 | 0.005 | 0.000 | 0.613 | 0.954 | 1.315 | 0.034 | 0.000 | 0.917 | 11.041 | n/a | n/a | 0.051 | 4.480 | 0.238 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.883 | 0.000 | 0.000 | 0.315 | 3.755 | 0.217 | 0.185 | 0.063 | 1.043 | 1.387 | 0.035 | 0.000 | 0.207 | 15.940 | n/a | n/a | 0.051 | 4.220 | 0.075 | 0.051 |
| p99 | 86.277 | 0.730 | 0.000 | 0.534 | 5.877 | 0.258 | 0.249 | 0.100 | 2.446 | 17.086 | 0.067 | 0.000 | 0.236 | 59.904 | n/a | n/a | 0.054 | 6.484 | 0.184 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000e8 | 86.277 | 5.877 | 0.258 | 0.249 | 0.100 | 2.446 | 17.086 | 0.067 | 0.000 | 0.236 | 59.904 | n/a | n/a | 0.054 | 6.484 | 0.075 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000ea | 22.883 | 3.755 | 0.217 | 0.185 | 0.063 | 1.043 | 1.387 | 0.035 | 0.000 | 0.207 | 15.940 | n/a | n/a | 0.051 | 4.220 | 0.184 | 0.051 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.880 | 0.000 | 0.000 | 0.645 | 3.334 | 0.176 | 0.000 | 0.098 | 1.601 | 1.345 | 0.034 | 0.000 | 1.080 | 15.052 | n/a | n/a | 0.038 | 4.357 | 0.133 | 0.038 |
| p99 | 50.188 | 0.848 | 0.000 | 1.914 | 3.941 | 2.128 | 0.262 | 23.359 | 4.594 | 8.591 | 0.847 | 0.000 | 3.215 | 38.775 | n/a | n/a | 0.050 | 28.201 | 0.590 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000f7 | 50.188 | 3.334 | 0.176 | 0.262 | 0.069 | 4.594 | 2.635 | 0.065 | 0.000 | 0.239 | 38.775 | n/a | n/a | 0.038 | 3.842 | 0.077 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000f1 | 47.812 | 2.714 | 2.128 | 0.000 | 23.359 | 1.601 | 1.008 | 0.034 | 0.000 | 3.215 | 13.727 | n/a | n/a | 0.027 | 28.201 | 0.590 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.131ms |
| 01ba1106ac8871d800000000000000ef | 32.880 | 3.792 | 0.212 | 0.255 | 0.098 | 1.278 | 8.591 | 0.847 | 0.000 | 1.080 | 16.676 | n/a | n/a | 0.050 | 4.357 | 0.133 | 0.050 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d800000000000000ed | 24.821 | 3.941 | 0.005 | 0.000 | 0.425 | 1.960 | 1.345 | 0.030 | 0.000 | 2.022 | 15.052 | n/a | n/a | 0.041 | 4.371 | 0.176 | 0.041 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.812 | 0.712 | 0.000 | 1.539 | 2.714 | 2.128 | 0.000 | 23.359 | 1.601 | 1.008 | 0.034 | 0.000 | 3.215 | 13.727 | n/a | n/a | 0.027 | 28.201 | 0.590 | 0.027 |
| p99 | 47.812 | 0.712 | 0.000 | 1.539 | 2.714 | 2.128 | 0.000 | 23.359 | 1.601 | 1.008 | 0.034 | 0.000 | 3.215 | 13.727 | n/a | n/a | 0.027 | 28.201 | 0.590 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d800000000000000f1 | 47.812 | 2.714 | 2.128 | 0.000 | 23.359 | 1.601 | 1.008 | 0.034 | 0.000 | 3.215 | 13.727 | n/a | n/a | 0.027 | 28.201 | 0.590 | 0.027 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.131ms |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.225 | 1.340 | 0.000 | 1.829 | 3.509 | 0.005 | 0.000 | 0.225 | 0.685 | 1.016 | 0.034 | 0.000 | 0.179 | 15.036 | n/a | n/a | 0.049 | 3.740 | 0.097 | 0.049 |
| p99 | 38.359 | 1.574 | 0.059 | 1.891 | 4.091 | 0.008 | 0.000 | 0.309 | 1.379 | 5.065 | 0.063 | 0.000 | 0.224 | 32.651 | n/a | n/a | 0.055 | 4.409 | 0.168 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000129 | 38.359 | 3.509 | 0.005 | 0.000 | 0.225 | 0.685 | 1.016 | 0.034 | 0.000 | 0.179 | 32.651 | n/a | n/a | 0.055 | 3.740 | 0.097 | 0.055 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000102 | 26.225 | 4.091 | 0.008 | 0.000 | 0.309 | 1.379 | 5.065 | 0.063 | 0.000 | 0.224 | 15.036 | n/a | n/a | 0.049 | 4.409 | 0.168 | 0.049 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.090 | 0.902 | 0.000 | 1.853 | 4.141 | 0.007 | 0.000 | 0.408 | 1.383 | 1.734 | 0.056 | 0.000 | 0.503 | 17.643 | n/a | n/a | 0.055 | 5.104 | 0.191 | 0.055 |
| p99 | 115.790 | 2.025 | 0.138 | 2.377 | 11.513 | 1.612 | 0.427 | 4.018 | 3.820 | 25.895 | 0.138 | 0.000 | 2.459 | 80.068 | n/a | n/a | 0.073 | 15.538 | 0.409 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000106 | 115.790 | 7.147 | 0.271 | 0.344 | 0.127 | 1.383 | 25.895 | 0.138 | 0.000 | 0.362 | 80.068 | n/a | n/a | 0.055 | 7.888 | 0.068 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000112 | 39.014 | 3.869 | 0.176 | 0.427 | 0.070 | 1.411 | 8.709 | 0.056 | 0.000 | 1.714 | 22.544 | n/a | n/a | 0.038 | 4.543 | 0.116 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000107 | 38.006 | 11.513 | 0.007 | 0.000 | 4.018 | 0.913 | 1.375 | 0.038 | 0.000 | 0.722 | 19.366 | n/a | n/a | 0.055 | 15.538 | 0.409 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000114 | 35.020 | 5.738 | 0.007 | 0.000 | 0.930 | 1.212 | 2.490 | 0.135 | 0.000 | 2.459 | 21.989 | n/a | n/a | 0.060 | 6.675 | 0.191 | 0.060 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000116 | 32.090 | 3.735 | 1.612 | 0.299 | 0.061 | 1.325 | 6.815 | 0.058 | 0.000 | 0.503 | 17.643 | n/a | n/a | 0.038 | 5.707 | 0.178 | 0.038 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000010a | 25.236 | 4.208 | 0.005 | 0.000 | 0.361 | 2.748 | 1.556 | 0.048 | 0.000 | 0.678 | 15.572 | n/a | n/a | 0.058 | 4.575 | 0.181 | 0.058 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000010c | 17.728 | 3.688 | 0.005 | 0.000 | 1.043 | 3.820 | 1.147 | 0.034 | 0.000 | 0.437 | 7.519 | n/a | n/a | 0.036 | 4.735 | 0.267 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000110 | 17.517 | 4.141 | 0.009 | 0.000 | 0.954 | 1.102 | 1.143 | 0.034 | 0.000 | 0.415 | 9.646 | n/a | n/a | 0.073 | 5.104 | 0.291 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000010e | 16.535 | 3.385 | 0.004 | 0.000 | 0.408 | 1.967 | 1.734 | 0.116 | 0.000 | 0.275 | 8.611 | n/a | n/a | 0.034 | 3.797 | 0.230 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.517 | 0.840 | 0.000 | 1.853 | 3.688 | 0.005 | 0.000 | 0.954 | 1.102 | 1.143 | 0.034 | 0.000 | 0.415 | 7.519 | n/a | n/a | 0.036 | 4.735 | 0.267 | 0.036 |
| p99 | 17.728 | 0.902 | 0.000 | 2.179 | 4.141 | 0.009 | 0.000 | 1.043 | 3.820 | 1.147 | 0.034 | 0.000 | 0.437 | 9.646 | n/a | n/a | 0.073 | 5.104 | 0.291 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d8000000000000010c | 17.728 | 3.688 | 0.005 | 0.000 | 1.043 | 3.820 | 1.147 | 0.034 | 0.000 | 0.437 | 7.519 | n/a | n/a | 0.036 | 4.735 | 0.267 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000110 | 17.517 | 4.141 | 0.009 | 0.000 | 0.954 | 1.102 | 1.143 | 0.034 | 0.000 | 0.415 | 9.646 | n/a | n/a | 0.073 | 5.104 | 0.291 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.662 | 0.000 | 0.000 | 0.329 | 3.728 | 0.005 | 0.000 | 0.029 | 1.240 | 2.324 | 0.039 | 0.000 | 0.176 | 13.483 | n/a | n/a | 0.034 | 3.998 | 0.087 | 0.034 |
| p99 | 45.801 | 2.038 | 1.612 | 4.266 | 6.898 | 0.242 | 0.000 | 1.295 | 3.846 | 22.854 | 0.047 | 0.000 | 1.539 | 19.645 | n/a | n/a | 0.040 | 8.198 | 0.259 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d8000000000000011c | 45.801 | 3.728 | 0.242 | 0.000 | 0.029 | 3.846 | 22.854 | 0.047 | 0.000 | 1.539 | 13.483 | n/a | n/a | 0.034 | 3.998 | 0.087 | 0.034 | gw-w/thread-49/gateway.admitted-work | driver.expected-state.bind-receipt 2.153ms; driver.publication 1.823ms |
| 01ba1106ac8871d8000000000000011d | 31.662 | 6.898 | 0.005 | 0.000 | 1.295 | 1.240 | 2.324 | 0.039 | 0.000 | 0.176 | 19.645 | n/a | n/a | 0.040 | 8.198 | 0.259 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.869 | 0.750 | 0.000 | 2.067 | 4.076 | 0.005 | 0.000 | 0.174 | 1.038 | 3.798 | 0.048 | 0.000 | 0.222 | 13.864 | n/a | n/a | 0.040 | 4.587 | 0.192 | 0.040 |
| p99 | 53.264 | 1.237 | 0.305 | 3.317 | 7.575 | 0.189 | 0.215 | 2.727 | 1.410 | 7.125 | 0.093 | 0.000 | 0.369 | 40.652 | n/a | n/a | 0.055 | 10.306 | 0.502 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d8000000000000012d | 53.264 | 3.586 | 0.179 | 0.000 | 0.062 | 1.385 | 7.125 | 0.042 | 0.000 | 0.188 | 40.652 | n/a | n/a | 0.045 | 3.827 | 0.072 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000012e | 31.198 | 3.776 | 0.005 | 0.000 | 0.294 | 1.038 | 3.798 | 0.093 | 0.000 | 0.369 | 21.786 | n/a | n/a | 0.040 | 4.075 | 0.131 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000135 | 23.869 | 4.076 | 0.189 | 0.215 | 0.106 | 1.410 | 6.223 | 0.042 | 0.000 | 0.241 | 11.310 | n/a | n/a | 0.055 | 4.587 | 0.192 | 0.055 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000131 | 21.794 | 4.811 | 0.005 | 0.000 | 0.174 | 1.032 | 1.616 | 0.048 | 0.000 | 0.205 | 13.864 | n/a | n/a | 0.038 | 4.990 | 0.229 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000133 | 20.515 | 7.575 | 0.004 | 0.000 | 2.727 | 0.774 | 0.899 | 0.049 | 0.000 | 0.222 | 8.240 | n/a | n/a | 0.025 | 10.306 | 0.502 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.515 | 0.750 | 0.305 | 3.317 | 7.575 | 0.004 | 0.000 | 2.727 | 0.774 | 0.899 | 0.049 | 0.000 | 0.222 | 8.240 | n/a | n/a | 0.025 | 10.306 | 0.502 | 0.025 |
| p99 | 20.515 | 0.750 | 0.305 | 3.317 | 7.575 | 0.004 | 0.000 | 2.727 | 0.774 | 0.899 | 0.049 | 0.000 | 0.222 | 8.240 | n/a | n/a | 0.025 | 10.306 | 0.502 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000133 | 20.515 | 7.575 | 0.004 | 0.000 | 2.727 | 0.774 | 0.899 | 0.049 | 0.000 | 0.222 | 8.240 | n/a | n/a | 0.025 | 10.306 | 0.502 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.205 | 0.000 | 0.000 | 0.290 | 8.570 | 0.174 | 0.200 | 0.068 | 1.660 | 6.215 | 0.059 | 0.000 | 0.486 | 14.185 | n/a | n/a | 0.039 | 9.012 | 0.259 | 0.039 |
| p99 | 38.469 | 0.577 | 0.000 | 2.426 | 8.699 | 0.965 | 0.247 | 0.551 | 4.569 | 9.340 | 0.069 | 0.000 | 1.310 | 15.096 | n/a | n/a | 0.089 | 9.976 | 0.344 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000137 | 38.469 | 8.699 | 0.965 | 0.247 | 0.065 | 4.569 | 9.340 | 0.046 | 0.000 | 0.314 | 14.185 | n/a | n/a | 0.038 | 9.976 | 0.259 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d8000000000000013b | 26.205 | 8.570 | 0.174 | 0.200 | 0.068 | 1.660 | 6.215 | 0.059 | 0.000 | 0.486 | 8.734 | n/a | n/a | 0.039 | 9.012 | 0.344 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 01ba1106ac8871d80000000000000139 | 24.755 | 4.882 | 0.006 | 0.000 | 0.551 | 1.091 | 1.660 | 0.069 | 0.000 | 1.310 | 15.096 | n/a | n/a | 0.089 | 5.439 | 0.220 | 0.089 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.755 | 0.577 | 0.000 | 2.426 | 4.882 | 0.006 | 0.000 | 0.551 | 1.091 | 1.660 | 0.069 | 0.000 | 1.310 | 15.096 | n/a | n/a | 0.089 | 5.439 | 0.220 | 0.089 |
| p99 | 24.755 | 0.577 | 0.000 | 2.426 | 4.882 | 0.006 | 0.000 | 0.551 | 1.091 | 1.660 | 0.069 | 0.000 | 1.310 | 15.096 | n/a | n/a | 0.089 | 5.439 | 0.220 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000139 | 24.755 | 4.882 | 0.006 | 0.000 | 0.551 | 1.091 | 1.660 | 0.069 | 0.000 | 1.310 | 15.096 | n/a | n/a | 0.089 | 5.439 | 0.220 | 0.089 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 78.124 | 0.475 | 0.000 | 1.506 | 4.273 | 4.266 | 0.000 | 0.007 | 3.195 | 0.893 | 8.710 | 0.000 | 0.526 | 52.352 | n/a | n/a | 0.025 | 8.028 | 0.108 | 0.025 |
| p99 | 120.088 | 1.097 | 0.623 | 3.156 | 7.138 | 5.222 | 0.000 | 0.071 | 10.075 | 4.722 | 13.122 | 9.442 | 3.510 | 91.810 | n/a | n/a | 0.054 | 12.365 | 0.150 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000146 | 120.088 | 7.138 | 5.222 | 0.000 | 0.005 | 5.250 | 0.826 | 9.728 | 0.000 | 0.055 | 91.810 | n/a | n/a | 0.054 | 12.365 | 0.103 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.484ms; driver.publication 1.554ms; driver.publication 1.439ms; driver.publication 1.308ms; driver.publication 1.163ms |
| 01ba1106ac8871d80000000000000145 | 111.290 | 6.541 | 5.007 | 0.000 | 0.006 | 6.748 | 0.836 | 8.710 | 0.000 | 0.091 | 83.326 | n/a | n/a | 0.025 | 11.554 | 0.104 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.439ms; driver.publication 1.308ms; driver.publication 1.163ms; driver.publication 1.115ms |
| 01ba1106ac8871d80000000000000144 | 97.864 | 4.741 | 5.098 | 0.000 | 0.008 | 10.075 | 2.358 | 4.308 | 0.000 | 0.068 | 71.191 | n/a | n/a | 0.018 | 9.846 | 0.101 | 0.018 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.308ms; driver.publication 1.163ms; driver.publication 1.115ms; driver.publication 1.092ms |
| 01ba1106ac8871d80000000000000143 | 84.748 | 4.483 | 4.762 | 0.000 | 0.005 | 9.942 | 1.468 | 6.612 | 0.000 | 0.135 | 57.308 | n/a | n/a | 0.032 | 9.251 | 0.109 | 0.032 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.163ms; driver.publication 1.115ms; driver.publication 1.092ms |
| 01ba1106ac8871d80000000000000147 | 81.307 | 2.566 | 0.005 | 0.000 | 0.071 | 3.195 | 4.722 | 0.098 | 9.442 | 0.750 | 60.412 | n/a | n/a | 0.046 | 2.642 | 0.032 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 2.906ms; driver.publication 2.484ms; driver.publication 1.554ms; driver.publication 1.439ms; driver.publication 1.308ms |
| 01ba1106ac8871d80000000000000142 | 78.124 | 3.892 | 4.508 | 0.000 | 0.005 | 5.405 | 0.708 | 10.713 | 0.000 | 0.526 | 52.352 | n/a | n/a | 0.015 | 8.405 | 0.108 | 0.015 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.163ms; driver.publication 1.115ms; driver.publication 1.092ms |
| 01ba1106ac8871d80000000000000141 | 75.590 | 3.754 | 4.266 | 0.000 | 0.007 | 1.908 | 1.033 | 13.122 | 0.000 | 0.584 | 50.898 | n/a | n/a | 0.017 | 8.028 | 0.106 | 0.017 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.163ms; driver.publication 1.115ms; driver.publication 1.092ms |
| 01ba1106ac8871d80000000000000140 | 74.131 | 4.031 | 3.944 | 0.000 | 0.007 | 1.654 | 0.669 | 12.860 | 0.000 | 1.046 | 49.901 | n/a | n/a | 0.018 | 7.982 | 0.108 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.163ms; driver.publication 1.115ms |
| 01ba1106ac8871d8000000000000013f | 64.781 | 4.273 | 3.422 | 0.000 | 0.021 | 0.647 | 0.850 | 12.210 | 0.000 | 1.939 | 41.374 | n/a | n/a | 0.047 | 7.715 | 0.119 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.554ms; driver.publication 1.163ms |
| 01ba1106ac8871d8000000000000013e | 44.537 | 4.333 | 2.340 | 0.000 | 0.011 | 1.382 | 1.268 | 7.892 | 0.000 | 0.181 | 27.108 | n/a | n/a | 0.021 | 6.684 | 0.150 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.163ms |
| 01ba1106ac8871d8000000000000013d | 28.655 | 3.430 | 0.019 | 0.000 | 0.037 | 3.137 | 0.893 | 0.039 | 0.000 | 3.510 | 17.560 | n/a | n/a | 0.030 | 3.485 | 0.122 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.307 | 1.097 | 0.000 | 1.319 | 2.566 | 0.005 | 0.000 | 0.071 | 3.195 | 4.722 | 0.098 | 9.442 | 0.750 | 60.412 | n/a | n/a | 0.046 | 2.642 | 0.032 | 0.046 |
| p99 | 81.307 | 1.097 | 0.000 | 1.319 | 2.566 | 0.005 | 0.000 | 0.071 | 3.195 | 4.722 | 0.098 | 9.442 | 0.750 | 60.412 | n/a | n/a | 0.046 | 2.642 | 0.032 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 01ba1106ac8871d80000000000000147 | 81.307 | 2.566 | 0.005 | 0.000 | 0.071 | 3.195 | 4.722 | 0.098 | 9.442 | 0.750 | 60.412 | n/a | n/a | 0.046 | 2.642 | 0.032 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 2.906ms; driver.publication 2.484ms; driver.publication 1.554ms; driver.publication 1.439ms; driver.publication 1.308ms |

## P1 / warmup / read (232 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.022 | 0.920 | 0.001 |
| p99 | 300.906 | n/a | n/a | n/a | 51.724 | n/a | 7.475 | 300.870 | 59.040 | 14.071 | 0.027 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.011 | 300.905 | 1.000 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3359171c3f80bbe80000000000001902 | 300.954 | 0.041 | n/a | 0.000 | 300.912 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.953 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000001901 | 300.934 | 0.041 | n/a | 0.000 | 300.892 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.932 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000001900 | 300.906 | 0.035 | n/a | 0.000 | 300.870 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.905 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe800000000000018ff | 300.905 | 0.077 | n/a | 0.000 | 300.826 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.903 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe800000000000018fe | 300.882 | 0.371 | n/a | 0.000 | 300.507 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 300.878 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000001a82 | 300.671 | 0.033 | n/a | 0.000 | 300.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.670 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000001a81 | 300.609 | 0.031 | n/a | 0.000 | 300.575 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.607 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000001a7d | 300.591 | 0.534 | n/a | 0.000 | 300.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 300.586 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000001a80 | 300.568 | 0.048 | n/a | 0.000 | 300.518 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.566 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000001a7f | 300.514 | 0.034 | n/a | 0.000 | 300.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 300.512 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000001a7e | 300.490 | 0.073 | n/a | 0.000 | 300.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.488 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000019a3 | 300.021 | 0.393 | n/a | 0.000 | 299.626 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.020 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000019a7 | 299.902 | 0.016 | n/a | 0.000 | 299.886 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.901 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000019a6 | 299.893 | 0.016 | n/a | 0.000 | 299.876 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.892 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000019a4 | 299.884 | 0.045 | n/a | 0.000 | 299.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.882 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000019a5 | 299.883 | 0.020 | n/a | 0.000 | 299.862 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.882 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000000b7d7 | 269.578 | 0.030 | n/a | 0.000 | 269.547 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.577 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000000b7cd | 269.519 | 0.781 | n/a | 0.000 | 268.737 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.517 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000000b7d6 | 269.517 | 0.136 | n/a | 0.000 | 269.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 269.516 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000000b7cc | 268.726 | 0.071 | n/a | 0.000 | 268.653 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 268.724 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.933 | 0.001 |
| p99 | 274.409 | n/a | n/a | n/a | 3.481 | n/a | 0.000 | 274.208 | 0.939 | 1.087 | 0.025 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.647 | 274.405 | 1.000 | 0.647 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc20000000000020425 | 274.409 | 0.197 | n/a | 0.000 | 274.208 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.405 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| aa6a6569b4f81bc2000000000000da09 | 269.069 | 0.120 | n/a | 0.000 | 268.947 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.067 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000000d67b | 71.011 | 0.113 | n/a | 0.000 | 70.896 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 71.009 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.176ms |
| aa6a6569b4f81bc2000000000000d6a9 | 5.560 | 3.481 | n/a | 0.000 | 0.000 | 0.939 | 1.087 | 0.025 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.004 | 3.481 | 0.626 | 0.004 | node-14/thread-3/reader.execute | none observed |
| aa6a6569b4f81bc200000000000116bb | 0.996 | 0.994 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.994 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001ae56 | 0.730 | 0.083 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.647 | 0.083 | 0.114 | 0.647 | uncovered | none observed |
| aa6a6569b4f81bc20000000000010637 | 0.536 | 0.535 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.535 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001b9cb | 0.516 | 0.515 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.515 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001e25d | 0.484 | 0.483 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.483 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| aa6a6569b4f81bc2000000000001cfc2 | 0.474 | 0.473 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.473 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000015625 | 0.452 | 0.450 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.450 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001ae66 | 0.378 | 0.375 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.375 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001b414 | 0.369 | 0.366 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.366 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001d490 | 0.325 | 0.310 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.310 | 0.951 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001ae5b | 0.321 | 0.319 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.319 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001b2a7 | 0.321 | 0.319 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.319 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001e7cc | 0.301 | 0.299 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.299 | 0.995 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000001d0fc | 0.300 | 0.299 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.299 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000010075 | 0.297 | 0.294 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.294 | 0.991 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000000fbd2 | 0.297 | 0.295 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.295 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.015 | 0.938 | 0.001 |
| p99 | 277.013 | n/a | n/a | n/a | 4.816 | n/a | 0.000 | 276.931 | 0.714 | 0.519 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.518 | 277.012 | 1.000 | 0.518 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3359171c3f80bbe8000000000000edc8 | 277.541 | 0.116 | n/a | 0.000 | 277.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.539 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000000df29 | 277.099 | 0.163 | n/a | 0.000 | 276.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 277.094 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000002147e | 277.013 | 0.115 | n/a | 0.000 | 276.895 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.010 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000002147f | 277.013 | 0.021 | n/a | 0.000 | 276.991 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.012 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000020428 | 266.024 | 0.062 | n/a | 0.000 | 265.960 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.022 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| 3359171c3f80bbe8000000000000dfd5 | 265.858 | 0.479 | n/a | 0.000 | 265.368 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 265.847 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| e47dc123be6d434c000000000000cf30 | 265.502 | 0.199 | n/a | 0.000 | 265.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 265.500 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| aa6a6569b4f81bc20000000000020495 | 63.275 | 53.140 | n/a | 4.964 | 0.000 | 0.970 | 4.176 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.005 | 58.104 | 0.918 | 0.005 | node-14/thread-3/reader.execute | none observed |
| 3359171c3f80bbe8000000000000dfe6 | 19.233 | 15.401 | n/a | 1.633 | 0.000 | 0.902 | 1.260 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.005 | 17.034 | 0.886 | 0.005 | node-14/thread-5/reader.execute | none observed |
| 3359171c3f80bbe8000000000000dfde | 4.818 | 4.816 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.816 | 1.000 | 0.002 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.036ms |
| aa6a6569b4f81bc20000000000020446 | 4.230 | 4.229 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.229 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.023ms |
| aa6a6569b4f81bc20000000000020447 | 4.222 | 4.215 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 4.215 | 0.998 | 0.007 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.023ms |
| e47dc123be6d434c000000000000cf3b | 4.114 | 4.112 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 4.112 | 1.000 | 0.002 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.024ms |
| e47dc123be6d434c000000000000cf6a | 3.982 | 2.726 | n/a | 0.000 | 0.000 | 0.714 | 0.519 | 0.006 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.002 | 2.726 | 0.685 | 0.002 | node-14/thread-4/reader.execute | none observed |
| e47dc123be6d434c000000000000df80 | 2.047 | 2.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.045 | 0.999 | 0.002 | node-14/thread-4/reader.execute | none observed |
| aa6a6569b4f81bc20000000000025ca3 | 1.750 | 0.029 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.720 | 0.029 | 0.017 | 1.720 | uncovered | none observed |
| aa6a6569b4f81bc2000000000002ac5f | 1.656 | 1.654 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.654 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000002ac60 | 1.655 | 1.643 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 1.643 | 0.993 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| e47dc123be6d434c00000000000158b2 | 1.544 | 1.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.542 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000028b5c | 1.350 | 1.347 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.347 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (253 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.025 | 0.950 | 0.001 |
| p99 | 441.000 | n/a | n/a | n/a | 3.840 | n/a | 0.000 | 440.984 | 2.962 | 0.671 | 0.010 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.013 | 440.999 | 1.000 | 0.013 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc20000000000038f9c | 441.016 | 0.012 | n/a | 0.000 | 441.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.015 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| aa6a6569b4f81bc20000000000038f9b | 441.008 | 0.012 | n/a | 0.000 | 440.995 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.007 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| aa6a6569b4f81bc20000000000038f9a | 441.000 | 0.015 | n/a | 0.000 | 440.984 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.999 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| aa6a6569b4f81bc20000000000038f99 | 440.992 | 0.026 | n/a | 0.000 | 440.966 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.991 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| aa6a6569b4f81bc20000000000038f98 | 440.980 | 0.020 | n/a | 0.000 | 440.960 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.979 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| aa6a6569b4f81bc20000000000038f97 | 440.937 | 0.156 | n/a | 0.000 | 440.779 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 440.935 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| e47dc123be6d434c0000000000022132 | 440.799 | 0.189 | n/a | 0.000 | 440.608 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.797 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e47dc123be6d434c0000000000022134 | 440.779 | 0.015 | n/a | 0.000 | 440.763 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.778 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e47dc123be6d434c0000000000022133 | 440.778 | 0.031 | n/a | 0.000 | 440.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.777 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3359171c3f80bbe80000000000023ab3 | 440.768 | 0.274 | n/a | 0.000 | 440.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 440.765 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 3359171c3f80bbe80000000000023ab4 | 440.649 | 0.049 | n/a | 0.000 | 440.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 440.647 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 3359171c3f80bbe80000000000023ab5 | 440.622 | 0.021 | n/a | 0.000 | 440.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 440.620 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 3359171c3f80bbe80000000000023ab8 | 440.512 | 0.038 | n/a | 0.000 | 440.473 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.511 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 3359171c3f80bbe80000000000023ab9 | 440.492 | 0.018 | n/a | 0.000 | 440.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.490 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| e47dc123be6d434c0000000000022166 | 440.287 | 0.039 | n/a | 0.000 | 440.248 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.286 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| e47dc123be6d434c0000000000022167 | 440.283 | 0.013 | n/a | 0.000 | 440.269 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 440.282 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3359171c3f80bbe80000000000023ad2 | 96.036 | 1.155 | n/a | 0.000 | 94.879 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 96.034 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms; replica.apply-delta 0.025ms |
| aa6a6569b4f81bc20000000000038fb4 | 95.624 | 0.032 | n/a | 0.000 | 95.592 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 95.623 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.031ms; replica.apply-delta 0.028ms |
| aa6a6569b4f81bc20000000000038fb3 | 95.585 | 0.161 | n/a | 0.000 | 95.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 95.583 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.031ms; replica.apply-delta 0.028ms |
| 3359171c3f80bbe80000000000023b03 | 95.057 | 0.013 | n/a | 0.000 | 95.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 95.056 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms; replica.apply-delta 0.025ms |

## P1 / L64 / read (240 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.029 | 0.955 | 0.001 |
| p99 | 284.676 | n/a | n/a | n/a | 7.488 | n/a | 0.000 | 284.657 | 1.832 | 6.490 | 0.012 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.026 | 284.671 | 1.000 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e47dc123be6d434c000000000002ca16 | 284.694 | 0.014 | n/a | 0.000 | 284.679 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.693 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000002ca15 | 284.683 | 0.013 | n/a | 0.000 | 284.668 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.682 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000002ca12 | 284.676 | 0.161 | n/a | 0.000 | 284.511 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 284.671 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000002ca14 | 284.672 | 0.014 | n/a | 0.000 | 284.657 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.671 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000002ca13 | 284.662 | 0.017 | n/a | 0.000 | 284.644 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.661 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe8000000000002e10b | 284.206 | 0.028 | n/a | 0.000 | 284.177 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.205 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe8000000000002e10a | 284.139 | 0.025 | n/a | 0.000 | 284.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.138 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe8000000000002e109 | 284.095 | 0.028 | n/a | 0.000 | 284.067 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.094 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe8000000000002e108 | 284.072 | 0.049 | n/a | 0.000 | 284.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 284.071 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe8000000000002e107 | 284.030 | 0.228 | n/a | 0.000 | 283.800 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 284.027 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000043b14 | 283.966 | 0.249 | n/a | 0.000 | 283.715 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.964 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000043b2b | 282.783 | 0.044 | n/a | 0.000 | 282.735 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.779 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000043b2d | 282.771 | 0.013 | n/a | 0.000 | 282.757 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.770 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000043b2c | 282.762 | 0.015 | n/a | 0.000 | 282.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.761 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000043b37 | 282.560 | 0.029 | n/a | 0.000 | 282.529 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.559 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000043b38 | 282.529 | 0.033 | n/a | 0.000 | 282.489 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 282.522 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000307a4 | 276.088 | 0.263 | n/a | 0.000 | 275.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.087 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000307a5 | 276.046 | 0.083 | n/a | 0.000 | 275.961 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.044 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000307a3 | 275.921 | 0.015 | n/a | 0.000 | 275.904 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.920 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000307a2 | 275.910 | 0.025 | n/a | 0.000 | 275.884 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.909 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (217 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | n/a | n/a | n/a | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.028 | 0.957 | 0.001 |
| p99 | 307.275 | n/a | n/a | n/a | 4.065 | n/a | 0.000 | 307.254 | 0.723 | 6.073 | 0.013 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.023 | 307.274 | 1.000 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3359171c3f80bbe8000000000004404a | 307.307 | 0.038 | n/a | 0.000 | 307.268 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.306 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000044049 | 307.284 | 0.014 | n/a | 0.000 | 307.270 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.284 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000044048 | 307.275 | 0.020 | n/a | 0.000 | 307.254 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.274 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000044047 | 307.245 | 0.720 | n/a | 0.000 | 306.524 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.244 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000422cc | 306.708 | 0.016 | n/a | 0.000 | 306.690 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.707 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000422cb | 306.699 | 0.029 | n/a | 0.000 | 306.669 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.698 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000422ca | 306.643 | 0.115 | n/a | 0.000 | 306.526 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.640 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000044046 | 306.508 | 0.098 | n/a | 0.000 | 306.407 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.506 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000422e6 | 306.503 | 0.223 | n/a | 0.000 | 306.279 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.502 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c00000000000422e7 | 306.457 | 0.095 | n/a | 0.000 | 306.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.456 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000059da8 | 306.031 | 0.156 | n/a | 0.000 | 305.872 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 306.028 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000059da9 | 306.015 | 0.026 | n/a | 0.000 | 305.987 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.013 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000059dcc | 304.942 | 0.025 | n/a | 0.000 | 304.916 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.940 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000059dce | 304.916 | 0.023 | n/a | 0.000 | 304.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.914 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000059dcd | 304.907 | 0.023 | n/a | 0.000 | 304.882 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 304.905 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000059dea | 304.258 | 0.045 | n/a | 0.000 | 304.211 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 304.256 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000037068 | 272.112 | 0.018 | n/a | 0.000 | 272.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.111 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000037069 | 272.107 | 0.013 | n/a | 0.000 | 272.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.106 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000037067 | 272.104 | 0.029 | n/a | 0.000 | 272.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.104 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000037066 | 272.064 | 0.109 | n/a | 0.000 | 271.953 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.062 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (314 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.020 | 0.944 | 0.001 |
| p99 | 4.161 | n/a | n/a | n/a | 3.862 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.069 | 3.862 | 1.000 | 1.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc20000000000059e16 | 44.131 | 26.279 | n/a | 3.481 | 0.000 | 2.112 | 12.232 | 0.007 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.004 | 29.760 | 0.674 | 0.004 | node-14/thread-3/client.reach | none observed |
| e47dc123be6d434c000000000004247b | 29.468 | 13.813 | n/a | 9.681 | 0.000 | 2.801 | 3.139 | 0.010 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.004 | 23.493 | 0.797 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 3359171c3f80bbe8000000000004404d | 15.876 | 3.518 | n/a | 0.000 | 0.000 | 1.606 | 10.735 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.004 | 3.518 | 0.222 | 0.004 | gw-r/thread-48/gateway.admitted-work | none observed |
| aa6a6569b4f81bc20000000000065f5a | 4.161 | 4.158 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.158 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e47dc123be6d434c000000000004e42b | 3.865 | 3.862 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.862 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000608cd | 3.608 | 3.604 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.604 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000608ce | 3.597 | 3.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.568 | 0.992 | 0.028 | node-14/thread-3/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000055ee2 | 3.298 | 3.286 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.286 | 0.996 | 0.013 | node-14/thread-5/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000055ee1 | 3.297 | 3.295 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.295 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000055ee3 | 3.292 | 3.278 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.278 | 0.996 | 0.014 | node-14/thread-5/replica.pull-at | none observed |
| e47dc123be6d434c000000000004ec50 | 3.291 | 3.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.288 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| e47dc123be6d434c000000000004ec51 | 3.258 | 3.240 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.240 | 0.994 | 0.018 | node-14/thread-4/replica.pull-at | none observed |
| e47dc123be6d434c00000000000525e5 | 3.233 | 3.219 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.219 | 0.996 | 0.014 | node-14/thread-4/replica.pull-at | none observed |
| e47dc123be6d434c00000000000525e4 | 3.228 | 3.226 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.226 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000044f2e | 3.185 | 3.184 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.184 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| e47dc123be6d434c00000000000534cc | 3.129 | 1.617 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.512 | 1.617 | 0.517 | 1.512 | node-14/thread-4/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000044f2f | 3.111 | 3.100 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 3.100 | 0.996 | 0.011 | node-14/thread-5/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000044f30 | 3.096 | 3.083 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 3.083 | 0.996 | 0.012 | node-14/thread-5/replica.pull-at | none observed |
| 3359171c3f80bbe8000000000004582a | 3.073 | 3.063 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.063 | 0.997 | 0.009 | node-14/thread-5/replica.pull-at | none observed |
| 3359171c3f80bbe80000000000045829 | 3.071 | 3.070 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.070 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |

## P1 / recovery / read (228 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.032 | 0.962 | 0.001 |
| p99 | 322.001 | n/a | n/a | n/a | 4.854 | n/a | 1.836 | 321.912 | 2.007 | 0.535 | 0.006 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.034 | 322.000 | 1.000 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e47dc123be6d434c000000000006364e | 322.123 | 0.238 | n/a | 0.000 | 321.885 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.122 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000063654 | 322.012 | 0.100 | n/a | 0.000 | 321.912 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.011 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000063655 | 322.001 | 0.041 | n/a | 0.000 | 321.959 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 322.000 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000006364d | 321.964 | 0.019 | n/a | 0.000 | 321.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.964 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000006364c | 321.914 | 0.124 | n/a | 0.000 | 321.787 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 321.911 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000065e90 | 321.774 | 0.109 | n/a | 0.000 | 321.663 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 321.772 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007b242 | 321.341 | 0.046 | n/a | 0.000 | 321.294 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.340 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007b244 | 321.341 | 0.014 | n/a | 0.000 | 321.327 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.340 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007b243 | 321.336 | 0.015 | n/a | 0.000 | 321.320 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.335 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007b241 | 321.309 | 0.016 | n/a | 0.000 | 321.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.308 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007b240 | 321.297 | 0.022 | n/a | 0.000 | 321.273 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 321.296 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007b23f | 321.241 | 0.136 | n/a | 0.000 | 321.102 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 321.238 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000065eca | 319.759 | 0.014 | n/a | 0.000 | 319.744 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.758 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000065ec8 | 319.758 | 0.036 | n/a | 0.000 | 319.720 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 319.756 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000065ec9 | 319.749 | 0.016 | n/a | 0.000 | 319.732 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 319.748 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3359171c3f80bbe80000000000065ecb | 319.700 | 0.076 | n/a | 0.000 | 319.619 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 319.696 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007c444 | 279.264 | 0.173 | n/a | 0.000 | 279.087 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 279.260 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc2000000000007c445 | 279.178 | 0.074 | n/a | 0.000 | 279.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 279.164 | 1.000 | 0.015 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000064594 | 279.142 | 0.086 | n/a | 0.000 | 279.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.140 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e47dc123be6d434c0000000000064593 | 279.106 | 0.020 | n/a | 0.000 | 279.084 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.104 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | n/a | n/a | n/a | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.935 | 0.001 |
| p99 | 1.375 | n/a | n/a | n/a | 1.374 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 1.374 | 0.999 | 0.008 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc2000000000007d3d2 | 16.921 | 1.623 | n/a | 0.000 | 0.000 | 0.876 | 14.396 | 0.007 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.003 | 1.623 | 0.096 | 0.003 | gw-r/thread-52/gateway.admitted-work | none observed |
| aa6a6569b4f81bc20000000000081a80 | 1.375 | 1.374 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.374 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000007d727 | 0.902 | 0.902 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.902 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000008b5d3 | 0.791 | 0.789 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.789 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000008b639 | 0.773 | 0.772 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.772 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000008fb81 | 0.749 | 0.748 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.748 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000082e1b | 0.643 | 0.635 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.635 | 0.987 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000082e96 | 0.631 | 0.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.629 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000007fb70 | 0.496 | 0.494 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.494 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000099b5d | 0.483 | 0.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.481 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000009868f | 0.462 | 0.460 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.460 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000098c58 | 0.461 | 0.455 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.455 | 0.986 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000008d4ea | 0.458 | 0.456 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.456 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000008d5bd | 0.439 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.425 | 0.967 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000009ce66 | 0.434 | 0.431 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.431 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000081de5 | 0.434 | 0.432 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.432 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000950dc | 0.430 | 0.428 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.428 | 0.997 | 0.001 | node-14/thread-3/reader.execute | none observed |
| aa6a6569b4f81bc20000000000082ea2 | 0.425 | 0.423 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.423 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000082e45 | 0.422 | 0.421 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.421 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000008cddc | 0.421 | 0.419 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.419 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.913 | 0.001 |
| p99 | 3.536 | n/a | n/a | n/a | 2.916 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.916 | 0.999 | 0.002 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc200000000000ba31b | 11.423 | 11.422 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 11.422 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000009d6c8 | 8.990 | 1.207 | n/a | 0.000 | 0.000 | 1.125 | 6.621 | 0.011 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.002 | 1.207 | 0.134 | 0.002 | gw-r/thread-72/gateway.admitted-work | none observed |
| aa6a6569b4f81bc200000000000adc30 | 3.536 | 3.532 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.532 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.029ms |
| aa6a6569b4f81bc200000000000ba499 | 2.918 | 2.916 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.916 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000ba336 | 2.857 | 2.855 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.855 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000c6cb6 | 0.684 | 0.682 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.682 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000b77dc | 0.635 | 0.634 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.634 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000c6cb2 | 0.559 | 0.556 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.556 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000b76ab | 0.552 | 0.551 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.551 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000a5021 | 0.517 | 0.502 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.502 | 0.972 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000c6f88 | 0.511 | 0.510 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.510 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000a473d | 0.481 | 0.480 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.480 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| aa6a6569b4f81bc200000000000b6012 | 0.478 | 0.476 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.476 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000a15e1 | 0.453 | 0.451 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.451 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000b98c9 | 0.422 | 0.420 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.420 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000a679c | 0.405 | 0.404 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.404 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000009e387 | 0.399 | 0.396 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.396 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000009e6db | 0.371 | 0.369 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.369 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000b78e1 | 0.357 | 0.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.355 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000b76d0 | 0.356 | 0.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.355 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (175 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.916 | 0.001 |
| p99 | 0.892 | n/a | n/a | n/a | 0.890 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.890 | 0.998 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc200000000000c8dcb | 9.548 | 2.880 | n/a | 0.000 | 0.000 | 1.075 | 5.569 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.003 | 2.880 | 0.302 | 0.003 | gw-r/thread-72/gateway.admitted-work | none observed |
| aa6a6569b4f81bc200000000000dd763 | 0.892 | 0.890 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.890 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000e2445 | 0.717 | 0.695 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.695 | 0.969 | 0.022 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d7324 | 0.613 | 0.611 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.611 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000e269f | 0.596 | 0.595 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.595 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| aa6a6569b4f81bc200000000000d246b | 0.565 | 0.563 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.563 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000e8869 | 0.552 | 0.043 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.509 | 0.043 | 0.078 | 0.509 | uncovered | none observed |
| aa6a6569b4f81bc200000000000d7ed2 | 0.538 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.536 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d954f | 0.478 | 0.476 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.476 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000cbb68 | 0.456 | 0.453 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.453 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000ea93e | 0.431 | 0.429 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.429 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000ece30 | 0.426 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.425 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d89c6 | 0.426 | 0.424 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.424 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000cabc3 | 0.421 | 0.419 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.419 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d733c | 0.408 | 0.405 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.405 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000e673c | 0.407 | 0.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.406 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000e606a | 0.403 | 0.401 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.401 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d9735 | 0.398 | 0.396 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.396 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d947a | 0.388 | 0.386 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.386 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000d3666 | 0.369 | 0.367 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.367 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (183 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.920 | 0.001 |
| p99 | 1.722 | n/a | n/a | n/a | 1.517 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 1.517 | 0.998 | 0.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc200000000000ed2bc | 12.272 | 1.517 | n/a | 0.000 | 0.000 | 0.757 | 9.978 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.003 | 1.517 | 0.124 | 0.003 | gw-r/thread-74/gateway.admitted-work | none observed |
| aa6a6569b4f81bc2000000000010b0fc | 1.722 | 1.721 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.721 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f4285 | 0.673 | 0.671 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.671 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f752f | 0.625 | 0.624 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.624 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| aa6a6569b4f81bc200000000001078ec | 0.569 | 0.568 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.568 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000fa00c | 0.421 | 0.419 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.419 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000102cec | 0.416 | 0.413 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.413 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000010d8bb | 0.402 | 0.400 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.400 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc2000000000011093a | 0.401 | 0.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.395 | 0.985 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000001067e3 | 0.396 | 0.394 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.394 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000fca4f | 0.383 | 0.382 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.382 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f7c93 | 0.374 | 0.371 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.371 | 0.991 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f88a0 | 0.374 | 0.372 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.372 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000001065cf | 0.369 | 0.367 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.367 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000110944 | 0.362 | 0.360 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.360 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f9327 | 0.361 | 0.359 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.359 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f14b4 | 0.356 | 0.354 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.354 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc20000000000109467 | 0.355 | 0.353 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.353 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000000f924b | 0.355 | 0.354 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.354 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| aa6a6569b4f81bc200000000001112bf | 0.349 | 0.346 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.346 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.048 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.045 | 0.968 | 0.001 |
| p99 | 330.128 | n/a | n/a | n/a | 10.379 | n/a | 1.615 | 330.092 | 1.673 | 3.456 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.017 | 330.126 | 1.000 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aa6a6569b4f81bc20000000000121890 | 330.693 | 0.107 | n/a | 0.000 | 330.583 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.691 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.035ms; replica.apply-delta 0.034ms; replica.apply-delta 0.032ms; replica.apply-delta 0.032ms |
| e47dc123be6d434c000000000007239d | 330.137 | 0.038 | n/a | 0.000 | 330.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.135 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.296ms; replica.apply-delta 0.047ms; replica.apply-delta 0.031ms; replica.apply-delta 0.031ms; replica.apply-delta 0.030ms |
| e47dc123be6d434c000000000007239c | 330.128 | 0.034 | n/a | 0.000 | 330.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 330.126 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.296ms; replica.apply-delta 0.047ms; replica.apply-delta 0.031ms; replica.apply-delta 0.031ms; replica.apply-delta 0.030ms |
| aa6a6569b4f81bc200000000001218bd | 330.101 | 0.014 | n/a | 0.000 | 330.086 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.100 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.035ms; replica.apply-delta 0.034ms; replica.apply-delta 0.032ms; replica.apply-delta 0.032ms |
| e47dc123be6d434c000000000007239b | 330.091 | 0.162 | n/a | 0.000 | 329.924 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 330.085 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.296ms; replica.apply-delta 0.047ms; replica.apply-delta 0.031ms; replica.apply-delta 0.031ms; replica.apply-delta 0.030ms |
| aa6a6569b4f81bc200000000001218bc | 330.087 | 0.014 | n/a | 0.000 | 330.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.086 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.035ms; replica.apply-delta 0.034ms; replica.apply-delta 0.032ms; replica.apply-delta 0.032ms |
| aa6a6569b4f81bc200000000001218bb | 330.079 | 0.015 | n/a | 0.000 | 330.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.078 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.035ms; replica.apply-delta 0.034ms; replica.apply-delta 0.032ms; replica.apply-delta 0.032ms |
| aa6a6569b4f81bc200000000001218ba | 330.070 | 0.018 | n/a | 0.000 | 330.051 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.069 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.035ms; replica.apply-delta 0.034ms; replica.apply-delta 0.032ms; replica.apply-delta 0.032ms |
| aa6a6569b4f81bc200000000001218b9 | 330.054 | 0.031 | n/a | 0.000 | 330.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 330.053 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.035ms; replica.apply-delta 0.034ms; replica.apply-delta 0.032ms; replica.apply-delta 0.032ms |
| e47dc123be6d434c00000000000723a5 | 329.639 | 0.029 | n/a | 0.000 | 329.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.637 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.296ms; replica.apply-delta 0.047ms; replica.apply-delta 0.031ms; replica.apply-delta 0.031ms; replica.apply-delta 0.030ms |
| e47dc123be6d434c00000000000723a4 | 329.621 | 0.087 | n/a | 0.000 | 329.529 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 329.616 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.296ms; replica.apply-delta 0.047ms; replica.apply-delta 0.031ms; replica.apply-delta 0.031ms; replica.apply-delta 0.030ms |
| 3359171c3f80bbe800000000000751c5 | 328.530 | 0.013 | n/a | 0.000 | 328.516 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.530 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.032ms; replica.apply-delta 0.031ms; replica.apply-delta 0.029ms; replica.apply-delta 0.028ms |
| 3359171c3f80bbe800000000000751c3 | 328.530 | 0.051 | n/a | 0.000 | 328.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.529 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.032ms; replica.apply-delta 0.031ms; replica.apply-delta 0.029ms; replica.apply-delta 0.028ms |
| 3359171c3f80bbe800000000000751c4 | 328.518 | 0.015 | n/a | 0.000 | 328.502 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.518 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.032ms; replica.apply-delta 0.031ms; replica.apply-delta 0.029ms; replica.apply-delta 0.028ms |
| 3359171c3f80bbe800000000000751c2 | 328.498 | 0.019 | n/a | 0.000 | 328.479 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 328.497 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.032ms; replica.apply-delta 0.031ms; replica.apply-delta 0.029ms; replica.apply-delta 0.028ms |
| 3359171c3f80bbe800000000000751c1 | 328.481 | 0.095 | n/a | 0.000 | 328.381 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 328.477 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms; replica.apply-delta 0.032ms; replica.apply-delta 0.031ms; replica.apply-delta 0.029ms; replica.apply-delta 0.028ms |
| e47dc123be6d434c000000000006a12b | 273.928 | 0.044 | n/a | 0.000 | 273.882 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.927 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000119721 | 273.868 | 0.148 | n/a | 0.000 | 273.719 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.867 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| aa6a6569b4f81bc20000000000119722 | 273.865 | 0.034 | n/a | 0.000 | 273.829 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.863 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e47dc123be6d434c000000000006a12a | 273.847 | 0.181 | n/a | 0.000 | 273.663 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.844 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P5 / sweep / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.805 | n/a | n/a | n/a | 2.538 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 2.772 | 0.988 | 0.035 |
| p99 | 3.535 | n/a | n/a | n/a | 3.521 | n/a | 0.899 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.089 | 3.521 | 0.997 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1298c849349e118d0000000000000305 | 3.535 | 3.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.521 | 0.996 | 0.014 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000306 | 3.423 | 3.389 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 3.389 | 0.990 | 0.035 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000307 | 3.279 | 3.240 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 3.240 | 0.988 | 0.039 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000295 | 3.161 | 2.284 | n/a | 0.851 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 3.135 | 0.992 | 0.026 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000308 | 3.133 | 3.079 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.054 | 3.079 | 0.983 | 0.054 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000003 | 3.102 | 2.157 | n/a | 0.899 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 3.056 | 0.985 | 0.046 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000103 | 3.012 | 2.315 | n/a | 0.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 2.994 | 0.994 | 0.018 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000309 | 3.011 | 2.954 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 2.954 | 0.981 | 0.058 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000296 | 2.911 | 2.026 | n/a | 0.851 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 2.876 | 0.988 | 0.035 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d000000000000030a | 2.892 | 2.830 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 2.830 | 0.979 | 0.062 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000104 | 2.805 | 2.092 | n/a | 0.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 2.772 | 0.988 | 0.033 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d000000000000030b | 2.765 | 2.700 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.065 | 2.700 | 0.976 | 0.065 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000297 | 2.745 | 1.855 | n/a | 0.851 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 2.706 | 0.986 | 0.040 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d00000000000002e5 | 2.734 | 2.727 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 2.727 | 0.997 | 0.007 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d00000000000002e6 | 2.714 | 2.697 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.697 | 0.994 | 0.017 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d00000000000002e7 | 2.689 | 2.671 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 2.671 | 0.993 | 0.019 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000105 | 2.669 | 1.953 | n/a | 0.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 2.633 | 0.987 | 0.036 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d000000000000030c | 2.607 | 2.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.078 | 2.529 | 0.970 | 0.078 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d0000000000000298 | 2.600 | 1.661 | n/a | 0.851 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.089 | 2.511 | 0.966 | 0.089 | node-14/thread-6/replica.pull-at | none observed |
| 1298c849349e118d00000000000002e8 | 2.559 | 2.538 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 2.538 | 0.992 | 0.021 | node-14/thread-6/replica.pull-at | none observed |

## P3 / outside-phases / read (31 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.970 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 0.947 | 200.959 | 0.015 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.089 | 0.048 | 0.000 | 0.089 |
| p99 | 204.588 | n/a | n/a | n/a | 0.646 | n/a | 0.000 | 0.000 | 3.323 | 201.523 | 3.782 | 5.513 | 0.224 | 0.000 | n/a | n/a | 0.523 | 0.646 | 0.010 | 0.523 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000007 | 204.588 | 0.048 | n/a | 0.000 | 0.000 | 3.205 | 200.988 | 0.012 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.226 | 0.048 | 0.000 | 0.226 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d623000000000000005f | 204.537 | 0.048 | n/a | 0.000 | 0.000 | 3.323 | 200.959 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.075 | 0.048 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000c4 | 203.816 | 0.029 | n/a | 0.000 | 0.000 | 2.465 | 201.094 | 0.015 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.064 | 0.029 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000006 | 203.332 | 0.187 | n/a | 0.000 | 0.000 | 1.138 | 201.255 | 0.021 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.523 | 0.187 | 0.001 | 0.523 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000005c | 203.319 | 0.069 | n/a | 0.000 | 0.000 | 1.444 | 201.523 | 0.022 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.087 | 0.069 | 0.000 | 0.087 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000c6 | 203.222 | 0.097 | n/a | 0.000 | 0.000 | 1.279 | 201.466 | 0.043 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.146 | 0.097 | 0.000 | 0.146 | gw-r/thread-76/journal/page | none observed |
| 4252dd05cb35d623000000000000005a | 203.147 | 0.052 | n/a | 0.000 | 0.000 | 1.263 | 201.484 | 0.035 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.146 | 0.052 | 0.000 | 0.146 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000078 | 203.022 | 0.045 | n/a | 0.000 | 0.000 | 1.285 | 201.339 | 0.073 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.148 | 0.045 | 0.000 | 0.148 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d62300000000000000c8 | 202.623 | 0.040 | n/a | 0.000 | 0.000 | 1.079 | 201.171 | 0.034 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.131 | 0.040 | 0.000 | 0.131 | gw-r/thread-76/journal/page | none observed |
| 4252dd05cb35d6230000000000000077 | 202.460 | 0.049 | n/a | 0.000 | 0.000 | 0.743 | 201.336 | 0.048 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.125 | 0.049 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000009d | 202.395 | 0.043 | n/a | 0.000 | 0.000 | 1.015 | 201.060 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.156 | 0.043 | 0.000 | 0.156 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d623000000000000005d | 202.339 | 0.031 | n/a | 0.000 | 0.000 | 0.689 | 201.294 | 0.022 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.078 | 0.031 | 0.000 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d623000000000000007f | 202.332 | 0.041 | n/a | 0.000 | 0.000 | 0.648 | 200.988 | 0.450 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000c7 | 202.256 | 0.041 | n/a | 0.000 | 0.000 | 0.826 | 201.078 | 0.103 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.086 | 0.041 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000005 | 202.246 | 0.052 | n/a | 0.000 | 0.000 | 0.882 | 200.957 | 0.038 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.183 | 0.052 | 0.000 | 0.183 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d623000000000000009c | 201.970 | 0.042 | n/a | 0.000 | 0.000 | 0.831 | 200.909 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.086 | 0.042 | 0.000 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000059 | 201.941 | 0.038 | n/a | 0.000 | 0.000 | 0.664 | 201.040 | 0.015 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d62300000000000000a1 | 201.890 | 0.035 | n/a | 0.000 | 0.000 | 0.706 | 195.411 | 0.010 | 5.513 | 0.144 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d623000000000000007c | 201.884 | 0.042 | n/a | 0.000 | 0.000 | 0.788 | 200.831 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.121 | 0.042 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d62300000000000000c5 | 201.801 | 0.029 | n/a | 0.000 | 0.000 | 0.534 | 201.036 | 0.015 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.079 | 0.029 | 0.000 | 0.079 | gw-r/thread-54/journal/page | none observed |

## P3 / outside-phases / internal (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 486.809 | n/a | n/a | n/a | 2.136 | n/a | 0.000 | 0.000 | 0.776 | 482.803 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.109 | 2.136 | 0.008 | 0.109 |
| p99 | 1005.434 | n/a | n/a | n/a | 12.451 | n/a | 0.000 | 0.000 | 2.024 | 1002.139 | 0.547 | 11.231 | 0.485 | 0.000 | n/a | n/a | 1.364 | 12.451 | 0.512 | 1.364 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000018 | 1005.434 | 0.179 | n/a | 0.000 | 0.000 | 1.593 | 1002.139 | 0.054 | 0.000 | 0.347 | 0.000 | n/a | n/a | 1.121 | 0.179 | 0.000 | 1.121 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000017 | 1005.073 | 0.304 | n/a | 0.000 | 0.000 | 2.024 | 1000.876 | 0.020 | 0.000 | 0.485 | 0.000 | n/a | n/a | 1.364 | 0.304 | 0.000 | 1.364 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c5400000000000000052 | 1003.335 | 0.201 | n/a | 0.000 | 0.000 | 0.831 | 1001.018 | 0.018 | 0.000 | 0.106 | 0.000 | n/a | n/a | 1.160 | 0.201 | 0.000 | 1.160 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c5400000000000000081 | 1003.332 | 0.167 | n/a | 0.000 | 0.000 | 1.174 | 995.243 | 0.011 | 5.513 | 0.090 | 0.000 | n/a | n/a | 1.135 | 0.167 | 0.000 | 1.135 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c5400000000000000019 | 1002.791 | 0.132 | n/a | 0.000 | 0.000 | 0.776 | 989.469 | 0.010 | 11.231 | 0.072 | 0.000 | n/a | n/a | 1.100 | 0.132 | 0.000 | 1.100 | gw-r/thread-52/journal/page | none observed |
| 515504c05c10c5400000000000000098 | 1002.714 | 0.103 | n/a | 0.000 | 0.000 | 0.414 | 1000.937 | 0.015 | 0.000 | 0.108 | 0.000 | n/a | n/a | 1.137 | 0.103 | 0.000 | 1.137 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c540000000000000007e | 810.340 | 4.729 | n/a | 0.000 | 0.000 | 0.809 | 804.089 | 0.547 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.109 | 4.729 | 0.006 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c5400000000000000062 | 634.480 | 1.994 | n/a | 0.000 | 0.000 | 0.607 | 631.724 | 0.013 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.069 | 1.994 | 0.003 | 0.069 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c540000000000000005e | 619.489 | 6.525 | n/a | 0.000 | 0.000 | 0.667 | 611.673 | 0.427 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.109 | 6.525 | 0.011 | 0.109 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c540000000000000004f | 532.984 | 4.490 | n/a | 0.000 | 0.000 | 0.901 | 527.386 | 0.012 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.106 | 4.490 | 0.008 | 0.106 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c5400000000000000050 | 486.809 | 2.916 | n/a | 0.000 | 0.000 | 0.894 | 482.803 | 0.012 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.089 | 2.916 | 0.006 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000065 | 232.487 | 3.031 | n/a | 0.000 | 0.000 | 0.637 | 228.572 | 0.053 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.109 | 3.031 | 0.013 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c540000000000000007f | 185.496 | 4.416 | n/a | 0.000 | 0.000 | 0.819 | 179.858 | 0.251 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.077 | 4.416 | 0.024 | 0.077 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c5400000000000000063 | 168.838 | 12.451 | n/a | 0.000 | 0.000 | 0.774 | 155.214 | 0.137 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.165 | 12.451 | 0.074 | 0.165 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c540000000000000007d | 103.719 | 3.521 | n/a | 0.000 | 0.000 | 0.857 | 99.232 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.062 | 3.521 | 0.034 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 515504c05c10c540000000000000005d | 30.219 | 5.799 | n/a | 0.000 | 0.000 | 0.879 | 23.291 | 0.015 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.176 | 5.799 | 0.192 | 0.176 | gw-r/thread-52/journal/page | none observed |
| 515504c05c10c5400000000000000061 | 15.722 | 2.136 | n/a | 0.000 | 0.000 | 0.566 | 12.828 | 0.095 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.064 | 2.136 | 0.136 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000094 | 12.523 | 2.438 | n/a | 0.000 | 0.000 | 0.495 | 9.358 | 0.004 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.159 | 2.438 | 0.195 | 0.159 | gw-r/thread-52/gateway.admitted-work | none observed |
| 515504c05c10c5400000000000000095 | 6.628 | 2.015 | n/a | 0.000 | 0.000 | 0.678 | 3.862 | 0.008 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.057 | 2.015 | 0.304 | 0.057 | gw-r/thread-72/gateway.admitted-work | none observed |
| 515504c05c10c5400000000000000097 | 3.452 | 1.767 | n/a | 0.000 | 0.000 | 0.399 | 1.231 | 0.007 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.039 | 1.767 | 0.512 | 0.039 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 138.951 | n/a | n/a | n/a | 3.262 | n/a | 0.000 | 0.000 | 0.973 | 134.448 | 0.019 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.158 | 3.262 | 0.010 | 0.158 |
| p99 | 853.845 | n/a | n/a | n/a | 44.947 | n/a | 0.630 | 0.000 | 4.447 | 847.322 | 0.387 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.310 | 45.577 | 0.348 | 0.310 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000001d | 853.845 | 2.542 | n/a | 0.000 | 0.000 | 3.688 | 847.322 | 0.019 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.163 | 2.542 | 0.003 | 0.163 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c540000000000000001c | 315.724 | 3.262 | n/a | 0.000 | 0.000 | 4.447 | 307.615 | 0.089 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.158 | 3.262 | 0.010 | 0.158 | gw-r/thread-52/journal/page | none observed |
| 515504c05c10c540000000000000001f | 138.951 | 3.307 | n/a | 0.000 | 0.000 | 0.973 | 134.448 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.152 | 3.307 | 0.024 | 0.152 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c540000000000000001a | 131.154 | 44.947 | n/a | 0.630 | 0.000 | 0.955 | 83.790 | 0.387 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.310 | 45.577 | 0.348 | 0.310 | gw-r/thread-72/journal/page | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 863.722 | n/a | n/a | n/a | 2.424 | n/a | 0.000 | 0.000 | 0.785 | 859.390 | 0.014 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.095 | 2.424 | 0.003 | 0.095 |
| p99 | 996.774 | n/a | n/a | n/a | 3.024 | n/a | 0.000 | 0.000 | 1.326 | 993.375 | 0.488 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.133 | 3.024 | 0.024 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000023 | 996.774 | 2.424 | n/a | 0.000 | 0.000 | 0.785 | 993.375 | 0.014 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.095 | 2.424 | 0.002 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c5400000000000000020 | 863.722 | 2.327 | n/a | 0.000 | 0.000 | 1.326 | 859.390 | 0.488 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.092 | 2.327 | 0.003 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c5400000000000000021 | 123.953 | 3.024 | n/a | 0.000 | 0.000 | 0.573 | 120.124 | 0.012 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.133 | 3.024 | 0.024 | 0.133 | gw-r/thread-72/journal/page | none observed |

## P3 / L1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 301.749 | n/a | n/a | n/a | 3.914 | n/a | 0.000 | 0.000 | 0.805 | 297.135 | 0.032 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.129 | 3.914 | 0.007 | 0.129 |
| p99 | 993.492 | n/a | n/a | n/a | 4.783 | n/a | 0.000 | 0.000 | 2.536 | 987.643 | 0.043 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.200 | 4.783 | 0.048 | 0.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000029 | 993.492 | 4.711 | n/a | 0.000 | 0.000 | 0.805 | 987.643 | 0.033 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.160 | 4.711 | 0.005 | 0.160 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000027 | 642.969 | 4.783 | n/a | 0.000 | 0.000 | 0.961 | 636.843 | 0.032 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.200 | 4.783 | 0.007 | 0.200 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c5400000000000000025 | 301.749 | 3.914 | n/a | 0.000 | 0.000 | 0.455 | 297.135 | 0.043 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.083 | 3.914 | 0.013 | 0.083 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c5400000000000000024 | 67.351 | 3.219 | n/a | 0.000 | 0.000 | 2.536 | 61.336 | 0.013 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.129 | 3.219 | 0.048 | 0.129 | gw-r/thread-72/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 359.710 | n/a | n/a | n/a | 5.006 | n/a | 0.000 | 0.000 | 0.827 | 355.762 | 0.013 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.084 | 5.006 | 0.012 | 0.084 |
| p99 | 963.756 | n/a | n/a | n/a | 16.958 | n/a | 0.000 | 0.000 | 0.977 | 945.505 | 0.026 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.151 | 16.958 | 0.019 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000002f | 963.756 | 16.958 | n/a | 0.000 | 0.000 | 0.977 | 945.505 | 0.026 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.151 | 16.958 | 0.018 | 0.151 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c540000000000000002b | 444.802 | 5.405 | n/a | 0.000 | 0.000 | 0.952 | 438.228 | 0.020 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.083 | 5.405 | 0.012 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c540000000000000002d | 359.710 | 2.905 | n/a | 0.000 | 0.000 | 0.827 | 355.762 | 0.013 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.091 | 2.905 | 0.008 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c540000000000000002a | 260.653 | 5.006 | n/a | 0.000 | 0.000 | 0.774 | 254.686 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.084 | 5.006 | 0.019 | 0.084 | gw-r/thread-54/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 370.521 | n/a | n/a | n/a | 2.621 | n/a | 0.000 | 0.000 | 0.828 | 366.279 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.088 | 2.621 | 0.009 | 0.088 |
| p99 | 977.201 | n/a | n/a | n/a | 7.686 | n/a | 0.000 | 0.000 | 2.139 | 973.556 | 0.052 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.131 | 7.686 | 0.022 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000030 | 977.201 | 2.621 | n/a | 0.000 | 0.000 | 0.828 | 973.556 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.088 | 2.621 | 0.003 | 0.088 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c5400000000000000034 | 648.277 | 7.686 | n/a | 0.000 | 0.000 | 2.139 | 638.243 | 0.022 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.101 | 7.686 | 0.012 | 0.101 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c5400000000000000031 | 370.521 | 3.245 | n/a | 0.000 | 0.000 | 0.726 | 366.279 | 0.052 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.131 | 3.245 | 0.009 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000033 | 80.777 | 1.802 | n/a | 0.000 | 0.000 | 1.258 | 77.531 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.087 | 1.802 | 0.022 | 0.087 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 443.398 | n/a | n/a | n/a | 2.340 | n/a | 0.000 | 0.000 | 0.941 | 440.314 | 0.018 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.101 | 2.340 | 0.007 | 0.101 |
| p99 | 724.198 | n/a | n/a | n/a | 9.196 | n/a | 0.000 | 0.000 | 1.976 | 713.122 | 0.035 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.141 | 9.196 | 0.013 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000036 | 724.198 | 9.196 | n/a | 0.000 | 0.000 | 1.613 | 713.122 | 0.017 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.141 | 9.196 | 0.013 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c540000000000000003b | 599.580 | 4.352 | n/a | 0.000 | 0.000 | 1.976 | 592.946 | 0.022 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.132 | 4.352 | 0.007 | 0.132 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c5400000000000000039 | 443.398 | 2.243 | n/a | 0.000 | 0.000 | 0.564 | 440.314 | 0.035 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.101 | 2.243 | 0.005 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c5400000000000000038 | 206.438 | 2.340 | n/a | 0.000 | 0.000 | 0.941 | 202.952 | 0.018 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.085 | 2.340 | 0.011 | 0.085 | gw-r/thread-55/journal/page | none observed |

## P3 / L256 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 348.254 | n/a | n/a | n/a | 2.480 | n/a | 0.000 | 0.000 | 0.913 | 341.150 | 0.022 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.085 | 2.480 | 0.004 | 0.085 |
| p99 | 655.493 | n/a | n/a | n/a | 15.939 | n/a | 0.000 | 0.000 | 1.082 | 651.907 | 0.194 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.190 | 15.939 | 0.046 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000003f | 655.493 | 2.480 | n/a | 0.000 | 0.000 | 0.711 | 651.907 | 0.194 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.096 | 2.480 | 0.004 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c540000000000000003e | 606.690 | 2.494 | n/a | 0.000 | 0.000 | 0.922 | 603.021 | 0.022 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.079 | 2.494 | 0.004 | 0.079 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c5400000000000000040 | 348.254 | 15.939 | n/a | 0.000 | 0.000 | 1.082 | 330.927 | 0.012 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.190 | 15.939 | 0.046 | 0.190 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c540000000000000003c | 344.627 | 2.171 | n/a | 0.000 | 0.000 | 0.913 | 341.150 | 0.155 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.085 | 2.171 | 0.006 | 0.085 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.134 | n/a | n/a | n/a | 2.162 | n/a | 0.000 | 0.000 | 0.921 | 42.725 | 0.016 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.093 | 2.162 | 0.003 | 0.093 |
| p99 | 1002.948 | n/a | n/a | n/a | 2.791 | n/a | 0.000 | 0.000 | 1.127 | 1000.935 | 0.021 | 0.000 | 0.123 | 0.000 | n/a | n/a | 1.122 | 2.791 | 0.275 | 1.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000044 | 1002.948 | 0.140 | n/a | 0.000 | 0.000 | 0.612 | 1000.935 | 0.016 | 0.000 | 0.123 | 0.000 | n/a | n/a | 1.122 | 0.140 | 0.000 | 1.122 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c5400000000000000046 | 941.617 | 2.791 | n/a | 0.000 | 0.000 | 0.998 | 937.609 | 0.021 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.093 | 2.791 | 0.003 | 0.093 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c5400000000000000045 | 46.134 | 2.162 | n/a | 0.000 | 0.000 | 1.127 | 42.725 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.073 | 2.162 | 0.047 | 0.073 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c5400000000000000043 | 8.880 | 2.441 | n/a | 0.000 | 0.000 | 0.921 | 5.377 | 0.018 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.098 | 2.441 | 0.275 | 0.098 | gw-r/thread-54/gateway.admitted-work | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 411.041 | n/a | n/a | n/a | 2.762 | n/a | 0.000 | 0.000 | 0.900 | 386.036 | 0.013 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.079 | 2.762 | 0.006 | 0.079 |
| p99 | 989.792 | n/a | n/a | n/a | 3.144 | n/a | 0.000 | 0.000 | 2.619 | 985.658 | 0.023 | 18.920 | 0.178 | 0.000 | n/a | n/a | 0.131 | 3.144 | 0.023 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000047 | 989.792 | 2.870 | n/a | 0.000 | 0.000 | 1.010 | 985.658 | 0.023 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.097 | 2.870 | 0.003 | 0.097 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c5400000000000000048 | 484.518 | 2.762 | n/a | 0.000 | 0.000 | 0.900 | 480.643 | 0.013 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.076 | 2.762 | 0.006 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c540000000000000004a | 411.041 | 3.144 | n/a | 0.000 | 0.000 | 2.619 | 386.036 | 0.015 | 18.920 | 0.178 | 0.000 | n/a | n/a | 0.131 | 3.144 | 0.008 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c540000000000000004c | 99.410 | 2.240 | n/a | 0.000 | 0.000 | 0.521 | 96.531 | 0.009 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.079 | 2.240 | 0.023 | 0.079 | gw-r/thread-48/journal/page | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 986.834 | n/a | n/a | n/a | 2.183 | n/a | 0.000 | 0.000 | 0.545 | 983.279 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.082 | 2.183 | 0.002 | 0.082 |
| p99 | 991.391 | n/a | n/a | n/a | 2.794 | n/a | 0.000 | 0.000 | 0.954 | 988.055 | 0.012 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.137 | 2.794 | 0.003 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000004e | 991.391 | 2.183 | n/a | 0.000 | 0.000 | 0.954 | 988.055 | 0.012 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.082 | 2.183 | 0.002 | 0.082 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c540000000000000004d | 986.834 | 2.794 | n/a | 0.000 | 0.000 | 0.545 | 983.279 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.137 | 2.794 | 0.003 | 0.137 | gw-r/thread-52/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 840.292 | n/a | n/a | n/a | 4.040 | n/a | 0.000 | 0.000 | 0.627 | 833.035 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.122 | 4.040 | 0.007 | 0.122 |
| p99 | 937.082 | n/a | n/a | n/a | 6.255 | n/a | 0.000 | 0.000 | 0.899 | 931.893 | 0.017 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.312 | 6.255 | 0.051 | 0.312 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000054 | 937.082 | 4.040 | n/a | 0.000 | 0.000 | 0.899 | 931.893 | 0.017 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.122 | 4.040 | 0.004 | 0.122 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c5400000000000000055 | 840.292 | 6.255 | n/a | 0.000 | 0.000 | 0.612 | 833.035 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.312 | 6.255 | 0.007 | 0.312 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c5400000000000000053 | 42.211 | 2.142 | n/a | 0.000 | 0.000 | 0.627 | 39.317 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.082 | 2.142 | 0.051 | 0.082 | gw-r/thread-54/journal/page | none observed |

## P3 / grow3 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 176.212 | n/a | n/a | n/a | 3.615 | n/a | 0.000 | 0.000 | 0.811 | 165.112 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.087 | 3.615 | 0.123 | 0.087 |
| p99 | 962.464 | n/a | n/a | n/a | 110.614 | n/a | 7.596 | 0.000 | 0.874 | 799.155 | 0.292 | 41.481 | 0.098 | 0.000 | n/a | n/a | 2.746 | 118.210 | 0.568 | 2.746 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000005a | 962.464 | 110.614 | n/a | 7.596 | 0.000 | 0.810 | 799.155 | 0.011 | 41.481 | 0.052 | 0.000 | n/a | n/a | 2.746 | 118.210 | 0.123 | 2.746 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c5400000000000000058 | 242.530 | 1.857 | n/a | 0.000 | 0.000 | 0.874 | 239.330 | 0.292 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.080 | 1.857 | 0.008 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c540000000000000005c | 176.212 | 82.615 | n/a | 2.918 | 0.000 | 0.638 | 87.645 | 0.009 | 0.000 | 0.031 | 0.000 | n/a | n/a | 2.357 | 85.533 | 0.485 | 2.357 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c5400000000000000057 | 169.718 | 3.615 | n/a | 0.000 | 0.000 | 0.865 | 165.112 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.087 | 3.615 | 0.021 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c540000000000000005b | 4.260 | 2.420 | n/a | 0.000 | 0.000 | 0.811 | 0.941 | 0.007 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.066 | 2.420 | 0.568 | 0.066 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 253.368 | n/a | n/a | n/a | 3.592 | n/a | 0.000 | 0.000 | 0.684 | 250.457 | 0.083 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.076 | 3.592 | 0.018 | 0.076 |
| p99 | 928.127 | n/a | n/a | n/a | 89.034 | n/a | 2.880 | 0.000 | 1.292 | 795.066 | 3.148 | 38.161 | 0.134 | 0.000 | n/a | n/a | 1.579 | 91.914 | 0.099 | 1.579 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000075 | 928.127 | 89.034 | n/a | 2.880 | 0.000 | 1.292 | 795.066 | 0.008 | 38.161 | 0.106 | 0.000 | n/a | n/a | 1.579 | 91.914 | 0.099 | 1.579 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c5400000000000000072 | 610.364 | 4.723 | n/a | 0.000 | 0.000 | 0.936 | 604.521 | 0.011 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.064 | 4.723 | 0.008 | 0.064 | gw-r/thread-55/journal/page | none observed |
| 515504c05c10c5400000000000000074 | 376.884 | 3.211 | n/a | 0.000 | 0.000 | 1.021 | 372.400 | 0.015 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.103 | 3.211 | 0.009 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 515504c05c10c5400000000000000069 | 291.244 | 3.820 | n/a | 0.000 | 0.000 | 0.645 | 286.477 | 0.099 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.133 | 3.820 | 0.013 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c540000000000000006a | 253.368 | 1.977 | n/a | 0.000 | 0.000 | 0.684 | 250.457 | 0.125 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.067 | 1.977 | 0.008 | 0.067 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c5400000000000000067 | 233.070 | 4.135 | n/a | 0.000 | 0.000 | 0.625 | 228.117 | 0.045 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.069 | 4.135 | 0.018 | 0.069 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c540000000000000006e | 59.896 | 2.729 | n/a | 0.000 | 0.000 | 0.571 | 53.330 | 3.148 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.076 | 2.729 | 0.046 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000071 | 57.240 | 3.592 | n/a | 0.000 | 0.000 | 0.704 | 52.692 | 0.083 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.100 | 3.592 | 0.063 | 0.100 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c540000000000000006c | 24.241 | 2.334 | n/a | 0.000 | 0.000 | 0.572 | 20.661 | 0.551 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.064 | 2.334 | 0.096 | 0.064 | gw-r/thread-72/journal/page | none observed |

## P3 / grow10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 111.418 | n/a | n/a | n/a | 81.890 | n/a | 3.431 | 0.000 | 1.098 | 17.844 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.445 | 88.047 | 0.740 | 1.445 |
| p99 | 357.191 | n/a | n/a | n/a | 96.351 | n/a | 12.862 | 0.000 | 12.925 | 251.918 | 0.721 | 0.000 | 0.093 | 0.000 | n/a | n/a | 2.264 | 102.990 | 0.861 | 2.264 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000079 | 357.191 | 86.855 | n/a | 3.128 | 0.000 | 12.925 | 251.918 | 0.011 | 0.000 | 0.091 | 0.000 | n/a | n/a | 2.264 | 89.983 | 0.252 | 2.264 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c540000000000000007b | 199.515 | 96.351 | n/a | 6.639 | 0.000 | 1.420 | 93.018 | 0.721 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.309 | 102.990 | 0.516 | 1.309 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c540000000000000007a | 119.033 | 81.890 | n/a | 6.157 | 0.000 | 1.659 | 27.895 | 0.109 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.283 | 88.047 | 0.740 | 1.283 | node-14/thread-2/replica.fetch-feed | none observed |
| 515504c05c10c5400000000000000077 | 111.418 | 91.036 | n/a | 3.344 | 0.000 | 1.098 | 14.233 | 0.008 | 0.000 | 0.013 | 0.000 | n/a | n/a | 1.686 | 94.380 | 0.847 | 1.686 | node-14/thread-2/replica.fetch-feed | none observed |
| 515504c05c10c540000000000000007c | 105.328 | 81.459 | n/a | 3.431 | 0.000 | 0.873 | 17.844 | 0.005 | 0.000 | 0.093 | 0.000 | n/a | n/a | 1.622 | 84.890 | 0.806 | 1.622 | node-14/thread-2/replica.fetch-feed | none observed |
| 515504c05c10c5400000000000000076 | 100.337 | 73.555 | n/a | 12.862 | 0.000 | 0.834 | 11.617 | 0.008 | 0.000 | 0.015 | 0.000 | n/a | n/a | 1.445 | 86.417 | 0.861 | 1.445 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 182.243 | n/a | n/a | n/a | 2.431 | n/a | 0.000 | 0.000 | 0.684 | 176.591 | 0.016 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.077 | 2.431 | 0.019 | 0.077 |
| p99 | 1007.328 | n/a | n/a | n/a | 8.634 | n/a | 0.000 | 0.000 | 1.448 | 1003.015 | 1.936 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.152 | 8.634 | 0.634 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000008a | 1007.328 | 2.323 | n/a | 0.000 | 0.000 | 1.448 | 1003.015 | 0.297 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.057 | 2.323 | 0.002 | 0.057 | gw-r/thread-52/journal/page | none observed |
| 515504c05c10c5400000000000000085 | 455.604 | 8.634 | n/a | 0.000 | 0.000 | 0.613 | 446.107 | 0.020 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.152 | 8.634 | 0.019 | 0.152 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c5400000000000000083 | 328.344 | 3.550 | n/a | 0.000 | 0.000 | 1.331 | 323.318 | 0.016 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.059 | 3.550 | 0.011 | 0.059 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c5400000000000000088 | 182.243 | 4.695 | n/a | 0.000 | 0.000 | 0.768 | 176.591 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.108 | 4.695 | 0.026 | 0.108 | gw-r/thread-52/journal/page | none observed |
| 515504c05c10c5400000000000000082 | 31.494 | 2.431 | n/a | 0.000 | 0.000 | 0.684 | 26.307 | 1.936 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.077 | 2.431 | 0.077 | 0.077 | gw-r/thread-72/journal/page | none observed |
| 515504c05c10c5400000000000000087 | 3.183 | 2.018 | n/a | 0.000 | 0.000 | 0.405 | 0.635 | 0.007 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.109 | 2.018 | 0.634 | 0.109 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 677.702 | n/a | n/a | n/a | 4.025 | n/a | 0.000 | 0.000 | 2.605 | 669.576 | 0.013 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.104 | 4.025 | 0.008 | 0.104 |
| p99 | 802.254 | n/a | n/a | n/a | 5.136 | n/a | 0.000 | 0.000 | 2.865 | 799.704 | 0.023 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.246 | 5.136 | 0.013 | 0.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c540000000000000008e | 802.254 | 1.666 | n/a | 0.000 | 0.000 | 0.697 | 799.704 | 0.011 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.059 | 1.666 | 0.002 | 0.059 | gw-r/thread-74/journal/page | none observed |
| 515504c05c10c540000000000000008b | 677.702 | 5.136 | n/a | 0.000 | 0.000 | 2.605 | 669.576 | 0.023 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.246 | 5.136 | 0.008 | 0.246 | gw-r/thread-54/journal/page | none observed |
| 515504c05c10c540000000000000008c | 311.963 | 4.025 | n/a | 0.000 | 0.000 | 2.865 | 304.875 | 0.013 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.104 | 4.025 | 0.013 | 0.104 | gw-r/thread-53/journal/page | none observed |

## P3 / sweep / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.047 | n/a | n/a | n/a | 1.949 | n/a | 0.000 | 0.000 | 0.654 | 8.661 | 0.011 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.064 | 1.949 | 0.191 | 0.064 |
| p99 | 20.047 | n/a | n/a | n/a | 3.354 | n/a | 0.000 | 0.000 | 0.857 | 16.085 | 0.142 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.090 | 3.354 | 0.256 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 515504c05c10c5400000000000000091 | 20.047 | 3.354 | n/a | 0.000 | 0.000 | 0.857 | 15.690 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.078 | 3.354 | 0.167 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 515504c05c10c5400000000000000090 | 18.622 | 1.752 | n/a | 0.000 | 0.000 | 0.654 | 16.085 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.056 | 1.752 | 0.094 | 0.056 | gw-r/thread-51/journal/page | none observed |
| 515504c05c10c5400000000000000092 | 13.047 | 3.337 | n/a | 0.000 | 0.000 | 0.793 | 8.661 | 0.142 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.090 | 3.337 | 0.256 | 0.090 | gw-r/thread-72/gateway.admitted-work | none observed |
| 515504c05c10c540000000000000008f | 10.041 | 1.949 | n/a | 0.000 | 0.000 | 0.620 | 7.356 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.054 | 1.949 | 0.194 | 0.054 | gw-r/thread-53/journal/page | none observed |
| 515504c05c10c5400000000000000093 | 8.914 | 1.701 | n/a | 0.000 | 0.000 | 0.581 | 6.500 | 0.028 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.064 | 1.701 | 0.191 | 0.064 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.398 | n/a | n/a | n/a | 0.037 | n/a | 0.000 | 0.000 | 1.183 | 190.251 | 0.021 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.077 | 0.037 | 0.000 | 0.077 |
| p99 | 205.626 | n/a | n/a | n/a | 0.209 | n/a | 0.000 | 0.000 | 4.115 | 201.384 | 2.171 | 11.231 | 0.310 | 0.000 | n/a | n/a | 0.457 | 0.209 | 0.002 | 0.457 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d623000000000000000b | 205.626 | 0.036 | n/a | 0.000 | 0.000 | 4.115 | 201.212 | 0.014 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d6230000000000000008 | 205.504 | 0.047 | n/a | 0.000 | 0.000 | 3.677 | 190.251 | 0.021 | 11.231 | 0.130 | 0.000 | n/a | n/a | 0.147 | 0.047 | 0.000 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000009 | 204.544 | 0.057 | n/a | 0.000 | 0.000 | 2.347 | 201.335 | 0.039 | 0.000 | 0.310 | 0.000 | n/a | n/a | 0.457 | 0.057 | 0.000 | 0.457 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d623000000000000000e | 203.132 | 0.034 | n/a | 0.000 | 0.000 | 1.510 | 201.229 | 0.117 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d623000000000000000d | 202.502 | 0.034 | n/a | 0.000 | 0.000 | 0.834 | 201.384 | 0.021 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.060 | 0.034 | 0.000 | 0.060 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d623000000000000000f | 202.398 | 0.033 | n/a | 0.000 | 0.000 | 1.008 | 201.115 | 0.014 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.083 | 0.033 | 0.000 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000010 | 170.186 | 0.037 | n/a | 0.000 | 0.000 | 1.645 | 167.661 | 0.716 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.064 | 0.037 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000011 | 136.438 | 0.048 | n/a | 0.000 | 0.000 | 0.907 | 135.291 | 0.012 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.073 | 0.048 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d623000000000000000a | 91.407 | 0.209 | n/a | 0.000 | 0.000 | 1.183 | 89.491 | 0.030 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.260 | 0.209 | 0.002 | 0.260 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d623000000000000000c | 86.010 | 0.052 | n/a | 0.000 | 0.000 | 0.999 | 82.650 | 2.171 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.079 | 0.052 | 0.001 | 0.079 | gw-r/thread-53/journal/page | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.025 | n/a | n/a | n/a | 0.032 | n/a | 0.000 | 0.000 | 0.902 | 200.933 | 0.012 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 |
| p99 | 202.382 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 1.156 | 201.118 | 0.021 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.112 | 0.045 | 0.000 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000013 | 202.382 | 0.043 | n/a | 0.000 | 0.000 | 1.156 | 200.933 | 0.013 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.112 | 0.043 | 0.000 | 0.112 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000012 | 202.210 | 0.032 | n/a | 0.000 | 0.000 | 0.902 | 201.015 | 0.012 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d6230000000000000014 | 202.025 | 0.031 | n/a | 0.000 | 0.000 | 0.616 | 201.118 | 0.021 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d6230000000000000015 | 193.926 | 0.045 | n/a | 0.000 | 0.000 | 0.931 | 192.772 | 0.011 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.072 | 0.045 | 0.000 | 0.072 | gw-r/thread-72/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 179.582 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 0.931 | 166.658 | 0.034 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.081 | 0.050 | 0.000 | 0.081 |
| p99 | 204.910 | n/a | n/a | n/a | 0.060 | n/a | 0.000 | 0.000 | 1.116 | 203.602 | 11.578 | 0.000 | 0.695 | 0.000 | n/a | n/a | 0.129 | 0.060 | 0.001 | 0.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000021 | 204.910 | 0.051 | n/a | 0.000 | 0.000 | 0.963 | 203.602 | 0.018 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.129 | 0.051 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000022 | 203.912 | 0.034 | n/a | 0.000 | 0.000 | 0.931 | 202.138 | 0.034 | 0.000 | 0.695 | 0.000 | n/a | n/a | 0.081 | 0.034 | 0.000 | 0.081 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000023 | 179.582 | 0.050 | n/a | 0.000 | 0.000 | 1.116 | 166.658 | 11.578 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.076 | 0.050 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000001f | 103.785 | 0.060 | n/a | 0.000 | 0.000 | 0.814 | 93.041 | 9.716 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.105 | 0.060 | 0.001 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d6230000000000000020 | 75.503 | 0.048 | n/a | 0.000 | 0.000 | 0.671 | 74.594 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.081 | 0.048 | 0.001 | 0.081 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.058 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.971 | 201.633 | 0.059 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.090 | 0.043 | 0.000 | 0.090 |
| p99 | 213.819 | n/a | n/a | n/a | 0.190 | n/a | 0.000 | 0.000 | 4.767 | 212.156 | 10.966 | 0.000 | 0.344 | 0.000 | n/a | n/a | 0.147 | 0.190 | 0.001 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d623000000000000002c | 213.819 | 0.089 | n/a | 0.000 | 0.000 | 1.183 | 212.156 | 0.134 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.090 | 0.089 | 0.000 | 0.090 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000029 | 204.983 | 0.041 | n/a | 0.000 | 0.000 | 0.725 | 203.719 | 0.069 | 0.000 | 0.344 | 0.000 | n/a | n/a | 0.085 | 0.041 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d6230000000000000024 | 204.054 | 0.150 | n/a | 0.000 | 0.000 | 1.822 | 201.717 | 0.059 | 0.000 | 0.235 | 0.000 | n/a | n/a | 0.072 | 0.150 | 0.001 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000026 | 203.463 | 0.043 | n/a | 0.000 | 0.000 | 0.926 | 202.074 | 0.060 | 0.000 | 0.267 | 0.000 | n/a | n/a | 0.093 | 0.043 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000025 | 203.058 | 0.190 | n/a | 0.000 | 0.000 | 1.338 | 201.195 | 0.025 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.147 | 0.190 | 0.001 | 0.147 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d623000000000000002a | 202.698 | 0.037 | n/a | 0.000 | 0.000 | 0.722 | 201.633 | 0.027 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.105 | 0.037 | 0.000 | 0.105 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d623000000000000002d | 202.305 | 0.042 | n/a | 0.000 | 0.000 | 0.872 | 201.091 | 0.029 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.125 | 0.042 | 0.000 | 0.125 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d6230000000000000028 | 197.548 | 0.054 | n/a | 0.000 | 0.000 | 0.971 | 196.319 | 0.017 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.072 | 0.054 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d623000000000000002e | 132.428 | 0.041 | n/a | 0.000 | 0.000 | 4.767 | 116.534 | 10.966 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.990 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.842 | 201.018 | 0.023 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.096 | 0.043 | 0.000 | 0.096 |
| p99 | 206.761 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 3.724 | 205.762 | 13.991 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.139 | 0.069 | 0.001 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000037 | 206.761 | 0.033 | n/a | 0.000 | 0.000 | 0.754 | 205.762 | 0.023 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d6230000000000000034 | 202.930 | 0.040 | n/a | 0.000 | 0.000 | 0.791 | 201.806 | 0.019 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.079 | 0.040 | 0.000 | 0.079 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d623000000000000002f | 202.833 | 0.043 | n/a | 0.000 | 0.000 | 1.096 | 201.388 | 0.013 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.111 | 0.043 | 0.000 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000035 | 202.448 | 0.031 | n/a | 0.000 | 0.000 | 0.748 | 201.321 | 0.149 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000032 | 202.235 | 0.054 | n/a | 0.000 | 0.000 | 0.842 | 201.041 | 0.025 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.139 | 0.054 | 0.000 | 0.139 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000031 | 201.990 | 0.036 | n/a | 0.000 | 0.000 | 0.701 | 201.018 | 0.024 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000036 | 197.570 | 0.069 | n/a | 0.000 | 0.000 | 1.129 | 196.184 | 0.012 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.115 | 0.069 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d6230000000000000033 | 166.819 | 0.057 | n/a | 0.000 | 0.000 | 3.724 | 156.300 | 6.448 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.096 | 0.057 | 0.000 | 0.096 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000030 | 111.963 | 0.065 | n/a | 0.000 | 0.000 | 0.855 | 110.812 | 0.021 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.116 | 0.065 | 0.001 | 0.116 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000038 | 106.561 | 0.052 | n/a | 0.000 | 0.000 | 3.188 | 89.192 | 13.991 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.105 | 0.052 | 0.000 | 0.105 | gw-r/thread-55/journal/page | none observed |

## P3 / L1024 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.366 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.917 | 201.149 | 0.020 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.090 | 0.040 | 0.000 | 0.090 |
| p99 | 202.834 | n/a | n/a | n/a | 0.070 | n/a | 0.000 | 0.000 | 1.526 | 201.631 | 0.063 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.136 | 0.070 | 0.000 | 0.136 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d623000000000000003f | 202.834 | 0.036 | n/a | 0.000 | 0.000 | 0.892 | 201.631 | 0.063 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.074 | 0.036 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000040 | 202.740 | 0.040 | n/a | 0.000 | 0.000 | 1.226 | 201.225 | 0.015 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.093 | 0.040 | 0.000 | 0.093 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d623000000000000003d | 202.677 | 0.040 | n/a | 0.000 | 0.000 | 0.890 | 201.425 | 0.020 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.088 | 0.040 | 0.000 | 0.088 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000041 | 202.668 | 0.070 | n/a | 0.000 | 0.000 | 0.917 | 201.363 | 0.028 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.136 | 0.070 | 0.000 | 0.136 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000003c | 202.366 | 0.059 | n/a | 0.000 | 0.000 | 0.919 | 201.149 | 0.016 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.090 | 0.059 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000003a | 202.299 | 0.040 | n/a | 0.000 | 0.000 | 0.860 | 201.133 | 0.020 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.094 | 0.040 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d623000000000000003b | 202.298 | 0.033 | n/a | 0.000 | 0.000 | 0.923 | 201.088 | 0.020 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.084 | 0.033 | 0.000 | 0.084 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000042 | 202.067 | 0.041 | n/a | 0.000 | 0.000 | 0.842 | 200.940 | 0.014 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.106 | 0.041 | 0.000 | 0.106 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d623000000000000003e | 147.553 | 0.057 | n/a | 0.000 | 0.000 | 1.526 | 145.815 | 0.016 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.071 | 0.057 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.201 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.808 | 200.955 | 0.019 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.091 | 0.046 | 0.000 | 0.091 |
| p99 | 203.463 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 1.384 | 202.420 | 3.465 | 18.920 | 0.185 | 0.000 | n/a | n/a | 0.130 | 0.058 | 0.001 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000049 | 203.463 | 0.046 | n/a | 0.000 | 0.000 | 0.808 | 202.420 | 0.012 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.072 | 0.046 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000047 | 203.052 | 0.058 | n/a | 0.000 | 0.000 | 1.384 | 201.328 | 0.019 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.129 | 0.058 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000045 | 202.983 | 0.050 | n/a | 0.000 | 0.000 | 1.278 | 201.328 | 0.020 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.123 | 0.050 | 0.000 | 0.123 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000046 | 202.893 | 0.042 | n/a | 0.000 | 0.000 | 1.123 | 201.417 | 0.021 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.109 | 0.042 | 0.000 | 0.109 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d623000000000000004c | 202.465 | 0.052 | n/a | 0.000 | 0.000 | 0.999 | 201.143 | 0.046 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.091 | 0.052 | 0.000 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000004a | 202.201 | 0.052 | n/a | 0.000 | 0.000 | 1.046 | 200.863 | 0.012 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.130 | 0.052 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d6230000000000000044 | 202.044 | 0.042 | n/a | 0.000 | 0.000 | 0.806 | 200.955 | 0.017 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.092 | 0.042 | 0.000 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d623000000000000004d | 182.149 | 0.051 | n/a | 0.000 | 0.000 | 0.579 | 160.066 | 2.413 | 18.920 | 0.034 | 0.000 | n/a | n/a | 0.086 | 0.051 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d623000000000000004e | 93.998 | 0.042 | n/a | 0.000 | 0.000 | 0.677 | 93.088 | 0.019 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.067 | 0.042 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000048 | 87.046 | 0.045 | n/a | 0.000 | 0.000 | 0.772 | 82.646 | 3.465 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.074 | 0.045 | 0.001 | 0.074 | gw-r/thread-53/journal/page | none observed |

## P3 / p4mix / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.018 | n/a | n/a | n/a | 0.042 | n/a | 0.000 | 0.000 | 0.835 | 200.951 | 0.018 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.083 | 0.042 | 0.000 | 0.083 |
| p99 | 202.500 | n/a | n/a | n/a | 0.063 | n/a | 0.000 | 0.000 | 0.996 | 201.249 | 4.052 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.125 | 0.063 | 0.001 | 0.125 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000056 | 202.500 | 0.042 | n/a | 0.000 | 0.000 | 0.996 | 201.205 | 0.025 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.107 | 0.042 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d6230000000000000057 | 202.417 | 0.034 | n/a | 0.000 | 0.000 | 0.907 | 201.249 | 0.014 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.081 | 0.034 | 0.000 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000054 | 202.305 | 0.047 | n/a | 0.000 | 0.000 | 0.925 | 201.107 | 0.014 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.080 | 0.047 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000052 | 202.183 | 0.049 | n/a | 0.000 | 0.000 | 0.891 | 200.973 | 0.037 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.100 | 0.049 | 0.000 | 0.100 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d6230000000000000055 | 202.110 | 0.032 | n/a | 0.000 | 0.000 | 0.737 | 201.084 | 0.041 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000051 | 202.018 | 0.034 | n/a | 0.000 | 0.000 | 0.824 | 200.951 | 0.018 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.083 | 0.034 | 0.000 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d623000000000000004f | 201.914 | 0.050 | n/a | 0.000 | 0.000 | 0.830 | 200.797 | 0.015 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.120 | 0.050 | 0.000 | 0.120 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000050 | 201.758 | 0.029 | n/a | 0.000 | 0.000 | 0.702 | 200.804 | 0.013 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.075 | 0.029 | 0.000 | 0.075 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d6230000000000000053 | 99.098 | 0.063 | n/a | 0.000 | 0.000 | 0.979 | 95.653 | 2.188 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.125 | 0.063 | 0.001 | 0.125 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000058 | 96.250 | 0.063 | n/a | 0.000 | 0.000 | 0.835 | 91.151 | 4.052 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.113 | 0.063 | 0.001 | 0.113 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h1 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.993 | n/a | n/a | n/a | 0.034 | n/a | 0.000 | 0.000 | 0.784 | 200.922 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 |
| p99 | 204.031 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.986 | 203.153 | 4.765 | 0.000 | 0.338 | 0.000 | n/a | n/a | 0.128 | 0.047 | 0.000 | 0.128 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000064 | 204.031 | 0.041 | n/a | 0.000 | 0.000 | 0.611 | 203.153 | 0.012 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.077 | 0.041 | 0.000 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000060 | 202.652 | 0.031 | n/a | 0.000 | 0.000 | 0.964 | 201.423 | 0.021 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000067 | 202.307 | 0.047 | n/a | 0.000 | 0.000 | 0.986 | 201.031 | 0.013 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.123 | 0.047 | 0.000 | 0.123 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d623000000000000006a | 202.272 | 0.030 | n/a | 0.000 | 0.000 | 0.731 | 201.256 | 0.020 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.110 | 0.030 | 0.000 | 0.110 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d6230000000000000061 | 202.025 | 0.042 | n/a | 0.000 | 0.000 | 0.814 | 200.922 | 0.012 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.128 | 0.042 | 0.000 | 0.128 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000065 | 202.006 | 0.033 | n/a | 0.000 | 0.000 | 0.784 | 200.999 | 0.022 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d6230000000000000066 | 201.993 | 0.038 | n/a | 0.000 | 0.000 | 0.848 | 200.917 | 0.012 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.085 | 0.038 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000062 | 201.982 | 0.034 | n/a | 0.000 | 0.000 | 0.773 | 200.938 | 0.012 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d6230000000000000069 | 201.977 | 0.034 | n/a | 0.000 | 0.000 | 0.859 | 200.894 | 0.017 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d623000000000000006b | 201.890 | 0.031 | n/a | 0.000 | 0.000 | 0.780 | 200.893 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.082 | 0.031 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d623000000000000006c | 169.130 | 0.045 | n/a | 0.000 | 0.000 | 0.689 | 164.528 | 3.765 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.068 | 0.045 | 0.000 | 0.068 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d6230000000000000063 | 148.714 | 0.038 | n/a | 0.000 | 0.000 | 0.981 | 142.527 | 4.765 | 0.000 | 0.338 | 0.000 | n/a | n/a | 0.065 | 0.038 | 0.000 | 0.065 | gw-r/thread-72/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.856 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.788 | 200.829 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.088 | 0.046 | 0.000 | 0.088 |
| p99 | 202.159 | n/a | n/a | n/a | 0.508 | n/a | 0.000 | 0.000 | 0.846 | 201.131 | 140.895 | 23.463 | 0.199 | 0.000 | n/a | n/a | 0.097 | 0.508 | 0.004 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000070 | 202.159 | 0.046 | n/a | 0.000 | 0.000 | 0.788 | 201.131 | 0.013 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.093 | 0.046 | 0.000 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d623000000000000006e | 202.046 | 0.041 | n/a | 0.000 | 0.000 | 0.780 | 200.929 | 0.015 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.082 | 0.041 | 0.000 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d6230000000000000071 | 201.927 | 0.030 | n/a | 0.000 | 0.000 | 0.846 | 200.875 | 0.014 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.073 | 0.030 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000072 | 201.856 | 0.044 | n/a | 0.000 | 0.000 | 0.785 | 200.829 | 0.013 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.094 | 0.044 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000073 | 175.003 | 0.457 | n/a | 0.000 | 0.000 | 0.792 | 9.267 | 140.895 | 23.463 | 0.031 | 0.000 | n/a | n/a | 0.097 | 0.457 | 0.003 | 0.097 | gw-r/thread-51/gateway.admission-wait | none observed |
| 4252dd05cb35d623000000000000006d | 165.045 | 0.051 | n/a | 0.000 | 0.000 | 0.701 | 164.092 | 0.016 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.088 | 0.051 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000075 | 142.955 | 0.508 | n/a | 0.000 | 0.000 | 0.843 | 141.418 | 0.012 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.088 | 0.508 | 0.004 | 0.088 | gw-r/thread-52/journal/page | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.948 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.758 | 200.844 | 0.011 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.000 | 0.074 |
| p99 | 202.604 | n/a | n/a | n/a | 0.072 | n/a | 0.000 | 0.000 | 1.202 | 201.761 | 2.252 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.132 | 0.072 | 0.001 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d623000000000000008f | 202.604 | 0.031 | n/a | 0.000 | 0.000 | 0.645 | 201.761 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d6230000000000000090 | 202.387 | 0.053 | n/a | 0.000 | 0.000 | 1.202 | 200.904 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.126 | 0.053 | 0.000 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d623000000000000008a | 202.096 | 0.036 | n/a | 0.000 | 0.000 | 0.758 | 201.005 | 0.010 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.073 | 0.036 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000085 | 202.051 | 0.043 | n/a | 0.000 | 0.000 | 0.883 | 200.900 | 0.010 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.111 | 0.043 | 0.000 | 0.111 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000081 | 201.996 | 0.072 | n/a | 0.000 | 0.000 | 0.817 | 200.860 | 0.016 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.132 | 0.072 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d623000000000000008b | 201.988 | 0.040 | n/a | 0.000 | 0.000 | 0.910 | 200.844 | 0.011 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 4252dd05cb35d623000000000000008d | 201.948 | 0.034 | n/a | 0.000 | 0.000 | 0.566 | 201.103 | 0.021 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.073 | 0.034 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d6230000000000000083 | 201.415 | 0.035 | n/a | 0.000 | 0.000 | 0.526 | 200.695 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d623000000000000008c | 164.821 | 0.046 | n/a | 0.000 | 0.000 | 0.763 | 161.631 | 2.252 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.067 | 0.046 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d623000000000000008e | 149.172 | 0.053 | n/a | 0.000 | 0.000 | 0.957 | 148.019 | 0.021 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.086 | 0.053 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d6230000000000000084 | 59.815 | 0.061 | n/a | 0.000 | 0.000 | 0.743 | 58.865 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.087 | 0.061 | 0.001 | 0.087 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d6230000000000000088 | 57.748 | 0.043 | n/a | 0.000 | 0.000 | 0.509 | 56.980 | 0.028 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.001 | 0.074 | gw-r/thread-54/journal/page | none observed |

## P3 / grow10 / read (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 126.433 | n/a | n/a | n/a | 0.422 | n/a | 0.000 | 0.000 | 0.869 | 98.512 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.092 | 0.422 | 0.003 | 0.092 |
| p99 | 202.094 | n/a | n/a | n/a | 0.682 | n/a | 0.000 | 0.000 | 1.822 | 200.951 | 145.525 | 11.534 | 0.129 | 0.000 | n/a | n/a | 0.111 | 0.682 | 0.008 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d6230000000000000091 | 202.094 | 0.071 | n/a | 0.000 | 0.000 | 0.869 | 200.951 | 0.013 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.093 | 0.071 | 0.000 | 0.093 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d6230000000000000096 | 201.651 | 0.031 | n/a | 0.000 | 0.000 | 0.597 | 189.331 | 0.012 | 11.534 | 0.077 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 4252dd05cb35d6230000000000000092 | 164.996 | 0.534 | n/a | 0.000 | 0.000 | 0.700 | 18.097 | 145.525 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.092 | 0.534 | 0.003 | 0.092 | gw-r/thread-51/gateway.admission-wait | none observed |
| 4252dd05cb35d6230000000000000099 | 126.433 | 0.420 | n/a | 0.000 | 0.000 | 1.822 | 123.994 | 0.010 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.085 | 0.420 | 0.003 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d6230000000000000097 | 114.289 | 0.682 | n/a | 0.000 | 0.000 | 1.125 | 98.512 | 13.821 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.111 | 0.682 | 0.006 | 0.111 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d623000000000000009a | 70.664 | 0.425 | n/a | 0.000 | 0.000 | 1.417 | 68.663 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.095 | 0.425 | 0.006 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d6230000000000000098 | 52.036 | 0.422 | n/a | 0.000 | 0.000 | 0.854 | 50.535 | 0.010 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.086 | 0.422 | 0.008 | 0.086 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.707 | n/a | n/a | n/a | 0.034 | n/a | 0.000 | 0.000 | 0.719 | 200.799 | 0.011 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 |
| p99 | 202.539 | n/a | n/a | n/a | 0.070 | n/a | 0.000 | 0.000 | 0.935 | 201.365 | 3.614 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.123 | 0.070 | 0.001 | 0.123 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d62300000000000000a9 | 202.539 | 0.040 | n/a | 0.000 | 0.000 | 0.857 | 201.365 | 0.041 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.103 | 0.040 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 4252dd05cb35d62300000000000000a8 | 202.086 | 0.034 | n/a | 0.000 | 0.000 | 0.862 | 200.998 | 0.015 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000b0 | 202.069 | 0.034 | n/a | 0.000 | 0.000 | 0.719 | 201.122 | 0.011 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d62300000000000000a3 | 201.997 | 0.038 | n/a | 0.000 | 0.000 | 0.785 | 200.952 | 0.015 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.123 | 0.038 | 0.000 | 0.123 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d62300000000000000a4 | 201.989 | 0.040 | n/a | 0.000 | 0.000 | 0.802 | 200.925 | 0.010 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.119 | 0.040 | 0.000 | 0.119 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d62300000000000000ae | 201.929 | 0.032 | n/a | 0.000 | 0.000 | 0.935 | 200.799 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d62300000000000000af | 201.707 | 0.031 | n/a | 0.000 | 0.000 | 0.659 | 200.771 | 0.080 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.077 | 0.031 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 4252dd05cb35d62300000000000000ad | 201.629 | 0.032 | n/a | 0.000 | 0.000 | 0.579 | 200.835 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.081 | 0.032 | 0.000 | 0.081 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d62300000000000000a2 | 201.502 | 0.030 | n/a | 0.000 | 0.000 | 0.619 | 200.682 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.070 | 0.030 | 0.000 | 0.070 | gw-r/thread-72/journal/page | none observed |
| 4252dd05cb35d62300000000000000a6 | 201.375 | 0.031 | n/a | 0.000 | 0.000 | 0.482 | 200.698 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.065 | 0.031 | 0.000 | 0.065 | gw-r/thread-54/journal/page | none observed |
| 4252dd05cb35d62300000000000000ac | 172.163 | 0.043 | n/a | 0.000 | 0.000 | 0.646 | 168.415 | 2.950 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.068 | 0.043 | 0.000 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000a5 | 144.012 | 0.070 | n/a | 0.000 | 0.000 | 0.884 | 142.861 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.104 | 0.070 | 0.000 | 0.104 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d62300000000000000a7 | 106.324 | 0.055 | n/a | 0.000 | 0.000 | 0.683 | 101.821 | 3.614 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.069 | 0.055 | 0.001 | 0.069 | gw-r/thread-51/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.739 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.799 | 200.753 | 0.014 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 |
| p99 | 202.816 | n/a | n/a | n/a | 0.101 | n/a | 0.000 | 0.000 | 3.807 | 201.560 | 2.392 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.121 | 0.101 | 0.001 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4252dd05cb35d62300000000000000b6 | 202.816 | 0.039 | n/a | 0.000 | 0.000 | 0.994 | 201.560 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d62300000000000000b9 | 202.527 | 0.034 | n/a | 0.000 | 0.000 | 0.959 | 201.293 | 0.031 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.074 | 0.034 | 0.000 | 0.074 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d62300000000000000ba | 201.986 | 0.030 | n/a | 0.000 | 0.000 | 0.918 | 200.858 | 0.010 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.078 | 0.030 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000b2 | 201.841 | 0.036 | n/a | 0.000 | 0.000 | 0.660 | 200.855 | 0.014 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d62300000000000000b4 | 201.796 | 0.101 | n/a | 0.000 | 0.000 | 0.776 | 200.703 | 0.014 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.121 | 0.101 | 0.000 | 0.121 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d62300000000000000b3 | 201.739 | 0.031 | n/a | 0.000 | 0.000 | 0.705 | 200.829 | 0.009 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000b8 | 201.501 | 0.035 | n/a | 0.000 | 0.000 | 0.495 | 200.753 | 0.018 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.088 | 0.035 | 0.000 | 0.088 | gw-r/thread-53/journal/page | none observed |
| 4252dd05cb35d62300000000000000bb | 132.195 | 0.054 | n/a | 0.000 | 0.000 | 0.799 | 128.812 | 2.392 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.109 | 0.054 | 0.000 | 0.109 | gw-r/thread-55/journal/page | none observed |
| 4252dd05cb35d62300000000000000b1 | 115.196 | 0.064 | n/a | 0.000 | 0.000 | 3.807 | 111.151 | 0.012 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.099 | 0.064 | 0.001 | 0.099 | gw-r/thread-74/journal/page | none observed |
| 4252dd05cb35d62300000000000000b7 | 83.707 | 0.044 | n/a | 0.000 | 0.000 | 0.808 | 82.295 | 0.407 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.072 | 0.044 | 0.001 | 0.072 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

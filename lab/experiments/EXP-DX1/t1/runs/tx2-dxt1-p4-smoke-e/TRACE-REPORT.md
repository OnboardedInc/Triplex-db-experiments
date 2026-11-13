# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/peer.transact-await (includes order/network/storage)` (161.539 ms, trace `fd1ce898f9d8088800000000000000b4`); `gw-w/thread-69/peer.transact-await (includes order/network/storage)` (118.360 ms, trace `fd1ce898f9d808880000000000000149`); `gw-w/thread-67/peer.transact-await (includes order/network/storage)` (113.060 ms, trace `fd1ce898f9d808880000000000000148`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (93.710 ms, trace `fd1ce898f9d808880000000000000147`); `gw-w/thread-53/peer.transact-await (includes order/network/storage)` (72.555 ms, trace `fd1ce898f9d808880000000000000146`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-smoke-e`; source `97d366795bf7351ff0b30ac78c3f9e55a23a1781`; subjects 1000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 7031027.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 97 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1648.210 | 215.967 | 314.062 | 39 |
| baseline | 0 | 1972.362 | 95.845 | 17.275 | 44 |
| L1 | 1 | 1980.338 | 171.676 | 18.880 | 35 |
| L4 | 4 | 1983.020 | 288.422 | 227.678 | 39 |
| L16 | 16 | 1900.616 | 203.791 | 192.043 | 44 |
| L64 | 16 | 1886.789 | 204.899 | 218.215 | 44 |
| L256 | 16 | 1950.825 | 209.528 | 201.517 | 58 |
| L1024 | 16 | 1951.994 | 279.208 | 326.436 | 16 |
| recovery | 16 | 1942.711 | 220.482 | 225.139 | 44 |
| p4mix | 1 | 1987.121 | 38.425 | 22.300 | 43 |
| p4h1 | 1 | 1038.561 | 16.078 | 17.710 | 16 |
| grow3 | 0 | 475.374 | 21.148 | 0.043 | 36 |
| p4h3 | 1 | 2397.221 | 63.939 | 29.821 | 117 |
| grow10 | 0 | 1956.664 | 449.501 | 76.858 | 30 |
| p4h10 | 1 | 2361.128 | 55.947 | 24.945 | 77 |
| presweep | 16 | 1030.100 | 101.046 | 137.245 | 30 |
| sweep | 16 | 170.045 | 39.466 | 44.058 | 131 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| fd1ce898f9d8088800000000000000b4 | driver.queue.scheduler-dispatch | 0.076 | none | 0 / 32 |
| fd1ce898f9d8088800000000000000b4 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace fd1ce898f9d8088800000000000000b4 waited: []

| fd1ce898f9d808880000000000000149 | driver.queue.scheduler-dispatch | 0.005 | none | 9 / 32 |

Observed active steps while trace fd1ce898f9d808880000000000000149 waited: []

| fd1ce898f9d808880000000000000148 | driver.queue.scheduler-dispatch | 0.006 | none | 8 / 32 |
| fd1ce898f9d808880000000000000148 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace fd1ce898f9d808880000000000000148 waited: []

| fd1ce898f9d808880000000000000147 | driver.queue.scheduler-dispatch | 0.010 | none | 7 / 32 |
| fd1ce898f9d808880000000000000147 | driver.queue.scheduler-late | 0.000 | none | 7 / 32 |

Observed active steps while trace fd1ce898f9d808880000000000000147 waited: []

| fd1ce898f9d808880000000000000146 | driver.queue.scheduler-dispatch | 0.009 | none | 6 / 32 |
| fd1ce898f9d808880000000000000146 | driver.queue.scheduler-late | 0.000 | none | 6 / 32 |

Observed active steps while trace fd1ce898f9d808880000000000000146 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.758 | 0.250 | 0.000 | 0.363 | 6.127 | 0.009 | 0.000 | 0.078 | 0.979 | 4.842 | 0.072 | 0.000 | 0.792 | 12.968 | 0.503 | n/a | 0.081 | 6.471 | 0.231 | 0.081 |
| p99 | 53.089 | 3.465 | 2.442 | 6.951 | 27.350 | 0.747 | 0.000 | 0.811 | 5.546 | 7.876 | 0.370 | 0.000 | 7.163 | 21.984 | 2.012 | n/a | 0.308 | 28.175 | 0.531 | 0.308 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000094 | 53.089 | 27.350 | 0.747 | 0.000 | 0.078 | 5.546 | 4.842 | 0.183 | 0.000 | 0.792 | 12.968 | 0.503 | n/a | 0.081 | 28.175 | 0.531 | 0.081 | node-14/thread-8/client.persist-and-resolve | none observed |
| fd1ce898f9d808880000000000000092 | 47.173 | 12.261 | 0.009 | 0.000 | 0.811 | 0.955 | 2.684 | 0.043 | 0.000 | 7.163 | 21.984 | 0.955 | n/a | 0.308 | 13.081 | 0.277 | 0.308 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000096 | 29.758 | 4.594 | 0.005 | 0.000 | 0.444 | 0.979 | 5.385 | 0.072 | 0.000 | 0.262 | 15.866 | 2.012 | n/a | 0.139 | 5.043 | 0.169 | 0.139 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000098 | 28.062 | 6.127 | 0.268 | 0.000 | 0.076 | 2.494 | 7.876 | 0.370 | 0.000 | 1.073 | 9.350 | 0.369 | n/a | 0.058 | 6.471 | 0.231 | 0.058 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.758 | 0.496 | 0.000 | 2.502 | 4.594 | 0.005 | 0.000 | 0.444 | 0.979 | 5.385 | 0.072 | 0.000 | 0.262 | 15.866 | 2.012 | n/a | 0.139 | 5.043 | 0.169 | 0.139 |
| p99 | 29.758 | 0.496 | 0.000 | 2.502 | 4.594 | 0.005 | 0.000 | 0.444 | 0.979 | 5.385 | 0.072 | 0.000 | 0.262 | 15.866 | 2.012 | n/a | 0.139 | 5.043 | 0.169 | 0.139 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000096 | 29.758 | 4.594 | 0.005 | 0.000 | 0.444 | 0.979 | 5.385 | 0.072 | 0.000 | 0.262 | 15.866 | 2.012 | n/a | 0.139 | 5.043 | 0.169 | 0.139 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.577 | 0.725 | 0.000 | 1.094 | 4.311 | 0.009 | 0.000 | 0.197 | 2.532 | 2.319 | 0.050 | 0.000 | 0.617 | 7.194 | 0.337 | n/a | 0.063 | 4.722 | 0.245 | 0.063 |
| p99 | 23.546 | 1.782 | 0.000 | 2.838 | 7.010 | 0.327 | 0.000 | 0.926 | 4.405 | 3.833 | 0.093 | 0.000 | 1.000 | 9.327 | 0.636 | n/a | 0.226 | 7.410 | 0.343 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d80888000000000000009e | 23.546 | 5.208 | 0.009 | 0.000 | 0.555 | 4.405 | 2.319 | 0.041 | 0.000 | 0.994 | 9.327 | 0.463 | n/a | 0.226 | 5.772 | 0.245 | 0.226 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000a0 | 21.585 | 7.010 | 0.327 | 0.000 | 0.073 | 2.532 | 2.479 | 0.050 | 0.000 | 0.365 | 8.314 | 0.337 | n/a | 0.099 | 7.410 | 0.343 | 0.099 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000009c | 20.577 | 4.311 | 0.214 | 0.000 | 0.197 | 3.626 | 3.833 | 0.093 | 0.000 | 1.000 | 6.925 | 0.315 | n/a | 0.063 | 4.722 | 0.229 | 0.063 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000009a | 16.047 | 3.585 | 0.005 | 0.000 | 0.926 | 0.886 | 2.092 | 0.050 | 0.000 | 0.617 | 7.194 | 0.636 | n/a | 0.055 | 4.516 | 0.281 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.047 | 0.785 | 0.000 | 1.881 | 3.585 | 0.005 | 0.000 | 0.555 | 0.886 | 2.092 | 0.041 | 0.000 | 0.617 | 7.194 | 0.463 | n/a | 0.055 | 4.516 | 0.245 | 0.055 |
| p99 | 23.546 | 1.782 | 0.000 | 2.838 | 5.208 | 0.009 | 0.000 | 0.926 | 4.405 | 2.319 | 0.050 | 0.000 | 0.994 | 9.327 | 0.636 | n/a | 0.226 | 5.772 | 0.281 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d80888000000000000009e | 23.546 | 5.208 | 0.009 | 0.000 | 0.555 | 4.405 | 2.319 | 0.041 | 0.000 | 0.994 | 9.327 | 0.463 | n/a | 0.226 | 5.772 | 0.245 | 0.226 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000009a | 16.047 | 3.585 | 0.005 | 0.000 | 0.926 | 0.886 | 2.092 | 0.050 | 0.000 | 0.617 | 7.194 | 0.636 | n/a | 0.055 | 4.516 | 0.281 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.519 | 0.626 | 0.000 | 0.719 | 6.175 | 0.012 | 0.000 | 0.087 | 0.876 | 2.427 | 0.037 | 0.000 | 0.310 | 11.799 | 0.404 | n/a | 0.043 | 6.605 | 0.257 | 0.043 |
| p99 | 43.524 | 2.561 | 0.001 | 2.985 | 8.963 | 0.368 | 0.606 | 0.844 | 3.547 | 7.620 | 0.087 | 0.000 | 0.512 | 19.348 | 3.874 | n/a | 0.058 | 10.425 | 0.381 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000a8 | 43.524 | 8.315 | 0.368 | 0.000 | 0.040 | 3.547 | 7.620 | 0.087 | 0.000 | 0.285 | 19.348 | 3.874 | n/a | 0.041 | 8.723 | 0.200 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 2.065ms; driver.publication 1.548ms |
| fd1ce898f9d8088800000000000000a7 | 31.763 | 8.963 | 0.012 | 0.606 | 0.844 | 0.869 | 1.690 | 0.036 | 0.000 | 0.512 | 17.747 | 0.427 | n/a | 0.058 | 10.425 | 0.328 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000a4 | 24.519 | 5.968 | 0.258 | 0.000 | 0.087 | 3.164 | 2.427 | 0.058 | 0.000 | 0.310 | 11.799 | 0.397 | n/a | 0.050 | 6.313 | 0.257 | 0.050 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000a2 | 17.340 | 6.175 | 0.005 | 0.000 | 0.425 | 0.876 | 3.180 | 0.037 | 0.000 | 0.323 | 5.872 | 0.404 | n/a | 0.043 | 6.605 | 0.381 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.521 | 0.403 | 0.000 | 0.438 | 6.495 | 0.231 | 0.000 | 0.099 | 2.943 | 12.549 | 0.111 | 0.000 | 0.627 | 39.552 | 0.768 | n/a | 0.041 | 6.877 | 0.166 | 0.041 |
| p99 | 100.046 | 0.640 | 0.000 | 2.372 | 15.056 | 0.719 | 1.296 | 0.222 | 5.878 | 13.476 | 0.196 | 0.000 | 3.028 | 65.424 | 4.798 | n/a | 0.078 | 16.656 | 0.214 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000b0 | 100.046 | 15.056 | 0.231 | 1.296 | 0.073 | 2.943 | 13.476 | 0.111 | 0.000 | 0.627 | 65.424 | 0.768 | n/a | 0.041 | 16.656 | 0.166 | 0.041 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000ad | 68.521 | 6.060 | 0.719 | 0.000 | 0.099 | 5.878 | 12.549 | 0.196 | 0.000 | 3.028 | 39.552 | 0.402 | n/a | 0.041 | 6.877 | 0.100 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000ab | 31.489 | 6.495 | 0.010 | 0.000 | 0.222 | 0.905 | 2.184 | 0.049 | 0.000 | 0.424 | 16.324 | 4.798 | n/a | 0.078 | 6.727 | 0.214 | 0.078 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.459 | 0.377 | 0.000 | 0.619 | 4.850 | 0.010 | 0.000 | 0.097 | 0.947 | 7.357 | 0.056 | 0.000 | 0.305 | 27.490 | 11.499 | n/a | 0.049 | 5.904 | 0.086 | 0.049 |
| p99 | 220.162 | 1.049 | 0.000 | 1.984 | 18.633 | 0.426 | 0.754 | 1.044 | 2.736 | 30.148 | 0.134 | 0.000 | 3.323 | 161.539 | 42.362 | n/a | 0.058 | 19.910 | 0.251 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000b4 | 220.162 | 6.063 | 0.254 | 0.309 | 0.080 | 1.773 | 7.357 | 0.071 | 0.000 | 0.305 | 161.539 | 42.362 | n/a | 0.049 | 6.706 | 0.030 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000b9 | 114.076 | 18.633 | 0.426 | 0.754 | 0.097 | 2.736 | 30.148 | 0.134 | 0.000 | 0.447 | 27.490 | 33.161 | n/a | 0.051 | 19.910 | 0.175 | 0.051 | tx/thread-90/transactor.triplex-function | driver.worker-message 6.744ms; driver.worker-message 1.565ms |
| fd1ce898f9d8088800000000000000b7 | 68.459 | 4.850 | 0.010 | 0.000 | 1.044 | 0.947 | 8.819 | 0.056 | 0.000 | 3.323 | 37.854 | 11.499 | n/a | 0.058 | 5.904 | 0.086 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000b2 | 17.510 | 3.711 | 0.005 | 0.000 | 0.687 | 0.732 | 1.339 | 0.036 | 0.000 | 0.231 | 10.329 | 0.394 | n/a | 0.046 | 4.403 | 0.251 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.510 | 0.377 | 0.000 | 1.483 | 3.711 | 0.005 | 0.000 | 0.687 | 0.732 | 1.339 | 0.036 | 0.000 | 0.231 | 10.329 | 0.394 | n/a | 0.046 | 4.403 | 0.086 | 0.046 |
| p99 | 68.459 | 1.049 | 0.000 | 1.984 | 4.850 | 0.010 | 0.000 | 1.044 | 0.947 | 8.819 | 0.056 | 0.000 | 3.323 | 37.854 | 11.499 | n/a | 0.058 | 5.904 | 0.251 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000b7 | 68.459 | 4.850 | 0.010 | 0.000 | 1.044 | 0.947 | 8.819 | 0.056 | 0.000 | 3.323 | 37.854 | 11.499 | n/a | 0.058 | 5.904 | 0.086 | 0.058 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000b2 | 17.510 | 3.711 | 0.005 | 0.000 | 0.687 | 0.732 | 1.339 | 0.036 | 0.000 | 0.231 | 10.329 | 0.394 | n/a | 0.046 | 4.403 | 0.251 | 0.046 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.656 | 1.463 | 0.000 | 1.328 | 4.876 | 0.011 | 0.000 | 0.195 | 1.579 | 13.923 | 0.074 | 0.000 | 0.365 | 21.141 | 9.510 | n/a | 0.054 | 5.564 | 0.090 | 0.054 |
| p99 | 86.165 | 2.275 | 0.124 | 2.641 | 7.501 | 0.347 | 0.344 | 0.320 | 1.663 | 29.853 | 0.117 | 0.000 | 2.896 | 48.235 | 12.104 | n/a | 0.061 | 7.757 | 0.134 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000bb | 86.165 | 7.501 | 0.011 | 0.000 | 0.245 | 1.579 | 16.145 | 0.066 | 0.000 | 0.226 | 48.235 | 12.104 | n/a | 0.054 | 7.757 | 0.090 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000bd | 77.292 | 4.876 | 0.347 | 0.273 | 0.067 | 1.663 | 29.853 | 0.113 | 0.000 | 2.896 | 25.334 | 11.814 | n/a | 0.056 | 5.564 | 0.072 | 0.056 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000c2 | 49.656 | 5.785 | 0.324 | 0.344 | 0.195 | 1.633 | 13.923 | 0.074 | 0.000 | 0.365 | 21.141 | 5.812 | n/a | 0.061 | 6.647 | 0.134 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000c0 | 43.398 | 4.470 | 0.006 | 0.000 | 0.320 | 0.877 | 10.179 | 0.117 | 0.000 | 2.825 | 15.041 | 9.510 | n/a | 0.054 | 4.796 | 0.111 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.398 | 1.634 | 0.124 | 2.146 | 4.470 | 0.006 | 0.000 | 0.320 | 0.877 | 10.179 | 0.117 | 0.000 | 2.825 | 15.041 | 9.510 | n/a | 0.054 | 4.796 | 0.111 | 0.054 |
| p99 | 43.398 | 1.634 | 0.124 | 2.146 | 4.470 | 0.006 | 0.000 | 0.320 | 0.877 | 10.179 | 0.117 | 0.000 | 2.825 | 15.041 | 9.510 | n/a | 0.054 | 4.796 | 0.111 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000c0 | 43.398 | 4.470 | 0.006 | 0.000 | 0.320 | 0.877 | 10.179 | 0.117 | 0.000 | 2.825 | 15.041 | 9.510 | n/a | 0.054 | 4.796 | 0.111 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 58.227 | 0.843 | 0.000 | 1.531 | 5.369 | 0.010 | 0.000 | 0.329 | 1.086 | 7.672 | 0.070 | 0.000 | 0.691 | 16.086 | 12.906 | n/a | 0.048 | 6.156 | 0.152 | 0.048 |
| p99 | 81.027 | 1.521 | 0.009 | 2.046 | 9.454 | 0.599 | 0.392 | 0.776 | 3.283 | 14.667 | 0.251 | 0.000 | 2.693 | 51.808 | 15.240 | n/a | 0.063 | 10.510 | 0.216 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000c4 | 81.027 | 5.369 | 0.010 | 0.000 | 0.776 | 1.086 | 5.540 | 0.251 | 0.000 | 1.091 | 51.808 | 15.032 | n/a | 0.063 | 6.156 | 0.076 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000cc | 67.998 | 4.241 | 0.009 | 0.000 | 0.727 | 1.037 | 7.672 | 0.063 | 0.000 | 0.691 | 40.596 | 12.906 | n/a | 0.056 | 4.977 | 0.073 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000c7 | 58.227 | 9.049 | 0.263 | 0.372 | 0.065 | 3.283 | 13.123 | 0.070 | 0.000 | 0.628 | 16.086 | 15.240 | n/a | 0.048 | 9.750 | 0.167 | 0.048 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000cf | 48.771 | 9.454 | 0.599 | 0.392 | 0.066 | 1.983 | 14.667 | 0.185 | 0.000 | 2.693 | 13.500 | 5.198 | n/a | 0.034 | 10.510 | 0.216 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000ca | 23.916 | 3.296 | 0.005 | 0.000 | 0.329 | 0.758 | 5.362 | 0.034 | 0.000 | 0.205 | 13.413 | 0.468 | n/a | 0.047 | 3.630 | 0.152 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 67.998 | 1.231 | 0.000 | 1.651 | 4.241 | 0.009 | 0.000 | 0.727 | 1.037 | 5.540 | 0.063 | 0.000 | 0.691 | 40.596 | 12.906 | n/a | 0.056 | 4.977 | 0.076 | 0.056 |
| p99 | 81.027 | 1.521 | 0.009 | 2.046 | 5.369 | 0.010 | 0.000 | 0.776 | 1.086 | 7.672 | 0.251 | 0.000 | 1.091 | 51.808 | 15.032 | n/a | 0.063 | 6.156 | 0.152 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000c4 | 81.027 | 5.369 | 0.010 | 0.000 | 0.776 | 1.086 | 5.540 | 0.251 | 0.000 | 1.091 | 51.808 | 15.032 | n/a | 0.063 | 6.156 | 0.076 | 0.063 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000cc | 67.998 | 4.241 | 0.009 | 0.000 | 0.727 | 1.037 | 7.672 | 0.063 | 0.000 | 0.691 | 40.596 | 12.906 | n/a | 0.056 | 4.977 | 0.073 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000ca | 23.916 | 3.296 | 0.005 | 0.000 | 0.329 | 0.758 | 5.362 | 0.034 | 0.000 | 0.205 | 13.413 | 0.468 | n/a | 0.047 | 3.630 | 0.152 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.815 | n/a | n/a | n/a | 7.513 | 3.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 9.798 | 0.998 | 0.015 |
| p99 | 94.214 | n/a | n/a | n/a | 26.255 | 39.282 | 1.063 | 0.000 | 4.554 | 55.017 | 0.023 | 0.000 | 0.298 | 0.000 | n/a | n/a | 0.076 | 47.790 | 0.999 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000cd | 94.214 | 26.255 | 10.381 | 1.063 | 0.000 | 1.437 | 55.017 | 0.015 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.012 | 37.700 | 0.400 | 0.012 | gw-w/thread-52/gateway.admitted-work | none observed |
| fd1ce898f9d8088800000000000000d9 | 84.122 | 25.742 | 18.861 | 0.000 | 0.000 | 4.554 | 34.925 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.013 | 44.603 | 0.530 | 0.013 | gw-w/thread-52/gateway.admitted-work | none observed |
| fd1ce898f9d8088800000000000000c5 | 65.414 | 14.445 | 6.770 | 0.000 | 0.000 | 1.037 | 42.838 | 0.013 | 0.000 | 0.298 | 0.000 | n/a | n/a | 0.012 | 21.215 | 0.324 | 0.012 | gw-w/thread-46/gateway.admitted-work | none observed |
| fd1ce898f9d80888000000000000011a | 47.833 | 8.509 | 39.282 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 47.790 | 0.999 | 0.042 | node-14/thread-0/rpc.replica.observe | none observed |
| fd1ce898f9d808880000000000000093 | 30.135 | 1.967 | 28.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 30.074 | 0.998 | 0.062 | node-14/thread-0/rpc.replica.observe | none observed |
| fd1ce898f9d8088800000000000000dc | 27.382 | 11.137 | 1.513 | 0.000 | 0.000 | 2.185 | 12.482 | 0.023 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.013 | 12.650 | 0.462 | 0.013 | gw-w/thread-50/gateway.admitted-work | driver.worker-message 0.652ms |
| fd1ce898f9d8088800000000000000bc | 22.283 | 17.429 | 4.838 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 22.267 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d8088800000000000000fd | 14.419 | 14.332 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 14.406 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d808880000000000000132 | 13.322 | 0.385 | 12.913 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 13.298 | 0.998 | 0.024 | node-14/thread-0/rpc.replica.observe | none observed |
| fd1ce898f9d808880000000000000103 | 10.152 | 10.052 | 0.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 10.115 | 0.996 | 0.037 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d808880000000000000113 | 9.815 | 9.676 | 0.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 9.798 | 0.998 | 0.017 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d8088800000000000000e7 | 9.479 | 8.989 | 0.474 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 9.463 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d8088800000000000000b8 | 8.199 | 4.904 | 3.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 8.186 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d808880000000000000101 | 7.614 | 7.513 | 0.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.601 | 0.998 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d8088800000000000000f0 | 7.231 | 0.708 | 6.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.216 | 0.998 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| fd1ce898f9d80888000000000000009f | 5.379 | 2.004 | 3.337 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.342 | 0.993 | 0.038 | node-14/thread-0/rpc.replica.observe | none observed |
| fd1ce898f9d808880000000000000139 | 5.379 | 5.307 | 0.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 5.368 | 0.998 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d808880000000000000133 | 5.192 | 0.425 | 4.691 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.076 | 5.116 | 0.985 | 0.076 | node-14/thread-0/rpc.replica.observe | none observed |
| fd1ce898f9d8088800000000000000f2 | 5.181 | 5.012 | 0.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.155 | 0.995 | 0.026 | node-14/thread-2/replica.pull-at | none observed |
| fd1ce898f9d80888000000000000012e | 5.090 | 4.649 | 0.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 5.077 | 0.998 | 0.012 | node-14/thread-2/replica.pull-at | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.854 | 0.000 | 0.000 | 0.348 | 4.622 | 0.257 | 0.280 | 0.072 | 1.531 | 10.568 | 0.047 | 0.000 | 0.250 | 19.067 | 4.062 | n/a | 0.048 | 5.239 | 0.128 | 0.048 |
| p99 | 57.833 | 0.352 | 0.000 | 0.352 | 7.343 | 0.443 | 0.287 | 0.096 | 2.271 | 12.081 | 0.086 | 0.000 | 0.254 | 21.890 | 13.081 | n/a | 0.052 | 8.162 | 0.141 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000d4 | 57.833 | 7.343 | 0.443 | 0.280 | 0.096 | 2.271 | 12.081 | 0.047 | 0.000 | 0.250 | 21.890 | 13.081 | n/a | 0.052 | 8.162 | 0.141 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000d1 | 40.854 | 4.622 | 0.257 | 0.287 | 0.072 | 1.531 | 10.568 | 0.086 | 0.000 | 0.254 | 19.067 | 4.062 | n/a | 0.048 | 5.239 | 0.128 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.766 | 0.813 | 0.000 | 1.634 | 4.191 | 0.008 | 0.000 | 0.082 | 1.022 | 3.725 | 0.044 | 0.000 | 0.649 | 9.855 | 7.283 | n/a | 0.046 | 4.920 | 0.121 | 0.046 |
| p99 | 60.981 | 1.694 | 0.767 | 2.008 | 11.104 | 2.576 | 0.000 | 0.965 | 4.037 | 20.248 | 0.062 | 0.000 | 1.125 | 36.668 | 13.710 | n/a | 0.052 | 13.756 | 0.311 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000d8 | 60.981 | 3.948 | 0.008 | 0.000 | 0.965 | 0.954 | 3.523 | 0.035 | 0.000 | 1.125 | 36.668 | 13.710 | n/a | 0.046 | 4.920 | 0.081 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000de | 44.299 | 11.104 | 2.576 | 0.000 | 0.076 | 4.037 | 8.155 | 0.047 | 0.000 | 0.718 | 9.855 | 7.679 | n/a | 0.052 | 13.756 | 0.311 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000d6 | 41.766 | 4.722 | 0.236 | 0.000 | 0.082 | 2.191 | 20.248 | 0.062 | 0.000 | 0.222 | 9.828 | 4.134 | n/a | 0.041 | 5.040 | 0.121 | 0.041 | gw-w/thread-46/gateway.admitted-work | none observed |
| fd1ce898f9d8088800000000000000db | 29.735 | 4.191 | 0.005 | 0.000 | 0.447 | 1.022 | 3.725 | 0.044 | 0.000 | 0.649 | 12.318 | 7.283 | n/a | 0.051 | 4.643 | 0.156 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.735 | 1.694 | 0.000 | 2.008 | 4.191 | 0.005 | 0.000 | 0.447 | 1.022 | 3.725 | 0.044 | 0.000 | 0.649 | 12.318 | 7.283 | n/a | 0.051 | 4.643 | 0.156 | 0.051 |
| p99 | 29.735 | 1.694 | 0.000 | 2.008 | 4.191 | 0.005 | 0.000 | 0.447 | 1.022 | 3.725 | 0.044 | 0.000 | 0.649 | 12.318 | 7.283 | n/a | 0.051 | 4.643 | 0.156 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000db | 29.735 | 4.191 | 0.005 | 0.000 | 0.447 | 1.022 | 3.725 | 0.044 | 0.000 | 0.649 | 12.318 | 7.283 | n/a | 0.051 | 4.643 | 0.156 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.860 | 0.000 | 0.000 | 0.321 | 6.125 | 0.231 | 0.000 | 0.075 | 3.308 | 8.114 | 0.069 | 0.000 | 0.456 | 9.193 | 3.939 | n/a | 0.049 | 6.478 | 0.203 | 0.049 |
| p99 | 43.524 | 0.260 | 0.000 | 0.651 | 6.154 | 0.281 | 0.317 | 0.699 | 4.891 | 18.213 | 0.083 | 0.000 | 4.204 | 11.094 | 5.875 | n/a | 0.069 | 6.857 | 0.274 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000e1 | 43.524 | 6.125 | 0.281 | 0.000 | 0.072 | 3.308 | 18.213 | 0.083 | 0.000 | 0.332 | 9.193 | 5.875 | n/a | 0.042 | 6.478 | 0.149 | 0.042 | gw-w/thread-49/gateway.admitted-work | none observed |
| fd1ce898f9d8088800000000000000e3 | 28.860 | 5.239 | 0.231 | 0.317 | 0.075 | 2.378 | 1.274 | 0.039 | 0.000 | 4.204 | 11.094 | 3.939 | n/a | 0.069 | 5.862 | 0.203 | 0.069 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000df | 25.037 | 6.154 | 0.005 | 0.000 | 0.699 | 4.891 | 8.114 | 0.069 | 0.000 | 0.456 | 4.043 | 0.558 | n/a | 0.049 | 6.857 | 0.274 | 0.049 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.037 | 0.000 | 0.000 | 0.277 | 6.154 | 0.005 | 0.000 | 0.699 | 4.891 | 8.114 | 0.069 | 0.000 | 0.456 | 4.043 | 0.558 | n/a | 0.049 | 6.857 | 0.274 | 0.049 |
| p99 | 25.037 | 0.000 | 0.000 | 0.277 | 6.154 | 0.005 | 0.000 | 0.699 | 4.891 | 8.114 | 0.069 | 0.000 | 0.456 | 4.043 | 0.558 | n/a | 0.049 | 6.857 | 0.274 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000df | 25.037 | 6.154 | 0.005 | 0.000 | 0.699 | 4.891 | 8.114 | 0.069 | 0.000 | 0.456 | 4.043 | 0.558 | n/a | 0.049 | 6.857 | 0.274 | 0.049 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.768 | 0.603 | 0.000 | 0.623 | 4.089 | 0.009 | 0.000 | 0.152 | 1.251 | 5.882 | 0.095 | 0.000 | 0.856 | 12.569 | 2.096 | n/a | 0.041 | 4.763 | 0.146 | 0.041 |
| p99 | 105.534 | 1.821 | 0.021 | 2.756 | 5.779 | 1.528 | 0.467 | 0.969 | 4.669 | 11.043 | 0.138 | 0.000 | 3.420 | 62.390 | 22.411 | n/a | 0.063 | 6.960 | 0.263 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d80888000000000000012c | 105.534 | 5.032 | 1.528 | 0.327 | 0.073 | 4.669 | 7.638 | 0.115 | 0.000 | 1.310 | 62.390 | 22.411 | n/a | 0.041 | 6.960 | 0.066 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000fc | 53.623 | 5.779 | 0.007 | 0.000 | 0.152 | 0.854 | 2.740 | 0.040 | 0.000 | 3.420 | 31.884 | 8.699 | n/a | 0.049 | 5.937 | 0.111 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000e6 | 37.333 | 4.935 | 0.006 | 0.000 | 0.492 | 1.190 | 6.206 | 0.138 | 0.000 | 0.856 | 15.618 | 7.853 | n/a | 0.038 | 5.433 | 0.146 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000fe | 35.788 | 3.517 | 0.234 | 0.260 | 0.079 | 2.268 | 9.833 | 0.072 | 0.000 | 0.772 | 17.808 | 0.902 | n/a | 0.043 | 4.090 | 0.114 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000f9 | 33.774 | 3.219 | 0.005 | 0.000 | 0.909 | 0.852 | 11.043 | 0.082 | 0.000 | 0.220 | 16.981 | 0.424 | n/a | 0.039 | 4.134 | 0.122 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000e8 | 32.768 | 4.391 | 0.258 | 0.237 | 0.067 | 2.163 | 7.428 | 0.113 | 0.000 | 1.560 | 10.336 | 6.177 | n/a | 0.039 | 4.952 | 0.151 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000f8 | 25.456 | 4.089 | 0.185 | 0.338 | 0.152 | 1.955 | 4.594 | 0.112 | 0.000 | 0.687 | 12.569 | 0.714 | n/a | 0.063 | 4.763 | 0.187 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000012a | 22.484 | 5.067 | 0.263 | 0.467 | 0.120 | 1.548 | 5.882 | 0.095 | 0.000 | 2.339 | 4.545 | 2.096 | n/a | 0.062 | 5.917 | 0.263 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000100 | 20.809 | 3.688 | 0.009 | 0.000 | 0.488 | 1.251 | 2.785 | 0.104 | 0.000 | 1.160 | 10.533 | 0.734 | n/a | 0.058 | 4.184 | 0.201 | 0.058 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000128 | 17.390 | 3.174 | 0.005 | 0.000 | 0.969 | 0.727 | 1.275 | 0.035 | 0.000 | 0.851 | 7.311 | 3.003 | n/a | 0.039 | 4.148 | 0.239 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 38.682 | 0.000 | 0.000 | 0.310 | 3.662 | 0.201 | 0.378 | 0.105 | 1.623 | 6.311 | 0.074 | 0.000 | 0.227 | 11.038 | 3.331 | n/a | 0.056 | 4.346 | 0.058 | 0.056 |
| p99 | 74.718 | 0.000 | 0.000 | 0.557 | 6.059 | 0.392 | 0.542 | 0.123 | 9.791 | 20.267 | 0.086 | 0.000 | 0.282 | 32.151 | 15.962 | n/a | 0.740 | 7.115 | 0.184 | 0.740 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000ea | 74.718 | 3.662 | 0.201 | 0.378 | 0.105 | 1.623 | 20.267 | 0.086 | 0.000 | 0.227 | 32.151 | 15.962 | n/a | 0.056 | 4.346 | 0.058 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000ec | 38.682 | 6.059 | 0.392 | 0.542 | 0.123 | 9.791 | 6.311 | 0.074 | 0.000 | 0.282 | 11.038 | 3.331 | n/a | 0.740 | 7.115 | 0.184 | 0.740 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.510 | 1.098 | 0.000 | 1.951 | 4.162 | 0.017 | 0.000 | 0.268 | 1.107 | 2.915 | 0.058 | 0.000 | 1.467 | 18.355 | 7.218 | n/a | 0.060 | 4.556 | 0.188 | 0.060 |
| p99 | 48.281 | 1.855 | 0.011 | 2.018 | 6.656 | 0.270 | 0.337 | 1.003 | 3.368 | 5.033 | 2.706 | 0.000 | 2.457 | 23.601 | 9.772 | n/a | 0.119 | 7.676 | 0.216 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000f3 | 48.281 | 3.883 | 0.270 | 0.337 | 0.066 | 1.107 | 5.033 | 2.706 | 0.000 | 1.467 | 23.601 | 9.772 | n/a | 0.038 | 4.556 | 0.094 | 0.038 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000ef | 35.510 | 6.656 | 0.017 | 0.000 | 1.003 | 3.368 | 2.915 | 0.037 | 0.000 | 0.205 | 18.355 | 2.835 | n/a | 0.119 | 7.676 | 0.216 | 0.119 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d8088800000000000000f1 | 23.599 | 4.162 | 0.007 | 0.000 | 0.268 | 0.983 | 1.181 | 0.058 | 0.000 | 2.457 | 7.205 | 7.218 | n/a | 0.060 | 4.437 | 0.188 | 0.060 | tx/thread-90/transactor.triplex-function | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.599 | 1.855 | 0.000 | 2.018 | 4.162 | 0.007 | 0.000 | 0.268 | 0.983 | 1.181 | 0.058 | 0.000 | 2.457 | 7.205 | 7.218 | n/a | 0.060 | 4.437 | 0.188 | 0.060 |
| p99 | 23.599 | 1.855 | 0.000 | 2.018 | 4.162 | 0.007 | 0.000 | 0.268 | 0.983 | 1.181 | 0.058 | 0.000 | 2.457 | 7.205 | 7.218 | n/a | 0.060 | 4.437 | 0.188 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d8088800000000000000f1 | 23.599 | 4.162 | 0.007 | 0.000 | 0.268 | 0.983 | 1.181 | 0.058 | 0.000 | 2.457 | 7.205 | 7.218 | n/a | 0.060 | 4.437 | 0.188 | 0.060 | tx/thread-90/transactor.triplex-function | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.390 | 0.775 | 0.000 | 1.618 | 3.174 | 0.005 | 0.000 | 0.488 | 0.727 | 1.275 | 0.035 | 0.000 | 0.851 | 7.311 | 0.734 | n/a | 0.039 | 4.148 | 0.201 | 0.039 |
| p99 | 20.809 | 1.061 | 0.000 | 1.656 | 3.688 | 0.009 | 0.000 | 0.969 | 1.251 | 2.785 | 0.104 | 0.000 | 1.160 | 10.533 | 3.003 | n/a | 0.058 | 4.184 | 0.239 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000100 | 20.809 | 3.688 | 0.009 | 0.000 | 0.488 | 1.251 | 2.785 | 0.104 | 0.000 | 1.160 | 10.533 | 0.734 | n/a | 0.058 | 4.184 | 0.201 | 0.058 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000128 | 17.390 | 3.174 | 0.005 | 0.000 | 0.969 | 0.727 | 1.275 | 0.035 | 0.000 | 0.851 | 7.311 | 3.003 | n/a | 0.039 | 4.148 | 0.239 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.860 | 0.572 | 0.000 | 1.566 | 4.776 | 0.007 | 0.000 | 0.158 | 1.030 | 2.418 | 0.042 | 0.000 | 0.220 | 9.860 | 3.408 | n/a | 0.041 | 5.386 | 0.167 | 0.041 |
| p99 | 53.770 | 1.920 | 0.007 | 5.303 | 7.766 | 15.742 | 0.381 | 1.063 | 9.165 | 15.719 | 0.115 | 0.000 | 3.756 | 28.697 | 14.005 | n/a | 0.093 | 21.738 | 0.479 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000102 | 53.770 | 3.117 | 0.005 | 0.000 | 0.158 | 1.001 | 6.145 | 0.110 | 0.000 | 0.491 | 28.697 | 14.005 | n/a | 0.040 | 3.281 | 0.061 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000104 | 50.251 | 5.648 | 0.270 | 0.275 | 0.070 | 2.265 | 15.719 | 0.057 | 0.000 | 0.220 | 18.220 | 7.466 | n/a | 0.042 | 6.263 | 0.125 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000114 | 45.388 | 5.503 | 15.742 | 0.381 | 0.112 | 2.285 | 5.848 | 0.061 | 0.000 | 0.208 | 11.748 | 3.408 | n/a | 0.093 | 21.738 | 0.479 | 0.093 | node-14/thread-0/rpc.probe.transact | client.encode 2.911ms |
| fd1ce898f9d808880000000000000110 | 40.939 | 4.776 | 0.178 | 0.361 | 0.062 | 2.053 | 15.665 | 0.115 | 0.000 | 0.470 | 9.860 | 7.358 | n/a | 0.041 | 5.377 | 0.131 | 0.041 | gw-w/thread-52/gateway.admitted-work | none observed |
| fd1ce898f9d808880000000000000112 | 38.662 | 5.389 | 0.007 | 0.000 | 1.063 | 0.744 | 2.854 | 0.046 | 0.000 | 0.215 | 22.789 | 5.513 | n/a | 0.041 | 6.459 | 0.167 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000010b | 31.860 | 3.931 | 0.006 | 0.000 | 0.434 | 9.165 | 1.641 | 0.042 | 0.000 | 0.197 | 9.064 | 7.317 | n/a | 0.063 | 4.371 | 0.137 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 4.469ms |
| fd1ce898f9d80888000000000000010a | 26.194 | 7.766 | 0.010 | 0.000 | 0.156 | 3.204 | 1.506 | 0.036 | 0.000 | 3.756 | 9.405 | 0.300 | n/a | 0.055 | 7.932 | 0.303 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000105 | 21.544 | 4.783 | 0.005 | 0.000 | 1.033 | 0.757 | 2.089 | 0.041 | 0.000 | 0.207 | 11.491 | 1.104 | n/a | 0.033 | 5.822 | 0.270 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000108 | 18.490 | 4.689 | 0.010 | 0.000 | 0.686 | 1.030 | 2.418 | 0.038 | 0.000 | 0.634 | 6.478 | 2.452 | n/a | 0.054 | 5.386 | 0.291 | 0.054 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000010e | 15.242 | 2.610 | 0.005 | 0.000 | 0.990 | 0.825 | 1.410 | 0.037 | 0.000 | 0.510 | 8.214 | 0.605 | n/a | 0.036 | 3.605 | 0.237 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.242 | 0.292 | 0.000 | 1.430 | 2.610 | 0.005 | 0.000 | 0.156 | 0.825 | 1.410 | 0.036 | 0.000 | 0.510 | 8.214 | 0.300 | n/a | 0.036 | 3.605 | 0.237 | 0.036 |
| p99 | 26.194 | 1.920 | 0.000 | 5.303 | 7.766 | 0.010 | 0.000 | 0.990 | 3.204 | 1.506 | 0.037 | 0.000 | 3.756 | 9.405 | 0.605 | n/a | 0.055 | 7.932 | 0.303 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d80888000000000000010a | 26.194 | 7.766 | 0.010 | 0.000 | 0.156 | 3.204 | 1.506 | 0.036 | 0.000 | 3.756 | 9.405 | 0.300 | n/a | 0.055 | 7.932 | 0.303 | 0.055 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000010e | 15.242 | 2.610 | 0.005 | 0.000 | 0.990 | 0.825 | 1.410 | 0.037 | 0.000 | 0.510 | 8.214 | 0.605 | n/a | 0.036 | 3.605 | 0.237 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.475 | 0.836 | 0.000 | 1.411 | 5.302 | 7.432 | 0.265 | 0.122 | 1.460 | 5.768 | 0.049 | 0.000 | 0.361 | 20.583 | 2.752 | n/a | 0.059 | 13.808 | 0.279 | 0.059 |
| p99 | 66.790 | 2.275 | 0.786 | 2.729 | 6.005 | 23.540 | 0.306 | 0.904 | 10.121 | 12.675 | 0.146 | 0.000 | 3.992 | 25.454 | 4.162 | n/a | 0.075 | 29.746 | 0.445 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000118 | 66.790 | 5.302 | 23.540 | 0.000 | 0.904 | 1.104 | 5.768 | 0.146 | 0.000 | 0.361 | 25.454 | 4.162 | n/a | 0.048 | 29.746 | 0.445 | 0.048 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | client.encode 2.560ms |
| fd1ce898f9d808880000000000000125 | 49.475 | 6.005 | 7.432 | 0.265 | 0.105 | 10.121 | 4.272 | 0.049 | 0.000 | 0.216 | 19.974 | 0.960 | n/a | 0.075 | 13.808 | 0.279 | 0.075 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000011c | 46.827 | 4.593 | 0.239 | 0.306 | 0.122 | 1.460 | 12.675 | 0.046 | 0.000 | 3.992 | 20.583 | 2.752 | n/a | 0.059 | 5.260 | 0.112 | 0.059 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.999 | 0.465 | 0.000 | 1.499 | 4.134 | 0.011 | 0.000 | 0.476 | 1.066 | 3.405 | 0.072 | 0.000 | 0.276 | 9.742 | 4.092 | n/a | 0.054 | 6.067 | 0.222 | 0.054 |
| p99 | 34.129 | 3.654 | 0.000 | 4.798 | 11.417 | 2.781 | 0.476 | 15.061 | 1.563 | 7.964 | 0.312 | 0.000 | 1.579 | 12.009 | 5.581 | n/a | 0.088 | 18.863 | 0.554 | 0.088 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000130 | 34.129 | 11.417 | 0.009 | 0.000 | 0.716 | 0.973 | 3.405 | 0.312 | 0.000 | 0.276 | 12.009 | 4.924 | n/a | 0.088 | 12.143 | 0.356 | 0.088 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000131 | 34.045 | 3.792 | 0.011 | 0.000 | 15.061 | 1.066 | 1.945 | 0.049 | 0.000 | 0.197 | 11.449 | 0.406 | n/a | 0.070 | 18.863 | 0.554 | 0.070 | node-14/thread-0/driver.queue.subject | driver.publication 2.315ms; driver.expected-state.bind-receipt 1.941ms |
| fd1ce898f9d808880000000000000134 | 30.600 | 4.134 | 2.781 | 0.247 | 0.065 | 1.563 | 7.964 | 0.094 | 0.000 | 0.907 | 8.708 | 4.092 | n/a | 0.046 | 7.227 | 0.236 | 0.046 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000012d | 29.999 | 5.579 | 0.012 | 0.000 | 0.476 | 1.304 | 6.254 | 0.072 | 0.000 | 1.579 | 9.742 | 4.925 | n/a | 0.056 | 6.067 | 0.202 | 0.056 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000136 | 28.530 | 4.885 | 0.226 | 0.476 | 0.075 | 1.159 | 5.650 | 0.113 | 0.000 | 0.312 | 10.000 | 5.581 | n/a | 0.054 | 5.662 | 0.198 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d808880000000000000138 | 16.812 | 2.990 | 0.006 | 0.000 | 0.741 | 0.930 | 1.723 | 0.055 | 0.000 | 0.209 | 7.801 | 2.320 | n/a | 0.037 | 3.737 | 0.222 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.812 | 0.465 | 0.000 | 1.499 | 2.990 | 0.006 | 0.000 | 0.741 | 0.930 | 1.723 | 0.049 | 0.000 | 0.197 | 7.801 | 0.406 | n/a | 0.037 | 3.737 | 0.222 | 0.037 |
| p99 | 34.045 | 0.506 | 0.000 | 1.541 | 3.792 | 0.011 | 0.000 | 15.061 | 1.066 | 1.945 | 0.055 | 0.000 | 0.209 | 11.449 | 2.320 | n/a | 0.070 | 18.863 | 0.554 | 0.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000131 | 34.045 | 3.792 | 0.011 | 0.000 | 15.061 | 1.066 | 1.945 | 0.049 | 0.000 | 0.197 | 11.449 | 0.406 | n/a | 0.070 | 18.863 | 0.554 | 0.070 | node-14/thread-0/driver.queue.subject | driver.publication 2.315ms; driver.expected-state.bind-receipt 1.941ms |
| fd1ce898f9d808880000000000000138 | 16.812 | 2.990 | 0.006 | 0.000 | 0.741 | 0.930 | 1.723 | 0.055 | 0.000 | 0.209 | 7.801 | 2.320 | n/a | 0.037 | 3.737 | 0.222 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.752 | 0.660 | 0.000 | 1.704 | 5.475 | 0.198 | 0.283 | 0.108 | 1.502 | 2.354 | 0.085 | 0.000 | 0.447 | 9.453 | 2.421 | n/a | 0.049 | 6.226 | 0.233 | 0.049 |
| p99 | 30.234 | 0.864 | 0.924 | 1.825 | 5.868 | 0.557 | 0.489 | 1.091 | 2.954 | 4.655 | 0.095 | 0.000 | 0.946 | 14.625 | 4.463 | n/a | 0.069 | 6.816 | 0.337 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d80888000000000000013e | 30.234 | 5.868 | 0.557 | 0.283 | 0.108 | 1.502 | 2.354 | 0.085 | 0.000 | 0.321 | 14.625 | 4.463 | n/a | 0.069 | 6.816 | 0.225 | 0.069 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000013a | 26.752 | 5.475 | 0.198 | 0.489 | 0.064 | 2.954 | 4.655 | 0.049 | 0.000 | 0.946 | 9.453 | 2.421 | n/a | 0.049 | 6.226 | 0.233 | 0.049 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| fd1ce898f9d80888000000000000013c | 13.695 | 3.516 | 0.006 | 0.000 | 1.091 | 0.816 | 1.500 | 0.095 | 0.000 | 0.447 | 5.853 | 0.325 | n/a | 0.047 | 4.613 | 0.337 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.695 | 0.660 | 0.000 | 1.704 | 3.516 | 0.006 | 0.000 | 1.091 | 0.816 | 1.500 | 0.095 | 0.000 | 0.447 | 5.853 | 0.325 | n/a | 0.047 | 4.613 | 0.337 | 0.047 |
| p99 | 13.695 | 0.660 | 0.000 | 1.704 | 3.516 | 0.006 | 0.000 | 1.091 | 0.816 | 1.500 | 0.095 | 0.000 | 0.447 | 5.853 | 0.325 | n/a | 0.047 | 4.613 | 0.337 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d80888000000000000013c | 13.695 | 3.516 | 0.006 | 0.000 | 1.091 | 0.816 | 1.500 | 0.095 | 0.000 | 0.447 | 5.853 | 0.325 | n/a | 0.047 | 4.613 | 0.337 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 102.612 | 0.887 | 0.000 | 2.053 | 7.392 | 15.769 | 0.000 | 0.010 | 3.854 | 1.544 | 0.143 | 0.000 | 0.362 | 67.252 | 7.445 | n/a | 0.024 | 22.544 | 0.217 | 0.024 |
| p99 | 177.295 | 1.930 | 2.198 | 4.280 | 10.750 | 30.572 | 0.000 | 0.051 | 10.749 | 3.285 | 6.017 | 0.000 | 4.390 | 118.360 | 22.591 | n/a | 0.067 | 38.554 | 0.255 | 0.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fd1ce898f9d808880000000000000149 | 177.295 | 7.977 | 30.572 | 0.000 | 0.005 | 6.389 | 1.240 | 2.646 | 0.000 | 0.272 | 118.360 | 9.767 | n/a | 0.067 | 38.554 | 0.217 | 0.067 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.670ms; driver.publication 2.941ms; driver.publication 2.416ms; driver.publication 2.085ms; driver.publication 1.594ms |
| fd1ce898f9d808880000000000000148 | 168.989 | 10.103 | 27.028 | 0.000 | 0.006 | 3.997 | 2.395 | 4.858 | 0.000 | 0.056 | 113.060 | 7.445 | n/a | 0.042 | 37.136 | 0.220 | 0.042 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.941ms; driver.publication 2.416ms; driver.publication 2.085ms; driver.publication 1.594ms; driver.publication 1.403ms |
| fd1ce898f9d808880000000000000147 | 150.251 | 7.308 | 26.187 | 0.000 | 0.010 | 2.761 | 3.285 | 6.017 | 0.000 | 0.182 | 93.710 | 10.766 | n/a | 0.024 | 33.505 | 0.223 | 0.024 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.941ms; driver.publication 2.416ms; driver.publication 2.085ms; driver.publication 1.594ms; driver.publication 1.403ms |
| fd1ce898f9d808880000000000000146 | 136.721 | 8.718 | 25.059 | 0.000 | 0.010 | 2.333 | 1.178 | 2.522 | 0.000 | 1.731 | 72.555 | 22.591 | n/a | 0.023 | 33.786 | 0.247 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 2.085ms; driver.publication 1.594ms; driver.publication 1.403ms; driver.expected-state.bind-receipt 1.402ms |
| fd1ce898f9d808880000000000000145 | 110.139 | 10.750 | 17.326 | 0.000 | 0.006 | 5.716 | 1.192 | 0.054 | 0.000 | 3.222 | 67.252 | 4.597 | n/a | 0.023 | 28.083 | 0.255 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 2.085ms; driver.publication 1.594ms; driver.publication 1.342ms; driver.publication 1.283ms |
| fd1ce898f9d808880000000000000144 | 102.612 | 6.762 | 15.769 | 0.000 | 0.014 | 3.077 | 1.948 | 1.730 | 0.000 | 1.070 | 67.637 | 4.569 | n/a | 0.036 | 22.544 | 0.220 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 2.085ms; driver.publication 1.594ms; driver.publication 1.283ms |
| fd1ce898f9d808880000000000000143 | 87.608 | 8.187 | 5.817 | 0.000 | 0.011 | 10.749 | 1.413 | 0.049 | 0.000 | 4.390 | 51.354 | 5.615 | n/a | 0.022 | 14.016 | 0.160 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.416ms; driver.publication 1.594ms; driver.publication 1.283ms |
| fd1ce898f9d808880000000000000142 | 78.549 | 7.392 | 2.837 | 0.000 | 0.008 | 7.538 | 1.544 | 0.067 | 0.000 | 0.323 | 48.273 | 10.546 | n/a | 0.022 | 10.236 | 0.130 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.594ms; driver.publication 1.283ms |
| fd1ce898f9d808880000000000000141 | 60.692 | 6.039 | 2.548 | 0.000 | 0.016 | 2.907 | 1.690 | 0.143 | 0.000 | 0.362 | 40.677 | 6.285 | n/a | 0.024 | 8.603 | 0.142 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.594ms |
| fd1ce898f9d808880000000000000140 | 47.753 | 5.461 | 0.025 | 0.000 | 0.051 | 3.854 | 1.822 | 0.088 | 0.000 | 0.402 | 24.121 | 11.894 | n/a | 0.036 | 5.537 | 0.116 | 0.036 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (247 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.021 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.020 | 0.935 | 0.001 |
| p99 | 289.188 | n/a | n/a | n/a | 34.320 | n/a | 2.352 | 289.129 | 5.811 | 3.494 | 0.013 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.021 | 289.185 | 1.000 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa000000000000011e | 289.329 | 0.486 | n/a | 0.000 | 288.836 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 289.322 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000000011f | 289.203 | 0.070 | n/a | 0.000 | 289.129 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 289.199 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000000120 | 289.188 | 0.051 | n/a | 0.000 | 289.134 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 289.185 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000000121 | 289.170 | 0.026 | n/a | 0.000 | 289.141 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 289.167 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000000150 | 289.135 | 0.022 | n/a | 0.000 | 289.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.133 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000014c | 289.127 | 0.276 | n/a | 0.000 | 288.844 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 289.120 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000014f | 289.108 | 0.025 | n/a | 0.000 | 289.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 289.105 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000014e | 289.093 | 0.027 | n/a | 0.000 | 289.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 289.090 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000014d | 289.073 | 0.043 | n/a | 0.000 | 289.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 289.069 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000000127 | 283.802 | 0.088 | n/a | 0.000 | 283.711 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 283.799 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000009d1c | 279.033 | 0.449 | n/a | 0.000 | 278.582 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.031 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 4bc8c05af1be6546000000000000a882 | 278.700 | 0.019 | n/a | 0.000 | 278.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.699 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 4bc8c05af1be6546000000000000a883 | 278.690 | 0.024 | n/a | 0.000 | 278.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.689 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 4bc8c05af1be6546000000000000a884 | 278.686 | 0.014 | n/a | 0.000 | 278.670 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.685 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 4bc8c05af1be6546000000000000a885 | 278.683 | 0.026 | n/a | 0.000 | 278.656 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.682 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 4bc8c05af1be6546000000000000a881 | 278.680 | 0.033 | n/a | 0.000 | 278.647 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.680 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| 4bc8c05af1be6546000000000000a880 | 278.633 | 0.212 | n/a | 0.000 | 278.419 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.631 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.047ms |
| eec0dab54e37f4e10000000000009d1b | 278.612 | 0.045 | n/a | 0.000 | 278.565 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.610 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| eec0dab54e37f4e10000000000009d1a | 278.611 | 0.117 | n/a | 0.000 | 278.491 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.609 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| eec0dab54e37f4e10000000000009d19 | 278.588 | 0.318 | n/a | 0.000 | 278.266 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 278.584 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.034ms |

## P1 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.929 | 0.001 |
| p99 | 281.070 | n/a | n/a | n/a | 4.874 | n/a | 0.000 | 280.229 | 1.448 | 1.485 | 0.015 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.007 | 281.064 | 1.000 | 0.007 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bc8c05af1be65460000000000020f22 | 281.070 | 0.836 | n/a | 0.000 | 280.229 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 281.064 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000000f161 | 104.196 | 0.264 | n/a | 0.000 | 103.925 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 104.189 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.028ms |
| 4bc8c05af1be6546000000000000f18f | 6.698 | 3.717 | n/a | 0.000 | 0.000 | 1.448 | 1.485 | 0.015 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.004 | 3.717 | 0.555 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be6546000000000001ed64 | 4.878 | 4.874 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 4.874 | 0.999 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be6546000000000001269d | 1.353 | 1.351 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.351 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be6546000000000001d9de | 1.209 | 1.207 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.207 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000209e2 | 0.815 | 0.814 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.814 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000020dfb | 0.686 | 0.684 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.684 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000001aeb7 | 0.642 | 0.640 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.640 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000001f85d | 0.640 | 0.638 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.638 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000020e50 | 0.561 | 0.559 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.559 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000001cc7a | 0.495 | 0.492 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.492 | 0.995 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be6546000000000001e96e | 0.493 | 0.491 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.491 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000014705 | 0.451 | 0.450 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.450 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000001f23f | 0.399 | 0.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.398 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000014031 | 0.397 | 0.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.395 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000020e39 | 0.391 | 0.390 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.390 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000020c80 | 0.384 | 0.382 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.382 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000001b66e | 0.357 | 0.357 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.357 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000001cc66 | 0.357 | 0.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.355 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (231 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.947 | 0.001 |
| p99 | 283.639 | n/a | n/a | n/a | 7.195 | n/a | 0.000 | 283.443 | 0.785 | 0.698 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.021 | 283.636 | 1.000 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bc8c05af1be6546000000000002250b | 284.663 | 0.152 | n/a | 0.000 | 284.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 284.660 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000002250c | 284.616 | 0.028 | n/a | 0.000 | 284.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 284.614 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000000fce6 | 283.639 | 0.211 | n/a | 0.000 | 283.425 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 283.636 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000eb84 | 283.587 | 0.142 | n/a | 0.000 | 283.443 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.585 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000dd8b | 21.401 | 14.078 | n/a | 1.226 | 0.000 | 4.496 | 1.567 | 0.010 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.007 | 15.304 | 0.715 | 0.007 | node-14/thread-5/reader.execute | replica.apply-delta 0.035ms |
| 4bc8c05af1be6546000000000002c011 | 11.495 | 11.493 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 11.493 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000020f25 | 10.914 | 0.075 | n/a | 0.000 | 10.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 10.912 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000000dd82 | 10.517 | 0.284 | n/a | 0.000 | 10.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 10.496 | 0.998 | 0.021 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000020f79 | 9.623 | 6.610 | n/a | 1.511 | 0.000 | 0.785 | 0.698 | 0.005 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.003 | 8.122 | 0.844 | 0.003 | node-14/thread-3/reader.execute | none observed |
| c6d5734f62c382fa000000000000eef7 | 9.217 | 0.322 | n/a | 0.000 | 8.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 9.212 | 0.999 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000018208 | 7.198 | 7.195 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 7.195 | 1.000 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| c6d5734f62c382fa000000000000ef31 | 4.534 | 2.596 | n/a | 0.000 | 0.000 | 1.136 | 0.760 | 0.016 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.003 | 2.596 | 0.572 | 0.003 | node-14/thread-4/reader.execute | replica.apply-delta 0.018ms |
| 4bc8c05af1be654600000000000225ff | 4.100 | 4.098 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 4.098 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000002c97a | 4.046 | 4.044 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.044 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000030faa | 3.739 | 3.737 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.737 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000233c0 | 3.736 | 3.734 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.734 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| c6d5734f62c382fa0000000000018187 | 3.734 | 3.732 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.732 | 0.999 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000224ba | 3.401 | 3.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 3.395 | 0.998 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| c6d5734f62c382fa000000000001b81c | 3.127 | 3.118 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.118 | 0.997 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| eec0dab54e37f4e1000000000001af33 | 3.013 | 3.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.011 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |

## P1 / L16 / read (244 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.026 | 0.952 | 0.001 |
| p99 | 298.504 | n/a | n/a | n/a | 6.052 | n/a | 0.000 | 298.473 | 2.075 | 1.423 | 0.010 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.022 | 298.503 | 1.000 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa0000000000022cc5 | 298.510 | 0.023 | n/a | 0.000 | 298.486 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.509 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.025ms |
| eec0dab54e37f4e10000000000022b5a | 298.509 | 0.015 | n/a | 0.000 | 298.492 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.508 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| eec0dab54e37f4e10000000000022b59 | 298.504 | 0.031 | n/a | 0.000 | 298.473 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.503 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| eec0dab54e37f4e10000000000022b5b | 298.493 | 0.026 | n/a | 0.000 | 298.464 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.490 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 4bc8c05af1be65460000000000039988 | 298.477 | 0.012 | n/a | 0.000 | 298.464 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.476 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.024ms |
| c6d5734f62c382fa0000000000022cc4 | 298.474 | 0.031 | n/a | 0.000 | 298.442 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.473 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.025ms |
| 4bc8c05af1be65460000000000039987 | 298.472 | 0.013 | n/a | 0.000 | 298.458 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.471 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.024ms |
| eec0dab54e37f4e10000000000022b58 | 298.469 | 0.072 | n/a | 0.000 | 298.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.467 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| 4bc8c05af1be65460000000000039986 | 298.462 | 0.017 | n/a | 0.000 | 298.445 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.461 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.024ms |
| c6d5734f62c382fa0000000000022cc1 | 298.453 | 0.251 | n/a | 0.000 | 298.199 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.450 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.025ms |
| 4bc8c05af1be65460000000000039985 | 298.450 | 0.075 | n/a | 0.000 | 298.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.447 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.024ms |
| c6d5734f62c382fa0000000000022cc3 | 298.425 | 0.024 | n/a | 0.000 | 298.400 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.424 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.025ms |
| eec0dab54e37f4e10000000000022b57 | 298.407 | 0.105 | n/a | 0.000 | 298.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.405 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.045ms; replica.apply-delta 0.036ms |
| c6d5734f62c382fa0000000000022cc2 | 298.399 | 0.031 | n/a | 0.000 | 298.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.397 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms; replica.apply-delta 0.025ms |
| 4bc8c05af1be6546000000000003998b | 298.317 | 0.021 | n/a | 0.000 | 298.293 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.314 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| 4bc8c05af1be6546000000000003998c | 298.311 | 0.012 | n/a | 0.000 | 298.298 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.310 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| c6d5734f62c382fa0000000000022ca2 | 265.962 | 0.207 | n/a | 0.000 | 265.754 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.960 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000022ca3 | 265.922 | 0.069 | n/a | 0.000 | 265.853 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.922 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000022ca5 | 265.905 | 0.060 | n/a | 0.000 | 265.845 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.904 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000022ca4 | 265.896 | 0.029 | n/a | 0.000 | 265.866 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 265.895 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L64 / read (205 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.032 | 0.958 | 0.001 |
| p99 | 334.711 | n/a | n/a | n/a | 36.391 | n/a | 3.248 | 334.673 | 37.325 | 23.898 | 18.347 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.017 | 334.710 | 1.000 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa000000000002d04b | 335.958 | 1.291 | n/a | 0.000 | 334.663 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 335.954 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000002d05f | 334.810 | 0.082 | n/a | 0.000 | 334.707 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 334.789 | 1.000 | 0.022 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000002d060 | 334.711 | 0.019 | n/a | 0.000 | 334.691 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 334.710 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000002d061 | 334.696 | 0.021 | n/a | 0.000 | 334.673 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 334.694 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000002d062 | 334.648 | 0.042 | n/a | 0.000 | 334.604 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 334.646 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000002d16f | 334.028 | 0.376 | n/a | 0.000 | 333.649 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 334.025 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000002d173 | 334.010 | 0.029 | n/a | 0.000 | 333.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 334.009 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000002d172 | 333.987 | 0.029 | n/a | 0.000 | 333.957 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.986 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000002d171 | 333.937 | 0.030 | n/a | 0.000 | 333.906 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 333.935 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000002d170 | 333.929 | 0.056 | n/a | 0.000 | 333.872 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 333.927 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e100000000000369ec | 329.883 | 0.135 | n/a | 0.000 | 329.744 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 329.879 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 4bc8c05af1be65460000000000043a7a | 329.870 | 0.327 | n/a | 0.000 | 329.540 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 329.867 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e100000000000369ed | 329.822 | 0.041 | n/a | 0.000 | 329.779 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.819 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| eec0dab54e37f4e100000000000369ee | 329.789 | 0.029 | n/a | 0.000 | 329.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.787 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 4bc8c05af1be65460000000000043a7f | 329.766 | 0.086 | n/a | 0.000 | 329.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 329.766 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa00000000000367f0 | 329.755 | 0.020 | n/a | 0.000 | 329.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.753 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| c6d5734f62c382fa00000000000367f1 | 329.754 | 0.018 | n/a | 0.000 | 329.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 329.751 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| 4bc8c05af1be65460000000000043a7b | 329.753 | 0.087 | n/a | 0.000 | 329.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.751 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa00000000000367ee | 329.752 | 0.141 | n/a | 0.000 | 329.608 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 329.749 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| c6d5734f62c382fa00000000000367f2 | 329.751 | 0.015 | n/a | 0.000 | 329.735 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 329.749 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.048ms |

## P1 / L256 / read (198 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.035 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.033 | 0.955 | 0.001 |
| p99 | 317.525 | n/a | n/a | n/a | 16.057 | n/a | 0.000 | 317.491 | 11.015 | 9.345 | 16.505 | 6.952 | 0.019 | 0.000 | n/a | n/a | 0.017 | 317.518 | 1.000 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa00000000000404b8 | 317.564 | 0.058 | n/a | 0.000 | 317.506 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.563 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa00000000000404b7 | 317.525 | 0.027 | n/a | 0.000 | 317.491 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 317.518 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000003ff5b | 317.502 | 0.014 | n/a | 0.000 | 317.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 317.494 | 1.000 | 0.008 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000003ff5a | 317.500 | 0.014 | n/a | 0.000 | 317.485 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.499 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000003ff59 | 317.491 | 0.015 | n/a | 0.000 | 317.476 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.490 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000003ff58 | 317.485 | 0.019 | n/a | 0.000 | 317.465 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.484 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e1000000000003ff57 | 317.484 | 0.127 | n/a | 0.000 | 317.351 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 317.479 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa00000000000404b6 | 317.466 | 0.026 | n/a | 0.000 | 317.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.465 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa00000000000404b5 | 317.443 | 0.071 | n/a | 0.000 | 317.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.442 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000005600d | 317.384 | 0.016 | n/a | 0.000 | 317.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.383 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000005600c | 317.374 | 0.013 | n/a | 0.000 | 317.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.373 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000005600b | 317.365 | 0.014 | n/a | 0.000 | 317.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.364 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa00000000000404b4 | 317.358 | 0.188 | n/a | 0.000 | 317.164 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 317.352 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000005600a | 317.354 | 0.014 | n/a | 0.000 | 317.339 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.353 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000056009 | 317.343 | 0.019 | n/a | 0.000 | 317.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.342 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000056008 | 317.323 | 0.120 | n/a | 0.000 | 317.200 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 317.319 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000055fb4 | 273.879 | 0.015 | n/a | 0.000 | 273.863 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.878 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 4bc8c05af1be65460000000000055fb3 | 273.870 | 0.037 | n/a | 0.000 | 273.832 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.869 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| 4bc8c05af1be65460000000000055fb2 | 273.833 | 0.110 | n/a | 0.000 | 273.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.830 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.034ms |
| eec0dab54e37f4e1000000000003ff2a | 273.370 | 0.013 | n/a | 0.000 | 273.356 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.369 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (319 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | n/a | n/a | n/a | 0.025 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.025 | 0.950 | 0.001 |
| p99 | 9.315 | n/a | n/a | n/a | 9.265 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 9.265 | 1.000 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa00000000000428b6 | 31.634 | 16.601 | n/a | 1.978 | 0.000 | 7.625 | 5.408 | 0.006 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.002 | 18.578 | 0.587 | 0.002 | node-14/thread-4/reader.execute | none observed |
| eec0dab54e37f4e100000000000422a4 | 20.067 | 6.462 | n/a | 0.000 | 0.000 | 4.719 | 8.843 | 0.011 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.003 | 6.462 | 0.322 | 0.003 | gw-r/thread-55/gateway.admitted-work | none observed |
| 4bc8c05af1be6546000000000005865f | 9.446 | 3.676 | n/a | 0.000 | 0.000 | 4.070 | 1.653 | 0.015 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.002 | 3.676 | 0.389 | 0.002 | node-14/thread-3/socket.wait-first-byte | replica.apply-delta 0.027ms |
| 4bc8c05af1be654600000000000630f2 | 9.315 | 9.310 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 9.310 | 0.999 | 0.005 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 4bc8c05af1be654600000000000630f4 | 9.314 | 9.289 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 9.289 | 0.997 | 0.025 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 4bc8c05af1be654600000000000630f6 | 9.292 | 9.265 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 9.265 | 0.997 | 0.027 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 4bc8c05af1be654600000000000630f8 | 9.282 | 9.254 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 9.254 | 0.997 | 0.028 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| 4bc8c05af1be654600000000000630fa | 9.257 | 9.228 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 9.228 | 0.997 | 0.030 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| eec0dab54e37f4e1000000000004cb46 | 8.957 | 8.955 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 8.955 | 1.000 | 0.002 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| eec0dab54e37f4e1000000000004cb49 | 8.925 | 8.909 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 8.909 | 0.998 | 0.016 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| eec0dab54e37f4e1000000000004cb4b | 8.657 | 8.637 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.637 | 0.998 | 0.020 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 4bc8c05af1be654600000000000630fc | 8.295 | 8.258 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 8.258 | 0.996 | 0.037 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.034ms |
| c6d5734f62c382fa000000000004d5e5 | 8.273 | 8.269 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 8.269 | 0.999 | 0.004 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.052ms |
| c6d5734f62c382fa000000000004d5e6 | 8.251 | 8.229 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 8.229 | 0.997 | 0.022 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.052ms |
| c6d5734f62c382fa000000000004d5e8 | 8.224 | 8.201 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 8.201 | 0.997 | 0.023 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.052ms |
| c6d5734f62c382fa000000000004d5ea | 8.209 | 8.184 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 8.184 | 0.997 | 0.024 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.052ms |
| c6d5734f62c382fa000000000004d5ec | 8.195 | 8.169 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.169 | 0.997 | 0.026 | node-14/thread-4/replica.pull-at | replica.apply-delta 0.052ms |
| eec0dab54e37f4e1000000000004cb4d | 7.962 | 7.944 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.944 | 0.998 | 0.018 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| eec0dab54e37f4e1000000000004cb4e | 7.953 | 7.933 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 7.933 | 0.998 | 0.019 | node-14/thread-5/replica.pull-at | replica.apply-delta 0.033ms |
| 4bc8c05af1be654600000000000635dc | 6.125 | 6.106 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.106 | 0.997 | 0.019 | node-14/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (233 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.024 | 0.959 | 0.001 |
| p99 | 309.844 | n/a | n/a | n/a | 3.869 | n/a | 0.000 | 309.812 | 1.096 | 0.709 | 0.005 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.029 | 309.842 | 1.000 | 0.029 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eec0dab54e37f4e1000000000005ec13 | 309.993 | 0.045 | n/a | 0.000 | 309.947 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.992 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| eec0dab54e37f4e1000000000005ec12 | 309.889 | 0.029 | n/a | 0.000 | 309.859 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.888 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| eec0dab54e37f4e1000000000005ec11 | 309.844 | 0.031 | n/a | 0.000 | 309.812 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.842 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| eec0dab54e37f4e1000000000005ec10 | 309.794 | 0.046 | n/a | 0.000 | 309.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 309.793 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| eec0dab54e37f4e1000000000005ec0f | 309.685 | 0.206 | n/a | 0.000 | 309.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 309.681 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| c6d5734f62c382fa000000000005ff68 | 309.546 | 0.129 | n/a | 0.000 | 309.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.544 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| c6d5734f62c382fa000000000005ff67 | 309.524 | 0.035 | n/a | 0.000 | 309.487 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.522 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| c6d5734f62c382fa000000000005ff69 | 309.523 | 0.052 | n/a | 0.000 | 309.470 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.521 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| c6d5734f62c382fa000000000005ff66 | 309.484 | 0.049 | n/a | 0.000 | 309.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 309.482 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| c6d5734f62c382fa000000000005ff65 | 309.404 | 0.228 | n/a | 0.000 | 309.172 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 309.400 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 4bc8c05af1be654600000000000761fb | 307.080 | 0.026 | n/a | 0.000 | 307.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.079 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4bc8c05af1be654600000000000761fa | 307.043 | 0.027 | n/a | 0.000 | 307.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.042 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4bc8c05af1be654600000000000761f9 | 307.020 | 0.069 | n/a | 0.000 | 306.950 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 307.019 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4bc8c05af1be654600000000000761f8 | 306.977 | 0.084 | n/a | 0.000 | 306.891 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 306.976 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4bc8c05af1be654600000000000761f7 | 306.901 | 0.330 | n/a | 0.000 | 306.569 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 306.899 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4bc8c05af1be654600000000000761f6 | 306.635 | 0.642 | n/a | 0.000 | 305.990 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 306.632 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.064ms |
| 4bc8c05af1be65460000000000076e15 | 279.364 | 0.013 | n/a | 0.000 | 279.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.363 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000076e14 | 279.355 | 0.014 | n/a | 0.000 | 279.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.354 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000076e13 | 279.340 | 0.020 | n/a | 0.000 | 279.319 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.339 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be65460000000000076e12 | 279.323 | 0.016 | n/a | 0.000 | 279.306 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.322 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.011 | 0.933 | 0.001 |
| p99 | 0.967 | n/a | n/a | n/a | 0.965 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.965 | 0.998 | 0.014 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bc8c05af1be6546000000000007b126 | 22.407 | 14.501 | n/a | 1.232 | 0.000 | 0.976 | 5.638 | 0.022 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.002 | 15.732 | 0.702 | 0.002 | node-14/thread-3/reader.execute | replica.apply-delta 0.031ms |
| 4bc8c05af1be654600000000000860f4 | 0.967 | 0.965 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.965 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007b4fc | 0.922 | 0.921 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.921 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007d5b9 | 0.741 | 0.732 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.732 | 0.988 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000008fa4b | 0.657 | 0.656 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.656 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007f405 | 0.614 | 0.613 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.613 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007ee47 | 0.513 | 0.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.512 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000840ce | 0.511 | 0.510 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.510 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000958a1 | 0.496 | 0.494 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.494 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007fcf3 | 0.480 | 0.479 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.479 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007fbc8 | 0.441 | 0.440 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.440 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007d5ba | 0.431 | 0.424 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.424 | 0.983 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007d42e | 0.427 | 0.426 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.426 | 0.997 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be6546000000000008c7d7 | 0.427 | 0.363 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.063 | 0.363 | 0.851 | 0.063 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007c541 | 0.424 | 0.416 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.416 | 0.982 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000007f1c6 | 0.424 | 0.422 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.422 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000009587b | 0.420 | 0.418 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.418 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000085fa6 | 0.408 | 0.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.406 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000091b38 | 0.384 | 0.382 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.382 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000086bab | 0.382 | 0.380 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.380 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (181 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.007 | n/a | n/a | n/a | 0.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.007 | 0.917 | 0.001 |
| p99 | 1.097 | n/a | n/a | n/a | 1.093 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.093 | 0.998 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bc8c05af1be6546000000000009bbfd | 17.738 | 2.573 | n/a | 0.000 | 0.000 | 1.544 | 13.525 | 0.016 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.003 | 2.573 | 0.145 | 0.003 | gw-r/thread-70/gateway.admitted-work | none observed |
| 4bc8c05af1be654600000000000ba2a8 | 1.097 | 1.093 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.093 | 0.996 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be654600000000000bb3c8 | 0.887 | 0.886 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.886 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000009c868 | 0.865 | 0.864 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.864 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000b23bc | 0.788 | 0.786 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.786 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000a4d21 | 0.702 | 0.700 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.700 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000a29ef | 0.680 | 0.678 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.678 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000b5c29 | 0.580 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.579 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ad808 | 0.565 | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.554 | 0.011 | 0.019 | 0.554 | uncovered | none observed |
| 4bc8c05af1be654600000000000a90c7 | 0.540 | 0.538 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.538 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000aeaee | 0.537 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.536 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ad462 | 0.521 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.519 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000a36c9 | 0.500 | 0.498 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.498 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000c1138 | 0.436 | 0.433 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.433 | 0.992 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000b244d | 0.410 | 0.408 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.408 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000bf735 | 0.386 | 0.384 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.384 | 0.993 | 0.003 | node-14/thread-3/reader.observe | none observed |
| 4bc8c05af1be654600000000000bc413 | 0.376 | 0.374 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.374 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000bea86 | 0.368 | 0.366 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.366 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ba22f | 0.359 | 0.356 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.356 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000c116b | 0.356 | 0.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.355 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (165 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.918 | 0.001 |
| p99 | 0.783 | n/a | n/a | n/a | 0.783 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.783 | 0.998 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bc8c05af1be654600000000000c2e05 | 16.562 | 1.791 | n/a | 0.000 | 0.000 | 1.526 | 13.180 | 0.021 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.002 | 1.791 | 0.108 | 0.002 | gw-r/thread-48/gateway.admitted-work | none observed |
| 4bc8c05af1be654600000000000d7ad7 | 0.783 | 0.783 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.783 | 0.999 | 0.000 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000dd528 | 0.652 | 0.650 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.650 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000dc7b9 | 0.641 | 0.639 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.639 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ddfb0 | 0.613 | 0.605 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.605 | 0.988 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000d0a69 | 0.596 | 0.594 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.594 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000c6beb | 0.576 | 0.575 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.575 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000dbe98 | 0.554 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.552 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000e18d7 | 0.524 | 0.523 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.523 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000c35d9 | 0.475 | 0.474 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.474 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000d0077 | 0.473 | 0.470 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.470 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000d7a14 | 0.469 | 0.466 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.466 | 0.995 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be654600000000000cafc0 | 0.464 | 0.462 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.462 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000c2de6 | 0.450 | 0.410 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 0.410 | 0.912 | 0.040 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ca15c | 0.426 | 0.424 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.424 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000e2636 | 0.421 | 0.419 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.419 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000d8387 | 0.416 | 0.414 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.414 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000dcc11 | 0.399 | 0.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.397 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000d36b6 | 0.394 | 0.392 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.392 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000d7a5c | 0.388 | 0.386 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.386 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (162 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.923 | 0.001 |
| p99 | 0.892 | n/a | n/a | n/a | 0.889 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.889 | 0.998 | 0.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4bc8c05af1be654600000000000e518c | 16.186 | 3.288 | n/a | 0.000 | 0.000 | 1.293 | 11.561 | 0.012 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.003 | 3.288 | 0.203 | 0.003 | gw-r/thread-52/gateway.admitted-work | none observed |
| 4bc8c05af1be654600000000001016b5 | 0.892 | 0.889 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.889 | 0.996 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 4bc8c05af1be654600000000000ed49a | 0.710 | 0.708 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.708 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000e57ca | 0.600 | 0.599 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.599 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ebf34 | 0.582 | 0.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.579 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000105c29 | 0.574 | 0.573 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.573 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ebf3a | 0.529 | 0.528 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.528 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000f8cfd | 0.499 | 0.497 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.497 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ebef8 | 0.485 | 0.485 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.485 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ebf30 | 0.481 | 0.480 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.480 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000e5c9a | 0.469 | 0.468 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.468 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000f8cf4 | 0.460 | 0.458 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.458 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000eadc4 | 0.456 | 0.455 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.455 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000107709 | 0.438 | 0.436 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.436 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000ec303 | 0.438 | 0.435 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.435 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000f8656 | 0.437 | 0.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.434 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000010786e | 0.433 | 0.431 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.431 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000e6609 | 0.417 | 0.413 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.413 | 0.992 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be654600000000000e518d | 0.415 | 0.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.402 | 0.971 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000100183 | 0.408 | 0.405 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.405 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (204 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.051 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.049 | 0.967 | 0.001 |
| p99 | 263.712 | n/a | n/a | n/a | 12.371 | n/a | 0.000 | 263.697 | 1.438 | 1.870 | 0.007 | 0.000 | 0.015 | 0.000 | n/a | n/a | 3.622 | 263.711 | 1.000 | 3.622 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa000000000006add3 | 263.735 | 0.017 | n/a | 0.000 | 263.717 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.734 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000006add2 | 263.719 | 0.013 | n/a | 0.000 | 263.705 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.718 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000006add1 | 263.712 | 0.014 | n/a | 0.000 | 263.697 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.711 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000006add0 | 263.699 | 0.024 | n/a | 0.000 | 263.674 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 263.698 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa000000000006adcf | 263.670 | 0.093 | n/a | 0.000 | 263.574 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 263.667 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000068c9f | 262.995 | 0.316 | n/a | 0.000 | 262.676 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.992 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000068ca0 | 262.969 | 0.054 | n/a | 0.000 | 262.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 262.968 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000068cb7 | 261.733 | 0.138 | n/a | 0.000 | 261.588 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 261.727 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000010d9c0 | 261.703 | 0.014 | n/a | 0.000 | 261.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 261.703 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000010d9bf | 261.689 | 0.020 | n/a | 0.000 | 261.668 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 261.688 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000068cb8 | 261.655 | 0.048 | n/a | 0.000 | 261.605 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.653 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000010d9be | 261.649 | 0.113 | n/a | 0.000 | 261.533 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 261.646 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000010d9c5 | 261.635 | 0.017 | n/a | 0.000 | 261.617 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 261.634 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000010d9c7 | 261.615 | 0.054 | n/a | 0.000 | 261.561 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 261.615 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 4bc8c05af1be6546000000000010d9c6 | 261.602 | 0.015 | n/a | 0.000 | 261.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 261.601 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| eec0dab54e37f4e10000000000068cb9 | 261.560 | 0.112 | n/a | 0.000 | 261.446 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 261.558 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| c6d5734f62c382fa0000000000064898 | 30.568 | 18.128 | n/a | 5.056 | 0.000 | 1.438 | 5.916 | 0.009 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.002 | 23.184 | 0.758 | 0.002 | node-14/thread-4/reader.execute | none observed |
| 4bc8c05af1be654600000000001078b3 | 21.263 | 12.934 | n/a | 0.000 | 0.000 | 2.250 | 6.030 | 0.021 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.002 | 12.934 | 0.608 | 0.002 | node-14/thread-3/reader.execute | none observed |
| eec0dab54e37f4e10000000000063a1e | 19.177 | 12.371 | n/a | 1.339 | 0.000 | 3.572 | 1.870 | 0.007 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.004 | 13.710 | 0.715 | 0.004 | node-14/thread-5/reader.execute | none observed |
| 4bc8c05af1be65460000000000107d36 | 6.118 | 6.116 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.116 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P5 / sweep / read (86 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 3.535 | n/a | n/a | n/a | 2.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.514 | 0.996 | 0.013 |
| p99 | 116.986 | n/a | n/a | n/a | 85.506 | n/a | 17.999 | 0.000 | 7.038 | 8.976 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 3.239 | 103.505 | 0.999 | 3.239 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa00000000000723ed | 116.986 | 85.506 | n/a | 17.999 | 0.000 | 7.038 | 6.412 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.004 | 103.505 | 0.885 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 4bc8c05af1be6546000000000011529e | 19.427 | 11.358 | n/a | 3.264 | 0.000 | 3.876 | 0.870 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.004 | 14.622 | 0.753 | 0.004 | node-14/thread-3/reader.execute | none observed |
| aee92b0bb88551b80000000000000183 | 15.364 | 10.594 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 15.352 | 0.999 | 0.012 | node-14/thread-6/replica.pull-at | none observed |
| eec0dab54e37f4e10000000000070c38 | 15.361 | 2.506 | n/a | 0.000 | 0.000 | 3.853 | 8.976 | 0.008 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.003 | 2.506 | 0.163 | 0.003 | gw-r/thread-69/gateway.admitted-work | none observed |
| aee92b0bb88551b80000000000000184 | 15.207 | 10.429 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 15.187 | 0.999 | 0.020 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b80000000000000185 | 11.963 | 7.152 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.053 | 11.910 | 0.996 | 0.053 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b80000000000000186 | 11.596 | 6.806 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 11.563 | 0.997 | 0.033 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b80000000000000187 | 11.319 | 6.530 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 11.287 | 0.997 | 0.031 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b80000000000000188 | 11.064 | 6.273 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 11.031 | 0.997 | 0.033 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b80000000000000189 | 10.802 | 6.010 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 10.767 | 0.997 | 0.034 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b8000000000000018a | 10.569 | 5.775 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 10.533 | 0.997 | 0.036 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b8000000000000018b | 10.314 | 5.517 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 10.274 | 0.996 | 0.040 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b80000000000000303 | 7.442 | 7.427 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.427 | 0.998 | 0.014 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b8000000000000018c | 6.913 | 2.059 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.096 | 6.817 | 0.986 | 0.096 | node-14/thread-6/node.gc | none observed |
| aee92b0bb88551b800000000000000f3 | 6.750 | 6.731 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.731 | 0.997 | 0.019 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b800000000000000f4 | 6.618 | 6.579 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 6.579 | 0.994 | 0.039 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b8000000000000018d | 6.597 | 1.744 | n/a | 4.758 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.096 | 6.501 | 0.985 | 0.096 | node-14/thread-6/node.gc | none observed |
| aee92b0bb88551b800000000000000f5 | 6.566 | 6.523 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 6.523 | 0.994 | 0.042 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b800000000000000f6 | 6.552 | 6.472 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.081 | 6.472 | 0.988 | 0.081 | node-14/thread-6/replica.pull-at | none observed |
| aee92b0bb88551b800000000000000f7 | 6.495 | 6.409 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.086 | 6.409 | 0.987 | 0.086 | node-14/thread-6/replica.pull-at | none observed |

## P1 / baseline / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.892 | 0.001 |
| p99 | 0.094 | n/a | n/a | n/a | 0.090 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.090 | 0.990 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| eec0dab54e37f4e1000000000000dd80 | 0.094 | 0.090 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.090 | 0.961 | 0.004 | node-14/thread-5/reader.execute | none observed |
| 4bc8c05af1be6546000000000000f14c | 0.052 | 0.051 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.051 | 0.981 | 0.001 | node-14/thread-3/reader.execute | none observed |
| c6d5734f62c382fa000000000000eedf | 0.049 | 0.048 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.048 | 0.990 | 0.000 | node-14/thread-4/reader.execute | none observed |
| c6d5734f62c382fa000000000000eee1 | 0.021 | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.020 | 0.964 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| eec0dab54e37f4e1000000000000dd81 | 0.016 | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.014 | 0.851 | 0.002 | node-14/thread-5/reader.execute | none observed |
| 4bc8c05af1be6546000000000000f14d | 0.011 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.008 | 0.717 | 0.003 | node-14/thread-3/reader.execute | none observed |
| c6d5734f62c382fa000000000000eee0 | 0.010 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.854 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000000f14e | 0.009 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.892 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 4bc8c05af1be6546000000000000f14f | 0.006 | 0.005 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.005 | 0.846 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P1 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.025 | n/a | n/a | n/a | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.023 | 0.933 | 0.001 |
| p99 | 0.231 | n/a | n/a | n/a | 0.222 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.222 | 0.973 | 0.009 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c6d5734f62c382fa0000000000072733 | 0.231 | 0.222 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.222 | 0.962 | 0.009 | node-14/thread-4/replica.pull-at | none observed |
| 4bc8c05af1be65460000000000115d05 | 0.063 | 0.054 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.054 | 0.864 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| c6d5734f62c382fa0000000000072735 | 0.043 | 0.042 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.042 | 0.971 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| c6d5734f62c382fa0000000000072734 | 0.040 | 0.037 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.037 | 0.933 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| eec0dab54e37f4e100000000000714b2 | 0.027 | 0.027 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.027 | 0.973 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| eec0dab54e37f4e100000000000714af | 0.025 | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.023 | 0.922 | 0.002 | node-14/thread-5/reader.execute | none observed |
| eec0dab54e37f4e100000000000714b1 | 0.024 | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.023 | 0.969 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| eec0dab54e37f4e100000000000714b0 | 0.018 | 0.018 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.018 | 0.960 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| c6d5734f62c382fa0000000000072736 | 0.013 | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.926 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| c6d5734f62c382fa0000000000072737 | 0.010 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.930 | 0.001 | node-14/thread-4/replica.pull-at | none observed |

## P3 / outside-phases / read (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.951 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.861 | 200.990 | 0.023 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 |
| p99 | 205.339 | n/a | n/a | n/a | 0.649 | n/a | 0.000 | 0.000 | 2.981 | 202.420 | 8.669 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.215 | 0.649 | 0.009 | 0.215 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d55000000000000007d | 205.339 | 0.074 | n/a | 0.000 | 0.000 | 0.870 | 195.549 | 8.669 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.112 | 0.074 | 0.000 | 0.112 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000005 | 204.394 | 0.052 | n/a | 0.000 | 0.000 | 1.542 | 202.420 | 0.063 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.089 | 0.052 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d550000000000000007 | 203.755 | 0.062 | n/a | 0.000 | 0.000 | 1.474 | 201.693 | 0.105 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.214 | 0.062 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d550000000000000006 | 203.369 | 0.116 | n/a | 0.000 | 0.000 | 1.213 | 201.726 | 0.011 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.099 | 0.116 | 0.001 | 0.099 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000005e | 202.769 | 0.041 | n/a | 0.000 | 0.000 | 0.909 | 201.365 | 0.194 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.121 | 0.041 | 0.000 | 0.121 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000007b | 202.640 | 0.032 | n/a | 0.000 | 0.000 | 0.757 | 201.492 | 0.059 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000005d | 202.623 | 0.039 | n/a | 0.000 | 0.000 | 1.021 | 201.302 | 0.023 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.074 | 0.039 | 0.000 | 0.074 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d5500000000000000a3 | 202.533 | 0.034 | n/a | 0.000 | 0.000 | 1.104 | 201.199 | 0.012 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.090 | 0.034 | 0.000 | 0.090 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d5500000000000000a4 | 202.510 | 0.051 | n/a | 0.000 | 0.000 | 1.175 | 201.041 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.128 | 0.051 | 0.000 | 0.128 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000077 | 202.483 | 0.033 | n/a | 0.000 | 0.000 | 0.915 | 201.303 | 0.018 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000009f | 202.482 | 0.026 | n/a | 0.000 | 0.000 | 0.934 | 201.305 | 0.028 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.062 | 0.026 | 0.000 | 0.062 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d55000000000000009c | 202.473 | 0.032 | n/a | 0.000 | 0.000 | 0.860 | 201.349 | 0.022 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d5500000000000000cb | 202.438 | 0.032 | n/a | 0.000 | 0.000 | 0.717 | 201.421 | 0.055 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.089 | 0.032 | 0.000 | 0.089 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000076 | 202.316 | 0.036 | n/a | 0.000 | 0.000 | 0.937 | 201.151 | 0.011 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d5500000000000000a2 | 202.065 | 0.041 | n/a | 0.000 | 0.000 | 0.813 | 200.933 | 0.045 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.115 | 0.041 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d55000000000000009b | 201.991 | 0.041 | n/a | 0.000 | 0.000 | 0.687 | 201.024 | 0.019 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.106 | 0.041 | 0.000 | 0.106 | gw-r/thread-69/journal/page | none observed |
| f6d7a690124f1d5500000000000000cd | 201.951 | 0.031 | n/a | 0.000 | 0.000 | 0.576 | 201.117 | 0.065 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.071 | 0.031 | 0.000 | 0.071 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000079 | 201.911 | 0.031 | n/a | 0.000 | 0.000 | 0.706 | 200.990 | 0.020 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.076 | 0.031 | 0.000 | 0.076 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d5500000000000000c9 | 201.906 | 0.046 | n/a | 0.000 | 0.000 | 0.604 | 201.003 | 0.052 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.088 | 0.046 | 0.000 | 0.088 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d55000000000000005c | 201.874 | 0.044 | n/a | 0.000 | 0.000 | 0.663 | 200.949 | 0.031 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.078 | 0.044 | 0.000 | 0.078 | gw-r/thread-68/journal/page | none observed |

## P3 / outside-phases / internal (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 438.394 | n/a | n/a | n/a | 2.618 | n/a | 0.000 | 0.000 | 0.790 | 435.064 | 0.018 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.159 | 2.618 | 0.006 | 0.159 |
| p99 | 1006.125 | n/a | n/a | n/a | 75.811 | n/a | 3.287 | 0.000 | 1.390 | 1002.676 | 5.144 | 0.000 | 0.552 | 0.000 | n/a | n/a | 2.112 | 79.098 | 0.832 | 2.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000017 | 1006.125 | 0.207 | n/a | 0.000 | 0.000 | 1.390 | 1002.676 | 0.066 | 0.000 | 0.552 | 0.000 | n/a | n/a | 1.234 | 0.207 | 0.000 | 1.234 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d1790000000000000018 | 1004.048 | 0.152 | n/a | 0.000 | 0.000 | 1.130 | 1001.424 | 0.018 | 0.000 | 0.146 | 0.000 | n/a | n/a | 1.178 | 0.152 | 0.000 | 1.178 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d1790000000000000019 | 1003.633 | 0.288 | n/a | 0.000 | 0.000 | 0.932 | 1001.073 | 0.012 | 0.000 | 0.139 | 0.000 | n/a | n/a | 1.188 | 0.288 | 0.000 | 1.188 | gw-r/thread-55/journal/page | none observed |
| 08e6e7a40a22d1790000000000000053 | 1003.568 | 0.287 | n/a | 0.000 | 0.000 | 0.695 | 1001.164 | 0.033 | 0.000 | 0.151 | 0.000 | n/a | n/a | 1.238 | 0.287 | 0.000 | 1.238 | gw-r/thread-68/journal/page | none observed |
| 08e6e7a40a22d179000000000000009c | 1003.002 | 0.116 | n/a | 0.000 | 0.000 | 0.506 | 1001.137 | 0.018 | 0.000 | 0.124 | 0.000 | n/a | n/a | 1.101 | 0.116 | 0.000 | 1.101 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d1790000000000000083 | 1002.917 | 0.148 | n/a | 0.000 | 0.000 | 0.706 | 1000.874 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.111 | 0.148 | 0.000 | 1.111 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000052 | 729.263 | 3.550 | n/a | 0.000 | 0.000 | 0.790 | 724.721 | 0.012 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.125 | 3.550 | 0.005 | 0.125 | gw-r/thread-69/journal/page | none observed |
| 08e6e7a40a22d179000000000000005f | 609.243 | 7.607 | n/a | 0.000 | 0.000 | 0.790 | 600.581 | 0.018 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.159 | 7.607 | 0.012 | 0.159 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d1790000000000000081 | 438.394 | 2.572 | n/a | 0.000 | 0.000 | 0.612 | 435.064 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.057 | 2.572 | 0.006 | 0.057 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d1790000000000000063 | 426.160 | 1.993 | n/a | 0.000 | 0.000 | 0.549 | 423.287 | 0.053 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.160 | 1.993 | 0.005 | 0.160 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d1790000000000000080 | 417.277 | 2.618 | n/a | 0.000 | 0.000 | 0.916 | 413.572 | 0.016 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.062 | 2.618 | 0.006 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000062 | 228.623 | 3.407 | n/a | 0.000 | 0.000 | 0.601 | 224.502 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.073 | 3.407 | 0.015 | 0.073 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d1790000000000000065 | 201.969 | 3.082 | n/a | 0.000 | 0.000 | 0.556 | 198.125 | 0.021 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.086 | 3.082 | 0.015 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d179000000000000005e | 173.541 | 5.058 | n/a | 0.000 | 0.000 | 0.882 | 167.402 | 0.007 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.127 | 5.058 | 0.029 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000084 | 97.760 | 3.434 | n/a | 0.000 | 0.000 | 0.627 | 88.444 | 5.144 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.071 | 3.434 | 0.035 | 0.071 | gw-r/thread-55/journal/page | none observed |
| 08e6e7a40a22d179000000000000005c | 95.113 | 75.811 | n/a | 3.287 | 0.000 | 0.896 | 12.963 | 0.021 | 0.000 | 0.023 | 0.000 | n/a | n/a | 2.112 | 79.098 | 0.832 | 2.112 | node-14/thread-2/replica.fetch-feed | none observed |
| 08e6e7a40a22d179000000000000005d | 28.275 | 2.632 | n/a | 0.000 | 0.000 | 1.082 | 24.413 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.096 | 2.632 | 0.093 | 0.096 | gw-r/thread-53/journal/page | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 395.328 | n/a | n/a | n/a | 2.354 | n/a | 0.000 | 0.000 | 0.861 | 391.908 | 0.015 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.167 | 2.354 | 0.006 | 0.167 |
| p99 | 617.048 | n/a | n/a | n/a | 22.871 | n/a | 3.197 | 0.000 | 3.342 | 610.403 | 0.144 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.331 | 26.068 | 0.108 | 0.331 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000001b | 617.048 | 5.697 | n/a | 0.000 | 0.000 | 0.674 | 610.403 | 0.017 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.167 | 5.697 | 0.009 | 0.167 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d179000000000000001d | 588.563 | 2.354 | n/a | 0.000 | 0.000 | 2.085 | 583.598 | 0.144 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.287 | 2.354 | 0.004 | 0.287 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d179000000000000001e | 395.328 | 2.324 | n/a | 0.000 | 0.000 | 0.861 | 391.908 | 0.010 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.126 | 2.324 | 0.006 | 0.126 | gw-r/thread-55/journal/page | none observed |
| 08e6e7a40a22d179000000000000001a | 241.630 | 22.871 | n/a | 3.197 | 0.000 | 3.342 | 211.790 | 0.015 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.331 | 26.068 | 0.108 | 0.331 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 393.875 | n/a | n/a | n/a | 2.322 | n/a | 0.000 | 0.000 | 0.638 | 388.933 | 0.023 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.089 | 2.322 | 0.004 | 0.089 |
| p99 | 794.903 | n/a | n/a | n/a | 4.099 | n/a | 0.000 | 0.000 | 1.321 | 791.908 | 0.142 | 0.000 | 2.144 | 0.000 | n/a | n/a | 0.154 | 4.099 | 0.014 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000023 | 794.903 | 2.025 | n/a | 0.000 | 0.000 | 0.685 | 791.908 | 0.024 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.089 | 2.025 | 0.003 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d1790000000000000020 | 605.068 | 2.322 | n/a | 0.000 | 0.000 | 0.521 | 601.905 | 0.142 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.095 | 2.322 | 0.004 | 0.095 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d1790000000000000021 | 393.875 | 4.099 | n/a | 0.000 | 0.000 | 0.638 | 388.933 | 0.023 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.089 | 4.099 | 0.010 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000024 | 201.298 | 2.846 | n/a | 0.000 | 0.000 | 1.321 | 194.816 | 0.016 | 0.000 | 2.144 | 0.000 | n/a | n/a | 0.154 | 2.846 | 0.014 | 0.154 | gw-r/thread-54/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 912.712 | n/a | n/a | n/a | 4.380 | n/a | 0.000 | 0.000 | 1.156 | 907.400 | 0.016 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.133 | 4.380 | 0.006 | 0.133 |
| p99 | 997.326 | n/a | n/a | n/a | 5.689 | n/a | 0.000 | 0.000 | 1.212 | 990.154 | 0.018 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.165 | 5.689 | 0.048 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000029 | 997.326 | 5.689 | n/a | 0.000 | 0.000 | 1.212 | 990.154 | 0.016 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.133 | 5.689 | 0.006 | 0.133 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000027 | 912.712 | 3.885 | n/a | 0.000 | 0.000 | 1.156 | 907.400 | 0.018 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.165 | 3.885 | 0.004 | 0.165 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d1790000000000000026 | 91.903 | 4.380 | n/a | 0.000 | 0.000 | 1.008 | 86.313 | 0.010 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.092 | 4.380 | 0.048 | 0.092 | gw-r/thread-52/journal/page | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 425.665 | n/a | n/a | n/a | 2.911 | n/a | 0.000 | 0.000 | 1.262 | 419.858 | 0.012 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.123 | 2.911 | 0.005 | 0.123 |
| p99 | 1005.265 | n/a | n/a | n/a | 4.311 | n/a | 0.000 | 0.000 | 1.940 | 1001.730 | 0.020 | 0.000 | 0.196 | 0.000 | n/a | n/a | 1.168 | 4.311 | 0.219 | 1.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000002f | 1005.265 | 0.211 | n/a | 0.000 | 0.000 | 1.940 | 1001.730 | 0.020 | 0.000 | 0.196 | 0.000 | n/a | n/a | 1.168 | 0.211 | 0.000 | 1.168 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d179000000000000002d | 604.405 | 2.966 | n/a | 0.000 | 0.000 | 0.788 | 600.375 | 0.014 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.151 | 2.966 | 0.005 | 0.151 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d179000000000000002c | 425.665 | 4.311 | n/a | 0.000 | 0.000 | 1.262 | 419.858 | 0.012 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.105 | 4.311 | 0.010 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d179000000000000002a | 13.297 | 2.911 | n/a | 0.000 | 0.000 | 1.602 | 8.580 | 0.012 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.123 | 2.911 | 0.219 | 0.123 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 277.342 | n/a | n/a | n/a | 2.505 | n/a | 0.000 | 0.000 | 0.711 | 273.889 | 0.020 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.089 | 2.505 | 0.008 | 0.089 |
| p99 | 859.443 | n/a | n/a | n/a | 3.871 | n/a | 0.000 | 0.000 | 1.005 | 855.834 | 0.391 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.188 | 3.871 | 0.142 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000036 | 859.443 | 2.505 | n/a | 0.000 | 0.000 | 0.863 | 855.834 | 0.020 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.107 | 2.505 | 0.003 | 0.107 | gw-r/thread-54/journal/page | none observed |
| 08e6e7a40a22d1790000000000000031 | 859.105 | 3.152 | n/a | 0.000 | 0.000 | 0.711 | 855.009 | 0.028 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.089 | 3.152 | 0.004 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d1790000000000000032 | 277.342 | 2.260 | n/a | 0.000 | 0.000 | 1.005 | 273.889 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.078 | 2.260 | 0.008 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 08e6e7a40a22d1790000000000000034 | 27.208 | 3.871 | n/a | 0.000 | 0.000 | 0.556 | 22.004 | 0.391 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.188 | 3.871 | 0.142 | 0.188 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d1790000000000000030 | 20.396 | 2.283 | n/a | 0.000 | 0.000 | 0.649 | 17.274 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.088 | 2.283 | 0.112 | 0.088 | gw-r/thread-55/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.648 | n/a | n/a | n/a | 3.213 | n/a | 0.000 | 0.000 | 0.927 | 417.167 | 0.013 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.099 | 3.213 | 0.008 | 0.099 |
| p99 | 804.706 | n/a | n/a | n/a | 6.519 | n/a | 0.000 | 0.000 | 2.050 | 797.236 | 0.045 | 15.170 | 0.136 | 0.000 | n/a | n/a | 0.234 | 6.519 | 0.012 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000003b | 804.706 | 6.295 | n/a | 0.000 | 0.000 | 0.832 | 797.236 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.214 | 6.295 | 0.008 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d1790000000000000037 | 526.709 | 6.519 | n/a | 0.000 | 0.000 | 2.050 | 517.769 | 0.013 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.234 | 6.519 | 0.012 | 0.234 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d1790000000000000039 | 436.648 | 3.213 | n/a | 0.000 | 0.000 | 0.927 | 417.167 | 0.012 | 15.170 | 0.060 | 0.000 | n/a | n/a | 0.099 | 3.213 | 0.007 | 0.099 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d179000000000000003a | 166.616 | 1.948 | n/a | 0.000 | 0.000 | 1.164 | 163.234 | 0.045 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.089 | 1.948 | 0.012 | 0.089 | gw-r/thread-68/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 333.434 | n/a | n/a | n/a | 3.353 | n/a | 0.000 | 0.000 | 1.092 | 330.777 | 0.018 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.177 | 3.353 | 0.011 | 0.177 |
| p99 | 819.522 | n/a | n/a | n/a | 9.177 | n/a | 0.000 | 0.000 | 6.169 | 796.236 | 0.066 | 6.952 | 0.103 | 0.000 | n/a | n/a | 9.183 | 9.177 | 0.012 | 9.183 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000003f | 819.522 | 9.177 | n/a | 0.000 | 0.000 | 6.169 | 796.236 | 0.066 | 6.952 | 0.103 | 0.000 | n/a | n/a | 0.820 | 9.177 | 0.011 | 0.820 | gw-r/thread-55/journal/page | none observed |
| 08e6e7a40a22d1790000000000000040 | 382.931 | 4.607 | n/a | 0.000 | 0.000 | 1.092 | 376.953 | 0.022 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.177 | 4.607 | 0.012 | 0.177 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d1790000000000000041 | 333.434 | 1.852 | n/a | 0.000 | 0.000 | 0.613 | 330.777 | 0.018 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.084 | 1.852 | 0.006 | 0.084 | gw-r/thread-68/journal/page | none observed |
| 08e6e7a40a22d1790000000000000044 | 269.292 | 3.353 | n/a | 0.000 | 0.000 | 1.565 | 255.133 | 0.011 | 0.000 | 0.048 | 0.000 | n/a | n/a | 9.183 | 3.353 | 0.012 | 9.183 | gw-r/thread-70/journal/page | none observed |
| 08e6e7a40a22d179000000000000003d | 196.332 | 2.236 | n/a | 0.000 | 0.000 | 0.650 | 193.232 | 0.015 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.118 | 2.236 | 0.011 | 0.118 | gw-r/thread-53/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 994.781 | n/a | n/a | n/a | 0.260 | n/a | 0.000 | 0.000 | 1.062 | 988.759 | 0.023 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.154 | 0.260 | 0.000 | 0.154 |
| p99 | 1005.377 | n/a | n/a | n/a | 4.691 | n/a | 0.000 | 0.000 | 2.862 | 1000.841 | 0.023 | 0.000 | 0.126 | 0.000 | n/a | n/a | 1.266 | 4.691 | 0.005 | 1.266 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000046 | 1005.377 | 0.260 | n/a | 0.000 | 0.000 | 2.862 | 1000.841 | 0.023 | 0.000 | 0.126 | 0.000 | n/a | n/a | 1.266 | 0.260 | 0.000 | 1.266 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d1790000000000000045 | 994.781 | 4.691 | n/a | 0.000 | 0.000 | 1.062 | 988.759 | 0.023 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.154 | 4.691 | 0.005 | 0.154 | gw-r/thread-48/journal/page | none observed |

## P3 / recovery / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 377.180 | n/a | n/a | n/a | 2.620 | n/a | 0.000 | 0.000 | 2.215 | 360.018 | 0.035 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.109 | 2.620 | 0.025 | 0.109 |
| p99 | 985.887 | n/a | n/a | n/a | 11.594 | n/a | 0.000 | 0.000 | 4.319 | 981.978 | 5.589 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.233 | 11.594 | 0.305 | 0.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000048 | 985.887 | 2.620 | n/a | 0.000 | 0.000 | 1.039 | 981.978 | 0.018 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.109 | 2.620 | 0.003 | 0.109 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d179000000000000004b | 401.306 | 2.440 | n/a | 0.000 | 0.000 | 2.215 | 396.396 | 0.035 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.104 | 2.440 | 0.006 | 0.104 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d179000000000000004d | 377.180 | 11.594 | n/a | 0.000 | 0.000 | 4.319 | 360.018 | 0.916 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.233 | 11.594 | 0.031 | 0.233 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d1790000000000000049 | 219.227 | 5.533 | n/a | 0.000 | 0.000 | 3.035 | 204.795 | 5.589 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.105 | 5.533 | 0.025 | 0.105 | gw-r/thread-68/journal/page | none observed |
| 08e6e7a40a22d1790000000000000047 | 8.220 | 2.505 | n/a | 0.000 | 0.000 | 1.562 | 3.968 | 0.012 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.153 | 2.505 | 0.305 | 0.153 | gw-r/thread-67/gateway.admitted-work | none observed |

## P3 / p4mix / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 990.233 | n/a | n/a | n/a | 2.830 | n/a | 0.000 | 0.000 | 0.822 | 987.011 | 0.137 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.097 | 2.830 | 0.003 | 0.097 |
| p99 | 998.413 | n/a | n/a | n/a | 5.101 | n/a | 0.000 | 0.000 | 1.126 | 994.579 | 1.719 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.131 | 5.101 | 0.018 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000004e | 998.413 | 2.830 | n/a | 0.000 | 0.000 | 0.822 | 994.579 | 0.018 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.097 | 2.830 | 0.003 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d179000000000000004f | 990.233 | 2.185 | n/a | 0.000 | 0.000 | 0.742 | 987.011 | 0.137 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.073 | 2.185 | 0.002 | 0.073 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d1790000000000000050 | 275.733 | 5.101 | n/a | 0.000 | 0.000 | 1.126 | 267.562 | 1.719 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.131 | 5.101 | 0.018 | 0.131 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 573.208 | n/a | n/a | n/a | 2.472 | n/a | 0.000 | 0.000 | 0.854 | 566.209 | 0.040 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.106 | 2.472 | 0.010 | 0.106 |
| p99 | 960.906 | n/a | n/a | n/a | 5.841 | n/a | 0.000 | 0.000 | 0.945 | 957.233 | 1.707 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.220 | 5.841 | 0.064 | 0.220 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000055 | 960.906 | 2.472 | n/a | 0.000 | 0.000 | 0.945 | 957.233 | 0.040 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.076 | 2.472 | 0.003 | 0.076 | gw-r/thread-70/journal/page | none observed |
| 08e6e7a40a22d1790000000000000056 | 573.208 | 5.841 | n/a | 0.000 | 0.000 | 0.854 | 566.209 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.220 | 5.841 | 0.010 | 0.220 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000054 | 34.444 | 2.209 | n/a | 0.000 | 0.000 | 0.738 | 29.621 | 1.707 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.106 | 2.209 | 0.064 | 0.106 | gw-r/thread-67/journal/page | none observed |

## P3 / grow3 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 380.908 | n/a | n/a | n/a | 2.317 | n/a | 0.000 | 0.000 | 0.914 | 377.806 | 0.021 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.085 | 2.317 | 0.052 | 0.085 |
| p99 | 863.127 | n/a | n/a | n/a | 124.253 | n/a | 7.888 | 0.000 | 1.080 | 679.054 | 0.026 | 48.356 | 0.116 | 0.000 | n/a | n/a | 2.965 | 132.141 | 0.153 | 2.965 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000005b | 863.127 | 124.253 | n/a | 7.888 | 0.000 | 0.505 | 679.054 | 0.026 | 48.356 | 0.081 | 0.000 | n/a | n/a | 2.965 | 132.141 | 0.153 | 2.965 | gw-r/thread-69/journal/page | none observed |
| 08e6e7a40a22d1790000000000000057 | 380.908 | 1.798 | n/a | 0.000 | 0.000 | 1.080 | 377.806 | 0.021 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.085 | 1.798 | 0.005 | 0.085 | gw-r/thread-55/journal/page | none observed |
| 08e6e7a40a22d179000000000000005a | 44.258 | 2.317 | n/a | 0.000 | 0.000 | 0.914 | 40.852 | 0.012 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.081 | 2.317 | 0.052 | 0.081 | gw-r/thread-52/journal/page | none observed |

## P3 / p4h3 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 306.165 | n/a | n/a | n/a | 2.476 | n/a | 0.000 | 0.000 | 0.700 | 301.147 | 0.018 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.075 | 2.476 | 0.010 | 0.075 |
| p99 | 625.333 | n/a | n/a | n/a | 7.658 | n/a | 0.000 | 0.000 | 1.927 | 622.130 | 0.596 | 15.900 | 0.127 | 0.000 | n/a | n/a | 0.227 | 7.658 | 0.359 | 0.227 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000075 | 625.333 | 2.183 | n/a | 0.000 | 0.000 | 0.700 | 622.130 | 0.171 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.058 | 2.183 | 0.003 | 0.058 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d1790000000000000067 | 388.209 | 2.458 | n/a | 0.000 | 0.000 | 0.713 | 384.540 | 0.297 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.075 | 2.458 | 0.006 | 0.075 | gw-r/thread-70/journal/page | none observed |
| 08e6e7a40a22d1790000000000000071 | 346.384 | 2.822 | n/a | 0.000 | 0.000 | 0.613 | 326.745 | 0.016 | 15.900 | 0.061 | 0.000 | n/a | n/a | 0.227 | 2.822 | 0.008 | 0.227 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d1790000000000000073 | 335.479 | 5.582 | n/a | 0.000 | 0.000 | 0.791 | 328.954 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.069 | 5.582 | 0.017 | 0.069 | gw-r/thread-69/journal/page | none observed |
| 08e6e7a40a22d1790000000000000069 | 306.165 | 2.929 | n/a | 0.000 | 0.000 | 1.927 | 301.147 | 0.012 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.082 | 2.929 | 0.010 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d179000000000000006c | 268.729 | 2.476 | n/a | 0.000 | 0.000 | 0.451 | 265.664 | 0.013 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.068 | 2.476 | 0.009 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d179000000000000006f | 38.633 | 1.552 | n/a | 0.000 | 0.000 | 0.660 | 35.664 | 0.596 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.068 | 1.552 | 0.040 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d179000000000000006d | 28.185 | 2.329 | n/a | 0.000 | 0.000 | 0.678 | 24.992 | 0.018 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.092 | 2.329 | 0.083 | 0.092 | gw-r/thread-69/journal/page | none observed |
| 08e6e7a40a22d1790000000000000068 | 21.329 | 7.658 | n/a | 0.000 | 0.000 | 0.935 | 12.437 | 0.070 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.172 | 7.658 | 0.359 | 0.172 | gw-r/thread-70/journal/page | none observed |

## P3 / grow10 / internal (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 162.636 | n/a | n/a | n/a | 80.426 | n/a | 3.418 | 0.000 | 0.966 | 58.384 | 0.044 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.540 | 86.698 | 0.549 | 1.540 |
| p99 | 733.021 | n/a | n/a | n/a | 132.863 | n/a | 8.974 | 0.000 | 2.256 | 569.234 | 1.250 | 17.233 | 0.121 | 0.000 | n/a | n/a | 2.493 | 141.837 | 0.871 | 2.493 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000076 | 733.021 | 132.863 | n/a | 8.974 | 0.000 | 2.100 | 569.234 | 0.033 | 17.233 | 0.090 | 0.000 | n/a | n/a | 2.493 | 141.837 | 0.193 | 2.493 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d179000000000000007b | 503.558 | 86.923 | n/a | 5.379 | 0.000 | 0.816 | 392.506 | 0.045 | 16.227 | 0.121 | 0.000 | n/a | n/a | 1.540 | 92.302 | 0.183 | 1.540 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d179000000000000007c | 185.939 | 80.426 | n/a | 6.272 | 0.000 | 1.939 | 95.067 | 0.333 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.861 | 86.698 | 0.466 | 1.861 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d179000000000000007a | 175.675 | 2.592 | n/a | 0.000 | 0.000 | 0.853 | 172.029 | 0.044 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.064 | 2.592 | 0.015 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d179000000000000007f | 162.636 | 85.867 | n/a | 3.418 | 0.000 | 2.256 | 58.235 | 0.906 | 10.626 | 0.043 | 0.000 | n/a | n/a | 1.285 | 89.285 | 0.549 | 1.285 | node-14/thread-2/replica.fetch-feed | none observed |
| 08e6e7a40a22d179000000000000007d | 142.100 | 76.076 | n/a | 3.117 | 0.000 | 1.973 | 58.384 | 1.250 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.227 | 79.193 | 0.557 | 1.227 | node-14/thread-2/replica.fetch-feed | none observed |
| 08e6e7a40a22d179000000000000007e | 125.406 | 73.821 | n/a | 8.863 | 0.000 | 0.910 | 39.689 | 0.013 | 0.000 | 0.110 | 0.000 | n/a | n/a | 2.000 | 82.684 | 0.659 | 2.000 | node-14/thread-2/replica.fetch-feed | none observed |
| 08e6e7a40a22d1790000000000000077 | 101.114 | 85.092 | n/a | 2.959 | 0.000 | 0.966 | 10.525 | 0.011 | 0.000 | 0.013 | 0.000 | n/a | n/a | 1.548 | 88.051 | 0.871 | 1.548 | node-14/thread-2/replica.fetch-feed | none observed |
| 08e6e7a40a22d1790000000000000078 | 8.645 | 6.594 | n/a | 0.000 | 0.000 | 0.785 | 1.158 | 0.010 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.085 | 6.594 | 0.763 | 0.085 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 438.779 | n/a | n/a | n/a | 3.718 | n/a | 0.000 | 0.000 | 0.702 | 434.050 | 0.021 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.101 | 3.718 | 0.009 | 0.101 |
| p99 | 1003.040 | n/a | n/a | n/a | 12.241 | n/a | 0.000 | 0.000 | 1.919 | 997.747 | 0.144 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.207 | 12.241 | 0.377 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d179000000000000008c | 1003.040 | 4.453 | n/a | 0.000 | 0.000 | 0.528 | 997.747 | 0.124 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.091 | 4.453 | 0.004 | 0.091 | gw-r/thread-69/journal/page | none observed |
| 08e6e7a40a22d179000000000000008f | 554.000 | 2.285 | n/a | 0.000 | 0.000 | 0.702 | 550.848 | 0.021 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.061 | 2.285 | 0.004 | 0.061 | gw-r/thread-53/journal/page | none observed |
| 08e6e7a40a22d1790000000000000087 | 468.964 | 12.241 | n/a | 0.000 | 0.000 | 0.848 | 455.589 | 0.014 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.207 | 12.241 | 0.026 | 0.207 | gw-r/thread-50/journal/page | none observed |
| 08e6e7a40a22d179000000000000008d | 438.779 | 3.842 | n/a | 0.000 | 0.000 | 0.647 | 434.050 | 0.031 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.101 | 3.842 | 0.009 | 0.101 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d179000000000000008a | 397.223 | 2.393 | n/a | 0.000 | 0.000 | 1.919 | 392.760 | 0.012 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.070 | 2.393 | 0.006 | 0.070 | gw-r/thread-67/journal/page | none observed |
| 08e6e7a40a22d1790000000000000085 | 30.315 | 3.718 | n/a | 0.000 | 0.000 | 0.603 | 25.782 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.164 | 3.718 | 0.123 | 0.164 | gw-r/thread-52/journal/page | none observed |
| 08e6e7a40a22d1790000000000000088 | 9.633 | 3.635 | n/a | 0.000 | 0.000 | 1.275 | 4.375 | 0.144 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.112 | 3.635 | 0.377 | 0.112 | gw-r/thread-50/journal/page | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 576.669 | n/a | n/a | n/a | 2.163 | n/a | 0.000 | 0.000 | 0.696 | 573.992 | 0.053 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.065 | 2.163 | 0.004 | 0.065 |
| p99 | 591.148 | n/a | n/a | n/a | 2.401 | n/a | 0.000 | 0.000 | 0.900 | 587.531 | 0.060 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.065 | 2.401 | 0.005 | 0.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000090 | 591.148 | 2.401 | n/a | 0.000 | 0.000 | 0.900 | 587.531 | 0.060 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.065 | 2.401 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d1790000000000000093 | 576.669 | 1.786 | n/a | 0.000 | 0.000 | 0.696 | 573.992 | 0.024 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.059 | 1.786 | 0.003 | 0.059 | gw-r/thread-48/journal/page | none observed |
| 08e6e7a40a22d1790000000000000091 | 418.106 | 2.163 | n/a | 0.000 | 0.000 | 0.650 | 415.044 | 0.053 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.065 | 2.163 | 0.005 | 0.065 | gw-r/thread-55/journal/page | none observed |

## P3 / sweep / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.383 | n/a | n/a | n/a | 1.797 | n/a | 0.000 | 0.000 | 1.198 | 6.714 | 0.019 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.068 | 1.797 | 0.180 | 0.068 |
| p99 | 27.999 | n/a | n/a | n/a | 12.106 | n/a | 0.000 | 0.000 | 11.620 | 15.032 | 0.161 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.149 | 12.106 | 0.432 | 0.149 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 08e6e7a40a22d1790000000000000094 | 27.999 | 12.106 | n/a | 0.000 | 0.000 | 11.620 | 4.085 | 0.016 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.068 | 12.106 | 0.432 | 0.068 | node-14/thread-2/replica.fetch-feed | none observed |
| 08e6e7a40a22d1790000000000000098 | 19.760 | 3.264 | n/a | 0.000 | 0.000 | 1.217 | 15.032 | 0.021 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.102 | 3.264 | 0.165 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 08e6e7a40a22d1790000000000000095 | 16.802 | 7.192 | n/a | 0.000 | 0.000 | 1.198 | 7.924 | 0.161 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.125 | 7.192 | 0.428 | 0.125 | gw-r/thread-55/gateway.admitted-work | none observed |
| 08e6e7a40a22d1790000000000000099 | 16.624 | 1.797 | n/a | 0.000 | 0.000 | 0.963 | 13.632 | 0.076 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.066 | 1.797 | 0.108 | 0.066 | gw-r/thread-69/journal/page | none observed |
| 08e6e7a40a22d1790000000000000097 | 14.383 | 3.991 | n/a | 0.000 | 0.000 | 2.378 | 7.823 | 0.019 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.149 | 3.991 | 0.277 | 0.149 | gw-r/thread-52/gateway.admitted-work | none observed |
| 08e6e7a40a22d1790000000000000096 | 9.875 | 1.776 | n/a | 0.000 | 0.000 | 3.267 | 4.749 | 0.012 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.057 | 1.776 | 0.180 | 0.057 | gw-r/thread-69/gateway.admitted-work | none observed |
| 08e6e7a40a22d179000000000000009a | 9.306 | 1.632 | n/a | 0.000 | 0.000 | 0.846 | 6.714 | 0.021 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.072 | 1.632 | 0.175 | 0.072 | gw-r/thread-52/gateway.admitted-work | none observed |
| 08e6e7a40a22d179000000000000009b | 8.810 | 1.596 | n/a | 0.000 | 0.000 | 0.625 | 6.489 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.049 | 1.596 | 0.181 | 0.049 | gw-r/thread-68/gateway.admitted-work | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.911 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 1.185 | 200.690 | 0.015 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.095 | 0.047 | 0.000 | 0.095 |
| p99 | 203.939 | n/a | n/a | n/a | 0.177 | n/a | 0.000 | 0.000 | 2.294 | 201.510 | 3.800 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.362 | 0.177 | 0.001 | 0.362 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d55000000000000000d | 203.939 | 0.045 | n/a | 0.000 | 0.000 | 2.120 | 201.510 | 0.015 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.095 | 0.045 | 0.000 | 0.095 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d55000000000000000e | 203.438 | 0.177 | n/a | 0.000 | 0.000 | 1.510 | 201.391 | 0.014 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.166 | 0.177 | 0.001 | 0.166 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d55000000000000000b | 203.027 | 0.036 | n/a | 0.000 | 0.000 | 1.185 | 201.455 | 0.020 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.094 | 0.036 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d550000000000000010 | 202.915 | 0.040 | n/a | 0.000 | 0.000 | 1.159 | 201.412 | 0.027 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.072 | 0.040 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d55000000000000000a | 202.629 | 0.054 | n/a | 0.000 | 0.000 | 1.188 | 201.054 | 0.015 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.151 | 0.054 | 0.000 | 0.151 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d550000000000000008 | 201.911 | 0.030 | n/a | 0.000 | 0.000 | 1.048 | 200.690 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.078 | 0.030 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000009 | 173.119 | 0.074 | n/a | 0.000 | 0.000 | 2.294 | 166.468 | 3.800 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.362 | 0.074 | 0.000 | 0.362 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d55000000000000000c | 167.341 | 0.068 | n/a | 0.000 | 0.000 | 1.120 | 165.912 | 0.012 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.120 | 0.068 | 0.000 | 0.120 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000011 | 166.183 | 0.073 | n/a | 0.000 | 0.000 | 1.294 | 164.155 | 0.466 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.121 | 0.073 | 0.000 | 0.121 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d55000000000000000f | 124.646 | 0.047 | n/a | 0.000 | 0.000 | 0.796 | 123.640 | 0.011 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.078 | 0.047 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |

## P3 / baseline / read (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.474 | n/a | n/a | n/a | 0.048 | n/a | 0.000 | 0.000 | 0.679 | 201.159 | 0.020 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.076 | 0.048 | 0.000 | 0.076 |
| p99 | 202.529 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 0.886 | 201.545 | 0.068 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.101 | 0.073 | 0.000 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000012 | 202.529 | 0.043 | n/a | 0.000 | 0.000 | 0.679 | 201.545 | 0.020 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.076 | 0.043 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d550000000000000013 | 202.474 | 0.073 | n/a | 0.000 | 0.000 | 0.886 | 201.159 | 0.068 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.101 | 0.073 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d550000000000000014 | 155.238 | 0.048 | n/a | 0.000 | 0.000 | 0.545 | 154.506 | 0.012 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.065 | 0.048 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.645 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.872 | 201.405 | 0.051 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 |
| p99 | 212.908 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 1.726 | 211.648 | 5.897 | 0.000 | 0.459 | 0.000 | n/a | n/a | 0.121 | 0.068 | 0.000 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d55000000000000001f | 212.908 | 0.035 | n/a | 0.000 | 0.000 | 0.872 | 211.648 | 0.080 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d550000000000000024 | 203.091 | 0.033 | n/a | 0.000 | 0.000 | 1.137 | 201.657 | 0.014 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000022 | 202.645 | 0.037 | n/a | 0.000 | 0.000 | 0.671 | 201.357 | 0.051 | 0.000 | 0.459 | 0.000 | n/a | n/a | 0.070 | 0.037 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000023 | 202.515 | 0.035 | n/a | 0.000 | 0.000 | 0.790 | 201.405 | 0.017 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d550000000000000025 | 184.271 | 0.068 | n/a | 0.000 | 0.000 | 1.726 | 176.341 | 5.897 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.121 | 0.068 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.525 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 1.294 | 201.156 | 0.021 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.095 | 0.044 | 0.000 | 0.095 |
| p99 | 209.713 | n/a | n/a | n/a | 0.191 | n/a | 0.000 | 0.000 | 4.184 | 205.201 | 13.087 | 15.170 | 0.208 | 0.000 | n/a | n/a | 0.159 | 0.191 | 0.001 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000026 | 209.713 | 0.044 | n/a | 0.000 | 0.000 | 4.184 | 205.201 | 0.021 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.079 | 0.044 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d55000000000000002e | 204.222 | 0.191 | n/a | 0.000 | 0.000 | 1.501 | 202.139 | 0.025 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.159 | 0.191 | 0.001 | 0.159 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d55000000000000002d | 203.390 | 0.043 | n/a | 0.000 | 0.000 | 1.570 | 201.499 | 0.015 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.081 | 0.043 | 0.000 | 0.081 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000002f | 203.164 | 0.087 | n/a | 0.000 | 0.000 | 1.294 | 201.490 | 0.023 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.103 | 0.087 | 0.000 | 0.103 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000029 | 203.030 | 0.050 | n/a | 0.000 | 0.000 | 1.455 | 186.110 | 0.018 | 15.170 | 0.117 | 0.000 | n/a | n/a | 0.110 | 0.050 | 0.000 | 0.110 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000002a | 202.525 | 0.035 | n/a | 0.000 | 0.000 | 0.922 | 201.334 | 0.015 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000027 | 202.344 | 0.043 | n/a | 0.000 | 0.000 | 0.900 | 201.156 | 0.013 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.120 | 0.043 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000002c | 151.342 | 0.041 | n/a | 0.000 | 0.000 | 0.637 | 147.770 | 2.683 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.152 | 0.041 | 0.000 | 0.152 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d550000000000000030 | 117.011 | 0.061 | n/a | 0.000 | 0.000 | 0.909 | 112.215 | 3.674 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.087 | 0.061 | 0.001 | 0.087 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000028 | 57.913 | 0.073 | n/a | 0.000 | 0.000 | 1.470 | 43.147 | 13.087 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.095 | 0.073 | 0.001 | 0.095 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.366 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.969 | 194.300 | 0.024 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.110 | 0.049 | 0.000 | 0.110 |
| p99 | 207.857 | n/a | n/a | n/a | 0.082 | n/a | 0.000 | 0.000 | 4.132 | 204.343 | 11.580 | 6.952 | 0.723 | 0.000 | n/a | n/a | 0.152 | 0.082 | 0.001 | 0.152 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000038 | 207.857 | 0.033 | n/a | 0.000 | 0.000 | 3.229 | 204.343 | 0.021 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.068 | 0.033 | 0.000 | 0.068 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000036 | 205.283 | 0.050 | n/a | 0.000 | 0.000 | 4.132 | 200.876 | 0.011 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.113 | 0.050 | 0.000 | 0.113 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000032 | 203.551 | 0.039 | n/a | 0.000 | 0.000 | 2.022 | 194.300 | 0.014 | 6.952 | 0.149 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d55000000000000003a | 202.900 | 0.068 | n/a | 0.000 | 0.000 | 0.792 | 201.655 | 0.045 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.110 | 0.068 | 0.000 | 0.110 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000034 | 202.620 | 0.045 | n/a | 0.000 | 0.000 | 0.969 | 201.230 | 0.024 | 0.000 | 0.240 | 0.000 | n/a | n/a | 0.111 | 0.045 | 0.000 | 0.111 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d550000000000000033 | 202.366 | 0.037 | n/a | 0.000 | 0.000 | 0.781 | 201.286 | 0.018 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000031 | 196.257 | 0.056 | n/a | 0.000 | 0.000 | 0.712 | 183.033 | 11.580 | 0.000 | 0.723 | 0.000 | n/a | n/a | 0.152 | 0.056 | 0.000 | 0.152 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000037 | 156.592 | 0.082 | n/a | 0.000 | 0.000 | 0.745 | 154.222 | 1.313 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.135 | 0.082 | 0.001 | 0.135 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d550000000000000035 | 140.825 | 0.069 | n/a | 0.000 | 0.000 | 4.012 | 132.693 | 3.886 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.127 | 0.069 | 0.000 | 0.127 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000039 | 97.631 | 0.049 | n/a | 0.000 | 0.000 | 1.097 | 85.693 | 10.677 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 0.049 | 0.001 | 0.073 | gw-r/thread-70/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.224 | n/a | n/a | n/a | 0.045 | n/a | 0.000 | 0.000 | 1.144 | 201.092 | 0.020 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.085 | 0.045 | 0.000 | 0.085 |
| p99 | 203.033 | n/a | n/a | n/a | 0.222 | n/a | 0.000 | 0.000 | 1.979 | 201.476 | 5.870 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.134 | 0.222 | 0.002 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d55000000000000003e | 203.033 | 0.047 | n/a | 0.000 | 0.000 | 1.175 | 201.476 | 0.030 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.110 | 0.047 | 0.000 | 0.110 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d55000000000000003d | 202.817 | 0.029 | n/a | 0.000 | 0.000 | 1.627 | 200.960 | 0.020 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000044 | 202.797 | 0.045 | n/a | 0.000 | 0.000 | 0.968 | 201.453 | 0.023 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.134 | 0.045 | 0.000 | 0.134 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000043 | 202.770 | 0.035 | n/a | 0.000 | 0.000 | 1.144 | 201.317 | 0.020 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.083 | 0.035 | 0.000 | 0.083 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000041 | 202.748 | 0.054 | n/a | 0.000 | 0.000 | 1.301 | 201.113 | 0.023 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.126 | 0.054 | 0.000 | 0.126 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d55000000000000003f | 202.224 | 0.069 | n/a | 0.000 | 0.000 | 0.857 | 201.092 | 0.014 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.074 | 0.069 | 0.000 | 0.074 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000042 | 202.119 | 0.034 | n/a | 0.000 | 0.000 | 0.755 | 201.110 | 0.018 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.076 | 0.034 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000003c | 202.093 | 0.044 | n/a | 0.000 | 0.000 | 0.833 | 200.954 | 0.016 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.128 | 0.044 | 0.000 | 0.128 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d550000000000000045 | 110.937 | 0.054 | n/a | 0.000 | 0.000 | 1.829 | 108.843 | 0.060 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.085 | 0.054 | 0.000 | 0.085 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000040 | 101.784 | 0.222 | n/a | 0.000 | 0.000 | 1.979 | 93.517 | 5.870 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.099 | 0.222 | 0.002 | 0.099 | gw-r/thread-54/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.472 | n/a | n/a | n/a | 0.062 | n/a | 0.000 | 0.000 | 1.043 | 201.077 | 0.021 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.125 | 0.062 | 0.000 | 0.125 |
| p99 | 203.661 | n/a | n/a | n/a | 0.094 | n/a | 0.000 | 0.000 | 1.684 | 202.066 | 8.708 | 0.000 | 0.248 | 0.000 | n/a | n/a | 0.165 | 0.094 | 0.001 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000048 | 203.661 | 0.066 | n/a | 0.000 | 0.000 | 1.684 | 201.515 | 0.021 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.165 | 0.066 | 0.000 | 0.165 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000047 | 203.479 | 0.033 | n/a | 0.000 | 0.000 | 1.054 | 202.030 | 0.040 | 0.000 | 0.248 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000004e | 203.347 | 0.038 | n/a | 0.000 | 0.000 | 0.948 | 202.066 | 0.033 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.068 | 0.038 | 0.000 | 0.068 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d550000000000000046 | 203.102 | 0.064 | n/a | 0.000 | 0.000 | 1.210 | 201.493 | 0.017 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.133 | 0.064 | 0.000 | 0.133 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000004c | 202.508 | 0.060 | n/a | 0.000 | 0.000 | 0.921 | 201.249 | 0.014 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.133 | 0.060 | 0.000 | 0.133 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d550000000000000049 | 202.472 | 0.048 | n/a | 0.000 | 0.000 | 1.103 | 201.077 | 0.016 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.108 | 0.048 | 0.000 | 0.108 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000004b | 199.798 | 0.094 | n/a | 0.000 | 0.000 | 0.958 | 198.473 | 0.029 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.141 | 0.094 | 0.000 | 0.141 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d55000000000000004d | 182.643 | 0.062 | n/a | 0.000 | 0.000 | 1.043 | 172.656 | 8.708 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.096 | 0.062 | 0.000 | 0.096 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d55000000000000004f | 136.693 | 0.080 | n/a | 0.000 | 0.000 | 1.465 | 134.906 | 0.015 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.134 | 0.080 | 0.001 | 0.134 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d55000000000000004a | 90.738 | 0.071 | n/a | 0.000 | 0.000 | 0.947 | 84.163 | 5.389 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.125 | 0.071 | 0.001 | 0.125 | gw-r/thread-52/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.312 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.920 | 201.230 | 0.018 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 |
| p99 | 203.302 | n/a | n/a | n/a | 0.072 | n/a | 0.000 | 0.000 | 1.412 | 201.881 | 3.910 | 0.000 | 0.267 | 0.000 | n/a | n/a | 0.147 | 0.072 | 0.001 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000057 | 203.302 | 0.033 | n/a | 0.000 | 0.000 | 0.995 | 201.881 | 0.055 | 0.000 | 0.267 | 0.000 | n/a | n/a | 0.071 | 0.033 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d550000000000000051 | 203.044 | 0.033 | n/a | 0.000 | 0.000 | 1.412 | 201.364 | 0.023 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d550000000000000055 | 202.711 | 0.042 | n/a | 0.000 | 0.000 | 1.043 | 201.379 | 0.016 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d550000000000000056 | 202.633 | 0.029 | n/a | 0.000 | 0.000 | 0.865 | 201.536 | 0.014 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.073 | 0.029 | 0.000 | 0.073 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000052 | 202.403 | 0.032 | n/a | 0.000 | 0.000 | 0.755 | 201.273 | 0.025 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.086 | 0.032 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000053 | 202.312 | 0.035 | n/a | 0.000 | 0.000 | 0.907 | 201.157 | 0.014 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d55000000000000005a | 202.259 | 0.036 | n/a | 0.000 | 0.000 | 0.920 | 201.101 | 0.013 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.078 | 0.036 | 0.000 | 0.078 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000050 | 202.224 | 0.036 | n/a | 0.000 | 0.000 | 0.720 | 201.230 | 0.018 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d550000000000000058 | 201.969 | 0.042 | n/a | 0.000 | 0.000 | 0.834 | 200.904 | 0.021 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.071 | 0.042 | 0.000 | 0.071 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000054 | 105.655 | 0.066 | n/a | 0.000 | 0.000 | 0.954 | 100.580 | 3.910 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.088 | 0.066 | 0.001 | 0.088 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000059 | 91.365 | 0.072 | n/a | 0.000 | 0.000 | 0.987 | 90.088 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.147 | 0.072 | 0.001 | 0.147 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h1 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.952 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.849 | 200.836 | 0.015 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.082 | 0.040 | 0.000 | 0.082 |
| p99 | 203.385 | n/a | n/a | n/a | 0.093 | n/a | 0.000 | 0.000 | 2.090 | 201.250 | 4.569 | 0.000 | 0.358 | 0.000 | n/a | n/a | 0.179 | 0.093 | 0.001 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000063 | 203.385 | 0.041 | n/a | 0.000 | 0.000 | 2.090 | 201.048 | 0.016 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.086 | 0.041 | 0.000 | 0.086 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d550000000000000068 | 202.267 | 0.032 | n/a | 0.000 | 0.000 | 0.753 | 201.250 | 0.020 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.073 | 0.032 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000066 | 202.255 | 0.044 | n/a | 0.000 | 0.000 | 0.981 | 200.973 | 0.012 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.142 | 0.044 | 0.000 | 0.142 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d550000000000000065 | 202.187 | 0.093 | n/a | 0.000 | 0.000 | 0.849 | 200.942 | 0.015 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.179 | 0.093 | 0.000 | 0.179 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000006a | 202.025 | 0.040 | n/a | 0.000 | 0.000 | 0.865 | 200.832 | 0.033 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.110 | 0.040 | 0.000 | 0.110 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d550000000000000061 | 201.998 | 0.038 | n/a | 0.000 | 0.000 | 0.893 | 200.879 | 0.011 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.081 | 0.038 | 0.000 | 0.081 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d550000000000000067 | 201.952 | 0.042 | n/a | 0.000 | 0.000 | 0.882 | 200.836 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.084 | 0.042 | 0.000 | 0.084 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d550000000000000062 | 201.930 | 0.033 | n/a | 0.000 | 0.000 | 0.754 | 200.947 | 0.014 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d55000000000000006b | 201.673 | 0.030 | n/a | 0.000 | 0.000 | 0.693 | 200.779 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.069 | 0.030 | 0.000 | 0.069 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d550000000000000064 | 137.880 | 0.059 | n/a | 0.000 | 0.000 | 0.747 | 136.615 | 0.020 | 0.000 | 0.358 | 0.000 | n/a | n/a | 0.082 | 0.059 | 0.000 | 0.082 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d55000000000000006c | 125.221 | 0.074 | n/a | 0.000 | 0.000 | 0.974 | 119.478 | 4.569 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.087 | 0.074 | 0.001 | 0.087 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d550000000000000069 | 70.332 | 0.040 | n/a | 0.000 | 0.000 | 0.786 | 65.203 | 4.178 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.063 | 0.040 | 0.001 | 0.063 | gw-r/thread-68/journal/page | none observed |

## P3 / grow3 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.411 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.881 | 201.107 | 0.023 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.090 | 0.047 | 0.000 | 0.090 |
| p99 | 269.957 | n/a | n/a | n/a | 0.573 | n/a | 0.000 | 0.000 | 1.426 | 201.490 | 146.452 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.217 | 0.573 | 0.002 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d550000000000000072 | 269.957 | 0.573 | n/a | 0.000 | 0.000 | 0.881 | 121.816 | 146.452 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.104 | 0.573 | 0.002 | 0.104 | gw-r/thread-52/gateway.admission-wait | none observed |
| f6d7a690124f1d550000000000000071 | 203.408 | 0.063 | n/a | 0.000 | 0.000 | 1.426 | 201.490 | 0.023 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.217 | 0.063 | 0.000 | 0.217 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d550000000000000070 | 202.411 | 0.046 | n/a | 0.000 | 0.000 | 1.027 | 201.107 | 0.022 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.090 | 0.046 | 0.000 | 0.090 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000006d | 202.385 | 0.047 | n/a | 0.000 | 0.000 | 0.813 | 201.308 | 0.022 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.084 | 0.047 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d55000000000000006e | 154.405 | 0.039 | n/a | 0.000 | 0.000 | 0.825 | 149.040 | 4.391 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.068 | 0.039 | 0.000 | 0.068 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.755 | n/a | n/a | n/a | 0.043 | n/a | 0.000 | 0.000 | 0.786 | 200.743 | 0.018 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.080 | 0.043 | 0.000 | 0.080 |
| p99 | 202.443 | n/a | n/a | n/a | 0.074 | n/a | 0.000 | 0.000 | 1.000 | 201.331 | 5.385 | 15.900 | 0.158 | 0.000 | n/a | n/a | 0.121 | 0.074 | 0.001 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d55000000000000008c | 202.443 | 0.040 | n/a | 0.000 | 0.000 | 0.790 | 201.331 | 0.034 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d55000000000000007e | 202.187 | 0.043 | n/a | 0.000 | 0.000 | 0.786 | 201.101 | 0.026 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.084 | 0.043 | 0.000 | 0.084 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d550000000000000087 | 202.034 | 0.036 | n/a | 0.000 | 0.000 | 0.882 | 200.869 | 0.015 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-69/journal/page | none observed |
| f6d7a690124f1d550000000000000083 | 202.029 | 0.045 | n/a | 0.000 | 0.000 | 0.889 | 200.895 | 0.014 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-69/journal/page | none observed |
| f6d7a690124f1d550000000000000089 | 202.023 | 0.054 | n/a | 0.000 | 0.000 | 1.000 | 200.743 | 0.015 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.121 | 0.054 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d550000000000000081 | 201.789 | 0.037 | n/a | 0.000 | 0.000 | 0.716 | 200.847 | 0.018 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.080 | 0.037 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d55000000000000008b | 201.755 | 0.038 | n/a | 0.000 | 0.000 | 0.611 | 200.907 | 0.012 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.087 | 0.038 | 0.000 | 0.087 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d55000000000000008d | 179.575 | 0.045 | n/a | 0.000 | 0.000 | 0.971 | 178.369 | 0.012 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.079 | 0.045 | 0.000 | 0.079 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d55000000000000007f | 157.705 | 0.056 | n/a | 0.000 | 0.000 | 0.740 | 156.735 | 0.032 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.074 | 0.056 | 0.000 | 0.074 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d550000000000000088 | 117.932 | 0.038 | n/a | 0.000 | 0.000 | 0.687 | 96.192 | 4.931 | 15.900 | 0.104 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-68/journal/page | none observed |
| f6d7a690124f1d55000000000000008a | 108.050 | 0.053 | n/a | 0.000 | 0.000 | 0.806 | 101.684 | 5.385 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.078 | 0.053 | 0.000 | 0.078 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d550000000000000082 | 79.589 | 0.074 | n/a | 0.000 | 0.000 | 0.656 | 78.622 | 0.065 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.118 | 0.074 | 0.001 | 0.118 | gw-r/thread-55/journal/page | none observed |

## P3 / grow10 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 171.034 | n/a | n/a | n/a | 0.490 | n/a | 0.000 | 0.000 | 1.129 | 110.903 | 0.015 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.102 | 0.490 | 0.003 | 0.102 |
| p99 | 369.494 | n/a | n/a | n/a | 0.730 | n/a | 0.000 | 0.000 | 6.940 | 201.142 | 263.332 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.177 | 0.730 | 0.009 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d55000000000000008f | 369.494 | 0.701 | n/a | 0.000 | 0.000 | 6.940 | 98.263 | 263.332 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.115 | 0.701 | 0.002 | 0.115 | gw-r/thread-55/gateway.admission-wait | none observed |
| f6d7a690124f1d550000000000000094 | 202.576 | 0.055 | n/a | 0.000 | 0.000 | 1.129 | 201.142 | 0.012 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.123 | 0.055 | 0.000 | 0.123 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d55000000000000008e | 202.156 | 0.033 | n/a | 0.000 | 0.000 | 0.774 | 201.109 | 0.015 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d550000000000000092 | 202.109 | 0.042 | n/a | 0.000 | 0.000 | 1.000 | 200.853 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.110 | 0.042 | 0.000 | 0.110 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d550000000000000095 | 171.034 | 0.490 | n/a | 0.000 | 0.000 | 0.782 | 141.050 | 28.570 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.087 | 0.490 | 0.003 | 0.087 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d550000000000000096 | 113.098 | 0.495 | n/a | 0.000 | 0.000 | 1.515 | 110.903 | 0.012 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.099 | 0.495 | 0.004 | 0.099 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d550000000000000097 | 100.428 | 0.513 | n/a | 0.000 | 0.000 | 1.202 | 98.483 | 0.020 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.102 | 0.513 | 0.005 | 0.102 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d550000000000000099 | 79.290 | 0.730 | n/a | 0.000 | 0.000 | 1.467 | 76.838 | 0.011 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.177 | 0.730 | 0.009 | 0.177 | gw-r/thread-52/journal/page | none observed |
| f6d7a690124f1d550000000000000098 | 69.292 | 0.434 | n/a | 0.000 | 0.000 | 0.781 | 67.867 | 0.016 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.083 | 0.434 | 0.006 | 0.083 | gw-r/thread-68/journal/page | none observed |

## P3 / p4h10 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.827 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.849 | 200.824 | 0.014 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.095 | 0.041 | 0.000 | 0.095 |
| p99 | 202.931 | n/a | n/a | n/a | 0.060 | n/a | 0.000 | 0.000 | 1.387 | 201.398 | 1.901 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.165 | 0.060 | 0.001 | 0.165 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d5500000000000000af | 202.931 | 0.054 | n/a | 0.000 | 0.000 | 1.055 | 201.381 | 0.170 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.139 | 0.054 | 0.000 | 0.139 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d5500000000000000a8 | 202.785 | 0.046 | n/a | 0.000 | 0.000 | 1.387 | 201.101 | 0.014 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.118 | 0.046 | 0.000 | 0.118 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d5500000000000000b5 | 202.373 | 0.040 | n/a | 0.000 | 0.000 | 0.692 | 201.398 | 0.025 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.092 | 0.040 | 0.000 | 0.092 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d5500000000000000ae | 202.221 | 0.028 | n/a | 0.000 | 0.000 | 0.942 | 201.040 | 0.014 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.088 | 0.028 | 0.000 | 0.088 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d5500000000000000b0 | 202.118 | 0.045 | n/a | 0.000 | 0.000 | 0.887 | 200.979 | 0.012 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.097 | 0.045 | 0.000 | 0.097 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d5500000000000000b3 | 201.936 | 0.041 | n/a | 0.000 | 0.000 | 0.849 | 200.810 | 0.014 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.135 | 0.041 | 0.000 | 0.135 | gw-r/thread-51/journal/page | none observed |
| f6d7a690124f1d5500000000000000b2 | 201.827 | 0.041 | n/a | 0.000 | 0.000 | 0.710 | 200.853 | 0.026 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.107 | 0.041 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d5500000000000000a7 | 201.771 | 0.041 | n/a | 0.000 | 0.000 | 0.713 | 200.822 | 0.018 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.086 | 0.041 | 0.000 | 0.086 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d5500000000000000ad | 201.716 | 0.053 | n/a | 0.000 | 0.000 | 0.843 | 200.652 | 0.013 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.080 | 0.053 | 0.000 | 0.080 | gw-r/thread-67/journal/page | none observed |
| f6d7a690124f1d5500000000000000ab | 201.627 | 0.031 | n/a | 0.000 | 0.000 | 0.551 | 200.824 | 0.015 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-69/journal/page | none observed |
| f6d7a690124f1d5500000000000000ac | 175.218 | 0.060 | n/a | 0.000 | 0.000 | 0.914 | 172.142 | 1.901 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.165 | 0.060 | 0.000 | 0.165 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d5500000000000000b1 | 101.945 | 0.053 | n/a | 0.000 | 0.000 | 0.958 | 100.774 | 0.011 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.095 | 0.053 | 0.001 | 0.095 | gw-r/thread-67/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.920 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.833 | 200.825 | 0.022 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.087 | 0.044 | 0.000 | 0.087 |
| p99 | 203.545 | n/a | n/a | n/a | 0.074 | n/a | 0.000 | 0.000 | 4.124 | 201.077 | 5.211 | 0.000 | 0.178 | 0.000 | n/a | n/a | 1.476 | 0.074 | 0.000 | 1.476 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f6d7a690124f1d5500000000000000be | 203.545 | 0.049 | n/a | 0.000 | 0.000 | 0.970 | 200.935 | 0.013 | 0.000 | 0.102 | 0.000 | n/a | n/a | 1.476 | 0.049 | 0.000 | 1.476 | gw-r/thread-50/journal/page | none observed |
| f6d7a690124f1d5500000000000000b9 | 202.146 | 0.044 | n/a | 0.000 | 0.000 | 0.854 | 200.982 | 0.013 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.138 | 0.044 | 0.000 | 0.138 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d5500000000000000b8 | 202.144 | 0.037 | n/a | 0.000 | 0.000 | 1.032 | 200.825 | 0.014 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.069 | 0.037 | 0.000 | 0.069 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d5500000000000000b6 | 202.093 | 0.041 | n/a | 0.000 | 0.000 | 0.727 | 201.034 | 0.034 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.112 | 0.041 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d5500000000000000bd | 202.072 | 0.039 | n/a | 0.000 | 0.000 | 0.687 | 201.077 | 0.022 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.073 | 0.039 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| f6d7a690124f1d5500000000000000bb | 201.920 | 0.074 | n/a | 0.000 | 0.000 | 0.743 | 200.858 | 0.017 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.125 | 0.074 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| f6d7a690124f1d5500000000000000bc | 192.327 | 0.041 | n/a | 0.000 | 0.000 | 2.252 | 186.015 | 3.760 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.081 | 0.041 | 0.000 | 0.081 | gw-r/thread-70/journal/page | none observed |
| f6d7a690124f1d5500000000000000ba | 141.923 | 0.052 | n/a | 0.000 | 0.000 | 0.790 | 140.023 | 0.822 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.180 | 0.052 | 0.000 | 0.180 | gw-r/thread-53/journal/page | none observed |
| f6d7a690124f1d5500000000000000bf | 128.062 | 0.052 | n/a | 0.000 | 0.000 | 4.124 | 118.489 | 5.211 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.087 | 0.052 | 0.000 | 0.087 | gw-r/thread-54/journal/page | none observed |
| f6d7a690124f1d5500000000000000b7 | 101.365 | 0.046 | n/a | 0.000 | 0.000 | 0.833 | 99.203 | 1.146 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.065 | 0.046 | 0.000 | 0.065 | gw-r/thread-68/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

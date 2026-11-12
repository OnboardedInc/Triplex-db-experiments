# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-52/gateway.admission-wait` (96.932 ms, trace `7c1d76f3c3e6d13f00000000000000c0`); `node-14/thread-0/client.persist-and-resolve` (253.692 ms, trace `7c1d76f3c3e6d13f000000000000014e`); `node-14/thread-0/client.persist-and-resolve` (250.327 ms, trace `7c1d76f3c3e6d13f000000000000014d`); `gw-w/thread-66/peer.transact-await (includes order/network/storage)` (201.644 ms, trace `7c1d76f3c3e6d13f000000000000014f`); `node-14/thread-0/client.persist-and-resolve` (241.234 ms, trace `7c1d76f3c3e6d13f000000000000014c`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-smoke-f`; source `6b1b223513fafbb819b1a1b8835197e2b1ad946f`; subjects 1000; tracing full.

Commit coverage: 88/88 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 88/88. Raw trace bytes: 2604217.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: ORACLE-ERROR.

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.672 | 7.941 | 0.937 | 0.000 | 0.072 | 1.250 | 3.875 | 0.084 | 0.000 | 0.664 | 15.671 | n/a | n/a | 0.029 | 8.927 | 0.252 | 0.029 |
| p99 | 55.231 | 15.208 | n/a | 0.000 | 0.687 | 3.526 | 14.607 | 0.165 | 0.000 | 2.135 | 28.945 | n/a | n/a | 0.140 | 16.039 | 0.290 | 0.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000096 | 55.231 | 15.208 | 0.758 | 0.000 | 0.072 | 3.526 | 5.849 | 0.113 | 0.000 | 0.731 | 28.945 | n/a | n/a | 0.029 | 16.039 | 0.290 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.worker-message 0.698ms |
| 7c1d76f3c3e6d13f0000000000000092 | 53.055 | 8.893 | n/a | 0.000 | 0.353 | 0.913 | 14.607 | 0.165 | 0.000 | 2.135 | 25.850 | n/a | n/a | 0.140 | 9.246 | 0.174 | 0.140 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000009a | 31.672 | 7.941 | 0.937 | 0.000 | 0.049 | 2.928 | 3.875 | 0.084 | 0.000 | 0.664 | 15.169 | n/a | n/a | 0.024 | 8.927 | 0.282 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000098 | 25.712 | 5.784 | n/a | 0.000 | 0.687 | 1.250 | 1.536 | 0.059 | 0.000 | 0.591 | 15.671 | n/a | n/a | 0.135 | 6.471 | 0.252 | 0.135 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.782 | 10.327 | 1.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 10.757 | 0.998 | 0.016 |
| p99 | 164.076 | 115.340 | 21.616 | 5.741 | 0.000 | 2.646 | 115.091 | 0.096 | 8.475 | 0.162 | 0.000 | n/a | n/a | 0.048 | 124.044 | 0.999 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000be | 164.076 | 32.704 | 14.859 | 0.000 | 0.000 | 1.293 | 115.091 | 0.063 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.012 | 47.562 | 0.290 | 0.012 | gw-w/thread-51/gateway.admitted-work | none observed |
| 7c1d76f3c3e6d13f0000000000000126 | 151.008 | 115.340 | 2.963 | 5.741 | 0.000 | 1.489 | 16.948 | 0.011 | 8.475 | 0.024 | 0.000 | n/a | n/a | 0.017 | 124.044 | 0.821 | 0.017 | node-14/thread-2/replica.pull-at | client.encode 8.301ms |
| 7c1d76f3c3e6d13f00000000000000c3 | 120.193 | 14.646 | 1.768 | 0.000 | 0.000 | 1.068 | 102.620 | 0.018 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.010 | 16.414 | 0.137 | 0.010 | gw-w/thread-49/gateway.admitted-work | none observed |
| 7c1d76f3c3e6d13f0000000000000094 | 98.419 | 34.381 | 21.616 | 4.762 | 0.000 | 2.646 | 34.720 | 0.096 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.035 | 60.760 | 0.617 | 0.035 | gw-w/thread-52/gateway.admitted-work | none observed |
| 7c1d76f3c3e6d13f00000000000000f9 | 77.270 | 24.897 | 8.272 | 0.000 | 0.000 | 2.529 | 41.505 | 0.011 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.017 | 33.169 | 0.429 | 0.017 | gw-w/thread-49/gateway.admitted-work | none observed |
| 7c1d76f3c3e6d13f00000000000000da | 16.353 | 14.932 | 1.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 16.336 | 0.999 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f000000000000010e | 15.151 | 13.666 | 1.437 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 15.103 | 0.997 | 0.048 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f00000000000000fe | 14.161 | 12.662 | 0.151 | 1.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 14.138 | 0.998 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f0000000000000131 | 11.484 | 0.546 | 10.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 11.463 | 0.998 | 0.021 | node-14/thread-0/rpc.replica.observe | none observed |
| 7c1d76f3c3e6d13f0000000000000113 | 10.944 | 10.794 | 0.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 10.914 | 0.997 | 0.031 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f0000000000000106 | 10.782 | 0.570 | 10.187 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 10.757 | 0.998 | 0.025 | node-14/thread-0/rpc.replica.observe | none observed |
| 7c1d76f3c3e6d13f00000000000000c8 | 10.748 | 10.664 | 0.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 10.738 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f0000000000000118 | 10.448 | 10.327 | 0.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 10.432 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f00000000000000ef | 10.287 | 10.197 | 0.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 10.276 | 0.999 | 0.010 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f00000000000000b9 | 9.943 | 7.697 | 2.226 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 9.922 | 0.998 | 0.021 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f000000000000010d | 9.622 | 9.437 | 0.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 9.611 | 0.999 | 0.011 | node-14/thread-2/replica.pull-at | driver.publication 1.018ms |
| 7c1d76f3c3e6d13f0000000000000141 | 8.513 | 8.385 | 0.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.502 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f00000000000000aa | 8.279 | 0.419 | 7.847 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 8.266 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| 7c1d76f3c3e6d13f00000000000000dd | 7.767 | 7.620 | 0.127 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 7.747 | 0.997 | 0.020 | node-14/thread-2/replica.pull-at | none observed |
| 7c1d76f3c3e6d13f0000000000000133 | 7.510 | 7.404 | 0.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 7.496 | 0.998 | 0.014 | node-14/thread-2/replica.pull-at | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.712 | 5.784 | n/a | 0.000 | 0.687 | 1.250 | 1.536 | 0.059 | 0.000 | 0.591 | 15.671 | n/a | n/a | 0.135 | 6.471 | 0.252 | 0.135 |
| p99 | 25.712 | 5.784 | n/a | 0.000 | 0.687 | 1.250 | 1.536 | 0.059 | 0.000 | 0.591 | 15.671 | n/a | n/a | 0.135 | 6.471 | 0.252 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000098 | 25.712 | 5.784 | n/a | 0.000 | 0.687 | 1.250 | 1.536 | 0.059 | 0.000 | 0.591 | 15.671 | n/a | n/a | 0.135 | 6.471 | 0.252 | 0.135 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.690 | 4.223 | n/a | 0.000 | 0.695 | 1.340 | 2.872 | 0.065 | 0.000 | 1.098 | 10.912 | n/a | n/a | 0.026 | 4.487 | 0.211 | 0.026 |
| p99 | 31.935 | 7.371 | n/a | 0.000 | 0.761 | 3.249 | 6.268 | 0.158 | 0.000 | 3.209 | 15.031 | n/a | n/a | 0.031 | 7.921 | 0.316 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000a4 | 31.935 | 7.371 | 0.499 | 0.000 | 0.051 | 3.249 | 6.268 | 0.065 | 0.000 | 3.209 | 11.199 | n/a | n/a | 0.026 | 7.921 | 0.248 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000009c | 24.561 | 3.600 | n/a | 0.000 | 0.695 | 1.127 | 2.831 | 0.158 | 0.000 | 1.098 | 15.031 | n/a | n/a | 0.021 | 4.295 | 0.175 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000a2 | 21.690 | 6.103 | n/a | 0.000 | 0.751 | 1.340 | 3.485 | 0.078 | 0.000 | 0.900 | 9.002 | n/a | n/a | 0.031 | 6.854 | 0.316 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000009e | 21.229 | 4.223 | 0.220 | 0.000 | 0.045 | 2.465 | 2.872 | 0.064 | 0.000 | 1.880 | 9.431 | n/a | n/a | 0.031 | 4.487 | 0.211 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000a0 | 17.182 | 2.541 | n/a | 0.000 | 0.761 | 0.994 | 1.266 | 0.041 | 0.000 | 0.646 | 10.912 | n/a | n/a | 0.021 | 3.302 | 0.192 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.182 | 2.541 | n/a | 0.000 | 0.695 | 0.994 | 1.266 | 0.041 | 0.000 | 0.646 | 10.912 | n/a | n/a | 0.021 | 3.302 | 0.175 | 0.021 |
| p99 | 24.561 | 3.600 | n/a | 0.000 | 0.761 | 1.127 | 2.831 | 0.158 | 0.000 | 1.098 | 15.031 | n/a | n/a | 0.021 | 4.295 | 0.192 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f000000000000009c | 24.561 | 3.600 | n/a | 0.000 | 0.695 | 1.127 | 2.831 | 0.158 | 0.000 | 1.098 | 15.031 | n/a | n/a | 0.021 | 4.295 | 0.175 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000a0 | 17.182 | 2.541 | n/a | 0.000 | 0.761 | 0.994 | 1.266 | 0.041 | 0.000 | 0.646 | 10.912 | n/a | n/a | 0.021 | 3.302 | 0.192 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.514 | 5.087 | 0.340 | 0.000 | 0.058 | 1.472 | 6.715 | 0.082 | 0.000 | 0.814 | 18.481 | n/a | n/a | 0.024 | 5.733 | 0.171 | 0.024 |
| p99 | 41.061 | 6.140 | n/a | 0.000 | 0.646 | 2.243 | 6.807 | 0.128 | 0.000 | 0.869 | 27.089 | n/a | n/a | 0.026 | 6.538 | 0.244 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000ab | 41.061 | 4.753 | 0.296 | 0.000 | 0.027 | 1.267 | 6.715 | 0.082 | 0.000 | 0.814 | 27.089 | n/a | n/a | 0.018 | 5.076 | 0.124 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000a9 | 33.514 | 5.087 | n/a | 0.000 | 0.646 | 1.472 | 6.807 | 0.128 | 0.000 | 0.869 | 18.481 | n/a | n/a | 0.024 | 5.733 | 0.171 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000a6 | 26.771 | 6.140 | 0.340 | 0.000 | 0.058 | 2.243 | 2.256 | 0.062 | 0.000 | 0.590 | 15.056 | n/a | n/a | 0.026 | 6.538 | 0.244 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 57.508 | 5.143 | 2.175 | 0.000 | 0.058 | 2.761 | 11.777 | 0.156 | 0.000 | 3.948 | 37.472 | n/a | n/a | 0.028 | 10.796 | 0.116 | 0.028 |
| p99 | 117.819 | 11.485 | n/a | 4.807 | 0.540 | 7.573 | 18.316 | 0.193 | 0.000 | 6.291 | 71.700 | n/a | n/a | 0.028 | 13.718 | 0.188 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000af | 117.819 | 11.485 | 2.175 | 0.000 | 0.058 | 7.573 | 18.316 | 0.193 | 0.000 | 6.291 | 71.700 | n/a | n/a | 0.028 | 13.718 | 0.116 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.755ms |
| 7c1d76f3c3e6d13f00000000000000b2 | 57.508 | 5.143 | 0.790 | 4.807 | 0.056 | 2.761 | 11.777 | 0.156 | 0.000 | 1.778 | 30.212 | n/a | n/a | 0.028 | 10.796 | 0.188 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000ad | 56.695 | 4.479 | n/a | 0.000 | 0.540 | 1.058 | 9.108 | 0.067 | 0.000 | 3.948 | 37.472 | n/a | n/a | 0.024 | 5.019 | 0.089 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 68.680 | 4.388 | 0.610 | 0.000 | 0.035 | 1.323 | 25.457 | 0.079 | 0.000 | 1.259 | 33.472 | n/a | n/a | 0.020 | 5.132 | 0.026 | 0.020 |
| p99 | 236.882 | 5.238 | n/a | 0.313 | 1.312 | 4.780 | 83.833 | 0.097 | 0.000 | 8.563 | 143.200 | n/a | n/a | 0.027 | 6.169 | 0.145 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000b6 | 236.882 | 5.238 | 0.610 | 0.292 | 0.029 | 4.780 | 83.833 | 0.097 | 0.000 | 5.912 | 136.071 | n/a | n/a | 0.020 | 6.169 | 0.026 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.189ms |
| 7c1d76f3c3e6d13f00000000000000b7 | 205.566 | 3.118 | n/a | 0.000 | 1.312 | 1.323 | 47.957 | 0.079 | 0.000 | 8.563 | 143.200 | n/a | n/a | 0.014 | 4.430 | 0.022 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000bb | 68.680 | 5.014 | 0.155 | 0.313 | 0.035 | 2.863 | 25.457 | 0.090 | 0.000 | 1.259 | 33.472 | n/a | n/a | 0.022 | 5.516 | 0.080 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000b4 | 35.499 | 4.388 | n/a | 0.000 | 0.744 | 1.166 | 5.615 | 0.054 | 0.000 | 0.577 | 22.929 | n/a | n/a | 0.027 | 5.132 | 0.145 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.499 | 3.118 | n/a | 0.000 | 0.744 | 1.166 | 5.615 | 0.054 | 0.000 | 0.577 | 22.929 | n/a | n/a | 0.014 | 4.430 | 0.022 | 0.014 |
| p99 | 205.566 | 4.388 | n/a | 0.000 | 1.312 | 1.323 | 47.957 | 0.079 | 0.000 | 8.563 | 143.200 | n/a | n/a | 0.027 | 5.132 | 0.145 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000b7 | 205.566 | 3.118 | n/a | 0.000 | 1.312 | 1.323 | 47.957 | 0.079 | 0.000 | 8.563 | 143.200 | n/a | n/a | 0.014 | 4.430 | 0.022 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000b4 | 35.499 | 4.388 | n/a | 0.000 | 0.744 | 1.166 | 5.615 | 0.054 | 0.000 | 0.577 | 22.929 | n/a | n/a | 0.027 | 5.132 | 0.145 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 111.193 | 7.241 | n/a | 0.000 | 0.281 | 1.650 | 21.755 | 0.085 | 0.000 | 0.840 | 65.158 | n/a | n/a | 0.026 | 7.865 | 0.071 | 0.026 |
| p99 | 272.001 | 12.497 | n/a | 0.662 | 0.624 | 8.982 | 45.497 | 97.107 | 0.000 | 6.365 | 100.503 | n/a | n/a | 0.032 | 13.520 | 0.130 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000c0 | 272.001 | 12.497 | 0.270 | 0.662 | 0.091 | 8.982 | 45.497 | 97.107 | 0.000 | 6.365 | 100.503 | n/a | n/a | 0.028 | 13.520 | 0.050 | 0.028 | gw-w/thread-52/gateway.admission-wait | driver.publication 1.175ms |
| 7c1d76f3c3e6d13f00000000000000c7 | 112.168 | 7.816 | 0.252 | 0.370 | 0.037 | 5.359 | 31.681 | 0.130 | 0.000 | 1.348 | 65.158 | n/a | n/a | 0.018 | 8.475 | 0.076 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000bd | 111.193 | 7.241 | n/a | 0.000 | 0.624 | 1.650 | 21.755 | 0.085 | 0.000 | 0.840 | 78.975 | n/a | n/a | 0.023 | 7.865 | 0.071 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000c2 | 79.469 | 5.296 | n/a | 0.000 | 0.281 | 0.950 | 14.299 | 0.076 | 0.000 | 0.833 | 57.701 | n/a | n/a | 0.032 | 5.577 | 0.070 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000c6 | 32.695 | 3.926 | n/a | 0.000 | 0.335 | 0.899 | 5.046 | 0.047 | 0.000 | 0.408 | 22.008 | n/a | n/a | 0.026 | 4.261 | 0.130 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.695 | 3.926 | n/a | 0.000 | 0.281 | 0.899 | 5.046 | 0.047 | 0.000 | 0.408 | 22.008 | n/a | n/a | 0.026 | 4.261 | 0.070 | 0.026 |
| p99 | 79.469 | 5.296 | n/a | 0.000 | 0.335 | 0.950 | 14.299 | 0.076 | 0.000 | 0.833 | 57.701 | n/a | n/a | 0.032 | 5.577 | 0.130 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000c2 | 79.469 | 5.296 | n/a | 0.000 | 0.281 | 0.950 | 14.299 | 0.076 | 0.000 | 0.833 | 57.701 | n/a | n/a | 0.032 | 5.577 | 0.070 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000c6 | 32.695 | 3.926 | n/a | 0.000 | 0.335 | 0.899 | 5.046 | 0.047 | 0.000 | 0.408 | 22.008 | n/a | n/a | 0.026 | 4.261 | 0.130 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.080 | 4.615 | 0.390 | 0.000 | 0.070 | 2.871 | 16.883 | 0.188 | 0.000 | 1.097 | 25.956 | n/a | n/a | 0.030 | 5.293 | 0.096 | 0.030 |
| p99 | 152.772 | 21.999 | n/a | 0.305 | 1.146 | 4.976 | 47.704 | 0.457 | 0.000 | 13.764 | 103.415 | n/a | n/a | 0.038 | 23.146 | 0.234 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000d1 | 152.772 | 4.528 | 0.390 | 0.305 | 0.070 | 1.867 | 40.981 | 0.158 | 0.000 | 1.026 | 103.415 | n/a | n/a | 0.031 | 5.293 | 0.035 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 8.440ms; driver.worker-message 0.998ms |
| 7c1d76f3c3e6d13f00000000000000cc | 98.972 | 21.999 | n/a | 0.000 | 1.146 | 4.976 | 16.883 | 0.457 | 0.000 | 13.764 | 39.718 | n/a | n/a | 0.029 | 23.146 | 0.234 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000ca | 86.080 | 7.840 | 0.326 | 0.000 | 0.068 | 2.871 | 47.704 | 0.188 | 0.000 | 1.097 | 25.956 | n/a | n/a | 0.030 | 8.234 | 0.096 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000cf | 42.904 | 4.615 | n/a | 0.000 | 0.143 | 3.196 | 8.625 | 0.189 | 0.000 | 4.239 | 21.860 | n/a | n/a | 0.038 | 4.758 | 0.111 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.904 | 4.615 | n/a | 0.000 | 0.143 | 3.196 | 8.625 | 0.189 | 0.000 | 4.239 | 21.860 | n/a | n/a | 0.029 | 4.758 | 0.111 | 0.029 |
| p99 | 98.972 | 21.999 | n/a | 0.000 | 1.146 | 4.976 | 16.883 | 0.457 | 0.000 | 13.764 | 39.718 | n/a | n/a | 0.038 | 23.146 | 0.234 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000cc | 98.972 | 21.999 | n/a | 0.000 | 1.146 | 4.976 | 16.883 | 0.457 | 0.000 | 13.764 | 39.718 | n/a | n/a | 0.029 | 23.146 | 0.234 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000cf | 42.904 | 4.615 | n/a | 0.000 | 0.143 | 3.196 | 8.625 | 0.189 | 0.000 | 4.239 | 21.860 | n/a | n/a | 0.038 | 4.758 | 0.111 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.382 | 8.292 | 0.238 | 0.000 | 0.038 | 2.060 | 12.713 | 0.066 | 0.000 | 0.635 | 24.876 | n/a | n/a | 0.022 | 8.589 | 0.167 | 0.022 |
| p99 | 60.656 | 8.636 | 1.679 | 3.867 | 0.058 | 2.614 | 15.124 | 0.069 | 0.000 | 0.695 | 30.326 | n/a | n/a | 0.030 | 14.220 | 0.234 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000d3 | 60.656 | 8.636 | 1.679 | 3.867 | 0.038 | 2.614 | 12.713 | 0.066 | 0.000 | 0.695 | 30.326 | n/a | n/a | 0.022 | 14.220 | 0.234 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000d6 | 51.382 | 8.292 | 0.238 | 0.000 | 0.058 | 2.060 | 15.124 | 0.069 | 0.000 | 0.635 | 24.876 | n/a | n/a | 0.030 | 8.589 | 0.167 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.077 | 7.728 | n/a | 0.000 | 0.322 | 2.664 | 9.606 | 0.113 | 0.000 | 0.625 | 23.022 | n/a | n/a | 0.026 | 8.077 | 0.186 | 0.026 |
| p99 | 202.866 | 10.510 | n/a | 0.370 | 1.102 | 5.067 | 33.698 | 0.191 | 0.000 | 3.085 | 158.979 | n/a | n/a | 0.071 | 12.764 | 0.290 | 0.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000d8 | 202.866 | 5.995 | 0.208 | 0.370 | 0.144 | 2.664 | 33.698 | 0.113 | 0.000 | 0.625 | 158.979 | n/a | n/a | 0.071 | 6.717 | 0.033 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.340ms |
| 7c1d76f3c3e6d13f00000000000000d9 | 51.505 | 8.492 | n/a | 0.000 | 1.102 | 5.067 | 2.314 | 0.191 | 0.000 | 3.085 | 31.227 | n/a | n/a | 0.026 | 9.594 | 0.186 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000df | 44.077 | 10.510 | 2.229 | 0.000 | 0.025 | 2.068 | 9.606 | 0.055 | 0.000 | 0.453 | 19.110 | n/a | n/a | 0.021 | 12.764 | 0.290 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000de | 38.524 | 7.728 | n/a | 0.000 | 0.350 | 4.598 | 20.541 | 0.113 | 0.000 | 0.635 | 4.536 | n/a | n/a | 0.024 | 8.077 | 0.210 | 0.024 | gw-w/thread-45/storage/begin-command! | none observed |
| 7c1d76f3c3e6d13f00000000000000dc | 34.663 | 5.035 | n/a | 0.000 | 0.322 | 1.028 | 4.767 | 0.040 | 0.000 | 0.409 | 23.022 | n/a | n/a | 0.041 | 5.357 | 0.155 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.663 | 5.035 | n/a | 0.000 | 0.322 | 1.028 | 4.767 | 0.040 | 0.000 | 0.409 | 4.536 | n/a | n/a | 0.024 | 5.357 | 0.155 | 0.024 |
| p99 | 38.524 | 7.728 | n/a | 0.000 | 0.350 | 4.598 | 20.541 | 0.113 | 0.000 | 0.635 | 23.022 | n/a | n/a | 0.041 | 8.077 | 0.210 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000de | 38.524 | 7.728 | n/a | 0.000 | 0.350 | 4.598 | 20.541 | 0.113 | 0.000 | 0.635 | 4.536 | n/a | n/a | 0.024 | 8.077 | 0.210 | 0.024 | gw-w/thread-45/storage/begin-command! | none observed |
| 7c1d76f3c3e6d13f00000000000000dc | 34.663 | 5.035 | n/a | 0.000 | 0.322 | 1.028 | 4.767 | 0.040 | 0.000 | 0.409 | 23.022 | n/a | n/a | 0.041 | 5.357 | 0.155 | 0.041 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.853 | 4.373 | 0.235 | 0.000 | 0.027 | 1.199 | 2.835 | 0.094 | 0.000 | 1.458 | 16.613 | n/a | n/a | 0.018 | 4.635 | 0.142 | 0.018 |
| p99 | 62.779 | 6.754 | 1.688 | 0.417 | 0.034 | 4.549 | 24.201 | 0.279 | 0.000 | 1.961 | 22.876 | n/a | n/a | 0.019 | 8.894 | 0.173 | 0.019 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000e1 | 62.779 | 6.754 | 1.688 | 0.417 | 0.034 | 4.549 | 24.201 | 0.279 | 0.000 | 1.961 | 22.876 | n/a | n/a | 0.019 | 8.894 | 0.142 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000e3 | 26.853 | 4.373 | 0.235 | 0.000 | 0.027 | 1.199 | 2.835 | 0.094 | 0.000 | 1.458 | 16.613 | n/a | n/a | 0.018 | 4.635 | 0.173 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (14 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.298 | 4.841 | n/a | 0.000 | 0.509 | 1.808 | 3.141 | 0.077 | 0.000 | 1.208 | 21.643 | n/a | n/a | 0.025 | 5.704 | 0.188 | 0.025 |
| p99 | 81.711 | 9.590 | n/a | 0.408 | 12.612 | 3.427 | 13.764 | 0.204 | 26.352 | 7.437 | 57.818 | n/a | n/a | 0.036 | 15.396 | 0.281 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000132 | 81.711 | 2.784 | n/a | 0.000 | 12.612 | 1.808 | 1.842 | 0.091 | 0.000 | 4.746 | 57.818 | n/a | n/a | 0.010 | 15.396 | 0.188 | 0.010 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.672ms |
| 7c1d76f3c3e6d13f0000000000000107 | 59.276 | 3.665 | 0.211 | 0.283 | 0.045 | 2.858 | 7.254 | 0.091 | 26.352 | 2.876 | 15.621 | n/a | n/a | 0.019 | 4.205 | 0.071 | 0.019 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| 7c1d76f3c3e6d13f0000000000000105 | 55.981 | 4.825 | n/a | 0.000 | 0.415 | 1.012 | 1.934 | 0.089 | 0.000 | 2.108 | 45.567 | n/a | n/a | 0.031 | 5.240 | 0.094 | 0.031 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000e8 | 54.501 | 6.949 | 0.199 | 0.305 | 0.059 | 3.427 | 13.764 | 0.113 | 0.000 | 5.903 | 23.748 | n/a | n/a | 0.036 | 7.511 | 0.138 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000103 | 41.803 | 6.323 | n/a | 0.000 | 0.731 | 2.053 | 3.196 | 0.066 | 0.000 | 0.934 | 28.474 | n/a | n/a | 0.025 | 7.054 | 0.169 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000fd | 38.030 | 9.590 | n/a | 0.000 | 0.509 | 0.972 | 1.809 | 0.059 | 0.000 | 1.208 | 23.856 | n/a | n/a | 0.027 | 10.099 | 0.266 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000e5 | 37.649 | 6.846 | n/a | 0.000 | 0.678 | 0.891 | 4.996 | 0.063 | 0.000 | 0.513 | 23.634 | n/a | n/a | 0.028 | 7.524 | 0.200 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000ff | 37.298 | 3.446 | 0.180 | 0.408 | 0.037 | 2.156 | 6.373 | 0.099 | 0.000 | 0.696 | 23.886 | n/a | n/a | 0.018 | 4.070 | 0.109 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000130 | 31.685 | 6.228 | n/a | 0.000 | 0.986 | 0.939 | 1.414 | 0.037 | 0.000 | 0.413 | 21.643 | n/a | n/a | 0.026 | 7.213 | 0.228 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000012a | 30.216 | 7.861 | 0.602 | 0.000 | 0.043 | 2.786 | 4.783 | 0.077 | 0.000 | 0.592 | 13.437 | n/a | n/a | 0.036 | 8.506 | 0.281 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000012c | 30.003 | 4.841 | n/a | 0.000 | 0.643 | 0.917 | 1.922 | 0.072 | 0.000 | 7.437 | 14.152 | n/a | n/a | 0.020 | 5.484 | 0.183 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000100 | 27.080 | 4.315 | n/a | 0.000 | 0.835 | 2.980 | 2.458 | 0.092 | 0.000 | 2.240 | 14.126 | n/a | n/a | 0.035 | 5.150 | 0.190 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000108 | 24.948 | 4.367 | n/a | 0.000 | 0.720 | 1.392 | 3.141 | 0.204 | 0.000 | 0.583 | 14.521 | n/a | n/a | 0.022 | 5.087 | 0.204 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000012e | 22.841 | 5.391 | 0.259 | 0.000 | 0.054 | 1.961 | 4.402 | 0.040 | 0.000 | 3.135 | 7.576 | n/a | n/a | 0.024 | 5.704 | 0.250 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.508 | 4.302 | 0.253 | 0.000 | 0.031 | 1.298 | 2.164 | 0.078 | 0.000 | 0.849 | 21.743 | n/a | n/a | 0.023 | 4.732 | 0.125 | 0.023 |
| p99 | 76.917 | 6.504 | n/a | 0.331 | 1.056 | 3.653 | 19.840 | 0.192 | 0.000 | 1.711 | 47.203 | n/a | n/a | 0.031 | 7.479 | 0.205 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000ea | 76.917 | 4.302 | 0.253 | 0.000 | 0.031 | 3.653 | 19.840 | 0.125 | 0.000 | 1.485 | 47.203 | n/a | n/a | 0.026 | 4.586 | 0.060 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000ee | 45.440 | 4.608 | n/a | 0.000 | 1.056 | 1.141 | 5.566 | 0.192 | 0.000 | 0.849 | 31.996 | n/a | n/a | 0.031 | 5.664 | 0.125 | 0.031 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000f0 | 36.508 | 6.504 | n/a | 0.000 | 0.975 | 3.310 | 2.164 | 0.078 | 0.000 | 1.711 | 21.743 | n/a | n/a | 0.023 | 7.479 | 0.205 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000ec | 30.163 | 4.184 | 0.186 | 0.331 | 0.031 | 1.298 | 2.106 | 0.047 | 0.000 | 0.479 | 21.480 | n/a | n/a | 0.021 | 4.732 | 0.157 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.508 | 6.504 | n/a | 0.000 | 0.975 | 3.310 | 2.164 | 0.078 | 0.000 | 1.711 | 21.743 | n/a | n/a | 0.023 | 7.479 | 0.205 | 0.023 |
| p99 | 36.508 | 6.504 | n/a | 0.000 | 0.975 | 3.310 | 2.164 | 0.078 | 0.000 | 1.711 | 21.743 | n/a | n/a | 0.023 | 7.479 | 0.205 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000f0 | 36.508 | 6.504 | n/a | 0.000 | 0.975 | 3.310 | 2.164 | 0.078 | 0.000 | 1.711 | 21.743 | n/a | n/a | 0.023 | 7.479 | 0.205 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 117.484 | 6.217 | 11.991 | 0.317 | 0.068 | 6.660 | 5.588 | 0.144 | 0.000 | 6.236 | 84.969 | n/a | n/a | 0.033 | 7.722 | 0.084 | 0.033 |
| p99 | 132.586 | 7.077 | n/a | 0.442 | 0.645 | 21.649 | 7.524 | 3.392 | 0.000 | 10.020 | 91.703 | n/a | n/a | 0.041 | 18.688 | 0.159 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f00000000000000f7 | 132.586 | 7.077 | n/a | 0.000 | 0.645 | 21.649 | 1.411 | 0.041 | 0.000 | 10.020 | 91.703 | n/a | n/a | 0.041 | 7.722 | 0.058 | 0.041 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000f8 | 117.484 | 6.217 | 11.991 | 0.442 | 0.039 | 4.809 | 5.588 | 0.144 | 0.000 | 3.265 | 84.969 | n/a | n/a | 0.020 | 18.688 | 0.159 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f00000000000000f3 | 60.850 | 4.505 | 0.248 | 0.317 | 0.068 | 6.660 | 7.524 | 3.392 | 0.000 | 6.236 | 31.868 | n/a | n/a | 0.033 | 5.138 | 0.084 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.080 | 2.784 | n/a | 0.000 | 0.835 | 1.808 | 1.842 | 0.091 | 0.000 | 2.240 | 14.126 | n/a | n/a | 0.010 | 5.150 | 0.188 | 0.010 |
| p99 | 81.711 | 4.315 | n/a | 0.000 | 12.612 | 2.980 | 2.458 | 0.092 | 0.000 | 4.746 | 57.818 | n/a | n/a | 0.035 | 15.396 | 0.190 | 0.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000132 | 81.711 | 2.784 | n/a | 0.000 | 12.612 | 1.808 | 1.842 | 0.091 | 0.000 | 4.746 | 57.818 | n/a | n/a | 0.010 | 15.396 | 0.188 | 0.010 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.672ms |
| 7c1d76f3c3e6d13f0000000000000100 | 27.080 | 4.315 | n/a | 0.000 | 0.835 | 2.980 | 2.458 | 0.092 | 0.000 | 2.240 | 14.126 | n/a | n/a | 0.035 | 5.150 | 0.190 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 53.171 | 4.558 | n/a | 0.000 | 0.577 | 0.976 | 5.957 | 0.070 | 0.000 | 2.000 | 26.190 | n/a | n/a | 0.025 | 5.222 | 0.111 | 0.025 |
| p99 | 199.932 | 5.686 | n/a | 0.337 | 1.031 | 2.472 | 20.684 | 0.149 | 0.000 | 3.910 | 179.835 | n/a | n/a | 0.027 | 6.282 | 0.248 | 0.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000115 | 199.932 | 5.019 | 0.235 | 0.280 | 0.061 | 0.885 | 11.303 | 0.149 | 0.000 | 2.137 | 179.835 | n/a | n/a | 0.027 | 5.595 | 0.028 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000010b | 62.082 | 3.289 | n/a | 0.000 | 0.309 | 1.165 | 8.848 | 0.070 | 0.000 | 0.801 | 47.575 | n/a | n/a | 0.025 | 3.598 | 0.058 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000111 | 56.600 | 5.686 | 0.224 | 0.337 | 0.034 | 2.369 | 20.684 | 0.109 | 0.000 | 0.947 | 26.190 | n/a | n/a | 0.019 | 6.282 | 0.111 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000010c | 53.171 | 4.179 | n/a | 0.000 | 0.577 | 2.472 | 1.690 | 0.043 | 0.000 | 3.809 | 40.374 | n/a | n/a | 0.027 | 4.756 | 0.089 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.512ms |
| 7c1d76f3c3e6d13f0000000000000117 | 31.940 | 4.996 | n/a | 0.000 | 0.706 | 0.976 | 5.957 | 0.082 | 0.000 | 3.910 | 15.290 | n/a | n/a | 0.023 | 5.702 | 0.179 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000112 | 29.605 | 4.558 | n/a | 0.000 | 0.664 | 0.946 | 1.831 | 0.038 | 0.000 | 2.000 | 19.542 | n/a | n/a | 0.025 | 5.222 | 0.176 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000010f | 15.790 | 2.877 | n/a | 0.000 | 1.031 | 0.909 | 1.450 | 0.064 | 0.000 | 0.466 | 8.972 | n/a | n/a | 0.020 | 3.909 | 0.248 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.790 | 2.877 | n/a | 0.000 | 0.309 | 0.909 | 1.450 | 0.064 | 0.000 | 0.466 | 8.972 | n/a | n/a | 0.020 | 3.598 | 0.058 | 0.020 |
| p99 | 62.082 | 3.289 | n/a | 0.000 | 1.031 | 1.165 | 8.848 | 0.070 | 0.000 | 0.801 | 47.575 | n/a | n/a | 0.025 | 3.909 | 0.248 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f000000000000010b | 62.082 | 3.289 | n/a | 0.000 | 0.309 | 1.165 | 8.848 | 0.070 | 0.000 | 0.801 | 47.575 | n/a | n/a | 0.025 | 3.598 | 0.058 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000010f | 15.790 | 2.877 | n/a | 0.000 | 1.031 | 0.909 | 1.450 | 0.064 | 0.000 | 0.466 | 8.972 | n/a | n/a | 0.020 | 3.909 | 0.248 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 133.560 | 4.410 | 13.229 | 0.000 | 0.045 | 6.298 | 6.569 | 0.045 | 0.000 | 2.508 | 104.595 | n/a | n/a | 0.019 | 12.245 | 0.120 | 0.019 |
| p99 | 137.174 | 8.443 | n/a | 0.270 | 1.041 | 17.353 | 19.657 | 0.132 | 0.000 | 9.545 | 106.526 | n/a | n/a | 0.026 | 17.670 | 0.132 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000125 | 137.174 | 3.782 | n/a | 0.000 | 1.041 | 17.353 | 6.569 | 0.042 | 0.000 | 1.834 | 106.526 | n/a | n/a | 0.026 | 4.824 | 0.035 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000121 | 133.560 | 4.410 | 13.229 | 0.000 | 0.030 | 2.236 | 6.491 | 0.045 | 0.000 | 2.508 | 104.595 | n/a | n/a | 0.016 | 17.670 | 0.132 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000011a | 102.226 | 8.443 | 3.487 | 0.270 | 0.045 | 6.298 | 19.657 | 0.132 | 0.000 | 9.545 | 54.329 | n/a | n/a | 0.019 | 12.245 | 0.120 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | client.encode 2.515ms |

## P2 / grow10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 137.174 | 3.782 | n/a | 0.000 | 1.041 | 17.353 | 6.569 | 0.042 | 0.000 | 1.834 | 106.526 | n/a | n/a | 0.026 | 4.824 | 0.035 | 0.026 |
| p99 | 137.174 | 3.782 | n/a | 0.000 | 1.041 | 17.353 | 6.569 | 0.042 | 0.000 | 1.834 | 106.526 | n/a | n/a | 0.026 | 4.824 | 0.035 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000125 | 137.174 | 3.782 | n/a | 0.000 | 1.041 | 17.353 | 6.569 | 0.042 | 0.000 | 1.834 | 106.526 | n/a | n/a | 0.026 | 4.824 | 0.035 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.423 | 4.813 | 0.305 | 0.000 | 0.033 | 2.262 | 6.195 | 0.047 | 0.000 | 0.561 | 18.571 | n/a | n/a | 0.020 | 5.153 | 0.132 | 0.020 |
| p99 | 65.821 | 5.830 | n/a | 0.000 | 0.427 | 3.312 | 26.927 | 0.125 | 0.000 | 1.588 | 28.801 | n/a | n/a | 0.031 | 6.102 | 0.201 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000134 | 65.821 | 5.595 | 0.473 | 0.000 | 0.031 | 2.262 | 26.927 | 0.125 | 0.000 | 1.588 | 28.801 | n/a | n/a | 0.020 | 6.099 | 0.093 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000136 | 32.379 | 4.813 | 0.305 | 0.000 | 0.035 | 1.927 | 6.195 | 0.047 | 0.000 | 0.455 | 18.571 | n/a | n/a | 0.031 | 5.153 | 0.159 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000013a | 30.423 | 5.830 | 0.239 | 0.000 | 0.033 | 3.312 | 8.369 | 0.087 | 0.000 | 0.579 | 11.955 | n/a | n/a | 0.020 | 6.102 | 0.201 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000137 | 29.313 | 3.446 | n/a | 0.000 | 0.427 | 2.875 | 1.251 | 0.043 | 0.000 | 0.561 | 20.686 | n/a | n/a | 0.023 | 3.873 | 0.132 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.313 | 3.446 | n/a | 0.000 | 0.427 | 2.875 | 1.251 | 0.043 | 0.000 | 0.561 | 20.686 | n/a | n/a | 0.023 | 3.873 | 0.132 | 0.023 |
| p99 | 29.313 | 3.446 | n/a | 0.000 | 0.427 | 2.875 | 1.251 | 0.043 | 0.000 | 0.561 | 20.686 | n/a | n/a | 0.023 | 3.873 | 0.132 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000137 | 29.313 | 3.446 | n/a | 0.000 | 0.427 | 2.875 | 1.251 | 0.043 | 0.000 | 0.561 | 20.686 | n/a | n/a | 0.023 | 3.873 | 0.132 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.119 | 3.564 | n/a | 0.000 | 0.202 | 1.032 | 1.927 | 0.050 | 0.000 | 0.619 | 18.861 | n/a | n/a | 0.020 | 4.053 | 0.141 | 0.020 |
| p99 | 33.702 | 5.731 | n/a | 0.658 | 1.056 | 2.987 | 8.044 | 0.214 | 0.000 | 1.531 | 22.837 | n/a | n/a | 0.024 | 7.064 | 0.235 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f0000000000000142 | 33.702 | 3.564 | 0.191 | 0.000 | 0.036 | 2.310 | 8.044 | 0.144 | 0.000 | 0.532 | 18.861 | n/a | n/a | 0.020 | 3.791 | 0.112 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000140 | 30.523 | 3.797 | n/a | 0.000 | 0.256 | 0.905 | 1.130 | 0.043 | 0.000 | 1.531 | 22.837 | n/a | n/a | 0.023 | 4.053 | 0.133 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000013e | 30.119 | 5.731 | 0.644 | 0.658 | 0.031 | 2.987 | 1.207 | 0.046 | 0.000 | 0.619 | 18.173 | n/a | n/a | 0.024 | 7.064 | 0.235 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f000000000000013c | 27.827 | 3.205 | n/a | 0.000 | 1.056 | 1.032 | 2.326 | 0.214 | 0.000 | 0.977 | 18.998 | n/a | n/a | 0.020 | 4.261 | 0.153 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| 7c1d76f3c3e6d13f0000000000000143 | 22.711 | 2.993 | n/a | 0.000 | 0.202 | 0.891 | 1.927 | 0.050 | 0.000 | 0.443 | 16.187 | n/a | n/a | 0.020 | 3.195 | 0.141 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.827 | 3.205 | n/a | 0.000 | 1.056 | 1.032 | 2.326 | 0.214 | 0.000 | 0.977 | 18.998 | n/a | n/a | 0.020 | 4.261 | 0.153 | 0.020 |
| p99 | 27.827 | 3.205 | n/a | 0.000 | 1.056 | 1.032 | 2.326 | 0.214 | 0.000 | 0.977 | 18.998 | n/a | n/a | 0.020 | 4.261 | 0.153 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f000000000000013c | 27.827 | 3.205 | n/a | 0.000 | 1.056 | 1.032 | 2.326 | 0.214 | 0.000 | 0.977 | 18.998 | n/a | n/a | 0.020 | 4.261 | 0.153 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 194.958 | 175.780 | n/a | 2.032 | 0.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 177.815 | 1.000 | 0.018 |
| p99 | 261.148 | 259.029 | n/a | 2.032 | 41.958 | 6.723 | 1.592 | 0.064 | 0.000 | 7.065 | 201.644 | n/a | n/a | 0.085 | 261.063 | 1.000 | 0.085 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f000000000000014e | 261.148 | 259.029 | n/a | 2.032 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.085 | 261.063 | 1.000 | 0.085 | node-14/thread-0/client.persist-and-resolve | driver.publication 22.057ms; driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.652ms |
| 7c1d76f3c3e6d13f000000000000014d | 257.301 | 255.255 | n/a | 2.032 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 257.290 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 22.057ms; driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.652ms |
| 7c1d76f3c3e6d13f000000000000014f | 254.399 | 4.804 | n/a | 0.000 | 41.958 | 2.467 | 1.592 | 0.064 | 0.000 | 1.854 | 201.644 | n/a | n/a | 0.017 | 46.762 | 0.184 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 22.057ms; driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.652ms |
| 7c1d76f3c3e6d13f000000000000014c | 248.011 | 245.965 | n/a | 2.032 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 248.000 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 22.057ms; driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.495ms |
| 7c1d76f3c3e6d13f000000000000014b | 230.737 | 228.678 | n/a | 2.032 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 230.713 | 1.000 | 0.024 | node-14/thread-0/client.persist-and-resolve | driver.publication 22.057ms; driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.495ms |
| 7c1d76f3c3e6d13f000000000000014a | 194.958 | 192.906 | n/a | 2.032 | 0.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 194.941 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.495ms; driver.publication 1.636ms |
| 7c1d76f3c3e6d13f0000000000000149 | 177.825 | 175.780 | n/a | 2.032 | 0.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 177.815 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 11.757ms; driver.publication 3.048ms; driver.publication 2.495ms; driver.publication 1.636ms; driver.publication 1.530ms |
| 7c1d76f3c3e6d13f0000000000000148 | 153.275 | 151.223 | n/a | 2.032 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 153.261 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | driver.publication 11.757ms; driver.publication 3.048ms; driver.publication 2.495ms; driver.publication 1.530ms |
| 7c1d76f3c3e6d13f0000000000000147 | 137.744 | 135.685 | n/a | 2.032 | 0.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 137.721 | 1.000 | 0.022 | node-14/thread-0/client.persist-and-resolve | driver.publication 11.757ms; driver.publication 3.048ms; driver.publication 2.495ms |
| 7c1d76f3c3e6d13f0000000000000146 | 91.598 | 89.537 | n/a | 2.032 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 91.576 | 1.000 | 0.023 | node-14/thread-0/client.persist-and-resolve | driver.publication 11.757ms; driver.publication 3.048ms |
| 7c1d76f3c3e6d13f0000000000000145 | 51.972 | 5.958 | n/a | 0.000 | 0.021 | 6.723 | 1.514 | 0.054 | 0.000 | 7.065 | 30.618 | n/a | n/a | 0.018 | 5.979 | 0.115 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 254.399 | 4.804 | n/a | 0.000 | 41.958 | 2.467 | 1.592 | 0.064 | 0.000 | 1.854 | 201.644 | n/a | n/a | 0.017 | 46.762 | 0.184 | 0.017 |
| p99 | 254.399 | 4.804 | n/a | 0.000 | 41.958 | 2.467 | 1.592 | 0.064 | 0.000 | 1.854 | 201.644 | n/a | n/a | 0.017 | 46.762 | 0.184 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7c1d76f3c3e6d13f000000000000014f | 254.399 | 4.804 | n/a | 0.000 | 41.958 | 2.467 | 1.592 | 0.064 | 0.000 | 1.854 | 201.644 | n/a | n/a | 0.017 | 46.762 | 0.184 | 0.017 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 22.057ms; driver.publication 11.757ms; driver.publication 4.505ms; driver.publication 3.048ms; driver.publication 2.652ms |

## P1 / warmup / read (198 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | 0.030 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.031 | 0.941 | 0.002 |
| p99 | 274.174 | 58.192 | n/a | 7.880 | 274.001 | 68.395 | 30.027 | 1.911 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.016 | 274.173 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 96e1842760944fc50000000000005153 | 274.254 | 0.052 | n/a | 0.000 | 274.201 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.253 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000005152 | 274.174 | 0.172 | n/a | 0.000 | 274.001 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.173 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000005151 | 273.991 | 0.045 | n/a | 0.000 | 273.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.990 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000005150 | 273.924 | 0.065 | n/a | 0.000 | 273.857 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.922 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000000514f | 273.852 | 0.253 | n/a | 0.000 | 273.595 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.848 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000061c1 | 273.654 | 0.062 | n/a | 0.000 | 273.590 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.651 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000061c0 | 273.557 | 0.205 | n/a | 0.000 | 273.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.554 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000005178 | 272.678 | 0.125 | n/a | 0.000 | 272.552 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.677 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000061d1 | 272.628 | 0.367 | n/a | 0.000 | 272.259 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.625 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000005177 | 272.552 | 0.025 | n/a | 0.000 | 272.527 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 272.552 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000005176 | 272.535 | 0.038 | n/a | 0.000 | 272.496 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.534 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000005181 | 272.500 | 0.023 | n/a | 0.000 | 272.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.499 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000005175 | 272.486 | 0.146 | n/a | 0.000 | 272.338 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.484 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000061d9 | 271.394 | 0.062 | n/a | 0.000 | 271.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 271.391 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000061db | 271.390 | 0.031 | n/a | 0.000 | 271.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.388 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000061da | 271.367 | 0.032 | n/a | 0.000 | 271.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.365 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000000010 | 219.721 | 0.440 | n/a | 0.000 | 219.275 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 219.715 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000000007 | 219.454 | 0.616 | n/a | 0.000 | 218.830 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 219.447 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000000008 | 217.184 | 0.647 | n/a | 0.000 | 216.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 217.166 | 1.000 | 0.017 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000000001a | 214.388 | 0.274 | n/a | 0.000 | 214.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 214.382 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (94 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.935 | 0.001 |
| p99 | 305.743 | 3.654 | n/a | 0.000 | 305.615 | 1.152 | 1.637 | 0.014 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.058 | 305.740 | 1.000 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c79000000000001d2c8 | 305.743 | 0.125 | n/a | 0.000 | 305.615 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 305.740 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 160abfc1543b3c79000000000001be6f | 282.575 | 0.258 | n/a | 0.000 | 282.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.573 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000000bb75 | 6.386 | 3.543 | n/a | 0.000 | 0.000 | 1.152 | 1.637 | 0.014 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.003 | 3.543 | 0.555 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c79000000000001bf09 | 3.656 | 3.654 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.654 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.027ms |
| 160abfc1543b3c790000000000019a70 | 0.737 | 0.734 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.734 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000000bc1a | 0.715 | 0.713 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.713 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000018177 | 0.640 | 0.636 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.636 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000001327a | 0.585 | 0.527 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 0.527 | 0.901 | 0.058 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000012c21 | 0.485 | 0.482 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.482 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000119f2 | 0.461 | 0.460 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.460 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000015257 | 0.438 | 0.436 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.436 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000176ab | 0.435 | 0.433 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.433 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000017d84 | 0.432 | 0.419 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.419 | 0.971 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000012905 | 0.427 | 0.426 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.426 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000017fb0 | 0.422 | 0.420 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.420 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000018178 | 0.418 | 0.412 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.412 | 0.987 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000019231 | 0.414 | 0.414 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.414 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000001c7d1 | 0.408 | 0.406 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.406 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000001a4e3 | 0.400 | 0.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.398 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000012bdd | 0.395 | 0.393 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.393 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (211 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.950 | 0.001 |
| p99 | 292.799 | 3.841 | n/a | 0.000 | 292.587 | 0.821 | 0.834 | 0.008 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.031 | 292.793 | 1.000 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1fd7343c9da346cc000000000000a8cf | 296.726 | 0.231 | n/a | 0.000 | 296.485 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 296.716 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 160abfc1543b3c79000000000001d2cb | 295.228 | 0.149 | n/a | 0.000 | 295.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 295.223 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 96e1842760944fc5000000000000a1c1 | 292.799 | 0.206 | n/a | 0.000 | 292.587 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 292.793 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 96e1842760944fc5000000000000a1fb | 8.908 | 4.345 | n/a | 0.000 | 0.000 | 2.721 | 1.776 | 0.017 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.004 | 4.345 | 0.488 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 1fd7343c9da346cc000000000000a8d8 | 8.719 | 6.925 | n/a | 0.000 | 0.000 | 0.821 | 0.946 | 0.008 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.003 | 6.925 | 0.794 | 0.003 | node-14/thread-5/reader.execute | none observed |
| 160abfc1543b3c79000000000001d386 | 4.921 | 2.870 | n/a | 0.000 | 0.000 | 1.182 | 0.834 | 0.008 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.002 | 2.870 | 0.583 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c79000000000001e614 | 3.843 | 3.841 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.841 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000001dd8e | 3.636 | 3.632 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 3.632 | 0.999 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000001e022 | 3.107 | 3.105 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.105 | 1.000 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 1fd7343c9da346cc000000000000b9f2 | 3.084 | 3.081 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.081 | 0.999 | 0.003 | node-14/thread-5/reader.execute | none observed |
| 1fd7343c9da346cc000000000000f215 | 2.056 | 2.054 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.054 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000ce73 | 2.019 | 2.018 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.018 | 0.999 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 96e1842760944fc5000000000000a391 | 1.795 | 1.792 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.792 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000ef11 | 1.747 | 1.744 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.744 | 0.998 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000f2dc | 1.637 | 1.491 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.147 | 1.491 | 0.910 | 0.147 | node-14/thread-5/replica.pull-at | none observed |
| 96e1842760944fc5000000000000a248 | 1.529 | 1.526 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.526 | 0.998 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 1fd7343c9da346cc000000000000f3a7 | 1.396 | 1.391 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.391 | 0.996 | 0.005 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000016a2e | 1.352 | 1.351 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.351 | 0.999 | 0.002 | node-14/thread-5/reader.execute | none observed |
| 1fd7343c9da346cc000000000000f325 | 1.342 | 1.331 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 1.331 | 0.992 | 0.011 | node-14/thread-5/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000252a0 | 1.292 | 1.289 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.289 | 0.998 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (219 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.021 | 0.948 | 0.001 |
| p99 | 417.066 | 4.464 | n/a | 0.000 | 417.049 | 3.073 | 0.709 | 0.009 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.022 | 417.065 | 1.000 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1fd7343c9da346cc000000000001b53b | 417.100 | 0.014 | n/a | 0.000 | 417.085 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 417.100 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000001b53a | 417.093 | 0.026 | n/a | 0.000 | 417.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 417.092 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000001b539 | 417.066 | 0.016 | n/a | 0.000 | 417.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 417.065 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000001b538 | 417.054 | 0.030 | n/a | 0.000 | 417.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 417.053 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000001b537 | 417.023 | 0.115 | n/a | 0.000 | 416.905 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 417.021 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000001a61f | 416.740 | 0.041 | n/a | 0.000 | 416.698 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 416.738 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000001a61e | 416.648 | 0.172 | n/a | 0.000 | 416.473 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 416.645 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000001a636 | 416.387 | 0.037 | n/a | 0.000 | 416.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 416.386 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000001a635 | 416.354 | 0.027 | n/a | 0.000 | 416.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 416.354 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000001a634 | 416.341 | 0.049 | n/a | 0.000 | 416.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 416.339 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003100f | 415.663 | 0.055 | n/a | 0.000 | 415.607 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.663 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003100e | 415.657 | 0.014 | n/a | 0.000 | 415.642 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.656 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003100d | 415.644 | 0.013 | n/a | 0.000 | 415.629 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.643 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003100c | 415.634 | 0.022 | n/a | 0.000 | 415.611 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.633 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003100b | 415.617 | 0.114 | n/a | 0.000 | 415.498 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 415.611 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000031020 | 414.983 | 0.023 | n/a | 0.000 | 414.958 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 414.981 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000001a5ef | 285.430 | 0.015 | n/a | 0.000 | 285.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.429 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms |
| 96e1842760944fc5000000000001a5ee | 285.414 | 0.015 | n/a | 0.000 | 285.398 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.413 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms |
| 96e1842760944fc5000000000001a5ed | 285.397 | 0.020 | n/a | 0.000 | 285.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 285.396 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms |
| 96e1842760944fc5000000000001a5ec | 285.378 | 0.067 | n/a | 0.000 | 285.309 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 285.376 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.074ms |

## P1 / L64 / read (176 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.040 | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.039 | 0.965 | 0.001 |
| p99 | 358.929 | 6.432 | n/a | 0.000 | 358.887 | 2.591 | 21.135 | 0.034 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.024 | 358.927 | 1.000 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c790000000000039938 | 359.097 | 0.379 | n/a | 0.000 | 358.715 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 359.094 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000039939 | 358.929 | 0.040 | n/a | 0.000 | 358.887 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 358.927 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003993a | 358.926 | 0.016 | n/a | 0.000 | 358.907 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 358.923 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000022fcd | 358.906 | 0.652 | n/a | 0.000 | 358.251 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 358.903 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000022fce | 358.397 | 0.096 | n/a | 0.000 | 358.298 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 358.395 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000022fcf | 358.353 | 0.021 | n/a | 0.000 | 358.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 358.351 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000002431e | 357.318 | 0.302 | n/a | 0.000 | 357.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 357.314 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000024322 | 357.238 | 0.012 | n/a | 0.000 | 357.225 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.237 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000024321 | 357.234 | 0.016 | n/a | 0.000 | 357.217 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.233 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc0000000000024320 | 357.218 | 0.018 | n/a | 0.000 | 357.199 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 357.218 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000002431f | 357.210 | 0.038 | n/a | 0.000 | 357.171 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 357.208 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003995f | 355.973 | 0.068 | n/a | 0.000 | 355.899 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 355.967 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000022fe5 | 355.940 | 0.092 | n/a | 0.000 | 355.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 355.934 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000039961 | 355.939 | 0.014 | n/a | 0.000 | 355.924 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.938 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000039960 | 355.932 | 0.017 | n/a | 0.000 | 355.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.931 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc50000000000022fe6 | 355.851 | 0.017 | n/a | 0.000 | 355.832 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.850 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003bf31 | 329.363 | 0.038 | n/a | 0.000 | 329.324 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.362 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003bf30 | 329.302 | 0.036 | n/a | 0.000 | 329.265 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.301 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003bf2f | 329.235 | 0.034 | n/a | 0.000 | 329.200 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.234 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c79000000000003bf2e | 329.205 | 0.092 | n/a | 0.000 | 329.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 329.203 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L256 / read (230 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | 0.029 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.032 | 0.962 | 0.001 |
| p99 | 351.731 | 8.835 | n/a | 0.000 | 351.649 | 1.987 | 14.362 | 0.009 | 0.000 | 0.029 | 0.000 | n/a | n/a | 3.065 | 351.729 | 1.000 | 3.065 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1fd7343c9da346cc00000000000347ef | 351.790 | 0.016 | n/a | 0.000 | 351.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.789 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 1fd7343c9da346cc00000000000347ee | 351.778 | 0.020 | n/a | 0.000 | 351.757 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.777 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 1fd7343c9da346cc00000000000347ed | 351.731 | 0.080 | n/a | 0.000 | 351.649 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 351.729 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 96e1842760944fc5000000000003407b | 351.476 | 0.197 | n/a | 0.000 | 351.276 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 351.473 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.107ms |
| 96e1842760944fc50000000000034083 | 351.187 | 0.106 | n/a | 0.000 | 351.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 351.167 | 1.000 | 0.020 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.107ms |
| 96e1842760944fc50000000000034084 | 351.183 | 0.025 | n/a | 0.000 | 351.156 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 351.181 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.107ms |
| 96e1842760944fc50000000000034082 | 351.125 | 0.112 | n/a | 0.000 | 351.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 351.121 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.107ms |
| 1fd7343c9da346cc00000000000347ec | 350.801 | 0.286 | n/a | 0.000 | 350.512 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 350.798 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 1fd7343c9da346cc00000000000347fd | 350.063 | 0.089 | n/a | 0.000 | 349.968 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 350.057 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 160abfc1543b3c790000000000049deb | 348.415 | 0.053 | n/a | 0.000 | 348.359 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 348.412 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 160abfc1543b3c790000000000049dea | 348.346 | 0.049 | n/a | 0.000 | 348.293 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 348.342 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 160abfc1543b3c790000000000049de9 | 348.259 | 0.067 | n/a | 0.000 | 348.188 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 348.256 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 160abfc1543b3c790000000000049de8 | 348.098 | 0.279 | n/a | 0.000 | 347.814 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 348.093 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 96e1842760944fc5000000000003407a | 347.665 | 0.433 | n/a | 0.000 | 347.226 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 347.659 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.107ms |
| 160abfc1543b3c790000000000049e06 | 347.402 | 0.104 | n/a | 0.000 | 347.294 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 347.398 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 160abfc1543b3c790000000000049e25 | 346.462 | 0.069 | n/a | 0.000 | 346.391 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 346.460 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.062ms |
| 1fd7343c9da346cc000000000003480a | 217.871 | 0.083 | n/a | 0.000 | 217.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 217.865 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000003480b | 217.866 | 0.040 | n/a | 0.000 | 217.822 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 217.862 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000003480c | 217.765 | 0.070 | n/a | 0.000 | 217.691 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 217.761 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000003480d | 217.686 | 0.025 | n/a | 0.000 | 217.658 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 217.683 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (298 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.026 | 0.957 | 0.001 |
| p99 | 15.001 | 14.979 | n/a | 0.000 | 0.000 | 1.807 | 3.978 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.030 | 14.979 | 1.000 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 96e1842760944fc50000000000038a13 | 19.591 | 3.067 | n/a | 0.000 | 0.000 | 1.807 | 14.673 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.003 | 3.067 | 0.157 | 0.003 | gw-r/thread-50/gateway.admitted-work | none observed |
| 160abfc1543b3c79000000000004eb5b | 15.008 | 15.005 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 15.005 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000004eb5c | 15.001 | 14.987 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 14.987 | 0.999 | 0.013 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000004eb5d | 14.992 | 14.979 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 14.979 | 0.999 | 0.014 | node-14/thread-3/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000038bf0 | 10.803 | 3.269 | n/a | 0.000 | 0.000 | 2.210 | 5.301 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.003 | 3.269 | 0.303 | 0.003 | gw-r/thread-70/gateway.admitted-work | none observed |
| 160abfc1543b3c79000000000004ea61 | 9.252 | 2.613 | n/a | 0.000 | 0.000 | 2.616 | 3.978 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.004 | 2.613 | 0.282 | 0.004 | gw-r/thread-70/gateway.admitted-work | none observed |
| 96e1842760944fc50000000000038c06 | 4.137 | 4.130 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 4.130 | 0.998 | 0.008 | node-14/thread-4/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000038ff0 | 3.401 | 3.399 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.399 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000038ff1 | 3.398 | 3.385 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.385 | 0.996 | 0.013 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000038ff2 | 3.392 | 3.378 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.378 | 0.996 | 0.014 | node-14/thread-5/replica.pull-at | none observed |
| 96e1842760944fc50000000000041cd8 | 3.342 | 3.336 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 3.336 | 0.998 | 0.006 | node-14/thread-4/reader.observe | none observed |
| 160abfc1543b3c790000000000060217 | 3.333 | 3.332 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.332 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000003d3b9 | 3.280 | 3.279 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.279 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000044048 | 3.198 | 3.174 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.174 | 0.992 | 0.024 | node-14/thread-5/replica.pull-at | none observed |
| 160abfc1543b3c790000000000057fde | 3.187 | 3.184 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.184 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000044047 | 3.184 | 3.182 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.182 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 96e1842760944fc50000000000038be5 | 3.165 | 3.139 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.139 | 0.992 | 0.025 | node-14/thread-4/replica.pull-at | none observed |
| 96e1842760944fc50000000000038be4 | 3.151 | 3.147 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.147 | 0.999 | 0.004 | node-14/thread-4/reader.execute | none observed |
| 96e1842760944fc50000000000038be6 | 3.144 | 3.115 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.115 | 0.991 | 0.028 | node-14/thread-4/replica.pull-at | none observed |
| 1fd7343c9da346cc0000000000041467 | 3.142 | 3.123 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.123 | 0.994 | 0.018 | node-14/thread-5/replica.pull-at | none observed |

## P1 / recovery / read (190 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.050 | 0.042 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.049 | 0.966 | 0.002 |
| p99 | 300.033 | 25.470 | n/a | 3.080 | 299.799 | 1.873 | 4.146 | 0.013 | 0.000 | 0.022 | 0.000 | n/a | n/a | 2.644 | 300.030 | 1.000 | 2.644 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1fd7343c9da346cc000000000004f811 | 300.198 | 0.080 | n/a | 0.000 | 300.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 300.196 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000004f810 | 300.033 | 0.253 | n/a | 0.000 | 299.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 300.030 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000004f823 | 299.857 | 0.056 | n/a | 0.000 | 299.799 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.855 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000004f821 | 299.829 | 0.088 | n/a | 0.000 | 299.740 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.828 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 1fd7343c9da346cc000000000004f822 | 299.784 | 0.093 | n/a | 0.000 | 299.689 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.782 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000064df8 | 299.293 | 0.049 | n/a | 0.000 | 299.242 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.291 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000064df7 | 299.217 | 0.044 | n/a | 0.000 | 299.171 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.216 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000064df6 | 299.152 | 0.071 | n/a | 0.000 | 299.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 299.151 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000064df5 | 299.051 | 0.067 | n/a | 0.000 | 298.981 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 299.049 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000064df4 | 298.926 | 0.214 | n/a | 0.000 | 298.707 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.921 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000004f5de | 298.787 | 0.513 | n/a | 0.000 | 298.271 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.784 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000004f5df | 298.612 | 0.096 | n/a | 0.000 | 298.512 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.608 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 160abfc1543b3c790000000000064df3 | 298.541 | 0.244 | n/a | 0.000 | 298.293 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.537 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000004f606 | 297.442 | 0.081 | n/a | 0.000 | 297.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.441 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000004f605 | 297.441 | 0.291 | n/a | 0.000 | 297.148 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.439 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc5000000000004f604 | 297.350 | 0.521 | n/a | 0.000 | 296.826 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 297.347 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 96e1842760944fc500000000000508e3 | 282.804 | 0.017 | n/a | 0.000 | 282.786 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.803 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 96e1842760944fc500000000000508e2 | 282.745 | 0.081 | n/a | 0.000 | 282.661 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 282.743 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |
| 160abfc1543b3c790000000000065ed4 | 282.720 | 0.141 | n/a | 0.000 | 282.575 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 282.716 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 96e1842760944fc500000000000508ec | 282.685 | 0.071 | n/a | 0.000 | 282.614 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.684 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.052ms |

## P4 / p4mix / read (135 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.015 | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.014 | 0.944 | 0.001 |
| p99 | 3.031 | 2.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 2.007 | 0.999 | 0.013 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c79000000000006ac0f | 11.407 | 1.982 | n/a | 0.000 | 0.000 | 1.338 | 7.983 | 0.052 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.011 | 1.982 | 0.174 | 0.011 | gw-r/thread-52/gateway.admitted-work | none observed |
| 160abfc1543b3c79000000000007abb5 | 3.031 | 3.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.028 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079835 | 2.009 | 2.007 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.007 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000006b0c5 | 1.496 | 1.494 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.494 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c79000000000006af91 | 1.245 | 1.245 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.245 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000007ac06 | 1.223 | 1.221 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.221 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079dd3 | 1.153 | 1.150 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.150 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000007a8d4 | 0.905 | 0.902 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.902 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000007a811 | 0.789 | 0.786 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.786 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079079 | 0.770 | 0.769 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.769 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000007a3ad | 0.752 | 0.525 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.228 | 0.525 | 0.698 | 0.228 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000006bb44 | 0.635 | 0.634 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.634 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079849 | 0.624 | 0.622 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.622 | 0.996 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c7900000000000744bf | 0.601 | 0.599 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.599 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000007530d | 0.601 | 0.591 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.591 | 0.982 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000085779 | 0.594 | 0.593 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.593 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000007554e | 0.571 | 0.570 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.570 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079dc4 | 0.550 | 0.549 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.549 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079dca | 0.547 | 0.545 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.545 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000079919 | 0.539 | 0.536 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.536 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (183 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.923 | 0.001 |
| p99 | 1.982 | 1.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.509 | 1.529 | 0.999 | 0.509 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c790000000000087e50 | 5.121 | 1.430 | n/a | 0.000 | 0.000 | 1.124 | 2.533 | 0.010 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.003 | 1.430 | 0.279 | 0.003 | gw-r/thread-50/gateway.admitted-work | none observed |
| 160abfc1543b3c79000000000008abb3 | 1.982 | 1.980 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.980 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000a15cf | 1.531 | 1.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.529 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000abaff | 1.030 | 0.180 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.850 | 0.180 | 0.174 | 0.850 | uncovered | none observed |
| 160abfc1543b3c7900000000000ad0fc | 0.995 | 0.990 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.990 | 0.994 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae7ff | 0.884 | 0.876 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.876 | 0.991 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ad040 | 0.868 | 0.812 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 0.812 | 0.935 | 0.056 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000a849c | 0.814 | 0.812 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.812 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c790000000000090ced | 0.806 | 0.804 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.804 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae85f | 0.724 | 0.720 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.720 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae80f | 0.718 | 0.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.714 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae845 | 0.708 | 0.703 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.703 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae7b0 | 0.614 | 0.105 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.509 | 0.105 | 0.171 | 0.509 | uncovered | none observed |
| 160abfc1543b3c7900000000000ad0fb | 0.610 | 0.608 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.608 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000009aabf | 0.609 | 0.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.607 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000a8406 | 0.608 | 0.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.607 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000009c160 | 0.599 | 0.598 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.598 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ad40c | 0.587 | 0.585 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.585 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae7f5 | 0.549 | 0.544 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.544 | 0.992 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ae87f | 0.529 | 0.527 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.527 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (155 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.930 | 0.001 |
| p99 | 9.752 | 5.344 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 5.344 | 1.000 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c7900000000000ae8db | 19.153 | 5.344 | n/a | 0.000 | 0.000 | 1.513 | 12.154 | 0.027 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.004 | 5.344 | 0.279 | 0.004 | gw-r/thread-53/gateway.admitted-work | none observed |
| 160abfc1543b3c7900000000000cb662 | 9.752 | 9.749 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 9.749 | 1.000 | 0.003 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.085ms |
| 160abfc1543b3c7900000000000bba3d | 4.762 | 4.759 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.759 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.082ms |
| 160abfc1543b3c7900000000000c8ddb | 3.718 | 3.714 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 3.714 | 0.999 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c8e58 | 3.282 | 3.280 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.280 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c7900000000000c8e37 | 3.209 | 3.207 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.207 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000bc8f8 | 1.520 | 1.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.519 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c9011 | 1.235 | 1.231 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.231 | 0.997 | 0.004 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c7900000000000c4b4a | 1.156 | 1.155 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.155 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c66da | 1.112 | 1.111 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 1.111 | 1.000 | 0.000 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c9cc1 | 0.862 | 0.857 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.857 | 0.995 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c8d8b | 0.728 | 0.726 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.726 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c5047 | 0.720 | 0.720 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.720 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000b49ec | 0.678 | 0.676 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.676 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c7900000000000bd147 | 0.619 | 0.616 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.616 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c73c8 | 0.618 | 0.614 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.614 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.052ms |
| 160abfc1543b3c7900000000000c4c2c | 0.615 | 0.612 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.612 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000c47f8 | 0.614 | 0.610 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.610 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000bdf99 | 0.591 | 0.590 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.590 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000afd02 | 0.588 | 0.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.586 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (157 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.011 | 0.933 | 0.001 |
| p99 | 4.972 | 3.279 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.442 | 3.279 | 0.996 | 0.442 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c7900000000000cccdb | 11.051 | 3.279 | n/a | 0.000 | 0.000 | 1.570 | 6.159 | 0.014 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.003 | 3.279 | 0.297 | 0.003 | gw-r/thread-51/gateway.admitted-work | none observed |
| 160abfc1543b3c7900000000000e5ebc | 4.972 | 4.759 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.213 | 4.759 | 0.957 | 0.213 | node-14/thread-3/reader.execute | none observed |
| 160abfc1543b3c7900000000000e5c1f | 0.935 | 0.037 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.898 | 0.037 | 0.039 | 0.898 | uncovered | none observed |
| 160abfc1543b3c7900000000000d5f7c | 0.754 | 0.752 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.752 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e5812 | 0.734 | 0.731 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.731 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000ceba8 | 0.523 | 0.521 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.521 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e5ef7 | 0.497 | 0.490 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.490 | 0.986 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000cfca6 | 0.480 | 0.038 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.442 | 0.038 | 0.078 | 0.442 | uncovered | none observed |
| 160abfc1543b3c7900000000000d79b7 | 0.479 | 0.478 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.478 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000d96ed | 0.479 | 0.477 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.477 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e5edd | 0.474 | 0.472 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.472 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000d45c5 | 0.472 | 0.469 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.469 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e6fe1 | 0.458 | 0.456 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.456 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000d4e63 | 0.458 | 0.456 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.456 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e7e33 | 0.455 | 0.453 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.453 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e7e3f | 0.446 | 0.444 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.444 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e88b6 | 0.438 | 0.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.434 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e53c9 | 0.435 | 0.433 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.433 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000e330b | 0.427 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.425 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c7900000000000d6314 | 0.407 | 0.400 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.400 | 0.983 | 0.007 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (155 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.104 | 0.041 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.102 | 0.984 | 0.001 |
| p99 | 314.677 | 0.443 | n/a | 0.000 | 314.651 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 314.676 | 1.000 | 0.009 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 96e1842760944fc5000000000005d939 | 314.696 | 0.261 | n/a | 0.000 | 314.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.695 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.120ms; replica.apply-delta 0.080ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.051ms |
| 1fd7343c9da346cc000000000005d825 | 314.677 | 0.013 | n/a | 0.000 | 314.663 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.676 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.061ms; replica.apply-delta 0.058ms; replica.apply-delta 0.057ms; replica.apply-delta 0.057ms |
| 1fd7343c9da346cc000000000005d824 | 314.667 | 0.016 | n/a | 0.000 | 314.651 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.666 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.061ms; replica.apply-delta 0.058ms; replica.apply-delta 0.057ms; replica.apply-delta 0.057ms |
| 1fd7343c9da346cc000000000005d823 | 314.645 | 0.024 | n/a | 0.000 | 314.620 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.644 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.061ms; replica.apply-delta 0.058ms; replica.apply-delta 0.057ms; replica.apply-delta 0.057ms |
| 1fd7343c9da346cc000000000005d822 | 314.593 | 0.087 | n/a | 0.000 | 314.504 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.592 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.061ms; replica.apply-delta 0.058ms; replica.apply-delta 0.057ms; replica.apply-delta 0.057ms |
| 96e1842760944fc5000000000005d93e | 314.516 | 0.081 | n/a | 0.000 | 314.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.515 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.120ms; replica.apply-delta 0.080ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.051ms |
| 96e1842760944fc5000000000005d938 | 314.484 | 0.017 | n/a | 0.000 | 314.466 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.483 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.120ms; replica.apply-delta 0.080ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.051ms |
| 96e1842760944fc5000000000005d937 | 314.468 | 0.069 | n/a | 0.000 | 314.397 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 314.466 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.120ms; replica.apply-delta 0.080ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.051ms |
| 96e1842760944fc5000000000005d936 | 314.382 | 0.206 | n/a | 0.000 | 314.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 314.380 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.120ms; replica.apply-delta 0.080ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.051ms |
| 1fd7343c9da346cc000000000005d821 | 314.249 | 0.205 | n/a | 0.000 | 314.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 314.246 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.061ms; replica.apply-delta 0.058ms; replica.apply-delta 0.057ms; replica.apply-delta 0.057ms |
| 160abfc1543b3c7900000000000f75e9 | 314.080 | 0.178 | n/a | 0.000 | 313.901 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.078 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.074ms; replica.apply-delta 0.070ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 160abfc1543b3c7900000000000f75e8 | 314.028 | 0.163 | n/a | 0.000 | 313.862 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 314.025 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.074ms; replica.apply-delta 0.070ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 160abfc1543b3c7900000000000f75ed | 313.965 | 0.013 | n/a | 0.000 | 313.951 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.964 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.074ms; replica.apply-delta 0.070ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 160abfc1543b3c7900000000000f75ec | 313.956 | 0.014 | n/a | 0.000 | 313.941 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 313.955 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.074ms; replica.apply-delta 0.070ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 160abfc1543b3c7900000000000f75ea | 313.952 | 0.032 | n/a | 0.000 | 313.919 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.950 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.074ms; replica.apply-delta 0.070ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 160abfc1543b3c7900000000000f75eb | 313.945 | 0.016 | n/a | 0.000 | 313.928 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.944 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.074ms; replica.apply-delta 0.074ms; replica.apply-delta 0.070ms; replica.apply-delta 0.063ms; replica.apply-delta 0.061ms |
| 160abfc1543b3c7900000000000f7571 | 281.143 | 0.228 | n/a | 0.000 | 280.913 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 281.141 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000f7572 | 281.035 | 0.114 | n/a | 0.000 | 280.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 281.031 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000f75a3 | 279.959 | 0.014 | n/a | 0.000 | 279.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 279.959 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 160abfc1543b3c7900000000000f75a2 | 279.944 | 0.014 | n/a | 0.000 | 279.929 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.943 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / baseline / read (16 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.051 | 0.048 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.048 | 0.926 | 0.003 |
| p99 | 3.210 | 3.208 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 3.208 | 0.999 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 160abfc1543b3c79000000000000bb30 | 3.210 | 3.208 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.208 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| 96e1842760944fc5000000000000a1a7 | 0.253 | 0.237 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.237 | 0.937 | 0.016 | node-14/thread-4/reader.execute | none observed |
| 1fd7343c9da346cc000000000000a8ca | 0.197 | 0.184 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.184 | 0.935 | 0.013 | node-14/thread-5/reader.execute | none observed |
| 96e1842760944fc5000000000000a1a8 | 0.113 | 0.088 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 0.088 | 0.774 | 0.026 | node-14/thread-4/replica.pull-at | none observed |
| 160abfc1543b3c79000000000000bb31 | 0.079 | 0.070 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.070 | 0.880 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| 160abfc1543b3c79000000000000bb32 | 0.053 | 0.050 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.050 | 0.945 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 96e1842760944fc5000000000000a1aa | 0.053 | 0.050 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.050 | 0.949 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000a8cb | 0.053 | 0.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.049 | 0.926 | 0.004 | node-14/thread-5/replica.pull-at | none observed |
| 160abfc1543b3c79000000000000bb35 | 0.051 | 0.048 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.048 | 0.942 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 96e1842760944fc5000000000000a1a9 | 0.036 | 0.033 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.033 | 0.919 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000a8cc | 0.036 | 0.034 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.034 | 0.945 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000a8cd | 0.034 | 0.032 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.032 | 0.950 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 1fd7343c9da346cc000000000000a8ce | 0.026 | 0.024 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.024 | 0.924 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 160abfc1543b3c79000000000000bb33 | 0.023 | 0.020 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.020 | 0.851 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 96e1842760944fc5000000000000a1ab | 0.017 | 0.014 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.014 | 0.826 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 160abfc1543b3c79000000000000bb34 | 0.014 | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.012 | 0.877 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P5 / sweep / read (21 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.849 | 6.936 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.074 | 7.775 | 0.991 | 0.074 |
| p99 | 10.623 | 10.614 | n/a | 0.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.171 | 10.614 | 0.999 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 5011285037decacd00000000000002e3 | 10.623 | 10.614 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 10.614 | 0.999 | 0.009 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002e4 | 10.599 | 10.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 10.562 | 0.996 | 0.037 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002e5 | 10.417 | 10.355 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 10.355 | 0.994 | 0.062 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002e6 | 10.162 | 10.119 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 10.119 | 0.996 | 0.043 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002e7 | 10.059 | 10.018 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 10.018 | 0.996 | 0.041 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002e8 | 9.454 | 9.378 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.075 | 9.378 | 0.992 | 0.075 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002e9 | 8.740 | 8.664 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.077 | 8.664 | 0.991 | 0.077 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000183 | 8.479 | 7.522 | n/a | 0.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.467 | 0.999 | 0.012 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002ea | 8.352 | 8.288 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.064 | 8.288 | 0.992 | 0.064 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000184 | 7.946 | 6.928 | n/a | 0.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.073 | 7.873 | 0.991 | 0.073 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002eb | 7.849 | 7.775 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.074 | 7.775 | 0.991 | 0.074 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002ec | 7.049 | 6.936 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.113 | 6.936 | 0.984 | 0.113 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000185 | 7.012 | 5.988 | n/a | 0.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.080 | 6.932 | 0.989 | 0.080 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000173 | 6.712 | 6.704 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 6.704 | 0.999 | 0.008 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd00000000000002ed | 6.553 | 6.475 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.077 | 6.475 | 0.988 | 0.077 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000174 | 6.546 | 6.384 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.163 | 6.384 | 0.975 | 0.163 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000175 | 6.446 | 6.277 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.170 | 6.277 | 0.974 | 0.170 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000176 | 6.316 | 6.146 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.170 | 6.146 | 0.973 | 0.170 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000186 | 6.057 | 5.032 | n/a | 0.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.080 | 5.977 | 0.987 | 0.080 | node-14/thread-6/replica.pull-at | none observed |
| 5011285037decacd0000000000000177 | 6.036 | 5.865 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.171 | 5.865 | 0.972 | 0.171 | node-14/thread-6/replica.pull-at | none observed |

## P3 / outside-phases / read (34 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.722 | 0.050 | n/a | 0.000 | 0.000 | 1.023 | 201.216 | 0.030 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 |
| p99 | 208.552 | 0.767 | n/a | 0.000 | 0.000 | 4.477 | 202.903 | 0.754 | 0.000 | 1.402 | 0.000 | n/a | n/a | 0.413 | 0.767 | 0.008 | 0.413 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee000000000000006e | 208.552 | 0.107 | n/a | 0.000 | 0.000 | 4.477 | 202.414 | 0.026 | 0.000 | 1.402 | 0.000 | n/a | n/a | 0.126 | 0.107 | 0.001 | 0.126 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000078 | 205.306 | 0.070 | n/a | 0.000 | 0.000 | 1.923 | 202.861 | 0.067 | 0.000 | 0.262 | 0.000 | n/a | n/a | 0.124 | 0.070 | 0.000 | 0.124 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee000000000000005c | 204.484 | 0.052 | n/a | 0.000 | 0.000 | 2.824 | 201.258 | 0.058 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000060 | 203.872 | 0.040 | n/a | 0.000 | 0.000 | 0.684 | 202.903 | 0.028 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.069 | 0.040 | 0.000 | 0.069 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000005 | 203.683 | 0.045 | n/a | 0.000 | 0.000 | 1.437 | 201.661 | 0.029 | 0.000 | 0.277 | 0.000 | n/a | n/a | 0.233 | 0.045 | 0.000 | 0.233 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000007e | 203.550 | 0.065 | n/a | 0.000 | 0.000 | 1.023 | 201.973 | 0.100 | 0.000 | 0.235 | 0.000 | n/a | n/a | 0.153 | 0.065 | 0.000 | 0.153 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000075 | 203.410 | 0.036 | n/a | 0.000 | 0.000 | 1.121 | 201.882 | 0.025 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.116 | 0.036 | 0.000 | 0.116 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000077 | 203.227 | 0.055 | n/a | 0.000 | 0.000 | 1.552 | 201.292 | 0.034 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.106 | 0.055 | 0.000 | 0.106 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000006 | 203.215 | 0.152 | n/a | 0.000 | 0.000 | 1.394 | 201.384 | 0.094 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.096 | 0.152 | 0.001 | 0.096 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000082 | 203.133 | 0.035 | n/a | 0.000 | 0.000 | 0.899 | 201.803 | 0.054 | 0.000 | 0.257 | 0.000 | n/a | n/a | 0.085 | 0.035 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000007 | 203.041 | 0.055 | n/a | 0.000 | 0.000 | 0.847 | 201.616 | 0.044 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.207 | 0.055 | 0.000 | 0.207 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000a1 | 203.022 | 0.050 | n/a | 0.000 | 0.000 | 1.240 | 201.376 | 0.052 | 0.000 | 0.210 | 0.000 | n/a | n/a | 0.094 | 0.050 | 0.000 | 0.094 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee000000000000005e | 202.990 | 0.039 | n/a | 0.000 | 0.000 | 0.731 | 201.903 | 0.032 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.080 | 0.039 | 0.000 | 0.080 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee000000000000005b | 202.896 | 0.039 | n/a | 0.000 | 0.000 | 1.091 | 201.309 | 0.056 | 0.000 | 0.313 | 0.000 | n/a | n/a | 0.088 | 0.039 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000a0 | 202.879 | 0.050 | n/a | 0.000 | 0.000 | 1.386 | 201.216 | 0.016 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee000000000000007a | 202.736 | 0.035 | n/a | 0.000 | 0.000 | 0.763 | 201.583 | 0.062 | 0.000 | 0.212 | 0.000 | n/a | n/a | 0.081 | 0.035 | 0.000 | 0.081 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000cc | 202.724 | 0.033 | n/a | 0.000 | 0.000 | 0.955 | 201.409 | 0.078 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.075 | 0.033 | 0.000 | 0.075 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee000000000000007d | 202.722 | 0.059 | n/a | 0.000 | 0.000 | 1.089 | 201.288 | 0.018 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.087 | 0.059 | 0.000 | 0.087 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee000000000000009e | 202.703 | 0.048 | n/a | 0.000 | 0.000 | 1.238 | 201.138 | 0.017 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.124 | 0.048 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000a3 | 202.320 | 0.044 | n/a | 0.000 | 0.000 | 0.831 | 201.176 | 0.032 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.079 | 0.044 | 0.000 | 0.079 | gw-r/thread-54/journal/page | none observed |

## P3 / outside-phases / internal (27 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 220.344 | 3.913 | n/a | 0.000 | 0.000 | 1.318 | 214.735 | 0.025 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.157 | 3.913 | 0.033 | 0.157 |
| p99 | 1007.011 | 104.644 | n/a | 6.596 | 0.000 | 2.270 | 1002.162 | 2.563 | 9.466 | 0.633 | 0.000 | n/a | n/a | 2.075 | 108.888 | 0.824 | 2.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000017 | 1007.011 | 0.387 | n/a | 0.000 | 0.000 | 2.252 | 1002.162 | 0.102 | 0.000 | 0.633 | 0.000 | n/a | n/a | 1.474 | 0.387 | 0.000 | 1.474 | gw-r/thread-50/journal/page | none observed |
| f57c292d1ffbc30b0000000000000018 | 1005.336 | 0.239 | n/a | 0.000 | 0.000 | 1.153 | 1001.941 | 0.099 | 0.000 | 0.563 | 0.000 | n/a | n/a | 1.342 | 0.239 | 0.000 | 1.342 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000019 | 1004.982 | 0.193 | n/a | 0.000 | 0.000 | 1.692 | 1001.636 | 0.026 | 0.000 | 0.265 | 0.000 | n/a | n/a | 1.171 | 0.193 | 0.000 | 1.171 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b0000000000000052 | 1003.998 | 0.231 | n/a | 0.000 | 0.000 | 1.169 | 1001.197 | 0.046 | 0.000 | 0.170 | 0.000 | n/a | n/a | 1.184 | 0.231 | 0.000 | 1.184 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b000000000000009e | 1003.653 | 0.167 | n/a | 0.000 | 0.000 | 0.953 | 1001.245 | 0.025 | 0.000 | 0.138 | 0.000 | n/a | n/a | 1.125 | 0.167 | 0.000 | 1.125 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b0000000000000081 | 940.425 | 6.424 | n/a | 0.000 | 0.000 | 1.212 | 932.567 | 0.018 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.087 | 6.424 | 0.007 | 0.087 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b0000000000000050 | 934.572 | 3.414 | n/a | 0.000 | 0.000 | 1.076 | 929.098 | 0.694 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.188 | 3.414 | 0.004 | 0.188 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b0000000000000063 | 472.894 | 7.432 | n/a | 0.000 | 0.000 | 1.442 | 463.578 | 0.176 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.121 | 7.432 | 0.016 | 0.121 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b000000000000005f | 438.328 | 6.007 | n/a | 0.000 | 0.000 | 1.996 | 430.035 | 0.019 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.176 | 6.007 | 0.014 | 0.176 | gw-r/thread-54/journal/page | none observed |
| f57c292d1ffbc30b0000000000000084 | 412.395 | 15.231 | n/a | 0.000 | 0.000 | 0.824 | 395.973 | 0.022 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.255 | 15.231 | 0.037 | 0.255 | gw-r/thread-54/journal/page | none observed |
| f57c292d1ffbc30b000000000000001a | 377.104 | 17.333 | n/a | 6.596 | 0.000 | 1.556 | 341.675 | 0.032 | 9.466 | 0.130 | 0.000 | n/a | n/a | 0.317 | 23.929 | 0.063 | 0.317 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b0000000000000068 | 312.849 | 3.822 | n/a | 0.000 | 0.000 | 0.968 | 307.725 | 0.021 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.157 | 3.822 | 0.012 | 0.157 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b0000000000000060 | 232.458 | 3.913 | n/a | 0.000 | 0.000 | 1.230 | 226.983 | 0.064 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.114 | 3.913 | 0.017 | 0.114 | gw-r/thread-55/journal/page | none observed |
| f57c292d1ffbc30b0000000000000080 | 220.344 | 3.802 | n/a | 0.000 | 0.000 | 1.563 | 214.735 | 0.020 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.095 | 3.802 | 0.017 | 0.095 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000061 | 178.757 | 4.958 | n/a | 0.000 | 0.000 | 0.951 | 172.463 | 0.194 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.091 | 4.958 | 0.028 | 0.091 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b000000000000005d | 173.534 | 9.750 | n/a | 1.326 | 0.000 | 1.340 | 160.637 | 0.036 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.306 | 11.076 | 0.064 | 0.306 | gw-r/thread-54/journal/page | none observed |
| f57c292d1ffbc30b0000000000000067 | 145.008 | 5.759 | n/a | 0.000 | 0.000 | 1.318 | 137.680 | 0.019 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.112 | 5.759 | 0.040 | 0.112 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b000000000000005c | 132.178 | 104.644 | n/a | 4.244 | 0.000 | 1.659 | 19.499 | 0.029 | 0.000 | 0.028 | 0.000 | n/a | n/a | 2.075 | 108.888 | 0.824 | 2.075 | node-14/thread-2/replica.fetch-feed | none observed |
| f57c292d1ffbc30b0000000000000065 | 127.100 | 6.244 | n/a | 0.000 | 0.000 | 1.204 | 119.417 | 0.008 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.132 | 6.244 | 0.049 | 0.132 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b0000000000000085 | 65.800 | 2.141 | n/a | 0.000 | 0.000 | 0.872 | 60.087 | 2.563 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.080 | 2.141 | 0.033 | 0.080 | gw-r/thread-54/journal/page | none observed |

## P3 / warmup / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 577.546 | 2.225 | n/a | 0.000 | 0.000 | 1.535 | 573.518 | 0.022 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.164 | 2.225 | 0.005 | 0.164 |
| p99 | 788.674 | 8.396 | n/a | 0.000 | 0.000 | 2.254 | 778.754 | 0.024 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.269 | 8.396 | 0.011 | 0.269 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b000000000000001c | 788.674 | 8.396 | n/a | 0.000 | 0.000 | 1.093 | 778.754 | 0.022 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.269 | 8.396 | 0.011 | 0.269 | gw-r/thread-55/journal/page | none observed |
| f57c292d1ffbc30b000000000000001e | 577.546 | 2.225 | n/a | 0.000 | 0.000 | 1.535 | 573.518 | 0.014 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.112 | 2.225 | 0.004 | 0.112 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b000000000000001d | 402.454 | 2.169 | n/a | 0.000 | 0.000 | 2.254 | 397.679 | 0.024 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.164 | 2.169 | 0.005 | 0.164 | gw-r/thread-70/journal/page | none observed |

## P3 / baseline / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 435.037 | 2.600 | n/a | 0.000 | 0.000 | 0.962 | 431.203 | 0.016 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.092 | 2.600 | 0.006 | 0.092 |
| p99 | 614.538 | 4.014 | n/a | 0.000 | 0.000 | 1.590 | 611.365 | 0.022 | 0.000 | 0.251 | 0.000 | n/a | n/a | 0.158 | 4.014 | 0.030 | 0.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000023 | 614.538 | 1.880 | n/a | 0.000 | 0.000 | 1.054 | 611.365 | 0.019 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.092 | 1.880 | 0.003 | 0.092 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b0000000000000022 | 557.113 | 2.279 | n/a | 0.000 | 0.000 | 0.832 | 553.658 | 0.014 | 0.000 | 0.251 | 0.000 | n/a | n/a | 0.079 | 2.279 | 0.004 | 0.079 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000020 | 435.037 | 2.694 | n/a | 0.000 | 0.000 | 0.842 | 431.203 | 0.016 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.158 | 2.694 | 0.006 | 0.158 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000024 | 306.421 | 4.014 | n/a | 0.000 | 0.000 | 1.590 | 300.536 | 0.014 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.141 | 4.014 | 0.013 | 0.141 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b0000000000000026 | 88.062 | 2.600 | n/a | 0.000 | 0.000 | 0.962 | 84.197 | 0.022 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.086 | 2.600 | 0.030 | 0.086 | gw-r/thread-68/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 828.206 | 4.603 | n/a | 0.000 | 0.000 | 1.119 | 814.870 | 0.099 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.104 | 4.603 | 0.014 | 0.104 |
| p99 | 989.658 | 11.748 | n/a | 0.000 | 0.000 | 1.121 | 986.149 | 0.118 | 0.000 | 0.272 | 0.000 | n/a | n/a | 0.198 | 11.748 | 0.023 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000028 | 989.658 | 2.354 | n/a | 0.000 | 0.000 | 0.889 | 986.149 | 0.031 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.084 | 2.354 | 0.002 | 0.084 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b0000000000000029 | 828.206 | 11.748 | n/a | 0.000 | 0.000 | 1.119 | 814.870 | 0.118 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.198 | 11.748 | 0.014 | 0.198 | gw-r/thread-55/journal/page | none observed |
| f57c292d1ffbc30b000000000000002a | 196.528 | 4.603 | n/a | 0.000 | 0.000 | 1.121 | 190.329 | 0.099 | 0.000 | 0.272 | 0.000 | n/a | n/a | 0.104 | 4.603 | 0.023 | 0.104 | gw-r/thread-54/journal/page | none observed |

## P3 / L4 / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 801.855 | 3.412 | n/a | 0.000 | 0.000 | 0.939 | 797.633 | 0.054 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.113 | 3.412 | 0.007 | 0.113 |
| p99 | 936.148 | 6.401 | n/a | 0.000 | 0.000 | 1.074 | 928.517 | 0.056 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.124 | 6.401 | 0.013 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b000000000000002f | 936.148 | 6.401 | n/a | 0.000 | 0.000 | 0.939 | 928.517 | 0.028 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.124 | 6.401 | 0.007 | 0.124 | gw-r/thread-50/journal/page | none observed |
| f57c292d1ffbc30b000000000000002d | 801.855 | 2.786 | n/a | 0.000 | 0.000 | 1.074 | 797.633 | 0.054 | 0.000 | 0.195 | 0.000 | n/a | n/a | 0.113 | 2.786 | 0.003 | 0.113 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b000000000000002c | 265.577 | 3.412 | n/a | 0.000 | 0.000 | 0.855 | 260.945 | 0.056 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.094 | 3.412 | 0.013 | 0.094 | gw-r/thread-52/journal/page | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 429.427 | 4.072 | n/a | 0.000 | 0.000 | 1.143 | 424.057 | 0.017 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.108 | 4.072 | 0.009 | 0.108 |
| p99 | 840.607 | 8.855 | n/a | 0.000 | 0.000 | 1.568 | 829.996 | 0.020 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.469 | 8.855 | 0.222 | 0.469 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000035 | 840.607 | 8.855 | n/a | 0.000 | 0.000 | 1.143 | 829.996 | 0.020 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.469 | 8.855 | 0.011 | 0.469 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000030 | 732.933 | 2.274 | n/a | 0.000 | 0.000 | 1.568 | 728.846 | 0.020 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.108 | 2.274 | 0.003 | 0.108 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b0000000000000031 | 429.427 | 4.072 | n/a | 0.000 | 0.000 | 1.026 | 424.057 | 0.017 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.087 | 4.072 | 0.009 | 0.087 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000034 | 30.776 | 6.825 | n/a | 0.000 | 0.000 | 1.412 | 22.206 | 0.015 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.219 | 6.825 | 0.222 | 0.219 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 410.931 | 2.739 | n/a | 0.000 | 0.000 | 1.088 | 400.700 | 0.261 | 0.000 | 0.189 | 0.000 | n/a | n/a | 0.146 | 2.739 | 0.018 | 0.146 |
| p99 | 744.998 | 8.120 | n/a | 0.000 | 0.000 | 4.035 | 741.791 | 5.155 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.299 | 8.120 | 0.041 | 0.299 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b000000000000003b | 744.998 | 2.054 | n/a | 0.000 | 0.000 | 0.877 | 741.791 | 0.023 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.146 | 2.054 | 0.003 | 0.146 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000038 | 623.865 | 2.248 | n/a | 0.000 | 0.000 | 1.088 | 615.056 | 5.155 | 0.000 | 0.189 | 0.000 | n/a | n/a | 0.130 | 2.248 | 0.004 | 0.130 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000036 | 410.931 | 8.120 | n/a | 0.000 | 0.000 | 1.601 | 400.700 | 0.023 | 0.000 | 0.217 | 0.000 | n/a | n/a | 0.271 | 8.120 | 0.020 | 0.271 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b000000000000003a | 151.627 | 2.739 | n/a | 0.000 | 0.000 | 0.725 | 147.644 | 0.261 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.109 | 2.739 | 0.018 | 0.109 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b000000000000003d | 111.446 | 4.607 | n/a | 0.000 | 0.000 | 4.035 | 97.663 | 4.639 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.299 | 4.607 | 0.041 | 0.299 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 258.295 | 2.486 | n/a | 0.000 | 0.000 | 1.090 | 248.228 | 0.025 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.103 | 2.486 | 0.005 | 0.103 |
| p99 | 958.229 | 6.322 | n/a | 0.000 | 0.000 | 1.847 | 952.456 | 4.564 | 0.000 | 1.610 | 0.000 | n/a | n/a | 0.121 | 6.322 | 0.024 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b000000000000003e | 958.229 | 4.831 | n/a | 0.000 | 0.000 | 0.692 | 952.456 | 0.025 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.103 | 4.831 | 0.005 | 0.103 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b0000000000000042 | 598.021 | 2.486 | n/a | 0.000 | 0.000 | 1.090 | 589.634 | 4.564 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.099 | 2.486 | 0.004 | 0.099 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b000000000000003f | 258.295 | 6.322 | n/a | 0.000 | 0.000 | 1.847 | 248.228 | 0.167 | 0.000 | 1.610 | 0.000 | n/a | n/a | 0.121 | 6.322 | 0.024 | 0.121 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b0000000000000040 | 214.567 | 2.429 | n/a | 0.000 | 0.000 | 1.371 | 210.438 | 0.023 | 0.000 | 0.187 | 0.000 | n/a | n/a | 0.119 | 2.429 | 0.011 | 0.119 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 902.982 | 4.894 | n/a | 0.000 | 0.000 | 0.793 | 888.708 | 0.023 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.179 | 4.894 | 0.005 | 1.179 |
| p99 | 993.598 | 9.418 | n/a | 0.000 | 0.000 | 1.031 | 986.212 | 0.442 | 0.000 | 0.127 | 0.000 | n/a | n/a | 3.675 | 9.418 | 0.010 | 3.675 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000045 | 993.598 | 4.894 | n/a | 0.000 | 0.000 | 0.793 | 986.212 | 0.442 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.179 | 4.894 | 0.005 | 1.179 | gw-r/thread-50/journal/page | none observed |
| f57c292d1ffbc30b0000000000000044 | 902.982 | 9.418 | n/a | 0.000 | 0.000 | 1.031 | 888.708 | 0.023 | 0.000 | 0.127 | 0.000 | n/a | n/a | 3.675 | 9.418 | 0.010 | 3.675 | gw-r/thread-68/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 267.834 | 3.942 | n/a | 0.000 | 0.000 | 1.146 | 261.453 | 0.022 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.090 | 3.942 | 0.006 | 0.090 |
| p99 | 1010.782 | 6.145 | n/a | 0.000 | 0.000 | 2.984 | 1003.054 | 10.355 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.295 | 6.145 | 0.027 | 0.295 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000046 | 1010.782 | 6.145 | n/a | 0.000 | 0.000 | 1.146 | 1003.054 | 0.020 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.295 | 6.145 | 0.006 | 0.295 | gw-r/thread-50/journal/page | none observed |
| f57c292d1ffbc30b000000000000004b | 553.242 | 3.342 | n/a | 0.000 | 0.000 | 0.783 | 547.228 | 1.661 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.084 | 3.342 | 0.006 | 0.084 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000049 | 267.834 | 4.326 | n/a | 0.000 | 0.000 | 1.788 | 261.453 | 0.022 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.111 | 4.326 | 0.016 | 0.111 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000048 | 147.280 | 3.942 | n/a | 0.000 | 0.000 | 2.984 | 129.803 | 10.355 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.090 | 3.942 | 0.027 | 0.090 | gw-r/thread-53/journal/page | none observed |

## P3 / p4mix / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.864 | 3.826 | n/a | 0.000 | 0.000 | 1.112 | 81.157 | 0.024 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.185 | 3.826 | 0.005 | 0.185 |
| p99 | 1003.181 | 5.948 | n/a | 0.000 | 0.000 | 2.225 | 1000.636 | 0.262 | 0.000 | 0.270 | 0.000 | n/a | n/a | 1.234 | 5.948 | 0.165 | 1.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b000000000000004c | 1003.181 | 0.246 | n/a | 0.000 | 0.000 | 0.921 | 1000.636 | 0.024 | 0.000 | 0.120 | 0.000 | n/a | n/a | 1.234 | 0.246 | 0.000 | 1.234 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b000000000000004e | 967.495 | 4.495 | n/a | 0.000 | 0.000 | 2.130 | 960.378 | 0.037 | 0.000 | 0.270 | 0.000 | n/a | n/a | 0.185 | 4.495 | 0.005 | 0.185 | gw-r/thread-55/journal/page | none observed |
| f57c292d1ffbc30b000000000000004f | 88.864 | 5.948 | n/a | 0.000 | 0.000 | 1.112 | 81.157 | 0.262 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.243 | 5.948 | 0.067 | 0.243 | gw-r/thread-55/journal/page | none observed |
| f57c292d1ffbc30b000000000000004d | 23.137 | 3.826 | n/a | 0.000 | 0.000 | 2.225 | 16.819 | 0.022 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.126 | 3.826 | 0.165 | 0.126 | gw-r/thread-55/journal/page | none observed |

## P3 / p4h1 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 378.663 | 3.180 | n/a | 0.000 | 0.000 | 0.894 | 375.422 | 0.078 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.108 | 3.180 | 0.009 | 0.108 |
| p99 | 950.099 | 3.826 | n/a | 0.000 | 0.000 | 1.171 | 946.356 | 1.438 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.169 | 3.826 | 0.121 | 0.169 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000054 | 950.099 | 2.334 | n/a | 0.000 | 0.000 | 1.171 | 946.356 | 0.026 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.091 | 2.334 | 0.002 | 0.091 | gw-r/thread-50/journal/page | none observed |
| f57c292d1ffbc30b0000000000000055 | 406.557 | 3.826 | n/a | 0.000 | 0.000 | 0.885 | 401.504 | 0.078 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.108 | 3.826 | 0.009 | 0.108 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b0000000000000057 | 378.663 | 1.889 | n/a | 0.000 | 0.000 | 0.894 | 375.422 | 0.166 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.085 | 1.889 | 0.005 | 0.085 | gw-r/thread-50/journal/page | none observed |
| f57c292d1ffbc30b0000000000000059 | 239.953 | 3.267 | n/a | 0.000 | 0.000 | 0.825 | 235.563 | 0.028 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.169 | 3.267 | 0.014 | 0.169 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b0000000000000053 | 26.246 | 3.180 | n/a | 0.000 | 0.000 | 1.022 | 20.446 | 1.438 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.110 | 3.180 | 0.121 | 0.110 | gw-r/thread-50/journal/page | none observed |

## P3 / grow3 / internal (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1239.585 | 123.598 | n/a | 8.865 | 0.000 | 1.054 | 1101.287 | 0.026 | 0.000 | 0.120 | 0.000 | n/a | n/a | 4.636 | 132.462 | 0.107 | 4.636 |
| p99 | 1239.585 | 123.598 | n/a | 8.865 | 0.000 | 1.054 | 1101.287 | 0.026 | 0.000 | 0.120 | 0.000 | n/a | n/a | 4.636 | 132.462 | 0.107 | 4.636 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b000000000000005a | 1239.585 | 123.598 | n/a | 8.865 | 0.000 | 1.054 | 1101.287 | 0.026 | 0.000 | 0.120 | 0.000 | n/a | n/a | 4.636 | 132.462 | 0.107 | 4.636 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h3 / internal (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 411.471 | 4.744 | n/a | 0.000 | 0.000 | 1.046 | 401.686 | 0.032 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.145 | 4.744 | 0.037 | 0.145 |
| p99 | 994.646 | 101.940 | n/a | 4.240 | 0.000 | 3.740 | 990.126 | 0.168 | 96.621 | 0.153 | 0.000 | n/a | n/a | 2.243 | 106.180 | 0.350 | 2.243 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000072 | 994.646 | 3.351 | n/a | 0.000 | 0.000 | 0.803 | 990.126 | 0.112 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.101 | 3.351 | 0.003 | 0.101 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b0000000000000075 | 815.964 | 101.940 | n/a | 4.240 | 0.000 | 1.046 | 609.730 | 0.019 | 96.621 | 0.124 | 0.000 | n/a | n/a | 2.243 | 106.180 | 0.130 | 2.243 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b000000000000006e | 514.973 | 4.744 | n/a | 0.000 | 0.000 | 0.793 | 508.946 | 0.168 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.203 | 4.744 | 0.009 | 0.203 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b0000000000000073 | 411.471 | 8.031 | n/a | 0.000 | 0.000 | 1.439 | 401.686 | 0.032 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.145 | 8.031 | 0.020 | 0.145 | gw-r/thread-52/journal/page | none observed |
| f57c292d1ffbc30b0000000000000070 | 154.922 | 5.771 | n/a | 0.000 | 0.000 | 1.861 | 146.993 | 0.022 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.151 | 5.771 | 0.037 | 0.151 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b000000000000006b | 13.742 | 4.135 | n/a | 0.000 | 0.000 | 3.740 | 5.672 | 0.031 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.129 | 4.135 | 0.301 | 0.129 | gw-r/thread-48/gateway.admitted-work | none observed |
| f57c292d1ffbc30b000000000000006d | 6.618 | 2.314 | n/a | 0.000 | 0.000 | 0.801 | 3.339 | 0.032 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.087 | 2.314 | 0.350 | 0.087 | gw-r/thread-55/journal/page | none observed |

## P3 / grow10 / internal (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 160.357 | 79.259 | n/a | 3.901 | 0.000 | 1.115 | 53.126 | 0.016 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.712 | 85.106 | 0.484 | 1.712 |
| p99 | 362.518 | 104.956 | n/a | 6.024 | 0.000 | 2.369 | 276.378 | 0.030 | 60.572 | 0.198 | 0.000 | n/a | n/a | 4.105 | 109.600 | 0.637 | 4.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000077 | 362.518 | 79.259 | n/a | 4.037 | 0.000 | 1.088 | 276.378 | 0.020 | 0.000 | 0.198 | 0.000 | n/a | n/a | 1.537 | 83.296 | 0.230 | 1.537 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000078 | 271.489 | 87.733 | n/a | 3.901 | 0.000 | 1.297 | 116.097 | 0.016 | 60.572 | 0.082 | 0.000 | n/a | n/a | 1.791 | 91.635 | 0.338 | 1.791 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b000000000000007c | 226.549 | 104.956 | n/a | 4.643 | 0.000 | 1.917 | 106.085 | 0.030 | 6.495 | 0.083 | 0.000 | n/a | n/a | 2.338 | 109.600 | 0.484 | 2.338 | node-14/thread-2/replica.fetch-feed | none observed |
| f57c292d1ffbc30b000000000000007b | 198.398 | 104.293 | n/a | 4.416 | 0.000 | 0.868 | 85.685 | 0.015 | 0.000 | 0.100 | 0.000 | n/a | n/a | 3.021 | 108.709 | 0.548 | 3.021 | node-14/thread-2/replica.fetch-feed | none observed |
| f57c292d1ffbc30b000000000000007f | 160.357 | 99.202 | n/a | 2.884 | 0.000 | 0.980 | 53.126 | 0.012 | 0.000 | 0.048 | 0.000 | n/a | n/a | 4.105 | 102.086 | 0.637 | 4.105 | node-14/thread-2/replica.fetch-feed | none observed |
| f57c292d1ffbc30b0000000000000079 | 136.921 | 79.082 | n/a | 6.024 | 0.000 | 1.368 | 48.665 | 0.017 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.712 | 85.106 | 0.622 | 1.712 | node-14/thread-2/replica.fetch-feed | none observed |
| f57c292d1ffbc30b000000000000007e | 5.930 | 2.377 | n/a | 0.000 | 0.000 | 2.369 | 1.089 | 0.013 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.067 | 2.377 | 0.401 | 0.067 | node-14/thread-2/socket.wait-first-byte | none observed |
| f57c292d1ffbc30b0000000000000076 | 5.477 | 2.432 | n/a | 0.000 | 0.000 | 1.115 | 1.811 | 0.018 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.076 | 2.432 | 0.444 | 0.076 | node-14/thread-2/replica.fetch-feed | none observed |
| f57c292d1ffbc30b000000000000007a | 5.289 | 3.263 | n/a | 0.000 | 0.000 | 0.906 | 1.023 | 0.012 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.070 | 3.263 | 0.617 | 0.070 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 559.555 | 2.806 | n/a | 0.000 | 0.000 | 2.796 | 555.220 | 0.018 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.078 | 2.806 | 0.006 | 0.078 |
| p99 | 970.854 | 4.655 | n/a | 0.000 | 0.000 | 4.391 | 963.993 | 0.198 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.206 | 4.655 | 0.011 | 0.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000089 | 970.854 | 2.294 | n/a | 0.000 | 0.000 | 4.391 | 963.993 | 0.018 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.078 | 2.294 | 0.002 | 0.078 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b000000000000008c | 724.230 | 2.431 | n/a | 0.000 | 0.000 | 2.796 | 718.635 | 0.147 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.076 | 2.431 | 0.003 | 0.076 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000088 | 559.555 | 3.186 | n/a | 0.000 | 0.000 | 0.739 | 555.220 | 0.198 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.134 | 3.186 | 0.006 | 0.134 | gw-r/thread-51/journal/page | none observed |
| f57c292d1ffbc30b000000000000008d | 420.929 | 4.655 | n/a | 0.000 | 0.000 | 0.846 | 415.087 | 0.015 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.206 | 4.655 | 0.011 | 0.206 | gw-r/thread-68/journal/page | none observed |
| f57c292d1ffbc30b000000000000008a | 270.681 | 2.806 | n/a | 0.000 | 0.000 | 3.489 | 264.089 | 0.018 | 0.000 | 0.211 | 0.000 | n/a | n/a | 0.068 | 2.806 | 0.010 | 0.068 | gw-r/thread-70/journal/page | none observed |

## P3 / presweep / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 118.770 | 2.927 | n/a | 0.000 | 0.000 | 0.861 | 106.572 | 0.015 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.157 | 2.927 | 0.016 | 0.157 |
| p99 | 894.248 | 6.198 | n/a | 0.000 | 0.000 | 4.564 | 886.734 | 0.056 | 8.158 | 0.171 | 0.000 | n/a | n/a | 0.293 | 6.198 | 0.032 | 0.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000090 | 894.248 | 6.198 | n/a | 0.000 | 0.000 | 0.916 | 886.734 | 0.015 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.293 | 6.198 | 0.007 | 0.293 | gw-r/thread-48/journal/page | none observed |
| f57c292d1ffbc30b000000000000008e | 580.676 | 2.354 | n/a | 0.000 | 0.000 | 4.564 | 573.472 | 0.019 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.157 | 2.354 | 0.004 | 0.157 | gw-r/thread-55/journal/page | none observed |
| f57c292d1ffbc30b0000000000000092 | 118.770 | 2.927 | n/a | 0.000 | 0.000 | 0.861 | 106.572 | 0.013 | 8.158 | 0.073 | 0.000 | n/a | n/a | 0.165 | 2.927 | 0.025 | 0.165 | gw-r/thread-53/journal/page | none observed |
| f57c292d1ffbc30b0000000000000093 | 103.017 | 3.275 | n/a | 0.000 | 0.000 | 0.754 | 98.775 | 0.014 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.118 | 3.275 | 0.032 | 0.118 | gw-r/thread-70/journal/page | none observed |
| f57c292d1ffbc30b0000000000000094 | 102.599 | 1.616 | n/a | 0.000 | 0.000 | 0.032 | 100.656 | 0.056 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.069 | 1.616 | 0.016 | 0.069 | gw-r/thread-50/journal/page | none observed |

## P3 / sweep / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.852 | 4.856 | n/a | 0.000 | 0.000 | 1.283 | 22.012 | 0.053 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.073 | 4.856 | 0.071 | 0.073 |
| p99 | 68.133 | 6.268 | n/a | 0.000 | 0.000 | 1.369 | 61.308 | 0.071 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.296 | 6.268 | 0.210 | 0.296 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f57c292d1ffbc30b0000000000000097 | 68.133 | 4.856 | n/a | 0.000 | 0.000 | 1.369 | 61.308 | 0.071 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.296 | 4.856 | 0.071 | 0.296 | gw-r/thread-54/journal/page | none observed |
| f57c292d1ffbc30b0000000000000096 | 29.852 | 6.268 | n/a | 0.000 | 0.000 | 1.283 | 22.012 | 0.053 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.073 | 6.268 | 0.210 | 0.073 | gw-r/thread-68/journal/page | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.236 | 0.064 | n/a | 0.000 | 0.000 | 1.544 | 201.387 | 0.045 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.112 | 0.064 | 0.000 | 0.112 |
| p99 | 206.257 | 0.302 | n/a | 0.000 | 0.000 | 3.681 | 202.240 | 15.717 | 0.000 | 0.441 | 0.000 | n/a | n/a | 1.235 | 0.302 | 0.004 | 1.235 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000009 | 206.257 | 0.131 | n/a | 0.000 | 0.000 | 3.681 | 201.794 | 0.034 | 0.000 | 0.201 | 0.000 | n/a | n/a | 0.417 | 0.131 | 0.001 | 0.417 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000000a | 205.459 | 0.090 | n/a | 0.000 | 0.000 | 2.184 | 202.240 | 0.139 | 0.000 | 0.441 | 0.000 | n/a | n/a | 0.365 | 0.090 | 0.000 | 0.365 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee000000000000000d | 204.441 | 0.093 | n/a | 0.000 | 0.000 | 1.203 | 201.640 | 0.045 | 0.000 | 0.226 | 0.000 | n/a | n/a | 1.235 | 0.093 | 0.000 | 1.235 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000010 | 204.054 | 0.063 | n/a | 0.000 | 0.000 | 1.544 | 201.869 | 0.097 | 0.000 | 0.370 | 0.000 | n/a | n/a | 0.112 | 0.063 | 0.000 | 0.112 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee000000000000000b | 203.775 | 0.064 | n/a | 0.000 | 0.000 | 1.588 | 201.739 | 0.036 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.114 | 0.064 | 0.000 | 0.114 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000000f | 203.236 | 0.051 | n/a | 0.000 | 0.000 | 1.384 | 201.387 | 0.019 | 0.000 | 0.288 | 0.000 | n/a | n/a | 0.108 | 0.051 | 0.000 | 0.108 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000000e | 166.901 | 0.049 | n/a | 0.000 | 0.000 | 1.368 | 165.057 | 0.239 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.068 | 0.049 | 0.000 | 0.068 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000011 | 123.830 | 0.064 | n/a | 0.000 | 0.000 | 0.957 | 121.644 | 0.982 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.081 | 0.064 | 0.001 | 0.081 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000008 | 107.055 | 0.131 | n/a | 0.000 | 0.000 | 2.143 | 88.695 | 15.717 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.151 | 0.131 | 0.001 | 0.151 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee000000000000000c | 72.767 | 0.302 | n/a | 0.000 | 0.000 | 1.756 | 70.461 | 0.023 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.086 | 0.302 | 0.004 | 0.086 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.678 | 0.029 | n/a | 0.000 | 0.000 | 0.707 | 200.715 | 0.017 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 |
| p99 | 202.243 | 0.038 | n/a | 0.000 | 0.000 | 0.769 | 201.159 | 0.019 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000013 | 202.243 | 0.038 | n/a | 0.000 | 0.000 | 0.769 | 201.159 | 0.017 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000012 | 201.678 | 0.029 | n/a | 0.000 | 0.000 | 0.707 | 200.715 | 0.019 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.067 | 0.029 | 0.000 | 0.067 | gw-r/thread-70/journal/page | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.360 | 0.041 | n/a | 0.000 | 0.000 | 0.987 | 201.192 | 0.080 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.085 | 0.041 | 0.000 | 0.085 |
| p99 | 206.803 | 0.088 | n/a | 0.000 | 0.000 | 4.975 | 201.655 | 7.802 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.098 | 0.088 | 0.000 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000020 | 206.803 | 0.033 | n/a | 0.000 | 0.000 | 4.953 | 201.458 | 0.043 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000022 | 202.821 | 0.038 | n/a | 0.000 | 0.000 | 0.784 | 201.655 | 0.080 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.085 | 0.038 | 0.000 | 0.085 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000021 | 202.360 | 0.041 | n/a | 0.000 | 0.000 | 0.865 | 201.192 | 0.023 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee000000000000001e | 201.916 | 0.088 | n/a | 0.000 | 0.000 | 0.987 | 192.854 | 7.802 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.088 | 0.088 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000023 | 160.495 | 0.074 | n/a | 0.000 | 0.000 | 4.975 | 147.700 | 7.546 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.098 | 0.074 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.309 | 0.057 | n/a | 0.000 | 0.000 | 1.098 | 201.183 | 0.031 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.111 | 0.057 | 0.000 | 0.111 |
| p99 | 211.082 | 0.117 | n/a | 0.000 | 0.000 | 6.464 | 209.482 | 21.930 | 0.000 | 0.316 | 0.000 | n/a | n/a | 0.176 | 0.117 | 0.002 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000024 | 211.082 | 0.054 | n/a | 0.000 | 0.000 | 1.098 | 209.482 | 0.080 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.134 | 0.054 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000026 | 210.988 | 0.041 | n/a | 0.000 | 0.000 | 6.464 | 204.153 | 0.041 | 0.000 | 0.214 | 0.000 | n/a | n/a | 0.075 | 0.041 | 0.000 | 0.075 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee000000000000002b | 203.913 | 0.057 | n/a | 0.000 | 0.000 | 2.168 | 201.367 | 0.023 | 0.000 | 0.206 | 0.000 | n/a | n/a | 0.091 | 0.057 | 0.000 | 0.091 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000002a | 203.359 | 0.040 | n/a | 0.000 | 0.000 | 0.755 | 202.101 | 0.070 | 0.000 | 0.316 | 0.000 | n/a | n/a | 0.078 | 0.040 | 0.000 | 0.078 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee000000000000002c | 202.948 | 0.066 | n/a | 0.000 | 0.000 | 1.258 | 201.239 | 0.022 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.159 | 0.066 | 0.000 | 0.159 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000027 | 202.309 | 0.042 | n/a | 0.000 | 0.000 | 0.824 | 201.183 | 0.022 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.081 | 0.042 | 0.000 | 0.081 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000025 | 168.317 | 0.103 | n/a | 0.000 | 0.000 | 1.141 | 144.976 | 21.930 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.111 | 0.103 | 0.001 | 0.111 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000028 | 154.543 | 0.077 | n/a | 0.000 | 0.000 | 0.999 | 153.030 | 0.031 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.176 | 0.077 | 0.001 | 0.176 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000029 | 146.899 | 0.081 | n/a | 0.000 | 0.000 | 3.435 | 143.051 | 0.028 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.136 | 0.081 | 0.001 | 0.136 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee000000000000002d | 66.601 | 0.117 | n/a | 0.000 | 0.000 | 0.629 | 58.407 | 7.153 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.151 | 0.117 | 0.002 | 0.151 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.943 | 0.049 | n/a | 0.000 | 0.000 | 1.070 | 201.185 | 0.033 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.090 | 0.049 | 0.000 | 0.090 |
| p99 | 205.554 | 0.162 | n/a | 0.000 | 0.000 | 2.107 | 204.148 | 3.928 | 0.000 | 0.351 | 0.000 | n/a | n/a | 0.311 | 0.162 | 0.001 | 0.311 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000038 | 205.554 | 0.043 | n/a | 0.000 | 0.000 | 1.070 | 204.148 | 0.018 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.087 | 0.043 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000034 | 204.801 | 0.162 | n/a | 0.000 | 0.000 | 2.107 | 201.818 | 0.069 | 0.000 | 0.333 | 0.000 | n/a | n/a | 0.311 | 0.162 | 0.001 | 0.311 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000036 | 204.173 | 0.049 | n/a | 0.000 | 0.000 | 1.240 | 202.285 | 0.100 | 0.000 | 0.351 | 0.000 | n/a | n/a | 0.148 | 0.049 | 0.000 | 0.148 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000002f | 203.518 | 0.052 | n/a | 0.000 | 0.000 | 2.024 | 201.185 | 0.022 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.090 | 0.052 | 0.000 | 0.090 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000030 | 202.961 | 0.046 | n/a | 0.000 | 0.000 | 0.964 | 201.560 | 0.033 | 0.000 | 0.271 | 0.000 | n/a | n/a | 0.086 | 0.046 | 0.000 | 0.086 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000031 | 202.943 | 0.043 | n/a | 0.000 | 0.000 | 0.834 | 201.642 | 0.066 | 0.000 | 0.279 | 0.000 | n/a | n/a | 0.078 | 0.043 | 0.000 | 0.078 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000032 | 202.554 | 0.060 | n/a | 0.000 | 0.000 | 0.995 | 201.172 | 0.027 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.109 | 0.060 | 0.000 | 0.109 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000039 | 202.065 | 0.041 | n/a | 0.000 | 0.000 | 0.811 | 200.983 | 0.021 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.080 | 0.041 | 0.000 | 0.080 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000002e | 95.934 | 0.073 | n/a | 0.000 | 0.000 | 1.127 | 94.421 | 0.048 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.122 | 0.073 | 0.001 | 0.122 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000033 | 60.485 | 0.072 | n/a | 0.000 | 0.000 | 1.286 | 54.732 | 3.928 | 0.000 | 0.282 | 0.000 | n/a | n/a | 0.184 | 0.072 | 0.001 | 0.184 | gw-r/thread-70/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.333 | 0.051 | n/a | 0.000 | 0.000 | 1.027 | 201.083 | 0.020 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.091 | 0.051 | 0.000 | 0.091 |
| p99 | 205.051 | 0.071 | n/a | 0.000 | 0.000 | 4.285 | 201.950 | 0.088 | 0.000 | 0.260 | 0.000 | n/a | n/a | 0.155 | 0.071 | 0.001 | 0.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee000000000000003b | 205.051 | 0.051 | n/a | 0.000 | 0.000 | 3.437 | 201.250 | 0.029 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.115 | 0.051 | 0.000 | 0.115 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee000000000000003e | 204.013 | 0.058 | n/a | 0.000 | 0.000 | 1.501 | 201.950 | 0.088 | 0.000 | 0.260 | 0.000 | n/a | n/a | 0.155 | 0.058 | 0.000 | 0.155 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000043 | 203.195 | 0.054 | n/a | 0.000 | 0.000 | 1.099 | 201.700 | 0.048 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.102 | 0.054 | 0.000 | 0.102 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000041 | 202.727 | 0.040 | n/a | 0.000 | 0.000 | 1.027 | 201.407 | 0.020 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.073 | 0.040 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee000000000000003c | 202.343 | 0.046 | n/a | 0.000 | 0.000 | 1.044 | 201.017 | 0.018 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.073 | 0.046 | 0.000 | 0.073 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000042 | 202.333 | 0.052 | n/a | 0.000 | 0.000 | 0.946 | 201.083 | 0.022 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.085 | 0.052 | 0.000 | 0.085 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee000000000000003d | 202.287 | 0.046 | n/a | 0.000 | 0.000 | 0.884 | 201.099 | 0.023 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.104 | 0.046 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000040 | 202.188 | 0.048 | n/a | 0.000 | 0.000 | 0.925 | 200.982 | 0.017 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.088 | 0.048 | 0.000 | 0.088 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000003a | 120.594 | 0.071 | n/a | 0.000 | 0.000 | 4.285 | 115.979 | 0.019 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.094 | 0.071 | 0.001 | 0.094 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000044 | 88.948 | 0.060 | n/a | 0.000 | 0.000 | 1.016 | 87.686 | 0.018 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.091 | 0.060 | 0.001 | 0.091 | gw-r/thread-55/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.030 | 0.054 | n/a | 0.000 | 0.000 | 1.166 | 201.299 | 0.036 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.106 | 0.054 | 0.000 | 0.106 |
| p99 | 211.420 | 0.091 | n/a | 0.000 | 0.000 | 6.875 | 203.877 | 5.129 | 0.000 | 0.490 | 0.000 | n/a | n/a | 0.179 | 0.091 | 0.001 | 0.179 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000047 | 211.420 | 0.085 | n/a | 0.000 | 0.000 | 6.875 | 203.877 | 0.044 | 0.000 | 0.371 | 0.000 | n/a | n/a | 0.168 | 0.085 | 0.000 | 0.168 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000048 | 203.893 | 0.063 | n/a | 0.000 | 0.000 | 1.710 | 201.680 | 0.034 | 0.000 | 0.282 | 0.000 | n/a | n/a | 0.123 | 0.063 | 0.000 | 0.123 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000046 | 203.566 | 0.057 | n/a | 0.000 | 0.000 | 1.278 | 201.589 | 0.053 | 0.000 | 0.490 | 0.000 | n/a | n/a | 0.099 | 0.057 | 0.000 | 0.099 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000045 | 203.467 | 0.054 | n/a | 0.000 | 0.000 | 1.166 | 201.767 | 0.129 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.121 | 0.054 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee000000000000004b | 203.151 | 0.040 | n/a | 0.000 | 0.000 | 1.510 | 201.299 | 0.036 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.106 | 0.040 | 0.000 | 0.106 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee000000000000004d | 203.030 | 0.043 | n/a | 0.000 | 0.000 | 0.787 | 201.803 | 0.048 | 0.000 | 0.244 | 0.000 | n/a | n/a | 0.105 | 0.043 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee000000000000004e | 202.067 | 0.043 | n/a | 0.000 | 0.000 | 0.801 | 200.978 | 0.017 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.097 | 0.043 | 0.000 | 0.097 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000004a | 138.056 | 0.091 | n/a | 0.000 | 0.000 | 3.006 | 134.710 | 0.022 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.110 | 0.091 | 0.001 | 0.110 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000049 | 105.542 | 0.062 | n/a | 0.000 | 0.000 | 0.760 | 99.292 | 5.129 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.179 | 0.062 | 0.001 | 0.179 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee000000000000004f | 101.070 | 0.053 | n/a | 0.000 | 0.000 | 0.847 | 99.922 | 0.017 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.069 | 0.053 | 0.001 | 0.069 | gw-r/thread-51/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.461 | 0.055 | n/a | 0.000 | 0.000 | 0.978 | 201.058 | 0.024 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.113 | 0.055 | 0.000 | 0.113 |
| p99 | 203.479 | 0.105 | n/a | 0.000 | 0.000 | 1.502 | 201.710 | 6.254 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.170 | 0.105 | 0.001 | 0.170 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000055 | 203.479 | 0.046 | n/a | 0.000 | 0.000 | 1.502 | 201.534 | 0.016 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.150 | 0.046 | 0.000 | 0.150 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000058 | 203.306 | 0.062 | n/a | 0.000 | 0.000 | 1.169 | 201.710 | 0.023 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.138 | 0.062 | 0.000 | 0.138 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000057 | 202.792 | 0.059 | n/a | 0.000 | 0.000 | 1.129 | 201.215 | 0.036 | 0.000 | 0.184 | 0.000 | n/a | n/a | 0.170 | 0.059 | 0.000 | 0.170 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000056 | 202.571 | 0.055 | n/a | 0.000 | 0.000 | 0.869 | 201.313 | 0.068 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.090 | 0.055 | 0.000 | 0.090 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000051 | 202.568 | 0.105 | n/a | 0.000 | 0.000 | 1.104 | 201.043 | 0.023 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.113 | 0.105 | 0.001 | 0.113 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000052 | 202.461 | 0.039 | n/a | 0.000 | 0.000 | 0.978 | 201.202 | 0.019 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.074 | 0.039 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000053 | 202.241 | 0.050 | n/a | 0.000 | 0.000 | 0.873 | 201.019 | 0.025 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.118 | 0.050 | 0.000 | 0.118 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000050 | 202.091 | 0.035 | n/a | 0.000 | 0.000 | 0.768 | 201.058 | 0.019 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.075 | 0.035 | 0.000 | 0.075 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000054 | 132.115 | 0.069 | n/a | 0.000 | 0.000 | 1.090 | 124.725 | 6.061 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.088 | 0.069 | 0.001 | 0.088 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000005a | 78.536 | 0.089 | n/a | 0.000 | 0.000 | 0.848 | 77.351 | 0.024 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.121 | 0.089 | 0.001 | 0.121 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000059 | 68.754 | 0.052 | n/a | 0.000 | 0.000 | 0.940 | 61.215 | 6.254 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.067 | 0.052 | 0.001 | 0.067 | gw-r/thread-51/journal/page | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.038 | 0.048 | n/a | 0.000 | 0.000 | 0.973 | 200.946 | 0.030 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.084 | 0.048 | 0.000 | 0.084 |
| p99 | 203.629 | 0.108 | n/a | 0.000 | 0.000 | 5.456 | 202.014 | 6.346 | 0.000 | 3.412 | 0.000 | n/a | n/a | 0.156 | 0.108 | 0.001 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000066 | 203.629 | 0.040 | n/a | 0.000 | 0.000 | 1.236 | 202.014 | 0.062 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000068 | 202.999 | 0.051 | n/a | 0.000 | 0.000 | 0.973 | 201.632 | 0.030 | 0.000 | 0.229 | 0.000 | n/a | n/a | 0.084 | 0.051 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000006c | 202.687 | 0.055 | n/a | 0.000 | 0.000 | 1.084 | 201.219 | 0.034 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.133 | 0.055 | 0.000 | 0.133 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000067 | 202.466 | 0.047 | n/a | 0.000 | 0.000 | 1.062 | 201.088 | 0.029 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.082 | 0.047 | 0.000 | 0.082 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000063 | 202.290 | 0.042 | n/a | 0.000 | 0.000 | 1.056 | 200.938 | 0.018 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee000000000000006a | 202.050 | 0.048 | n/a | 0.000 | 0.000 | 0.866 | 200.876 | 0.017 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.119 | 0.048 | 0.000 | 0.119 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000061 | 202.038 | 0.036 | n/a | 0.000 | 0.000 | 0.759 | 200.946 | 0.027 | 0.000 | 0.163 | 0.000 | n/a | n/a | 0.106 | 0.036 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000065 | 202.027 | 0.036 | n/a | 0.000 | 0.000 | 0.703 | 201.010 | 0.026 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.076 | 0.036 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000062 | 202.009 | 0.038 | n/a | 0.000 | 0.000 | 0.777 | 200.955 | 0.036 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.073 | 0.038 | 0.000 | 0.073 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000006b | 177.748 | 0.056 | n/a | 0.000 | 0.000 | 0.822 | 169.867 | 3.513 | 0.000 | 3.412 | 0.000 | n/a | n/a | 0.079 | 0.056 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee000000000000006d | 154.302 | 0.108 | n/a | 0.000 | 0.000 | 1.192 | 147.006 | 5.360 | 0.000 | 0.480 | 0.000 | n/a | n/a | 0.156 | 0.108 | 0.001 | 0.156 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000064 | 135.153 | 0.059 | n/a | 0.000 | 0.000 | 5.456 | 129.412 | 0.023 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.084 | 0.059 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000069 | 60.330 | 0.074 | n/a | 0.000 | 0.000 | 0.913 | 52.809 | 6.346 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.104 | 0.074 | 0.001 | 0.104 | gw-r/thread-53/journal/page | none observed |

## P3 / grow3 / read (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.121 | 0.045 | n/a | 0.000 | 0.000 | 0.863 | 200.706 | 0.018 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.111 | 0.045 | 0.000 | 0.111 |
| p99 | 432.831 | 0.581 | n/a | 0.000 | 0.000 | 1.173 | 201.381 | 270.906 | 0.000 | 0.215 | 0.000 | n/a | n/a | 0.133 | 0.581 | 0.001 | 0.133 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000073 | 432.831 | 0.581 | n/a | 0.000 | 0.000 | 1.173 | 159.839 | 270.906 | 0.000 | 0.215 | 0.000 | n/a | n/a | 0.117 | 0.581 | 0.001 | 0.117 | gw-r/thread-68/gateway.admission-wait | none observed |
| fbe3deedcb1d5fee0000000000000072 | 202.726 | 0.051 | n/a | 0.000 | 0.000 | 0.929 | 201.381 | 0.029 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.133 | 0.051 | 0.000 | 0.133 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000071 | 202.121 | 0.043 | n/a | 0.000 | 0.000 | 0.799 | 201.039 | 0.018 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.093 | 0.043 | 0.000 | 0.093 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000070 | 201.875 | 0.045 | n/a | 0.000 | 0.000 | 0.863 | 200.706 | 0.017 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.111 | 0.045 | 0.000 | 0.111 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.187 | 0.060 | n/a | 0.000 | 0.000 | 1.137 | 200.966 | 0.027 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.101 | 0.060 | 0.000 | 0.101 |
| p99 | 205.984 | 0.115 | n/a | 0.000 | 0.000 | 3.161 | 201.661 | 7.675 | 0.000 | 0.647 | 0.000 | n/a | n/a | 0.395 | 0.115 | 0.002 | 0.395 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee000000000000008d | 205.984 | 0.115 | n/a | 0.000 | 0.000 | 3.161 | 201.591 | 0.075 | 0.000 | 0.647 | 0.000 | n/a | n/a | 0.395 | 0.115 | 0.001 | 0.395 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee000000000000008a | 203.534 | 0.064 | n/a | 0.000 | 0.000 | 1.630 | 201.416 | 0.056 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.166 | 0.064 | 0.000 | 0.166 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000087 | 203.271 | 0.060 | n/a | 0.000 | 0.000 | 1.350 | 201.512 | 0.028 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.124 | 0.060 | 0.000 | 0.124 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee000000000000008c | 203.141 | 0.051 | n/a | 0.000 | 0.000 | 1.139 | 201.661 | 0.016 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.089 | 0.051 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee000000000000008f | 202.267 | 0.049 | n/a | 0.000 | 0.000 | 0.922 | 201.005 | 0.021 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.095 | 0.049 | 0.000 | 0.095 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000086 | 202.228 | 0.048 | n/a | 0.000 | 0.000 | 1.137 | 200.786 | 0.026 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.114 | 0.048 | 0.000 | 0.114 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000091 | 202.187 | 0.039 | n/a | 0.000 | 0.000 | 0.769 | 201.112 | 0.027 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.078 | 0.039 | 0.000 | 0.078 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee000000000000008b | 202.139 | 0.039 | n/a | 0.000 | 0.000 | 0.831 | 200.966 | 0.025 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.132 | 0.039 | 0.000 | 0.132 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000090 | 185.229 | 0.080 | n/a | 0.000 | 0.000 | 0.947 | 184.027 | 0.027 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.095 | 0.080 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000089 | 145.673 | 0.059 | n/a | 0.000 | 0.000 | 0.692 | 140.583 | 4.114 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.081 | 0.059 | 0.000 | 0.081 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee000000000000008e | 89.693 | 0.080 | n/a | 0.000 | 0.000 | 1.357 | 88.053 | 0.020 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.096 | 0.080 | 0.001 | 0.096 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000083 | 87.076 | 0.103 | n/a | 0.000 | 0.000 | 1.292 | 77.863 | 7.675 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.101 | 0.103 | 0.001 | 0.101 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000088 | 57.300 | 0.087 | n/a | 0.000 | 0.000 | 1.129 | 55.821 | 0.033 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.128 | 0.087 | 0.002 | 0.128 | gw-r/thread-53/journal/page | none observed |

## P3 / grow10 / read (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 141.147 | 0.583 | n/a | 0.000 | 0.000 | 1.229 | 124.273 | 0.031 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.136 | 0.583 | 0.004 | 0.136 |
| p99 | 267.873 | 1.012 | n/a | 0.000 | 0.000 | 3.027 | 201.236 | 244.923 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.708 | 1.012 | 0.008 | 0.708 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee0000000000000093 | 267.873 | 1.012 | n/a | 0.000 | 0.000 | 1.666 | 19.959 | 244.923 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.202 | 1.012 | 0.004 | 0.202 | gw-r/thread-68/gateway.admission-wait | none observed |
| fbe3deedcb1d5fee0000000000000092 | 202.627 | 0.041 | n/a | 0.000 | 0.000 | 1.056 | 201.236 | 0.031 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.080 | 0.041 | 0.000 | 0.080 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000095 | 202.307 | 0.044 | n/a | 0.000 | 0.000 | 0.964 | 201.017 | 0.026 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.116 | 0.044 | 0.000 | 0.116 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee000000000000009b | 148.896 | 0.627 | n/a | 0.000 | 0.000 | 1.903 | 146.048 | 0.026 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.136 | 0.627 | 0.004 | 0.136 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000098 | 141.147 | 0.617 | n/a | 0.000 | 0.000 | 1.493 | 138.666 | 0.026 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.143 | 0.617 | 0.004 | 0.143 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000097 | 126.806 | 0.961 | n/a | 0.000 | 0.000 | 1.222 | 124.273 | 0.028 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.225 | 0.961 | 0.008 | 0.225 | gw-r/thread-55/journal/page | none observed |
| fbe3deedcb1d5fee000000000000009d | 115.979 | 0.583 | n/a | 0.000 | 0.000 | 3.027 | 111.453 | 0.047 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.708 | 0.583 | 0.005 | 0.708 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee000000000000009a | 110.813 | 0.472 | n/a | 0.000 | 0.000 | 1.084 | 108.938 | 0.067 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.102 | 0.472 | 0.004 | 0.102 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee0000000000000096 | 85.581 | 0.473 | n/a | 0.000 | 0.000 | 1.229 | 73.365 | 10.351 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.098 | 0.473 | 0.006 | 0.098 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h10 / read (14 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.908 | 0.041 | n/a | 0.000 | 0.000 | 0.842 | 200.872 | 0.019 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.077 | 0.041 | 0.000 | 0.077 |
| p99 | 204.272 | 0.094 | n/a | 0.000 | 0.000 | 3.923 | 201.399 | 0.130 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.113 | 0.094 | 0.001 | 0.113 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee00000000000000b7 | 204.272 | 0.038 | n/a | 0.000 | 0.000 | 3.180 | 200.854 | 0.015 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.077 | 0.038 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b3 | 202.806 | 0.049 | n/a | 0.000 | 0.000 | 1.099 | 201.395 | 0.021 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.077 | 0.049 | 0.000 | 0.077 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b4 | 202.597 | 0.036 | n/a | 0.000 | 0.000 | 0.842 | 201.399 | 0.037 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.071 | 0.036 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000ad | 202.372 | 0.052 | n/a | 0.000 | 0.000 | 0.967 | 201.091 | 0.015 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.113 | 0.052 | 0.000 | 0.113 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b5 | 202.361 | 0.094 | n/a | 0.000 | 0.000 | 0.951 | 201.069 | 0.017 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.087 | 0.094 | 0.000 | 0.087 | gw-r/thread-68/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000ae | 202.344 | 0.041 | n/a | 0.000 | 0.000 | 0.778 | 201.251 | 0.031 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000ac | 202.221 | 0.035 | n/a | 0.000 | 0.000 | 0.736 | 201.189 | 0.021 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b1 | 201.908 | 0.039 | n/a | 0.000 | 0.000 | 0.776 | 200.872 | 0.024 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000a9 | 201.884 | 0.038 | n/a | 0.000 | 0.000 | 0.721 | 200.901 | 0.019 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.078 | 0.038 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000aa | 201.804 | 0.036 | n/a | 0.000 | 0.000 | 0.744 | 200.816 | 0.017 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.066 | 0.036 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000af | 201.798 | 0.041 | n/a | 0.000 | 0.000 | 0.725 | 200.835 | 0.016 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.073 | 0.041 | 0.000 | 0.073 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000ab | 110.385 | 0.061 | n/a | 0.000 | 0.000 | 0.995 | 109.179 | 0.018 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.081 | 0.061 | 0.001 | 0.081 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b0 | 78.146 | 0.047 | n/a | 0.000 | 0.000 | 3.923 | 73.853 | 0.130 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.066 | 0.047 | 0.001 | 0.066 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b6 | 52.205 | 0.058 | n/a | 0.000 | 0.000 | 1.000 | 50.907 | 0.029 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.095 | 0.058 | 0.001 | 0.095 | gw-r/thread-50/journal/page | none observed |

## P3 / presweep / read (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.134 | 0.052 | n/a | 0.000 | 0.000 | 1.069 | 200.912 | 0.112 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.106 | 0.052 | 0.000 | 0.106 |
| p99 | 203.636 | 0.113 | n/a | 0.000 | 0.000 | 4.004 | 201.394 | 14.235 | 0.000 | 0.264 | 0.000 | n/a | n/a | 0.210 | 0.113 | 0.001 | 0.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fbe3deedcb1d5fee00000000000000b9 | 203.636 | 0.045 | n/a | 0.000 | 0.000 | 2.241 | 201.047 | 0.030 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.102 | 0.045 | 0.000 | 0.102 | gw-r/thread-51/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000bc | 203.330 | 0.052 | n/a | 0.000 | 0.000 | 1.957 | 200.993 | 0.038 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.106 | 0.052 | 0.000 | 0.106 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000bf | 202.955 | 0.054 | n/a | 0.000 | 0.000 | 1.069 | 201.394 | 0.033 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.210 | 0.054 | 0.000 | 0.210 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000ba | 202.699 | 0.052 | n/a | 0.000 | 0.000 | 0.934 | 201.242 | 0.112 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.162 | 0.052 | 0.000 | 0.162 | gw-r/thread-48/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000bd | 202.257 | 0.041 | n/a | 0.000 | 0.000 | 1.096 | 200.912 | 0.016 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.072 | 0.041 | 0.000 | 0.072 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000be | 202.134 | 0.049 | n/a | 0.000 | 0.000 | 0.913 | 200.927 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.116 | 0.049 | 0.000 | 0.116 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000b8 | 189.166 | 0.084 | n/a | 0.000 | 0.000 | 1.331 | 185.702 | 1.875 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.135 | 0.084 | 0.000 | 0.135 | gw-r/thread-54/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000bb | 126.256 | 0.049 | n/a | 0.000 | 0.000 | 4.004 | 117.838 | 4.256 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.066 | 0.049 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000c1 | 107.258 | 0.113 | n/a | 0.000 | 0.000 | 0.884 | 91.614 | 14.235 | 0.000 | 0.264 | 0.000 | n/a | n/a | 0.147 | 0.113 | 0.001 | 0.147 | gw-r/thread-52/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000c3 | 100.176 | 0.046 | n/a | 0.000 | 0.000 | 0.819 | 96.261 | 2.918 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.085 | 0.046 | 0.000 | 0.085 | gw-r/thread-70/journal/page | none observed |
| fbe3deedcb1d5fee00000000000000c2 | 98.125 | 0.056 | n/a | 0.000 | 0.000 | 0.829 | 95.309 | 1.823 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.082 | 0.056 | 0.001 | 0.082 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

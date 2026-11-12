# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (164.027 ms, trace `41a7329980c75bb700000000000005b6`); `node-14/thread-0/client.persist-and-resolve` (138.653 ms, trace `41a7329980c75bb70000000000000b5e`); `node-14/thread-0/client.persist-and-resolve` (132.794 ms, trace `41a7329980c75bb70000000000000b58`); `node-14/thread-0/driver.execute` (141.382 ms, trace `41a7329980c75bb70000000000000803`); `node-14/thread-0/client.persist-and-resolve` (122.632 ms, trace `41a7329980c75bb70000000000000b52`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-smoke-c`; source `5326f5962e7d48e75aad8cebe985aafb9b53dd46`; subjects 1000; tracing full.

Commit coverage: 75/75 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 90/90. Raw trace bytes: 1941369.

Units: ms; TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node wall time excluding observed waits/GC, not on-CPU time. Driver queue is separate; timer drift is a bounded estimate shown only as an overlay. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.897 | 11.265 | 0.000 | 0.000 | 0.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.018 | 11.637 | 0.280 | 0.018 |
| p99 | 57.467 | 57.406 | 0.000 | 0.000 | 0.721 | 1.227 | 2.661 | 0.000 | 0.000 | 0.035 | 26.479 | 0.000 | 0.000 | 0.133 | 57.449 | 1.000 | 0.133 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb7000000000000049f | 57.467 | 57.449 | 1.000 | 0.018 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000489 | 41.503 | 11.637 | 0.280 | 0.133 | gw-w/thread-48/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000004ae | 31.897 | 4.260 | 0.134 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000004c4 | 23.729 | 23.712 | 0.999 | 0.018 | node-14/thread-0/driver.execute |

## P2 / baseline / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.883 | 25.795 | 0.000 | 0.000 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.024 | 25.855 | 0.999 | 0.024 |
| p99 | 36.848 | 36.766 | 0.000 | 0.000 | 0.476 | 1.125 | 1.133 | 0.000 | 0.000 | 0.018 | 11.120 | 0.000 | 0.000 | 0.028 | 36.824 | 0.999 | 0.028 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb700000000000004f8 | 36.848 | 36.824 | 0.999 | 0.024 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000004e9 | 25.883 | 25.855 | 0.999 | 0.028 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000004d3 | 17.329 | 3.914 | 0.226 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.899 | 5.958 | 0.000 | 0.000 | 0.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 6.007 | 0.326 | 0.016 |
| p99 | 36.696 | 36.653 | 0.000 | 0.924 | 0.809 | 1.828 | 2.540 | 0.000 | 0.000 | 0.022 | 16.283 | 0.000 | 0.000 | 0.028 | 36.679 | 1.000 | 0.028 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb7000000000000054a | 36.696 | 36.679 | 1.000 | 0.016 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000533 | 26.628 | 26.605 | 0.999 | 0.023 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000004fd | 23.899 | 4.323 | 0.181 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000519 | 18.423 | 6.007 | 0.326 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.344 | 8.344 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.014 | 8.923 | 0.195 | 0.014 |
| p99 | 50.711 | 50.668 | 0.000 | 0.000 | 0.792 | 1.190 | 10.766 | 0.000 | 0.000 | 0.033 | 24.924 | 0.000 | 0.000 | 0.026 | 50.696 | 1.000 | 0.026 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000585 | 50.711 | 50.696 | 1.000 | 0.015 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000551 | 45.861 | 8.923 | 0.195 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb7000000000000059c | 43.344 | 43.329 | 1.000 | 0.014 | node-14/thread-0/driver.execute |
| 41a7329980c75bb7000000000000056f | 19.412 | 2.134 | 0.110 | 0.010 | gw-w/thread-52/peer.transact-await (includes order/network/storage) |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.835 | 4.148 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.024 | 4.906 | 0.100 | 0.024 |
| p99 | 214.750 | 120.553 | 0.000 | 3.265 | 0.759 | 0.931 | 45.728 | 0.000 | 0.000 | 0.025 | 164.027 | 0.000 | 0.000 | 0.067 | 123.845 | 1.000 | 0.067 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb700000000000005b6 | 214.750 | 4.015 | 0.019 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000005ee | 123.870 | 123.845 | 1.000 | 0.025 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000005d4 | 48.835 | 4.906 | 0.100 | 0.067 | gw-w/thread-51/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000005ab | 39.527 | 39.514 | 1.000 | 0.013 | node-14/thread-0/driver.execute |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.927 | 8.374 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 8.434 | 0.152 | 0.016 |
| p99 | 111.707 | 111.659 | 0.000 | 0.000 | 0.164 | 1.759 | 18.526 | 0.000 | 0.000 | 0.048 | 72.134 | 0.000 | 0.000 | 0.026 | 111.691 | 1.000 | 0.026 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000640 | 111.707 | 111.691 | 1.000 | 0.016 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000613 | 108.962 | 108.949 | 1.000 | 0.013 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000005fd | 100.927 | 8.434 | 0.084 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000626 | 43.956 | 6.676 | 0.152 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.931 | 3.480 | 0.000 | 0.000 | 0.576 | 0.771 | 2.705 | 0.000 | 0.000 | 0.015 | 14.629 | 0.000 | 0.000 | 0.015 | 4.096 | 0.165 | 0.015 |
| p99 | 58.072 | 58.038 | 0.000 | 0.000 | 0.616 | 1.759 | 10.510 | 0.000 | 0.000 | 0.029 | 42.027 | 0.000 | 0.000 | 0.024 | 58.059 | 1.000 | 0.024 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb700000000000006a8 | 58.072 | 58.059 | 1.000 | 0.013 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000692 | 57.356 | 3.482 | 0.061 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000665 | 55.931 | 55.917 | 1.000 | 0.015 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000678 | 25.464 | 4.096 | 0.161 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb7000000000000064f | 21.802 | 3.596 | 0.165 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 56.389 | 56.333 | 0.000 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 56.370 | 1.000 | 0.016 |
| p99 | 70.853 | 70.814 | 0.000 | 0.000 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.019 | 70.837 | 1.000 | 0.019 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb700000000000006ce | 70.853 | 70.837 | 1.000 | 0.016 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000006b7 | 56.389 | 56.370 | 1.000 | 0.019 | node-14/thread-0/driver.execute |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.080 | 4.476 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.015 | 5.165 | 0.162 | 0.015 |
| p99 | 78.882 | 78.843 | 0.000 | 0.000 | 0.689 | 1.867 | 5.412 | 0.000 | 0.000 | 0.039 | 22.579 | 0.000 | 0.000 | 0.032 | 78.867 | 1.000 | 0.032 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb700000000000006dd | 78.882 | 78.867 | 1.000 | 0.015 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000718 | 66.971 | 66.940 | 1.000 | 0.032 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000702 | 35.080 | 5.165 | 0.147 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000006ec | 28.852 | 4.670 | 0.162 | 0.014 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |

## P2 / p4mix / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.310 | 23.742 | 0.000 | 0.000 | 0.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.027 | 23.767 | 0.999 | 0.027 |
| p99 | 45.252 | 35.219 | 0.000 | 0.000 | 0.194 | 5.219 | 17.773 | 0.092 | 0.000 | 0.364 | 11.733 | 0.000 | 0.000 | 0.037 | 35.282 | 0.999 | 0.037 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb7000000000000071f | 45.252 | 10.034 | 0.222 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000753 | 35.310 | 35.282 | 0.999 | 0.027 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000762 | 23.780 | 23.767 | 0.999 | 0.013 | node-14/thread-0/driver.execute |

## P2 / outside-phases / commit (15 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.474 | 7.282 | 0.000 | 0.000 | 0.239 | 0.967 | 1.155 | 0.000 | 0.000 | 0.016 | 10.217 | 0.000 | 0.000 | 0.017 | 9.994 | 0.299 | 0.017 |
| p99 | 92.300 | 92.198 | 0.000 | 1.722 | 16.478 | 3.214 | 9.719 | 0.000 | 0.000 | 0.032 | 27.697 | 0.000 | 0.000 | 0.030 | 92.270 | 1.000 | 0.030 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb7000000000000078b | 92.300 | 92.270 | 1.000 | 0.030 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000a6b | 78.366 | 78.346 | 1.000 | 0.021 | node-14/thread-0/driver.execute |
| 41a7329980c75bb7000000000000084c | 53.630 | 53.614 | 1.000 | 0.017 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000775 | 43.426 | 9.994 | 0.230 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000840 | 38.816 | 6.334 | 0.163 | 0.016 | gw-w/thread-52/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb7000000000000087b | 36.097 | 3.706 | 0.103 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000a30 | 35.558 | 7.663 | 0.216 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000898 | 33.474 | 7.611 | 0.227 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000a46 | 30.994 | 19.053 | 0.615 | 0.008 | node-14/thread-0/driver.queue (scheduler/subject/admission) |
| 41a7329980c75bb70000000000000865 | 27.196 | 3.868 | 0.142 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000a0b | 26.496 | 26.475 | 0.999 | 0.021 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000008b6 | 25.426 | 6.286 | 0.247 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000891 | 24.960 | 24.946 | 0.999 | 0.014 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000a12 | 17.861 | 5.334 | 0.299 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000a5c | 14.178 | 14.164 | 0.999 | 0.014 | node-14/thread-0/driver.execute |

## P2 / p4h1 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.109 | 41.034 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 41.087 | 0.999 | 0.017 |
| p99 | 124.448 | 124.406 | 0.000 | 0.000 | 0.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.022 | 124.430 | 1.000 | 0.022 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb7000000000000079e | 124.448 | 124.430 | 1.000 | 0.017 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000007ad | 41.109 | 41.087 | 0.999 | 0.022 | node-14/thread-0/driver.execute |

## P2 / grow3 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.967 | 11.302 | 0.000 | 0.000 | 0.142 | 0.861 | 1.181 | 0.000 | 0.000 | 0.019 | 28.175 | 0.000 | 0.000 | 0.024 | 44.944 | 0.574 | 0.024 |
| p99 | 142.836 | 141.701 | 0.000 | 7.919 | 28.171 | 6.840 | 4.696 | 0.000 | 0.000 | 0.041 | 33.006 | 0.000 | 0.000 | 0.030 | 142.806 | 1.000 | 0.030 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000803 | 142.836 | 142.806 | 1.000 | 0.030 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000816 | 82.534 | 47.393 | 0.574 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000007c0 | 48.967 | 7.012 | 0.143 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000007d6 | 44.966 | 44.944 | 1.000 | 0.021 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000007dd | 35.503 | 4.288 | 0.121 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |

## P2/P4 / read-your-own-write / read (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 165.586 | 163.261 | 0.000 | 2.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.012 | 165.574 | 1.000 | 0.012 |
| p99 | 165.586 | 163.261 | 0.000 | 2.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.012 | 165.574 | 1.000 | 0.012 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000835 | 165.586 | 165.574 | 1.000 | 0.012 | node-14/thread-0/driver.ryow-capture |

## P2 / p4h3 / commit (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.179 | 4.509 | 0.000 | 0.000 | 0.057 | 0.632 | 1.481 | 0.000 | 0.000 | 0.014 | 12.091 | 0.000 | 0.000 | 0.019 | 4.931 | 0.197 | 0.019 |
| p99 | 71.297 | 58.231 | 0.000 | 1.547 | 0.801 | 2.470 | 8.053 | 0.000 | 0.000 | 0.063 | 56.910 | 0.000 | 0.000 | 0.031 | 59.805 | 1.000 | 0.031 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb700000000000008d0 | 71.297 | 4.931 | 0.069 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000008dc | 61.561 | 3.001 | 0.049 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000952 | 59.820 | 59.805 | 1.000 | 0.015 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000937 | 52.831 | 52.811 | 1.000 | 0.020 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000912 | 47.179 | 47.159 | 1.000 | 0.020 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000921 | 31.628 | 7.734 | 0.245 | 0.019 | gw-w/thread-45/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000946 | 24.127 | 4.745 | 0.197 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb700000000000008f2 | 17.318 | 3.083 | 0.178 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.069 | 45.524 | 0.000 | 0.000 | 0.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.020 | 48.049 | 1.000 | 0.020 |
| p99 | 53.913 | 53.863 | 0.000 | 2.508 | 0.997 | 1.081 | 2.229 | 0.000 | 0.000 | 0.025 | 11.935 | 0.000 | 0.000 | 0.022 | 53.895 | 1.000 | 0.022 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000987 | 53.913 | 53.895 | 1.000 | 0.018 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000009d8 | 48.069 | 48.049 | 1.000 | 0.020 | node-14/thread-0/driver.execute |
| 41a7329980c75bb700000000000009ae | 20.508 | 5.215 | 0.254 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) |

## P2 / p4h10 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.056 | 4.178 | 0.000 | 0.000 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.021 | 4.965 | 0.177 | 0.021 |
| p99 | 49.117 | 49.048 | 0.000 | 0.000 | 0.787 | 1.215 | 5.477 | 0.000 | 0.000 | 0.034 | 19.705 | 0.000 | 0.000 | 0.031 | 49.096 | 1.000 | 0.031 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000ab9 | 49.117 | 49.096 | 1.000 | 0.021 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000a94 | 34.597 | 34.566 | 0.999 | 0.031 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000aa3 | 28.056 | 4.965 | 0.177 | 0.017 | gw-w/thread-52/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000a7e | 24.507 | 3.698 | 0.151 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.162 | 3.878 | 0.000 | 0.000 | 0.503 | 0.400 | 1.130 | 0.000 | 0.000 | 0.017 | 13.193 | 0.000 | 0.000 | 0.019 | 4.688 | 0.205 | 0.019 |
| p99 | 62.283 | 62.247 | 0.000 | 0.000 | 0.911 | 0.941 | 2.291 | 0.000 | 0.000 | 0.028 | 23.935 | 0.000 | 0.000 | 0.033 | 62.269 | 1.000 | 0.033 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000b19 | 62.283 | 62.269 | 1.000 | 0.015 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000ac8 | 48.954 | 48.921 | 0.999 | 0.033 | node-14/thread-0/driver.execute |
| 41a7329980c75bb70000000000000acf | 30.162 | 4.382 | 0.145 | 0.014 | gw-w/thread-52/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000aed | 28.533 | 4.688 | 0.164 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000b03 | 20.237 | 4.142 | 0.205 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) |

## P5 / sweep / commit (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 118.459 | 111.056 | 0.000 | 7.390 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.011 | 118.451 | 1.000 | 0.011 |
| p99 | 153.104 | 145.651 | 0.000 | 7.390 | 0.031 | 7.359 | 3.256 | 0.000 | 0.000 | 0.017 | 31.851 | 0.000 | 0.000 | 0.057 | 153.047 | 1.000 | 0.057 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 41a7329980c75bb70000000000000b5e | 153.104 | 153.047 | 1.000 | 0.057 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b58 | 147.032 | 147.023 | 1.000 | 0.009 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b52 | 136.738 | 136.719 | 1.000 | 0.019 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b4c | 133.287 | 133.269 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b46 | 127.719 | 127.710 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b40 | 118.459 | 118.451 | 1.000 | 0.009 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b3a | 110.580 | 110.569 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b34 | 88.833 | 88.822 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b2e | 66.552 | 66.543 | 1.000 | 0.009 | node-14/thread-0/client.persist-and-resolve |
| 41a7329980c75bb70000000000000b28 | 56.385 | 13.877 | 0.246 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) |
| 41a7329980c75bb70000000000000be6 | 47.894 | 47.872 | 1.000 | 0.022 | node-14/thread-0/driver.execute |

## P1 / warmup / read (210 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.020 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.018 | 0.935 | 0.001 |
| p99 | 286.103 | 46.544 | 0.000 | 6.469 | 286.049 | 1.572 | 1.068 | 0.008 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.011 | 286.101 | 1.000 | 0.011 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd70000000000004acf | 286.638 | 286.635 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000004ad5 | 286.547 | 286.546 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000004bd8 | 286.103 | 286.101 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000004bd2 | 286.049 | 286.048 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000004bcc | 286.004 | 286.002 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000004bc6 | 285.978 | 285.976 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000000445d | 284.084 | 284.073 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000004475 | 283.998 | 283.998 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000000446f | 283.982 | 283.981 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000004469 | 283.964 | 283.963 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 643c006e9270e267000000000000843f | 283.949 | 283.948 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000004463 | 283.945 | 283.944 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 643c006e9270e2670000000000008439 | 283.944 | 283.941 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000008433 | 283.931 | 283.930 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000008427 | 283.920 | 283.917 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000000842d | 283.911 | 283.910 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000039a23 | 283.904 | 283.902 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000039b00 | 282.847 | 282.846 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000039b74 | 282.484 | 282.483 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000039b7a | 282.422 | 282.421 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |

## P1 / L1 / read (91 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.011 | 0.938 | 0.001 |
| p99 | 294.156 | 0.148 | 0.000 | 0.000 | 294.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 294.154 | 1.000 | 0.002 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd700000000000b1270 | 294.156 | 294.154 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000004ea1e | 267.831 | 267.828 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000000793f7 | 0.081 | 0.081 | 0.997 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000005e435 | 0.052 | 0.052 | 0.986 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000005b140 | 0.030 | 0.029 | 0.983 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000009fcaa | 0.030 | 0.029 | 0.967 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000055295 | 0.029 | 0.029 | 0.975 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000000633a9 | 0.027 | 0.026 | 0.982 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000007de3e | 0.026 | 0.026 | 0.981 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000007a15d | 0.024 | 0.023 | 0.949 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000008fb02 | 0.022 | 0.021 | 0.966 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000007fb30 | 0.021 | 0.020 | 0.965 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000086039 | 0.020 | 0.019 | 0.963 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000000549e9 | 0.020 | 0.018 | 0.925 | 0.001 | node-14/thread-3/reader.execute |
| e72fb96f5e0a0fd70000000000095192 | 0.020 | 0.018 | 0.912 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000057680 | 0.018 | 0.017 | 0.944 | 0.001 | node-14/thread-3/reader.execute |
| e72fb96f5e0a0fd7000000000008cb5f | 0.017 | 0.017 | 0.972 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000000aa0bf | 0.017 | 0.016 | 0.915 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000050d21 | 0.017 | 0.017 | 0.971 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000000579dc | 0.017 | 0.016 | 0.929 | 0.001 | node-14/thread-3/replica.pull-at |

## P1 / L4 / read (139 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.010 | 0.931 | 0.001 |
| p99 | 268.861 | 0.188 | 0.000 | 0.000 | 268.835 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.006 | 268.860 | 1.000 | 0.006 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 078e7a2fc3413cd8000000000004706a | 269.224 | 269.222 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000000b6bc1 | 268.861 | 268.860 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| 643c006e9270e267000000000004f823 | 268.844 | 268.841 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000000b6bbb | 268.832 | 268.830 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| 643c006e9270e267000000000004b2c2 | 249.550 | 249.543 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000000b1280 | 249.489 | 249.487 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000042b81 | 248.725 | 248.723 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000065342 | 0.112 | 0.036 | 0.323 | 0.076 | uncovered |
| 078e7a2fc3413cd80000000000080101 | 0.089 | 0.088 | 0.992 | 0.001 | node-14/thread-4/replica.pull-at |
| e72fb96f5e0a0fd700000000000c12ec | 0.058 | 0.058 | 0.992 | 0.000 | node-14/thread-3/replica.pull-at |
| 643c006e9270e2670000000000080e8a | 0.058 | 0.057 | 0.987 | 0.001 | node-14/thread-5/replica.pull-at |
| e72fb96f5e0a0fd700000000000c8038 | 0.052 | 0.052 | 0.995 | 0.000 | node-14/thread-3/replica.pull-at |
| 078e7a2fc3413cd80000000000067322 | 0.045 | 0.043 | 0.967 | 0.001 | node-14/thread-4/replica.pull-at |
| e72fb96f5e0a0fd700000000000bdbd2 | 0.041 | 0.040 | 0.976 | 0.001 | node-14/thread-3/replica.pull-at |
| 078e7a2fc3413cd80000000000077899 | 0.040 | 0.039 | 0.969 | 0.001 | node-14/thread-4/replica.pull-at |
| e72fb96f5e0a0fd700000000000b5b85 | 0.039 | 0.038 | 0.975 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000000ec0b4 | 0.038 | 0.037 | 0.968 | 0.001 | node-14/thread-3/replica.pull-at |
| 078e7a2fc3413cd8000000000006dcb3 | 0.038 | 0.037 | 0.962 | 0.001 | node-14/thread-4/replica.pull-at |
| 643c006e9270e2670000000000061184 | 0.036 | 0.035 | 0.966 | 0.001 | node-14/thread-5/replica.pull-at |
| 078e7a2fc3413cd8000000000004a317 | 0.034 | 0.033 | 0.979 | 0.001 | node-14/thread-4/replica.pull-at |

## P1 / L16 / read (230 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.016 | 0.941 | 0.001 |
| p99 | 466.208 | 0.254 | 0.000 | 0.000 | 466.183 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 466.207 | 1.000 | 0.004 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 643c006e9270e26700000000000c31c9 | 466.256 | 466.256 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000c31c3 | 466.227 | 466.226 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000c31bd | 466.208 | 466.207 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000c31b7 | 466.171 | 466.168 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001358d9 | 464.313 | 464.313 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001358cd | 464.311 | 464.310 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001358d3 | 464.295 | 464.294 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001358c7 | 464.224 | 464.223 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001358c1 | 464.172 | 464.170 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afa6b | 463.863 | 463.863 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afa53 | 463.858 | 463.857 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afa65 | 463.857 | 463.856 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afa5f | 463.844 | 463.844 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afa59 | 463.841 | 463.840 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 643c006e9270e26700000000000c31b1 | 463.772 | 463.769 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001358bb | 463.542 | 463.539 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afae5 | 81.956 | 81.956 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afadf | 81.915 | 81.913 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afb28 | 81.603 | 81.603 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000afb22 | 81.595 | 81.594 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |

## P1 / L64 / read (216 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.019 | 0.949 | 0.001 |
| p99 | 348.926 | 0.444 | 0.000 | 0.000 | 348.900 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 348.925 | 1.000 | 0.005 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd700000000001702e4 | 349.019 | 349.017 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001702fc | 348.941 | 348.940 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001702f6 | 348.926 | 348.925 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001702ea | 348.914 | 348.913 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001702f0 | 348.914 | 348.913 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000170302 | 348.826 | 348.825 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| 643c006e9270e26700000000000f8ecd | 348.736 | 348.735 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000f8ec7 | 348.550 | 348.548 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000f8f23 | 348.417 | 348.416 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000f8f2f | 348.417 | 348.416 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e26700000000000f8f29 | 348.410 | 348.409 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000e6bd9 | 337.351 | 337.349 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000e6bd3 | 337.329 | 337.271 | 1.000 | 0.058 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000e6bcd | 337.284 | 337.281 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000e6c16 | 336.523 | 336.522 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000000e6c1c | 336.496 | 336.495 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000181b97 | 293.075 | 293.074 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000181ba9 | 293.069 | 293.068 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000181baf | 293.063 | 293.062 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000181b9d | 293.052 | 293.051 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |

## P1 / L256 / read (205 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.026 | 0.960 | 0.001 |
| p99 | 304.075 | 0.309 | 0.000 | 0.000 | 304.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.012 | 304.075 | 1.000 | 0.012 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 078e7a2fc3413cd8000000000014d349 | 304.304 | 304.301 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000014d3a2 | 304.082 | 304.081 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000014d39c | 304.075 | 304.075 | 1.000 | 0.000 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000014d396 | 304.058 | 304.057 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000014d390 | 304.046 | 304.045 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001dd196 | 303.266 | 303.260 | 1.000 | 0.006 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001dd19c | 303.254 | 303.253 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| 643c006e9270e267000000000016727f | 302.773 | 302.773 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000167279 | 302.757 | 302.756 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000167273 | 302.750 | 302.749 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000016726d | 302.728 | 302.727 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000167267 | 302.713 | 302.706 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001dd26d | 302.131 | 302.130 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001dd25b | 302.129 | 302.128 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001dd267 | 302.124 | 302.123 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000001dd261 | 302.115 | 302.115 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack |
| 643c006e9270e2670000000000167130 | 276.074 | 276.074 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000016712a | 276.023 | 276.022 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000167124 | 275.991 | 275.990 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000016711e | 275.922 | 275.921 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |

## P1 / L1024 / read (300 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.017 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.015 | 0.940 | 0.001 |
| p99 | 0.250 | 0.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 0.246 | 0.990 | 0.005 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 078e7a2fc3413cd80000000000190fe3 | 0.377 | 0.375 | 0.995 | 0.002 | node-14/thread-4/replica.pull-at |
| e72fb96f5e0a0fd7000000000024552d | 0.307 | 0.302 | 0.986 | 0.004 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000001de983 | 0.251 | 0.247 | 0.983 | 0.004 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000023639e | 0.250 | 0.246 | 0.982 | 0.004 | node-14/thread-3/replica.pull-at |
| 078e7a2fc3413cd800000000001788a7 | 0.182 | 0.179 | 0.984 | 0.003 | node-14/thread-4/replica.pull-at |
| 078e7a2fc3413cd8000000000018a152 | 0.178 | 0.173 | 0.974 | 0.005 | node-14/thread-4/replica.pull-at |
| 643c006e9270e267000000000016dace | 0.158 | 0.155 | 0.980 | 0.003 | node-14/thread-5/replica.pull-at |
| e72fb96f5e0a0fd7000000000021675c | 0.154 | 0.151 | 0.981 | 0.003 | node-14/thread-3/replica.pull-at |
| 078e7a2fc3413cd800000000001737c7 | 0.138 | 0.136 | 0.986 | 0.002 | node-14/thread-4/replica.pull-at |
| 078e7a2fc3413cd8000000000015a4d9 | 0.122 | 0.120 | 0.982 | 0.002 | node-14/thread-4/replica.pull-at |
| 643c006e9270e2670000000000198e72 | 0.117 | 0.115 | 0.987 | 0.001 | node-14/thread-5/replica.pull-at |
| 078e7a2fc3413cd800000000001b874b | 0.115 | 0.113 | 0.989 | 0.001 | node-14/thread-4/replica.pull-at |
| 078e7a2fc3413cd8000000000015c810 | 0.114 | 0.114 | 0.996 | 0.000 | node-14/thread-4/replica.pull-at |
| 078e7a2fc3413cd8000000000016a846 | 0.110 | 0.105 | 0.958 | 0.005 | node-14/thread-4/replica.pull-at |
| 078e7a2fc3413cd8000000000016a129 | 0.108 | 0.101 | 0.935 | 0.007 | node-14/thread-4/replica.pull-at |
| 643c006e9270e26700000000001b8386 | 0.103 | 0.101 | 0.981 | 0.002 | node-14/thread-5/replica.pull-at |
| 078e7a2fc3413cd800000000001a881e | 0.102 | 0.101 | 0.993 | 0.001 | node-14/thread-4/replica.pull-at |
| 078e7a2fc3413cd80000000000177944 | 0.100 | 0.099 | 0.990 | 0.001 | node-14/thread-4/replica.pull-at |
| e72fb96f5e0a0fd70000000000220781 | 0.091 | 0.085 | 0.933 | 0.006 | node-14/thread-3/replica.pull-at |
| 643c006e9270e26700000000001b1aa8 | 0.090 | 0.087 | 0.967 | 0.003 | node-14/thread-5/replica.pull-at |

## P1 / recovery / read (213 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.021 | 0.953 | 0.001 |
| p99 | 284.573 | 0.216 | 0.000 | 0.000 | 284.540 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 284.571 | 1.000 | 0.005 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd700000000002941b7 | 284.630 | 284.628 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000002941b1 | 284.586 | 284.584 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000002941ab | 284.573 | 284.571 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd700000000002941a5 | 284.554 | 284.552 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f8ff5 | 284.524 | 284.522 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f8fef | 284.516 | 284.514 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f8fe9 | 284.496 | 284.494 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000029419f | 284.490 | 284.487 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f8fe3 | 284.483 | 284.481 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f8fdd | 284.472 | 284.469 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack |
| 643c006e9270e267000000000021c4dc | 284.395 | 284.395 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000021c4d6 | 284.388 | 284.388 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000021c4d0 | 284.375 | 284.375 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000021c4ca | 284.369 | 284.368 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e267000000000021c4c4 | 284.312 | 284.310 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd70000000000294217 | 283.826 | 283.824 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f3ae1 | 279.191 | 279.190 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f3adb | 279.156 | 279.155 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f3ad5 | 279.117 | 279.115 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000001f3acf | 278.935 | 278.934 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |

## P1 / p4mix / read (144 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.011 | 0.942 | 0.001 |
| p99 | 0.105 | 0.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.104 | 0.992 | 0.002 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd700000000002a6201 | 0.186 | 0.185 | 0.993 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000032b8e8 | 0.105 | 0.104 | 0.991 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002db96a | 0.099 | 0.098 | 0.988 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000033e33a | 0.093 | 0.093 | 0.992 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002ac33b | 0.076 | 0.074 | 0.974 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000031f7f5 | 0.058 | 0.058 | 0.992 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000032b51e | 0.055 | 0.054 | 0.987 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002a7a89 | 0.052 | 0.050 | 0.976 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000311ec5 | 0.043 | 0.043 | 0.989 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000033560e | 0.043 | 0.042 | 0.983 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000030f1d4 | 0.038 | 0.037 | 0.968 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002a42e4 | 0.036 | 0.034 | 0.953 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000311bb9 | 0.034 | 0.034 | 0.986 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003304c9 | 0.030 | 0.029 | 0.975 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000333a84 | 0.028 | 0.027 | 0.982 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002bede2 | 0.026 | 0.025 | 0.944 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002cceb5 | 0.026 | 0.025 | 0.954 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000002e30ac | 0.024 | 0.024 | 0.980 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000033c1e3 | 0.024 | 0.023 | 0.950 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003148b4 | 0.023 | 0.023 | 0.989 | 0.000 | node-14/thread-3/replica.pull-at |

## P1 / p4h1 / read (128 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | 0.007 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.007 | 0.926 | 0.000 |
| p99 | 0.116 | 0.115 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.115 | 0.994 | 0.002 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd70000000000359214 | 0.170 | 0.169 | 0.993 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003c7f7f | 0.116 | 0.115 | 0.987 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000362c7e | 0.078 | 0.078 | 0.994 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000341a38 | 0.078 | 0.077 | 0.997 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000039246f | 0.069 | 0.069 | 0.993 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000354a7f | 0.068 | 0.068 | 0.993 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000037376d | 0.056 | 0.054 | 0.978 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000038dae1 | 0.053 | 0.052 | 0.977 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003b8c4b | 0.047 | 0.045 | 0.964 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000037e3e3 | 0.045 | 0.044 | 0.989 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003cf4e1 | 0.031 | 0.030 | 0.961 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000397e60 | 0.031 | 0.029 | 0.960 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000395ae3 | 0.030 | 0.028 | 0.950 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003bf1c7 | 0.028 | 0.026 | 0.938 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000373939 | 0.026 | 0.022 | 0.876 | 0.003 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003ce735 | 0.025 | 0.024 | 0.960 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000034c2d0 | 0.023 | 0.023 | 0.969 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000382cf4 | 0.023 | 0.022 | 0.979 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003a55bf | 0.023 | 0.021 | 0.925 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003a7955 | 0.022 | 0.021 | 0.967 | 0.001 | node-14/thread-3/replica.pull-at |

## P1 / p4h3 / read (146 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.007 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.006 | 0.923 | 0.001 |
| p99 | 0.050 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.045 | 0.984 | 0.002 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd700000000003e78a0 | 0.118 | 0.116 | 0.984 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000445694 | 0.050 | 0.027 | 0.552 | 0.022 | uncovered |
| e72fb96f5e0a0fd7000000000042f3b7 | 0.047 | 0.045 | 0.974 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000043a7b7 | 0.044 | 0.043 | 0.989 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003f3d17 | 0.036 | 0.035 | 0.966 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000044008b | 0.035 | 0.034 | 0.965 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000044cb92 | 0.034 | 0.033 | 0.978 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000042a3b2 | 0.032 | 0.031 | 0.962 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000042ede0 | 0.030 | 0.029 | 0.959 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000488b79 | 0.029 | 0.028 | 0.950 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003dc2e3 | 0.029 | 0.028 | 0.975 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003f5ba3 | 0.028 | 0.027 | 0.957 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000045fb7f | 0.028 | 0.027 | 0.974 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000403168 | 0.028 | 0.027 | 0.965 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000438a3e | 0.026 | 0.025 | 0.981 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004751f5 | 0.022 | 0.021 | 0.945 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003e0442 | 0.022 | 0.021 | 0.978 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003dec50 | 0.021 | 0.021 | 0.977 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000003e5b36 | 0.021 | 0.020 | 0.943 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000043ec4a | 0.020 | 0.020 | 0.964 | 0.001 | node-14/thread-3/replica.pull-at |

## P1 / p4h10 / read (128 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.010 | 0.937 | 0.001 |
| p99 | 0.062 | 0.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 0.058 | 0.988 | 0.004 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd700000000004ed2fc | 0.102 | 0.098 | 0.959 | 0.004 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000050b469 | 0.062 | 0.058 | 0.937 | 0.004 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004b8cbe | 0.052 | 0.050 | 0.972 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004b0848 | 0.051 | 0.051 | 0.986 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004d569d | 0.050 | 0.049 | 0.975 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000050b2de | 0.046 | 0.046 | 0.989 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000511995 | 0.044 | 0.042 | 0.956 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004ac428 | 0.040 | 0.038 | 0.963 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000052ac29 | 0.039 | 0.039 | 0.988 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004e1d17 | 0.039 | 0.038 | 0.969 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004e9080 | 0.035 | 0.034 | 0.979 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004c5ae0 | 0.031 | 0.030 | 0.961 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004b43a8 | 0.028 | 0.027 | 0.957 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000005173cc | 0.028 | 0.026 | 0.929 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004c1648 | 0.027 | 0.026 | 0.964 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000005310c4 | 0.026 | 0.026 | 0.981 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004ce271 | 0.026 | 0.025 | 0.981 | 0.000 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd7000000000050fc2b | 0.026 | 0.025 | 0.971 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004b282d | 0.025 | 0.024 | 0.971 | 0.001 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd700000000004ed4f5 | 0.025 | 0.024 | 0.970 | 0.001 | node-14/thread-3/replica.pull-at |

## P5 / presweep / read (166 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.063 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.062 | 0.978 | 0.001 |
| p99 | 279.573 | 0.670 | 0.000 | 3.789 | 279.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 279.572 | 1.000 | 0.010 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| 643c006e9270e2670000000000228a71 | 279.591 | 279.590 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000228a6b | 279.573 | 279.572 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000228a65 | 279.534 | 279.532 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000228b21 | 278.968 | 278.967 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack |
| 643c006e9270e2670000000000228b27 | 278.935 | 278.935 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c120 | 276.755 | 276.753 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c1a6 | 276.390 | 276.390 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c19a | 276.373 | 276.372 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c1a0 | 276.373 | 276.372 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c1ac | 276.370 | 276.369 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c194 | 276.370 | 276.369 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000002046f1 | 275.054 | 275.046 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd800000000002046f7 | 274.869 | 274.866 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000204775 | 269.951 | 269.948 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd8000000000020478a | 267.676 | 267.673 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack |
| 078e7a2fc3413cd80000000000204790 | 267.661 | 267.660 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c21b | 236.475 | 236.474 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c215 | 236.397 | 236.395 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c20f | 236.178 | 236.176 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack |
| e72fb96f5e0a0fd7000000000053c2ee | 234.586 | 234.584 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack |

## P5 / sweep / read (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.939 | 0.001 |
| p99 | 0.072 | 0.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.070 | 0.973 | 0.002 |

| slowest trace | wall ms | TypeScript ms | TypeScript share | unexplained ms | largest step |
| --- | ---: | ---: | ---: | ---: | --- |
| e72fb96f5e0a0fd70000000000563cc0 | 0.072 | 0.070 | 0.973 | 0.002 | node-14/thread-3/replica.pull-at |
| e72fb96f5e0a0fd70000000000563ef9 | 0.053 | 0.051 | 0.958 | 0.002 | node-14/thread-3/replica.pull-at |
| 643c006e9270e267000000000024e2dc | 0.042 | 0.040 | 0.971 | 0.001 | node-14/thread-5/replica.pull-at |
| 643c006e9270e267000000000024fae6 | 0.022 | 0.020 | 0.912 | 0.002 | node-14/thread-5/replica.pull-at |
| 078e7a2fc3413cd8000000000022a043 | 0.012 | 0.011 | 0.939 | 0.001 | node-14/thread-4/replica.pull-at |
| e72fb96f5e0a0fd700000000005638f8 | 0.011 | 0.010 | 0.894 | 0.001 | node-14/thread-3/replica.pull-at |
| 643c006e9270e267000000000024ee75 | 0.006 | 0.005 | 0.870 | 0.001 | node-14/thread-5/replica.pull-at |

## Visibility limits

Logical read histograms include every finished read; retained fast reads are a fixed 1/1024 FNV sample, and reads at least 50 ms are retained. Slowest read selection is among the retained sample plus every observed slow read. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

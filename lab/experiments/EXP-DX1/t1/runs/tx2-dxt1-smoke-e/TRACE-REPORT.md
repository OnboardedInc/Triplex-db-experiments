# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (490.102 ms, trace `d639a3119dd7a9610000000000000840`); `node-13/thread-0/driver.execute` (248.216 ms, trace `d639a3119dd7a96100000000000005cd`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (195.085 ms, trace `d639a3119dd7a96100000000000005c1`); `node-13/thread-0/driver.execute` (231.099 ms, trace `d639a3119dd7a9610000000000000829`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (138.732 ms, trace `d639a3119dd7a96100000000000009b6`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-smoke-e`; source `6b20dbdad0e0b137dc58ec37703b16e11f187a9c`; subjects 1000; tracing full.

Commit coverage: 89/89 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 89/89. Raw trace bytes: 2578761.

Units: ms; TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node wall time excluding observed waits/GC, not on-CPU time. Driver queue is separate; timer drift is a bounded estimate shown only as an overlay. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.859 | 10.611 | 0.000 | 0.000 | 0.522 | 1.216 | 1.704 | 0.000 | 0.000 | 0.032 | 12.605 | 0.000 | 0.000 | 0.044 | 11.439 | 0.255 | 0.044 |
| p99 | 62.890 | 62.735 | 0.000 | 0.000 | 0.828 | 1.422 | 13.764 | 0.000 | 0.000 | 0.040 | 17.969 | 0.000 | 0.000 | 0.225 | 62.846 | 0.999 | 0.225 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a961000000000000049f | 62.890 | 62.735 | 0.000 | 0.000 | 0.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.044 | 62.846 | 0.999 | 0.044 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000489 | 44.859 | 10.611 | 0.000 | 0.000 | 0.828 | 1.422 | 13.764 | 0.000 | 0.000 | 0.040 | 17.969 | 0.000 | 0.000 | 0.225 | 11.439 | 0.255 | 0.225 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000004ae | 20.052 | 3.944 | 0.000 | 0.000 | 0.522 | 1.216 | 1.704 | 0.000 | 0.000 | 0.032 | 12.605 | 0.000 | 0.000 | 0.029 | 4.466 | 0.223 | 0.029 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (17 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.619 | 8.024 | 0.000 | 0.000 | 0.529 | 0.809 | 1.094 | 0.000 | 0.000 | 0.013 | 11.303 | 0.000 | 0.000 | 0.020 | 18.088 | 0.457 | 0.020 |
| p99 | 62.358 | 62.290 | 0.000 | 0.000 | 14.835 | 4.563 | 5.667 | 0.000 | 0.000 | 0.044 | 27.333 | 0.000 | 0.000 | 0.096 | 62.326 | 1.000 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a96100000000000007a3 | 62.358 | 62.290 | 0.000 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.033 | 62.326 | 0.999 | 0.033 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000a29 | 56.382 | 56.320 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.020 | 56.362 | 1.000 | 0.020 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000a64 | 52.849 | 52.801 | 0.000 | 0.000 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 52.836 | 1.000 | 0.013 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000007b2 | 45.188 | 45.107 | 0.000 | 0.000 | 0.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.022 | 45.165 | 1.000 | 0.022 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000004c4 | 42.126 | 42.000 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.096 | 42.030 | 0.998 | 0.096 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000936 | 40.473 | 40.406 | 0.000 | 0.000 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.034 | 40.439 | 0.999 | 0.034 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000a73 | 40.381 | 40.344 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 40.368 | 1.000 | 0.013 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000008b9 | 40.215 | 7.429 | 0.000 | 0.000 | 0.998 | 1.303 | 3.086 | 0.000 | 0.000 | 0.044 | 27.333 | 0.000 | 0.000 | 0.021 | 8.427 | 0.210 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000a4e | 39.619 | 3.253 | 0.000 | 0.000 | 14.835 | 1.140 | 1.094 | 0.000 | 0.000 | 0.014 | 19.273 | 0.000 | 0.000 | 0.009 | 18.088 | 0.457 | 0.009 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000008cf | 36.613 | 36.562 | 0.000 | 0.000 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 36.596 | 1.000 | 0.017 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000900 | 36.219 | 3.158 | 0.000 | 0.000 | 0.844 | 4.563 | 1.909 | 0.000 | 0.000 | 0.028 | 25.702 | 0.000 | 0.000 | 0.017 | 4.001 | 0.110 | 0.017 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000a38 | 33.909 | 8.024 | 0.000 | 0.000 | 0.933 | 1.675 | 2.633 | 0.000 | 0.000 | 0.025 | 20.595 | 0.000 | 0.000 | 0.025 | 8.956 | 0.264 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000a13 | 30.081 | 4.116 | 0.000 | 0.000 | 0.856 | 0.848 | 1.167 | 0.000 | 0.000 | 0.014 | 23.061 | 0.000 | 0.000 | 0.017 | 4.973 | 0.165 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000920 | 29.625 | 3.198 | 0.000 | 0.000 | 0.889 | 1.188 | 5.667 | 0.000 | 0.000 | 0.025 | 18.642 | 0.000 | 0.000 | 0.015 | 4.087 | 0.138 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000008d6 | 24.735 | 4.295 | 0.000 | 0.000 | 0.533 | 0.809 | 1.175 | 0.000 | 0.000 | 0.013 | 17.889 | 0.000 | 0.000 | 0.021 | 4.828 | 0.195 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000008f4 | 23.236 | 5.022 | 0.000 | 0.000 | 0.529 | 1.156 | 1.366 | 0.000 | 0.000 | 0.031 | 15.109 | 0.000 | 0.000 | 0.022 | 5.552 | 0.239 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000893 | 20.887 | 3.846 | 0.000 | 0.000 | 1.352 | 1.254 | 3.100 | 0.000 | 0.000 | 0.015 | 11.303 | 0.000 | 0.000 | 0.016 | 5.198 | 0.249 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.792 | 4.788 | 0.000 | 0.000 | 0.234 | 0.962 | 1.656 | 0.000 | 0.000 | 0.016 | 11.340 | 0.000 | 0.000 | 0.021 | 5.911 | 0.231 | 0.021 |
| p99 | 28.571 | 28.490 | 0.000 | 0.000 | 1.124 | 1.228 | 2.419 | 0.000 | 0.000 | 0.034 | 16.667 | 0.000 | 0.000 | 0.033 | 28.538 | 0.999 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000524 | 28.571 | 28.490 | 0.000 | 0.000 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.033 | 28.538 | 0.999 | 0.033 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a961000000000000050e | 25.551 | 4.788 | 0.000 | 0.000 | 1.124 | 1.228 | 1.701 | 0.000 | 0.000 | 0.024 | 16.667 | 0.000 | 0.000 | 0.020 | 5.911 | 0.231 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000004e9 | 23.792 | 23.740 | 0.000 | 0.000 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.021 | 23.771 | 0.999 | 0.021 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000004f8 | 20.196 | 3.447 | 0.000 | 0.000 | 0.611 | 1.209 | 2.419 | 0.000 | 0.000 | 0.034 | 12.442 | 0.000 | 0.000 | 0.033 | 4.058 | 0.201 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000004d3 | 17.361 | 3.134 | 0.000 | 0.000 | 0.234 | 0.962 | 1.656 | 0.000 | 0.000 | 0.016 | 11.340 | 0.000 | 0.000 | 0.019 | 3.368 | 0.194 | 0.019 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.188 | 20.963 | 0.000 | 0.000 | 0.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.022 | 21.003 | 0.999 | 0.022 |
| p99 | 40.068 | 27.149 | 0.000 | 0.000 | 0.403 | 1.549 | 7.097 | 0.000 | 0.000 | 0.024 | 23.447 | 0.000 | 0.000 | 0.062 | 27.174 | 0.999 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000546 | 40.068 | 7.486 | 0.000 | 0.000 | 0.403 | 1.549 | 7.097 | 0.000 | 0.000 | 0.024 | 23.447 | 0.000 | 0.000 | 0.062 | 7.889 | 0.197 | 0.062 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a961000000000000055c | 27.188 | 27.149 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.014 | 27.174 | 0.999 | 0.014 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000533 | 21.025 | 20.963 | 0.000 | 0.000 | 0.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.022 | 21.003 | 0.999 | 0.022 | node-13/thread-0/driver.execute | none observed |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 45.251 | 45.191 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 45.232 | 1.000 | 0.017 |
| p99 | 65.400 | 65.360 | 0.000 | 0.913 | 0.077 | 1.926 | 6.144 | 0.000 | 0.000 | 0.031 | 17.158 | 0.000 | 0.000 | 0.019 | 65.386 | 1.000 | 0.019 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000585 | 65.400 | 65.360 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.014 | 65.386 | 1.000 | 0.014 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000598 | 45.251 | 45.191 | 0.000 | 0.000 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.019 | 45.232 | 1.000 | 0.019 | node-13/thread-0/driver.execute | driver.worker-message 2.494ms |
| d639a3119dd7a961000000000000056f | 29.835 | 3.570 | 0.000 | 0.913 | 0.077 | 1.926 | 6.144 | 0.000 | 0.000 | 0.031 | 17.158 | 0.000 | 0.000 | 0.017 | 4.559 | 0.153 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.225 | 4.788 | 0.000 | 0.000 | 0.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.025 | 5.543 | 0.161 | 0.025 |
| p99 | 248.551 | 248.508 | 0.000 | 4.335 | 0.756 | 1.671 | 46.131 | 0.000 | 0.000 | 0.074 | 195.085 | 0.000 | 0.000 | 0.032 | 248.535 | 1.000 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a96100000000000005cd | 248.551 | 248.508 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.015 | 248.535 | 1.000 | 0.015 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000005c1 | 246.451 | 4.095 | 0.000 | 0.000 | 0.417 | 0.682 | 46.131 | 0.000 | 0.000 | 0.017 | 195.085 | 0.000 | 0.000 | 0.025 | 4.512 | 0.018 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000005f2 | 76.225 | 71.801 | 0.000 | 4.335 | 0.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.032 | 76.193 | 1.000 | 0.032 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000005ab | 34.379 | 4.788 | 0.000 | 0.000 | 0.756 | 1.671 | 6.897 | 0.000 | 0.000 | 0.074 | 20.167 | 0.000 | 0.000 | 0.027 | 5.543 | 0.161 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (6 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.792 | 94.853 | 0.000 | 2.814 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.018 | 96.774 | 1.000 | 0.018 |
| p99 | 152.483 | 145.326 | 0.000 | 14.170 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.033 | 152.467 | 1.000 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000890 | 152.483 | 138.297 | 0.000 | 14.170 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 152.467 | 1.000 | 0.016 | node-13/thread-0/driver.ryow-capture | none observed |
| d639a3119dd7a96100000000000008aa | 145.337 | 145.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.011 | 145.326 | 1.000 | 0.011 | node-13/thread-0/driver.ryow-capture | none observed |
| d639a3119dd7a9610000000000000618 | 134.007 | 130.174 | 0.000 | 3.800 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.033 | 133.974 | 1.000 | 0.033 | node-13/thread-0/driver.ryow-capture | none observed |
| d639a3119dd7a96100000000000009cd | 96.792 | 93.674 | 0.000 | 3.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.018 | 96.774 | 1.000 | 0.018 | node-13/thread-0/driver.ryow-capture | none observed |
| d639a3119dd7a961000000000000069b | 94.908 | 92.073 | 0.000 | 2.814 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.021 | 94.887 | 1.000 | 0.021 | node-13/thread-0/driver.ryow-capture | none observed |
| d639a3119dd7a96100000000000005e5 | 94.873 | 94.853 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.020 | 94.853 | 1.000 | 0.020 | node-13/thread-0/driver.ryow-capture | none observed |

## P2 / L64 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.516 | 6.470 | 0.000 | 0.000 | 0.702 | 0.661 | 1.381 | 0.000 | 0.000 | 0.017 | 25.340 | 0.000 | 0.000 | 0.019 | 7.172 | 0.144 | 0.019 |
| p99 | 119.441 | 80.399 | 0.000 | 0.000 | 0.967 | 1.162 | 12.982 | 0.000 | 0.000 | 0.479 | 98.173 | 0.000 | 0.000 | 0.039 | 80.443 | 1.000 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000605 | 119.441 | 6.470 | 0.000 | 0.000 | 0.702 | 1.076 | 12.982 | 0.000 | 0.000 | 0.018 | 98.173 | 0.000 | 0.000 | 0.021 | 7.172 | 0.060 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a961000000000000062f | 80.462 | 80.399 | 0.000 | 0.000 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.019 | 80.443 | 1.000 | 0.019 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000623 | 79.516 | 4.899 | 0.000 | 0.000 | 0.763 | 1.162 | 8.679 | 0.000 | 0.000 | 0.479 | 63.494 | 0.000 | 0.000 | 0.039 | 5.662 | 0.071 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000662 | 71.498 | 71.459 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 71.481 | 1.000 | 0.017 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a961000000000000064c | 32.029 | 3.648 | 0.000 | 0.000 | 0.967 | 0.661 | 1.381 | 0.000 | 0.000 | 0.017 | 25.340 | 0.000 | 0.000 | 0.015 | 4.615 | 0.144 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.590 | 5.381 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.015 | 6.052 | 0.098 | 0.015 |
| p99 | 64.520 | 54.546 | 0.000 | 0.000 | 0.854 | 2.318 | 12.203 | 0.000 | 0.000 | 0.027 | 52.113 | 0.000 | 0.000 | 0.032 | 54.573 | 1.000 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000688 | 64.520 | 3.503 | 0.000 | 0.000 | 0.854 | 0.709 | 7.310 | 0.000 | 0.000 | 0.016 | 52.113 | 0.000 | 0.000 | 0.015 | 4.357 | 0.068 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000006a6 | 61.487 | 5.381 | 0.000 | 0.000 | 0.671 | 2.318 | 12.203 | 0.000 | 0.000 | 0.027 | 40.855 | 0.000 | 0.000 | 0.032 | 6.052 | 0.098 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000675 | 54.590 | 54.546 | 0.000 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 54.573 | 1.000 | 0.016 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000006bc | 46.094 | 46.056 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 46.081 | 1.000 | 0.013 | node-13/thread-0/driver.execute | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 56.509 | 56.469 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 56.495 | 1.000 | 0.013 |
| p99 | 109.491 | 109.451 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.014 | 109.477 | 1.000 | 0.014 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a96100000000000006cf | 109.491 | 109.451 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.014 | 109.477 | 1.000 | 0.014 | node-13/thread-0/driver.execute | driver.worker-message 1.290ms; driver.worker-message 0.581ms |
| d639a3119dd7a96100000000000006e2 | 56.509 | 56.469 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 56.495 | 1.000 | 0.013 | node-13/thread-0/driver.execute | none observed |

## P2 / recovery / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.993 | 6.651 | 0.000 | 0.000 | 0.048 | 0.651 | 1.479 | 0.000 | 0.000 | 0.015 | 10.566 | 0.000 | 0.000 | 0.019 | 6.699 | 0.161 | 0.019 |
| p99 | 127.463 | 127.422 | 0.000 | 0.000 | 0.874 | 5.062 | 20.135 | 0.124 | 0.000 | 0.260 | 24.551 | 0.000 | 0.000 | 0.020 | 127.447 | 1.000 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a961000000000000070b | 127.463 | 127.422 | 0.000 | 0.000 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 127.447 | 1.000 | 0.017 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000730 | 42.865 | 6.651 | 0.000 | 0.000 | 0.048 | 5.062 | 20.135 | 0.124 | 0.000 | 0.260 | 10.566 | 0.000 | 0.000 | 0.020 | 6.699 | 0.156 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a961000000000000075c | 36.993 | 36.950 | 0.000 | 0.000 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.019 | 36.974 | 0.999 | 0.019 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000006f5 | 32.112 | 5.054 | 0.000 | 0.000 | 0.058 | 0.862 | 1.550 | 0.000 | 0.000 | 0.018 | 24.551 | 0.000 | 0.000 | 0.019 | 5.113 | 0.159 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a961000000000000071a | 24.713 | 3.102 | 0.000 | 0.000 | 0.874 | 0.651 | 1.479 | 0.000 | 0.000 | 0.015 | 18.579 | 0.000 | 0.000 | 0.014 | 3.975 | 0.161 | 0.014 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.013 | 45.393 | 0.000 | 0.000 | 0.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.027 | 45.418 | 0.999 | 0.027 |
| p99 | 61.720 | 47.867 | 0.000 | 0.000 | 0.155 | 0.956 | 10.769 | 0.000 | 0.000 | 0.041 | 35.691 | 0.000 | 0.000 | 0.054 | 47.959 | 1.000 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a961000000000000077f | 61.720 | 14.080 | 0.000 | 0.000 | 0.155 | 0.956 | 10.769 | 0.000 | 0.000 | 0.041 | 35.691 | 0.000 | 0.000 | 0.027 | 14.235 | 0.231 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a961000000000000077a | 48.013 | 47.867 | 0.000 | 0.000 | 0.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.054 | 47.959 | 0.999 | 0.054 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a961000000000000076b | 45.440 | 45.393 | 0.000 | 0.000 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.022 | 45.418 | 1.000 | 0.022 | node-13/thread-0/driver.execute | none observed |

## P4 / p4h1 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.482 | 5.792 | 0.000 | 0.000 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 6.581 | 0.159 | 0.017 |
| p99 | 80.785 | 80.685 | 0.000 | 0.000 | 0.788 | 1.109 | 5.409 | 0.000 | 0.000 | 0.221 | 31.083 | 0.000 | 0.000 | 0.049 | 80.739 | 1.000 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000800 | 80.785 | 80.685 | 0.000 | 0.000 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.046 | 80.739 | 0.999 | 0.046 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000007c5 | 53.243 | 53.181 | 0.000 | 0.000 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 53.227 | 1.000 | 0.017 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a96100000000000007d4 | 41.482 | 5.792 | 0.000 | 0.000 | 0.788 | 1.065 | 2.518 | 0.000 | 0.000 | 0.221 | 31.083 | 0.000 | 0.000 | 0.015 | 6.581 | 0.159 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000007ea | 31.627 | 3.867 | 0.000 | 0.000 | 0.256 | 1.109 | 5.409 | 0.000 | 0.000 | 0.035 | 20.901 | 0.000 | 0.000 | 0.049 | 4.123 | 0.130 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.688 | 6.949 | 0.000 | 1.374 | 0.589 | 0.939 | 1.415 | 0.000 | 0.000 | 0.016 | 16.310 | 0.000 | 0.000 | 0.029 | 8.911 | 0.216 | 0.029 |
| p99 | 557.404 | 232.323 | 0.000 | 2.755 | 1.037 | 13.324 | 6.691 | 0.000 | 38.314 | 0.031 | 490.102 | 0.000 | 0.000 | 0.044 | 232.487 | 1.000 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000840 | 557.404 | 6.949 | 0.000 | 1.374 | 0.589 | 13.324 | 6.691 | 0.000 | 38.314 | 0.031 | 490.102 | 0.000 | 0.000 | 0.029 | 8.911 | 0.016 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000829 | 232.531 | 232.323 | 0.000 | 0.000 | 0.165 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.044 | 232.487 | 1.000 | 0.044 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a961000000000000084c | 69.688 | 68.263 | 0.000 | 1.374 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 69.672 | 1.000 | 0.016 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000813 | 46.225 | 6.449 | 0.000 | 0.000 | 0.871 | 0.939 | 1.415 | 0.000 | 0.000 | 0.021 | 36.500 | 0.000 | 0.000 | 0.029 | 7.320 | 0.158 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000875 | 39.820 | 4.797 | 0.000 | 2.755 | 1.037 | 12.444 | 2.433 | 0.000 | 0.000 | 0.016 | 16.310 | 0.000 | 0.000 | 0.029 | 8.588 | 0.216 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 48.861 | 8.647 | 0.000 | 0.000 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.018 | 15.063 | 0.378 | 0.018 |
| p99 | 164.315 | 164.258 | 0.000 | 5.982 | 1.460 | 2.674 | 5.882 | 0.000 | 0.000 | 0.020 | 61.645 | 0.000 | 0.000 | 0.031 | 164.299 | 1.000 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a961000000000000095f | 164.315 | 164.258 | 0.000 | 0.000 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 164.299 | 1.000 | 0.016 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000941 | 78.217 | 6.519 | 0.000 | 0.000 | 1.460 | 2.674 | 5.882 | 0.000 | 0.000 | 0.020 | 61.645 | 0.000 | 0.000 | 0.018 | 7.979 | 0.102 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000984 | 48.861 | 48.792 | 0.000 | 0.000 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.021 | 48.840 | 1.000 | 0.021 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a961000000000000096e | 39.892 | 8.647 | 0.000 | 5.982 | 0.433 | 1.063 | 0.938 | 0.000 | 0.000 | 0.000 | 22.799 | 0.000 | 0.000 | 0.031 | 15.063 | 0.378 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 41.421 | 38.402 | 0.000 | 1.270 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 40.183 | 0.999 | 0.013 |
| p99 | 188.762 | 41.390 | 0.000 | 1.742 | 0.039 | 23.353 | 2.396 | 0.000 | 19.780 | 0.017 | 138.732 | 0.000 | 0.000 | 0.023 | 41.408 | 1.000 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a96100000000000009b6 | 188.762 | 3.206 | 0.000 | 1.270 | 0.000 | 23.353 | 2.396 | 0.000 | 19.780 | 0.017 | 138.732 | 0.000 | 0.000 | 0.009 | 4.476 | 0.024 | 0.009 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a96100000000000009e4 | 41.421 | 41.390 | 0.000 | 0.000 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 41.408 | 1.000 | 0.013 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000997 | 40.206 | 38.402 | 0.000 | 1.742 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.023 | 40.183 | 0.999 | 0.023 | node-13/thread-0/driver.execute | none observed |

## P4 / p4h10 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.229 | 3.515 | 0.000 | 0.000 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 5.281 | 0.259 | 0.016 |
| p99 | 55.699 | 44.611 | 0.000 | 0.940 | 0.964 | 1.142 | 2.742 | 0.000 | 0.000 | 0.013 | 47.722 | 0.000 | 0.000 | 0.023 | 44.648 | 0.999 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000a86 | 55.699 | 3.515 | 0.000 | 0.000 | 0.964 | 0.720 | 2.742 | 0.000 | 0.000 | 0.013 | 47.722 | 0.000 | 0.000 | 0.022 | 4.479 | 0.080 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000a9c | 44.671 | 44.611 | 0.000 | 0.000 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.023 | 44.648 | 0.999 | 0.023 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000ac1 | 28.229 | 28.193 | 0.000 | 0.000 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 28.213 | 0.999 | 0.016 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000aab | 20.393 | 3.415 | 0.000 | 0.940 | 0.926 | 1.142 | 1.029 | 0.000 | 0.000 | 0.000 | 12.927 | 0.000 | 0.000 | 0.015 | 5.281 | 0.259 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.469 | 7.270 | 0.000 | 0.000 | 0.136 | 0.721 | 0.924 | 0.000 | 0.000 | 0.013 | 13.742 | 0.000 | 0.000 | 0.015 | 7.406 | 0.320 | 0.015 |
| p99 | 36.578 | 36.533 | 0.000 | 0.000 | 1.107 | 0.773 | 1.237 | 0.000 | 0.000 | 0.013 | 18.093 | 0.000 | 0.000 | 0.016 | 36.562 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000b21 | 36.578 | 36.533 | 0.000 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 36.562 | 1.000 | 0.016 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000ae6 | 26.313 | 26.278 | 0.000 | 0.000 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.013 | 26.300 | 0.999 | 0.013 | node-13/thread-0/driver.execute | none observed |
| d639a3119dd7a9610000000000000aed | 24.469 | 3.280 | 0.000 | 0.000 | 1.107 | 0.727 | 1.237 | 0.000 | 0.000 | 0.013 | 18.093 | 0.000 | 0.000 | 0.013 | 4.387 | 0.179 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000ad0 | 23.117 | 7.270 | 0.000 | 0.000 | 0.136 | 0.773 | 1.167 | 0.000 | 0.000 | 0.013 | 13.742 | 0.000 | 0.000 | 0.016 | 7.406 | 0.320 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| d639a3119dd7a9610000000000000b03 | 22.569 | 3.250 | 0.000 | 0.000 | 1.063 | 0.721 | 0.924 | 0.000 | 0.000 | 0.013 | 16.582 | 0.000 | 0.000 | 0.015 | 4.313 | 0.191 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 109.421 | 109.397 | 0.000 | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.015 | 109.403 | 1.000 | 0.015 |
| p99 | 159.312 | 159.253 | 0.000 | 0.000 | 0.027 | 3.061 | 2.747 | 0.000 | 0.000 | 0.014 | 38.478 | 0.000 | 0.000 | 0.062 | 159.256 | 1.000 | 0.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d639a3119dd7a9610000000000000b66 | 159.312 | 159.253 | 0.000 | 0.000 | 0.003 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.055 | 159.256 | 1.000 | 0.055 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b60 | 156.943 | 156.862 | 0.000 | 0.000 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.054 | 156.889 | 1.000 | 0.054 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b5a | 147.905 | 147.891 | 0.000 | 0.000 | 0.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 147.895 | 1.000 | 0.010 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b54 | 137.431 | 137.415 | 0.000 | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 137.422 | 1.000 | 0.010 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b4e | 117.468 | 117.456 | 0.000 | 0.000 | 0.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.008 | 117.460 | 1.000 | 0.008 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b48 | 109.421 | 109.397 | 0.000 | 0.000 | 0.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.018 | 109.403 | 1.000 | 0.018 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b42 | 93.323 | 93.252 | 0.000 | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.062 | 93.260 | 0.999 | 0.062 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b3c | 79.664 | 79.631 | 0.000 | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.025 | 79.638 | 1.000 | 0.025 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b36 | 66.347 | 66.325 | 0.000 | 0.000 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 66.336 | 1.000 | 0.010 | node-13/thread-0/client.persist-and-resolve | driver.worker-message 1.948ms; driver.worker-message 1.027ms |
| d639a3119dd7a9610000000000000b30 | 49.832 | 5.495 | 0.000 | 0.000 | 0.022 | 3.061 | 2.747 | 0.000 | 0.000 | 0.014 | 38.478 | 0.000 | 0.000 | 0.015 | 5.517 | 0.111 | 0.015 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 1.948ms; driver.worker-message 1.027ms |

## P1 / warmup / read (240 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.018 | 0.941 | 0.001 |
| p99 | 268.850 | 45.821 | 0.000 | 7.447 | 267.625 | 2.458 | 4.916 | 0.016 | 0.000 | 0.036 | 0.000 | 0.000 | 0.000 | 0.010 | 268.849 | 1.000 | 0.010 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f7ef30cb8af736f0000000000020e88 | 268.871 | 0.144 | 0.000 | 6.715 | 262.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 268.870 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000020e94 | 268.856 | 0.023 | 0.000 | 6.715 | 262.118 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 268.855 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000020e8e | 268.850 | 0.033 | 0.000 | 6.715 | 262.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 268.849 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000020e82 | 268.829 | 0.163 | 0.000 | 6.715 | 261.949 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 268.827 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000260e2 | 267.819 | 0.150 | 0.000 | 0.000 | 267.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 267.814 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000260e8 | 267.796 | 0.168 | 0.000 | 0.000 | 267.625 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 267.794 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000260ee | 267.720 | 0.129 | 0.000 | 0.000 | 267.589 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 267.718 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000260f4 | 267.693 | 0.026 | 0.000 | 0.000 | 267.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 267.691 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000002614f | 266.571 | 0.034 | 0.000 | 0.000 | 266.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 266.569 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000002619b | 264.718 | 0.024 | 0.000 | 0.000 | 264.693 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 264.717 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b0000000000023190 | 263.729 | 0.017 | 0.000 | 0.000 | 263.711 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 263.728 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000002318a | 263.715 | 0.086 | 0.000 | 0.000 | 263.628 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 263.714 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b0000000000023184 | 263.653 | 0.061 | 0.000 | 0.000 | 263.591 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 263.652 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000002317e | 263.624 | 0.047 | 0.000 | 0.000 | 263.576 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 263.622 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000230dd | 263.198 | 0.158 | 0.000 | 0.000 | 263.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 263.195 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000020ef4 | 259.674 | 0.046 | 0.000 | 0.000 | 259.624 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 259.669 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000000002a | 170.954 | 1.120 | 0.000 | 1.968 | 167.850 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 170.938 | 1.000 | 0.016 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f000000000000003e | 168.465 | 0.847 | 0.000 | 2.753 | 164.856 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.008 | 168.457 | 1.000 | 0.008 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b0000000000000061 | 166.250 | 0.982 | 0.000 | 0.000 | 165.248 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.020 | 166.230 | 1.000 | 0.020 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000000008a | 165.648 | 0.127 | 0.000 | 1.968 | 163.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 165.643 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (63 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.009 | 0.932 | 0.001 |
| p99 | 287.914 | 0.238 | 0.000 | 0.000 | 287.673 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.020 | 287.911 | 1.000 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c00000000000a149b | 287.914 | 0.238 | 0.000 | 0.000 | 287.673 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 287.911 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000a6a5c | 279.445 | 0.131 | 0.000 | 0.000 | 279.312 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 279.442 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000575c1 | 0.092 | 0.072 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.020 | 0.072 | 0.787 | 0.020 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000006d876 | 0.036 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.035 | 0.966 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000005afe6 | 0.033 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.031 | 0.934 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000066daf | 0.030 | 0.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.029 | 0.959 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000a27d1 | 0.028 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.026 | 0.947 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000077b7d | 0.025 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.025 | 0.981 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000005f136 | 0.024 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.023 | 0.969 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000009d224 | 0.023 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.022 | 0.968 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000008e2ce | 0.022 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.021 | 0.978 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000009d611 | 0.021 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.965 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000055645 | 0.017 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 0.986 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000831da | 0.017 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.017 | 0.971 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000008985a | 0.017 | 0.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.016 | 0.971 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000068740 | 0.016 | 0.015 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.015 | 0.953 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000006ef37 | 0.015 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.014 | 0.918 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000007c515 | 0.015 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.014 | 0.951 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000008ebbb | 0.015 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.013 | 0.902 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000008bbcd | 0.014 | 0.013 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.013 | 0.898 | 0.001 | node-13/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (162 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.010 | 0.938 | 0.001 |
| p99 | 114.788 | 0.135 | 0.000 | 0.000 | 114.712 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 114.787 | 1.000 | 0.010 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f7ef30cb8af736f0000000000049788 | 115.246 | 0.284 | 0.000 | 0.000 | 114.951 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 115.236 | 1.000 | 0.010 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000000a6a6c | 114.788 | 0.075 | 0.000 | 0.000 | 114.712 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 114.787 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000004cc71 | 114.006 | 0.106 | 0.000 | 0.000 | 113.897 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 114.004 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000006a17d | 0.136 | 0.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.135 | 0.991 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000aa20e | 0.121 | 0.102 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.019 | 0.102 | 0.841 | 0.019 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000a78de | 0.095 | 0.094 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.094 | 0.990 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000fb58d | 0.091 | 0.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.089 | 0.981 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| 4f7ef30cb8af736f000000000006353a | 0.084 | 0.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.083 | 0.994 | 0.000 | node-13/thread-5/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000a7ffa | 0.074 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.073 | 0.987 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e9894dd9225439b00000000000845ff | 0.072 | 0.072 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.072 | 0.997 | 0.000 | node-13/thread-4/replica.pull-at | none observed |
| 1e9894dd9225439b0000000000056b00 | 0.056 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 0.052 | 0.917 | 0.005 | node-13/thread-4/replica.pull-at | none observed |
| 1e9894dd9225439b00000000000868a0 | 0.049 | 0.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.049 | 0.990 | 0.000 | node-13/thread-4/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000f7433 | 0.048 | 0.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.047 | 0.965 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000d11e8 | 0.048 | 0.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.047 | 0.970 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000000bae16 | 0.047 | 0.046 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.046 | 0.969 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 4f7ef30cb8af736f000000000007bd83 | 0.044 | 0.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.043 | 0.983 | 0.001 | node-13/thread-5/replica.pull-at | none observed |
| 1e9894dd9225439b000000000006c6c1 | 0.043 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.042 | 0.960 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 4f7ef30cb8af736f0000000000085874 | 0.042 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.041 | 0.966 | 0.001 | node-13/thread-5/replica.pull-at | none observed |
| 4f7ef30cb8af736f0000000000075cf3 | 0.039 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.038 | 0.963 | 0.001 | node-13/thread-5/replica.pull-at | none observed |
| 4f7ef30cb8af736f00000000000534c3 | 0.036 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.035 | 0.986 | 0.000 | node-13/thread-5/replica.pull-at | none observed |

## P1 / L16 / read (199 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.033 | 0.956 | 0.001 |
| p99 | 463.310 | 33.103 | 0.000 | 6.249 | 463.260 | 53.005 | 46.149 | 69.318 | 0.000 | 0.076 | 0.000 | 0.000 | 0.000 | 0.010 | 463.304 | 1.000 | 0.010 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e9894dd9225439b000000000009fc6e | 463.833 | 0.064 | 0.000 | 0.000 | 463.768 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 463.831 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000009fc9c | 463.310 | 0.044 | 0.000 | 0.000 | 463.260 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 463.304 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000009fca8 | 463.278 | 0.017 | 0.000 | 0.000 | 463.260 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 463.277 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000009fca2 | 463.272 | 0.019 | 0.000 | 0.000 | 463.252 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 463.271 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f000000000009cc49 | 461.443 | 0.027 | 0.000 | 0.000 | 461.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 461.442 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f000000000009cc43 | 461.415 | 0.133 | 0.000 | 0.000 | 461.279 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 461.412 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f000000000009cc86 | 460.893 | 0.032 | 0.000 | 0.000 | 460.860 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 460.892 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f000000000009cc92 | 460.882 | 0.016 | 0.000 | 0.000 | 460.864 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 460.880 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f000000000009cc8c | 460.873 | 0.016 | 0.000 | 0.000 | 460.856 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 460.872 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000009fc68 | 459.125 | 0.140 | 0.000 | 0.000 | 458.983 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 459.122 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000010cadc | 458.443 | 0.144 | 0.000 | 0.000 | 458.289 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 458.432 | 1.000 | 0.010 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000010cae2 | 458.426 | 0.036 | 0.000 | 0.000 | 458.386 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 458.422 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000010cae8 | 458.401 | 0.125 | 0.000 | 0.000 | 458.274 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 458.399 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000010caee | 458.297 | 0.045 | 0.000 | 0.000 | 458.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 458.295 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000010caf4 | 458.263 | 0.029 | 0.000 | 0.000 | 458.232 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 458.261 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000010cb04 | 457.978 | 0.047 | 0.000 | 0.000 | 457.925 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.006 | 457.972 | 1.000 | 0.006 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000135e1c | 369.509 | 0.343 | 0.000 | 1.269 | 367.894 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 369.506 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000135e3a | 369.459 | 0.023 | 0.000 | 1.269 | 368.167 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 369.458 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000135e34 | 369.444 | 0.024 | 0.000 | 1.269 | 368.149 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 369.442 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000135e2e | 369.440 | 0.037 | 0.000 | 1.269 | 368.132 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 369.438 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |

## P1 / L64 / read (149 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.022 | 0.958 | 0.001 |
| p99 | 329.321 | 0.278 | 0.000 | 3.299 | 327.983 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.011 | 329.318 | 1.000 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f7ef30cb8af736f00000000000cbd11 | 329.339 | 0.211 | 0.000 | 3.299 | 325.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.006 | 329.333 | 1.000 | 0.006 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000000cbd17 | 329.321 | 0.073 | 0.000 | 3.299 | 325.947 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 329.318 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000000cbd1d | 329.292 | 0.031 | 0.000 | 3.299 | 325.960 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 329.290 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000000cbd23 | 329.283 | 0.070 | 0.000 | 3.299 | 325.912 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 329.281 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000000cbd29 | 329.207 | 0.070 | 0.000 | 3.299 | 325.835 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 329.203 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000140a02 | 328.021 | 0.020 | 0.000 | 0.000 | 328.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 328.020 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000001409fc | 327.999 | 0.015 | 0.000 | 0.000 | 327.983 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 327.998 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000001409f6 | 327.985 | 0.016 | 0.000 | 0.000 | 327.969 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 327.984 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000001409f0 | 327.966 | 0.025 | 0.000 | 0.000 | 327.940 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 327.965 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000001409ea | 327.945 | 0.049 | 0.000 | 0.000 | 327.894 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 327.943 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000001409e4 | 327.889 | 0.165 | 0.000 | 0.000 | 327.720 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 327.885 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000cebc6 | 327.815 | 0.388 | 0.000 | 0.000 | 327.425 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 327.813 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000cebc0 | 327.666 | 0.030 | 0.000 | 0.000 | 327.634 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 327.664 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000cebba | 327.660 | 0.173 | 0.000 | 0.000 | 327.483 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 327.656 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000cebd2 | 327.649 | 0.183 | 0.000 | 0.000 | 327.464 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 327.647 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000cebcc | 327.600 | 0.058 | 0.000 | 0.000 | 327.539 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 327.597 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000ee29f | 280.952 | 0.032 | 0.000 | 0.000 | 280.918 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 280.950 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000ee2a5 | 280.951 | 0.019 | 0.000 | 0.000 | 280.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 280.950 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000ee2ab | 280.951 | 0.028 | 0.000 | 0.000 | 280.921 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 280.949 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000000ee299 | 280.946 | 0.142 | 0.000 | 0.000 | 280.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 280.943 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (180 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.022 | 0.958 | 0.001 |
| p99 | 314.016 | 1.111 | 0.000 | 0.000 | 313.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.007 | 314.015 | 1.000 | 0.007 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e9894dd9225439b000000000011e51b | 314.040 | 0.021 | 0.000 | 0.000 | 314.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 314.039 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000011e515 | 314.016 | 0.071 | 0.000 | 0.000 | 313.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 314.015 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000011e50f | 313.844 | 0.246 | 0.000 | 0.000 | 313.596 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 313.841 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e7f7 | 313.519 | 0.082 | 0.000 | 0.000 | 313.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 313.517 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e887 | 313.329 | 0.028 | 0.000 | 0.000 | 313.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 313.328 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e7f1 | 313.320 | 0.211 | 0.000 | 0.000 | 313.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 313.317 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000011e5b2 | 313.305 | 0.019 | 0.000 | 0.000 | 313.285 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 313.304 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e881 | 313.291 | 0.028 | 0.000 | 0.000 | 313.262 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 313.290 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e87b | 313.269 | 0.042 | 0.000 | 0.000 | 313.226 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 313.268 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e875 | 313.227 | 0.101 | 0.000 | 0.000 | 313.123 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 313.225 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b000000000011e5b8 | 313.193 | 0.026 | 0.000 | 0.000 | 313.167 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 313.192 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116df2 | 312.110 | 0.017 | 0.000 | 0.000 | 312.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 312.110 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116dec | 312.098 | 0.050 | 0.000 | 0.000 | 312.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 312.097 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116de6 | 312.024 | 0.109 | 0.000 | 0.000 | 311.913 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 312.022 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116e5d | 311.875 | 0.035 | 0.000 | 0.000 | 311.838 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 311.873 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116e57 | 311.856 | 0.018 | 0.000 | 0.000 | 311.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 311.855 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e8c7 | 271.076 | 0.430 | 0.000 | 0.000 | 270.644 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 271.074 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000018e8c1 | 270.762 | 0.458 | 0.000 | 0.000 | 270.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 270.758 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116e90 | 270.607 | 0.216 | 0.000 | 0.000 | 270.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 270.604 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f0000000000116e96 | 270.546 | 0.030 | 0.000 | 0.000 | 270.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 270.545 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (226 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | 0.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.017 | 0.945 | 0.001 |
| p99 | 0.152 | 0.148 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 0.148 | 0.993 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c00000000001aaf5e | 0.216 | 0.215 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.215 | 0.995 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001a9930 | 0.154 | 0.144 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 0.144 | 0.933 | 0.010 | node-13/thread-3/replica.pull-at | none observed |
| 4f7ef30cb8af736f000000000018a550 | 0.152 | 0.150 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.150 | 0.992 | 0.001 | node-13/thread-5/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001f4743 | 0.151 | 0.148 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.148 | 0.981 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| 4f7ef30cb8af736f000000000015966c | 0.135 | 0.133 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.133 | 0.984 | 0.002 | node-13/thread-5/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001bada4 | 0.135 | 0.130 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 0.130 | 0.967 | 0.004 | node-13/thread-3/replica.pull-at | none observed |
| 1e9894dd9225439b0000000000137baa | 0.129 | 0.126 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.126 | 0.981 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 4f7ef30cb8af736f000000000018e1dc | 0.126 | 0.123 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.123 | 0.979 | 0.003 | node-13/thread-5/replica.pull-at | none observed |
| 1e9894dd9225439b000000000017997b | 0.116 | 0.114 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.114 | 0.977 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001f00d0 | 0.114 | 0.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.111 | 0.974 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000204e4b | 0.101 | 0.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.100 | 0.988 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 4f7ef30cb8af736f0000000000168d4c | 0.101 | 0.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.101 | 0.995 | 0.000 | node-13/thread-5/replica.pull-at | none observed |
| 1e9894dd9225439b000000000015eced | 0.099 | 0.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.097 | 0.975 | 0.002 | node-13/thread-4/replica.pull-at | none observed |
| 1e9894dd9225439b0000000000156881 | 0.099 | 0.098 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.098 | 0.993 | 0.001 | node-13/thread-4/replica.pull-at | none observed |
| 4f7ef30cb8af736f000000000013df48 | 0.092 | 0.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.089 | 0.976 | 0.002 | node-13/thread-5/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001d5e9c | 0.088 | 0.086 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.086 | 0.978 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002003ff | 0.081 | 0.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.079 | 0.985 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e9894dd9225439b0000000000176c3a | 0.079 | 0.076 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.076 | 0.966 | 0.003 | node-13/thread-4/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001b10a0 | 0.077 | 0.075 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.075 | 0.975 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000001fa780 | 0.073 | 0.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.009 | 0.064 | 0.877 | 0.009 | node-13/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (201 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.022 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.955 | 0.001 |
| p99 | 282.037 | 0.311 | 0.000 | 0.000 | 281.681 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 282.035 | 1.000 | 0.005 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c000000000022bc1f | 282.212 | 0.098 | 0.000 | 0.000 | 282.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 282.211 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000022bc19 | 282.118 | 0.048 | 0.000 | 0.000 | 282.069 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 282.117 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000022bc13 | 282.037 | 0.763 | 0.000 | 0.000 | 281.272 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 282.035 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001ae7bb | 281.770 | 0.086 | 0.000 | 0.000 | 281.681 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 281.768 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001ae7b5 | 281.716 | 0.038 | 0.000 | 0.000 | 281.677 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 281.714 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001ae7af | 281.649 | 0.203 | 0.000 | 0.000 | 281.442 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 281.645 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001ae7e5 | 281.609 | 0.038 | 0.000 | 0.000 | 281.570 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 281.607 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001ae7df | 281.602 | 0.054 | 0.000 | 0.000 | 281.546 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 281.600 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000022bc0d | 281.269 | 0.027 | 0.000 | 0.000 | 281.241 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 281.269 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000022bc07 | 281.197 | 0.041 | 0.000 | 0.000 | 281.155 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 281.196 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000022bc01 | 281.073 | 0.185 | 0.000 | 0.000 | 280.886 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 281.071 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001b4d87 | 280.532 | 0.252 | 0.000 | 0.000 | 280.279 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 280.531 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001b4d7b | 280.377 | 0.241 | 0.000 | 0.000 | 280.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 280.375 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001b4d81 | 280.336 | 0.036 | 0.000 | 0.000 | 280.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 280.335 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001b4e5f | 279.958 | 0.119 | 0.000 | 0.000 | 279.839 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 279.958 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001b4e65 | 279.953 | 0.079 | 0.000 | 0.000 | 279.873 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 279.952 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000233208 | 274.417 | 0.015 | 0.000 | 0.000 | 274.401 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 274.416 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c0000000000233202 | 274.403 | 0.021 | 0.000 | 0.000 | 274.382 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 274.402 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000002331fc | 274.345 | 0.097 | 0.000 | 0.000 | 274.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 274.343 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c000000000023324c | 273.833 | 0.013 | 0.000 | 0.000 | 273.819 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 273.832 | 1.000 | 0.000 | node-13/thread-3/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (156 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.012 | 0.939 | 0.001 |
| p99 | 0.205 | 0.149 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 0.149 | 0.994 | 0.010 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c00000000002ae452 | 0.445 | 0.443 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.443 | 0.996 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000298143 | 0.205 | 0.141 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.064 | 0.141 | 0.687 | 0.064 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002d9062 | 0.151 | 0.149 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.149 | 0.992 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002abc2a | 0.125 | 0.115 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.010 | 0.115 | 0.920 | 0.010 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000258c0a | 0.097 | 0.095 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.095 | 0.985 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002d4418 | 0.086 | 0.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.083 | 0.963 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002b0063 | 0.083 | 0.082 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.082 | 0.994 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002f28a0 | 0.065 | 0.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.063 | 0.981 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000028c280 | 0.062 | 0.062 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.062 | 0.992 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002d8937 | 0.061 | 0.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.060 | 0.972 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002a7e8b | 0.055 | 0.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.053 | 0.969 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002f30b6 | 0.054 | 0.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.054 | 0.991 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000028125e | 0.052 | 0.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.052 | 0.986 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002f5442 | 0.052 | 0.051 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.051 | 0.977 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002af992 | 0.047 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 0.044 | 0.932 | 0.003 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002b58b0 | 0.045 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.044 | 0.973 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000029f394 | 0.045 | 0.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.044 | 0.984 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002ae95c | 0.044 | 0.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.043 | 0.967 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000258f84 | 0.040 | 0.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.039 | 0.970 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000002bbf4e | 0.036 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.034 | 0.959 | 0.001 | node-13/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (138 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.008 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.008 | 0.917 | 0.001 |
| p99 | 0.109 | 0.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 0.108 | 0.991 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c000000000032901f | 0.285 | 0.283 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.283 | 0.992 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000031cc9d | 0.109 | 0.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.108 | 0.989 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000031ea07 | 0.093 | 0.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.092 | 0.989 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000039aca6 | 0.067 | 0.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.018 | 0.049 | 0.735 | 0.018 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000037f122 | 0.041 | 0.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.040 | 0.988 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000034f2c9 | 0.039 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 0.035 | 0.887 | 0.004 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003a25f0 | 0.037 | 0.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.035 | 0.960 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003511dc | 0.034 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.033 | 0.965 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000336de6 | 0.034 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.033 | 0.986 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000377a3f | 0.031 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.030 | 0.961 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000355183 | 0.029 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.028 | 0.991 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000327c8d | 0.027 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.025 | 0.954 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000328dbd | 0.026 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.024 | 0.917 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000367388 | 0.026 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.025 | 0.981 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000030d923 | 0.025 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.023 | 0.912 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000036df26 | 0.022 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.933 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000311244 | 0.021 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.942 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000038f7de | 0.021 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.964 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000038a2fc | 0.020 | 0.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.019 | 0.939 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000032bab3 | 0.019 | 0.018 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.018 | 0.936 | 0.001 | node-13/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (106 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.009 | 0.927 | 0.001 |
| p99 | 0.066 | 0.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 0.065 | 0.989 | 0.004 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c00000000003b1f58 | 0.099 | 0.094 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 0.094 | 0.953 | 0.005 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003b2f20 | 0.066 | 0.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.065 | 0.989 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003e4c3c | 0.059 | 0.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 0.055 | 0.938 | 0.004 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003f3061 | 0.057 | 0.057 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.057 | 0.991 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003e831e | 0.046 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.045 | 0.974 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003ca035 | 0.042 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.041 | 0.982 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003a3a34 | 0.037 | 0.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.036 | 0.980 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000040ea8c | 0.035 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.033 | 0.958 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000417c5e | 0.034 | 0.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.033 | 0.957 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000413d1b | 0.033 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.031 | 0.948 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003f85e8 | 0.031 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.030 | 0.976 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003eafc9 | 0.030 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.030 | 0.984 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003f77d8 | 0.029 | 0.028 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.028 | 0.966 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003a64fa | 0.028 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.027 | 0.974 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000405cc0 | 0.026 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.025 | 0.972 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003a6a8b | 0.026 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.025 | 0.971 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000041d7c6 | 0.025 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.023 | 0.923 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000419c93 | 0.025 | 0.023 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.023 | 0.950 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003dd149 | 0.024 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.022 | 0.948 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000003f0e2e | 0.023 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.021 | 0.915 | 0.002 | node-13/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (137 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.008 | 0.923 | 0.001 |
| p99 | 0.080 | 0.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.080 | 0.992 | 0.002 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fa4ebfc13650081c00000000004cd5ed | 0.217 | 0.215 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.215 | 0.992 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000043f9c8 | 0.080 | 0.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.080 | 0.994 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000045110f | 0.069 | 0.062 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.007 | 0.062 | 0.897 | 0.007 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000456349 | 0.060 | 0.059 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.059 | 0.988 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000004afb7e | 0.055 | 0.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.055 | 0.991 | 0.000 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000045363f | 0.047 | 0.046 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.046 | 0.984 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000047c968 | 0.046 | 0.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 0.045 | 0.963 | 0.002 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000004917ff | 0.044 | 0.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.042 | 0.966 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000004bf8b7 | 0.042 | 0.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.041 | 0.982 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000464a02 | 0.035 | 0.034 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.034 | 0.979 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000048ce49 | 0.033 | 0.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.031 | 0.955 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000044c1cd | 0.031 | 0.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.030 | 0.961 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000004bcf31 | 0.028 | 0.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.027 | 0.974 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000427c38 | 0.026 | 0.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.025 | 0.954 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000439c8f | 0.026 | 0.024 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.024 | 0.943 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000048a45a | 0.023 | 0.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.022 | 0.968 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000482efd | 0.023 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.021 | 0.946 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000004416ce | 0.022 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.021 | 0.967 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000044a873 | 0.022 | 0.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.020 | 0.933 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000475d16 | 0.022 | 0.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.021 | 0.966 | 0.001 | node-13/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (172 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.060 | 0.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.057 | 0.976 | 0.001 |
| p99 | 268.222 | 0.367 | 0.000 | 0.674 | 267.922 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.006 | 268.218 | 1.000 | 0.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1e9894dd9225439b00000000001dc0ea | 269.793 | 0.153 | 0.000 | 0.000 | 269.638 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 269.791 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce590 | 268.222 | 0.446 | 0.000 | 0.000 | 267.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 268.218 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001dc0f6 | 267.972 | 0.085 | 0.000 | 0.000 | 267.885 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 267.971 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001dc0f0 | 267.966 | 0.060 | 0.000 | 0.000 | 267.903 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 267.963 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001dc102 | 267.938 | 0.015 | 0.000 | 0.000 | 267.922 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 267.938 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| 1e9894dd9225439b00000000001dc0fc | 267.932 | 0.017 | 0.000 | 0.000 | 267.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 267.931 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce596 | 267.826 | 0.053 | 0.000 | 0.000 | 267.768 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.005 | 267.821 | 1.000 | 0.005 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce628 | 262.433 | 0.042 | 0.000 | 0.000 | 262.389 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 262.431 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce62e | 262.388 | 0.019 | 0.000 | 0.000 | 262.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 262.387 | 1.000 | 0.002 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce6e8 | 260.506 | 0.024 | 0.000 | 0.000 | 260.481 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 260.505 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce6ee | 260.500 | 0.013 | 0.000 | 0.000 | 260.486 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 260.499 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001d80fd | 252.629 | 0.178 | 0.000 | 0.674 | 251.774 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 252.625 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001d815d | 250.779 | 0.049 | 0.000 | 0.674 | 250.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.002 | 250.776 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001d81a4 | 248.848 | 0.054 | 0.000 | 0.000 | 248.791 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 248.845 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001d8231 | 247.439 | 0.023 | 0.000 | 0.000 | 247.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 247.438 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| 4f7ef30cb8af736f00000000001d8237 | 247.435 | 0.015 | 0.000 | 0.000 | 247.419 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 247.434 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce7a6 | 236.811 | 0.047 | 0.000 | 0.000 | 236.763 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 236.810 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce7a0 | 236.798 | 0.300 | 0.000 | 0.000 | 236.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.003 | 236.795 | 1.000 | 0.003 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce89d | 235.458 | 0.043 | 0.000 | 0.000 | 235.413 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 235.457 | 1.000 | 0.001 | node-13/thread-3/reader.straddle-await-ack | none observed |
| fa4ebfc13650081c00000000004ce897 | 235.404 | 0.050 | 0.000 | 0.000 | 235.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.004 | 235.400 | 1.000 | 0.004 | node-13/thread-3/reader.straddle-await-ack | none observed |

## P5 / sweep / read (15 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.256 | 12.849 | 0.000 | 3.088 | 0.000 | 1.174 | 0.279 | 0.008 | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.002 | 15.937 | 0.891 | 0.002 |
| p99 | 107.573 | 39.616 | 0.000 | 20.009 | 0.000 | 31.729 | 23.507 | 20.307 | 0.000 | 0.079 | 0.000 | 0.000 | 0.000 | 0.011 | 59.625 | 0.999 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4f7ef30cb8af736f0000000000208629 | 107.573 | 39.616 | 0.000 | 20.009 | 0.000 | 15.955 | 23.507 | 8.455 | 0.000 | 0.028 | 0.000 | 0.000 | 0.000 | 0.002 | 59.625 | 0.554 | 0.002 | node-13/thread-5/replica.pull-at | none observed |
| 4f7ef30cb8af736f0000000000208635 | 70.416 | 13.737 | 0.000 | 14.657 | 0.000 | 30.926 | 11.067 | 0.018 | 0.000 | 0.009 | 0.000 | 0.000 | 0.000 | 0.001 | 28.394 | 0.403 | 0.001 | node-13/thread-5/socket.wait-first-byte | none observed |
| 4f7ef30cb8af736f000000000020863f | 67.261 | 15.986 | 0.000 | 14.657 | 0.000 | 31.729 | 4.839 | 0.019 | 0.000 | 0.029 | 0.000 | 0.000 | 0.000 | 0.002 | 30.643 | 0.456 | 0.002 | node-13/thread-5/socket.wait-first-byte | none observed |
| 4f7ef30cb8af736f0000000000208631 | 63.105 | 22.202 | 0.000 | 14.657 | 0.000 | 25.211 | 1.016 | 0.008 | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.003 | 36.859 | 0.584 | 0.003 | node-13/thread-5/socket.wait-first-byte | none observed |
| 1e9894dd9225439b000000000020e82d | 61.783 | 28.617 | 0.000 | 4.140 | 0.000 | 7.800 | 21.134 | 0.009 | 0.000 | 0.079 | 0.000 | 0.000 | 0.000 | 0.004 | 32.757 | 0.530 | 0.004 | node-13/thread-4/reader.execute | none observed |
| 1e9894dd9225439b000000000020fad9 | 58.879 | 12.849 | 0.000 | 3.088 | 0.000 | 22.336 | 0.279 | 20.307 | 0.000 | 0.019 | 0.000 | 0.000 | 0.000 | 0.001 | 15.937 | 0.271 | 0.001 | node-13/thread-4/socket.wait-first-byte | none observed |
| 1e9894dd9225439b000000000020fac9 | 56.029 | 16.990 | 0.000 | 3.088 | 0.000 | 13.683 | 22.174 | 0.016 | 0.000 | 0.075 | 0.000 | 0.000 | 0.000 | 0.003 | 20.077 | 0.358 | 0.003 | gw-r/thread-73/gateway.admitted-work | none observed |
| 4f7ef30cb8af736f0000000000208625 | 51.256 | 33.368 | 0.000 | 14.657 | 0.000 | 1.174 | 2.018 | 0.012 | 0.000 | 0.023 | 0.000 | 0.000 | 0.000 | 0.004 | 48.025 | 0.937 | 0.004 | node-13/thread-5/replica.pull-at | none observed |
| fa4ebfc13650081c00000000005075ae | 12.230 | 12.222 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.008 | 12.222 | 0.999 | 0.008 | node-13/thread-3/replica.pull-at | none observed |
| 84979a135169e7cc0000000000000806 | 0.512 | 0.501 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.011 | 0.501 | 0.979 | 0.011 | node-13/thread-6/replica.pull-at | none observed |
| fa4ebfc13650081c000000000050839b | 0.277 | 0.275 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.275 | 0.995 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c000000000050664f | 0.089 | 0.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.088 | 0.986 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c00000000005077f2 | 0.083 | 0.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.009 | 0.073 | 0.891 | 0.009 | node-13/thread-3/replica.pull-at | none observed |
| fa4ebfc13650081c0000000000508459 | 0.027 | 0.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.026 | 0.973 | 0.001 | node-13/thread-3/replica.pull-at | none observed |
| 1e9894dd9225439b000000000020ef11 | 0.011 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.010 | 0.933 | 0.001 | node-13/thread-4/replica.pull-at | none observed |

## Visibility limits

Logical read histograms include every finished read; retained fast reads are a fixed 1/1024 FNV sample, and reads at least 50 ms are retained. Slowest read selection is among the retained sample plus every observed slow read. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

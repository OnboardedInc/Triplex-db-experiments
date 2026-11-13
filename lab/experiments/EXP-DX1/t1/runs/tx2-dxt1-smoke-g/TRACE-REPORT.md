# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (329.725 ms, trace `c80fdcd8240879d4000000000000011c`); `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (279.634 ms, trace `c80fdcd8240879d400000000000000b5`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (191.299 ms, trace `c80fdcd8240879d40000000000000113`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (159.153 ms, trace `c80fdcd8240879d400000000000000f1`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (114.271 ms, trace `c80fdcd8240879d400000000000000b7`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-smoke-g`; source `0c1fa43b93562e3774b09e18c9e351decc0741da`; subjects 1000; tracing full.

Commit coverage: 84/84 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 84/84. Raw trace bytes: 2606381.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## P2 / warmup / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.533 | 8.455 | n/a | 0.000 | 1.078 | 1.724 | 3.003 | 0.060 | 0.000 | 0.660 | 19.799 | n/a | n/a | 0.031 | 9.770 | 0.230 | 0.031 |
| p99 | 46.327 | 17.379 | n/a | 0.000 | 1.315 | 3.009 | 4.796 | 0.179 | 0.000 | 7.828 | 20.284 | n/a | n/a | 0.137 | 17.853 | 0.385 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d40000000000000095 | 46.327 | 17.379 | 0.431 | 0.000 | 0.042 | 3.009 | 4.796 | 0.179 | 0.000 | 0.660 | 19.799 | n/a | n/a | 0.031 | 17.853 | 0.385 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 1.250ms |
| c80fdcd8240879d40000000000000092 | 42.533 | 8.455 | n/a | 0.000 | 1.315 | 1.724 | 2.729 | 0.060 | 0.000 | 7.828 | 20.284 | n/a | n/a | 0.137 | 9.770 | 0.230 | 0.137 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000096 | 24.550 | 3.562 | n/a | 0.000 | 1.078 | 0.992 | 3.003 | 0.054 | 0.000 | 0.469 | 15.371 | n/a | n/a | 0.021 | 4.640 | 0.189 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.550 | 3.562 | n/a | 0.000 | 1.078 | 0.992 | 3.003 | 0.054 | 0.000 | 0.469 | 15.371 | n/a | n/a | 0.021 | 4.640 | 0.189 | 0.021 |
| p99 | 24.550 | 3.562 | n/a | 0.000 | 1.078 | 0.992 | 3.003 | 0.054 | 0.000 | 0.469 | 15.371 | n/a | n/a | 0.021 | 4.640 | 0.189 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d40000000000000096 | 24.550 | 3.562 | n/a | 0.000 | 1.078 | 0.992 | 3.003 | 0.054 | 0.000 | 0.469 | 15.371 | n/a | n/a | 0.021 | 4.640 | 0.189 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.104 | 4.591 | n/a | 0.000 | 0.086 | 1.813 | 3.642 | 0.059 | 0.000 | 0.942 | 19.650 | n/a | n/a | 0.025 | 4.936 | 0.175 | 0.025 |
| p99 | 64.811 | 11.032 | n/a | 0.000 | 1.196 | 4.236 | 14.250 | 0.165 | 0.000 | 5.143 | 40.823 | n/a | n/a | 0.072 | 11.416 | 0.322 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000fe | 64.811 | 11.032 | n/a | 0.000 | 0.384 | 1.813 | 10.131 | 0.059 | 0.000 | 0.498 | 40.823 | n/a | n/a | 0.072 | 11.416 | 0.176 | 0.072 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000e8 | 47.048 | 4.275 | 0.199 | 0.000 | 0.029 | 1.358 | 14.250 | 0.048 | 0.000 | 0.454 | 26.410 | n/a | n/a | 0.024 | 4.503 | 0.096 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000108 | 43.865 | 4.730 | n/a | 0.000 | 0.379 | 1.581 | 2.044 | 0.041 | 0.000 | 4.214 | 30.853 | n/a | n/a | 0.023 | 5.109 | 0.116 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000e4 | 41.151 | 5.525 | n/a | 0.000 | 0.399 | 2.719 | 2.622 | 0.106 | 0.000 | 5.143 | 24.613 | n/a | n/a | 0.023 | 5.924 | 0.144 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000012b | 40.227 | 4.311 | 0.562 | 0.000 | 0.042 | 4.236 | 6.656 | 0.113 | 0.000 | 0.942 | 23.339 | n/a | n/a | 0.025 | 4.915 | 0.122 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000129 | 38.088 | 3.538 | 0.300 | 0.000 | 0.039 | 2.173 | 13.863 | 0.058 | 0.000 | 0.991 | 17.100 | n/a | n/a | 0.026 | 3.877 | 0.102 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000101 | 35.104 | 3.472 | 0.249 | 0.000 | 0.062 | 1.573 | 7.877 | 0.072 | 0.000 | 0.830 | 20.941 | n/a | n/a | 0.029 | 3.782 | 0.108 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000104 | 34.273 | 6.496 | n/a | 0.000 | 0.869 | 2.445 | 1.793 | 0.084 | 0.000 | 2.894 | 19.650 | n/a | n/a | 0.042 | 7.365 | 0.215 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000107 | 28.282 | 4.591 | 0.302 | 0.000 | 0.043 | 2.967 | 2.285 | 0.080 | 0.000 | 1.315 | 16.675 | n/a | n/a | 0.024 | 4.936 | 0.175 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000099 | 23.910 | 5.202 | 0.246 | 0.000 | 0.048 | 2.052 | 3.642 | 0.165 | 0.000 | 0.921 | 11.610 | n/a | n/a | 0.025 | 5.496 | 0.230 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000102 | 22.092 | 6.985 | n/a | 0.000 | 0.136 | 1.352 | 1.216 | 0.036 | 0.000 | 3.908 | 8.418 | n/a | n/a | 0.041 | 7.121 | 0.322 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000010a | 21.905 | 3.381 | n/a | 0.000 | 1.196 | 0.711 | 4.828 | 0.040 | 0.000 | 0.441 | 11.287 | n/a | n/a | 0.021 | 4.577 | 0.209 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000126 | 20.486 | 3.610 | n/a | 0.000 | 0.086 | 1.662 | 1.122 | 0.042 | 0.000 | 0.703 | 13.229 | n/a | n/a | 0.031 | 3.696 | 0.180 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.953 | 4.028 | 0.383 | 0.000 | 0.052 | 1.289 | 2.256 | 0.053 | 0.000 | 0.775 | 10.618 | n/a | n/a | 0.025 | 4.277 | 0.175 | 0.025 |
| p99 | 27.547 | 6.301 | n/a | 0.000 | 0.719 | 4.266 | 3.172 | 0.089 | 0.000 | 1.692 | 17.731 | n/a | n/a | 0.121 | 6.725 | 0.294 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000009a | 27.547 | 4.446 | n/a | 0.000 | 0.368 | 1.289 | 2.256 | 0.089 | 0.000 | 1.343 | 17.731 | n/a | n/a | 0.025 | 4.814 | 0.175 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000009e | 24.525 | 3.406 | n/a | 0.000 | 0.719 | 0.950 | 1.253 | 0.053 | 0.000 | 1.692 | 16.330 | n/a | n/a | 0.121 | 4.126 | 0.168 | 0.121 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000a1 | 22.953 | 4.028 | 0.197 | 0.000 | 0.052 | 4.266 | 3.172 | 0.069 | 0.000 | 0.526 | 10.618 | n/a | n/a | 0.024 | 4.277 | 0.186 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000009d | 22.837 | 6.301 | 0.383 | 0.000 | 0.041 | 2.793 | 2.567 | 0.049 | 0.000 | 0.775 | 9.902 | n/a | n/a | 0.027 | 6.725 | 0.294 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.525 | 3.406 | n/a | 0.000 | 0.368 | 0.950 | 1.253 | 0.053 | 0.000 | 1.343 | 16.330 | n/a | n/a | 0.025 | 4.126 | 0.168 | 0.025 |
| p99 | 27.547 | 4.446 | n/a | 0.000 | 0.719 | 1.289 | 2.256 | 0.089 | 0.000 | 1.692 | 17.731 | n/a | n/a | 0.121 | 4.814 | 0.175 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000009a | 27.547 | 4.446 | n/a | 0.000 | 0.368 | 1.289 | 2.256 | 0.089 | 0.000 | 1.343 | 17.731 | n/a | n/a | 0.025 | 4.814 | 0.175 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000009e | 24.525 | 3.406 | n/a | 0.000 | 0.719 | 0.950 | 1.253 | 0.053 | 0.000 | 1.692 | 16.330 | n/a | n/a | 0.121 | 4.126 | 0.168 | 0.121 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.719 | 4.890 | 0.286 | 0.000 | 0.093 | 1.282 | 2.816 | 0.060 | 0.000 | 1.541 | 13.325 | n/a | n/a | 0.029 | 5.518 | 0.095 | 0.029 |
| p99 | 113.354 | 8.436 | n/a | 0.000 | 0.628 | 8.655 | 10.121 | 0.162 | 0.000 | 2.109 | 84.833 | n/a | n/a | 0.055 | 8.887 | 0.322 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000a9 | 113.354 | 7.726 | 0.254 | 0.000 | 0.041 | 8.655 | 10.121 | 0.162 | 0.000 | 1.541 | 84.833 | n/a | n/a | 0.021 | 8.021 | 0.071 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.318ms; driver.worker-message 1.853ms |
| c80fdcd8240879d400000000000000a8 | 93.151 | 8.436 | n/a | 0.000 | 0.452 | 1.282 | 2.816 | 0.066 | 0.000 | 1.786 | 78.259 | n/a | n/a | 0.055 | 8.887 | 0.095 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000a5 | 24.719 | 4.380 | 0.286 | 0.000 | 0.093 | 1.344 | 3.088 | 0.060 | 0.000 | 2.109 | 13.325 | n/a | n/a | 0.033 | 4.759 | 0.193 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000a2 | 17.132 | 4.890 | n/a | 0.000 | 0.628 | 1.002 | 1.389 | 0.038 | 0.000 | 0.709 | 8.446 | n/a | n/a | 0.029 | 5.518 | 0.322 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 64.894 | 6.178 | 0.278 | 0.000 | 0.078 | 4.119 | 5.430 | 0.068 | 0.000 | 5.832 | 41.557 | n/a | n/a | 0.019 | 6.488 | 0.125 | 0.019 |
| p99 | 72.548 | 16.239 | n/a | 0.533 | 0.893 | 6.052 | 6.090 | 0.084 | 0.000 | 6.937 | 46.581 | n/a | n/a | 0.021 | 17.095 | 0.236 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000b1 | 72.548 | 16.239 | 0.245 | 0.533 | 0.078 | 4.119 | 2.750 | 0.068 | 0.000 | 6.937 | 41.557 | n/a | n/a | 0.021 | 17.095 | 0.236 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ab | 64.894 | 4.264 | n/a | 0.000 | 0.893 | 1.807 | 5.430 | 0.068 | 0.000 | 5.832 | 46.581 | n/a | n/a | 0.019 | 5.157 | 0.079 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ae | 51.858 | 6.178 | 0.278 | 0.000 | 0.031 | 6.052 | 6.090 | 0.084 | 0.000 | 4.283 | 28.844 | n/a | n/a | 0.019 | 6.488 | 0.125 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.144 | 4.662 | 0.352 | 0.000 | 0.059 | 1.150 | 12.433 | 0.114 | 0.000 | 0.737 | 43.561 | n/a | n/a | 0.023 | 5.050 | 0.024 | 0.023 |
| p99 | 309.789 | 6.585 | n/a | 0.608 | 0.388 | 5.332 | 60.093 | 0.232 | 0.000 | 4.754 | 279.634 | n/a | n/a | 0.031 | 7.497 | 0.175 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000b5 | 309.789 | 6.585 | 0.245 | 0.608 | 0.059 | 5.332 | 12.433 | 0.115 | 0.000 | 4.754 | 279.634 | n/a | n/a | 0.023 | 7.497 | 0.024 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000b7 | 179.918 | 3.589 | n/a | 0.000 | 0.329 | 0.799 | 60.093 | 0.232 | 0.000 | 0.574 | 114.271 | n/a | n/a | 0.031 | 3.918 | 0.022 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ba | 72.144 | 6.289 | 0.352 | 0.539 | 0.038 | 2.758 | 17.736 | 0.114 | 0.000 | 0.737 | 43.561 | n/a | n/a | 0.021 | 7.218 | 0.100 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000b3 | 28.878 | 4.662 | n/a | 0.000 | 0.388 | 1.150 | 3.670 | 0.106 | 0.000 | 1.234 | 17.643 | n/a | n/a | 0.024 | 5.050 | 0.175 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.878 | 3.589 | n/a | 0.000 | 0.329 | 0.799 | 3.670 | 0.106 | 0.000 | 0.574 | 17.643 | n/a | n/a | 0.024 | 3.918 | 0.022 | 0.024 |
| p99 | 179.918 | 4.662 | n/a | 0.000 | 0.388 | 1.150 | 60.093 | 0.232 | 0.000 | 1.234 | 114.271 | n/a | n/a | 0.031 | 5.050 | 0.175 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000b7 | 179.918 | 3.589 | n/a | 0.000 | 0.329 | 0.799 | 60.093 | 0.232 | 0.000 | 0.574 | 114.271 | n/a | n/a | 0.031 | 3.918 | 0.022 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000b3 | 28.878 | 4.662 | n/a | 0.000 | 0.388 | 1.150 | 3.670 | 0.106 | 0.000 | 1.234 | 17.643 | n/a | n/a | 0.024 | 5.050 | 0.175 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.211 | 4.198 | 0.302 | 0.226 | 0.052 | 1.571 | 19.684 | 0.085 | 0.000 | 1.031 | 58.638 | n/a | n/a | 0.020 | 4.689 | 0.059 | 0.020 |
| p99 | 108.843 | 9.988 | n/a | 0.902 | 0.373 | 2.338 | 38.624 | 0.220 | 0.000 | 4.806 | 58.812 | n/a | n/a | 0.043 | 11.154 | 0.121 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000bf | 108.843 | 4.198 | 0.213 | 0.226 | 0.052 | 1.847 | 38.624 | 0.220 | 0.000 | 4.806 | 58.638 | n/a | n/a | 0.019 | 4.689 | 0.043 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000bb | 93.652 | 9.988 | n/a | 0.902 | 0.264 | 1.571 | 21.610 | 0.120 | 0.000 | 0.515 | 58.640 | n/a | n/a | 0.043 | 11.154 | 0.119 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000c4 | 88.211 | 4.533 | 0.302 | 0.308 | 0.034 | 2.338 | 19.684 | 0.085 | 0.000 | 2.086 | 58.812 | n/a | n/a | 0.028 | 5.178 | 0.059 | 0.028 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000c1 | 33.067 | 3.621 | n/a | 0.000 | 0.373 | 0.770 | 1.541 | 0.036 | 0.000 | 1.031 | 25.677 | n/a | n/a | 0.020 | 3.993 | 0.121 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.816 | 7.970 | 5.518 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 9.802 | 0.998 | 0.014 |
| p99 | 152.751 | 32.664 | 26.603 | 5.159 | 0.000 | 4.158 | 90.032 | 0.016 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.089 | 61.798 | 0.999 | 0.089 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000bc | 152.751 | 32.664 | 26.603 | 2.531 | 0.000 | 0.711 | 90.032 | 0.013 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.014 | 61.798 | 0.405 | 0.014 | gw-w/thread-50/gateway.admitted-work | driver.worker-message 2.502ms |
| c80fdcd8240879d400000000000000e5 | 110.254 | 30.138 | 20.795 | 0.000 | 0.000 | 2.821 | 56.439 | 0.016 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.013 | 50.932 | 0.462 | 0.013 | gw-w/thread-49/gateway.admitted-work | none observed |
| c80fdcd8240879d400000000000000d8 | 110.085 | 27.807 | 20.362 | 0.000 | 0.000 | 4.158 | 57.700 | 0.016 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.019 | 48.169 | 0.438 | 0.019 | gw-w/thread-50/gateway.admitted-work | driver.worker-message 0.657ms |
| c80fdcd8240879d400000000000000f9 | 44.704 | 18.482 | 6.676 | 0.000 | 0.000 | 0.724 | 18.781 | 0.011 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.012 | 25.158 | 0.563 | 0.012 | gw-w/thread-50/gateway.admitted-work | none observed |
| c80fdcd8240879d4000000000000012f | 31.271 | 29.983 | 0.158 | 1.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.089 | 31.181 | 0.997 | 0.089 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d40000000000000093 | 28.061 | 20.788 | 2.082 | 5.159 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 28.029 | 0.999 | 0.033 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d400000000000000cd | 15.034 | 12.786 | 2.236 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 15.022 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d400000000000000ee | 14.877 | 14.659 | 0.194 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 14.853 | 0.998 | 0.025 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d400000000000000c6 | 12.933 | 8.346 | 4.565 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 12.911 | 0.998 | 0.022 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d4000000000000010e | 10.945 | 7.970 | 2.934 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 10.904 | 0.996 | 0.040 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d4000000000000012d | 9.816 | 9.694 | 0.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 9.802 | 0.999 | 0.014 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d400000000000000ff | 8.834 | 0.596 | 8.224 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 8.820 | 0.998 | 0.014 | node-14/thread-0/rpc.replica.observe | none observed |
| c80fdcd8240879d4000000000000013b | 8.065 | 0.376 | 7.674 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.050 | 0.998 | 0.015 | node-14/thread-0/rpc.replica.observe | none observed |
| c80fdcd8240879d400000000000000db | 8.035 | 7.216 | 0.807 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 8.023 | 0.999 | 0.012 | node-14/thread-2/replica.pull-at | none observed |
| c80fdcd8240879d40000000000000119 | 7.432 | 0.308 | 7.096 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 7.404 | 0.996 | 0.028 | node-14/thread-0/rpc.replica.observe | none observed |
| c80fdcd8240879d400000000000000a3 | 7.270 | 0.476 | 6.784 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 7.260 | 0.999 | 0.010 | node-14/thread-0/rpc.replica.observe | none observed |
| c80fdcd8240879d400000000000000aa | 6.613 | 1.077 | 5.518 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.594 | 0.997 | 0.019 | node-14/thread-0/rpc.replica.observe | driver.worker-message 1.853ms |
| c80fdcd8240879d400000000000000c2 | 6.067 | 0.371 | 5.684 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 6.055 | 0.998 | 0.012 | node-14/thread-0/rpc.replica.observe | none observed |
| c80fdcd8240879d4000000000000010b | 6.031 | 0.494 | 5.523 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 6.018 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| c80fdcd8240879d40000000000000097 | 5.432 | 5.046 | 0.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 5.410 | 0.996 | 0.022 | node-14/thread-2/replica.pull-at | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.067 | 3.621 | n/a | 0.000 | 0.373 | 0.770 | 1.541 | 0.036 | 0.000 | 1.031 | 25.677 | n/a | n/a | 0.020 | 3.993 | 0.121 | 0.020 |
| p99 | 33.067 | 3.621 | n/a | 0.000 | 0.373 | 0.770 | 1.541 | 0.036 | 0.000 | 1.031 | 25.677 | n/a | n/a | 0.020 | 3.993 | 0.121 | 0.020 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000c1 | 33.067 | 3.621 | n/a | 0.000 | 0.373 | 0.770 | 1.541 | 0.036 | 0.000 | 1.031 | 25.677 | n/a | n/a | 0.020 | 3.993 | 0.121 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.756 | 4.336 | n/a | 0.000 | 0.218 | 3.094 | 13.685 | 0.134 | 0.000 | 1.131 | 35.781 | n/a | n/a | 0.027 | 4.554 | 0.087 | 0.027 |
| p99 | 88.268 | 8.079 | n/a | 0.323 | 1.016 | 4.833 | 21.142 | 0.173 | 0.000 | 9.323 | 65.082 | n/a | n/a | 0.032 | 8.744 | 0.119 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000c5 | 88.268 | 6.649 | n/a | 0.000 | 1.016 | 0.900 | 13.685 | 0.087 | 0.000 | 0.824 | 65.082 | n/a | n/a | 0.026 | 7.665 | 0.087 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000c8 | 73.200 | 8.079 | 0.296 | 0.323 | 0.045 | 4.833 | 21.142 | 0.136 | 0.000 | 6.401 | 31.912 | n/a | n/a | 0.032 | 8.744 | 0.119 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000cf | 62.756 | 3.826 | 0.230 | 0.000 | 0.033 | 3.094 | 18.688 | 0.134 | 0.000 | 0.949 | 35.781 | n/a | n/a | 0.021 | 4.088 | 0.065 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000cc | 61.260 | 4.336 | n/a | 0.000 | 0.218 | 1.086 | 4.847 | 0.173 | 0.000 | 1.131 | 49.442 | n/a | n/a | 0.027 | 4.554 | 0.074 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ca | 40.593 | 4.273 | n/a | 0.000 | 0.260 | 3.637 | 2.350 | 0.097 | 0.000 | 9.323 | 20.625 | n/a | n/a | 0.028 | 4.532 | 0.112 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.260 | 4.336 | n/a | 0.000 | 0.260 | 1.086 | 4.847 | 0.097 | 0.000 | 1.131 | 49.442 | n/a | n/a | 0.027 | 4.554 | 0.087 | 0.027 |
| p99 | 88.268 | 6.649 | n/a | 0.000 | 1.016 | 3.637 | 13.685 | 0.173 | 0.000 | 9.323 | 65.082 | n/a | n/a | 0.028 | 7.665 | 0.112 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000c5 | 88.268 | 6.649 | n/a | 0.000 | 1.016 | 0.900 | 13.685 | 0.087 | 0.000 | 0.824 | 65.082 | n/a | n/a | 0.026 | 7.665 | 0.087 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000cc | 61.260 | 4.336 | n/a | 0.000 | 0.218 | 1.086 | 4.847 | 0.173 | 0.000 | 1.131 | 49.442 | n/a | n/a | 0.027 | 4.554 | 0.074 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ca | 40.593 | 4.273 | n/a | 0.000 | 0.260 | 3.637 | 2.350 | 0.097 | 0.000 | 9.323 | 20.625 | n/a | n/a | 0.028 | 4.532 | 0.112 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 61.309 | 5.075 | 0.298 | 0.438 | 0.040 | 2.146 | 14.661 | 0.163 | 0.000 | 3.937 | 30.749 | n/a | n/a | 0.022 | 5.852 | 0.092 | 0.022 |
| p99 | 63.301 | 7.453 | 0.633 | 1.330 | 0.071 | 2.252 | 16.036 | 0.188 | 0.000 | 4.193 | 34.889 | n/a | n/a | 0.036 | 9.486 | 0.155 | 0.036 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000d4 | 63.301 | 5.075 | 0.298 | 0.438 | 0.040 | 2.146 | 16.036 | 0.163 | 0.000 | 4.193 | 34.889 | n/a | n/a | 0.022 | 5.852 | 0.092 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000d1 | 61.309 | 7.453 | 0.633 | 1.330 | 0.071 | 2.252 | 14.661 | 0.188 | 0.000 | 3.937 | 30.749 | n/a | n/a | 0.036 | 9.486 | 0.155 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.481 | 4.127 | 0.198 | 0.000 | 0.036 | 1.697 | 13.603 | 0.070 | 0.000 | 1.501 | 21.661 | n/a | n/a | 0.021 | 4.886 | 0.074 | 0.021 |
| p99 | 107.912 | 6.027 | n/a | 0.529 | 1.107 | 3.213 | 24.760 | 0.130 | 0.000 | 2.682 | 87.506 | n/a | n/a | 0.025 | 6.841 | 0.205 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000d7 | 107.912 | 4.313 | n/a | 0.000 | 1.107 | 0.826 | 13.603 | 0.070 | 0.000 | 0.462 | 87.506 | n/a | n/a | 0.025 | 5.419 | 0.050 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000d6 | 53.265 | 3.733 | 0.187 | 0.000 | 0.036 | 1.881 | 14.465 | 0.077 | 0.000 | 2.682 | 30.183 | n/a | n/a | 0.021 | 3.956 | 0.074 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000dd | 52.481 | 4.127 | 0.198 | 0.529 | 0.032 | 3.213 | 24.760 | 0.130 | 0.000 | 2.546 | 16.926 | n/a | n/a | 0.020 | 4.886 | 0.093 | 0.020 | gw-w/thread-49/gateway.admitted-work | none observed |
| c80fdcd8240879d400000000000000da | 33.398 | 6.027 | n/a | 0.000 | 0.814 | 1.697 | 1.618 | 0.055 | 0.000 | 1.501 | 21.661 | n/a | n/a | 0.024 | 6.841 | 0.205 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.398 | 6.027 | n/a | 0.000 | 0.814 | 1.697 | 1.618 | 0.055 | 0.000 | 1.501 | 21.661 | n/a | n/a | 0.024 | 6.841 | 0.205 | 0.024 |
| p99 | 33.398 | 6.027 | n/a | 0.000 | 0.814 | 1.697 | 1.618 | 0.055 | 0.000 | 1.501 | 21.661 | n/a | n/a | 0.024 | 6.841 | 0.205 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000da | 33.398 | 6.027 | n/a | 0.000 | 0.814 | 1.697 | 1.618 | 0.055 | 0.000 | 1.501 | 21.661 | n/a | n/a | 0.024 | 6.841 | 0.205 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.427 | 5.945 | 1.541 | 0.000 | 0.037 | 2.255 | 12.104 | 0.099 | 0.000 | 0.727 | 14.507 | n/a | n/a | 0.022 | 8.008 | 0.255 | 0.022 |
| p99 | 48.913 | 9.004 | n/a | 0.490 | 1.055 | 8.625 | 13.846 | 0.103 | 0.000 | 1.058 | 28.795 | n/a | n/a | 0.034 | 10.059 | 0.305 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000e0 | 48.913 | 4.245 | 0.297 | 0.000 | 0.037 | 2.255 | 12.104 | 0.099 | 0.000 | 1.058 | 28.795 | n/a | n/a | 0.022 | 4.579 | 0.094 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000de | 39.427 | 9.004 | n/a | 0.000 | 1.055 | 8.625 | 13.846 | 0.103 | 0.000 | 0.727 | 6.033 | n/a | n/a | 0.034 | 10.059 | 0.255 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000e2 | 26.275 | 5.945 | 1.541 | 0.490 | 0.033 | 1.483 | 1.761 | 0.051 | 0.000 | 0.444 | 14.507 | n/a | n/a | 0.021 | 8.008 | 0.305 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.427 | 9.004 | n/a | 0.000 | 1.055 | 8.625 | 13.846 | 0.103 | 0.000 | 0.727 | 6.033 | n/a | n/a | 0.034 | 10.059 | 0.255 | 0.034 |
| p99 | 39.427 | 9.004 | n/a | 0.000 | 1.055 | 8.625 | 13.846 | 0.103 | 0.000 | 0.727 | 6.033 | n/a | n/a | 0.034 | 10.059 | 0.255 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000de | 39.427 | 9.004 | n/a | 0.000 | 1.055 | 8.625 | 13.846 | 0.103 | 0.000 | 0.727 | 6.033 | n/a | n/a | 0.034 | 10.059 | 0.255 | 0.034 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.416 | 5.857 | 0.218 | 0.000 | 0.047 | 1.630 | 5.446 | 0.107 | 0.000 | 0.902 | 28.576 | n/a | n/a | 0.023 | 6.764 | 0.167 | 0.023 |
| p99 | 85.023 | 7.246 | n/a | 0.333 | 0.907 | 1.666 | 26.450 | 0.134 | 0.000 | 1.123 | 50.334 | n/a | n/a | 0.134 | 7.484 | 0.191 | 0.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000ea | 85.023 | 4.951 | 0.218 | 0.333 | 0.047 | 1.630 | 26.450 | 0.134 | 0.000 | 0.902 | 50.334 | n/a | n/a | 0.023 | 5.549 | 0.065 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ed | 40.416 | 5.857 | n/a | 0.000 | 0.907 | 1.666 | 5.446 | 0.107 | 0.000 | 1.123 | 25.176 | n/a | n/a | 0.134 | 6.764 | 0.167 | 0.134 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000ec | 39.131 | 7.246 | 0.205 | 0.000 | 0.033 | 1.156 | 1.324 | 0.051 | 0.000 | 0.519 | 28.576 | n/a | n/a | 0.021 | 7.484 | 0.191 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / grow3 / commit (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 144.605 | 4.654 | 8.568 | 0.000 | 0.089 | 2.349 | 2.194 | 0.059 | 0.000 | 3.046 | 22.957 | n/a | n/a | 0.025 | 10.336 | 0.056 | 0.025 |
| p99 | 184.096 | 8.219 | n/a | 0.541 | 8.997 | 4.854 | 20.180 | 5.080 | 105.201 | 10.231 | 159.153 | n/a | n/a | 0.033 | 13.311 | 0.318 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000f1 | 184.096 | 7.848 | n/a | 0.000 | 2.488 | 0.730 | 3.562 | 0.059 | 0.000 | 10.231 | 159.153 | n/a | n/a | 0.025 | 10.336 | 0.056 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000f2 | 170.542 | 8.219 | 0.387 | 0.541 | 0.049 | 4.854 | 20.180 | 5.080 | 105.201 | 3.046 | 22.957 | n/a | n/a | 0.029 | 9.196 | 0.054 | 0.029 | gw-w/thread--1/jdk.GCPhasePause | driver.publication 1.434ms |
| c80fdcd8240879d400000000000000f6 | 144.605 | 4.654 | 8.568 | 0.000 | 0.089 | 2.349 | 1.898 | 0.045 | 0.000 | 2.219 | 124.751 | n/a | n/a | 0.033 | 13.311 | 0.092 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d400000000000000f8 | 41.095 | 4.055 | n/a | 0.000 | 8.997 | 3.464 | 2.194 | 0.094 | 0.000 | 4.905 | 17.368 | n/a | n/a | 0.017 | 13.052 | 0.318 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | client.encode 2.716ms |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 184.096 | 7.848 | n/a | 0.000 | 2.488 | 0.730 | 3.562 | 0.059 | 0.000 | 10.231 | 159.153 | n/a | n/a | 0.025 | 10.336 | 0.056 | 0.025 |
| p99 | 184.096 | 7.848 | n/a | 0.000 | 2.488 | 0.730 | 3.562 | 0.059 | 0.000 | 10.231 | 159.153 | n/a | n/a | 0.025 | 10.336 | 0.056 | 0.025 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d400000000000000f1 | 184.096 | 7.848 | n/a | 0.000 | 2.488 | 0.730 | 3.562 | 0.059 | 0.000 | 10.231 | 159.153 | n/a | n/a | 0.025 | 10.336 | 0.056 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.486 | 3.610 | n/a | 0.000 | 0.086 | 1.352 | 1.122 | 0.036 | 0.000 | 0.703 | 8.418 | n/a | n/a | 0.031 | 3.696 | 0.180 | 0.031 |
| p99 | 22.092 | 6.985 | n/a | 0.000 | 0.136 | 1.662 | 1.216 | 0.042 | 0.000 | 3.908 | 13.229 | n/a | n/a | 0.041 | 7.121 | 0.322 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d40000000000000102 | 22.092 | 6.985 | n/a | 0.000 | 0.136 | 1.352 | 1.216 | 0.036 | 0.000 | 3.908 | 8.418 | n/a | n/a | 0.041 | 7.121 | 0.322 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000126 | 20.486 | 3.610 | n/a | 0.000 | 0.086 | 1.662 | 1.122 | 0.042 | 0.000 | 0.703 | 13.229 | n/a | n/a | 0.031 | 3.696 | 0.180 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 52.187 | 5.206 | n/a | 0.000 | 0.198 | 1.785 | 9.917 | 0.096 | 0.000 | 1.276 | 27.028 | n/a | n/a | 0.024 | 5.643 | 0.115 | 0.024 |
| p99 | 258.441 | 7.067 | n/a | 0.000 | 9.152 | 5.720 | 53.599 | 0.205 | 0.000 | 4.055 | 191.299 | n/a | n/a | 0.109 | 14.864 | 0.333 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d40000000000000113 | 258.441 | 7.067 | 0.378 | 0.000 | 0.198 | 4.331 | 53.599 | 0.184 | 0.000 | 1.276 | 191.299 | n/a | n/a | 0.109 | 7.643 | 0.030 | 0.109 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000010d | 91.722 | 4.330 | n/a | 0.000 | 1.125 | 5.720 | 6.227 | 0.205 | 0.000 | 0.808 | 73.284 | n/a | n/a | 0.023 | 5.455 | 0.059 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.721ms |
| c80fdcd8240879d4000000000000010c | 83.037 | 5.098 | n/a | 0.000 | 0.166 | 1.021 | 14.648 | 0.078 | 0.000 | 2.896 | 59.099 | n/a | n/a | 0.031 | 5.264 | 0.063 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000117 | 52.187 | 5.050 | 0.904 | 0.000 | 0.042 | 2.058 | 16.004 | 0.066 | 0.000 | 1.008 | 27.028 | n/a | n/a | 0.027 | 5.996 | 0.115 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000010f | 44.596 | 5.712 | n/a | 0.000 | 9.152 | 1.785 | 1.978 | 0.096 | 0.000 | 2.849 | 23.009 | n/a | n/a | 0.015 | 14.864 | 0.333 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.721ms; driver.publication 1.370ms; driver.expected-state.bind-receipt 1.067ms |
| c80fdcd8240879d40000000000000118 | 35.604 | 5.206 | n/a | 0.000 | 0.095 | 1.063 | 9.917 | 0.201 | 0.000 | 4.055 | 15.042 | n/a | n/a | 0.024 | 5.301 | 0.149 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000114 | 28.488 | 5.225 | n/a | 0.000 | 0.417 | 0.886 | 5.298 | 0.041 | 0.000 | 0.744 | 15.855 | n/a | n/a | 0.020 | 5.643 | 0.198 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 44.596 | 5.098 | n/a | 0.000 | 0.166 | 1.021 | 1.978 | 0.078 | 0.000 | 2.849 | 23.009 | n/a | n/a | 0.015 | 5.264 | 0.063 | 0.015 |
| p99 | 83.037 | 5.712 | n/a | 0.000 | 9.152 | 1.785 | 14.648 | 0.096 | 0.000 | 2.896 | 59.099 | n/a | n/a | 0.031 | 14.864 | 0.333 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000010c | 83.037 | 5.098 | n/a | 0.000 | 0.166 | 1.021 | 14.648 | 0.078 | 0.000 | 2.896 | 59.099 | n/a | n/a | 0.031 | 5.264 | 0.063 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000010f | 44.596 | 5.712 | n/a | 0.000 | 9.152 | 1.785 | 1.978 | 0.096 | 0.000 | 2.849 | 23.009 | n/a | n/a | 0.015 | 14.864 | 0.333 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.721ms; driver.publication 1.370ms; driver.expected-state.bind-receipt 1.067ms |

## P2 / grow10 / commit (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.988 | 6.036 | 1.563 | 0.000 | 0.037 | 1.638 | 18.230 | 0.192 | 0.000 | 1.099 | 31.821 | n/a | n/a | 0.019 | 8.554 | 0.026 | 0.019 |
| p99 | 379.900 | 8.286 | 2.482 | 0.000 | 0.052 | 5.966 | 19.665 | 0.211 | 0.000 | 5.449 | 340.119 | n/a | n/a | 0.023 | 9.900 | 0.136 | 0.023 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000011c | 379.900 | 8.286 | 1.563 | 0.000 | 0.052 | 5.966 | 18.230 | 0.211 | 0.000 | 5.449 | 340.119 | n/a | n/a | 0.023 | 9.900 | 0.026 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000122 | 62.988 | 6.036 | 2.482 | 0.000 | 0.037 | 1.638 | 19.665 | 0.192 | 0.000 | 1.099 | 31.821 | n/a | n/a | 0.019 | 8.554 | 0.136 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.247 | 4.983 | n/a | 0.000 | 0.321 | 1.494 | 3.973 | 0.109 | 0.000 | 0.902 | 20.821 | n/a | n/a | 0.022 | 6.567 | 0.158 | 0.022 |
| p99 | 120.267 | 7.480 | n/a | 0.000 | 28.171 | 2.186 | 11.204 | 0.303 | 0.000 | 7.655 | 105.516 | n/a | n/a | 0.030 | 32.280 | 0.451 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000012c | 120.267 | 6.247 | n/a | 0.000 | 0.321 | 1.637 | 5.931 | 0.095 | 0.000 | 0.490 | 105.516 | n/a | n/a | 0.030 | 6.567 | 0.055 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000130 | 71.616 | 4.109 | n/a | 0.000 | 28.171 | 1.116 | 2.327 | 0.109 | 0.000 | 7.655 | 28.113 | n/a | n/a | 0.016 | 32.280 | 0.451 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.494ms; driver.publication 1.478ms |
| c80fdcd8240879d4000000000000012e | 47.244 | 7.480 | n/a | 0.000 | 0.341 | 1.494 | 3.973 | 0.303 | 0.000 | 0.902 | 32.726 | n/a | n/a | 0.026 | 7.821 | 0.166 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000135 | 39.247 | 5.958 | 0.206 | 0.000 | 0.030 | 2.093 | 8.365 | 0.116 | 0.000 | 1.637 | 20.821 | n/a | n/a | 0.020 | 6.195 | 0.158 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000133 | 38.356 | 4.983 | 2.619 | 0.000 | 0.032 | 2.186 | 11.204 | 0.167 | 0.000 | 1.289 | 15.847 | n/a | n/a | 0.029 | 7.635 | 0.199 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000136 | 26.271 | 3.145 | n/a | 0.000 | 0.776 | 0.801 | 1.820 | 0.051 | 0.000 | 0.479 | 19.177 | n/a | n/a | 0.022 | 3.921 | 0.149 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.271 | 3.145 | n/a | 0.000 | 0.776 | 0.801 | 1.820 | 0.051 | 0.000 | 0.479 | 19.177 | n/a | n/a | 0.016 | 3.921 | 0.149 | 0.016 |
| p99 | 71.616 | 4.109 | n/a | 0.000 | 28.171 | 1.116 | 2.327 | 0.109 | 0.000 | 7.655 | 28.113 | n/a | n/a | 0.022 | 32.280 | 0.451 | 0.022 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d40000000000000130 | 71.616 | 4.109 | n/a | 0.000 | 28.171 | 1.116 | 2.327 | 0.109 | 0.000 | 7.655 | 28.113 | n/a | n/a | 0.016 | 32.280 | 0.451 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.494ms; driver.publication 1.478ms |
| c80fdcd8240879d40000000000000136 | 26.271 | 3.145 | n/a | 0.000 | 0.776 | 0.801 | 1.820 | 0.051 | 0.000 | 0.479 | 19.177 | n/a | n/a | 0.022 | 3.921 | 0.149 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.772 | 5.035 | 0.404 | 0.000 | 0.035 | 1.300 | 2.104 | 0.115 | 0.000 | 0.890 | 16.565 | n/a | n/a | 0.028 | 5.357 | 0.168 | 0.028 |
| p99 | 33.699 | 5.211 | n/a | 0.000 | 0.851 | 2.285 | 7.293 | 0.134 | 0.000 | 1.193 | 23.915 | n/a | n/a | 0.042 | 5.648 | 0.185 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000013d | 33.699 | 5.211 | 0.404 | 0.000 | 0.032 | 0.996 | 2.075 | 0.134 | 0.000 | 0.890 | 23.915 | n/a | n/a | 0.042 | 5.648 | 0.168 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d40000000000000139 | 32.772 | 5.035 | 0.287 | 0.000 | 0.035 | 2.285 | 7.293 | 0.115 | 0.000 | 1.193 | 16.507 | n/a | n/a | 0.022 | 5.357 | 0.163 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| c80fdcd8240879d4000000000000013a | 25.167 | 3.800 | n/a | 0.000 | 0.851 | 1.300 | 2.104 | 0.063 | 0.000 | 0.458 | 16.565 | n/a | n/a | 0.028 | 4.650 | 0.185 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.167 | 3.800 | n/a | 0.000 | 0.851 | 1.300 | 2.104 | 0.063 | 0.000 | 0.458 | 16.565 | n/a | n/a | 0.028 | 4.650 | 0.185 | 0.028 |
| p99 | 25.167 | 3.800 | n/a | 0.000 | 0.851 | 1.300 | 2.104 | 0.063 | 0.000 | 0.458 | 16.565 | n/a | n/a | 0.028 | 4.650 | 0.185 | 0.028 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d4000000000000013a | 25.167 | 3.800 | n/a | 0.000 | 0.851 | 1.300 | 2.104 | 0.063 | 0.000 | 0.458 | 16.565 | n/a | n/a | 0.028 | 4.650 | 0.185 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P5 / sweep / commit (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 102.246 | 102.222 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 102.227 | 1.000 | 0.011 |
| p99 | 153.714 | 153.631 | n/a | 0.000 | 0.023 | 3.725 | 1.695 | 0.046 | 0.000 | 6.785 | 54.358 | n/a | n/a | 0.078 | 153.636 | 1.000 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c80fdcd8240879d40000000000000147 | 153.714 | 153.631 | n/a | 0.000 | 0.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.078 | 153.636 | 0.999 | 0.078 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.558ms; driver.publication 1.546ms; driver.publication 1.229ms |
| c80fdcd8240879d40000000000000146 | 144.823 | 144.808 | n/a | 0.000 | 0.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 144.812 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.558ms; driver.publication 1.229ms; driver.publication 1.119ms |
| c80fdcd8240879d40000000000000145 | 134.971 | 134.956 | n/a | 0.000 | 0.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 134.961 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.558ms; driver.publication 1.229ms; driver.publication 1.119ms |
| c80fdcd8240879d40000000000000144 | 126.599 | 126.577 | n/a | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 126.584 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.558ms; driver.publication 1.229ms; driver.publication 1.119ms |
| c80fdcd8240879d40000000000000143 | 117.824 | 117.807 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 117.813 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.229ms; driver.publication 1.119ms; driver.publication 1.072ms |
| c80fdcd8240879d40000000000000142 | 102.246 | 102.222 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 102.227 | 1.000 | 0.019 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.229ms; driver.publication 1.119ms |
| c80fdcd8240879d40000000000000141 | 95.480 | 95.454 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 95.460 | 1.000 | 0.020 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.229ms; driver.publication 1.119ms |
| c80fdcd8240879d40000000000000140 | 77.661 | 77.645 | n/a | 0.000 | 0.006 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 77.651 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.702ms; driver.publication 1.573ms; driver.publication 1.229ms |
| c80fdcd8240879d4000000000000013f | 73.583 | 73.564 | n/a | 0.000 | 0.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 73.572 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.573ms; driver.publication 1.229ms |
| c80fdcd8240879d4000000000000013e | 71.371 | 4.723 | n/a | 0.000 | 0.023 | 3.725 | 1.695 | 0.046 | 0.000 | 6.785 | 54.358 | n/a | n/a | 0.016 | 4.746 | 0.067 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P1 / warmup / read (223 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.026 | 0.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.025 | 0.932 | 0.001 |
| p99 | 276.550 | 43.791 | n/a | 3.274 | 276.455 | 6.319 | 2.188 | 0.015 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.016 | 276.546 | 1.000 | 0.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e9774dbdab5b1e600000000000000a7 | 277.890 | 0.590 | n/a | 0.000 | 277.288 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 277.878 | 1.000 | 0.012 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e600000000000000be | 276.564 | 0.066 | n/a | 0.000 | 276.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.561 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e600000000000000bd | 276.550 | 0.091 | n/a | 0.000 | 276.455 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 276.546 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000000016b | 276.104 | 0.024 | n/a | 0.000 | 276.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.102 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000000016a | 276.089 | 0.027 | n/a | 0.000 | 276.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.087 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000000169 | 276.072 | 0.043 | n/a | 0.000 | 276.027 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.069 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000000168 | 276.060 | 0.258 | n/a | 0.000 | 275.799 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.057 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000000016c | 276.013 | 0.037 | n/a | 0.000 | 275.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.010 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000008a26 | 274.360 | 0.083 | n/a | 0.000 | 274.276 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.359 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000008a25 | 274.258 | 0.239 | n/a | 0.000 | 274.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.256 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e4f58dd181d0117800000000000099b4 | 274.156 | 0.014 | n/a | 0.000 | 274.140 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.155 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d0117800000000000099b3 | 274.138 | 0.018 | n/a | 0.000 | 274.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.138 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000008909 | 274.128 | 0.086 | n/a | 0.000 | 274.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.126 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e4f58dd181d0117800000000000099b2 | 274.122 | 0.018 | n/a | 0.000 | 274.103 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.121 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000000890a | 274.121 | 0.022 | n/a | 0.000 | 274.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.119 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e4f58dd181d0117800000000000099b1 | 274.107 | 0.020 | n/a | 0.000 | 274.086 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.106 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000008907 | 274.105 | 0.065 | n/a | 0.000 | 274.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.103 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000008908 | 274.097 | 0.066 | n/a | 0.000 | 274.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.095 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e4f58dd181d0117800000000000099b0 | 274.086 | 0.040 | n/a | 0.000 | 274.045 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.085 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d0117800000000000099af | 274.029 | 0.248 | n/a | 0.000 | 273.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.025 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (93 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.941 | 0.001 |
| p99 | 343.008 | 6.339 | n/a | 0.000 | 340.938 | 0.672 | 0.960 | 0.007 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.476 | 343.005 | 1.000 | 0.476 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d01178000000000001ff7a | 343.008 | 2.066 | n/a | 0.000 | 340.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 343.005 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000000eb40 | 100.575 | 0.117 | n/a | 0.000 | 100.456 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 100.573 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| e4f58dd181d01178000000000000eb47 | 6.341 | 6.339 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 6.339 | 1.000 | 0.002 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.096ms |
| e4f58dd181d01178000000000000eb6e | 3.256 | 1.604 | n/a | 0.000 | 0.000 | 0.672 | 0.960 | 0.007 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.001 | 1.604 | 0.493 | 0.001 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d011780000000000011900 | 1.166 | 1.165 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.165 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000001aa59 | 1.027 | 1.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 1.010 | 0.984 | 0.016 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d01178000000000001dd3a | 0.954 | 0.952 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.952 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000019c8b | 0.742 | 0.736 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.736 | 0.992 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000001f330 | 0.731 | 0.729 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.729 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000001a4a4 | 0.568 | 0.567 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.567 | 0.999 | 0.000 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d011780000000000016f24 | 0.558 | 0.557 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.557 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000000fc5d | 0.538 | 0.537 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.537 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000019c8f | 0.517 | 0.041 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.476 | 0.041 | 0.080 | 0.476 | uncovered | none observed |
| e4f58dd181d011780000000000017ef0 | 0.515 | 0.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.512 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000001971b | 0.512 | 0.512 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.512 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000019f0e | 0.454 | 0.451 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.451 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000198e5 | 0.442 | 0.441 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.441 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000019b41 | 0.432 | 0.431 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.431 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000019466 | 0.431 | 0.428 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.428 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000001d9a6 | 0.400 | 0.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.398 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (210 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.019 | 0.018 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.018 | 0.950 | 0.001 |
| p99 | 313.885 | 6.106 | n/a | 0.000 | 313.642 | 1.619 | 1.399 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.012 | 313.883 | 1.000 | 0.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e9774dbdab5b1e6000000000000d827 | 314.432 | 0.144 | n/a | 0.000 | 314.285 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 314.429 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 3aab28372bb0656b000000000000dd5f | 313.913 | 0.097 | n/a | 0.000 | 313.813 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 313.909 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| e4f58dd181d011780000000000020156 | 313.885 | 0.269 | n/a | 0.000 | 313.614 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 313.883 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.122ms |
| e4f58dd181d011780000000000020157 | 313.704 | 0.058 | n/a | 0.000 | 313.642 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 313.699 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.122ms |
| e4f58dd181d01178000000000001ffc3 | 70.210 | 59.919 | n/a | 6.505 | 0.000 | 1.619 | 2.123 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.005 | 66.424 | 0.946 | 0.005 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d01178000000000001ff7d | 65.622 | 0.221 | n/a | 0.000 | 65.397 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 65.618 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000000d9fb | 63.768 | 0.463 | n/a | 0.000 | 63.296 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 63.759 | 1.000 | 0.009 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e6000000000000d31d | 62.935 | 0.595 | n/a | 0.000 | 62.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 62.928 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000000da04 | 44.779 | 29.642 | n/a | 6.868 | 0.000 | 1.775 | 6.441 | 0.016 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.004 | 36.510 | 0.815 | 0.004 | node-14/thread-5/reader.execute | replica.apply-delta 0.077ms |
| 0e9774dbdab5b1e6000000000000d357 | 10.513 | 6.106 | n/a | 0.000 | 0.000 | 2.913 | 1.399 | 0.009 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.005 | 6.106 | 0.581 | 0.005 | node-14/thread-4/reader.execute | none observed |
| 3aab28372bb0656b000000000000da07 | 3.635 | 3.627 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.627 | 0.998 | 0.009 | node-14/thread-5/replica.pull-at | none observed |
| e4f58dd181d01178000000000002cfc9 | 3.515 | 3.499 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.499 | 0.996 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000002cfc8 | 3.506 | 3.504 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.504 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 3aab28372bb0656b000000000000e6ed | 3.332 | 3.329 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.329 | 0.999 | 0.003 | node-14/thread-5/replica.pull-at | none observed |
| 0e9774dbdab5b1e60000000000017e84 | 2.074 | 2.073 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.073 | 1.000 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| 0e9774dbdab5b1e6000000000000d7bf | 1.495 | 1.492 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.492 | 0.998 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| e4f58dd181d011780000000000022ae2 | 1.168 | 1.165 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.165 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 0e9774dbdab5b1e60000000000015c2c | 1.164 | 1.161 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.161 | 0.997 | 0.003 | node-14/thread-4/reader.execute | none observed |
| 0e9774dbdab5b1e60000000000016c0d | 1.137 | 1.136 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.136 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| e4f58dd181d011780000000000020935 | 0.991 | 0.989 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.989 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (194 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.032 | 0.026 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.031 | 0.962 | 0.001 |
| p99 | 399.536 | 10.319 | n/a | 2.470 | 399.486 | 2.745 | 1.488 | 0.011 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.032 | 399.535 | 1.000 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d01178000000000003578d | 399.553 | 0.015 | n/a | 0.000 | 399.538 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 399.553 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| e4f58dd181d01178000000000003578c | 399.536 | 0.050 | n/a | 0.000 | 399.486 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 399.535 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| e4f58dd181d01178000000000003578b | 399.417 | 1.756 | n/a | 0.000 | 397.657 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 399.413 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| e4f58dd181d01178000000000003579a | 399.415 | 0.060 | n/a | 0.000 | 399.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 399.414 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| e4f58dd181d01178000000000003579b | 399.405 | 0.016 | n/a | 0.000 | 399.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 399.404 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 0e9774dbdab5b1e6000000000001f348 | 398.087 | 0.167 | n/a | 0.000 | 397.911 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 398.078 | 1.000 | 0.009 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| e4f58dd181d01178000000000003578a | 397.615 | 0.102 | n/a | 0.000 | 397.510 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 397.612 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.055ms |
| 3aab28372bb0656b000000000001fe48 | 397.308 | 0.196 | n/a | 0.000 | 397.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 397.303 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3aab28372bb0656b000000000001fe49 | 397.219 | 0.051 | n/a | 0.000 | 397.166 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 397.217 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3aab28372bb0656b000000000001fe4a | 397.206 | 0.029 | n/a | 0.000 | 397.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 397.204 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3aab28372bb0656b000000000001fe4b | 397.191 | 0.019 | n/a | 0.000 | 397.170 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 397.189 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 3aab28372bb0656b000000000001fe4c | 397.182 | 0.037 | n/a | 0.000 | 397.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 397.180 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 0e9774dbdab5b1e6000000000001f362 | 396.849 | 0.042 | n/a | 0.000 | 396.803 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 396.845 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 0e9774dbdab5b1e6000000000001f363 | 396.806 | 0.078 | n/a | 0.000 | 396.706 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 396.784 | 1.000 | 0.022 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 0e9774dbdab5b1e6000000000001f364 | 396.742 | 0.061 | n/a | 0.000 | 396.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 396.741 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 0e9774dbdab5b1e6000000000001f36a | 396.399 | 0.032 | n/a | 0.000 | 396.365 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 396.397 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 0e9774dbdab5b1e6000000000001f333 | 279.861 | 0.042 | n/a | 0.000 | 279.818 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 279.860 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| 0e9774dbdab5b1e6000000000001f332 | 279.726 | 2.006 | n/a | 0.000 | 277.716 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.723 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.049ms |
| e4f58dd181d01178000000000003575d | 278.771 | 0.025 | n/a | 0.000 | 278.744 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.769 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |
| e4f58dd181d01178000000000003575e | 278.771 | 0.025 | n/a | 0.000 | 278.744 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.769 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.065ms |

## P1 / L64 / read (187 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.034 | 0.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.033 | 0.966 | 0.001 |
| p99 | 343.196 | 11.883 | n/a | 0.000 | 343.132 | 1.750 | 13.515 | 0.016 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.026 | 343.195 | 1.000 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d01178000000000003dbe3 | 343.291 | 0.302 | n/a | 0.000 | 342.987 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 343.288 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000003dbe7 | 343.196 | 0.096 | n/a | 0.000 | 343.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.195 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000003dbe6 | 343.171 | 0.016 | n/a | 0.000 | 343.154 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.170 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000003dbe5 | 343.155 | 0.022 | n/a | 0.000 | 343.132 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.154 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000003dbe4 | 343.149 | 0.035 | n/a | 0.000 | 343.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.148 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000003dbf1 | 343.016 | 0.036 | n/a | 0.000 | 342.979 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 343.015 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000027bbb | 342.330 | 0.302 | n/a | 0.000 | 342.025 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 342.327 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000002882a | 342.253 | 0.540 | n/a | 0.000 | 341.710 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 342.250 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000027bd3 | 341.593 | 0.028 | n/a | 0.000 | 341.563 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.591 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000027bd2 | 341.575 | 0.029 | n/a | 0.000 | 341.545 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 341.574 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000027bd0 | 341.545 | 0.078 | n/a | 0.000 | 341.465 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.543 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000027bd1 | 341.539 | 0.036 | n/a | 0.000 | 341.501 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 341.537 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b00000000000305f0 | 340.929 | 0.079 | n/a | 0.000 | 340.848 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 340.927 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 3aab28372bb0656b00000000000305f1 | 340.918 | 0.022 | n/a | 0.000 | 340.895 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 340.917 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 3aab28372bb0656b00000000000305f2 | 340.917 | 0.018 | n/a | 0.000 | 340.897 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 340.915 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 3aab28372bb0656b000000000002884c | 340.824 | 0.077 | n/a | 0.000 | 340.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 340.822 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b00000000000305ef | 340.695 | 0.079 | n/a | 0.000 | 340.612 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 340.691 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 3aab28372bb0656b0000000000028850 | 340.292 | 0.076 | n/a | 0.000 | 340.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 340.288 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000028851 | 340.178 | 0.022 | n/a | 0.000 | 340.153 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 340.176 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000028852 | 340.144 | 0.021 | n/a | 0.000 | 340.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 340.142 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P1 / L256 / read (181 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.053 | 0.042 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.052 | 0.972 | 0.001 |
| p99 | 295.930 | 6.860 | n/a | 1.344 | 295.900 | 3.309 | 8.448 | 0.009 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.041 | 295.929 | 1.000 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d01178000000000004e98c | 296.037 | 0.253 | n/a | 0.000 | 295.783 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 296.037 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000004e98b | 295.930 | 0.015 | n/a | 0.000 | 295.915 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 295.929 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000004e98a | 295.918 | 0.017 | n/a | 0.000 | 295.900 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.917 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000004e98d | 295.909 | 0.039 | n/a | 0.000 | 295.870 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.909 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000004e989 | 295.884 | 0.059 | n/a | 0.000 | 295.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 295.882 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000038633 | 295.723 | 0.035 | n/a | 0.000 | 295.687 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.721 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000038632 | 295.661 | 0.029 | n/a | 0.000 | 295.631 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.660 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000038631 | 295.633 | 0.031 | n/a | 0.000 | 295.601 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.632 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b0000000000038630 | 295.556 | 0.085 | n/a | 0.000 | 295.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 295.555 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000004e988 | 293.584 | 0.279 | n/a | 0.000 | 293.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 293.580 | 1.000 | 0.005 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 3aab28372bb0656b000000000003862f | 293.137 | 0.200 | n/a | 0.000 | 292.929 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 293.130 | 1.000 | 0.007 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000037c5f | 292.486 | 0.042 | n/a | 0.000 | 292.443 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.485 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000037c5e | 292.340 | 0.175 | n/a | 0.000 | 292.162 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.337 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000037c62 | 291.940 | 0.170 | n/a | 0.000 | 291.769 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.939 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000037c61 | 291.856 | 0.380 | n/a | 0.000 | 291.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.855 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000037c60 | 291.575 | 0.046 | n/a | 0.000 | 291.527 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 291.573 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| e4f58dd181d01178000000000004e91a | 290.815 | 0.135 | n/a | 0.000 | 290.678 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.813 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.059ms |
| 0e9774dbdab5b1e60000000000037c16 | 290.810 | 0.055 | n/a | 0.000 | 290.753 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.808 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |
| 0e9774dbdab5b1e60000000000037c15 | 290.536 | 0.127 | n/a | 0.000 | 290.406 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.532 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |
| 0e9774dbdab5b1e60000000000037c35 | 289.967 | 0.257 | n/a | 0.000 | 289.708 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.965 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.039ms |

## P1 / L1024 / read (294 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.030 | 0.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.028 | 0.956 | 0.001 |
| p99 | 6.257 | 3.267 | n/a | 0.000 | 0.000 | 1.396 | 0.584 | 0.008 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.096 | 3.267 | 0.999 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3aab28372bb0656b000000000003aabd | 11.442 | 1.843 | n/a | 0.000 | 0.000 | 1.396 | 8.164 | 0.010 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.001 | 1.843 | 0.161 | 0.001 | gw-r/thread-53/gateway.admitted-work | none observed |
| e4f58dd181d011780000000000051052 | 6.774 | 2.336 | n/a | 0.000 | 0.000 | 1.763 | 0.584 | 2.080 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.002 | 2.336 | 0.345 | 0.002 | gw-r/thread-52/gateway.admission-wait | none observed |
| 0e9774dbdab5b1e6000000000003a41d | 6.257 | 1.451 | n/a | 0.000 | 0.000 | 2.045 | 2.733 | 0.008 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.003 | 1.451 | 0.232 | 0.003 | gw-r/thread-51/gateway.admitted-work | none observed |
| e4f58dd181d01178000000000005c488 | 3.347 | 3.324 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 3.324 | 0.993 | 0.023 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000006111c | 3.282 | 3.267 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.267 | 0.995 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000006111b | 3.281 | 3.279 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.279 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000006111d | 3.269 | 3.252 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.252 | 0.995 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000576a9 | 3.160 | 3.157 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.157 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000576aa | 3.157 | 3.142 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.142 | 0.995 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000005c489 | 3.149 | 3.132 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.132 | 0.995 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000576ab | 3.134 | 3.117 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.117 | 0.995 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000005c48a | 3.123 | 3.101 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.101 | 0.993 | 0.022 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000005c672 | 3.098 | 3.095 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 3.095 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| 0e9774dbdab5b1e600000000000451c0 | 3.090 | 0.067 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.024 | 0.067 | 0.022 | 3.024 | uncovered | none observed |
| e4f58dd181d0117800000000000576ac | 3.090 | 0.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.036 | 0.053 | 0.017 | 3.036 | uncovered | none observed |
| e4f58dd181d01178000000000005c4d8 | 3.027 | 3.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.010 | 0.995 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000005c4d7 | 3.023 | 3.021 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 3.021 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000005c4d9 | 3.013 | 2.999 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 2.999 | 0.995 | 0.015 | node-14/thread-3/replica.pull-at | none observed |
| 3aab28372bb0656b0000000000047982 | 2.960 | 2.959 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.959 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| e4f58dd181d01178000000000005fa5a | 2.624 | 2.606 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 2.606 | 0.993 | 0.018 | node-14/thread-3/replica.pull-at | none observed |

## P1 / recovery / read (216 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.037 | 0.029 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.035 | 0.965 | 0.001 |
| p99 | 359.977 | 4.024 | n/a | 0.000 | 359.919 | 1.626 | 1.556 | 0.009 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.018 | 359.975 | 1.000 | 0.018 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3aab28372bb0656b0000000000055b41 | 360.242 | 0.323 | n/a | 0.000 | 359.919 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 360.241 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 3aab28372bb0656b0000000000055b42 | 360.230 | 0.112 | n/a | 0.000 | 360.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 360.229 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 3aab28372bb0656b0000000000055b40 | 359.977 | 0.066 | n/a | 0.000 | 359.909 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 359.975 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 3aab28372bb0656b0000000000055b50 | 359.972 | 0.042 | n/a | 0.000 | 359.929 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 359.971 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| e4f58dd181d01178000000000006c6ba | 357.007 | 0.160 | n/a | 0.000 | 356.844 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 357.004 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 0e9774dbdab5b1e6000000000005500f | 356.946 | 0.156 | n/a | 0.000 | 356.787 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 356.944 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| 3aab28372bb0656b0000000000055b3f | 356.740 | 0.127 | n/a | 0.000 | 356.611 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 356.738 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.057ms |
| 0e9774dbdab5b1e60000000000055037 | 356.673 | 0.046 | n/a | 0.000 | 356.626 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.672 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| 0e9774dbdab5b1e60000000000055036 | 356.642 | 0.017 | n/a | 0.000 | 356.624 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.641 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| 0e9774dbdab5b1e60000000000055035 | 356.624 | 0.021 | n/a | 0.000 | 356.602 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.623 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| 0e9774dbdab5b1e60000000000055034 | 356.596 | 0.047 | n/a | 0.000 | 356.547 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 356.594 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.068ms |
| e4f58dd181d01178000000000006c6d2 | 355.945 | 0.058 | n/a | 0.000 | 355.884 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 355.943 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| e4f58dd181d01178000000000006c6d3 | 355.921 | 0.022 | n/a | 0.000 | 355.897 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 355.919 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| e4f58dd181d01178000000000006c6de | 355.616 | 0.079 | n/a | 0.000 | 355.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 355.615 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| e4f58dd181d01178000000000006c6df | 355.567 | 0.043 | n/a | 0.000 | 355.522 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 355.565 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| e4f58dd181d01178000000000006c6e0 | 355.540 | 0.018 | n/a | 0.000 | 355.520 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 355.538 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 0e9774dbdab5b1e60000000000055919 | 254.145 | 0.023 | n/a | 0.000 | 254.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 254.143 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e6000000000005591a | 254.143 | 0.020 | n/a | 0.000 | 254.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 254.142 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000055918 | 254.135 | 0.028 | n/a | 0.000 | 254.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 254.134 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e60000000000055917 | 254.132 | 0.148 | n/a | 0.000 | 253.972 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 254.120 | 1.000 | 0.013 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (134 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.014 | 0.013 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.013 | 0.941 | 0.001 |
| p99 | 4.603 | 2.423 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.423 | 0.999 | 0.017 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d0117800000000000703d5 | 8.872 | 2.581 | n/a | 0.000 | 0.000 | 1.031 | 5.218 | 0.024 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.001 | 2.581 | 0.291 | 0.001 | gw-r/thread-69/gateway.admitted-work | none observed |
| e4f58dd181d011780000000000086b0c | 4.603 | 0.088 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.515 | 0.088 | 0.019 | 4.515 | uncovered | none observed |
| e4f58dd181d011780000000000087c55 | 2.431 | 2.423 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.423 | 0.997 | 0.008 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d011780000000000087b9a | 2.327 | 2.325 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.325 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000087baf | 2.306 | 2.302 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 2.302 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000008a2b2 | 1.990 | 1.986 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.986 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000007db02 | 1.829 | 1.827 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.827 | 0.999 | 0.003 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d011780000000000089f9c | 1.734 | 1.732 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.732 | 0.999 | 0.002 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d01178000000000007073d | 1.525 | 1.524 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.524 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000087cfb | 1.304 | 1.301 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.301 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000086dc1 | 1.088 | 1.085 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.085 | 0.997 | 0.003 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d01178000000000008a2c3 | 0.959 | 0.957 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.957 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000078866 | 0.895 | 0.893 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.893 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000087c14 | 0.874 | 0.872 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.872 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000008a0ab | 0.800 | 0.797 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.797 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000007f1dd | 0.699 | 0.682 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.682 | 0.976 | 0.017 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000077275 | 0.665 | 0.662 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.662 | 0.996 | 0.003 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d01178000000000008a29e | 0.663 | 0.660 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.660 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000089973 | 0.617 | 0.615 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.615 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000759ad | 0.599 | 0.596 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.596 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (164 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.929 | 0.001 |
| p99 | 1.159 | 1.157 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.157 | 0.998 | 0.003 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d01178000000000008cc3a | 11.677 | 2.007 | n/a | 0.000 | 0.000 | 1.388 | 8.214 | 0.035 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.002 | 2.007 | 0.172 | 0.002 | gw-r/thread-49/gateway.admitted-work | none observed |
| e4f58dd181d01178000000000009756f | 1.159 | 1.157 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.157 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ac216 | 0.999 | 0.996 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.996 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000976a3 | 0.904 | 0.902 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.902 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b0c1f | 0.835 | 0.833 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.833 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000009611e | 0.665 | 0.664 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.664 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000a18b3 | 0.547 | 0.544 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.544 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000090b5b | 0.544 | 0.542 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.542 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000008f5d1 | 0.479 | 0.357 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.122 | 0.357 | 0.745 | 0.122 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d0117800000000000afd72 | 0.448 | 0.445 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.445 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000934fe | 0.441 | 0.439 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.439 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000afa6c | 0.433 | 0.430 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.430 | 0.994 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000adc6b | 0.425 | 0.423 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.423 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000009863f | 0.423 | 0.420 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.420 | 0.992 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000090fb2 | 0.410 | 0.409 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.409 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000a2053 | 0.409 | 0.407 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.407 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d011780000000000097465 | 0.404 | 0.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.402 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000a0363 | 0.399 | 0.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.398 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b1801 | 0.397 | 0.396 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.396 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d01178000000000008d46e | 0.397 | 0.395 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.395 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (122 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.933 | 0.001 |
| p99 | 1.364 | 1.361 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 1.361 | 0.998 | 0.012 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d0117800000000000b3aaa | 14.384 | 1.883 | n/a | 0.000 | 0.000 | 1.111 | 11.356 | 0.012 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.002 | 1.883 | 0.131 | 0.002 | gw-r/thread-69/gateway.admitted-work | none observed |
| e4f58dd181d0117800000000000bd289 | 1.364 | 1.361 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 1.361 | 0.997 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ba437 | 1.073 | 1.072 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.072 | 0.999 | 0.001 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d0117800000000000b99d7 | 0.973 | 0.971 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.971 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b9e27 | 0.908 | 0.903 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.903 | 0.994 | 0.005 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d0117800000000000b9d25 | 0.861 | 0.853 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 0.853 | 0.990 | 0.009 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b9f21 | 0.687 | 0.683 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.683 | 0.994 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000bb077 | 0.655 | 0.653 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.653 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ca9df | 0.643 | 0.641 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.641 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ba147 | 0.641 | 0.636 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.636 | 0.993 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000c00bd | 0.622 | 0.609 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.609 | 0.980 | 0.012 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b53c8 | 0.588 | 0.586 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.586 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000bc9b3 | 0.585 | 0.574 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.574 | 0.982 | 0.010 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000c045a | 0.563 | 0.562 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.562 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b563a | 0.549 | 0.548 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.548 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b9de1 | 0.524 | 0.519 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.519 | 0.991 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b833e | 0.501 | 0.499 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.499 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000b9a1e | 0.498 | 0.482 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.482 | 0.967 | 0.016 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ce21b | 0.482 | 0.481 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.481 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ba269 | 0.481 | 0.474 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.474 | 0.985 | 0.007 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (143 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.011 | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.011 | 0.935 | 0.001 |
| p99 | 2.406 | 2.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 2.402 | 0.998 | 0.006 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d0117800000000000d1169 | 13.630 | 3.083 | n/a | 0.000 | 0.000 | 1.107 | 9.405 | 0.013 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.003 | 3.083 | 0.226 | 0.003 | gw-r/thread-51/gateway.admitted-work | none observed |
| e4f58dd181d0117800000000000d7c55 | 2.406 | 2.402 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 2.402 | 0.998 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d3a4a | 1.093 | 1.092 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.092 | 0.999 | 0.001 | node-14/thread-3/reader.execute | none observed |
| e4f58dd181d0117800000000000ddb2c | 0.946 | 0.943 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.943 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d7c3b | 0.792 | 0.788 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.788 | 0.995 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d18d1 | 0.767 | 0.765 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.765 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000ef355 | 0.620 | 0.617 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.617 | 0.994 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d3088 | 0.609 | 0.607 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.607 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d6193 | 0.604 | 0.601 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.601 | 0.996 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d67ae | 0.600 | 0.594 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.594 | 0.990 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d70b5 | 0.598 | 0.596 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.596 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d7405 | 0.567 | 0.566 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.566 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000eddd3 | 0.567 | 0.565 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.565 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000e99ef | 0.517 | 0.515 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.515 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d5928 | 0.515 | 0.513 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.513 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d6e01 | 0.511 | 0.508 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.508 | 0.993 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000e2782 | 0.509 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.507 | 0.995 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d6e3e | 0.502 | 0.490 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.490 | 0.977 | 0.011 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d66e0 | 0.497 | 0.494 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.494 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| e4f58dd181d0117800000000000d62d6 | 0.487 | 0.485 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.485 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (189 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.071 | 0.053 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.070 | 0.974 | 0.001 |
| p99 | 356.425 | 10.705 | n/a | 1.952 | 356.112 | 2.289 | 12.821 | 0.017 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.189 | 356.330 | 1.000 | 0.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e4f58dd181d0117800000000000fd402 | 356.525 | 0.308 | n/a | 0.000 | 356.210 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 356.518 | 1.000 | 0.007 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.088ms; replica.apply-delta 0.083ms; replica.apply-delta 0.075ms; replica.apply-delta 0.059ms; replica.apply-delta 0.052ms |
| e4f58dd181d0117800000000000fd403 | 356.425 | 0.218 | n/a | 0.000 | 356.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.095 | 356.330 | 1.000 | 0.095 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.088ms; replica.apply-delta 0.083ms; replica.apply-delta 0.075ms; replica.apply-delta 0.059ms; replica.apply-delta 0.052ms |
| e4f58dd181d0117800000000000fd404 | 356.363 | 0.198 | n/a | 0.000 | 356.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.107 | 356.256 | 1.000 | 0.107 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.088ms; replica.apply-delta 0.083ms; replica.apply-delta 0.075ms; replica.apply-delta 0.059ms; replica.apply-delta 0.052ms |
| e4f58dd181d0117800000000000fd407 | 356.360 | 0.185 | n/a | 0.000 | 355.907 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.268 | 356.092 | 0.999 | 0.268 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.088ms; replica.apply-delta 0.083ms; replica.apply-delta 0.075ms; replica.apply-delta 0.059ms; replica.apply-delta 0.052ms |
| e4f58dd181d0117800000000000fd406 | 356.358 | 0.184 | n/a | 0.000 | 355.985 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.189 | 356.169 | 0.999 | 0.189 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.088ms; replica.apply-delta 0.083ms; replica.apply-delta 0.075ms; replica.apply-delta 0.059ms; replica.apply-delta 0.052ms |
| e4f58dd181d0117800000000000fd405 | 356.318 | 0.184 | n/a | 0.000 | 356.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.114 | 356.204 | 1.000 | 0.114 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.088ms; replica.apply-delta 0.083ms; replica.apply-delta 0.075ms; replica.apply-delta 0.059ms; replica.apply-delta 0.052ms |
| 0e9774dbdab5b1e600000000000635db | 355.844 | 0.247 | n/a | 0.000 | 355.593 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 355.840 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.084ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.047ms |
| 0e9774dbdab5b1e600000000000635de | 355.823 | 0.164 | n/a | 0.000 | 355.545 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.115 | 355.709 | 1.000 | 0.115 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.084ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.047ms |
| 0e9774dbdab5b1e600000000000635df | 355.820 | 0.164 | n/a | 0.000 | 355.528 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.128 | 355.692 | 1.000 | 0.128 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.084ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.047ms |
| 0e9774dbdab5b1e600000000000635dc | 355.819 | 0.173 | n/a | 0.000 | 355.563 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.083 | 355.737 | 1.000 | 0.083 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.084ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.047ms |
| 0e9774dbdab5b1e600000000000635dd | 355.819 | 0.165 | n/a | 0.000 | 355.553 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.101 | 355.718 | 1.000 | 0.101 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.084ms; replica.apply-delta 0.061ms; replica.apply-delta 0.053ms; replica.apply-delta 0.049ms; replica.apply-delta 0.047ms |
| 3aab28372bb0656b000000000006546f | 355.802 | 0.260 | n/a | 0.000 | 355.539 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 355.798 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.093ms; replica.apply-delta 0.065ms; replica.apply-delta 0.063ms; replica.apply-delta 0.050ms; replica.apply-delta 0.050ms |
| 3aab28372bb0656b0000000000065470 | 355.762 | 0.200 | n/a | 0.000 | 355.500 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.063 | 355.700 | 1.000 | 0.063 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.093ms; replica.apply-delta 0.065ms; replica.apply-delta 0.063ms; replica.apply-delta 0.050ms; replica.apply-delta 0.050ms |
| 3aab28372bb0656b0000000000065471 | 355.741 | 0.186 | n/a | 0.000 | 355.474 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.081 | 355.660 | 1.000 | 0.081 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.093ms; replica.apply-delta 0.065ms; replica.apply-delta 0.063ms; replica.apply-delta 0.050ms; replica.apply-delta 0.050ms |
| 3aab28372bb0656b0000000000065473 | 355.732 | 0.176 | n/a | 0.000 | 355.451 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.104 | 355.627 | 1.000 | 0.104 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.093ms; replica.apply-delta 0.065ms; replica.apply-delta 0.063ms; replica.apply-delta 0.050ms; replica.apply-delta 0.050ms |
| 3aab28372bb0656b0000000000065472 | 355.729 | 0.177 | n/a | 0.000 | 355.461 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.091 | 355.639 | 1.000 | 0.091 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.093ms; replica.apply-delta 0.065ms; replica.apply-delta 0.063ms; replica.apply-delta 0.050ms; replica.apply-delta 0.050ms |
| 0e9774dbdab5b1e6000000000005afb2 | 276.692 | 0.146 | n/a | 0.000 | 276.540 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 276.687 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e6000000000005afc2 | 275.246 | 0.059 | n/a | 0.000 | 275.186 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.245 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e6000000000005afc1 | 275.219 | 0.015 | n/a | 0.000 | 275.203 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 275.218 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 0e9774dbdab5b1e6000000000005afbf | 275.215 | 0.045 | n/a | 0.000 | 275.167 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.213 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / baseline / read (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.055 | 0.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.052 | 0.955 | 0.002 |
| p99 | 0.055 | 0.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.052 | 0.955 | 0.002 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e9774dbdab5b1e6000000000000d307 | 0.055 | 0.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.052 | 0.955 | 0.002 | node-14/thread-4/reader.execute | none observed |

## P5 / sweep / read (22 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 2.618 | 2.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 2.574 | 0.989 | 0.024 |
| p99 | 3.257 | 3.085 | n/a | 0.876 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.072 | 3.250 | 0.998 | 0.072 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3a4e248b36ddbb40000000000000173 | 3.257 | 2.652 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 3.250 | 0.998 | 0.008 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000174 | 3.186 | 2.572 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.170 | 0.995 | 0.016 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000175 | 3.104 | 2.488 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.086 | 0.994 | 0.018 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000313 | 3.094 | 3.085 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 3.085 | 0.997 | 0.008 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000176 | 3.032 | 2.410 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.008 | 0.992 | 0.024 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000314 | 3.017 | 2.989 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 2.989 | 0.991 | 0.027 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000177 | 2.957 | 2.337 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 2.935 | 0.992 | 0.022 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000315 | 2.936 | 2.906 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 2.906 | 0.990 | 0.030 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000316 | 2.859 | 2.827 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 2.827 | 0.989 | 0.032 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000317 | 2.779 | 2.745 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 2.745 | 0.988 | 0.035 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000318 | 2.691 | 2.650 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 2.650 | 0.985 | 0.041 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000178 | 2.618 | 1.976 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 2.574 | 0.983 | 0.043 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000319 | 2.615 | 2.572 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 2.572 | 0.983 | 0.044 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb4000000000000031a | 2.424 | 2.352 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.072 | 2.352 | 0.970 | 0.072 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000179 | 2.389 | 1.761 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 2.360 | 0.988 | 0.029 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000293 | 2.312 | 1.427 | n/a | 0.876 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 2.302 | 0.996 | 0.010 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000294 | 2.245 | 1.352 | n/a | 0.876 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.228 | 0.992 | 0.017 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb400000000000002e3 | 2.237 | 2.229 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 2.229 | 0.996 | 0.008 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb4000000000000017a | 2.222 | 1.594 | n/a | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 2.192 | 0.986 | 0.030 | node-14/thread-6/replica.pull-at | none observed |
| c3a4e248b36ddbb40000000000000003 | 2.219 | 2.163 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 2.163 | 0.975 | 0.056 | node-14/thread-6/replica.pull-at | none observed |

## P3 / outside-phases / read (34 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.210 | 0.054 | n/a | 0.000 | 0.000 | 0.961 | 200.967 | 0.021 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.098 | 0.054 | 0.000 | 0.098 |
| p99 | 204.225 | 1.135 | n/a | 0.000 | 0.000 | 4.147 | 201.923 | 17.183 | 0.000 | 0.331 | 0.000 | n/a | n/a | 0.628 | 1.135 | 0.013 | 0.628 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000077 | 204.225 | 0.057 | n/a | 0.000 | 0.000 | 2.156 | 201.711 | 0.019 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.129 | 0.057 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c70200000000000000a3 | 203.455 | 0.051 | n/a | 0.000 | 0.000 | 1.660 | 201.338 | 0.022 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.239 | 0.051 | 0.000 | 0.239 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000005f | 203.115 | 0.055 | n/a | 0.000 | 0.000 | 0.811 | 201.923 | 0.043 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.097 | 0.055 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c70200000000000000a4 | 203.087 | 0.042 | n/a | 0.000 | 0.000 | 0.955 | 201.727 | 0.028 | 0.000 | 0.256 | 0.000 | n/a | n/a | 0.081 | 0.042 | 0.000 | 0.081 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c702000000000000005b | 202.963 | 0.042 | n/a | 0.000 | 0.000 | 1.088 | 201.565 | 0.024 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.106 | 0.042 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000006 | 202.943 | 0.137 | n/a | 0.000 | 0.000 | 1.223 | 201.167 | 0.058 | 0.000 | 0.253 | 0.000 | n/a | n/a | 0.105 | 0.137 | 0.001 | 0.105 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000ca | 202.828 | 0.044 | n/a | 0.000 | 0.000 | 0.870 | 201.609 | 0.047 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.077 | 0.044 | 0.000 | 0.077 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c702000000000000005c | 202.768 | 0.047 | n/a | 0.000 | 0.000 | 1.112 | 201.317 | 0.016 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.078 | 0.047 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000007 | 202.754 | 0.045 | n/a | 0.000 | 0.000 | 1.074 | 201.313 | 0.037 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.167 | 0.045 | 0.000 | 0.167 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000007e | 202.748 | 0.062 | n/a | 0.000 | 0.000 | 0.959 | 201.356 | 0.018 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.131 | 0.062 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000009e | 202.673 | 0.038 | n/a | 0.000 | 0.000 | 1.017 | 201.344 | 0.019 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000005 | 202.516 | 0.054 | n/a | 0.000 | 0.000 | 1.049 | 200.988 | 0.014 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.260 | 0.054 | 0.000 | 0.260 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000079 | 202.482 | 0.045 | n/a | 0.000 | 0.000 | 1.087 | 201.097 | 0.019 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.098 | 0.045 | 0.000 | 0.098 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000c8 | 202.427 | 0.041 | n/a | 0.000 | 0.000 | 0.699 | 201.234 | 0.032 | 0.000 | 0.331 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c70200000000000000c9 | 202.378 | 0.047 | n/a | 0.000 | 0.000 | 0.740 | 201.361 | 0.060 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.077 | 0.047 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c7020000000000000081 | 202.366 | 0.073 | n/a | 0.000 | 0.000 | 1.141 | 200.810 | 0.017 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.196 | 0.073 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000009f | 202.237 | 0.056 | n/a | 0.000 | 0.000 | 0.872 | 201.000 | 0.023 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.113 | 0.056 | 0.000 | 0.113 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000a1 | 202.210 | 0.056 | n/a | 0.000 | 0.000 | 0.868 | 201.049 | 0.018 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.087 | 0.056 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000a2 | 202.144 | 0.056 | n/a | 0.000 | 0.000 | 0.905 | 200.905 | 0.021 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.121 | 0.056 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c7020000000000000083 | 201.985 | 0.042 | n/a | 0.000 | 0.000 | 0.842 | 200.870 | 0.018 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.082 | 0.042 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |

## P3 / outside-phases / internal (23 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 292.517 | 3.313 | n/a | 0.000 | 0.000 | 0.894 | 285.039 | 0.023 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.146 | 3.313 | 0.012 | 0.146 |
| p99 | 1014.590 | 11.022 | n/a | 0.000 | 0.000 | 10.896 | 1005.425 | 0.512 | 14.226 | 0.360 | 0.000 | n/a | n/a | 1.255 | 11.022 | 0.448 | 1.255 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000017 | 1014.590 | 0.162 | n/a | 0.000 | 0.000 | 10.896 | 1001.882 | 0.036 | 0.000 | 0.360 | 0.000 | n/a | n/a | 1.255 | 0.162 | 0.000 | 1.255 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000019 | 1007.876 | 0.128 | n/a | 0.000 | 0.000 | 0.949 | 1005.425 | 0.012 | 0.000 | 0.191 | 0.000 | n/a | n/a | 1.170 | 0.128 | 0.000 | 1.170 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e880000000000000082 | 1005.470 | 3.313 | n/a | 0.000 | 0.000 | 1.060 | 1000.865 | 0.025 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.103 | 3.313 | 0.003 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e880000000000000018 | 1004.445 | 0.129 | n/a | 0.000 | 0.000 | 1.079 | 1001.800 | 0.018 | 0.000 | 0.201 | 0.000 | n/a | n/a | 1.218 | 0.129 | 0.000 | 1.218 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e880000000000000053 | 1004.181 | 0.193 | n/a | 0.000 | 0.000 | 1.095 | 1001.500 | 0.048 | 0.000 | 0.192 | 0.000 | n/a | n/a | 1.154 | 0.193 | 0.000 | 1.154 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000099 | 1002.782 | 0.113 | n/a | 0.000 | 0.000 | 0.588 | 1000.813 | 0.012 | 0.000 | 0.088 | 0.000 | n/a | n/a | 1.167 | 0.113 | 0.000 | 1.167 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e880000000000000052 | 717.487 | 3.181 | n/a | 0.000 | 0.000 | 0.894 | 713.026 | 0.040 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.181 | 3.181 | 0.004 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e880000000000000080 | 452.056 | 3.955 | n/a | 0.000 | 0.000 | 0.627 | 447.084 | 0.186 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.149 | 3.955 | 0.009 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000062 | 411.736 | 3.580 | n/a | 0.000 | 0.000 | 0.810 | 407.060 | 0.016 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.101 | 3.580 | 0.009 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e880000000000000065 | 390.761 | 2.544 | n/a | 0.000 | 0.000 | 0.869 | 387.111 | 0.023 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.094 | 2.544 | 0.007 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e88000000000000006a | 334.388 | 2.024 | n/a | 0.000 | 0.000 | 1.364 | 330.787 | 0.021 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.066 | 2.024 | 0.006 | 0.066 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000050 | 292.517 | 11.022 | n/a | 0.000 | 0.000 | 1.370 | 265.607 | 0.097 | 13.441 | 0.165 | 0.000 | n/a | n/a | 0.814 | 11.022 | 0.038 | 0.814 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e880000000000000068 | 291.046 | 5.089 | n/a | 0.000 | 0.000 | 0.714 | 285.039 | 0.023 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.088 | 5.089 | 0.017 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e880000000000000060 | 231.992 | 2.813 | n/a | 0.000 | 0.000 | 0.911 | 228.050 | 0.020 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.081 | 2.813 | 0.012 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e880000000000000083 | 201.615 | 6.546 | n/a | 0.000 | 0.000 | 0.833 | 193.936 | 0.022 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.182 | 6.546 | 0.032 | 0.182 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e88000000000000005f | 191.129 | 8.543 | n/a | 0.000 | 0.000 | 1.068 | 181.193 | 0.024 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.146 | 8.543 | 0.045 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000063 | 182.281 | 5.723 | n/a | 0.000 | 0.000 | 1.423 | 174.404 | 0.512 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.092 | 5.723 | 0.031 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e88000000000000007f | 128.745 | 5.886 | n/a | 0.000 | 0.000 | 2.768 | 119.588 | 0.024 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.369 | 5.886 | 0.046 | 0.369 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000067 | 65.154 | 4.928 | n/a | 0.000 | 0.000 | 0.821 | 59.204 | 0.024 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.080 | 4.928 | 0.076 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e880000000000000096 | 33.520 | 1.807 | n/a | 0.000 | 0.000 | 0.539 | 16.800 | 0.009 | 14.226 | 0.050 | 0.000 | n/a | n/a | 0.088 | 1.807 | 0.054 | 0.088 | gw-r/thread--1/jdk.GCPhasePause | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 399.718 | 2.236 | n/a | 0.000 | 0.000 | 0.984 | 396.193 | 0.030 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.133 | 2.236 | 0.005 | 0.133 |
| p99 | 635.283 | 13.691 | n/a | 5.159 | 0.000 | 1.418 | 630.327 | 0.676 | 0.000 | 0.192 | 0.000 | n/a | n/a | 1.008 | 18.850 | 0.064 | 1.008 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e88000000000000001c | 635.283 | 2.866 | n/a | 0.000 | 0.000 | 1.227 | 630.327 | 0.676 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.133 | 2.866 | 0.005 | 0.133 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e88000000000000001d | 576.715 | 2.163 | n/a | 0.000 | 0.000 | 1.418 | 572.725 | 0.035 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.181 | 2.163 | 0.004 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e88000000000000001f | 399.718 | 2.236 | n/a | 0.000 | 0.000 | 0.984 | 396.193 | 0.030 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.106 | 2.236 | 0.006 | 0.106 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e88000000000000001a | 292.592 | 13.691 | n/a | 5.159 | 0.000 | 0.835 | 271.749 | 0.029 | 0.000 | 0.121 | 0.000 | n/a | n/a | 1.008 | 18.850 | 0.064 | 1.008 | gw-r/thread-47/journal/page | none observed |

## P3 / baseline / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 387.350 | 2.335 | n/a | 0.000 | 0.000 | 0.811 | 382.112 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.098 | 2.335 | 0.008 | 0.098 |
| p99 | 789.648 | 5.025 | n/a | 0.000 | 0.000 | 1.062 | 786.875 | 0.017 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.291 | 5.025 | 0.011 | 0.291 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000023 | 789.648 | 1.685 | n/a | 0.000 | 0.000 | 0.868 | 786.875 | 0.015 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.098 | 1.685 | 0.002 | 0.098 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e880000000000000020 | 611.479 | 5.025 | n/a | 0.000 | 0.000 | 0.689 | 605.439 | 0.014 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.180 | 5.025 | 0.008 | 0.180 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e880000000000000021 | 387.350 | 4.006 | n/a | 0.000 | 0.000 | 0.811 | 382.112 | 0.015 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.291 | 4.006 | 0.010 | 0.291 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000024 | 213.812 | 2.335 | n/a | 0.000 | 0.000 | 1.062 | 210.120 | 0.017 | 0.000 | 0.204 | 0.000 | n/a | n/a | 0.075 | 2.335 | 0.011 | 0.075 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 912.609 | 2.404 | n/a | 0.000 | 0.000 | 0.906 | 909.064 | 0.023 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.097 | 2.404 | 0.003 | 0.097 |
| p99 | 1025.801 | 6.078 | n/a | 0.000 | 0.000 | 3.420 | 1020.462 | 0.118 | 0.000 | 0.209 | 0.000 | n/a | n/a | 1.262 | 6.078 | 0.072 | 1.262 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000029 | 1025.801 | 0.425 | n/a | 0.000 | 0.000 | 3.420 | 1020.462 | 0.023 | 0.000 | 0.209 | 0.000 | n/a | n/a | 1.262 | 0.425 | 0.000 | 1.262 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e880000000000000027 | 912.609 | 2.404 | n/a | 0.000 | 0.000 | 0.762 | 909.064 | 0.118 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.097 | 2.404 | 0.003 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000026 | 84.722 | 6.078 | n/a | 0.000 | 0.000 | 0.906 | 77.517 | 0.014 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.096 | 6.078 | 0.072 | 0.096 | gw-r/thread-49/journal/page | none observed |

## P3 / L4 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.613 | 4.535 | n/a | 0.000 | 0.000 | 1.670 | 363.811 | 0.062 | 0.000 | 0.340 | 0.000 | n/a | n/a | 0.148 | 4.535 | 0.012 | 0.148 |
| p99 | 1004.537 | 14.862 | n/a | 0.000 | 0.000 | 2.742 | 1002.277 | 0.109 | 0.000 | 0.386 | 0.000 | n/a | n/a | 1.134 | 14.862 | 0.546 | 1.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000030 | 1004.537 | 0.146 | n/a | 0.000 | 0.000 | 0.553 | 1002.277 | 0.087 | 0.000 | 0.340 | 0.000 | n/a | n/a | 1.134 | 0.146 | 0.000 | 1.134 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e88000000000000002e | 564.665 | 3.252 | n/a | 0.000 | 0.000 | 1.670 | 559.234 | 0.021 | 0.000 | 0.386 | 0.000 | n/a | n/a | 0.101 | 3.252 | 0.006 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e88000000000000002d | 369.613 | 4.535 | n/a | 0.000 | 0.000 | 0.994 | 363.811 | 0.018 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.148 | 4.535 | 0.012 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e88000000000000002b | 36.801 | 9.255 | n/a | 0.000 | 0.000 | 1.842 | 25.146 | 0.109 | 0.000 | 0.342 | 0.000 | n/a | n/a | 0.107 | 9.255 | 0.251 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e88000000000000002a | 27.237 | 14.862 | n/a | 0.000 | 0.000 | 2.742 | 9.037 | 0.062 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.296 | 14.862 | 0.546 | 0.296 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / L16 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 361.299 | 2.798 | n/a | 0.000 | 0.000 | 1.285 | 357.632 | 0.026 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.100 | 2.798 | 0.007 | 0.100 |
| p99 | 868.156 | 13.692 | n/a | 0.000 | 0.000 | 3.808 | 864.839 | 0.059 | 0.000 | 0.216 | 0.000 | n/a | n/a | 0.430 | 13.692 | 0.470 | 0.430 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000032 | 868.156 | 2.148 | n/a | 0.000 | 0.000 | 0.897 | 864.839 | 0.026 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.096 | 2.148 | 0.002 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e880000000000000036 | 722.470 | 2.798 | n/a | 0.000 | 0.000 | 1.285 | 718.011 | 0.059 | 0.000 | 0.216 | 0.000 | n/a | n/a | 0.100 | 2.798 | 0.004 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e880000000000000033 | 361.299 | 2.400 | n/a | 0.000 | 0.000 | 1.047 | 357.632 | 0.017 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.089 | 2.400 | 0.007 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000035 | 42.868 | 4.108 | n/a | 0.000 | 0.000 | 1.367 | 36.794 | 0.028 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.430 | 4.108 | 0.096 | 0.430 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e880000000000000031 | 29.103 | 13.692 | n/a | 0.000 | 0.000 | 3.808 | 11.247 | 0.022 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.188 | 13.692 | 0.470 | 0.188 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 441.147 | 2.496 | n/a | 0.000 | 0.000 | 0.858 | 437.663 | 0.018 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.100 | 2.496 | 0.006 | 0.100 |
| p99 | 851.739 | 11.774 | n/a | 6.649 | 0.000 | 1.430 | 847.249 | 0.039 | 18.221 | 4.264 | 0.000 | n/a | n/a | 0.335 | 18.423 | 0.031 | 0.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e88000000000000003c | 851.739 | 2.718 | n/a | 0.000 | 0.000 | 1.430 | 847.249 | 0.033 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.112 | 2.718 | 0.003 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000038 | 598.648 | 11.774 | n/a | 6.649 | 0.000 | 1.075 | 556.312 | 0.018 | 18.221 | 4.264 | 0.000 | n/a | n/a | 0.335 | 18.423 | 0.031 | 0.335 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e88000000000000003a | 441.147 | 2.496 | n/a | 0.000 | 0.000 | 0.708 | 437.663 | 0.039 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.089 | 2.496 | 0.006 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e88000000000000003b | 112.451 | 2.265 | n/a | 0.000 | 0.000 | 0.858 | 109.093 | 0.017 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.100 | 2.265 | 0.020 | 0.100 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 312.864 | 2.392 | n/a | 0.000 | 0.000 | 1.715 | 308.506 | 0.034 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.139 | 2.392 | 0.009 | 0.139 |
| p99 | 834.995 | 7.605 | n/a | 0.000 | 0.000 | 4.099 | 825.251 | 0.329 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.232 | 7.605 | 0.015 | 0.232 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000040 | 834.995 | 7.605 | n/a | 0.000 | 0.000 | 1.451 | 825.251 | 0.329 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.232 | 7.605 | 0.009 | 0.232 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e880000000000000041 | 375.250 | 2.330 | n/a | 0.000 | 0.000 | 1.715 | 370.799 | 0.150 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.101 | 2.330 | 0.006 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000042 | 312.864 | 2.392 | n/a | 0.000 | 0.000 | 1.674 | 308.506 | 0.015 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.166 | 2.392 | 0.008 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e880000000000000045 | 298.308 | 4.356 | n/a | 0.000 | 0.000 | 4.099 | 289.491 | 0.025 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.139 | 4.356 | 0.015 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e88000000000000003e | 163.790 | 2.296 | n/a | 0.000 | 0.000 | 2.659 | 158.553 | 0.034 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.089 | 2.296 | 0.014 | 0.089 | gw-r/thread-53/journal/page | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 997.354 | 2.660 | n/a | 0.000 | 0.000 | 0.792 | 992.004 | 0.025 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.114 | 2.660 | 0.003 | 0.114 |
| p99 | 1002.997 | 3.821 | n/a | 0.000 | 0.000 | 2.435 | 997.922 | 0.064 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.221 | 3.821 | 0.004 | 0.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000047 | 1002.997 | 3.821 | n/a | 0.000 | 0.000 | 0.792 | 997.922 | 0.064 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.221 | 3.821 | 0.004 | 0.221 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e880000000000000046 | 997.354 | 2.660 | n/a | 0.000 | 0.000 | 2.435 | 992.004 | 0.025 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.114 | 2.660 | 0.003 | 0.114 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 354.727 | 3.897 | n/a | 0.000 | 0.000 | 0.962 | 349.955 | 0.021 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.191 | 3.897 | 0.010 | 0.191 |
| p99 | 992.826 | 6.063 | n/a | 0.000 | 0.000 | 1.138 | 986.938 | 0.075 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.835 | 6.063 | 0.025 | 0.835 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000048 | 992.826 | 4.552 | n/a | 0.000 | 0.000 | 1.011 | 986.938 | 0.018 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.191 | 4.552 | 0.005 | 0.191 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e88000000000000004d | 400.474 | 3.897 | n/a | 0.000 | 0.000 | 0.951 | 394.612 | 0.075 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.835 | 3.897 | 0.010 | 0.835 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e88000000000000004b | 354.727 | 3.469 | n/a | 0.000 | 0.000 | 0.962 | 349.955 | 0.024 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.191 | 3.469 | 0.010 | 0.191 | gw-r/thread-69/journal/page | none observed |
| 23c0a842edb84e880000000000000049 | 241.371 | 6.063 | n/a | 0.000 | 0.000 | 1.138 | 233.852 | 0.021 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.200 | 6.063 | 0.025 | 0.200 | gw-r/thread-53/journal/page | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 981.532 | 3.383 | n/a | 0.000 | 0.000 | 1.060 | 975.007 | 0.031 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.125 | 3.383 | 0.003 | 0.125 |
| p99 | 992.729 | 5.015 | n/a | 0.000 | 0.000 | 1.072 | 987.768 | 0.231 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.296 | 5.015 | 0.005 | 0.296 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e88000000000000004e | 992.729 | 3.383 | n/a | 0.000 | 0.000 | 1.072 | 987.768 | 0.031 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.296 | 3.383 | 0.003 | 0.296 | gw-r/thread-69/journal/page | none observed |
| 23c0a842edb84e88000000000000004f | 981.532 | 5.015 | n/a | 0.000 | 0.000 | 1.060 | 975.007 | 0.231 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.125 | 5.015 | 0.005 | 0.125 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h1 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 456.411 | 3.235 | n/a | 0.000 | 0.000 | 1.007 | 445.772 | 0.052 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.106 | 3.235 | 0.013 | 0.106 |
| p99 | 944.289 | 8.829 | n/a | 0.000 | 0.000 | 1.376 | 941.104 | 2.084 | 0.000 | 0.510 | 0.000 | n/a | n/a | 0.226 | 8.829 | 0.073 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000055 | 944.289 | 2.231 | n/a | 0.000 | 0.000 | 0.710 | 941.104 | 0.025 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.106 | 2.231 | 0.002 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e880000000000000056 | 579.295 | 7.580 | n/a | 0.000 | 0.000 | 1.286 | 569.979 | 0.052 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.226 | 7.580 | 0.013 | 0.226 | gw-r/thread-69/journal/page | none observed |
| 23c0a842edb84e880000000000000058 | 456.411 | 8.829 | n/a | 0.000 | 0.000 | 1.376 | 445.772 | 0.097 | 0.000 | 0.225 | 0.000 | n/a | n/a | 0.112 | 8.829 | 0.019 | 0.112 | gw-r/thread-69/journal/page | none observed |
| 23c0a842edb84e880000000000000054 | 44.549 | 3.235 | n/a | 0.000 | 0.000 | 1.007 | 37.618 | 2.084 | 0.000 | 0.510 | 0.000 | n/a | n/a | 0.095 | 3.235 | 0.073 | 0.095 | gw-r/thread-69/journal/page | none observed |

## P3 / grow3 / internal (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 99.370 | 8.448 | n/a | 1.163 | 0.000 | 0.751 | 93.437 | 0.020 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.286 | 9.611 | 0.078 | 0.286 |
| p99 | 1222.903 | 98.372 | n/a | 4.717 | 0.000 | 2.228 | 1088.405 | 0.033 | 34.852 | 0.487 | 0.000 | n/a | n/a | 3.054 | 102.699 | 0.747 | 3.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e88000000000000005b | 1222.903 | 90.988 | n/a | 4.717 | 0.000 | 0.751 | 1088.405 | 0.024 | 34.852 | 0.111 | 0.000 | n/a | n/a | 3.054 | 95.705 | 0.078 | 3.054 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e88000000000000005e | 202.267 | 98.372 | n/a | 4.327 | 0.000 | 0.978 | 96.455 | 0.020 | 0.000 | 0.096 | 0.000 | n/a | n/a | 2.020 | 102.699 | 0.508 | 2.020 | gw-r/thread-47/journal/page | none observed |
| 23c0a842edb84e880000000000000059 | 99.370 | 3.047 | n/a | 0.000 | 0.000 | 2.228 | 93.437 | 0.033 | 0.000 | 0.487 | 0.000 | n/a | n/a | 0.138 | 3.047 | 0.031 | 0.138 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e88000000000000005d | 12.863 | 8.448 | n/a | 1.163 | 0.000 | 0.731 | 2.212 | 0.009 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.286 | 9.611 | 0.747 | 0.286 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 512.793 | 4.088 | n/a | 0.000 | 0.000 | 0.936 | 508.061 | 0.017 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.129 | 4.088 | 0.036 | 0.129 |
| p99 | 841.620 | 117.290 | n/a | 4.026 | 0.000 | 1.201 | 731.553 | 0.033 | 25.598 | 0.191 | 0.000 | n/a | n/a | 3.370 | 121.317 | 0.306 | 3.370 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000076 | 841.620 | 117.290 | n/a | 4.026 | 0.000 | 0.936 | 690.286 | 0.016 | 25.598 | 0.097 | 0.000 | n/a | n/a | 3.370 | 121.317 | 0.144 | 3.370 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e880000000000000075 | 739.196 | 5.467 | n/a | 0.914 | 0.000 | 0.908 | 731.553 | 0.033 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.129 | 6.381 | 0.009 | 0.129 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e880000000000000073 | 677.141 | 2.916 | n/a | 0.000 | 0.000 | 1.002 | 672.997 | 0.018 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.078 | 2.916 | 0.004 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000070 | 512.793 | 3.371 | n/a | 0.000 | 0.000 | 1.080 | 508.061 | 0.018 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.157 | 3.371 | 0.007 | 0.157 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e880000000000000072 | 122.628 | 4.455 | n/a | 0.000 | 0.000 | 0.772 | 117.207 | 0.012 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.074 | 4.455 | 0.036 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 23c0a842edb84e88000000000000006e | 13.378 | 4.088 | n/a | 0.000 | 0.000 | 1.201 | 7.701 | 0.017 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.226 | 4.088 | 0.306 | 0.226 | gw-r/thread-53/journal/page | none observed |
| 23c0a842edb84e88000000000000006d | 12.233 | 3.194 | n/a | 0.000 | 0.000 | 0.633 | 8.261 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.109 | 3.194 | 0.261 | 0.109 | gw-r/thread-48/journal/page | none observed |

## P3 / grow10 / internal (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 128.604 | 89.544 | n/a | 3.518 | 0.000 | 0.852 | 16.873 | 0.012 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.651 | 92.919 | 0.723 | 1.651 |
| p99 | 191.242 | 112.667 | n/a | 5.422 | 0.000 | 2.237 | 59.903 | 0.031 | 11.790 | 0.108 | 0.000 | n/a | n/a | 4.341 | 117.336 | 0.885 | 4.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e88000000000000007b | 191.242 | 111.595 | n/a | 5.422 | 0.000 | 0.833 | 59.903 | 0.008 | 11.790 | 0.040 | 0.000 | n/a | n/a | 1.651 | 117.017 | 0.612 | 1.651 | node-14/thread-2/replica.fetch-feed | none observed |
| 23c0a842edb84e880000000000000078 | 139.356 | 112.667 | n/a | 4.670 | 0.000 | 0.777 | 16.873 | 0.012 | 0.000 | 0.016 | 0.000 | n/a | n/a | 4.341 | 117.336 | 0.842 | 4.341 | node-14/thread-2/replica.fetch-feed | none observed |
| 23c0a842edb84e88000000000000007d | 137.828 | 77.677 | n/a | 3.048 | 0.000 | 0.852 | 53.940 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 2.266 | 80.725 | 0.586 | 2.266 | node-14/thread-2/replica.fetch-feed | none observed |
| 23c0a842edb84e88000000000000007e | 128.604 | 89.544 | n/a | 3.374 | 0.000 | 0.797 | 33.289 | 0.031 | 0.000 | 0.108 | 0.000 | n/a | n/a | 1.462 | 92.919 | 0.723 | 1.462 | node-14/thread-2/replica.fetch-feed | none observed |
| 23c0a842edb84e880000000000000079 | 115.779 | 98.729 | n/a | 3.791 | 0.000 | 2.237 | 9.238 | 0.027 | 0.000 | 0.016 | 0.000 | n/a | n/a | 1.741 | 102.521 | 0.885 | 1.741 | node-14/thread-2/replica.fetch-feed | none observed |
| 23c0a842edb84e88000000000000007a | 103.094 | 85.705 | n/a | 3.518 | 0.000 | 1.051 | 11.347 | 0.010 | 0.000 | 0.015 | 0.000 | n/a | n/a | 1.448 | 89.223 | 0.865 | 1.448 | node-14/thread-2/replica.fetch-feed | none observed |
| 23c0a842edb84e88000000000000007c | 4.479 | 2.437 | n/a | 0.000 | 0.000 | 0.862 | 1.088 | 0.013 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.063 | 2.437 | 0.544 | 0.063 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 404.936 | 4.090 | n/a | 0.000 | 0.000 | 1.008 | 380.840 | 0.037 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.175 | 4.090 | 0.010 | 0.175 |
| p99 | 1005.003 | 21.672 | n/a | 1.040 | 0.000 | 1.402 | 997.845 | 0.204 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.277 | 22.712 | 0.327 | 0.277 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e88000000000000008a | 1005.003 | 5.801 | n/a | 0.000 | 0.000 | 0.934 | 997.845 | 0.029 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.272 | 5.801 | 0.006 | 0.272 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e88000000000000008c | 568.156 | 9.306 | n/a | 0.000 | 0.000 | 1.402 | 556.952 | 0.066 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.277 | 9.306 | 0.016 | 0.277 | gw-r/thread-49/journal/page | none observed |
| 23c0a842edb84e88000000000000008b | 425.091 | 4.090 | n/a | 0.000 | 0.000 | 0.602 | 420.186 | 0.016 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.096 | 4.090 | 0.010 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 23c0a842edb84e880000000000000085 | 404.936 | 21.672 | n/a | 1.040 | 0.000 | 1.008 | 380.840 | 0.037 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.202 | 22.712 | 0.056 | 0.202 | gw-r/thread-69/journal/page | none observed |
| 23c0a842edb84e880000000000000088 | 382.296 | 3.090 | n/a | 0.000 | 0.000 | 1.223 | 377.452 | 0.174 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.175 | 3.090 | 0.008 | 0.175 | gw-r/thread-50/journal/page | none observed |
| 23c0a842edb84e880000000000000087 | 11.758 | 3.847 | n/a | 0.000 | 0.000 | 1.054 | 6.479 | 0.204 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.093 | 3.847 | 0.327 | 0.093 | gw-r/thread-69/journal/page | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 586.821 | 5.916 | n/a | 0.000 | 0.000 | 4.856 | 578.505 | 0.033 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.233 | 5.916 | 0.010 | 0.233 |
| p99 | 849.390 | 7.972 | n/a | 0.000 | 0.000 | 5.345 | 841.448 | 0.067 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.845 | 7.972 | 0.019 | 0.845 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000091 | 849.390 | 2.375 | n/a | 0.000 | 0.000 | 5.345 | 841.448 | 0.014 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.112 | 2.375 | 0.003 | 0.112 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e88000000000000008e | 586.821 | 5.916 | n/a | 0.000 | 0.000 | 1.330 | 578.505 | 0.067 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.845 | 5.916 | 0.010 | 0.845 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e88000000000000008f | 417.702 | 7.972 | n/a | 0.000 | 0.000 | 4.856 | 404.476 | 0.033 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.233 | 7.972 | 0.019 | 0.233 | gw-r/thread-50/journal/page | none observed |

## P3 / sweep / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.560 | 2.396 | n/a | 0.000 | 0.000 | 0.878 | 6.875 | 0.014 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.091 | 2.396 | 0.227 | 0.091 |
| p99 | 16.210 | 2.639 | n/a | 0.000 | 0.000 | 1.103 | 13.543 | 0.018 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.102 | 2.639 | 0.390 | 0.102 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 23c0a842edb84e880000000000000094 | 16.210 | 1.907 | n/a | 0.000 | 0.000 | 0.616 | 13.543 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.070 | 1.907 | 0.118 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 23c0a842edb84e880000000000000093 | 10.560 | 2.396 | n/a | 0.000 | 0.000 | 1.103 | 6.875 | 0.014 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.102 | 2.396 | 0.227 | 0.102 | gw-r/thread-69/gateway.admitted-work | none observed |
| 23c0a842edb84e880000000000000092 | 6.771 | 2.639 | n/a | 0.000 | 0.000 | 0.878 | 3.026 | 0.018 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.091 | 2.639 | 0.390 | 0.091 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.531 | 0.060 | n/a | 0.000 | 0.000 | 1.252 | 200.846 | 0.017 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.076 | 0.060 | 0.000 | 0.076 |
| p99 | 204.612 | 0.633 | n/a | 0.000 | 0.000 | 4.847 | 201.717 | 3.549 | 0.000 | 0.277 | 0.000 | n/a | n/a | 0.930 | 0.633 | 0.003 | 0.930 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c702000000000000000a | 204.612 | 0.268 | n/a | 0.000 | 0.000 | 2.301 | 200.951 | 0.019 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.930 | 0.268 | 0.001 | 0.930 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000000e | 204.407 | 0.040 | n/a | 0.000 | 0.000 | 2.282 | 201.717 | 0.025 | 0.000 | 0.277 | 0.000 | n/a | n/a | 0.066 | 0.040 | 0.000 | 0.066 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c7020000000000000008 | 203.911 | 0.076 | n/a | 0.000 | 0.000 | 2.006 | 201.434 | 0.017 | 0.000 | 0.254 | 0.000 | n/a | n/a | 0.124 | 0.076 | 0.000 | 0.124 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000010 | 203.557 | 0.033 | n/a | 0.000 | 0.000 | 2.418 | 200.846 | 0.033 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.067 | 0.033 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000000d | 202.715 | 0.633 | n/a | 0.000 | 0.000 | 0.906 | 200.917 | 0.016 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.104 | 0.633 | 0.003 | 0.104 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000000b | 202.531 | 0.060 | n/a | 0.000 | 0.000 | 1.026 | 201.131 | 0.016 | 0.000 | 0.183 | 0.000 | n/a | n/a | 0.115 | 0.060 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000011 | 177.136 | 0.051 | n/a | 0.000 | 0.000 | 1.039 | 175.737 | 0.029 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.074 | 0.051 | 0.000 | 0.074 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000000c | 170.942 | 0.060 | n/a | 0.000 | 0.000 | 1.252 | 169.408 | 0.016 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.076 | 0.060 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000000f | 123.713 | 0.053 | n/a | 0.000 | 0.000 | 1.154 | 122.284 | 0.016 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.071 | 0.053 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000009 | 122.139 | 0.073 | n/a | 0.000 | 0.000 | 4.847 | 113.274 | 3.549 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.255 | 0.073 | 0.001 | 0.255 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.969 | 0.070 | n/a | 0.000 | 0.000 | 1.521 | 201.432 | 0.114 | 0.000 | 0.242 | 0.000 | n/a | n/a | 0.085 | 0.070 | 0.001 | 0.085 |
| p99 | 222.493 | 0.272 | n/a | 0.000 | 0.000 | 2.608 | 219.819 | 1.083 | 0.000 | 0.477 | 0.000 | n/a | n/a | 0.525 | 0.272 | 0.001 | 0.525 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000013 | 222.493 | 0.272 | n/a | 0.000 | 0.000 | 1.521 | 219.819 | 0.114 | 0.000 | 0.242 | 0.000 | n/a | n/a | 0.525 | 0.272 | 0.001 | 0.525 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000012 | 202.969 | 0.036 | n/a | 0.000 | 0.000 | 0.856 | 201.432 | 0.091 | 0.000 | 0.477 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000014 | 126.498 | 0.070 | n/a | 0.000 | 0.000 | 2.608 | 122.516 | 1.083 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.085 | 0.070 | 0.001 | 0.085 | gw-r/thread-50/journal/page | none observed |

## P3 / L16 / read (4 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.987 | 0.047 | n/a | 0.000 | 0.000 | 1.207 | 201.370 | 0.026 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.117 | 0.047 | 0.000 | 0.117 |
| p99 | 203.157 | 0.071 | n/a | 0.000 | 0.000 | 1.398 | 201.437 | 8.766 | 0.000 | 0.220 | 0.000 | n/a | n/a | 0.141 | 0.071 | 0.001 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000021 | 203.157 | 0.047 | n/a | 0.000 | 0.000 | 1.398 | 201.370 | 0.047 | 0.000 | 0.220 | 0.000 | n/a | n/a | 0.075 | 0.047 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000022 | 203.042 | 0.059 | n/a | 0.000 | 0.000 | 1.207 | 201.437 | 0.025 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.141 | 0.059 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000020 | 202.987 | 0.038 | n/a | 0.000 | 0.000 | 1.250 | 201.373 | 0.026 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.123 | 0.038 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000001e | 59.884 | 0.071 | n/a | 0.000 | 0.000 | 1.109 | 49.729 | 8.766 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.117 | 0.071 | 0.001 | 0.117 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / read (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 203.175 | 0.050 | n/a | 0.000 | 0.000 | 1.092 | 201.547 | 0.051 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.079 | 0.050 | 0.000 | 0.079 |
| p99 | 206.460 | 0.072 | n/a | 0.000 | 0.000 | 4.839 | 204.029 | 33.547 | 0.000 | 0.387 | 0.000 | n/a | n/a | 0.182 | 0.072 | 0.001 | 0.182 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c702000000000000002c | 206.460 | 0.041 | n/a | 0.000 | 0.000 | 2.424 | 203.444 | 0.105 | 0.000 | 0.368 | 0.000 | n/a | n/a | 0.079 | 0.041 | 0.000 | 0.079 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000024 | 205.142 | 0.043 | n/a | 0.000 | 0.000 | 0.771 | 204.029 | 0.039 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.078 | 0.043 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000027 | 204.535 | 0.042 | n/a | 0.000 | 0.000 | 1.092 | 203.132 | 0.017 | 0.000 | 0.174 | 0.000 | n/a | n/a | 0.077 | 0.042 | 0.000 | 0.077 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000002b | 203.585 | 0.050 | n/a | 0.000 | 0.000 | 1.049 | 201.937 | 0.038 | 0.000 | 0.387 | 0.000 | n/a | n/a | 0.125 | 0.050 | 0.000 | 0.125 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000028 | 203.457 | 0.058 | n/a | 0.000 | 0.000 | 1.340 | 201.683 | 0.051 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.092 | 0.058 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c702000000000000002d | 203.175 | 0.041 | n/a | 0.000 | 0.000 | 1.605 | 201.271 | 0.022 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.078 | 0.041 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000025 | 203.100 | 0.050 | n/a | 0.000 | 0.000 | 1.006 | 201.547 | 0.128 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.182 | 0.050 | 0.000 | 0.182 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000002e | 172.759 | 0.058 | n/a | 0.000 | 0.000 | 1.092 | 170.473 | 0.908 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.081 | 0.058 | 0.000 | 0.081 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000026 | 126.115 | 0.072 | n/a | 0.000 | 0.000 | 2.427 | 89.949 | 33.547 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.079 | 0.072 | 0.001 | 0.079 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000002a | 99.183 | 0.062 | n/a | 0.000 | 0.000 | 0.896 | 98.086 | 0.011 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.088 | 0.062 | 0.001 | 0.088 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000023 | 53.131 | 0.053 | n/a | 0.000 | 0.000 | 4.839 | 42.617 | 5.331 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.073 | 0.053 | 0.001 | 0.073 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / read (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.583 | 0.062 | n/a | 0.000 | 0.000 | 1.000 | 201.051 | 0.033 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.099 | 0.062 | 0.000 | 0.099 |
| p99 | 207.831 | 4.658 | n/a | 0.000 | 0.000 | 2.993 | 206.619 | 12.888 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.193 | 4.658 | 0.031 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000036 | 207.831 | 0.054 | n/a | 0.000 | 0.000 | 0.923 | 206.619 | 0.018 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.088 | 0.054 | 0.000 | 0.088 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000034 | 204.373 | 0.048 | n/a | 0.000 | 0.000 | 2.993 | 201.051 | 0.020 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.098 | 0.048 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000031 | 203.787 | 0.099 | n/a | 0.000 | 0.000 | 1.867 | 201.455 | 0.033 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.167 | 0.099 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000030 | 203.774 | 0.050 | n/a | 0.000 | 0.000 | 0.672 | 202.542 | 0.102 | 0.000 | 0.263 | 0.000 | n/a | n/a | 0.145 | 0.050 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c7020000000000000038 | 202.588 | 0.038 | n/a | 0.000 | 0.000 | 0.874 | 201.391 | 0.043 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.076 | 0.038 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000032 | 202.583 | 0.044 | n/a | 0.000 | 0.000 | 0.794 | 201.339 | 0.029 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.099 | 0.044 | 0.000 | 0.099 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c702000000000000002f | 151.995 | 0.095 | n/a | 0.000 | 0.000 | 1.029 | 137.792 | 12.888 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.141 | 0.095 | 0.001 | 0.141 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000033 | 150.440 | 4.658 | n/a | 0.000 | 0.000 | 1.091 | 144.359 | 0.027 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.193 | 4.658 | 0.031 | 0.193 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000035 | 145.498 | 0.062 | n/a | 0.000 | 0.000 | 0.870 | 144.396 | 0.013 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.096 | 0.062 | 0.000 | 0.096 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000037 | 76.786 | 0.138 | n/a | 0.000 | 0.000 | 1.029 | 64.030 | 11.457 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.087 | 0.138 | 0.002 | 0.087 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000039 | 68.445 | 0.082 | n/a | 0.000 | 0.000 | 1.000 | 63.835 | 3.317 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.119 | 0.082 | 0.001 | 0.119 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.800 | 0.054 | n/a | 0.000 | 0.000 | 0.988 | 201.276 | 0.033 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.094 | 0.054 | 0.000 | 0.094 |
| p99 | 205.380 | 1.186 | n/a | 0.000 | 0.000 | 5.902 | 201.912 | 4.048 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.259 | 1.186 | 0.006 | 0.259 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000040 | 205.380 | 0.042 | n/a | 0.000 | 0.000 | 3.377 | 201.643 | 0.033 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000041 | 204.285 | 0.156 | n/a | 0.000 | 0.000 | 1.681 | 201.912 | 0.075 | 0.000 | 0.278 | 0.000 | n/a | n/a | 0.182 | 0.156 | 0.001 | 0.182 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c702000000000000003f | 203.482 | 1.186 | n/a | 0.000 | 0.000 | 0.940 | 200.921 | 0.020 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.259 | 1.186 | 0.006 | 0.259 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c702000000000000003b | 203.206 | 0.059 | n/a | 0.000 | 0.000 | 1.364 | 201.474 | 0.025 | 0.000 | 0.190 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c702000000000000003c | 203.195 | 0.052 | n/a | 0.000 | 0.000 | 1.574 | 201.276 | 0.021 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.093 | 0.052 | 0.000 | 0.093 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c7020000000000000042 | 202.800 | 0.054 | n/a | 0.000 | 0.000 | 0.917 | 201.484 | 0.079 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.088 | 0.054 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000003d | 202.703 | 0.052 | n/a | 0.000 | 0.000 | 0.970 | 201.392 | 0.046 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c702000000000000003a | 202.335 | 0.043 | n/a | 0.000 | 0.000 | 0.877 | 201.122 | 0.030 | 0.000 | 0.172 | 0.000 | n/a | n/a | 0.091 | 0.043 | 0.000 | 0.091 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c7020000000000000043 | 103.022 | 0.069 | n/a | 0.000 | 0.000 | 5.902 | 93.587 | 3.222 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.098 | 0.069 | 0.001 | 0.098 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c702000000000000003e | 100.771 | 0.078 | n/a | 0.000 | 0.000 | 0.988 | 95.426 | 4.048 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.100 | 0.078 | 0.001 | 0.100 | gw-r/thread-47/journal/page | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.277 | 0.052 | n/a | 0.000 | 0.000 | 1.042 | 201.075 | 0.030 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.087 | 0.052 | 0.000 | 0.087 |
| p99 | 204.653 | 0.115 | n/a | 0.000 | 0.000 | 1.652 | 203.209 | 4.228 | 0.000 | 0.303 | 0.000 | n/a | n/a | 0.154 | 0.115 | 0.001 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000049 | 204.653 | 0.039 | n/a | 0.000 | 0.000 | 1.170 | 203.209 | 0.017 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000046 | 203.258 | 0.068 | n/a | 0.000 | 0.000 | 1.652 | 201.241 | 0.040 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.121 | 0.068 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000004b | 203.097 | 0.115 | n/a | 0.000 | 0.000 | 1.416 | 201.228 | 0.023 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.154 | 0.115 | 0.001 | 0.154 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000044 | 203.063 | 0.044 | n/a | 0.000 | 0.000 | 0.968 | 201.708 | 0.025 | 0.000 | 0.233 | 0.000 | n/a | n/a | 0.085 | 0.044 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000045 | 202.865 | 0.052 | n/a | 0.000 | 0.000 | 0.889 | 201.458 | 0.075 | 0.000 | 0.303 | 0.000 | n/a | n/a | 0.087 | 0.052 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000004d | 202.277 | 0.036 | n/a | 0.000 | 0.000 | 0.931 | 201.048 | 0.030 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.079 | 0.036 | 0.000 | 0.079 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c7020000000000000047 | 202.152 | 0.036 | n/a | 0.000 | 0.000 | 0.813 | 201.075 | 0.020 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.071 | 0.036 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000004e | 171.909 | 0.088 | n/a | 0.000 | 0.000 | 1.284 | 166.081 | 4.228 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.085 | 0.088 | 0.001 | 0.085 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c702000000000000004c | 129.612 | 0.077 | n/a | 0.000 | 0.000 | 1.541 | 125.672 | 2.113 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.108 | 0.077 | 0.001 | 0.108 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c7020000000000000048 | 89.403 | 0.068 | n/a | 0.000 | 0.000 | 1.042 | 85.696 | 2.390 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.108 | 0.068 | 0.001 | 0.108 | gw-r/thread-49/journal/page | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.380 | 0.053 | n/a | 0.000 | 0.000 | 0.950 | 201.068 | 0.038 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.084 | 0.053 | 0.000 | 0.084 |
| p99 | 204.491 | 0.081 | n/a | 0.000 | 0.000 | 2.026 | 202.366 | 7.539 | 0.000 | 0.308 | 0.000 | n/a | n/a | 0.135 | 0.081 | 0.001 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000051 | 204.491 | 0.057 | n/a | 0.000 | 0.000 | 2.026 | 202.044 | 0.042 | 0.000 | 0.236 | 0.000 | n/a | n/a | 0.086 | 0.057 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000059 | 204.423 | 0.036 | n/a | 0.000 | 0.000 | 1.523 | 202.366 | 0.112 | 0.000 | 0.308 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000052 | 203.343 | 0.059 | n/a | 0.000 | 0.000 | 1.168 | 201.705 | 0.069 | 0.000 | 0.235 | 0.000 | n/a | n/a | 0.108 | 0.059 | 0.000 | 0.108 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000004f | 203.045 | 0.081 | n/a | 0.000 | 0.000 | 0.971 | 201.521 | 0.053 | 0.000 | 0.284 | 0.000 | n/a | n/a | 0.135 | 0.081 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000054 | 202.622 | 0.075 | n/a | 0.000 | 0.000 | 1.243 | 201.049 | 0.015 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.132 | 0.075 | 0.000 | 0.132 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000056 | 202.380 | 0.053 | n/a | 0.000 | 0.000 | 0.930 | 201.120 | 0.038 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.084 | 0.053 | 0.000 | 0.084 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000050 | 202.308 | 0.052 | n/a | 0.000 | 0.000 | 0.918 | 201.068 | 0.019 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.121 | 0.052 | 0.000 | 0.121 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000057 | 201.888 | 0.036 | n/a | 0.000 | 0.000 | 0.723 | 200.921 | 0.015 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.082 | 0.036 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000055 | 201.886 | 0.038 | n/a | 0.000 | 0.000 | 0.646 | 200.985 | 0.025 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.070 | 0.038 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000053 | 94.424 | 0.058 | n/a | 0.000 | 0.000 | 0.950 | 85.674 | 7.539 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.078 | 0.058 | 0.001 | 0.078 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000058 | 80.737 | 0.050 | n/a | 0.000 | 0.000 | 0.720 | 79.769 | 0.026 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.075 | 0.050 | 0.001 | 0.075 | gw-r/thread-52/journal/page | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.067 | 0.052 | n/a | 0.000 | 0.000 | 0.825 | 200.938 | 0.017 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.072 | 0.052 | 0.000 | 0.072 |
| p99 | 203.556 | 0.099 | n/a | 0.000 | 0.000 | 2.444 | 201.435 | 7.038 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.171 | 0.099 | 0.001 | 0.171 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000065 | 203.556 | 0.054 | n/a | 0.000 | 0.000 | 2.444 | 200.876 | 0.013 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.090 | 0.054 | 0.000 | 0.090 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c702000000000000006c | 203.317 | 0.038 | n/a | 0.000 | 0.000 | 1.608 | 201.410 | 0.015 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000069 | 202.793 | 0.054 | n/a | 0.000 | 0.000 | 0.887 | 201.435 | 0.078 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.159 | 0.054 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000060 | 202.635 | 0.052 | n/a | 0.000 | 0.000 | 1.011 | 201.276 | 0.015 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.088 | 0.052 | 0.000 | 0.088 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c7020000000000000066 | 202.350 | 0.041 | n/a | 0.000 | 0.000 | 0.755 | 201.243 | 0.109 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.071 | 0.041 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000061 | 202.201 | 0.099 | n/a | 0.000 | 0.000 | 0.804 | 200.981 | 0.017 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.171 | 0.099 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000067 | 202.067 | 0.071 | n/a | 0.000 | 0.000 | 0.825 | 200.921 | 0.021 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.102 | 0.071 | 0.000 | 0.102 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c7020000000000000064 | 202.055 | 0.038 | n/a | 0.000 | 0.000 | 0.885 | 200.904 | 0.017 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000062 | 202.025 | 0.041 | n/a | 0.000 | 0.000 | 0.817 | 200.943 | 0.016 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.071 | 0.041 | 0.000 | 0.071 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c702000000000000006a | 201.941 | 0.042 | n/a | 0.000 | 0.000 | 0.728 | 200.938 | 0.015 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000063 | 144.921 | 0.052 | n/a | 0.000 | 0.000 | 0.848 | 143.797 | 0.013 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.072 | 0.052 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000006b | 124.773 | 0.063 | n/a | 0.000 | 0.000 | 0.782 | 116.664 | 7.038 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.071 | 0.063 | 0.001 | 0.071 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c7020000000000000068 | 57.163 | 0.049 | n/a | 0.000 | 0.000 | 0.806 | 52.677 | 3.508 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.066 | 0.049 | 0.001 | 0.066 | gw-r/thread-48/journal/page | none observed |

## P3 / grow3 / read (7 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.685 | 0.058 | n/a | 0.000 | 0.000 | 0.998 | 200.979 | 0.126 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.109 | 0.058 | 0.000 | 0.109 |
| p99 | 238.018 | 0.586 | n/a | 0.000 | 0.000 | 4.518 | 203.176 | 130.866 | 17.295 | 0.449 | 0.000 | n/a | n/a | 0.240 | 0.586 | 0.004 | 0.240 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000074 | 238.018 | 0.586 | n/a | 0.000 | 0.000 | 0.998 | 88.082 | 130.866 | 17.295 | 0.083 | 0.000 | n/a | n/a | 0.109 | 0.586 | 0.002 | 0.109 | gw-r/thread-50/gateway.admission-wait | none observed |
| d12b1fb067b2c702000000000000006d | 208.826 | 0.279 | n/a | 0.000 | 0.000 | 4.518 | 203.176 | 0.165 | 0.000 | 0.449 | 0.000 | n/a | n/a | 0.240 | 0.279 | 0.001 | 0.240 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000072 | 202.812 | 0.039 | n/a | 0.000 | 0.000 | 1.141 | 201.350 | 0.017 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.084 | 0.039 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000071 | 202.685 | 0.057 | n/a | 0.000 | 0.000 | 0.912 | 201.332 | 0.126 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.130 | 0.057 | 0.000 | 0.130 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c7020000000000000073 | 202.245 | 0.058 | n/a | 0.000 | 0.000 | 0.963 | 200.979 | 0.024 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.098 | 0.058 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c7020000000000000070 | 201.770 | 0.051 | n/a | 0.000 | 0.000 | 0.819 | 200.689 | 0.014 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.087 | 0.051 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000076 | 133.008 | 0.543 | n/a | 0.000 | 0.000 | 1.052 | 120.039 | 11.096 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.112 | 0.543 | 0.004 | 0.112 | gw-r/thread-53/journal/page | none observed |

## P3 / p4h3 / read (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.370 | 0.056 | n/a | 0.000 | 0.000 | 0.952 | 201.026 | 0.040 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.094 | 0.056 | 0.000 | 0.094 |
| p99 | 203.739 | 0.071 | n/a | 0.000 | 0.000 | 1.410 | 202.107 | 10.870 | 0.000 | 0.594 | 0.000 | n/a | n/a | 0.155 | 0.071 | 0.001 | 0.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000088 | 203.739 | 0.057 | n/a | 0.000 | 0.000 | 0.841 | 202.107 | 0.041 | 0.000 | 0.594 | 0.000 | n/a | n/a | 0.100 | 0.057 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000093 | 203.258 | 0.035 | n/a | 0.000 | 0.000 | 1.410 | 201.487 | 0.043 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.083 | 0.035 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000091 | 202.983 | 0.056 | n/a | 0.000 | 0.000 | 0.952 | 201.663 | 0.024 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.094 | 0.056 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c702000000000000008d | 202.967 | 0.063 | n/a | 0.000 | 0.000 | 1.089 | 201.451 | 0.036 | 0.000 | 0.189 | 0.000 | n/a | n/a | 0.138 | 0.063 | 0.000 | 0.138 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c702000000000000008b | 202.807 | 0.037 | n/a | 0.000 | 0.000 | 0.877 | 201.545 | 0.040 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.120 | 0.037 | 0.000 | 0.120 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000087 | 202.686 | 0.046 | n/a | 0.000 | 0.000 | 0.840 | 201.442 | 0.038 | 0.000 | 0.237 | 0.000 | n/a | n/a | 0.083 | 0.046 | 0.000 | 0.083 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c702000000000000008c | 202.370 | 0.069 | n/a | 0.000 | 0.000 | 0.972 | 201.026 | 0.015 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.155 | 0.069 | 0.000 | 0.155 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c7020000000000000090 | 202.099 | 0.057 | n/a | 0.000 | 0.000 | 0.936 | 200.882 | 0.016 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.093 | 0.057 | 0.000 | 0.093 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c702000000000000008f | 201.541 | 0.031 | n/a | 0.000 | 0.000 | 0.498 | 200.804 | 0.016 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.072 | 0.031 | 0.000 | 0.072 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c7020000000000000084 | 112.251 | 0.059 | n/a | 0.000 | 0.000 | 1.089 | 100.068 | 10.870 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.001 | 0.094 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c702000000000000008a | 110.510 | 0.053 | n/a | 0.000 | 0.000 | 0.724 | 107.385 | 2.109 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.097 | 0.053 | 0.000 | 0.097 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c7020000000000000092 | 63.818 | 0.071 | n/a | 0.000 | 0.000 | 0.960 | 60.167 | 2.359 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.095 | 0.071 | 0.001 | 0.095 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c7020000000000000089 | 59.584 | 0.046 | n/a | 0.000 | 0.000 | 1.011 | 54.854 | 3.486 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.065 | 0.046 | 0.001 | 0.065 | gw-r/thread-69/journal/page | none observed |

## P3 / grow10 / read (6 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 125.011 | 0.454 | n/a | 0.000 | 0.000 | 0.966 | 108.514 | 0.020 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.093 | 0.454 | 0.004 | 0.093 |
| p99 | 272.367 | 0.892 | n/a | 0.000 | 0.000 | 3.489 | 201.782 | 151.810 | 11.790 | 0.246 | 0.000 | n/a | n/a | 0.168 | 0.892 | 0.007 | 0.168 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c7020000000000000095 | 272.367 | 0.454 | n/a | 0.000 | 0.000 | 1.367 | 118.401 | 151.810 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.089 | 0.454 | 0.002 | 0.089 | gw-r/thread-50/gateway.admission-wait | none observed |
| d12b1fb067b2c7020000000000000094 | 203.507 | 0.062 | n/a | 0.000 | 0.000 | 1.240 | 201.782 | 0.037 | 0.000 | 0.246 | 0.000 | n/a | n/a | 0.140 | 0.062 | 0.000 | 0.140 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c7020000000000000098 | 125.635 | 0.501 | n/a | 0.000 | 0.000 | 0.881 | 124.028 | 0.020 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.093 | 0.501 | 0.004 | 0.093 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c7020000000000000099 | 125.011 | 0.892 | n/a | 0.000 | 0.000 | 3.489 | 108.514 | 0.018 | 11.790 | 0.141 | 0.000 | n/a | n/a | 0.168 | 0.892 | 0.007 | 0.168 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c702000000000000009b | 98.039 | 0.520 | n/a | 0.000 | 0.000 | 0.845 | 96.462 | 0.020 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.082 | 0.520 | 0.005 | 0.082 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c702000000000000009c | 60.123 | 0.433 | n/a | 0.000 | 0.000 | 0.966 | 58.445 | 0.028 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.116 | 0.433 | 0.007 | 0.116 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.056 | 0.059 | n/a | 0.000 | 0.000 | 0.942 | 200.977 | 0.025 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.087 | 0.059 | 0.000 | 0.087 |
| p99 | 205.496 | 0.098 | n/a | 0.000 | 0.000 | 3.822 | 201.450 | 7.678 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.188 | 0.098 | 0.001 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c70200000000000000b4 | 205.496 | 0.053 | n/a | 0.000 | 0.000 | 3.822 | 201.361 | 0.025 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.078 | 0.053 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| d12b1fb067b2c70200000000000000b3 | 202.744 | 0.057 | n/a | 0.000 | 0.000 | 0.942 | 201.450 | 0.019 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.152 | 0.057 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c70200000000000000a7 | 202.740 | 0.061 | n/a | 0.000 | 0.000 | 1.336 | 201.032 | 0.026 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.132 | 0.061 | 0.000 | 0.132 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c70200000000000000ae | 202.530 | 0.068 | n/a | 0.000 | 0.000 | 1.046 | 201.115 | 0.026 | 0.000 | 0.197 | 0.000 | n/a | n/a | 0.077 | 0.068 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c70200000000000000aa | 202.393 | 0.039 | n/a | 0.000 | 0.000 | 1.034 | 201.076 | 0.028 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c70200000000000000ac | 202.351 | 0.063 | n/a | 0.000 | 0.000 | 1.061 | 200.977 | 0.019 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.105 | 0.063 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c70200000000000000ad | 202.056 | 0.052 | n/a | 0.000 | 0.000 | 0.885 | 200.872 | 0.017 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.087 | 0.052 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000af | 202.042 | 0.039 | n/a | 0.000 | 0.000 | 0.688 | 201.069 | 0.023 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.067 | 0.039 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000b1 | 201.744 | 0.035 | n/a | 0.000 | 0.000 | 0.626 | 200.880 | 0.015 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.072 | 0.035 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| d12b1fb067b2c70200000000000000b2 | 201.268 | 0.059 | n/a | 0.000 | 0.000 | 0.882 | 198.066 | 2.089 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.104 | 0.059 | 0.000 | 0.104 | gw-r/thread-47/journal/page | none observed |
| d12b1fb067b2c70200000000000000a8 | 160.204 | 0.091 | n/a | 0.000 | 0.000 | 0.716 | 151.583 | 7.678 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.081 | 0.091 | 0.001 | 0.081 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c70200000000000000ab | 150.160 | 0.098 | n/a | 0.000 | 0.000 | 1.191 | 148.577 | 0.022 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.188 | 0.098 | 0.001 | 0.188 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c70200000000000000b0 | 109.791 | 0.077 | n/a | 0.000 | 0.000 | 0.898 | 103.125 | 5.523 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.110 | 0.077 | 0.001 | 0.110 | gw-r/thread-51/journal/page | none observed |

## P3 / presweep / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.204 | 0.055 | n/a | 0.000 | 0.000 | 1.099 | 200.922 | 0.021 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.093 | 0.055 | 0.000 | 0.093 |
| p99 | 204.347 | 0.109 | n/a | 0.000 | 0.000 | 2.838 | 201.791 | 3.667 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.216 | 0.109 | 0.001 | 0.216 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d12b1fb067b2c70200000000000000b9 | 204.347 | 0.059 | n/a | 0.000 | 0.000 | 2.071 | 201.791 | 0.029 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.174 | 0.059 | 0.000 | 0.174 | gw-r/thread-51/journal/page | none observed |
| d12b1fb067b2c70200000000000000bc | 203.208 | 0.041 | n/a | 0.000 | 0.000 | 1.767 | 201.142 | 0.025 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.076 | 0.041 | 0.000 | 0.076 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c70200000000000000bb | 202.861 | 0.055 | n/a | 0.000 | 0.000 | 1.036 | 201.481 | 0.020 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.093 | 0.055 | 0.000 | 0.093 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c70200000000000000b6 | 202.776 | 0.051 | n/a | 0.000 | 0.000 | 0.860 | 201.478 | 0.125 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.126 | 0.051 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c70200000000000000b7 | 202.285 | 0.052 | n/a | 0.000 | 0.000 | 1.099 | 200.922 | 0.016 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.081 | 0.052 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| d12b1fb067b2c70200000000000000bd | 202.204 | 0.044 | n/a | 0.000 | 0.000 | 0.807 | 201.079 | 0.021 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.072 | 0.044 | 0.000 | 0.072 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c70200000000000000ba | 178.022 | 0.076 | n/a | 0.000 | 0.000 | 1.171 | 172.907 | 3.667 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.133 | 0.076 | 0.000 | 0.133 | gw-r/thread-69/journal/page | none observed |
| d12b1fb067b2c70200000000000000be | 171.448 | 0.103 | n/a | 0.000 | 0.000 | 1.627 | 166.402 | 3.113 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.155 | 0.103 | 0.001 | 0.155 | gw-r/thread-53/journal/page | none observed |
| d12b1fb067b2c70200000000000000b8 | 135.022 | 0.109 | n/a | 0.000 | 0.000 | 0.991 | 133.645 | 0.014 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.216 | 0.109 | 0.001 | 0.216 | gw-r/thread-48/journal/page | none observed |
| d12b1fb067b2c70200000000000000b5 | 103.592 | 0.070 | n/a | 0.000 | 0.000 | 2.838 | 100.521 | 0.014 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.089 | 0.070 | 0.001 | 0.089 | gw-r/thread-48/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

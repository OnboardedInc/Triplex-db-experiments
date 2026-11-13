# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue (scheduler/subject/admission)` (684.278 ms, trace `b19d8c740dc1ae2e0000000000003e9b`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (856.146 ms, trace `b19d8c740dc1ae2e0000000000003edb`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (340.271 ms, trace `b19d8c740dc1ae2e0000000000003e96`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (594.719 ms, trace `b19d8c740dc1ae2e0000000000003e87`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (598.781 ms, trace `b19d8c740dc1ae2e0000000000003e86`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-q8-b-zero`; source `0c1fa43b93562e3774b09e18c9e351decc0741da`; subjects 10000; tracing full.

Commit coverage: 8532/8533 (99.988%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 8533/8533. Raw trace bytes: 44624536.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.490 | 5.334 | 1.299 | 0.000 | 0.069 | 31.532 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.136 | 0.214 | 0.024 |
| p99 | 114.413 | 36.897 | n/a | 5.259 | 2.807 | 82.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.188 | 44.963 | 0.393 | 0.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000000449 | 114.413 | 36.897 | n/a | 5.259 | 2.807 | 69.363 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.087 | 44.963 | 0.393 | 0.087 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000045d | 88.280 | 5.334 | 0.215 | 0.513 | 0.039 | 82.158 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 6.101 | 0.069 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000426 | 83.466 | 12.458 | 0.523 | 0.000 | 0.054 | 70.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 13.035 | 0.156 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000450 | 65.437 | 5.290 | 0.208 | 0.434 | 0.051 | 59.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 5.982 | 0.091 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000423 | 63.317 | 15.977 | n/a | 4.905 | 1.312 | 40.935 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.188 | 22.193 | 0.351 | 0.188 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000448 | 54.461 | 10.061 | 0.583 | 0.470 | 0.033 | 43.287 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 11.147 | 0.205 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000436 | 49.887 | 10.103 | 0.518 | 0.000 | 0.068 | 39.167 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 10.689 | 0.214 | 0.031 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000444 | 47.667 | 6.449 | 0.509 | 0.434 | 0.053 | 40.198 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 7.445 | 0.156 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000042e | 47.325 | 9.996 | 0.225 | 0.000 | 0.039 | 37.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.260 | 0.217 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000043a | 45.800 | 5.198 | 0.600 | 0.000 | 0.027 | 39.937 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.825 | 0.127 | 0.038 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000454 | 43.548 | 5.789 | 0.287 | 0.524 | 0.041 | 36.887 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.642 | 0.153 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000045b | 41.912 | 3.890 | 0.327 | 0.323 | 0.064 | 37.276 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 4.604 | 0.110 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000044c | 39.260 | 3.848 | 0.239 | 0.306 | 0.069 | 34.769 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 4.462 | 0.114 | 0.029 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000432 | 39.255 | 4.939 | 0.325 | 0.000 | 0.034 | 33.935 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.299 | 0.135 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000438 | 37.490 | 9.965 | n/a | 2.302 | 0.402 | 24.716 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.104 | 12.669 | 0.338 | 0.104 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000042b | 36.469 | 4.413 | n/a | 0.000 | 0.502 | 31.532 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.916 | 0.135 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000043b | 35.121 | 6.659 | n/a | 1.575 | 0.973 | 25.889 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 9.207 | 0.262 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000433 | 31.283 | 6.254 | n/a | 0.000 | 0.679 | 24.320 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 6.933 | 0.222 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000445 | 29.959 | 4.423 | n/a | 0.000 | 0.553 | 24.964 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.976 | 0.166 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000043e | 29.689 | 4.236 | 0.199 | 0.000 | 0.036 | 25.200 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.470 | 0.151 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.212 | 4.423 | n/a | 0.000 | 0.563 | 14.784 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.976 | 0.261 | 0.024 |
| p99 | 36.469 | 6.500 | n/a | 0.000 | 1.133 | 31.532 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 7.063 | 0.335 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000042b | 36.469 | 4.413 | n/a | 0.000 | 0.502 | 31.532 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.916 | 0.135 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000445 | 29.959 | 4.423 | n/a | 0.000 | 0.553 | 24.964 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.976 | 0.166 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000451 | 26.295 | 3.473 | n/a | 0.000 | 0.250 | 22.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.723 | 0.142 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000441 | 24.081 | 6.500 | n/a | 0.000 | 0.563 | 16.986 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 7.063 | 0.293 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000427 | 20.212 | 4.513 | n/a | 0.000 | 0.894 | 14.784 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.407 | 0.268 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000044d | 18.807 | 4.491 | n/a | 0.000 | 1.133 | 13.160 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.624 | 0.299 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000042f | 18.504 | 3.941 | n/a | 0.000 | 0.893 | 13.641 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 4.834 | 0.261 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000455 | 18.303 | 5.170 | n/a | 0.000 | 0.966 | 12.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 6.136 | 0.335 | 0.048 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000457 | 16.887 | 3.654 | n/a | 0.000 | 0.402 | 12.808 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.056 | 0.240 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2/P4 / read-your-own-write / read (475 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.432 | 33.002 | 27.011 | 1.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 67.446 | 1.000 | 0.010 |
| p99 | 440.485 | 105.478 | 143.163 | 19.210 | 0.000 | 326.284 | 33.589 | 53.934 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.039 | 172.495 | 1.000 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000003e78 | 681.138 | 67.305 | 69.461 | 0.000 | 0.000 | 541.065 | 3.257 | 0.010 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.015 | 136.765 | 0.201 | 0.015 | node-14/thread-0/socket.wait-first-byte | client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.parse 6.079ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e77 | 618.648 | 62.726 | 204.346 | 60.152 | 0.000 | 287.177 | 4.191 | 0.011 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.017 | 327.224 | 0.529 | 0.017 | node-14/thread-0/socket.wait-first-byte | client.encode 10.198ms; client.encode 10.181ms; client.parse 6.079ms; client.encode 5.197ms; client.encode 5.167ms |
| b19d8c740dc1ae2e0000000000003d89 | 584.588 | 63.756 | 57.332 | 4.537 | 0.000 | 425.200 | 20.606 | 13.144 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.009 | 125.624 | 0.215 | 0.009 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 9.114ms; driver.publication 2.865ms; driver.publication 2.460ms; driver.publication 2.320ms; driver.publication 2.056ms |
| b19d8c740dc1ae2e0000000000003d88 | 498.964 | 25.678 | 42.010 | 0.000 | 0.000 | 425.415 | 0.093 | 5.753 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.012 | 67.688 | 0.136 | 0.012 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 9.114ms; driver.publication 2.865ms; driver.publication 2.460ms; driver.publication 2.320ms; driver.publication 2.056ms |
| b19d8c740dc1ae2e0000000000003d87 | 440.485 | 28.336 | 40.676 | 0.000 | 0.000 | 371.451 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 69.012 | 0.157 | 0.021 | node-14/thread-0/socket.queue-and-write | driver.expected-state.bind-receipt 9.114ms; driver.publication 2.865ms; client.parse 1.831ms; driver.publication 1.723ms; driver.publication 1.399ms |
| b19d8c740dc1ae2e0000000000003d86 | 399.958 | 26.438 | 47.221 | 0.000 | 0.000 | 326.284 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 73.660 | 0.184 | 0.014 | node-14/thread-0/socket.queue-and-write | driver.publication 2.865ms; client.parse 1.831ms; driver.publication 1.723ms; client.parse 1.219ms; client.parse 1.193ms |
| b19d8c740dc1ae2e000000000000067d | 385.768 | 25.582 | 5.050 | 0.000 | 0.000 | 117.029 | 0.438 | 237.626 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.021 | 30.632 | 0.079 | 0.021 | gw-w/thread-46/gateway.admission-wait | driver.publication 3.455ms; driver.publication 3.141ms; driver.publication 2.862ms; driver.publication 2.731ms; driver.publication 2.693ms |
| b19d8c740dc1ae2e0000000000003d85 | 380.232 | 27.779 | 61.093 | 0.000 | 0.000 | 288.254 | 2.448 | 0.635 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.018 | 88.872 | 0.234 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.865ms; driver.publication 2.701ms; client.parse 1.831ms; driver.publication 1.723ms; client.parse 1.219ms |
| b19d8c740dc1ae2e0000000000000679 | 379.728 | 12.381 | 2.784 | 0.000 | 0.000 | 117.707 | 33.589 | 213.229 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.013 | 15.165 | 0.040 | 0.013 | gw-w/thread-48/gateway.admission-wait | driver.publication 3.455ms; driver.publication 3.141ms; driver.publication 2.862ms; driver.publication 2.731ms; driver.publication 2.693ms |
| b19d8c740dc1ae2e0000000000003d84 | 360.559 | 21.119 | 54.668 | 0.000 | 0.000 | 283.050 | 1.684 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.019 | 75.787 | 0.210 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.865ms; driver.publication 2.701ms; client.parse 1.831ms; driver.publication 1.723ms; driver.publication 1.345ms |
| b19d8c740dc1ae2e0000000000003d3d | 346.103 | 50.282 | 117.917 | 4.296 | 0.000 | 136.308 | 28.854 | 8.417 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.019 | 172.495 | 0.498 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.390ms; driver.publication 1.269ms; driver.publication 1.175ms; driver.publication 1.108ms; driver.publication 1.106ms |
| b19d8c740dc1ae2e0000000000003d82 | 335.744 | 71.626 | 62.252 | 7.813 | 0.000 | 121.713 | 48.674 | 23.654 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.010 | 141.690 | 0.422 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.865ms; driver.publication 2.701ms; client.parse 1.831ms; driver.publication 1.345ms; client.parse 1.193ms |
| b19d8c740dc1ae2e00000000000019d2 | 321.349 | 54.405 | 44.499 | 0.000 | 0.000 | 136.579 | 31.910 | 53.934 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.016 | 98.903 | 0.308 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 5.679ms; driver.publication 5.184ms; client.parse 4.401ms; driver.publication 4.101ms; driver.publication 3.861ms |
| b19d8c740dc1ae2e0000000000003d33 | 292.919 | 26.323 | 13.123 | 0.000 | 0.000 | 201.432 | 10.393 | 41.627 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.012 | 39.446 | 0.135 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.390ms; driver.publication 1.175ms; driver.publication 1.106ms; driver.publication 1.106ms; client.parse 1.094ms |
| b19d8c740dc1ae2e000000000000239f | 282.128 | 79.830 | 42.278 | 0.000 | 0.000 | 109.102 | 50.764 | 0.019 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.015 | 122.108 | 0.433 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000003d3b | 272.238 | 13.629 | 103.407 | 0.000 | 0.000 | 143.206 | 11.967 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.008 | 117.036 | 0.430 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.390ms; driver.publication 1.175ms; driver.publication 1.106ms; driver.publication 1.106ms; client.parse 1.094ms |
| b19d8c740dc1ae2e0000000000000677 | 264.453 | 22.445 | 4.941 | 0.000 | 0.000 | 110.492 | 126.349 | 0.016 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.017 | 27.386 | 0.104 | 0.017 | gw-w/thread-51/gateway.admitted-work | driver.publication 3.141ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.968ms |
| b19d8c740dc1ae2e0000000000003e52 | 264.160 | 19.163 | 39.662 | 2.760 | 0.000 | 124.949 | 5.448 | 72.165 | 0.000 | 0.002 | 0.000 | n/a | n/a | 0.012 | 61.584 | 0.233 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.874ms; client.parse 1.781ms; driver.publication 1.270ms; client.parse 1.172ms; driver.publication 1.088ms |
| b19d8c740dc1ae2e0000000000003123 | 263.972 | 59.930 | 120.288 | 5.714 | 0.000 | 78.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 185.932 | 0.704 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.publication 2.039ms; driver.publication 2.016ms; driver.publication 1.656ms; driver.publication 1.631ms; driver.publication 1.375ms |
| b19d8c740dc1ae2e0000000000003d99 | 249.591 | 52.012 | 193.586 | 3.984 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 249.583 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | client.parse 1.831ms; client.parse 1.219ms; client.parse 1.173ms |

## P2 / baseline / commit (92 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.478 | 4.226 | n/a | 0.000 | 0.081 | 19.499 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.820 | 0.210 | 0.023 |
| p99 | 220.861 | 14.065 | n/a | 1.791 | 2.066 | 132.565 | 6.658 | 0.016 | 76.139 | 0.035 | 0.000 | n/a | n/a | 0.063 | 15.196 | 0.435 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000004e0 | 220.861 | 5.050 | 0.356 | 0.000 | 0.022 | 132.565 | 6.658 | 0.016 | 76.139 | 0.035 | 0.000 | n/a | n/a | 0.018 | 5.428 | 0.025 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004cf | 93.044 | 5.571 | n/a | 0.000 | 0.269 | 87.152 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 5.840 | 0.063 | 0.052 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004e6 | 42.561 | 4.599 | 0.343 | 0.000 | 0.035 | 37.566 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.977 | 0.117 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004b2 | 40.792 | 3.817 | 0.256 | 0.000 | 0.059 | 36.625 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 4.132 | 0.101 | 0.035 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000509 | 40.168 | 5.401 | 0.345 | 0.000 | 0.039 | 34.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.785 | 0.144 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000047a | 38.490 | 3.952 | 0.387 | 0.000 | 0.031 | 34.096 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.370 | 0.114 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000467 | 37.601 | 5.221 | 0.585 | 0.000 | 0.039 | 31.738 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.845 | 0.155 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004d2 | 37.220 | 4.488 | 0.349 | 0.000 | 0.033 | 32.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.871 | 0.131 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004c2 | 36.852 | 5.736 | 0.407 | 0.000 | 0.091 | 30.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.234 | 0.169 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004a4 | 36.090 | 3.871 | 0.292 | 0.000 | 0.041 | 31.865 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.204 | 0.116 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000045f | 35.225 | 3.577 | 0.231 | 0.262 | 0.061 | 31.071 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.131 | 0.117 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000047f | 34.912 | 14.065 | n/a | 0.000 | 1.131 | 19.674 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 15.196 | 0.435 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004c0 | 34.035 | 3.937 | 0.550 | 0.000 | 0.051 | 29.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.537 | 0.133 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004f2 | 33.898 | 5.068 | 0.318 | 0.530 | 0.024 | 27.941 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.940 | 0.175 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004a2 | 33.759 | 5.675 | 0.210 | 0.000 | 0.056 | 27.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.941 | 0.176 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004ac | 33.617 | 4.848 | 0.373 | 0.000 | 0.100 | 28.260 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 5.322 | 0.158 | 0.036 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004c8 | 33.336 | 3.930 | 0.193 | 0.000 | 0.033 | 29.160 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.156 | 0.125 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004ea | 32.861 | 3.786 | 0.210 | 0.000 | 0.031 | 28.810 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.027 | 0.123 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000468 | 32.831 | 8.489 | n/a | 0.000 | 0.842 | 23.453 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 9.331 | 0.284 | 0.046 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000049e | 32.770 | 3.866 | 0.326 | 0.000 | 0.038 | 28.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.230 | 0.129 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / baseline / commit / 5-10 facts (24 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.784 | 3.582 | n/a | 0.000 | 0.618 | 15.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.485 | 0.252 | 0.024 |
| p99 | 32.831 | 8.489 | n/a | 0.000 | 2.066 | 28.714 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.055 | 9.331 | 0.413 | 0.055 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000000468 | 32.831 | 8.489 | n/a | 0.000 | 0.842 | 23.453 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 9.331 | 0.284 | 0.046 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000464 | 32.759 | 3.582 | n/a | 0.000 | 0.441 | 28.714 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.022 | 0.123 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000477 | 32.381 | 7.647 | n/a | 0.000 | 0.420 | 24.262 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 8.066 | 0.249 | 0.052 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000503 | 29.344 | 3.289 | n/a | 0.000 | 0.934 | 25.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.223 | 0.144 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004af | 26.692 | 5.736 | n/a | 0.000 | 0.688 | 20.244 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 6.423 | 0.241 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004f5 | 26.066 | 3.231 | n/a | 0.000 | 0.124 | 22.687 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.355 | 0.129 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000050b | 24.598 | 6.385 | n/a | 0.000 | 0.671 | 17.518 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 7.056 | 0.287 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004b3 | 24.460 | 7.127 | n/a | 0.000 | 0.555 | 16.742 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.036 | 7.682 | 0.314 | 0.036 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000511 | 23.026 | 3.634 | n/a | 0.000 | 0.831 | 18.532 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.465 | 0.194 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000513 | 21.915 | 3.199 | n/a | 0.000 | 0.061 | 18.617 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 3.260 | 0.149 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004ff | 20.866 | 3.311 | n/a | 0.000 | 0.618 | 16.915 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.929 | 0.188 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000483 | 20.797 | 3.433 | n/a | 0.000 | 1.052 | 16.291 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.485 | 0.216 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004c5 | 19.784 | 4.421 | n/a | 0.000 | 0.859 | 14.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.280 | 0.267 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004f8 | 19.510 | 2.611 | n/a | 0.000 | 2.066 | 14.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.677 | 0.240 | 0.012 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000048d | 19.104 | 3.629 | n/a | 0.000 | 0.063 | 15.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 3.692 | 0.193 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004bd | 19.030 | 5.045 | n/a | 0.000 | 0.428 | 13.536 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.473 | 0.288 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004a9 | 17.849 | 3.489 | n/a | 0.000 | 1.662 | 12.685 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 5.150 | 0.289 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.022ms |
| b19d8c740dc1ae2e000000000000049f | 17.195 | 6.722 | n/a | 0.000 | 0.084 | 10.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.806 | 0.396 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004e1 | 17.130 | 3.852 | n/a | 0.000 | 0.645 | 12.611 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.497 | 0.262 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000004c3 | 15.227 | 2.996 | n/a | 0.000 | 0.844 | 11.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 3.841 | 0.252 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit (20 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.121 | 4.381 | n/a | 0.000 | 0.124 | 19.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.750 | 0.167 | 0.018 |
| p99 | 75.957 | 8.001 | n/a | 0.000 | 2.838 | 71.298 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 8.505 | 0.451 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000027af | 75.957 | 4.142 | 0.479 | 0.000 | 0.022 | 71.298 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.644 | 0.061 | 0.016 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.184ms |
| b19d8c740dc1ae2e000000000000263d | 56.178 | 5.712 | 0.288 | 0.000 | 0.021 | 50.138 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 6.022 | 0.107 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027b0 | 55.385 | 6.787 | n/a | 0.000 | 0.586 | 47.981 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 7.373 | 0.133 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002515 | 54.385 | 5.496 | n/a | 0.000 | 1.035 | 47.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 6.531 | 0.120 | 0.046 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002514 | 48.089 | 2.755 | 0.219 | 0.000 | 0.027 | 45.071 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.000 | 0.062 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005e1 | 34.819 | 3.812 | 0.232 | 0.000 | 0.030 | 30.728 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.073 | 0.117 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002511 | 30.954 | 5.988 | n/a | 0.000 | 0.989 | 23.962 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 6.977 | 0.225 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027b3 | 30.646 | 4.762 | 0.340 | 0.000 | 0.031 | 25.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.133 | 0.167 | 0.033 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000263f | 29.790 | 6.428 | n/a | 0.000 | 0.564 | 22.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 6.992 | 0.235 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002518 | 28.431 | 4.381 | 0.351 | 0.000 | 0.018 | 23.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 4.750 | 0.167 | 0.041 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002700 | 27.121 | 4.804 | 3.187 | 0.000 | 0.020 | 19.094 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 8.010 | 0.295 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000516 | 25.372 | 4.696 | 0.857 | 0.000 | 0.098 | 19.683 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.651 | 0.223 | 0.038 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027ab | 22.811 | 2.032 | n/a | 0.000 | 1.027 | 19.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 3.059 | 0.134 | 0.007 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.263ms |
| b19d8c740dc1ae2e00000000000027aa | 21.733 | 3.049 | n/a | 0.000 | 0.230 | 18.430 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.279 | 0.151 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000001335 | 19.768 | 4.486 | 0.139 | 0.000 | 0.017 | 15.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 4.642 | 0.235 | 0.014 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000232d | 19.591 | 8.001 | n/a | 0.000 | 0.504 | 11.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 8.505 | 0.434 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027a8 | 16.122 | 2.754 | n/a | 0.000 | 0.124 | 13.224 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 2.878 | 0.178 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002868 | 15.400 | 4.101 | n/a | 0.000 | 2.838 | 8.445 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 6.938 | 0.451 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000263b | 13.852 | 2.966 | n/a | 0.000 | 0.256 | 10.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.222 | 0.233 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002638 | 12.370 | 3.247 | n/a | 0.000 | 0.501 | 8.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 3.748 | 0.303 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1 / commit (101 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.362 | 4.576 | n/a | 0.000 | 0.164 | 21.720 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.184 | 0.197 | 0.029 |
| p99 | 88.653 | 13.048 | n/a | 0.000 | 1.154 | 81.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.109 | 14.144 | 0.433 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000000533 | 143.201 | 11.484 | 1.585 | 0.000 | 0.063 | 130.036 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 13.132 | 0.092 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005ca | 88.653 | 6.695 | 0.530 | 0.000 | 0.038 | 81.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 7.263 | 0.082 | 0.023 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.219ms |
| b19d8c740dc1ae2e0000000000000529 | 84.313 | 6.014 | 0.569 | 0.000 | 0.064 | 77.617 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 6.648 | 0.079 | 0.048 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000539 | 82.780 | 4.090 | 0.296 | 0.000 | 0.035 | 78.332 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.421 | 0.053 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000588 | 74.724 | 3.545 | 0.227 | 0.000 | 0.042 | 70.890 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.814 | 0.051 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000541 | 69.297 | 5.142 | 0.266 | 0.000 | 0.053 | 63.797 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.461 | 0.079 | 0.038 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.660ms |
| b19d8c740dc1ae2e0000000000000521 | 67.471 | 15.715 | n/a | 0.000 | 1.099 | 50.629 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 16.814 | 0.249 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000562 | 64.019 | 4.247 | 0.299 | 0.000 | 0.032 | 59.416 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.578 | 0.072 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000545 | 61.236 | 5.899 | n/a | 0.000 | 0.867 | 54.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.766 | 0.110 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005c7 | 55.800 | 3.384 | 0.352 | 0.000 | 0.042 | 52.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.778 | 0.068 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000059b | 55.565 | 5.277 | 0.302 | 0.000 | 0.071 | 49.886 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.650 | 0.102 | 0.029 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000051e | 53.321 | 4.576 | 0.308 | 0.000 | 0.033 | 48.374 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 4.918 | 0.092 | 0.029 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000542 | 52.865 | 4.146 | n/a | 0.000 | 0.202 | 48.492 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.348 | 0.082 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000052b | 51.962 | 6.126 | 0.200 | 0.000 | 0.036 | 45.575 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.363 | 0.122 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000572 | 51.735 | 4.292 | 0.202 | 0.000 | 0.033 | 47.182 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.527 | 0.088 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000056e | 47.350 | 4.380 | n/a | 0.000 | 0.698 | 42.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.077 | 0.107 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005ad | 45.804 | 4.232 | 0.342 | 0.000 | 0.078 | 41.120 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 4.652 | 0.102 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005d3 | 45.231 | 6.557 | 0.505 | 0.000 | 0.042 | 38.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 7.104 | 0.157 | 0.035 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000570 | 42.014 | 4.110 | 0.341 | 0.000 | 0.062 | 37.474 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.512 | 0.107 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005bb | 41.844 | 13.048 | n/a | 0.000 | 1.096 | 27.591 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.109 | 14.144 | 0.338 | 0.109 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1 / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.334 | 4.189 | n/a | 0.000 | 0.496 | 15.187 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.876 | 0.240 | 0.027 |
| p99 | 52.865 | 10.634 | n/a | 0.000 | 1.229 | 48.492 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.111 | 11.862 | 0.438 | 0.111 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000000542 | 52.865 | 4.146 | n/a | 0.000 | 0.202 | 48.492 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.348 | 0.082 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000056e | 47.350 | 4.380 | n/a | 0.000 | 0.698 | 42.240 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.077 | 0.107 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000535 | 40.460 | 4.141 | n/a | 0.000 | 1.043 | 35.249 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.184 | 0.128 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000052f | 31.561 | 3.876 | n/a | 0.000 | 0.775 | 26.883 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.651 | 0.147 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000556 | 31.256 | 3.643 | n/a | 0.000 | 0.157 | 27.432 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.800 | 0.122 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005b5 | 28.481 | 4.866 | n/a | 0.000 | 0.400 | 23.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.266 | 0.185 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005c9 | 27.161 | 4.838 | n/a | 0.000 | 0.609 | 21.662 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 5.447 | 0.201 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000053d | 27.080 | 10.634 | n/a | 0.000 | 1.229 | 15.187 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 11.862 | 0.438 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005d4 | 26.587 | 8.109 | n/a | 0.000 | 0.516 | 17.916 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 8.625 | 0.324 | 0.047 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000582 | 25.376 | 5.069 | n/a | 0.000 | 0.507 | 19.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.054 | 5.576 | 0.220 | 0.054 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000579 | 23.771 | 3.068 | n/a | 0.000 | 0.227 | 20.465 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 3.295 | 0.139 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.210ms |
| b19d8c740dc1ae2e0000000000000551 | 22.527 | 4.853 | n/a | 0.000 | 0.772 | 16.855 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 5.625 | 0.250 | 0.047 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005b1 | 22.057 | 4.542 | n/a | 0.000 | 0.826 | 16.663 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.368 | 0.243 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000537 | 21.909 | 5.454 | n/a | 0.000 | 0.827 | 15.584 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 6.281 | 0.287 | 0.044 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005d1 | 21.710 | 5.454 | n/a | 0.000 | 0.160 | 16.068 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.614 | 0.259 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000000564 | 20.359 | 4.645 | n/a | 0.000 | 0.231 | 15.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.111 | 4.876 | 0.240 | 0.111 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005cd | 20.334 | 3.860 | n/a | 0.000 | 0.200 | 16.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.060 | 0.200 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005a5 | 19.385 | 5.120 | n/a | 0.000 | 0.595 | 13.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.052 | 5.715 | 0.295 | 0.052 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000005ab | 17.862 | 4.852 | n/a | 0.000 | 0.900 | 12.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.752 | 0.322 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000055a | 17.860 | 3.767 | n/a | 0.000 | 0.519 | 13.543 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 4.286 | 0.240 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L4 / commit (1713 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.049 | 3.998 | n/a | 0.000 | 0.800 | 15.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.167 | 0.251 | 0.017 |
| p99 | 188.022 | 54.115 | n/a | 2.547 | 67.536 | 112.374 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 106.963 | 1.000 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000000684 | 355.365 | 4.170 | n/a | 0.000 | 2.768 | 155.664 | 0.538 | 192.179 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.021 | 6.938 | 0.020 | 0.021 | gw-w/thread-75/gateway.admission-wait | driver.publication 3.455ms; driver.publication 3.141ms; driver.publication 2.862ms; driver.publication 2.731ms; driver.publication 2.693ms |
| b19d8c740dc1ae2e00000000000006cc | 314.107 | 4.413 | n/a | 0.000 | 242.584 | 67.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 246.998 | 0.786 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.773ms; driver.publication 1.723ms; driver.publication 1.627ms; driver.publication 1.625ms; driver.publication 1.616ms |
| b19d8c740dc1ae2e00000000000006d7 | 299.663 | 5.707 | n/a | 0.000 | 224.902 | 69.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 230.609 | 0.770 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.773ms; driver.publication 1.723ms; driver.publication 1.677ms; driver.publication 1.627ms; driver.publication 1.625ms |
| b19d8c740dc1ae2e00000000000006b5 | 290.200 | 3.668 | n/a | 0.000 | 176.020 | 108.979 | 0.860 | 0.027 | 0.000 | 0.619 | 0.004 | n/a | n/a | 0.023 | 179.688 | 0.619 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.455ms; driver.publication 2.862ms; driver.publication 1.835ms; driver.expected-state.bind-receipt 1.773ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e00000000000006e4 | 275.347 | 8.554 | n/a | 0.000 | 226.248 | 40.534 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 234.802 | 0.853 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.723ms; driver.publication 1.677ms; driver.publication 1.672ms; driver.publication 1.627ms; driver.publication 1.625ms |
| b19d8c740dc1ae2e00000000000006af | 259.444 | 2.556 | n/a | 0.000 | 242.608 | 14.267 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 245.164 | 0.945 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.455ms; driver.publication 2.862ms; driver.publication 2.112ms; driver.publication 1.835ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e00000000000006c0 | 250.285 | 5.665 | n/a | 0.000 | 206.359 | 38.246 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 212.024 | 0.847 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.380ms; driver.expected-state.bind-receipt 1.773ms; driver.publication 1.627ms; driver.publication 1.564ms; driver.publication 1.527ms |
| b19d8c740dc1ae2e00000000000006aa | 244.284 | 6.591 | n/a | 3.803 | 196.486 | 37.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 206.880 | 0.847 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.455ms; driver.publication 2.862ms; driver.publication 2.112ms; driver.publication 1.835ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e00000000000006df | 237.993 | 4.166 | n/a | 0.000 | 194.270 | 39.546 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 198.436 | 0.834 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.723ms; driver.publication 1.677ms; driver.publication 1.627ms; driver.publication 1.625ms; driver.publication 1.616ms |
| b19d8c740dc1ae2e00000000000006d1 | 236.141 | 12.026 | n/a | 0.000 | 4.717 | 218.181 | 0.623 | 0.537 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.022 | 16.742 | 0.071 | 0.022 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.677ms; driver.publication 1.672ms; driver.publication 1.625ms; driver.publication 1.616ms; driver.publication 1.553ms |
| b19d8c740dc1ae2e00000000000006a6 | 230.548 | 4.813 | n/a | 0.000 | 207.359 | 18.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 212.172 | 0.920 | 0.016 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.455ms; driver.publication 2.862ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.835ms |
| b19d8c740dc1ae2e0000000000000694 | 222.810 | 6.587 | n/a | 0.000 | 106.546 | 109.656 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 113.133 | 0.508 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.862ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e00000000000006cf | 217.056 | 11.082 | n/a | 0.000 | 7.189 | 198.766 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 18.272 | 0.084 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.677ms; driver.publication 1.672ms; driver.publication 1.625ms; driver.publication 1.616ms; driver.publication 1.553ms |
| b19d8c740dc1ae2e00000000000006d0 | 216.996 | 7.760 | n/a | 0.000 | 0.700 | 208.501 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 8.460 | 0.039 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.677ms; driver.publication 1.672ms; driver.publication 1.625ms; driver.publication 1.616ms; driver.publication 1.553ms |
| b19d8c740dc1ae2e0000000000000687 | 214.665 | 4.393 | n/a | 0.000 | 52.420 | 112.198 | 1.703 | 16.858 | 0.000 | 6.336 | 20.741 | n/a | n/a | 0.015 | 56.813 | 0.265 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.141ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.477ms |
| b19d8c740dc1ae2e0000000000000699 | 209.978 | 5.494 | n/a | 0.000 | 123.377 | 81.096 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 128.871 | 0.614 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.862ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.835ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e000000000000068c | 190.635 | 4.942 | n/a | 0.000 | 0.107 | 121.089 | 0.827 | 42.961 | 0.000 | 9.149 | 11.512 | n/a | n/a | 0.048 | 5.049 | 0.026 | 0.048 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.862ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.530ms; driver.publication 1.486ms |
| b19d8c740dc1ae2e000000000000068a | 188.022 | 180.088 | n/a | 6.857 | 1.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 188.001 | 1.000 | 0.021 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.862ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.530ms |
| b19d8c740dc1ae2e0000000000000f0d | 186.010 | 4.310 | n/a | 0.000 | 153.665 | 28.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 157.975 | 0.849 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 1.540ms; driver.publication 1.369ms; driver.publication 1.288ms; driver.publication 1.270ms; driver.publication 1.220ms |
| b19d8c740dc1ae2e0000000000000683 | 182.748 | 163.828 | n/a | 6.857 | 12.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 182.722 | 1.000 | 0.026 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.141ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.477ms |

## P2 / L4 / commit / 5-10 facts (999 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.375 | 3.453 | n/a | 0.000 | 0.830 | 14.267 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.510 | 0.243 | 0.017 |
| p99 | 178.098 | 47.721 | n/a | 2.170 | 64.931 | 109.222 | 0.629 | 0.035 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.049 | 81.491 | 1.000 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000000684 | 355.365 | 4.170 | n/a | 0.000 | 2.768 | 155.664 | 0.538 | 192.179 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.021 | 6.938 | 0.020 | 0.021 | gw-w/thread-75/gateway.admission-wait | driver.publication 3.455ms; driver.publication 3.141ms; driver.publication 2.862ms; driver.publication 2.731ms; driver.publication 2.693ms |
| b19d8c740dc1ae2e00000000000006d7 | 299.663 | 5.707 | n/a | 0.000 | 224.902 | 69.042 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 230.609 | 0.770 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 1.773ms; driver.publication 1.723ms; driver.publication 1.677ms; driver.publication 1.627ms; driver.publication 1.625ms |
| b19d8c740dc1ae2e00000000000006b5 | 290.200 | 3.668 | n/a | 0.000 | 176.020 | 108.979 | 0.860 | 0.027 | 0.000 | 0.619 | 0.004 | n/a | n/a | 0.023 | 179.688 | 0.619 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.455ms; driver.publication 2.862ms; driver.publication 1.835ms; driver.expected-state.bind-receipt 1.773ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e00000000000006af | 259.444 | 2.556 | n/a | 0.000 | 242.608 | 14.267 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 245.164 | 0.945 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.455ms; driver.publication 2.862ms; driver.publication 2.112ms; driver.publication 1.835ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e0000000000000687 | 214.665 | 4.393 | n/a | 0.000 | 52.420 | 112.198 | 1.703 | 16.858 | 0.000 | 6.336 | 20.741 | n/a | n/a | 0.015 | 56.813 | 0.265 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.141ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.477ms |
| b19d8c740dc1ae2e0000000000000699 | 209.978 | 5.494 | n/a | 0.000 | 123.377 | 81.096 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 128.871 | 0.614 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.862ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.835ms; driver.publication 1.540ms |
| b19d8c740dc1ae2e0000000000000f0d | 186.010 | 4.310 | n/a | 0.000 | 153.665 | 28.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 157.975 | 0.849 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 1.540ms; driver.publication 1.369ms; driver.publication 1.288ms; driver.publication 1.270ms; driver.publication 1.220ms |
| b19d8c740dc1ae2e0000000000000688 | 180.432 | 5.927 | n/a | 0.000 | 0.264 | 140.427 | 2.063 | 0.043 | 0.000 | 27.864 | 3.806 | n/a | n/a | 0.038 | 6.191 | 0.034 | 0.038 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.477ms; driver.publication 1.359ms |
| b19d8c740dc1ae2e000000000000068f | 180.236 | 169.638 | n/a | 6.857 | 3.724 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 180.220 | 1.000 | 0.016 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.862ms; driver.publication 2.112ms; driver.publication 1.551ms; driver.publication 1.540ms; driver.publication 1.530ms |
| b19d8c740dc1ae2e000000000000068e | 178.098 | 6.070 | n/a | 0.000 | 3.435 | 112.374 | 0.445 | 36.562 | 0.000 | 0.584 | 18.606 | n/a | n/a | 0.023 | 9.505 | 0.053 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.862ms; driver.publication 2.112ms; driver.publication 1.723ms; driver.publication 1.530ms; driver.publication 1.486ms |
| b19d8c740dc1ae2e0000000000000689 | 176.120 | 9.340 | n/a | 0.000 | 0.544 | 132.936 | 1.240 | 28.365 | 0.000 | 2.445 | 1.205 | n/a | n/a | 0.045 | 9.884 | 0.056 | 0.045 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 2.112ms; driver.publication 1.486ms; driver.publication 1.477ms |
| b19d8c740dc1ae2e0000000000000678 | 166.120 | 3.617 | n/a | 0.000 | 45.224 | 108.999 | 0.698 | 0.035 | 0.000 | 1.684 | 5.845 | n/a | n/a | 0.018 | 48.840 | 0.294 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.858ms; driver.publication 3.141ms; driver.publication 1.968ms; driver.publication 1.557ms; driver.publication 1.376ms |
| b19d8c740dc1ae2e0000000000000f04 | 158.355 | 7.380 | n/a | 0.000 | 41.963 | 108.997 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 49.343 | 0.312 | 0.015 | node-14/thread-0/socket.wait-first-byte | client.parse 1.540ms; driver.publication 1.369ms; driver.publication 1.220ms; driver.publication 1.219ms; driver.publication 1.067ms |
| b19d8c740dc1ae2e0000000000000682 | 148.686 | 6.701 | n/a | 0.000 | 0.724 | 129.545 | 1.376 | 10.273 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.045 | 7.425 | 0.050 | 0.045 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.141ms; driver.publication 2.731ms; driver.publication 2.693ms; driver.publication 1.359ms; driver.publication 1.248ms |
| b19d8c740dc1ae2e0000000000000691 | 147.896 | 6.147 | n/a | 0.000 | 1.077 | 109.222 | 0.770 | 30.639 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.026 | 7.224 | 0.049 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.862ms; driver.publication 2.112ms; driver.publication 1.540ms; driver.publication 1.530ms; driver.publication 1.486ms |
| b19d8c740dc1ae2e000000000000090c | 147.719 | 2.857 | n/a | 0.000 | 91.535 | 53.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 94.393 | 0.639 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.807ms; driver.publication 1.795ms; client.encode 1.772ms; driver.publication 1.563ms; driver.publication 1.431ms |
| b19d8c740dc1ae2e0000000000001119 | 138.903 | 8.160 | n/a | 0.000 | 1.918 | 128.813 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 10.078 | 0.073 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.206ms; driver.publication 1.341ms; driver.publication 1.272ms; driver.publication 1.202ms; driver.publication 1.177ms |
| b19d8c740dc1ae2e000000000000074b | 135.550 | 2.684 | n/a | 0.000 | 74.474 | 58.381 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 77.158 | 0.569 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 5.152ms; driver.publication 1.667ms; driver.publication 1.437ms; driver.publication 1.430ms; driver.publication 1.426ms |
| b19d8c740dc1ae2e00000000000012de | 129.974 | 6.116 | n/a | 0.000 | 0.759 | 115.854 | 0.642 | 3.693 | 1.260 | 0.714 | 0.915 | n/a | n/a | 0.021 | 6.875 | 0.053 | 0.021 | node-14/thread-0/socket.wait-first-byte | client.parse 2.030ms; driver.expected-state.bind-receipt 1.077ms |
| b19d8c740dc1ae2e000000000000067b | 129.478 | 5.080 | n/a | 0.000 | 0.490 | 109.100 | 2.026 | 0.037 | 0.000 | 6.106 | 6.587 | n/a | n/a | 0.053 | 5.571 | 0.043 | 0.053 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.141ms; driver.publication 1.376ms; driver.publication 1.248ms |

## P2 / L16 / commit (1763 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.864 | 3.975 | n/a | 0.000 | 0.820 | 14.583 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.265 | 0.271 | 0.016 |
| p99 | 297.483 | 118.440 | n/a | 4.132 | 151.065 | 111.463 | 2.588 | 0.073 | 0.000 | 1.414 | 14.574 | n/a | n/a | 0.060 | 200.181 | 1.000 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000019aa | 474.724 | 6.636 | n/a | 0.000 | 440.302 | 27.768 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 446.938 | 0.941 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e000000000000197a | 443.796 | 135.103 | n/a | 3.333 | 90.858 | 164.383 | 0.143 | 49.952 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.018 | 229.295 | 0.517 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019cc | 438.081 | 23.304 | n/a | 2.998 | 0.304 | 396.955 | 0.730 | 13.728 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.047 | 26.606 | 0.061 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 27.213ms; driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; client.parse 4.401ms |
| b19d8c740dc1ae2e00000000000019a2 | 417.550 | 7.441 | n/a | 0.000 | 351.500 | 58.597 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 358.940 | 0.860 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019d5 | 417.546 | 15.847 | n/a | 0.000 | 1.873 | 385.849 | 0.400 | 13.542 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.030 | 17.720 | 0.042 | 0.030 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 27.213ms; driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; client.parse 4.401ms |
| b19d8c740dc1ae2e0000000000001973 | 417.438 | 127.255 | n/a | 3.357 | 2.756 | 263.622 | 1.632 | 0.046 | 0.000 | 0.784 | 17.956 | n/a | n/a | 0.029 | 133.368 | 0.319 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019b2 | 402.488 | 3.650 | n/a | 0.000 | 370.239 | 28.557 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 373.888 | 0.929 | 0.042 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019b5 | 391.895 | 3.537 | n/a | 0.000 | 360.906 | 27.440 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 364.444 | 0.930 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e000000000000197b | 367.941 | 9.293 | n/a | 0.000 | 0.505 | 286.475 | 2.015 | 69.609 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.024 | 9.799 | 0.027 | 0.024 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e0000000000001994 | 359.496 | 4.260 | n/a | 0.000 | 223.198 | 109.345 | 4.006 | 0.073 | 0.000 | 15.345 | 3.248 | n/a | n/a | 0.022 | 227.458 | 0.633 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019ae | 340.019 | 4.284 | n/a | 0.000 | 308.944 | 26.773 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 313.228 | 0.921 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019bb | 335.593 | 8.529 | n/a | 0.000 | 306.840 | 20.209 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 315.369 | 0.940 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.135ms; driver.publication 4.426ms; driver.publication 3.733ms |
| b19d8c740dc1ae2e00000000000019a0 | 333.280 | 5.796 | n/a | 0.000 | 275.743 | 51.727 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 281.540 | 0.845 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e0000000000001978 | 329.319 | 158.217 | n/a | 6.691 | 3.643 | 142.618 | 1.482 | 8.708 | 0.000 | 0.897 | 7.048 | n/a | n/a | 0.016 | 168.551 | 0.512 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e000000000000196a | 325.046 | 3.521 | n/a | 0.000 | 39.216 | 109.129 | 1.257 | 0.035 | 0.000 | 1.636 | 170.230 | n/a | n/a | 0.021 | 42.737 | 0.131 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 2.055ms; driver.publication 1.585ms |
| b19d8c740dc1ae2e0000000000001968 | 300.645 | 295.804 | n/a | 3.357 | 1.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 300.633 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 1.585ms; driver.publication 1.391ms |
| b19d8c740dc1ae2e00000000000019bd | 298.443 | 2.972 | n/a | 0.000 | 273.670 | 21.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 276.642 | 0.927 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.135ms; driver.publication 4.426ms; driver.publication 3.733ms |
| b19d8c740dc1ae2e000000000000196c | 297.483 | 14.358 | n/a | 0.000 | 4.617 | 109.624 | 2.452 | 4.327 | 0.000 | 0.467 | 161.609 | n/a | n/a | 0.030 | 18.975 | 0.064 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 1.391ms; client.encode 1.349ms |
| b19d8c740dc1ae2e00000000000019e4 | 296.052 | 177.777 | n/a | 49.074 | 23.798 | 45.375 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 250.650 | 0.847 | 0.028 | node-14/thread-0/client.persist-and-resolve | driver.expected-state.bind-receipt 27.213ms; driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; driver.publication 4.830ms |
| b19d8c740dc1ae2e000000000000196b | 290.054 | 7.560 | n/a | 0.000 | 0.482 | 109.621 | 18.216 | 0.070 | 0.000 | 0.453 | 153.628 | n/a | n/a | 0.022 | 8.043 | 0.028 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 1.391ms; client.encode 1.349ms |

## P2 / L16 / commit / 5-10 facts (1051 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.758 | 3.410 | n/a | 0.000 | 0.845 | 13.312 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.578 | 0.265 | 0.016 |
| p99 | 238.552 | 127.255 | n/a | 6.691 | 141.520 | 109.484 | 1.889 | 0.061 | 0.000 | 1.116 | 14.574 | n/a | n/a | 0.063 | 194.306 | 1.000 | 0.063 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000019cc | 438.081 | 23.304 | n/a | 2.998 | 0.304 | 396.955 | 0.730 | 13.728 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.047 | 26.606 | 0.061 | 0.047 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 27.213ms; driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; client.parse 4.401ms |
| b19d8c740dc1ae2e0000000000001973 | 417.438 | 127.255 | n/a | 3.357 | 2.756 | 263.622 | 1.632 | 0.046 | 0.000 | 0.784 | 17.956 | n/a | n/a | 0.029 | 133.368 | 0.319 | 0.029 | node-14/thread-0/socket.wait-first-byte | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019b2 | 402.488 | 3.650 | n/a | 0.000 | 370.239 | 28.557 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 373.888 | 0.929 | 0.042 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019b5 | 391.895 | 3.537 | n/a | 0.000 | 360.906 | 27.440 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 364.444 | 0.930 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e00000000000019ae | 340.019 | 4.284 | n/a | 0.000 | 308.944 | 26.773 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 313.228 | 0.921 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 7.086ms; driver.publication 6.896ms; driver.publication 5.190ms; driver.publication 5.135ms; driver.publication 4.426ms |
| b19d8c740dc1ae2e000000000000196a | 325.046 | 3.521 | n/a | 0.000 | 39.216 | 109.129 | 1.257 | 0.035 | 0.000 | 1.636 | 170.230 | n/a | n/a | 0.021 | 42.737 | 0.131 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 2.055ms; driver.publication 1.585ms |
| b19d8c740dc1ae2e0000000000001968 | 300.645 | 295.804 | n/a | 3.357 | 1.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 300.633 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 1.585ms; driver.publication 1.391ms |
| b19d8c740dc1ae2e00000000000019e4 | 296.052 | 177.777 | n/a | 49.074 | 23.798 | 45.375 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 250.650 | 0.847 | 0.028 | node-14/thread-0/client.persist-and-resolve | driver.expected-state.bind-receipt 27.213ms; driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; driver.publication 4.830ms |
| b19d8c740dc1ae2e000000000000196e | 288.553 | 4.662 | n/a | 0.000 | 11.692 | 109.408 | 1.889 | 0.061 | 0.000 | 1.112 | 159.710 | n/a | n/a | 0.019 | 16.354 | 0.057 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication 6.483ms; client.encode 3.579ms; driver.expected-state.bind-receipt 2.830ms; driver.publication 1.391ms; client.encode 1.349ms |
| b19d8c740dc1ae2e00000000000019ff | 254.928 | 7.875 | n/a | 0.000 | 197.536 | 49.489 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 205.411 | 0.806 | 0.028 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 27.213ms; driver.publication 5.349ms; driver.publication 5.184ms; driver.publication 4.830ms; driver.publication 4.271ms |
| b19d8c740dc1ae2e0000000000002072 | 238.552 | 5.128 | n/a | 0.000 | 178.107 | 55.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 183.235 | 0.768 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.501ms; driver.publication 1.836ms; driver.publication 1.789ms; driver.expected-state.bind-receipt 1.361ms; driver.publication 1.332ms |
| b19d8c740dc1ae2e00000000000019c2 | 234.618 | 2.921 | n/a | 0.000 | 214.668 | 17.019 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 217.590 | 0.927 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 5.135ms; driver.publication 3.733ms; driver.publication 3.645ms; driver.publication 3.127ms; driver.expected-state.bind-receipt 2.926ms |
| b19d8c740dc1ae2e000000000000197f | 224.358 | 11.062 | n/a | 0.000 | 80.354 | 109.288 | 9.116 | 10.881 | 0.000 | 1.818 | 1.808 | n/a | n/a | 0.032 | 91.416 | 0.407 | 0.032 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.190ms; client.encode 3.579ms; driver.publication 1.738ms; driver.publication 1.470ms; driver.expected-state.bind-receipt 1.439ms |
| b19d8c740dc1ae2e00000000000019e1 | 222.925 | 7.288 | n/a | 0.000 | 60.660 | 129.840 | 5.911 | 0.127 | 0.000 | 1.735 | 17.332 | n/a | n/a | 0.031 | 67.948 | 0.305 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; client.parse 4.401ms; driver.publication 4.101ms |
| b19d8c740dc1ae2e00000000000019e2 | 222.637 | 144.997 | n/a | 22.206 | 55.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 222.625 | 1.000 | 0.013 | node-14/thread-0/client.persist-and-resolve | driver.expected-state.bind-receipt 5.679ms; driver.publication 5.349ms; driver.publication 5.184ms; driver.publication 4.101ms; driver.publication 3.861ms |
| b19d8c740dc1ae2e0000000000001970 | 222.198 | 13.127 | n/a | 0.000 | 0.315 | 112.215 | 1.797 | 0.075 | 0.000 | 28.872 | 65.352 | n/a | n/a | 0.445 | 13.442 | 0.060 | 0.445 | node-14/thread-0/socket.wait-first-byte | client.encode 3.579ms; driver.publication 1.432ms; driver.publication 1.391ms; client.encode 1.349ms; driver.publication 1.247ms |
| b19d8c740dc1ae2e00000000000019c0 | 218.935 | 2.843 | n/a | 0.000 | 197.339 | 18.743 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 200.181 | 0.914 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 5.135ms; driver.publication 3.733ms; driver.publication 3.645ms; driver.publication 3.127ms; driver.expected-state.bind-receipt 2.926ms |
| b19d8c740dc1ae2e00000000000019c6 | 218.459 | 2.876 | n/a | 0.000 | 194.344 | 21.224 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 197.220 | 0.903 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 5.135ms; driver.publication 3.733ms; driver.publication 3.645ms; driver.publication 3.127ms; driver.expected-state.bind-receipt 2.926ms |
| b19d8c740dc1ae2e00000000000014f4 | 204.638 | 10.534 | n/a | 0.000 | 141.520 | 52.557 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 152.054 | 0.743 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 12.922ms; driver.publication 6.093ms; driver.expected-state.add-commit 2.460ms; driver.expected-state.bind-receipt 1.882ms; driver.publication 1.813ms |
| b19d8c740dc1ae2e0000000000001845 | 202.690 | 2.654 | n/a | 0.000 | 121.345 | 78.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 123.999 | 0.612 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.771ms; driver.publication 2.867ms; driver.publication 2.516ms; driver.publication 2.275ms; driver.publication 1.794ms |

## P2 / L64 / commit (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.955 | 4.163 | n/a | 0.000 | 0.096 | 16.812 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.764 | 0.224 | 0.021 |
| p99 | 92.377 | 7.997 | n/a | 0.000 | 1.523 | 88.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 8.457 | 0.425 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002177 | 92.377 | 3.699 | n/a | 0.000 | 0.622 | 88.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.321 | 0.047 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000215a | 67.562 | 4.421 | 0.271 | 0.000 | 0.068 | 62.779 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.760 | 0.070 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002118 | 48.211 | 4.797 | n/a | 0.000 | 0.487 | 42.908 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.284 | 0.110 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002181 | 47.089 | 2.964 | 0.177 | 0.000 | 0.023 | 43.910 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.164 | 0.067 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000216c | 42.038 | 7.204 | 0.468 | 0.000 | 0.029 | 34.312 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.701 | 0.183 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002185 | 38.945 | 5.326 | 0.254 | 0.000 | 0.021 | 33.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.601 | 0.144 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000216e | 37.659 | 4.011 | 4.417 | 0.000 | 0.029 | 29.187 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 8.457 | 0.225 | 0.016 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.bind-receipt 1.385ms; driver.publication 1.193ms |
| b19d8c740dc1ae2e0000000000002100 | 35.899 | 3.341 | 0.388 | 0.000 | 0.034 | 32.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.763 | 0.105 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002179 | 35.564 | 3.033 | n/a | 0.000 | 0.147 | 32.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 3.181 | 0.089 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002189 | 35.432 | 3.392 | 0.190 | 0.000 | 0.021 | 31.813 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.602 | 0.102 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021a9 | 35.216 | 5.306 | 0.601 | 0.000 | 0.031 | 29.253 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.937 | 0.169 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000211a | 34.849 | 4.665 | 0.379 | 0.000 | 0.021 | 29.767 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.065 | 0.145 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002120 | 33.456 | 6.241 | 0.314 | 0.000 | 0.022 | 26.858 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 6.577 | 0.197 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000219f | 32.749 | 6.642 | 0.320 | 0.000 | 0.040 | 25.709 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 7.003 | 0.214 | 0.037 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002168 | 32.485 | 4.491 | 0.324 | 0.000 | 0.024 | 27.630 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.839 | 0.149 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002175 | 30.747 | 7.997 | 0.299 | 0.000 | 0.037 | 22.394 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 8.333 | 0.271 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002136 | 30.694 | 6.404 | n/a | 0.000 | 0.588 | 23.684 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 6.992 | 0.228 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000214e | 29.997 | 4.410 | 1.146 | 0.000 | 0.025 | 24.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.581 | 0.186 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000214c | 29.394 | 5.604 | 0.176 | 0.000 | 0.025 | 23.573 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.806 | 0.198 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000215c | 28.955 | 4.470 | 1.138 | 0.000 | 0.018 | 23.308 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.626 | 0.194 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / L64 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.567 | 3.699 | n/a | 0.000 | 0.591 | 10.711 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.394 | 0.284 | 0.023 |
| p99 | 92.377 | 5.658 | n/a | 0.000 | 1.523 | 88.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 6.723 | 0.425 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002177 | 92.377 | 3.699 | n/a | 0.000 | 0.622 | 88.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.321 | 0.047 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002179 | 35.564 | 3.033 | n/a | 0.000 | 0.147 | 32.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 3.181 | 0.089 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000218a | 23.252 | 4.982 | n/a | 0.000 | 1.027 | 17.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.009 | 0.258 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021ac | 22.927 | 3.726 | n/a | 0.000 | 0.319 | 18.838 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 4.044 | 0.176 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000020fe | 21.955 | 5.658 | n/a | 0.000 | 0.951 | 15.311 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 6.609 | 0.301 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000216a | 20.868 | 5.625 | n/a | 0.000 | 0.864 | 14.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.489 | 0.311 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002183 | 20.293 | 4.538 | n/a | 0.000 | 0.251 | 15.475 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 4.789 | 0.236 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000215e | 19.288 | 3.680 | n/a | 0.000 | 0.367 | 15.220 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.048 | 0.210 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002140 | 19.260 | 4.883 | n/a | 0.000 | 0.301 | 14.040 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.183 | 0.269 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002152 | 18.010 | 4.543 | n/a | 0.000 | 0.580 | 12.858 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.123 | 0.284 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002187 | 17.815 | 3.627 | n/a | 0.000 | 0.699 | 13.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.326 | 0.243 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021a3 | 17.745 | 3.819 | n/a | 0.000 | 0.575 | 13.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.394 | 0.248 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021aa | 17.495 | 5.164 | n/a | 0.000 | 0.870 | 11.437 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.033 | 0.345 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000020f0 | 16.742 | 5.633 | n/a | 0.000 | 1.091 | 9.994 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.723 | 0.402 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000213e | 16.634 | 3.329 | n/a | 0.000 | 0.040 | 13.247 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.369 | 0.203 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002101 | 16.575 | 3.404 | n/a | 0.000 | 0.938 | 12.215 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.342 | 0.262 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002104 | 16.229 | 3.188 | n/a | 0.000 | 0.636 | 12.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.824 | 0.236 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000212f | 15.567 | 3.519 | n/a | 0.000 | 0.978 | 11.046 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.497 | 0.289 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002134 | 15.295 | 4.755 | n/a | 0.000 | 1.038 | 9.484 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.792 | 0.379 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000211e | 15.023 | 4.311 | n/a | 0.000 | 1.090 | 9.583 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.402 | 0.360 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.407 | 4.164 | n/a | 0.000 | 0.101 | 16.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.703 | 0.227 | 0.024 |
| p99 | 73.263 | 22.551 | n/a | 0.000 | 1.923 | 66.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 23.297 | 1.000 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000021c4 | 73.263 | 5.979 | 0.248 | 0.000 | 0.037 | 66.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 6.264 | 0.086 | 0.026 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.142ms |
| b19d8c740dc1ae2e0000000000002269 | 65.248 | 3.797 | n/a | 0.000 | 0.469 | 60.965 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.266 | 0.065 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000221b | 53.949 | 4.823 | 0.357 | 0.000 | 0.032 | 48.720 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.212 | 0.097 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021c5 | 48.467 | 4.035 | n/a | 0.000 | 0.732 | 43.690 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 4.767 | 0.098 | 0.010 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021f1 | 42.866 | 4.511 | n/a | 0.000 | 0.576 | 37.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 5.088 | 0.119 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021fb | 40.095 | 4.281 | n/a | 0.000 | 0.600 | 35.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.881 | 0.122 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.087ms |
| b19d8c740dc1ae2e00000000000021c9 | 36.757 | 6.379 | n/a | 0.000 | 0.826 | 29.525 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 7.205 | 0.196 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002203 | 36.226 | 3.301 | n/a | 0.000 | 0.455 | 32.451 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.756 | 0.104 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021e4 | 35.882 | 3.265 | 0.301 | 0.000 | 0.013 | 32.289 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.579 | 0.100 | 0.015 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021f9 | 34.514 | 4.362 | 5.941 | 0.000 | 0.031 | 24.150 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 10.334 | 0.299 | 0.030 | node-14/thread-4/socket.wait-first-byte | driver.publication 4.087ms |
| b19d8c740dc1ae2e000000000000224f | 33.733 | 3.923 | 0.327 | 0.000 | 0.039 | 29.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.289 | 0.127 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002233 | 33.541 | 6.768 | 0.288 | 0.000 | 0.026 | 26.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 7.082 | 0.211 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021ca | 32.959 | 3.154 | 0.262 | 0.000 | 0.023 | 29.502 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.439 | 0.104 | 0.018 | node-14/thread-4/socket.wait-first-byte | driver.publication 2.401ms |
| b19d8c740dc1ae2e0000000000002229 | 31.546 | 3.342 | 0.241 | 0.000 | 0.035 | 27.909 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.619 | 0.115 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002265 | 31.339 | 4.164 | 0.241 | 0.000 | 0.033 | 26.880 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.438 | 0.142 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021ff | 30.116 | 3.888 | 0.289 | 0.000 | 0.039 | 25.881 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.216 | 0.140 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021d0 | 29.657 | 3.559 | 0.193 | 0.000 | 0.030 | 25.852 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.781 | 0.127 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002249 | 28.911 | 4.672 | 0.275 | 0.000 | 0.045 | 23.877 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 4.992 | 0.173 | 0.041 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021af | 28.856 | 5.775 | 0.294 | 0.000 | 0.021 | 22.743 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 6.090 | 0.211 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000226f | 28.767 | 3.505 | 0.230 | 0.000 | 0.031 | 24.984 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.766 | 0.131 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.569 | 4.199 | n/a | 0.000 | 0.498 | 11.882 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.881 | 0.293 | 0.024 |
| p99 | 42.866 | 22.551 | n/a | 0.000 | 1.376 | 37.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 23.297 | 1.000 | 0.034 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000021f1 | 42.866 | 4.511 | n/a | 0.000 | 0.576 | 37.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 5.088 | 0.119 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021fb | 40.095 | 4.281 | n/a | 0.000 | 0.600 | 35.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.881 | 0.122 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.087ms |
| b19d8c740dc1ae2e0000000000002203 | 36.226 | 3.301 | n/a | 0.000 | 0.455 | 32.451 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.756 | 0.104 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002266 | 26.371 | 5.639 | n/a | 0.000 | 0.498 | 20.214 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 6.137 | 0.233 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002245 | 23.307 | 22.551 | n/a | 0.000 | 0.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 23.297 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.070ms |
| b19d8c740dc1ae2e000000000000225d | 22.405 | 6.520 | n/a | 0.000 | 0.377 | 15.474 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 6.897 | 0.308 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002205 | 21.801 | 4.186 | n/a | 0.000 | 0.144 | 17.443 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.330 | 0.199 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021b1 | 21.210 | 5.083 | n/a | 0.000 | 0.095 | 16.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.178 | 0.244 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002200 | 21.111 | 3.665 | n/a | 0.000 | 1.376 | 16.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.041 | 0.239 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002220 | 20.867 | 7.299 | n/a | 0.000 | 0.203 | 13.341 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 7.502 | 0.360 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000223e | 19.971 | 4.572 | n/a | 0.000 | 0.212 | 15.165 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.783 | 0.240 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021e2 | 19.795 | 5.228 | n/a | 0.000 | 0.969 | 13.572 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 6.197 | 0.313 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000225a | 19.619 | 3.612 | n/a | 0.000 | 0.197 | 15.794 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.808 | 0.194 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021c8 | 19.113 | 6.555 | n/a | 0.000 | 0.440 | 12.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 6.995 | 0.366 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021fa | 18.997 | 5.960 | n/a | 0.000 | 1.144 | 11.882 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 7.104 | 0.374 | 0.011 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000222d | 18.259 | 5.332 | n/a | 0.000 | 0.187 | 12.711 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.519 | 0.302 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021f3 | 17.572 | 4.156 | n/a | 0.000 | 0.095 | 13.291 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.251 | 0.242 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000021e6 | 17.569 | 3.351 | n/a | 0.000 | 0.643 | 13.559 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.993 | 0.227 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002251 | 16.880 | 4.735 | n/a | 0.000 | 0.500 | 11.621 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.235 | 0.310 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002262 | 16.632 | 5.046 | n/a | 0.000 | 0.858 | 10.695 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 5.905 | 0.355 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1024 / commit (94 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.766 | 4.402 | n/a | 0.000 | 0.142 | 18.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.885 | 0.217 | 0.022 |
| p99 | 245.991 | 57.296 | n/a | 4.033 | 2.971 | 125.704 | 8.676 | 0.081 | 0.000 | 17.048 | 58.052 | n/a | n/a | 0.068 | 58.116 | 0.464 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000022ac | 245.991 | 50.444 | n/a | 0.000 | 1.198 | 110.424 | 8.676 | 0.081 | 0.000 | 17.048 | 58.052 | n/a | n/a | 0.068 | 51.642 | 0.210 | 0.068 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022ad | 183.854 | 57.296 | 0.789 | 0.000 | 0.031 | 125.704 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 58.116 | 0.316 | 0.034 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.bind-receipt 17.288ms; driver.publication 11.927ms |
| b19d8c740dc1ae2e00000000000022b2 | 106.461 | 6.372 | 0.256 | 0.000 | 0.038 | 99.775 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 6.666 | 0.063 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002283 | 82.831 | 5.524 | 7.832 | 0.000 | 0.026 | 69.427 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 13.382 | 0.162 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022e0 | 74.147 | 13.083 | n/a | 0.000 | 1.028 | 60.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 14.111 | 0.190 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022f6 | 56.314 | 4.024 | 0.203 | 0.000 | 0.036 | 52.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.263 | 0.076 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022e4 | 54.424 | 4.452 | 0.289 | 0.000 | 0.038 | 49.627 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.778 | 0.088 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000227e | 53.100 | 6.914 | n/a | 4.033 | 0.638 | 41.496 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 11.585 | 0.218 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022cc | 45.036 | 5.064 | 0.289 | 0.000 | 0.031 | 39.630 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 5.384 | 0.120 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002293 | 44.929 | 4.557 | 0.252 | 0.000 | 0.041 | 40.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.850 | 0.108 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002278 | 43.660 | 4.899 | 0.212 | 0.000 | 0.023 | 38.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.134 | 0.118 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022b0 | 40.886 | 3.615 | 1.106 | 0.000 | 0.026 | 36.118 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.747 | 0.116 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000231d | 40.388 | 7.316 | 0.339 | 0.000 | 0.042 | 32.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 7.697 | 0.191 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002281 | 39.938 | 4.975 | n/a | 1.486 | 0.400 | 33.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 6.862 | 0.172 | 0.039 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022c2 | 39.874 | 5.429 | 0.294 | 0.000 | 0.016 | 34.119 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.739 | 0.144 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002271 | 39.776 | 3.589 | 3.586 | 0.000 | 0.028 | 32.555 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.203 | 0.181 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002325 | 39.211 | 3.493 | 0.259 | 0.000 | 0.042 | 35.397 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.793 | 0.097 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022a3 | 37.881 | 5.682 | 0.321 | 0.000 | 0.032 | 31.801 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 6.036 | 0.159 | 0.044 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002285 | 34.699 | 4.313 | 0.244 | 0.000 | 0.018 | 30.104 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.575 | 0.132 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000227a | 34.164 | 4.442 | n/a | 0.000 | 0.154 | 29.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.595 | 0.135 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1024 / commit / 5-10 facts (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.227 | 3.870 | n/a | 0.000 | 0.525 | 13.293 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.569 | 0.286 | 0.024 |
| p99 | 34.164 | 10.031 | n/a | 0.000 | 2.971 | 29.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 11.339 | 0.430 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000227a | 34.164 | 4.442 | n/a | 0.000 | 0.154 | 29.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.595 | 0.135 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022aa | 31.396 | 10.031 | n/a | 0.000 | 1.308 | 20.017 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 11.339 | 0.361 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002295 | 26.437 | 3.805 | n/a | 0.000 | 0.534 | 22.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.338 | 0.164 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000232a | 24.143 | 5.007 | n/a | 0.000 | 0.899 | 18.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 5.906 | 0.245 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022b8 | 23.896 | 6.760 | n/a | 0.000 | 0.391 | 16.700 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 7.151 | 0.299 | 0.044 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022f9 | 23.332 | 7.330 | n/a | 0.000 | 0.786 | 15.186 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 8.116 | 0.348 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022fc | 22.865 | 3.870 | n/a | 0.000 | 0.260 | 18.710 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.129 | 0.181 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022c0 | 22.393 | 4.745 | n/a | 0.000 | 1.099 | 16.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.844 | 0.261 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002310 | 21.300 | 4.843 | n/a | 0.000 | 1.244 | 15.170 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 6.087 | 0.286 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022a7 | 20.677 | 4.376 | n/a | 0.000 | 0.414 | 15.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 4.790 | 0.232 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002306 | 20.596 | 4.055 | n/a | 0.000 | 0.513 | 16.005 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.569 | 0.222 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022c9 | 19.155 | 3.683 | n/a | 0.000 | 2.971 | 12.482 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 6.654 | 0.347 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.186ms |
| b19d8c740dc1ae2e00000000000022ee | 18.910 | 3.697 | n/a | 0.000 | 0.702 | 14.491 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.398 | 0.233 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002272 | 18.518 | 3.705 | n/a | 0.000 | 0.313 | 14.481 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.018 | 0.217 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022f4 | 18.227 | 2.822 | n/a | 0.000 | 0.781 | 14.603 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.602 | 0.198 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022e5 | 17.319 | 3.875 | n/a | 0.000 | 0.132 | 13.293 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.006 | 0.231 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000022ce | 16.775 | 3.578 | n/a | 0.000 | 0.525 | 12.651 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.104 | 0.245 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002299 | 16.661 | 6.827 | n/a | 0.000 | 0.329 | 9.471 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 7.156 | 0.430 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002288 | 16.117 | 4.984 | n/a | 0.000 | 0.239 | 10.863 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.223 | 0.324 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000228c | 15.433 | 3.654 | n/a | 0.000 | 0.996 | 10.759 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.649 | 0.301 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / recovery / commit (141 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.370 | 4.468 | n/a | 0.000 | 0.248 | 15.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 5.068 | 0.247 | 0.022 |
| p99 | 103.250 | 11.863 | n/a | 0.000 | 1.132 | 96.507 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.053 | 14.216 | 0.515 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000023a1 | 140.778 | 7.050 | n/a | 0.000 | 0.653 | 109.290 | 1.243 | 0.042 | 0.000 | 10.874 | 11.591 | n/a | n/a | 0.035 | 7.703 | 0.055 | 0.035 | node-14/thread-0/socket.wait-first-byte | client.parse 1.137ms |
| b19d8c740dc1ae2e00000000000023e2 | 103.250 | 8.683 | n/a | 0.000 | 1.114 | 93.392 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.060 | 9.797 | 0.095 | 0.060 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002368 | 102.090 | 4.836 | n/a | 0.000 | 0.729 | 96.507 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.565 | 0.055 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002367 | 100.575 | 7.960 | 0.751 | 0.000 | 0.017 | 91.830 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 8.728 | 0.087 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023eb | 72.358 | 4.114 | 0.323 | 0.000 | 0.041 | 67.858 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.478 | 0.062 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002399 | 70.979 | 3.894 | n/a | 0.000 | 0.516 | 66.517 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 4.410 | 0.062 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023a3 | 55.233 | 5.479 | 0.472 | 0.000 | 0.022 | 49.210 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 5.974 | 0.108 | 0.049 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002404 | 52.757 | 23.410 | n/a | 0.000 | 0.077 | 29.230 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 23.487 | 0.445 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000239b | 42.978 | 6.717 | n/a | 0.000 | 0.086 | 36.153 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.802 | 0.158 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002341 | 42.208 | 11.261 | n/a | 0.000 | 0.263 | 30.666 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 11.524 | 0.273 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002355 | 41.916 | 6.387 | 0.715 | 0.000 | 0.043 | 34.752 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.145 | 0.170 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000239d | 39.441 | 5.028 | n/a | 0.000 | 0.135 | 34.256 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.162 | 0.131 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000232f | 38.079 | 7.089 | 0.221 | 0.000 | 0.018 | 30.732 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 7.328 | 0.192 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000233e | 37.767 | 6.599 | 4.662 | 0.000 | 0.041 | 26.442 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 11.302 | 0.299 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002415 | 37.113 | 3.844 | 0.331 | 0.000 | 0.034 | 32.885 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.210 | 0.113 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000233f | 36.443 | 5.177 | n/a | 0.000 | 0.712 | 30.536 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.889 | 0.162 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 2.577ms |
| b19d8c740dc1ae2e0000000000002361 | 36.078 | 3.899 | 0.267 | 0.000 | 0.027 | 31.857 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.193 | 0.116 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023df | 35.196 | 5.578 | n/a | 0.000 | 0.322 | 29.278 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.900 | 0.168 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023fe | 35.124 | 4.605 | n/a | 0.000 | 0.875 | 29.617 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.480 | 0.156 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023a7 | 34.278 | 4.137 | 0.274 | 0.000 | 0.016 | 29.834 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.427 | 0.129 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / recovery / commit / 5-10 facts (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.483 | 4.109 | n/a | 0.000 | 0.653 | 11.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.593 | 0.291 | 0.022 |
| p99 | 140.778 | 8.059 | n/a | 0.000 | 1.248 | 109.290 | 1.243 | 0.042 | 0.000 | 10.874 | 11.591 | n/a | n/a | 0.051 | 8.976 | 0.436 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000023a1 | 140.778 | 7.050 | n/a | 0.000 | 0.653 | 109.290 | 1.243 | 0.042 | 0.000 | 10.874 | 11.591 | n/a | n/a | 0.035 | 7.703 | 0.055 | 0.035 | node-14/thread-0/socket.wait-first-byte | client.parse 1.137ms |
| b19d8c740dc1ae2e0000000000002399 | 70.979 | 3.894 | n/a | 0.000 | 0.516 | 66.517 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 4.410 | 0.062 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000239d | 39.441 | 5.028 | n/a | 0.000 | 0.135 | 34.256 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.162 | 0.131 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000233f | 36.443 | 5.177 | n/a | 0.000 | 0.712 | 30.536 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.889 | 0.162 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 2.577ms |
| b19d8c740dc1ae2e00000000000023df | 35.196 | 5.578 | n/a | 0.000 | 0.322 | 29.278 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.900 | 0.168 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023fe | 35.124 | 4.605 | n/a | 0.000 | 0.875 | 29.617 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.480 | 0.156 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023a8 | 26.011 | 7.067 | n/a | 0.000 | 0.121 | 18.805 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.188 | 0.276 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002420 | 25.342 | 4.267 | n/a | 0.000 | 0.533 | 20.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.800 | 0.189 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000234d | 24.593 | 8.059 | n/a | 0.000 | 0.917 | 15.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 8.976 | 0.365 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023ec | 23.911 | 5.099 | n/a | 0.000 | 0.686 | 18.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.785 | 0.242 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000236f | 23.476 | 5.591 | n/a | 0.000 | 0.197 | 17.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.788 | 0.247 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023c5 | 23.451 | 6.035 | n/a | 0.000 | 0.946 | 16.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 6.980 | 0.298 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002371 | 21.877 | 4.601 | n/a | 0.000 | 0.238 | 17.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.840 | 0.221 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002424 | 20.647 | 7.719 | n/a | 0.000 | 0.065 | 12.835 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 7.785 | 0.377 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000235f | 19.451 | 3.502 | n/a | 0.000 | 0.957 | 14.978 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 4.458 | 0.229 | 0.014 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000242c | 18.794 | 4.406 | n/a | 0.000 | 1.066 | 13.293 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 5.472 | 0.291 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000023d1 | 18.495 | 3.415 | n/a | 0.000 | 0.565 | 14.503 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.979 | 0.215 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002408 | 17.960 | 6.366 | n/a | 0.000 | 0.406 | 11.164 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.773 | 0.377 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002381 | 16.879 | 4.529 | n/a | 0.000 | 0.377 | 11.947 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.906 | 0.291 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000237f | 16.854 | 3.573 | n/a | 0.000 | 0.060 | 13.203 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.634 | 0.216 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4mix / commit (103 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.194 | 4.028 | n/a | 0.000 | 0.194 | 12.686 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.617 | 0.270 | 0.021 |
| p99 | 55.930 | 9.653 | n/a | 3.245 | 1.805 | 51.662 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 13.946 | 0.543 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000247f | 126.774 | 5.121 | 0.356 | 0.000 | 0.811 | 119.379 | 1.031 | 0.005 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.054 | 6.289 | 0.050 | 0.054 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002471 | 55.930 | 3.992 | 0.232 | 0.000 | 0.021 | 51.662 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.245 | 0.076 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002481 | 49.683 | 4.084 | n/a | 0.000 | 1.805 | 43.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.890 | 0.119 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.210ms; driver.expected-state.bind-receipt 1.071ms |
| b19d8c740dc1ae2e0000000000002480 | 47.892 | 8.768 | n/a | 0.000 | 0.080 | 39.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 8.847 | 0.185 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002447 | 42.025 | 6.652 | 0.276 | 0.000 | 0.019 | 35.056 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 6.947 | 0.165 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024b8 | 38.862 | 5.294 | 0.389 | 0.000 | 0.026 | 33.134 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.709 | 0.147 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000244b | 35.838 | 9.653 | 0.532 | 0.000 | 0.037 | 25.584 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 10.222 | 0.285 | 0.031 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024d7 | 35.056 | 10.511 | n/a | 3.245 | 0.190 | 21.073 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 13.946 | 0.398 | 0.037 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000245d | 33.330 | 3.133 | 1.629 | 0.000 | 0.017 | 28.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.779 | 0.143 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000248c | 33.245 | 9.544 | n/a | 1.383 | 0.143 | 22.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 11.069 | 0.333 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000250b | 29.979 | 3.858 | 0.234 | 0.000 | 0.017 | 25.854 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.109 | 0.137 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002459 | 29.555 | 2.810 | 0.503 | 0.000 | 0.018 | 26.211 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.331 | 0.113 | 0.013 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000250e | 29.042 | 5.018 | n/a | 0.000 | 0.600 | 23.402 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.619 | 0.193 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024d4 | 29.005 | 3.437 | 0.238 | 0.000 | 0.022 | 25.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.697 | 0.127 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000244e | 28.695 | 9.094 | n/a | 0.000 | 8.509 | 11.062 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 17.603 | 0.613 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002479 | 28.505 | 4.268 | 0.273 | 0.000 | 0.039 | 23.903 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.580 | 0.161 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002505 | 27.262 | 5.200 | 0.243 | 0.000 | 0.027 | 21.773 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.470 | 0.201 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000250d | 26.206 | 3.067 | 0.206 | 0.000 | 0.020 | 22.893 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.293 | 0.126 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024cd | 25.990 | 5.900 | n/a | 0.000 | 0.675 | 19.386 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 6.575 | 0.253 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002453 | 25.631 | 7.292 | n/a | 3.799 | 0.811 | 13.710 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 11.903 | 0.464 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4mix / commit / 5-10 facts (32 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.367 | 3.849 | n/a | 0.000 | 0.799 | 10.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.589 | 0.317 | 0.021 |
| p99 | 49.683 | 9.094 | n/a | 1.323 | 8.509 | 43.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 17.603 | 0.613 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002481 | 49.683 | 4.084 | n/a | 0.000 | 1.805 | 43.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.890 | 0.119 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.210ms; driver.expected-state.bind-receipt 1.071ms |
| b19d8c740dc1ae2e000000000000244e | 28.695 | 9.094 | n/a | 0.000 | 8.509 | 11.062 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 17.603 | 0.613 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024b2 | 22.749 | 3.354 | n/a | 0.000 | 0.799 | 18.573 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.152 | 0.183 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024d8 | 21.836 | 3.482 | n/a | 0.000 | 0.924 | 17.417 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.406 | 0.202 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.199ms; driver.publication 1.070ms |
| b19d8c740dc1ae2e000000000000249a | 21.067 | 2.965 | n/a | 0.000 | 0.135 | 17.948 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.100 | 0.147 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024eb | 20.904 | 3.553 | n/a | 0.000 | 0.821 | 16.514 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.375 | 0.209 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000245a | 19.950 | 3.319 | n/a | 0.000 | 0.577 | 16.033 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.896 | 0.195 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002469 | 19.265 | 3.038 | n/a | 1.323 | 0.381 | 14.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.741 | 0.246 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024a3 | 18.223 | 7.023 | n/a | 0.000 | 0.952 | 10.207 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 7.975 | 0.438 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024dc | 18.162 | 5.892 | n/a | 0.000 | 0.827 | 11.406 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 6.719 | 0.370 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024e2 | 17.543 | 4.230 | n/a | 0.000 | 0.980 | 12.297 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 5.210 | 0.297 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024f7 | 17.358 | 4.218 | n/a | 0.000 | 1.143 | 11.964 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.361 | 0.309 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024fe | 17.283 | 3.527 | n/a | 0.000 | 1.062 | 12.675 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.589 | 0.266 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000246e | 17.167 | 6.113 | n/a | 0.000 | 0.591 | 10.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 6.705 | 0.391 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002462 | 16.776 | 5.103 | n/a | 0.000 | 0.194 | 11.449 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 5.297 | 0.316 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000249d | 16.598 | 4.233 | n/a | 0.000 | 1.009 | 11.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 5.242 | 0.316 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000247a | 16.367 | 4.530 | n/a | 0.000 | 0.715 | 11.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.245 | 0.320 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002485 | 15.687 | 3.724 | n/a | 0.000 | 0.442 | 11.502 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.166 | 0.266 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024bb | 15.622 | 4.677 | n/a | 0.000 | 1.144 | 9.773 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.821 | 0.373 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000024d1 | 14.947 | 4.827 | n/a | 0.000 | 0.536 | 9.556 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.363 | 0.359 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.122 | 3.049 | n/a | 0.000 | 0.501 | 13.224 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.279 | 0.178 | 0.021 |
| p99 | 54.385 | 6.428 | n/a | 0.000 | 2.838 | 47.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 6.992 | 0.451 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002515 | 54.385 | 5.496 | n/a | 0.000 | 1.035 | 47.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.046 | 6.531 | 0.120 | 0.046 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000263f | 29.790 | 6.428 | n/a | 0.000 | 0.564 | 22.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 6.992 | 0.235 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027ab | 22.811 | 2.032 | n/a | 0.000 | 1.027 | 19.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 3.059 | 0.134 | 0.007 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.263ms |
| b19d8c740dc1ae2e00000000000027aa | 21.733 | 3.049 | n/a | 0.000 | 0.230 | 18.430 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.279 | 0.151 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027a8 | 16.122 | 2.754 | n/a | 0.000 | 0.124 | 13.224 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 2.878 | 0.178 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002868 | 15.400 | 4.101 | n/a | 0.000 | 2.838 | 8.445 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 6.938 | 0.451 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000263b | 13.852 | 2.966 | n/a | 0.000 | 0.256 | 10.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.222 | 0.233 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002638 | 12.370 | 3.247 | n/a | 0.000 | 0.501 | 8.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 3.748 | 0.303 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h1 / commit (93 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.334 | 4.099 | n/a | 0.000 | 0.053 | 16.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.626 | 0.229 | 0.022 |
| p99 | 158.387 | 35.300 | n/a | 1.737 | 1.603 | 122.545 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.082 | 35.808 | 0.480 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000258a | 158.387 | 35.300 | n/a | 0.000 | 0.508 | 122.545 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 35.808 | 0.226 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025ac | 107.635 | 20.684 | n/a | 0.000 | 1.603 | 85.306 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 22.288 | 0.207 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002589 | 98.212 | 17.140 | 0.779 | 0.000 | 0.023 | 80.253 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 17.942 | 0.183 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000259f | 81.884 | 3.526 | 0.196 | 0.000 | 0.021 | 78.123 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.743 | 0.046 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002563 | 77.898 | 10.157 | n/a | 0.000 | 0.246 | 67.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 10.403 | 0.134 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025b6 | 56.702 | 17.556 | n/a | 0.000 | 0.490 | 38.628 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 18.046 | 0.318 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000253e | 51.985 | 2.991 | 0.204 | 0.000 | 0.027 | 48.731 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 3.222 | 0.062 | 0.031 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002593 | 49.549 | 18.913 | n/a | 0.000 | 0.285 | 30.317 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 19.198 | 0.387 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000258f | 45.792 | 5.801 | 0.572 | 0.000 | 0.049 | 39.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 6.422 | 0.140 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025b1 | 41.207 | 6.351 | 0.656 | 0.000 | 0.053 | 34.124 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 7.060 | 0.171 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000257f | 38.546 | 3.472 | 0.289 | 0.000 | 0.033 | 34.733 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.793 | 0.098 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025ae | 37.786 | 7.098 | n/a | 0.000 | 0.264 | 30.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 7.361 | 0.195 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025c5 | 36.166 | 4.342 | 0.281 | 0.000 | 0.022 | 31.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.645 | 0.128 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002591 | 35.907 | 3.557 | 0.249 | 0.000 | 0.020 | 32.064 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.826 | 0.107 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002575 | 35.731 | 3.008 | 0.290 | 0.000 | 0.025 | 32.390 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.323 | 0.093 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002567 | 34.420 | 3.848 | 0.326 | 0.000 | 0.025 | 30.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.199 | 0.122 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025cc | 34.361 | 6.345 | 0.411 | 0.000 | 0.008 | 27.586 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 6.763 | 0.197 | 0.012 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.167ms |
| b19d8c740dc1ae2e00000000000025b5 | 31.746 | 7.926 | 0.440 | 0.000 | 0.021 | 23.342 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 8.387 | 0.264 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025a8 | 31.427 | 4.749 | n/a | 0.000 | 0.846 | 25.800 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.596 | 0.178 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002595 | 30.294 | 3.207 | 0.482 | 0.000 | 0.016 | 26.561 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.705 | 0.122 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |

## P4 / p4h1 / commit / 5-10 facts (31 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.995 | 4.094 | n/a | 0.000 | 0.645 | 10.925 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.657 | 0.285 | 0.024 |
| p99 | 77.898 | 10.157 | n/a | 0.000 | 1.048 | 67.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 10.403 | 0.400 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002563 | 77.898 | 10.157 | n/a | 0.000 | 0.246 | 67.469 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 10.403 | 0.134 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025ae | 37.786 | 7.098 | n/a | 0.000 | 0.264 | 30.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 7.361 | 0.195 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002519 | 29.793 | 3.509 | n/a | 0.000 | 0.231 | 26.029 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.740 | 0.126 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025b2 | 29.727 | 4.889 | n/a | 0.000 | 0.703 | 24.115 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.593 | 0.188 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002529 | 21.153 | 4.384 | n/a | 0.000 | 0.698 | 16.050 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.082 | 0.240 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000251e | 21.038 | 3.928 | n/a | 0.000 | 1.032 | 16.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.960 | 0.236 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002544 | 20.334 | 4.165 | n/a | 0.000 | 0.560 | 15.582 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.725 | 0.232 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025a0 | 18.898 | 5.081 | n/a | 0.000 | 0.416 | 13.375 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.497 | 0.291 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000258c | 18.304 | 6.301 | n/a | 0.000 | 0.842 | 11.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.143 | 0.390 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000255b | 18.061 | 3.885 | n/a | 0.000 | 0.110 | 14.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 3.995 | 0.221 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002580 | 17.301 | 5.036 | n/a | 0.000 | 0.705 | 11.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.045 | 5.741 | 0.332 | 0.045 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002565 | 16.922 | 4.094 | n/a | 0.000 | 0.686 | 12.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.780 | 0.282 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000257a | 16.696 | 3.234 | n/a | 0.000 | 0.790 | 12.643 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 4.024 | 0.241 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025ce | 16.586 | 5.504 | n/a | 0.000 | 0.910 | 10.137 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 6.414 | 0.387 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000257c | 16.102 | 4.630 | n/a | 0.000 | 0.873 | 10.577 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.503 | 0.342 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002526 | 15.995 | 5.120 | n/a | 0.000 | 0.996 | 9.847 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 6.116 | 0.382 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002549 | 15.890 | 3.838 | n/a | 0.000 | 0.690 | 11.342 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.528 | 0.285 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002554 | 15.738 | 2.853 | n/a | 0.000 | 0.750 | 12.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.603 | 0.229 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025a2 | 15.187 | 4.401 | n/a | 0.000 | 0.212 | 10.553 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.613 | 0.304 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000254f | 15.021 | 3.299 | n/a | 0.000 | 0.811 | 10.895 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.110 | 0.274 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow3 / commit (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 55.770 | 5.155 | n/a | 0.000 | 0.215 | 41.828 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 6.446 | 0.145 | 0.020 |
| p99 | 247.376 | 77.852 | n/a | 6.159 | 19.594 | 115.050 | 1.743 | 0.039 | 0.000 | 2.119 | 111.294 | n/a | n/a | 0.080 | 83.313 | 1.000 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000025fb | 247.376 | 5.562 | 13.310 | 0.000 | 0.034 | 115.050 | 0.546 | 0.025 | 0.000 | 1.536 | 111.294 | n/a | n/a | 0.018 | 18.906 | 0.076 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025f0 | 156.399 | 6.394 | n/a | 0.000 | 0.052 | 109.371 | 0.895 | 0.032 | 0.000 | 2.119 | 37.500 | n/a | n/a | 0.036 | 6.446 | 0.041 | 0.036 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000260f | 150.216 | 2.991 | 18.824 | 0.000 | 0.019 | 110.630 | 1.131 | 0.039 | 0.000 | 1.326 | 15.233 | n/a | n/a | 0.022 | 21.834 | 0.145 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000261f | 134.766 | 4.229 | n/a | 0.000 | 0.469 | 109.351 | 0.860 | 0.026 | 0.000 | 1.817 | 17.985 | n/a | n/a | 0.029 | 4.698 | 0.035 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025d9 | 127.093 | 5.216 | n/a | 0.000 | 0.385 | 109.099 | 0.609 | 0.033 | 0.000 | 1.068 | 10.658 | n/a | n/a | 0.026 | 5.600 | 0.044 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025de | 118.071 | 5.941 | n/a | 0.000 | 0.163 | 109.022 | 1.743 | 0.039 | 0.000 | 0.344 | 0.750 | n/a | n/a | 0.069 | 6.104 | 0.052 | 0.069 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002611 | 110.829 | 2.318 | n/a | 0.000 | 0.632 | 107.859 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 2.951 | 0.027 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002631 | 110.537 | 3.956 | n/a | 0.000 | 0.721 | 105.843 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.677 | 0.042 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025d3 | 83.354 | 77.852 | n/a | 3.385 | 2.076 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 83.313 | 1.000 | 0.041 | node-14/thread-0/client.persist-and-resolve | client.encode 4.588ms; driver.publication 1.859ms |
| b19d8c740dc1ae2e000000000000261b | 73.371 | 3.457 | 16.632 | 0.000 | 0.034 | 53.228 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 20.123 | 0.274 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002609 | 72.631 | 4.336 | 10.376 | 0.000 | 0.020 | 57.884 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 14.732 | 0.203 | 0.014 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002632 | 62.912 | 10.062 | n/a | 0.000 | 0.215 | 52.610 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 10.277 | 0.163 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.897ms |
| b19d8c740dc1ae2e0000000000002615 | 62.246 | 51.497 | n/a | 6.159 | 4.576 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 62.232 | 1.000 | 0.013 | node-14/thread-0/client.persist-and-resolve | client.encode 3.082ms; driver.publication 1.213ms |
| b19d8c740dc1ae2e000000000000262a | 58.135 | 7.498 | 10.253 | 0.000 | 0.036 | 40.332 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 17.787 | 0.306 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025ea | 55.770 | 5.322 | n/a | 0.000 | 0.330 | 50.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.652 | 0.101 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025f5 | 50.957 | 4.487 | n/a | 0.000 | 0.099 | 46.332 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 4.586 | 0.090 | 0.039 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002600 | 50.485 | 5.631 | 0.201 | 0.000 | 0.026 | 44.604 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.858 | 0.116 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025d5 | 49.827 | 6.055 | n/a | 0.000 | 1.929 | 41.828 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.984 | 0.160 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.859ms |
| b19d8c740dc1ae2e0000000000002633 | 48.980 | 8.428 | n/a | 0.000 | 0.732 | 39.804 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 9.160 | 0.187 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.246ms; driver.publication 1.897ms |
| b19d8c740dc1ae2e0000000000002624 | 47.312 | 5.078 | n/a | 0.000 | 0.487 | 41.729 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.564 | 0.118 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow3 / commit / 5-10 facts (11 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 62.912 | 5.216 | n/a | 0.000 | 0.469 | 50.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 5.652 | 0.101 | 0.025 |
| p99 | 134.766 | 77.852 | n/a | 6.159 | 15.922 | 109.351 | 1.743 | 0.039 | 0.000 | 1.817 | 17.985 | n/a | n/a | 0.069 | 83.313 | 1.000 | 0.069 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000261f | 134.766 | 4.229 | n/a | 0.000 | 0.469 | 109.351 | 0.860 | 0.026 | 0.000 | 1.817 | 17.985 | n/a | n/a | 0.029 | 4.698 | 0.035 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025d9 | 127.093 | 5.216 | n/a | 0.000 | 0.385 | 109.099 | 0.609 | 0.033 | 0.000 | 1.068 | 10.658 | n/a | n/a | 0.026 | 5.600 | 0.044 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025de | 118.071 | 5.941 | n/a | 0.000 | 0.163 | 109.022 | 1.743 | 0.039 | 0.000 | 0.344 | 0.750 | n/a | n/a | 0.069 | 6.104 | 0.052 | 0.069 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002611 | 110.829 | 2.318 | n/a | 0.000 | 0.632 | 107.859 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 2.951 | 0.027 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025d3 | 83.354 | 77.852 | n/a | 3.385 | 2.076 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 83.313 | 1.000 | 0.041 | node-14/thread-0/client.persist-and-resolve | client.encode 4.588ms; driver.publication 1.859ms |
| b19d8c740dc1ae2e0000000000002632 | 62.912 | 10.062 | n/a | 0.000 | 0.215 | 52.610 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 10.277 | 0.163 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.897ms |
| b19d8c740dc1ae2e0000000000002615 | 62.246 | 51.497 | n/a | 6.159 | 4.576 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 62.232 | 1.000 | 0.013 | node-14/thread-0/client.persist-and-resolve | client.encode 3.082ms; driver.publication 1.213ms |
| b19d8c740dc1ae2e00000000000025ea | 55.770 | 5.322 | n/a | 0.000 | 0.330 | 50.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.652 | 0.101 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000025f5 | 50.957 | 4.487 | n/a | 0.000 | 0.099 | 46.332 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.039 | 4.586 | 0.090 | 0.039 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002624 | 47.312 | 5.078 | n/a | 0.000 | 0.487 | 41.729 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.564 | 0.118 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002622 | 45.405 | 4.929 | n/a | 0.000 | 15.922 | 24.541 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 20.851 | 0.459 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.encode 2.469ms |

## P4 / p4h3 / commit (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.721 | 3.760 | n/a | 0.000 | 0.096 | 14.159 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.252 | 0.225 | 0.020 |
| p99 | 66.276 | 9.671 | n/a | 0.000 | 1.362 | 61.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 10.069 | 0.480 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000026fe | 66.276 | 3.979 | 0.266 | 0.000 | 0.031 | 61.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.276 | 0.065 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002661 | 53.056 | 3.957 | 0.220 | 0.000 | 0.042 | 48.818 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.220 | 0.080 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002641 | 37.314 | 4.394 | 0.233 | 0.000 | 0.015 | 32.653 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.642 | 0.124 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026c7 | 37.039 | 3.441 | 0.343 | 0.000 | 0.043 | 33.183 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 3.828 | 0.103 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002645 | 33.105 | 5.538 | 0.205 | 0.000 | 0.021 | 27.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 5.763 | 0.174 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002690 | 33.000 | 3.334 | 0.283 | 0.000 | 0.031 | 29.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.648 | 0.111 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000268d | 30.864 | 5.120 | n/a | 0.000 | 0.918 | 24.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 6.039 | 0.196 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026d8 | 30.270 | 4.010 | 0.251 | 0.000 | 0.031 | 25.956 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.293 | 0.142 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026b3 | 29.704 | 3.385 | 0.281 | 0.000 | 0.018 | 26.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.684 | 0.124 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026d4 | 29.535 | 4.354 | 0.286 | 0.000 | 0.010 | 24.871 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.651 | 0.157 | 0.013 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026bf | 29.267 | 3.179 | 0.238 | 0.000 | 0.020 | 25.814 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.437 | 0.117 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026d0 | 29.177 | 3.935 | 0.256 | 0.000 | 0.021 | 24.948 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.211 | 0.144 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026c8 | 28.908 | 4.689 | n/a | 0.000 | 0.208 | 23.976 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 4.898 | 0.169 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026cd | 26.969 | 4.107 | 0.281 | 0.000 | 0.023 | 22.526 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 4.411 | 0.164 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026fa | 26.894 | 7.346 | n/a | 0.000 | 0.814 | 18.705 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 8.160 | 0.303 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026a4 | 25.638 | 2.767 | 0.164 | 0.000 | 0.014 | 22.679 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 2.945 | 0.115 | 0.013 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000264d | 25.590 | 5.714 | n/a | 0.000 | 1.362 | 18.499 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.076 | 0.277 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026f7 | 25.398 | 7.180 | n/a | 0.000 | 0.770 | 17.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.950 | 0.313 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000265d | 25.278 | 3.267 | 1.156 | 0.000 | 0.028 | 20.807 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.450 | 0.176 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002666 | 25.039 | 4.737 | 0.297 | 0.000 | 0.036 | 19.946 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.070 | 0.202 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |

## P4 / p4h3 / commit / 5-10 facts (29 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.065 | 3.458 | n/a | 0.000 | 0.617 | 10.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.165 | 0.267 | 0.021 |
| p99 | 30.864 | 6.196 | n/a | 0.000 | 1.301 | 24.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 6.366 | 0.415 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000268d | 30.864 | 5.120 | n/a | 0.000 | 0.918 | 24.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 6.039 | 0.196 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026c8 | 28.908 | 4.689 | n/a | 0.000 | 0.208 | 23.976 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 4.898 | 0.169 | 0.034 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026ae | 22.437 | 5.809 | n/a | 0.000 | 0.557 | 16.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 6.366 | 0.284 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026d5 | 18.457 | 3.437 | n/a | 0.000 | 0.631 | 14.368 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.068 | 0.220 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026a2 | 18.370 | 3.794 | n/a | 0.000 | 0.458 | 14.095 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.252 | 0.231 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026d9 | 18.235 | 2.801 | n/a | 0.000 | 0.226 | 15.190 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.026 | 0.166 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026f1 | 18.161 | 3.566 | n/a | 0.000 | 0.887 | 13.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.453 | 0.245 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002642 | 18.081 | 3.458 | n/a | 0.000 | 0.617 | 13.981 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.075 | 0.225 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000266d | 17.310 | 4.714 | n/a | 0.000 | 0.654 | 11.925 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.369 | 0.310 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000265e | 17.211 | 3.251 | n/a | 0.000 | 1.258 | 12.684 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.509 | 0.262 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002667 | 17.099 | 3.205 | n/a | 0.000 | 0.762 | 13.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.967 | 0.232 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002664 | 16.776 | 6.196 | n/a | 0.000 | 0.096 | 10.441 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 6.292 | 0.375 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026f3 | 15.532 | 3.369 | n/a | 0.000 | 0.758 | 11.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.127 | 0.266 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026c4 | 15.491 | 3.104 | n/a | 0.000 | 1.029 | 11.339 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.133 | 0.267 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026c1 | 15.065 | 4.005 | n/a | 0.000 | 0.091 | 10.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.096 | 0.272 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026ce | 14.802 | 5.142 | n/a | 0.000 | 0.481 | 9.149 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.623 | 0.380 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026b4 | 14.569 | 4.005 | n/a | 0.000 | 0.617 | 9.906 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 4.622 | 0.317 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002670 | 14.354 | 3.729 | n/a | 0.000 | 0.882 | 9.726 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.611 | 0.321 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026ba | 14.338 | 2.793 | n/a | 0.000 | 0.423 | 11.105 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.215 | 0.224 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000026a8 | 14.226 | 2.676 | n/a | 0.000 | 0.950 | 10.582 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.625 | 0.255 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow10 / commit (37 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 70.792 | 3.646 | n/a | 0.000 | 0.275 | 63.699 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.092 | 0.090 | 0.019 |
| p99 | 260.389 | 67.157 | n/a | 6.288 | 11.155 | 141.732 | 1.136 | 0.039 | 0.000 | 6.153 | 97.368 | n/a | n/a | 0.109 | 76.338 | 1.000 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002729 | 260.389 | 4.475 | 15.052 | 0.000 | 0.033 | 141.732 | 0.620 | 0.039 | 0.000 | 1.044 | 97.368 | n/a | n/a | 0.025 | 19.560 | 0.075 | 0.025 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002717 | 220.306 | 4.492 | 32.635 | 0.000 | 0.048 | 119.857 | 0.591 | 0.022 | 0.000 | 1.615 | 61.029 | n/a | n/a | 0.019 | 37.174 | 0.169 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000270f | 193.190 | 3.100 | n/a | 0.000 | 0.604 | 109.539 | 0.584 | 0.021 | 0.000 | 3.434 | 75.888 | n/a | n/a | 0.020 | 3.705 | 0.019 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000279e | 183.516 | 4.834 | n/a | 0.000 | 0.275 | 108.980 | 1.136 | 0.023 | 0.000 | 0.480 | 67.769 | n/a | n/a | 0.019 | 5.109 | 0.028 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000272f | 179.701 | 2.207 | n/a | 0.000 | 1.019 | 108.879 | 0.563 | 0.022 | 0.000 | 0.488 | 66.508 | n/a | n/a | 0.017 | 3.226 | 0.018 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002785 | 174.430 | 4.099 | 13.400 | 0.000 | 0.027 | 138.101 | 0.680 | 0.025 | 0.000 | 6.153 | 11.927 | n/a | n/a | 0.018 | 17.527 | 0.100 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002756 | 156.237 | 2.869 | 14.394 | 0.000 | 0.017 | 126.067 | 1.058 | 0.035 | 0.000 | 1.149 | 10.630 | n/a | n/a | 0.018 | 17.280 | 0.111 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002747 | 155.679 | 3.734 | n/a | 0.000 | 0.726 | 116.098 | 0.832 | 0.032 | 0.000 | 0.781 | 33.368 | n/a | n/a | 0.109 | 4.460 | 0.029 | 0.109 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000277e | 135.634 | 2.794 | 11.636 | 0.000 | 0.026 | 115.058 | 0.643 | 0.022 | 0.000 | 1.470 | 3.961 | n/a | n/a | 0.023 | 14.456 | 0.107 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000276e | 124.594 | 3.646 | n/a | 0.000 | 0.920 | 108.913 | 0.980 | 0.023 | 0.000 | 1.058 | 9.036 | n/a | n/a | 0.018 | 4.566 | 0.037 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002797 | 101.959 | 3.265 | 0.184 | 0.000 | 0.011 | 98.485 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.460 | 0.034 | 0.013 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000271f | 94.028 | 5.260 | 22.143 | 0.000 | 0.066 | 66.531 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 27.468 | 0.292 | 0.029 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002752 | 88.602 | 7.330 | n/a | 0.000 | 0.634 | 80.613 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.963 | 0.090 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000274e | 85.442 | 3.685 | n/a | 0.000 | 0.757 | 80.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.441 | 0.052 | 0.021 | node-14/thread-0/socket.wait-first-byte | client.encode 2.395ms; driver.publication 1.111ms |
| b19d8c740dc1ae2e0000000000002762 | 83.354 | 3.611 | 21.993 | 0.000 | 0.022 | 57.714 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 25.625 | 0.307 | 0.014 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000275b | 79.167 | 4.579 | n/a | 0.000 | 1.104 | 73.455 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.682 | 0.072 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002718 | 76.353 | 67.157 | n/a | 6.288 | 2.893 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 76.338 | 1.000 | 0.016 | node-14/thread-0/client.persist-and-resolve | client.encode 2.574ms; driver.publication 1.632ms |
| b19d8c740dc1ae2e0000000000002775 | 74.507 | 2.559 | n/a | 0.000 | 0.535 | 71.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.094 | 0.042 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000275c | 70.792 | 2.663 | n/a | 0.000 | 0.456 | 67.662 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 3.119 | 0.044 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.186ms |
| b19d8c740dc1ae2e00000000000027a0 | 69.069 | 2.394 | n/a | 0.000 | 0.735 | 65.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.128 | 0.045 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.058ms |

## P2 / grow10 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 74.507 | 3.168 | n/a | 0.000 | 0.726 | 65.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.123 | 0.052 | 0.019 |
| p99 | 193.190 | 67.157 | n/a | 6.288 | 11.155 | 116.098 | 1.136 | 0.032 | 0.000 | 3.434 | 75.888 | n/a | n/a | 0.109 | 76.338 | 1.000 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000270f | 193.190 | 3.100 | n/a | 0.000 | 0.604 | 109.539 | 0.584 | 0.021 | 0.000 | 3.434 | 75.888 | n/a | n/a | 0.020 | 3.705 | 0.019 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000279e | 183.516 | 4.834 | n/a | 0.000 | 0.275 | 108.980 | 1.136 | 0.023 | 0.000 | 0.480 | 67.769 | n/a | n/a | 0.019 | 5.109 | 0.028 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000272f | 179.701 | 2.207 | n/a | 0.000 | 1.019 | 108.879 | 0.563 | 0.022 | 0.000 | 0.488 | 66.508 | n/a | n/a | 0.017 | 3.226 | 0.018 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002747 | 155.679 | 3.734 | n/a | 0.000 | 0.726 | 116.098 | 0.832 | 0.032 | 0.000 | 0.781 | 33.368 | n/a | n/a | 0.109 | 4.460 | 0.029 | 0.109 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002752 | 88.602 | 7.330 | n/a | 0.000 | 0.634 | 80.613 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 7.963 | 0.090 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000274e | 85.442 | 3.685 | n/a | 0.000 | 0.757 | 80.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.441 | 0.052 | 0.021 | node-14/thread-0/socket.wait-first-byte | client.encode 2.395ms; driver.publication 1.111ms |
| b19d8c740dc1ae2e0000000000002718 | 76.353 | 67.157 | n/a | 6.288 | 2.893 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 76.338 | 1.000 | 0.016 | node-14/thread-0/client.persist-and-resolve | client.encode 2.574ms; driver.publication 1.632ms |
| b19d8c740dc1ae2e0000000000002775 | 74.507 | 2.559 | n/a | 0.000 | 0.535 | 71.395 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.094 | 0.042 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027a0 | 69.069 | 2.394 | n/a | 0.000 | 0.735 | 65.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.128 | 0.045 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.058ms |
| b19d8c740dc1ae2e000000000000274d | 64.875 | 2.929 | n/a | 0.000 | 0.765 | 61.162 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.693 | 0.057 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002757 | 61.283 | 3.168 | n/a | 0.000 | 0.955 | 57.141 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.123 | 0.067 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002792 | 54.899 | 3.851 | n/a | 0.000 | 11.155 | 39.874 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 15.006 | 0.273 | 0.019 | node-14/thread-0/socket.wait-first-byte | client.encode 3.897ms |
| b19d8c740dc1ae2e0000000000002712 | 44.662 | 3.086 | n/a | 0.000 | 0.708 | 40.850 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.794 | 0.085 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002721 | 35.024 | 6.055 | n/a | 0.000 | 0.546 | 28.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.074 | 6.601 | 0.188 | 0.074 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit (89 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.388 | 3.698 | 1.268 | 0.000 | 0.042 | 15.344 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.150 | 0.220 | 0.021 |
| p99 | 149.542 | 10.137 | n/a | 0.000 | 1.510 | 145.362 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 11.351 | 0.458 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000283f | 149.542 | 3.842 | 0.277 | 0.000 | 0.035 | 145.362 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.155 | 0.028 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027c0 | 47.473 | 5.387 | 0.242 | 0.000 | 0.021 | 41.808 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.649 | 0.119 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027c1 | 43.915 | 3.731 | n/a | 0.000 | 1.044 | 39.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.775 | 0.109 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027b4 | 38.847 | 7.690 | n/a | 0.000 | 0.982 | 30.144 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 8.673 | 0.223 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027bb | 38.671 | 4.895 | 0.283 | 0.000 | 0.036 | 33.436 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.214 | 0.135 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002829 | 34.627 | 3.420 | 0.316 | 0.000 | 0.018 | 30.851 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.754 | 0.108 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002849 | 33.849 | 3.497 | 1.032 | 0.000 | 0.034 | 29.268 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.563 | 0.135 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000281b | 31.719 | 7.189 | 0.463 | 0.000 | 0.035 | 24.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 7.687 | 0.242 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027bc | 28.744 | 4.195 | n/a | 0.000 | 0.671 | 23.854 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.865 | 0.169 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002845 | 28.419 | 4.038 | 0.272 | 0.000 | 0.042 | 24.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.352 | 0.153 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000280b | 28.310 | 4.604 | 0.212 | 0.000 | 0.018 | 23.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.834 | 0.171 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027dc | 28.285 | 3.526 | 0.313 | 0.000 | 0.021 | 24.407 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.860 | 0.136 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027d0 | 28.268 | 3.097 | 0.302 | 0.000 | 0.020 | 24.834 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.418 | 0.121 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027de | 27.991 | 3.335 | 0.390 | 0.000 | 0.025 | 24.225 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.749 | 0.134 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000283d | 27.701 | 3.698 | 0.183 | 0.000 | 0.021 | 23.784 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.902 | 0.141 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027d4 | 26.717 | 4.662 | 0.434 | 0.000 | 0.038 | 21.556 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.135 | 0.192 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002809 | 25.650 | 3.077 | 0.226 | 0.000 | 0.017 | 22.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.320 | 0.129 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002834 | 24.803 | 10.137 | n/a | 0.000 | 1.214 | 13.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 11.351 | 0.458 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002805 | 24.586 | 4.598 | 0.221 | 0.000 | 0.027 | 19.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.845 | 0.197 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002837 | 24.518 | 3.615 | 0.292 | 0.000 | 0.022 | 20.571 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.929 | 0.160 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit / 5-10 facts (32 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.342 | 3.418 | n/a | 0.000 | 0.671 | 11.533 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.043 | 0.288 | 0.022 |
| p99 | 43.915 | 10.137 | n/a | 0.000 | 1.214 | 39.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 11.351 | 0.458 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000027c1 | 43.915 | 3.731 | n/a | 0.000 | 1.044 | 39.117 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.775 | 0.109 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027bc | 28.744 | 4.195 | n/a | 0.000 | 0.671 | 23.854 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.865 | 0.169 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002834 | 24.803 | 10.137 | n/a | 0.000 | 1.214 | 13.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 11.351 | 0.458 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027c9 | 21.581 | 3.418 | n/a | 0.000 | 0.438 | 17.704 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.856 | 0.179 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027d7 | 21.561 | 2.931 | n/a | 0.000 | 0.943 | 17.670 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.874 | 0.180 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027f2 | 21.201 | 2.820 | n/a | 0.000 | 0.589 | 17.774 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.409 | 0.161 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002838 | 20.810 | 3.068 | n/a | 0.000 | 0.970 | 16.755 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.038 | 0.194 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000280c | 19.357 | 3.229 | n/a | 0.000 | 0.811 | 15.299 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.040 | 0.209 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002840 | 19.102 | 3.318 | n/a | 0.000 | 0.745 | 15.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.063 | 0.213 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027e3 | 18.699 | 3.046 | n/a | 0.000 | 0.290 | 15.337 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.335 | 0.178 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000280e | 18.336 | 4.630 | n/a | 0.000 | 0.676 | 12.996 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.306 | 0.289 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027f6 | 18.265 | 2.969 | n/a | 0.000 | 0.576 | 14.703 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.545 | 0.194 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000285a | 18.228 | 3.743 | n/a | 0.000 | 1.026 | 13.436 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.769 | 0.262 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002826 | 17.735 | 6.791 | n/a | 0.000 | 0.757 | 10.169 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 7.548 | 0.426 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002832 | 17.124 | 4.300 | n/a | 0.000 | 0.068 | 12.731 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.368 | 0.255 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002806 | 16.474 | 3.536 | n/a | 0.000 | 0.334 | 12.569 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 3.870 | 0.235 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002850 | 16.342 | 3.611 | n/a | 0.000 | 0.371 | 12.339 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.982 | 0.244 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002846 | 16.302 | 4.574 | n/a | 0.000 | 0.171 | 11.533 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.745 | 0.291 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000027d9 | 16.208 | 3.773 | n/a | 0.000 | 1.112 | 11.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.885 | 0.301 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000285b | 14.328 | 3.872 | n/a | 0.000 | 0.656 | 9.788 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 4.529 | 0.316 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.014ms |

## P5 / presweep / commit (100 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.613 | 3.608 | n/a | 0.000 | 0.106 | 13.603 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.061 | 0.239 | 0.019 |
| p99 | 57.056 | 10.587 | n/a | 0.000 | 1.000 | 53.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 10.671 | 0.468 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000002911 | 70.423 | 2.905 | 0.261 | 0.000 | 0.041 | 67.197 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.206 | 0.046 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000286b | 57.056 | 3.365 | 0.256 | 0.000 | 0.011 | 53.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.632 | 0.064 | 0.014 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002919 | 49.708 | 10.587 | n/a | 0.000 | 0.083 | 38.987 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 10.671 | 0.215 | 0.050 | node-14/thread-0/socket.wait-first-byte | client.encode 1.350ms |
| b19d8c740dc1ae2e000000000000291a | 48.976 | 8.201 | n/a | 0.000 | 0.450 | 40.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.651 | 0.177 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.126ms |
| b19d8c740dc1ae2e00000000000028d6 | 45.979 | 3.258 | 0.178 | 0.000 | 0.011 | 42.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 3.447 | 0.075 | 0.013 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002870 | 36.624 | 8.319 | n/a | 0.000 | 0.394 | 27.884 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 8.713 | 0.238 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028b7 | 33.037 | 3.315 | 0.239 | 0.000 | 0.023 | 29.440 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.577 | 0.108 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000289d | 28.774 | 4.134 | n/a | 0.000 | 0.729 | 23.898 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 4.862 | 0.169 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002889 | 28.632 | 2.591 | 1.720 | 0.000 | 0.020 | 24.291 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 4.331 | 0.151 | 0.010 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002910 | 27.380 | 2.092 | n/a | 0.000 | 0.955 | 24.312 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.047 | 0.111 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028d9 | 26.071 | 16.506 | n/a | 0.000 | 0.288 | 9.261 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 16.794 | 0.644 | 0.016 | node-14/thread-0/client.persist-and-resolve | none observed |
| b19d8c740dc1ae2e00000000000028c0 | 25.996 | 4.065 | n/a | 0.000 | 0.259 | 21.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.325 | 0.166 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028e6 | 25.993 | 6.513 | 0.210 | 0.000 | 0.013 | 19.241 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.736 | 0.259 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000288d | 25.854 | 3.427 | 0.221 | 0.000 | 0.029 | 22.157 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.677 | 0.142 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000286f | 25.464 | 4.127 | 0.508 | 0.000 | 0.060 | 20.732 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 4.695 | 0.184 | 0.037 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028bb | 25.402 | 3.223 | 0.527 | 0.000 | 0.014 | 21.623 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.765 | 0.148 | 0.015 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002913 | 25.243 | 4.723 | n/a | 0.000 | 0.790 | 19.695 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 5.513 | 0.218 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002925 | 25.158 | 3.644 | 0.242 | 0.000 | 0.057 | 21.180 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 3.943 | 0.157 | 0.035 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002929 | 24.582 | 4.693 | 1.124 | 0.000 | 0.039 | 18.644 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.083 | 5.855 | 0.238 | 0.083 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000292d | 23.712 | 3.990 | 0.318 | 0.000 | 0.025 | 19.363 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.333 | 0.183 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |

## P5 / presweep / commit / 5-10 facts (33 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.983 | 3.469 | n/a | 0.000 | 0.352 | 9.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.934 | 0.297 | 0.021 |
| p99 | 48.976 | 8.201 | n/a | 0.000 | 1.000 | 40.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 8.651 | 0.423 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000291a | 48.976 | 8.201 | n/a | 0.000 | 0.450 | 40.300 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.651 | 0.177 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.126ms |
| b19d8c740dc1ae2e0000000000002910 | 27.380 | 2.092 | n/a | 0.000 | 0.955 | 24.312 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.047 | 0.111 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028d4 | 21.064 | 5.781 | n/a | 0.000 | 0.470 | 14.786 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 6.251 | 0.297 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000288a | 19.768 | 3.741 | n/a | 0.000 | 0.352 | 15.648 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.093 | 0.207 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000288e | 19.447 | 3.527 | n/a | 0.000 | 0.937 | 14.927 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.056 | 4.463 | 0.230 | 0.056 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002876 | 19.067 | 5.678 | n/a | 0.000 | 0.078 | 13.283 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 5.756 | 0.302 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000289a | 18.641 | 3.003 | n/a | 0.000 | 0.268 | 15.352 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.271 | 0.175 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028ca | 17.457 | 3.979 | n/a | 0.000 | 0.240 | 13.214 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.219 | 0.242 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002927 | 16.616 | 4.592 | n/a | 0.000 | 0.697 | 11.303 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.289 | 0.318 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028c4 | 15.886 | 6.486 | n/a | 0.000 | 0.230 | 9.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 6.717 | 0.423 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028fd | 15.418 | 3.469 | n/a | 0.000 | 0.137 | 11.785 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.605 | 0.234 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002905 | 15.211 | 4.104 | n/a | 0.000 | 0.415 | 10.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.519 | 0.297 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028e9 | 14.552 | 2.726 | n/a | 0.000 | 0.721 | 11.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.446 | 0.237 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028a8 | 14.394 | 2.354 | n/a | 0.000 | 0.119 | 11.903 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.474 | 0.172 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028ac | 14.224 | 3.972 | n/a | 0.000 | 0.357 | 9.873 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.329 | 0.304 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000290e | 13.860 | 3.918 | n/a | 0.000 | 0.143 | 9.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.061 | 0.293 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000287a | 12.983 | 3.952 | n/a | 0.000 | 0.687 | 8.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.639 | 0.357 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028f3 | 12.973 | 3.027 | n/a | 0.000 | 0.215 | 9.709 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.242 | 0.250 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000028d2 | 12.896 | 2.935 | n/a | 0.000 | 1.000 | 8.943 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.934 | 0.305 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002901 | 12.843 | 3.608 | n/a | 0.000 | 0.247 | 8.965 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.855 | 0.300 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |

## P5 / sweep / commit (90 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.202 | 4.072 | 2.574 | 0.000 | 0.047 | 12.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.559 | 0.253 | 0.021 |
| p99 | 104.045 | 10.515 | n/a | 5.085 | 1.151 | 100.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 16.481 | 0.557 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e00000000000029db | 104.045 | 3.284 | 0.209 | 0.000 | 0.039 | 100.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 3.532 | 0.034 | 0.033 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029b9 | 52.062 | 3.557 | 0.536 | 0.000 | 0.027 | 47.917 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.120 | 0.079 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000295f | 50.935 | 4.128 | 0.181 | 0.000 | 0.023 | 46.585 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.332 | 0.085 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002978 | 35.221 | 10.515 | n/a | 5.085 | 0.881 | 18.719 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 16.481 | 0.468 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002941 | 29.440 | 5.559 | 0.220 | 0.000 | 0.034 | 23.604 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.813 | 0.197 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000298e | 29.260 | 5.103 | 0.213 | 0.000 | 0.028 | 23.898 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.344 | 0.183 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000299c | 28.514 | 3.858 | n/a | 0.000 | 0.026 | 24.612 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.884 | 0.136 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002990 | 27.276 | 7.060 | n/a | 2.265 | 0.849 | 17.081 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 10.173 | 0.373 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000296b | 26.401 | 3.577 | 0.199 | 0.000 | 0.014 | 22.590 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.790 | 0.144 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002931 | 26.346 | 5.830 | 0.815 | 0.000 | 0.033 | 19.647 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 6.677 | 0.253 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029a0 | 23.624 | 4.324 | 0.241 | 0.000 | 0.047 | 18.990 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.612 | 0.195 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029e2 | 23.603 | 3.679 | 0.265 | 0.000 | 0.029 | 19.615 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.973 | 0.168 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029bd | 23.097 | 4.449 | 0.263 | 0.000 | 0.029 | 18.331 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.742 | 0.205 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002959 | 23.051 | 6.474 | n/a | 0.000 | 0.695 | 15.854 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 7.168 | 0.311 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000298a | 22.680 | 4.352 | 0.269 | 0.000 | 0.034 | 18.008 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.655 | 0.205 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000293b | 22.575 | 2.709 | 0.169 | 0.000 | 0.017 | 19.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 2.895 | 0.128 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029cd | 22.572 | 8.105 | n/a | 0.000 | 0.401 | 14.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 8.507 | 0.377 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029af | 22.253 | 3.741 | 0.313 | 0.000 | 0.055 | 18.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.109 | 0.185 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000295b | 22.222 | 4.277 | 0.247 | 0.000 | 0.034 | 17.644 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.559 | 0.205 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029a9 | 22.101 | 4.189 | 0.199 | 0.000 | 0.028 | 17.656 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.417 | 0.200 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |

## P5 / sweep / commit / 5-10 facts (26 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.793 | 3.713 | n/a | 0.000 | 0.356 | 9.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.480 | 0.311 | 0.020 |
| p99 | 28.514 | 6.474 | n/a | 1.758 | 1.074 | 24.612 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 7.168 | 0.421 | 0.032 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e000000000000299c | 28.514 | 3.858 | n/a | 0.000 | 0.026 | 24.612 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.884 | 0.136 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002959 | 23.051 | 6.474 | n/a | 0.000 | 0.695 | 15.854 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 7.168 | 0.311 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029d7 | 20.594 | 4.505 | n/a | 0.000 | 0.232 | 15.833 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.737 | 0.230 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029bb | 18.217 | 3.201 | n/a | 0.000 | 0.552 | 14.445 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.753 | 0.206 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029a5 | 17.488 | 5.150 | n/a | 0.000 | 0.287 | 12.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.438 | 0.311 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002937 | 17.041 | 3.810 | n/a | 0.000 | 1.036 | 12.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.845 | 0.284 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029ab | 16.983 | 3.485 | n/a | 0.000 | 0.533 | 12.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.018 | 0.237 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029ad | 16.139 | 5.850 | n/a | 0.000 | 0.173 | 10.089 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 6.022 | 0.373 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002985 | 15.915 | 3.267 | n/a | 0.000 | 0.898 | 11.734 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.166 | 0.262 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002975 | 15.494 | 5.975 | n/a | 0.000 | 0.156 | 9.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.130 | 0.396 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002951 | 15.001 | 5.192 | n/a | 0.000 | 0.717 | 9.070 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.909 | 0.394 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002980 | 14.899 | 2.906 | n/a | 0.000 | 0.275 | 11.700 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.182 | 0.214 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000296d | 14.842 | 3.713 | n/a | 1.758 | 0.137 | 9.215 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.609 | 0.378 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002969 | 14.793 | 3.072 | n/a | 0.000 | 0.271 | 11.437 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.342 | 0.226 | 0.014 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002982 | 14.730 | 3.252 | n/a | 0.000 | 0.356 | 11.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 3.608 | 0.245 | 0.009 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029a2 | 14.279 | 4.412 | n/a | 0.000 | 0.069 | 9.775 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.480 | 0.314 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e000000000000294f | 13.604 | 3.517 | n/a | 0.000 | 0.805 | 9.260 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.321 | 0.318 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029b1 | 13.580 | 4.537 | n/a | 0.000 | 0.082 | 8.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.619 | 0.340 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e00000000000029d3 | 13.469 | 4.667 | n/a | 0.000 | 0.488 | 8.282 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 5.155 | 0.383 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| b19d8c740dc1ae2e0000000000002998 | 12.851 | 3.267 | n/a | 0.000 | 0.660 | 8.910 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.926 | 0.306 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / tail / commit (3751 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.499 | 3.758 | n/a | 0.000 | 0.799 | 11.908 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.039 | 0.300 | 0.015 |
| p99 | 440.563 | 134.547 | n/a | 17.817 | 222.722 | 110.142 | 0.953 | 0.031 | 0.000 | 0.861 | 9.231 | n/a | n/a | 0.045 | 345.052 | 1.000 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000003e9b | 1125.670 | 288.902 | n/a | 41.408 | 684.278 | 111.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 1014.588 | 0.901 | 0.019 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms |
| b19d8c740dc1ae2e0000000000003edb | 871.988 | 2.965 | n/a | 0.000 | 856.146 | 12.866 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 859.112 | 0.985 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; client.parse 10.148ms; driver.publication 4.002ms; driver.publication 3.031ms |
| b19d8c740dc1ae2e0000000000003e96 | 757.950 | 297.184 | n/a | 41.408 | 340.271 | 79.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 678.863 | 0.896 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003e87 | 751.707 | 122.359 | n/a | 34.553 | 594.719 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.076 | 751.631 | 1.000 | 0.076 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e86 | 742.593 | 109.122 | n/a | 34.553 | 598.781 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.135 | 742.457 | 1.000 | 0.135 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003ea0 | 740.130 | 11.796 | n/a | 0.000 | 498.547 | 109.002 | 8.998 | 15.679 | 0.000 | 1.011 | 95.075 | n/a | n/a | 0.022 | 510.343 | 0.690 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; client.encode 10.181ms; client.parse 10.148ms; driver.publication 4.002ms |
| b19d8c740dc1ae2e0000000000003e85 | 725.981 | 86.896 | n/a | 34.553 | 604.515 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 725.964 | 1.000 | 0.017 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e84 | 693.110 | 8.450 | n/a | 0.000 | 616.208 | 68.425 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 624.658 | 0.901 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e80 | 688.982 | 602.569 | n/a | 73.395 | 12.999 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 688.963 | 1.000 | 0.020 | node-14/thread-0/client.persist-and-resolve | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e7e | 647.175 | 547.977 | n/a | 60.152 | 39.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 647.161 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e7f | 646.438 | 545.604 | n/a | 60.152 | 40.656 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 646.412 | 1.000 | 0.025 | node-14/thread-0/client.persist-and-resolve | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e7d | 645.089 | 71.858 | n/a | 0.000 | 37.089 | 520.765 | 2.340 | 0.117 | 0.000 | 0.722 | 12.165 | n/a | n/a | 0.033 | 108.947 | 0.169 | 0.033 | node-14/thread-0/socket.wait-first-byte | client.parse 34.693ms; client.parse 10.148ms |
| b19d8c740dc1ae2e0000000000003e88 | 633.732 | 128.452 | n/a | 34.553 | 470.669 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 633.675 | 1.000 | 0.058 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003ebc | 630.223 | 11.544 | n/a | 0.000 | 556.979 | 61.660 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 568.523 | 0.902 | 0.040 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003ea7 | 625.936 | 4.935 | n/a | 0.000 | 401.628 | 114.252 | 6.863 | 0.335 | 0.000 | 0.766 | 97.131 | n/a | n/a | 0.026 | 406.563 | 0.650 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003ea3 | 618.455 | 3.949 | n/a | 0.000 | 385.354 | 114.526 | 2.383 | 11.097 | 0.000 | 0.493 | 100.624 | n/a | n/a | 0.029 | 389.303 | 0.629 | 0.029 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003da5 | 611.540 | 3.337 | n/a | 0.000 | 475.514 | 108.858 | 2.258 | 0.048 | 0.000 | 0.986 | 20.529 | n/a | n/a | 0.011 | 478.851 | 0.783 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 9.114ms; driver.publication 4.005ms; driver.publication 3.730ms; driver.publication 3.357ms; driver.publication 2.865ms |
| b19d8c740dc1ae2e0000000000003e89 | 603.232 | 132.835 | n/a | 34.553 | 435.831 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 603.219 | 1.000 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e8a | 603.118 | 135.177 | n/a | 34.553 | 433.320 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 603.050 | 1.000 | 0.069 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003ecd | 586.270 | 7.333 | n/a | 0.000 | 532.932 | 45.979 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 540.265 | 0.922 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 32.103ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |

## P2 / tail / commit / 5-10 facts (2156 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.375 | 3.255 | n/a | 0.000 | 0.848 | 10.798 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 4.388 | 0.297 | 0.014 |
| p99 | 501.882 | 146.654 | n/a | 20.651 | 320.077 | 110.834 | 0.885 | 0.039 | 0.000 | 0.986 | 9.231 | n/a | n/a | 0.042 | 389.028 | 1.000 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b19d8c740dc1ae2e0000000000003e9b | 1125.670 | 288.902 | n/a | 41.408 | 684.278 | 111.063 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 1014.588 | 0.901 | 0.019 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms |
| b19d8c740dc1ae2e0000000000003edb | 871.988 | 2.965 | n/a | 0.000 | 856.146 | 12.866 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 859.112 | 0.985 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; client.parse 10.148ms; driver.publication 4.002ms; driver.publication 3.031ms |
| b19d8c740dc1ae2e0000000000003e96 | 757.950 | 297.184 | n/a | 41.408 | 340.271 | 79.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 678.863 | 0.896 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003e86 | 742.593 | 109.122 | n/a | 34.553 | 598.781 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.135 | 742.457 | 1.000 | 0.135 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e84 | 693.110 | 8.450 | n/a | 0.000 | 616.208 | 68.425 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 624.658 | 0.901 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e7e | 647.175 | 547.977 | n/a | 60.152 | 39.031 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 647.161 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e7f | 646.438 | 545.604 | n/a | 60.152 | 40.656 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 646.412 | 1.000 | 0.025 | node-14/thread-0/client.persist-and-resolve | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e7d | 645.089 | 71.858 | n/a | 0.000 | 37.089 | 520.765 | 2.340 | 0.117 | 0.000 | 0.722 | 12.165 | n/a | n/a | 0.033 | 108.947 | 0.169 | 0.033 | node-14/thread-0/socket.wait-first-byte | client.parse 34.693ms; client.parse 10.148ms |
| b19d8c740dc1ae2e0000000000003ea7 | 625.936 | 4.935 | n/a | 0.000 | 401.628 | 114.252 | 6.863 | 0.335 | 0.000 | 0.766 | 97.131 | n/a | n/a | 0.026 | 406.563 | 0.650 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003ea3 | 618.455 | 3.949 | n/a | 0.000 | 385.354 | 114.526 | 2.383 | 11.097 | 0.000 | 0.493 | 100.624 | n/a | n/a | 0.029 | 389.303 | 0.629 | 0.029 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003da5 | 611.540 | 3.337 | n/a | 0.000 | 475.514 | 108.858 | 2.258 | 0.048 | 0.000 | 0.986 | 20.529 | n/a | n/a | 0.011 | 478.851 | 0.783 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 9.114ms; driver.publication 4.005ms; driver.publication 3.730ms; driver.publication 3.357ms; driver.publication 2.865ms |
| b19d8c740dc1ae2e0000000000003e89 | 603.232 | 132.835 | n/a | 34.553 | 435.831 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 603.219 | 1.000 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e8a | 603.118 | 135.177 | n/a | 34.553 | 433.320 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.069 | 603.050 | 1.000 | 0.069 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.198ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms |
| b19d8c740dc1ae2e0000000000003e8b | 579.316 | 139.048 | n/a | 34.553 | 405.685 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 579.286 | 1.000 | 0.030 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.181ms; client.parse 10.148ms; client.encode 5.197ms; client.encode 4.094ms |
| b19d8c740dc1ae2e0000000000003e8c | 554.636 | 151.923 | n/a | 34.553 | 368.129 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 554.606 | 1.000 | 0.030 | node-14/thread-0/driver.queue (scheduler/subject/admission) | client.parse 34.693ms; client.encode 10.181ms; client.parse 10.148ms; driver.publication 4.002ms; driver.expected-state.bind-receipt 2.344ms |
| b19d8c740dc1ae2e0000000000003ed9 | 548.663 | 4.118 | n/a | 0.000 | 532.122 | 12.398 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 536.240 | 0.977 | 0.025 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms; driver.expected-state.bind-receipt 2.344ms |
| b19d8c740dc1ae2e0000000000003eab | 543.778 | 4.194 | n/a | 0.000 | 333.805 | 109.346 | 1.055 | 0.036 | 0.000 | 3.320 | 91.999 | n/a | n/a | 0.023 | 337.999 | 0.622 | 0.023 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 51.011ms; client.parse 34.693ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003dcc | 539.974 | 3.158 | n/a | 0.000 | 497.863 | 38.941 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 501.021 | 0.928 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 9.114ms; driver.expected-state.bind-receipt 3.982ms; driver.publication 2.460ms; driver.publication 2.320ms; driver.publication 2.056ms |
| b19d8c740dc1ae2e0000000000003e92 | 524.242 | 247.993 | n/a | 54.651 | 70.795 | 119.646 | 1.338 | 29.802 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.008 | 373.440 | 0.712 | 0.008 | node-14/thread-0/client.persist-and-resolve | driver.publication 51.011ms; client.parse 26.962ms; driver.publication 4.002ms; driver.publication 3.031ms; client.encode 2.915ms |
| b19d8c740dc1ae2e0000000000003dc1 | 516.378 | 3.632 | n/a | 0.000 | 494.085 | 18.643 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 497.717 | 0.964 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.expected-state.bind-receipt 9.114ms; driver.publication 2.460ms; driver.publication 2.320ms; driver.publication 2.056ms; client.parse 1.831ms |

## P3 / outside-phases / read (39 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.277 | 0.047 | n/a | 0.000 | 0.000 | 0.912 | 200.208 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.093 | 0.047 | 0.000 | 0.093 |
| p99 | 322.661 | 111.907 | n/a | 25.855 | 0.000 | 25.385 | 209.569 | 1.231 | 40.202 | 0.265 | 0.000 | n/a | n/a | 0.532 | 137.762 | 0.427 | 0.532 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000002910 | 322.661 | 111.907 | n/a | 25.855 | 0.000 | 8.589 | 175.946 | 0.005 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.359 | 137.762 | 0.427 | 0.359 | gw-r/thread-52/gateway.admitted-work | none observed |
| 32c6614cee436acf00000000000016e6 | 210.884 | 0.052 | n/a | 0.000 | 0.000 | 1.024 | 209.569 | 0.021 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.157 | 0.052 | 0.000 | 0.157 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000140d | 206.146 | 0.031 | n/a | 0.000 | 0.000 | 1.163 | 204.788 | 0.016 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000007 | 205.294 | 0.177 | n/a | 0.000 | 0.000 | 2.593 | 201.925 | 0.021 | 0.000 | 0.250 | 0.000 | n/a | n/a | 0.328 | 0.177 | 0.001 | 0.328 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000005 | 203.892 | 0.082 | n/a | 0.000 | 0.000 | 1.315 | 201.763 | 0.028 | 0.000 | 0.265 | 0.000 | n/a | n/a | 0.440 | 0.082 | 0.000 | 0.440 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000006 | 203.240 | 0.135 | n/a | 0.000 | 0.000 | 1.337 | 201.446 | 0.026 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.125 | 0.135 | 0.001 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000016e4 | 201.768 | 0.056 | n/a | 0.000 | 0.000 | 0.938 | 200.585 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.124 | 0.056 | 0.000 | 0.124 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000155b | 201.758 | 0.047 | n/a | 0.000 | 0.000 | 0.912 | 200.659 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.071 | 0.047 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000002907 | 201.651 | 0.047 | n/a | 0.000 | 0.000 | 0.902 | 200.519 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.133 | 0.047 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000002908 | 201.626 | 0.051 | n/a | 0.000 | 0.000 | 1.213 | 200.208 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.115 | 0.051 | 0.000 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001556 | 201.624 | 0.054 | n/a | 0.000 | 0.000 | 0.942 | 200.481 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.090 | 0.054 | 0.000 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001559 | 201.578 | 0.043 | n/a | 0.000 | 0.000 | 0.813 | 200.603 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.065 | 0.043 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000016e3 | 201.559 | 0.044 | n/a | 0.000 | 0.000 | 0.830 | 200.561 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.063 | 0.044 | 0.000 | 0.063 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000155a | 201.552 | 0.048 | n/a | 0.000 | 0.000 | 0.909 | 200.447 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.093 | 0.048 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000002906 | 201.373 | 0.043 | n/a | 0.000 | 0.000 | 0.937 | 200.183 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.170 | 0.043 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000016e2 | 201.367 | 0.035 | n/a | 0.000 | 0.000 | 0.792 | 200.408 | 0.018 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.060 | 0.035 | 0.000 | 0.060 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000140b | 201.356 | 0.042 | n/a | 0.000 | 0.000 | 0.830 | 200.366 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.078 | 0.042 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000140a | 201.351 | 0.035 | n/a | 0.000 | 0.000 | 0.793 | 200.411 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.069 | 0.035 | 0.000 | 0.069 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000016d9 | 201.338 | 0.035 | n/a | 0.000 | 0.000 | 0.934 | 200.266 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000016de | 201.277 | 0.027 | n/a | 0.000 | 0.000 | 0.768 | 200.390 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.048 | 0.027 | 0.000 | 0.048 | gw-r/thread-54/journal/page | none observed |

## P3 / outside-phases / internal (19 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 225.319 | 4.353 | n/a | 0.000 | 0.000 | 0.873 | 218.256 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.102 | 4.353 | 0.026 | 0.102 |
| p99 | 1005.787 | 107.504 | n/a | 6.763 | 0.000 | 3.772 | 1001.469 | 0.103 | 7.398 | 0.453 | 0.000 | n/a | n/a | 1.794 | 114.267 | 0.869 | 1.794 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b00000000000000a4 | 1005.787 | 0.170 | n/a | 0.000 | 0.000 | 2.214 | 1001.469 | 0.021 | 0.000 | 0.453 | 0.000 | n/a | n/a | 1.460 | 0.170 | 0.000 | 1.460 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001ffb | 955.897 | 4.390 | n/a | 0.000 | 0.000 | 0.873 | 950.427 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.153 | 4.390 | 0.005 | 0.153 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001eea | 930.094 | 2.788 | n/a | 0.000 | 0.000 | 0.854 | 926.340 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.080 | 2.788 | 0.003 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001ffc | 835.226 | 11.366 | n/a | 3.020 | 0.000 | 0.858 | 819.694 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.247 | 14.386 | 0.017 | 0.247 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b00000000000000a5 | 820.252 | 14.292 | n/a | 0.000 | 0.000 | 1.139 | 804.382 | 0.031 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.284 | 14.292 | 0.017 | 0.284 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e1c | 741.307 | 3.967 | n/a | 0.000 | 0.000 | 0.883 | 736.247 | 0.103 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.085 | 3.967 | 0.005 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001ff8 | 691.031 | 4.353 | n/a | 0.000 | 0.000 | 2.448 | 684.140 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.066 | 4.353 | 0.006 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001e1e | 338.350 | 3.661 | n/a | 0.000 | 0.000 | 0.851 | 333.708 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.074 | 3.661 | 0.011 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001e1b | 236.452 | 2.829 | n/a | 0.000 | 0.000 | 0.852 | 232.538 | 0.097 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.098 | 2.829 | 0.012 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001ee9 | 225.319 | 5.963 | n/a | 0.000 | 0.000 | 0.981 | 218.256 | 0.004 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.102 | 5.963 | 0.026 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001ff4 | 157.971 | 5.381 | n/a | 0.000 | 0.000 | 0.755 | 151.665 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.128 | 5.381 | 0.034 | 0.128 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001fef | 131.492 | 107.504 | n/a | 6.763 | 0.000 | 1.047 | 14.375 | 0.008 | 0.000 | 0.001 | 0.000 | n/a | n/a | 1.794 | 114.267 | 0.869 | 1.794 | node-14/thread-2/replica.fetch-feed | none observed |
| 0d864820b9cd827b0000000000001ee7 | 106.854 | 6.838 | n/a | 0.000 | 0.000 | 0.865 | 98.813 | 0.010 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.317 | 6.838 | 0.064 | 0.317 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001eeb | 59.718 | 4.646 | n/a | 0.000 | 0.000 | 3.772 | 43.637 | 0.007 | 7.398 | 0.051 | 0.000 | n/a | n/a | 0.207 | 4.646 | 0.078 | 0.207 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001e19 | 59.207 | 4.005 | n/a | 0.000 | 0.000 | 0.938 | 54.157 | 0.003 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.092 | 4.005 | 0.068 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001ee2 | 25.323 | 20.313 | n/a | 0.979 | 0.000 | 1.485 | 1.150 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.395 | 21.293 | 0.841 | 1.395 | node-14/thread-2/replica.fetch-feed | none observed |
| 0d864820b9cd827b0000000000001ff9 | 9.677 | 2.459 | n/a | 0.000 | 0.000 | 0.798 | 6.359 | 0.002 | 0.000 | 0.004 | 0.000 | n/a | n/a | 0.054 | 2.459 | 0.254 | 0.054 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ff5 | 3.417 | 1.942 | n/a | 0.000 | 0.000 | 0.724 | 0.702 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 1.942 | 0.568 | 0.049 | node-14/thread-2/replica.fetch-feed | none observed |
| 0d864820b9cd827b0000000000001ff2 | 2.970 | 1.818 | n/a | 0.000 | 0.000 | 0.747 | 0.357 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 1.818 | 0.612 | 0.049 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.796 | 3.787 | n/a | 0.000 | 0.000 | 1.004 | 431.378 | 0.023 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.114 | 3.787 | 0.010 | 0.114 |
| p99 | 1003.080 | 17.654 | n/a | 0.000 | 0.000 | 4.400 | 1000.648 | 0.483 | 13.892 | 0.199 | 0.000 | n/a | n/a | 1.475 | 17.654 | 0.089 | 1.475 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b00000000000000cf | 1003.080 | 0.190 | n/a | 0.000 | 0.000 | 0.931 | 1000.648 | 0.028 | 0.000 | 0.105 | 0.000 | n/a | n/a | 1.177 | 0.190 | 0.000 | 1.177 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000000ba | 994.870 | 2.397 | n/a | 0.000 | 0.000 | 4.400 | 987.657 | 0.183 | 0.000 | 0.148 | 0.000 | n/a | n/a | 0.084 | 2.397 | 0.002 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b00000000000000b2 | 953.944 | 9.020 | n/a | 0.000 | 0.000 | 1.971 | 941.366 | 0.019 | 0.000 | 0.094 | 0.000 | n/a | n/a | 1.475 | 9.020 | 0.009 | 1.475 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000000b4 | 947.616 | 8.351 | n/a | 0.000 | 0.000 | 0.266 | 938.610 | 0.046 | 0.000 | 0.199 | 0.000 | n/a | n/a | 0.144 | 8.351 | 0.009 | 0.144 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000000bb | 895.333 | 2.621 | n/a | 0.000 | 0.000 | 0.879 | 891.577 | 0.024 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.096 | 2.621 | 0.003 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b00000000000000c8 | 895.303 | 4.391 | n/a | 0.000 | 0.000 | 0.808 | 889.736 | 0.022 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.259 | 4.391 | 0.005 | 0.259 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b00000000000000bf | 871.777 | 7.535 | n/a | 0.000 | 0.000 | 1.665 | 862.009 | 0.209 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.220 | 7.535 | 0.009 | 0.220 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b00000000000000c5 | 869.718 | 3.819 | n/a | 0.000 | 0.000 | 0.918 | 864.736 | 0.019 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.101 | 3.819 | 0.004 | 0.101 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000000ae | 743.538 | 2.175 | n/a | 0.000 | 0.000 | 1.026 | 740.121 | 0.023 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.083 | 2.175 | 0.003 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b00000000000000a7 | 693.114 | 7.074 | n/a | 0.000 | 0.000 | 1.318 | 683.524 | 0.483 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.554 | 7.074 | 0.010 | 0.554 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000000b8 | 596.616 | 3.408 | n/a | 0.000 | 0.000 | 0.827 | 592.115 | 0.024 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.123 | 3.408 | 0.006 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000000ab | 592.376 | 3.080 | n/a | 0.000 | 0.000 | 0.843 | 588.219 | 0.023 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.102 | 3.080 | 0.005 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000000c1 | 574.113 | 17.654 | n/a | 0.000 | 0.000 | 2.349 | 553.298 | 0.396 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.273 | 17.654 | 0.031 | 0.273 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000000a8 | 497.386 | 3.271 | n/a | 0.000 | 0.000 | 0.844 | 493.043 | 0.018 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.111 | 3.271 | 0.007 | 0.111 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000000a9 | 436.796 | 3.398 | n/a | 0.000 | 0.000 | 1.674 | 431.378 | 0.013 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.216 | 3.398 | 0.008 | 0.216 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000000ac | 420.841 | 4.219 | n/a | 0.000 | 0.000 | 2.114 | 414.289 | 0.016 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.091 | 4.219 | 0.010 | 0.091 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000000c2 | 412.137 | 4.070 | n/a | 0.000 | 0.000 | 1.920 | 405.831 | 0.017 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.105 | 4.070 | 0.010 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000000b7 | 383.210 | 4.380 | n/a | 0.000 | 0.000 | 0.828 | 377.768 | 0.013 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.130 | 4.380 | 0.011 | 0.130 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000000ca | 368.527 | 3.664 | n/a | 0.000 | 0.000 | 0.932 | 363.509 | 0.237 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.101 | 3.664 | 0.010 | 0.101 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000000ce | 340.684 | 5.959 | n/a | 0.000 | 0.000 | 2.863 | 331.615 | 0.015 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.100 | 5.959 | 0.017 | 0.100 | gw-r/thread-55/journal/page | none observed |

## P3 / baseline / internal (99 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 424.188 | 4.108 | n/a | 0.000 | 0.000 | 1.017 | 413.727 | 0.018 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.112 | 4.419 | 0.013 | 0.112 |
| p99 | 1014.815 | 19.072 | n/a | 3.159 | 0.000 | 4.340 | 1001.319 | 1.107 | 11.239 | 0.199 | 0.000 | n/a | n/a | 1.350 | 22.230 | 0.764 | 1.350 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b00000000000000de | 1014.815 | 17.063 | n/a | 1.204 | 0.000 | 3.549 | 992.689 | 0.015 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.208 | 18.267 | 0.018 | 0.208 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000000156 | 1005.557 | 0.190 | n/a | 0.000 | 0.000 | 2.802 | 1001.197 | 0.019 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.220 | 0.190 | 0.000 | 1.220 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000000114 | 1005.368 | 5.776 | n/a | 1.025 | 0.000 | 1.093 | 996.615 | 0.569 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.174 | 6.801 | 0.007 | 0.174 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000000133 | 1004.166 | 0.301 | n/a | 0.000 | 0.000 | 1.184 | 1001.319 | 0.044 | 0.000 | 0.105 | 0.000 | n/a | n/a | 1.213 | 0.301 | 0.000 | 1.213 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000012a | 1004.091 | 0.116 | n/a | 0.000 | 0.000 | 2.222 | 1000.507 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.176 | 0.116 | 0.000 | 1.176 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000000138 | 1003.564 | 0.294 | n/a | 0.000 | 0.000 | 0.945 | 1000.841 | 0.058 | 0.000 | 0.076 | 0.000 | n/a | n/a | 1.350 | 0.294 | 0.000 | 1.350 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000011c | 1002.997 | 3.921 | n/a | 1.362 | 0.000 | 1.200 | 996.226 | 0.022 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.144 | 5.283 | 0.005 | 0.144 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000000100 | 1002.927 | 0.184 | n/a | 0.000 | 0.000 | 1.360 | 1001.117 | 0.063 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.108 | 0.184 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000000142 | 1002.587 | 0.146 | n/a | 0.000 | 0.000 | 0.868 | 1000.421 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.115 | 0.146 | 0.000 | 1.115 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000014b | 1002.377 | 7.359 | n/a | 1.472 | 0.000 | 1.054 | 992.199 | 0.011 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.249 | 8.831 | 0.009 | 0.249 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000000105 | 1001.035 | 3.782 | n/a | 0.000 | 0.000 | 0.918 | 996.095 | 0.024 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.074 | 3.782 | 0.004 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000000d2 | 998.511 | 5.114 | n/a | 0.000 | 0.000 | 1.033 | 992.135 | 0.039 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.094 | 5.114 | 0.005 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b00000000000000d8 | 997.635 | 2.727 | n/a | 0.000 | 0.000 | 3.972 | 990.707 | 0.023 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.097 | 2.727 | 0.003 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b000000000000010d | 993.063 | 2.760 | n/a | 0.000 | 0.000 | 2.405 | 987.368 | 0.344 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.074 | 2.760 | 0.003 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b00000000000000dd | 990.820 | 3.122 | n/a | 0.000 | 0.000 | 1.118 | 986.222 | 0.155 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.112 | 3.122 | 0.003 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000000125 | 990.407 | 2.852 | n/a | 0.979 | 0.000 | 0.790 | 984.643 | 0.865 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.181 | 3.831 | 0.004 | 0.181 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b00000000000000e4 | 988.252 | 4.473 | n/a | 0.865 | 0.000 | 0.804 | 981.944 | 0.012 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.088 | 5.338 | 0.005 | 0.088 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000000d9 | 983.007 | 3.809 | n/a | 0.000 | 0.000 | 1.618 | 976.483 | 0.922 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.097 | 3.809 | 0.004 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000000129 | 977.674 | 2.970 | n/a | 0.983 | 0.000 | 0.853 | 972.714 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.097 | 3.953 | 0.004 | 0.097 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000000d1 | 944.141 | 3.985 | n/a | 0.000 | 0.000 | 0.978 | 937.807 | 1.107 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.207 | 3.985 | 0.004 | 0.207 | gw-r/thread-54/journal/page | none observed |

## P3 / L1 / internal (105 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 325.071 | 4.135 | n/a | 0.000 | 0.000 | 0.954 | 312.981 | 0.015 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.115 | 4.237 | 0.013 | 0.115 |
| p99 | 1003.810 | 9.887 | n/a | 0.812 | 0.000 | 5.353 | 1001.037 | 0.958 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.195 | 9.887 | 0.635 | 1.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000000177 | 1011.811 | 0.325 | n/a | 0.000 | 0.000 | 8.753 | 1001.245 | 0.011 | 0.000 | 0.099 | 0.000 | n/a | n/a | 1.379 | 0.325 | 0.000 | 1.379 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000001ab | 1003.810 | 3.443 | n/a | 0.836 | 0.000 | 0.927 | 998.423 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.114 | 4.279 | 0.004 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b00000000000001a8 | 1003.468 | 0.177 | n/a | 0.000 | 0.000 | 0.991 | 1001.037 | 0.017 | 0.000 | 0.105 | 0.000 | n/a | n/a | 1.141 | 0.177 | 0.000 | 1.141 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000001c8 | 1003.255 | 0.142 | n/a | 0.000 | 0.000 | 1.113 | 1000.705 | 0.021 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.195 | 0.142 | 0.000 | 1.195 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000001c7 | 1003.249 | 2.924 | n/a | 0.000 | 0.000 | 0.817 | 999.385 | 0.011 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.079 | 2.924 | 0.003 | 0.079 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000000182 | 1003.102 | 0.210 | n/a | 0.000 | 0.000 | 0.994 | 1000.668 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 1.157 | 0.210 | 0.000 | 1.157 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000000167 | 1002.718 | 0.139 | n/a | 0.000 | 0.000 | 0.896 | 1000.486 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.132 | 0.139 | 0.000 | 1.132 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000000189 | 1000.835 | 3.509 | n/a | 0.000 | 0.000 | 3.226 | 993.956 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.063 | 3.509 | 0.004 | 0.063 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b00000000000001c6 | 994.856 | 3.646 | n/a | 0.000 | 0.000 | 0.817 | 990.156 | 0.104 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.075 | 3.646 | 0.004 | 0.075 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000001fc | 992.563 | 6.878 | n/a | 0.000 | 0.000 | 1.083 | 984.188 | 0.144 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.220 | 6.878 | 0.007 | 0.220 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b000000000000018a | 991.528 | 3.278 | n/a | 0.000 | 0.000 | 0.799 | 987.202 | 0.114 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.098 | 3.278 | 0.003 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b00000000000001ba | 986.454 | 5.604 | n/a | 0.000 | 0.000 | 0.934 | 979.587 | 0.108 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.175 | 5.604 | 0.006 | 0.175 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000001ec | 979.772 | 4.745 | n/a | 0.000 | 0.000 | 0.949 | 970.318 | 3.458 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.259 | 4.745 | 0.005 | 0.259 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b000000000000016f | 978.500 | 5.601 | n/a | 0.000 | 0.000 | 1.063 | 970.640 | 0.958 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.134 | 5.601 | 0.006 | 0.134 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000001aa | 966.059 | 4.237 | n/a | 0.000 | 0.000 | 0.944 | 960.502 | 0.227 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.091 | 4.237 | 0.004 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000000171 | 957.582 | 3.127 | n/a | 0.000 | 0.000 | 0.851 | 953.454 | 0.013 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.108 | 3.127 | 0.003 | 0.108 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000001ee | 954.249 | 4.253 | n/a | 0.000 | 0.000 | 1.008 | 948.801 | 0.042 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.112 | 4.253 | 0.004 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000017e | 946.665 | 2.686 | n/a | 0.000 | 0.000 | 3.182 | 940.640 | 0.009 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.076 | 2.686 | 0.003 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000018e | 938.491 | 4.893 | n/a | 0.000 | 0.000 | 3.224 | 930.125 | 0.008 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.154 | 4.893 | 0.005 | 0.154 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000018d | 864.075 | 2.902 | n/a | 0.812 | 0.000 | 0.932 | 858.768 | 0.444 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.127 | 3.714 | 0.004 | 0.127 | gw-r/thread-54/journal/page | none observed |

## P3 / L4 / internal (1537 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.099 | 3.853 | n/a | 0.000 | 0.000 | 0.882 | 7.765 | 0.008 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.104 | 3.853 | 0.316 | 0.104 |
| p99 | 436.781 | 15.540 | n/a | 1.688 | 0.000 | 5.857 | 431.474 | 0.358 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.946 | 16.155 | 0.831 | 0.946 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000000202 | 1005.527 | 5.957 | n/a | 0.000 | 0.000 | 1.415 | 997.888 | 0.129 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.106 | 5.957 | 0.006 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b000000000000021b | 1003.067 | 0.175 | n/a | 0.000 | 0.000 | 0.813 | 1000.865 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 1.112 | 0.175 | 0.000 | 1.112 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000000215 | 1002.953 | 0.157 | n/a | 0.000 | 0.000 | 0.913 | 1000.666 | 0.017 | 0.000 | 0.056 | 0.000 | n/a | n/a | 1.145 | 0.157 | 0.000 | 1.145 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b000000000000021a | 991.017 | 2.794 | n/a | 0.000 | 0.000 | 0.832 | 987.124 | 0.156 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.071 | 2.794 | 0.003 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000000229 | 981.969 | 3.769 | n/a | 0.000 | 0.000 | 0.914 | 977.081 | 0.020 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.118 | 3.769 | 0.004 | 0.118 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000021d | 981.852 | 3.111 | n/a | 0.000 | 0.000 | 0.830 | 977.613 | 0.033 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.167 | 3.111 | 0.003 | 0.167 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000020b | 809.493 | 5.586 | n/a | 0.000 | 0.000 | 0.983 | 802.486 | 0.184 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.202 | 5.586 | 0.007 | 0.202 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000000214 | 802.184 | 5.150 | n/a | 0.000 | 0.000 | 1.023 | 795.861 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.084 | 5.150 | 0.006 | 0.084 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000000217 | 654.234 | 8.611 | n/a | 0.000 | 0.000 | 0.873 | 644.493 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.153 | 8.611 | 0.013 | 0.153 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000022a | 570.336 | 4.605 | n/a | 0.000 | 0.000 | 0.898 | 564.588 | 0.019 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.165 | 4.605 | 0.008 | 0.165 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000021e | 562.283 | 1.728 | n/a | 0.000 | 0.000 | 0.780 | 559.596 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.121 | 1.728 | 0.003 | 0.121 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000000227 | 557.655 | 2.762 | n/a | 0.000 | 0.000 | 0.813 | 553.881 | 0.016 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.082 | 2.762 | 0.005 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000000204 | 497.342 | 4.323 | n/a | 0.000 | 0.000 | 5.409 | 487.310 | 0.007 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.200 | 4.323 | 0.009 | 0.200 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000000203 | 494.586 | 2.460 | n/a | 0.000 | 0.000 | 0.826 | 491.133 | 0.011 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.086 | 2.460 | 0.005 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000000206 | 445.094 | 5.324 | n/a | 0.000 | 0.000 | 0.791 | 438.767 | 0.016 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.104 | 5.324 | 0.012 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000021f | 436.781 | 4.178 | n/a | 0.000 | 0.000 | 0.909 | 431.474 | 0.020 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.121 | 4.178 | 0.010 | 0.121 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000000226 | 423.587 | 2.874 | n/a | 0.000 | 0.000 | 0.872 | 419.709 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.095 | 2.874 | 0.007 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000000221 | 409.573 | 2.672 | n/a | 0.000 | 0.000 | 0.836 | 405.805 | 0.149 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.065 | 2.672 | 0.007 | 0.065 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000000224 | 366.779 | 5.184 | n/a | 0.000 | 0.000 | 0.959 | 360.479 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.080 | 5.184 | 0.014 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000000207 | 332.709 | 3.640 | n/a | 0.000 | 0.000 | 1.022 | 326.997 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.944 | 3.640 | 0.011 | 0.944 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (1535 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.432 | 4.931 | n/a | 0.000 | 0.000 | 0.883 | 5.022 | 0.007 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.120 | 4.949 | 0.442 | 0.120 |
| p99 | 343.536 | 20.475 | n/a | 1.894 | 0.000 | 5.217 | 329.343 | 0.266 | 0.000 | 0.077 | 0.000 | n/a | n/a | 2.016 | 21.601 | 0.851 | 2.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001acb | 1002.694 | 0.099 | n/a | 0.000 | 0.000 | 0.814 | 1000.611 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.106 | 0.099 | 0.000 | 1.106 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001aa4 | 1002.658 | 0.147 | n/a | 0.000 | 0.000 | 0.799 | 1000.472 | 0.015 | 0.000 | 0.092 | 0.000 | n/a | n/a | 1.134 | 0.147 | 0.000 | 1.134 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001aae | 1002.460 | 0.107 | n/a | 0.000 | 0.000 | 0.809 | 1000.350 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.153 | 0.107 | 0.000 | 1.153 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001aa3 | 988.807 | 3.533 | n/a | 0.000 | 0.000 | 0.801 | 984.294 | 0.096 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.059 | 3.533 | 0.004 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001ac8 | 906.539 | 19.526 | n/a | 1.481 | 0.000 | 0.971 | 883.861 | 0.020 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.641 | 21.007 | 0.023 | 0.641 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001ae3 | 847.213 | 2.372 | n/a | 0.000 | 0.000 | 0.818 | 843.815 | 0.091 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.094 | 2.372 | 0.003 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001ad9 | 765.093 | 4.333 | n/a | 0.000 | 0.000 | 0.839 | 759.778 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.115 | 4.333 | 0.006 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001abf | 717.749 | 10.912 | n/a | 0.000 | 0.000 | 0.753 | 678.768 | 0.134 | 26.764 | 0.033 | 0.000 | n/a | n/a | 0.385 | 10.912 | 0.015 | 0.385 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001ab9 | 686.077 | 9.676 | n/a | 0.000 | 0.000 | 0.893 | 674.906 | 0.138 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.438 | 9.676 | 0.014 | 0.438 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ac5 | 676.494 | 3.265 | n/a | 0.000 | 0.000 | 0.832 | 672.201 | 0.097 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.081 | 3.265 | 0.005 | 0.081 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001aa9 | 645.508 | 4.221 | n/a | 0.000 | 0.000 | 1.166 | 639.950 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.136 | 4.221 | 0.007 | 0.136 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001aa6 | 552.963 | 14.826 | n/a | 2.403 | 0.000 | 1.136 | 534.148 | 0.099 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.313 | 17.229 | 0.031 | 0.313 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001ade | 491.783 | 5.099 | n/a | 0.000 | 0.000 | 1.473 | 484.446 | 0.636 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.086 | 5.099 | 0.010 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001aa7 | 450.164 | 4.661 | n/a | 0.000 | 0.000 | 3.321 | 442.067 | 0.008 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.090 | 4.661 | 0.010 | 0.090 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001adc | 350.271 | 3.833 | n/a | 0.000 | 0.000 | 7.484 | 338.831 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.092 | 3.833 | 0.011 | 0.092 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001ad0 | 343.536 | 13.799 | n/a | 0.000 | 0.000 | 0.952 | 328.557 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.201 | 13.799 | 0.040 | 0.201 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001aad | 335.064 | 2.524 | n/a | 0.000 | 0.000 | 3.073 | 329.343 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.072 | 2.524 | 0.008 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001ac6 | 327.050 | 2.707 | n/a | 0.000 | 0.000 | 0.884 | 323.279 | 0.091 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.070 | 2.707 | 0.008 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001ab7 | 323.992 | 5.720 | n/a | 0.000 | 0.000 | 0.947 | 317.090 | 0.119 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.094 | 5.720 | 0.018 | 0.094 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001abd | 294.684 | 3.262 | n/a | 0.000 | 0.000 | 0.924 | 290.386 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.078 | 3.262 | 0.011 | 0.078 | gw-r/thread-52/journal/page | none observed |

## P3 / L64 / internal (98 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 434.795 | 4.316 | n/a | 0.000 | 0.000 | 0.980 | 429.258 | 0.008 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.127 | 4.452 | 0.011 | 0.127 |
| p99 | 1007.928 | 20.725 | n/a | 1.981 | 0.000 | 6.134 | 1000.439 | 3.607 | 0.000 | 0.112 | 0.000 | n/a | n/a | 1.159 | 20.725 | 0.812 | 1.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001b42 | 1007.928 | 4.732 | n/a | 0.000 | 0.000 | 3.436 | 999.510 | 0.096 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.133 | 4.732 | 0.005 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001b3e | 1004.389 | 2.745 | n/a | 0.000 | 0.000 | 3.973 | 997.466 | 0.073 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.083 | 2.745 | 0.003 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001aea | 1003.013 | 4.892 | n/a | 0.000 | 0.000 | 0.802 | 997.175 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.104 | 4.892 | 0.005 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001b38 | 1002.863 | 0.159 | n/a | 0.000 | 0.000 | 1.058 | 1000.439 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.159 | 0.159 | 0.000 | 1.159 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001b6a | 1002.471 | 0.142 | n/a | 0.000 | 0.000 | 0.939 | 1000.229 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 1.107 | 0.142 | 0.000 | 1.107 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001b2d | 1002.377 | 0.099 | n/a | 0.000 | 0.000 | 0.886 | 1000.254 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.104 | 0.099 | 0.000 | 1.104 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001b2f | 1001.350 | 4.208 | n/a | 0.000 | 0.000 | 2.344 | 994.698 | 0.005 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.077 | 4.208 | 0.004 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001b37 | 999.163 | 3.267 | n/a | 0.000 | 0.000 | 0.856 | 994.751 | 0.162 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.093 | 3.267 | 0.003 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001afd | 997.473 | 4.091 | n/a | 0.000 | 0.000 | 0.970 | 992.222 | 0.099 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.070 | 4.091 | 0.004 | 0.070 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001b46 | 996.583 | 5.726 | n/a | 1.567 | 0.000 | 0.967 | 988.011 | 0.148 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.110 | 7.292 | 0.007 | 0.110 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001b51 | 995.317 | 3.081 | n/a | 0.000 | 0.000 | 2.717 | 989.248 | 0.109 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.140 | 3.081 | 0.003 | 0.140 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001b69 | 991.531 | 2.843 | n/a | 0.000 | 0.000 | 0.856 | 987.585 | 0.125 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.086 | 2.843 | 0.003 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001b3f | 990.050 | 10.155 | n/a | 0.852 | 0.000 | 1.059 | 977.833 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.112 | 11.007 | 0.011 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001b17 | 979.604 | 6.280 | n/a | 0.000 | 0.000 | 1.361 | 971.636 | 0.146 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.137 | 6.280 | 0.006 | 0.137 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001b3a | 960.011 | 3.719 | n/a | 0.000 | 0.000 | 0.843 | 955.337 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.085 | 3.719 | 0.004 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001b72 | 934.200 | 4.088 | n/a | 0.000 | 0.000 | 4.358 | 925.607 | 0.012 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.093 | 4.088 | 0.004 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001b10 | 928.581 | 4.096 | n/a | 0.000 | 0.000 | 1.092 | 923.206 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.161 | 4.096 | 0.004 | 0.161 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001aee | 902.118 | 2.733 | n/a | 0.000 | 0.000 | 0.857 | 898.310 | 0.058 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.124 | 2.733 | 0.003 | 0.124 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001b2a | 873.686 | 4.230 | n/a | 1.197 | 0.000 | 0.930 | 867.111 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.179 | 5.427 | 0.006 | 0.179 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001b15 | 865.186 | 2.730 | n/a | 0.000 | 0.000 | 2.802 | 859.562 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.060 | 2.730 | 0.003 | 0.060 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / internal (98 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 412.704 | 3.602 | n/a | 0.000 | 0.000 | 0.990 | 399.957 | 0.010 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.110 | 3.602 | 0.011 | 0.110 |
| p99 | 1071.080 | 15.630 | n/a | 2.691 | 0.000 | 7.053 | 1004.019 | 0.313 | 62.255 | 0.114 | 0.000 | n/a | n/a | 1.180 | 16.729 | 0.703 | 1.180 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001bdc | 1071.080 | 3.542 | n/a | 0.000 | 0.000 | 1.007 | 1004.019 | 0.051 | 62.255 | 0.062 | 0.000 | n/a | n/a | 0.144 | 3.542 | 0.003 | 0.144 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001c0c | 1005.203 | 4.494 | n/a | 0.000 | 0.000 | 1.139 | 999.388 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.146 | 4.494 | 0.004 | 0.146 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001bdb | 1004.445 | 2.398 | n/a | 0.000 | 0.000 | 3.626 | 998.177 | 0.116 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.083 | 2.398 | 0.002 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001c0b | 1003.708 | 3.608 | n/a | 0.000 | 0.000 | 0.846 | 999.159 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.067 | 3.608 | 0.004 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001bd3 | 1003.525 | 3.503 | n/a | 0.000 | 0.000 | 0.844 | 998.977 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.149 | 3.503 | 0.003 | 0.149 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001bd4 | 1002.581 | 0.187 | n/a | 0.000 | 0.000 | 0.979 | 1000.228 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.143 | 0.187 | 0.000 | 1.143 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001bf1 | 1002.312 | 0.102 | n/a | 0.000 | 0.000 | 0.895 | 1000.099 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.180 | 0.102 | 0.000 | 1.180 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001bff | 1002.130 | 0.119 | n/a | 0.000 | 0.000 | 0.863 | 999.999 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.113 | 0.119 | 0.000 | 1.113 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001bc5 | 1000.116 | 3.254 | n/a | 0.000 | 0.000 | 0.989 | 995.631 | 0.132 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.089 | 3.254 | 0.003 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001bcd | 998.783 | 6.285 | n/a | 0.000 | 0.000 | 0.990 | 990.922 | 0.313 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.250 | 6.285 | 0.006 | 0.250 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001bf9 | 998.515 | 4.392 | n/a | 0.000 | 0.000 | 1.107 | 992.823 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.167 | 4.392 | 0.004 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001b97 | 996.970 | 2.740 | n/a | 0.000 | 0.000 | 0.850 | 993.188 | 0.100 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.071 | 2.740 | 0.003 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001be3 | 995.297 | 2.550 | n/a | 0.000 | 0.000 | 4.907 | 987.717 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.086 | 2.550 | 0.003 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001bb5 | 978.533 | 2.687 | n/a | 0.000 | 0.000 | 1.261 | 974.371 | 0.113 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.073 | 2.687 | 0.003 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001bed | 972.259 | 4.871 | n/a | 0.000 | 0.000 | 0.930 | 966.305 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.105 | 4.871 | 0.005 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001b8c | 968.003 | 5.276 | n/a | 0.000 | 0.000 | 0.884 | 961.563 | 0.012 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.240 | 5.276 | 0.005 | 0.240 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001bcc | 967.010 | 3.359 | n/a | 0.000 | 0.000 | 0.926 | 962.601 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.081 | 3.359 | 0.003 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001bab | 965.964 | 1.491 | n/a | 0.000 | 0.000 | 0.811 | 963.449 | 0.096 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.086 | 1.491 | 0.002 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001bee | 910.282 | 3.653 | n/a | 0.000 | 0.000 | 0.953 | 905.427 | 0.106 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.122 | 3.653 | 0.004 | 0.122 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001ba8 | 858.264 | 4.631 | n/a | 0.000 | 0.000 | 1.023 | 852.508 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.075 | 4.631 | 0.005 | 0.075 | gw-r/thread-52/journal/page | none observed |

## P3 / L1024 / internal (97 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 461.337 | 3.773 | n/a | 0.000 | 0.000 | 0.966 | 454.565 | 0.013 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.123 | 3.773 | 0.010 | 0.123 |
| p99 | 1008.915 | 22.271 | n/a | 0.956 | 0.000 | 7.239 | 1000.457 | 0.506 | 0.000 | 0.088 | 0.000 | n/a | n/a | 1.430 | 22.271 | 0.709 | 1.430 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001c10 | 1008.915 | 0.150 | n/a | 0.000 | 0.000 | 7.239 | 1000.358 | 0.010 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.110 | 0.150 | 0.000 | 1.110 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001c99 | 1004.252 | 6.604 | n/a | 0.000 | 0.000 | 1.068 | 996.461 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.093 | 6.604 | 0.007 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001c5f | 1003.833 | 4.195 | n/a | 0.000 | 0.000 | 0.873 | 998.651 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.087 | 4.195 | 0.004 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001c3d | 1003.021 | 0.145 | n/a | 0.000 | 0.000 | 1.118 | 1000.457 | 0.012 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.247 | 0.145 | 0.000 | 1.247 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001c25 | 1002.790 | 0.198 | n/a | 0.000 | 0.000 | 1.048 | 1000.343 | 0.020 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.142 | 0.198 | 0.000 | 1.142 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001c32 | 1002.627 | 0.187 | n/a | 0.000 | 0.000 | 0.966 | 1000.261 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.168 | 0.187 | 0.000 | 1.168 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001c96 | 1002.484 | 0.123 | n/a | 0.000 | 0.000 | 0.853 | 1000.323 | 0.017 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.135 | 0.123 | 0.000 | 1.135 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001c45 | 997.511 | 3.050 | n/a | 0.000 | 0.000 | 0.831 | 993.487 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.114 | 3.050 | 0.003 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001c86 | 994.731 | 4.661 | n/a | 0.000 | 0.000 | 0.872 | 988.898 | 0.138 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.104 | 4.661 | 0.005 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001c92 | 988.503 | 5.071 | n/a | 0.000 | 0.000 | 0.969 | 982.174 | 0.118 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.123 | 5.071 | 0.005 | 0.123 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001c98 | 987.678 | 3.773 | n/a | 0.000 | 0.000 | 2.605 | 981.112 | 0.018 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.125 | 3.773 | 0.004 | 0.125 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001c34 | 982.980 | 3.024 | n/a | 0.000 | 0.000 | 0.963 | 978.870 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.091 | 3.024 | 0.003 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001c4b | 979.569 | 2.483 | n/a | 0.000 | 0.000 | 0.818 | 976.046 | 0.119 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.082 | 2.483 | 0.003 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001c74 | 962.364 | 3.237 | n/a | 0.000 | 0.000 | 0.871 | 958.019 | 0.010 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.208 | 3.237 | 0.003 | 0.208 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001c1a | 958.824 | 3.586 | n/a | 0.000 | 0.000 | 0.931 | 954.181 | 0.007 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.091 | 3.586 | 0.004 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001c27 | 946.278 | 5.439 | n/a | 0.000 | 0.000 | 0.925 | 939.490 | 0.107 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.279 | 5.439 | 0.006 | 0.279 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001c3f | 911.096 | 3.155 | n/a | 0.000 | 0.000 | 0.894 | 906.752 | 0.159 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.110 | 3.155 | 0.003 | 0.110 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001c5a | 901.214 | 3.443 | n/a | 0.000 | 0.000 | 0.830 | 896.670 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.212 | 3.443 | 0.004 | 0.212 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001c12 | 883.444 | 4.091 | n/a | 0.000 | 0.000 | 0.864 | 878.300 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.129 | 4.091 | 0.005 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001c3c | 848.958 | 5.719 | n/a | 0.000 | 0.000 | 1.077 | 841.915 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.183 | 5.719 | 0.007 | 0.183 | gw-r/thread-52/journal/page | none observed |

## P3 / recovery / internal (139 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.293 | 4.594 | n/a | 0.000 | 0.000 | 0.991 | 363.235 | 0.043 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.128 | 4.594 | 0.015 | 0.128 |
| p99 | 1004.642 | 18.954 | n/a | 0.896 | 0.000 | 9.606 | 1000.372 | 0.393 | 0.222 | 0.106 | 0.000 | n/a | n/a | 1.409 | 18.954 | 0.559 | 1.409 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001d3b | 1006.953 | 3.296 | n/a | 0.000 | 0.000 | 8.151 | 995.272 | 0.116 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.085 | 3.296 | 0.003 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001d4e | 1004.642 | 4.377 | n/a | 0.000 | 0.000 | 3.258 | 996.798 | 0.083 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.085 | 4.377 | 0.004 | 0.085 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001cba | 1003.318 | 0.136 | n/a | 0.000 | 0.000 | 1.057 | 1000.856 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.208 | 0.136 | 0.000 | 1.208 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001d68 | 1002.418 | 4.300 | n/a | 0.000 | 0.000 | 0.829 | 997.040 | 0.113 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.119 | 4.300 | 0.004 | 0.119 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001d4f | 1001.625 | 0.137 | n/a | 0.000 | 0.000 | 0.973 | 1000.372 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.104 | 0.137 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001d74 | 1001.097 | 2.889 | n/a | 0.000 | 0.000 | 0.837 | 997.150 | 0.104 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.074 | 2.889 | 0.003 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001d13 | 1000.564 | 4.039 | n/a | 0.000 | 0.000 | 0.994 | 995.410 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.089 | 4.039 | 0.004 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001ce3 | 998.876 | 5.018 | n/a | 0.000 | 0.000 | 1.009 | 992.393 | 0.286 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.127 | 5.018 | 0.005 | 0.127 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001ca8 | 998.670 | 4.787 | n/a | 0.000 | 0.000 | 0.872 | 992.880 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.094 | 4.787 | 0.005 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001d6c | 998.626 | 2.682 | n/a | 0.000 | 0.000 | 4.730 | 991.033 | 0.064 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.069 | 2.682 | 0.003 | 0.069 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ce2 | 995.427 | 5.297 | n/a | 0.000 | 0.000 | 1.037 | 988.828 | 0.112 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.126 | 5.297 | 0.005 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001d57 | 993.229 | 5.391 | n/a | 0.000 | 0.000 | 0.969 | 986.421 | 0.169 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.250 | 5.391 | 0.005 | 0.250 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001d3c | 989.162 | 3.285 | n/a | 0.000 | 0.000 | 0.844 | 984.788 | 0.091 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.131 | 3.285 | 0.003 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001d73 | 987.184 | 2.472 | n/a | 0.000 | 0.000 | 0.839 | 983.556 | 0.220 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.053 | 2.472 | 0.003 | 0.053 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001c9f | 980.040 | 6.340 | n/a | 0.000 | 0.000 | 1.041 | 972.477 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.134 | 6.340 | 0.006 | 0.134 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001d02 | 968.079 | 2.920 | n/a | 0.000 | 0.000 | 1.027 | 963.600 | 0.393 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.111 | 2.920 | 0.003 | 0.111 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001ce4 | 954.275 | 9.032 | n/a | 0.000 | 0.000 | 1.079 | 943.704 | 0.139 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.282 | 9.032 | 0.009 | 0.282 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001cd1 | 953.860 | 3.677 | n/a | 0.000 | 0.000 | 0.858 | 949.035 | 0.009 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.241 | 3.677 | 0.004 | 0.241 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001cd7 | 936.174 | 8.213 | n/a | 0.000 | 0.000 | 1.073 | 926.456 | 0.178 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.227 | 8.213 | 0.009 | 0.227 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001cea | 935.077 | 8.427 | n/a | 0.000 | 0.000 | 1.351 | 924.913 | 0.200 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.089 | 8.427 | 0.009 | 0.089 | gw-r/thread-48/journal/page | none observed |

## P3 / p4mix / internal (108 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 351.166 | 3.396 | n/a | 0.000 | 0.000 | 0.925 | 344.371 | 0.009 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.101 | 3.396 | 0.014 | 0.101 |
| p99 | 1003.088 | 15.133 | n/a | 0.861 | 0.000 | 7.941 | 1000.628 | 0.210 | 11.421 | 0.070 | 0.000 | n/a | n/a | 1.221 | 15.133 | 0.678 | 1.221 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001e14 | 1003.210 | 0.197 | n/a | 0.000 | 0.000 | 0.907 | 1000.628 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.415 | 0.197 | 0.000 | 1.415 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001d75 | 1003.088 | 0.133 | n/a | 0.000 | 0.000 | 0.869 | 1000.876 | 0.015 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.118 | 0.133 | 0.000 | 1.118 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001dcf | 1002.681 | 0.159 | n/a | 0.000 | 0.000 | 0.951 | 1000.376 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.127 | 0.159 | 0.000 | 1.127 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001d78 | 1002.430 | 0.115 | n/a | 0.000 | 0.000 | 0.932 | 1000.115 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.221 | 0.115 | 0.000 | 1.221 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001dd9 | 1002.403 | 0.179 | n/a | 0.000 | 0.000 | 0.958 | 1000.090 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.136 | 0.179 | 0.000 | 1.136 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001d9c | 1002.100 | 0.096 | n/a | 0.000 | 0.000 | 0.837 | 983.629 | 0.010 | 16.382 | 0.036 | 0.000 | n/a | n/a | 1.109 | 0.096 | 0.000 | 1.109 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001e0c | 1002.074 | 2.615 | n/a | 0.000 | 0.000 | 0.835 | 998.337 | 0.195 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.055 | 2.615 | 0.003 | 0.055 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001e0d | 1001.906 | 0.091 | n/a | 0.000 | 0.000 | 0.818 | 999.863 | 0.003 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.110 | 0.091 | 0.000 | 1.110 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001d88 | 997.020 | 4.578 | n/a | 0.000 | 0.000 | 0.960 | 991.256 | 0.117 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.077 | 4.578 | 0.005 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001d93 | 993.769 | 4.212 | n/a | 0.000 | 0.000 | 0.881 | 988.561 | 0.008 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.079 | 4.212 | 0.004 | 0.079 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001d7a | 984.045 | 2.635 | n/a | 0.000 | 0.000 | 1.064 | 980.206 | 0.009 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.101 | 2.635 | 0.003 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001dd1 | 981.023 | 2.730 | n/a | 0.000 | 0.000 | 0.872 | 977.164 | 0.115 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.118 | 2.730 | 0.003 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001d77 | 974.141 | 2.358 | n/a | 0.000 | 0.000 | 0.858 | 970.832 | 0.003 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.072 | 2.358 | 0.002 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001db3 | 971.779 | 2.603 | n/a | 0.000 | 0.000 | 5.044 | 964.028 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.080 | 2.603 | 0.003 | 0.080 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001dfc | 970.221 | 2.699 | n/a | 0.000 | 0.000 | 0.827 | 966.498 | 0.097 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.074 | 2.699 | 0.003 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001d82 | 964.016 | 9.896 | n/a | 0.822 | 0.000 | 0.885 | 952.025 | 0.029 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.292 | 10.718 | 0.011 | 0.292 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001dff | 926.398 | 2.578 | n/a | 0.000 | 0.000 | 0.854 | 922.849 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.578 | 0.003 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001dbe | 912.463 | 2.674 | n/a | 0.000 | 0.000 | 4.124 | 905.461 | 0.110 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.070 | 2.674 | 0.003 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001e09 | 910.710 | 7.061 | n/a | 0.000 | 0.000 | 7.941 | 895.442 | 0.087 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.159 | 7.061 | 0.008 | 0.159 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001d86 | 820.138 | 2.727 | n/a | 0.000 | 0.000 | 0.735 | 816.539 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.104 | 2.727 | 0.003 | 0.104 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h1 / internal (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 464.960 | 3.537 | n/a | 0.000 | 0.000 | 0.928 | 453.788 | 0.010 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.117 | 3.537 | 0.011 | 0.117 |
| p99 | 1015.930 | 13.941 | n/a | 1.081 | 0.000 | 6.915 | 1013.813 | 0.187 | 57.864 | 0.084 | 0.000 | n/a | n/a | 2.229 | 13.941 | 0.850 | 2.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001e73 | 1015.930 | 0.124 | n/a | 0.000 | 0.000 | 0.818 | 1013.813 | 0.011 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.128 | 0.124 | 0.000 | 1.128 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001e83 | 1004.297 | 0.119 | n/a | 0.000 | 0.000 | 2.785 | 1000.196 | 0.019 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.141 | 0.119 | 0.000 | 1.141 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001e2d | 1004.236 | 2.827 | n/a | 0.000 | 0.000 | 0.805 | 1000.418 | 0.083 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.070 | 2.827 | 0.003 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e38 | 1003.425 | 0.137 | n/a | 0.000 | 0.000 | 0.941 | 1000.090 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 2.229 | 0.137 | 0.000 | 2.229 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001e7e | 1002.776 | 3.812 | n/a | 0.000 | 0.000 | 6.915 | 991.870 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.150 | 3.812 | 0.004 | 0.150 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e34 | 1002.360 | 5.237 | n/a | 0.000 | 0.000 | 0.970 | 995.885 | 0.128 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.108 | 5.237 | 0.005 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001e44 | 1002.131 | 2.337 | n/a | 0.000 | 0.000 | 4.722 | 994.830 | 0.133 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.072 | 2.337 | 0.002 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001e33 | 995.599 | 5.408 | n/a | 0.000 | 0.000 | 1.563 | 988.381 | 0.016 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.147 | 5.408 | 0.005 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ea6 | 992.827 | 9.745 | n/a | 0.000 | 0.000 | 0.851 | 980.699 | 0.114 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.382 | 9.745 | 0.010 | 1.382 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001e7a | 988.833 | 4.441 | n/a | 0.000 | 0.000 | 0.849 | 983.405 | 0.022 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.097 | 4.441 | 0.004 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001e40 | 988.049 | 2.384 | n/a | 0.000 | 0.000 | 0.858 | 984.704 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.076 | 2.384 | 0.002 | 0.076 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e82 | 985.998 | 4.966 | n/a | 0.000 | 0.000 | 0.944 | 979.881 | 0.109 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.075 | 4.966 | 0.005 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e81 | 979.355 | 2.347 | n/a | 0.000 | 0.000 | 0.859 | 975.925 | 0.104 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.098 | 2.347 | 0.002 | 0.098 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e3d | 958.356 | 3.531 | n/a | 0.000 | 0.000 | 0.919 | 953.613 | 0.094 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.182 | 3.531 | 0.004 | 0.182 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001e35 | 935.042 | 3.562 | n/a | 0.000 | 0.000 | 0.854 | 930.372 | 0.101 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.130 | 3.562 | 0.004 | 0.130 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001e7b | 902.632 | 9.829 | n/a | 0.000 | 0.000 | 1.781 | 890.850 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.160 | 9.829 | 0.011 | 0.160 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ea3 | 876.500 | 3.662 | n/a | 0.000 | 0.000 | 1.002 | 871.700 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.107 | 3.662 | 0.004 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001e21 | 815.867 | 3.013 | n/a | 0.000 | 0.000 | 0.897 | 811.672 | 0.159 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.090 | 3.013 | 0.004 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001e27 | 806.476 | 10.662 | n/a | 0.000 | 0.000 | 1.227 | 794.237 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.310 | 10.662 | 0.013 | 0.310 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001e61 | 790.918 | 3.776 | n/a | 0.000 | 0.000 | 3.387 | 783.548 | 0.005 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.142 | 3.776 | 0.005 | 0.142 | gw-r/thread-54/journal/page | none observed |

## P3 / grow3 / internal (38 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 213.389 | 105.336 | n/a | 4.893 | 0.000 | 1.218 | 111.075 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.555 | 110.229 | 0.323 | 1.555 |
| p99 | 901.318 | 158.831 | n/a | 9.848 | 0.000 | 3.332 | 688.719 | 0.994 | 38.247 | 0.067 | 0.000 | n/a | n/a | 8.436 | 168.679 | 0.928 | 8.436 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001eb5 | 901.318 | 157.341 | n/a | 9.207 | 0.000 | 1.228 | 688.719 | 0.003 | 36.378 | 0.006 | 0.000 | n/a | n/a | 8.436 | 166.548 | 0.185 | 8.436 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ec6 | 870.308 | 157.814 | n/a | 6.955 | 0.000 | 3.332 | 683.011 | 0.994 | 14.843 | 0.046 | 0.000 | n/a | n/a | 3.314 | 164.769 | 0.189 | 3.314 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001eb7 | 813.149 | 158.831 | n/a | 9.848 | 0.000 | 1.669 | 639.196 | 0.967 | 0.000 | 0.035 | 0.000 | n/a | n/a | 2.603 | 168.679 | 0.207 | 2.603 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ec4 | 721.556 | 148.106 | n/a | 6.049 | 0.000 | 1.038 | 525.112 | 0.003 | 38.247 | 0.047 | 0.000 | n/a | n/a | 2.955 | 154.155 | 0.214 | 2.955 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001ec8 | 645.067 | 106.877 | n/a | 7.872 | 0.000 | 1.443 | 526.793 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 2.057 | 114.749 | 0.178 | 2.057 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001eca | 566.428 | 127.060 | n/a | 7.135 | 0.000 | 1.650 | 418.670 | 0.005 | 8.060 | 0.021 | 0.000 | n/a | n/a | 3.826 | 134.195 | 0.237 | 3.826 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ec9 | 549.642 | 108.799 | n/a | 7.371 | 0.000 | 1.076 | 414.176 | 0.005 | 15.852 | 0.036 | 0.000 | n/a | n/a | 2.327 | 116.170 | 0.211 | 2.327 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ec1 | 548.008 | 118.974 | n/a | 6.698 | 0.000 | 0.963 | 419.177 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 2.146 | 125.672 | 0.229 | 2.146 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001eb1 | 507.022 | 126.724 | n/a | 8.098 | 0.000 | 2.105 | 367.528 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 2.502 | 134.822 | 0.266 | 2.502 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001edc | 447.866 | 157.662 | n/a | 8.979 | 0.000 | 1.382 | 258.110 | 0.004 | 18.679 | 0.030 | 0.000 | n/a | n/a | 3.021 | 166.641 | 0.372 | 3.021 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ed4 | 410.923 | 118.980 | n/a | 5.491 | 0.000 | 1.933 | 282.685 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.798 | 124.471 | 0.303 | 1.798 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ebc | 390.622 | 118.911 | n/a | 7.208 | 0.000 | 0.826 | 232.840 | 0.003 | 28.724 | 0.011 | 0.000 | n/a | n/a | 2.098 | 126.119 | 0.323 | 2.098 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ee0 | 283.689 | 112.808 | n/a | 7.451 | 0.000 | 1.104 | 160.020 | 0.674 | 0.000 | 0.019 | 0.000 | n/a | n/a | 1.614 | 120.259 | 0.424 | 1.614 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001ebb | 261.662 | 3.590 | n/a | 0.000 | 0.000 | 0.848 | 257.017 | 0.100 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.077 | 3.590 | 0.014 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001ecc | 260.522 | 109.395 | n/a | 6.958 | 0.000 | 1.218 | 141.060 | 0.003 | 0.000 | 0.006 | 0.000 | n/a | n/a | 1.883 | 116.352 | 0.447 | 1.883 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001ece | 257.588 | 105.336 | n/a | 4.893 | 0.000 | 1.259 | 134.414 | 0.005 | 10.260 | 0.021 | 0.000 | n/a | n/a | 1.401 | 110.229 | 0.428 | 1.401 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001ed1 | 239.014 | 119.113 | n/a | 5.169 | 0.000 | 1.346 | 110.708 | 0.003 | 0.000 | 0.009 | 0.000 | n/a | n/a | 2.666 | 124.282 | 0.520 | 2.666 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001edd | 237.771 | 115.234 | n/a | 7.390 | 0.000 | 1.109 | 111.075 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 2.933 | 122.625 | 0.516 | 2.933 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001ee1 | 217.433 | 116.780 | n/a | 9.194 | 0.000 | 1.096 | 88.661 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.677 | 125.974 | 0.579 | 1.677 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001ed7 | 213.389 | 124.954 | n/a | 6.707 | 0.000 | 2.657 | 77.302 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.740 | 131.660 | 0.617 | 1.740 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h3 / internal (98 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 405.798 | 3.175 | n/a | 0.000 | 0.000 | 0.900 | 402.102 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.093 | 3.175 | 0.009 | 0.093 |
| p99 | 1005.920 | 16.165 | n/a | 1.661 | 0.000 | 5.197 | 1000.453 | 0.268 | 31.498 | 0.079 | 0.000 | n/a | n/a | 1.129 | 17.826 | 0.777 | 1.129 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001f57 | 1005.920 | 5.154 | n/a | 0.000 | 0.000 | 0.925 | 999.561 | 0.122 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.125 | 5.154 | 0.005 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001f14 | 1004.640 | 4.063 | n/a | 0.000 | 0.000 | 0.975 | 999.495 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.076 | 4.063 | 0.004 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001f02 | 1002.621 | 0.111 | n/a | 0.000 | 0.000 | 0.876 | 1000.453 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.119 | 0.111 | 0.000 | 1.119 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001f43 | 1002.479 | 0.092 | n/a | 0.000 | 0.000 | 0.803 | 1000.413 | 0.023 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.101 | 0.092 | 0.000 | 1.101 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001f21 | 1002.292 | 0.134 | n/a | 0.000 | 0.000 | 0.912 | 1000.078 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.129 | 0.134 | 0.000 | 1.129 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001f7d | 1002.240 | 0.100 | n/a | 0.000 | 0.000 | 0.806 | 1000.185 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.107 | 0.100 | 0.000 | 1.107 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f01 | 1002.215 | 3.022 | n/a | 0.000 | 0.000 | 0.963 | 998.030 | 0.109 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.055 | 3.022 | 0.003 | 0.055 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001f48 | 997.863 | 2.136 | n/a | 0.000 | 0.000 | 0.808 | 994.689 | 0.114 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.070 | 2.136 | 0.002 | 0.070 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001f58 | 996.957 | 4.223 | n/a | 0.000 | 0.000 | 0.907 | 991.542 | 0.098 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.144 | 4.223 | 0.004 | 0.144 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001f37 | 996.346 | 2.540 | n/a | 0.000 | 0.000 | 0.827 | 992.871 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.064 | 2.540 | 0.003 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001f3f | 995.933 | 2.604 | n/a | 0.000 | 0.000 | 0.816 | 992.410 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.067 | 2.604 | 0.003 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001f3b | 992.970 | 2.890 | n/a | 0.000 | 0.000 | 0.789 | 989.207 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.054 | 2.890 | 0.003 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001f2c | 989.494 | 3.873 | n/a | 0.000 | 0.000 | 1.011 | 984.436 | 0.087 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.065 | 3.873 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001f6b | 989.197 | 5.273 | n/a | 0.000 | 0.000 | 0.932 | 982.855 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.111 | 5.273 | 0.005 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f59 | 964.752 | 4.619 | n/a | 0.000 | 0.000 | 2.640 | 957.318 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.084 | 4.619 | 0.005 | 0.084 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001f7f | 960.001 | 2.248 | n/a | 0.000 | 0.000 | 2.873 | 954.693 | 0.085 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.083 | 2.248 | 0.002 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f38 | 951.074 | 3.061 | n/a | 0.000 | 0.000 | 0.890 | 946.966 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.115 | 3.061 | 0.003 | 0.115 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001f4e | 917.696 | 3.358 | n/a | 0.000 | 0.000 | 1.076 | 913.120 | 0.009 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.109 | 3.358 | 0.004 | 0.109 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001f23 | 917.615 | 16.165 | n/a | 1.661 | 0.000 | 1.034 | 897.885 | 0.110 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.727 | 17.826 | 0.019 | 0.727 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001f6c | 874.799 | 4.409 | n/a | 0.000 | 0.000 | 0.861 | 869.385 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.114 | 4.409 | 0.005 | 0.114 | gw-r/thread-54/journal/page | none observed |

## P3 / grow10 / internal (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 213.822 | 114.070 | n/a | 6.492 | 0.000 | 1.122 | 81.161 | 0.005 | 0.000 | 0.011 | 0.000 | n/a | n/a | 1.620 | 121.888 | 0.585 | 1.620 |
| p99 | 559.537 | 202.979 | n/a | 24.954 | 0.000 | 4.278 | 421.538 | 13.850 | 27.192 | 0.075 | 0.000 | n/a | n/a | 4.845 | 214.319 | 0.922 | 4.845 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000001f80 | 559.537 | 125.865 | n/a | 5.358 | 0.000 | 4.278 | 421.538 | 0.721 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.757 | 131.223 | 0.235 | 1.757 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001f92 | 534.198 | 202.979 | n/a | 8.731 | 0.000 | 1.156 | 302.561 | 13.850 | 0.000 | 0.075 | 0.000 | n/a | n/a | 4.845 | 211.711 | 0.396 | 4.845 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001fb8 | 450.120 | 135.552 | n/a | 8.525 | 0.000 | 1.019 | 301.304 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 3.689 | 144.077 | 0.320 | 3.689 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001f8f | 435.530 | 172.396 | n/a | 6.805 | 0.000 | 1.385 | 251.609 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 3.287 | 179.200 | 0.411 | 3.287 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000001fa8 | 386.608 | 201.168 | n/a | 13.151 | 0.000 | 1.402 | 168.259 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 2.611 | 214.319 | 0.554 | 2.611 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001fc6 | 381.587 | 113.151 | n/a | 6.492 | 0.000 | 2.023 | 258.076 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 1.789 | 119.644 | 0.314 | 1.789 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f85 | 365.297 | 182.752 | n/a | 11.407 | 0.000 | 2.006 | 167.250 | 0.013 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.827 | 194.159 | 0.532 | 1.827 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f98 | 350.851 | 157.839 | n/a | 7.943 | 0.000 | 1.042 | 180.651 | 1.633 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.694 | 165.782 | 0.473 | 1.694 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001f81 | 345.037 | 170.663 | n/a | 10.783 | 0.000 | 1.145 | 132.202 | 0.006 | 27.041 | 0.028 | 0.000 | n/a | n/a | 3.170 | 181.446 | 0.526 | 3.170 | node-14/thread-2/replica.fetch-feed | none observed |
| 0d864820b9cd827b0000000000001fad | 334.310 | 109.144 | n/a | 6.869 | 0.000 | 1.001 | 215.688 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 1.579 | 116.013 | 0.347 | 1.579 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001fe4 | 320.326 | 132.285 | n/a | 10.540 | 0.000 | 1.722 | 173.367 | 0.006 | 0.000 | 0.026 | 0.000 | n/a | n/a | 2.379 | 142.825 | 0.446 | 2.379 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000001faa | 315.509 | 137.403 | n/a | 11.426 | 0.000 | 1.117 | 145.588 | 0.005 | 18.109 | 0.046 | 0.000 | n/a | n/a | 1.817 | 148.829 | 0.472 | 1.817 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001f96 | 302.457 | 122.588 | n/a | 5.378 | 0.000 | 2.739 | 170.262 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 1.479 | 127.966 | 0.423 | 1.479 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000001fea | 295.589 | 100.559 | n/a | 5.616 | 0.000 | 1.804 | 186.155 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 1.425 | 106.176 | 0.359 | 1.425 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001f93 | 293.068 | 136.552 | n/a | 4.935 | 0.000 | 1.205 | 140.158 | 0.011 | 5.888 | 0.075 | 0.000 | n/a | n/a | 4.244 | 141.487 | 0.483 | 4.244 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001fa4 | 289.325 | 111.024 | n/a | 5.627 | 0.000 | 2.117 | 168.078 | 1.044 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.394 | 116.651 | 0.403 | 1.394 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000001fd3 | 285.873 | 116.293 | n/a | 8.722 | 0.000 | 1.065 | 157.614 | 0.675 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.483 | 125.015 | 0.437 | 1.483 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f99 | 283.114 | 112.636 | n/a | 5.287 | 0.000 | 1.283 | 161.993 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.878 | 117.923 | 0.417 | 1.878 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000001f9b | 282.931 | 106.301 | n/a | 8.461 | 0.000 | 1.549 | 163.672 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 2.926 | 114.762 | 0.406 | 2.926 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000001fcd | 277.743 | 128.730 | n/a | 7.700 | 0.000 | 1.590 | 120.469 | 1.158 | 16.324 | 0.012 | 0.000 | n/a | n/a | 1.760 | 136.430 | 0.491 | 1.760 | gw-r/thread-50/journal/page | none observed |

## P3 / p4h10 / internal (93 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.238 | 3.406 | n/a | 0.000 | 0.000 | 0.891 | 418.056 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.085 | 3.406 | 0.010 | 0.085 |
| p99 | 1007.892 | 32.424 | n/a | 1.732 | 0.000 | 6.024 | 1001.405 | 0.208 | 28.833 | 0.078 | 0.000 | n/a | n/a | 3.471 | 34.156 | 0.575 | 3.471 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000002046 | 1007.892 | 0.208 | n/a | 0.000 | 0.000 | 5.742 | 1000.687 | 0.028 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.163 | 0.208 | 0.000 | 1.163 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000002030 | 1006.150 | 5.167 | n/a | 0.000 | 0.000 | 0.785 | 1000.053 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.115 | 5.167 | 0.005 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000002041 | 1004.732 | 2.324 | n/a | 0.000 | 0.000 | 0.800 | 1001.405 | 0.121 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.058 | 2.324 | 0.002 | 0.058 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b000000000000203b | 1004.431 | 2.435 | n/a | 0.000 | 0.000 | 0.795 | 1001.110 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.063 | 2.435 | 0.002 | 0.063 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000002034 | 1004.422 | 4.009 | n/a | 0.000 | 0.000 | 0.891 | 999.370 | 0.046 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.070 | 4.009 | 0.004 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000002067 | 1003.799 | 0.102 | n/a | 0.000 | 0.000 | 2.070 | 1000.445 | 0.021 | 0.000 | 0.054 | 0.000 | n/a | n/a | 1.106 | 0.102 | 0.000 | 1.106 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000002000 | 1002.662 | 0.101 | n/a | 0.000 | 0.000 | 0.795 | 1000.616 | 0.009 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.083 | 0.101 | 0.000 | 1.083 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002062 | 1002.450 | 0.140 | n/a | 0.000 | 0.000 | 0.834 | 1000.315 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.123 | 0.140 | 0.000 | 1.123 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000001fff | 1000.808 | 3.072 | n/a | 0.000 | 0.000 | 0.810 | 996.793 | 0.005 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.075 | 3.072 | 0.003 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000201a | 999.396 | 5.603 | n/a | 0.000 | 0.000 | 0.944 | 992.705 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.092 | 5.603 | 0.006 | 0.092 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b000000000000204e | 999.254 | 2.946 | n/a | 0.000 | 0.000 | 0.900 | 995.289 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.091 | 2.946 | 0.003 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002045 | 998.898 | 2.373 | n/a | 0.000 | 0.000 | 0.786 | 995.548 | 0.115 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.049 | 2.373 | 0.002 | 0.049 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000002008 | 994.223 | 2.278 | n/a | 0.000 | 0.000 | 0.825 | 991.020 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.072 | 2.278 | 0.002 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000002014 | 988.594 | 3.959 | n/a | 0.000 | 0.000 | 0.943 | 983.494 | 0.050 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.078 | 3.959 | 0.004 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000002052 | 983.714 | 5.517 | n/a | 0.000 | 0.000 | 0.800 | 977.269 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.099 | 5.517 | 0.006 | 0.099 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002006 | 969.478 | 2.729 | n/a | 0.000 | 0.000 | 0.870 | 965.751 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.098 | 2.729 | 0.003 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000002021 | 922.659 | 4.300 | n/a | 0.000 | 0.000 | 0.840 | 888.552 | 0.008 | 28.833 | 0.047 | 0.000 | n/a | n/a | 0.080 | 4.300 | 0.005 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002012 | 919.715 | 7.563 | n/a | 0.000 | 0.000 | 1.703 | 910.232 | 0.091 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.103 | 7.563 | 0.008 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002072 | 914.694 | 3.185 | n/a | 0.000 | 0.000 | 0.891 | 910.508 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.079 | 3.185 | 0.003 | 0.079 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000002049 | 883.290 | 3.163 | n/a | 0.000 | 0.000 | 0.909 | 879.123 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.061 | 3.163 | 0.004 | 0.061 | gw-r/thread-54/journal/page | none observed |

## P3 / presweep / internal (100 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 423.823 | 3.394 | n/a | 0.000 | 0.000 | 0.865 | 414.540 | 0.010 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.085 | 3.394 | 0.009 | 0.085 |
| p99 | 1002.078 | 10.885 | n/a | 1.291 | 0.000 | 4.295 | 996.057 | 0.219 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.561 | 12.178 | 0.731 | 0.561 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b000000000000211e | 1002.442 | 4.220 | n/a | 0.000 | 0.000 | 3.646 | 994.348 | 0.071 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.136 | 4.220 | 0.004 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000002089 | 1002.078 | 0.120 | n/a | 0.000 | 0.000 | 0.870 | 999.932 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.126 | 0.120 | 0.000 | 1.126 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b000000000000211f | 1001.036 | 5.686 | n/a | 0.000 | 0.000 | 0.837 | 994.298 | 0.099 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.091 | 5.686 | 0.006 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000002086 | 1000.462 | 4.125 | n/a | 0.000 | 0.000 | 0.872 | 995.256 | 0.099 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.074 | 4.125 | 0.004 | 0.074 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000020ed | 999.181 | 2.124 | n/a | 0.000 | 0.000 | 0.792 | 996.057 | 0.116 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.068 | 2.124 | 0.002 | 0.068 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000020e1 | 998.700 | 2.931 | n/a | 0.000 | 0.000 | 0.793 | 994.792 | 0.102 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.048 | 2.931 | 0.003 | 0.048 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000020a8 | 996.717 | 2.720 | n/a | 0.000 | 0.000 | 0.811 | 993.079 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.081 | 2.720 | 0.003 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000020a2 | 995.633 | 4.904 | n/a | 0.000 | 0.000 | 0.798 | 989.687 | 0.090 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.119 | 4.904 | 0.005 | 0.119 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000020e7 | 990.331 | 2.387 | n/a | 0.000 | 0.000 | 0.801 | 987.026 | 0.010 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.072 | 2.387 | 0.002 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000020d7 | 988.214 | 2.292 | n/a | 0.000 | 0.000 | 0.831 | 984.894 | 0.115 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.050 | 2.292 | 0.002 | 0.050 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b00000000000020c7 | 984.770 | 2.545 | n/a | 0.000 | 0.000 | 0.800 | 981.235 | 0.093 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.075 | 2.545 | 0.003 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000002088 | 961.542 | 3.938 | n/a | 0.000 | 0.000 | 0.819 | 956.510 | 0.097 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.157 | 3.938 | 0.004 | 0.157 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b00000000000020db | 958.713 | 2.282 | n/a | 0.000 | 0.000 | 0.786 | 955.547 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.067 | 2.282 | 0.002 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000002093 | 887.946 | 4.683 | n/a | 0.000 | 0.000 | 1.020 | 882.060 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.149 | 4.683 | 0.005 | 0.149 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b00000000000020ec | 868.583 | 2.170 | n/a | 0.000 | 0.000 | 0.817 | 865.510 | 0.007 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.073 | 2.170 | 0.002 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000020b8 | 859.540 | 3.033 | n/a | 0.000 | 0.000 | 0.973 | 855.337 | 0.101 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.072 | 3.033 | 0.004 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000210d | 850.305 | 9.468 | n/a | 0.000 | 0.000 | 0.957 | 839.408 | 0.168 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.237 | 9.468 | 0.011 | 0.237 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000020ce | 840.902 | 2.441 | n/a | 0.000 | 0.000 | 0.820 | 837.398 | 0.133 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.089 | 2.441 | 0.003 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b00000000000020fd | 803.297 | 2.166 | n/a | 0.000 | 0.000 | 0.855 | 800.072 | 0.115 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.069 | 2.166 | 0.003 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b000000000000211a | 766.475 | 6.014 | n/a | 0.000 | 0.000 | 0.929 | 759.435 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.071 | 6.014 | 0.008 | 0.071 | gw-r/thread-50/journal/page | none observed |

## P3 / sweep / internal (95 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 414.414 | 3.511 | n/a | 0.000 | 0.000 | 0.861 | 405.819 | 0.009 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.100 | 3.511 | 0.013 | 0.100 |
| p99 | 1007.556 | 17.676 | n/a | 2.926 | 0.000 | 4.615 | 1000.729 | 0.338 | 15.133 | 0.067 | 0.000 | n/a | n/a | 2.246 | 19.175 | 0.767 | 2.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000002165 | 1007.556 | 4.975 | n/a | 0.000 | 0.000 | 0.917 | 1000.729 | 0.338 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.567 | 4.975 | 0.005 | 0.567 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b0000000000002195 | 1005.857 | 0.080 | n/a | 0.000 | 0.000 | 4.147 | 1000.446 | 0.014 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.103 | 0.080 | 0.000 | 1.103 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000002133 | 1004.051 | 0.078 | n/a | 0.000 | 0.000 | 2.558 | 1000.249 | 0.009 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.110 | 0.078 | 0.000 | 1.110 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002188 | 1002.759 | 0.106 | n/a | 0.000 | 0.000 | 0.826 | 1000.646 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 1.110 | 0.106 | 0.000 | 1.110 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000212a | 1002.548 | 0.143 | n/a | 0.000 | 0.000 | 0.868 | 1000.373 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 1.123 | 0.143 | 0.000 | 1.123 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b000000000000217b | 1002.507 | 0.137 | n/a | 0.000 | 0.000 | 0.853 | 1000.366 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.112 | 0.137 | 0.000 | 1.112 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000021a2 | 1002.369 | 0.164 | n/a | 0.000 | 0.000 | 0.919 | 1000.103 | 0.009 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.143 | 0.164 | 0.000 | 1.143 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000002148 | 1002.320 | 4.979 | n/a | 0.000 | 0.000 | 0.785 | 996.290 | 0.071 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.144 | 4.979 | 0.005 | 0.144 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000002141 | 1002.041 | 0.099 | n/a | 0.000 | 0.000 | 0.801 | 999.997 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.106 | 0.099 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000002187 | 1000.727 | 3.310 | n/a | 0.000 | 0.000 | 0.807 | 996.508 | 0.004 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.079 | 3.310 | 0.003 | 0.079 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000002128 | 997.757 | 3.017 | n/a | 0.000 | 0.000 | 0.816 | 993.792 | 0.005 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.106 | 3.017 | 0.003 | 0.106 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000002194 | 996.432 | 3.137 | n/a | 0.000 | 0.000 | 0.796 | 992.241 | 0.108 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.119 | 3.137 | 0.003 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000002129 | 994.831 | 2.679 | n/a | 0.000 | 0.000 | 0.788 | 991.159 | 0.090 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.081 | 2.679 | 0.003 | 0.081 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b0000000000002140 | 994.342 | 4.998 | n/a | 0.000 | 0.000 | 0.807 | 988.379 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.125 | 4.998 | 0.005 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000002120 | 994.224 | 2.691 | n/a | 0.000 | 0.000 | 0.911 | 990.510 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.078 | 2.691 | 0.003 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000002164 | 993.864 | 2.608 | n/a | 0.000 | 0.000 | 0.800 | 990.369 | 0.009 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.055 | 2.608 | 0.003 | 0.055 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000212c | 990.349 | 3.216 | n/a | 0.000 | 0.000 | 0.810 | 986.122 | 0.095 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.084 | 3.216 | 0.003 | 0.084 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b000000000000218d | 990.104 | 4.250 | n/a | 0.000 | 0.000 | 0.935 | 984.794 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.096 | 4.250 | 0.004 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b000000000000218e | 949.973 | 4.920 | n/a | 0.000 | 0.000 | 0.862 | 944.071 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.088 | 4.920 | 0.005 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b0000000000002131 | 933.970 | 3.172 | n/a | 0.000 | 0.000 | 0.884 | 929.828 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.063 | 3.172 | 0.003 | 0.063 | gw-r/thread-55/journal/page | none observed |

## P3 / tail / internal (2891 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.016 | 5.629 | n/a | 0.000 | 0.000 | 0.882 | 5.399 | 0.004 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.135 | 5.712 | 0.458 | 0.135 |
| p99 | 999.642 | 35.143 | n/a | 3.699 | 0.000 | 7.831 | 995.018 | 0.223 | 10.401 | 0.062 | 0.000 | n/a | n/a | 4.987 | 37.369 | 0.876 | 4.987 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0d864820b9cd827b0000000000003942 | 1009.456 | 4.326 | n/a | 0.000 | 0.000 | 7.245 | 997.791 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.065 | 4.326 | 0.004 | 0.065 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000003a03 | 1006.873 | 4.801 | n/a | 0.000 | 0.000 | 1.674 | 1000.053 | 0.175 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.145 | 4.801 | 0.005 | 0.145 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b000000000000393f | 1006.317 | 7.515 | n/a | 0.000 | 0.000 | 0.820 | 997.741 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.213 | 7.515 | 0.007 | 0.213 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000003958 | 1005.367 | 4.324 | n/a | 0.000 | 0.000 | 0.970 | 999.952 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.097 | 4.324 | 0.004 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 0d864820b9cd827b000000000000393e | 1005.202 | 5.487 | n/a | 0.000 | 0.000 | 1.032 | 998.522 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.125 | 5.487 | 0.005 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b000000000000393d | 1004.536 | 3.883 | n/a | 0.000 | 0.000 | 0.814 | 999.591 | 0.103 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.126 | 3.883 | 0.004 | 0.126 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b00000000000039d5 | 1004.052 | 3.860 | n/a | 0.000 | 0.000 | 2.652 | 997.418 | 0.005 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.062 | 3.860 | 0.004 | 0.062 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b00000000000021df | 1004.000 | 2.983 | n/a | 0.000 | 0.000 | 1.039 | 999.688 | 0.160 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.102 | 2.983 | 0.003 | 0.102 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000003974 | 1003.998 | 3.610 | n/a | 0.000 | 0.000 | 0.905 | 999.251 | 0.116 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.091 | 3.610 | 0.004 | 0.091 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b000000000000393b | 1003.883 | 2.409 | n/a | 0.000 | 0.000 | 3.048 | 998.160 | 0.104 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.084 | 2.409 | 0.002 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 0d864820b9cd827b000000000000395e | 1003.876 | 0.265 | n/a | 0.000 | 0.000 | 1.191 | 1001.063 | 0.027 | 0.000 | 0.117 | 0.000 | n/a | n/a | 1.213 | 0.265 | 0.000 | 1.213 | gw-r/thread-51/journal/page | none observed |
| 0d864820b9cd827b0000000000003a05 | 1003.728 | 5.402 | n/a | 0.000 | 0.000 | 0.952 | 997.263 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.084 | 5.402 | 0.005 | 0.084 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b0000000000003a26 | 1002.988 | 5.156 | n/a | 0.000 | 0.000 | 1.409 | 996.157 | 0.111 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.117 | 5.156 | 0.005 | 0.117 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b0000000000003956 | 1002.938 | 0.153 | n/a | 0.000 | 0.000 | 1.185 | 1000.360 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.199 | 0.153 | 0.000 | 1.199 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000021ba | 1002.636 | 0.132 | n/a | 0.000 | 0.000 | 0.873 | 1000.479 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.096 | 0.132 | 0.000 | 1.096 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b00000000000039e3 | 1002.552 | 0.109 | n/a | 0.000 | 0.000 | 0.825 | 1000.459 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.107 | 0.109 | 0.000 | 1.107 | gw-r/thread-53/journal/page | none observed |
| 0d864820b9cd827b000000000000391a | 1002.459 | 0.156 | n/a | 0.000 | 0.000 | 0.931 | 1000.145 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.191 | 0.156 | 0.000 | 1.191 | gw-r/thread-55/journal/page | none observed |
| 0d864820b9cd827b00000000000021da | 1002.408 | 0.219 | n/a | 0.000 | 0.000 | 0.991 | 999.988 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.172 | 0.219 | 0.000 | 1.172 | gw-r/thread-54/journal/page | none observed |
| 0d864820b9cd827b0000000000003978 | 1002.349 | 0.112 | n/a | 0.000 | 0.000 | 0.823 | 1000.235 | 0.018 | 0.000 | 0.048 | 0.000 | n/a | n/a | 1.113 | 0.112 | 0.000 | 1.113 | gw-r/thread-52/journal/page | none observed |
| 0d864820b9cd827b00000000000038ea | 1002.228 | 0.091 | n/a | 0.000 | 0.000 | 0.819 | 1000.122 | 0.006 | 0.000 | 0.028 | 0.000 | n/a | n/a | 1.162 | 0.091 | 0.000 | 1.162 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.250 | 0.053 | n/a | 0.000 | 0.000 | 0.956 | 200.986 | 0.020 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.094 | 0.053 | 0.000 | 0.094 |
| p99 | 206.934 | 0.140 | n/a | 0.000 | 0.000 | 4.616 | 202.071 | 7.201 | 13.892 | 1.635 | 0.000 | n/a | n/a | 0.374 | 0.140 | 0.002 | 0.374 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000000040 | 206.934 | 0.080 | n/a | 0.000 | 0.000 | 4.616 | 201.779 | 0.034 | 0.000 | 0.263 | 0.000 | n/a | n/a | 0.162 | 0.080 | 0.000 | 0.162 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000032 | 203.841 | 0.054 | n/a | 0.000 | 0.000 | 1.217 | 202.039 | 0.065 | 0.000 | 0.343 | 0.000 | n/a | n/a | 0.122 | 0.054 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000041 | 203.795 | 0.068 | n/a | 0.000 | 0.000 | 1.265 | 202.071 | 0.042 | 0.000 | 0.215 | 0.000 | n/a | n/a | 0.135 | 0.068 | 0.000 | 0.135 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000019 | 203.608 | 0.081 | n/a | 0.000 | 0.000 | 1.631 | 201.575 | 0.019 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.095 | 0.081 | 0.000 | 0.095 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000003e | 203.585 | 0.054 | n/a | 0.000 | 0.000 | 1.110 | 201.837 | 0.127 | 0.000 | 0.339 | 0.000 | n/a | n/a | 0.119 | 0.054 | 0.000 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf000000000000004b | 203.561 | 0.061 | n/a | 0.000 | 0.000 | 1.237 | 201.860 | 0.089 | 0.000 | 0.227 | 0.000 | n/a | n/a | 0.088 | 0.061 | 0.000 | 0.088 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000021 | 203.478 | 0.064 | n/a | 0.000 | 0.000 | 1.543 | 201.320 | 0.019 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.374 | 0.064 | 0.000 | 0.374 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000025 | 203.385 | 0.044 | n/a | 0.000 | 0.000 | 0.895 | 201.900 | 0.035 | 0.000 | 0.404 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000008 | 203.378 | 0.055 | n/a | 0.000 | 0.000 | 1.594 | 201.432 | 0.029 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.106 | 0.055 | 0.000 | 0.106 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000036 | 203.210 | 0.040 | n/a | 0.000 | 0.000 | 0.812 | 202.054 | 0.038 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.091 | 0.040 | 0.000 | 0.091 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000000a | 203.156 | 0.088 | n/a | 0.000 | 0.000 | 1.101 | 201.584 | 0.023 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.173 | 0.088 | 0.000 | 0.173 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000000b | 203.079 | 0.059 | n/a | 0.000 | 0.000 | 1.221 | 201.481 | 0.015 | 0.000 | 0.188 | 0.000 | n/a | n/a | 0.115 | 0.059 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000043 | 203.070 | 0.049 | n/a | 0.000 | 0.000 | 0.847 | 201.701 | 0.059 | 0.000 | 0.311 | 0.000 | n/a | n/a | 0.104 | 0.049 | 0.000 | 0.104 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000027 | 202.966 | 0.042 | n/a | 0.000 | 0.000 | 1.001 | 201.615 | 0.027 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.076 | 0.042 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000003d | 202.951 | 0.045 | n/a | 0.000 | 0.000 | 1.153 | 201.461 | 0.020 | 0.000 | 0.196 | 0.000 | n/a | n/a | 0.075 | 0.045 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000000f | 202.749 | 0.055 | n/a | 0.000 | 0.000 | 1.041 | 201.269 | 0.027 | 0.000 | 0.260 | 0.000 | n/a | n/a | 0.096 | 0.055 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf000000000000003c | 202.728 | 0.044 | n/a | 0.000 | 0.000 | 1.048 | 201.367 | 0.018 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.119 | 0.044 | 0.000 | 0.119 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000023 | 202.594 | 0.058 | n/a | 0.000 | 0.000 | 1.100 | 201.127 | 0.026 | 0.000 | 0.179 | 0.000 | n/a | n/a | 0.103 | 0.058 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000015 | 202.578 | 0.036 | n/a | 0.000 | 0.000 | 1.022 | 201.185 | 0.032 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000046 | 202.549 | 0.034 | n/a | 0.000 | 0.000 | 0.951 | 201.262 | 0.018 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.079 | 0.034 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |

## P3 / baseline / read (225 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.990 | 0.050 | n/a | 0.000 | 0.000 | 0.921 | 200.803 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.086 | 0.050 | 0.000 | 0.086 |
| p99 | 203.576 | 0.111 | n/a | 0.000 | 0.000 | 1.624 | 201.884 | 0.722 | 0.000 | 0.277 | 0.000 | n/a | n/a | 0.199 | 0.111 | 0.001 | 0.199 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000000156 | 204.616 | 0.049 | n/a | 0.000 | 0.000 | 3.577 | 200.803 | 0.011 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.116 | 0.049 | 0.000 | 0.116 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000000e9 | 203.987 | 0.046 | n/a | 0.000 | 0.000 | 1.309 | 202.262 | 0.093 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.137 | 0.046 | 0.000 | 0.137 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000000c5 | 203.576 | 0.032 | n/a | 0.000 | 0.000 | 1.229 | 201.884 | 0.066 | 0.000 | 0.291 | 0.000 | n/a | n/a | 0.074 | 0.032 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000067 | 203.557 | 0.065 | n/a | 0.000 | 0.000 | 1.683 | 201.419 | 0.018 | 0.000 | 0.208 | 0.000 | n/a | n/a | 0.164 | 0.065 | 0.000 | 0.164 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000000d5 | 203.457 | 0.037 | n/a | 0.000 | 0.000 | 1.454 | 201.698 | 0.017 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.078 | 0.037 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000144 | 203.454 | 0.035 | n/a | 0.000 | 0.000 | 1.512 | 201.710 | 0.012 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000092 | 203.400 | 0.038 | n/a | 0.000 | 0.000 | 0.732 | 202.261 | 0.112 | 0.000 | 0.186 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000000bb | 203.331 | 0.036 | n/a | 0.000 | 0.000 | 1.108 | 201.802 | 0.065 | 0.000 | 0.237 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000000f8 | 203.228 | 0.055 | n/a | 0.000 | 0.000 | 1.139 | 201.665 | 0.071 | 0.000 | 0.159 | 0.000 | n/a | n/a | 0.140 | 0.055 | 0.000 | 0.140 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000000a7 | 203.070 | 0.094 | n/a | 0.000 | 0.000 | 1.505 | 201.179 | 0.015 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.122 | 0.094 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000000aa | 203.024 | 0.051 | n/a | 0.000 | 0.000 | 1.085 | 201.581 | 0.012 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.149 | 0.051 | 0.000 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000000ee | 203.023 | 0.042 | n/a | 0.000 | 0.000 | 0.945 | 201.710 | 0.036 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.071 | 0.042 | 0.000 | 0.071 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000005d | 203.015 | 0.045 | n/a | 0.000 | 0.000 | 0.991 | 201.662 | 0.034 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.083 | 0.045 | 0.000 | 0.083 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000123 | 202.967 | 0.055 | n/a | 0.000 | 0.000 | 1.243 | 201.391 | 0.010 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.121 | 0.055 | 0.000 | 0.121 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000060 | 202.920 | 0.070 | n/a | 0.000 | 0.000 | 0.877 | 201.572 | 0.066 | 0.000 | 0.245 | 0.000 | n/a | n/a | 0.090 | 0.070 | 0.000 | 0.090 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000000a6 | 202.914 | 0.057 | n/a | 0.000 | 0.000 | 0.938 | 201.645 | 0.023 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.082 | 0.057 | 0.000 | 0.082 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000066 | 202.909 | 0.042 | n/a | 0.000 | 0.000 | 0.805 | 200.264 | 0.037 | 0.000 | 1.672 | 0.000 | n/a | n/a | 0.090 | 0.042 | 0.000 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000000a8 | 202.867 | 0.040 | n/a | 0.000 | 0.000 | 0.905 | 201.627 | 0.047 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000013e | 202.852 | 0.068 | n/a | 0.000 | 0.000 | 1.100 | 201.473 | 0.011 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.090 | 0.068 | 0.000 | 0.090 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000077 | 202.815 | 0.050 | n/a | 0.000 | 0.000 | 1.259 | 201.192 | 0.018 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.125 | 0.050 | 0.000 | 0.125 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / read (225 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.841 | 0.052 | n/a | 0.000 | 0.000 | 0.865 | 200.702 | 0.011 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.086 | 0.052 | 0.000 | 0.086 |
| p99 | 204.512 | 0.153 | n/a | 0.000 | 0.000 | 2.068 | 202.749 | 3.924 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.246 | 0.153 | 0.001 | 0.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000000186 | 213.233 | 0.057 | n/a | 0.000 | 0.000 | 1.100 | 211.813 | 0.043 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.084 | 0.057 | 0.000 | 0.084 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000203 | 212.283 | 0.153 | n/a | 0.000 | 0.000 | 3.157 | 205.021 | 0.013 | 0.000 | 3.693 | 0.000 | n/a | n/a | 0.246 | 0.153 | 0.001 | 0.246 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000174 | 204.512 | 0.063 | n/a | 0.000 | 0.000 | 1.281 | 202.749 | 0.052 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.141 | 0.063 | 0.000 | 0.141 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000022e | 203.882 | 0.065 | n/a | 0.000 | 0.000 | 1.115 | 202.282 | 0.119 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.131 | 0.065 | 0.000 | 0.131 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000163 | 203.806 | 0.160 | n/a | 0.000 | 0.000 | 1.887 | 201.375 | 0.012 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.268 | 0.160 | 0.001 | 0.268 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000173 | 203.274 | 0.181 | n/a | 0.000 | 0.000 | 1.644 | 201.090 | 0.009 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.240 | 0.181 | 0.001 | 0.240 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000225 | 203.119 | 0.053 | n/a | 0.000 | 0.000 | 1.212 | 201.228 | 0.011 | 0.000 | 0.474 | 0.000 | n/a | n/a | 0.142 | 0.053 | 0.000 | 0.142 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000024e | 203.002 | 0.054 | n/a | 0.000 | 0.000 | 2.068 | 200.702 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.111 | 0.054 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000199 | 202.888 | 0.075 | n/a | 0.000 | 0.000 | 0.917 | 201.666 | 0.007 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.132 | 0.075 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000228 | 202.880 | 0.059 | n/a | 0.000 | 0.000 | 0.998 | 201.515 | 0.089 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.122 | 0.059 | 0.000 | 0.122 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000218 | 202.837 | 0.144 | n/a | 0.000 | 0.000 | 1.022 | 201.417 | 0.016 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.112 | 0.144 | 0.001 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000162 | 202.830 | 0.138 | n/a | 0.000 | 0.000 | 1.057 | 201.345 | 0.011 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.169 | 0.138 | 0.001 | 0.169 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000254 | 202.807 | 0.048 | n/a | 0.000 | 0.000 | 0.918 | 201.539 | 0.016 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.101 | 0.048 | 0.000 | 0.101 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000210 | 202.721 | 0.083 | n/a | 0.000 | 0.000 | 1.151 | 201.126 | 0.009 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.213 | 0.083 | 0.000 | 0.213 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000001a7 | 202.683 | 0.035 | n/a | 0.000 | 0.000 | 0.924 | 201.477 | 0.015 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.067 | 0.035 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000001da | 202.673 | 0.037 | n/a | 0.000 | 0.000 | 0.922 | 201.444 | 0.042 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.081 | 0.037 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000191 | 202.627 | 0.056 | n/a | 0.000 | 0.000 | 0.890 | 201.458 | 0.020 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.095 | 0.056 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000185 | 202.624 | 0.085 | n/a | 0.000 | 0.000 | 1.181 | 201.077 | 0.012 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.190 | 0.085 | 0.000 | 0.190 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000020a | 202.616 | 0.040 | n/a | 0.000 | 0.000 | 1.425 | 200.921 | 0.033 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.096 | 0.040 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000001a9 | 202.606 | 0.059 | n/a | 0.000 | 0.000 | 0.845 | 201.432 | 0.013 | 0.000 | 0.147 | 0.000 | n/a | n/a | 0.110 | 0.059 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |

## P3 / L4 / read (128 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.313 | 0.057 | n/a | 0.000 | 0.000 | 0.853 | 86.707 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.078 | 0.057 | 0.001 | 0.078 |
| p99 | 204.435 | 0.110 | n/a | 0.000 | 0.000 | 2.139 | 203.040 | 1.212 | 0.412 | 0.141 | 0.000 | n/a | n/a | 0.195 | 0.110 | 0.009 | 0.195 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000000269 | 207.299 | 0.091 | n/a | 0.000 | 0.000 | 2.051 | 204.880 | 0.025 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.156 | 0.091 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000027a | 204.435 | 0.046 | n/a | 0.000 | 0.000 | 1.167 | 203.040 | 0.026 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.073 | 0.046 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000292 | 202.931 | 0.040 | n/a | 0.000 | 0.000 | 0.806 | 201.763 | 0.129 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.080 | 0.040 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000279 | 202.780 | 0.207 | n/a | 0.000 | 0.000 | 1.560 | 200.773 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.165 | 0.207 | 0.001 | 0.165 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000299 | 202.617 | 0.058 | n/a | 0.000 | 0.000 | 1.073 | 201.274 | 0.009 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.086 | 0.058 | 0.000 | 0.086 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000025b | 202.510 | 0.047 | n/a | 0.000 | 0.000 | 1.156 | 201.055 | 0.011 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.078 | 0.047 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000267 | 202.467 | 0.048 | n/a | 0.000 | 0.000 | 1.071 | 201.145 | 0.007 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.098 | 0.048 | 0.000 | 0.098 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000290 | 202.387 | 0.083 | n/a | 0.000 | 0.000 | 0.956 | 201.162 | 0.007 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.079 | 0.083 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000285 | 202.291 | 0.034 | n/a | 0.000 | 0.000 | 0.802 | 201.266 | 0.007 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.066 | 0.034 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000025c | 202.260 | 0.039 | n/a | 0.000 | 0.000 | 0.886 | 201.147 | 0.007 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.066 | 0.039 | 0.000 | 0.066 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000002a0 | 202.253 | 0.046 | n/a | 0.000 | 0.000 | 1.007 | 201.042 | 0.006 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.080 | 0.046 | 0.000 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000264 | 202.233 | 0.061 | n/a | 0.000 | 0.000 | 0.786 | 201.170 | 0.010 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.104 | 0.061 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000278 | 202.189 | 0.063 | n/a | 0.000 | 0.000 | 0.953 | 200.948 | 0.008 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.138 | 0.063 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000025f | 202.120 | 0.057 | n/a | 0.000 | 0.000 | 0.853 | 201.032 | 0.011 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.095 | 0.057 | 0.000 | 0.095 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000277 | 202.107 | 0.044 | n/a | 0.000 | 0.000 | 0.793 | 201.076 | 0.011 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.085 | 0.044 | 0.000 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000028a | 202.088 | 0.040 | n/a | 0.000 | 0.000 | 0.782 | 201.056 | 0.007 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.069 | 0.040 | 0.000 | 0.069 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000284 | 202.052 | 0.047 | n/a | 0.000 | 0.000 | 0.766 | 201.058 | 0.015 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.075 | 0.047 | 0.000 | 0.075 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000282 | 202.047 | 0.037 | n/a | 0.000 | 0.000 | 0.797 | 201.006 | 0.057 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.068 | 0.037 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000283 | 202.021 | 0.040 | n/a | 0.000 | 0.000 | 0.833 | 200.957 | 0.008 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.070 | 0.040 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000296 | 202.001 | 0.035 | n/a | 0.000 | 0.000 | 0.794 | 200.991 | 0.012 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |

## P3 / L16 / read (136 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 116.817 | 0.047 | n/a | 0.000 | 0.000 | 0.830 | 115.617 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.077 | 0.047 | 0.000 | 0.077 |
| p99 | 203.160 | 0.099 | n/a | 0.000 | 0.000 | 2.448 | 201.411 | 1.106 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.214 | 0.099 | 0.002 | 0.214 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000000e78 | 224.017 | 0.062 | n/a | 0.000 | 0.000 | 23.524 | 199.937 | 0.004 | 0.400 | 0.022 | 0.000 | n/a | n/a | 0.070 | 0.062 | 0.000 | 0.070 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000b0c | 203.160 | 0.077 | n/a | 0.000 | 0.000 | 1.346 | 201.411 | 0.017 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.210 | 0.077 | 0.000 | 0.210 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000e97 | 203.142 | 0.098 | n/a | 0.000 | 0.000 | 0.954 | 201.766 | 0.010 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.101 | 0.098 | 0.000 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000e8d | 202.272 | 0.040 | n/a | 0.000 | 0.000 | 0.996 | 201.039 | 0.019 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.110 | 0.040 | 0.000 | 0.110 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000e7b | 202.201 | 0.037 | n/a | 0.000 | 0.000 | 0.792 | 201.223 | 0.015 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.065 | 0.037 | 0.000 | 0.065 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000e82 | 202.161 | 0.061 | n/a | 0.000 | 0.000 | 1.023 | 200.792 | 0.006 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.175 | 0.061 | 0.000 | 0.175 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000e81 | 202.112 | 0.039 | n/a | 0.000 | 0.000 | 0.884 | 201.045 | 0.007 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.067 | 0.039 | 0.000 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000e6d | 202.059 | 0.058 | n/a | 0.000 | 0.000 | 0.791 | 201.046 | 0.014 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.085 | 0.058 | 0.000 | 0.085 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000e6e | 202.035 | 0.051 | n/a | 0.000 | 0.000 | 0.781 | 201.047 | 0.012 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.076 | 0.051 | 0.000 | 0.076 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000e59 | 201.950 | 0.046 | n/a | 0.000 | 0.000 | 0.881 | 200.846 | 0.005 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.101 | 0.046 | 0.000 | 0.101 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000e5f | 201.904 | 0.032 | n/a | 0.000 | 0.000 | 0.787 | 200.857 | 0.019 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000e54 | 201.869 | 0.048 | n/a | 0.000 | 0.000 | 0.768 | 200.910 | 0.008 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.072 | 0.048 | 0.000 | 0.072 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000e71 | 201.792 | 0.055 | n/a | 0.000 | 0.000 | 0.745 | 200.791 | 0.011 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.116 | 0.055 | 0.000 | 0.116 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000e51 | 201.737 | 0.038 | n/a | 0.000 | 0.000 | 0.783 | 200.780 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.075 | 0.038 | 0.000 | 0.075 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000e9d | 201.734 | 0.075 | n/a | 0.000 | 0.000 | 0.859 | 200.636 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.100 | 0.075 | 0.000 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000e4c | 201.704 | 0.052 | n/a | 0.000 | 0.000 | 0.883 | 200.604 | 0.004 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.112 | 0.052 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000e96 | 201.689 | 0.035 | n/a | 0.000 | 0.000 | 1.015 | 200.449 | 0.006 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.096 | 0.035 | 0.000 | 0.096 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000e5a | 201.685 | 0.043 | n/a | 0.000 | 0.000 | 0.887 | 200.631 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.067 | 0.043 | 0.000 | 0.067 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000e62 | 201.666 | 0.051 | n/a | 0.000 | 0.000 | 0.865 | 200.591 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.106 | 0.051 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000e56 | 201.660 | 0.037 | n/a | 0.000 | 0.000 | 0.880 | 200.596 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.093 | 0.037 | 0.000 | 0.093 | gw-r/thread-55/journal/page | none observed |

## P3 / L64 / read (230 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.375 | 0.044 | n/a | 0.000 | 0.000 | 0.807 | 200.397 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.073 | 0.044 | 0.000 | 0.073 |
| p99 | 203.231 | 0.110 | n/a | 0.000 | 0.000 | 2.095 | 201.196 | 3.146 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.190 | 0.110 | 0.001 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000000ecc | 205.326 | 0.036 | n/a | 0.000 | 0.000 | 4.122 | 201.020 | 0.009 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.068 | 0.036 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000f4e | 204.588 | 0.052 | n/a | 0.000 | 0.000 | 1.553 | 202.644 | 0.043 | 0.000 | 0.169 | 0.000 | n/a | n/a | 0.126 | 0.052 | 0.000 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000ef5 | 203.231 | 0.054 | n/a | 0.000 | 0.000 | 0.880 | 202.004 | 0.025 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.104 | 0.054 | 0.000 | 0.104 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000eee | 202.888 | 0.031 | n/a | 0.000 | 0.000 | 2.095 | 200.635 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.073 | 0.031 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000f94 | 202.561 | 0.085 | n/a | 0.000 | 0.000 | 1.070 | 200.979 | 0.014 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.304 | 0.085 | 0.000 | 0.304 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000f95 | 202.518 | 0.086 | n/a | 0.000 | 0.000 | 1.178 | 201.028 | 0.014 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.146 | 0.086 | 0.000 | 0.146 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000000f72 | 202.495 | 0.065 | n/a | 0.000 | 0.000 | 1.179 | 200.999 | 0.035 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.147 | 0.065 | 0.000 | 0.147 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000ee4 | 202.477 | 0.073 | n/a | 0.000 | 0.000 | 1.478 | 200.739 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.126 | 0.073 | 0.000 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000fa0 | 202.475 | 0.049 | n/a | 0.000 | 0.000 | 1.198 | 200.946 | 0.011 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.104 | 0.049 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000f59 | 202.293 | 0.052 | n/a | 0.000 | 0.000 | 0.818 | 201.158 | 0.011 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.151 | 0.052 | 0.000 | 0.151 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000f4c | 202.292 | 0.054 | n/a | 0.000 | 0.000 | 1.292 | 200.675 | 0.010 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.136 | 0.054 | 0.000 | 0.136 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000f4f | 202.247 | 0.178 | n/a | 0.000 | 0.000 | 0.850 | 200.974 | 0.006 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.124 | 0.178 | 0.001 | 0.124 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000fa1 | 202.239 | 0.056 | n/a | 0.000 | 0.000 | 0.821 | 201.196 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.085 | 0.056 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000fa7 | 202.227 | 0.032 | n/a | 0.000 | 0.000 | 1.276 | 200.746 | 0.021 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.072 | 0.032 | 0.000 | 0.072 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000000f5a | 202.196 | 0.045 | n/a | 0.000 | 0.000 | 0.777 | 201.193 | 0.042 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.078 | 0.045 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000eb3 | 202.150 | 0.058 | n/a | 0.000 | 0.000 | 0.958 | 200.941 | 0.006 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.094 | 0.058 | 0.000 | 0.094 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000000f08 | 202.134 | 0.062 | n/a | 0.000 | 0.000 | 0.837 | 201.056 | 0.008 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.091 | 0.062 | 0.000 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000f6d | 202.030 | 0.027 | n/a | 0.000 | 0.000 | 1.386 | 200.477 | 0.014 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.062 | 0.027 | 0.000 | 0.062 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000f2a | 202.027 | 0.082 | n/a | 0.000 | 0.000 | 0.888 | 200.874 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.131 | 0.082 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000000f86 | 202.016 | 0.043 | n/a | 0.000 | 0.000 | 0.888 | 200.819 | 0.010 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.200 | 0.043 | 0.000 | 0.200 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / read (231 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.370 | 0.041 | n/a | 0.000 | 0.000 | 0.818 | 200.392 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.068 | 0.041 | 0.000 | 0.068 |
| p99 | 210.723 | 0.097 | n/a | 0.000 | 0.000 | 1.880 | 201.874 | 3.431 | 0.650 | 0.158 | 0.000 | n/a | n/a | 0.196 | 0.097 | 0.001 | 0.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf000000000000104e | 259.541 | 0.048 | n/a | 0.000 | 0.000 | 57.413 | 201.521 | 0.016 | 0.299 | 0.127 | 0.000 | n/a | n/a | 0.117 | 0.048 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001090 | 226.625 | 0.026 | n/a | 0.000 | 0.000 | 1.024 | 207.180 | 0.005 | 18.262 | 0.069 | 0.000 | n/a | n/a | 0.059 | 0.026 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000000fc0 | 210.723 | 0.058 | n/a | 0.000 | 0.000 | 0.916 | 209.472 | 0.027 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.093 | 0.058 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000010a3 | 204.099 | 0.076 | n/a | 0.000 | 0.000 | 2.359 | 201.360 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.196 | 0.076 | 0.000 | 0.196 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001094 | 204.021 | 0.062 | n/a | 0.000 | 0.000 | 1.257 | 201.874 | 0.006 | 0.650 | 0.054 | 0.000 | n/a | n/a | 0.118 | 0.062 | 0.000 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000000fba | 203.101 | 0.051 | n/a | 0.000 | 0.000 | 1.123 | 201.712 | 0.010 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.116 | 0.051 | 0.000 | 0.116 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000001093 | 202.788 | 0.052 | n/a | 0.000 | 0.000 | 0.829 | 181.423 | 0.017 | 20.225 | 0.148 | 0.000 | n/a | n/a | 0.093 | 0.052 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001014 | 202.775 | 0.038 | n/a | 0.000 | 0.000 | 1.880 | 200.696 | 0.011 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.090 | 0.038 | 0.000 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000000fc1 | 202.404 | 0.053 | n/a | 0.000 | 0.000 | 1.083 | 201.046 | 0.016 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.106 | 0.053 | 0.000 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000107e | 202.319 | 0.064 | n/a | 0.000 | 0.000 | 1.103 | 200.963 | 0.005 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.089 | 0.064 | 0.000 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001026 | 202.257 | 0.048 | n/a | 0.000 | 0.000 | 0.876 | 201.169 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.099 | 0.048 | 0.000 | 0.099 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001046 | 202.255 | 0.038 | n/a | 0.000 | 0.000 | 0.791 | 201.197 | 0.065 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.067 | 0.038 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000106c | 202.245 | 0.044 | n/a | 0.000 | 0.000 | 0.889 | 201.071 | 0.084 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.100 | 0.044 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000102b | 202.218 | 0.057 | n/a | 0.000 | 0.000 | 0.881 | 201.106 | 0.022 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.073 | 0.057 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001092 | 202.190 | 0.062 | n/a | 0.000 | 0.000 | 0.914 | 201.011 | 0.024 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.108 | 0.062 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001066 | 202.189 | 0.040 | n/a | 0.000 | 0.000 | 0.795 | 201.150 | 0.018 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001089 | 202.178 | 0.034 | n/a | 0.000 | 0.000 | 0.938 | 201.049 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.065 | 0.034 | 0.000 | 0.065 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000100c | 202.120 | 0.044 | n/a | 0.000 | 0.000 | 0.819 | 201.080 | 0.020 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.073 | 0.044 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000102c | 202.111 | 0.044 | n/a | 0.000 | 0.000 | 0.825 | 200.998 | 0.011 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.076 | 0.044 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001079 | 202.102 | 0.047 | n/a | 0.000 | 0.000 | 1.309 | 200.561 | 0.014 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.124 | 0.047 | 0.000 | 0.124 | gw-r/thread-55/journal/page | none observed |

## P3 / L1024 / read (229 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.460 | 0.047 | n/a | 0.000 | 0.000 | 0.876 | 200.374 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.079 | 0.047 | 0.000 | 0.079 |
| p99 | 203.482 | 0.133 | n/a | 0.000 | 0.000 | 1.314 | 202.211 | 4.196 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.207 | 0.133 | 0.002 | 0.207 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf00000000000010f5 | 250.559 | 0.158 | n/a | 0.000 | 0.000 | 1.034 | 249.098 | 0.043 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.097 | 0.158 | 0.001 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000010b8 | 212.166 | 0.081 | n/a | 0.000 | 0.000 | 0.960 | 210.933 | 0.026 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.107 | 0.081 | 0.000 | 0.107 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000010f4 | 203.482 | 0.052 | n/a | 0.000 | 0.000 | 1.171 | 202.015 | 0.011 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.121 | 0.052 | 0.000 | 0.121 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000113e | 203.379 | 0.057 | n/a | 0.000 | 0.000 | 0.959 | 202.211 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.074 | 0.057 | 0.000 | 0.074 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000118b | 203.104 | 0.052 | n/a | 0.000 | 0.000 | 0.923 | 201.823 | 0.025 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.162 | 0.052 | 0.000 | 0.162 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000010d2 | 202.815 | 0.093 | n/a | 0.000 | 0.000 | 1.470 | 200.919 | 0.015 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.202 | 0.093 | 0.000 | 0.202 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001148 | 202.464 | 0.042 | n/a | 0.000 | 0.000 | 0.860 | 201.421 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.071 | 0.042 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001118 | 202.389 | 0.088 | n/a | 0.000 | 0.000 | 1.120 | 200.931 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.160 | 0.088 | 0.000 | 0.160 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001114 | 202.263 | 0.050 | n/a | 0.000 | 0.000 | 0.928 | 201.069 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.096 | 0.050 | 0.000 | 0.096 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001157 | 202.161 | 0.043 | n/a | 0.000 | 0.000 | 1.421 | 200.552 | 0.014 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.091 | 0.043 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001101 | 202.156 | 0.056 | n/a | 0.000 | 0.000 | 0.855 | 201.021 | 0.026 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.098 | 0.056 | 0.000 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001167 | 202.119 | 0.028 | n/a | 0.000 | 0.000 | 0.887 | 201.077 | 0.005 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.057 | 0.028 | 0.000 | 0.057 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000010eb | 202.116 | 0.041 | n/a | 0.000 | 0.000 | 0.871 | 200.923 | 0.006 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.188 | 0.041 | 0.000 | 0.188 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001141 | 202.099 | 0.052 | n/a | 0.000 | 0.000 | 0.833 | 201.032 | 0.020 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.073 | 0.052 | 0.000 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000010f0 | 202.095 | 0.056 | n/a | 0.000 | 0.000 | 0.895 | 200.886 | 0.026 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.132 | 0.056 | 0.000 | 0.132 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000011a4 | 202.091 | 0.057 | n/a | 0.000 | 0.000 | 1.155 | 200.680 | 0.022 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.124 | 0.057 | 0.000 | 0.124 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001188 | 202.082 | 0.047 | n/a | 0.000 | 0.000 | 0.831 | 201.009 | 0.040 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.082 | 0.047 | 0.000 | 0.082 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000010c3 | 202.041 | 0.031 | n/a | 0.000 | 0.000 | 1.005 | 200.871 | 0.024 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.067 | 0.031 | 0.000 | 0.067 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001190 | 201.970 | 0.041 | n/a | 0.000 | 0.000 | 0.797 | 200.995 | 0.008 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.060 | 0.041 | 0.000 | 0.060 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000010d1 | 201.943 | 0.053 | n/a | 0.000 | 0.000 | 0.874 | 200.837 | 0.021 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.077 | 0.053 | 0.000 | 0.077 | gw-r/thread-50/journal/page | none observed |

## P3 / recovery / read (305 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.424 | 0.046 | n/a | 0.000 | 0.000 | 0.855 | 200.371 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.071 | 0.046 | 0.000 | 0.071 |
| p99 | 202.911 | 0.097 | n/a | 0.000 | 0.000 | 1.971 | 201.509 | 2.578 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.176 | 0.097 | 0.001 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf000000000000129d | 240.404 | 0.042 | n/a | 0.000 | 0.000 | 15.564 | 224.678 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.069 | 0.042 | 0.000 | 0.069 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000129e | 203.154 | 0.069 | n/a | 0.000 | 0.000 | 1.865 | 201.017 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.134 | 0.069 | 0.000 | 0.134 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001202 | 202.983 | 0.075 | n/a | 0.000 | 0.000 | 1.137 | 201.546 | 0.006 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.136 | 0.075 | 0.000 | 0.136 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001286 | 202.911 | 0.055 | n/a | 0.000 | 0.000 | 0.895 | 201.715 | 0.023 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.095 | 0.055 | 0.000 | 0.095 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000012c6 | 202.659 | 0.029 | n/a | 0.000 | 0.000 | 1.546 | 200.910 | 0.009 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000012eb | 202.599 | 0.037 | n/a | 0.000 | 0.000 | 0.900 | 201.509 | 0.013 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001201 | 202.547 | 0.094 | n/a | 0.000 | 0.000 | 1.266 | 200.962 | 0.010 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.134 | 0.094 | 0.000 | 0.134 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000125f | 202.537 | 0.073 | n/a | 0.000 | 0.000 | 1.010 | 201.160 | 0.025 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.160 | 0.073 | 0.000 | 0.160 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000127a | 202.448 | 0.049 | n/a | 0.000 | 0.000 | 1.309 | 200.938 | 0.008 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.071 | 0.049 | 0.000 | 0.071 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000011f7 | 202.365 | 0.065 | n/a | 0.000 | 0.000 | 1.019 | 201.006 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.176 | 0.065 | 0.000 | 0.176 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000012cd | 202.301 | 0.041 | n/a | 0.000 | 0.000 | 0.971 | 201.128 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.085 | 0.041 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001300 | 202.253 | 0.025 | n/a | 0.000 | 0.000 | 2.216 | 199.927 | 0.007 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.062 | 0.025 | 0.000 | 0.062 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001255 | 202.202 | 0.054 | n/a | 0.000 | 0.000 | 0.797 | 201.263 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.063 | 0.054 | 0.000 | 0.063 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000125d | 202.197 | 0.040 | n/a | 0.000 | 0.000 | 1.053 | 200.882 | 0.013 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.068 | 0.040 | 0.000 | 0.068 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000011e7 | 202.190 | 0.042 | n/a | 0.000 | 0.000 | 1.046 | 200.967 | 0.011 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.068 | 0.042 | 0.000 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000012af | 202.181 | 0.078 | n/a | 0.000 | 0.000 | 0.976 | 200.886 | 0.005 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.169 | 0.078 | 0.000 | 0.169 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000121c | 202.174 | 0.078 | n/a | 0.000 | 0.000 | 0.906 | 200.952 | 0.020 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.114 | 0.078 | 0.000 | 0.114 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001212 | 202.153 | 0.057 | n/a | 0.000 | 0.000 | 0.987 | 200.898 | 0.005 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.102 | 0.057 | 0.000 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001228 | 202.119 | 0.087 | n/a | 0.000 | 0.000 | 1.224 | 200.552 | 0.006 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.169 | 0.087 | 0.000 | 0.169 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001211 | 202.095 | 0.035 | n/a | 0.000 | 0.000 | 0.851 | 201.039 | 0.023 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-53/journal/page | none observed |

## P3 / p4mix / read (233 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.268 | 0.038 | n/a | 0.000 | 0.000 | 0.829 | 200.254 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.071 | 0.038 | 0.000 | 0.071 |
| p99 | 202.809 | 0.099 | n/a | 0.000 | 0.000 | 1.569 | 201.260 | 2.461 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.187 | 0.099 | 0.001 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000001352 | 211.137 | 0.042 | n/a | 0.000 | 0.000 | 9.840 | 200.567 | 0.010 | 0.521 | 0.078 | 0.000 | n/a | n/a | 0.078 | 0.042 | 0.000 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000013c9 | 203.041 | 0.117 | n/a | 0.000 | 0.000 | 1.317 | 201.105 | 0.064 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.281 | 0.117 | 0.001 | 0.281 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000013d0 | 202.809 | 0.038 | n/a | 0.000 | 0.000 | 0.841 | 201.595 | 0.047 | 0.000 | 0.192 | 0.000 | n/a | n/a | 0.095 | 0.038 | 0.000 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001341 | 202.544 | 0.039 | n/a | 0.000 | 0.000 | 0.860 | 201.359 | 0.026 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001329 | 202.403 | 0.048 | n/a | 0.000 | 0.000 | 0.853 | 201.260 | 0.026 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.098 | 0.048 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000013f3 | 202.370 | 0.046 | n/a | 0.000 | 0.000 | 0.987 | 201.163 | 0.007 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.091 | 0.046 | 0.000 | 0.091 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000013d8 | 202.142 | 0.060 | n/a | 0.000 | 0.000 | 1.021 | 200.756 | 0.012 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.167 | 0.060 | 0.000 | 0.167 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001359 | 202.140 | 0.063 | n/a | 0.000 | 0.000 | 1.043 | 200.819 | 0.011 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.135 | 0.063 | 0.000 | 0.135 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001307 | 202.135 | 0.030 | n/a | 0.000 | 0.000 | 0.794 | 201.097 | 0.010 | 0.000 | 0.139 | 0.000 | n/a | n/a | 0.065 | 0.030 | 0.000 | 0.065 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001308 | 202.110 | 0.056 | n/a | 0.000 | 0.000 | 0.995 | 200.859 | 0.012 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.119 | 0.056 | 0.000 | 0.119 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000013da | 202.094 | 0.032 | n/a | 0.000 | 0.000 | 1.327 | 200.569 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.082 | 0.032 | 0.000 | 0.082 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001317 | 201.965 | 0.047 | n/a | 0.000 | 0.000 | 1.000 | 200.686 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.125 | 0.047 | 0.000 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001343 | 201.931 | 0.033 | n/a | 0.000 | 0.000 | 0.838 | 200.870 | 0.018 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.077 | 0.033 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001315 | 201.929 | 0.025 | n/a | 0.000 | 0.000 | 0.773 | 200.966 | 0.008 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.052 | 0.025 | 0.000 | 0.052 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000013f2 | 201.918 | 0.034 | n/a | 0.000 | 0.000 | 0.806 | 200.907 | 0.010 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.077 | 0.034 | 0.000 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000133e | 201.912 | 0.028 | n/a | 0.000 | 0.000 | 1.125 | 200.647 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.059 | 0.028 | 0.000 | 0.059 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf000000000000132d | 201.892 | 0.065 | n/a | 0.000 | 0.000 | 0.929 | 200.727 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.104 | 0.065 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000134a | 201.887 | 0.045 | n/a | 0.000 | 0.000 | 0.903 | 200.667 | 0.010 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.192 | 0.045 | 0.000 | 0.192 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000136a | 201.883 | 0.053 | n/a | 0.000 | 0.000 | 0.824 | 200.851 | 0.009 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.075 | 0.053 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000013ef | 201.865 | 0.070 | n/a | 0.000 | 0.000 | 0.917 | 200.729 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.092 | 0.070 | 0.000 | 0.092 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h1 / read (227 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.279 | 0.040 | n/a | 0.000 | 0.000 | 0.842 | 200.279 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.075 | 0.040 | 0.000 | 0.075 |
| p99 | 203.469 | 0.107 | n/a | 0.000 | 0.000 | 1.679 | 201.531 | 2.795 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.228 | 0.107 | 0.001 | 0.228 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf00000000000014a9 | 210.134 | 0.036 | n/a | 0.000 | 0.000 | 9.570 | 200.393 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.068 | 0.036 | 0.000 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000014de | 204.587 | 0.048 | n/a | 0.000 | 0.000 | 1.164 | 203.118 | 0.009 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.126 | 0.048 | 0.000 | 0.126 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000001492 | 203.469 | 0.059 | n/a | 0.000 | 0.000 | 1.679 | 201.531 | 0.007 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.094 | 0.059 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000014e1 | 203.184 | 0.096 | n/a | 0.000 | 0.000 | 1.492 | 201.234 | 0.025 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.187 | 0.096 | 0.000 | 0.187 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000014e0 | 202.943 | 0.094 | n/a | 0.000 | 0.000 | 1.392 | 201.020 | 0.018 | 0.000 | 0.178 | 0.000 | n/a | n/a | 0.240 | 0.094 | 0.000 | 0.240 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000014ee | 202.930 | 0.033 | n/a | 0.000 | 0.000 | 1.209 | 201.544 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.095 | 0.033 | 0.000 | 0.095 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000014e4 | 202.655 | 0.270 | n/a | 0.000 | 0.000 | 1.375 | 200.597 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.366 | 0.270 | 0.001 | 0.366 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000014ce | 202.505 | 0.075 | n/a | 0.000 | 0.000 | 0.926 | 201.231 | 0.025 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.112 | 0.075 | 0.000 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000014b3 | 202.452 | 0.059 | n/a | 0.000 | 0.000 | 1.465 | 200.693 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.168 | 0.059 | 0.000 | 0.168 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000014b6 | 202.425 | 0.167 | n/a | 0.000 | 0.000 | 1.526 | 200.602 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.076 | 0.167 | 0.001 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000014bd | 202.343 | 0.051 | n/a | 0.000 | 0.000 | 1.040 | 201.034 | 0.006 | 0.000 | 0.122 | 0.000 | n/a | n/a | 0.091 | 0.051 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000014ca | 202.309 | 0.038 | n/a | 0.000 | 0.000 | 0.935 | 201.140 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.091 | 0.038 | 0.000 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000014b2 | 202.263 | 0.066 | n/a | 0.000 | 0.000 | 1.219 | 200.737 | 0.013 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.165 | 0.066 | 0.000 | 0.165 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000014af | 202.234 | 0.045 | n/a | 0.000 | 0.000 | 1.139 | 200.862 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001415 | 202.215 | 0.057 | n/a | 0.000 | 0.000 | 1.065 | 200.895 | 0.005 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.131 | 0.057 | 0.000 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000014c7 | 202.138 | 0.064 | n/a | 0.000 | 0.000 | 1.267 | 200.537 | 0.010 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.203 | 0.064 | 0.000 | 0.203 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000149e | 202.116 | 0.034 | n/a | 0.000 | 0.000 | 1.545 | 200.369 | 0.022 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.095 | 0.034 | 0.000 | 0.095 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000144f | 202.082 | 0.041 | n/a | 0.000 | 0.000 | 0.808 | 201.042 | 0.009 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.081 | 0.041 | 0.000 | 0.081 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000001464 | 202.076 | 0.028 | n/a | 0.000 | 0.000 | 0.771 | 201.101 | 0.010 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.074 | 0.028 | 0.000 | 0.074 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000014c3 | 202.066 | 0.068 | n/a | 0.000 | 0.000 | 1.473 | 200.282 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.192 | 0.068 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |

## P3 / grow3 / read (49 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.233 | 0.054 | n/a | 0.000 | 0.000 | 0.934 | 200.103 | 0.009 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.099 | 0.054 | 0.000 | 0.099 |
| p99 | 217.531 | 1.383 | n/a | 0.000 | 0.000 | 5.169 | 203.933 | 76.577 | 28.724 | 0.133 | 0.000 | n/a | n/a | 0.473 | 1.383 | 0.012 | 0.473 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000001524 | 217.531 | 0.043 | n/a | 0.000 | 0.000 | 0.933 | 187.705 | 0.004 | 28.724 | 0.021 | 0.000 | n/a | n/a | 0.100 | 0.043 | 0.000 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001519 | 207.503 | 1.383 | n/a | 0.000 | 0.000 | 1.650 | 203.933 | 0.017 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.473 | 1.383 | 0.007 | 0.473 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001537 | 203.076 | 0.039 | n/a | 0.000 | 0.000 | 2.318 | 200.582 | 0.010 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.077 | 0.039 | 0.000 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000151d | 203.005 | 0.048 | n/a | 0.000 | 0.000 | 1.064 | 201.616 | 0.021 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.123 | 0.048 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001520 | 202.388 | 0.040 | n/a | 0.000 | 0.000 | 1.340 | 200.760 | 0.033 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.128 | 0.040 | 0.000 | 0.128 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001530 | 202.296 | 0.056 | n/a | 0.000 | 0.000 | 1.024 | 186.543 | 0.019 | 14.434 | 0.117 | 0.000 | n/a | n/a | 0.103 | 0.056 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf000000000000154b | 202.089 | 0.062 | n/a | 0.000 | 0.000 | 1.076 | 200.692 | 0.021 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.180 | 0.062 | 0.000 | 0.180 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001522 | 202.070 | 0.048 | n/a | 0.000 | 0.000 | 0.898 | 200.924 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.113 | 0.048 | 0.000 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000151a | 202.038 | 0.050 | n/a | 0.000 | 0.000 | 1.156 | 200.658 | 0.012 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.108 | 0.050 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000152b | 202.022 | 0.051 | n/a | 0.000 | 0.000 | 0.879 | 200.898 | 0.014 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.113 | 0.051 | 0.000 | 0.113 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001513 | 201.864 | 0.047 | n/a | 0.000 | 0.000 | 1.133 | 200.479 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.135 | 0.047 | 0.000 | 0.135 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000151c | 201.737 | 0.035 | n/a | 0.000 | 0.000 | 0.909 | 200.623 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.108 | 0.035 | 0.000 | 0.108 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000152f | 201.670 | 0.032 | n/a | 0.000 | 0.000 | 0.852 | 200.646 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.076 | 0.032 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001531 | 201.613 | 0.056 | n/a | 0.000 | 0.000 | 0.869 | 200.140 | 0.009 | 0.409 | 0.052 | 0.000 | n/a | n/a | 0.078 | 0.056 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000153b | 201.520 | 0.037 | n/a | 0.000 | 0.000 | 0.823 | 200.542 | 0.004 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.062 | 0.037 | 0.000 | 0.062 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000153a | 201.479 | 0.034 | n/a | 0.000 | 0.000 | 0.834 | 200.474 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.079 | 0.034 | 0.000 | 0.079 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000152c | 201.436 | 0.049 | n/a | 0.000 | 0.000 | 0.906 | 200.319 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.109 | 0.049 | 0.000 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001538 | 201.429 | 0.037 | n/a | 0.000 | 0.000 | 0.815 | 200.453 | 0.011 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 0.037 | 0.000 | 0.060 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001535 | 201.415 | 0.049 | n/a | 0.000 | 0.000 | 0.934 | 200.280 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.119 | 0.049 | 0.000 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001518 | 201.400 | 0.044 | n/a | 0.000 | 0.000 | 0.918 | 200.293 | 0.010 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.099 | 0.044 | 0.000 | 0.099 | gw-r/thread-54/journal/page | none observed |

## P3 / p4h3 / read (230 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.274 | 0.042 | n/a | 0.000 | 0.000 | 0.834 | 200.250 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.071 | 0.042 | 0.000 | 0.071 |
| p99 | 202.822 | 0.090 | n/a | 0.000 | 0.000 | 1.664 | 201.213 | 1.862 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.162 | 0.090 | 0.001 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000001628 | 229.728 | 0.037 | n/a | 0.000 | 0.000 | 28.566 | 200.949 | 0.008 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.074 | 0.037 | 0.000 | 0.074 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001613 | 203.110 | 0.147 | n/a | 0.000 | 0.000 | 1.430 | 201.213 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.215 | 0.147 | 0.001 | 0.215 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000155e | 202.822 | 0.032 | n/a | 0.000 | 0.000 | 0.861 | 201.795 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001581 | 202.679 | 0.031 | n/a | 0.000 | 0.000 | 0.852 | 201.585 | 0.038 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.061 | 0.031 | 0.000 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000162c | 202.364 | 0.037 | n/a | 0.000 | 0.000 | 1.879 | 200.337 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000015dd | 202.221 | 0.058 | n/a | 0.000 | 0.000 | 0.823 | 201.146 | 0.015 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.078 | 0.058 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000015ed | 202.204 | 0.043 | n/a | 0.000 | 0.000 | 0.854 | 201.067 | 0.010 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.077 | 0.043 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf000000000000163f | 202.198 | 0.051 | n/a | 0.000 | 0.000 | 0.929 | 201.059 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.070 | 0.051 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001612 | 202.165 | 0.079 | n/a | 0.000 | 0.000 | 1.303 | 200.533 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.150 | 0.079 | 0.000 | 0.150 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001619 | 202.147 | 0.060 | n/a | 0.000 | 0.000 | 1.001 | 200.905 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.112 | 0.060 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001657 | 202.135 | 0.044 | n/a | 0.000 | 0.000 | 1.052 | 200.867 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.083 | 0.044 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000015de | 202.120 | 0.033 | n/a | 0.000 | 0.000 | 0.884 | 201.075 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.055 | 0.033 | 0.000 | 0.055 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000159e | 202.101 | 0.055 | n/a | 0.000 | 0.000 | 1.004 | 200.833 | 0.010 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.118 | 0.055 | 0.000 | 0.118 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001615 | 202.056 | 0.074 | n/a | 0.000 | 0.000 | 0.784 | 200.818 | 0.017 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.304 | 0.074 | 0.000 | 0.304 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000015f2 | 201.950 | 0.069 | n/a | 0.000 | 0.000 | 0.824 | 200.846 | 0.041 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.087 | 0.069 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001587 | 201.939 | 0.034 | n/a | 0.000 | 0.000 | 1.456 | 200.327 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.071 | 0.034 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000015b0 | 201.919 | 0.046 | n/a | 0.000 | 0.000 | 0.812 | 200.920 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.066 | 0.046 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001601 | 201.906 | 0.051 | n/a | 0.000 | 0.000 | 0.883 | 200.781 | 0.007 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.097 | 0.051 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000015cb | 201.889 | 0.053 | n/a | 0.000 | 0.000 | 1.008 | 200.605 | 0.020 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.132 | 0.053 | 0.000 | 0.132 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000015b1 | 201.884 | 0.055 | n/a | 0.000 | 0.000 | 0.900 | 200.759 | 0.018 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.096 | 0.055 | 0.000 | 0.096 | gw-r/thread-54/journal/page | none observed |

## P3 / grow10 / read (83 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 169.151 | 0.434 | n/a | 0.000 | 0.000 | 0.950 | 166.368 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.074 | 0.434 | 0.003 | 0.074 |
| p99 | 205.999 | 0.818 | n/a | 0.000 | 0.000 | 5.284 | 201.475 | 21.934 | 27.192 | 0.100 | 0.000 | n/a | n/a | 0.287 | 0.818 | 0.012 | 0.287 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf00000000000016aa | 205.999 | 0.031 | n/a | 0.000 | 0.000 | 5.284 | 200.517 | 0.017 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.096 | 0.031 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001676 | 202.670 | 0.045 | n/a | 0.000 | 0.000 | 0.951 | 201.475 | 0.008 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.092 | 0.045 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf000000000000167f | 202.312 | 0.051 | n/a | 0.000 | 0.000 | 0.994 | 201.080 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.097 | 0.051 | 0.000 | 0.097 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000001690 | 202.310 | 0.065 | n/a | 0.000 | 0.000 | 1.018 | 201.037 | 0.021 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.111 | 0.065 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf000000000000167d | 202.143 | 0.023 | n/a | 0.000 | 0.000 | 1.776 | 200.246 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.057 | 0.023 | 0.000 | 0.057 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000169f | 201.944 | 0.029 | n/a | 0.000 | 0.000 | 1.490 | 200.316 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001667 | 201.936 | 0.042 | n/a | 0.000 | 0.000 | 1.268 | 200.472 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.100 | 0.042 | 0.000 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf000000000000166a | 201.883 | 0.041 | n/a | 0.000 | 0.000 | 0.917 | 200.774 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.089 | 0.041 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001664 | 201.850 | 0.057 | n/a | 0.000 | 0.000 | 1.224 | 200.421 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.103 | 0.057 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001671 | 201.708 | 0.027 | n/a | 0.000 | 0.000 | 0.812 | 200.725 | 0.010 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.070 | 0.027 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000166c | 201.664 | 0.052 | n/a | 0.000 | 0.000 | 1.148 | 200.329 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.094 | 0.052 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001682 | 201.612 | 0.021 | n/a | 0.000 | 0.000 | 0.950 | 200.522 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.061 | 0.021 | 0.000 | 0.061 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001695 | 201.609 | 0.030 | n/a | 0.000 | 0.000 | 0.846 | 200.606 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.059 | 0.030 | 0.000 | 0.059 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000168a | 201.558 | 0.022 | n/a | 0.000 | 0.000 | 0.802 | 200.612 | 0.009 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 0.022 | 0.000 | 0.060 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001674 | 201.532 | 0.043 | n/a | 0.000 | 0.000 | 0.862 | 200.503 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001662 | 201.488 | 0.045 | n/a | 0.000 | 0.000 | 0.963 | 200.324 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.115 | 0.045 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001686 | 201.486 | 0.455 | n/a | 0.000 | 0.000 | 1.093 | 199.835 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.069 | 0.455 | 0.002 | 0.069 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001692 | 201.442 | 0.035 | n/a | 0.000 | 0.000 | 0.917 | 200.346 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.104 | 0.035 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000016b4 | 201.436 | 0.033 | n/a | 0.000 | 0.000 | 0.822 | 200.471 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.062 | 0.033 | 0.000 | 0.062 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000016a5 | 201.308 | 0.031 | n/a | 0.000 | 0.000 | 0.928 | 200.219 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.090 | 0.031 | 0.000 | 0.090 | gw-r/thread-48/journal/page | none observed |

## P3 / p4h10 / read (230 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.298 | 0.040 | n/a | 0.000 | 0.000 | 0.846 | 200.229 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.072 | 0.040 | 0.000 | 0.072 |
| p99 | 202.560 | 0.123 | n/a | 0.000 | 0.000 | 1.863 | 201.043 | 3.237 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.333 | 0.123 | 0.001 | 0.333 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf000000000000177c | 204.208 | 0.123 | n/a | 0.000 | 0.000 | 1.927 | 201.459 | 0.020 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.524 | 0.123 | 0.001 | 0.524 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000177d | 203.571 | 0.068 | n/a | 0.000 | 0.000 | 1.286 | 202.035 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.107 | 0.068 | 0.000 | 0.107 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf00000000000016f0 | 202.560 | 0.041 | n/a | 0.000 | 0.000 | 1.838 | 200.521 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.062 | 0.041 | 0.000 | 0.062 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000001713 | 202.271 | 0.078 | n/a | 0.000 | 0.000 | 1.116 | 200.524 | 0.026 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.463 | 0.078 | 0.000 | 0.463 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001763 | 202.209 | 0.047 | n/a | 0.000 | 0.000 | 0.951 | 201.043 | 0.007 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.091 | 0.047 | 0.000 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001762 | 202.190 | 0.054 | n/a | 0.000 | 0.000 | 1.685 | 200.228 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.173 | 0.054 | 0.000 | 0.173 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000175e | 202.172 | 0.076 | n/a | 0.000 | 0.000 | 1.128 | 200.708 | 0.006 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.174 | 0.076 | 0.000 | 0.174 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001730 | 202.133 | 0.044 | n/a | 0.000 | 0.000 | 1.863 | 200.077 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.112 | 0.044 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000016fe | 202.115 | 0.050 | n/a | 0.000 | 0.000 | 1.188 | 200.719 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.098 | 0.050 | 0.000 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000178b | 202.055 | 0.038 | n/a | 0.000 | 0.000 | 0.835 | 201.040 | 0.004 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.066 | 0.038 | 0.000 | 0.066 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001798 | 202.044 | 0.053 | n/a | 0.000 | 0.000 | 1.222 | 200.382 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.333 | 0.053 | 0.000 | 0.333 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000016f9 | 201.982 | 0.037 | n/a | 0.000 | 0.000 | 0.900 | 200.878 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.100 | 0.037 | 0.000 | 0.100 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000177e | 201.928 | 0.058 | n/a | 0.000 | 0.000 | 1.028 | 200.653 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.121 | 0.058 | 0.000 | 0.121 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001751 | 201.907 | 0.040 | n/a | 0.000 | 0.000 | 0.862 | 200.819 | 0.016 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.086 | 0.040 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000175c | 201.876 | 0.041 | n/a | 0.000 | 0.000 | 0.995 | 200.659 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.112 | 0.041 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000176b | 201.864 | 0.059 | n/a | 0.000 | 0.000 | 0.945 | 200.631 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.131 | 0.059 | 0.000 | 0.131 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000017e0 | 201.833 | 0.036 | n/a | 0.000 | 0.000 | 1.425 | 200.206 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.084 | 0.036 | 0.000 | 0.084 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000174f | 201.813 | 0.029 | n/a | 0.000 | 0.000 | 1.115 | 200.527 | 0.017 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.066 | 0.029 | 0.000 | 0.066 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000017ce | 201.811 | 0.043 | n/a | 0.000 | 0.000 | 0.994 | 200.609 | 0.005 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.095 | 0.043 | 0.000 | 0.095 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000175a | 201.811 | 0.135 | n/a | 0.000 | 0.000 | 0.989 | 200.525 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.114 | 0.135 | 0.001 | 0.114 | gw-r/thread-48/journal/page | none observed |

## P3 / presweep / read (229 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.245 | 0.040 | n/a | 0.000 | 0.000 | 0.831 | 200.218 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.066 | 0.040 | 0.000 | 0.066 |
| p99 | 202.386 | 0.086 | n/a | 0.000 | 0.000 | 1.554 | 201.099 | 3.076 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.176 | 0.086 | 0.001 | 0.176 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf00000000000017f0 | 204.692 | 0.044 | n/a | 0.000 | 0.000 | 0.984 | 202.844 | 0.019 | 0.000 | 0.595 | 0.000 | n/a | n/a | 0.206 | 0.044 | 0.000 | 0.206 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000018e2 | 203.035 | 0.030 | n/a | 0.000 | 0.000 | 1.773 | 201.070 | 0.008 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.068 | 0.030 | 0.000 | 0.068 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000187f | 202.386 | 0.048 | n/a | 0.000 | 0.000 | 1.554 | 200.611 | 0.004 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.105 | 0.048 | 0.000 | 0.105 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000189c | 202.333 | 0.053 | n/a | 0.000 | 0.000 | 0.967 | 201.099 | 0.020 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.096 | 0.053 | 0.000 | 0.096 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001833 | 202.212 | 0.032 | n/a | 0.000 | 0.000 | 0.787 | 201.258 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.059 | 0.032 | 0.000 | 0.059 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000183a | 202.107 | 0.047 | n/a | 0.000 | 0.000 | 1.034 | 200.895 | 0.010 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.060 | 0.047 | 0.000 | 0.060 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001879 | 202.096 | 0.032 | n/a | 0.000 | 0.000 | 0.795 | 201.057 | 0.040 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000186d | 202.058 | 0.052 | n/a | 0.000 | 0.000 | 0.928 | 200.902 | 0.013 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.098 | 0.052 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000001891 | 202.021 | 0.037 | n/a | 0.000 | 0.000 | 1.073 | 200.785 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.063 | 0.037 | 0.000 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001886 | 201.948 | 0.046 | n/a | 0.000 | 0.000 | 0.882 | 200.820 | 0.024 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.105 | 0.046 | 0.000 | 0.105 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000017f6 | 201.924 | 0.051 | n/a | 0.000 | 0.000 | 1.115 | 200.590 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.116 | 0.051 | 0.000 | 0.116 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000189d | 201.924 | 0.036 | n/a | 0.000 | 0.000 | 0.829 | 200.856 | 0.025 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.079 | 0.036 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000018bc | 201.917 | 0.045 | n/a | 0.000 | 0.000 | 1.490 | 200.226 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.123 | 0.045 | 0.000 | 0.123 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000017e7 | 201.911 | 0.050 | n/a | 0.000 | 0.000 | 0.841 | 200.729 | 0.078 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.107 | 0.050 | 0.000 | 0.107 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000017e8 | 201.905 | 0.035 | n/a | 0.000 | 0.000 | 0.919 | 200.820 | 0.004 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.064 | 0.035 | 0.000 | 0.064 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001801 | 201.892 | 0.041 | n/a | 0.000 | 0.000 | 0.819 | 200.887 | 0.007 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.066 | 0.041 | 0.000 | 0.066 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000187d | 201.881 | 0.070 | n/a | 0.000 | 0.000 | 1.062 | 200.551 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.143 | 0.070 | 0.000 | 0.143 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf000000000000182a | 201.878 | 0.035 | n/a | 0.000 | 0.000 | 0.865 | 200.828 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.071 | 0.035 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001862 | 201.875 | 0.068 | n/a | 0.000 | 0.000 | 0.906 | 200.711 | 0.004 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.102 | 0.068 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000186c | 201.799 | 0.035 | n/a | 0.000 | 0.000 | 0.804 | 200.767 | 0.059 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |

## P3 / sweep / read (229 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.237 | 0.039 | n/a | 0.000 | 0.000 | 0.820 | 200.198 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.070 | 0.039 | 0.000 | 0.070 |
| p99 | 202.772 | 0.097 | n/a | 0.000 | 0.000 | 1.710 | 201.361 | 0.885 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.177 | 0.097 | 0.001 | 0.177 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf0000000000001901 | 204.643 | 0.052 | n/a | 0.000 | 0.000 | 1.589 | 202.856 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.104 | 0.052 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001990 | 202.874 | 0.070 | n/a | 0.000 | 0.000 | 1.419 | 201.012 | 0.022 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.183 | 0.070 | 0.000 | 0.183 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000018f7 | 202.772 | 0.036 | n/a | 0.000 | 0.000 | 1.230 | 201.361 | 0.009 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.061 | 0.036 | 0.000 | 0.061 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001959 | 202.688 | 0.046 | n/a | 0.000 | 0.000 | 0.856 | 201.601 | 0.010 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.073 | 0.046 | 0.000 | 0.073 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001909 | 202.307 | 0.065 | n/a | 0.000 | 0.000 | 1.010 | 201.008 | 0.014 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.134 | 0.065 | 0.000 | 0.134 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001992 | 202.292 | 0.051 | n/a | 0.000 | 0.000 | 0.785 | 201.053 | 0.032 | 0.228 | 0.040 | 0.000 | n/a | n/a | 0.103 | 0.051 | 0.000 | 0.103 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf0000000000001967 | 202.087 | 0.032 | n/a | 0.000 | 0.000 | 1.779 | 200.160 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.088 | 0.032 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001938 | 202.068 | 0.033 | n/a | 0.000 | 0.000 | 0.810 | 201.105 | 0.004 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.061 | 0.033 | 0.000 | 0.061 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000019a7 | 202.056 | 0.040 | n/a | 0.000 | 0.000 | 0.821 | 201.004 | 0.010 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.079 | 0.040 | 0.000 | 0.079 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf00000000000018f4 | 202.015 | 0.058 | n/a | 0.000 | 0.000 | 0.875 | 200.875 | 0.011 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.094 | 0.058 | 0.000 | 0.094 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000001991 | 201.968 | 0.061 | n/a | 0.000 | 0.000 | 0.825 | 189.896 | 0.015 | 10.993 | 0.086 | 0.000 | n/a | n/a | 0.092 | 0.061 | 0.000 | 0.092 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000190a | 201.960 | 0.051 | n/a | 0.000 | 0.000 | 0.929 | 200.826 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.100 | 0.051 | 0.000 | 0.100 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001978 | 201.921 | 0.052 | n/a | 0.000 | 0.000 | 0.897 | 200.686 | 0.014 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.105 | 0.052 | 0.000 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf000000000000191e | 201.909 | 0.051 | n/a | 0.000 | 0.000 | 1.174 | 200.521 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.107 | 0.051 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| 32c6614cee436acf000000000000196c | 201.896 | 0.058 | n/a | 0.000 | 0.000 | 0.956 | 200.670 | 0.009 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.126 | 0.058 | 0.000 | 0.126 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000019bc | 201.844 | 0.051 | n/a | 0.000 | 0.000 | 0.961 | 200.594 | 0.004 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.159 | 0.051 | 0.000 | 0.159 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf0000000000001995 | 201.821 | 0.044 | n/a | 0.000 | 0.000 | 0.810 | 200.806 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.075 | 0.044 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000019b6 | 201.808 | 0.038 | n/a | 0.000 | 0.000 | 0.884 | 200.724 | 0.007 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.093 | 0.038 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf000000000000194c | 201.803 | 0.042 | n/a | 0.000 | 0.000 | 0.774 | 200.831 | 0.007 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.074 | 0.042 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001936 | 201.781 | 0.036 | n/a | 0.000 | 0.000 | 0.877 | 200.708 | 0.015 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.088 | 0.036 | 0.000 | 0.088 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / read (900 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.161 | 0.039 | n/a | 0.000 | 0.000 | 0.820 | 200.179 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.070 | 0.039 | 0.000 | 0.070 |
| p99 | 203.086 | 0.106 | n/a | 0.000 | 0.000 | 2.279 | 201.468 | 3.402 | 0.535 | 0.128 | 0.000 | n/a | n/a | 0.187 | 0.106 | 0.002 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 32c6614cee436acf00000000000028ef | 222.162 | 0.071 | n/a | 0.000 | 0.000 | 1.049 | 200.864 | 4.273 | 15.780 | 0.015 | 0.000 | n/a | n/a | 0.110 | 0.071 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000026ee | 219.368 | 0.032 | n/a | 0.000 | 0.000 | 17.884 | 201.032 | 0.011 | 0.250 | 0.064 | 0.000 | n/a | n/a | 0.095 | 0.032 | 0.000 | 0.095 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000027b7 | 213.156 | 0.067 | n/a | 0.000 | 0.000 | 11.305 | 201.473 | 0.005 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.115 | 0.067 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000026b5 | 207.277 | 0.035 | n/a | 0.000 | 0.000 | 0.818 | 206.249 | 0.044 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.064 | 0.035 | 0.000 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf00000000000027c2 | 206.087 | 0.048 | n/a | 0.000 | 0.000 | 0.880 | 204.936 | 0.033 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.107 | 0.048 | 0.000 | 0.107 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf000000000000267d | 205.351 | 0.046 | n/a | 0.000 | 0.000 | 0.917 | 204.221 | 0.005 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.097 | 0.046 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf0000000000002870 | 205.094 | 0.039 | n/a | 0.000 | 0.000 | 0.825 | 204.071 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.095 | 0.039 | 0.000 | 0.095 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf0000000000001a2b | 204.233 | 0.591 | n/a | 0.000 | 0.000 | 1.166 | 200.692 | 0.010 | 0.000 | 0.156 | 0.000 | n/a | n/a | 1.618 | 0.591 | 0.003 | 1.618 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf0000000000002731 | 203.566 | 0.045 | n/a | 0.000 | 0.000 | 0.800 | 202.521 | 0.034 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.093 | 0.045 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 32c6614cee436acf00000000000027eb | 203.086 | 0.038 | n/a | 0.000 | 0.000 | 1.974 | 200.906 | 0.005 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.077 | 0.038 | 0.000 | 0.077 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf00000000000028b1 | 203.032 | 0.052 | n/a | 0.000 | 0.000 | 1.106 | 201.700 | 0.016 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.097 | 0.052 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 32c6614cee436acf000000000000285a | 202.960 | 0.039 | n/a | 0.000 | 0.000 | 1.036 | 201.700 | 0.007 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf00000000000027af | 202.936 | 0.123 | n/a | 0.000 | 0.000 | 1.454 | 200.945 | 0.009 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.249 | 0.123 | 0.001 | 0.249 | gw-r/thread-54/journal/page | none observed |
| 32c6614cee436acf000000000000286d | 202.888 | 0.053 | n/a | 0.000 | 0.000 | 0.931 | 201.613 | 0.020 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.111 | 0.053 | 0.000 | 0.111 | gw-r/thread-55/journal/page | none observed |
| 32c6614cee436acf000000000000288e | 202.831 | 0.042 | n/a | 0.000 | 0.000 | 1.128 | 201.468 | 0.015 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.097 | 0.042 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001a62 | 202.677 | 0.025 | n/a | 0.000 | 0.000 | 2.182 | 200.353 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.072 | 0.025 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf00000000000028b0 | 202.589 | 0.299 | n/a | 0.000 | 0.000 | 1.069 | 200.976 | 0.013 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.146 | 0.299 | 0.001 | 0.146 | gw-r/thread-52/journal/page | none observed |
| 32c6614cee436acf0000000000001a43 | 202.579 | 0.057 | n/a | 0.000 | 0.000 | 1.100 | 201.094 | 0.012 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.204 | 0.057 | 0.000 | 0.204 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000001a54 | 202.547 | 0.034 | n/a | 0.000 | 0.000 | 1.829 | 200.534 | 0.008 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.089 | 0.034 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 32c6614cee436acf0000000000002364 | 202.493 | 0.050 | n/a | 0.000 | 0.000 | 0.981 | 201.011 | 0.120 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.272 | 0.050 | 0.000 | 0.272 | gw-r/thread-50/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

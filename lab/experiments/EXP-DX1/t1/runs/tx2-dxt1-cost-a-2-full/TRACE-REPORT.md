# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (106.221 ms, trace `d4cfd43196e472b800000000000018ab`); `node-14/thread-0/socket.wait-first-byte` (128.868 ms, trace `d4cfd43196e472b800000000000018a5`); `node-14/thread-0/socket.wait-first-byte` (137.952 ms, trace `d4cfd43196e472b800000000000018a4`); `node-14/thread-0/socket.wait-first-byte` (123.703 ms, trace `d4cfd43196e472b800000000000018a3`); `node-14/thread-0/socket.wait-first-byte` (118.514 ms, trace `d4cfd43196e472b800000000000018a6`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-cost-a-2-full`; source `0c1fa43b93562e3774b09e18c9e351decc0741da`; subjects 10000; tracing full.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 19795350.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.820 | 5.490 | 2.496 | 0.000 | 0.116 | 1.532 | 5.082 | 0.041 | 0.000 | 0.849 | 15.940 | n/a | n/a | 0.027 | 6.489 | 0.217 | 0.027 |
| p99 | 71.794 | 13.645 | n/a | 5.674 | 1.128 | 5.577 | 24.821 | 0.355 | 0.000 | 3.895 | 48.789 | n/a | n/a | 0.293 | 20.271 | 0.448 | 0.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000434 | 71.794 | 6.759 | 0.424 | 0.000 | 0.068 | 2.162 | 13.079 | 0.059 | 0.000 | 0.404 | 48.789 | n/a | n/a | 0.052 | 7.250 | 0.101 | 0.052 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000424 | 61.244 | 13.391 | 0.526 | 0.000 | 0.121 | 2.537 | 22.829 | 0.355 | 0.000 | 0.630 | 20.823 | n/a | n/a | 0.033 | 14.038 | 0.229 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000044b | 56.840 | 3.769 | 0.325 | 0.281 | 0.044 | 1.978 | 24.821 | 0.078 | 0.000 | 0.763 | 24.756 | n/a | n/a | 0.025 | 4.420 | 0.078 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000441 | 56.121 | 7.771 | 0.468 | 0.763 | 0.048 | 3.105 | 19.692 | 0.150 | 0.000 | 3.800 | 20.284 | n/a | n/a | 0.039 | 9.051 | 0.161 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000422 | 53.124 | 13.645 | n/a | 5.674 | 0.953 | 1.122 | 15.109 | 0.082 | 0.000 | 0.895 | 15.353 | n/a | n/a | 0.293 | 20.271 | 0.382 | 0.293 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000436 | 48.587 | 6.672 | 0.304 | 0.000 | 0.046 | 1.913 | 16.662 | 0.037 | 0.000 | 0.563 | 22.360 | n/a | n/a | 0.030 | 7.022 | 0.145 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000449 | 44.805 | 7.495 | n/a | 2.905 | 0.116 | 0.942 | 5.082 | 0.036 | 0.000 | 1.034 | 27.161 | n/a | n/a | 0.033 | 10.517 | 0.235 | 0.033 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000430 | 41.562 | 6.654 | 0.306 | 0.000 | 0.010 | 2.698 | 13.796 | 0.072 | 0.000 | 2.060 | 15.940 | n/a | n/a | 0.025 | 6.970 | 0.168 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000043d | 39.546 | 5.747 | 0.219 | 0.000 | 0.040 | 1.799 | 8.400 | 0.069 | 0.000 | 0.437 | 22.809 | n/a | n/a | 0.025 | 6.007 | 0.152 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000447 | 39.212 | 5.678 | 0.244 | 0.524 | 0.042 | 2.015 | 13.640 | 0.061 | 0.000 | 0.878 | 16.105 | n/a | n/a | 0.023 | 6.489 | 0.165 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000042c | 39.105 | 6.107 | 0.313 | 0.000 | 0.486 | 2.361 | 10.853 | 0.042 | 0.000 | 0.375 | 18.540 | n/a | n/a | 0.026 | 6.907 | 0.177 | 0.026 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000043f | 38.043 | 5.917 | 0.206 | 1.244 | 0.030 | 3.683 | 3.571 | 0.044 | 0.000 | 3.895 | 19.438 | n/a | n/a | 0.016 | 7.397 | 0.194 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000426 | 32.629 | 4.227 | n/a | 2.186 | 0.675 | 1.042 | 2.190 | 0.047 | 0.000 | 0.941 | 21.293 | n/a | n/a | 0.028 | 7.087 | 0.217 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000432 | 32.583 | 6.736 | n/a | 0.000 | 0.524 | 1.164 | 1.629 | 0.069 | 0.000 | 1.021 | 21.420 | n/a | n/a | 0.020 | 7.260 | 0.223 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000453 | 31.820 | 3.688 | 0.244 | 0.322 | 0.072 | 1.492 | 11.143 | 0.041 | 0.000 | 1.003 | 13.787 | n/a | n/a | 0.028 | 4.326 | 0.136 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000044f | 30.733 | 3.523 | 0.219 | 0.262 | 0.045 | 2.446 | 12.093 | 0.038 | 0.000 | 0.698 | 11.384 | n/a | n/a | 0.026 | 4.048 | 0.132 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000428 | 30.277 | 7.981 | 0.435 | 0.000 | 0.086 | 5.577 | 7.510 | 0.036 | 0.000 | 1.669 | 6.946 | n/a | n/a | 0.035 | 8.502 | 0.281 | 0.035 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000042a | 29.256 | 5.490 | n/a | 3.193 | 0.524 | 3.167 | 1.252 | 0.027 | 0.000 | 0.392 | 15.167 | n/a | n/a | 0.042 | 9.208 | 0.315 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000438 | 28.428 | 10.100 | n/a | 2.522 | 0.114 | 0.902 | 1.792 | 0.033 | 0.000 | 0.849 | 12.082 | n/a | n/a | 0.034 | 12.736 | 0.448 | 0.034 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000451 | 25.725 | 4.909 | n/a | 0.000 | 0.686 | 0.000 | 2.705 | 0.048 | 0.000 | 1.109 | 16.242 | n/a | n/a | 0.027 | 5.595 | 0.217 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.555 | 3.879 | n/a | 0.000 | 0.718 | 0.892 | 1.252 | 0.030 | 0.000 | 0.710 | 10.194 | n/a | n/a | 0.027 | 4.766 | 0.264 | 0.027 |
| p99 | 32.629 | 5.490 | n/a | 3.193 | 1.128 | 3.167 | 4.204 | 0.048 | 0.000 | 3.737 | 21.293 | n/a | n/a | 0.042 | 9.208 | 0.398 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000426 | 32.629 | 4.227 | n/a | 2.186 | 0.675 | 1.042 | 2.190 | 0.047 | 0.000 | 0.941 | 21.293 | n/a | n/a | 0.028 | 7.087 | 0.217 | 0.028 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000042a | 29.256 | 5.490 | n/a | 3.193 | 0.524 | 3.167 | 1.252 | 0.027 | 0.000 | 0.392 | 15.167 | n/a | n/a | 0.042 | 9.208 | 0.315 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000451 | 25.725 | 4.909 | n/a | 0.000 | 0.686 | 0.000 | 2.705 | 0.048 | 0.000 | 1.109 | 16.242 | n/a | n/a | 0.027 | 5.595 | 0.217 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000445 | 24.614 | 3.732 | n/a | 0.000 | 0.718 | 0.769 | 1.234 | 0.029 | 0.000 | 0.700 | 17.406 | n/a | n/a | 0.026 | 4.450 | 0.181 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000443 | 23.555 | 3.721 | n/a | 0.000 | 1.004 | 0.797 | 4.057 | 0.032 | 0.000 | 3.737 | 10.194 | n/a | n/a | 0.013 | 4.725 | 0.201 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000042e | 18.053 | 3.912 | n/a | 0.000 | 0.854 | 0.970 | 4.204 | 0.032 | 0.000 | 0.737 | 7.317 | n/a | n/a | 0.027 | 4.766 | 0.264 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000044d | 13.204 | 3.417 | n/a | 0.000 | 0.701 | 1.014 | 1.247 | 0.030 | 0.000 | 0.710 | 6.057 | n/a | n/a | 0.028 | 4.118 | 0.312 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000455 | 12.592 | 3.879 | n/a | 0.000 | 1.128 | 0.892 | 1.079 | 0.029 | 0.000 | 0.691 | 4.870 | n/a | n/a | 0.025 | 5.008 | 0.398 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000457 | 11.164 | 2.555 | n/a | 0.000 | 1.076 | 0.755 | 0.942 | 0.027 | 0.000 | 0.680 | 5.101 | n/a | n/a | 0.027 | 3.631 | 0.325 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (36 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 75.398 | 25.549 | 16.596 | 0.000 | 0.000 | 1.034 | 8.439 | 0.005 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 48.096 | 0.716 | 0.011 |
| p99 | 201.686 | 65.658 | 119.708 | 8.549 | 0.000 | 52.176 | 129.044 | 114.951 | 22.243 | 0.221 | 0.000 | n/a | n/a | 0.044 | 120.060 | 1.000 | 0.044 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b8000000000000189c | 201.686 | 65.658 | 45.519 | 5.811 | 0.000 | 8.432 | 54.008 | 0.000 | 22.243 | 0.000 | 0.000 | n/a | n/a | 0.016 | 116.987 | 0.580 | 0.016 | gw-w/thread-45/gateway.admitted-work | driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.745ms; driver.publication 1.445ms; driver.publication 1.218ms |
| d4cfd43196e472b80000000000000648 | 194.155 | 15.971 | 7.365 | 0.000 | 0.000 | 37.344 | 18.459 | 114.951 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.032 | 23.336 | 0.120 | 0.032 | gw-w/thread-66/gateway.admission-wait | driver.publication 3.555ms; driver.expected-state.bind-receipt 1.664ms; driver.publication 1.612ms; driver.publication 1.548ms; driver.publication 1.494ms |
| d4cfd43196e472b80000000000000646 | 179.968 | 28.247 | 18.819 | 2.161 | 0.000 | 1.626 | 129.044 | 0.008 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.040 | 49.227 | 0.274 | 0.040 | gw-w/thread-49/gateway.admitted-work | driver.publication 3.555ms; driver.publication 2.121ms; driver.expected-state.bind-receipt 1.664ms; driver.publication 1.612ms; driver.publication 1.548ms |
| d4cfd43196e472b8000000000000043b | 157.785 | 39.234 | 21.408 | 8.549 | 0.000 | 0.877 | 87.472 | 0.010 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.014 | 69.191 | 0.439 | 0.014 | gw-w/thread-47/gateway.admitted-work | none observed |
| d4cfd43196e472b800000000000018a8 | 120.085 | 0.353 | 119.708 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 120.060 | 1.000 | 0.024 | node-14/thread-0/rpc.replica.observe | client.parse 5.132ms; driver.publication 3.063ms; driver.publication 1.745ms; driver.publication 1.218ms; driver.expected-state.bind-receipt 1.067ms |
| d4cfd43196e472b800000000000018a9 | 116.326 | 0.092 | 116.226 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 116.318 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | client.parse 5.132ms; driver.publication 3.063ms; driver.publication 1.218ms |
| d4cfd43196e472b80000000000001bce | 116.102 | 26.467 | 15.126 | 0.000 | 0.000 | 50.584 | 9.885 | 14.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.011 | 41.594 | 0.358 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.encode 3.610ms; driver.publication 1.103ms |
| d4cfd43196e472b8000000000000149f | 114.613 | 23.303 | 11.406 | 3.840 | 0.000 | 12.436 | 54.232 | 9.368 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.021 | 38.549 | 0.336 | 0.021 | gw-w/thread-50/gateway.response-write | driver.publication 1.467ms; driver.publication 1.397ms; client.parse 1.267ms; driver.publication 1.147ms |
| d4cfd43196e472b800000000000018aa | 111.314 | 25.560 | 85.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 111.307 | 1.000 | 0.008 | node-14/thread-0/rpc.replica.observe | client.parse 5.132ms; driver.publication 1.218ms |
| d4cfd43196e472b8000000000000109b | 106.301 | 36.709 | 11.970 | 0.000 | 0.000 | 31.540 | 10.613 | 15.414 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.044 | 48.680 | 0.458 | 0.044 | node-14/thread-0/socket.wait-first-byte | client.parse 1.204ms; driver.publication 1.063ms |
| d4cfd43196e472b800000000000018ac | 105.775 | 25.549 | 80.216 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 105.766 | 1.000 | 0.009 | node-14/thread-0/rpc.replica.observe | client.parse 5.132ms |
| d4cfd43196e472b80000000000001e88 | 97.220 | 45.990 | 21.203 | 2.464 | 0.000 | 1.460 | 13.604 | 4.442 | 8.049 | 0.000 | 0.000 | n/a | n/a | 0.008 | 69.657 | 0.716 | 0.008 | node-14/thread-0/client.reach | driver.publication 1.082ms |
| d4cfd43196e472b80000000000000958 | 90.841 | 26.546 | 10.558 | 0.000 | 0.000 | 10.592 | 36.553 | 6.556 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.022 | 37.104 | 0.408 | 0.022 | gw-w/thread-49/gateway.admitted-work | driver.publication 1.407ms |
| d4cfd43196e472b8000000000000109a | 86.132 | 27.828 | 16.596 | 3.569 | 0.000 | 0.912 | 37.208 | 0.009 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 47.993 | 0.557 | 0.010 | gw-w/thread-51/gateway.admitted-work | driver.publication 1.060ms |
| d4cfd43196e472b800000000000013e0 | 84.355 | 28.717 | 20.166 | 2.596 | 0.000 | 0.674 | 19.813 | 0.012 | 12.368 | 0.000 | 0.000 | n/a | n/a | 0.009 | 51.479 | 0.610 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.publication 1.461ms |
| d4cfd43196e472b80000000000001bcd | 81.663 | 23.997 | 21.368 | 0.000 | 0.000 | 7.573 | 13.088 | 15.615 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.008 | 45.365 | 0.556 | 0.008 | node-14/thread-0/rpc.replica.observe | client.encode 3.610ms |
| d4cfd43196e472b8000000000000149e | 77.380 | 12.470 | 2.296 | 0.000 | 0.000 | 52.176 | 4.999 | 5.407 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.017 | 14.766 | 0.191 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.544ms; driver.publication 1.467ms; driver.publication 1.397ms; client.parse 1.267ms |
| d4cfd43196e472b80000000000000aaf | 76.746 | 33.722 | 21.580 | 3.648 | 0.000 | 5.982 | 11.798 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 58.951 | 0.768 | 0.015 | node-14/thread-0/client.reach | none observed |
| d4cfd43196e472b80000000000001b9b | 75.398 | 11.705 | 7.066 | 0.000 | 0.000 | 44.479 | 1.910 | 10.206 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.007 | 18.771 | 0.249 | 0.007 | node-14/thread-0/socket.wait-first-byte | client.parse 1.105ms |
| d4cfd43196e472b80000000000001b9a | 74.642 | 17.102 | 10.302 | 0.000 | 0.000 | 34.600 | 4.068 | 8.563 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 27.404 | 0.367 | 0.008 | node-14/thread-0/socket.wait-first-byte | client.parse 1.105ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 54.424 | 9.304 | 0.257 | 0.561 | 0.034 | 2.663 | 19.175 | 0.078 | 0.000 | 2.933 | 19.398 | n/a | n/a | 0.021 | 10.156 | 0.187 | 0.021 |
| p99 | 54.424 | 9.304 | 0.257 | 0.561 | 0.034 | 2.663 | 19.175 | 0.078 | 0.000 | 2.933 | 19.398 | n/a | n/a | 0.021 | 10.156 | 0.187 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b8000000000000045b | 54.424 | 9.304 | 0.257 | 0.561 | 0.034 | 2.663 | 19.175 | 0.078 | 0.000 | 2.933 | 19.398 | n/a | n/a | 0.021 | 10.156 | 0.187 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.086 | 4.326 | n/a | 0.000 | 0.079 | 1.643 | 2.785 | 0.041 | 0.000 | 0.624 | 14.552 | n/a | n/a | 0.025 | 4.808 | 0.194 | 0.025 |
| p99 | 72.675 | 13.418 | n/a | 3.139 | 1.672 | 8.718 | 19.942 | 0.111 | 0.000 | 4.918 | 50.697 | n/a | n/a | 0.056 | 14.550 | 0.428 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000471 | 72.675 | 3.825 | 0.218 | 0.000 | 0.040 | 1.970 | 15.431 | 0.070 | 0.000 | 0.386 | 50.697 | n/a | n/a | 0.037 | 4.083 | 0.056 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000045f | 48.837 | 4.183 | 0.285 | 0.000 | 0.084 | 2.250 | 8.676 | 0.042 | 0.000 | 0.474 | 32.788 | n/a | n/a | 0.056 | 4.551 | 0.093 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004a1 | 45.215 | 4.269 | 0.271 | 0.000 | 0.040 | 1.643 | 11.565 | 0.105 | 0.000 | 0.989 | 26.307 | n/a | n/a | 0.027 | 4.579 | 0.101 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000045d | 43.191 | 6.778 | 0.265 | 0.792 | 0.070 | 2.617 | 10.676 | 0.093 | 0.000 | 1.710 | 20.149 | n/a | n/a | 0.041 | 7.905 | 0.183 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000475 | 40.993 | 13.418 | n/a | 0.000 | 1.131 | 2.025 | 2.361 | 0.035 | 0.000 | 2.288 | 19.681 | n/a | n/a | 0.054 | 14.550 | 0.355 | 0.054 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000469 | 40.361 | 3.762 | 0.243 | 0.000 | 0.067 | 1.724 | 13.872 | 0.033 | 0.000 | 4.918 | 15.703 | n/a | n/a | 0.039 | 4.072 | 0.101 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000049d | 40.071 | 4.088 | 0.464 | 0.000 | 0.053 | 2.225 | 19.942 | 0.083 | 0.000 | 0.425 | 12.760 | n/a | n/a | 0.031 | 4.605 | 0.115 | 0.031 | gw-w/thread-45/gateway.admitted-work | none observed |
| d4cfd43196e472b80000000000000473 | 39.612 | 3.620 | 0.304 | 0.000 | 0.043 | 1.901 | 13.425 | 0.085 | 0.000 | 0.482 | 19.727 | n/a | n/a | 0.025 | 3.967 | 0.100 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004a3 | 39.389 | 7.844 | 1.477 | 0.000 | 0.032 | 1.793 | 7.061 | 0.035 | 0.000 | 0.394 | 20.731 | n/a | n/a | 0.021 | 9.354 | 0.237 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000466 | 38.033 | 3.529 | 0.213 | 0.000 | 0.039 | 1.627 | 14.325 | 0.040 | 0.000 | 0.808 | 17.434 | n/a | n/a | 0.018 | 3.781 | 0.099 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000049b | 36.170 | 4.339 | 0.257 | 0.000 | 0.040 | 2.001 | 9.807 | 0.041 | 0.000 | 0.390 | 19.276 | n/a | n/a | 0.020 | 4.636 | 0.128 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000046f | 36.112 | 4.234 | 0.242 | 0.000 | 0.077 | 1.958 | 11.308 | 0.111 | 0.000 | 0.957 | 17.199 | n/a | n/a | 0.025 | 4.553 | 0.126 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000487 | 35.155 | 3.699 | 0.873 | 0.000 | 0.079 | 1.790 | 8.339 | 0.043 | 0.000 | 0.673 | 19.627 | n/a | n/a | 0.031 | 4.651 | 0.132 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004ad | 34.824 | 6.428 | 0.284 | 0.000 | 0.045 | 1.792 | 10.370 | 0.058 | 0.000 | 1.270 | 14.552 | n/a | n/a | 0.025 | 6.758 | 0.194 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000477 | 32.658 | 3.877 | 0.289 | 0.000 | 0.047 | 1.989 | 10.061 | 0.085 | 0.000 | 0.651 | 15.633 | n/a | n/a | 0.027 | 4.213 | 0.129 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000046d | 31.547 | 6.287 | n/a | 0.000 | 0.819 | 0.771 | 1.289 | 0.027 | 0.000 | 3.128 | 19.209 | n/a | n/a | 0.018 | 7.106 | 0.225 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000047b | 31.545 | 3.718 | 0.263 | 0.000 | 0.048 | 1.820 | 12.369 | 0.065 | 0.000 | 1.058 | 12.177 | n/a | n/a | 0.027 | 4.028 | 0.128 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004a5 | 31.108 | 7.488 | n/a | 0.000 | 0.342 | 0.810 | 4.719 | 0.038 | 0.000 | 0.426 | 17.261 | n/a | n/a | 0.025 | 7.830 | 0.252 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000497 | 30.126 | 5.113 | 0.210 | 0.000 | 0.037 | 2.557 | 11.393 | 0.046 | 0.000 | 0.412 | 10.336 | n/a | n/a | 0.023 | 5.360 | 0.178 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004ab | 29.452 | 6.898 | 0.354 | 0.000 | 0.065 | 1.852 | 9.227 | 0.036 | 0.000 | 0.586 | 10.406 | n/a | n/a | 0.027 | 7.318 | 0.248 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.320 | 3.879 | n/a | 0.000 | 0.892 | 0.934 | 1.248 | 0.037 | 0.000 | 0.449 | 6.415 | n/a | n/a | 0.024 | 4.869 | 0.273 | 0.024 |
| p99 | 27.377 | 8.523 | n/a | 0.000 | 1.672 | 5.525 | 2.755 | 0.055 | 0.000 | 1.277 | 18.702 | n/a | n/a | 0.050 | 9.414 | 0.407 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b8000000000000048d | 27.377 | 3.471 | n/a | 0.000 | 0.929 | 5.525 | 0.952 | 0.031 | 0.000 | 0.608 | 15.829 | n/a | n/a | 0.032 | 4.400 | 0.161 | 0.032 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000464 | 27.132 | 4.894 | n/a | 0.000 | 0.409 | 0.934 | 1.736 | 0.037 | 0.000 | 0.377 | 18.702 | n/a | n/a | 0.043 | 5.303 | 0.195 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000468 | 25.889 | 8.523 | n/a | 0.000 | 0.892 | 3.545 | 2.755 | 0.055 | 0.000 | 0.449 | 9.621 | n/a | n/a | 0.050 | 9.414 | 0.364 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000479 | 25.647 | 4.326 | n/a | 0.000 | 0.542 | 0.854 | 1.203 | 0.027 | 0.000 | 0.455 | 18.217 | n/a | n/a | 0.024 | 4.869 | 0.190 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000049f | 15.320 | 5.087 | n/a | 0.000 | 1.151 | 0.934 | 1.248 | 0.029 | 0.000 | 0.422 | 6.415 | n/a | n/a | 0.034 | 6.238 | 0.407 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004a9 | 13.950 | 3.879 | n/a | 0.000 | 1.672 | 1.003 | 1.213 | 0.043 | 0.000 | 0.328 | 5.802 | n/a | n/a | 0.010 | 5.551 | 0.398 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.135ms |
| d4cfd43196e472b80000000000000491 | 13.589 | 2.614 | n/a | 0.000 | 1.096 | 0.823 | 1.579 | 0.048 | 0.000 | 1.277 | 6.131 | n/a | n/a | 0.021 | 3.711 | 0.273 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000483 | 13.112 | 3.801 | n/a | 0.000 | 0.743 | 0.892 | 1.651 | 0.050 | 0.000 | 0.843 | 5.114 | n/a | n/a | 0.019 | 4.543 | 0.347 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.035 | 4.075 | 0.761 | 0.000 | 0.084 | 1.500 | 6.021 | 0.042 | 0.000 | 0.651 | 11.926 | n/a | n/a | 0.031 | 4.647 | 0.177 | 0.031 |
| p99 | 124.561 | 8.423 | n/a | 0.384 | 1.082 | 3.312 | 31.540 | 0.092 | 74.963 | 4.210 | 77.847 | n/a | n/a | 0.095 | 9.021 | 0.380 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000004c0 | 124.561 | 4.318 | 0.210 | 0.000 | 0.050 | 2.205 | 31.540 | 0.055 | 74.963 | 0.726 | 10.467 | n/a | n/a | 0.026 | 4.579 | 0.037 | 0.026 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b800000000000004b8 | 97.050 | 3.430 | 0.308 | 0.000 | 0.047 | 1.631 | 13.166 | 0.046 | 0.000 | 0.544 | 77.847 | n/a | n/a | 0.031 | 3.786 | 0.039 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004ce | 51.592 | 4.450 | 0.285 | 0.000 | 0.044 | 2.031 | 25.057 | 0.064 | 0.000 | 0.829 | 18.801 | n/a | n/a | 0.031 | 4.780 | 0.093 | 0.031 | gw-w/thread-45/gateway.admitted-work | none observed |
| d4cfd43196e472b800000000000004dc | 45.961 | 6.861 | n/a | 0.000 | 0.241 | 1.129 | 3.782 | 0.067 | 0.000 | 0.570 | 33.216 | n/a | n/a | 0.095 | 7.102 | 0.155 | 0.095 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004c8 | 42.522 | 3.460 | 0.263 | 0.000 | 0.074 | 1.621 | 10.129 | 0.047 | 0.000 | 0.651 | 26.229 | n/a | n/a | 0.047 | 3.797 | 0.089 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004c2 | 38.796 | 3.456 | 0.761 | 0.000 | 0.070 | 1.931 | 20.842 | 0.075 | 0.000 | 1.156 | 10.470 | n/a | n/a | 0.033 | 4.287 | 0.110 | 0.033 | gw-w/thread-52/gateway.admitted-work | none observed |
| d4cfd43196e472b800000000000004ba | 36.605 | 6.164 | n/a | 0.000 | 0.898 | 0.986 | 2.262 | 0.028 | 0.000 | 0.942 | 25.294 | n/a | n/a | 0.031 | 7.062 | 0.193 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004fc | 34.356 | 3.973 | 0.259 | 0.337 | 0.077 | 1.733 | 7.494 | 0.048 | 0.000 | 0.505 | 19.887 | n/a | n/a | 0.041 | 4.647 | 0.135 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004f4 | 34.000 | 3.942 | n/a | 0.000 | 0.478 | 0.811 | 4.255 | 0.028 | 0.000 | 0.390 | 24.067 | n/a | n/a | 0.029 | 4.420 | 0.130 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004ea | 33.869 | 3.931 | 0.285 | 0.000 | 0.084 | 1.820 | 11.135 | 0.045 | 0.000 | 0.550 | 15.981 | n/a | n/a | 0.038 | 4.300 | 0.127 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004e0 | 33.464 | 3.339 | 0.284 | 0.000 | 0.094 | 1.630 | 10.887 | 0.061 | 0.000 | 0.904 | 16.178 | n/a | n/a | 0.087 | 3.718 | 0.111 | 0.087 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004f2 | 33.316 | 4.724 | 0.291 | 0.384 | 0.031 | 1.673 | 9.013 | 0.041 | 0.000 | 0.688 | 16.445 | n/a | n/a | 0.027 | 5.430 | 0.163 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004b1 | 32.985 | 3.579 | 0.318 | 0.000 | 0.042 | 1.708 | 14.055 | 0.092 | 0.000 | 0.627 | 12.538 | n/a | n/a | 0.027 | 3.939 | 0.119 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004e8 | 32.538 | 8.151 | n/a | 0.000 | 0.567 | 0.863 | 2.809 | 0.041 | 0.000 | 0.906 | 19.170 | n/a | n/a | 0.032 | 8.718 | 0.268 | 0.032 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004da | 32.242 | 5.298 | 0.295 | 0.000 | 0.054 | 1.947 | 9.790 | 0.039 | 0.000 | 0.580 | 14.206 | n/a | n/a | 0.035 | 5.646 | 0.175 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004cc | 31.056 | 3.460 | 0.203 | 0.000 | 0.037 | 1.775 | 9.633 | 0.041 | 0.000 | 0.646 | 15.235 | n/a | n/a | 0.028 | 3.699 | 0.119 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004d2 | 31.025 | 4.180 | 0.408 | 0.000 | 0.036 | 3.312 | 8.534 | 0.046 | 0.000 | 4.210 | 10.269 | n/a | n/a | 0.029 | 4.625 | 0.149 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004d6 | 30.755 | 3.890 | 0.333 | 0.000 | 0.050 | 1.893 | 7.853 | 0.042 | 0.000 | 0.485 | 16.174 | n/a | n/a | 0.036 | 4.273 | 0.139 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004e6 | 30.165 | 4.455 | 0.325 | 0.000 | 0.094 | 1.857 | 10.857 | 0.046 | 0.000 | 0.548 | 11.926 | n/a | n/a | 0.059 | 4.873 | 0.162 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004ca | 28.035 | 5.044 | n/a | 0.000 | 0.892 | 0.760 | 6.878 | 0.057 | 0.000 | 0.942 | 13.443 | n/a | n/a | 0.020 | 5.936 | 0.212 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.008 | 3.978 | n/a | 0.000 | 0.543 | 0.904 | 1.469 | 0.033 | 0.000 | 0.688 | 9.010 | n/a | n/a | 0.026 | 4.718 | 0.262 | 0.026 |
| p99 | 26.256 | 7.509 | n/a | 0.000 | 1.082 | 1.109 | 3.324 | 0.060 | 0.000 | 1.271 | 16.354 | n/a | n/a | 0.033 | 8.066 | 0.380 | 0.033 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000004ee | 26.256 | 4.075 | n/a | 0.000 | 0.642 | 1.109 | 3.324 | 0.032 | 0.000 | 0.687 | 16.354 | n/a | n/a | 0.033 | 4.718 | 0.180 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004af | 21.221 | 7.509 | n/a | 0.000 | 0.556 | 0.911 | 1.339 | 0.033 | 0.000 | 0.688 | 10.156 | n/a | n/a | 0.027 | 8.066 | 0.380 | 0.027 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004e2 | 19.122 | 3.401 | n/a | 0.000 | 0.699 | 0.904 | 1.550 | 0.041 | 0.000 | 0.936 | 11.571 | n/a | n/a | 0.020 | 4.101 | 0.214 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004be | 18.527 | 4.549 | n/a | 0.000 | 0.361 | 0.800 | 1.254 | 0.051 | 0.000 | 0.617 | 10.875 | n/a | n/a | 0.021 | 4.909 | 0.265 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004d8 | 17.503 | 5.119 | n/a | 0.000 | 0.539 | 1.073 | 2.172 | 0.060 | 0.000 | 0.509 | 8.002 | n/a | n/a | 0.029 | 5.658 | 0.323 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004fa | 17.008 | 3.958 | n/a | 0.000 | 1.082 | 0.893 | 1.839 | 0.033 | 0.000 | 0.953 | 8.223 | n/a | n/a | 0.029 | 5.039 | 0.296 | 0.029 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004f7 | 16.844 | 2.889 | n/a | 0.000 | 0.543 | 0.816 | 0.877 | 0.027 | 0.000 | 0.764 | 10.909 | n/a | n/a | 0.019 | 3.432 | 0.204 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004c6 | 16.720 | 3.978 | n/a | 0.000 | 0.976 | 0.913 | 1.270 | 0.033 | 0.000 | 1.271 | 8.256 | n/a | n/a | 0.023 | 4.954 | 0.296 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004c4 | 16.417 | 4.239 | n/a | 0.000 | 0.063 | 0.857 | 1.719 | 0.030 | 0.000 | 0.468 | 9.010 | n/a | n/a | 0.033 | 4.302 | 0.262 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000004b3 | 16.197 | 3.942 | n/a | 0.000 | 0.299 | 1.004 | 1.469 | 0.034 | 0.000 | 1.030 | 8.393 | n/a | n/a | 0.026 | 4.241 | 0.262 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.169 | 4.084 | n/a | 0.000 | 0.099 | 1.562 | 6.652 | 0.041 | 0.000 | 0.660 | 13.441 | n/a | n/a | 0.030 | 4.664 | 0.180 | 0.030 |
| p99 | 75.394 | 15.623 | n/a | 0.407 | 1.161 | 6.090 | 19.457 | 0.135 | 24.768 | 4.108 | 56.423 | n/a | n/a | 0.064 | 16.174 | 0.383 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000521 | 75.394 | 15.623 | n/a | 0.000 | 0.551 | 6.090 | 18.170 | 0.082 | 19.439 | 1.067 | 14.339 | n/a | n/a | 0.032 | 16.174 | 0.215 | 0.032 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b8000000000000054b | 69.569 | 3.263 | 0.293 | 0.000 | 0.085 | 3.740 | 19.457 | 0.095 | 24.768 | 3.881 | 13.948 | n/a | n/a | 0.041 | 3.640 | 0.052 | 0.041 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b800000000000004fe | 66.885 | 4.050 | n/a | 0.000 | 0.874 | 0.746 | 3.970 | 0.030 | 0.000 | 0.767 | 56.423 | n/a | n/a | 0.025 | 4.924 | 0.074 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000533 | 51.178 | 4.553 | 0.378 | 0.000 | 0.049 | 1.787 | 7.035 | 0.033 | 0.000 | 1.821 | 35.486 | n/a | n/a | 0.035 | 4.980 | 0.097 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000508 | 43.228 | 4.196 | 0.317 | 0.342 | 0.053 | 2.420 | 11.839 | 0.135 | 0.000 | 2.039 | 21.841 | n/a | n/a | 0.045 | 4.908 | 0.114 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000537 | 38.935 | 4.813 | 0.372 | 0.000 | 0.049 | 3.409 | 14.486 | 0.082 | 0.000 | 1.145 | 14.544 | n/a | n/a | 0.035 | 5.234 | 0.134 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000547 | 36.788 | 6.044 | 0.514 | 0.000 | 0.066 | 2.279 | 14.254 | 0.068 | 0.000 | 0.825 | 12.691 | n/a | n/a | 0.046 | 6.625 | 0.180 | 0.046 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000505 | 36.580 | 6.382 | n/a | 0.000 | 0.749 | 1.621 | 6.806 | 0.019 | 0.000 | 1.036 | 19.953 | n/a | n/a | 0.015 | 7.131 | 0.195 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.141ms |
| d4cfd43196e472b80000000000000504 | 35.682 | 4.483 | n/a | 0.000 | 1.028 | 1.273 | 7.760 | 0.048 | 0.000 | 1.168 | 19.879 | n/a | n/a | 0.042 | 5.511 | 0.154 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000051f | 34.752 | 4.010 | 0.320 | 0.000 | 0.052 | 1.940 | 13.745 | 0.048 | 0.000 | 0.577 | 14.029 | n/a | n/a | 0.032 | 4.381 | 0.126 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000050f | 33.463 | 4.022 | 0.379 | 0.000 | 0.070 | 0.838 | 10.011 | 0.035 | 0.000 | 0.436 | 17.609 | n/a | n/a | 0.064 | 4.470 | 0.134 | 0.064 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000052d | 33.458 | 6.594 | n/a | 0.000 | 0.124 | 1.024 | 2.474 | 0.051 | 0.000 | 4.108 | 19.065 | n/a | n/a | 0.018 | 6.717 | 0.201 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000523 | 31.596 | 4.525 | 0.285 | 0.000 | 0.041 | 1.723 | 7.353 | 0.073 | 0.000 | 0.660 | 16.901 | n/a | n/a | 0.034 | 4.851 | 0.154 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000541 | 29.351 | 3.425 | 0.319 | 0.000 | 0.046 | 1.845 | 7.072 | 0.040 | 0.000 | 0.589 | 15.978 | n/a | n/a | 0.037 | 3.790 | 0.129 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000051d | 28.814 | 4.656 | 0.200 | 0.000 | 0.038 | 1.730 | 9.194 | 0.054 | 0.000 | 0.441 | 12.471 | n/a | n/a | 0.029 | 4.894 | 0.170 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000510 | 28.634 | 6.287 | n/a | 0.000 | 0.744 | 0.980 | 2.619 | 0.032 | 0.000 | 0.384 | 17.570 | n/a | n/a | 0.020 | 7.031 | 0.246 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000053b | 28.363 | 3.246 | 0.368 | 0.000 | 0.054 | 1.793 | 9.272 | 0.044 | 0.000 | 0.374 | 13.176 | n/a | n/a | 0.035 | 3.668 | 0.129 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000502 | 27.806 | 4.144 | 0.231 | 0.314 | 0.056 | 1.983 | 8.303 | 0.063 | 0.000 | 1.043 | 11.640 | n/a | n/a | 0.030 | 4.744 | 0.171 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000050b | 27.749 | 3.997 | 0.242 | 0.407 | 0.067 | 1.562 | 7.399 | 0.033 | 0.000 | 0.390 | 13.621 | n/a | n/a | 0.031 | 4.712 | 0.170 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000052b | 27.657 | 4.084 | 0.376 | 0.000 | 0.045 | 1.932 | 7.210 | 0.050 | 0.000 | 0.510 | 13.409 | n/a | n/a | 0.040 | 4.506 | 0.163 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.097 | 4.050 | n/a | 0.000 | 0.628 | 0.823 | 1.280 | 0.033 | 0.000 | 0.705 | 13.345 | n/a | n/a | 0.030 | 4.554 | 0.230 | 0.030 |
| p99 | 66.885 | 5.237 | n/a | 0.000 | 1.161 | 1.273 | 7.760 | 0.076 | 0.000 | 1.190 | 56.423 | n/a | n/a | 0.052 | 6.055 | 0.383 | 0.052 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000004fe | 66.885 | 4.050 | n/a | 0.000 | 0.874 | 0.746 | 3.970 | 0.030 | 0.000 | 0.767 | 56.423 | n/a | n/a | 0.025 | 4.924 | 0.074 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000504 | 35.682 | 4.483 | n/a | 0.000 | 1.028 | 1.273 | 7.760 | 0.048 | 0.000 | 1.168 | 19.879 | n/a | n/a | 0.042 | 5.511 | 0.154 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000050d | 25.821 | 3.208 | n/a | 0.000 | 0.913 | 0.894 | 5.357 | 0.054 | 0.000 | 0.681 | 14.695 | n/a | n/a | 0.018 | 4.121 | 0.160 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000051b | 24.754 | 3.954 | n/a | 0.000 | 0.156 | 0.767 | 1.097 | 0.027 | 0.000 | 0.705 | 18.018 | n/a | n/a | 0.030 | 4.110 | 0.166 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000516 | 23.628 | 5.237 | n/a | 0.000 | 0.819 | 0.833 | 1.339 | 0.062 | 0.000 | 0.808 | 14.499 | n/a | n/a | 0.031 | 6.055 | 0.256 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000500 | 22.836 | 4.177 | n/a | 0.000 | 1.070 | 1.060 | 1.280 | 0.029 | 0.000 | 0.709 | 14.480 | n/a | n/a | 0.030 | 5.248 | 0.230 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000513 | 21.720 | 3.686 | n/a | 0.000 | 0.494 | 0.715 | 1.476 | 0.041 | 0.000 | 0.468 | 14.807 | n/a | n/a | 0.033 | 4.181 | 0.192 | 0.033 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000543 | 21.097 | 4.476 | n/a | 0.000 | 1.161 | 0.879 | 0.899 | 0.028 | 0.000 | 0.398 | 13.236 | n/a | n/a | 0.020 | 5.637 | 0.267 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000535 | 20.749 | 4.869 | n/a | 0.000 | 0.152 | 0.913 | 0.849 | 0.070 | 0.000 | 0.743 | 13.127 | n/a | n/a | 0.025 | 5.021 | 0.242 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000052f | 20.203 | 3.839 | n/a | 0.000 | 0.628 | 0.759 | 0.905 | 0.033 | 0.000 | 0.641 | 13.345 | n/a | n/a | 0.052 | 4.468 | 0.221 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000527 | 19.198 | 4.455 | n/a | 0.000 | 0.099 | 0.823 | 2.196 | 0.030 | 0.000 | 0.531 | 11.033 | n/a | n/a | 0.031 | 4.554 | 0.237 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000519 | 15.495 | 2.748 | n/a | 0.000 | 1.128 | 0.477 | 2.451 | 0.076 | 0.000 | 1.051 | 7.544 | n/a | n/a | 0.021 | 3.876 | 0.250 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000053d | 12.470 | 2.537 | n/a | 0.000 | 0.333 | 0.762 | 1.008 | 0.027 | 0.000 | 0.591 | 7.191 | n/a | n/a | 0.021 | 2.870 | 0.230 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000538 | 12.308 | 4.123 | n/a | 0.000 | 0.596 | 0.868 | 0.935 | 0.024 | 0.000 | 0.593 | 5.137 | n/a | n/a | 0.031 | 4.719 | 0.383 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000054d | 11.482 | 3.311 | n/a | 0.000 | 0.434 | 0.761 | 0.900 | 0.036 | 0.000 | 1.190 | 4.833 | n/a | n/a | 0.017 | 3.744 | 0.326 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.214 | 3.880 | n/a | 0.000 | 0.185 | 1.429 | 3.423 | 0.034 | 0.000 | 0.604 | 10.916 | n/a | n/a | 0.027 | 4.351 | 0.216 | 0.027 |
| p99 | 42.186 | 10.183 | n/a | 3.590 | 1.233 | 4.174 | 15.726 | 0.086 | 17.398 | 3.793 | 25.713 | n/a | n/a | 0.076 | 12.356 | 0.500 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000589 | 42.186 | 4.065 | 0.235 | 0.000 | 0.051 | 1.852 | 9.813 | 0.060 | 17.398 | 0.499 | 8.185 | n/a | n/a | 0.028 | 4.351 | 0.103 | 0.028 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b80000000000000552 | 41.777 | 3.060 | 0.226 | 0.000 | 0.078 | 1.582 | 13.803 | 0.039 | 0.000 | 0.401 | 22.512 | n/a | n/a | 0.076 | 3.364 | 0.081 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000056b | 40.570 | 3.163 | 0.223 | 0.000 | 0.043 | 1.546 | 8.882 | 0.046 | 0.000 | 0.931 | 25.713 | n/a | n/a | 0.023 | 3.429 | 0.085 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000056f | 39.699 | 4.168 | 0.224 | 0.000 | 0.048 | 1.821 | 15.726 | 0.054 | 0.000 | 0.819 | 16.797 | n/a | n/a | 0.042 | 4.440 | 0.112 | 0.042 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000575 | 37.894 | 3.724 | 0.283 | 0.000 | 0.044 | 4.174 | 8.785 | 0.042 | 0.000 | 0.361 | 20.420 | n/a | n/a | 0.061 | 4.051 | 0.107 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000059a | 36.674 | 3.099 | 0.236 | 0.000 | 0.044 | 2.047 | 9.133 | 0.032 | 9.956 | 0.557 | 11.544 | n/a | n/a | 0.027 | 3.379 | 0.092 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000597 | 35.079 | 4.492 | 0.276 | 0.000 | 0.052 | 1.820 | 9.826 | 0.033 | 0.000 | 0.596 | 17.955 | n/a | n/a | 0.028 | 4.821 | 0.137 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000585 | 34.284 | 5.467 | 0.305 | 0.000 | 0.062 | 1.764 | 11.537 | 0.038 | 0.000 | 0.368 | 14.700 | n/a | n/a | 0.044 | 5.834 | 0.170 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000563 | 33.523 | 3.697 | 0.303 | 0.000 | 0.083 | 2.636 | 12.370 | 0.043 | 0.000 | 0.637 | 13.716 | n/a | n/a | 0.038 | 4.083 | 0.122 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005a8 | 32.849 | 5.339 | 0.404 | 0.000 | 0.055 | 2.077 | 10.850 | 0.037 | 0.000 | 0.604 | 13.444 | n/a | n/a | 0.040 | 5.797 | 0.176 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000573 | 31.603 | 3.851 | 0.288 | 0.000 | 0.041 | 2.084 | 14.175 | 0.036 | 0.000 | 0.356 | 10.727 | n/a | n/a | 0.044 | 4.180 | 0.132 | 0.044 | gw-w/thread-52/gateway.admitted-work | none observed |
| d4cfd43196e472b8000000000000055c | 30.763 | 3.105 | 0.310 | 0.000 | 0.041 | 1.558 | 8.222 | 0.053 | 0.000 | 0.479 | 16.966 | n/a | n/a | 0.029 | 3.457 | 0.112 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005b4 | 29.900 | 3.521 | 0.196 | 0.000 | 0.037 | 1.878 | 5.798 | 0.037 | 0.000 | 0.531 | 17.872 | n/a | n/a | 0.029 | 3.755 | 0.126 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000577 | 29.862 | 4.480 | 0.283 | 0.000 | 0.038 | 1.574 | 10.750 | 0.035 | 0.000 | 0.397 | 12.262 | n/a | n/a | 0.042 | 4.802 | 0.161 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000057f | 29.283 | 4.272 | 0.262 | 0.000 | 0.034 | 2.037 | 9.637 | 0.083 | 0.000 | 1.778 | 11.156 | n/a | n/a | 0.023 | 4.569 | 0.156 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000058b | 28.641 | 8.250 | n/a | 3.538 | 0.560 | 1.692 | 1.999 | 0.034 | 0.000 | 0.689 | 11.856 | n/a | n/a | 0.024 | 12.348 | 0.431 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000583 | 27.685 | 10.183 | n/a | 0.000 | 1.233 | 1.131 | 1.713 | 0.032 | 0.000 | 0.655 | 12.685 | n/a | n/a | 0.052 | 11.416 | 0.412 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000570 | 26.336 | 10.021 | n/a | 0.000 | 0.357 | 1.429 | 1.906 | 0.059 | 0.000 | 0.964 | 11.572 | n/a | n/a | 0.027 | 10.379 | 0.394 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000558 | 26.322 | 4.843 | n/a | 0.000 | 0.302 | 0.775 | 2.113 | 0.086 | 0.000 | 1.298 | 16.879 | n/a | n/a | 0.026 | 5.145 | 0.195 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000057a | 25.690 | 2.536 | n/a | 0.000 | 0.414 | 1.260 | 5.478 | 0.086 | 0.000 | 2.582 | 13.323 | n/a | n/a | 0.011 | 2.949 | 0.115 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.958 | 3.468 | n/a | 0.000 | 0.469 | 1.069 | 1.524 | 0.031 | 0.000 | 0.599 | 8.584 | n/a | n/a | 0.027 | 4.054 | 0.264 | 0.027 |
| p99 | 27.685 | 10.183 | n/a | 1.873 | 1.233 | 3.361 | 7.193 | 0.086 | 0.000 | 2.582 | 13.323 | n/a | n/a | 0.075 | 11.416 | 0.433 | 0.075 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000583 | 27.685 | 10.183 | n/a | 0.000 | 1.233 | 1.131 | 1.713 | 0.032 | 0.000 | 0.655 | 12.685 | n/a | n/a | 0.052 | 11.416 | 0.412 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000570 | 26.336 | 10.021 | n/a | 0.000 | 0.357 | 1.429 | 1.906 | 0.059 | 0.000 | 0.964 | 11.572 | n/a | n/a | 0.027 | 10.379 | 0.394 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000057a | 25.690 | 2.536 | n/a | 0.000 | 0.414 | 1.260 | 5.478 | 0.086 | 0.000 | 2.582 | 13.323 | n/a | n/a | 0.011 | 2.949 | 0.115 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000551 | 24.017 | 5.319 | n/a | 0.000 | 0.333 | 2.861 | 4.894 | 0.034 | 0.000 | 0.573 | 9.956 | n/a | n/a | 0.047 | 5.652 | 0.235 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000599 | 22.214 | 6.084 | n/a | 1.848 | 0.185 | 3.361 | 7.193 | 0.031 | 0.000 | 0.648 | 2.828 | n/a | n/a | 0.035 | 8.117 | 0.365 | 0.035 | gw-w/thread-48/gateway.admitted-work | none observed |
| d4cfd43196e472b8000000000000055a | 20.533 | 3.468 | n/a | 0.000 | 0.298 | 0.754 | 2.420 | 0.027 | 0.000 | 0.526 | 13.010 | n/a | n/a | 0.030 | 3.766 | 0.183 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000058d | 19.019 | 3.880 | n/a | 0.000 | 0.469 | 0.886 | 3.302 | 0.052 | 0.000 | 0.514 | 9.888 | n/a | n/a | 0.027 | 4.350 | 0.229 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005ac | 18.425 | 3.293 | n/a | 0.000 | 0.590 | 0.851 | 3.423 | 0.052 | 0.000 | 0.735 | 9.463 | n/a | n/a | 0.018 | 3.883 | 0.211 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000058f | 16.958 | 4.933 | n/a | 1.873 | 0.532 | 0.817 | 1.524 | 0.040 | 0.000 | 1.175 | 6.038 | n/a | n/a | 0.026 | 7.338 | 0.433 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000059e | 16.718 | 5.336 | n/a | 0.000 | 0.156 | 1.441 | 1.036 | 0.029 | 0.000 | 0.411 | 8.244 | n/a | n/a | 0.065 | 5.492 | 0.329 | 0.065 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000055f | 16.601 | 3.438 | n/a | 0.000 | 0.155 | 0.795 | 0.729 | 0.025 | 0.000 | 0.520 | 10.916 | n/a | n/a | 0.024 | 3.593 | 0.216 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000565 | 15.703 | 3.648 | n/a | 0.000 | 0.492 | 1.069 | 1.040 | 0.032 | 0.000 | 0.795 | 8.584 | n/a | n/a | 0.042 | 4.140 | 0.264 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000594 | 14.004 | 2.588 | n/a | 0.000 | 0.529 | 1.341 | 1.050 | 0.025 | 0.000 | 0.391 | 8.057 | n/a | n/a | 0.022 | 3.118 | 0.223 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005b2 | 13.206 | 3.264 | n/a | 0.000 | 0.563 | 0.945 | 0.823 | 0.029 | 0.000 | 0.406 | 7.153 | n/a | n/a | 0.023 | 3.827 | 0.290 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005b0 | 11.749 | 3.291 | n/a | 0.000 | 0.763 | 1.365 | 0.716 | 0.026 | 0.000 | 0.599 | 4.915 | n/a | n/a | 0.075 | 4.054 | 0.345 | 0.075 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005a6 | 11.663 | 3.247 | n/a | 0.000 | 0.660 | 0.913 | 0.733 | 0.026 | 0.000 | 0.412 | 5.655 | n/a | n/a | 0.018 | 3.907 | 0.335 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000556 | 11.505 | 2.776 | n/a | 0.000 | 0.195 | 0.744 | 0.723 | 0.024 | 0.000 | 0.639 | 6.385 | n/a | n/a | 0.017 | 2.972 | 0.258 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.316 | 3.562 | n/a | 0.000 | 0.089 | 1.543 | 2.168 | 0.035 | 0.000 | 0.688 | 11.086 | n/a | n/a | 0.025 | 4.084 | 0.199 | 0.025 |
| p99 | 72.389 | 6.694 | n/a | 2.427 | 1.255 | 5.676 | 22.222 | 1.010 | 16.527 | 3.738 | 44.007 | n/a | n/a | 0.046 | 9.946 | 0.429 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000005b8 | 72.389 | 3.582 | 0.285 | 0.000 | 0.043 | 1.803 | 22.222 | 0.049 | 0.000 | 0.371 | 44.007 | n/a | n/a | 0.028 | 3.910 | 0.054 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005ed | 48.991 | 3.885 | 0.207 | 0.000 | 0.035 | 1.867 | 5.860 | 1.010 | 0.000 | 0.554 | 35.552 | n/a | n/a | 0.022 | 4.127 | 0.084 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005d5 | 41.892 | 3.097 | 0.197 | 0.000 | 0.053 | 1.604 | 8.614 | 0.033 | 14.457 | 0.365 | 13.447 | n/a | n/a | 0.024 | 3.347 | 0.080 | 0.024 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b800000000000005fd | 39.390 | 1.931 | n/a | 0.000 | 0.711 | 5.676 | 14.458 | 0.030 | 16.527 | 0.026 | 0.000 | n/a | n/a | 0.031 | 2.643 | 0.067 | 0.031 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b800000000000005ee | 39.094 | 2.855 | n/a | 0.000 | 0.281 | 0.793 | 0.418 | 0.024 | 0.000 | 1.180 | 33.532 | n/a | n/a | 0.011 | 3.136 | 0.080 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005e3 | 36.962 | 3.254 | 0.168 | 0.000 | 0.031 | 1.876 | 7.669 | 0.029 | 0.000 | 3.604 | 20.310 | n/a | n/a | 0.020 | 3.453 | 0.093 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005c3 | 35.728 | 3.240 | 0.266 | 0.000 | 0.051 | 1.782 | 9.865 | 0.035 | 0.000 | 0.611 | 19.833 | n/a | n/a | 0.046 | 3.556 | 0.100 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005e5 | 33.885 | 3.495 | 0.291 | 0.000 | 0.082 | 1.845 | 10.034 | 0.042 | 0.000 | 0.688 | 17.370 | n/a | n/a | 0.039 | 3.867 | 0.114 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005dd | 33.669 | 3.562 | 0.256 | 0.000 | 0.039 | 1.739 | 8.569 | 0.044 | 0.000 | 0.693 | 18.742 | n/a | n/a | 0.024 | 3.857 | 0.115 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005fb | 31.340 | 3.251 | 0.269 | 0.000 | 0.089 | 1.675 | 9.064 | 0.042 | 0.000 | 0.785 | 16.127 | n/a | n/a | 0.039 | 3.609 | 0.115 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005cb | 30.193 | 4.338 | 0.227 | 0.000 | 0.051 | 1.858 | 7.010 | 0.063 | 0.000 | 0.671 | 15.948 | n/a | n/a | 0.027 | 4.615 | 0.153 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005be | 28.145 | 5.128 | n/a | 2.202 | 0.093 | 0.886 | 1.779 | 0.065 | 0.000 | 0.877 | 17.094 | n/a | n/a | 0.021 | 7.423 | 0.264 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000608 | 25.474 | 5.219 | 0.394 | 0.000 | 0.049 | 1.770 | 5.561 | 0.036 | 0.000 | 0.577 | 11.834 | n/a | n/a | 0.035 | 5.662 | 0.222 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000606 | 24.379 | 4.413 | 0.360 | 0.000 | 0.069 | 1.879 | 6.039 | 0.035 | 0.000 | 0.406 | 11.144 | n/a | n/a | 0.036 | 4.841 | 0.199 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005f2 | 23.951 | 3.146 | n/a | 0.000 | 0.939 | 0.765 | 4.165 | 0.039 | 0.000 | 3.738 | 11.139 | n/a | n/a | 0.021 | 4.084 | 0.171 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005e1 | 23.840 | 3.413 | n/a | 0.000 | 0.459 | 1.417 | 1.501 | 0.033 | 0.000 | 1.093 | 15.904 | n/a | n/a | 0.021 | 3.872 | 0.162 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b80000000000000600 | 23.167 | 6.694 | n/a | 2.427 | 0.825 | 0.876 | 1.593 | 0.030 | 0.000 | 0.695 | 10.003 | n/a | n/a | 0.024 | 9.946 | 0.429 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005c6 | 22.341 | 4.477 | n/a | 0.000 | 0.643 | 0.829 | 1.355 | 0.025 | 0.000 | 0.378 | 14.613 | n/a | n/a | 0.020 | 5.121 | 0.229 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005f1 | 22.328 | 3.495 | 0.291 | 0.000 | 0.048 | 1.543 | 5.306 | 0.060 | 0.000 | 0.352 | 11.203 | n/a | n/a | 0.030 | 3.834 | 0.172 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005c9 | 21.781 | 3.028 | 0.239 | 0.000 | 0.071 | 1.605 | 4.818 | 0.035 | 0.000 | 0.868 | 11.086 | n/a | n/a | 0.031 | 3.338 | 0.153 | 0.031 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.584 | 3.567 | n/a | 0.000 | 0.471 | 0.901 | 1.169 | 0.030 | 0.000 | 0.718 | 8.122 | n/a | n/a | 0.022 | 4.599 | 0.275 | 0.022 |
| p99 | 39.390 | 5.425 | n/a | 0.000 | 1.255 | 5.676 | 14.458 | 0.068 | 16.527 | 3.738 | 33.532 | n/a | n/a | 0.039 | 6.619 | 0.379 | 0.039 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000005fd | 39.390 | 1.931 | n/a | 0.000 | 0.711 | 5.676 | 14.458 | 0.030 | 16.527 | 0.026 | 0.000 | n/a | n/a | 0.031 | 2.643 | 0.067 | 0.031 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d4cfd43196e472b800000000000005ee | 39.094 | 2.855 | n/a | 0.000 | 0.281 | 0.793 | 0.418 | 0.024 | 0.000 | 1.180 | 33.532 | n/a | n/a | 0.011 | 3.136 | 0.080 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005f2 | 23.951 | 3.146 | n/a | 0.000 | 0.939 | 0.765 | 4.165 | 0.039 | 0.000 | 3.738 | 11.139 | n/a | n/a | 0.021 | 4.084 | 0.171 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005b6 | 21.088 | 5.363 | n/a | 0.000 | 1.255 | 1.091 | 1.114 | 0.034 | 0.000 | 0.560 | 11.631 | n/a | n/a | 0.039 | 6.619 | 0.314 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005d3 | 20.798 | 4.620 | n/a | 0.000 | 0.471 | 1.339 | 2.168 | 0.068 | 0.000 | 0.718 | 11.376 | n/a | n/a | 0.037 | 5.091 | 0.245 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005d6 | 20.638 | 5.425 | n/a | 0.000 | 0.259 | 1.649 | 1.561 | 0.040 | 0.000 | 1.514 | 10.162 | n/a | n/a | 0.030 | 5.684 | 0.275 | 0.030 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005eb | 18.143 | 4.764 | n/a | 0.000 | 0.178 | 1.039 | 1.721 | 0.055 | 0.000 | 1.089 | 9.268 | n/a | n/a | 0.029 | 4.943 | 0.272 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005cc | 16.584 | 4.955 | n/a | 0.000 | 1.101 | 0.939 | 0.915 | 0.025 | 0.000 | 0.739 | 7.884 | n/a | n/a | 0.027 | 6.056 | 0.365 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005cf | 16.310 | 4.734 | n/a | 0.000 | 0.215 | 1.249 | 1.169 | 0.064 | 0.000 | 0.500 | 8.356 | n/a | n/a | 0.022 | 4.949 | 0.303 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005df | 14.354 | 3.127 | n/a | 0.000 | 0.891 | 0.776 | 0.930 | 0.028 | 0.000 | 0.461 | 8.122 | n/a | n/a | 0.019 | 4.018 | 0.280 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005f6 | 13.523 | 3.536 | n/a | 0.000 | 0.844 | 0.863 | 0.904 | 0.030 | 0.000 | 0.664 | 6.663 | n/a | n/a | 0.018 | 4.381 | 0.324 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005e7 | 13.486 | 3.567 | n/a | 0.000 | 1.032 | 0.894 | 1.588 | 0.047 | 0.000 | 1.111 | 5.227 | n/a | n/a | 0.020 | 4.599 | 0.341 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005f9 | 13.132 | 4.514 | n/a | 0.000 | 0.458 | 0.885 | 1.416 | 0.028 | 0.000 | 1.148 | 4.647 | n/a | n/a | 0.035 | 4.973 | 0.379 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b800000000000005c4 | 12.437 | 3.024 | n/a | 0.000 | 0.080 | 0.901 | 1.011 | 0.027 | 0.000 | 0.522 | 6.851 | n/a | n/a | 0.020 | 3.104 | 0.250 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (851 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.543 | 3.621 | n/a | 0.000 | 0.751 | 0.874 | 1.038 | 0.030 | 0.000 | 0.569 | 9.813 | n/a | n/a | 0.016 | 4.676 | 0.256 | 0.016 |
| p99 | 88.865 | 42.801 | n/a | 2.083 | 40.881 | 22.747 | 9.559 | 5.365 | 0.359 | 6.781 | 51.156 | n/a | n/a | 0.054 | 56.958 | 1.000 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b80000000000000b4c | 110.523 | 7.395 | n/a | 0.000 | 1.072 | 40.802 | 3.701 | 19.833 | 0.000 | 0.979 | 36.733 | n/a | n/a | 0.007 | 8.467 | 0.077 | 0.007 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.272ms; driver.expected-state.bind-receipt 1.788ms; driver.publication 1.281ms; driver.publication 1.185ms; driver.publication 1.133ms |
| d4cfd43196e472b800000000000007ce | 100.014 | 6.491 | n/a | 0.000 | 2.492 | 3.634 | 2.483 | 2.533 | 0.000 | 1.052 | 81.306 | n/a | n/a | 0.023 | 8.984 | 0.090 | 0.023 | gw-w/thread-68/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 1.875ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b800000000000007ca | 98.531 | 5.473 | n/a | 0.000 | 16.908 | 1.044 | 2.198 | 0.040 | 0.000 | 1.792 | 71.061 | n/a | n/a | 0.015 | 22.382 | 0.227 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 2.996ms; driver.publication 2.300ms; driver.publication 1.929ms; driver.publication 1.875ms |
| d4cfd43196e472b800000000000007d0 | 97.240 | 3.585 | n/a | 0.000 | 3.824 | 0.883 | 3.444 | 0.084 | 0.000 | 6.615 | 78.792 | n/a | n/a | 0.012 | 7.410 | 0.076 | 0.012 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.875ms; driver.publication 1.769ms; driver.publication 1.567ms |
| d4cfd43196e472b800000000000007d3 | 95.697 | 80.841 | n/a | 0.000 | 14.841 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 95.682 | 1.000 | 0.014 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b800000000000007de | 95.045 | 4.629 | n/a | 0.000 | 81.794 | 0.858 | 1.640 | 0.099 | 0.000 | 0.414 | 5.598 | n/a | n/a | 0.013 | 86.423 | 0.909 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.567ms; driver.publication 1.344ms; driver.expected-state.bind-receipt 1.344ms |
| d4cfd43196e472b800000000000007c7 | 93.827 | 10.370 | n/a | 0.000 | 1.739 | 1.060 | 13.293 | 3.628 | 0.000 | 6.875 | 56.827 | n/a | n/a | 0.035 | 12.109 | 0.129 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.996ms; driver.publication 2.300ms; driver.publication 1.929ms; driver.publication 1.875ms; driver.publication 1.769ms |
| d4cfd43196e472b800000000000007d1 | 91.945 | 7.582 | n/a | 0.000 | 4.702 | 11.691 | 7.709 | 0.100 | 0.000 | 9.830 | 50.300 | n/a | n/a | 0.030 | 12.283 | 0.134 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b800000000000007d4 | 88.865 | 84.074 | n/a | 0.000 | 4.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 88.850 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b80000000000000c41 | 87.428 | 2.683 | n/a | 0.000 | 69.891 | 0.682 | 5.171 | 0.041 | 0.000 | 0.962 | 7.990 | n/a | n/a | 0.009 | 72.573 | 0.830 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.148ms; driver.publication 2.227ms; driver.publication 1.939ms; driver.expected-state.bind-receipt 1.575ms |
| d4cfd43196e472b800000000000006a0 | 87.227 | 3.334 | n/a | 0.000 | 62.586 | 1.932 | 1.306 | 0.030 | 0.000 | 0.632 | 17.397 | n/a | n/a | 0.010 | 65.920 | 0.756 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.798ms; driver.publication 1.280ms; driver.publication 1.169ms; driver.publication 1.060ms; driver.publication 1.022ms |
| d4cfd43196e472b80000000000000c3a | 84.661 | 4.524 | n/a | 0.000 | 36.094 | 7.667 | 1.120 | 0.034 | 0.000 | 3.736 | 31.472 | n/a | n/a | 0.014 | 40.618 | 0.480 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.148ms; driver.publication 2.227ms; driver.publication 1.939ms; driver.expected-state.bind-receipt 1.575ms |
| d4cfd43196e472b800000000000007cd | 84.214 | 6.276 | n/a | 0.000 | 0.070 | 0.844 | 8.986 | 0.030 | 0.000 | 0.474 | 67.510 | n/a | n/a | 0.022 | 6.346 | 0.075 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 1.875ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b800000000000006a8 | 83.399 | 2.470 | n/a | 0.000 | 69.202 | 3.698 | 0.665 | 0.026 | 0.000 | 0.408 | 6.917 | n/a | n/a | 0.010 | 71.673 | 0.859 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.798ms; driver.publication 1.284ms; driver.publication 1.280ms; driver.publication 1.240ms; driver.expected-state.bind-receipt 1.173ms |
| d4cfd43196e472b800000000000007cc | 80.440 | 3.829 | n/a | 0.000 | 1.326 | 0.965 | 1.144 | 0.079 | 0.000 | 2.074 | 71.003 | n/a | n/a | 0.021 | 5.155 | 0.064 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 1.875ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.expected-state.bind-receipt 1.344ms |
| d4cfd43196e472b80000000000000ab0 | 78.325 | 4.667 | n/a | 0.000 | 1.083 | 45.666 | 1.149 | 0.031 | 0.000 | 0.376 | 25.338 | n/a | n/a | 0.015 | 5.750 | 0.073 | 0.015 | node-14/thread-0/socket.wait-first-byte | client.parse 1.171ms |
| d4cfd43196e472b8000000000000084c | 76.132 | 3.083 | n/a | 0.000 | 45.936 | 4.046 | 0.595 | 0.016 | 0.000 | 0.379 | 22.067 | n/a | n/a | 0.010 | 49.019 | 0.644 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.271ms; driver.publication 1.008ms |
| d4cfd43196e472b80000000000000695 | 75.636 | 4.601 | n/a | 0.000 | 11.719 | 22.747 | 1.010 | 0.036 | 0.200 | 1.705 | 33.603 | n/a | n/a | 0.015 | 16.320 | 0.216 | 0.015 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.045ms; driver.publication 1.022ms |
| d4cfd43196e472b80000000000000842 | 73.689 | 4.058 | n/a | 0.000 | 15.708 | 3.049 | 1.694 | 0.052 | 0.000 | 0.430 | 48.678 | n/a | n/a | 0.019 | 19.766 | 0.268 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.886ms; driver.publication 1.105ms; driver.publication 1.008ms |
| d4cfd43196e472b80000000000000845 | 72.061 | 2.856 | n/a | 0.000 | 12.574 | 0.743 | 1.055 | 0.027 | 0.000 | 1.248 | 53.548 | n/a | n/a | 0.010 | 15.430 | 0.214 | 0.010 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 1.886ms; driver.publication 1.008ms |

## P2 / L1024 / commit / 5-10 facts (493 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.331 | 3.099 | n/a | 0.000 | 0.786 | 0.872 | 0.872 | 0.029 | 0.000 | 0.559 | 9.085 | n/a | n/a | 0.016 | 4.079 | 0.246 | 0.016 |
| p99 | 83.399 | 39.715 | n/a | 0.000 | 40.881 | 27.046 | 6.721 | 8.046 | 6.722 | 6.781 | 50.300 | n/a | n/a | 0.054 | 56.067 | 1.000 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000007ca | 98.531 | 5.473 | n/a | 0.000 | 16.908 | 1.044 | 2.198 | 0.040 | 0.000 | 1.792 | 71.061 | n/a | n/a | 0.015 | 22.382 | 0.227 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 2.996ms; driver.publication 2.300ms; driver.publication 1.929ms; driver.publication 1.875ms |
| d4cfd43196e472b800000000000007d1 | 91.945 | 7.582 | n/a | 0.000 | 4.702 | 11.691 | 7.709 | 0.100 | 0.000 | 9.830 | 50.300 | n/a | n/a | 0.030 | 12.283 | 0.134 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b800000000000007d4 | 88.865 | 84.074 | n/a | 0.000 | 4.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 88.850 | 1.000 | 0.015 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.270ms; driver.publication 2.112ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.publication 1.344ms |
| d4cfd43196e472b80000000000000c41 | 87.428 | 2.683 | n/a | 0.000 | 69.891 | 0.682 | 5.171 | 0.041 | 0.000 | 0.962 | 7.990 | n/a | n/a | 0.009 | 72.573 | 0.830 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.148ms; driver.publication 2.227ms; driver.publication 1.939ms; driver.expected-state.bind-receipt 1.575ms |
| d4cfd43196e472b800000000000006a8 | 83.399 | 2.470 | n/a | 0.000 | 69.202 | 3.698 | 0.665 | 0.026 | 0.000 | 0.408 | 6.917 | n/a | n/a | 0.010 | 71.673 | 0.859 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.798ms; driver.publication 1.284ms; driver.publication 1.280ms; driver.publication 1.240ms; driver.expected-state.bind-receipt 1.173ms |
| d4cfd43196e472b800000000000007cc | 80.440 | 3.829 | n/a | 0.000 | 1.326 | 0.965 | 1.144 | 0.079 | 0.000 | 2.074 | 71.003 | n/a | n/a | 0.021 | 5.155 | 0.064 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 3.270ms; driver.publication 1.875ms; driver.publication 1.769ms; driver.publication 1.567ms; driver.expected-state.bind-receipt 1.344ms |
| d4cfd43196e472b8000000000000084c | 76.132 | 3.083 | n/a | 0.000 | 45.936 | 4.046 | 0.595 | 0.016 | 0.000 | 0.379 | 22.067 | n/a | n/a | 0.010 | 49.019 | 0.644 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.271ms; driver.publication 1.008ms |
| d4cfd43196e472b80000000000000664 | 68.195 | 5.081 | n/a | 0.000 | 50.987 | 0.793 | 0.853 | 0.033 | 0.000 | 0.297 | 10.138 | n/a | n/a | 0.014 | 56.067 | 0.822 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.353ms; driver.publication 1.259ms; driver.publication 1.224ms; driver.publication 1.199ms; driver.publication 1.116ms |
| d4cfd43196e472b80000000000000658 | 66.326 | 3.189 | n/a | 0.000 | 1.247 | 42.304 | 1.006 | 0.054 | 0.000 | 4.178 | 14.337 | n/a | n/a | 0.012 | 4.435 | 0.067 | 0.012 | node-14/thread-0/socket.wait-first-byte | driver.publication 0.583ms |
| d4cfd43196e472b800000000000007c6 | 66.227 | 4.752 | n/a | 0.000 | 2.191 | 12.558 | 1.722 | 5.077 | 0.000 | 1.744 | 38.164 | n/a | n/a | 0.018 | 6.943 | 0.105 | 0.018 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.996ms; driver.publication 2.300ms; driver.publication 1.929ms; driver.publication 1.875ms; driver.expected-state.bind-receipt 1.033ms |
| d4cfd43196e472b80000000000000699 | 65.361 | 63.994 | n/a | 0.000 | 1.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 65.352 | 1.000 | 0.009 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.280ms; driver.publication 1.169ms; driver.publication 1.060ms; driver.publication 1.022ms; driver.publication 1.015ms |
| d4cfd43196e472b80000000000000697 | 65.208 | 2.581 | n/a | 0.000 | 0.899 | 11.852 | 0.593 | 1.753 | 0.000 | 4.444 | 43.065 | n/a | n/a | 0.021 | 3.480 | 0.053 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.280ms; driver.publication 1.169ms; driver.publication 1.022ms |
| d4cfd43196e472b80000000000000b24 | 64.986 | 2.142 | n/a | 0.000 | 0.328 | 4.884 | 1.006 | 1.439 | 0.000 | 0.167 | 55.007 | n/a | n/a | 0.012 | 2.470 | 0.038 | 0.012 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 3.924ms; driver.publication 1.659ms; driver.publication 1.281ms; driver.publication 1.253ms; driver.publication 1.251ms |
| d4cfd43196e472b80000000000000747 | 64.705 | 6.063 | n/a | 0.000 | 27.969 | 4.482 | 1.360 | 0.142 | 0.000 | 0.555 | 24.123 | n/a | n/a | 0.011 | 34.032 | 0.526 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.371ms; driver.publication 1.342ms; driver.publication 1.337ms; driver.publication 1.269ms; driver.publication 1.253ms |
| d4cfd43196e472b80000000000000b2c | 63.559 | 3.239 | n/a | 0.000 | 40.881 | 0.833 | 1.329 | 0.058 | 0.000 | 0.595 | 16.615 | n/a | n/a | 0.010 | 44.120 | 0.694 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.924ms; driver.publication 1.253ms; driver.publication 1.251ms; driver.publication 1.015ms |
| d4cfd43196e472b80000000000000698 | 63.276 | 3.584 | n/a | 0.000 | 0.109 | 3.570 | 1.054 | 2.638 | 0.000 | 1.136 | 51.156 | n/a | n/a | 0.028 | 3.693 | 0.058 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.280ms; driver.publication 1.169ms; driver.publication 1.022ms; driver.publication 1.015ms |
| d4cfd43196e472b800000000000006d4 | 63.253 | 3.041 | n/a | 0.000 | 0.558 | 5.609 | 0.899 | 2.851 | 0.000 | 2.225 | 48.055 | n/a | n/a | 0.014 | 3.600 | 0.057 | 0.014 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.446ms; driver.publication 1.366ms; driver.publication 1.021ms |
| d4cfd43196e472b800000000000006fd | 62.431 | 2.727 | n/a | 0.000 | 0.264 | 6.041 | 0.526 | 2.968 | 0.000 | 0.169 | 49.727 | n/a | n/a | 0.010 | 2.991 | 0.048 | 0.010 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication 1.424ms; driver.expected-state.bind-receipt 1.342ms; driver.publication 1.318ms |
| d4cfd43196e472b8000000000000071d | 60.145 | 7.482 | n/a | 0.000 | 0.624 | 13.220 | 9.559 | 0.069 | 0.224 | 4.315 | 24.636 | n/a | n/a | 0.016 | 8.107 | 0.135 | 0.016 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| d4cfd43196e472b8000000000000070a | 59.931 | 2.783 | n/a | 0.000 | 29.437 | 1.926 | 0.872 | 0.674 | 0.000 | 3.359 | 20.870 | n/a | n/a | 0.010 | 32.220 | 0.538 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.783ms; driver.publication 1.440ms; driver.publication 1.424ms; driver.expected-state.bind-receipt 1.342ms; driver.publication 1.286ms |

## P2 / tail / commit (2617 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.163 | 3.473 | n/a | 0.000 | 0.716 | 0.812 | 0.942 | 0.030 | 0.000 | 0.474 | 7.950 | n/a | n/a | 0.015 | 4.471 | 0.287 | 0.015 |
| p99 | 83.891 | 33.095 | n/a | 2.481 | 33.926 | 15.311 | 8.286 | 4.085 | 0.000 | 5.951 | 41.554 | n/a | n/a | 0.045 | 55.453 | 1.000 | 0.045 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000018ab | 181.230 | 5.437 | n/a | 0.000 | 48.450 | 106.248 | 1.602 | 0.034 | 0.000 | 2.593 | 16.856 | n/a | n/a | 0.009 | 53.887 | 0.297 | 0.009 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.772ms; driver.publication 1.745ms |
| d4cfd43196e472b800000000000018a5 | 176.928 | 4.520 | n/a | 0.000 | 0.394 | 129.132 | 7.589 | 14.322 | 0.000 | 0.434 | 20.528 | n/a | n/a | 0.010 | 4.914 | 0.028 | 0.010 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.772ms; driver.publication 1.745ms |
| d4cfd43196e472b800000000000018a4 | 174.743 | 2.685 | n/a | 0.000 | 0.565 | 138.069 | 2.787 | 12.017 | 0.000 | 1.324 | 17.285 | n/a | n/a | 0.011 | 3.250 | 0.019 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.772ms; driver.publication 1.745ms |
| d4cfd43196e472b800000000000018a3 | 174.536 | 3.648 | n/a | 0.000 | 0.588 | 123.933 | 3.386 | 18.752 | 0.000 | 7.476 | 16.730 | n/a | n/a | 0.022 | 4.237 | 0.024 | 0.022 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.745ms; driver.publication 1.445ms |
| d4cfd43196e472b800000000000018a6 | 165.395 | 3.727 | n/a | 0.000 | 0.606 | 118.894 | 1.344 | 16.677 | 0.000 | 0.488 | 23.636 | n/a | n/a | 0.022 | 4.333 | 0.026 | 0.022 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.772ms; driver.publication 1.745ms |
| d4cfd43196e472b80000000000001d8e | 158.842 | 10.632 | n/a | 0.000 | 55.478 | 14.080 | 6.521 | 0.692 | 0.000 | 5.879 | 65.550 | n/a | n/a | 0.010 | 66.110 | 0.416 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.994ms; driver.publication 3.691ms; driver.expected-state.bind-receipt 2.637ms; driver.publication 2.420ms; driver.expected-state.bind-receipt 1.507ms |
| d4cfd43196e472b800000000000018ad | 140.773 | 5.818 | n/a | 0.000 | 99.497 | 3.216 | 7.155 | 0.077 | 0.000 | 0.404 | 24.582 | n/a | n/a | 0.024 | 105.315 | 0.748 | 0.024 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.772ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.expected-state.bind-receipt 1.129ms; driver.publication 1.108ms |
| d4cfd43196e472b800000000000018ae | 122.495 | 46.698 | n/a | 2.985 | 66.019 | 5.963 | 0.635 | 0.166 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.022 | 115.702 | 0.945 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b800000000000018c5 | 120.968 | 2.592 | n/a | 0.000 | 82.009 | 10.366 | 6.487 | 0.079 | 0.259 | 4.891 | 14.275 | n/a | n/a | 0.011 | 84.601 | 0.699 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 4.549ms; driver.publication 1.772ms; driver.publication 1.633ms; driver.expected-state.bind-receipt 1.374ms; driver.expected-state.bind-receipt 1.329ms |
| d4cfd43196e472b80000000000000fa2 | 111.624 | 4.813 | n/a | 0.000 | 68.863 | 1.812 | 2.516 | 0.044 | 0.000 | 0.957 | 32.595 | n/a | n/a | 0.024 | 73.676 | 0.660 | 0.024 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 10.001ms; driver.publication 8.832ms; driver.publication 6.455ms; driver.publication 4.658ms; driver.publication 1.799ms |
| d4cfd43196e472b80000000000000e1a | 109.502 | 6.819 | n/a | 0.000 | 57.629 | 0.914 | 1.272 | 0.033 | 0.000 | 0.622 | 42.203 | n/a | n/a | 0.011 | 64.449 | 0.589 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.921ms; driver.publication 1.490ms; driver.publication 1.452ms; driver.publication 1.298ms; driver.publication 1.109ms |
| d4cfd43196e472b800000000000018c0 | 105.093 | 7.197 | n/a | 0.000 | 54.677 | 4.533 | 6.457 | 0.278 | 0.000 | 0.258 | 31.667 | n/a | n/a | 0.026 | 61.874 | 0.589 | 0.026 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 4.549ms; driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.expected-state.bind-receipt 1.329ms; driver.publication 1.270ms |
| d4cfd43196e472b800000000000018af | 103.511 | 41.502 | n/a | 2.985 | 59.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 103.503 | 1.000 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b800000000000018b0 | 101.489 | 45.142 | n/a | 2.985 | 53.353 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 101.480 | 1.000 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b800000000000018b2 | 98.510 | 63.106 | n/a | 2.985 | 32.406 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 98.498 | 1.000 | 0.013 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b800000000000018b1 | 96.056 | 59.943 | n/a | 2.985 | 33.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 96.051 | 1.000 | 0.006 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b80000000000000fa4 | 91.019 | 4.347 | n/a | 0.000 | 52.931 | 2.869 | 2.517 | 0.042 | 0.000 | 7.724 | 20.575 | n/a | n/a | 0.014 | 57.278 | 0.629 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 10.001ms; driver.publication 6.455ms; driver.publication 4.658ms; driver.publication 3.227ms; driver.publication 1.799ms |
| d4cfd43196e472b80000000000001523 | 90.249 | 8.347 | n/a | 0.000 | 0.802 | 12.526 | 5.101 | 2.695 | 0.000 | 3.676 | 57.075 | n/a | n/a | 0.027 | 9.149 | 0.101 | 0.027 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 3.778ms; driver.expected-state.bind-receipt 1.482ms; driver.publication 1.342ms; driver.publication 1.094ms |
| d4cfd43196e472b80000000000001ad8 | 89.395 | 5.617 | n/a | 0.000 | 34.530 | 0.846 | 2.807 | 0.047 | 0.000 | 0.530 | 45.001 | n/a | n/a | 0.017 | 40.147 | 0.449 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.693ms; driver.publication 1.651ms; driver.publication 1.566ms; driver.expected-state.bind-receipt 1.273ms; driver.publication 1.226ms |
| d4cfd43196e472b80000000000001d88 | 88.911 | 10.528 | n/a | 0.000 | 17.426 | 0.881 | 4.272 | 0.044 | 0.000 | 1.606 | 54.141 | n/a | n/a | 0.014 | 27.954 | 0.314 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 2.484ms |

## P2 / tail / commit / 5-10 facts (1555 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.558 | 3.036 | n/a | 0.000 | 0.732 | 0.810 | 0.786 | 0.029 | 0.000 | 0.459 | 7.465 | n/a | n/a | 0.015 | 3.931 | 0.277 | 0.015 |
| p99 | 83.500 | 27.205 | n/a | 1.824 | 34.530 | 15.311 | 4.916 | 4.914 | 0.000 | 5.274 | 38.574 | n/a | n/a | 0.046 | 43.004 | 1.000 | 0.046 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d4cfd43196e472b800000000000018a4 | 174.743 | 2.685 | n/a | 0.000 | 0.565 | 138.069 | 2.787 | 12.017 | 0.000 | 1.324 | 17.285 | n/a | n/a | 0.011 | 3.250 | 0.019 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.772ms; driver.publication 1.745ms |
| d4cfd43196e472b800000000000018a3 | 174.536 | 3.648 | n/a | 0.000 | 0.588 | 123.933 | 3.386 | 18.752 | 0.000 | 7.476 | 16.730 | n/a | n/a | 0.022 | 4.237 | 0.024 | 0.022 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.745ms; driver.publication 1.445ms |
| d4cfd43196e472b800000000000018a6 | 165.395 | 3.727 | n/a | 0.000 | 0.606 | 118.894 | 1.344 | 16.677 | 0.000 | 0.488 | 23.636 | n/a | n/a | 0.022 | 4.333 | 0.026 | 0.022 | node-14/thread-0/socket.wait-first-byte | client.parse 5.132ms; driver.publication 3.363ms; driver.publication 3.063ms; driver.publication 1.772ms; driver.publication 1.745ms |
| d4cfd43196e472b80000000000001d8e | 158.842 | 10.632 | n/a | 0.000 | 55.478 | 14.080 | 6.521 | 0.692 | 0.000 | 5.879 | 65.550 | n/a | n/a | 0.010 | 66.110 | 0.416 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.994ms; driver.publication 3.691ms; driver.expected-state.bind-receipt 2.637ms; driver.publication 2.420ms; driver.expected-state.bind-receipt 1.507ms |
| d4cfd43196e472b800000000000018c5 | 120.968 | 2.592 | n/a | 0.000 | 82.009 | 10.366 | 6.487 | 0.079 | 0.259 | 4.891 | 14.275 | n/a | n/a | 0.011 | 84.601 | 0.699 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 4.549ms; driver.publication 1.772ms; driver.publication 1.633ms; driver.expected-state.bind-receipt 1.374ms; driver.expected-state.bind-receipt 1.329ms |
| d4cfd43196e472b80000000000000fa2 | 111.624 | 4.813 | n/a | 0.000 | 68.863 | 1.812 | 2.516 | 0.044 | 0.000 | 0.957 | 32.595 | n/a | n/a | 0.024 | 73.676 | 0.660 | 0.024 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 10.001ms; driver.publication 8.832ms; driver.publication 6.455ms; driver.publication 4.658ms; driver.publication 1.799ms |
| d4cfd43196e472b800000000000018af | 103.511 | 41.502 | n/a | 2.985 | 59.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 103.503 | 1.000 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b800000000000018b0 | 101.489 | 45.142 | n/a | 2.985 | 53.353 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 101.480 | 1.000 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b800000000000018b1 | 96.056 | 59.943 | n/a | 2.985 | 33.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 96.051 | 1.000 | 0.006 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.772ms; driver.expected-state.bind-receipt 1.374ms; driver.publication 1.270ms; driver.publication 1.216ms; driver.publication 1.210ms |
| d4cfd43196e472b80000000000000fa4 | 91.019 | 4.347 | n/a | 0.000 | 52.931 | 2.869 | 2.517 | 0.042 | 0.000 | 7.724 | 20.575 | n/a | n/a | 0.014 | 57.278 | 0.629 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 10.001ms; driver.publication 6.455ms; driver.publication 4.658ms; driver.publication 3.227ms; driver.publication 1.799ms |
| d4cfd43196e472b80000000000001523 | 90.249 | 8.347 | n/a | 0.000 | 0.802 | 12.526 | 5.101 | 2.695 | 0.000 | 3.676 | 57.075 | n/a | n/a | 0.027 | 9.149 | 0.101 | 0.027 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 3.778ms; driver.expected-state.bind-receipt 1.482ms; driver.publication 1.342ms; driver.publication 1.094ms |
| d4cfd43196e472b80000000000001ad8 | 89.395 | 5.617 | n/a | 0.000 | 34.530 | 0.846 | 2.807 | 0.047 | 0.000 | 0.530 | 45.001 | n/a | n/a | 0.017 | 40.147 | 0.449 | 0.017 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.693ms; driver.publication 1.651ms; driver.publication 1.566ms; driver.expected-state.bind-receipt 1.273ms; driver.publication 1.226ms |
| d4cfd43196e472b800000000000018a1 | 87.335 | 5.853 | n/a | 0.000 | 9.646 | 0.736 | 1.438 | 9.205 | 22.243 | 13.979 | 24.222 | n/a | n/a | 0.014 | 15.498 | 0.177 | 0.014 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.363ms; driver.publication 1.745ms; driver.publication 1.445ms; driver.expected-state.bind-receipt 1.067ms |
| d4cfd43196e472b80000000000001d8a | 85.275 | 77.576 | n/a | 2.829 | 4.862 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 85.267 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.994ms; driver.publication 3.691ms; driver.expected-state.bind-receipt 2.637ms; driver.publication 1.373ms; driver.publication 0.159ms |
| d4cfd43196e472b8000000000000189e | 84.297 | 81.272 | n/a | 0.000 | 3.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 84.285 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.363ms; driver.publication 1.445ms; driver.publication 0.960ms |
| d4cfd43196e472b80000000000001d89 | 83.500 | 5.472 | n/a | 0.000 | 5.314 | 0.734 | 1.187 | 3.665 | 0.000 | 1.179 | 65.937 | n/a | n/a | 0.013 | 10.786 | 0.129 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.691ms; driver.expected-state.bind-receipt 2.637ms; driver.publication 0.753ms |
| d4cfd43196e472b800000000000014a6 | 82.178 | 2.853 | n/a | 0.000 | 25.942 | 38.731 | 3.486 | 0.013 | 0.000 | 3.190 | 7.950 | n/a | n/a | 0.013 | 28.795 | 0.350 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.467ms; client.parse 1.344ms; driver.publication 1.147ms |
| d4cfd43196e472b80000000000000f99 | 79.216 | 10.660 | n/a | 0.000 | 0.600 | 26.348 | 5.382 | 0.094 | 0.000 | 0.961 | 35.113 | n/a | n/a | 0.057 | 11.260 | 0.142 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 8.832ms; driver.publication 6.455ms; driver.publication 4.658ms; driver.publication 2.976ms |
| d4cfd43196e472b800000000000010a4 | 78.690 | 40.091 | n/a | 4.795 | 33.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 78.681 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.196ms; driver.publication 1.063ms; client.parse 0.388ms |
| d4cfd43196e472b8000000000000189d | 77.854 | 5.203 | n/a | 0.000 | 3.453 | 5.818 | 1.905 | 0.031 | 0.000 | 0.657 | 60.772 | n/a | n/a | 0.015 | 8.656 | 0.111 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication 1.150ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.093 | 0.103 | n/a | 0.000 | 0.000 | 0.967 | 200.548 | 0.009 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.165 | 0.103 | 0.001 | 0.165 |
| p99 | 204.532 | 25.617 | n/a | 1.725 | 0.000 | 5.639 | 201.524 | 0.139 | 21.724 | 0.216 | 0.000 | n/a | n/a | 0.926 | 27.342 | 0.255 | 0.926 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f20000000000000007 | 204.532 | 0.103 | n/a | 0.000 | 0.000 | 1.733 | 201.524 | 0.031 | 0.000 | 0.216 | 0.000 | n/a | n/a | 0.926 | 0.103 | 0.001 | 0.926 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000005 | 202.675 | 0.065 | n/a | 0.000 | 0.000 | 0.967 | 201.146 | 0.017 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.352 | 0.065 | 0.000 | 0.352 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000006 | 202.197 | 0.131 | n/a | 0.000 | 0.000 | 0.933 | 200.905 | 0.016 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.102 | 0.131 | 0.001 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f61 | 201.662 | 0.031 | n/a | 0.000 | 0.000 | 0.423 | 201.040 | 0.010 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.070 | 0.031 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f62 | 201.207 | 0.022 | n/a | 0.000 | 0.000 | 0.407 | 200.660 | 0.005 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.063 | 0.022 | 0.000 | 0.063 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f63 | 201.093 | 0.029 | n/a | 0.000 | 0.000 | 0.399 | 200.548 | 0.009 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.057 | 0.029 | 0.000 | 0.057 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000002 | 173.439 | 1.270 | n/a | 0.000 | 0.000 | 1.521 | 148.456 | 0.139 | 21.724 | 0.090 | 0.000 | n/a | n/a | 0.239 | 1.270 | 0.007 | 0.239 | gw-r/thread-51/gateway.admitted-work | none observed |
| 6b18c0c9c5b093f20000000000000f66 | 107.384 | 25.617 | n/a | 1.725 | 0.000 | 5.639 | 74.228 | 0.005 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.165 | 27.342 | 0.255 | 0.165 | gw-r/thread-52/gateway.admitted-work | none observed |
| 6b18c0c9c5b093f20000000000000f68 | 85.497 | 17.545 | n/a | 1.650 | 0.000 | 2.634 | 63.448 | 0.004 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.205 | 19.195 | 0.225 | 0.205 | gw-r/thread-52/gateway.admitted-work | none observed |
| 6b18c0c9c5b093f20000000000000f67 | 81.447 | 18.872 | n/a | 0.000 | 0.000 | 2.463 | 59.907 | 0.004 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.191 | 18.872 | 0.232 | 0.191 | gw-r/thread-49/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 799.362 | 0.302 | n/a | 0.000 | 0.000 | 0.714 | 787.653 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.270 | 0.302 | 0.000 | 0.270 |
| p99 | 1005.884 | 10.611 | n/a | 0.000 | 0.000 | 1.630 | 1002.132 | 0.021 | 0.000 | 0.445 | 0.000 | n/a | n/a | 1.355 | 10.611 | 0.013 | 1.355 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b00000000000000a4 | 1005.884 | 0.302 | n/a | 0.000 | 0.000 | 1.630 | 1002.132 | 0.021 | 0.000 | 0.445 | 0.000 | n/a | n/a | 1.355 | 0.302 | 0.000 | 1.355 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000000a5 | 799.362 | 10.611 | n/a | 0.000 | 0.000 | 0.714 | 787.653 | 0.013 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.270 | 10.611 | 0.013 | 0.270 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 454.859 | 3.000 | n/a | 0.000 | 0.000 | 0.781 | 435.204 | 0.018 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.105 | 3.000 | 0.008 | 0.105 |
| p99 | 1061.345 | 10.608 | n/a | 0.000 | 0.000 | 58.607 | 1001.432 | 0.477 | 14.903 | 0.303 | 0.000 | n/a | n/a | 1.172 | 10.608 | 0.169 | 1.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b00000000000000d0 | 1061.345 | 0.199 | n/a | 0.000 | 0.000 | 58.607 | 1001.166 | 0.028 | 0.000 | 0.173 | 0.000 | n/a | n/a | 1.172 | 0.199 | 0.000 | 1.172 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b00000000000000bb | 1002.738 | 0.176 | n/a | 0.000 | 0.000 | 0.716 | 1001.432 | 0.023 | 0.000 | 0.303 | 0.000 | n/a | n/a | 0.088 | 0.176 | 0.000 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000000ba | 1001.002 | 2.527 | n/a | 0.000 | 0.000 | 12.274 | 986.014 | 0.018 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.085 | 2.527 | 0.003 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000000b4 | 975.422 | 3.406 | n/a | 0.000 | 0.000 | 0.769 | 970.966 | 0.013 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.124 | 3.406 | 0.003 | 0.124 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000000ae | 962.064 | 3.207 | n/a | 0.000 | 0.000 | 0.806 | 957.723 | 0.018 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.189 | 3.207 | 0.003 | 0.189 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000ab | 797.354 | 2.642 | n/a | 0.000 | 0.000 | 0.433 | 794.074 | 0.016 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.093 | 2.642 | 0.003 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000000b3 | 755.502 | 3.089 | n/a | 0.000 | 0.000 | 4.759 | 747.426 | 0.016 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.081 | 3.089 | 0.004 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000000a8 | 751.681 | 2.540 | n/a | 0.000 | 0.000 | 0.580 | 748.352 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.112 | 2.540 | 0.003 | 0.112 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000c2 | 726.746 | 6.646 | n/a | 0.000 | 0.000 | 0.661 | 719.247 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.139 | 6.646 | 0.009 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000000c9 | 670.147 | 3.024 | n/a | 0.000 | 0.000 | 0.688 | 666.230 | 0.017 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.105 | 3.024 | 0.005 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000000c0 | 651.606 | 2.595 | n/a | 0.000 | 0.000 | 0.693 | 648.115 | 0.021 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.077 | 2.595 | 0.004 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000c7 | 628.862 | 3.145 | n/a | 0.000 | 0.000 | 0.554 | 624.922 | 0.058 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.089 | 3.145 | 0.005 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000000cb | 593.534 | 4.261 | n/a | 0.000 | 0.000 | 0.783 | 587.794 | 0.477 | 0.000 | 0.134 | 0.000 | n/a | n/a | 0.085 | 4.261 | 0.007 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000000a6 | 470.996 | 4.766 | n/a | 0.000 | 0.000 | 0.680 | 465.129 | 0.013 | 0.000 | 0.112 | 0.000 | n/a | n/a | 0.296 | 4.766 | 0.010 | 0.296 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000b6 | 454.859 | 3.756 | n/a | 0.000 | 0.000 | 0.692 | 435.204 | 0.030 | 14.903 | 0.108 | 0.000 | n/a | n/a | 0.167 | 3.756 | 0.008 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000000b9 | 381.405 | 2.808 | n/a | 0.000 | 0.000 | 0.928 | 377.314 | 0.148 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.104 | 2.808 | 0.007 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000c5 | 341.703 | 3.000 | n/a | 0.000 | 0.000 | 0.634 | 337.795 | 0.045 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.105 | 3.000 | 0.009 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000000c8 | 328.741 | 2.666 | n/a | 0.000 | 0.000 | 0.689 | 325.215 | 0.013 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.083 | 2.666 | 0.008 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000c3 | 296.324 | 2.761 | n/a | 0.000 | 0.000 | 3.023 | 290.345 | 0.013 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.086 | 2.761 | 0.009 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000000b1 | 274.957 | 4.446 | n/a | 0.000 | 0.000 | 1.708 | 268.274 | 0.207 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.145 | 4.446 | 0.016 | 0.145 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 343.961 | 4.777 | n/a | 0.601 | 0.000 | 0.941 | 338.202 | 0.020 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.122 | 5.389 | 0.017 | 0.122 |
| p99 | 1006.055 | 18.418 | n/a | 4.367 | 0.000 | 2.914 | 1001.023 | 1.713 | 0.000 | 0.254 | 0.000 | n/a | n/a | 1.122 | 19.222 | 0.881 | 1.122 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b00000000000000d3 | 1006.055 | 5.695 | n/a | 1.079 | 0.000 | 0.586 | 998.504 | 0.017 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.095 | 6.773 | 0.007 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000000d9 | 1004.390 | 3.762 | n/a | 0.574 | 0.000 | 1.038 | 998.273 | 0.081 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.511 | 4.337 | 0.004 | 0.511 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b000000000000010e | 1004.172 | 2.440 | n/a | 0.000 | 0.000 | 2.096 | 999.479 | 0.010 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.070 | 2.440 | 0.002 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000000de | 1003.501 | 0.146 | n/a | 0.000 | 0.000 | 1.069 | 1001.023 | 0.018 | 0.000 | 0.122 | 0.000 | n/a | n/a | 1.122 | 0.146 | 0.000 | 1.122 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000102 | 1000.877 | 5.781 | n/a | 0.000 | 0.000 | 2.110 | 992.708 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.184 | 5.781 | 0.006 | 0.184 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000106 | 992.173 | 2.820 | n/a | 0.680 | 0.000 | 0.772 | 987.567 | 0.164 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.102 | 3.500 | 0.004 | 0.102 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000000da | 975.349 | 4.760 | n/a | 0.608 | 0.000 | 0.589 | 969.165 | 0.016 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.131 | 5.367 | 0.006 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000000e0 | 952.356 | 3.200 | n/a | 0.577 | 0.000 | 0.908 | 947.459 | 0.020 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.096 | 3.777 | 0.004 | 0.096 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b00000000000000d2 | 942.042 | 7.400 | n/a | 1.730 | 0.000 | 1.057 | 931.360 | 0.192 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.212 | 9.130 | 0.010 | 0.212 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000000ff | 930.160 | 7.141 | n/a | 0.601 | 0.000 | 0.650 | 921.281 | 0.175 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.207 | 7.742 | 0.008 | 0.207 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000000e5 | 857.451 | 3.444 | n/a | 0.512 | 0.000 | 0.940 | 852.213 | 0.097 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.114 | 3.956 | 0.005 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b00000000000000e1 | 768.139 | 13.373 | n/a | 1.376 | 0.000 | 1.304 | 751.697 | 0.024 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.255 | 14.750 | 0.019 | 0.255 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000103 | 721.821 | 4.145 | n/a | 0.684 | 0.000 | 0.725 | 715.991 | 0.014 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.157 | 4.829 | 0.007 | 0.157 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000000ec | 599.020 | 2.925 | n/a | 0.000 | 0.000 | 0.635 | 595.289 | 0.014 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.092 | 2.925 | 0.005 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000000e8 | 587.231 | 9.498 | n/a | 1.556 | 0.000 | 0.733 | 574.986 | 0.265 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.108 | 11.054 | 0.019 | 0.108 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000000dd | 553.479 | 5.428 | n/a | 0.720 | 0.000 | 1.169 | 545.609 | 0.149 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.310 | 6.147 | 0.011 | 0.310 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000000fc | 527.012 | 4.710 | n/a | 0.000 | 0.000 | 0.646 | 521.067 | 0.420 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.094 | 4.710 | 0.009 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000000fd | 476.339 | 2.548 | n/a | 0.000 | 0.000 | 2.462 | 471.181 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.082 | 2.548 | 0.005 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000000db | 463.337 | 6.687 | n/a | 0.562 | 0.000 | 1.127 | 454.084 | 0.024 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.737 | 7.249 | 0.016 | 0.737 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000108 | 458.495 | 18.418 | n/a | 0.804 | 0.000 | 1.177 | 437.704 | 0.010 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.278 | 19.222 | 0.042 | 0.278 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (43 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 423.379 | 3.371 | n/a | 0.000 | 0.000 | 0.751 | 419.747 | 0.009 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.094 | 3.500 | 0.009 | 0.094 |
| p99 | 1003.543 | 11.584 | n/a | 0.981 | 0.000 | 4.132 | 1001.077 | 0.513 | 15.008 | 0.142 | 0.000 | n/a | n/a | 1.250 | 12.414 | 0.522 | 1.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b0000000000000139 | 1003.543 | 0.216 | n/a | 0.000 | 0.000 | 0.905 | 1001.072 | 0.011 | 0.000 | 0.088 | 0.000 | n/a | n/a | 1.250 | 0.216 | 0.000 | 1.250 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000000115 | 1003.133 | 0.128 | n/a | 0.000 | 0.000 | 0.705 | 1001.077 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 1.119 | 0.128 | 0.000 | 1.119 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000000127 | 1002.872 | 0.230 | n/a | 0.000 | 0.000 | 0.681 | 1000.710 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.176 | 0.230 | 0.000 | 1.176 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000143 | 1002.610 | 0.128 | n/a | 0.000 | 0.000 | 0.559 | 1000.718 | 0.021 | 0.000 | 0.070 | 0.000 | n/a | n/a | 1.116 | 0.128 | 0.000 | 1.116 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b000000000000012d | 1000.670 | 3.829 | n/a | 0.000 | 0.000 | 0.511 | 996.049 | 0.124 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.086 | 3.829 | 0.004 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b000000000000012c | 1000.337 | 4.223 | n/a | 0.000 | 0.000 | 0.587 | 995.256 | 0.131 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.071 | 4.223 | 0.004 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b000000000000011e | 918.148 | 6.335 | n/a | 0.660 | 0.000 | 0.751 | 895.252 | 0.008 | 15.008 | 0.021 | 0.000 | n/a | n/a | 0.114 | 6.995 | 0.008 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b000000000000014b | 820.619 | 4.481 | n/a | 0.871 | 0.000 | 0.796 | 814.185 | 0.040 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.191 | 5.353 | 0.007 | 0.191 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b000000000000013f | 776.113 | 2.775 | n/a | 0.000 | 0.000 | 0.871 | 772.219 | 0.012 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.094 | 2.775 | 0.004 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000000134 | 772.324 | 3.511 | n/a | 0.000 | 0.000 | 0.510 | 767.956 | 0.130 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.171 | 3.511 | 0.005 | 0.171 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000112 | 767.114 | 2.488 | n/a | 0.742 | 0.000 | 0.782 | 762.875 | 0.009 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.156 | 3.230 | 0.004 | 0.156 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000125 | 732.234 | 2.706 | n/a | 0.000 | 0.000 | 1.474 | 727.687 | 0.232 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.072 | 2.706 | 0.004 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b000000000000012f | 698.687 | 3.742 | n/a | 0.000 | 0.000 | 0.512 | 694.308 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.063 | 3.742 | 0.005 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000129 | 672.360 | 5.071 | n/a | 0.000 | 0.000 | 1.343 | 665.782 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.076 | 5.071 | 0.008 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b000000000000011f | 667.479 | 2.895 | n/a | 0.000 | 0.000 | 1.560 | 662.902 | 0.008 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.065 | 2.895 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000136 | 618.620 | 4.949 | n/a | 0.000 | 0.000 | 0.979 | 611.823 | 0.006 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.804 | 4.949 | 0.008 | 0.804 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b000000000000010f | 615.606 | 2.812 | n/a | 0.688 | 0.000 | 0.743 | 611.110 | 0.011 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.140 | 3.500 | 0.006 | 0.140 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000145 | 571.388 | 5.284 | n/a | 0.618 | 0.000 | 0.450 | 564.875 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.107 | 5.902 | 0.010 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b000000000000011c | 538.191 | 5.980 | n/a | 0.000 | 0.000 | 0.721 | 531.276 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.161 | 5.980 | 0.011 | 0.161 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b000000000000013b | 511.187 | 11.108 | n/a | 0.730 | 0.000 | 0.731 | 498.173 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.371 | 11.838 | 0.023 | 0.371 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 362.680 | 2.954 | n/a | 0.000 | 0.000 | 0.719 | 355.060 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.080 | 2.954 | 0.009 | 0.080 |
| p99 | 1008.299 | 9.082 | n/a | 0.771 | 0.000 | 5.876 | 1001.229 | 3.329 | 0.000 | 0.659 | 0.000 | n/a | n/a | 1.208 | 9.082 | 0.750 | 1.208 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b0000000000000176 | 1008.299 | 0.181 | n/a | 0.000 | 0.000 | 5.876 | 1000.958 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.208 | 0.181 | 0.000 | 1.208 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000000188 | 1003.304 | 0.143 | n/a | 0.000 | 0.000 | 0.724 | 1001.229 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.115 | 0.143 | 0.000 | 1.115 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000000181 | 1002.870 | 5.446 | n/a | 0.000 | 0.000 | 0.805 | 996.386 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.185 | 5.446 | 0.005 | 0.185 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000167 | 1001.090 | 2.605 | n/a | 0.000 | 0.000 | 0.637 | 997.078 | 0.629 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.077 | 2.605 | 0.003 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000000170 | 1000.566 | 2.412 | n/a | 0.000 | 0.000 | 0.587 | 997.459 | 0.006 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.059 | 2.412 | 0.002 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000000187 | 999.699 | 5.893 | n/a | 0.000 | 0.000 | 4.875 | 988.533 | 0.114 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.247 | 5.893 | 0.006 | 0.247 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000000157 | 991.094 | 3.595 | n/a | 0.000 | 0.000 | 5.365 | 981.960 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.100 | 3.595 | 0.004 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b000000000000017c | 861.136 | 2.600 | n/a | 0.000 | 0.000 | 3.527 | 854.884 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.072 | 2.600 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b000000000000015d | 844.104 | 2.963 | n/a | 0.000 | 0.000 | 0.771 | 839.849 | 0.388 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.060 | 2.963 | 0.004 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b0000000000000186 | 700.177 | 2.764 | n/a | 0.000 | 0.000 | 0.508 | 696.777 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.072 | 2.764 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b000000000000016f | 691.605 | 3.645 | n/a | 0.000 | 0.000 | 0.615 | 687.066 | 0.132 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.086 | 3.645 | 0.005 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000158 | 678.633 | 2.121 | n/a | 0.000 | 0.000 | 0.562 | 675.817 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.085 | 2.121 | 0.003 | 0.085 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000179 | 663.566 | 2.690 | n/a | 0.000 | 0.000 | 0.621 | 660.103 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.058 | 2.690 | 0.004 | 0.058 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b000000000000018b | 649.299 | 3.633 | n/a | 0.000 | 0.000 | 0.806 | 644.607 | 0.129 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.072 | 3.633 | 0.006 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b000000000000017f | 648.811 | 5.568 | n/a | 0.000 | 0.000 | 0.719 | 642.050 | 0.115 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.298 | 5.568 | 0.009 | 0.298 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000172 | 617.456 | 2.201 | n/a | 0.000 | 0.000 | 0.604 | 614.536 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.070 | 2.201 | 0.004 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000152 | 537.127 | 2.527 | n/a | 0.000 | 0.000 | 0.571 | 533.761 | 0.115 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.097 | 2.527 | 0.005 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b0000000000000169 | 516.113 | 3.995 | n/a | 0.000 | 0.000 | 0.571 | 511.427 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.076 | 3.995 | 0.008 | 0.076 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000000168 | 481.317 | 6.721 | n/a | 0.000 | 0.000 | 3.770 | 470.040 | 0.004 | 0.000 | 0.659 | 0.000 | n/a | n/a | 0.125 | 6.721 | 0.014 | 0.125 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000155 | 461.122 | 2.807 | n/a | 0.000 | 0.000 | 0.652 | 457.537 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.080 | 2.807 | 0.006 | 0.080 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / internal (50 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 331.870 | 2.938 | n/a | 0.000 | 0.000 | 0.721 | 319.190 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.091 | 2.938 | 0.013 | 0.091 |
| p99 | 1009.100 | 10.966 | n/a | 0.984 | 0.000 | 5.523 | 1001.373 | 0.451 | 20.463 | 0.093 | 0.000 | n/a | n/a | 1.200 | 10.966 | 0.475 | 1.200 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b00000000000001a9 | 1009.100 | 6.626 | n/a | 0.000 | 0.000 | 0.815 | 1001.373 | 0.005 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.218 | 6.626 | 0.007 | 0.218 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b000000000000018d | 1005.072 | 0.232 | n/a | 0.000 | 0.000 | 2.768 | 1000.781 | 0.006 | 0.000 | 0.084 | 0.000 | n/a | n/a | 1.200 | 0.232 | 0.000 | 1.200 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000001c6 | 1001.020 | 2.735 | n/a | 0.000 | 0.000 | 0.502 | 997.637 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.098 | 2.735 | 0.003 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b00000000000001aa | 993.072 | 5.426 | n/a | 0.000 | 0.000 | 0.722 | 986.675 | 0.011 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.198 | 5.426 | 0.005 | 0.198 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000001a7 | 985.710 | 2.685 | n/a | 0.000 | 0.000 | 0.699 | 982.200 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.079 | 2.685 | 0.003 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001c7 | 985.362 | 2.585 | n/a | 0.000 | 0.000 | 0.592 | 981.959 | 0.115 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.060 | 2.585 | 0.003 | 0.060 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b000000000000019d | 965.575 | 2.569 | n/a | 0.000 | 0.000 | 4.699 | 958.173 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.064 | 2.569 | 0.003 | 0.064 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000001c4 | 865.730 | 2.938 | n/a | 0.000 | 0.000 | 0.707 | 861.484 | 0.451 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.058 | 2.938 | 0.003 | 0.058 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001a0 | 826.655 | 10.966 | n/a | 0.000 | 0.000 | 1.455 | 793.478 | 0.009 | 20.463 | 0.058 | 0.000 | n/a | n/a | 0.228 | 10.966 | 0.013 | 0.228 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000001b8 | 750.732 | 4.167 | n/a | 0.000 | 0.000 | 0.780 | 745.607 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.123 | 4.167 | 0.006 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000001d7 | 679.308 | 2.063 | n/a | 0.000 | 0.000 | 0.520 | 676.604 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.074 | 2.063 | 0.003 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000001d0 | 640.167 | 2.723 | n/a | 0.000 | 0.000 | 0.764 | 636.511 | 0.012 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.081 | 2.723 | 0.004 | 0.081 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000001bb | 602.342 | 2.496 | n/a | 0.000 | 0.000 | 3.039 | 596.691 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.076 | 2.496 | 0.004 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000001c8 | 554.378 | 5.804 | n/a | 0.000 | 0.000 | 0.569 | 547.892 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.079 | 5.804 | 0.010 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b000000000000019b | 553.675 | 2.505 | n/a | 0.000 | 0.000 | 1.322 | 549.705 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.093 | 2.505 | 0.005 | 0.093 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001a3 | 552.526 | 4.643 | n/a | 0.000 | 0.000 | 0.615 | 547.121 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.091 | 4.643 | 0.008 | 0.091 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000001d3 | 548.123 | 2.587 | n/a | 0.000 | 0.000 | 0.574 | 544.824 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.079 | 2.587 | 0.005 | 0.079 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000001b2 | 525.449 | 8.220 | n/a | 0.000 | 0.000 | 0.480 | 516.260 | 0.167 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.276 | 8.220 | 0.016 | 0.276 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000001ab | 504.300 | 3.887 | n/a | 0.000 | 0.000 | 5.242 | 494.960 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.171 | 3.887 | 0.008 | 0.171 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b00000000000001a4 | 442.629 | 2.683 | n/a | 0.000 | 0.000 | 0.764 | 438.834 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.290 | 2.683 | 0.006 | 0.290 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 420.732 | 2.927 | n/a | 0.000 | 0.000 | 0.678 | 417.809 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.089 | 2.927 | 0.009 | 0.089 |
| p99 | 1007.045 | 15.288 | n/a | 0.000 | 0.000 | 5.074 | 1000.796 | 0.700 | 0.000 | 0.094 | 0.000 | n/a | n/a | 1.140 | 15.288 | 0.710 | 1.140 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b0000000000000219 | 1007.045 | 0.097 | n/a | 0.000 | 0.000 | 4.937 | 1000.796 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.140 | 0.097 | 0.000 | 1.140 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b00000000000001ec | 1001.178 | 0.112 | n/a | 0.000 | 0.000 | 0.412 | 1000.553 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.050 | 0.112 | 0.000 | 0.050 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000201 | 1000.092 | 3.458 | n/a | 0.000 | 0.000 | 0.919 | 995.563 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.089 | 3.458 | 0.003 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b000000000000021b | 995.462 | 4.260 | n/a | 0.000 | 0.000 | 0.584 | 990.281 | 0.011 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.262 | 4.260 | 0.004 | 0.262 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000000218 | 991.334 | 3.594 | n/a | 0.000 | 0.000 | 0.446 | 987.120 | 0.010 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.115 | 3.594 | 0.004 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000214 | 990.242 | 8.502 | n/a | 0.000 | 0.000 | 1.005 | 980.486 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.193 | 8.502 | 0.009 | 0.193 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b000000000000020a | 975.894 | 6.972 | n/a | 0.000 | 0.000 | 0.802 | 967.910 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.159 | 6.972 | 0.007 | 0.159 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000215 | 953.880 | 15.288 | n/a | 0.000 | 0.000 | 1.107 | 936.636 | 0.537 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.218 | 15.288 | 0.016 | 0.218 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001fa | 912.140 | 2.191 | n/a | 0.000 | 0.000 | 0.467 | 908.757 | 0.574 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.081 | 2.191 | 0.002 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000001f7 | 757.724 | 2.623 | n/a | 0.000 | 0.000 | 0.594 | 754.122 | 0.236 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.060 | 2.623 | 0.003 | 0.060 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001ea | 721.570 | 3.979 | n/a | 0.000 | 0.000 | 1.038 | 716.417 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.081 | 3.979 | 0.006 | 0.081 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000202 | 720.120 | 3.749 | n/a | 0.000 | 0.000 | 0.678 | 715.479 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.173 | 3.749 | 0.005 | 0.173 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000000205 | 679.648 | 5.604 | n/a | 0.000 | 0.000 | 0.525 | 673.332 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.155 | 5.604 | 0.008 | 0.155 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b00000000000001f3 | 652.081 | 2.149 | n/a | 0.000 | 0.000 | 0.546 | 649.271 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.070 | 2.149 | 0.003 | 0.070 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000001df | 604.956 | 3.080 | n/a | 0.000 | 0.000 | 0.682 | 600.930 | 0.141 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.073 | 3.080 | 0.005 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000212 | 587.918 | 5.013 | n/a | 0.000 | 0.000 | 5.074 | 577.628 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.161 | 5.013 | 0.009 | 0.161 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001dc | 548.756 | 2.444 | n/a | 0.000 | 0.000 | 0.647 | 545.537 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.072 | 2.444 | 0.004 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000001f1 | 545.160 | 2.339 | n/a | 0.000 | 0.000 | 0.584 | 542.120 | 0.007 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.066 | 2.339 | 0.004 | 0.066 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b00000000000001dd | 490.690 | 2.547 | n/a | 0.000 | 0.000 | 0.540 | 487.485 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.074 | 2.547 | 0.005 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000001e3 | 466.700 | 7.641 | n/a | 0.000 | 0.000 | 0.818 | 457.970 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.231 | 7.641 | 0.016 | 0.231 | gw-r/thread-53/journal/page | none observed |

## P3 / L1024 / internal (766 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.114 | 3.576 | n/a | 0.000 | 0.000 | 0.594 | 7.870 | 0.007 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.094 | 3.576 | 0.292 | 0.094 |
| p99 | 200.564 | 15.007 | n/a | 1.168 | 0.000 | 4.889 | 196.714 | 0.357 | 0.427 | 0.113 | 0.000 | n/a | n/a | 0.490 | 15.619 | 0.827 | 0.490 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b0000000000000227 | 1007.950 | 4.891 | n/a | 0.000 | 0.000 | 0.840 | 1002.013 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.155 | 4.891 | 0.005 | 0.155 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b000000000000021c | 793.114 | 2.610 | n/a | 0.000 | 0.000 | 0.672 | 789.631 | 0.023 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.112 | 2.610 | 0.003 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000000228 | 765.311 | 2.720 | n/a | 0.000 | 0.000 | 0.485 | 761.950 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.092 | 2.720 | 0.004 | 0.092 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b0000000000000224 | 666.146 | 3.058 | n/a | 0.000 | 0.000 | 3.877 | 658.970 | 0.010 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.176 | 3.058 | 0.005 | 0.176 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b000000000000021f | 643.928 | 4.049 | n/a | 0.000 | 0.000 | 0.719 | 639.009 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.100 | 4.049 | 0.006 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000000225 | 320.291 | 4.827 | n/a | 0.000 | 0.000 | 0.705 | 314.597 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.105 | 4.827 | 0.015 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000000220 | 246.942 | 3.909 | n/a | 0.000 | 0.000 | 0.475 | 242.272 | 0.167 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.083 | 3.909 | 0.016 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b000000000000021d | 200.564 | 2.942 | n/a | 0.000 | 0.000 | 0.718 | 196.714 | 0.011 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.121 | 2.942 | 0.015 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000000222 | 131.308 | 4.270 | n/a | 0.000 | 0.000 | 0.609 | 126.283 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.112 | 4.270 | 0.033 | 0.112 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b00000000000002f3 | 127.811 | 9.499 | n/a | 0.000 | 0.000 | 4.133 | 114.009 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.130 | 9.499 | 0.074 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000004e9 | 110.473 | 7.816 | n/a | 0.000 | 0.000 | 0.659 | 101.871 | 0.002 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.098 | 7.816 | 0.071 | 0.098 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000000310 | 103.878 | 2.869 | n/a | 0.000 | 0.000 | 1.177 | 99.583 | 0.071 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.133 | 2.869 | 0.028 | 0.133 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000635 | 91.617 | 7.365 | n/a | 0.000 | 0.000 | 0.377 | 82.972 | 0.698 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.174 | 7.365 | 0.080 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000410 | 91.219 | 2.512 | n/a | 0.000 | 0.000 | 0.494 | 87.945 | 0.140 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.089 | 2.512 | 0.028 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b00000000000005eb | 87.936 | 3.741 | n/a | 0.000 | 0.000 | 0.582 | 83.486 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.075 | 3.741 | 0.043 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b000000000000075e | 87.001 | 2.780 | n/a | 0.000 | 0.000 | 1.850 | 82.129 | 0.134 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.080 | 2.780 | 0.032 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b00000000000007a4 | 84.658 | 4.114 | n/a | 0.000 | 0.000 | 0.538 | 79.785 | 0.099 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.103 | 4.114 | 0.049 | 0.103 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b00000000000004f2 | 83.599 | 5.092 | n/a | 0.000 | 0.000 | 0.539 | 77.614 | 0.081 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.215 | 5.092 | 0.061 | 0.215 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000000791 | 82.438 | 15.619 | n/a | 0.000 | 0.000 | 0.810 | 65.639 | 0.100 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.236 | 15.619 | 0.189 | 0.236 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b000000000000082a | 80.288 | 8.594 | n/a | 0.000 | 0.000 | 0.669 | 70.685 | 0.079 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.224 | 8.594 | 0.107 | 0.224 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / internal (2338 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.106 | 4.220 | n/a | 0.000 | 0.000 | 0.535 | 6.780 | 0.006 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.100 | 4.237 | 0.365 | 0.100 |
| p99 | 329.085 | 16.197 | n/a | 1.656 | 0.000 | 4.883 | 324.124 | 0.313 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.397 | 17.601 | 0.860 | 1.397 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 69d1000358ee376b0000000000001af0 | 1003.740 | 0.474 | n/a | 0.000 | 0.000 | 1.081 | 1000.684 | 0.006 | 0.000 | 0.093 | 0.000 | n/a | n/a | 1.403 | 0.474 | 0.000 | 1.403 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000001b1a | 1002.882 | 0.218 | n/a | 0.000 | 0.000 | 0.646 | 1000.813 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.148 | 0.218 | 0.000 | 1.148 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000001ad7 | 1001.286 | 2.251 | n/a | 0.000 | 0.000 | 0.372 | 998.574 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.056 | 2.251 | 0.002 | 0.056 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000001ace | 1001.014 | 2.535 | n/a | 0.000 | 0.000 | 0.592 | 997.670 | 0.109 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.056 | 2.535 | 0.003 | 0.056 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000001acd | 997.796 | 2.422 | n/a | 0.000 | 0.000 | 0.370 | 994.902 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.063 | 2.422 | 0.002 | 0.063 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000001b16 | 994.243 | 3.382 | n/a | 0.000 | 0.000 | 0.486 | 990.104 | 0.109 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.104 | 3.382 | 0.003 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000001b12 | 987.705 | 3.502 | n/a | 0.000 | 0.000 | 0.407 | 983.645 | 0.009 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.105 | 3.502 | 0.004 | 0.105 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000001ad2 | 866.871 | 5.049 | n/a | 0.000 | 0.000 | 0.510 | 861.156 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.125 | 5.049 | 0.006 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000001ae1 | 864.290 | 5.089 | n/a | 0.000 | 0.000 | 0.412 | 858.494 | 0.091 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.177 | 5.089 | 0.006 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000001af4 | 850.681 | 3.406 | n/a | 0.000 | 0.000 | 0.535 | 846.624 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.078 | 3.406 | 0.004 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 69d1000358ee376b0000000000001acf | 795.499 | 10.586 | n/a | 0.000 | 0.000 | 6.291 | 778.336 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.243 | 10.586 | 0.013 | 0.243 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000001aec | 700.070 | 2.443 | n/a | 0.000 | 0.000 | 0.419 | 697.091 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.077 | 2.443 | 0.003 | 0.077 | gw-r/thread-50/journal/page | none observed |
| 69d1000358ee376b0000000000001b13 | 691.744 | 3.701 | n/a | 0.000 | 0.000 | 0.587 | 686.939 | 0.312 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.138 | 3.701 | 0.005 | 0.138 | gw-r/thread-52/journal/page | none observed |
| 69d1000358ee376b0000000000001ae7 | 684.480 | 9.271 | n/a | 0.878 | 0.000 | 0.577 | 673.514 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.206 | 10.149 | 0.015 | 0.206 | gw-r/thread-51/journal/page | none observed |
| 69d1000358ee376b0000000000001b0b | 597.290 | 3.234 | n/a | 0.000 | 0.000 | 0.404 | 593.480 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.129 | 3.234 | 0.005 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b0000000000001b01 | 525.995 | 3.220 | n/a | 0.000 | 0.000 | 0.479 | 522.187 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.074 | 3.220 | 0.006 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 69d1000358ee376b0000000000001ad8 | 522.289 | 1.855 | n/a | 0.000 | 0.000 | 0.400 | 519.798 | 0.092 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.100 | 1.855 | 0.004 | 0.100 | gw-r/thread-53/journal/page | none observed |
| 69d1000358ee376b0000000000001b0d | 519.604 | 3.449 | n/a | 0.000 | 0.000 | 5.485 | 510.501 | 0.005 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.123 | 3.449 | 0.007 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000001af5 | 495.687 | 10.715 | n/a | 1.505 | 0.000 | 0.561 | 482.528 | 0.009 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.299 | 12.220 | 0.025 | 0.299 | gw-r/thread-48/journal/page | none observed |
| 69d1000358ee376b0000000000001b0e | 457.924 | 8.967 | n/a | 0.000 | 0.000 | 0.955 | 447.800 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.146 | 8.967 | 0.020 | 0.146 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.121 | 0.046 | n/a | 0.000 | 0.000 | 0.843 | 201.003 | 0.017 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.088 | 0.046 | 0.000 | 0.088 |
| p99 | 206.356 | 0.150 | n/a | 0.000 | 0.000 | 4.313 | 202.109 | 1.551 | 0.000 | 0.511 | 0.000 | n/a | n/a | 0.294 | 0.150 | 0.001 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f20000000000000030 | 206.356 | 0.036 | n/a | 0.000 | 0.000 | 3.879 | 202.109 | 0.024 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.088 | 0.036 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000031 | 205.326 | 0.039 | n/a | 0.000 | 0.000 | 3.552 | 201.386 | 0.021 | 0.000 | 0.245 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000001f | 204.656 | 0.032 | n/a | 0.000 | 0.000 | 3.649 | 200.766 | 0.014 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.071 | 0.032 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000008 | 203.455 | 0.058 | n/a | 0.000 | 0.000 | 1.427 | 201.606 | 0.059 | 0.000 | 0.193 | 0.000 | n/a | n/a | 0.114 | 0.058 | 0.000 | 0.114 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000059 | 203.271 | 0.057 | n/a | 0.000 | 0.000 | 1.193 | 201.640 | 0.024 | 0.000 | 0.226 | 0.000 | n/a | n/a | 0.131 | 0.057 | 0.000 | 0.131 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000038 | 203.019 | 0.150 | n/a | 0.000 | 0.000 | 1.275 | 201.117 | 0.013 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.294 | 0.150 | 0.001 | 0.294 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000035 | 203.012 | 0.036 | n/a | 0.000 | 0.000 | 0.933 | 201.637 | 0.040 | 0.000 | 0.279 | 0.000 | n/a | n/a | 0.086 | 0.036 | 0.000 | 0.086 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000021 | 202.846 | 0.049 | n/a | 0.000 | 0.000 | 1.228 | 201.218 | 0.018 | 0.000 | 0.228 | 0.000 | n/a | n/a | 0.106 | 0.049 | 0.000 | 0.106 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000042 | 202.817 | 0.105 | n/a | 0.000 | 0.000 | 0.994 | 201.356 | 0.023 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.135 | 0.105 | 0.001 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000000a | 202.797 | 0.066 | n/a | 0.000 | 0.000 | 0.902 | 201.428 | 0.043 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.136 | 0.066 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000000d | 202.784 | 0.045 | n/a | 0.000 | 0.000 | 0.684 | 201.765 | 0.017 | 0.000 | 0.198 | 0.000 | n/a | n/a | 0.075 | 0.045 | 0.000 | 0.075 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000004a | 202.752 | 0.079 | n/a | 0.000 | 0.000 | 1.296 | 201.048 | 0.016 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.184 | 0.079 | 0.000 | 0.184 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000001a | 202.713 | 0.054 | n/a | 0.000 | 0.000 | 1.126 | 201.218 | 0.013 | 0.000 | 0.212 | 0.000 | n/a | n/a | 0.089 | 0.054 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000045 | 202.620 | 0.055 | n/a | 0.000 | 0.000 | 0.960 | 201.287 | 0.023 | 0.000 | 0.152 | 0.000 | n/a | n/a | 0.142 | 0.055 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000022 | 202.587 | 0.051 | n/a | 0.000 | 0.000 | 1.131 | 201.066 | 0.016 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.152 | 0.051 | 0.000 | 0.152 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000058 | 202.573 | 0.033 | n/a | 0.000 | 0.000 | 0.576 | 201.646 | 0.025 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.070 | 0.033 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000019 | 202.566 | 0.042 | n/a | 0.000 | 0.000 | 0.767 | 201.421 | 0.031 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.114 | 0.042 | 0.000 | 0.114 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000053 | 202.563 | 0.063 | n/a | 0.000 | 0.000 | 1.186 | 201.040 | 0.016 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.115 | 0.063 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000014 | 202.543 | 0.052 | n/a | 0.000 | 0.000 | 0.724 | 201.063 | 0.030 | 0.000 | 0.511 | 0.000 | n/a | n/a | 0.163 | 0.052 | 0.000 | 0.163 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000015 | 202.528 | 0.052 | n/a | 0.000 | 0.000 | 0.816 | 201.344 | 0.072 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.111 | 0.052 | 0.000 | 0.111 | gw-r/thread-52/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.907 | 0.048 | n/a | 0.000 | 0.000 | 0.798 | 200.845 | 0.016 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.089 | 0.048 | 0.000 | 0.089 |
| p99 | 209.815 | 0.133 | n/a | 0.000 | 0.000 | 2.308 | 208.254 | 3.710 | 0.000 | 0.324 | 0.000 | n/a | n/a | 0.194 | 0.133 | 0.002 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f2000000000000007d | 209.815 | 0.053 | n/a | 0.000 | 0.000 | 1.217 | 208.254 | 0.040 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.121 | 0.053 | 0.000 | 0.121 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000069 | 204.215 | 0.075 | n/a | 0.000 | 0.000 | 1.805 | 201.770 | 0.048 | 0.000 | 0.324 | 0.000 | n/a | n/a | 0.194 | 0.075 | 0.000 | 0.194 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000090 | 203.836 | 0.062 | n/a | 0.000 | 0.000 | 1.110 | 202.405 | 0.014 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.154 | 0.062 | 0.000 | 0.154 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000082 | 203.788 | 0.046 | n/a | 0.000 | 0.000 | 2.308 | 201.166 | 0.024 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.073 | 0.046 | 0.000 | 0.073 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000005f | 203.080 | 0.063 | n/a | 0.000 | 0.000 | 1.233 | 201.404 | 0.031 | 0.000 | 0.221 | 0.000 | n/a | n/a | 0.128 | 0.063 | 0.000 | 0.128 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000009c | 202.931 | 0.057 | n/a | 0.000 | 0.000 | 1.382 | 201.147 | 0.027 | 0.000 | 0.158 | 0.000 | n/a | n/a | 0.160 | 0.057 | 0.000 | 0.160 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000089 | 202.910 | 0.054 | n/a | 0.000 | 0.000 | 0.798 | 201.685 | 0.065 | 0.000 | 0.161 | 0.000 | n/a | n/a | 0.147 | 0.054 | 0.000 | 0.147 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000083 | 202.896 | 0.053 | n/a | 0.000 | 0.000 | 1.003 | 201.493 | 0.025 | 0.000 | 0.232 | 0.000 | n/a | n/a | 0.090 | 0.053 | 0.000 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000072 | 202.832 | 0.033 | n/a | 0.000 | 0.000 | 1.852 | 200.752 | 0.015 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.072 | 0.033 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000a7 | 202.729 | 0.062 | n/a | 0.000 | 0.000 | 0.959 | 201.444 | 0.026 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.112 | 0.062 | 0.000 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000006e | 202.654 | 0.041 | n/a | 0.000 | 0.000 | 0.954 | 201.379 | 0.023 | 0.000 | 0.175 | 0.000 | n/a | n/a | 0.082 | 0.041 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000085 | 202.653 | 0.055 | n/a | 0.000 | 0.000 | 0.833 | 201.323 | 0.051 | 0.000 | 0.298 | 0.000 | n/a | n/a | 0.093 | 0.055 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000008b | 202.625 | 0.064 | n/a | 0.000 | 0.000 | 1.202 | 201.033 | 0.021 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.169 | 0.064 | 0.000 | 0.169 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000060 | 202.607 | 0.053 | n/a | 0.000 | 0.000 | 1.012 | 201.208 | 0.016 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.146 | 0.053 | 0.000 | 0.146 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000078 | 202.559 | 0.041 | n/a | 0.000 | 0.000 | 0.926 | 201.313 | 0.027 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.087 | 0.041 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000008f | 202.553 | 0.046 | n/a | 0.000 | 0.000 | 0.690 | 201.495 | 0.090 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.091 | 0.046 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000005e | 202.549 | 0.043 | n/a | 0.000 | 0.000 | 0.668 | 201.512 | 0.024 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.111 | 0.043 | 0.000 | 0.111 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000084 | 202.493 | 0.055 | n/a | 0.000 | 0.000 | 1.030 | 201.130 | 0.021 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.119 | 0.055 | 0.000 | 0.119 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000088 | 202.449 | 0.054 | n/a | 0.000 | 0.000 | 1.007 | 201.100 | 0.015 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.137 | 0.054 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000b6 | 202.388 | 0.037 | n/a | 0.000 | 0.000 | 0.788 | 201.334 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.082 | 0.037 | 0.000 | 0.082 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.803 | 0.045 | n/a | 0.000 | 0.000 | 0.743 | 200.883 | 0.010 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.084 | 0.045 | 0.000 | 0.084 |
| p99 | 220.269 | 0.143 | n/a | 0.000 | 0.000 | 3.062 | 204.223 | 4.949 | 15.008 | 0.213 | 0.000 | n/a | n/a | 0.163 | 0.143 | 0.002 | 0.163 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f200000000000000df | 220.269 | 0.042 | n/a | 0.000 | 0.000 | 0.806 | 204.223 | 0.009 | 15.008 | 0.092 | 0.000 | n/a | n/a | 0.089 | 0.042 | 0.000 | 0.089 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000d8 | 205.112 | 0.074 | n/a | 0.000 | 0.000 | 1.589 | 203.249 | 0.020 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.078 | 0.074 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000f9 | 204.390 | 0.047 | n/a | 0.000 | 0.000 | 3.062 | 201.068 | 0.009 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.090 | 0.047 | 0.000 | 0.090 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000f1 | 203.271 | 0.059 | n/a | 0.000 | 0.000 | 0.897 | 201.933 | 0.022 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.147 | 0.059 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000cd | 203.078 | 0.050 | n/a | 0.000 | 0.000 | 1.122 | 201.620 | 0.018 | 0.000 | 0.176 | 0.000 | n/a | n/a | 0.092 | 0.050 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000012c | 203.058 | 0.069 | n/a | 0.000 | 0.000 | 0.808 | 201.851 | 0.044 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.132 | 0.069 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000ce | 202.939 | 0.045 | n/a | 0.000 | 0.000 | 0.944 | 201.645 | 0.013 | 0.000 | 0.200 | 0.000 | n/a | n/a | 0.093 | 0.045 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000f2 | 202.758 | 0.081 | n/a | 0.000 | 0.000 | 1.186 | 201.205 | 0.014 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.145 | 0.081 | 0.000 | 0.145 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000f3 | 202.654 | 0.072 | n/a | 0.000 | 0.000 | 0.977 | 201.329 | 0.018 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.157 | 0.072 | 0.000 | 0.157 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000e1 | 202.593 | 0.034 | n/a | 0.000 | 0.000 | 0.809 | 201.490 | 0.027 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.066 | 0.034 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000cc | 202.580 | 0.034 | n/a | 0.000 | 0.000 | 1.273 | 201.058 | 0.012 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000105 | 202.575 | 0.056 | n/a | 0.000 | 0.000 | 0.870 | 201.378 | 0.010 | 0.000 | 0.123 | 0.000 | n/a | n/a | 0.138 | 0.056 | 0.000 | 0.138 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000d4 | 202.507 | 0.059 | n/a | 0.000 | 0.000 | 1.009 | 201.163 | 0.012 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.163 | 0.059 | 0.000 | 0.163 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000109 | 202.447 | 0.044 | n/a | 0.000 | 0.000 | 0.543 | 201.646 | 0.012 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.083 | 0.044 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000120 | 202.420 | 0.039 | n/a | 0.000 | 0.000 | 0.743 | 201.417 | 0.012 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.099 | 0.039 | 0.000 | 0.099 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000f6 | 202.403 | 0.053 | n/a | 0.000 | 0.000 | 0.938 | 201.136 | 0.007 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.089 | 0.053 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000d3 | 202.386 | 0.043 | n/a | 0.000 | 0.000 | 0.735 | 201.401 | 0.013 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.085 | 0.043 | 0.000 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000119 | 202.379 | 0.061 | n/a | 0.000 | 0.000 | 0.962 | 201.107 | 0.007 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.155 | 0.061 | 0.000 | 0.155 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000e4 | 202.330 | 0.044 | n/a | 0.000 | 0.000 | 0.648 | 201.334 | 0.040 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.084 | 0.044 | 0.000 | 0.084 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000000ed | 202.253 | 0.039 | n/a | 0.000 | 0.000 | 0.898 | 201.073 | 0.042 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.075 | 0.039 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.738 | 0.050 | n/a | 0.000 | 0.000 | 0.704 | 200.860 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.085 | 0.050 | 0.000 | 0.085 |
| p99 | 204.622 | 0.169 | n/a | 0.000 | 0.000 | 1.105 | 203.493 | 2.132 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.217 | 0.169 | 0.001 | 0.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f20000000000000140 | 204.622 | 0.049 | n/a | 0.000 | 0.000 | 0.927 | 203.493 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.076 | 0.049 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000013e | 202.847 | 0.063 | n/a | 0.000 | 0.000 | 0.938 | 201.567 | 0.037 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.126 | 0.063 | 0.000 | 0.126 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000013d | 202.622 | 0.169 | n/a | 0.000 | 0.000 | 1.021 | 201.143 | 0.007 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.198 | 0.169 | 0.001 | 0.198 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000190 | 202.426 | 0.049 | n/a | 0.000 | 0.000 | 0.915 | 201.270 | 0.032 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.087 | 0.049 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000171 | 202.407 | 0.056 | n/a | 0.000 | 0.000 | 0.838 | 201.313 | 0.007 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.094 | 0.056 | 0.000 | 0.094 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000156 | 202.352 | 0.064 | n/a | 0.000 | 0.000 | 1.105 | 200.960 | 0.007 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.135 | 0.064 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000017c | 202.350 | 0.049 | n/a | 0.000 | 0.000 | 0.724 | 201.323 | 0.012 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.110 | 0.049 | 0.000 | 0.110 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000153 | 202.307 | 0.042 | n/a | 0.000 | 0.000 | 0.609 | 201.482 | 0.015 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.077 | 0.042 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000154 | 202.301 | 0.069 | n/a | 0.000 | 0.000 | 1.042 | 200.939 | 0.013 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.150 | 0.069 | 0.000 | 0.150 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000177 | 202.271 | 0.100 | n/a | 0.000 | 0.000 | 0.996 | 200.955 | 0.006 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.134 | 0.100 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000151 | 202.269 | 0.039 | n/a | 0.000 | 0.000 | 0.557 | 201.462 | 0.011 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.080 | 0.039 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000015b | 202.258 | 0.054 | n/a | 0.000 | 0.000 | 0.756 | 201.250 | 0.015 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.098 | 0.054 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000155 | 202.229 | 0.072 | n/a | 0.000 | 0.000 | 0.820 | 201.090 | 0.038 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.128 | 0.072 | 0.000 | 0.128 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000134 | 202.208 | 0.034 | n/a | 0.000 | 0.000 | 0.697 | 201.306 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.068 | 0.034 | 0.000 | 0.068 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000141 | 202.202 | 0.107 | n/a | 0.000 | 0.000 | 0.927 | 200.988 | 0.006 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.092 | 0.107 | 0.001 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000139 | 202.176 | 0.064 | n/a | 0.000 | 0.000 | 0.885 | 200.965 | 0.009 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.157 | 0.064 | 0.000 | 0.157 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000188 | 202.175 | 0.056 | n/a | 0.000 | 0.000 | 0.764 | 201.156 | 0.010 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.104 | 0.056 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000017d | 202.144 | 0.074 | n/a | 0.000 | 0.000 | 1.001 | 200.879 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.126 | 0.074 | 0.000 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000144 | 202.140 | 0.042 | n/a | 0.000 | 0.000 | 0.720 | 201.204 | 0.008 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.085 | 0.042 | 0.000 | 0.085 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000168 | 202.127 | 0.054 | n/a | 0.000 | 0.000 | 0.889 | 200.948 | 0.007 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.145 | 0.054 | 0.000 | 0.145 | gw-r/thread-51/journal/page | none observed |

## P3 / L64 / read (107 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.565 | 0.049 | n/a | 0.000 | 0.000 | 0.676 | 200.739 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.083 | 0.049 | 0.000 | 0.083 |
| p99 | 203.091 | 0.114 | n/a | 0.000 | 0.000 | 1.506 | 202.047 | 2.717 | 9.827 | 0.119 | 0.000 | n/a | n/a | 0.154 | 0.114 | 0.001 | 0.154 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f200000000000001b0 | 218.666 | 0.054 | n/a | 0.000 | 0.000 | 0.641 | 207.957 | 0.006 | 9.827 | 0.060 | 0.000 | n/a | n/a | 0.121 | 0.054 | 0.000 | 0.121 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001b1 | 203.091 | 0.050 | n/a | 0.000 | 0.000 | 1.011 | 191.355 | 0.038 | 10.367 | 0.161 | 0.000 | n/a | n/a | 0.110 | 0.050 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001f9 | 203.064 | 0.048 | n/a | 0.000 | 0.000 | 0.768 | 202.047 | 0.025 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.114 | 0.048 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001a6 | 202.935 | 0.047 | n/a | 0.000 | 0.000 | 0.865 | 201.870 | 0.014 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.083 | 0.047 | 0.000 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000019e | 202.598 | 0.056 | n/a | 0.000 | 0.000 | 0.814 | 201.462 | 0.011 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.135 | 0.056 | 0.000 | 0.135 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001b7 | 202.491 | 0.045 | n/a | 0.000 | 0.000 | 1.506 | 200.763 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.045 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001bd | 202.438 | 0.039 | n/a | 0.000 | 0.000 | 0.646 | 201.557 | 0.015 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.071 | 0.039 | 0.000 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000201 | 202.284 | 0.053 | n/a | 0.000 | 0.000 | 0.964 | 201.096 | 0.006 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.094 | 0.053 | 0.000 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001c4 | 202.235 | 0.035 | n/a | 0.000 | 0.000 | 0.603 | 201.377 | 0.064 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.077 | 0.035 | 0.000 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001de | 202.234 | 0.066 | n/a | 0.000 | 0.000 | 1.046 | 200.906 | 0.007 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.137 | 0.066 | 0.000 | 0.137 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000019a | 202.191 | 0.062 | n/a | 0.000 | 0.000 | 0.858 | 201.112 | 0.010 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.074 | 0.062 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001c5 | 202.176 | 0.056 | n/a | 0.000 | 0.000 | 0.979 | 200.977 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.083 | 0.056 | 0.000 | 0.083 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001ac | 202.159 | 0.056 | n/a | 0.000 | 0.000 | 0.886 | 201.000 | 0.007 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.133 | 0.056 | 0.000 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001a7 | 202.077 | 0.051 | n/a | 0.000 | 0.000 | 0.650 | 201.183 | 0.011 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.087 | 0.051 | 0.000 | 0.087 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001d1 | 202.067 | 0.057 | n/a | 0.000 | 0.000 | 0.893 | 200.913 | 0.006 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.125 | 0.057 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001a9 | 202.060 | 0.042 | n/a | 0.000 | 0.000 | 0.647 | 201.179 | 0.018 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.101 | 0.042 | 0.000 | 0.101 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000197 | 201.982 | 0.056 | n/a | 0.000 | 0.000 | 0.919 | 200.829 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.056 | 0.000 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001d3 | 201.957 | 0.045 | n/a | 0.000 | 0.000 | 0.759 | 200.983 | 0.007 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.089 | 0.045 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f200000000000001ea | 201.947 | 0.056 | n/a | 0.000 | 0.000 | 1.038 | 200.683 | 0.005 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.111 | 0.056 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000205 | 201.944 | 0.037 | n/a | 0.000 | 0.000 | 0.739 | 201.018 | 0.013 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.071 | 0.037 | 0.000 | 0.071 | gw-r/thread-53/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.612 | 0.045 | n/a | 0.000 | 0.000 | 0.667 | 200.766 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.072 | 0.045 | 0.000 | 0.072 |
| p99 | 203.092 | 0.142 | n/a | 0.000 | 0.000 | 1.354 | 201.547 | 3.213 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.229 | 0.142 | 0.001 | 0.229 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f20000000000000269 | 203.281 | 0.142 | n/a | 0.000 | 0.000 | 1.216 | 201.547 | 0.017 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.229 | 0.142 | 0.001 | 0.229 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000026b | 203.092 | 0.062 | n/a | 0.000 | 0.000 | 1.647 | 201.156 | 0.007 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.131 | 0.062 | 0.000 | 0.131 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000238 | 202.480 | 0.061 | n/a | 0.000 | 0.000 | 1.046 | 201.152 | 0.009 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.113 | 0.061 | 0.000 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000276 | 202.446 | 0.058 | n/a | 0.000 | 0.000 | 0.920 | 201.097 | 0.007 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.285 | 0.058 | 0.000 | 0.285 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000272 | 202.416 | 0.055 | n/a | 0.000 | 0.000 | 0.766 | 201.365 | 0.014 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.086 | 0.055 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000021b | 202.414 | 0.034 | n/a | 0.000 | 0.000 | 0.533 | 201.723 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.063 | 0.034 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000024d | 202.352 | 0.072 | n/a | 0.000 | 0.000 | 0.968 | 201.070 | 0.017 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.137 | 0.072 | 0.000 | 0.137 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000219 | 202.272 | 0.065 | n/a | 0.000 | 0.000 | 0.890 | 201.069 | 0.007 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.141 | 0.065 | 0.000 | 0.141 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000230 | 202.269 | 0.043 | n/a | 0.000 | 0.000 | 0.810 | 201.229 | 0.007 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000249 | 202.244 | 0.064 | n/a | 0.000 | 0.000 | 0.821 | 201.118 | 0.007 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.132 | 0.064 | 0.000 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000025c | 202.199 | 0.045 | n/a | 0.000 | 0.000 | 0.823 | 201.105 | 0.016 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.072 | 0.045 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000273 | 202.199 | 0.040 | n/a | 0.000 | 0.000 | 0.848 | 201.152 | 0.009 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.069 | 0.040 | 0.000 | 0.069 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000023c | 202.182 | 0.041 | n/a | 0.000 | 0.000 | 0.677 | 201.303 | 0.009 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.067 | 0.041 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000245 | 202.161 | 0.042 | n/a | 0.000 | 0.000 | 1.027 | 200.938 | 0.006 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.073 | 0.042 | 0.000 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000224 | 202.136 | 0.057 | n/a | 0.000 | 0.000 | 0.707 | 201.178 | 0.010 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.090 | 0.057 | 0.000 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000021f | 202.108 | 0.048 | n/a | 0.000 | 0.000 | 0.847 | 201.010 | 0.007 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.108 | 0.048 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000279 | 202.108 | 0.043 | n/a | 0.000 | 0.000 | 0.612 | 201.270 | 0.016 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.074 | 0.043 | 0.000 | 0.074 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000023e | 202.094 | 0.044 | n/a | 0.000 | 0.000 | 0.574 | 201.279 | 0.012 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.080 | 0.044 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000213 | 202.059 | 0.052 | n/a | 0.000 | 0.000 | 0.797 | 200.998 | 0.007 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.122 | 0.052 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000221 | 202.000 | 0.063 | n/a | 0.000 | 0.000 | 0.833 | 200.927 | 0.007 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.093 | 0.063 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / read (68 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.604 | 0.053 | n/a | 0.000 | 0.000 | 0.614 | 71.712 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.079 | 0.053 | 0.001 | 0.079 |
| p99 | 205.542 | 0.121 | n/a | 0.000 | 0.000 | 9.103 | 202.342 | 5.927 | 0.427 | 0.101 | 0.000 | n/a | n/a | 0.181 | 0.121 | 0.002 | 0.181 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f20000000000000291 | 205.542 | 0.044 | n/a | 0.000 | 0.000 | 2.985 | 202.342 | 0.011 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.079 | 0.044 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000298 | 202.370 | 0.064 | n/a | 0.000 | 0.000 | 0.776 | 201.312 | 0.015 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.102 | 0.064 | 0.000 | 0.102 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000280 | 202.355 | 0.046 | n/a | 0.000 | 0.000 | 0.826 | 201.269 | 0.017 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.113 | 0.046 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000282 | 202.151 | 0.049 | n/a | 0.000 | 0.000 | 0.719 | 201.176 | 0.011 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.107 | 0.049 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000028c | 202.038 | 0.078 | n/a | 0.000 | 0.000 | 0.589 | 201.177 | 0.020 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.080 | 0.078 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000296 | 202.025 | 0.045 | n/a | 0.000 | 0.000 | 0.741 | 201.063 | 0.011 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000281 | 201.994 | 0.052 | n/a | 0.000 | 0.000 | 0.772 | 201.006 | 0.011 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.086 | 0.052 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000288 | 201.914 | 0.048 | n/a | 0.000 | 0.000 | 0.863 | 200.858 | 0.006 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.080 | 0.048 | 0.000 | 0.080 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000293 | 201.887 | 0.062 | n/a | 0.000 | 0.000 | 0.844 | 200.791 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.120 | 0.062 | 0.000 | 0.120 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000292 | 201.854 | 0.051 | n/a | 0.000 | 0.000 | 0.822 | 200.811 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.096 | 0.051 | 0.000 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000297 | 201.853 | 0.053 | n/a | 0.000 | 0.000 | 0.754 | 200.844 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.127 | 0.053 | 0.000 | 0.127 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000028b | 201.794 | 0.044 | n/a | 0.000 | 0.000 | 0.750 | 200.793 | 0.007 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.126 | 0.044 | 0.000 | 0.126 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000028f | 201.756 | 0.036 | n/a | 0.000 | 0.000 | 0.654 | 200.911 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000286 | 201.633 | 0.042 | n/a | 0.000 | 0.000 | 0.595 | 200.845 | 0.007 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.075 | 0.042 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000285 | 201.619 | 0.074 | n/a | 0.000 | 0.000 | 0.657 | 200.668 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.149 | 0.074 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000028d | 201.515 | 0.032 | n/a | 0.000 | 0.000 | 0.524 | 200.821 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.066 | 0.032 | 0.000 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000294 | 201.490 | 0.043 | n/a | 0.000 | 0.000 | 0.559 | 200.745 | 0.010 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.072 | 0.043 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000284 | 198.032 | 0.041 | n/a | 0.000 | 0.000 | 0.674 | 196.396 | 0.810 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.065 | 0.041 | 0.000 | 0.065 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000287 | 195.407 | 0.070 | n/a | 0.000 | 0.000 | 0.688 | 194.535 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.080 | 0.070 | 0.000 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f2000000000000028a | 127.234 | 0.047 | n/a | 0.000 | 0.000 | 0.488 | 126.556 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.072 | 0.047 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |

## P3 / tail / read (213 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 86.577 | 0.042 | n/a | 0.000 | 0.000 | 0.533 | 85.000 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.072 | 0.042 | 0.001 | 0.072 |
| p99 | 202.261 | 0.098 | n/a | 0.000 | 0.000 | 1.619 | 201.325 | 1.226 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.167 | 0.098 | 0.002 | 0.167 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b18c0c9c5b093f20000000000000f22 | 202.959 | 0.055 | n/a | 0.000 | 0.000 | 1.165 | 201.469 | 0.025 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.131 | 0.055 | 0.000 | 0.131 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f48 | 202.366 | 0.064 | n/a | 0.000 | 0.000 | 0.829 | 201.157 | 0.011 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.140 | 0.064 | 0.000 | 0.140 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f28 | 202.261 | 0.033 | n/a | 0.000 | 0.000 | 0.706 | 201.389 | 0.006 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.059 | 0.033 | 0.000 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f58 | 202.180 | 0.039 | n/a | 0.000 | 0.000 | 0.565 | 201.325 | 0.012 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.093 | 0.039 | 0.000 | 0.093 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000ee8 | 202.165 | 0.030 | n/a | 0.000 | 0.000 | 1.208 | 200.777 | 0.004 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.071 | 0.030 | 0.000 | 0.071 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f51 | 202.094 | 0.079 | n/a | 0.000 | 0.000 | 0.720 | 201.039 | 0.015 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.167 | 0.079 | 0.000 | 0.167 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f21 | 202.046 | 0.072 | n/a | 0.000 | 0.000 | 0.670 | 201.056 | 0.006 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.115 | 0.072 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f30 | 202.037 | 0.098 | n/a | 0.000 | 0.000 | 0.721 | 200.592 | 0.430 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.147 | 0.098 | 0.000 | 0.147 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000ef1 | 202.013 | 0.031 | n/a | 0.000 | 0.000 | 0.394 | 200.694 | 0.767 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.064 | 0.031 | 0.000 | 0.064 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f1e | 201.969 | 0.048 | n/a | 0.000 | 0.000 | 0.734 | 201.004 | 0.008 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.106 | 0.048 | 0.000 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f3d | 201.931 | 0.033 | n/a | 0.000 | 0.000 | 0.551 | 201.190 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.087 | 0.033 | 0.000 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f49 | 201.922 | 0.074 | n/a | 0.000 | 0.000 | 0.801 | 200.876 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.104 | 0.074 | 0.000 | 0.104 | gw-r/thread-52/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f4e | 201.902 | 0.037 | n/a | 0.000 | 0.000 | 0.630 | 201.076 | 0.009 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f04 | 201.894 | 0.046 | n/a | 0.000 | 0.000 | 0.872 | 200.807 | 0.004 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.046 | 0.000 | 0.107 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f45 | 201.713 | 0.040 | n/a | 0.000 | 0.000 | 0.651 | 200.822 | 0.004 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.089 | 0.040 | 0.000 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f46 | 201.672 | 0.049 | n/a | 0.000 | 0.000 | 0.797 | 200.667 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.111 | 0.049 | 0.000 | 0.111 | gw-r/thread-51/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f17 | 201.632 | 0.040 | n/a | 0.000 | 0.000 | 0.643 | 200.811 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.072 | 0.040 | 0.000 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000f4c | 201.621 | 0.031 | n/a | 0.000 | 0.000 | 0.592 | 200.850 | 0.005 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.083 | 0.031 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000ef2 | 201.606 | 0.041 | n/a | 0.000 | 0.000 | 0.628 | 200.775 | 0.005 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.099 | 0.041 | 0.000 | 0.099 | gw-r/thread-53/journal/page | none observed |
| 6b18c0c9c5b093f20000000000000efc | 201.602 | 0.035 | n/a | 0.000 | 0.000 | 0.625 | 200.817 | 0.004 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.066 | 0.035 | 0.000 | 0.066 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

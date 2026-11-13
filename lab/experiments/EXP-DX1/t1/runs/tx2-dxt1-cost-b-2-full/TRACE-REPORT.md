# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue (scheduler/subject/admission)` (176.569 ms, trace `4e69882812411eb20000000000001185`); `node-14/thread-0/client.persist-and-resolve` (111.602 ms, trace `4e69882812411eb20000000000001157`); `node-14/thread-0/client.persist-and-resolve` (128.070 ms, trace `4e69882812411eb20000000000001158`); `node-14/thread-0/driver.queue (scheduler/subject/admission)` (114.039 ms, trace `4e69882812411eb20000000000001154`); `node-14/thread-0/client.persist-and-resolve` (176.377 ms, trace `4e69882812411eb2000000000000115b`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-cost-b-2-full`; source `d7aeb0699071e22fc8499fb97ea91eaf58ce195d`; subjects 10000; tracing full.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 19817630.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.616 | 4.499 | 2.618 | 0.000 | 0.141 | 28.648 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.112 | 0.170 | 0.023 |
| p99 | 91.704 | 14.576 | n/a | 14.545 | 1.112 | 86.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.265 | 27.591 | 0.352 | 0.265 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000436 | 91.704 | 5.020 | 0.380 | 0.000 | 0.141 | 86.121 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 5.540 | 0.060 | 0.043 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000438 | 78.462 | 12.016 | n/a | 14.545 | 1.030 | 50.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.089 | 27.591 | 0.352 | 0.089 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000439 | 77.244 | 4.499 | 0.258 | 6.290 | 0.026 | 66.146 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 11.072 | 0.143 | 0.025 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.bind-receipt 12.018ms; driver.publication 1.459ms |
| 4e69882812411eb20000000000000426 | 70.237 | 14.576 | 0.442 | 0.000 | 0.049 | 55.149 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 15.068 | 0.215 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000422 | 59.738 | 14.538 | n/a | 4.432 | 0.857 | 39.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.265 | 19.827 | 0.332 | 0.265 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000432 | 53.671 | 4.571 | 0.339 | 0.000 | 0.039 | 48.697 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.949 | 0.092 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000044c | 45.135 | 6.699 | 0.211 | 0.253 | 0.028 | 37.928 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 7.191 | 0.159 | 0.015 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000043b | 44.397 | 6.237 | n/a | 2.901 | 0.271 | 34.950 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 9.409 | 0.212 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000442 | 42.563 | 3.273 | n/a | 0.000 | 0.505 | 38.770 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.778 | 0.089 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000448 | 41.466 | 4.399 | 0.300 | 0.369 | 0.044 | 36.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 5.112 | 0.123 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000444 | 38.243 | 4.807 | 2.618 | 0.318 | 0.025 | 30.457 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 7.768 | 0.203 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000433 | 38.214 | 5.457 | n/a | 0.000 | 0.329 | 32.386 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 5.787 | 0.151 | 0.041 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000042e | 37.529 | 4.353 | 0.217 | 0.000 | 0.037 | 32.899 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.607 | 0.123 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000043e | 36.820 | 6.789 | 0.317 | 0.000 | 0.043 | 29.646 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 7.150 | 0.194 | 0.025 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000449 | 34.616 | 6.083 | n/a | 4.761 | 0.660 | 23.088 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 11.504 | 0.332 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000042b | 34.563 | 4.778 | n/a | 0.000 | 1.112 | 28.648 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.891 | 0.170 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000451 | 31.724 | 3.137 | n/a | 0.000 | 0.527 | 28.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.664 | 0.115 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000045a | 30.956 | 3.764 | 0.256 | 0.320 | 0.028 | 26.567 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.367 | 0.141 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000454 | 30.373 | 3.456 | 0.194 | 0.257 | 0.031 | 26.417 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.938 | 0.130 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000450 | 29.914 | 3.593 | 0.336 | 0.330 | 0.037 | 25.591 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.297 | 0.144 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2/P4 / read-your-own-write / read (35 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 73.130 | 28.348 | 19.836 | 0.787 | 0.000 | 22.310 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 51.346 | 0.775 | 0.011 |
| p99 | 248.547 | 67.980 | 133.791 | 9.333 | 0.000 | 116.011 | 11.498 | 76.266 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.043 | 151.857 | 1.000 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000bea | 248.547 | 27.197 | 20.696 | 2.311 | 0.000 | 110.535 | 11.498 | 76.266 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.013 | 50.204 | 0.202 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.parse 2.164ms; driver.publication 1.954ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb20000000000000be9 | 207.907 | 58.452 | 36.372 | 6.659 | 0.000 | 106.402 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 101.483 | 0.488 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.588ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.126ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb20000000000001aa0 | 170.903 | 37.095 | 105.015 | 0.000 | 0.000 | 28.765 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 142.110 | 0.832 | 0.027 | node-14/thread-0/rpc.replica.observe | driver.publication 3.128ms; driver.expected-state.bind-receipt 1.685ms; driver.publication 1.635ms; client.parse 1.354ms; driver.publication 1.244ms |
| 4e69882812411eb2000000000000195f | 169.738 | 17.807 | 15.374 | 0.000 | 0.000 | 116.011 | 0.196 | 20.325 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.013 | 33.181 | 0.195 | 0.013 | node-14/thread-0/socket.wait-first-byte | client.parse 1.589ms; driver.publication 1.561ms; driver.publication 1.177ms |
| 4e69882812411eb20000000000001f1b | 159.285 | 41.385 | 21.287 | 2.750 | 0.000 | 93.853 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 65.422 | 0.411 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.parse 1.058ms |
| 4e69882812411eb20000000000001150 | 151.866 | 18.066 | 133.791 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 151.857 | 1.000 | 0.010 | node-14/thread-0/rpc.replica.observe | driver.publication 125.550ms; driver.expected-state.bind-receipt 1.125ms |
| 4e69882812411eb2000000000000195e | 143.068 | 52.336 | 42.883 | 3.408 | 0.000 | 44.427 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 98.627 | 0.689 | 0.013 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000001261 | 118.978 | 28.348 | 16.651 | 0.000 | 0.000 | 73.967 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 44.999 | 0.378 | 0.012 | node-14/thread-0/socket.wait-first-byte | client.parse 1.848ms; driver.publication 1.295ms; driver.publication 1.071ms; driver.publication 1.021ms |
| 4e69882812411eb20000000000001a9c | 113.180 | 67.980 | 19.739 | 0.000 | 0.000 | 25.450 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 87.719 | 0.775 | 0.011 | node-14/thread-0/client.reach | driver.publication 1.110ms |
| 4e69882812411eb20000000000000be8 | 110.293 | 32.283 | 20.956 | 0.000 | 0.000 | 57.038 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 53.239 | 0.483 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.588ms; driver.expected-state.bind-receipt 1.352ms; driver.expected-state.bind-receipt 1.126ms |
| 4e69882812411eb20000000000001c8f | 109.512 | 50.521 | 19.149 | 2.207 | 0.000 | 37.624 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 71.878 | 0.656 | 0.010 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000001f1a | 104.921 | 15.486 | 6.633 | 0.000 | 0.000 | 82.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 22.118 | 0.211 | 0.011 | node-14/thread-0/socket.wait-first-byte | client.parse 1.058ms |
| 4e69882812411eb20000000000000423 | 103.802 | 17.073 | 3.612 | 0.000 | 0.000 | 83.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 20.685 | 0.199 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000125f | 99.242 | 43.078 | 25.775 | 2.917 | 0.000 | 27.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 71.769 | 0.723 | 0.013 | node-14/thread-0/client.reach | none observed |
| 4e69882812411eb20000000000000d15 | 96.832 | 30.919 | 10.793 | 0.000 | 0.000 | 55.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 41.712 | 0.431 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.223ms |
| 4e69882812411eb20000000000001174 | 95.575 | 22.520 | 22.771 | 0.000 | 0.000 | 50.269 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 45.291 | 0.474 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.884ms; driver.publication 1.465ms; driver.publication 1.453ms; driver.publication 1.169ms; driver.publication 1.160ms |
| 4e69882812411eb20000000000001f19 | 90.240 | 40.658 | 25.071 | 2.188 | 0.000 | 22.310 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 67.918 | 0.753 | 0.012 | node-14/thread-0/client.reach | none observed |
| 4e69882812411eb200000000000014b8 | 73.130 | 37.875 | 19.836 | 2.361 | 0.000 | 13.046 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 60.072 | 0.821 | 0.012 | node-14/thread-0/client.reach | none observed |
| 4e69882812411eb20000000000000d17 | 72.044 | 34.553 | 14.513 | 5.846 | 0.000 | 17.122 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 54.912 | 0.762 | 0.011 | node-14/thread-2/replica.pull-at | driver.publication 1.223ms |
| 4e69882812411eb200000000000019a1 | 71.731 | 38.691 | 29.387 | 3.638 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 71.715 | 1.000 | 0.015 | node-14/thread-2/replica.pull-at | driver.publication 1.638ms; driver.publication 1.372ms; driver.publication 1.229ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.250 | 3.539 | n/a | 0.000 | 0.527 | 19.180 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.127 | 0.184 | 0.023 |
| p99 | 42.563 | 4.778 | n/a | 1.772 | 1.112 | 38.770 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 7.514 | 0.301 | 0.030 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000442 | 42.563 | 3.273 | n/a | 0.000 | 0.505 | 38.770 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.778 | 0.089 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000042b | 34.563 | 4.778 | n/a | 0.000 | 1.112 | 28.648 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 5.891 | 0.170 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000451 | 31.724 | 3.137 | n/a | 0.000 | 0.527 | 28.035 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.664 | 0.115 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000445 | 26.724 | 4.736 | n/a | 1.772 | 1.006 | 19.180 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 7.514 | 0.281 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000042f | 25.250 | 3.239 | n/a | 0.000 | 0.888 | 21.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.127 | 0.163 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000427 | 20.441 | 3.465 | n/a | 0.000 | 0.289 | 16.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.754 | 0.184 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000044d | 15.244 | 3.564 | n/a | 0.000 | 0.929 | 10.729 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.493 | 0.295 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000457 | 14.521 | 3.539 | n/a | 0.000 | 0.174 | 10.791 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.713 | 0.256 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000455 | 14.379 | 3.917 | n/a | 0.000 | 0.416 | 10.022 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.333 | 0.301 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.453 | 4.561 | 0.845 | 0.000 | 0.026 | 33.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.811 | 0.147 | 0.015 |
| p99 | 60.648 | 5.396 | n/a | 0.475 | 3.379 | 55.805 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 6.743 | 0.183 | 0.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000cc3 | 60.648 | 4.561 | 0.258 | 0.000 | 0.009 | 55.805 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.828 | 0.080 | 0.015 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.445ms; driver.publication 1.096ms |
| 4e69882812411eb20000000000000cc2 | 39.453 | 2.432 | n/a | 0.000 | 3.379 | 33.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 5.811 | 0.147 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.553ms; driver.publication 1.445ms; driver.expected-state.bind-receipt 1.038ms |
| 4e69882812411eb2000000000000045c | 36.830 | 5.396 | 0.845 | 0.475 | 0.026 | 30.072 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 6.743 | 0.183 | 0.015 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / L1 / commit (40 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.753 | 4.271 | n/a | 0.000 | 0.114 | 21.995 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.937 | 0.159 | 0.023 |
| p99 | 68.489 | 11.259 | n/a | 2.532 | 6.406 | 63.407 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.058 | 14.100 | 0.493 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000470 | 68.489 | 4.740 | 0.297 | 0.000 | 0.027 | 63.407 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.064 | 0.074 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000462 | 60.563 | 3.599 | n/a | 1.539 | 0.381 | 55.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 5.519 | 0.091 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000464 | 55.564 | 3.817 | n/a | 0.000 | 0.189 | 51.543 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.006 | 0.072 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000046a | 52.254 | 3.726 | 0.216 | 0.000 | 0.031 | 48.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.057 | 3.973 | 0.076 | 0.057 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000460 | 45.454 | 5.626 | 0.275 | 0.000 | 0.058 | 39.463 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 5.959 | 0.131 | 0.032 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000047d | 45.419 | 5.169 | n/a | 0.000 | 0.931 | 39.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 6.101 | 0.134 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000045e | 37.901 | 5.896 | 0.509 | 0.527 | 0.034 | 30.911 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.967 | 0.184 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000494 | 36.215 | 3.340 | 0.192 | 0.000 | 0.027 | 32.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.558 | 0.098 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000047c | 34.871 | 4.427 | 0.197 | 0.424 | 0.029 | 29.776 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.076 | 0.146 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000046d | 34.155 | 7.090 | n/a | 1.853 | 0.923 | 24.269 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 9.866 | 0.289 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ac | 33.553 | 4.054 | 0.337 | 0.000 | 0.040 | 29.097 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.430 | 0.132 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000472 | 33.026 | 3.886 | 0.297 | 0.000 | 0.054 | 28.763 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.237 | 0.128 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004a2 | 32.984 | 4.967 | 0.238 | 0.000 | 0.043 | 27.696 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 5.248 | 0.159 | 0.040 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000049e | 32.973 | 3.942 | 0.188 | 0.000 | 0.029 | 28.796 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.159 | 0.126 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000049c | 32.010 | 4.530 | 0.296 | 0.000 | 0.033 | 27.129 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.859 | 0.152 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000047f | 31.445 | 11.259 | n/a | 2.532 | 0.309 | 17.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 14.100 | 0.448 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000488 | 31.155 | 3.995 | 0.343 | 0.000 | 0.066 | 26.718 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 4.404 | 0.141 | 0.034 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000474 | 30.948 | 3.187 | 0.249 | 0.000 | 0.029 | 27.465 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.466 | 0.112 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004a4 | 28.488 | 3.767 | 0.737 | 0.000 | 0.036 | 23.927 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.540 | 0.159 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000049f | 27.940 | 5.315 | n/a | 0.000 | 0.594 | 21.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 5.910 | 0.212 | 0.050 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.226 | 3.860 | n/a | 0.000 | 0.274 | 13.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.857 | 0.217 | 0.026 |
| p99 | 55.564 | 7.762 | n/a | 0.000 | 6.406 | 51.543 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 8.992 | 0.493 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000464 | 55.564 | 3.817 | n/a | 0.000 | 0.189 | 51.543 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 4.006 | 0.072 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000049f | 27.940 | 5.315 | n/a | 0.000 | 0.594 | 21.980 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.050 | 5.910 | 0.212 | 0.050 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000468 | 26.312 | 7.762 | n/a | 0.000 | 0.114 | 18.401 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 7.876 | 0.299 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000478 | 22.786 | 4.710 | n/a | 0.000 | 0.227 | 17.832 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 4.937 | 0.217 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004a9 | 18.226 | 2.586 | n/a | 0.000 | 6.406 | 9.226 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 8.992 | 0.493 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.081ms; driver.publication 1.068ms |
| 4e69882812411eb2000000000000048d | 17.730 | 4.402 | n/a | 0.000 | 0.455 | 12.847 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.857 | 0.274 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000491 | 16.985 | 3.243 | n/a | 0.000 | 0.282 | 13.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 3.526 | 0.208 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000483 | 13.925 | 3.860 | n/a | 0.000 | 0.274 | 9.765 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.134 | 0.297 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.114 | 4.057 | 2.819 | 0.000 | 0.060 | 23.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.713 | 0.191 | 0.022 |
| p99 | 95.778 | 12.659 | n/a | 3.329 | 1.168 | 89.467 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 16.024 | 0.412 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb200000000000004b9 | 95.778 | 4.057 | 2.211 | 0.000 | 0.027 | 89.467 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 6.295 | 0.066 | 0.016 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.003ms |
| 4e69882812411eb200000000000004f4 | 72.797 | 4.263 | 0.306 | 0.000 | 0.029 | 68.169 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.598 | 0.063 | 0.030 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004dd | 49.666 | 3.212 | 0.262 | 0.000 | 0.018 | 46.155 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.492 | 0.070 | 0.019 | node-14/thread-4/socket.wait-first-byte | driver.expected-state.bind-receipt 1.951ms; driver.publication 1.372ms |
| 4e69882812411eb200000000000004e2 | 48.237 | 3.850 | 0.286 | 0.000 | 0.056 | 44.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 4.191 | 0.087 | 0.043 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004f2 | 45.713 | 3.440 | 0.280 | 0.000 | 0.077 | 41.874 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 3.797 | 0.083 | 0.042 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004d8 | 44.289 | 4.420 | 0.297 | 0.000 | 0.031 | 39.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.747 | 0.107 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ec | 43.375 | 3.928 | 0.277 | 0.000 | 0.051 | 39.087 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 4.257 | 0.098 | 0.031 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004e9 | 38.939 | 12.659 | n/a | 3.329 | 0.037 | 22.896 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 16.024 | 0.412 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004d6 | 38.080 | 3.650 | 0.215 | 0.000 | 0.042 | 34.148 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 3.908 | 0.103 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004dc | 37.189 | 9.171 | n/a | 0.000 | 0.977 | 27.021 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 10.148 | 0.273 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ba | 35.137 | 4.145 | n/a | 0.000 | 0.784 | 30.188 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.929 | 0.140 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ca | 33.302 | 6.065 | 0.445 | 0.000 | 0.035 | 26.734 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.545 | 0.197 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ae | 33.063 | 3.840 | 2.819 | 0.000 | 0.027 | 26.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.686 | 0.202 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004e8 | 32.655 | 3.871 | 0.225 | 0.000 | 0.034 | 28.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.130 | 0.126 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ed | 31.397 | 6.365 | n/a | 0.000 | 0.326 | 24.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 6.691 | 0.213 | 0.042 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004d4 | 30.884 | 4.627 | 0.293 | 0.000 | 0.060 | 25.873 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.980 | 0.161 | 0.030 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004e6 | 30.879 | 3.274 | 0.281 | 0.000 | 0.052 | 27.239 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 3.607 | 0.117 | 0.033 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004b2 | 30.259 | 5.543 | 0.210 | 0.000 | 0.022 | 24.467 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 5.776 | 0.191 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004bf | 28.401 | 4.826 | n/a | 0.000 | 0.373 | 23.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.199 | 0.183 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004d0 | 28.114 | 4.097 | 0.352 | 0.000 | 0.050 | 23.589 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.499 | 0.160 | 0.026 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.388 | 3.646 | n/a | 0.000 | 0.373 | 15.652 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.263 | 0.233 | 0.023 |
| p99 | 28.401 | 6.292 | n/a | 0.000 | 1.168 | 23.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 6.700 | 0.343 | 0.031 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb200000000000004bf | 28.401 | 4.826 | n/a | 0.000 | 0.373 | 23.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 5.199 | 0.183 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ef | 25.582 | 3.145 | n/a | 0.000 | 0.629 | 21.787 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.775 | 0.148 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004e3 | 22.871 | 6.292 | n/a | 0.000 | 0.408 | 16.147 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.700 | 0.293 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004f7 | 22.392 | 3.330 | n/a | 0.000 | 0.390 | 18.654 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.720 | 0.166 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004c7 | 21.814 | 4.734 | n/a | 0.000 | 0.353 | 16.701 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.087 | 0.233 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004af | 20.388 | 3.646 | n/a | 0.000 | 1.067 | 15.652 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.713 | 0.231 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004b3 | 17.327 | 4.771 | n/a | 0.000 | 1.168 | 11.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.939 | 0.343 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004d9 | 13.876 | 3.556 | n/a | 0.000 | 0.254 | 10.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 3.810 | 0.275 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004c5 | 12.784 | 3.960 | n/a | 0.000 | 0.302 | 8.498 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.263 | 0.333 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004fb | 12.350 | 3.381 | n/a | 0.000 | 0.237 | 8.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.618 | 0.293 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.118 | 3.910 | n/a | 0.000 | 0.078 | 22.213 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.607 | 0.178 | 0.024 |
| p99 | 154.743 | 14.018 | n/a | 0.000 | 1.165 | 135.678 | 5.177 | 0.045 | 10.278 | 0.026 | 0.000 | n/a | n/a | 0.040 | 14.070 | 0.382 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000504 | 154.743 | 3.293 | 0.196 | 0.000 | 0.031 | 135.678 | 5.177 | 0.045 | 10.278 | 0.026 | 0.000 | n/a | n/a | 0.020 | 3.520 | 0.023 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000050e | 58.125 | 9.392 | n/a | 0.000 | 0.896 | 47.804 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 10.289 | 0.177 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000522 | 48.359 | 14.018 | n/a | 0.000 | 0.052 | 34.268 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 14.070 | 0.291 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000054d | 43.180 | 3.726 | 0.247 | 0.000 | 0.027 | 39.162 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.000 | 0.093 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000521 | 41.864 | 3.052 | 0.246 | 0.000 | 0.038 | 38.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.335 | 0.080 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000050d | 40.997 | 3.813 | 0.276 | 0.000 | 0.032 | 36.845 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.121 | 0.101 | 0.030 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000051f | 39.890 | 4.692 | 1.854 | 0.000 | 0.038 | 33.282 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 6.583 | 0.165 | 0.024 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000050a | 37.193 | 5.549 | 0.344 | 0.000 | 0.064 | 31.195 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 5.958 | 0.160 | 0.040 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000513 | 36.038 | 3.873 | 0.243 | 0.000 | 0.048 | 31.847 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.163 | 0.116 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000501 | 34.817 | 4.553 | n/a | 0.000 | 1.008 | 29.231 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 5.561 | 0.160 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000535 | 34.427 | 4.456 | 0.220 | 0.000 | 0.059 | 29.664 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.734 | 0.138 | 0.028 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000052e | 33.894 | 5.081 | n/a | 0.000 | 0.156 | 28.639 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.237 | 0.155 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000549 | 31.456 | 4.365 | 0.216 | 0.000 | 0.026 | 26.831 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.607 | 0.146 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000506 | 31.446 | 6.788 | n/a | 0.000 | 0.343 | 24.298 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 7.131 | 0.227 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.216ms |
| 4e69882812411eb2000000000000053d | 29.203 | 3.836 | 0.300 | 0.000 | 0.041 | 25.001 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.177 | 0.143 | 0.025 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000527 | 28.881 | 3.190 | 0.213 | 0.000 | 0.033 | 25.424 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.436 | 0.119 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000543 | 28.434 | 3.784 | 0.220 | 0.000 | 0.033 | 24.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.037 | 0.142 | 0.021 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000510 | 27.563 | 5.008 | n/a | 0.000 | 0.327 | 22.213 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 5.335 | 0.194 | 0.015 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000054b | 27.458 | 4.557 | 0.389 | 0.000 | 0.025 | 22.468 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.971 | 0.181 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000052d | 27.250 | 3.663 | 0.357 | 0.000 | 0.067 | 23.130 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 4.087 | 0.150 | 0.033 | node-14/thread-4/socket.wait-first-byte | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.844 | 3.898 | n/a | 0.000 | 0.866 | 15.714 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.763 | 0.232 | 0.026 |
| p99 | 58.125 | 9.392 | n/a | 0.000 | 1.162 | 47.804 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 10.289 | 0.382 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb2000000000000050e | 58.125 | 9.392 | n/a | 0.000 | 0.896 | 47.804 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 10.289 | 0.177 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000501 | 34.817 | 4.553 | n/a | 0.000 | 1.008 | 29.231 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 5.561 | 0.160 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000051a | 25.004 | 3.700 | n/a | 0.000 | 1.027 | 20.250 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 4.726 | 0.189 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000051c | 24.860 | 4.462 | n/a | 0.000 | 0.317 | 20.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 4.779 | 0.192 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000530 | 23.310 | 3.395 | n/a | 0.000 | 0.258 | 19.619 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 3.653 | 0.157 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000517 | 21.742 | 4.086 | n/a | 0.000 | 1.162 | 16.457 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 5.247 | 0.241 | 0.038 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000536 | 21.229 | 3.265 | n/a | 0.000 | 0.178 | 17.752 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 3.442 | 0.162 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000514 | 20.844 | 4.324 | n/a | 0.000 | 0.952 | 15.546 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 5.276 | 0.253 | 0.022 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000505 | 20.497 | 3.898 | n/a | 0.000 | 0.866 | 15.714 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.763 | 0.232 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000528 | 19.025 | 3.452 | n/a | 0.000 | 0.502 | 15.053 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.954 | 0.208 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000004ff | 17.716 | 4.526 | n/a | 0.000 | 1.060 | 12.100 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 5.585 | 0.315 | 0.030 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000054e | 17.360 | 5.848 | n/a | 0.000 | 0.782 | 10.704 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 6.630 | 0.382 | 0.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000544 | 16.309 | 3.761 | n/a | 0.000 | 0.349 | 12.175 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.110 | 0.252 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000539 | 13.665 | 3.228 | n/a | 0.000 | 0.700 | 9.725 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 3.928 | 0.287 | 0.012 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000053e | 13.002 | 2.760 | n/a | 0.000 | 0.881 | 9.341 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.641 | 0.280 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.699 | 3.917 | n/a | 0.000 | 0.313 | 17.583 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.287 | 0.234 | 0.023 |
| p99 | 53.931 | 8.932 | n/a | 0.000 | 1.032 | 50.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 9.841 | 0.436 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000573 | 53.931 | 3.296 | 0.243 | 0.000 | 0.061 | 50.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 3.600 | 0.067 | 0.029 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000058c | 53.492 | 6.471 | n/a | 0.000 | 0.320 | 46.675 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 6.791 | 0.127 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000059c | 46.389 | 4.373 | 0.204 | 0.000 | 0.045 | 41.737 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.622 | 0.100 | 0.030 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000565 | 41.844 | 3.117 | 0.226 | 0.000 | 0.055 | 38.419 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.398 | 0.081 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000587 | 38.677 | 4.072 | 0.315 | 0.000 | 0.032 | 34.239 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.418 | 0.114 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005b0 | 35.784 | 3.769 | 0.205 | 0.000 | 0.036 | 31.751 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.010 | 0.112 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000581 | 33.410 | 6.770 | 0.175 | 0.000 | 0.032 | 26.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 6.977 | 0.209 | 0.019 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000560 | 32.426 | 3.174 | n/a | 0.000 | 0.692 | 28.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.866 | 0.119 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000569 | 32.175 | 4.913 | 1.355 | 0.000 | 0.028 | 25.857 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 6.295 | 0.196 | 0.023 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000056a | 31.873 | 7.134 | n/a | 0.000 | 0.373 | 24.334 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 7.507 | 0.236 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000055e | 31.323 | 5.437 | 0.295 | 0.000 | 0.042 | 25.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.774 | 0.184 | 0.029 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000599 | 27.463 | 3.702 | 0.398 | 0.000 | 0.028 | 23.305 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 4.128 | 0.150 | 0.030 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000058b | 27.462 | 4.009 | 0.199 | 0.000 | 0.027 | 23.210 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.235 | 0.154 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000597 | 27.015 | 2.740 | 0.154 | 0.000 | 0.014 | 24.092 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 2.909 | 0.108 | 0.013 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005a4 | 27.001 | 3.524 | 0.203 | 0.000 | 0.039 | 23.208 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 3.766 | 0.139 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000579 | 26.989 | 3.917 | 0.201 | 0.000 | 0.033 | 22.810 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 4.152 | 0.154 | 0.027 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000592 | 26.867 | 3.648 | n/a | 0.000 | 0.156 | 23.043 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 3.804 | 0.142 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000551 | 26.172 | 3.974 | 0.292 | 0.000 | 0.026 | 21.858 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 4.292 | 0.164 | 0.022 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000562 | 25.204 | 4.174 | n/a | 0.000 | 0.883 | 20.129 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 5.056 | 0.201 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000057b | 25.046 | 3.655 | n/a | 0.000 | 0.979 | 20.386 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.634 | 0.185 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.169ms |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.511 | 3.828 | n/a | 0.000 | 0.507 | 10.544 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.334 | 0.323 | 0.025 |
| p99 | 32.426 | 5.564 | n/a | 0.000 | 0.979 | 28.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 6.361 | 0.429 | 0.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000560 | 32.426 | 3.174 | n/a | 0.000 | 0.692 | 28.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.866 | 0.119 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000057b | 25.046 | 3.655 | n/a | 0.000 | 0.979 | 20.386 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 4.634 | 0.185 | 0.026 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.169ms |
| 4e69882812411eb2000000000000055b | 18.803 | 4.285 | n/a | 0.000 | 0.313 | 14.181 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.597 | 0.245 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000059a | 18.437 | 5.564 | n/a | 0.000 | 0.796 | 12.044 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.361 | 0.345 | 0.032 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000058e | 18.052 | 3.872 | n/a | 0.000 | 0.350 | 13.812 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.222 | 0.234 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000570 | 16.818 | 2.761 | n/a | 0.000 | 0.124 | 13.903 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 2.885 | 0.172 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb2000000000000059f | 16.192 | 4.700 | n/a | 0.000 | 0.852 | 10.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.031 | 5.552 | 0.343 | 0.031 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005b3 | 15.603 | 4.145 | n/a | 0.000 | 0.896 | 10.544 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.041 | 0.323 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000584 | 14.511 | 3.042 | n/a | 0.000 | 0.556 | 10.895 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.598 | 0.248 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000566 | 13.492 | 2.587 | n/a | 0.000 | 0.718 | 10.171 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.304 | 0.245 | 0.017 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000590 | 13.402 | 4.489 | n/a | 0.000 | 0.470 | 8.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.959 | 0.370 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000594 | 13.348 | 4.055 | n/a | 0.000 | 0.528 | 8.744 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 4.582 | 0.343 | 0.021 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000557 | 12.655 | 3.012 | n/a | 0.000 | 0.416 | 9.209 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.428 | 0.271 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ad | 12.624 | 5.293 | n/a | 0.000 | 0.117 | 7.185 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 5.409 | 0.429 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000552 | 12.423 | 3.828 | n/a | 0.000 | 0.507 | 8.051 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 4.334 | 0.349 | 0.037 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005b1 | 10.964 | 3.645 | n/a | 0.000 | 0.328 | 6.972 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.973 | 0.362 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005a7 | 10.786 | 3.752 | n/a | 0.000 | 0.129 | 6.880 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.881 | 0.360 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.128 | 3.859 | n/a | 0.000 | 0.099 | 19.016 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 4.416 | 0.196 | 0.023 |
| p99 | 44.869 | 10.531 | n/a | 0.000 | 2.103 | 41.144 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 11.670 | 0.392 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb200000000000005dd | 44.869 | 3.509 | 0.186 | 0.000 | 0.017 | 41.144 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.712 | 0.083 | 0.014 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005cd | 42.445 | 4.999 | 2.340 | 0.000 | 0.028 | 35.065 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.367 | 0.174 | 0.013 | node-14/thread-4/socket.wait-first-byte | driver.publication 2.012ms |
| 4e69882812411eb20000000000000607 | 37.906 | 2.885 | 0.156 | 0.000 | 0.027 | 34.821 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.068 | 0.081 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005c4 | 36.485 | 2.973 | n/a | 0.000 | 0.320 | 33.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.293 | 0.090 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005e6 | 34.450 | 3.859 | 0.242 | 0.000 | 0.036 | 30.277 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 4.136 | 0.120 | 0.038 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ea | 34.214 | 2.806 | 0.240 | 0.000 | 0.053 | 31.090 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.099 | 0.091 | 0.025 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ba | 32.201 | 3.162 | 0.150 | 0.000 | 0.022 | 28.853 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 3.333 | 0.104 | 0.015 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005fc | 31.290 | 3.186 | 0.274 | 0.000 | 0.059 | 27.746 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 3.519 | 0.112 | 0.025 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000603 | 30.642 | 4.639 | 0.198 | 0.000 | 0.055 | 25.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.037 | 4.892 | 0.160 | 0.037 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000601 | 29.797 | 10.531 | n/a | 0.000 | 1.139 | 18.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.028 | 11.670 | 0.392 | 0.028 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ce | 29.574 | 4.650 | n/a | 0.000 | 0.860 | 24.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.511 | 0.186 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005c0 | 29.541 | 3.788 | 0.204 | 0.000 | 0.034 | 25.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.026 | 0.136 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005f6 | 29.326 | 3.503 | 0.216 | 0.000 | 0.018 | 25.569 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 3.738 | 0.127 | 0.019 | node-14/thread-4/socket.wait-first-byte | driver.publication 1.254ms |
| 4e69882812411eb200000000000005bd | 29.004 | 4.019 | n/a | 0.000 | 1.025 | 23.942 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 5.044 | 0.174 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005df | 27.400 | 5.532 | 1.616 | 0.000 | 0.018 | 20.217 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 7.167 | 0.262 | 0.016 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005cb | 27.060 | 3.762 | 0.260 | 0.000 | 0.022 | 22.996 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 4.044 | 0.149 | 0.020 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005d0 | 26.827 | 4.487 | n/a | 0.000 | 0.114 | 22.184 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 4.600 | 0.171 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005c7 | 26.041 | 2.831 | 0.176 | 0.000 | 0.022 | 22.995 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.030 | 0.116 | 0.017 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005e5 | 26.017 | 3.987 | 0.323 | 0.000 | 0.018 | 21.670 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 4.329 | 0.166 | 0.018 | node-14/thread-4/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005f2 | 24.841 | 5.496 | n/a | 0.000 | 0.308 | 19.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.804 | 0.234 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.098 | 3.785 | n/a | 0.000 | 0.631 | 12.576 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.600 | 0.257 | 0.025 |
| p99 | 36.485 | 5.496 | n/a | 0.000 | 2.103 | 33.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 6.412 | 0.317 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb200000000000005c4 | 36.485 | 2.973 | n/a | 0.000 | 0.320 | 33.174 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.293 | 0.090 | 0.018 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ce | 29.574 | 4.650 | n/a | 0.000 | 0.860 | 24.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 5.511 | 0.186 | 0.023 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005d0 | 26.827 | 4.487 | n/a | 0.000 | 0.114 | 22.184 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 4.600 | 0.171 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005f2 | 24.841 | 5.496 | n/a | 0.000 | 0.308 | 19.004 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.033 | 5.804 | 0.234 | 0.033 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ee | 24.128 | 4.617 | n/a | 0.000 | 0.415 | 19.069 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 5.032 | 0.209 | 0.027 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005f7 | 20.255 | 4.310 | n/a | 0.000 | 2.103 | 13.827 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 6.412 | 0.317 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.244ms |
| 4e69882812411eb200000000000005fe | 19.744 | 2.255 | n/a | 0.000 | 0.199 | 17.261 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 2.454 | 0.124 | 0.029 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005d8 | 18.098 | 4.820 | n/a | 0.000 | 0.699 | 12.554 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 5.519 | 0.305 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005d4 | 17.595 | 4.220 | n/a | 0.000 | 0.764 | 12.576 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.035 | 4.985 | 0.283 | 0.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005e0 | 16.688 | 3.393 | n/a | 0.000 | 0.902 | 12.369 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 4.295 | 0.257 | 0.024 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005ec | 16.259 | 3.785 | n/a | 0.000 | 0.631 | 11.818 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 4.416 | 0.272 | 0.025 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005b7 | 15.199 | 3.322 | n/a | 0.000 | 0.845 | 11.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 4.167 | 0.274 | 0.019 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005fa | 15.194 | 3.677 | n/a | 0.000 | 1.046 | 10.431 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.040 | 4.723 | 0.311 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb200000000000005e8 | 12.157 | 3.297 | n/a | 0.000 | 0.099 | 8.742 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 3.396 | 0.279 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1024 / commit (869 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.275 | 3.599 | n/a | 0.000 | 0.775 | 14.270 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.737 | 0.262 | 0.015 |
| p99 | 84.970 | 47.917 | n/a | 2.272 | 33.264 | 61.997 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.051 | 57.612 | 1.000 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000bf0 | 184.136 | 133.538 | n/a | 17.326 | 33.264 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 184.128 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve | client.parse 2.164ms; driver.publication 1.954ms; client.parse 1.693ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb20000000000000bf1 | 158.123 | 134.994 | n/a | 17.326 | 5.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 158.113 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | client.parse 2.164ms; driver.publication 1.954ms; client.parse 1.693ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb20000000000000bef | 149.057 | 5.458 | n/a | 0.000 | 39.519 | 104.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 44.977 | 0.302 | 0.019 | node-14/thread-0/socket.wait-first-byte | client.parse 2.164ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb200000000000008f9 | 131.958 | 4.804 | n/a | 0.000 | 1.813 | 125.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 6.617 | 0.050 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.912ms; driver.publication 1.069ms; driver.publication 1.046ms; driver.publication 1.011ms |
| 4e69882812411eb20000000000000a57 | 131.050 | 13.448 | 3.207 | 0.372 | 0.022 | 113.990 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 17.049 | 0.130 | 0.010 | node-14/thread-4/socket.wait-first-byte | driver.publication 2.045ms; driver.expected-state.bind-receipt 1.550ms; driver.publication 1.304ms; driver.publication 1.258ms; driver.publication 1.243ms |
| 4e69882812411eb20000000000000904 | 110.210 | 3.078 | n/a | 0.000 | 51.599 | 55.520 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 54.678 | 0.496 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.912ms; driver.publication 1.069ms; driver.publication 1.046ms; driver.publication 1.011ms |
| 4e69882812411eb200000000000006cf | 97.005 | 13.501 | n/a | 0.000 | 7.673 | 75.820 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 21.174 | 0.218 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.561ms; driver.publication 1.408ms; driver.publication 1.116ms; driver.publication 1.116ms; driver.publication 1.102ms |
| 4e69882812411eb20000000000000bf3 | 86.982 | 4.137 | n/a | 0.000 | 20.308 | 62.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 24.445 | 0.281 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.954ms; client.parse 1.693ms |
| 4e69882812411eb20000000000000bf4 | 84.970 | 60.164 | n/a | 7.658 | 17.140 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 84.962 | 1.000 | 0.007 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.954ms; client.parse 1.693ms; driver.publication 1.319ms |
| 4e69882812411eb200000000000009f5 | 79.482 | 3.013 | n/a | 0.000 | 0.819 | 75.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.832 | 0.048 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.486ms; driver.publication 1.434ms |
| 4e69882812411eb2000000000000066e | 75.736 | 8.045 | n/a | 0.000 | 10.634 | 57.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 18.679 | 0.247 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.957ms |
| 4e69882812411eb2000000000000096a | 73.287 | 22.862 | n/a | 0.000 | 1.039 | 49.381 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 23.901 | 0.326 | 0.005 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.045ms |
| 4e69882812411eb200000000000009f1 | 71.083 | 2.469 | n/a | 0.000 | 0.627 | 67.969 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.096 | 0.044 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.486ms; driver.publication 1.434ms; driver.publication 1.083ms |
| 4e69882812411eb2000000000000066f | 70.458 | 29.466 | n/a | 37.534 | 3.450 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 70.450 | 1.000 | 0.008 | node-14/thread-0/node.gc | driver.publication 1.957ms; driver.publication 1.105ms; driver.publication 1.033ms |
| 4e69882812411eb20000000000000954 | 69.339 | 25.123 | n/a | 0.000 | 2.112 | 42.081 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 27.235 | 0.393 | 0.023 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.290ms; driver.expected-state.bind-receipt 1.276ms; driver.publication 1.198ms |
| 4e69882812411eb200000000000009f4 | 69.180 | 2.437 | n/a | 0.000 | 0.169 | 66.562 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.606 | 0.038 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.486ms; driver.publication 1.434ms |
| 4e69882812411eb2000000000000096b | 67.940 | 4.524 | n/a | 0.000 | 1.590 | 61.817 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 6.114 | 0.090 | 0.010 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.045ms |
| 4e69882812411eb20000000000000a19 | 67.668 | 64.639 | n/a | 1.887 | 1.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 67.662 | 1.000 | 0.007 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.417ms |
| 4e69882812411eb20000000000000662 | 66.771 | 8.125 | n/a | 0.000 | 33.024 | 25.594 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 41.148 | 0.616 | 0.029 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 4.105ms; driver.publication 3.765ms; driver.publication 3.741ms |
| 4e69882812411eb2000000000000095e | 66.198 | 5.218 | n/a | 0.000 | 26.429 | 34.534 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 31.647 | 0.478 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 7.225ms; driver.publication 1.408ms; driver.publication 1.119ms; driver.publication 1.094ms |

## P2 / L1024 / commit / 5-10 facts (507 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.943 | 3.180 | n/a | 0.000 | 0.794 | 13.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 4.241 | 0.252 | 0.014 |
| p99 | 86.982 | 47.917 | n/a | 2.272 | 33.264 | 62.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 54.678 | 1.000 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000bf0 | 184.136 | 133.538 | n/a | 17.326 | 33.264 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 184.128 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve | client.parse 2.164ms; driver.publication 1.954ms; client.parse 1.693ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb20000000000000bf1 | 158.123 | 134.994 | n/a | 17.326 | 5.792 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 158.113 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | client.parse 2.164ms; driver.publication 1.954ms; client.parse 1.693ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb20000000000000bef | 149.057 | 5.458 | n/a | 0.000 | 39.519 | 104.061 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.019 | 44.977 | 0.302 | 0.019 | node-14/thread-0/socket.wait-first-byte | client.parse 2.164ms; driver.publication 1.206ms; driver.expected-state.bind-receipt 1.055ms |
| 4e69882812411eb200000000000008f9 | 131.958 | 4.804 | n/a | 0.000 | 1.813 | 125.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 6.617 | 0.050 | 0.018 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.912ms; driver.publication 1.069ms; driver.publication 1.046ms; driver.publication 1.011ms |
| 4e69882812411eb20000000000000904 | 110.210 | 3.078 | n/a | 0.000 | 51.599 | 55.520 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 54.678 | 0.496 | 0.013 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.912ms; driver.publication 1.069ms; driver.publication 1.046ms; driver.publication 1.011ms |
| 4e69882812411eb20000000000000bf3 | 86.982 | 4.137 | n/a | 0.000 | 20.308 | 62.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 24.445 | 0.281 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.954ms; client.parse 1.693ms |
| 4e69882812411eb20000000000000bf4 | 84.970 | 60.164 | n/a | 7.658 | 17.140 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 84.962 | 1.000 | 0.007 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.954ms; client.parse 1.693ms; driver.publication 1.319ms |
| 4e69882812411eb200000000000009f5 | 79.482 | 3.013 | n/a | 0.000 | 0.819 | 75.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 3.832 | 0.048 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.486ms; driver.publication 1.434ms |
| 4e69882812411eb2000000000000066e | 75.736 | 8.045 | n/a | 0.000 | 10.634 | 57.047 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 18.679 | 0.247 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.957ms |
| 4e69882812411eb200000000000009f1 | 71.083 | 2.469 | n/a | 0.000 | 0.627 | 67.969 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 3.096 | 0.044 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.486ms; driver.publication 1.434ms; driver.publication 1.083ms |
| 4e69882812411eb200000000000009f4 | 69.180 | 2.437 | n/a | 0.000 | 0.169 | 66.562 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 2.606 | 0.038 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.486ms; driver.publication 1.434ms |
| 4e69882812411eb20000000000000662 | 66.771 | 8.125 | n/a | 0.000 | 33.024 | 25.594 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 41.148 | 0.616 | 0.029 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 4.105ms; driver.publication 3.765ms; driver.publication 3.741ms |
| 4e69882812411eb2000000000000095e | 66.198 | 5.218 | n/a | 0.000 | 26.429 | 34.534 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 31.647 | 0.478 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 7.225ms; driver.publication 1.408ms; driver.publication 1.119ms; driver.publication 1.094ms |
| 4e69882812411eb20000000000000a18 | 66.104 | 4.795 | n/a | 0.000 | 0.929 | 60.360 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.020 | 5.724 | 0.087 | 0.020 | node-14/thread-0/socket.wait-first-byte | none observed |
| 4e69882812411eb20000000000000957 | 64.558 | 3.733 | n/a | 0.000 | 18.138 | 42.676 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 21.871 | 0.339 | 0.011 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 7.225ms; driver.publication 5.290ms; driver.expected-state.bind-receipt 1.276ms; driver.publication 1.198ms; driver.publication 1.119ms |
| 4e69882812411eb200000000000008fb | 63.470 | 2.499 | n/a | 0.000 | 0.772 | 60.186 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 3.271 | 0.052 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.912ms |
| 4e69882812411eb20000000000000900 | 63.189 | 2.390 | n/a | 0.000 | 0.501 | 60.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 2.891 | 0.046 | 0.017 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.912ms; driver.publication 1.069ms; driver.publication 1.046ms |
| 4e69882812411eb20000000000000962 | 62.808 | 5.868 | n/a | 0.000 | 36.743 | 20.176 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 42.611 | 0.678 | 0.021 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 2.189ms; driver.publication 0.502ms |
| 4e69882812411eb20000000000000745 | 61.536 | 3.907 | n/a | 0.000 | 27.907 | 29.707 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 31.814 | 0.517 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.992ms; driver.publication 1.418ms; driver.expected-state.bind-receipt 1.306ms; driver.expected-state.bind-receipt 1.167ms; driver.publication 1.053ms |
| 4e69882812411eb20000000000000958 | 61.136 | 49.276 | n/a | 0.000 | 11.852 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 61.128 | 1.000 | 0.008 | node-14/thread-0/client.persist-and-resolve | driver.expected-state.bind-receipt 7.225ms; driver.publication 5.290ms; driver.publication 1.408ms; driver.expected-state.bind-receipt 1.276ms; driver.publication 1.198ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.453 | 2.432 | n/a | 0.000 | 3.379 | 33.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 5.811 | 0.147 | 0.009 |
| p99 | 39.453 | 2.432 | n/a | 0.000 | 3.379 | 33.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 5.811 | 0.147 | 0.009 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000000cc2 | 39.453 | 2.432 | n/a | 0.000 | 3.379 | 33.633 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 5.811 | 0.147 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.553ms; driver.publication 1.445ms; driver.expected-state.bind-receipt 1.038ms |

## P2 / tail / commit (2598 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.614 | 3.753 | n/a | 0.000 | 0.733 | 12.674 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.819 | 0.277 | 0.015 |
| p99 | 145.933 | 59.479 | n/a | 4.232 | 52.635 | 87.143 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.049 | 110.457 | 1.000 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000001185 | 224.823 | 8.149 | n/a | 0.000 | 176.569 | 40.094 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 184.718 | 0.822 | 0.011 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 5.893ms; driver.expected-state.bind-receipt 1.959ms; driver.publication 1.884ms; driver.publication 1.852ms; driver.publication 1.491ms |
| 4e69882812411eb20000000000001157 | 220.496 | 119.389 | n/a | 4.462 | 96.634 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 220.485 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 92.557ms; driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms |
| 4e69882812411eb20000000000001158 | 212.053 | 136.523 | n/a | 4.462 | 71.055 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 212.041 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 66.808ms; driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms |
| 4e69882812411eb20000000000001154 | 208.168 | 89.646 | n/a | 4.462 | 114.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 208.146 | 1.000 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 110.496ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000115b | 207.006 | 187.499 | n/a | 6.616 | 12.878 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 206.994 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 7.829ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms |
| 4e69882812411eb20000000000001156 | 206.798 | 98.540 | n/a | 4.462 | 103.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 206.783 | 1.000 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 99.899ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb20000000000001159 | 206.185 | 140.284 | n/a | 4.462 | 61.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 206.167 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | driver.publication 56.855ms; driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms |
| 4e69882812411eb20000000000001155 | 205.143 | 92.821 | n/a | 4.462 | 107.838 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 205.121 | 1.000 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 104.097ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb20000000000001485 | 201.067 | 15.098 | n/a | 0.000 | 95.359 | 90.592 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 110.457 | 0.549 | 0.018 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.181ms; driver.publication 2.041ms; driver.expected-state.bind-receipt 1.417ms; driver.publication 1.415ms; driver.publication 1.222ms |
| 4e69882812411eb2000000000000115e | 200.807 | 190.621 | n/a | 6.616 | 3.558 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 200.795 | 1.000 | 0.012 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb20000000000001151 | 200.202 | 14.121 | n/a | 0.000 | 1.175 | 108.963 | 2.007 | 0.030 | 0.000 | 73.883 | 0.002 | n/a | n/a | 0.021 | 15.296 | 0.076 | 0.021 | node-14/thread-0/socket.wait-first-byte | driver.publication 125.550ms; client.encode 2.502ms; driver.expected-state.bind-receipt 1.125ms; driver.publication 0.569ms |
| 4e69882812411eb20000000000001153 | 197.772 | 9.169 | n/a | 0.000 | 114.205 | 74.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.027 | 123.374 | 0.624 | 0.027 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 111.246ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; driver.expected-state.bind-receipt 1.125ms |
| 4e69882812411eb2000000000000115f | 197.095 | 189.377 | n/a | 2.154 | 5.542 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 197.073 | 1.000 | 0.022 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000116b | 196.746 | 4.702 | n/a | 0.000 | 97.837 | 94.195 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 102.539 | 0.521 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; driver.publication 2.123ms |
| 4e69882812411eb2000000000000115d | 195.976 | 185.398 | n/a | 6.616 | 3.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 195.959 | 1.000 | 0.017 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb20000000000001160 | 194.818 | 189.572 | n/a | 2.154 | 3.074 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 194.801 | 1.000 | 0.017 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000115c | 190.717 | 174.344 | n/a | 6.616 | 0.538 | 9.184 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 181.499 | 0.952 | 0.034 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000117c | 190.437 | 3.118 | n/a | 0.000 | 140.785 | 46.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 143.903 | 0.756 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 14.530ms; driver.expected-state.bind-receipt 1.959ms; driver.publication 1.884ms; driver.publication 1.852ms; driver.publication 1.491ms |
| 4e69882812411eb20000000000001498 | 182.200 | 3.359 | n/a | 0.000 | 132.049 | 46.777 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 135.408 | 0.743 | 0.015 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 3.181ms; driver.publication 2.041ms; driver.publication 1.864ms; driver.publication 1.540ms; client.encode 1.419ms |
| 4e69882812411eb20000000000001162 | 180.344 | 167.881 | n/a | 2.154 | 10.287 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 180.322 | 1.000 | 0.022 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 4.262ms; driver.expected-state.bind-receipt 2.509ms; driver.publication 2.123ms |

## P2 / tail / commit / 5-10 facts (1540 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.788 | 3.282 | n/a | 0.000 | 0.750 | 11.715 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 4.287 | 0.270 | 0.015 |
| p99 | 131.688 | 49.757 | n/a | 4.232 | 49.677 | 85.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.047 | 99.265 | 1.000 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4e69882812411eb20000000000001157 | 220.496 | 119.389 | n/a | 4.462 | 96.634 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 220.485 | 1.000 | 0.011 | node-14/thread-0/client.persist-and-resolve | driver.publication 92.557ms; driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms |
| 4e69882812411eb20000000000001154 | 208.168 | 89.646 | n/a | 4.462 | 114.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 208.146 | 1.000 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 110.496ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb20000000000001156 | 206.798 | 98.540 | n/a | 4.462 | 103.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 206.783 | 1.000 | 0.014 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 99.899ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb20000000000001159 | 206.185 | 140.284 | n/a | 4.462 | 61.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 206.167 | 1.000 | 0.018 | node-14/thread-0/client.persist-and-resolve | driver.publication 56.855ms; driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms |
| 4e69882812411eb20000000000001155 | 205.143 | 92.821 | n/a | 4.462 | 107.838 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 205.121 | 1.000 | 0.022 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 104.097ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000115f | 197.095 | 189.377 | n/a | 2.154 | 5.542 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 197.073 | 1.000 | 0.022 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000116b | 196.746 | 4.702 | n/a | 0.000 | 97.837 | 94.195 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 102.539 | 0.521 | 0.012 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; driver.publication 2.123ms |
| 4e69882812411eb2000000000000115d | 195.976 | 185.398 | n/a | 6.616 | 3.945 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 195.959 | 1.000 | 0.017 | node-14/thread-0/client.persist-and-resolve | driver.publication 14.530ms; driver.publication 6.044ms; driver.publication 5.273ms; driver.expected-state.bind-receipt 2.509ms; client.encode 2.502ms |
| 4e69882812411eb2000000000000117c | 190.437 | 3.118 | n/a | 0.000 | 140.785 | 46.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 143.903 | 0.756 | 0.013 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 14.530ms; driver.expected-state.bind-receipt 1.959ms; driver.publication 1.884ms; driver.publication 1.852ms; driver.publication 1.491ms |
| 4e69882812411eb20000000000001418 | 145.933 | 142.053 | n/a | 3.167 | 0.692 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 145.912 | 1.000 | 0.021 | node-14/thread-0/client.persist-and-resolve | driver.publication 2.890ms; driver.expected-state.bind-receipt 2.840ms; driver.publication 1.993ms; driver.publication 1.672ms; driver.publication 1.593ms |
| 4e69882812411eb20000000000001193 | 142.060 | 4.996 | n/a | 0.000 | 116.298 | 20.755 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 121.294 | 0.854 | 0.010 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 6.462ms; driver.publication 5.154ms; driver.publication 1.724ms; driver.publication 1.660ms; driver.publication 1.542ms |
| 4e69882812411eb20000000000001417 | 141.980 | 9.792 | n/a | 0.000 | 1.444 | 109.656 | 2.621 | 7.023 | 0.000 | 1.447 | 9.974 | n/a | n/a | 0.024 | 11.235 | 0.079 | 0.024 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 2.840ms; driver.publication 1.672ms; driver.publication 1.593ms; driver.expected-state.bind-receipt 1.025ms |
| 4e69882812411eb20000000000001aa3 | 141.498 | 79.432 | n/a | 5.966 | 56.091 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 141.489 | 1.000 | 0.010 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.128ms; driver.publication 1.734ms; driver.expected-state.bind-receipt 1.685ms; driver.publication 1.635ms; driver.publication 1.244ms |
| 4e69882812411eb20000000000001419 | 139.245 | 6.106 | n/a | 0.000 | 0.718 | 109.410 | 5.030 | 0.064 | 0.000 | 4.614 | 13.257 | n/a | n/a | 0.046 | 6.824 | 0.049 | 0.046 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.890ms; driver.expected-state.bind-receipt 2.840ms; driver.publication 1.993ms; driver.publication 1.672ms; driver.publication 1.593ms |
| 4e69882812411eb2000000000000118b | 136.356 | 3.295 | n/a | 0.000 | 95.969 | 37.082 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 99.265 | 0.728 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 6.462ms; driver.publication 5.154ms; driver.publication 1.542ms; driver.publication 1.465ms; driver.publication 1.453ms |
| 4e69882812411eb20000000000001964 | 131.688 | 3.304 | n/a | 0.000 | 0.898 | 109.087 | 0.468 | 0.431 | 0.000 | 0.599 | 16.884 | n/a | n/a | 0.018 | 4.202 | 0.032 | 0.018 | node-14/thread-0/socket.wait-first-byte | client.parse 1.589ms; driver.publication 1.561ms |
| 4e69882812411eb20000000000001997 | 130.566 | 5.384 | n/a | 0.000 | 106.228 | 18.944 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 111.612 | 0.855 | 0.009 | node-14/thread-0/driver.queue (scheduler/subject/admission) | driver.publication 8.687ms; driver.publication 6.574ms; driver.expected-state.bind-receipt 1.932ms; driver.publication 1.724ms; driver.publication 1.633ms |
| 4e69882812411eb20000000000001f20 | 130.380 | 72.115 | n/a | 8.787 | 49.471 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 130.374 | 1.000 | 0.006 | node-14/thread-0/client.persist-and-resolve | driver.publication 1.509ms; client.parse 1.503ms |
| 4e69882812411eb20000000000001971 | 126.289 | 49.757 | n/a | 3.823 | 3.199 | 69.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 56.779 | 0.450 | 0.015 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.361ms; driver.publication 1.124ms; driver.publication 1.096ms; driver.publication 1.093ms; driver.publication 1.069ms |
| 4e69882812411eb2000000000000147e | 125.173 | 4.514 | n/a | 0.000 | 1.004 | 119.642 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 5.517 | 0.044 | 0.014 | node-14/thread-0/socket.wait-first-byte | driver.publication 3.181ms; driver.publication 2.041ms; driver.publication 1.540ms; driver.publication 1.415ms; driver.publication 1.222ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.549 | 0.078 | n/a | 0.000 | 0.000 | 1.276 | 200.201 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.155 | 0.078 | 0.000 | 0.155 |
| p99 | 206.145 | 21.017 | n/a | 1.431 | 0.000 | 9.071 | 204.242 | 0.101 | 23.821 | 0.247 | 0.000 | n/a | n/a | 3.575 | 21.017 | 0.274 | 3.575 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa0000000000000007 | 206.145 | 0.061 | n/a | 0.000 | 0.000 | 1.276 | 204.242 | 0.036 | 0.000 | 0.247 | 0.000 | n/a | n/a | 0.283 | 0.061 | 0.000 | 0.283 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000005 | 203.568 | 0.078 | n/a | 0.000 | 0.000 | 1.792 | 201.264 | 0.015 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.320 | 0.078 | 0.000 | 0.320 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000006 | 203.522 | 0.148 | n/a | 0.000 | 0.000 | 1.700 | 201.364 | 0.016 | 0.000 | 0.181 | 0.000 | n/a | n/a | 0.112 | 0.148 | 0.001 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f3b | 201.659 | 0.044 | n/a | 0.000 | 0.000 | 1.149 | 200.333 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.098 | 0.044 | 0.000 | 0.098 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f3a | 201.607 | 0.055 | n/a | 0.000 | 0.000 | 1.202 | 200.201 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.119 | 0.055 | 0.000 | 0.119 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f3c | 201.549 | 0.032 | n/a | 0.000 | 0.000 | 1.003 | 200.423 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.050 | 0.032 | 0.000 | 0.050 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000002 | 142.805 | 1.348 | n/a | 0.000 | 0.000 | 0.991 | 116.156 | 0.101 | 23.821 | 0.092 | 0.000 | n/a | n/a | 0.296 | 1.348 | 0.009 | 0.296 | gw-r/thread-51/gateway.admitted-work | none observed |
| 62edfb76d0f858fa0000000000000f3f | 106.545 | 21.017 | n/a | 0.000 | 0.000 | 9.071 | 72.882 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.575 | 21.017 | 0.197 | 3.575 | gw-r/thread-48/gateway.admitted-work | none observed |
| 62edfb76d0f858fa0000000000000f40 | 70.887 | 14.612 | n/a | 0.000 | 0.000 | 3.842 | 52.256 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.178 | 14.612 | 0.206 | 0.178 | gw-r/thread-53/gateway.admitted-work | none observed |
| 62edfb76d0f858fa0000000000000f41 | 70.577 | 17.936 | n/a | 1.431 | 0.000 | 1.516 | 49.539 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.155 | 19.367 | 0.274 | 0.155 | gw-r/thread-48/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 832.422 | 6.453 | n/a | 0.000 | 0.000 | 1.218 | 810.405 | 0.040 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.377 | 6.453 | 0.024 | 0.377 |
| p99 | 1005.193 | 20.273 | n/a | 0.000 | 0.000 | 1.664 | 1002.048 | 0.050 | 0.000 | 0.661 | 0.000 | n/a | n/a | 0.484 | 20.273 | 0.421 | 0.484 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a00000000000000a4 | 1005.193 | 0.287 | n/a | 0.000 | 0.000 | 1.664 | 1002.048 | 0.050 | 0.000 | 0.661 | 0.000 | n/a | n/a | 0.484 | 0.287 | 0.000 | 0.484 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000a5 | 832.422 | 20.273 | n/a | 0.000 | 0.000 | 1.218 | 810.405 | 0.020 | 0.000 | 0.130 | 0.000 | n/a | n/a | 0.377 | 20.273 | 0.024 | 0.377 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000864 | 15.334 | 6.453 | n/a | 0.000 | 0.000 | 1.210 | 7.528 | 0.040 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.076 | 6.453 | 0.421 | 0.076 | gw-r/thread-52/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 471.075 | 3.233 | n/a | 0.000 | 0.000 | 1.193 | 465.639 | 0.029 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.118 | 3.233 | 0.007 | 0.118 |
| p99 | 1010.865 | 11.571 | n/a | 1.140 | 0.000 | 3.406 | 995.487 | 0.598 | 0.000 | 0.180 | 0.000 | n/a | n/a | 3.891 | 12.711 | 0.454 | 3.891 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a00000000000000cf | 1010.865 | 11.571 | n/a | 1.140 | 0.000 | 1.874 | 995.487 | 0.510 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.197 | 12.711 | 0.013 | 0.197 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000ba | 984.048 | 3.194 | n/a | 0.000 | 0.000 | 2.700 | 978.007 | 0.008 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.120 | 3.194 | 0.003 | 0.120 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000b4 | 970.938 | 10.852 | n/a | 0.000 | 0.000 | 1.084 | 954.779 | 0.218 | 0.000 | 0.115 | 0.000 | n/a | n/a | 3.891 | 10.852 | 0.011 | 3.891 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000b3 | 957.911 | 3.982 | n/a | 0.000 | 0.000 | 2.218 | 951.438 | 0.029 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.135 | 3.982 | 0.004 | 0.135 | gw-r/thread-51/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000bb | 952.297 | 2.775 | n/a | 0.000 | 0.000 | 1.029 | 947.877 | 0.299 | 0.000 | 0.180 | 0.000 | n/a | n/a | 0.137 | 2.775 | 0.003 | 0.137 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000bf | 844.949 | 5.640 | n/a | 0.000 | 0.000 | 1.269 | 837.755 | 0.017 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.179 | 5.640 | 0.007 | 0.179 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000c9 | 844.170 | 2.438 | n/a | 0.000 | 0.000 | 1.087 | 840.463 | 0.016 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.089 | 2.438 | 0.003 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000c6 | 814.085 | 3.970 | n/a | 0.000 | 0.000 | 1.193 | 808.728 | 0.016 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.083 | 3.970 | 0.005 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000ae | 785.186 | 3.233 | n/a | 0.000 | 0.000 | 1.279 | 780.424 | 0.012 | 0.000 | 0.149 | 0.000 | n/a | n/a | 0.089 | 3.233 | 0.004 | 0.089 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000a7 | 622.608 | 3.518 | n/a | 0.000 | 0.000 | 1.124 | 617.630 | 0.029 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.198 | 3.518 | 0.006 | 0.198 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000ab | 618.963 | 3.333 | n/a | 0.000 | 0.000 | 1.042 | 614.322 | 0.028 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.118 | 3.333 | 0.005 | 0.118 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000a8 | 562.558 | 4.469 | n/a | 0.000 | 0.000 | 1.344 | 556.312 | 0.100 | 0.000 | 0.173 | 0.000 | n/a | n/a | 0.160 | 4.469 | 0.008 | 0.160 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000b8 | 560.550 | 2.384 | n/a | 0.000 | 0.000 | 1.107 | 556.649 | 0.185 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.082 | 2.384 | 0.004 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000c1 | 527.541 | 7.773 | n/a | 0.000 | 0.000 | 1.256 | 517.983 | 0.191 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.230 | 7.773 | 0.015 | 0.230 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000c2 | 471.075 | 2.796 | n/a | 0.000 | 0.000 | 2.314 | 465.639 | 0.166 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.100 | 2.796 | 0.006 | 0.100 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000ca | 408.576 | 3.656 | n/a | 0.000 | 0.000 | 1.273 | 403.486 | 0.018 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.078 | 3.656 | 0.009 | 0.078 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000aa | 403.629 | 2.843 | n/a | 0.000 | 0.000 | 2.761 | 397.719 | 0.016 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.189 | 2.843 | 0.007 | 0.189 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000b7 | 401.658 | 2.554 | n/a | 0.000 | 0.000 | 1.116 | 397.297 | 0.509 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.082 | 2.554 | 0.006 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000ad | 387.151 | 5.353 | n/a | 0.000 | 0.000 | 1.082 | 380.217 | 0.153 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.215 | 5.353 | 0.014 | 0.215 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000cd | 320.446 | 2.697 | n/a | 0.000 | 0.000 | 1.912 | 315.512 | 0.169 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.081 | 2.697 | 0.008 | 0.081 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (41 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 417.644 | 4.234 | n/a | 0.554 | 0.000 | 1.210 | 410.454 | 0.016 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.110 | 4.868 | 0.011 | 0.110 |
| p99 | 1006.690 | 14.242 | n/a | 2.315 | 0.000 | 4.114 | 1000.868 | 1.464 | 17.559 | 0.185 | 0.000 | n/a | n/a | 1.124 | 15.853 | 0.573 | 1.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a00000000000000e4 | 1006.690 | 3.129 | n/a | 0.572 | 0.000 | 1.924 | 1000.868 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.127 | 3.701 | 0.004 | 0.127 | gw-r/thread-51/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000d1 | 1004.410 | 5.698 | n/a | 1.353 | 0.000 | 1.210 | 995.938 | 0.016 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.085 | 7.051 | 0.007 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000d7 | 1003.192 | 0.123 | n/a | 0.000 | 0.000 | 1.087 | 1000.698 | 0.022 | 0.000 | 0.138 | 0.000 | n/a | n/a | 1.124 | 0.123 | 0.000 | 1.124 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000100 | 1001.369 | 3.509 | n/a | 0.514 | 0.000 | 1.113 | 996.054 | 0.017 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.094 | 4.023 | 0.004 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000d0 | 1000.674 | 7.443 | n/a | 1.486 | 0.000 | 1.164 | 989.594 | 0.581 | 0.000 | 0.185 | 0.000 | n/a | n/a | 0.221 | 8.929 | 0.009 | 0.221 | gw-r/thread-51/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000010c | 997.303 | 4.633 | n/a | 0.000 | 0.000 | 1.270 | 990.953 | 0.182 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.195 | 4.633 | 0.005 | 0.195 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000104 | 990.564 | 3.274 | n/a | 0.000 | 0.000 | 1.189 | 985.888 | 0.019 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.115 | 3.274 | 0.003 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000dd | 986.288 | 5.445 | n/a | 0.513 | 0.000 | 1.218 | 961.386 | 0.018 | 17.559 | 0.072 | 0.000 | n/a | n/a | 0.077 | 5.958 | 0.006 | 0.077 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000de | 975.050 | 4.234 | n/a | 2.315 | 0.000 | 1.133 | 967.198 | 0.015 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.085 | 6.549 | 0.007 | 0.085 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000d9 | 968.090 | 5.361 | n/a | 0.837 | 0.000 | 1.278 | 960.408 | 0.015 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.113 | 6.198 | 0.006 | 0.113 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000dc | 766.574 | 3.152 | n/a | 0.476 | 0.000 | 3.137 | 758.113 | 1.464 | 0.000 | 0.121 | 0.000 | n/a | n/a | 0.112 | 3.628 | 0.005 | 0.112 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000fd | 742.826 | 5.315 | n/a | 0.600 | 0.000 | 4.114 | 732.566 | 0.013 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.136 | 5.915 | 0.008 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000fc | 651.507 | 3.730 | n/a | 0.568 | 0.000 | 1.198 | 645.813 | 0.011 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.116 | 4.298 | 0.007 | 0.116 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000e6 | 566.097 | 10.047 | n/a | 0.941 | 0.000 | 2.143 | 552.662 | 0.044 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.122 | 10.988 | 0.019 | 0.122 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000101 | 553.848 | 2.695 | n/a | 0.000 | 0.000 | 2.580 | 548.376 | 0.014 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.110 | 2.695 | 0.005 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000df | 553.274 | 3.977 | n/a | 0.514 | 0.000 | 1.164 | 547.435 | 0.013 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.096 | 4.491 | 0.008 | 0.096 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000106 | 470.974 | 14.242 | n/a | 1.611 | 0.000 | 1.437 | 453.354 | 0.031 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.163 | 15.853 | 0.034 | 0.163 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000102 | 451.191 | 6.295 | n/a | 0.814 | 0.000 | 1.266 | 442.559 | 0.012 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.173 | 7.108 | 0.016 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000000d3 | 434.571 | 4.039 | n/a | 0.737 | 0.000 | 1.142 | 428.455 | 0.010 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.090 | 4.776 | 0.011 | 0.090 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000010b | 423.125 | 4.058 | n/a | 1.465 | 0.000 | 1.143 | 416.303 | 0.012 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.082 | 5.523 | 0.013 | 0.082 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 448.830 | 3.145 | n/a | 0.000 | 0.000 | 1.178 | 442.463 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.081 | 3.217 | 0.008 | 0.081 |
| p99 | 1009.166 | 12.729 | n/a | 1.036 | 0.000 | 5.461 | 1002.697 | 1.001 | 0.000 | 0.129 | 0.000 | n/a | n/a | 1.174 | 13.376 | 0.799 | 1.174 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a0000000000000125 | 1009.166 | 4.386 | n/a | 0.000 | 0.000 | 5.461 | 998.616 | 0.547 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.071 | 4.386 | 0.004 | 0.071 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000129 | 1006.718 | 2.647 | n/a | 0.000 | 0.000 | 1.119 | 1002.697 | 0.139 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.071 | 2.647 | 0.003 | 0.071 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000113 | 1003.705 | 0.196 | n/a | 0.000 | 0.000 | 1.231 | 1001.015 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 1.166 | 0.196 | 0.000 | 1.166 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000140 | 1003.281 | 0.130 | n/a | 0.000 | 0.000 | 1.147 | 1000.785 | 0.015 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.131 | 0.130 | 0.000 | 1.131 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000012a | 1002.575 | 0.134 | n/a | 0.000 | 0.000 | 1.156 | 1000.044 | 0.008 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.174 | 0.134 | 0.000 | 1.174 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000137 | 1001.295 | 2.777 | n/a | 0.000 | 0.000 | 1.093 | 997.312 | 0.007 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.068 | 2.777 | 0.003 | 0.068 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000011c | 996.572 | 2.679 | n/a | 0.607 | 0.000 | 2.566 | 990.429 | 0.190 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.062 | 3.286 | 0.003 | 0.062 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000148 | 989.666 | 5.218 | n/a | 0.000 | 0.000 | 1.215 | 982.561 | 0.489 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.129 | 5.218 | 0.005 | 0.129 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000133 | 972.618 | 6.694 | n/a | 0.000 | 0.000 | 1.358 | 963.810 | 0.520 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.203 | 6.694 | 0.007 | 0.203 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000123 | 922.799 | 3.145 | n/a | 0.000 | 0.000 | 1.085 | 918.455 | 0.007 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.069 | 3.145 | 0.003 | 0.069 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000012d | 892.613 | 10.036 | n/a | 0.000 | 0.000 | 1.133 | 881.253 | 0.006 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.160 | 10.036 | 0.011 | 0.160 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000013c | 770.651 | 1.689 | n/a | 0.000 | 0.000 | 1.019 | 767.796 | 0.014 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.058 | 1.689 | 0.002 | 0.058 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000139 | 677.985 | 3.217 | n/a | 0.000 | 0.000 | 1.057 | 673.555 | 0.015 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.087 | 3.217 | 0.005 | 0.087 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000011a | 618.985 | 3.524 | n/a | 0.000 | 0.000 | 1.077 | 614.218 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.118 | 3.524 | 0.006 | 0.118 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000110 | 584.826 | 2.364 | n/a | 0.000 | 0.000 | 2.939 | 579.349 | 0.033 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.063 | 2.364 | 0.004 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000010e | 565.137 | 3.229 | n/a | 0.000 | 0.000 | 1.106 | 560.602 | 0.011 | 0.000 | 0.129 | 0.000 | n/a | n/a | 0.061 | 3.229 | 0.006 | 0.061 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000136 | 558.709 | 3.105 | n/a | 0.000 | 0.000 | 1.136 | 554.353 | 0.008 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.072 | 3.105 | 0.006 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000126 | 505.175 | 7.490 | n/a | 0.957 | 0.000 | 1.306 | 495.295 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.069 | 8.447 | 0.017 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000011d | 494.551 | 2.216 | n/a | 0.000 | 0.000 | 1.136 | 491.057 | 0.006 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.061 | 2.216 | 0.004 | 0.061 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000127 | 492.316 | 2.983 | n/a | 0.000 | 0.000 | 1.923 | 487.296 | 0.008 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.078 | 2.983 | 0.006 | 0.078 | gw-r/thread-54/journal/page | none observed |

## P3 / L16 / internal (43 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 338.982 | 3.011 | n/a | 0.000 | 0.000 | 1.129 | 335.561 | 0.009 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.086 | 3.011 | 0.012 | 0.086 |
| p99 | 1004.252 | 12.509 | n/a | 1.292 | 0.000 | 3.988 | 1000.299 | 0.507 | 15.934 | 0.099 | 0.000 | n/a | n/a | 1.188 | 13.455 | 0.730 | 1.188 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a0000000000000185 | 1004.252 | 0.130 | n/a | 0.000 | 0.000 | 2.575 | 1000.299 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.188 | 0.130 | 0.000 | 1.188 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000017a | 1004.201 | 2.939 | n/a | 0.000 | 0.000 | 1.226 | 999.654 | 0.246 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.086 | 2.939 | 0.003 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000164 | 1004.068 | 2.702 | n/a | 0.000 | 0.000 | 1.059 | 1000.103 | 0.094 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.066 | 2.702 | 0.003 | 0.066 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000173 | 1002.689 | 0.156 | n/a | 0.000 | 0.000 | 1.085 | 1000.272 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.118 | 0.156 | 0.000 | 1.118 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000016d | 1002.261 | 4.894 | n/a | 0.000 | 0.000 | 1.222 | 996.005 | 0.007 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.103 | 4.894 | 0.005 | 0.103 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000154 | 997.928 | 2.845 | n/a | 0.000 | 0.000 | 1.092 | 993.566 | 0.289 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.078 | 2.845 | 0.003 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000017e | 997.853 | 2.671 | n/a | 0.000 | 0.000 | 1.122 | 993.941 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.082 | 2.671 | 0.003 | 0.082 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000184 | 995.403 | 2.456 | n/a | 0.000 | 0.000 | 1.104 | 991.743 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.068 | 2.456 | 0.002 | 0.068 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000182 | 890.344 | 5.436 | n/a | 0.000 | 0.000 | 1.299 | 883.387 | 0.006 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.188 | 5.436 | 0.006 | 0.188 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000016c | 884.404 | 5.366 | n/a | 0.000 | 0.000 | 1.123 | 877.754 | 0.014 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.125 | 5.366 | 0.006 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000017c | 836.697 | 5.781 | n/a | 0.000 | 0.000 | 1.091 | 829.429 | 0.125 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.238 | 5.781 | 0.007 | 0.238 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000188 | 833.158 | 2.482 | n/a | 0.000 | 0.000 | 1.141 | 829.416 | 0.007 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.087 | 2.482 | 0.003 | 0.087 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000176 | 794.667 | 2.666 | n/a | 0.000 | 0.000 | 1.073 | 790.809 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.078 | 2.666 | 0.003 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000015a | 763.172 | 5.965 | n/a | 0.000 | 0.000 | 3.344 | 737.699 | 0.007 | 15.934 | 0.045 | 0.000 | n/a | n/a | 0.178 | 5.965 | 0.008 | 0.178 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000014d | 667.581 | 4.068 | n/a | 0.000 | 0.000 | 1.211 | 662.191 | 0.008 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.066 | 4.068 | 0.006 | 0.066 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000152 | 646.214 | 3.877 | n/a | 0.000 | 0.000 | 1.186 | 640.415 | 0.507 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.131 | 3.877 | 0.006 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000016f | 612.620 | 2.539 | n/a | 0.000 | 0.000 | 1.111 | 608.740 | 0.139 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.061 | 2.539 | 0.004 | 0.061 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000162 | 555.027 | 2.878 | n/a | 0.000 | 0.000 | 1.084 | 550.924 | 0.012 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.081 | 2.878 | 0.005 | 0.081 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000155 | 523.783 | 5.384 | n/a | 0.000 | 0.000 | 3.988 | 514.095 | 0.007 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.253 | 5.384 | 0.010 | 0.253 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000166 | 522.037 | 4.414 | n/a | 0.000 | 0.000 | 1.610 | 515.859 | 0.021 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.100 | 4.414 | 0.008 | 0.100 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 325.202 | 3.278 | n/a | 0.000 | 0.000 | 1.145 | 316.810 | 0.015 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.079 | 3.278 | 0.013 | 0.079 |
| p99 | 1004.686 | 10.579 | n/a | 0.851 | 0.000 | 5.520 | 1000.506 | 3.319 | 10.508 | 0.124 | 0.000 | n/a | n/a | 1.215 | 11.430 | 0.682 | 1.215 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a00000000000001c3 | 1004.686 | 0.150 | n/a | 0.000 | 0.000 | 2.727 | 1000.506 | 0.014 | 0.000 | 0.074 | 0.000 | n/a | n/a | 1.215 | 0.150 | 0.000 | 1.215 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001a5 | 1002.898 | 5.305 | n/a | 0.631 | 0.000 | 1.169 | 995.258 | 0.325 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.165 | 5.936 | 0.006 | 0.165 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001c1 | 1002.796 | 0.124 | n/a | 0.000 | 0.000 | 1.044 | 1000.426 | 0.015 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.130 | 0.124 | 0.000 | 1.130 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001a6 | 1001.507 | 3.086 | n/a | 0.000 | 0.000 | 2.924 | 995.365 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.069 | 3.086 | 0.003 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001a4 | 970.910 | 3.432 | n/a | 0.000 | 0.000 | 1.088 | 966.276 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.065 | 3.432 | 0.004 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001c5 | 966.797 | 5.709 | n/a | 0.000 | 0.000 | 1.266 | 959.587 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.211 | 5.709 | 0.006 | 0.211 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000018a | 965.756 | 9.323 | n/a | 0.842 | 0.000 | 1.327 | 953.951 | 0.146 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.134 | 10.165 | 0.011 | 0.134 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001b4 | 920.210 | 2.512 | n/a | 0.000 | 0.000 | 2.698 | 914.882 | 0.010 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.063 | 2.512 | 0.003 | 0.063 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000199 | 760.237 | 1.620 | n/a | 0.000 | 0.000 | 1.499 | 756.996 | 0.006 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.061 | 1.620 | 0.002 | 0.061 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000198 | 742.015 | 3.509 | n/a | 0.000 | 0.000 | 1.070 | 737.181 | 0.132 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.065 | 3.509 | 0.005 | 0.065 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001ce | 731.261 | 3.498 | n/a | 0.000 | 0.000 | 1.077 | 726.550 | 0.013 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.072 | 3.498 | 0.005 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000019c | 633.701 | 5.315 | n/a | 0.000 | 0.000 | 2.821 | 625.417 | 0.006 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.110 | 5.315 | 0.008 | 0.110 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001b7 | 572.266 | 3.148 | n/a | 0.000 | 0.000 | 1.446 | 567.277 | 0.252 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.098 | 3.148 | 0.006 | 0.098 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001ac | 562.148 | 5.201 | n/a | 0.000 | 0.000 | 1.243 | 555.489 | 0.026 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.138 | 5.201 | 0.009 | 0.138 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001d3 | 560.148 | 3.273 | n/a | 0.000 | 0.000 | 1.095 | 555.664 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.079 | 3.273 | 0.006 | 0.079 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001d5 | 485.750 | 2.213 | n/a | 0.000 | 0.000 | 5.520 | 477.891 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.102 | 2.213 | 0.005 | 0.102 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000193 | 467.195 | 2.643 | n/a | 0.000 | 0.000 | 1.072 | 463.330 | 0.007 | 0.000 | 0.071 | 0.000 | n/a | n/a | 0.073 | 2.643 | 0.006 | 0.073 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001a0 | 439.402 | 2.434 | n/a | 0.000 | 0.000 | 1.145 | 435.668 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.081 | 2.434 | 0.006 | 0.081 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001d2 | 436.490 | 2.185 | n/a | 0.000 | 0.000 | 1.074 | 428.955 | 0.006 | 4.165 | 0.030 | 0.000 | n/a | n/a | 0.076 | 2.185 | 0.005 | 0.076 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001c8 | 399.031 | 6.831 | n/a | 0.000 | 0.000 | 1.101 | 390.147 | 0.792 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.107 | 6.831 | 0.017 | 0.107 | gw-r/thread-52/journal/page | none observed |

## P3 / L256 / internal (43 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 455.422 | 2.628 | n/a | 0.000 | 0.000 | 1.103 | 451.933 | 0.010 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.084 | 2.628 | 0.008 | 0.084 |
| p99 | 1005.683 | 9.805 | n/a | 0.000 | 0.000 | 4.857 | 1000.334 | 2.641 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.144 | 9.805 | 0.676 | 1.144 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a00000000000001ea | 1005.683 | 0.180 | n/a | 0.000 | 0.000 | 4.086 | 1000.199 | 0.010 | 0.000 | 0.063 | 0.000 | n/a | n/a | 1.144 | 0.180 | 0.000 | 1.144 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001ff | 1003.349 | 2.555 | n/a | 0.000 | 0.000 | 3.264 | 997.421 | 0.006 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.069 | 2.555 | 0.003 | 0.069 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000217 | 1002.691 | 0.112 | n/a | 0.000 | 0.000 | 1.090 | 1000.334 | 0.007 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.107 | 0.112 | 0.000 | 1.107 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000219 | 998.507 | 2.485 | n/a | 0.000 | 0.000 | 1.084 | 994.729 | 0.102 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.079 | 2.485 | 0.002 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000212 | 989.896 | 4.783 | n/a | 0.000 | 0.000 | 1.068 | 983.671 | 0.125 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.221 | 4.783 | 0.005 | 0.221 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000216 | 981.577 | 3.726 | n/a | 0.000 | 0.000 | 1.051 | 976.672 | 0.005 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.095 | 3.726 | 0.004 | 0.095 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001f9 | 977.326 | 2.601 | n/a | 0.000 | 0.000 | 1.085 | 973.421 | 0.125 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.064 | 2.601 | 0.003 | 0.064 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001e8 | 928.683 | 3.294 | n/a | 0.000 | 0.000 | 1.159 | 924.021 | 0.113 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.071 | 3.294 | 0.004 | 0.071 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000208 | 889.772 | 3.823 | n/a | 0.000 | 0.000 | 1.136 | 884.660 | 0.013 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.094 | 3.823 | 0.004 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001f5 | 867.080 | 5.989 | n/a | 0.000 | 0.000 | 2.910 | 857.939 | 0.008 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.204 | 5.989 | 0.007 | 0.204 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000210 | 772.653 | 2.596 | n/a | 0.000 | 0.000 | 1.053 | 768.889 | 0.007 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.080 | 2.596 | 0.003 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000213 | 770.909 | 9.805 | n/a | 0.000 | 0.000 | 4.857 | 756.052 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.154 | 9.805 | 0.013 | 0.154 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001f0 | 722.075 | 2.543 | n/a | 0.000 | 0.000 | 1.103 | 718.270 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.091 | 2.543 | 0.004 | 0.091 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001dc | 643.146 | 2.628 | n/a | 0.000 | 0.000 | 1.113 | 639.289 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.628 | 0.004 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001f2 | 541.793 | 4.319 | n/a | 0.000 | 0.000 | 1.198 | 536.007 | 0.165 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.062 | 4.319 | 0.008 | 0.062 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001e3 | 538.297 | 2.188 | n/a | 0.000 | 0.000 | 1.339 | 531.995 | 2.641 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.063 | 2.188 | 0.004 | 0.063 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000200 | 529.816 | 2.493 | n/a | 0.000 | 0.000 | 1.110 | 525.944 | 0.120 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.106 | 2.493 | 0.005 | 0.106 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000201 | 473.141 | 2.519 | n/a | 0.000 | 0.000 | 1.070 | 469.389 | 0.064 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.060 | 2.519 | 0.005 | 0.060 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000203 | 469.727 | 2.331 | n/a | 0.000 | 0.000 | 1.083 | 466.036 | 0.155 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.083 | 2.331 | 0.005 | 0.083 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000001de | 465.532 | 4.605 | n/a | 0.000 | 0.000 | 1.087 | 459.653 | 0.011 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.125 | 4.605 | 0.010 | 0.125 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (786 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.082 | 3.449 | n/a | 0.000 | 0.000 | 1.106 | 7.774 | 0.006 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.094 | 3.449 | 0.272 | 0.094 |
| p99 | 306.227 | 14.439 | n/a | 1.087 | 0.000 | 4.566 | 302.629 | 0.370 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.645 | 15.285 | 0.828 | 0.645 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a0000000000000225 | 1003.058 | 0.121 | n/a | 0.000 | 0.000 | 1.056 | 1000.603 | 0.012 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.188 | 0.121 | 0.000 | 1.188 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000021a | 593.930 | 2.094 | n/a | 0.000 | 0.000 | 2.272 | 589.450 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.077 | 2.094 | 0.004 | 0.077 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000227 | 559.820 | 3.593 | n/a | 0.000 | 0.000 | 2.798 | 553.108 | 0.178 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.079 | 3.593 | 0.006 | 0.079 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000223 | 527.787 | 5.487 | n/a | 0.000 | 0.000 | 1.265 | 520.346 | 0.490 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.166 | 5.487 | 0.010 | 0.166 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000222 | 483.418 | 2.012 | n/a | 0.000 | 0.000 | 1.113 | 480.198 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.072 | 2.012 | 0.004 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000021d | 423.809 | 4.777 | n/a | 0.000 | 0.000 | 1.365 | 417.412 | 0.116 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.110 | 4.777 | 0.011 | 0.110 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000021b | 421.770 | 2.520 | n/a | 0.000 | 0.000 | 1.164 | 417.862 | 0.119 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.078 | 2.520 | 0.006 | 0.078 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000220 | 306.227 | 2.396 | n/a | 0.000 | 0.000 | 1.102 | 302.629 | 0.005 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.072 | 2.396 | 0.008 | 0.072 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000021e | 245.556 | 4.475 | n/a | 0.000 | 0.000 | 1.084 | 239.709 | 0.127 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.134 | 4.475 | 0.018 | 0.134 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000314 | 113.585 | 2.543 | n/a | 0.000 | 0.000 | 2.173 | 97.789 | 0.003 | 11.005 | 0.006 | 0.000 | n/a | n/a | 0.067 | 2.543 | 0.022 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000765 | 88.146 | 4.933 | n/a | 0.000 | 0.000 | 2.231 | 80.769 | 0.087 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.104 | 4.933 | 0.056 | 0.104 | gw-r/thread-54/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000007a8 | 87.305 | 2.762 | n/a | 0.000 | 0.000 | 1.079 | 83.318 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.106 | 2.762 | 0.032 | 0.106 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000063e | 87.262 | 3.344 | n/a | 0.000 | 0.000 | 1.866 | 81.942 | 0.006 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.077 | 3.344 | 0.038 | 0.077 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000002f5 | 86.933 | 6.973 | n/a | 0.000 | 0.000 | 1.151 | 78.315 | 0.370 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.098 | 6.973 | 0.080 | 0.098 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000004f1 | 83.972 | 7.163 | n/a | 0.000 | 0.000 | 1.089 | 75.329 | 0.101 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.231 | 7.163 | 0.085 | 0.231 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000783 | 80.319 | 10.337 | n/a | 1.170 | 0.000 | 1.122 | 67.484 | 0.008 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.166 | 11.507 | 0.143 | 0.166 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000005e9 | 79.607 | 2.128 | n/a | 0.000 | 0.000 | 1.091 | 76.287 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.058 | 2.128 | 0.027 | 0.058 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a00000000000004f9 | 79.424 | 2.606 | n/a | 0.000 | 0.000 | 1.194 | 75.356 | 0.152 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.086 | 2.606 | 0.033 | 0.086 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a000000000000082e | 75.658 | 5.034 | n/a | 0.000 | 0.000 | 3.144 | 67.105 | 0.148 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.185 | 5.034 | 0.067 | 0.185 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000000565 | 73.642 | 8.007 | n/a | 0.892 | 0.000 | 1.086 | 63.359 | 0.154 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.115 | 8.899 | 0.121 | 0.115 | gw-r/thread-53/journal/page | none observed |

## P3 / tail / internal (2281 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.636 | 4.428 | n/a | 0.000 | 0.000 | 1.127 | 6.194 | 0.005 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.109 | 4.455 | 0.377 | 0.109 |
| p99 | 318.262 | 19.486 | n/a | 1.932 | 0.000 | 4.747 | 311.666 | 0.300 | 0.000 | 0.061 | 0.000 | n/a | n/a | 1.838 | 19.569 | 0.854 | 1.838 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3adfb1c5ca157a7a0000000000001ace | 1005.814 | 2.223 | n/a | 0.000 | 0.000 | 1.043 | 1002.442 | 0.005 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.083 | 2.223 | 0.002 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aa9 | 1003.105 | 2.599 | n/a | 0.000 | 0.000 | 1.248 | 999.147 | 0.004 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.085 | 2.599 | 0.003 | 0.085 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001af4 | 1002.820 | 0.167 | n/a | 0.000 | 0.000 | 1.146 | 1000.291 | 0.010 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.172 | 0.167 | 0.000 | 1.172 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001ab2 | 1000.973 | 5.935 | n/a | 0.000 | 0.000 | 1.393 | 993.480 | 0.009 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.116 | 5.935 | 0.006 | 0.116 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aec | 999.339 | 2.548 | n/a | 0.000 | 0.000 | 1.213 | 995.395 | 0.082 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.548 | 0.003 | 0.064 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aa8 | 982.397 | 2.423 | n/a | 0.000 | 0.000 | 1.099 | 978.782 | 0.004 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.073 | 2.423 | 0.002 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001af0 | 926.122 | 1.884 | n/a | 0.000 | 0.000 | 1.085 | 922.828 | 0.205 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.080 | 1.884 | 0.002 | 0.080 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001acb | 923.865 | 15.361 | n/a | 1.082 | 0.000 | 1.282 | 905.291 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.824 | 16.444 | 0.018 | 0.824 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001ae5 | 809.624 | 4.095 | n/a | 0.000 | 0.000 | 1.298 | 793.440 | 0.005 | 10.693 | 0.021 | 0.000 | n/a | n/a | 0.071 | 4.095 | 0.005 | 0.071 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001adb | 722.953 | 2.542 | n/a | 0.000 | 0.000 | 1.091 | 719.209 | 0.006 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.074 | 2.542 | 0.004 | 0.074 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001ac7 | 693.636 | 2.464 | n/a | 0.000 | 0.000 | 1.079 | 689.900 | 0.065 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.082 | 2.464 | 0.004 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001ac2 | 685.135 | 4.812 | n/a | 0.000 | 0.000 | 1.242 | 678.902 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.155 | 4.812 | 0.007 | 0.155 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001abc | 678.183 | 5.998 | n/a | 0.000 | 0.000 | 1.115 | 670.849 | 0.004 | 0.000 | 0.008 | 0.000 | n/a | n/a | 0.210 | 5.998 | 0.009 | 0.210 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aad | 649.810 | 3.013 | n/a | 0.000 | 0.000 | 1.087 | 645.586 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.106 | 3.013 | 0.005 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aaa | 577.462 | 8.566 | n/a | 1.389 | 0.000 | 1.142 | 565.738 | 0.102 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.498 | 9.956 | 0.017 | 0.498 | gw-r/thread-53/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aee | 523.459 | 2.230 | n/a | 0.000 | 0.000 | 1.080 | 520.066 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.054 | 2.230 | 0.004 | 0.054 | gw-r/thread-48/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aed | 481.376 | 2.056 | n/a | 0.000 | 0.000 | 1.081 | 478.072 | 0.058 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.071 | 2.056 | 0.004 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001ae0 | 463.099 | 2.601 | n/a | 0.000 | 0.000 | 1.154 | 459.262 | 0.004 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.061 | 2.601 | 0.006 | 0.061 | gw-r/thread-55/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001ae8 | 460.320 | 2.375 | n/a | 0.000 | 0.000 | 1.666 | 456.115 | 0.079 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.059 | 2.375 | 0.005 | 0.059 | gw-r/thread-52/journal/page | none observed |
| 3adfb1c5ca157a7a0000000000001aab | 418.244 | 4.380 | n/a | 0.000 | 0.000 | 1.181 | 412.571 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.082 | 4.380 | 0.010 | 0.082 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (78 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.170 | 0.047 | n/a | 0.000 | 0.000 | 1.119 | 200.757 | 0.019 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.089 | 0.047 | 0.000 | 0.089 |
| p99 | 206.299 | 0.128 | n/a | 0.000 | 0.000 | 4.425 | 203.821 | 10.380 | 0.000 | 0.644 | 0.000 | n/a | n/a | 0.423 | 0.128 | 0.002 | 0.423 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa0000000000000008 | 206.299 | 0.068 | n/a | 0.000 | 0.000 | 2.018 | 203.269 | 0.096 | 0.000 | 0.644 | 0.000 | n/a | n/a | 0.205 | 0.068 | 0.000 | 0.205 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000003a | 206.090 | 0.033 | n/a | 0.000 | 0.000 | 4.305 | 201.428 | 0.056 | 0.000 | 0.187 | 0.000 | n/a | n/a | 0.081 | 0.033 | 0.000 | 0.081 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa000000000000004a | 205.517 | 0.049 | n/a | 0.000 | 0.000 | 4.425 | 200.789 | 0.049 | 0.000 | 0.115 | 0.000 | n/a | n/a | 0.091 | 0.049 | 0.000 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000013 | 205.491 | 0.044 | n/a | 0.000 | 0.000 | 1.297 | 203.821 | 0.022 | 0.000 | 0.231 | 0.000 | n/a | n/a | 0.076 | 0.044 | 0.000 | 0.076 | gw-r/thread-51/journal/page | none observed |
| 62edfb76d0f858fa000000000000002e | 204.909 | 0.033 | n/a | 0.000 | 0.000 | 3.249 | 201.292 | 0.062 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000012 | 204.723 | 0.047 | n/a | 0.000 | 0.000 | 1.356 | 202.705 | 0.138 | 0.000 | 0.316 | 0.000 | n/a | n/a | 0.161 | 0.047 | 0.000 | 0.161 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000000a | 203.862 | 0.041 | n/a | 0.000 | 0.000 | 1.359 | 202.057 | 0.043 | 0.000 | 0.241 | 0.000 | n/a | n/a | 0.121 | 0.041 | 0.000 | 0.121 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa000000000000004b | 203.637 | 0.056 | n/a | 0.000 | 0.000 | 1.193 | 201.919 | 0.098 | 0.000 | 0.259 | 0.000 | n/a | n/a | 0.113 | 0.056 | 0.000 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000000e | 203.268 | 0.061 | n/a | 0.000 | 0.000 | 1.447 | 201.423 | 0.027 | 0.000 | 0.218 | 0.000 | n/a | n/a | 0.092 | 0.061 | 0.000 | 0.092 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000017 | 203.207 | 0.096 | n/a | 0.000 | 0.000 | 1.449 | 201.134 | 0.035 | 0.000 | 0.235 | 0.000 | n/a | n/a | 0.257 | 0.096 | 0.000 | 0.257 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa000000000000002f | 203.053 | 0.060 | n/a | 0.000 | 0.000 | 1.554 | 201.173 | 0.015 | 0.000 | 0.150 | 0.000 | n/a | n/a | 0.102 | 0.060 | 0.000 | 0.102 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000024 | 203.015 | 0.055 | n/a | 0.000 | 0.000 | 1.365 | 201.283 | 0.016 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.131 | 0.055 | 0.000 | 0.131 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000001f | 202.953 | 0.055 | n/a | 0.000 | 0.000 | 1.119 | 201.458 | 0.025 | 0.000 | 0.205 | 0.000 | n/a | n/a | 0.092 | 0.055 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000031 | 202.925 | 0.056 | n/a | 0.000 | 0.000 | 1.151 | 201.346 | 0.043 | 0.000 | 0.207 | 0.000 | n/a | n/a | 0.121 | 0.056 | 0.000 | 0.121 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000056 | 202.894 | 0.037 | n/a | 0.000 | 0.000 | 1.050 | 201.476 | 0.019 | 0.000 | 0.224 | 0.000 | n/a | n/a | 0.088 | 0.037 | 0.000 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 62edfb76d0f858fa000000000000002c | 202.877 | 0.043 | n/a | 0.000 | 0.000 | 1.017 | 201.463 | 0.031 | 0.000 | 0.239 | 0.000 | n/a | n/a | 0.083 | 0.043 | 0.000 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000030 | 202.719 | 0.040 | n/a | 0.000 | 0.000 | 1.057 | 201.263 | 0.031 | 0.000 | 0.250 | 0.000 | n/a | n/a | 0.078 | 0.040 | 0.000 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000045 | 202.709 | 0.052 | n/a | 0.000 | 0.000 | 1.161 | 201.180 | 0.021 | 0.000 | 0.171 | 0.000 | n/a | n/a | 0.125 | 0.052 | 0.000 | 0.125 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000001e | 202.687 | 0.045 | n/a | 0.000 | 0.000 | 1.256 | 201.088 | 0.024 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.118 | 0.045 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000034 | 202.684 | 0.051 | n/a | 0.000 | 0.000 | 1.099 | 201.233 | 0.015 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.095 | 0.051 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.990 | 0.045 | n/a | 0.000 | 0.000 | 1.106 | 200.573 | 0.014 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.087 | 0.045 | 0.000 | 0.087 |
| p99 | 205.555 | 0.093 | n/a | 0.000 | 0.000 | 2.436 | 204.011 | 22.092 | 0.000 | 0.259 | 0.000 | n/a | n/a | 0.252 | 0.093 | 0.002 | 0.252 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa0000000000000075 | 205.555 | 0.038 | n/a | 0.000 | 0.000 | 1.223 | 204.011 | 0.021 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.080 | 0.038 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000007c | 203.811 | 0.046 | n/a | 0.000 | 0.000 | 2.436 | 201.074 | 0.014 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.082 | 0.046 | 0.000 | 0.082 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa000000000000005a | 203.282 | 0.050 | n/a | 0.000 | 0.000 | 1.223 | 201.667 | 0.018 | 0.000 | 0.219 | 0.000 | n/a | n/a | 0.105 | 0.050 | 0.000 | 0.105 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000059 | 203.185 | 0.052 | n/a | 0.000 | 0.000 | 1.379 | 201.304 | 0.055 | 0.000 | 0.245 | 0.000 | n/a | n/a | 0.150 | 0.052 | 0.000 | 0.150 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000092 | 203.082 | 0.054 | n/a | 0.000 | 0.000 | 1.242 | 201.395 | 0.033 | 0.000 | 0.222 | 0.000 | n/a | n/a | 0.136 | 0.054 | 0.000 | 0.136 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000000a4 | 203.024 | 0.042 | n/a | 0.000 | 0.000 | 1.092 | 201.526 | 0.036 | 0.000 | 0.244 | 0.000 | n/a | n/a | 0.084 | 0.042 | 0.000 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 62edfb76d0f858fa000000000000008a | 202.974 | 0.042 | n/a | 0.000 | 0.000 | 1.090 | 201.530 | 0.025 | 0.000 | 0.203 | 0.000 | n/a | n/a | 0.084 | 0.042 | 0.000 | 0.084 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa000000000000005f | 202.878 | 0.061 | n/a | 0.000 | 0.000 | 1.318 | 201.192 | 0.063 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.130 | 0.061 | 0.000 | 0.130 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa000000000000008f | 202.818 | 0.046 | n/a | 0.000 | 0.000 | 1.169 | 201.202 | 0.011 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.252 | 0.046 | 0.000 | 0.252 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000070 | 202.790 | 0.067 | n/a | 0.000 | 0.000 | 1.196 | 201.164 | 0.017 | 0.000 | 0.157 | 0.000 | n/a | n/a | 0.189 | 0.067 | 0.000 | 0.189 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000000bc | 202.617 | 0.054 | n/a | 0.000 | 0.000 | 1.217 | 201.010 | 0.011 | 0.000 | 0.143 | 0.000 | n/a | n/a | 0.182 | 0.054 | 0.000 | 0.182 | gw-r/thread-51/journal/page | none observed |
| 62edfb76d0f858fa000000000000006c | 202.614 | 0.040 | n/a | 0.000 | 0.000 | 1.115 | 201.218 | 0.017 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.079 | 0.040 | 0.000 | 0.079 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000071 | 202.603 | 0.055 | n/a | 0.000 | 0.000 | 1.224 | 201.007 | 0.015 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.155 | 0.055 | 0.000 | 0.155 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa00000000000000aa | 202.569 | 0.062 | n/a | 0.000 | 0.000 | 1.208 | 200.990 | 0.018 | 0.000 | 0.160 | 0.000 | n/a | n/a | 0.131 | 0.062 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa000000000000007a | 202.559 | 0.037 | n/a | 0.000 | 0.000 | 1.105 | 201.204 | 0.013 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.080 | 0.037 | 0.000 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000090 | 202.553 | 0.041 | n/a | 0.000 | 0.000 | 1.043 | 201.219 | 0.013 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.094 | 0.041 | 0.000 | 0.094 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000006b | 202.547 | 0.050 | n/a | 0.000 | 0.000 | 1.064 | 201.094 | 0.018 | 0.000 | 0.194 | 0.000 | n/a | n/a | 0.127 | 0.050 | 0.000 | 0.127 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000006f | 202.516 | 0.051 | n/a | 0.000 | 0.000 | 1.219 | 200.957 | 0.013 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.149 | 0.051 | 0.000 | 0.149 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa00000000000000bf | 202.468 | 0.037 | n/a | 0.000 | 0.000 | 1.075 | 201.101 | 0.019 | 0.000 | 0.162 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa00000000000000ba | 202.367 | 0.033 | n/a | 0.000 | 0.000 | 1.057 | 201.009 | 0.019 | 0.000 | 0.168 | 0.000 | n/a | n/a | 0.081 | 0.033 | 0.000 | 0.081 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.973 | 0.050 | n/a | 0.000 | 0.000 | 1.093 | 200.594 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.089 | 0.050 | 0.000 | 0.089 |
| p99 | 204.668 | 0.127 | n/a | 0.000 | 0.000 | 2.991 | 201.542 | 2.834 | 0.000 | 4.908 | 0.000 | n/a | n/a | 0.234 | 0.127 | 0.002 | 0.234 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa00000000000000d2 | 204.668 | 0.032 | n/a | 0.000 | 0.000 | 2.991 | 196.612 | 0.014 | 0.000 | 4.908 | 0.000 | n/a | n/a | 0.111 | 0.032 | 0.000 | 0.111 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa00000000000000cf | 203.127 | 0.050 | n/a | 0.000 | 0.000 | 1.222 | 201.542 | 0.057 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.131 | 0.050 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000108 | 203.035 | 0.037 | n/a | 0.000 | 0.000 | 1.426 | 201.376 | 0.014 | 0.000 | 0.110 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000000c5 | 202.765 | 0.060 | n/a | 0.000 | 0.000 | 1.291 | 201.111 | 0.012 | 0.000 | 0.155 | 0.000 | n/a | n/a | 0.135 | 0.060 | 0.000 | 0.135 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa00000000000000cc | 202.692 | 0.065 | n/a | 0.000 | 0.000 | 1.171 | 201.150 | 0.015 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.139 | 0.065 | 0.000 | 0.139 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa00000000000000e6 | 202.659 | 0.053 | n/a | 0.000 | 0.000 | 0.987 | 201.397 | 0.015 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.102 | 0.053 | 0.000 | 0.102 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa00000000000000d9 | 202.636 | 0.036 | n/a | 0.000 | 0.000 | 1.088 | 201.216 | 0.016 | 0.000 | 0.133 | 0.000 | n/a | n/a | 0.148 | 0.036 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa00000000000000e2 | 202.625 | 0.056 | n/a | 0.000 | 0.000 | 1.272 | 200.929 | 0.032 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.154 | 0.056 | 0.000 | 0.154 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa00000000000000f6 | 202.563 | 0.127 | n/a | 0.000 | 0.000 | 1.061 | 201.067 | 0.017 | 0.000 | 0.202 | 0.000 | n/a | n/a | 0.088 | 0.127 | 0.001 | 0.088 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000000fb | 202.555 | 0.045 | n/a | 0.000 | 0.000 | 1.218 | 201.078 | 0.008 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.111 | 0.045 | 0.000 | 0.111 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000102 | 202.475 | 0.049 | n/a | 0.000 | 0.000 | 1.061 | 201.174 | 0.009 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.079 | 0.049 | 0.000 | 0.079 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa00000000000000fa | 202.437 | 0.056 | n/a | 0.000 | 0.000 | 1.286 | 200.847 | 0.013 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.128 | 0.056 | 0.000 | 0.128 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000010e | 202.421 | 0.037 | n/a | 0.000 | 0.000 | 1.073 | 201.120 | 0.010 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.072 | 0.037 | 0.000 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa00000000000000dd | 202.401 | 0.044 | n/a | 0.000 | 0.000 | 1.030 | 201.128 | 0.032 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.092 | 0.044 | 0.000 | 0.092 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa00000000000000e1 | 202.396 | 0.042 | n/a | 0.000 | 0.000 | 1.290 | 200.881 | 0.012 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.079 | 0.042 | 0.000 | 0.079 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa000000000000011c | 202.392 | 0.050 | n/a | 0.000 | 0.000 | 1.029 | 201.092 | 0.048 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.085 | 0.050 | 0.000 | 0.085 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000114 | 202.302 | 0.046 | n/a | 0.000 | 0.000 | 1.011 | 201.048 | 0.015 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.078 | 0.046 | 0.000 | 0.078 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000128 | 202.302 | 0.056 | n/a | 0.000 | 0.000 | 1.058 | 200.995 | 0.007 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.091 | 0.056 | 0.000 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000000c7 | 202.296 | 0.042 | n/a | 0.000 | 0.000 | 1.254 | 200.740 | 0.011 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.123 | 0.042 | 0.000 | 0.123 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000119 | 202.292 | 0.034 | n/a | 0.000 | 0.000 | 1.048 | 201.037 | 0.018 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.072 | 0.034 | 0.000 | 0.072 | gw-r/thread-70/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.704 | 0.048 | n/a | 0.000 | 0.000 | 1.086 | 200.402 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.089 | 0.048 | 0.000 | 0.089 |
| p99 | 217.004 | 0.127 | n/a | 0.000 | 0.000 | 15.978 | 204.904 | 5.870 | 0.469 | 0.209 | 0.000 | n/a | n/a | 0.187 | 0.127 | 0.001 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa0000000000000141 | 217.004 | 0.034 | n/a | 0.000 | 0.000 | 15.978 | 200.415 | 0.006 | 0.469 | 0.039 | 0.000 | n/a | n/a | 0.064 | 0.034 | 0.000 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000013b | 207.407 | 0.051 | n/a | 0.000 | 0.000 | 2.247 | 204.904 | 0.043 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.089 | 0.051 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000164 | 203.630 | 0.064 | n/a | 0.000 | 0.000 | 1.803 | 201.545 | 0.010 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.123 | 0.064 | 0.000 | 0.123 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000155 | 202.822 | 0.050 | n/a | 0.000 | 0.000 | 1.115 | 201.350 | 0.046 | 0.000 | 0.164 | 0.000 | n/a | n/a | 0.097 | 0.050 | 0.000 | 0.097 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000014f | 202.682 | 0.098 | n/a | 0.000 | 0.000 | 1.217 | 201.124 | 0.007 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.163 | 0.098 | 0.000 | 0.163 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000143 | 202.655 | 0.043 | n/a | 0.000 | 0.000 | 1.057 | 201.338 | 0.017 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.075 | 0.043 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000133 | 202.511 | 0.062 | n/a | 0.000 | 0.000 | 1.212 | 200.988 | 0.021 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.125 | 0.062 | 0.000 | 0.125 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa000000000000018d | 202.464 | 0.061 | n/a | 0.000 | 0.000 | 1.093 | 201.006 | 0.007 | 0.000 | 0.209 | 0.000 | n/a | n/a | 0.087 | 0.061 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000176 | 202.451 | 0.071 | n/a | 0.000 | 0.000 | 1.284 | 200.867 | 0.009 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.131 | 0.071 | 0.000 | 0.131 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000161 | 202.397 | 0.075 | n/a | 0.000 | 0.000 | 1.128 | 200.998 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.094 | 0.075 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000169 | 202.356 | 0.045 | n/a | 0.000 | 0.000 | 1.032 | 201.110 | 0.008 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.080 | 0.045 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa000000000000014d | 202.350 | 0.048 | n/a | 0.000 | 0.000 | 1.362 | 200.725 | 0.007 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.116 | 0.048 | 0.000 | 0.116 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000173 | 202.338 | 0.060 | n/a | 0.000 | 0.000 | 1.832 | 200.194 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.177 | 0.060 | 0.000 | 0.177 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000168 | 202.308 | 0.032 | n/a | 0.000 | 0.000 | 1.042 | 201.060 | 0.012 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.075 | 0.032 | 0.000 | 0.075 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000139 | 202.287 | 0.066 | n/a | 0.000 | 0.000 | 1.208 | 200.780 | 0.008 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.142 | 0.066 | 0.000 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000016b | 202.265 | 0.036 | n/a | 0.000 | 0.000 | 1.024 | 201.039 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.065 | 0.036 | 0.000 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa000000000000013c | 202.261 | 0.033 | n/a | 0.000 | 0.000 | 1.071 | 200.899 | 0.027 | 0.000 | 0.167 | 0.000 | n/a | n/a | 0.064 | 0.033 | 0.000 | 0.064 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000182 | 202.255 | 0.060 | n/a | 0.000 | 0.000 | 1.262 | 200.772 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.091 | 0.060 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000175 | 202.240 | 0.034 | n/a | 0.000 | 0.000 | 1.063 | 200.943 | 0.007 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.088 | 0.034 | 0.000 | 0.088 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000142 | 202.223 | 0.048 | n/a | 0.000 | 0.000 | 1.056 | 200.957 | 0.014 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.083 | 0.048 | 0.000 | 0.083 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / read (106 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.545 | 0.051 | n/a | 0.000 | 0.000 | 1.095 | 200.238 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.082 | 0.051 | 0.000 | 0.082 |
| p99 | 204.677 | 0.094 | n/a | 0.000 | 0.000 | 3.001 | 201.119 | 1.484 | 0.180 | 0.099 | 0.000 | n/a | n/a | 0.156 | 0.094 | 0.001 | 0.156 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa00000000000001f9 | 214.119 | 0.057 | n/a | 0.000 | 0.000 | 12.958 | 196.905 | 0.008 | 3.984 | 0.078 | 0.000 | n/a | n/a | 0.129 | 0.057 | 0.000 | 0.129 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa00000000000001a2 | 204.677 | 0.039 | n/a | 0.000 | 0.000 | 3.001 | 201.397 | 0.012 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa00000000000001f6 | 202.613 | 0.056 | n/a | 0.000 | 0.000 | 1.413 | 200.950 | 0.007 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.108 | 0.056 | 0.000 | 0.108 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000001d7 | 202.561 | 0.070 | n/a | 0.000 | 0.000 | 1.234 | 201.022 | 0.028 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.150 | 0.070 | 0.000 | 0.150 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa00000000000001e5 | 202.534 | 0.064 | n/a | 0.000 | 0.000 | 1.170 | 201.079 | 0.026 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.120 | 0.064 | 0.000 | 0.120 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa00000000000001df | 202.435 | 0.049 | n/a | 0.000 | 0.000 | 1.053 | 201.119 | 0.012 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.104 | 0.049 | 0.000 | 0.104 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa00000000000001d6 | 202.387 | 0.062 | n/a | 0.000 | 0.000 | 1.241 | 200.863 | 0.032 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.140 | 0.062 | 0.000 | 0.140 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000001f0 | 202.288 | 0.042 | n/a | 0.000 | 0.000 | 1.025 | 201.049 | 0.010 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.070 | 0.042 | 0.000 | 0.070 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa00000000000001a0 | 202.203 | 0.060 | n/a | 0.000 | 0.000 | 1.151 | 200.793 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.121 | 0.060 | 0.000 | 0.121 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000192 | 202.202 | 0.053 | n/a | 0.000 | 0.000 | 1.078 | 200.893 | 0.007 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.094 | 0.053 | 0.000 | 0.094 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa00000000000001b5 | 202.192 | 0.052 | n/a | 0.000 | 0.000 | 1.125 | 200.811 | 0.010 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.111 | 0.052 | 0.000 | 0.111 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa000000000000019e | 202.170 | 0.035 | n/a | 0.000 | 0.000 | 1.039 | 200.931 | 0.011 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.076 | 0.035 | 0.000 | 0.076 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa00000000000001d3 | 202.135 | 0.038 | n/a | 0.000 | 0.000 | 1.020 | 200.921 | 0.010 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.067 | 0.038 | 0.000 | 0.067 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000019a | 202.132 | 0.070 | n/a | 0.000 | 0.000 | 1.218 | 200.629 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.152 | 0.070 | 0.000 | 0.152 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000019f | 202.106 | 0.060 | n/a | 0.000 | 0.000 | 1.103 | 200.774 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 0.094 | 0.060 | 0.000 | 0.094 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000196 | 202.097 | 0.053 | n/a | 0.000 | 0.000 | 1.217 | 200.612 | 0.008 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.142 | 0.053 | 0.000 | 0.142 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa00000000000001c6 | 202.072 | 0.041 | n/a | 0.000 | 0.000 | 1.136 | 200.719 | 0.010 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.103 | 0.041 | 0.000 | 0.103 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa00000000000001c9 | 202.067 | 0.063 | n/a | 0.000 | 0.000 | 1.389 | 200.385 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.159 | 0.063 | 0.000 | 0.159 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000200 | 202.054 | 0.064 | n/a | 0.000 | 0.000 | 1.339 | 200.454 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.150 | 0.064 | 0.000 | 0.150 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa00000000000001e7 | 202.039 | 0.052 | n/a | 0.000 | 0.000 | 1.111 | 200.696 | 0.008 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.100 | 0.052 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.744 | 0.049 | n/a | 0.000 | 0.000 | 1.084 | 200.415 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.084 | 0.049 | 0.000 | 0.084 |
| p99 | 204.073 | 0.145 | n/a | 0.000 | 0.000 | 1.569 | 201.895 | 0.586 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.187 | 0.145 | 0.001 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa0000000000000214 | 208.486 | 0.047 | n/a | 0.000 | 0.000 | 6.382 | 201.895 | 0.006 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.081 | 0.047 | 0.000 | 0.081 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000264 | 204.073 | 0.056 | n/a | 0.000 | 0.000 | 1.520 | 202.287 | 0.010 | 0.000 | 0.114 | 0.000 | n/a | n/a | 0.086 | 0.056 | 0.000 | 0.086 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000256 | 202.749 | 0.043 | n/a | 0.000 | 0.000 | 1.296 | 201.219 | 0.006 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.084 | 0.043 | 0.000 | 0.084 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000224 | 202.711 | 0.055 | n/a | 0.000 | 0.000 | 1.100 | 201.261 | 0.030 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.146 | 0.055 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000221 | 202.601 | 0.059 | n/a | 0.000 | 0.000 | 1.176 | 201.160 | 0.009 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.109 | 0.059 | 0.000 | 0.109 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000025e | 202.495 | 0.051 | n/a | 0.000 | 0.000 | 1.569 | 200.493 | 0.034 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.300 | 0.051 | 0.000 | 0.300 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000026d | 202.490 | 0.059 | n/a | 0.000 | 0.000 | 1.106 | 201.130 | 0.009 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.093 | 0.059 | 0.000 | 0.093 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000268 | 202.461 | 0.051 | n/a | 0.000 | 0.000 | 1.228 | 200.893 | 0.008 | 0.000 | 0.095 | 0.000 | n/a | n/a | 0.187 | 0.051 | 0.000 | 0.187 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000022e | 202.457 | 0.071 | n/a | 0.000 | 0.000 | 1.211 | 200.962 | 0.011 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.125 | 0.071 | 0.000 | 0.125 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000271 | 202.428 | 0.053 | n/a | 0.000 | 0.000 | 1.071 | 201.006 | 0.022 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.101 | 0.053 | 0.000 | 0.101 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000206 | 202.424 | 0.048 | n/a | 0.000 | 0.000 | 1.068 | 201.094 | 0.014 | 0.000 | 0.104 | 0.000 | n/a | n/a | 0.097 | 0.048 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000026e | 202.368 | 0.047 | n/a | 0.000 | 0.000 | 1.065 | 201.052 | 0.033 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.087 | 0.047 | 0.000 | 0.087 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000254 | 202.356 | 0.068 | n/a | 0.000 | 0.000 | 1.211 | 200.863 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.139 | 0.068 | 0.000 | 0.139 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000255 | 202.353 | 0.065 | n/a | 0.000 | 0.000 | 1.253 | 200.740 | 0.020 | 0.000 | 0.128 | 0.000 | n/a | n/a | 0.147 | 0.065 | 0.000 | 0.147 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa000000000000021f | 202.346 | 0.040 | n/a | 0.000 | 0.000 | 1.275 | 200.857 | 0.008 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.085 | 0.040 | 0.000 | 0.085 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000020b | 202.341 | 0.062 | n/a | 0.000 | 0.000 | 1.242 | 200.761 | 0.013 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.166 | 0.062 | 0.000 | 0.166 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000248 | 202.287 | 0.042 | n/a | 0.000 | 0.000 | 1.057 | 200.967 | 0.014 | 0.000 | 0.132 | 0.000 | n/a | n/a | 0.075 | 0.042 | 0.000 | 0.075 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000231 | 202.247 | 0.054 | n/a | 0.000 | 0.000 | 1.221 | 200.751 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.153 | 0.054 | 0.000 | 0.153 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000245 | 202.243 | 0.039 | n/a | 0.000 | 0.000 | 1.063 | 200.969 | 0.017 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.071 | 0.039 | 0.000 | 0.071 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000262 | 202.216 | 0.061 | n/a | 0.000 | 0.000 | 1.101 | 200.862 | 0.009 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.097 | 0.061 | 0.000 | 0.097 | gw-r/thread-54/journal/page | none observed |

## P3 / L1024 / read (61 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 72.069 | 0.057 | n/a | 0.000 | 0.000 | 1.143 | 70.556 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.089 | 0.057 | 0.001 | 0.089 |
| p99 | 203.357 | 0.122 | n/a | 0.000 | 0.000 | 2.205 | 201.366 | 3.340 | 43.734 | 0.124 | 0.000 | n/a | n/a | 0.147 | 0.122 | 0.006 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa000000000000028c | 203.357 | 0.056 | n/a | 0.000 | 0.000 | 1.732 | 201.366 | 0.008 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.140 | 0.056 | 0.000 | 0.140 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa000000000000028d | 202.257 | 0.087 | n/a | 0.000 | 0.000 | 1.199 | 200.762 | 0.011 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.112 | 0.087 | 0.000 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000028e | 202.154 | 0.051 | n/a | 0.000 | 0.000 | 1.039 | 200.913 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.070 | 0.051 | 0.000 | 0.070 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000282 | 202.084 | 0.050 | n/a | 0.000 | 0.000 | 1.279 | 200.572 | 0.008 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.126 | 0.050 | 0.000 | 0.126 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000280 | 202.023 | 0.053 | n/a | 0.000 | 0.000 | 1.158 | 200.626 | 0.010 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa000000000000028a | 201.984 | 0.035 | n/a | 0.000 | 0.000 | 1.064 | 200.751 | 0.006 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.069 | 0.035 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000287 | 201.942 | 0.060 | n/a | 0.000 | 0.000 | 1.272 | 200.408 | 0.009 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.147 | 0.060 | 0.000 | 0.147 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000289 | 201.873 | 0.049 | n/a | 0.000 | 0.000 | 1.042 | 200.627 | 0.028 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.082 | 0.049 | 0.000 | 0.082 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa000000000000028f | 201.818 | 0.061 | n/a | 0.000 | 0.000 | 1.183 | 200.395 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.134 | 0.061 | 0.000 | 0.134 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000027c | 201.723 | 0.055 | n/a | 0.000 | 0.000 | 1.121 | 200.383 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.095 | 0.055 | 0.000 | 0.095 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa000000000000027b | 201.719 | 0.033 | n/a | 0.000 | 0.000 | 1.047 | 200.507 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.083 | 0.033 | 0.000 | 0.083 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000284 | 201.696 | 0.034 | n/a | 0.000 | 0.000 | 1.069 | 200.448 | 0.010 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000292 | 201.597 | 0.055 | n/a | 0.000 | 0.000 | 1.172 | 200.216 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.113 | 0.055 | 0.000 | 0.113 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000286 | 201.446 | 0.037 | n/a | 0.000 | 0.000 | 1.098 | 200.163 | 0.008 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.083 | 0.037 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000291 | 201.372 | 0.036 | n/a | 0.000 | 0.000 | 1.072 | 200.142 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa000000000000027e | 201.317 | 0.035 | n/a | 0.000 | 0.000 | 1.074 | 200.096 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.065 | 0.035 | 0.000 | 0.065 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa000000000000027f | 194.821 | 0.058 | n/a | 0.000 | 0.000 | 1.075 | 193.588 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.077 | 0.058 | 0.000 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000281 | 192.798 | 0.067 | n/a | 0.000 | 0.000 | 1.078 | 191.501 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.104 | 0.067 | 0.000 | 0.104 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa000000000000027d | 148.109 | 0.050 | n/a | 0.000 | 0.000 | 1.100 | 146.481 | 0.365 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.075 | 0.050 | 0.000 | 0.075 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000290 | 130.900 | 0.071 | n/a | 0.000 | 0.000 | 1.181 | 126.140 | 3.340 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.120 | 0.071 | 0.001 | 0.120 | gw-r/thread-52/journal/page | none observed |

## P3 / tail / read (208 retained requests)

| quantile | wallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.789 | 0.046 | n/a | 0.000 | 0.000 | 1.073 | 84.560 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.075 | 0.046 | 0.001 | 0.075 |
| p99 | 202.475 | 0.099 | n/a | 0.000 | 0.000 | 15.408 | 200.651 | 2.757 | 0.735 | 0.078 | 0.000 | n/a | n/a | 0.162 | 0.099 | 0.001 | 0.162 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 62edfb76d0f858fa0000000000000f1b | 212.390 | 0.036 | n/a | 0.000 | 0.000 | 1.049 | 200.497 | 0.006 | 10.693 | 0.042 | 0.000 | n/a | n/a | 0.067 | 0.036 | 0.000 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ee4 | 202.633 | 0.073 | n/a | 0.000 | 0.000 | 1.084 | 201.275 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.131 | 0.073 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000edb | 202.475 | 0.037 | n/a | 0.000 | 0.000 | 2.350 | 199.946 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.106 | 0.037 | 0.000 | 0.106 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f2e | 201.996 | 0.047 | n/a | 0.000 | 0.000 | 1.091 | 200.686 | 0.017 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.089 | 0.047 | 0.000 | 0.089 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ec2 | 201.924 | 0.064 | n/a | 0.000 | 0.000 | 1.170 | 200.479 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.162 | 0.064 | 0.000 | 0.162 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f00 | 201.894 | 0.046 | n/a | 0.000 | 0.000 | 1.043 | 200.651 | 0.010 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.080 | 0.046 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ebc | 201.886 | 0.041 | n/a | 0.000 | 0.000 | 1.616 | 200.095 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.097 | 0.041 | 0.000 | 0.097 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f0e | 201.877 | 0.049 | n/a | 0.000 | 0.000 | 1.188 | 200.430 | 0.014 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.124 | 0.049 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ed8 | 201.851 | 0.036 | n/a | 0.000 | 0.000 | 1.042 | 200.622 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.083 | 0.036 | 0.000 | 0.083 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f20 | 201.815 | 0.049 | n/a | 0.000 | 0.000 | 1.167 | 200.457 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.101 | 0.049 | 0.000 | 0.101 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f01 | 201.814 | 0.060 | n/a | 0.000 | 0.000 | 1.168 | 200.436 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.108 | 0.060 | 0.000 | 0.108 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ef4 | 201.761 | 0.043 | n/a | 0.000 | 0.000 | 1.066 | 200.529 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.080 | 0.043 | 0.000 | 0.080 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000efa | 201.754 | 0.063 | n/a | 0.000 | 0.000 | 1.185 | 200.331 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.127 | 0.063 | 0.000 | 0.127 | gw-r/thread-54/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f16 | 201.753 | 0.052 | n/a | 0.000 | 0.000 | 1.142 | 200.405 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.111 | 0.052 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f33 | 201.722 | 0.047 | n/a | 0.000 | 0.000 | 1.037 | 200.518 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.073 | 0.047 | 0.000 | 0.073 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000f1c | 201.717 | 0.036 | n/a | 0.000 | 0.000 | 1.041 | 200.514 | 0.005 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.072 | 0.036 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |
| 62edfb76d0f858fa0000000000000eff | 201.704 | 0.045 | n/a | 0.000 | 0.000 | 1.052 | 200.477 | 0.008 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.075 | 0.045 | 0.000 | 0.075 | gw-r/thread-53/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ed0 | 201.696 | 0.041 | n/a | 0.000 | 0.000 | 1.123 | 200.367 | 0.009 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.104 | 0.041 | 0.000 | 0.104 | gw-r/thread-55/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ee1 | 201.669 | 0.046 | n/a | 0.000 | 0.000 | 1.186 | 200.243 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.123 | 0.046 | 0.000 | 0.123 | gw-r/thread-70/journal/page | none observed |
| 62edfb76d0f858fa0000000000000ef9 | 201.668 | 0.043 | n/a | 0.000 | 0.000 | 1.062 | 200.432 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.072 | 0.043 | 0.000 | 0.072 | gw-r/thread-52/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/socket.wait-first-byte` (251.257 ms, trace `bc96454f7fa2934b0000000000000118`); `node-14/thread-8/socket.wait-first-byte` (339.528 ms, trace `bc96454f7fa2934b0000000000000119`); `node-14/thread-0/socket.wait-first-byte` (186.386 ms, trace `bc96454f7fa2934b00000000000000b4`); `node-14/thread-0/client.persist-and-resolve` (174.843 ms, trace `bc96454f7fa2934b0000000000000146`); `node-14/thread-0/client.persist-and-resolve` (168.547 ms, trace `bc96454f7fa2934b0000000000000145`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p2-smoke-b`; source `b7887c23023be9bc22ac6b667fd86b4300504fcf`; subjects 1000; tracing full.

Commit coverage: 9/85 (10.588%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 85/85. Raw trace bytes: 767065.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. VM clocks share CLOCK_REALTIME; gateway millisecond anchoring has approximately 1 ms uncertainty. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 1460.739 | 192.516 | 305.481 | 39 |
| baseline | 0 | 1977.467 | 37.626 | 1.587 | 35 |
| L1 | 1 | 1973.074 | 139.757 | 13.229 | 30 |
| L4 | 4 | 1984.896 | 249.157 | 234.707 | 44 |
| L16 | 16 | 1945.265 | 205.392 | 226.124 | 44 |
| L64 | 16 | 1872.332 | 182.969 | 224.638 | 44 |
| L256 | 16 | 1898.799 | 165.595 | 186.808 | 58 |
| L1024 | 16 | 1908.548 | 242.633 | 314.834 | 16 |
| recovery | 16 | 1953.671 | 218.548 | 238.923 | 44 |
| p4mix | 1 | 1981.394 | 36.031 | 24.843 | 43 |
| p4h1 | 1 | 1788.116 | 54.383 | 27.158 | 30 |
| grow3 | 0 | 1355.120 | 222.037 | 28.119 | 35 |
| p4h3 | 1 | 1489.770 | 43.715 | 16.723 | 86 |
| grow10 | 0 | 1105.471 | 284.240 | 54.824 | 30 |
| p4h10 | 1 | 2349.314 | 51.788 | 31.815 | 72 |
| presweep | 16 | 1019.869 | 83.245 | 155.050 | 30 |
| sweep | 16 | 183.459 | 47.236 | 60.266 | 107 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| bc96454f7fa2934b0000000000000118 | driver.queue.scheduler-late | 0.832 | none | 0 / 32 |
| bc96454f7fa2934b0000000000000118 | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |

Observed active steps while trace bc96454f7fa2934b0000000000000118 waited: []

| bc96454f7fa2934b0000000000000119 | driver.queue.scheduler-dispatch | 0.079 | none | 1 / 32 |
| bc96454f7fa2934b0000000000000119 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace bc96454f7fa2934b0000000000000119 waited: []

| bc96454f7fa2934b00000000000000b4 | driver.queue.scheduler-late | 1.045 | none | 0 / 32 |
| bc96454f7fa2934b00000000000000b4 | driver.queue.scheduler-dispatch | 0.102 | none | 0 / 32 |

Observed active steps while trace bc96454f7fa2934b00000000000000b4 waited: []

| bc96454f7fa2934b0000000000000146 | driver.queue.scheduler-dispatch | 0.009 | none | 9 / 32 |
| bc96454f7fa2934b0000000000000146 | driver.queue.scheduler-late | 0.000 | none | 9 / 32 |

Observed active steps while trace bc96454f7fa2934b0000000000000146 waited: []

| bc96454f7fa2934b0000000000000145 | driver.queue.scheduler-dispatch | 0.010 | none | 8 / 32 |
| bc96454f7fa2934b0000000000000145 | driver.queue.scheduler-late | 0.000 | none | 8 / 32 |

Observed active steps while trace bc96454f7fa2934b0000000000000145 waited: []

## P2 / warmup / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.593 | 0.235 | 0.000 | 0.582 | 6.946 | 0.420 | 0.000 | 0.103 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 20.101 | 7.322 | 0.314 | 20.101 |
| p99 | 48.386 | 3.564 | 0.000 | 3.729 | 21.485 | n/a | 0.000 | 0.987 | 1.678 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 24.722 | 21.986 | 0.454 | 24.722 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000094 | 48.386 | 21.485 | 0.420 | 0.000 | 0.081 | 1.678 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 24.722 | 21.986 | 0.454 | 24.722 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000092 | 31.540 | 10.202 | n/a | 0.000 | 0.819 | 0.419 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 20.101 | 11.021 | 0.349 | 20.101 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000096 | 27.593 | 5.132 | n/a | 0.000 | 0.987 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.035 | 6.119 | 0.222 | 21.035 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000098 | 23.341 | 6.946 | 0.273 | 0.000 | 0.103 | 1.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.671 | 7.322 | 0.314 | 14.671 | node-14/thread-8/socket.wait-first-byte | none observed |

## P2 / warmup / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.593 | 1.516 | 0.000 | 2.173 | 5.132 | n/a | 0.000 | 0.987 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.035 | 6.119 | 0.222 | 21.035 |
| p99 | 27.593 | 1.516 | 0.000 | 2.173 | 5.132 | n/a | 0.000 | 0.987 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.035 | 6.119 | 0.222 | 21.035 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000096 | 27.593 | 5.132 | n/a | 0.000 | 0.987 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.035 | 6.119 | 0.222 | 21.035 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / baseline / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.899 | 0.000 | 0.000 | 0.422 | 4.814 | 0.261 | 0.000 | 0.112 | 0.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 15.120 | 5.507 | 0.267 | 15.120 |
| p99 | 28.740 | 2.602 | 0.000 | 2.669 | 11.365 | n/a | 0.000 | 1.499 | 1.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.683 | 11.706 | 0.407 | 19.683 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b000000000000009f | 28.740 | 11.365 | 0.229 | 0.000 | 0.112 | 1.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 15.120 | 11.706 | 0.407 | 15.120 | node-14/thread-8/socket.wait-first-byte | driver.publication 1.195ms |
| bc96454f7fa2934b000000000000009a | 27.947 | 6.355 | n/a | 0.000 | 1.499 | 0.411 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.683 | 7.854 | 0.281 | 19.683 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000009c | 21.899 | 4.814 | 0.261 | 0.000 | 0.081 | 1.155 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 15.587 | 5.157 | 0.235 | 15.587 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000009e | 20.650 | 4.678 | n/a | 0.000 | 0.829 | 0.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.710 | 5.507 | 0.267 | 14.710 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / baseline / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.650 | 1.108 | 0.000 | 1.778 | 4.678 | n/a | 0.000 | 0.829 | 0.411 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.710 | 5.507 | 0.267 | 14.710 |
| p99 | 27.947 | 2.602 | 0.000 | 2.669 | 6.355 | n/a | 0.000 | 1.499 | 0.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.683 | 7.854 | 0.281 | 19.683 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b000000000000009a | 27.947 | 6.355 | n/a | 0.000 | 1.499 | 0.411 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.683 | 7.854 | 0.281 | 19.683 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000009e | 20.650 | 4.678 | n/a | 0.000 | 0.829 | 0.433 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.710 | 5.507 | 0.267 | 14.710 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.757 | 0.000 | 0.000 | 0.496 | 4.899 | 0.197 | 0.000 | 0.180 | 0.701 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.043 | 5.270 | 0.279 | 18.043 |
| p99 | 25.983 | 1.179 | 0.000 | 2.293 | 7.056 | n/a | 0.000 | 0.184 | 0.767 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.067 | 7.240 | 0.282 | 18.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000a1 | 25.983 | 7.056 | n/a | 0.000 | 0.184 | 0.701 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.043 | 7.240 | 0.279 | 18.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000a4 | 23.757 | 4.742 | 0.197 | 0.000 | 0.130 | 0.621 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.067 | 5.070 | 0.213 | 18.067 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000a7 | 18.692 | 4.899 | 0.191 | 0.000 | 0.180 | 0.767 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.655 | 5.270 | 0.282 | 12.655 | node-14/thread-8/socket.wait-first-byte | none observed |

## P2 / L4 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.030 | 0.366 | 0.000 | 2.334 | 7.850 | 0.415 | 0.000 | 0.069 | 0.534 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.827 | 8.333 | 0.210 | 29.827 |
| p99 | 119.453 | 2.084 | 1.224 | 4.946 | 11.630 | n/a | 0.000 | 0.560 | 0.892 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 110.228 | 11.861 | 0.303 | 110.228 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000ad | 119.453 | 7.850 | 0.415 | 0.000 | 0.069 | 0.892 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 110.228 | 8.333 | 0.070 | 110.228 | node-14/thread-8/socket.wait-first-byte | driver.worker-message 0.518ms |
| bc96454f7fa2934b00000000000000b0 | 56.540 | 11.630 | 0.169 | 0.000 | 0.063 | 0.694 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 43.985 | 11.861 | 0.210 | 43.985 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000a8 | 39.030 | 8.109 | n/a | 0.000 | 0.560 | 0.534 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.827 | 8.669 | 0.222 | 29.827 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000ab | 24.499 | 7.153 | n/a | 0.000 | 0.259 | 0.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.659 | 7.411 | 0.303 | 16.659 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L16 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.642 | 0.189 | 0.000 | 0.423 | 4.268 | 1.330 | 0.000 | 0.093 | 0.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 61.210 | 5.415 | 0.062 | 61.210 |
| p99 | 192.235 | 0.426 | 0.000 | 1.595 | 8.488 | n/a | 0.000 | 1.147 | 0.970 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 186.454 | 9.911 | 0.249 | 186.454 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000b4 | 192.235 | 4.268 | n/a | 0.000 | 1.147 | 0.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 186.454 | 5.415 | 0.028 | 186.454 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000ba | 128.110 | 8.488 | 1.330 | 0.000 | 0.093 | 0.970 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 117.229 | 9.911 | 0.077 | 117.229 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000b6 | 65.642 | 3.421 | n/a | 0.000 | 0.652 | 0.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 61.210 | 4.074 | 0.062 | 61.210 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000b2 | 27.671 | 6.556 | 0.246 | 0.000 | 0.089 | 0.832 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.948 | 6.891 | 0.249 | 19.948 | node-14/thread-8/socket.wait-first-byte | none observed |

## P2 / L16 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 65.642 | 0.410 | 0.000 | 1.573 | 3.421 | n/a | 0.000 | 0.652 | 0.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 61.210 | 4.074 | 0.028 | 61.210 |
| p99 | 192.235 | 0.426 | 0.000 | 1.595 | 4.268 | n/a | 0.000 | 1.147 | 0.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 186.454 | 5.415 | 0.062 | 186.454 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000b4 | 192.235 | 4.268 | n/a | 0.000 | 1.147 | 0.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 186.454 | 5.415 | 0.028 | 186.454 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000b6 | 65.642 | 3.421 | n/a | 0.000 | 0.652 | 0.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 61.210 | 4.074 | 0.062 | 61.210 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2/P4 / read-your-own-write / read (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.932 | n/a | n/a | n/a | 9.245 | 1.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 10.919 | 0.998 | 0.021 |
| p99 | 154.503 | n/a | n/a | n/a | 96.296 | 91.292 | 5.543 | 0.000 | 2.522 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 131.237 | 107.467 | 1.000 | 131.237 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000fa | 154.503 | 96.296 | 5.628 | 5.543 | 0.000 | 0.531 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 46.505 | 107.467 | 0.696 | 46.505 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000b8 | 152.504 | 15.444 | 5.414 | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 131.237 | 20.858 | 0.137 | 131.237 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000011a | 99.172 | 7.859 | 91.292 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 99.151 | 1.000 | 0.021 | node-14/thread-0/rpc.replica.observe | client.encode 6.327ms |
| bc96454f7fa2934b0000000000000093 | 34.896 | 28.773 | 2.989 | 3.091 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.043 | 34.853 | 0.999 | 0.043 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000c5 | 34.859 | 13.301 | 1.636 | 0.000 | 0.000 | 2.522 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.400 | 14.937 | 0.428 | 17.400 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000bd | 19.053 | 2.062 | 16.963 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 19.024 | 0.998 | 0.029 | node-14/thread-0/rpc.replica.observe | none observed |
| bc96454f7fa2934b00000000000000db | 14.440 | 14.310 | 0.108 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 14.419 | 0.999 | 0.021 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b000000000000010a | 13.012 | 12.895 | 0.069 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.048 | 12.964 | 0.996 | 0.048 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000fe | 12.716 | 11.241 | 0.376 | 1.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 12.696 | 0.998 | 0.021 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000d8 | 11.081 | 10.844 | 0.224 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 11.068 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000b5 | 10.932 | 8.820 | 2.099 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.919 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000a2 | 10.423 | 9.513 | 0.898 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.410 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b000000000000010e | 10.043 | 9.593 | 0.437 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 10.031 | 0.999 | 0.013 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b0000000000000097 | 9.749 | 9.245 | 0.481 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.023 | 9.726 | 0.998 | 0.023 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b000000000000012f | 8.969 | 0.377 | 8.567 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.026 | 8.944 | 0.997 | 0.026 | node-14/thread-0/rpc.replica.observe | none observed |
| bc96454f7fa2934b000000000000012b | 8.809 | 8.235 | 0.558 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 8.793 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000e5 | 7.849 | 7.564 | 0.269 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.016 | 7.833 | 0.998 | 0.016 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b00000000000000ce | 7.647 | 1.247 | 6.387 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 7.634 | 0.998 | 0.013 | node-14/thread-0/rpc.replica.observe | none observed |
| bc96454f7fa2934b00000000000000cc | 7.635 | 5.656 | 1.957 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 7.613 | 0.997 | 0.021 | node-14/thread-2/replica.pull-at | none observed |
| bc96454f7fa2934b0000000000000114 | 7.634 | 0.506 | 7.107 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 7.613 | 0.997 | 0.021 | node-14/thread-0/rpc.replica.observe | none observed |

## P2 / L64 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.703 | 0.145 | 0.000 | 0.441 | 5.484 | 0.317 | 0.000 | 0.060 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.904 | 6.451 | 0.120 | 30.904 |
| p99 | 101.769 | 2.009 | 0.003 | 5.258 | 8.874 | n/a | 0.590 | 1.087 | 0.849 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 95.567 | 9.387 | 0.253 | 95.567 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000c3 | 101.769 | 5.100 | 0.196 | 0.000 | 0.057 | 0.849 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 95.567 | 5.353 | 0.053 | 95.567 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000be | 53.641 | 5.484 | 0.317 | 0.590 | 0.060 | 0.846 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 46.344 | 6.451 | 0.120 | 46.344 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000bc | 40.703 | 8.874 | n/a | 0.000 | 0.514 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.904 | 9.387 | 0.231 | 30.904 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000c0 | 31.182 | 6.806 | n/a | 0.000 | 1.087 | 0.335 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 22.954 | 7.893 | 0.253 | 22.954 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L64 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.182 | 0.614 | 0.000 | 5.258 | 6.806 | n/a | 0.000 | 1.087 | 0.335 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 22.954 | 7.893 | 0.253 | 22.954 |
| p99 | 31.182 | 0.614 | 0.000 | 5.258 | 6.806 | n/a | 0.000 | 1.087 | 0.335 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 22.954 | 7.893 | 0.253 | 22.954 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000c0 | 31.182 | 6.806 | n/a | 0.000 | 1.087 | 0.335 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 22.954 | 7.893 | 0.253 | 22.954 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.466 | 0.852 | 0.000 | 1.593 | 3.860 | n/a | 0.000 | 0.483 | 0.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 23.271 | 4.882 | 0.225 | 23.271 |
| p99 | 91.894 | 1.601 | 0.002 | 1.929 | 10.197 | n/a | 0.581 | 1.119 | 0.701 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 78.719 | 12.510 | 0.334 | 78.719 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000cf | 91.894 | 10.197 | 2.243 | 0.000 | 0.069 | 0.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 78.719 | 12.510 | 0.136 | 78.719 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000c8 | 38.402 | 6.587 | 1.398 | 0.581 | 0.081 | 0.701 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.053 | 8.648 | 0.225 | 29.053 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000c4 | 28.466 | 3.763 | n/a | 0.000 | 1.119 | 0.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 23.271 | 4.882 | 0.172 | 23.271 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000cb | 16.691 | 3.860 | n/a | 0.000 | 0.483 | 0.321 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.026 | 4.344 | 0.260 | 12.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000cd | 12.283 | 3.224 | n/a | 0.000 | 0.873 | 0.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.768 | 4.097 | 0.334 | 7.768 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L256 / commit / 5-10 facts (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.691 | 1.459 | 0.000 | 1.919 | 3.763 | n/a | 0.000 | 0.873 | 0.321 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.026 | 4.344 | 0.260 | 12.026 |
| p99 | 28.466 | 1.601 | 0.002 | 1.929 | 3.860 | n/a | 0.000 | 1.119 | 0.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 23.271 | 4.882 | 0.334 | 23.271 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000c4 | 28.466 | 3.763 | n/a | 0.000 | 1.119 | 0.313 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 23.271 | 4.882 | 0.172 | 23.271 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000cb | 16.691 | 3.860 | n/a | 0.000 | 0.483 | 0.321 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.026 | 4.344 | 0.260 | 12.026 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000cd | 12.283 | 3.224 | n/a | 0.000 | 0.873 | 0.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.768 | 4.097 | 0.334 | 7.768 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / L1024 / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 46.747 | 0.000 | 0.000 | 0.323 | 5.764 | 0.170 | 0.000 | 0.069 | 0.668 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 40.031 | 6.003 | 0.128 | 40.031 |
| p99 | 59.819 | 0.000 | 0.000 | 0.386 | 9.828 | 3.342 | 0.549 | 0.070 | 0.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 45.363 | 13.789 | 0.231 | 45.363 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000d1 | 59.819 | 9.828 | 3.342 | 0.549 | 0.070 | 0.668 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 45.363 | 13.789 | 0.231 | 45.363 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000d4 | 46.747 | 5.764 | 0.170 | 0.000 | 0.069 | 0.713 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 40.031 | 6.003 | 0.128 | 40.031 | node-14/thread-8/socket.wait-first-byte | none observed |

## P2 / recovery / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 40.530 | 0.583 | 0.000 | 0.650 | 4.322 | 3.003 | 0.000 | 0.070 | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 35.486 | 4.446 | 0.110 | 35.486 |
| p99 | 64.588 | 1.917 | 0.000 | 2.147 | 5.672 | n/a | 0.306 | 0.243 | 0.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 59.661 | 7.896 | 0.158 | 59.661 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000d7 | 64.588 | 4.322 | n/a | 0.000 | 0.109 | 0.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 59.661 | 4.432 | 0.069 | 59.661 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000d6 | 50.087 | 4.517 | 3.003 | 0.306 | 0.070 | 0.607 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 41.583 | 7.896 | 0.158 | 41.583 | node-14/thread-8/socket.wait-first-byte | driver.worker-message 0.702ms |
| bc96454f7fa2934b00000000000000dc | 40.530 | 4.177 | 0.206 | 0.000 | 0.064 | 0.598 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 35.486 | 4.446 | 0.110 | 35.486 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000da | 37.507 | 5.672 | n/a | 0.000 | 0.243 | 0.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.974 | 5.915 | 0.158 | 30.974 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / recovery / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.507 | 0.583 | 0.000 | 2.147 | 5.672 | n/a | 0.000 | 0.243 | 0.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.974 | 5.915 | 0.158 | 30.974 |
| p99 | 37.507 | 0.583 | 0.000 | 2.147 | 5.672 | n/a | 0.000 | 0.243 | 0.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.974 | 5.915 | 0.158 | 30.974 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000da | 37.507 | 5.672 | n/a | 0.000 | 0.243 | 0.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.974 | 5.915 | 0.158 | 30.974 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4mix / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.857 | 0.000 | 0.000 | 0.338 | 4.359 | 1.437 | 0.000 | 0.075 | 1.147 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.580 | 5.470 | 0.152 | 29.580 |
| p99 | 39.916 | 0.224 | 0.000 | 0.348 | 5.908 | n/a | 0.432 | 0.178 | 1.351 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 32.478 | 6.087 | 0.266 | 32.478 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000dd | 39.916 | 5.908 | n/a | 0.000 | 0.178 | 1.351 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 32.478 | 6.087 | 0.152 | 32.478 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000df | 35.857 | 4.359 | 0.271 | 0.432 | 0.068 | 1.147 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 29.580 | 5.130 | 0.143 | 29.580 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000e1 | 20.531 | 3.958 | 1.437 | 0.000 | 0.075 | 0.373 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.688 | 5.470 | 0.266 | 14.688 | node-14/thread-8/socket.wait-first-byte | none observed |

## P4 / p4mix / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.916 | 0.000 | 0.000 | 0.233 | 5.908 | n/a | 0.000 | 0.178 | 1.351 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 32.478 | 6.087 | 0.152 | 32.478 |
| p99 | 39.916 | 0.000 | 0.000 | 0.233 | 5.908 | n/a | 0.000 | 0.178 | 1.351 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 32.478 | 6.087 | 0.152 | 32.478 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000dd | 39.916 | 5.908 | n/a | 0.000 | 0.178 | 1.351 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 32.478 | 6.087 | 0.152 | 32.478 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.943 | 0.713 | 0.000 | 1.768 | 5.714 | n/a | 0.000 | 0.371 | 0.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.969 | 6.312 | 0.207 | 21.969 |
| p99 | 65.302 | 1.709 | 0.000 | 2.684 | 8.249 | n/a | 1.008 | 1.799 | 1.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 58.206 | 8.620 | 0.390 | 58.206 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000127 | 65.302 | 6.008 | 0.330 | 0.000 | 0.066 | 0.692 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 58.206 | 6.404 | 0.098 | 58.206 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000105 | 44.899 | 6.016 | 0.233 | 0.474 | 0.130 | 0.519 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 37.527 | 6.853 | 0.153 | 37.527 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000e6 | 41.769 | 6.139 | 0.191 | 1.008 | 0.070 | 0.978 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 33.384 | 7.407 | 0.177 | 33.384 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000129 | 34.810 | 5.173 | 0.280 | 0.000 | 0.076 | 1.032 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 28.249 | 5.529 | 0.159 | 28.249 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000e4 | 32.459 | 5.487 | n/a | 0.000 | 0.825 | 0.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 25.797 | 6.312 | 0.194 | 25.797 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000fd | 29.943 | 8.249 | n/a | 0.000 | 0.371 | 0.463 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 20.860 | 8.620 | 0.288 | 20.860 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000106 | 28.223 | 4.719 | n/a | 0.000 | 1.135 | 0.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.969 | 5.855 | 0.207 | 21.969 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000103 | 22.467 | 4.832 | n/a | 0.000 | 0.821 | 0.572 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.242 | 5.653 | 0.252 | 16.242 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000101 | 22.465 | 3.729 | n/a | 0.000 | 1.799 | 0.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.477 | 5.529 | 0.246 | 16.477 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000ff | 18.854 | 5.714 | 0.300 | 0.000 | 0.106 | 0.508 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.226 | 6.120 | 0.325 | 12.226 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000125 | 17.787 | 5.792 | n/a | 0.000 | 1.147 | 0.559 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 10.290 | 6.939 | 0.390 | 10.290 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h1 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 43.600 | 1.044 | 0.000 | 1.929 | 9.606 | 2.110 | 0.000 | 0.139 | 0.487 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 33.956 | 9.990 | 0.210 | 33.956 |
| p99 | 125.243 | 1.652 | 0.860 | 4.012 | 10.969 | n/a | 0.780 | 0.384 | 1.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 110.624 | 13.202 | 0.315 | 110.624 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000e8 | 125.243 | 10.969 | 2.110 | 0.000 | 0.122 | 1.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 110.624 | 13.202 | 0.105 | 110.624 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000ea | 43.600 | 7.777 | 0.462 | 0.780 | 0.139 | 0.487 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 33.956 | 9.157 | 0.210 | 33.956 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000ec | 31.757 | 9.606 | n/a | 0.000 | 0.384 | 0.448 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.320 | 9.990 | 0.315 | 21.320 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow3 / commit (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.359 | 0.716 | 0.000 | 0.642 | 4.876 | 0.282 | 0.000 | 0.109 | 0.644 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.782 | 5.212 | 0.141 | 27.782 |
| p99 | 102.417 | 2.297 | 0.000 | 3.302 | 7.770 | n/a | 0.334 | 1.110 | 0.867 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 96.561 | 8.880 | 0.201 | 96.561 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000ef | 102.417 | 4.876 | 0.227 | 0.000 | 0.109 | 0.644 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 96.561 | 5.212 | 0.051 | 96.561 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000f0 | 51.431 | 7.770 | n/a | 0.000 | 1.110 | 0.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 41.884 | 8.880 | 0.173 | 41.884 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000f5 | 33.359 | 4.057 | 0.282 | 0.334 | 0.037 | 0.867 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.782 | 4.709 | 0.141 | 27.782 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b00000000000000f8 | 27.328 | 4.880 | n/a | 0.000 | 0.610 | 0.441 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.398 | 5.490 | 0.201 | 21.398 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow3 / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.431 | 1.196 | 0.000 | 3.302 | 7.770 | n/a | 0.000 | 1.110 | 0.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 41.884 | 8.880 | 0.173 | 41.884 |
| p99 | 51.431 | 1.196 | 0.000 | 3.302 | 7.770 | n/a | 0.000 | 1.110 | 0.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 41.884 | 8.880 | 0.173 | 41.884 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b00000000000000f0 | 51.431 | 7.770 | n/a | 0.000 | 1.110 | 0.667 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 41.884 | 8.880 | 0.173 | 41.884 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.787 | 1.026 | 0.000 | 1.952 | 3.729 | n/a | 0.000 | 1.147 | 0.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 10.290 | 5.529 | 0.246 | 10.290 |
| p99 | 22.465 | 1.709 | 0.000 | 2.529 | 5.792 | n/a | 0.000 | 1.799 | 0.559 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.477 | 6.939 | 0.390 | 16.477 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000101 | 22.465 | 3.729 | n/a | 0.000 | 1.799 | 0.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.477 | 5.529 | 0.246 | 16.477 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000125 | 17.787 | 5.792 | n/a | 0.000 | 1.147 | 0.559 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 10.290 | 6.939 | 0.390 | 10.290 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h3 / commit (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.050 | 0.409 | 0.000 | 1.858 | 4.852 | n/a | 0.000 | 0.247 | 0.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.064 | 5.343 | 0.219 | 19.064 |
| p99 | 56.268 | 1.515 | 0.001 | 2.520 | 5.071 | n/a | 0.828 | 2.521 | 0.653 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 50.134 | 7.498 | 0.277 | 50.134 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000109 | 56.268 | 4.681 | n/a | 0.000 | 0.879 | 0.573 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 50.134 | 5.561 | 0.099 | 50.134 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000111 | 37.002 | 5.071 | 0.200 | 0.000 | 0.072 | 0.653 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 31.006 | 5.343 | 0.144 | 31.006 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000115 | 31.006 | 4.852 | 0.189 | 0.828 | 0.069 | 0.632 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 24.435 | 5.938 | 0.192 | 24.435 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000010d | 27.050 | 4.977 | n/a | 0.000 | 2.521 | 0.488 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.064 | 7.498 | 0.277 | 19.064 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.267ms |
| bc96454f7fa2934b0000000000000113 | 23.743 | 5.057 | n/a | 0.000 | 0.175 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.209 | 5.231 | 0.220 | 18.209 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000010f | 22.940 | 4.021 | n/a | 0.000 | 0.998 | 0.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.427 | 5.018 | 0.219 | 17.427 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000010b | 19.737 | 4.112 | n/a | 0.000 | 0.247 | 0.296 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 15.082 | 4.360 | 0.221 | 15.082 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h3 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.737 | 0.395 | 0.000 | 1.858 | 4.021 | n/a | 0.000 | 0.247 | 0.296 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 15.082 | 4.360 | 0.219 | 15.082 |
| p99 | 22.940 | 1.456 | 0.000 | 2.468 | 4.112 | n/a | 0.000 | 0.998 | 0.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.427 | 5.018 | 0.221 | 17.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b000000000000010f | 22.940 | 4.021 | n/a | 0.000 | 0.998 | 0.495 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.427 | 5.018 | 0.219 | 17.427 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000010b | 19.737 | 4.112 | n/a | 0.000 | 0.247 | 0.296 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 15.082 | 4.360 | 0.221 | 15.082 | node-14/thread-0/socket.wait-first-byte | none observed |

## P2 / grow10 / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.503 | 0.000 | 0.000 | 0.364 | 13.120 | 6.181 | 0.000 | 0.085 | 1.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 251.324 | 15.075 | 0.238 | 251.324 |
| p99 | 412.165 | 1.963 | 0.000 | 155.651 | 158.862 | n/a | 0.000 | 0.900 | 2.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 339.684 | 159.762 | 0.388 | 339.684 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000118 | 412.165 | 158.862 | n/a | 0.000 | 0.900 | 1.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 251.324 | 159.762 | 0.388 | 251.324 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000119 | 357.503 | 13.120 | 1.874 | 0.000 | 0.081 | 2.745 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 339.684 | 15.075 | 0.042 | 339.684 | node-14/thread-8/socket.wait-first-byte | driver.publication 154.516ms |
| bc96454f7fa2934b0000000000000120 | 43.480 | 4.097 | 6.181 | 0.000 | 0.085 | 0.671 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 32.446 | 10.363 | 0.238 | 32.446 | node-14/thread-8/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.879 | 0.274 | 0.000 | 1.604 | 4.232 | n/a | 0.000 | 0.321 | 0.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 25.182 | 5.056 | 0.149 | 25.182 |
| p99 | 55.168 | 1.852 | 0.000 | 3.139 | 6.754 | n/a | 0.000 | 15.734 | 0.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 47.920 | 18.670 | 0.499 | 47.920 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b000000000000012a | 55.168 | 5.751 | n/a | 0.000 | 1.120 | 0.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 47.920 | 6.872 | 0.125 | 47.920 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000012e | 37.436 | 2.936 | n/a | 0.000 | 15.734 | 0.331 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.435 | 18.670 | 0.499 | 18.435 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.176ms |
| bc96454f7fa2934b000000000000012d | 34.815 | 6.754 | n/a | 0.000 | 0.321 | 0.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.380 | 7.075 | 0.203 | 27.380 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000133 | 31.879 | 4.251 | 0.376 | 0.000 | 0.120 | 0.653 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 26.479 | 4.747 | 0.149 | 26.479 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000131 | 30.573 | 4.232 | 0.255 | 0.000 | 0.066 | 0.837 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 25.182 | 4.553 | 0.149 | 25.182 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000135 | 20.048 | 3.864 | n/a | 0.000 | 1.191 | 0.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.656 | 5.056 | 0.252 | 14.656 | node-14/thread-0/socket.wait-first-byte | none observed |

## P4 / p4h10 / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.048 | 0.238 | 0.000 | 1.604 | 2.936 | n/a | 0.000 | 1.191 | 0.331 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.656 | 5.056 | 0.252 | 14.656 |
| p99 | 37.436 | 0.703 | 0.000 | 2.098 | 3.864 | n/a | 0.000 | 15.734 | 0.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.435 | 18.670 | 0.499 | 18.435 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b000000000000012e | 37.436 | 2.936 | n/a | 0.000 | 15.734 | 0.331 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 18.435 | 18.670 | 0.499 | 18.435 | node-14/thread-0/socket.wait-first-byte | driver.publication 1.176ms |
| bc96454f7fa2934b0000000000000135 | 20.048 | 3.864 | n/a | 0.000 | 1.191 | 0.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.656 | 5.056 | 0.252 | 14.656 | node-14/thread-0/socket.wait-first-byte | none observed |

## P5 / presweep / commit (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.802 | 0.276 | 0.000 | 0.367 | 4.545 | 0.238 | 0.000 | 0.094 | 0.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.821 | 5.679 | 0.239 | 17.821 |
| p99 | 102.858 | 1.600 | 0.000 | 2.335 | 9.302 | n/a | 0.000 | 1.194 | 0.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 92.556 | 9.600 | 0.242 | 92.556 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000137 | 102.858 | 9.302 | 0.205 | 0.000 | 0.094 | 0.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 92.556 | 9.600 | 0.093 | 92.556 | node-14/thread-8/socket.wait-first-byte | none observed |
| bc96454f7fa2934b0000000000000139 | 23.802 | 4.485 | n/a | 0.000 | 1.194 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.821 | 5.679 | 0.239 | 17.821 | node-14/thread-0/socket.wait-first-byte | none observed |
| bc96454f7fa2934b000000000000013b | 20.042 | 4.545 | 0.238 | 0.000 | 0.065 | 0.326 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 14.868 | 4.848 | 0.242 | 14.868 | node-14/thread-8/socket.wait-first-byte | none observed |

## P5 / presweep / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.802 | 1.600 | 0.000 | 2.335 | 4.485 | n/a | 0.000 | 1.194 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.821 | 5.679 | 0.239 | 17.821 |
| p99 | 23.802 | 1.600 | 0.000 | 2.335 | 4.485 | n/a | 0.000 | 1.194 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.821 | 5.679 | 0.239 | 17.821 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000139 | 23.802 | 4.485 | n/a | 0.000 | 1.194 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 17.821 | 5.679 | 0.239 | 17.821 | node-14/thread-0/socket.wait-first-byte | none observed |

## P5 / sweep / commit (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 140.702 | 0.000 | 0.000 | 0.268 | 140.664 | n/a | 0.000 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 140.674 | 1.000 | 0.029 |
| p99 | 182.174 | 1.967 | 5.522 | 5.072 | 182.078 | n/a | 0.000 | 0.052 | 4.494 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 43.833 | 182.088 | 1.000 | 43.833 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bc96454f7fa2934b0000000000000146 | 182.174 | 182.078 | n/a | 0.000 | 0.009 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.086 | 182.088 | 1.000 | 0.086 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 4.481ms; driver.publication 4.258ms; driver.publication 3.850ms; client.encode 3.824ms |
| bc96454f7fa2934b0000000000000145 | 175.522 | 175.481 | n/a | 0.000 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.030 | 175.491 | 1.000 | 0.030 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 4.481ms; driver.publication 4.258ms; driver.publication 3.850ms; client.encode 3.824ms |
| bc96454f7fa2934b0000000000000144 | 158.694 | 158.662 | n/a | 0.000 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 158.673 | 1.000 | 0.021 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 4.481ms; driver.publication 4.258ms; driver.publication 3.850ms; client.encode 3.824ms |
| bc96454f7fa2934b0000000000000143 | 156.516 | 156.481 | n/a | 0.000 | 0.012 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.022 | 156.494 | 1.000 | 0.022 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 4.481ms; driver.publication 4.258ms; driver.publication 3.850ms; client.encode 3.824ms |
| bc96454f7fa2934b0000000000000142 | 144.573 | 144.542 | n/a | 0.000 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 144.552 | 1.000 | 0.021 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 4.481ms; driver.publication 3.850ms; client.encode 3.824ms; driver.publication 2.936ms |
| bc96454f7fa2934b0000000000000141 | 140.702 | 140.664 | n/a | 0.000 | 0.010 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 140.674 | 1.000 | 0.029 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 4.481ms; driver.publication 3.850ms; client.encode 3.824ms; driver.publication 2.340ms |
| bc96454f7fa2934b000000000000013f | 120.986 | 120.950 | n/a | 0.000 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 120.961 | 1.000 | 0.024 | node-14/thread-0/client.persist-and-resolve | driver.publication 9.432ms; driver.publication 3.850ms; client.encode 3.824ms; driver.publication 2.340ms; driver.publication 1.487ms |
| bc96454f7fa2934b0000000000000140 | 110.383 | 110.347 | n/a | 0.000 | 0.011 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.025 | 110.358 | 1.000 | 0.025 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.850ms; client.encode 3.824ms; driver.publication 2.340ms; driver.publication 1.487ms; driver.worker-message 0.850ms |
| bc96454f7fa2934b000000000000013e | 91.483 | 91.425 | n/a | 0.000 | 0.014 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.044 | 91.439 | 1.000 | 0.044 | node-14/thread-0/client.persist-and-resolve | driver.publication 3.850ms; client.encode 3.824ms; driver.publication 2.340ms; driver.worker-message 0.694ms |
| bc96454f7fa2934b000000000000013d | 56.907 | 8.528 | n/a | 0.000 | 0.052 | 4.494 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 43.833 | 8.580 | 0.151 | 43.833 | node-14/thread-0/socket.wait-first-byte | driver.worker-message 0.694ms |
| bc96454f7fa2934b0000000000000147 | 33.694 | 5.282 | 0.354 | 0.000 | 0.016 | 0.893 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.150 | 5.651 | 0.168 | 27.150 | node-14/thread-8/socket.wait-first-byte | none observed |

## P1 / warmup / read (237 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.015 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.015 | 0.923 | 0.001 |
| p99 | 278.768 | n/a | n/a | n/a | 36.461 | n/a | 6.244 | 278.728 | 1.892 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.885 | 278.767 | 1.000 | 6.885 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| acd8ccf05f1b98090000000000000eb9 | 278.791 | 0.017 | n/a | 0.000 | 278.773 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.790 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000000eb8 | 278.783 | 0.018 | n/a | 0.000 | 278.764 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.782 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000000eb7 | 278.768 | 0.039 | n/a | 0.000 | 278.728 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.767 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000000ebf | 278.692 | 0.026 | n/a | 0.000 | 278.665 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.690 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000000eb6 | 278.454 | 0.240 | n/a | 0.000 | 278.212 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.452 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ad76f98bb27849700000000000007e7 | 277.723 | 0.624 | n/a | 0.000 | 277.093 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 277.717 | 1.000 | 0.006 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb27849700000000000007eb | 277.459 | 0.019 | n/a | 0.000 | 277.438 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.457 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb27849700000000000007ea | 277.431 | 0.023 | n/a | 0.000 | 277.406 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.429 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb27849700000000000007e9 | 277.403 | 0.025 | n/a | 0.000 | 277.376 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.400 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb27849700000000000007e8 | 277.389 | 0.063 | n/a | 0.000 | 277.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.385 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000001071 | 277.268 | 0.447 | n/a | 0.000 | 276.817 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 277.264 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000001076 | 277.205 | 0.023 | n/a | 0.000 | 277.181 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.205 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000001075 | 277.179 | 0.017 | n/a | 0.000 | 277.161 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.178 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000001074 | 277.151 | 0.022 | n/a | 0.000 | 277.128 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.150 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000001073 | 277.136 | 0.034 | n/a | 0.000 | 277.101 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.135 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000001072 | 277.112 | 0.052 | n/a | 0.000 | 277.058 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.110 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000000b65f | 276.704 | 0.042 | n/a | 0.000 | 276.661 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.703 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000000c2b9 | 276.700 | 0.022 | n/a | 0.000 | 276.677 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.699 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000000c2bc | 276.677 | 0.022 | n/a | 0.000 | 276.654 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.676 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000000c2b8 | 276.672 | 0.025 | n/a | 0.000 | 276.647 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.671 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1 / read (98 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.935 | 0.001 |
| p99 | 288.239 | n/a | n/a | n/a | 9.701 | n/a | 0.000 | 287.938 | 0.568 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.838 | 288.236 | 1.000 | 3.838 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d97400000000000204af | 288.239 | 0.298 | n/a | 0.000 | 287.938 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 288.236 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| b412c0a0ef88d974000000000000e95d | 274.826 | 0.262 | n/a | 0.000 | 274.561 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.823 | 1.000 | 0.004 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000000e965 | 9.705 | 9.701 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 9.701 | 1.000 | 0.004 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.067ms |
| b412c0a0ef88d974000000000000e837 | 7.359 | 2.953 | n/a | 0.000 | 0.000 | 0.568 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.838 | 2.953 | 0.401 | 3.838 | node-14/thread-3/socket.wait-first-byte | none observed |
| b412c0a0ef88d974000000000001c578 | 1.536 | 1.534 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.534 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001d009 | 1.086 | 1.084 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.084 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000020389 | 1.040 | 1.039 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.039 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001af5d | 0.735 | 0.502 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.233 | 0.502 | 0.683 | 0.233 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d9740000000000013476 | 0.678 | 0.676 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.676 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001ba0a | 0.656 | 0.654 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.654 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001e604 | 0.584 | 0.582 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.582 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001e369 | 0.577 | 0.574 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 0.574 | 0.995 | 0.003 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d9740000000000014b4e | 0.565 | 0.564 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.564 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001db58 | 0.565 | 0.564 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.564 | 0.998 | 0.001 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d974000000000000e849 | 0.512 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.507 | 0.990 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001fc08 | 0.476 | 0.475 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.475 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001c6b1 | 0.472 | 0.045 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.427 | 0.045 | 0.096 | 0.427 | uncovered | none observed |
| b412c0a0ef88d974000000000000e963 | 0.381 | 0.379 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.379 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001a06a | 0.381 | 0.374 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 0.374 | 0.981 | 0.007 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000001a734 | 0.374 | 0.372 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.372 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L4 / read (203 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.016 | 0.951 | 0.001 |
| p99 | 273.187 | n/a | n/a | n/a | 3.065 | n/a | 0.000 | 273.060 | 0.602 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.749 | 273.185 | 1.000 | 1.749 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ad76f98bb278497000000000000e323 | 274.313 | 0.165 | n/a | 0.000 | 274.145 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.310 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| acd8ccf05f1b9809000000000000e803 | 274.127 | 0.194 | n/a | 0.000 | 273.931 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.124 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000002198a | 273.187 | 0.125 | n/a | 0.000 | 273.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.185 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d97400000000000219a5 | 272.816 | 0.057 | n/a | 0.000 | 272.756 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.813 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| acd8ccf05f1b9809000000000000daaa | 204.508 | 0.372 | n/a | 0.000 | 204.125 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 204.496 | 1.000 | 0.012 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| b412c0a0ef88d97400000000000204b2 | 201.158 | 0.104 | n/a | 0.000 | 201.052 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 201.156 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.066ms |
| 2ad76f98bb278497000000000000d5f7 | 200.911 | 0.201 | n/a | 0.000 | 200.707 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 200.908 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| acd8ccf05f1b9809000000000000dab3 | 26.964 | 16.936 | n/a | 1.233 | 0.000 | 0.849 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.946 | 18.169 | 0.674 | 7.946 | node-14/thread-5/client.reach | none observed |
| 2ad76f98bb278497000000000000d631 | 7.865 | 4.692 | n/a | 0.000 | 0.000 | 0.618 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.554 | 4.692 | 0.597 | 2.554 | node-14/thread-4/reader.execute | replica.apply-delta 0.016ms |
| b412c0a0ef88d9740000000000020545 | 4.354 | 2.002 | n/a | 0.000 | 0.000 | 0.602 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.749 | 2.002 | 0.460 | 1.749 | node-14/thread-3/socket.wait-first-byte | none observed |
| b412c0a0ef88d9740000000000021acf | 3.083 | 3.065 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 3.065 | 0.994 | 0.018 | node-14/thread-3/replica.pull-at | none observed |
| acd8ccf05f1b9809000000000000db23 | 2.377 | 2.376 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.376 | 1.000 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000204d0 | 1.569 | 1.567 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.567 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000204d1 | 1.567 | 1.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 1.552 | 0.991 | 0.014 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000002c48d | 1.228 | 1.225 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.225 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| 2ad76f98bb278497000000000000fcce | 1.227 | 1.226 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.226 | 0.999 | 0.001 | node-14/thread-4/replica.pull-at | none observed |
| b412c0a0ef88d974000000000002c430 | 1.160 | 1.159 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.159 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 2ad76f98bb2784970000000000019821 | 1.007 | 1.006 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.006 | 0.999 | 0.001 | node-14/thread-4/reader.execute | none observed |
| 2ad76f98bb2784970000000000011c4e | 0.819 | 0.817 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.817 | 0.997 | 0.002 | node-14/thread-4/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000219d7 | 0.757 | 0.739 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.739 | 0.976 | 0.018 | node-14/thread-3/replica.pull-at | none observed |

## P1 / L16 / read (260 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.023 | n/a | n/a | n/a | 0.019 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.021 | 0.947 | 0.001 |
| p99 | 441.794 | n/a | n/a | n/a | 10.764 | n/a | 0.000 | 441.753 | 0.327 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.155 | 441.792 | 1.000 | 4.155 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d9740000000000038ddd | 441.830 | 0.146 | n/a | 0.000 | 441.683 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.829 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| acd8ccf05f1b98090000000000022908 | 441.799 | 0.070 | n/a | 0.000 | 441.729 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.799 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| acd8ccf05f1b98090000000000022904 | 441.794 | 0.233 | n/a | 0.000 | 441.558 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 441.792 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| b412c0a0ef88d9740000000000038ddc | 441.792 | 0.015 | n/a | 0.000 | 441.776 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.791 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| acd8ccf05f1b98090000000000022907 | 441.779 | 0.013 | n/a | 0.000 | 441.765 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.779 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| b412c0a0ef88d9740000000000038ddb | 441.772 | 0.023 | n/a | 0.000 | 441.748 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.771 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000038ddf | 441.769 | 0.015 | n/a | 0.000 | 441.753 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.768 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| acd8ccf05f1b98090000000000022906 | 441.769 | 0.018 | n/a | 0.000 | 441.749 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.768 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| acd8ccf05f1b98090000000000022905 | 441.760 | 0.034 | n/a | 0.000 | 441.725 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.760 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| b412c0a0ef88d9740000000000038dde | 441.751 | 0.048 | n/a | 0.000 | 441.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.750 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000038dda | 441.698 | 0.144 | n/a | 0.000 | 441.552 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 441.696 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 2ad76f98bb2784970000000000021a6e | 441.236 | 0.044 | n/a | 0.000 | 441.191 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.235 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 2ad76f98bb2784970000000000021a76 | 441.206 | 0.027 | n/a | 0.000 | 441.177 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.205 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 2ad76f98bb2784970000000000021a6d | 441.199 | 0.143 | n/a | 0.000 | 441.054 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 441.197 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 2ad76f98bb2784970000000000021a75 | 441.177 | 0.040 | n/a | 0.000 | 441.135 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 441.176 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 2ad76f98bb2784970000000000021a6c | 441.063 | 0.210 | n/a | 0.000 | 440.850 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 441.060 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 2ad76f98bb2784970000000000021a7c | 120.813 | 10.375 | n/a | 0.000 | 110.436 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 120.811 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 2ad76f98bb2784970000000000021a7b | 120.773 | 10.445 | n/a | 0.000 | 110.320 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 120.765 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| b412c0a0ef88d9740000000000038e03 | 120.402 | 7.369 | n/a | 0.000 | 113.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 120.399 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.030ms |
| b412c0a0ef88d9740000000000038e4f | 112.153 | 0.024 | n/a | 0.000 | 112.128 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 112.152 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L64 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.033 | n/a | n/a | n/a | 0.027 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.033 | 0.961 | 0.001 |
| p99 | 286.934 | n/a | n/a | n/a | 3.949 | n/a | 0.000 | 286.859 | 0.401 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 27.710 | 286.930 | 1.000 | 27.710 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| acd8ccf05f1b9809000000000002e638 | 287.249 | 0.449 | n/a | 0.000 | 286.795 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 287.245 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b9809000000000002e63c | 286.974 | 0.196 | n/a | 0.000 | 286.776 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.972 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b9809000000000002e639 | 286.934 | 0.062 | n/a | 0.000 | 286.869 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 286.930 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b9809000000000002e63a | 286.905 | 0.021 | n/a | 0.000 | 286.882 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.903 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000002c07d | 286.901 | 0.231 | n/a | 0.000 | 286.669 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.900 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| acd8ccf05f1b9809000000000002e63b | 286.888 | 0.027 | n/a | 0.000 | 286.858 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.885 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000002c080 | 286.884 | 0.023 | n/a | 0.000 | 286.859 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.883 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000002c07f | 286.846 | 0.029 | n/a | 0.000 | 286.816 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.845 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000002c07e | 286.795 | 0.027 | n/a | 0.000 | 286.767 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.794 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000002c07c | 286.741 | 0.218 | n/a | 0.000 | 286.521 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 286.739 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000043bd5 | 286.289 | 0.019 | n/a | 0.000 | 286.270 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.288 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000043bd3 | 286.285 | 0.089 | n/a | 0.000 | 286.195 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.284 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000043bd0 | 286.284 | 0.252 | n/a | 0.000 | 286.030 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.282 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000043bd4 | 286.258 | 0.015 | n/a | 0.000 | 286.242 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.257 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000043bd2 | 286.239 | 0.015 | n/a | 0.000 | 286.223 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.239 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000043bd1 | 286.236 | 0.036 | n/a | 0.000 | 286.199 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.235 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| acd8ccf05f1b980900000000000325df | 280.954 | 0.013 | n/a | 0.000 | 280.940 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.953 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| acd8ccf05f1b980900000000000325dd | 280.950 | 0.039 | n/a | 0.000 | 280.910 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.949 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| acd8ccf05f1b980900000000000325de | 280.950 | 0.014 | n/a | 0.000 | 280.935 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.949 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| acd8ccf05f1b980900000000000325dc | 280.940 | 0.035 | n/a | 0.000 | 280.903 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 280.939 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |

## P1 / L256 / read (196 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.038 | n/a | n/a | n/a | 0.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.036 | 0.963 | 0.001 |
| p99 | 277.094 | n/a | n/a | n/a | 3.709 | n/a | 0.000 | 277.078 | 0.946 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 21.880 | 277.093 | 1.000 | 21.880 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| acd8ccf05f1b980900000000000391cc | 277.096 | 0.013 | n/a | 0.000 | 277.082 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.095 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| acd8ccf05f1b980900000000000391cb | 277.094 | 0.016 | n/a | 0.000 | 277.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 277.093 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| acd8ccf05f1b980900000000000391ca | 277.079 | 0.019 | n/a | 0.000 | 277.060 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 277.078 | 1.000 | 0.000 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| acd8ccf05f1b980900000000000391c9 | 277.075 | 0.033 | n/a | 0.000 | 277.041 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 277.074 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| acd8ccf05f1b980900000000000391c8 | 277.044 | 0.120 | n/a | 0.000 | 276.921 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.041 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| b412c0a0ef88d974000000000004e437 | 276.155 | 0.043 | n/a | 0.000 | 276.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.154 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| b412c0a0ef88d974000000000004e436 | 276.137 | 0.022 | n/a | 0.000 | 276.113 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.135 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| b412c0a0ef88d974000000000004e435 | 276.131 | 0.019 | n/a | 0.000 | 276.110 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.130 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| b412c0a0ef88d974000000000004e434 | 276.115 | 0.033 | n/a | 0.000 | 276.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.113 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| b412c0a0ef88d974000000000004e433 | 276.067 | 0.063 | n/a | 0.000 | 276.002 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.066 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| b412c0a0ef88d974000000000004e432 | 274.178 | 0.093 | n/a | 0.000 | 274.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.176 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| 2ad76f98bb278497000000000003551a | 271.406 | 0.021 | n/a | 0.000 | 271.384 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.405 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 2ad76f98bb2784970000000000035519 | 271.376 | 0.021 | n/a | 0.000 | 271.355 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.376 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 2ad76f98bb2784970000000000035517 | 271.365 | 0.176 | n/a | 0.000 | 271.185 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 271.361 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 2ad76f98bb2784970000000000035518 | 271.349 | 0.024 | n/a | 0.000 | 271.324 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.348 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| 2ad76f98bb2784970000000000035542 | 270.107 | 0.029 | n/a | 0.000 | 270.077 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 270.105 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| b412c0a0ef88d9740000000000057ea2 | 266.865 | 0.292 | n/a | 0.000 | 266.570 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.862 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000057ea3 | 266.864 | 0.082 | n/a | 0.000 | 266.780 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.862 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000057ea4 | 266.861 | 0.077 | n/a | 0.000 | 266.782 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 266.859 | 1.000 | 0.003 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000057ea1 | 266.726 | 0.394 | n/a | 0.000 | 266.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.724 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |

## P1 / L1024 / read (305 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.029 | n/a | n/a | n/a | 0.027 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.027 | 0.953 | 0.001 |
| p99 | 6.290 | n/a | n/a | n/a | 6.210 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.699 | 6.210 | 0.999 | 1.699 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d974000000000005967b | 47.676 | 26.161 | n/a | 1.441 | 0.000 | 0.522 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 19.552 | 27.602 | 0.579 | 19.552 | node-14/thread-3/socket.wait-first-byte | none observed |
| acd8ccf05f1b98090000000000043caf | 18.645 | 2.112 | n/a | 0.000 | 0.000 | 0.489 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.044 | 2.112 | 0.113 | 16.044 | node-14/thread-5/socket.wait-first-byte | none observed |
| 2ad76f98bb278497000000000003fc46 | 15.302 | 1.591 | n/a | 0.000 | 0.000 | 0.768 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.943 | 1.591 | 0.104 | 12.943 | node-14/thread-4/socket.wait-first-byte | none observed |
| 2ad76f98bb2784970000000000050c6a | 6.290 | 6.287 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.287 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| 2ad76f98bb2784970000000000050c6b | 6.287 | 6.256 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.032 | 6.256 | 0.995 | 0.032 | node-14/thread-4/replica.pull-at | none observed |
| 2ad76f98bb2784970000000000050c6c | 6.244 | 6.210 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.034 | 6.210 | 0.995 | 0.034 | node-14/thread-4/replica.pull-at | none observed |
| 2ad76f98bb278497000000000005234e | 6.141 | 6.137 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 6.137 | 0.999 | 0.003 | node-14/thread-4/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000063bdf | 4.208 | 4.205 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 4.205 | 0.999 | 0.003 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000006c53a | 3.120 | 3.119 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 3.119 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| 2ad76f98bb278497000000000005239e | 3.083 | 3.076 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 3.076 | 0.997 | 0.008 | node-14/thread-4/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000069f8b | 2.846 | 2.845 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 2.845 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000063d6c | 2.666 | 2.627 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.038 | 2.627 | 0.986 | 0.038 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d9740000000000063d6d | 2.654 | 2.613 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 2.613 | 0.985 | 0.041 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d9740000000000063d6e | 2.648 | 2.606 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.042 | 2.606 | 0.984 | 0.042 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d9740000000000063d6b | 2.648 | 2.643 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 2.643 | 0.998 | 0.005 | node-14/thread-3/reader.execute | none observed |
| acd8ccf05f1b9809000000000004b8b5 | 2.557 | 2.555 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.555 | 0.999 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| 2ad76f98bb2784970000000000050cc4 | 1.982 | 1.978 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 1.978 | 0.998 | 0.004 | node-14/thread-4/replica.pull-at | none observed |
| 2ad76f98bb2784970000000000050cc5 | 1.895 | 1.865 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.029 | 1.865 | 0.985 | 0.029 | node-14/thread-4/replica.pull-at | none observed |
| acd8ccf05f1b980900000000000554a2 | 1.711 | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.699 | 0.011 | 0.007 | 1.699 | uncovered | none observed |
| acd8ccf05f1b980900000000000554a1 | 1.709 | 0.028 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.682 | 0.028 | 0.016 | 1.682 | uncovered | none observed |

## P1 / recovery / read (220 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.036 | n/a | n/a | n/a | 0.027 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.034 | 0.958 | 0.001 |
| p99 | 313.178 | n/a | n/a | n/a | 4.292 | n/a | 0.000 | 312.973 | 0.501 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.929 | 313.177 | 1.000 | 1.929 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2ad76f98bb278497000000000005e7e4 | 314.021 | 0.022 | n/a | 0.000 | 313.999 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 314.021 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000005e7e3 | 313.963 | 0.152 | n/a | 0.000 | 313.809 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 313.960 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000005e815 | 313.178 | 0.237 | n/a | 0.000 | 312.940 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.177 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000005e81b | 313.097 | 0.127 | n/a | 0.000 | 312.969 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.096 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000005e814 | 313.008 | 0.034 | n/a | 0.000 | 312.973 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 313.007 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| acd8ccf05f1b980900000000000643ce | 312.833 | 0.328 | n/a | 0.000 | 312.502 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.003 | 312.830 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000079061 | 311.928 | 0.104 | n/a | 0.000 | 311.823 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 311.927 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d9740000000000079060 | 311.916 | 0.043 | n/a | 0.000 | 311.871 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 311.914 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000007905f | 311.896 | 0.049 | n/a | 0.000 | 311.846 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.895 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000007905e | 311.835 | 0.140 | n/a | 0.000 | 311.693 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 311.833 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000007906a | 311.645 | 0.030 | n/a | 0.000 | 311.614 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.644 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| b412c0a0ef88d974000000000007906b | 311.639 | 0.066 | n/a | 0.000 | 311.572 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 311.638 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | none observed |
| acd8ccf05f1b980900000000000643fc | 310.303 | 0.049 | n/a | 0.000 | 310.248 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 310.297 | 1.000 | 0.006 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000064411 | 308.557 | 0.055 | n/a | 0.000 | 308.501 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.556 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000064413 | 308.525 | 0.018 | n/a | 0.000 | 308.506 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.523 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000064412 | 308.519 | 0.018 | n/a | 0.000 | 308.500 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 308.517 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 2ad76f98bb278497000000000005fb4a | 286.772 | 0.134 | n/a | 0.000 | 286.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 286.770 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000065885 | 286.463 | 0.027 | n/a | 0.000 | 286.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.463 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000065884 | 286.450 | 0.015 | n/a | 0.000 | 286.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.449 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| acd8ccf05f1b98090000000000065883 | 286.442 | 0.023 | n/a | 0.000 | 286.418 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 286.441 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |

## P4 / p4mix / read (178 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.939 | 0.001 |
| p99 | 1.024 | n/a | n/a | n/a | 1.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 1.023 | 0.998 | 0.011 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d974000000000007bc23 | 22.375 | 12.748 | n/a | 1.484 | 0.000 | 0.425 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.717 | 14.232 | 0.636 | 7.717 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d974000000000007bfe7 | 1.024 | 1.023 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.023 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000008d084 | 0.808 | 0.807 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.807 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000093fa6 | 0.799 | 0.798 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.798 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000007d699 | 0.755 | 0.750 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.750 | 0.993 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000093a28 | 0.741 | 0.740 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.740 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000082caa | 0.674 | 0.673 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.673 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000009c577 | 0.615 | 0.613 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.613 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000094e9e | 0.560 | 0.558 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.558 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000082635 | 0.538 | 0.535 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.535 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000007d10b | 0.479 | 0.477 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.477 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000009c8d5 | 0.474 | 0.470 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.470 | 0.992 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000008aa1d | 0.444 | 0.441 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.441 | 0.992 | 0.004 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000088e6d | 0.436 | 0.434 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.434 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000008654f | 0.430 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 0.425 | 0.988 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000099910 | 0.427 | 0.421 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.421 | 0.986 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000995d7 | 0.423 | 0.421 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.421 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000008b65e | 0.419 | 0.419 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.419 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000009cd9e | 0.413 | 0.411 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.411 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000007fced | 0.409 | 0.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.397 | 0.973 | 0.011 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h1 / read (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.009 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.009 | 0.920 | 0.001 |
| p99 | 29.811 | n/a | n/a | n/a | 12.447 | n/a | 0.000 | 0.000 | 0.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 8.883 | 13.725 | 0.999 | 8.883 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d974000000000009d324 | 30.332 | 12.447 | n/a | 1.279 | 0.000 | 0.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.135 | 13.725 | 0.453 | 16.135 | node-14/thread-3/socket.wait-first-byte | none observed |
| b412c0a0ef88d97400000000000aad8f | 29.811 | 20.301 | n/a | 0.000 | 0.000 | 0.627 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 8.883 | 20.301 | 0.681 | 8.883 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.044ms |
| b412c0a0ef88d97400000000000aadbc | 2.772 | 2.771 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 2.771 | 0.999 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000a9d20 | 2.253 | 1.755 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.497 | 1.755 | 0.779 | 0.497 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000ac4a4 | 1.506 | 1.506 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.506 | 1.000 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000bab94 | 1.344 | 1.343 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.343 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000ac262 | 1.278 | 1.277 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.277 | 0.999 | 0.001 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d97400000000000a9d1d | 1.197 | 1.191 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 1.191 | 0.995 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000ac141 | 1.149 | 1.144 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.144 | 0.995 | 0.005 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000abd6c | 1.147 | 1.146 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 1.146 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000b131e | 1.135 | 1.133 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.133 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000af652 | 1.054 | 1.052 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.052 | 0.998 | 0.002 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d97400000000000abd7e | 1.008 | 1.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 1.000 | 0.992 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000a9d1f | 0.917 | 0.272 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.645 | 0.272 | 0.296 | 0.645 | uncovered | none observed |
| b412c0a0ef88d97400000000000abc22 | 0.815 | 0.231 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.584 | 0.231 | 0.283 | 0.584 | uncovered | none observed |
| b412c0a0ef88d97400000000000bd062 | 0.749 | 0.747 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.747 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000b10ba | 0.741 | 0.739 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.739 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000ab5e2 | 0.660 | 0.651 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.651 | 0.987 | 0.008 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000b771d | 0.659 | 0.657 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.657 | 0.997 | 0.002 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d97400000000000b11a7 | 0.655 | 0.654 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.654 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h3 / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.010 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.010 | 0.920 | 0.001 |
| p99 | 0.863 | n/a | n/a | n/a | 0.861 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.789 | 0.861 | 0.999 | 0.789 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d97400000000000be3bc | 10.743 | 2.171 | n/a | 0.000 | 0.000 | 0.436 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 8.136 | 2.171 | 0.202 | 8.136 | node-14/thread-3/socket.wait-first-byte | none observed |
| b412c0a0ef88d97400000000000deeb7 | 0.863 | 0.861 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.861 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000dce9f | 0.838 | 0.050 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.789 | 0.050 | 0.059 | 0.789 | uncovered | none observed |
| b412c0a0ef88d97400000000000d49e1 | 0.712 | 0.711 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.711 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000d2dea | 0.703 | 0.702 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.702 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000cccd1 | 0.650 | 0.649 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.649 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000d671b | 0.641 | 0.640 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.640 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000d0cdd | 0.631 | 0.629 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.629 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c3f75 | 0.579 | 0.577 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.577 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c6ebf | 0.530 | 0.529 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.529 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000d75a1 | 0.501 | 0.499 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.499 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000cbe6d | 0.491 | 0.490 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.490 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c463a | 0.490 | 0.488 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.488 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000dc335 | 0.477 | 0.475 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.475 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000cad7e | 0.470 | 0.468 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.468 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c9bfe | 0.434 | 0.432 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.432 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c2160 | 0.427 | 0.425 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.425 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c5ad2 | 0.407 | 0.405 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.405 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c40cf | 0.400 | 0.398 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.398 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000c4601 | 0.399 | 0.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.397 | 0.996 | 0.001 | node-14/thread-3/replica.pull-at | none observed |

## P4 / p4h10 / read (178 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.009 | n/a | n/a | n/a | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.912 | 0.001 |
| p99 | 1.064 | n/a | n/a | n/a | 1.062 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 1.062 | 0.998 | 0.024 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b412c0a0ef88d97400000000000e0682 | 12.083 | 2.345 | n/a | 0.000 | 0.000 | 0.701 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.038 | 2.345 | 0.194 | 9.038 | node-14/thread-3/socket.wait-first-byte | none observed |
| b412c0a0ef88d97400000000001021b4 | 1.064 | 1.062 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 1.062 | 0.998 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000e4d58 | 0.939 | 0.935 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.004 | 0.935 | 0.996 | 0.004 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d97400000000000e4aef | 0.724 | 0.723 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.723 | 0.999 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000f06d9 | 0.720 | 0.719 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.719 | 0.998 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000106b3e | 0.554 | 0.552 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.552 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000fdff2 | 0.509 | 0.507 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.507 | 0.997 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000105ee0 | 0.476 | 0.474 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.474 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000e5f5d | 0.474 | 0.472 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.472 | 0.996 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000e063b | 0.468 | 0.467 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.467 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d9740000000000102bc5 | 0.467 | 0.454 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.013 | 0.454 | 0.973 | 0.013 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000001067b5 | 0.464 | 0.463 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.463 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000e0638 | 0.462 | 0.438 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.438 | 0.947 | 0.024 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000edc68 | 0.449 | 0.447 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.447 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000e47fa | 0.448 | 0.446 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.446 | 0.995 | 0.002 | node-14/thread-3/reader.execute | none observed |
| b412c0a0ef88d97400000000000e3253 | 0.437 | 0.436 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.436 | 0.997 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000f5605 | 0.423 | 0.421 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.421 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000e47be | 0.407 | 0.401 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 0.401 | 0.984 | 0.006 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d97400000000000ffb47 | 0.402 | 0.400 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.400 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000010604b | 0.399 | 0.397 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.397 | 0.995 | 0.002 | node-14/thread-3/replica.pull-at | none observed |

## P5 / presweep / read (215 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.047 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.042 | 0.969 | 0.001 |
| p99 | 272.964 | n/a | n/a | n/a | 32.572 | n/a | 3.575 | 272.912 | 0.681 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.550 | 272.963 | 1.000 | 7.550 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| acd8ccf05f1b9809000000000006c13a | 273.108 | 0.028 | n/a | 0.000 | 273.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.107 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| acd8ccf05f1b9809000000000006c139 | 273.069 | 0.042 | n/a | 0.000 | 273.026 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 273.068 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| acd8ccf05f1b9809000000000006c138 | 272.964 | 0.051 | n/a | 0.000 | 272.912 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.963 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b412c0a0ef88d974000000000010c1b8 | 272.906 | 0.040 | n/a | 0.000 | 272.865 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.905 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d974000000000010c1ba | 272.903 | 0.015 | n/a | 0.000 | 272.887 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.902 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d974000000000010c1b9 | 272.903 | 0.026 | n/a | 0.000 | 272.876 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.902 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d974000000000010c1b7 | 272.885 | 0.020 | n/a | 0.000 | 272.865 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 272.884 | 1.000 | 0.000 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| acd8ccf05f1b9809000000000006c137 | 272.882 | 0.058 | n/a | 0.000 | 272.819 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.005 | 272.877 | 1.000 | 0.005 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b412c0a0ef88d974000000000010c1b6 | 272.827 | 0.028 | n/a | 0.000 | 272.798 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.826 | 1.000 | 0.001 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d974000000000010c1b5 | 272.768 | 0.148 | n/a | 0.000 | 272.617 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.765 | 1.000 | 0.002 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| acd8ccf05f1b9809000000000006c136 | 272.703 | 0.195 | n/a | 0.000 | 272.505 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.701 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| 2ad76f98bb27849700000000000660fd | 272.386 | 0.015 | n/a | 0.000 | 272.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.385 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 2ad76f98bb27849700000000000660fe | 272.376 | 0.018 | n/a | 0.000 | 272.358 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.376 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 2ad76f98bb27849700000000000660fc | 272.375 | 0.027 | n/a | 0.000 | 272.347 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.374 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 2ad76f98bb27849700000000000660fb | 272.352 | 0.026 | n/a | 0.000 | 272.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.351 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 2ad76f98bb27849700000000000660fa | 272.318 | 0.108 | n/a | 0.000 | 272.208 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.316 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 2ad76f98bb2784970000000000061624 | 38.642 | 19.458 | n/a | 5.216 | 0.000 | 1.150 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 12.819 | 24.674 | 0.639 | 12.819 | node-14/thread-4/reader.execute | none observed |
| acd8ccf05f1b9809000000000006f550 | 34.080 | 34.074 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 34.074 | 1.000 | 0.006 | node-14/thread-5/replica.pull-at | none observed |
| acd8ccf05f1b9809000000000006f551 | 33.919 | 33.712 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.207 | 33.712 | 0.994 | 0.207 | node-14/thread-5/replica.pull-at | none observed |
| acd8ccf05f1b9809000000000006f552 | 33.912 | 0.675 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 33.237 | 0.675 | 0.020 | 33.237 | uncovered | none observed |

## P5 / sweep / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.178 | n/a | n/a | n/a | 3.251 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.021 | 8.089 | 0.997 | 0.021 |
| p99 | 269.363 | n/a | n/a | n/a | 12.359 | n/a | 0.000 | 269.083 | 1.828 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 6.189 | 269.353 | 1.000 | 6.189 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| acd8ccf05f1b980900000000000744c9 | 269.363 | 0.270 | n/a | 0.000 | 269.083 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.010 | 269.353 | 1.000 | 0.010 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.036ms |
| acd8ccf05f1b980900000000000744ca | 269.228 | 0.147 | n/a | 0.000 | 269.020 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.062 | 269.167 | 1.000 | 0.062 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.036ms |
| acd8ccf05f1b980900000000000744cb | 269.086 | 0.240 | n/a | 0.000 | 268.520 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.327 | 268.760 | 0.999 | 0.327 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.036ms |
| 2ad76f98bb278497000000000006e120 | 269.019 | 0.328 | n/a | 0.000 | 268.680 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.011 | 269.008 | 1.000 | 0.011 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms; replica.apply-delta 0.029ms |
| acd8ccf05f1b980900000000000744cc | 268.677 | 0.292 | n/a | 0.000 | 268.299 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.086 | 268.591 | 1.000 | 0.086 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.036ms |
| acd8ccf05f1b980900000000000744cd | 268.448 | 0.151 | n/a | 0.000 | 268.204 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.093 | 268.355 | 1.000 | 0.093 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.062ms; replica.apply-delta 0.036ms |
| 2ad76f98bb278497000000000006e145 | 265.048 | 0.222 | n/a | 0.000 | 264.741 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.085 | 264.963 | 1.000 | 0.085 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 2ad76f98bb278497000000000006e146 | 265.045 | 0.208 | n/a | 0.000 | 264.720 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.117 | 264.928 | 1.000 | 0.117 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 2ad76f98bb278497000000000006e15c | 264.300 | 0.213 | n/a | 0.000 | 263.958 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.129 | 264.171 | 1.000 | 0.129 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| 2ad76f98bb278497000000000006e15d | 264.291 | 0.209 | n/a | 0.000 | 263.941 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.141 | 264.150 | 0.999 | 0.141 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| b412c0a0ef88d9740000000000114e11 | 263.310 | 0.401 | n/a | 0.000 | 262.901 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 263.302 | 1.000 | 0.009 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000114e27 | 262.131 | 0.223 | n/a | 0.000 | 261.832 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.077 | 262.054 | 1.000 | 0.077 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000114e2a | 262.124 | 0.239 | n/a | 0.000 | 261.765 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.120 | 262.004 | 1.000 | 0.120 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000114e28 | 262.122 | 0.214 | n/a | 0.000 | 261.815 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.093 | 262.030 | 1.000 | 0.093 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000114e29 | 262.120 | 0.214 | n/a | 0.000 | 261.804 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.102 | 262.018 | 1.000 | 0.102 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d9740000000000114e38 | 261.717 | 0.219 | n/a | 0.000 | 261.368 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.130 | 261.588 | 1.000 | 0.130 | node-14/thread-3/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| b412c0a0ef88d97400000000001149dc | 17.604 | 10.164 | n/a | 0.000 | 0.000 | 1.828 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 5.612 | 10.164 | 0.577 | 5.612 | node-14/thread-3/reader.execute | none observed |
| acd8ccf05f1b98090000000000073f1b | 14.506 | 12.359 | n/a | 0.000 | 0.000 | 0.606 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.541 | 12.359 | 0.852 | 1.541 | node-14/thread-5/reader.execute | none observed |
| 2ad76f98bb278497000000000006db49 | 10.442 | 7.668 | n/a | 0.000 | 0.000 | 0.511 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.262 | 7.668 | 0.734 | 2.262 | node-14/thread-4/reader.execute | none observed |
| b412c0a0ef88d9740000000000114db1 | 9.969 | 9.963 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.006 | 9.963 | 0.999 | 0.006 | node-14/thread-3/replica.pull-at | replica.apply-delta 0.038ms; replica.apply-delta 0.037ms; replica.apply-delta 0.026ms |

## P1 / baseline / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.012 | n/a | n/a | n/a | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.011 | 0.909 | 0.001 |
| p99 | 0.061 | n/a | n/a | n/a | 0.058 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.058 | 0.971 | 0.002 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| acd8ccf05f1b9809000000000000daa6 | 0.061 | 0.058 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.058 | 0.960 | 0.002 | node-14/thread-5/reader.execute | none observed |
| b412c0a0ef88d974000000000000e7f3 | 0.050 | 0.049 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.049 | 0.971 | 0.001 | node-14/thread-3/reader.execute | none observed |
| acd8ccf05f1b9809000000000000daa7 | 0.018 | 0.016 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.016 | 0.889 | 0.002 | node-14/thread-5/replica.pull-at | none observed |
| b412c0a0ef88d974000000000000e7f7 | 0.013 | 0.012 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.012 | 0.925 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000000e7f4 | 0.012 | 0.011 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.002 | 0.011 | 0.863 | 0.002 | node-14/thread-3/replica.pull-at | none observed |
| acd8ccf05f1b9809000000000000daa8 | 0.009 | 0.008 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.008 | 0.919 | 0.001 | node-14/thread-5/replica.pull-at | none observed |
| b412c0a0ef88d974000000000000e7f5 | 0.007 | 0.006 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.006 | 0.889 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| b412c0a0ef88d974000000000000e7f6 | 0.006 | 0.005 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.001 | 0.005 | 0.875 | 0.001 | node-14/thread-3/replica.pull-at | none observed |
| acd8ccf05f1b9809000000000000daa9 | 0.005 | 0.005 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.000 | 0.005 | 0.909 | 0.000 | node-14/thread-5/reader.execute | none observed |

## P3 / outside-phases / read (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.089 | n/a | n/a | n/a | 0.049 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.472 | 0.049 | 0.000 | 201.472 |
| p99 | 206.066 | n/a | n/a | n/a | 0.659 | n/a | 0.000 | 0.000 | 1.146 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.539 | 0.659 | 0.009 | 205.539 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000007 | 206.066 | 0.038 | n/a | 0.000 | 0.000 | 0.489 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.539 | 0.038 | 0.000 | 205.539 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000084 | 205.017 | 0.045 | n/a | 0.000 | 0.000 | 0.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 204.602 | 0.045 | 0.000 | 204.602 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000060 | 204.169 | 0.042 | n/a | 0.000 | 0.000 | 0.619 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.508 | 0.042 | 0.000 | 203.508 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000006 | 204.163 | 0.098 | n/a | 0.000 | 0.000 | 0.914 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.150 | 0.098 | 0.000 | 203.150 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000082 | 203.593 | 0.045 | n/a | 0.000 | 0.000 | 0.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.225 | 0.045 | 0.000 | 203.225 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000007c | 203.580 | 0.033 | n/a | 0.000 | 0.000 | 0.267 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.280 | 0.033 | 0.000 | 203.280 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000a2 | 203.377 | 0.054 | n/a | 0.000 | 0.000 | 0.581 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.742 | 0.054 | 0.000 | 202.742 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000005e | 203.048 | 0.049 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.588 | 0.049 | 0.000 | 202.588 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000005 | 202.852 | 0.056 | n/a | 0.000 | 0.000 | 0.616 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.180 | 0.056 | 0.000 | 202.180 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000a7 | 202.663 | 0.104 | n/a | 0.000 | 0.000 | 1.086 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.472 | 0.104 | 0.001 | 201.472 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000005d | 202.449 | 0.054 | n/a | 0.000 | 0.000 | 0.531 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.864 | 0.054 | 0.000 | 201.864 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000005b | 202.364 | 0.049 | n/a | 0.000 | 0.000 | 0.535 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.780 | 0.049 | 0.000 | 201.780 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000079 | 202.288 | 0.046 | n/a | 0.000 | 0.000 | 0.373 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.869 | 0.046 | 0.000 | 201.869 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000078 | 202.251 | 0.038 | n/a | 0.000 | 0.000 | 0.330 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.884 | 0.038 | 0.000 | 201.884 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000a0 | 202.241 | 0.046 | n/a | 0.000 | 0.000 | 0.343 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.852 | 0.046 | 0.000 | 201.852 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000a4 | 202.177 | 0.041 | n/a | 0.000 | 0.000 | 0.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.772 | 0.041 | 0.000 | 201.772 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000d0 | 202.127 | 0.056 | n/a | 0.000 | 0.000 | 0.612 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.459 | 0.056 | 0.000 | 201.459 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000cd | 202.089 | 0.044 | n/a | 0.000 | 0.000 | 0.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.688 | 0.044 | 0.000 | 201.688 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000a6 | 202.057 | 0.067 | n/a | 0.000 | 0.000 | 0.400 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.590 | 0.067 | 0.000 | 201.590 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000a5 | 202.022 | 0.062 | n/a | 0.000 | 0.000 | 0.513 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.447 | 0.062 | 0.000 | 201.447 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (20 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 389.312 | n/a | n/a | n/a | 3.059 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 384.170 | 3.059 | 0.011 | 384.170 |
| p99 | 1006.668 | n/a | n/a | n/a | 10.217 | n/a | 1.078 | 0.000 | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1005.872 | 11.295 | 0.600 | 1005.872 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000051 | 1006.668 | 0.350 | n/a | 0.000 | 0.000 | 0.447 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1005.872 | 0.350 | 0.000 | 1005.872 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000017 | 1004.621 | 0.187 | n/a | 0.000 | 0.000 | 0.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1003.662 | 0.187 | 0.000 | 1003.662 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000018 | 1003.579 | 0.178 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1003.056 | 0.178 | 0.000 | 1003.056 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000019 | 1003.292 | 0.255 | n/a | 0.000 | 0.000 | 0.531 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1002.506 | 0.255 | 0.000 | 1002.506 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000098 | 1003.071 | 0.134 | n/a | 0.000 | 0.000 | 0.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1002.588 | 0.134 | 0.000 | 1002.588 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000081 | 962.761 | 2.871 | n/a | 0.000 | 0.000 | 0.645 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 959.245 | 2.871 | 0.003 | 959.245 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000061 | 626.713 | 4.121 | n/a | 0.000 | 0.000 | 0.380 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 622.212 | 4.121 | 0.007 | 622.212 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000050 | 555.208 | 2.374 | n/a | 0.000 | 0.000 | 0.367 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 552.468 | 2.374 | 0.004 | 552.468 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000005e | 494.400 | 10.217 | n/a | 1.078 | 0.000 | 0.396 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 482.709 | 11.295 | 0.023 | 482.709 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000004e | 461.463 | 5.048 | n/a | 0.000 | 0.000 | 0.281 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 456.135 | 5.048 | 0.011 | 456.135 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000007e | 389.312 | 4.746 | n/a | 0.000 | 0.000 | 0.396 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 384.170 | 4.746 | 0.012 | 384.170 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000067 | 347.400 | 5.069 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 341.919 | 5.069 | 0.015 | 341.919 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000082 | 329.605 | 3.812 | n/a | 0.000 | 0.000 | 0.446 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 325.347 | 3.812 | 0.012 | 325.347 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000007f | 304.353 | 5.186 | n/a | 0.000 | 0.000 | 0.412 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 298.756 | 5.186 | 0.017 | 298.756 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000064 | 234.519 | 2.534 | n/a | 0.000 | 0.000 | 0.435 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 231.549 | 2.534 | 0.011 | 231.549 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000066 | 221.426 | 8.421 | n/a | 0.000 | 0.000 | 0.431 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 212.574 | 8.421 | 0.038 | 212.574 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000063 | 160.165 | 3.059 | n/a | 0.000 | 0.000 | 0.811 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 156.296 | 3.059 | 0.019 | 156.296 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000060 | 53.559 | 3.452 | n/a | 0.000 | 0.000 | 0.400 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 49.707 | 3.452 | 0.064 | 49.707 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000024 | 19.586 | 2.906 | n/a | 0.000 | 0.000 | 0.446 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 16.235 | 2.906 | 0.148 | 16.235 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000005d | 5.496 | 3.297 | n/a | 0.000 | 0.000 | 0.382 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1.817 | 3.297 | 0.600 | 1.817 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 209.053 | n/a | n/a | n/a | 4.149 | n/a | 0.000 | 0.000 | 0.516 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 198.125 | 4.149 | 0.011 | 198.125 |
| p99 | 773.604 | n/a | n/a | n/a | 20.097 | n/a | 3.091 | 0.000 | 0.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 769.016 | 23.188 | 0.111 | 769.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f000000000000001d | 773.604 | 4.149 | n/a | 0.000 | 0.000 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 769.016 | 4.149 | 0.005 | 769.016 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000001c | 444.489 | 4.893 | n/a | 0.000 | 0.000 | 0.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 439.048 | 4.893 | 0.011 | 439.048 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000001a | 209.053 | 20.097 | n/a | 3.091 | 0.000 | 0.516 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 185.350 | 23.188 | 0.111 | 185.350 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000001f | 202.720 | 3.955 | n/a | 0.000 | 0.000 | 0.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 198.125 | 3.955 | 0.020 | 198.125 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / baseline / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 801.941 | n/a | n/a | n/a | 3.095 | n/a | 0.000 | 0.000 | 0.378 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 798.468 | 3.095 | 0.004 | 798.468 |
| p99 | 979.390 | n/a | n/a | n/a | 3.372 | n/a | 0.000 | 0.000 | 0.444 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 977.079 | 3.372 | 0.017 | 977.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000023 | 979.390 | 1.970 | n/a | 0.000 | 0.000 | 0.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 977.079 | 1.970 | 0.002 | 977.079 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000020 | 801.941 | 3.095 | n/a | 0.000 | 0.000 | 0.378 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 798.468 | 3.095 | 0.004 | 798.468 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000021 | 193.027 | 3.372 | n/a | 0.000 | 0.000 | 0.444 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 189.211 | 3.372 | 0.017 | 189.211 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L1 / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 709.883 | n/a | n/a | n/a | 4.653 | n/a | 0.000 | 0.000 | 0.311 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 704.205 | 4.653 | 0.008 | 704.205 |
| p99 | 992.796 | n/a | n/a | n/a | 5.388 | n/a | 0.000 | 0.000 | 0.566 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 987.583 | 5.388 | 0.016 | 987.583 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000029 | 992.796 | 4.647 | n/a | 0.000 | 0.000 | 0.566 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 987.583 | 4.647 | 0.005 | 987.583 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000028 | 709.883 | 5.388 | n/a | 0.000 | 0.000 | 0.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 704.205 | 5.388 | 0.008 | 704.205 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000026 | 295.387 | 4.653 | n/a | 0.000 | 0.000 | 0.311 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 290.423 | 4.653 | 0.016 | 290.423 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L4 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.072 | n/a | n/a | n/a | 5.051 | n/a | 0.000 | 0.000 | 0.398 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 421.514 | 5.051 | 0.012 | 421.514 |
| p99 | 926.372 | n/a | n/a | n/a | 7.537 | n/a | 0.000 | 0.000 | 0.506 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 923.575 | 7.537 | 0.031 | 923.575 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f000000000000002f | 926.372 | 2.432 | n/a | 0.000 | 0.000 | 0.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 923.575 | 2.432 | 0.003 | 923.575 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000002d | 481.232 | 7.537 | n/a | 0.000 | 0.000 | 0.429 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 473.266 | 7.537 | 0.016 | 473.266 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000002b | 427.072 | 5.051 | n/a | 0.000 | 0.000 | 0.506 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 421.514 | 5.051 | 0.012 | 421.514 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000002a | 195.181 | 6.115 | n/a | 0.000 | 0.000 | 0.398 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 188.668 | 6.115 | 0.031 | 188.668 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L16 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 290.604 | n/a | n/a | n/a | 2.214 | n/a | 0.000 | 0.000 | 0.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 288.110 | 2.214 | 0.007 | 288.110 |
| p99 | 976.431 | n/a | n/a | n/a | 10.277 | n/a | 0.000 | 0.000 | 4.848 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 969.014 | 10.277 | 0.017 | 969.014 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000030 | 976.431 | 2.568 | n/a | 0.000 | 0.000 | 4.848 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 969.014 | 2.568 | 0.003 | 969.014 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000035 | 697.559 | 10.277 | n/a | 0.000 | 0.000 | 4.049 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 683.233 | 10.277 | 0.015 | 683.233 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000031 | 290.604 | 2.032 | n/a | 0.000 | 0.000 | 0.462 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 288.110 | 2.032 | 0.007 | 288.110 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000033 | 129.202 | 2.214 | n/a | 0.000 | 0.000 | 0.363 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 126.625 | 2.214 | 0.017 | 126.625 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L64 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 355.722 | n/a | n/a | n/a | 2.822 | n/a | 0.000 | 0.000 | 0.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 350.876 | 2.822 | 0.010 | 350.876 |
| p99 | 689.148 | n/a | n/a | n/a | 13.962 | n/a | 3.627 | 0.000 | 0.566 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 686.016 | 17.588 | 0.028 | 686.016 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f000000000000003a | 689.148 | 2.782 | n/a | 0.000 | 0.000 | 0.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 686.016 | 2.782 | 0.004 | 686.016 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000036 | 636.774 | 13.962 | n/a | 3.627 | 0.000 | 0.566 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 618.619 | 17.588 | 0.028 | 618.619 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000039 | 355.722 | 4.468 | n/a | 0.000 | 0.000 | 0.378 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 350.876 | 4.468 | 0.013 | 350.876 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000037 | 282.746 | 2.822 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 279.579 | 2.822 | 0.010 | 279.579 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L256 / internal (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 291.568 | n/a | n/a | n/a | 2.938 | n/a | 0.000 | 0.000 | 0.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 286.005 | 2.938 | 0.008 | 286.005 |
| p99 | 642.638 | n/a | n/a | n/a | 5.158 | n/a | 0.000 | 0.000 | 0.751 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 637.210 | 5.158 | 0.018 | 637.210 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f000000000000003e | 642.638 | 4.917 | n/a | 0.000 | 0.000 | 0.510 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 637.210 | 4.917 | 0.008 | 637.210 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000003f | 591.558 | 2.938 | n/a | 0.000 | 0.000 | 0.751 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 587.869 | 2.938 | 0.005 | 587.869 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000003c | 291.568 | 5.158 | n/a | 0.000 | 0.000 | 0.405 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 286.005 | 5.158 | 0.018 | 286.005 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000041 | 266.227 | 2.041 | n/a | 0.000 | 0.000 | 0.338 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 263.847 | 2.041 | 0.008 | 263.847 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000042 | 192.111 | 2.429 | n/a | 0.000 | 0.000 | 0.318 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 189.365 | 2.429 | 0.013 | 189.365 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / L1024 / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 957.152 | n/a | n/a | n/a | 2.129 | n/a | 0.000 | 0.000 | 0.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 954.525 | 2.129 | 0.002 | 954.525 |
| p99 | 999.147 | n/a | n/a | n/a | 2.305 | n/a | 0.000 | 0.000 | 2.227 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 994.791 | 2.305 | 0.002 | 994.791 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000045 | 999.147 | 2.129 | n/a | 0.000 | 0.000 | 2.227 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 994.791 | 2.129 | 0.002 | 994.791 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000044 | 957.152 | 2.305 | n/a | 0.000 | 0.000 | 0.323 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 954.525 | 2.305 | 0.002 | 954.525 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / recovery / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.130 | n/a | n/a | n/a | 3.196 | n/a | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 384.525 | 3.196 | 0.008 | 384.525 |
| p99 | 1005.697 | n/a | n/a | n/a | 6.559 | n/a | 0.000 | 0.000 | 1.681 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 998.788 | 6.559 | 0.014 | 998.788 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000046 | 1005.697 | 6.559 | n/a | 0.000 | 0.000 | 0.350 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 998.788 | 6.559 | 0.007 | 998.788 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000049 | 413.727 | 5.410 | n/a | 0.000 | 0.000 | 0.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 407.888 | 5.410 | 0.013 | 407.888 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000047 | 388.130 | 3.196 | n/a | 0.000 | 0.000 | 0.409 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 384.525 | 3.196 | 0.008 | 384.525 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000004b | 187.120 | 2.624 | n/a | 0.000 | 0.000 | 1.681 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 182.815 | 2.624 | 0.014 | 182.815 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4mix / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 968.849 | n/a | n/a | n/a | 2.168 | n/a | 0.000 | 0.000 | 0.291 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 966.389 | 2.168 | 0.002 | 966.389 |
| p99 | 1007.576 | n/a | n/a | n/a | 2.430 | n/a | 0.000 | 0.000 | 0.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1004.845 | 2.430 | 0.002 | 1004.845 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f000000000000004c | 1007.576 | 2.430 | n/a | 0.000 | 0.000 | 0.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1004.845 | 2.430 | 0.002 | 1004.845 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000004d | 968.849 | 2.168 | n/a | 0.000 | 0.000 | 0.291 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 966.389 | 2.168 | 0.002 | 966.389 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h1 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 259.706 | n/a | n/a | n/a | 5.016 | n/a | 0.000 | 0.000 | 0.870 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 252.393 | 5.016 | 0.012 | 252.393 |
| p99 | 920.938 | n/a | n/a | n/a | 8.566 | n/a | 0.000 | 0.000 | 1.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 915.157 | 8.566 | 0.050 | 915.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000053 | 920.938 | 5.016 | n/a | 0.000 | 0.000 | 0.765 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 915.157 | 5.016 | 0.005 | 915.157 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000054 | 732.787 | 8.566 | n/a | 0.000 | 0.000 | 1.112 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 723.110 | 8.566 | 0.012 | 723.110 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000055 | 259.706 | 6.202 | n/a | 0.000 | 0.000 | 1.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 252.393 | 6.202 | 0.024 | 252.393 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000052 | 86.133 | 4.265 | n/a | 0.000 | 0.000 | 0.870 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 80.999 | 4.265 | 0.050 | 80.999 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow3 / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 151.090 | n/a | n/a | n/a | 3.127 | n/a | 0.000 | 0.000 | 0.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 133.450 | 3.127 | 0.137 | 133.450 |
| p99 | 1042.955 | n/a | n/a | n/a | 134.640 | n/a | 8.719 | 0.000 | 3.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 898.217 | 143.359 | 0.441 | 898.217 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000058 | 1042.955 | 134.640 | n/a | 8.719 | 0.000 | 1.380 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 898.217 | 143.359 | 0.137 | 898.217 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000005b | 216.078 | 75.786 | n/a | 3.462 | 0.000 | 3.379 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 133.450 | 79.248 | 0.367 | 133.450 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000057 | 151.090 | 3.127 | n/a | 0.000 | 0.000 | 0.490 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 147.473 | 3.127 | 0.021 | 147.473 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000005a | 6.040 | 2.662 | n/a | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.047 | 2.662 | 0.441 | 3.047 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / p4h3 / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 218.161 | n/a | n/a | n/a | 2.271 | n/a | 0.000 | 0.000 | 0.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 215.515 | 2.271 | 0.012 | 215.515 |
| p99 | 1003.247 | n/a | n/a | n/a | 5.890 | n/a | 0.000 | 0.000 | 0.542 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1002.791 | 5.890 | 0.127 | 1002.791 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000074 | 1003.247 | 0.149 | n/a | 0.000 | 0.000 | 0.306 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 1002.791 | 0.149 | 0.000 | 1002.791 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000071 | 502.909 | 5.890 | n/a | 0.000 | 0.000 | 0.373 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 496.646 | 5.890 | 0.012 | 496.646 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000072 | 474.185 | 2.517 | n/a | 0.000 | 0.000 | 0.295 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 471.373 | 2.517 | 0.005 | 471.373 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000006a | 218.161 | 2.104 | n/a | 0.000 | 0.000 | 0.542 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 215.515 | 2.104 | 0.010 | 215.515 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000006f | 154.406 | 2.271 | n/a | 0.000 | 0.000 | 0.305 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 151.831 | 2.271 | 0.015 | 151.831 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000006e | 39.942 | 1.645 | n/a | 0.000 | 0.000 | 0.510 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 37.786 | 1.645 | 0.041 | 37.786 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000006b | 36.739 | 4.662 | n/a | 0.000 | 0.000 | 0.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 31.729 | 4.662 | 0.127 | 31.729 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / grow10 / internal (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 151.312 | n/a | n/a | n/a | 84.077 | n/a | 4.528 | 0.000 | 1.165 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 56.569 | 87.290 | 0.622 | 56.569 |
| p99 | 398.391 | n/a | n/a | n/a | 119.409 | n/a | 7.700 | 0.000 | 1.992 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 269.886 | 126.513 | 0.726 | 269.886 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000075 | 398.391 | 119.409 | n/a | 7.104 | 0.000 | 1.992 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 269.886 | 126.513 | 0.318 | 269.886 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000079 | 201.594 | 115.573 | n/a | 5.403 | 0.000 | 1.165 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 79.454 | 120.975 | 0.600 | 79.454 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f000000000000007a | 178.090 | 112.570 | n/a | 7.700 | 0.000 | 1.251 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 56.569 | 120.271 | 0.675 | 56.569 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f0000000000000078 | 158.395 | 93.429 | n/a | 5.097 | 0.000 | 0.571 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 59.298 | 98.526 | 0.622 | 59.298 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f000000000000007b | 151.312 | 84.077 | n/a | 3.213 | 0.000 | 1.503 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 62.519 | 87.290 | 0.577 | 62.519 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f000000000000007d | 124.320 | 77.456 | n/a | 3.792 | 0.000 | 0.747 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 42.325 | 81.248 | 0.654 | 42.325 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f000000000000007c | 113.845 | 78.085 | n/a | 4.528 | 0.000 | 1.183 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 30.049 | 82.614 | 0.726 | 30.049 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f0000000000000076 | 9.415 | 6.108 | n/a | 0.000 | 0.000 | 0.630 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 2.677 | 6.108 | 0.649 | 2.677 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / p4h10 / internal (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.764 | n/a | n/a | n/a | 2.583 | n/a | 0.000 | 0.000 | 0.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 428.124 | 2.583 | 0.019 | 428.124 |
| p99 | 999.021 | n/a | n/a | n/a | 9.618 | n/a | 0.000 | 0.000 | 0.723 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 995.759 | 9.618 | 0.179 | 995.759 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000089 | 999.021 | 2.539 | n/a | 0.000 | 0.000 | 0.723 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 995.759 | 2.539 | 0.003 | 995.759 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000008a | 617.156 | 2.583 | n/a | 0.000 | 0.000 | 0.301 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 614.272 | 2.583 | 0.004 | 614.272 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000008b | 451.958 | 9.618 | n/a | 0.000 | 0.000 | 0.523 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 441.817 | 9.618 | 0.021 | 441.817 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000084 | 436.764 | 8.312 | n/a | 0.000 | 0.000 | 0.327 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 428.124 | 8.312 | 0.019 | 428.124 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000087 | 224.727 | 6.358 | n/a | 0.000 | 0.000 | 0.373 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 217.996 | 6.358 | 0.028 | 217.996 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000085 | 11.601 | 2.074 | n/a | 0.000 | 0.000 | 0.349 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.177 | 2.074 | 0.179 | 9.177 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / presweep / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 700.094 | n/a | n/a | n/a | 2.184 | n/a | 0.000 | 0.000 | 0.384 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 695.640 | 2.184 | 0.006 | 695.640 |
| p99 | 844.551 | n/a | n/a | n/a | 4.070 | n/a | 0.000 | 0.000 | 0.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 842.062 | 4.070 | 0.010 | 842.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000090 | 844.551 | 2.184 | n/a | 0.000 | 0.000 | 0.305 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 842.062 | 2.184 | 0.003 | 842.062 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000008d | 700.094 | 4.070 | n/a | 0.000 | 0.000 | 0.384 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 695.640 | 4.070 | 0.006 | 695.640 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f000000000000008e | 216.965 | 2.142 | n/a | 0.000 | 0.000 | 0.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 214.400 | 2.142 | 0.010 | 214.400 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / sweep / internal (7 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.448 | n/a | n/a | n/a | 5.349 | n/a | 0.000 | 0.000 | 0.623 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.913 | 5.349 | 0.479 | 9.913 |
| p99 | 51.212 | n/a | n/a | n/a | 13.808 | n/a | 0.000 | 0.000 | 3.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 43.158 | 13.808 | 0.587 | 43.158 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7411f193bd70c90f0000000000000091 | 51.212 | 4.351 | n/a | 0.000 | 0.000 | 3.702 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 43.158 | 4.351 | 0.085 | 43.158 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000097 | 31.175 | 2.475 | n/a | 0.000 | 0.000 | 2.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 26.241 | 2.475 | 0.079 | 26.241 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000094 | 28.140 | 13.808 | n/a | 0.000 | 0.000 | 0.600 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 13.733 | 13.808 | 0.491 | 13.733 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000092 | 20.448 | 12.013 | n/a | 0.000 | 0.000 | 0.647 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 7.789 | 12.013 | 0.587 | 7.789 | node-14/thread-2/replica.fetch-feed | none observed |
| 7411f193bd70c90f0000000000000093 | 20.216 | 9.679 | n/a | 0.000 | 0.000 | 0.623 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 9.913 | 9.679 | 0.479 | 9.913 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000096 | 10.005 | 5.349 | n/a | 0.000 | 0.000 | 0.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 4.324 | 5.349 | 0.535 | 4.324 | node-14/thread-2/socket.wait-first-byte | none observed |
| 7411f193bd70c90f0000000000000095 | 6.107 | 1.826 | n/a | 0.000 | 0.000 | 0.416 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 3.865 | 1.826 | 0.299 | 3.865 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.693 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 0.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.213 | 0.050 | 0.000 | 202.213 |
| p99 | 207.403 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 1.767 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 206.429 | 0.079 | 0.001 | 206.429 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000008 | 207.403 | 0.040 | n/a | 0.000 | 0.000 | 0.934 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 206.429 | 0.040 | 0.000 | 206.429 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000009 | 204.520 | 0.059 | n/a | 0.000 | 0.000 | 1.767 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.694 | 0.059 | 0.000 | 202.694 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000000f | 202.823 | 0.050 | n/a | 0.000 | 0.000 | 0.385 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.388 | 0.050 | 0.000 | 202.388 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000000c | 202.771 | 0.047 | n/a | 0.000 | 0.000 | 0.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.314 | 0.047 | 0.000 | 202.314 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000010 | 202.693 | 0.058 | n/a | 0.000 | 0.000 | 0.422 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.213 | 0.058 | 0.000 | 202.213 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000000e | 202.357 | 0.034 | n/a | 0.000 | 0.000 | 0.369 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.954 | 0.034 | 0.000 | 201.954 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000000b | 202.113 | 0.044 | n/a | 0.000 | 0.000 | 0.359 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.709 | 0.044 | 0.000 | 201.709 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000012 | 200.564 | 0.060 | n/a | 0.000 | 0.000 | 0.528 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 199.976 | 0.060 | 0.000 | 199.976 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000011 | 88.812 | 0.079 | n/a | 0.000 | 0.000 | 0.370 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 88.363 | 0.079 | 0.001 | 88.363 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / baseline / read (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.826 | n/a | n/a | n/a | 0.044 | n/a | 0.000 | 0.000 | 0.402 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.239 | 0.044 | 0.000 | 202.239 |
| p99 | 203.709 | n/a | n/a | n/a | 0.070 | n/a | 0.000 | 0.000 | 0.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.250 | 0.070 | 0.001 | 203.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000013 | 203.709 | 0.057 | n/a | 0.000 | 0.000 | 0.402 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.250 | 0.057 | 0.000 | 203.250 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000015 | 202.976 | 0.034 | n/a | 0.000 | 0.000 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.639 | 0.034 | 0.000 | 202.639 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000014 | 202.826 | 0.044 | n/a | 0.000 | 0.000 | 0.542 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.239 | 0.044 | 0.000 | 202.239 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000016 | 127.202 | 0.070 | n/a | 0.000 | 0.000 | 0.772 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 126.360 | 0.070 | 0.001 | 126.360 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / L16 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.677 | n/a | n/a | n/a | 0.060 | n/a | 0.000 | 0.000 | 0.400 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.018 | 0.060 | 0.000 | 202.018 |
| p99 | 216.064 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 0.724 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 215.615 | 0.069 | 0.001 | 215.615 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000022 | 216.064 | 0.049 | n/a | 0.000 | 0.000 | 0.400 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 215.615 | 0.049 | 0.000 | 215.615 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000023 | 202.834 | 0.055 | n/a | 0.000 | 0.000 | 0.393 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.386 | 0.055 | 0.000 | 202.386 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000024 | 202.677 | 0.060 | n/a | 0.000 | 0.000 | 0.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.018 | 0.060 | 0.000 | 202.018 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000021 | 124.156 | 0.069 | n/a | 0.000 | 0.000 | 0.724 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 123.363 | 0.069 | 0.001 | 123.363 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000020 | 100.593 | 0.064 | n/a | 0.000 | 0.000 | 0.389 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 100.140 | 0.064 | 0.001 | 100.140 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / L64 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.150 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.353 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.820 | 0.040 | 0.000 | 201.820 |
| p99 | 211.843 | n/a | n/a | n/a | 0.076 | n/a | 0.000 | 0.000 | 1.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 211.470 | 0.076 | 0.001 | 211.470 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f000000000000002d | 211.843 | 0.040 | n/a | 0.000 | 0.000 | 0.333 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 211.470 | 0.040 | 0.000 | 211.470 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000002e | 202.975 | 0.076 | n/a | 0.000 | 0.000 | 1.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.820 | 0.076 | 0.000 | 201.820 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000029 | 202.872 | 0.036 | n/a | 0.000 | 0.000 | 0.335 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.501 | 0.036 | 0.000 | 202.501 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000002f | 202.770 | 0.040 | n/a | 0.000 | 0.000 | 0.423 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.307 | 0.040 | 0.000 | 202.307 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000027 | 202.542 | 0.040 | n/a | 0.000 | 0.000 | 0.353 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.149 | 0.040 | 0.000 | 202.149 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000026 | 202.150 | 0.034 | n/a | 0.000 | 0.000 | 0.274 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.842 | 0.034 | 0.000 | 201.842 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000002b | 202.083 | 0.035 | n/a | 0.000 | 0.000 | 0.632 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.417 | 0.035 | 0.000 | 201.417 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000028 | 174.125 | 0.063 | n/a | 0.000 | 0.000 | 0.388 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 173.675 | 0.063 | 0.000 | 173.675 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000002c | 129.999 | 0.070 | n/a | 0.000 | 0.000 | 0.549 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 129.380 | 0.070 | 0.001 | 129.380 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000002a | 56.704 | 0.050 | n/a | 0.000 | 0.000 | 0.325 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 56.329 | 0.050 | 0.001 | 56.329 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / L256 / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.132 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.747 | 0.047 | 0.000 | 201.747 |
| p99 | 218.833 | n/a | n/a | n/a | 0.084 | n/a | 0.000 | 0.000 | 0.652 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 218.365 | 0.084 | 0.000 | 218.365 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000033 | 218.833 | 0.047 | n/a | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 218.365 | 0.047 | 0.000 | 218.365 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000034 | 205.295 | 0.049 | n/a | 0.000 | 0.000 | 0.442 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 204.804 | 0.049 | 0.000 | 204.804 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000039 | 202.514 | 0.036 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.133 | 0.036 | 0.000 | 202.133 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000035 | 202.289 | 0.084 | n/a | 0.000 | 0.000 | 0.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.791 | 0.084 | 0.000 | 201.791 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000031 | 202.132 | 0.045 | n/a | 0.000 | 0.000 | 0.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.747 | 0.045 | 0.000 | 201.747 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000037 | 202.080 | 0.032 | n/a | 0.000 | 0.000 | 0.329 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.719 | 0.032 | 0.000 | 201.719 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000036 | 201.704 | 0.037 | n/a | 0.000 | 0.000 | 0.322 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.345 | 0.037 | 0.000 | 201.345 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000003b | 179.976 | 0.066 | n/a | 0.000 | 0.000 | 0.652 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 179.257 | 0.066 | 0.000 | 179.257 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000038 | 138.018 | 0.063 | n/a | 0.000 | 0.000 | 0.524 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 137.430 | 0.063 | 0.000 | 137.430 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / L1024 / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.107 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.686 | 0.041 | 0.000 | 201.686 |
| p99 | 203.319 | n/a | n/a | n/a | 0.315 | n/a | 0.000 | 0.000 | 0.614 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.811 | 0.315 | 0.003 | 202.811 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f000000000000003e | 203.319 | 0.084 | n/a | 0.000 | 0.000 | 0.424 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.811 | 0.084 | 0.000 | 202.811 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000044 | 203.106 | 0.054 | n/a | 0.000 | 0.000 | 0.614 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.438 | 0.054 | 0.000 | 202.438 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000043 | 202.727 | 0.037 | n/a | 0.000 | 0.000 | 0.338 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.352 | 0.037 | 0.000 | 202.352 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000003c | 202.374 | 0.041 | n/a | 0.000 | 0.000 | 0.335 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.998 | 0.041 | 0.000 | 201.998 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000041 | 202.193 | 0.035 | n/a | 0.000 | 0.000 | 0.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.842 | 0.035 | 0.000 | 201.842 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000003f | 202.107 | 0.048 | n/a | 0.000 | 0.000 | 0.373 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.686 | 0.048 | 0.000 | 201.686 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000003d | 202.020 | 0.039 | n/a | 0.000 | 0.000 | 0.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.645 | 0.039 | 0.000 | 201.645 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000042 | 201.965 | 0.036 | n/a | 0.000 | 0.000 | 0.357 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.573 | 0.036 | 0.000 | 201.573 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000045 | 92.589 | 0.315 | n/a | 0.000 | 0.000 | 0.531 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 91.743 | 0.315 | 0.003 | 91.743 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000040 | 61.124 | 0.078 | n/a | 0.000 | 0.000 | 0.439 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 60.607 | 0.078 | 0.001 | 60.607 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / recovery / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.913 | n/a | n/a | n/a | 0.053 | n/a | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.574 | 0.053 | 0.000 | 201.574 |
| p99 | 204.107 | n/a | n/a | n/a | 0.074 | n/a | 0.000 | 0.000 | 1.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.630 | 0.074 | 0.001 | 203.630 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f000000000000004b | 204.107 | 0.064 | n/a | 0.000 | 0.000 | 0.413 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.630 | 0.064 | 0.000 | 203.630 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000048 | 203.678 | 0.052 | n/a | 0.000 | 0.000 | 1.842 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.785 | 0.052 | 0.000 | 201.785 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000049 | 202.789 | 0.064 | n/a | 0.000 | 0.000 | 0.678 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.047 | 0.064 | 0.000 | 202.047 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000046 | 202.539 | 0.053 | n/a | 0.000 | 0.000 | 0.421 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.065 | 0.053 | 0.000 | 202.065 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000047 | 202.220 | 0.052 | n/a | 0.000 | 0.000 | 0.548 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.620 | 0.052 | 0.000 | 201.620 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000004d | 201.913 | 0.032 | n/a | 0.000 | 0.000 | 0.307 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.574 | 0.032 | 0.000 | 201.574 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000004e | 186.220 | 0.074 | n/a | 0.000 | 0.000 | 0.336 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 185.810 | 0.074 | 0.000 | 185.810 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000004f | 183.843 | 0.074 | n/a | 0.000 | 0.000 | 1.039 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 182.730 | 0.074 | 0.000 | 182.730 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000004c | 161.881 | 0.051 | n/a | 0.000 | 0.000 | 0.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 161.476 | 0.051 | 0.000 | 161.476 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000004a | 101.151 | 0.074 | n/a | 0.000 | 0.000 | 0.426 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 100.652 | 0.074 | 0.001 | 100.652 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / p4mix / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.175 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.832 | 0.041 | 0.000 | 201.832 |
| p99 | 203.976 | n/a | n/a | n/a | 0.080 | n/a | 0.000 | 0.000 | 0.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.393 | 0.080 | 0.001 | 203.393 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000051 | 203.976 | 0.051 | n/a | 0.000 | 0.000 | 0.531 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 203.393 | 0.051 | 0.000 | 203.393 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000005a | 203.249 | 0.032 | n/a | 0.000 | 0.000 | 0.302 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.915 | 0.032 | 0.000 | 202.915 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000053 | 202.604 | 0.038 | n/a | 0.000 | 0.000 | 0.545 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.021 | 0.038 | 0.000 | 202.021 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000057 | 202.572 | 0.036 | n/a | 0.000 | 0.000 | 0.310 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.226 | 0.036 | 0.000 | 202.226 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000056 | 202.244 | 0.040 | n/a | 0.000 | 0.000 | 0.331 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.873 | 0.040 | 0.000 | 201.873 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000052 | 202.175 | 0.036 | n/a | 0.000 | 0.000 | 0.308 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.832 | 0.036 | 0.000 | 201.832 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000058 | 202.084 | 0.050 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.619 | 0.050 | 0.000 | 201.619 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000055 | 201.871 | 0.041 | n/a | 0.000 | 0.000 | 0.342 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.489 | 0.041 | 0.000 | 201.489 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000050 | 201.810 | 0.043 | n/a | 0.000 | 0.000 | 0.459 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.307 | 0.043 | 0.000 | 201.307 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000054 | 110.009 | 0.080 | n/a | 0.000 | 0.000 | 0.636 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 109.293 | 0.080 | 0.001 | 109.293 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000059 | 64.477 | 0.048 | n/a | 0.000 | 0.000 | 0.414 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 64.014 | 0.048 | 0.001 | 64.014 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / p4h1 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.338 | n/a | n/a | n/a | 0.050 | n/a | 0.000 | 0.000 | 0.593 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.964 | 0.050 | 0.000 | 201.964 |
| p99 | 206.625 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 0.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.967 | 0.088 | 0.001 | 205.967 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000066 | 206.625 | 0.065 | n/a | 0.000 | 0.000 | 0.593 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.967 | 0.065 | 0.000 | 205.967 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000062 | 205.721 | 0.050 | n/a | 0.000 | 0.000 | 0.509 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.163 | 0.050 | 0.000 | 205.163 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000065 | 205.609 | 0.067 | n/a | 0.000 | 0.000 | 0.721 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 204.821 | 0.067 | 0.000 | 204.821 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000068 | 203.085 | 0.061 | n/a | 0.000 | 0.000 | 0.643 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.381 | 0.061 | 0.000 | 202.381 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000067 | 203.062 | 0.067 | n/a | 0.000 | 0.000 | 0.655 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.340 | 0.067 | 0.000 | 202.340 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000006e | 202.759 | 0.042 | n/a | 0.000 | 0.000 | 0.434 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.283 | 0.042 | 0.000 | 202.283 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000006a | 202.338 | 0.039 | n/a | 0.000 | 0.000 | 0.334 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.964 | 0.039 | 0.000 | 201.964 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000006b | 202.325 | 0.038 | n/a | 0.000 | 0.000 | 0.602 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.685 | 0.038 | 0.000 | 201.685 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000063 | 202.323 | 0.041 | n/a | 0.000 | 0.000 | 0.662 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.620 | 0.041 | 0.000 | 201.620 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000061 | 202.244 | 0.048 | n/a | 0.000 | 0.000 | 0.500 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.697 | 0.048 | 0.000 | 201.697 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000006c | 202.061 | 0.043 | n/a | 0.000 | 0.000 | 0.410 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.608 | 0.043 | 0.000 | 201.608 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000064 | 180.798 | 0.088 | n/a | 0.000 | 0.000 | 0.609 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 180.100 | 0.088 | 0.000 | 180.100 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000006d | 69.578 | 0.062 | n/a | 0.000 | 0.000 | 0.424 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 69.092 | 0.062 | 0.001 | 69.092 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / grow3 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.093 | n/a | n/a | n/a | 0.063 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.639 | 0.063 | 0.000 | 201.639 |
| p99 | 227.740 | n/a | n/a | n/a | 0.581 | n/a | 0.000 | 0.000 | 0.794 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 226.588 | 0.581 | 0.003 | 226.588 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000074 | 227.740 | 0.581 | n/a | 0.000 | 0.000 | 0.571 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 226.588 | 0.581 | 0.003 | 226.588 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000071 | 202.743 | 0.086 | n/a | 0.000 | 0.000 | 0.794 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.864 | 0.086 | 0.000 | 201.864 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000073 | 202.182 | 0.083 | n/a | 0.000 | 0.000 | 0.415 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.683 | 0.083 | 0.000 | 201.683 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000072 | 202.093 | 0.051 | n/a | 0.000 | 0.000 | 0.403 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.639 | 0.051 | 0.000 | 201.639 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000076 | 202.028 | 0.039 | n/a | 0.000 | 0.000 | 0.378 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.610 | 0.039 | 0.000 | 201.610 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000070 | 94.839 | 0.063 | n/a | 0.000 | 0.000 | 0.550 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 94.225 | 0.063 | 0.001 | 94.225 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / p4h3 / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.719 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.337 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.311 | 0.041 | 0.000 | 201.311 |
| p99 | 216.255 | n/a | n/a | n/a | 0.063 | n/a | 0.000 | 0.000 | 0.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 215.913 | 0.063 | 0.001 | 215.913 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f000000000000008b | 216.255 | 0.032 | n/a | 0.000 | 0.000 | 0.309 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 215.913 | 0.032 | 0.000 | 215.913 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000092 | 202.726 | 0.063 | n/a | 0.000 | 0.000 | 0.640 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.022 | 0.063 | 0.000 | 202.022 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000091 | 202.295 | 0.031 | n/a | 0.000 | 0.000 | 0.275 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.989 | 0.031 | 0.000 | 201.989 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000086 | 202.246 | 0.035 | n/a | 0.000 | 0.000 | 0.332 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.878 | 0.035 | 0.000 | 201.878 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000093 | 201.892 | 0.045 | n/a | 0.000 | 0.000 | 0.599 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.248 | 0.045 | 0.000 | 201.248 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000008e | 201.880 | 0.034 | n/a | 0.000 | 0.000 | 0.354 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.492 | 0.034 | 0.000 | 201.492 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000094 | 201.719 | 0.041 | n/a | 0.000 | 0.000 | 0.337 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.341 | 0.041 | 0.000 | 201.341 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000008c | 201.681 | 0.036 | n/a | 0.000 | 0.000 | 0.334 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.311 | 0.036 | 0.000 | 201.311 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000008f | 201.675 | 0.054 | n/a | 0.000 | 0.000 | 0.316 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.304 | 0.054 | 0.000 | 201.304 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000008a | 125.775 | 0.054 | n/a | 0.000 | 0.000 | 0.478 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 125.243 | 0.054 | 0.000 | 125.243 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000085 | 103.201 | 0.059 | n/a | 0.000 | 0.000 | 0.366 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 102.776 | 0.059 | 0.001 | 102.776 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000008d | 60.439 | 0.054 | n/a | 0.000 | 0.000 | 0.340 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 60.045 | 0.054 | 0.001 | 60.045 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / grow10 / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 119.409 | n/a | n/a | n/a | 0.489 | n/a | 0.000 | 0.000 | 0.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 117.413 | 0.489 | 0.006 | 117.413 |
| p99 | 201.949 | n/a | n/a | n/a | 0.917 | n/a | 0.000 | 0.000 | 3.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.367 | 0.917 | 0.013 | 201.367 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f0000000000000095 | 201.949 | 0.055 | n/a | 0.000 | 0.000 | 0.527 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.367 | 0.055 | 0.000 | 201.367 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000096 | 158.000 | 0.460 | n/a | 0.000 | 0.000 | 0.787 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 156.753 | 0.460 | 0.003 | 156.753 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000099 | 126.243 | 0.783 | n/a | 0.000 | 0.000 | 0.715 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 124.746 | 0.783 | 0.006 | 124.746 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000009a | 121.433 | 0.869 | n/a | 0.000 | 0.000 | 0.683 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 119.881 | 0.869 | 0.007 | 119.881 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000009b | 119.409 | 0.489 | n/a | 0.000 | 0.000 | 1.507 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 117.413 | 0.489 | 0.004 | 117.413 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f0000000000000098 | 96.038 | 0.604 | n/a | 0.000 | 0.000 | 3.116 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 92.318 | 0.604 | 0.006 | 92.318 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000009e | 72.380 | 0.465 | n/a | 0.000 | 0.000 | 0.485 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 71.430 | 0.465 | 0.006 | 71.430 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f000000000000009d | 69.718 | 0.917 | n/a | 0.000 | 0.000 | 0.688 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 68.112 | 0.917 | 0.013 | 68.112 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / p4h10 / read (13 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.908 | n/a | n/a | n/a | 0.052 | n/a | 0.000 | 0.000 | 0.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.419 | 0.052 | 0.000 | 201.419 |
| p99 | 205.913 | n/a | n/a | n/a | 0.075 | n/a | 0.000 | 0.000 | 0.498 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.584 | 0.075 | 0.001 | 205.584 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f00000000000000b8 | 205.913 | 0.038 | n/a | 0.000 | 0.000 | 0.290 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.584 | 0.038 | 0.000 | 205.584 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b1 | 202.274 | 0.043 | n/a | 0.000 | 0.000 | 0.377 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.854 | 0.043 | 0.000 | 201.854 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000ab | 202.237 | 0.075 | n/a | 0.000 | 0.000 | 0.496 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.666 | 0.075 | 0.000 | 201.666 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000ac | 202.214 | 0.054 | n/a | 0.000 | 0.000 | 0.480 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.680 | 0.054 | 0.000 | 201.680 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b3 | 201.946 | 0.052 | n/a | 0.000 | 0.000 | 0.391 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.504 | 0.052 | 0.000 | 201.504 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b6 | 201.939 | 0.037 | n/a | 0.000 | 0.000 | 0.369 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.533 | 0.037 | 0.000 | 201.533 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b2 | 201.908 | 0.057 | n/a | 0.000 | 0.000 | 0.450 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.401 | 0.057 | 0.000 | 201.401 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000ae | 201.873 | 0.049 | n/a | 0.000 | 0.000 | 0.406 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.419 | 0.049 | 0.000 | 201.419 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b5 | 201.546 | 0.033 | n/a | 0.000 | 0.000 | 0.365 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.149 | 0.033 | 0.000 | 201.149 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b0 | 201.518 | 0.027 | n/a | 0.000 | 0.000 | 0.276 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.214 | 0.027 | 0.000 | 201.214 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b7 | 167.847 | 0.052 | n/a | 0.000 | 0.000 | 0.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 167.423 | 0.052 | 0.000 | 167.423 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000aa | 101.878 | 0.074 | n/a | 0.000 | 0.000 | 0.372 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 101.432 | 0.074 | 0.001 | 101.432 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b4 | 100.499 | 0.069 | n/a | 0.000 | 0.000 | 0.498 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 99.933 | 0.069 | 0.001 | 99.933 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / presweep / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.621 | n/a | n/a | n/a | 0.054 | n/a | 0.000 | 0.000 | 0.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.646 | 0.054 | 0.000 | 201.646 |
| p99 | 218.895 | n/a | n/a | n/a | 0.521 | n/a | 0.000 | 0.000 | 1.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 217.758 | 0.521 | 0.002 | 217.758 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 6b7d6b73232ebd9f00000000000000c1 | 218.895 | 0.521 | n/a | 0.000 | 0.000 | 0.615 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 217.758 | 0.521 | 0.002 | 217.758 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000bb | 205.531 | 0.044 | n/a | 0.000 | 0.000 | 0.348 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 205.139 | 0.044 | 0.000 | 205.139 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000c2 | 203.464 | 0.064 | n/a | 0.000 | 0.000 | 0.478 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.923 | 0.064 | 0.000 | 202.923 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000c3 | 202.622 | 0.061 | n/a | 0.000 | 0.000 | 0.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 202.162 | 0.061 | 0.000 | 202.162 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000bf | 202.621 | 0.054 | n/a | 0.000 | 0.000 | 1.080 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.488 | 0.054 | 0.000 | 201.488 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000bd | 202.062 | 0.051 | n/a | 0.000 | 0.000 | 0.364 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.646 | 0.051 | 0.000 | 201.646 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000bc | 201.893 | 0.051 | n/a | 0.000 | 0.000 | 0.428 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.414 | 0.051 | 0.000 | 201.414 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000b9 | 201.784 | 0.037 | n/a | 0.000 | 0.000 | 0.345 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 201.402 | 0.037 | 0.000 | 201.402 | node-14/thread-7/socket.wait-first-byte | none observed |
| 6b7d6b73232ebd9f00000000000000c4 | 139.056 | 0.055 | n/a | 0.000 | 0.000 | 0.399 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 138.602 | 0.055 | 0.000 | 138.602 | node-14/thread-7/socket.wait-first-byte | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux per-thread CPU is sampled from /proc (10 ms ticks); per-request CPU attribution is not available. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Closed-source transactor internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

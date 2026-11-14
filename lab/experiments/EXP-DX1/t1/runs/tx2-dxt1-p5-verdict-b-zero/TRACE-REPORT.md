# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (109.095 ms, trace `f64d870fe8575fb300000000000000f1`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (111.406 ms, trace `f64d870fe8575fb30000000000000162`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (35.911 ms, trace `f64d870fe8575fb300000000000000f4`); `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (51.089 ms, trace `f64d870fe8575fb30000000000000149`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (24.628 ms, trace `f64d870fe8575fb3000000000000010c`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-verdict-b-zero`; source `ae9905029e0331db77303b4637c3fc2f0f3f3379`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 80/80 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 0/0. Raw trace bytes: 775400.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 137 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: node-14-0.jsonl.gz: unexpected end of file; node-14-1.jsonl.gz: unexpected end of file; node-14-2.jsonl.gz: unexpected end of file; node-14-3.jsonl.gz: unexpected end of file; node-14-4.jsonl.gz: unexpected end of file; node-14-5.jsonl.gz: unexpected end of file; system-linux.jsonl.gz: unexpected end of file; Writer file absent: cannot establish complete commit denominator; No final Node histograms: recorder drain not proven; Deferred witness order: Deferred witness drain unproven. Oracle: see ns-report.json; not certified by tracing.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14510.400 | 460.538 | 10.086 | 457 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f64d870fe8575fb300000000000000f1 | driver.queue.scheduler-late | 0.964 | none | 0 / 32 |
| f64d870fe8575fb300000000000000f1 | driver.queue.scheduler-dispatch | 0.215 | none | 0 / 32 |

Observed active steps while trace f64d870fe8575fb300000000000000f1 waited: []

| f64d870fe8575fb30000000000000162 | driver.queue.scheduler-late | 0.917 | none | 0 / 32 |
| f64d870fe8575fb30000000000000162 | driver.queue.scheduler-dispatch | 0.104 | none | 0 / 32 |

Observed active steps while trace f64d870fe8575fb30000000000000162 waited: []

| f64d870fe8575fb300000000000000f4 | driver.queue.scheduler-dispatch | 0.146 | none | 0 / 32 |
| f64d870fe8575fb300000000000000f4 | driver.queue.scheduler-late | 0.026 | none | 0 / 32 |

Observed active steps while trace f64d870fe8575fb300000000000000f4 waited: []

| f64d870fe8575fb30000000000000149 | driver.queue.scheduler-dispatch | 0.135 | none | 0 / 32 |
| f64d870fe8575fb30000000000000149 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace f64d870fe8575fb30000000000000149 waited: []

| f64d870fe8575fb3000000000000010c | driver.queue.scheduler-dispatch | 0.082 | none | 0 / 32 |
| f64d870fe8575fb3000000000000010c | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace f64d870fe8575fb3000000000000010c waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 34.109 | 0.203 | 0.000 | 0.607 | 4.921 | 0.594 | 0.000 | 0.117 | 1.541 | 7.253 | 0.044 | n/a | 0.395 | 15.966 | n/a | n/a | 0.059 | 5.585 | 0.183 | 0.059 |
| p99 | 155.246 | 15.618 | 0.000 | 18.652 | 22.333 | n/a | 20.606 | 1.178 | 2.860 | 20.869 | 0.149 | n/a | 3.532 | 109.095 | n/a | n/a | 0.417 | 33.107 | 0.347 | 0.417 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f64d870fe8575fb300000000000000f1 | 155.246 | 11.323 | n/a | 20.606 | 1.178 | 1.083 | 8.210 | 0.052 | n/a | 3.281 | 109.095 | n/a | n/a | 0.417 | 33.107 | 0.213 | 0.417 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb300000000000000f4 | 83.235 | 22.333 | 0.594 | 0.000 | 0.173 | 2.666 | 18.572 | 0.149 | n/a | 2.706 | 35.911 | n/a | n/a | 0.132 | 23.099 | 0.278 | 0.132 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000010c | 51.430 | 6.405 | 0.225 | 0.000 | 0.083 | 2.570 | 16.536 | 0.085 | n/a | 0.855 | 24.628 | n/a | n/a | 0.042 | 6.713 | 0.131 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000104 | 47.998 | 7.144 | 0.303 | 0.000 | 0.086 | 2.119 | 12.652 | 0.082 | n/a | 0.501 | 25.013 | n/a | n/a | 0.098 | 7.533 | 0.157 | 0.098 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000110 | 45.375 | 9.848 | 0.157 | 0.358 | 0.091 | 2.853 | 9.948 | 0.058 | n/a | 0.517 | 21.482 | n/a | n/a | 0.062 | 10.454 | 0.230 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000012a | 42.308 | 5.885 | 0.330 | 0.790 | 0.117 | 1.904 | 15.481 | 0.037 | n/a | 0.395 | 17.314 | n/a | n/a | 0.055 | 7.121 | 0.168 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000011f | 39.410 | 2.275 | n/a | 0.000 | 0.495 | 0.642 | 6.330 | 0.033 | n/a | 0.109 | 29.476 | n/a | n/a | 0.050 | 2.770 | 0.070 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb300000000000000f8 | 39.293 | 6.862 | 0.253 | 0.000 | 0.069 | 1.929 | 20.869 | 0.093 | n/a | 0.930 | 8.224 | n/a | n/a | 0.063 | 7.185 | 0.183 | 0.063 | gw-w/thread-48/gateway.admitted-work | none observed |
| f64d870fe8575fb300000000000000fa | 38.743 | 6.619 | n/a | 1.476 | 0.645 | 0.802 | 1.972 | 0.021 | n/a | 0.135 | 26.888 | n/a | n/a | 0.184 | 8.740 | 0.226 | 0.184 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb300000000000000fc | 38.272 | 5.544 | 0.305 | 0.000 | 0.069 | 2.287 | 14.512 | 0.040 | n/a | 0.121 | 15.334 | n/a | n/a | 0.059 | 5.918 | 0.155 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000128 | 37.737 | 4.674 | 0.183 | 0.232 | 0.072 | 2.006 | 12.117 | 0.111 | n/a | 0.254 | 18.050 | n/a | n/a | 0.039 | 5.161 | 0.137 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000118 | 36.976 | 5.977 | n/a | 6.167 | 0.245 | 1.290 | 2.924 | 0.042 | n/a | 0.146 | 20.128 | n/a | n/a | 0.056 | 12.389 | 0.335 | 0.056 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000106 | 36.281 | 4.300 | 0.187 | 0.000 | 0.092 | 1.829 | 13.670 | 0.065 | n/a | 0.131 | 15.966 | n/a | n/a | 0.043 | 4.578 | 0.126 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000011a | 35.455 | 4.429 | 0.306 | 0.302 | 0.057 | 1.987 | 12.499 | 0.045 | n/a | 0.125 | 15.660 | n/a | n/a | 0.044 | 5.094 | 0.144 | 0.044 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000100 | 34.109 | 4.921 | 0.251 | 0.000 | 0.070 | 2.860 | 9.542 | 0.048 | n/a | 0.112 | 16.233 | n/a | n/a | 0.072 | 5.242 | 0.154 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000011e | 32.373 | 4.358 | 0.340 | 0.260 | 0.091 | 1.283 | 9.287 | 0.037 | n/a | 0.474 | 16.185 | n/a | n/a | 0.058 | 5.049 | 0.156 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000010a | 30.526 | 3.639 | n/a | 0.000 | 0.503 | 1.938 | 4.103 | 0.030 | n/a | 2.716 | 17.525 | n/a | n/a | 0.071 | 4.143 | 0.136 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000101 | 29.160 | 6.105 | n/a | 3.711 | 0.109 | 0.995 | 1.778 | 0.022 | n/a | 0.095 | 16.258 | n/a | n/a | 0.087 | 9.925 | 0.340 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb300000000000000f6 | 28.473 | 4.821 | n/a | 0.000 | 0.765 | 1.755 | 5.927 | 0.026 | n/a | 0.598 | 14.450 | n/a | n/a | 0.132 | 5.585 | 0.196 | 0.132 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000107 | 28.273 | 7.822 | n/a | 1.746 | 0.237 | 1.541 | 1.896 | 0.022 | n/a | 3.532 | 11.358 | n/a | n/a | 0.119 | 9.806 | 0.347 | 0.119 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.688 | 0.283 | 0.000 | 0.651 | 3.950 | n/a | 0.000 | 0.139 | 1.332 | 5.265 | 0.041 | n/a | 0.207 | 12.789 | n/a | n/a | 0.066 | 4.703 | 0.194 | 0.066 |
| p99 | 118.902 | 4.007 | 0.000 | 4.631 | 12.495 | n/a | 1.839 | 16.022 | 4.951 | 17.604 | 0.146 | n/a | 3.704 | 111.406 | n/a | n/a | 0.190 | 20.011 | 0.630 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f64d870fe8575fb30000000000000162 | 118.902 | 3.899 | n/a | 0.000 | 1.021 | 0.601 | 1.773 | 0.020 | n/a | 0.088 | 111.406 | n/a | n/a | 0.095 | 4.920 | 0.041 | 0.095 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000149 | 82.469 | 10.172 | 0.518 | 0.500 | 0.139 | 2.004 | 17.604 | 0.112 | n/a | 0.257 | 51.089 | n/a | n/a | 0.073 | 11.329 | 0.137 | 0.073 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000137 | 42.058 | 4.043 | 0.183 | 0.000 | 0.071 | 2.109 | 15.118 | 0.046 | n/a | 1.998 | 18.447 | n/a | n/a | 0.043 | 4.297 | 0.102 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000017f | 41.595 | 5.538 | 0.325 | 0.000 | 0.078 | 1.969 | 16.646 | 0.030 | n/a | 0.141 | 16.814 | n/a | n/a | 0.056 | 5.941 | 0.143 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000134 | 41.500 | 3.939 | 0.242 | 0.000 | 0.066 | 4.848 | 16.692 | 0.088 | n/a | 0.093 | 15.487 | n/a | n/a | 0.044 | 4.247 | 0.102 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000014d | 38.501 | 12.495 | n/a | 1.839 | 0.854 | 1.002 | 6.320 | 0.068 | n/a | 3.704 | 12.128 | n/a | n/a | 0.092 | 15.189 | 0.394 | 0.092 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000012e | 37.336 | 4.066 | 0.281 | 0.433 | 0.067 | 1.728 | 14.307 | 0.059 | n/a | 1.581 | 14.769 | n/a | n/a | 0.045 | 4.848 | 0.130 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000175 | 35.069 | 8.310 | n/a | 1.656 | 0.855 | 3.734 | 2.732 | 0.024 | n/a | 0.099 | 17.524 | n/a | n/a | 0.135 | 10.821 | 0.309 | 0.135 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000018f | 34.626 | 5.305 | 0.310 | 0.000 | 0.106 | 2.509 | 13.628 | 0.067 | n/a | 0.139 | 12.490 | n/a | n/a | 0.073 | 5.721 | 0.165 | 0.073 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000012c | 33.821 | 6.483 | 0.185 | 0.000 | 0.066 | 2.194 | 11.260 | 0.084 | n/a | 0.115 | 13.389 | n/a | n/a | 0.044 | 6.735 | 0.199 | 0.044 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000179 | 33.334 | 4.747 | 0.204 | 0.292 | 0.071 | 1.803 | 12.442 | 0.046 | n/a | 0.412 | 13.252 | n/a | n/a | 0.066 | 5.313 | 0.159 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000145 | 33.072 | 3.938 | 0.257 | 0.669 | 0.068 | 1.522 | 12.118 | 0.051 | n/a | 0.204 | 14.202 | n/a | n/a | 0.044 | 4.931 | 0.149 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000183 | 32.151 | 3.676 | 0.250 | 0.000 | 0.066 | 2.057 | 14.889 | 0.055 | n/a | 0.405 | 10.711 | n/a | n/a | 0.041 | 3.992 | 0.124 | 0.041 | gw-w/thread-47/gateway.admitted-work | none observed |
| f64d870fe8575fb30000000000000185 | 31.776 | 3.711 | 0.258 | 0.237 | 0.081 | 1.344 | 11.862 | 0.037 | n/a | 0.143 | 14.059 | n/a | n/a | 0.044 | 4.288 | 0.135 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000176 | 31.740 | 3.989 | n/a | 0.000 | 16.022 | 1.015 | 1.692 | 0.072 | n/a | 0.691 | 8.156 | n/a | n/a | 0.102 | 20.011 | 0.630 | 0.102 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.756ms; driver.publication.persist-deferred 1.207ms |
| f64d870fe8575fb30000000000000169 | 31.429 | 3.804 | 0.244 | 0.264 | 0.125 | 1.066 | 8.653 | 0.035 | n/a | 0.155 | 17.019 | n/a | n/a | 0.062 | 4.438 | 0.141 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000141 | 31.033 | 4.762 | 0.276 | 0.000 | 0.116 | 1.290 | 7.404 | 0.041 | n/a | 0.954 | 16.060 | n/a | n/a | 0.130 | 5.154 | 0.166 | 0.130 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000014a | 30.354 | 5.519 | n/a | 0.000 | 1.349 | 1.758 | 8.023 | 0.053 | n/a | 0.579 | 12.883 | n/a | n/a | 0.190 | 6.869 | 0.226 | 0.190 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb30000000000000143 | 30.233 | 3.381 | n/a | 0.000 | 0.623 | 1.868 | 3.266 | 0.040 | n/a | 0.165 | 20.833 | n/a | n/a | 0.057 | 4.004 | 0.132 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f64d870fe8575fb3000000000000016b | 28.994 | 3.460 | 0.202 | 0.327 | 0.076 | 1.030 | 8.559 | 0.035 | n/a | 0.139 | 15.118 | n/a | n/a | 0.047 | 4.066 | 0.140 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (79 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.284 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.010 | 0.013 | n/a | 0.114 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 |
| p99 | 395.242 | n/a | n/a | n/a | 2.480 | n/a | 0.000 | 0.000 | 4.352 | 389.563 | 6.590 | n/a | 3.675 | 0.000 | n/a | n/a | 0.472 | 2.480 | 0.006 | 0.472 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efefde10be3f60000000000000002 | 395.242 | 2.480 | n/a | 0.000 | 0.000 | 2.666 | 389.563 | 0.109 | n/a | 0.094 | 0.000 | n/a | n/a | 0.330 | 2.480 | 0.006 | 0.330 | gw-r/thread-41/gateway.admitted-work | none observed |
| 4579cf5915ae7769000000000000008f | 208.335 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 207.318 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 4579cf5915ae77690000000000000094 | 208.323 | 0.000 | n/a | 0.000 | 0.000 | 1.460 | 206.002 | 0.053 | n/a | 0.463 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae7769000000000000009b | 206.697 | 0.000 | n/a | 0.000 | 0.000 | 1.569 | 204.760 | 0.028 | n/a | 0.189 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-41/journal/page | none observed |
| 4579cf5915ae77690000000000000063 | 206.275 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 204.867 | 0.017 | n/a | 0.180 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-45/journal/page | none observed |
| 4579cf5915ae776900000000000000b0 | 205.987 | 0.000 | n/a | 0.000 | 0.000 | 4.352 | 201.324 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae77690000000000000064 | 205.937 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 205.034 | 0.020 | n/a | 0.186 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-41/journal/page | none observed |
| 4579cf5915ae77690000000000000085 | 205.898 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 201.424 | 0.040 | n/a | 3.675 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-45/journal/page | none observed |
| 4579cf5915ae77690000000000000086 | 205.736 | 0.000 | n/a | 0.000 | 0.000 | 0.489 | 204.911 | 0.031 | n/a | 0.188 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae776900000000000000af | 205.371 | 0.000 | n/a | 0.000 | 0.000 | 1.116 | 204.004 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae77690000000000000072 | 205.370 | 0.000 | n/a | 0.000 | 0.000 | 1.400 | 203.455 | 0.023 | n/a | 0.288 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae7769000000000000007f | 205.331 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 204.207 | 0.021 | n/a | 0.088 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-43/journal/page | none observed |
| 4579cf5915ae77690000000000000096 | 205.046 | 0.000 | n/a | 0.000 | 0.000 | 2.427 | 202.393 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 4579cf5915ae77690000000000000006 | 204.793 | 0.000 | n/a | 0.000 | 0.000 | 1.094 | 203.306 | 0.018 | n/a | 0.163 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-46/journal/page | none observed |
| 4579cf5915ae77690000000000000088 | 204.674 | 0.000 | n/a | 0.000 | 0.000 | 1.677 | 202.656 | 0.055 | n/a | 0.086 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae7769000000000000006b | 204.147 | 0.000 | n/a | 0.000 | 0.000 | 2.516 | 201.010 | 0.015 | n/a | 0.134 | 0.000 | n/a | n/a | 0.472 | 0.000 | 0.000 | 0.472 | gw-r/thread-47/journal/page | none observed |
| 4579cf5915ae7769000000000000009e | 204.065 | 0.000 | n/a | 0.000 | 0.000 | 2.861 | 200.895 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-43/journal/page | none observed |
| 4579cf5915ae77690000000000000090 | 203.860 | 0.000 | n/a | 0.000 | 0.000 | 2.329 | 201.278 | 0.015 | n/a | 0.133 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 4579cf5915ae77690000000000000077 | 203.766 | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 201.882 | 0.036 | n/a | 0.252 | 0.000 | n/a | n/a | 0.264 | 0.000 | 0.000 | 0.264 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae776900000000000000a9 | 203.657 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 202.303 | 0.120 | n/a | 0.181 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |

## P3 / outside-phases / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 428.656 | n/a | n/a | n/a | 4.510 | n/a | 0.606 | 0.000 | 0.893 | 422.315 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.097 | 4.941 | 0.013 | 0.097 |
| p99 | 1010.454 | n/a | n/a | n/a | 30.365 | n/a | 1.597 | 0.000 | 3.594 | 1005.732 | 0.406 | n/a | 0.579 | 0.000 | n/a | n/a | 48.084 | 30.365 | 0.409 | 48.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efefde10be3f600000000000000a4 | 1010.454 | 0.346 | n/a | 0.000 | 0.000 | 2.537 | 1005.732 | 0.013 | n/a | 0.579 | 0.000 | n/a | n/a | 1.247 | 0.346 | 0.000 | 1.247 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f600000000000000de | 1002.900 | 4.329 | n/a | 0.537 | 0.000 | 0.660 | 997.113 | 0.025 | n/a | 0.104 | 0.000 | n/a | n/a | 0.132 | 4.866 | 0.005 | 0.132 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f600000000000000d2 | 1000.860 | 4.904 | n/a | 0.897 | 0.000 | 1.243 | 993.516 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.188 | 5.801 | 0.006 | 0.188 | gw-r/thread-43/journal/page | none observed |
| c74efefde10be3f600000000000000d8 | 1000.773 | 3.469 | n/a | 0.959 | 0.000 | 0.611 | 995.548 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.094 | 4.428 | 0.004 | 0.094 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f60000000000000113 | 999.751 | 2.874 | n/a | 0.616 | 0.000 | 0.445 | 995.636 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.094 | 3.490 | 0.003 | 0.094 | gw-r/thread-44/journal/page | none observed |
| c74efefde10be3f60000000000000100 | 996.552 | 3.042 | n/a | 0.000 | 0.000 | 0.633 | 992.724 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.086 | 3.042 | 0.003 | 0.086 | gw-r/thread-48/journal/page | none observed |
| c74efefde10be3f600000000000000dd | 995.905 | 6.140 | n/a | 0.797 | 0.000 | 0.590 | 988.240 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.077 | 6.937 | 0.007 | 0.077 | gw-r/thread-41/journal/page | none observed |
| c74efefde10be3f60000000000000104 | 992.211 | 3.112 | n/a | 0.573 | 0.000 | 0.789 | 987.579 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.097 | 3.685 | 0.004 | 0.097 | gw-r/thread-43/journal/page | none observed |
| c74efefde10be3f6000000000000010c | 987.818 | 2.643 | n/a | 0.000 | 0.000 | 2.311 | 982.737 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.068 | 2.643 | 0.003 | 0.068 | gw-r/thread-48/journal/page | none observed |
| c74efefde10be3f600000000000000d9 | 984.823 | 3.540 | n/a | 0.556 | 0.000 | 0.478 | 980.101 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.071 | 4.097 | 0.004 | 0.071 | gw-r/thread-43/journal/page | none observed |
| c74efefde10be3f600000000000000d1 | 981.433 | 6.329 | n/a | 1.148 | 0.000 | 2.545 | 971.164 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.128 | 7.478 | 0.008 | 0.128 | gw-r/thread-46/journal/page | none observed |
| c74efefde10be3f600000000000000e3 | 953.426 | 7.353 | n/a | 0.745 | 0.000 | 3.594 | 941.311 | 0.018 | n/a | 0.073 | 0.000 | n/a | n/a | 0.332 | 8.098 | 0.008 | 0.332 | gw-r/thread-44/journal/page | none observed |
| c74efefde10be3f600000000000000a5 | 916.351 | 30.365 | n/a | 0.000 | 0.000 | 3.534 | 882.033 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.295 | 30.365 | 0.033 | 0.295 | gw-r/thread-41/journal/page | none observed |
| c74efefde10be3f600000000000000fd | 894.196 | 9.698 | n/a | 0.687 | 0.000 | 1.732 | 881.672 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.331 | 10.385 | 0.012 | 0.331 | gw-r/thread-43/journal/page | none observed |
| c74efefde10be3f600000000000000df | 717.970 | 9.074 | n/a | 0.781 | 0.000 | 0.991 | 706.887 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.141 | 9.855 | 0.014 | 0.141 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f60000000000000110 | 711.969 | 2.544 | n/a | 0.625 | 0.000 | 0.753 | 707.877 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.118 | 3.170 | 0.004 | 0.118 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f60000000000000101 | 689.435 | 2.670 | n/a | 0.587 | 0.000 | 0.402 | 685.579 | 0.015 | n/a | 0.098 | 0.000 | n/a | n/a | 0.083 | 3.258 | 0.005 | 0.083 | gw-r/thread-41/journal/page | none observed |
| c74efefde10be3f600000000000000e6 | 595.676 | 14.948 | n/a | 1.597 | 0.000 | 3.332 | 575.561 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.154 | 16.546 | 0.028 | 0.154 | gw-r/thread-44/journal/page | none observed |
| c74efefde10be3f6000000000000010d | 590.711 | 4.368 | n/a | 0.606 | 0.000 | 1.031 | 584.555 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.121 | 4.974 | 0.008 | 0.121 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f600000000000000dc | 590.477 | 4.510 | n/a | 0.668 | 0.000 | 1.634 | 583.497 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.081 | 5.178 | 0.009 | 0.081 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 442.411 | n/a | n/a | n/a | 2.911 | n/a | 0.000 | 0.000 | 0.770 | 438.317 | 0.015 | n/a | 0.086 | 0.000 | n/a | n/a | 0.094 | 2.911 | 0.008 | 0.094 |
| p99 | 1021.012 | n/a | n/a | n/a | 12.904 | n/a | 0.959 | 0.000 | 11.371 | 1000.728 | 0.054 | n/a | 0.190 | 0.000 | n/a | n/a | 39.887 | 13.863 | 0.290 | 39.887 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c74efefde10be3f600000000000000d0 | 1021.012 | 12.904 | n/a | 0.959 | 0.000 | 11.371 | 995.548 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.151 | 13.863 | 0.014 | 0.151 | gw-r/thread-48/journal/page | none observed |
| c74efefde10be3f600000000000000bb | 1002.630 | 0.147 | n/a | 0.000 | 0.000 | 0.565 | 1000.728 | 0.015 | n/a | 0.112 | 0.000 | n/a | n/a | 1.064 | 0.147 | 0.000 | 1.064 | gw-r/thread-41/journal/page | none observed |
| c74efefde10be3f600000000000000b4 | 992.835 | 3.581 | n/a | 0.000 | 0.000 | 2.633 | 986.415 | 0.017 | n/a | 0.096 | 0.000 | n/a | n/a | 0.094 | 3.581 | 0.004 | 0.094 | gw-r/thread-44/journal/page | none observed |
| c74efefde10be3f600000000000000ba | 974.576 | 5.818 | n/a | 0.000 | 0.000 | 2.590 | 965.850 | 0.015 | n/a | 0.115 | 0.000 | n/a | n/a | 0.188 | 5.818 | 0.006 | 0.188 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f600000000000000ae | 913.709 | 1.672 | n/a | 0.000 | 0.000 | 0.397 | 911.401 | 0.023 | n/a | 0.137 | 0.000 | n/a | n/a | 0.079 | 1.672 | 0.002 | 0.079 | gw-r/thread-48/journal/page | none observed |
| c74efefde10be3f600000000000000b2 | 783.010 | 3.142 | n/a | 0.000 | 0.000 | 1.507 | 778.168 | 0.015 | n/a | 0.097 | 0.000 | n/a | n/a | 0.081 | 3.142 | 0.004 | 0.081 | gw-r/thread-48/journal/page | none observed |
| c74efefde10be3f600000000000000ab | 745.983 | 2.740 | n/a | 0.000 | 0.000 | 1.552 | 741.476 | 0.014 | n/a | 0.104 | 0.000 | n/a | n/a | 0.097 | 2.740 | 0.004 | 0.097 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f600000000000000c9 | 697.262 | 2.314 | n/a | 0.000 | 0.000 | 0.552 | 694.238 | 0.011 | n/a | 0.064 | 0.000 | n/a | n/a | 0.083 | 2.314 | 0.003 | 0.083 | gw-r/thread-41/journal/page | none observed |
| c74efefde10be3f600000000000000a8 | 694.474 | 4.210 | n/a | 0.000 | 0.000 | 0.950 | 689.027 | 0.022 | n/a | 0.085 | 0.000 | n/a | n/a | 0.181 | 4.210 | 0.006 | 0.181 | gw-r/thread-48/journal/page | none observed |
| c74efefde10be3f600000000000000c2 | 686.282 | 5.956 | n/a | 0.000 | 0.000 | 1.034 | 679.084 | 0.016 | n/a | 0.071 | 0.000 | n/a | n/a | 0.121 | 5.956 | 0.009 | 0.121 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f600000000000000c1 | 683.415 | 2.343 | n/a | 0.000 | 0.000 | 0.531 | 680.422 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.078 | 2.343 | 0.003 | 0.078 | gw-r/thread-47/journal/page | none observed |
| c74efefde10be3f600000000000000c6 | 675.942 | 2.301 | n/a | 0.000 | 0.000 | 0.623 | 672.878 | 0.013 | n/a | 0.058 | 0.000 | n/a | n/a | 0.070 | 2.301 | 0.003 | 0.070 | gw-r/thread-46/journal/page | none observed |
| c74efefde10be3f600000000000000cb | 555.585 | 2.114 | n/a | 0.000 | 0.000 | 0.703 | 552.568 | 0.044 | n/a | 0.086 | 0.000 | n/a | n/a | 0.070 | 2.114 | 0.004 | 0.070 | gw-r/thread-43/journal/page | none observed |
| c74efefde10be3f600000000000000b9 | 446.146 | 6.254 | n/a | 0.000 | 0.000 | 1.025 | 438.464 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.291 | 6.254 | 0.014 | 0.291 | gw-r/thread-44/journal/page | none observed |
| c74efefde10be3f600000000000000b7 | 442.411 | 2.736 | n/a | 0.000 | 0.000 | 1.197 | 438.317 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.078 | 2.736 | 0.006 | 0.078 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f600000000000000a6 | 407.357 | 4.603 | n/a | 0.000 | 0.000 | 1.162 | 401.156 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.358 | 4.603 | 0.011 | 0.358 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f600000000000000c5 | 321.221 | 2.255 | n/a | 0.000 | 0.000 | 0.627 | 318.150 | 0.011 | n/a | 0.097 | 0.000 | n/a | n/a | 0.081 | 2.255 | 0.007 | 0.081 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f600000000000000c3 | 319.392 | 2.911 | n/a | 0.000 | 0.000 | 1.064 | 315.231 | 0.021 | n/a | 0.088 | 0.000 | n/a | n/a | 0.078 | 2.911 | 0.009 | 0.078 | gw-r/thread-41/journal/page | none observed |
| c74efefde10be3f600000000000000c8 | 298.558 | 2.403 | n/a | 0.000 | 0.000 | 0.457 | 295.550 | 0.014 | n/a | 0.061 | 0.000 | n/a | n/a | 0.074 | 2.403 | 0.008 | 0.074 | gw-r/thread-45/journal/page | none observed |
| c74efefde10be3f600000000000000cd | 279.883 | 1.894 | n/a | 0.000 | 0.000 | 1.214 | 276.457 | 0.054 | n/a | 0.190 | 0.000 | n/a | n/a | 0.073 | 1.894 | 0.007 | 0.073 | gw-r/thread-41/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.802 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.158 | 0.017 | n/a | 0.150 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 216.686 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 11.963 | 206.769 | 3.937 | n/a | 0.741 | 0.000 | n/a | n/a | 0.908 | 0.000 | 0.000 | 0.908 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 4579cf5915ae7769000000000000000d | 216.686 | 0.000 | n/a | 0.000 | 0.000 | 11.963 | 204.398 | 0.017 | n/a | 0.131 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-41/journal/page | none observed |
| 4579cf5915ae77690000000000000030 | 208.492 | 0.000 | n/a | 0.000 | 0.000 | 1.401 | 206.769 | 0.034 | n/a | 0.174 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-41/journal/page | none observed |
| 4579cf5915ae7769000000000000002b | 207.341 | 0.000 | n/a | 0.000 | 0.000 | 0.978 | 205.914 | 0.017 | n/a | 0.258 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-47/journal/page | none observed |
| 4579cf5915ae7769000000000000001b | 206.227 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 204.917 | 0.023 | n/a | 0.165 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 4579cf5915ae7769000000000000002e | 205.126 | 0.000 | n/a | 0.000 | 0.000 | 3.664 | 201.158 | 0.016 | n/a | 0.177 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-43/journal/page | none observed |
| 4579cf5915ae7769000000000000001a | 205.089 | 0.000 | n/a | 0.000 | 0.000 | 1.046 | 203.506 | 0.033 | n/a | 0.343 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-46/journal/page | none observed |
| 4579cf5915ae77690000000000000009 | 204.992 | 0.000 | n/a | 0.000 | 0.000 | 2.572 | 201.349 | 0.022 | n/a | 0.141 | 0.000 | n/a | n/a | 0.908 | 0.000 | 0.000 | 0.908 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae7769000000000000004b | 204.692 | 0.000 | n/a | 0.000 | 0.000 | 3.303 | 201.016 | 0.044 | n/a | 0.094 | 0.000 | n/a | n/a | 0.235 | 0.000 | 0.000 | 0.235 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae77690000000000000033 | 204.658 | 0.000 | n/a | 0.000 | 0.000 | 3.095 | 201.225 | 0.041 | n/a | 0.199 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-43/journal/page | none observed |
| 4579cf5915ae7769000000000000001f | 204.582 | 0.000 | n/a | 0.000 | 0.000 | 3.117 | 201.156 | 0.023 | n/a | 0.137 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae77690000000000000008 | 204.578 | 0.000 | n/a | 0.000 | 0.000 | 2.093 | 202.028 | 0.027 | n/a | 0.256 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 4579cf5915ae7769000000000000004a | 204.543 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.185 | 2.328 | n/a | 0.112 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 4579cf5915ae77690000000000000022 | 204.521 | 0.000 | n/a | 0.000 | 0.000 | 1.176 | 202.754 | 0.051 | n/a | 0.320 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-46/journal/page | none observed |
| 4579cf5915ae7769000000000000003e | 204.290 | 0.000 | n/a | 0.000 | 0.000 | 0.773 | 203.199 | 0.015 | n/a | 0.162 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae77690000000000000026 | 204.261 | 0.000 | n/a | 0.000 | 0.000 | 1.110 | 202.668 | 0.046 | n/a | 0.249 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 4579cf5915ae7769000000000000000e | 204.060 | 0.000 | n/a | 0.000 | 0.000 | 1.867 | 201.692 | 0.018 | n/a | 0.212 | 0.000 | n/a | n/a | 0.271 | 0.000 | 0.000 | 0.271 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae77690000000000000023 | 203.824 | 0.000 | n/a | 0.000 | 0.000 | 1.371 | 202.101 | 0.019 | n/a | 0.172 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-41/journal/page | none observed |
| 4579cf5915ae77690000000000000056 | 203.716 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 201.966 | 0.063 | n/a | 0.233 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-44/journal/page | none observed |
| 4579cf5915ae77690000000000000025 | 203.620 | 0.000 | n/a | 0.000 | 0.000 | 2.338 | 200.913 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-45/journal/page | none observed |
| 4579cf5915ae77690000000000000017 | 203.610 | 0.000 | n/a | 0.000 | 0.000 | 2.269 | 201.055 | 0.017 | n/a | 0.150 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

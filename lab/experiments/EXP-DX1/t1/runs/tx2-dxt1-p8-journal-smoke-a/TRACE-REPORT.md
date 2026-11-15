# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-43/peer.transact-await (includes order/network/storage)` (214.737 ms, trace `3154233619126b06000000000000008a`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (139.195 ms, trace `3154233619126b060000000000000084`); `gw-w/thread-40/peer.transact-await (includes order/network/storage)` (100.351 ms, trace `3154233619126b06000000000000012b`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (91.829 ms, trace `3154233619126b0600000000000000db`); `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (84.990 ms, trace `3154233619126b060000000000001b16`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p8-journal-smoke-a`; source `15ed651621cd68e09be33a0dc42eb5b2329fa74f`; subjects 1000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3711/3711 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8671517.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 205 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 13381.458 | 1404.805 | 25.995 | 448 |
| L1 | 1 | 19979.730 | 1069.861 | 21.011 | 666 |
| L4 | 4 | 19960.507 | 2050.370 | 41.585 | 626 |
| L16 | 16 | 19972.965 | 1631.394 | 35.377 | 686 |
| tail | 0 | 124630.139 | 12328.303 | 144.754 | 71347 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 3154233619126b06000000000000008a | driver.queue.scheduler-late | 1.046 | none | 0 / 32 |
| 3154233619126b06000000000000008a | driver.queue.scheduler-dispatch | 0.039 | none | 0 / 32 |

Observed active steps while trace 3154233619126b06000000000000008a waited: []

| 3154233619126b060000000000000084 | driver.queue.scheduler-dispatch | 0.060 | none | 0 / 32 |
| 3154233619126b060000000000000084 | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace 3154233619126b060000000000000084 waited: []

| 3154233619126b06000000000000012b | driver.queue.scheduler-late | 0.959 | none | 0 / 32 |
| 3154233619126b06000000000000012b | driver.queue.scheduler-dispatch | 0.052 | none | 0 / 32 |

Observed active steps while trace 3154233619126b06000000000000012b waited: []

| 3154233619126b0600000000000000db | driver.queue.scheduler-dispatch | 0.096 | none | 0 / 32 |
| 3154233619126b0600000000000000db | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 3154233619126b0600000000000000db waited: []

| 3154233619126b060000000000001b16 | driver.queue.scheduler-late | 1.257 | none | 3 / 32 |
| 3154233619126b060000000000001b16 | driver.queue.scheduler-dispatch | 0.007 | none | 3 / 32 |

Observed active steps while trace 3154233619126b060000000000001b16 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.500 | 0.000 | 0.000 | 0.340 | 4.161 | 4.017 | 0.000 | 0.104 | 1.926 | 3.433 | 0.027 | n/a | 0.506 | 10.080 | n/a | n/a | 0.025 | 4.620 | 0.201 | 0.025 |
| p99 | 63.337 | 1.756 | 0.000 | 1.528 | 20.990 | n/a | 0.397 | 1.094 | 11.777 | 12.529 | 0.242 | n/a | 3.492 | 25.947 | n/a | n/a | 0.138 | 21.436 | 0.447 | 0.138 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b06000000000000003a | 63.337 | 20.990 | 0.368 | 0.000 | 0.078 | 11.777 | 11.459 | 0.242 | n/a | 0.740 | 17.656 | n/a | n/a | 0.027 | 21.436 | 0.338 | 0.027 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| 3154233619126b060000000000000037 | 47.058 | 6.394 | n/a | 0.000 | 1.094 | 0.799 | 12.529 | 0.027 | n/a | 0.131 | 25.947 | n/a | n/a | 0.138 | 7.488 | 0.159 | 0.138 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000068 | 33.625 | 14.539 | 0.165 | 0.252 | 0.061 | 3.793 | 3.938 | 0.043 | n/a | 0.731 | 10.080 | n/a | n/a | 0.023 | 15.017 | 0.447 | 0.023 | node-14/thread-8/client.persist-and-resolve | driver.reader-basis.broadcast 0.041ms |
| 3154233619126b06000000000000004d | 32.667 | 6.807 | n/a | 0.000 | 0.170 | 2.125 | 1.859 | 0.022 | n/a | 3.492 | 18.169 | n/a | n/a | 0.022 | 6.978 | 0.214 | 0.022 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms |
| 3154233619126b06000000000000003e | 32.604 | 5.216 | 0.202 | 0.000 | 0.065 | 4.917 | 6.129 | 0.040 | n/a | 0.192 | 15.809 | n/a | n/a | 0.035 | 5.483 | 0.168 | 0.035 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| 3154233619126b06000000000000005e | 30.401 | 5.314 | n/a | 0.000 | 0.461 | 3.260 | 2.644 | 0.022 | n/a | 0.506 | 18.173 | n/a | n/a | 0.021 | 5.775 | 0.190 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000054 | 29.949 | 6.771 | 0.249 | 0.000 | 0.058 | 6.140 | 2.679 | 0.040 | n/a | 0.149 | 13.840 | n/a | n/a | 0.021 | 7.079 | 0.236 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 3154233619126b060000000000000064 | 29.302 | 6.404 | 4.017 | 0.397 | 0.061 | 3.645 | 2.692 | 0.037 | n/a | 0.519 | 11.508 | n/a | n/a | 0.022 | 10.879 | 0.371 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 3154233619126b060000000000000060 | 28.856 | 4.161 | 0.149 | 0.338 | 0.065 | 1.889 | 6.849 | 0.069 | n/a | 0.227 | 15.085 | n/a | n/a | 0.024 | 4.713 | 0.163 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 3154233619126b060000000000000056 | 28.663 | 5.547 | 0.131 | 0.319 | 0.053 | 2.076 | 4.461 | 0.036 | n/a | 0.123 | 15.896 | n/a | n/a | 0.020 | 6.051 | 0.211 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.080ms |
| 3154233619126b060000000000000042 | 26.400 | 7.383 | 0.322 | 0.000 | 0.070 | 3.241 | 3.771 | 0.034 | n/a | 1.042 | 10.512 | n/a | n/a | 0.026 | 7.774 | 0.294 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 3154233619126b06000000000000006d | 25.721 | 3.684 | 0.191 | 0.000 | 0.031 | 6.210 | 2.845 | 0.051 | n/a | 0.689 | 12.003 | n/a | n/a | 0.017 | 3.906 | 0.152 | 0.017 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.345ms; driver.reader-basis.broadcast 0.096ms |
| 3154233619126b06000000000000004a | 23.483 | 3.928 | 0.151 | 0.000 | 0.072 | 2.202 | 6.818 | 0.062 | n/a | 3.308 | 6.912 | n/a | n/a | 0.029 | 4.151 | 0.177 | 0.029 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.039ms |
| 3154233619126b060000000000000044 | 22.991 | 4.339 | 0.207 | 0.000 | 0.074 | 1.926 | 3.433 | 0.033 | n/a | 0.171 | 12.774 | n/a | n/a | 0.034 | 4.620 | 0.201 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.042ms |
| 3154233619126b060000000000000050 | 22.500 | 2.167 | n/a | 0.000 | 0.932 | 1.169 | 2.262 | 0.024 | n/a | 2.518 | 13.410 | n/a | n/a | 0.017 | 3.100 | 0.138 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000005c | 22.245 | 4.415 | 0.248 | 0.294 | 0.063 | 5.419 | 4.064 | 0.104 | n/a | 0.271 | 7.345 | n/a | n/a | 0.022 | 5.020 | 0.226 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| 3154233619126b06000000000000004c | 21.960 | 5.059 | 0.155 | 0.000 | 0.067 | 1.724 | 5.635 | 0.033 | n/a | 0.156 | 9.102 | n/a | n/a | 0.028 | 5.281 | 0.240 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 3154233619126b060000000000000057 | 18.156 | 1.897 | n/a | 0.000 | 0.801 | 0.953 | 5.161 | 0.026 | n/a | 1.120 | 8.176 | n/a | n/a | 0.022 | 2.698 | 0.149 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000040 | 17.959 | 2.371 | n/a | 0.000 | 0.244 | 0.880 | 3.863 | 0.025 | n/a | 0.576 | 9.969 | n/a | n/a | 0.031 | 2.615 | 0.146 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000059 | 17.808 | 4.043 | n/a | 0.000 | 0.445 | 4.143 | 1.362 | 0.022 | n/a | 0.549 | 7.219 | n/a | n/a | 0.025 | 4.488 | 0.252 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.859 | 0.000 | 0.000 | 0.438 | 2.270 | n/a | 0.000 | 0.476 | 1.138 | 3.387 | 0.022 | n/a | 0.540 | 7.219 | n/a | n/a | 0.025 | 2.742 | 0.180 | 0.025 |
| p99 | 18.156 | 1.081 | 0.000 | 0.878 | 4.043 | n/a | 0.000 | 1.058 | 4.143 | 5.317 | 0.026 | n/a | 1.120 | 10.190 | n/a | n/a | 0.041 | 4.488 | 0.268 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b060000000000000057 | 18.156 | 1.897 | n/a | 0.000 | 0.801 | 0.953 | 5.161 | 0.026 | n/a | 1.120 | 8.176 | n/a | n/a | 0.022 | 2.698 | 0.149 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000040 | 17.959 | 2.371 | n/a | 0.000 | 0.244 | 0.880 | 3.863 | 0.025 | n/a | 0.576 | 9.969 | n/a | n/a | 0.031 | 2.615 | 0.146 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000059 | 17.808 | 4.043 | n/a | 0.000 | 0.445 | 4.143 | 1.362 | 0.022 | n/a | 0.549 | 7.219 | n/a | n/a | 0.025 | 4.488 | 0.252 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000065 | 17.253 | 1.982 | n/a | 0.000 | 0.471 | 2.348 | 5.317 | 0.024 | n/a | 0.146 | 6.942 | n/a | n/a | 0.023 | 2.453 | 0.142 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000003c | 16.859 | 2.270 | n/a | 0.000 | 0.611 | 0.898 | 3.387 | 0.025 | n/a | 0.154 | 9.487 | n/a | n/a | 0.026 | 2.881 | 0.171 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| 3154233619126b06000000000000006c | 15.908 | 2.724 | n/a | 0.000 | 0.246 | 1.181 | 1.350 | 0.021 | n/a | 0.170 | 10.190 | n/a | n/a | 0.025 | 2.970 | 0.187 | 0.025 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000045 | 15.198 | 1.684 | n/a | 0.000 | 1.058 | 1.031 | 4.122 | 0.020 | n/a | 0.387 | 6.867 | n/a | n/a | 0.029 | 2.742 | 0.180 | 0.029 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.048ms |
| 3154233619126b060000000000000061 | 15.074 | 3.162 | n/a | 0.000 | 0.883 | 1.283 | 2.582 | 0.022 | n/a | 0.540 | 6.561 | n/a | n/a | 0.041 | 4.045 | 0.268 | 0.041 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.065ms |
| 3154233619126b06000000000000006a | 12.266 | 2.012 | n/a | 0.000 | 0.476 | 1.138 | 1.360 | 0.021 | n/a | 0.670 | 6.570 | n/a | n/a | 0.019 | 2.488 | 0.203 | 0.019 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.023 | 0.000 | 0.000 | 0.568 | 3.797 | 0.213 | 0.000 | 0.054 | 1.664 | 5.794 | 0.032 | n/a | 2.052 | 8.397 | n/a | n/a | 0.021 | 4.064 | 0.185 | 0.021 |
| p99 | 22.023 | 0.000 | 0.000 | 0.568 | 3.797 | 0.213 | 0.000 | 0.054 | 1.664 | 5.794 | 0.032 | n/a | 2.052 | 8.397 | n/a | n/a | 0.021 | 4.064 | 0.185 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b060000000000000070 | 22.023 | 3.797 | 0.213 | 0.000 | 0.054 | 1.664 | 5.794 | 0.032 | n/a | 2.052 | 8.397 | n/a | n/a | 0.021 | 4.064 | 0.185 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.256 | 0.000 | 0.000 | 0.345 | 3.746 | n/a | 0.000 | 0.135 | 1.269 | 4.903 | 0.037 | n/a | 0.489 | 14.558 | n/a | n/a | 0.024 | 4.460 | 0.167 | 0.024 |
| p99 | 221.273 | 1.357 | 0.029 | 1.051 | 12.570 | n/a | 0.623 | 11.038 | 4.106 | 27.645 | 3.428 | n/a | 3.584 | 214.737 | n/a | n/a | 0.054 | 13.104 | 0.421 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b06000000000000008a | 221.273 | 2.665 | n/a | 0.000 | 1.085 | 0.645 | 1.944 | 0.024 | n/a | 0.154 | 214.737 | n/a | n/a | 0.020 | 3.750 | 0.017 | 0.020 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.066ms; driver.reader-basis.broadcast 0.063ms |
| 3154233619126b060000000000000084 | 174.356 | 5.110 | 0.177 | 0.000 | 0.061 | 1.899 | 27.645 | 0.074 | n/a | 0.171 | 139.195 | n/a | n/a | 0.023 | 5.348 | 0.031 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.084ms; driver.reader-basis.broadcast 0.057ms |
| 3154233619126b06000000000000008b | 98.418 | 12.570 | 0.222 | 0.000 | 0.058 | 1.669 | 14.601 | 0.059 | n/a | 0.120 | 69.098 | n/a | n/a | 0.021 | 12.850 | 0.131 | 0.021 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 6.289ms; driver.reader-basis.broadcast 0.063ms |
| 3154233619126b0600000000000000ba | 66.111 | 8.129 | 0.199 | 0.000 | 0.098 | 1.531 | 15.307 | 0.045 | n/a | 0.870 | 39.894 | n/a | n/a | 0.037 | 8.426 | 0.127 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.058ms |
| 3154233619126b060000000000000095 | 52.020 | 4.661 | 0.267 | 0.000 | 0.061 | 4.106 | 15.670 | 0.057 | n/a | 0.208 | 26.966 | n/a | n/a | 0.024 | 4.989 | 0.096 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.059ms |
| 3154233619126b0600000000000000a9 | 48.395 | 4.925 | 0.128 | 0.000 | 0.018 | 3.948 | 21.477 | 0.059 | n/a | 0.127 | 17.702 | n/a | n/a | 0.010 | 5.072 | 0.105 | 0.010 | gw-w/thread-42/gateway.admitted-work | driver.publication.persist-deferred 1.036ms; driver.reader-basis.broadcast 0.058ms |
| 3154233619126b060000000000000086 | 46.852 | 3.583 | 0.132 | 0.000 | 0.054 | 1.269 | 13.346 | 0.043 | n/a | 0.151 | 28.251 | n/a | n/a | 0.023 | 3.769 | 0.080 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| 3154233619126b060000000000000090 | 40.345 | 8.798 | 0.122 | 0.259 | 0.053 | 1.249 | 9.582 | 0.034 | n/a | 0.343 | 19.885 | n/a | n/a | 0.020 | 9.232 | 0.229 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 3154233619126b0600000000000000c6 | 39.213 | 9.022 | 0.207 | 0.000 | 0.097 | 1.665 | 9.834 | 0.089 | n/a | 0.460 | 17.801 | n/a | n/a | 0.037 | 9.327 | 0.238 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |
| 3154233619126b0600000000000000b4 | 38.505 | 4.647 | 0.127 | 0.623 | 0.061 | 1.595 | 18.863 | 0.076 | n/a | 0.180 | 12.310 | n/a | n/a | 0.023 | 5.458 | 0.142 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 3154233619126b060000000000000088 | 37.474 | 5.955 | 0.172 | 0.251 | 0.053 | 1.007 | 5.149 | 0.023 | n/a | 1.865 | 22.975 | n/a | n/a | 0.023 | 6.432 | 0.172 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 3154233619126b0600000000000000a6 | 34.375 | 3.016 | n/a | 0.000 | 1.290 | 1.118 | 5.218 | 3.428 | n/a | 0.170 | 20.101 | n/a | n/a | 0.034 | 4.306 | 0.125 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000091 | 33.881 | 2.367 | n/a | 0.000 | 0.169 | 0.687 | 2.677 | 0.022 | n/a | 0.140 | 27.794 | n/a | n/a | 0.024 | 2.536 | 0.075 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000b0 | 33.179 | 3.226 | 0.200 | 0.000 | 0.135 | 1.219 | 10.760 | 0.048 | n/a | 0.100 | 17.447 | n/a | n/a | 0.045 | 3.561 | 0.107 | 0.045 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.078ms |
| 3154233619126b0600000000000000bf | 31.145 | 2.066 | n/a | 0.000 | 11.038 | 0.767 | 1.499 | 0.037 | n/a | 3.124 | 12.593 | n/a | n/a | 0.020 | 13.104 | 0.421 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.067ms |
| 3154233619126b0600000000000000be | 30.097 | 7.844 | n/a | 0.000 | 0.753 | 0.879 | 2.543 | 0.101 | n/a | 0.719 | 17.209 | n/a | n/a | 0.048 | 8.597 | 0.286 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000b8 | 29.924 | 3.841 | 0.239 | 0.000 | 0.059 | 1.528 | 13.319 | 0.031 | n/a | 0.941 | 9.939 | n/a | n/a | 0.026 | 4.140 | 0.138 | 0.026 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.060ms |
| 3154233619126b0600000000000000ab | 29.728 | 3.728 | n/a | 0.000 | 0.947 | 0.992 | 5.599 | 0.076 | n/a | 3.584 | 14.778 | n/a | n/a | 0.023 | 4.675 | 0.157 | 0.023 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000007b | 28.412 | 3.982 | 0.164 | 0.337 | 0.056 | 1.772 | 3.508 | 0.072 | n/a | 1.760 | 16.737 | n/a | n/a | 0.024 | 4.539 | 0.160 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 3154233619126b060000000000000096 | 27.702 | 4.166 | n/a | 0.000 | 0.578 | 0.758 | 3.738 | 0.023 | n/a | 0.781 | 17.645 | n/a | n/a | 0.015 | 4.743 | 0.171 | 0.015 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.695 | 0.000 | 0.000 | 0.365 | 2.066 | n/a | 0.000 | 0.567 | 0.767 | 1.635 | 0.023 | n/a | 0.710 | 10.431 | n/a | n/a | 0.021 | 2.527 | 0.138 | 0.021 |
| p99 | 31.145 | 1.146 | 0.029 | 0.605 | 4.943 | n/a | 0.000 | 11.038 | 2.963 | 5.820 | 0.085 | n/a | 3.124 | 15.774 | n/a | n/a | 0.026 | 13.104 | 0.421 | 0.026 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b0600000000000000bf | 31.145 | 2.066 | n/a | 0.000 | 11.038 | 0.767 | 1.499 | 0.037 | n/a | 3.124 | 12.593 | n/a | n/a | 0.020 | 13.104 | 0.421 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.067ms |
| 3154233619126b060000000000000079 | 25.249 | 2.126 | n/a | 0.000 | 0.567 | 1.310 | 5.276 | 0.023 | n/a | 0.148 | 15.774 | n/a | n/a | 0.024 | 2.693 | 0.107 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000007c | 22.257 | 4.943 | n/a | 0.000 | 0.365 | 2.963 | 5.820 | 0.085 | n/a | 1.978 | 6.079 | n/a | n/a | 0.023 | 5.309 | 0.239 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000008d | 21.666 | 2.355 | n/a | 0.000 | 0.172 | 1.364 | 2.731 | 0.065 | n/a | 1.084 | 13.869 | n/a | n/a | 0.026 | 2.527 | 0.117 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000b6 | 17.695 | 2.552 | n/a | 0.000 | 0.760 | 0.756 | 4.612 | 0.021 | n/a | 0.363 | 8.611 | n/a | n/a | 0.020 | 3.312 | 0.187 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000099 | 15.668 | 1.850 | n/a | 0.000 | 0.310 | 0.684 | 1.283 | 0.021 | n/a | 0.710 | 10.789 | n/a | n/a | 0.021 | 2.160 | 0.138 | 0.021 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000a8 | 14.776 | 1.396 | n/a | 0.000 | 0.600 | 0.584 | 1.074 | 0.025 | n/a | 0.649 | 10.431 | n/a | n/a | 0.018 | 1.996 | 0.135 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000a4 | 12.120 | 1.623 | n/a | 0.000 | 0.733 | 0.811 | 1.635 | 0.023 | n/a | 0.896 | 6.376 | n/a | n/a | 0.023 | 2.356 | 0.194 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.498 | n/a | n/a | n/a | 44.337 | 11.756 | 3.292 | 0.000 | 0.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.307 | 64.586 | 0.743 | 30.307 |
| p99 | 365.584 | n/a | n/a | n/a | 102.413 | 242.166 | 16.976 | 0.000 | 76.020 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 175.716 | 293.637 | 1.000 | 175.716 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b060000000000001cc4 | 374.163 | 99.809 | 56.642 | 8.574 | 0.000 | 0.606 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 208.532 | 165.025 | 0.441 | 208.532 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.335ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.167ms |
| 3154233619126b060000000000001787 | 365.584 | 50.123 | 244.885 | 4.407 | 0.000 | 2.673 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.495 | 299.415 | 0.819 | 63.495 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.979ms; driver.publication.persist-deferred 1.948ms; driver.publication.persist-deferred 1.583ms |
| 3154233619126b060000000000001cdb | 361.652 | 52.010 | 229.208 | 3.226 | 0.000 | 0.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 76.852 | 284.445 | 0.787 | 76.852 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.513ms; driver.publication.persist-deferred 1.232ms |
| 3154233619126b06000000000000178b | 356.602 | 39.521 | 242.166 | 3.586 | 0.000 | 0.498 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 70.831 | 285.273 | 0.800 | 70.831 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.979ms; driver.publication.persist-deferred 1.948ms; driver.publication.persist-deferred 1.583ms |
| 3154233619126b060000000000001cc7 | 350.666 | 168.348 | 52.910 | 33.353 | 0.000 | 0.498 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 95.557 | 254.612 | 0.726 | 95.557 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.335ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.167ms |
| 3154233619126b06000000000000177f | 323.476 | 43.116 | 161.902 | 3.813 | 0.000 | 0.308 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 114.336 | 208.831 | 0.646 | 114.336 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.217ms |
| 3154233619126b060000000000001cd6 | 320.358 | 58.994 | 229.447 | 5.196 | 0.000 | 0.376 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.345 | 293.637 | 0.917 | 26.345 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.513ms; driver.publication.persist-deferred 1.232ms |
| 3154233619126b060000000000001ce0 | 302.044 | 30.067 | 200.878 | 2.680 | 0.000 | 0.217 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.202 | 233.625 | 0.773 | 68.202 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.513ms; driver.publication.persist-deferred 1.232ms |
| 3154233619126b060000000000001768 | 285.480 | 24.056 | 107.864 | 0.000 | 0.000 | 0.252 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 153.308 | 131.920 | 0.462 | 153.308 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.746ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.248ms; driver.publication.persist-deferred 1.224ms |
| 3154233619126b06000000000000177d | 274.551 | 60.681 | 97.641 | 4.995 | 0.000 | 0.309 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 110.925 | 163.318 | 0.595 | 110.925 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.217ms |
| 3154233619126b06000000000000178d | 274.049 | 48.778 | 180.822 | 4.019 | 0.000 | 2.306 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.125 | 233.618 | 0.852 | 38.125 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.948ms; driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.564ms |
| 3154233619126b060000000000001cd3 | 268.782 | 13.016 | 79.914 | 0.000 | 0.000 | 0.137 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 175.716 | 92.929 | 0.346 | 175.716 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 1.100ms |
| 3154233619126b060000000000001780 | 267.260 | 102.413 | 98.977 | 9.886 | 0.000 | 0.305 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 55.678 | 211.276 | 0.791 | 55.678 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.217ms |
| 3154233619126b060000000000001cd2 | 266.905 | 18.882 | 81.164 | 0.000 | 0.000 | 0.249 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 166.610 | 100.046 | 0.375 | 166.610 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 1.100ms |
| 3154233619126b06000000000000176b | 263.468 | 65.329 | 148.094 | 6.994 | 0.000 | 0.342 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.708 | 220.418 | 0.837 | 42.708 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.746ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.248ms; driver.publication.persist-deferred 1.224ms |
| 3154233619126b060000000000001cda | 260.816 | 20.695 | 209.311 | 0.000 | 0.000 | 0.326 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.484 | 230.006 | 0.882 | 30.484 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.888ms; driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.232ms; driver.publication.persist-deferred 1.167ms; driver.publication.persist-deferred 1.091ms |
| 3154233619126b060000000000001784 | 260.601 | 88.756 | 125.590 | 9.517 | 0.000 | 0.362 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.375 | 223.863 | 0.859 | 36.375 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.067ms; driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.404ms; driver.publication.persist-deferred 1.217ms |
| 3154233619126b060000000000001ceb | 258.695 | 57.110 | 146.792 | 4.281 | 0.000 | 0.339 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 50.174 | 208.183 | 0.805 | 50.174 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 2.400ms; driver.publication.persist-deferred 1.644ms; driver.publication.persist-deferred 1.513ms; driver.publication.persist-deferred 1.091ms; driver.publication.persist-deferred 1.027ms |
| 3154233619126b060000000000001767 | 235.273 | 43.813 | 74.839 | 5.099 | 0.000 | 0.197 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 111.326 | 123.751 | 0.526 | 111.326 | node-14/thread-3/socket.wait-first-byte | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.746ms; driver.publication.persist-deferred 1.248ms; driver.publication.persist-deferred 1.224ms; driver.publication.persist-deferred 1.148ms |
| 3154233619126b060000000000001769 | 228.354 | 39.879 | 129.003 | 0.752 | 0.000 | 0.231 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 58.488 | 169.635 | 0.743 | 58.488 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication.persist-deferred 4.227ms; driver.publication.persist-deferred 2.746ms; driver.publication.persist-deferred 1.248ms; driver.publication.persist-deferred 1.224ms; driver.publication.persist-deferred 1.148ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.387 | 0.000 | 0.000 | 0.361 | 3.853 | 0.615 | 0.000 | 0.105 | 1.670 | 6.073 | 0.038 | n/a | 0.224 | 12.333 | n/a | n/a | 0.028 | 4.266 | 0.198 | 0.028 |
| p99 | 113.196 | 1.321 | 0.000 | 2.950 | 10.011 | n/a | 9.706 | 1.007 | 6.095 | 32.290 | 0.104 | n/a | 3.389 | 91.829 | n/a | n/a | 0.051 | 17.030 | 0.359 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b0600000000000000db | 113.196 | 6.877 | 0.228 | 0.000 | 0.098 | 1.621 | 11.933 | 0.057 | n/a | 0.513 | 91.829 | n/a | n/a | 0.039 | 7.203 | 0.064 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| 3154233619126b0600000000000000e8 | 71.028 | 7.123 | 0.134 | 9.706 | 0.067 | 6.030 | 32.290 | 0.039 | n/a | 0.167 | 15.446 | n/a | n/a | 0.026 | 17.030 | 0.240 | 0.026 | gw-w/thread-43/gateway.admitted-work | driver.reader-basis.broadcast 0.033ms |
| 3154233619126b0600000000000000fa | 55.506 | 8.868 | 0.189 | 0.862 | 0.064 | 2.203 | 14.362 | 0.046 | n/a | 0.173 | 28.712 | n/a | n/a | 0.026 | 9.983 | 0.180 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 3154233619126b0600000000000000ee | 45.898 | 10.011 | 0.128 | 0.528 | 0.067 | 2.539 | 16.083 | 0.033 | n/a | 0.170 | 16.310 | n/a | n/a | 0.030 | 10.734 | 0.234 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| 3154233619126b0600000000000000d1 | 45.538 | 5.162 | 0.164 | 0.000 | 0.096 | 3.764 | 7.344 | 0.057 | n/a | 0.543 | 28.369 | n/a | n/a | 0.037 | 5.423 | 0.119 | 0.037 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.028ms |
| 3154233619126b0600000000000000e6 | 40.594 | 8.397 | 0.187 | 0.000 | 0.105 | 4.023 | 8.642 | 0.038 | n/a | 0.145 | 19.016 | n/a | n/a | 0.042 | 8.689 | 0.214 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 3154233619126b0600000000000000d2 | 40.525 | 4.794 | n/a | 0.000 | 0.816 | 0.779 | 6.075 | 0.089 | n/a | 0.231 | 27.701 | n/a | n/a | 0.039 | 5.610 | 0.138 | 0.039 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000d9 | 40.431 | 3.560 | 0.209 | 0.000 | 0.064 | 5.756 | 11.682 | 0.061 | n/a | 0.162 | 18.911 | n/a | n/a | 0.027 | 3.833 | 0.095 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| 3154233619126b0600000000000000e1 | 39.147 | 3.483 | 0.154 | 0.000 | 0.092 | 3.390 | 9.466 | 0.055 | n/a | 1.469 | 21.005 | n/a | n/a | 0.033 | 3.728 | 0.095 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| 3154233619126b0600000000000000e2 | 33.563 | 3.820 | n/a | 0.000 | 0.245 | 2.290 | 7.708 | 0.104 | n/a | 1.174 | 18.192 | n/a | n/a | 0.030 | 4.066 | 0.121 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000f4 | 31.799 | 5.567 | 0.137 | 0.543 | 0.064 | 6.095 | 6.418 | 0.068 | n/a | 0.171 | 12.707 | n/a | n/a | 0.029 | 6.312 | 0.198 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 3154233619126b06000000000000010c | 31.368 | 3.614 | 0.171 | 0.000 | 0.065 | 4.081 | 10.031 | 0.053 | n/a | 0.802 | 12.525 | n/a | n/a | 0.027 | 3.849 | 0.123 | 0.027 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| 3154233619126b0600000000000000fe | 29.569 | 7.369 | 0.145 | 0.000 | 0.094 | 1.670 | 13.754 | 0.048 | n/a | 0.146 | 6.311 | n/a | n/a | 0.036 | 7.607 | 0.257 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| 3154233619126b0600000000000000ec | 29.212 | 3.646 | 0.175 | 1.962 | 0.068 | 1.629 | 6.910 | 0.035 | n/a | 0.231 | 14.526 | n/a | n/a | 0.029 | 5.852 | 0.200 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.064ms |
| 3154233619126b060000000000000104 | 28.922 | 4.667 | 0.135 | 0.000 | 0.065 | 1.778 | 10.229 | 0.062 | n/a | 0.187 | 11.773 | n/a | n/a | 0.025 | 4.868 | 0.168 | 0.025 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| 3154233619126b0600000000000000ca | 28.714 | 3.922 | 0.615 | 0.000 | 0.065 | 1.729 | 11.494 | 0.043 | n/a | 0.224 | 10.591 | n/a | n/a | 0.032 | 4.601 | 0.160 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms |
| 3154233619126b0600000000000000f0 | 28.128 | 5.680 | 0.139 | 0.252 | 0.072 | 4.160 | 12.119 | 0.036 | n/a | 0.117 | 5.525 | n/a | n/a | 0.028 | 6.143 | 0.218 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| 3154233619126b060000000000000117 | 27.359 | 4.055 | 0.145 | 0.000 | 0.067 | 2.966 | 8.534 | 0.052 | n/a | 0.151 | 11.364 | n/a | n/a | 0.027 | 4.266 | 0.156 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000f5 | 27.352 | 6.156 | n/a | 0.000 | 0.641 | 1.053 | 2.852 | 0.059 | n/a | 0.284 | 16.284 | n/a | n/a | 0.023 | 6.797 | 0.248 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000100 | 26.387 | 4.794 | 0.210 | 0.566 | 0.097 | 1.710 | 6.073 | 0.044 | n/a | 0.517 | 12.333 | n/a | n/a | 0.042 | 5.667 | 0.215 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.405 | 0.000 | 0.000 | 0.410 | 2.360 | n/a | 0.000 | 0.536 | 0.944 | 1.235 | 0.021 | n/a | 0.440 | 10.696 | n/a | n/a | 0.026 | 2.970 | 0.146 | 0.026 |
| p99 | 22.875 | 1.004 | 0.000 | 0.700 | 2.942 | n/a | 0.000 | 0.839 | 4.061 | 1.861 | 0.041 | n/a | 3.389 | 15.854 | n/a | n/a | 0.051 | 3.585 | 0.254 | 0.051 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b0600000000000000dd | 22.875 | 2.942 | n/a | 0.000 | 0.281 | 2.280 | 1.186 | 0.020 | n/a | 0.484 | 15.645 | n/a | n/a | 0.038 | 3.222 | 0.141 | 0.038 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| 3154233619126b0600000000000000d6 | 22.214 | 2.747 | n/a | 0.000 | 0.839 | 0.914 | 1.143 | 0.021 | n/a | 0.659 | 15.854 | n/a | n/a | 0.038 | 3.585 | 0.161 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000109 | 21.219 | 2.018 | n/a | 0.000 | 0.250 | 4.061 | 1.235 | 0.019 | n/a | 3.205 | 10.406 | n/a | n/a | 0.026 | 2.268 | 0.107 | 0.026 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000c7 | 20.522 | 1.885 | n/a | 0.000 | 0.331 | 0.707 | 1.267 | 0.019 | n/a | 0.717 | 15.563 | n/a | n/a | 0.034 | 2.216 | 0.108 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000fb | 20.281 | 2.435 | n/a | 0.000 | 0.536 | 2.012 | 1.171 | 0.020 | n/a | 3.389 | 10.696 | n/a | n/a | 0.022 | 2.970 | 0.146 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000111 | 16.405 | 1.665 | n/a | 0.000 | 0.656 | 0.924 | 1.701 | 0.041 | n/a | 0.201 | 11.196 | n/a | n/a | 0.021 | 2.321 | 0.141 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000cc | 16.024 | 2.180 | n/a | 0.000 | 0.810 | 0.732 | 1.302 | 0.023 | n/a | 0.201 | 10.753 | n/a | n/a | 0.023 | 2.990 | 0.187 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000000df | 14.545 | 2.360 | n/a | 0.000 | 0.821 | 1.480 | 1.861 | 0.021 | n/a | 0.440 | 7.536 | n/a | n/a | 0.026 | 3.181 | 0.219 | 0.026 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000114 | 13.006 | 2.615 | n/a | 0.000 | 0.690 | 0.944 | 1.219 | 0.021 | n/a | 0.177 | 7.290 | n/a | n/a | 0.051 | 3.304 | 0.254 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.067ms |
| 3154233619126b0600000000000000f1 | 11.614 | 2.504 | n/a | 0.000 | 0.251 | 1.181 | 1.493 | 0.035 | n/a | 0.122 | 6.005 | n/a | n/a | 0.023 | 2.755 | 0.237 | 0.023 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.395 | 0.000 | 0.000 | 0.380 | 3.586 | n/a | 0.000 | 0.114 | 1.408 | 4.632 | 0.031 | n/a | 0.229 | 10.690 | n/a | n/a | 0.026 | 3.772 | 0.194 | 0.026 |
| p99 | 117.898 | 1.818 | 0.000 | 1.012 | 12.236 | n/a | 0.993 | 1.160 | 11.509 | 24.765 | 0.211 | n/a | 3.641 | 100.351 | n/a | n/a | 0.080 | 12.738 | 0.426 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b06000000000000012b | 117.898 | 2.741 | n/a | 0.000 | 1.010 | 1.002 | 12.619 | 0.048 | n/a | 0.102 | 100.351 | n/a | n/a | 0.023 | 3.752 | 0.032 | 0.023 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.095ms; driver.reader-basis.broadcast 0.036ms |
| 3154233619126b060000000000000146 | 52.800 | 7.276 | 0.189 | 0.000 | 0.070 | 3.978 | 8.319 | 0.031 | n/a | 0.354 | 32.557 | n/a | n/a | 0.025 | 7.536 | 0.143 | 0.025 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| 3154233619126b06000000000000012e | 52.423 | 7.409 | 0.183 | 0.409 | 0.157 | 4.594 | 8.572 | 0.028 | n/a | 0.124 | 30.898 | n/a | n/a | 0.047 | 8.159 | 0.156 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.053ms |
| 3154233619126b06000000000000012a | 49.765 | 3.152 | 0.142 | 0.000 | 0.058 | 1.204 | 24.765 | 0.027 | n/a | 0.117 | 20.276 | n/a | n/a | 0.025 | 3.352 | 0.067 | 0.025 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.108ms |
| 3154233619126b06000000000000013b | 41.952 | 8.922 | n/a | 0.000 | 0.620 | 2.824 | 8.798 | 0.059 | n/a | 3.641 | 17.061 | n/a | n/a | 0.026 | 9.542 | 0.227 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.041ms |
| 3154233619126b060000000000000126 | 41.163 | 10.224 | 0.260 | 0.993 | 0.072 | 2.295 | 7.100 | 0.068 | n/a | 0.583 | 19.542 | n/a | n/a | 0.026 | 11.549 | 0.281 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 3154233619126b06000000000000013a | 38.557 | 9.934 | 0.179 | 0.429 | 0.064 | 7.149 | 6.257 | 0.044 | n/a | 0.839 | 13.636 | n/a | n/a | 0.024 | 10.607 | 0.275 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 3154233619126b060000000000000144 | 37.973 | 4.513 | 0.445 | 0.000 | 0.106 | 1.538 | 6.987 | 0.037 | n/a | 0.149 | 24.156 | n/a | n/a | 0.042 | 5.064 | 0.133 | 0.042 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| 3154233619126b060000000000000164 | 32.594 | 9.379 | 0.156 | 0.278 | 0.064 | 1.438 | 12.952 | 0.034 | n/a | 0.105 | 8.156 | n/a | n/a | 0.031 | 9.878 | 0.303 | 0.031 | gw-w/thread-42/gateway.admitted-work | none observed |
| 3154233619126b06000000000000015c | 32.592 | 12.236 | 0.179 | 0.263 | 0.060 | 1.660 | 6.937 | 0.047 | n/a | 0.194 | 10.989 | n/a | n/a | 0.027 | 12.738 | 0.391 | 0.027 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000011d | 31.285 | 6.775 | 0.561 | 0.899 | 0.111 | 11.509 | 5.503 | 0.032 | n/a | 0.769 | 5.083 | n/a | n/a | 0.043 | 8.346 | 0.267 | 0.043 | node-14/thread-8/socket.wait-first-byte | driver.reader-basis.broadcast 0.062ms |
| 3154233619126b06000000000000013e | 29.482 | 4.286 | 0.194 | 0.000 | 0.135 | 1.069 | 8.216 | 0.032 | n/a | 0.583 | 14.902 | n/a | n/a | 0.066 | 4.615 | 0.157 | 0.066 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000011f | 28.584 | 3.440 | n/a | 0.000 | 0.159 | 4.242 | 2.200 | 0.052 | n/a | 0.156 | 18.326 | n/a | n/a | 0.009 | 3.600 | 0.126 | 0.009 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.210ms |
| 3154233619126b06000000000000011e | 28.225 | 2.063 | n/a | 0.000 | 0.198 | 4.320 | 6.793 | 0.020 | n/a | 0.339 | 14.465 | n/a | n/a | 0.027 | 2.260 | 0.080 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000147 | 27.943 | 4.796 | n/a | 0.000 | 1.160 | 0.763 | 3.921 | 0.020 | n/a | 0.118 | 17.120 | n/a | n/a | 0.045 | 5.956 | 0.213 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000016a | 26.037 | 3.607 | 0.194 | 0.189 | 0.058 | 1.516 | 9.464 | 0.032 | n/a | 0.261 | 10.690 | n/a | n/a | 0.026 | 4.048 | 0.155 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000135 | 25.775 | 1.958 | n/a | 0.000 | 0.114 | 0.766 | 3.860 | 0.064 | n/a | 0.859 | 18.131 | n/a | n/a | 0.024 | 2.072 | 0.080 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000123 | 25.053 | 4.674 | 0.167 | 0.000 | 0.092 | 1.481 | 6.872 | 0.042 | n/a | 0.133 | 11.556 | n/a | n/a | 0.037 | 4.932 | 0.197 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000012f | 23.558 | 2.117 | n/a | 0.000 | 0.442 | 0.705 | 1.935 | 0.021 | n/a | 1.923 | 16.392 | n/a | n/a | 0.024 | 2.559 | 0.109 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000011a | 23.442 | 2.325 | n/a | 0.000 | 1.008 | 0.848 | 5.640 | 0.073 | n/a | 0.882 | 12.644 | n/a | n/a | 0.022 | 3.333 | 0.142 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.863 | 0.000 | 0.000 | 0.438 | 2.102 | n/a | 0.000 | 0.442 | 0.848 | 1.863 | 0.021 | n/a | 0.489 | 10.081 | n/a | n/a | 0.024 | 2.715 | 0.188 | 0.024 |
| p99 | 28.225 | 1.237 | 0.000 | 0.617 | 2.899 | n/a | 0.000 | 1.093 | 4.320 | 6.793 | 0.211 | n/a | 3.402 | 18.131 | n/a | n/a | 0.080 | 3.441 | 0.312 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b06000000000000011e | 28.225 | 2.063 | n/a | 0.000 | 0.198 | 4.320 | 6.793 | 0.020 | n/a | 0.339 | 14.465 | n/a | n/a | 0.027 | 2.260 | 0.080 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000135 | 25.775 | 1.958 | n/a | 0.000 | 0.114 | 0.766 | 3.860 | 0.064 | n/a | 0.859 | 18.131 | n/a | n/a | 0.024 | 2.072 | 0.080 | 0.024 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000012f | 23.558 | 2.117 | n/a | 0.000 | 0.442 | 0.705 | 1.935 | 0.021 | n/a | 1.923 | 16.392 | n/a | n/a | 0.024 | 2.559 | 0.109 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000011a | 23.442 | 2.325 | n/a | 0.000 | 1.008 | 0.848 | 5.640 | 0.073 | n/a | 0.882 | 12.644 | n/a | n/a | 0.022 | 3.333 | 0.142 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000131 | 20.225 | 2.067 | n/a | 0.000 | 0.475 | 0.809 | 1.113 | 0.020 | n/a | 3.402 | 12.314 | n/a | n/a | 0.024 | 2.542 | 0.126 | 0.024 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000153 | 16.787 | 2.899 | n/a | 0.000 | 0.257 | 0.863 | 1.264 | 0.021 | n/a | 0.229 | 11.215 | n/a | n/a | 0.039 | 3.156 | 0.188 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000141 | 16.713 | 1.993 | n/a | 0.000 | 0.924 | 0.797 | 1.863 | 0.026 | n/a | 0.559 | 10.473 | n/a | n/a | 0.080 | 2.917 | 0.175 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.052ms |
| 3154233619126b060000000000000133 | 15.863 | 2.759 | n/a | 0.000 | 0.230 | 0.836 | 2.198 | 0.023 | n/a | 0.497 | 9.267 | n/a | n/a | 0.053 | 2.989 | 0.188 | 0.053 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000014f | 15.674 | 2.591 | n/a | 0.000 | 0.850 | 0.928 | 1.037 | 0.020 | n/a | 0.143 | 10.081 | n/a | n/a | 0.024 | 3.441 | 0.220 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000014b | 14.287 | 1.983 | n/a | 0.000 | 0.358 | 1.408 | 1.327 | 0.211 | n/a | 0.115 | 8.861 | n/a | n/a | 0.022 | 2.342 | 0.164 | 0.022 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b06000000000000015d | 14.056 | 1.723 | n/a | 0.000 | 1.093 | 0.907 | 2.128 | 0.045 | n/a | 0.169 | 7.964 | n/a | n/a | 0.026 | 2.816 | 0.200 | 0.026 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000167 | 12.155 | 2.653 | n/a | 0.000 | 0.063 | 2.260 | 1.108 | 0.019 | n/a | 0.119 | 5.901 | n/a | n/a | 0.032 | 2.715 | 0.223 | 0.032 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000118 | 11.813 | 2.161 | n/a | 0.000 | 0.410 | 1.178 | 1.863 | 0.048 | n/a | 0.782 | 5.343 | n/a | n/a | 0.026 | 2.572 | 0.218 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000157 | 9.733 | 2.102 | n/a | 0.000 | 0.462 | 0.806 | 1.439 | 0.020 | n/a | 0.088 | 4.791 | n/a | n/a | 0.024 | 2.564 | 0.263 | 0.024 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000000128 | 9.616 | 2.072 | n/a | 0.000 | 0.927 | 0.549 | 0.948 | 0.019 | n/a | 0.489 | 4.593 | n/a | n/a | 0.020 | 2.999 | 0.312 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3561 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.924 | 0.000 | 0.000 | 0.366 | 1.958 | n/a | 0.000 | 0.696 | 0.583 | 0.971 | 0.013 | n/a | 0.100 | 5.103 | n/a | n/a | 0.014 | 2.851 | 0.275 | 0.014 |
| p99 | 41.625 | 1.989 | 0.026 | 1.038 | 6.027 | n/a | 0.298 | 17.105 | 6.892 | 5.928 | 0.056 | n/a | 3.436 | 28.650 | n/a | n/a | 0.049 | 19.477 | 0.708 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b060000000000001b16 | 102.728 | 5.227 | n/a | 0.000 | 1.264 | 8.805 | 2.354 | 0.034 | n/a | 0.047 | 84.990 | n/a | n/a | 0.006 | 6.491 | 0.063 | 0.006 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.427ms; driver.publication.persist-deferred 3.041ms; driver.publication.persist-deferred 1.852ms; driver.publication.persist-deferred 1.122ms; driver.reader-basis.broadcast 0.544ms |
| 3154233619126b060000000000001b15 | 93.826 | 3.335 | n/a | 0.000 | 2.554 | 2.542 | 1.890 | 0.019 | n/a | 0.063 | 83.406 | n/a | n/a | 0.016 | 5.890 | 0.063 | 0.016 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.041ms; driver.publication.persist-deferred 1.122ms |
| 3154233619126b0600000000000001eb | 77.790 | 9.963 | 0.134 | 0.250 | 0.040 | 0.905 | 5.623 | 0.033 | n/a | 0.103 | 60.721 | n/a | n/a | 0.019 | 10.387 | 0.134 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.224ms |
| 3154233619126b060000000000001ba9 | 72.254 | 1.678 | n/a | 0.000 | 58.318 | 0.362 | 0.576 | 0.010 | n/a | 0.189 | 11.110 | n/a | n/a | 0.011 | 59.996 | 0.830 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.259ms; driver.publication.persist-deferred 1.215ms; driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 0.865ms; driver.publication.persist-deferred 0.847ms |
| 3154233619126b060000000000000768 | 69.992 | 4.108 | n/a | 1.313 | 16.843 | 9.971 | 3.717 | 4.277 | n/a | 0.187 | 29.564 | n/a | n/a | 0.012 | 22.264 | 0.318 | 0.012 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.588ms; driver.publication.persist-deferred 1.434ms; driver.publication.persist-deferred 1.159ms; driver.publication.persist-deferred 1.045ms; driver.publication.persist-deferred 0.914ms |
| 3154233619126b060000000000001106 | 67.497 | 1.134 | n/a | 0.000 | 60.915 | 0.303 | 0.799 | 0.051 | n/a | 0.075 | 4.211 | n/a | n/a | 0.010 | 62.049 | 0.919 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 1.310ms; driver.publication.persist-deferred 0.933ms; driver.publication.persist-deferred 0.871ms |
| 3154233619126b060000000000000766 | 66.595 | 2.951 | n/a | 0.000 | 52.519 | 1.985 | 1.082 | 0.007 | n/a | 0.058 | 7.982 | n/a | n/a | 0.011 | 55.470 | 0.833 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.090ms; driver.publication.persist-deferred 1.792ms; driver.publication.persist-deferred 1.588ms; driver.publication.persist-deferred 1.434ms; driver.publication.persist-deferred 1.159ms |
| 3154233619126b0600000000000001ff | 63.438 | 8.526 | 0.173 | 0.245 | 0.042 | 1.250 | 2.600 | 0.041 | n/a | 0.160 | 50.376 | n/a | n/a | 0.025 | 8.986 | 0.142 | 0.025 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.152ms |
| 3154233619126b060000000000001105 | 61.842 | 1.538 | n/a | 0.000 | 50.903 | 0.240 | 0.720 | 0.012 | n/a | 0.334 | 8.090 | n/a | n/a | 0.007 | 52.440 | 0.848 | 0.007 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 1.310ms; driver.publication.persist-deferred 0.871ms; driver.publication.persist-deferred 0.850ms |
| 3154233619126b060000000000001b19 | 59.635 | 4.366 | 7.614 | 0.000 | 0.090 | 1.770 | 1.931 | 0.024 | n/a | 0.054 | 43.759 | n/a | n/a | 0.028 | 12.070 | 0.202 | 0.028 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.427ms; driver.publication.persist-deferred 1.852ms; driver.reader-basis.broadcast 0.544ms |
| 3154233619126b060000000000001ba8 | 58.857 | 2.331 | n/a | 0.000 | 18.661 | 0.301 | 0.914 | 0.009 | n/a | 0.277 | 36.357 | n/a | n/a | 0.008 | 20.991 | 0.357 | 0.008 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 3.869ms; driver.publication.persist-deferred 0.865ms; driver.publication.persist-deferred 0.847ms; driver.publication.persist-deferred 0.786ms; driver.publication.persist-deferred 0.746ms |
| 3154233619126b060000000000000763 | 58.516 | 1.236 | n/a | 0.000 | 30.523 | 1.691 | 1.139 | 0.018 | n/a | 3.681 | 20.218 | n/a | n/a | 0.010 | 31.759 | 0.543 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.090ms; driver.publication.persist-deferred 1.792ms; driver.publication.persist-deferred 1.588ms; driver.publication.persist-deferred 1.434ms; driver.publication.persist-deferred 1.159ms |
| 3154233619126b060000000000001b1a | 57.063 | 1.748 | n/a | 0.000 | 0.200 | 8.596 | 1.170 | 0.024 | n/a | 0.070 | 45.242 | n/a | n/a | 0.013 | 1.948 | 0.034 | 0.013 | gw-w/thread-60/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.427ms; driver.publication.persist-deferred 1.852ms; driver.reader-basis.broadcast 0.544ms |
| 3154233619126b060000000000001104 | 53.216 | 5.221 | n/a | 0.000 | 0.302 | 5.967 | 1.672 | 0.021 | n/a | 3.544 | 36.477 | n/a | n/a | 0.013 | 5.523 | 0.104 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 0.871ms; driver.publication.persist-deferred 0.850ms |
| 3154233619126b0600000000000001d0 | 52.390 | 2.446 | n/a | 0.000 | 0.284 | 0.894 | 1.135 | 0.020 | n/a | 0.752 | 46.809 | n/a | n/a | 0.049 | 2.730 | 0.052 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b0600000000000008b2 | 51.655 | 9.508 | n/a | 0.000 | 0.176 | 5.935 | 3.799 | 0.041 | n/a | 0.165 | 31.999 | n/a | n/a | 0.031 | 9.685 | 0.187 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.390ms; driver.publication.persist-deferred 1.160ms; driver.reader-basis.broadcast 0.208ms; driver.publication.persist-deferred 0.079ms |
| 3154233619126b060000000000001b6c | 50.352 | 1.639 | n/a | 0.000 | 39.895 | 0.355 | 0.951 | 0.012 | n/a | 0.059 | 7.431 | n/a | n/a | 0.011 | 41.533 | 0.825 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.967ms; driver.publication.persist-deferred 0.853ms; driver.reader-basis.broadcast 0.276ms |
| 3154233619126b060000000000001b6f | 48.898 | 1.667 | n/a | 0.000 | 35.744 | 0.522 | 1.385 | 0.020 | n/a | 0.066 | 9.484 | n/a | n/a | 0.009 | 37.411 | 0.765 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.853ms; driver.reader-basis.broadcast 0.276ms |
| 3154233619126b0600000000000011c2 | 48.416 | 1.394 | n/a | 0.000 | 0.731 | 3.014 | 0.911 | 0.013 | n/a | 0.056 | 42.276 | n/a | n/a | 0.020 | 2.125 | 0.044 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.069ms |
| 3154233619126b0600000000000003e1 | 48.412 | 1.457 | n/a | 0.000 | 36.360 | 0.853 | 0.770 | 0.010 | n/a | 0.040 | 8.915 | n/a | n/a | 0.009 | 37.817 | 0.781 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.960ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 1.104ms; driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 0.942ms |

## P2 / tail / commit / 5-10 facts (2079 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.584 | 0.000 | 0.000 | 0.309 | 1.565 | n/a | 0.000 | 0.728 | 0.560 | 0.817 | 0.012 | n/a | 0.098 | 4.652 | n/a | n/a | 0.014 | 2.468 | 0.265 | 0.014 |
| p99 | 39.569 | 1.438 | 0.027 | 0.669 | 4.570 | n/a | 0.000 | 17.195 | 6.759 | 4.497 | 0.052 | n/a | 3.436 | 24.364 | n/a | n/a | 0.048 | 18.976 | 0.714 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 3154233619126b060000000000001ba9 | 72.254 | 1.678 | n/a | 0.000 | 58.318 | 0.362 | 0.576 | 0.010 | n/a | 0.189 | 11.110 | n/a | n/a | 0.011 | 59.996 | 0.830 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.259ms; driver.publication.persist-deferred 1.215ms; driver.publication.persist-deferred 1.143ms; driver.publication.persist-deferred 0.865ms; driver.publication.persist-deferred 0.847ms |
| 3154233619126b060000000000001106 | 67.497 | 1.134 | n/a | 0.000 | 60.915 | 0.303 | 0.799 | 0.051 | n/a | 0.075 | 4.211 | n/a | n/a | 0.010 | 62.049 | 0.919 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 1.310ms; driver.publication.persist-deferred 0.933ms; driver.publication.persist-deferred 0.871ms |
| 3154233619126b060000000000000763 | 58.516 | 1.236 | n/a | 0.000 | 30.523 | 1.691 | 1.139 | 0.018 | n/a | 3.681 | 20.218 | n/a | n/a | 0.010 | 31.759 | 0.543 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 2.090ms; driver.publication.persist-deferred 1.792ms; driver.publication.persist-deferred 1.588ms; driver.publication.persist-deferred 1.434ms; driver.publication.persist-deferred 1.159ms |
| 3154233619126b060000000000001b1a | 57.063 | 1.748 | n/a | 0.000 | 0.200 | 8.596 | 1.170 | 0.024 | n/a | 0.070 | 45.242 | n/a | n/a | 0.013 | 1.948 | 0.034 | 0.013 | gw-w/thread-60/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 5.427ms; driver.publication.persist-deferred 1.852ms; driver.reader-basis.broadcast 0.544ms |
| 3154233619126b060000000000001104 | 53.216 | 5.221 | n/a | 0.000 | 0.302 | 5.967 | 1.672 | 0.021 | n/a | 3.544 | 36.477 | n/a | n/a | 0.013 | 5.523 | 0.104 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.583ms; driver.publication.persist-deferred 1.373ms; driver.publication.persist-deferred 0.871ms; driver.publication.persist-deferred 0.850ms |
| 3154233619126b0600000000000001d0 | 52.390 | 2.446 | n/a | 0.000 | 0.284 | 0.894 | 1.135 | 0.020 | n/a | 0.752 | 46.809 | n/a | n/a | 0.049 | 2.730 | 0.052 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 3154233619126b060000000000001b6c | 50.352 | 1.639 | n/a | 0.000 | 39.895 | 0.355 | 0.951 | 0.012 | n/a | 0.059 | 7.431 | n/a | n/a | 0.011 | 41.533 | 0.825 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.967ms; driver.publication.persist-deferred 0.853ms; driver.reader-basis.broadcast 0.276ms |
| 3154233619126b060000000000001b6f | 48.898 | 1.667 | n/a | 0.000 | 35.744 | 0.522 | 1.385 | 0.020 | n/a | 0.066 | 9.484 | n/a | n/a | 0.009 | 37.411 | 0.765 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.853ms; driver.reader-basis.broadcast 0.276ms |
| 3154233619126b0600000000000011c2 | 48.416 | 1.394 | n/a | 0.000 | 0.731 | 3.014 | 0.911 | 0.013 | n/a | 0.056 | 42.276 | n/a | n/a | 0.020 | 2.125 | 0.044 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.069ms |
| 3154233619126b0600000000000003e1 | 48.412 | 1.457 | n/a | 0.000 | 36.360 | 0.853 | 0.770 | 0.010 | n/a | 0.040 | 8.915 | n/a | n/a | 0.009 | 37.817 | 0.781 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.960ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 1.104ms; driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 0.942ms |
| 3154233619126b0600000000000014e0 | 45.226 | 2.381 | n/a | 0.000 | 3.183 | 11.894 | 6.297 | 0.045 | n/a | 0.117 | 21.297 | n/a | n/a | 0.013 | 5.563 | 0.123 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.671ms; driver.publication.persist-deferred 1.378ms; driver.publication.persist-deferred 1.349ms; driver.publication.persist-deferred 0.765ms; driver.reader-basis.broadcast 0.224ms |
| 3154233619126b0600000000000008bb | 45.075 | 1.816 | n/a | 0.000 | 0.390 | 5.252 | 0.552 | 0.004 | n/a | 0.143 | 36.899 | n/a | n/a | 0.018 | 2.207 | 0.049 | 0.018 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.206ms; driver.publication.persist-deferred 0.975ms; driver.reader-basis.broadcast 0.182ms |
| 3154233619126b06000000000000035b | 43.326 | 1.120 | n/a | 0.000 | 33.722 | 3.111 | 0.767 | 0.017 | n/a | 0.055 | 4.524 | n/a | n/a | 0.010 | 34.842 | 0.804 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 3.343ms; driver.publication.persist-deferred 1.281ms; driver.publication.persist-deferred 1.233ms; driver.publication.persist-deferred 1.191ms; driver.publication.persist-deferred 0.962ms |
| 3154233619126b0600000000000002ba | 42.611 | 1.949 | n/a | 0.000 | 25.574 | 8.674 | 1.281 | 0.068 | n/a | 0.089 | 4.962 | n/a | n/a | 0.014 | 27.523 | 0.646 | 0.014 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.180ms; driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.005ms; driver.publication.persist-deferred 0.956ms; driver.publication.persist-deferred 0.773ms |
| 3154233619126b060000000000001b70 | 42.559 | 1.728 | n/a | 0.000 | 23.999 | 2.482 | 0.883 | 0.014 | n/a | 0.248 | 13.194 | n/a | n/a | 0.011 | 25.727 | 0.605 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 1.124ms; driver.publication.persist-deferred 1.084ms; driver.publication.persist-deferred 0.910ms; driver.publication.persist-deferred 0.853ms |
| 3154233619126b0600000000000015ab | 40.944 | 6.773 | n/a | 0.000 | 0.817 | 13.799 | 1.802 | 0.021 | n/a | 0.098 | 17.629 | n/a | n/a | 0.006 | 7.590 | 0.185 | 0.006 | gw-w/thread-40/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.401ms; driver.publication.persist-deferred 1.168ms; driver.publication.persist-deferred 1.079ms; driver.publication.persist-deferred 0.947ms; driver.publication.persist-deferred 0.942ms |
| 3154233619126b060000000000001755 | 40.908 | 2.297 | n/a | 0.000 | 33.570 | 0.486 | 0.758 | 0.010 | n/a | 0.051 | 3.720 | n/a | n/a | 0.017 | 35.867 | 0.877 | 0.017 | node-14/thread-0/driver.queue.subject | driver.publication.persist-deferred 5.069ms; driver.expected-state.bind-receipt 2.143ms; driver.publication.persist-deferred 1.790ms; driver.publication.persist-deferred 0.853ms |
| 3154233619126b0600000000000003e2 | 40.512 | 1.327 | n/a | 0.000 | 16.630 | 0.959 | 0.701 | 0.014 | n/a | 0.049 | 20.819 | n/a | n/a | 0.013 | 17.957 | 0.443 | 0.013 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 1.960ms; driver.publication.persist-deferred 1.140ms; driver.publication.persist-deferred 1.021ms; driver.publication.persist-deferred 0.942ms; driver.publication.persist-deferred 0.705ms |
| 3154233619126b0600000000000011c5 | 40.284 | 1.595 | n/a | 0.000 | 0.052 | 2.707 | 1.066 | 0.016 | n/a | 0.138 | 34.696 | n/a | n/a | 0.013 | 1.647 | 0.041 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 2.374ms; driver.publication.persist-deferred 1.880ms; driver.publication.persist-deferred 1.069ms; driver.publication.persist-deferred 1.044ms |
| 3154233619126b060000000000001cc9 | 40.213 | 3.123 | n/a | 0.000 | 1.012 | 1.349 | 32.533 | 0.040 | n/a | 0.086 | 2.058 | n/a | n/a | 0.012 | 4.134 | 0.103 | 0.012 | gw-w/thread-43/commit.prepare-and-validate | none observed |

## P1 / warmup / read (1998 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 0.000 | 0.000 | 0.011 |
| p99 | 281.765 | n/a | n/a | n/a | 0.643 | n/a | 0.000 | 281.681 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.315 | 281.764 | 1.000 | 0.315 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d928500c98be9f9f000000000000141c | 303.149 | 0.017 | n/a | 0.000 | 303.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.149 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d928500c98be9f9f000000000000141b | 303.140 | 0.016 | n/a | 0.000 | 303.123 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.139 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d928500c98be9f9f0000000000001418 | 303.137 | 0.281 | n/a | 0.000 | 302.854 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 303.135 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d928500c98be9f9f000000000000141a | 303.130 | 0.021 | n/a | 0.000 | 303.108 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.129 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d928500c98be9f9f0000000000001419 | 303.122 | 0.049 | n/a | 0.000 | 303.072 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 303.121 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000000a01 | 300.906 | 0.643 | n/a | 0.000 | 300.258 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 300.901 | 1.000 | 0.005 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000000a1d | 298.481 | 0.030 | n/a | 0.000 | 298.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 298.479 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000000a1c | 298.449 | 0.032 | n/a | 0.000 | 298.415 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.446 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000000a1a | 298.428 | 0.074 | n/a | 0.000 | 298.346 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 298.420 | 1.000 | 0.008 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000000a1b | 298.419 | 0.037 | n/a | 0.000 | 298.378 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.415 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000000a22 | 298.320 | 0.040 | n/a | 0.000 | 298.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 298.317 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000015da | 298.107 | 0.554 | n/a | 0.000 | 297.549 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 298.103 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000015de | 298.085 | 0.030 | n/a | 0.000 | 298.054 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.084 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000015dd | 298.048 | 0.031 | n/a | 0.000 | 298.016 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.046 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000015dc | 298.015 | 0.034 | n/a | 0.000 | 297.980 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 298.014 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000015db | 297.990 | 0.079 | n/a | 0.000 | 297.909 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.988 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000006cae4 | 281.833 | 0.211 | n/a | 0.000 | 281.620 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.832 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000006cae6 | 281.795 | 0.082 | n/a | 0.000 | 281.712 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.794 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000006cae5 | 281.769 | 0.032 | n/a | 0.000 | 281.736 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.768 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000006cae7 | 281.765 | 0.014 | n/a | 0.000 | 281.751 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 281.764 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L1 / read (705 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.010 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 0.000 | 0.000 | 0.010 |
| p99 | 275.009 | n/a | n/a | n/a | 0.148 | n/a | 0.000 | 274.914 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.106 | 275.007 | 1.000 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7d3790c99a89e1e00000000000eb29f | 471.134 | 0.125 | n/a | 0.000 | 471.008 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 471.133 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000f5bee | 283.749 | 0.148 | n/a | 0.000 | 283.599 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.747 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000001312d0 | 279.452 | 0.108 | n/a | 0.000 | 279.343 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.450 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000103ba3 | 279.259 | 0.112 | n/a | 0.000 | 279.145 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.257 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000f8e8b | 277.094 | 0.104 | n/a | 0.000 | 276.987 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.091 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000c9821 | 276.024 | 0.227 | n/a | 0.000 | 275.796 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.023 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000ff3cd | 275.814 | 0.138 | n/a | 0.000 | 275.674 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.812 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000af517 | 275.009 | 0.093 | n/a | 0.000 | 274.914 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.007 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000012f2c9 | 272.103 | 0.119 | n/a | 0.000 | 271.980 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 272.099 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000ff83c | 269.620 | 0.213 | n/a | 0.000 | 269.405 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 269.618 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000001218a7 | 267.463 | 0.219 | n/a | 0.000 | 267.242 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 267.460 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000ad508 | 266.499 | 0.136 | n/a | 0.000 | 266.361 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.497 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000110668 | 265.876 | 0.124 | n/a | 0.000 | 265.751 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.875 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| d7d3790c99a89e1e00000000000fd9c8 | 265.567 | 0.131 | n/a | 0.000 | 265.434 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 265.565 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000000ff84b | 259.333 | 0.232 | n/a | 0.000 | 259.098 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 259.330 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.032ms |
| d7d3790c99a89e1e00000000000eb2a9 | 187.664 | 0.178 | n/a | 0.000 | 187.479 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 187.657 | 1.000 | 0.007 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms; replica.apply-delta 0.030ms |
| d7d3790c99a89e1e00000000000fd9d6 | 169.549 | 0.118 | n/a | 0.000 | 169.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 169.545 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| d7d3790c99a89e1e00000000000ff859 | 37.405 | 0.101 | n/a | 0.000 | 37.301 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 37.402 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| d7d3790c99a89e1e00000000000ff869 | 35.455 | 0.155 | n/a | 0.000 | 35.297 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 35.452 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| d7d3790c99a89e1e00000000001312d8 | 27.152 | 12.846 | n/a | 0.000 | 0.000 | 1.061 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.245 | 12.846 | 0.473 | 13.245 | node-14/thread-4/socket.wait-first-byte | replica.apply-delta 0.086ms |

## P1 / L4 / read (1928 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.013 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 0.000 | 0.000 | 0.012 |
| p99 | 272.572 | n/a | n/a | n/a | 0.180 | n/a | 0.000 | 272.405 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.109 | 272.571 | 1.000 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 91592a221d25ad7c00000000000a9e64 | 291.554 | 0.116 | n/a | 0.000 | 291.436 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 291.552 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000156f19 | 290.797 | 0.177 | n/a | 0.000 | 290.617 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 290.794 | 1.000 | 0.003 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d928500c98be9f9f00000000000ab1d4 | 290.291 | 0.129 | n/a | 0.000 | 290.160 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.289 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e0000000000156f3f | 289.544 | 0.034 | n/a | 0.000 | 289.508 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.542 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000bcb80 | 283.015 | 0.100 | n/a | 0.000 | 282.913 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 283.013 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000016e0cb | 282.886 | 0.040 | n/a | 0.000 | 282.846 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 282.885 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000016e0ca | 282.830 | 0.098 | n/a | 0.000 | 282.729 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 282.828 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d928500c98be9f9f00000000000bed13 | 281.577 | 0.184 | n/a | 0.000 | 281.389 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 281.573 | 1.000 | 0.004 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000001035ed | 276.607 | 0.117 | n/a | 0.000 | 276.487 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.604 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000001c2b1e | 276.363 | 0.031 | n/a | 0.000 | 276.331 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 276.362 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000001c2b1d | 276.276 | 0.164 | n/a | 0.000 | 276.110 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 276.274 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000eb499 | 274.771 | 0.110 | n/a | 0.000 | 274.657 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 274.767 | 1.000 | 0.004 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d928500c98be9f9f00000000000ee02f | 274.741 | 0.112 | n/a | 0.000 | 274.627 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.739 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000001a6027 | 274.579 | 0.087 | n/a | 0.000 | 274.490 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.577 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e00000000001a602b | 274.531 | 0.027 | n/a | 0.000 | 274.503 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 274.530 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d928500c98be9f9f0000000000106f28 | 273.406 | 0.150 | n/a | 0.000 | 273.253 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 273.404 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | none observed |
| 91592a221d25ad7c00000000000ba5e2 | 272.724 | 0.260 | n/a | 0.000 | 272.461 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.721 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | none observed |
| d928500c98be9f9f00000000000bc660 | 272.593 | 0.140 | n/a | 0.000 | 272.450 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.590 | 1.000 | 0.003 | node-14/thread-6/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000016b00c | 272.580 | 0.173 | n/a | 0.000 | 272.405 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 272.578 | 1.000 | 0.002 | node-14/thread-4/reader.straddle-await-ack | none observed |
| d7d3790c99a89e1e000000000016b00d | 272.572 | 0.030 | n/a | 0.000 | 272.542 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 272.571 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (2194 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.028 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 290.513 | n/a | n/a | n/a | 0.194 | n/a | 0.000 | 290.483 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.258 | 290.511 | 1.000 | 0.258 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d7d3790c99a89e1e000000000020142e | 368.958 | 0.052 | n/a | 0.000 | 368.905 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 368.957 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| d7d3790c99a89e1e000000000020142d | 368.917 | 0.023 | n/a | 0.000 | 368.893 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 368.916 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| d7d3790c99a89e1e000000000020142c | 368.892 | 0.024 | n/a | 0.000 | 368.868 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 368.891 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| d7d3790c99a89e1e000000000020142b | 368.867 | 0.026 | n/a | 0.000 | 368.840 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 368.866 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| d7d3790c99a89e1e000000000020142a | 368.834 | 0.031 | n/a | 0.000 | 368.802 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 368.833 | 1.000 | 0.001 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| d7d3790c99a89e1e0000000000201429 | 368.768 | 0.131 | n/a | 0.000 | 368.633 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 368.764 | 1.000 | 0.004 | node-14/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| 91592a221d25ad7c000000000013a90d | 367.108 | 0.096 | n/a | 0.000 | 367.009 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 367.105 | 1.000 | 0.003 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| d928500c98be9f9f000000000013f73e | 366.857 | 0.014 | n/a | 0.000 | 366.842 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.856 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d928500c98be9f9f000000000013f73d | 366.848 | 0.017 | n/a | 0.000 | 366.830 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.847 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d928500c98be9f9f000000000013f73c | 366.835 | 0.020 | n/a | 0.000 | 366.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.834 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d928500c98be9f9f000000000013f73b | 366.794 | 0.091 | n/a | 0.000 | 366.701 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.792 | 1.000 | 0.002 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| d928500c98be9f9f000000000013f758 | 366.513 | 0.018 | n/a | 0.000 | 366.495 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.512 | 1.000 | 0.001 | node-14/thread-6/reader.straddle-await-ack | replica.apply-delta 0.040ms |
| 91592a221d25ad7c000000000013a937 | 365.794 | 0.032 | n/a | 0.000 | 365.761 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.792 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 91592a221d25ad7c000000000013a938 | 365.778 | 0.019 | n/a | 0.000 | 365.757 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.776 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 91592a221d25ad7c000000000013a939 | 365.772 | 0.017 | n/a | 0.000 | 365.754 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.771 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 91592a221d25ad7c000000000013a93a | 365.772 | 0.017 | n/a | 0.000 | 365.754 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 365.770 | 1.000 | 0.002 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.050ms |
| 91592a221d25ad7c000000000014f940 | 290.669 | 0.013 | n/a | 0.000 | 290.656 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.669 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 91592a221d25ad7c000000000014f93f | 290.664 | 0.014 | n/a | 0.000 | 290.649 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.663 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 91592a221d25ad7c000000000014f93e | 290.653 | 0.014 | n/a | 0.000 | 290.638 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.652 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| 91592a221d25ad7c000000000014f93d | 290.643 | 0.018 | n/a | 0.000 | 290.624 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 290.642 | 1.000 | 0.001 | node-14/thread-5/reader.straddle-await-ack | replica.apply-delta 0.051ms |

## P1 / tail / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.016 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 |
| p99 | 0.068 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d928500c98be9f9f00000000001baaa6 | 0.068 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.068 | 0.000 | 0.000 | 0.068 | uncovered | none observed |
| 91592a221d25ad7c00000000001b3866 | 0.031 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 | uncovered | none observed |
| d928500c98be9f9f00000000001baaa7 | 0.023 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 | uncovered | none observed |
| 91592a221d25ad7c00000000001b3868 | 0.018 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 | uncovered | none observed |
| 91592a221d25ad7c00000000001b3867 | 0.016 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 0.000 | 0.000 | 0.016 | uncovered | none observed |
| d928500c98be9f9f00000000001baaa8 | 0.015 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.015 | 0.000 | 0.000 | 0.015 | uncovered | none observed |
| d928500c98be9f9f00000000001baaaa | 0.014 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.014 | 0.000 | 0.000 | 0.014 | uncovered | none observed |
| d928500c98be9f9f00000000001baaa9 | 0.008 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 0.000 | 0.000 | 0.008 | uncovered | none observed |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.505 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.374 | 200.599 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 |
| p99 | 206.504 | n/a | n/a | n/a | 17.750 | n/a | 1.381 | 0.000 | 5.892 | 205.407 | 0.148 | n/a | 0.179 | 0.000 | n/a | n/a | 31.790 | 17.750 | 0.353 | 31.790 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1987ff240dea0aa60000000000000007 | 206.504 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 205.407 | 0.036 | n/a | 0.104 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 1987ff240dea0aa60000000000000005 | 204.287 | 0.000 | n/a | 0.000 | 0.000 | 2.362 | 201.489 | 0.021 | n/a | 0.179 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-44/journal/page | none observed |
| 1987ff240dea0aa60000000000000f49 | 204.034 | 0.000 | n/a | 0.000 | 0.000 | 0.378 | 203.517 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-68/journal/page | none observed |
| 1987ff240dea0aa60000000000000006 | 203.302 | 0.000 | n/a | 0.000 | 0.000 | 1.245 | 201.610 | 0.013 | n/a | 0.119 | 0.000 | n/a | n/a | 0.315 | 0.000 | 0.000 | 0.315 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa60000000000000f4a | 202.140 | 0.000 | n/a | 0.000 | 0.000 | 1.374 | 200.599 | 0.005 | n/a | 0.017 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-74/journal/page | none observed |
| 1987ff240dea0aa60000000000000f4b | 201.505 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 200.668 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-65/journal/page | none observed |
| 1987ff240dea0aa60000000000000f4e | 72.733 | 16.511 | n/a | 1.105 | 0.000 | 3.960 | 50.983 | 0.004 | n/a | 0.003 | 0.000 | n/a | n/a | 0.166 | 17.616 | 0.242 | 0.166 | gw-r/thread-45/gateway.admitted-work | none observed |
| 045b7414078264f00000000000000002 | 62.686 | 0.000 | n/a | 0.000 | 0.000 | 3.753 | 58.277 | 0.148 | n/a | 0.094 | 0.000 | n/a | n/a | 0.414 | 0.000 | 0.000 | 0.414 | gw-r/thread-42/gateway.admitted-work | none observed |
| 1987ff240dea0aa60000000000000f50 | 53.695 | 15.062 | n/a | 1.381 | 0.000 | 5.462 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.790 | 16.443 | 0.306 | 31.790 | node-14/thread-7/socket.wait-first-byte | none observed |
| 1987ff240dea0aa60000000000000f4f | 50.239 | 17.750 | n/a | 0.000 | 0.000 | 5.892 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.597 | 17.750 | 0.353 | 26.597 | node-14/thread-7/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1007.077 | n/a | n/a | n/a | 0.203 | n/a | 0.000 | 0.000 | 1.494 | 1001.617 | 0.044 | n/a | 0.235 | 0.000 | n/a | n/a | 1.113 | 0.203 | 0.000 | 1.113 |
| p99 | 1013.657 | n/a | n/a | n/a | 18.345 | n/a | 0.000 | 0.000 | 2.086 | 1001.750 | 0.468 | n/a | 0.297 | 0.000 | n/a | n/a | 2.997 | 18.345 | 0.018 | 2.997 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 045b7414078264f00000000000000019 | 1013.657 | 18.345 | n/a | 0.000 | 0.000 | 1.227 | 993.760 | 0.012 | n/a | 0.035 | 0.000 | n/a | n/a | 0.278 | 18.345 | 0.018 | 0.278 | gw-r/thread-46/journal/page | none observed |
| 045b7414078264f00000000000000017 | 1007.077 | 0.203 | n/a | 0.000 | 0.000 | 1.494 | 1001.617 | 0.468 | n/a | 0.297 | 0.000 | n/a | n/a | 2.997 | 0.203 | 0.000 | 2.997 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f00000000000000018 | 1005.415 | 0.187 | n/a | 0.000 | 0.000 | 2.086 | 1001.750 | 0.044 | n/a | 0.235 | 0.000 | n/a | n/a | 1.113 | 0.187 | 0.000 | 1.113 | gw-r/thread-42/journal/page | none observed |

## P3 / warmup / internal (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 429.604 | n/a | n/a | n/a | 4.178 | n/a | 0.000 | 0.000 | 1.321 | 419.615 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.100 | 4.178 | 0.009 | 0.100 |
| p99 | 1004.452 | n/a | n/a | n/a | 11.473 | n/a | 0.000 | 0.000 | 8.794 | 999.467 | 0.136 | n/a | 3.508 | 0.000 | n/a | n/a | 10.100 | 11.473 | 0.195 | 10.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 045b7414078264f0000000000000002e | 1004.452 | 5.136 | n/a | 0.000 | 0.000 | 4.852 | 994.273 | 0.011 | n/a | 0.065 | 0.000 | n/a | n/a | 0.116 | 5.136 | 0.005 | 0.116 | gw-r/thread-70/journal/page | none observed |
| 045b7414078264f0000000000000002f | 1004.195 | 4.937 | n/a | 0.000 | 0.000 | 1.062 | 997.970 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.129 | 4.937 | 0.005 | 0.129 | gw-r/thread-66/journal/page | none observed |
| 045b7414078264f00000000000000028 | 1002.793 | 6.179 | n/a | 0.000 | 0.000 | 0.809 | 995.572 | 0.016 | n/a | 0.134 | 0.000 | n/a | n/a | 0.082 | 6.179 | 0.006 | 0.082 | gw-r/thread-69/journal/page | none observed |
| 045b7414078264f00000000000000043 | 1002.433 | 2.226 | n/a | 0.000 | 0.000 | 0.566 | 999.467 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.089 | 2.226 | 0.002 | 0.089 | gw-r/thread-63/journal/page | none observed |
| 045b7414078264f00000000000000022 | 987.243 | 2.545 | n/a | 0.000 | 0.000 | 0.956 | 983.561 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.083 | 2.545 | 0.003 | 0.083 | gw-r/thread-47/journal/page | none observed |
| 045b7414078264f0000000000000001f | 894.874 | 4.672 | n/a | 0.000 | 0.000 | 6.211 | 883.310 | 0.010 | n/a | 0.119 | 0.000 | n/a | n/a | 0.553 | 4.672 | 0.005 | 0.553 | gw-r/thread-49/journal/page | none observed |
| 045b7414078264f0000000000000001c | 857.449 | 2.209 | n/a | 0.000 | 0.000 | 1.321 | 853.731 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.093 | 2.209 | 0.003 | 0.093 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f00000000000000035 | 843.723 | 8.798 | n/a | 0.000 | 0.000 | 0.612 | 831.869 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 2.352 | 8.798 | 0.010 | 2.352 | gw-r/thread-69/journal/page | none observed |
| 045b7414078264f0000000000000003e | 700.735 | 2.376 | n/a | 0.000 | 0.000 | 2.071 | 696.120 | 0.009 | n/a | 0.062 | 0.000 | n/a | n/a | 0.096 | 2.376 | 0.003 | 0.096 | gw-r/thread-66/journal/page | none observed |
| 045b7414078264f00000000000000027 | 606.807 | 2.305 | n/a | 0.000 | 0.000 | 0.483 | 603.826 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.088 | 2.305 | 0.004 | 0.088 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f0000000000000003c | 567.720 | 11.473 | n/a | 0.000 | 0.000 | 2.384 | 553.680 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.076 | 11.473 | 0.020 | 0.076 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f00000000000000033 | 535.932 | 5.064 | n/a | 0.000 | 0.000 | 5.806 | 524.767 | 0.101 | n/a | 0.085 | 0.000 | n/a | n/a | 0.109 | 5.064 | 0.009 | 0.109 | gw-r/thread-42/journal/page | none observed |
| 045b7414078264f0000000000000003a | 522.366 | 2.276 | n/a | 0.000 | 0.000 | 8.581 | 511.297 | 0.020 | n/a | 0.116 | 0.000 | n/a | n/a | 0.077 | 2.276 | 0.004 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 045b7414078264f00000000000000038 | 480.161 | 1.941 | n/a | 0.000 | 0.000 | 8.794 | 465.822 | 0.010 | n/a | 3.508 | 0.000 | n/a | n/a | 0.086 | 1.941 | 0.004 | 0.086 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f0000000000000002b | 429.604 | 8.203 | n/a | 0.000 | 0.000 | 5.546 | 415.586 | 0.012 | n/a | 0.078 | 0.000 | n/a | n/a | 0.177 | 8.203 | 0.019 | 0.177 | gw-r/thread-67/journal/page | none observed |
| 045b7414078264f0000000000000003b | 423.968 | 3.395 | n/a | 0.000 | 0.000 | 0.784 | 419.615 | 0.010 | n/a | 0.081 | 0.000 | n/a | n/a | 0.084 | 3.395 | 0.008 | 0.084 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f0000000000000001b | 343.598 | 8.426 | n/a | 0.000 | 0.000 | 4.812 | 330.065 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.181 | 8.426 | 0.025 | 0.181 | gw-r/thread-47/journal/page | none observed |
| 045b7414078264f00000000000000024 | 311.134 | 6.489 | n/a | 0.000 | 0.000 | 2.919 | 301.534 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.091 | 6.489 | 0.021 | 0.091 | gw-r/thread-46/journal/page | none observed |
| 045b7414078264f00000000000000029 | 300.827 | 10.217 | n/a | 0.000 | 0.000 | 0.648 | 289.630 | 0.018 | n/a | 0.120 | 0.000 | n/a | n/a | 0.194 | 10.217 | 0.034 | 0.194 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f0000000000000003f | 274.736 | 1.846 | n/a | 0.000 | 0.000 | 0.912 | 271.791 | 0.012 | n/a | 0.090 | 0.000 | n/a | n/a | 0.085 | 1.846 | 0.007 | 0.085 | gw-r/thread-62/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 447.189 | n/a | n/a | n/a | 2.466 | n/a | 0.000 | 0.000 | 0.675 | 443.803 | 0.011 | n/a | 0.076 | 0.000 | n/a | n/a | 0.105 | 2.466 | 0.010 | 0.105 |
| p99 | 1005.373 | n/a | n/a | n/a | 11.095 | n/a | 0.000 | 0.000 | 6.208 | 1001.361 | 0.207 | n/a | 0.190 | 0.000 | n/a | n/a | 46.386 | 11.095 | 0.580 | 46.386 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 045b7414078264f00000000000000082 | 1005.373 | 0.128 | n/a | 0.000 | 0.000 | 3.292 | 1000.760 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 1.123 | 0.128 | 0.000 | 1.123 | gw-r/thread-47/journal/page | none observed |
| 045b7414078264f00000000000000052 | 1005.167 | 0.119 | n/a | 0.000 | 0.000 | 2.542 | 1001.269 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 1.103 | 0.119 | 0.000 | 1.103 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f00000000000000071 | 1003.781 | 0.172 | n/a | 0.000 | 0.000 | 1.231 | 1001.144 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 1.139 | 0.172 | 0.000 | 1.139 | gw-r/thread-68/journal/page | none observed |
| 045b7414078264f00000000000000079 | 1003.486 | 0.119 | n/a | 0.000 | 0.000 | 0.801 | 1001.361 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 1.098 | 0.119 | 0.000 | 1.098 | gw-r/thread-49/journal/page | none observed |
| 045b7414078264f00000000000000045 | 1001.410 | 2.500 | n/a | 0.000 | 0.000 | 0.595 | 998.126 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.089 | 2.500 | 0.002 | 0.089 | gw-r/thread-70/journal/page | none observed |
| 045b7414078264f0000000000000004c | 999.142 | 2.188 | n/a | 0.000 | 0.000 | 1.148 | 995.641 | 0.011 | n/a | 0.082 | 0.000 | n/a | n/a | 0.072 | 2.188 | 0.002 | 0.072 | gw-r/thread-70/journal/page | none observed |
| 045b7414078264f0000000000000004b | 994.466 | 2.314 | n/a | 0.000 | 0.000 | 0.593 | 991.392 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.073 | 2.314 | 0.002 | 0.073 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f00000000000000044 | 993.977 | 3.017 | n/a | 0.000 | 0.000 | 1.553 | 989.127 | 0.009 | n/a | 0.190 | 0.000 | n/a | n/a | 0.082 | 3.017 | 0.003 | 0.082 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f00000000000000051 | 988.461 | 2.062 | n/a | 0.000 | 0.000 | 0.432 | 985.818 | 0.012 | n/a | 0.064 | 0.000 | n/a | n/a | 0.073 | 2.062 | 0.002 | 0.073 | gw-r/thread-64/journal/page | none observed |
| 045b7414078264f00000000000000074 | 969.017 | 2.931 | n/a | 0.000 | 0.000 | 0.769 | 965.117 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.113 | 2.931 | 0.003 | 0.113 | gw-r/thread-63/journal/page | none observed |
| 045b7414078264f00000000000000050 | 859.914 | 2.076 | n/a | 0.000 | 0.000 | 0.619 | 857.045 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.075 | 2.076 | 0.002 | 0.075 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f00000000000000076 | 841.020 | 2.105 | n/a | 0.000 | 0.000 | 0.947 | 837.810 | 0.013 | n/a | 0.077 | 0.000 | n/a | n/a | 0.068 | 2.105 | 0.003 | 0.068 | gw-r/thread-64/journal/page | none observed |
| 045b7414078264f00000000000000058 | 746.296 | 2.244 | n/a | 0.000 | 0.000 | 3.346 | 740.549 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.081 | 2.244 | 0.003 | 0.081 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f0000000000000005e | 665.844 | 3.570 | n/a | 0.000 | 0.000 | 3.415 | 658.527 | 0.024 | n/a | 0.160 | 0.000 | n/a | n/a | 0.148 | 3.570 | 0.005 | 0.148 | gw-r/thread-61/journal/page | none observed |
| 045b7414078264f0000000000000006e | 641.290 | 5.054 | n/a | 0.000 | 0.000 | 0.835 | 635.221 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.079 | 5.054 | 0.008 | 0.079 | gw-r/thread-42/journal/page | none observed |
| 045b7414078264f0000000000000004f | 599.276 | 2.821 | n/a | 0.000 | 0.000 | 0.810 | 595.484 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.074 | 2.821 | 0.005 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 045b7414078264f0000000000000004d | 573.027 | 6.120 | n/a | 0.000 | 0.000 | 2.494 | 564.178 | 0.016 | n/a | 0.118 | 0.000 | n/a | n/a | 0.101 | 6.120 | 0.011 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f0000000000000005b | 557.718 | 2.207 | n/a | 0.000 | 0.000 | 0.503 | 554.852 | 0.015 | n/a | 0.065 | 0.000 | n/a | n/a | 0.076 | 2.207 | 0.004 | 0.076 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f0000000000000007c | 507.887 | 11.095 | n/a | 0.000 | 0.000 | 0.772 | 495.730 | 0.021 | n/a | 0.112 | 0.000 | n/a | n/a | 0.156 | 11.095 | 0.022 | 0.156 | gw-r/thread-42/journal/page | none observed |
| 045b7414078264f00000000000000046 | 478.456 | 3.911 | n/a | 0.000 | 0.000 | 2.291 | 472.017 | 0.013 | n/a | 0.079 | 0.000 | n/a | n/a | 0.146 | 3.911 | 0.008 | 0.146 | gw-r/thread-61/journal/page | none observed |

## P3 / L4 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 379.013 | n/a | n/a | n/a | 2.313 | n/a | 0.000 | 0.000 | 0.944 | 367.930 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.092 | 2.313 | 0.009 | 0.092 |
| p99 | 1006.552 | n/a | n/a | n/a | 8.897 | n/a | 0.000 | 0.000 | 8.620 | 1003.608 | 3.648 | n/a | 1.040 | 0.000 | n/a | n/a | 47.099 | 8.897 | 0.166 | 47.099 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 045b7414078264f0000000000000009d | 1006.552 | 0.108 | n/a | 0.000 | 0.000 | 1.823 | 1001.079 | 0.019 | n/a | 0.140 | 0.000 | n/a | n/a | 3.382 | 0.108 | 0.000 | 3.382 | gw-r/thread-63/journal/page | none observed |
| 045b7414078264f0000000000000008a | 1006.518 | 0.117 | n/a | 0.000 | 0.000 | 3.694 | 1001.436 | 0.021 | n/a | 0.147 | 0.000 | n/a | n/a | 1.104 | 0.117 | 0.000 | 1.104 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f000000000000000a2 | 1006.336 | 2.042 | n/a | 0.000 | 0.000 | 0.553 | 1003.608 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.061 | 2.042 | 0.002 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f00000000000000093 | 1003.935 | 0.207 | n/a | 0.000 | 0.000 | 0.653 | 1001.482 | 0.035 | n/a | 0.125 | 0.000 | n/a | n/a | 1.432 | 0.207 | 0.000 | 1.432 | gw-r/thread-61/journal/page | none observed |
| 045b7414078264f000000000000000af | 1002.894 | 2.379 | n/a | 0.000 | 0.000 | 0.663 | 999.733 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.061 | 2.379 | 0.002 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f000000000000000a3 | 974.407 | 2.164 | n/a | 0.000 | 0.000 | 0.929 | 971.175 | 0.026 | n/a | 0.053 | 0.000 | n/a | n/a | 0.060 | 2.164 | 0.002 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f000000000000000b8 | 909.966 | 4.009 | n/a | 0.000 | 0.000 | 0.464 | 905.380 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.085 | 4.009 | 0.004 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f00000000000000087 | 877.553 | 1.993 | n/a | 0.000 | 0.000 | 1.170 | 874.225 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.071 | 1.993 | 0.002 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 045b7414078264f0000000000000009f | 763.275 | 4.316 | n/a | 0.000 | 0.000 | 1.751 | 757.060 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.094 | 4.316 | 0.006 | 0.094 | gw-r/thread-42/journal/page | none observed |
| 045b7414078264f00000000000000084 | 732.937 | 2.072 | n/a | 0.000 | 0.000 | 0.582 | 730.138 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.062 | 2.072 | 0.003 | 0.062 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f000000000000000ac | 717.806 | 2.059 | n/a | 0.000 | 0.000 | 3.042 | 712.569 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.069 | 2.059 | 0.003 | 0.069 | gw-r/thread-69/journal/page | none observed |
| 045b7414078264f00000000000000095 | 710.871 | 1.807 | n/a | 0.000 | 0.000 | 1.369 | 707.492 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.076 | 1.807 | 0.003 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f000000000000000bf | 694.177 | 2.298 | n/a | 0.000 | 0.000 | 3.081 | 688.707 | 0.002 | n/a | 0.026 | 0.000 | n/a | n/a | 0.062 | 2.298 | 0.003 | 0.062 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f000000000000000ab | 680.504 | 5.314 | n/a | 0.000 | 0.000 | 0.389 | 674.666 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.092 | 5.314 | 0.008 | 0.092 | gw-r/thread-64/journal/page | none observed |
| 045b7414078264f000000000000000b5 | 668.695 | 2.278 | n/a | 0.000 | 0.000 | 0.944 | 665.344 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.056 | 2.278 | 0.003 | 0.056 | gw-r/thread-64/journal/page | none observed |
| 045b7414078264f000000000000000b9 | 668.236 | 6.777 | n/a | 0.000 | 0.000 | 0.869 | 660.387 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.154 | 6.777 | 0.010 | 0.154 | gw-r/thread-46/journal/page | none observed |
| 045b7414078264f0000000000000009c | 617.527 | 2.074 | n/a | 0.000 | 0.000 | 4.773 | 610.505 | 0.010 | n/a | 0.088 | 0.000 | n/a | n/a | 0.077 | 2.074 | 0.003 | 0.077 | gw-r/thread-61/journal/page | none observed |
| 045b7414078264f000000000000000b0 | 611.772 | 8.897 | n/a | 0.000 | 0.000 | 1.227 | 601.460 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.135 | 8.897 | 0.015 | 0.135 | gw-r/thread-44/journal/page | none observed |
| 045b7414078264f000000000000000a6 | 585.174 | 2.033 | n/a | 0.000 | 0.000 | 0.800 | 582.221 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.068 | 2.033 | 0.003 | 0.068 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f000000000000000a4 | 417.104 | 1.936 | n/a | 0.000 | 0.000 | 0.580 | 414.446 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.062 | 1.936 | 0.005 | 0.062 | gw-r/thread-69/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 413.629 | n/a | n/a | n/a | 2.244 | n/a | 0.000 | 0.000 | 0.969 | 410.530 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.069 | 2.244 | 0.007 | 0.069 |
| p99 | 1010.617 | n/a | n/a | n/a | 18.710 | n/a | 0.525 | 0.000 | 10.598 | 1004.549 | 0.021 | n/a | 1.920 | 0.000 | n/a | n/a | 50.351 | 18.710 | 0.398 | 50.351 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 045b7414078264f000000000000000dc | 1010.617 | 0.185 | n/a | 0.000 | 0.000 | 1.487 | 1002.387 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 6.465 | 0.185 | 0.000 | 6.465 | gw-r/thread-64/journal/page | none observed |
| 045b7414078264f000000000000000e6 | 1010.030 | 2.779 | n/a | 0.000 | 0.000 | 2.514 | 1004.549 | 0.012 | n/a | 0.054 | 0.000 | n/a | n/a | 0.121 | 2.779 | 0.003 | 0.121 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f000000000000000f6 | 1003.605 | 0.110 | n/a | 0.000 | 0.000 | 0.500 | 1001.819 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 1.096 | 0.110 | 0.000 | 1.096 | gw-r/thread-44/journal/page | none observed |
| 045b7414078264f000000000000000cb | 1002.899 | 0.123 | n/a | 0.000 | 0.000 | 0.801 | 1000.798 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 1.106 | 0.123 | 0.000 | 1.106 | gw-r/thread-63/journal/page | none observed |
| 045b7414078264f000000000000000fd | 991.066 | 5.239 | n/a | 0.000 | 0.000 | 0.734 | 984.927 | 0.004 | n/a | 0.093 | 0.000 | n/a | n/a | 0.069 | 5.239 | 0.005 | 0.069 | gw-r/thread-70/journal/page | none observed |
| 045b7414078264f000000000000000fe | 986.387 | 4.448 | n/a | 0.000 | 0.000 | 2.129 | 979.607 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.127 | 4.448 | 0.005 | 0.127 | gw-r/thread-69/journal/page | none observed |
| 045b7414078264f000000000000000ec | 903.528 | 2.115 | n/a | 0.000 | 0.000 | 10.598 | 890.693 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.063 | 2.115 | 0.002 | 0.063 | gw-r/thread-68/journal/page | none observed |
| 045b7414078264f000000000000000cd | 775.658 | 1.825 | n/a | 0.000 | 0.000 | 0.690 | 773.033 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.059 | 1.825 | 0.002 | 0.059 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f000000000000000f2 | 722.920 | 2.349 | n/a | 0.000 | 0.000 | 0.969 | 719.492 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.066 | 2.349 | 0.003 | 0.066 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f000000000000000d2 | 715.917 | 4.395 | n/a | 0.000 | 0.000 | 0.843 | 710.480 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.145 | 4.395 | 0.006 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 045b7414078264f000000000000000c6 | 663.498 | 6.148 | n/a | 0.000 | 0.000 | 7.888 | 649.338 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.071 | 6.148 | 0.009 | 0.071 | gw-r/thread-44/journal/page | none observed |
| 045b7414078264f000000000000000e5 | 590.325 | 2.179 | n/a | 0.000 | 0.000 | 6.474 | 581.563 | 0.004 | n/a | 0.045 | 0.000 | n/a | n/a | 0.060 | 2.179 | 0.004 | 0.060 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f000000000000000fc | 585.737 | 18.710 | n/a | 0.000 | 0.000 | 4.494 | 562.399 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.069 | 18.710 | 0.032 | 0.069 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f000000000000000de | 563.328 | 5.230 | n/a | 0.525 | 0.000 | 0.699 | 556.727 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.096 | 5.755 | 0.010 | 0.096 | gw-r/thread-68/journal/page | none observed |
| 045b7414078264f00000000000000100 | 538.809 | 2.179 | n/a | 0.000 | 0.000 | 3.919 | 532.588 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.064 | 2.179 | 0.004 | 0.064 | gw-r/thread-46/journal/page | none observed |
| 045b7414078264f000000000000000ef | 533.993 | 2.192 | n/a | 0.000 | 0.000 | 1.936 | 527.879 | 0.006 | n/a | 1.920 | 0.000 | n/a | n/a | 0.061 | 2.192 | 0.004 | 0.061 | gw-r/thread-44/journal/page | none observed |
| 045b7414078264f000000000000000f4 | 523.155 | 2.202 | n/a | 0.000 | 0.000 | 1.114 | 519.739 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.059 | 2.202 | 0.004 | 0.059 | gw-r/thread-66/journal/page | none observed |
| 045b7414078264f000000000000000e9 | 518.364 | 4.083 | n/a | 0.000 | 0.000 | 0.727 | 513.466 | 0.002 | n/a | 0.026 | 0.000 | n/a | n/a | 0.061 | 4.083 | 0.008 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 045b7414078264f000000000000000f3 | 474.371 | 1.870 | n/a | 0.000 | 0.000 | 1.416 | 470.955 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.072 | 1.870 | 0.004 | 0.072 | gw-r/thread-67/journal/page | none observed |
| 045b7414078264f000000000000000ff | 473.634 | 2.643 | n/a | 0.000 | 0.000 | 0.849 | 470.013 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.076 | 2.643 | 0.006 | 0.076 | gw-r/thread-66/journal/page | none observed |

## P3 / tail / internal (3103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.539 | n/a | n/a | n/a | 4.064 | n/a | 0.000 | 0.000 | 0.236 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.707 | 4.088 | 0.344 | 5.707 |
| p99 | 810.436 | n/a | n/a | n/a | 18.207 | n/a | 1.441 | 0.000 | 1.537 | 806.146 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 46.614 | 19.157 | 0.844 | 46.614 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 045b7414078264f00000000000001a31 | 1004.941 | 0.114 | n/a | 0.000 | 0.000 | 0.607 | 1003.095 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 1.090 | 0.114 | 0.000 | 1.090 | gw-r/thread-42/journal/page | none observed |
| 045b7414078264f00000000000000102 | 1004.602 | 3.347 | n/a | 0.000 | 0.000 | 0.692 | 1000.466 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.061 | 3.347 | 0.003 | 0.061 | gw-r/thread-68/journal/page | none observed |
| 045b7414078264f0000000000000018d | 1003.917 | 2.321 | n/a | 0.000 | 0.000 | 0.429 | 1001.066 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.062 | 2.321 | 0.002 | 0.062 | gw-r/thread-66/journal/page | none observed |
| 045b7414078264f00000000000000174 | 1003.868 | 0.110 | n/a | 0.000 | 0.000 | 0.712 | 1001.885 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 1.092 | 0.110 | 0.000 | 1.092 | gw-r/thread-44/journal/page | none observed |
| 045b7414078264f000000000000019e5 | 1003.785 | 2.380 | n/a | 0.000 | 0.000 | 0.444 | 1000.864 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.062 | 2.380 | 0.002 | 0.062 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f0000000000000018e | 1002.790 | 2.274 | n/a | 0.000 | 0.000 | 0.520 | 999.891 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.064 | 2.274 | 0.002 | 0.064 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f000000000000019e9 | 1002.384 | 0.111 | n/a | 0.000 | 0.000 | 0.449 | 1000.673 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 1.106 | 0.111 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f00000000000000189 | 1000.646 | 2.473 | n/a | 0.000 | 0.000 | 0.476 | 997.597 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.070 | 2.473 | 0.002 | 0.070 | gw-r/thread-65/journal/page | none observed |
| 045b7414078264f0000000000000013b | 999.739 | 1.970 | n/a | 0.000 | 0.000 | 0.314 | 997.322 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.056 | 1.970 | 0.002 | 0.056 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f00000000000000188 | 999.282 | 3.965 | n/a | 0.659 | 0.000 | 0.380 | 994.118 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.124 | 4.624 | 0.005 | 0.124 | gw-r/thread-69/journal/page | none observed |
| 045b7414078264f0000000000000013a | 998.429 | 2.772 | n/a | 0.000 | 0.000 | 0.619 | 994.930 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.068 | 2.772 | 0.003 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f0000000000000019a | 997.638 | 2.356 | n/a | 0.398 | 0.000 | 0.533 | 994.189 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.093 | 2.754 | 0.003 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f0000000000000011e | 994.350 | 2.429 | n/a | 0.000 | 0.000 | 1.725 | 990.077 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.055 | 2.429 | 0.002 | 0.055 | gw-r/thread-48/journal/page | none observed |
| 045b7414078264f00000000000001a2d | 994.246 | 2.288 | n/a | 0.000 | 0.000 | 0.453 | 991.393 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.074 | 2.288 | 0.002 | 0.074 | gw-r/thread-68/journal/page | none observed |
| 045b7414078264f0000000000000011d | 988.162 | 2.250 | n/a | 0.000 | 0.000 | 0.786 | 985.006 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.059 | 2.250 | 0.002 | 0.059 | gw-r/thread-61/journal/page | none observed |
| 045b7414078264f00000000000000160 | 979.419 | 6.475 | n/a | 1.847 | 0.000 | 0.438 | 970.429 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.172 | 8.322 | 0.008 | 0.172 | gw-r/thread-60/journal/page | none observed |
| 045b7414078264f000000000000019ee | 960.071 | 2.602 | n/a | 0.000 | 0.000 | 0.376 | 956.967 | 0.010 | n/a | 0.049 | 0.000 | n/a | n/a | 0.068 | 2.602 | 0.003 | 0.068 | gw-r/thread-61/journal/page | none observed |
| 045b7414078264f00000000000000111 | 953.791 | 2.659 | n/a | 0.000 | 0.000 | 0.614 | 950.423 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.061 | 2.659 | 0.003 | 0.061 | gw-r/thread-45/journal/page | none observed |
| 045b7414078264f000000000000019e6 | 950.333 | 9.822 | n/a | 0.819 | 0.000 | 0.458 | 938.799 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.400 | 10.641 | 0.011 | 0.400 | gw-r/thread-62/journal/page | none observed |
| 045b7414078264f00000000000001a08 | 943.011 | 3.275 | n/a | 0.000 | 0.000 | 0.487 | 939.174 | 0.002 | n/a | 0.007 | 0.000 | n/a | n/a | 0.066 | 3.275 | 0.003 | 0.066 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.621 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.165 | 201.125 | 0.013 | n/a | 0.134 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 221.122 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 19.571 | 214.270 | 5.441 | n/a | 1.870 | 0.000 | n/a | n/a | 0.403 | 0.000 | 0.000 | 0.403 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1987ff240dea0aa6000000000000000b | 221.122 | 0.000 | n/a | 0.000 | 0.000 | 19.571 | 201.210 | 0.020 | n/a | 0.201 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-44/journal/page | none observed |
| 1987ff240dea0aa60000000000000030 | 215.912 | 0.000 | n/a | 0.000 | 0.000 | 14.775 | 200.867 | 0.014 | n/a | 0.125 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 1987ff240dea0aa60000000000000053 | 215.588 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 214.270 | 0.021 | n/a | 0.218 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-64/journal/page | none observed |
| 1987ff240dea0aa60000000000000008 | 208.591 | 0.000 | n/a | 0.000 | 0.000 | 7.386 | 200.857 | 0.013 | n/a | 0.137 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-44/journal/page | none observed |
| 1987ff240dea0aa60000000000000044 | 208.262 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 206.683 | 0.035 | n/a | 0.276 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa6000000000000000d | 208.238 | 0.000 | n/a | 0.000 | 0.000 | 6.458 | 201.453 | 0.012 | n/a | 0.151 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa60000000000000018 | 207.924 | 0.000 | n/a | 0.000 | 0.000 | 1.395 | 206.187 | 0.021 | n/a | 0.167 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa60000000000000026 | 207.497 | 0.000 | n/a | 0.000 | 0.000 | 1.248 | 205.980 | 0.014 | n/a | 0.162 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-62/journal/page | none observed |
| 1987ff240dea0aa6000000000000002e | 207.031 | 0.000 | n/a | 0.000 | 0.000 | 0.976 | 205.798 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| 1987ff240dea0aa6000000000000004c | 206.558 | 0.000 | n/a | 0.000 | 0.000 | 3.082 | 203.109 | 0.056 | n/a | 0.149 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-61/journal/page | none observed |
| 1987ff240dea0aa60000000000000015 | 206.188 | 0.000 | n/a | 0.000 | 0.000 | 1.132 | 204.791 | 0.016 | n/a | 0.140 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-61/journal/page | none observed |
| 1987ff240dea0aa60000000000000012 | 205.772 | 0.000 | n/a | 0.000 | 0.000 | 3.925 | 201.372 | 0.014 | n/a | 0.236 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-68/journal/page | none observed |
| 1987ff240dea0aa6000000000000004b | 205.755 | 0.000 | n/a | 0.000 | 0.000 | 2.122 | 203.436 | 0.013 | n/a | 0.085 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-69/journal/page | none observed |
| 1987ff240dea0aa6000000000000002c | 205.739 | 0.000 | n/a | 0.000 | 0.000 | 4.693 | 200.796 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-61/journal/page | none observed |
| 1987ff240dea0aa6000000000000001a | 205.298 | 0.000 | n/a | 0.000 | 0.000 | 3.923 | 201.141 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-63/journal/page | none observed |
| 1987ff240dea0aa60000000000000025 | 205.262 | 0.000 | n/a | 0.000 | 0.000 | 4.120 | 200.907 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa6000000000000000e | 205.074 | 0.000 | n/a | 0.000 | 0.000 | 2.913 | 201.863 | 0.023 | n/a | 0.182 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |
| 1987ff240dea0aa60000000000000058 | 204.929 | 0.000 | n/a | 0.000 | 0.000 | 3.608 | 201.049 | 0.021 | n/a | 0.152 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-69/journal/page | none observed |
| 1987ff240dea0aa6000000000000003f | 204.376 | 0.000 | n/a | 0.000 | 0.000 | 3.102 | 201.030 | 0.011 | n/a | 0.137 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa60000000000000014 | 203.831 | 0.000 | n/a | 0.000 | 0.000 | 1.302 | 202.162 | 0.024 | n/a | 0.211 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.980 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.896 | 0.013 | n/a | 0.107 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 217.926 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 7.365 | 216.494 | 14.735 | n/a | 2.993 | 0.000 | n/a | n/a | 0.226 | 0.000 | 0.000 | 0.226 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1987ff240dea0aa60000000000000079 | 217.926 | 0.000 | n/a | 0.000 | 0.000 | 1.126 | 216.494 | 0.046 | n/a | 0.110 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-65/journal/page | none observed |
| 1987ff240dea0aa60000000000000085 | 210.924 | 0.000 | n/a | 0.000 | 0.000 | 6.370 | 204.327 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-46/journal/page | none observed |
| 1987ff240dea0aa60000000000000066 | 206.441 | 0.000 | n/a | 0.000 | 0.000 | 1.629 | 204.507 | 0.021 | n/a | 0.189 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa60000000000000081 | 206.156 | 0.000 | n/a | 0.000 | 0.000 | 4.230 | 201.618 | 0.020 | n/a | 0.172 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa600000000000000ba | 205.351 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.111 | 0.028 | n/a | 2.993 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa60000000000000087 | 205.189 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 204.009 | 0.030 | n/a | 0.273 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-42/journal/page | none observed |
| 1987ff240dea0aa6000000000000007a | 205.122 | 0.000 | n/a | 0.000 | 0.000 | 3.426 | 201.393 | 0.012 | n/a | 0.143 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 1987ff240dea0aa60000000000000072 | 204.616 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 203.660 | 0.011 | n/a | 0.121 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-68/journal/page | none observed |
| 1987ff240dea0aa60000000000000086 | 204.533 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 203.270 | 0.029 | n/a | 0.213 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 1987ff240dea0aa6000000000000005b | 204.383 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 203.393 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.162 | 0.000 | 0.000 | 0.162 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa6000000000000009d | 204.199 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 203.370 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa60000000000000060 | 204.184 | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 203.399 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-62/journal/page | none observed |
| 1987ff240dea0aa6000000000000007d | 203.736 | 0.000 | n/a | 0.000 | 0.000 | 1.720 | 201.783 | 0.016 | n/a | 0.121 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-69/journal/page | none observed |
| 1987ff240dea0aa600000000000000b4 | 203.506 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 202.550 | 0.028 | n/a | 0.142 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 1987ff240dea0aa600000000000000ad | 203.487 | 0.000 | n/a | 0.000 | 0.000 | 1.304 | 201.822 | 0.021 | n/a | 0.149 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa60000000000000093 | 203.387 | 0.000 | n/a | 0.000 | 0.000 | 1.588 | 201.562 | 0.018 | n/a | 0.130 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 1987ff240dea0aa60000000000000097 | 203.314 | 0.000 | n/a | 0.000 | 0.000 | 1.454 | 201.621 | 0.013 | n/a | 0.113 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa60000000000000083 | 203.229 | 0.000 | n/a | 0.000 | 0.000 | 1.412 | 201.536 | 0.023 | n/a | 0.141 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa600000000000000a7 | 203.171 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 202.331 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-64/journal/page | none observed |
| 1987ff240dea0aa6000000000000007c | 203.155 | 0.000 | n/a | 0.000 | 0.000 | 1.359 | 201.518 | 0.023 | n/a | 0.091 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-63/journal/page | none observed |

## P3 / L4 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.980 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.880 | 200.852 | 0.011 | n/a | 0.075 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 |
| p99 | 214.045 | n/a | n/a | n/a | 3.233 | n/a | 0.000 | 0.000 | 9.223 | 206.541 | 10.355 | n/a | 3.657 | 0.000 | n/a | n/a | 50.288 | 3.233 | 0.020 | 50.288 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1987ff240dea0aa6000000000000012a | 214.045 | 0.000 | n/a | 0.000 | 0.000 | 7.313 | 206.541 | 0.017 | n/a | 0.060 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa600000000000000de | 212.926 | 0.000 | n/a | 0.000 | 0.000 | 9.069 | 203.550 | 0.049 | n/a | 0.159 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| 1987ff240dea0aa60000000000000102 | 210.946 | 0.000 | n/a | 0.000 | 0.000 | 6.132 | 204.595 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa600000000000000c5 | 210.435 | 0.000 | n/a | 0.000 | 0.000 | 9.223 | 200.918 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa6000000000000011d | 208.714 | 0.000 | n/a | 0.000 | 0.000 | 7.270 | 201.207 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-62/journal/page | none observed |
| 1987ff240dea0aa600000000000000dd | 207.674 | 0.000 | n/a | 0.000 | 0.000 | 2.284 | 201.490 | 0.072 | n/a | 3.657 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa600000000000000e9 | 207.259 | 0.000 | n/a | 0.000 | 0.000 | 5.405 | 201.656 | 0.009 | n/a | 0.084 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa600000000000000fd | 206.252 | 0.000 | n/a | 0.000 | 0.000 | 4.252 | 200.819 | 0.007 | n/a | 0.083 | 0.000 | n/a | n/a | 1.092 | 0.000 | 0.000 | 1.092 | gw-r/thread-63/journal/page | none observed |
| 1987ff240dea0aa600000000000000d2 | 205.593 | 0.000 | n/a | 0.000 | 0.000 | 3.296 | 201.948 | 0.035 | n/a | 0.174 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-49/journal/page | none observed |
| 1987ff240dea0aa600000000000000fb | 205.365 | 0.000 | n/a | 0.000 | 0.000 | 4.351 | 200.774 | 0.013 | n/a | 0.075 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-65/journal/page | none observed |
| 1987ff240dea0aa600000000000000dc | 205.335 | 0.000 | n/a | 0.000 | 0.000 | 2.513 | 202.611 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 1987ff240dea0aa600000000000000e2 | 204.785 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 203.669 | 0.019 | n/a | 0.135 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-63/journal/page | none observed |
| 1987ff240dea0aa600000000000000cb | 204.625 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 203.861 | 0.033 | n/a | 0.108 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa600000000000000ca | 204.387 | 0.000 | n/a | 0.000 | 0.000 | 3.065 | 201.104 | 0.012 | n/a | 0.112 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-63/journal/page | none observed |
| 1987ff240dea0aa600000000000000f2 | 204.348 | 0.000 | n/a | 0.000 | 0.000 | 0.869 | 203.294 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 1987ff240dea0aa6000000000000010c | 204.184 | 0.000 | n/a | 0.000 | 0.000 | 3.343 | 200.680 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-42/journal/page | none observed |
| 1987ff240dea0aa6000000000000011e | 204.124 | 0.000 | n/a | 0.000 | 0.000 | 3.185 | 200.772 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-44/journal/page | none observed |
| 1987ff240dea0aa60000000000000112 | 203.487 | 0.000 | n/a | 0.000 | 0.000 | 1.700 | 201.604 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-61/journal/page | none observed |
| 1987ff240dea0aa60000000000000105 | 203.315 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 201.027 | 0.015 | n/a | 1.613 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 1987ff240dea0aa600000000000000f5 | 203.098 | 0.000 | n/a | 0.000 | 0.000 | 6.685 | 192.242 | 4.053 | n/a | 0.019 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-67/journal/page | none observed |

## P3 / L16 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.734 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 200.774 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 |
| p99 | 209.766 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.906 | 208.955 | 6.086 | n/a | 0.392 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1987ff240dea0aa60000000000000142 | 209.766 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 208.955 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 1987ff240dea0aa6000000000000013a | 208.338 | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 207.642 | 0.005 | n/a | 0.078 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-69/journal/page | none observed |
| 1987ff240dea0aa6000000000000016f | 207.978 | 0.000 | n/a | 0.000 | 0.000 | 6.906 | 200.907 | 0.005 | n/a | 0.065 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-61/journal/page | none observed |
| 1987ff240dea0aa60000000000000161 | 207.879 | 0.000 | n/a | 0.000 | 0.000 | 6.321 | 201.194 | 0.009 | n/a | 0.092 | 0.000 | n/a | n/a | 0.263 | 0.000 | 0.000 | 0.263 | gw-r/thread-47/journal/page | none observed |
| 1987ff240dea0aa60000000000000155 | 207.768 | 0.000 | n/a | 0.000 | 0.000 | 6.494 | 201.063 | 0.020 | n/a | 0.082 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-44/journal/page | none observed |
| 1987ff240dea0aa6000000000000015d | 206.156 | 0.000 | n/a | 0.000 | 0.000 | 4.965 | 200.979 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |
| 1987ff240dea0aa60000000000000145 | 205.804 | 0.000 | n/a | 0.000 | 0.000 | 4.698 | 200.939 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa60000000000000133 | 205.390 | 0.000 | n/a | 0.000 | 0.000 | 4.292 | 200.917 | 0.005 | n/a | 0.085 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-48/journal/page | none observed |
| 1987ff240dea0aa60000000000000163 | 205.236 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 204.087 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa6000000000000017d | 205.088 | 0.000 | n/a | 0.000 | 0.000 | 4.128 | 200.810 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa6000000000000015e | 204.787 | 0.000 | n/a | 0.000 | 0.000 | 3.681 | 200.951 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-60/journal/page | none observed |
| 1987ff240dea0aa60000000000000186 | 204.423 | 0.000 | n/a | 0.000 | 0.000 | 1.945 | 202.259 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-60/journal/page | none observed |
| 1987ff240dea0aa60000000000000132 | 204.216 | 0.000 | n/a | 0.000 | 0.000 | 2.423 | 201.619 | 0.005 | n/a | 0.073 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-62/journal/page | none observed |
| 1987ff240dea0aa60000000000000153 | 203.659 | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 202.495 | 0.015 | n/a | 0.087 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-42/journal/page | none observed |
| 1987ff240dea0aa6000000000000013c | 203.536 | 0.000 | n/a | 0.000 | 0.000 | 2.080 | 201.213 | 0.007 | n/a | 0.096 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-62/journal/page | none observed |
| 1987ff240dea0aa6000000000000014a | 203.107 | 0.000 | n/a | 0.000 | 0.000 | 1.941 | 200.971 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-60/journal/page | none observed |
| 1987ff240dea0aa60000000000000174 | 202.980 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 202.146 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-48/journal/page | none observed |
| 1987ff240dea0aa6000000000000017b | 202.858 | 0.000 | n/a | 0.000 | 0.000 | 1.934 | 200.748 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-61/journal/page | none observed |
| 1987ff240dea0aa60000000000000162 | 202.661 | 0.000 | n/a | 0.000 | 0.000 | 0.661 | 201.826 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-68/journal/page | none observed |
| 1987ff240dea0aa60000000000000168 | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 0.977 | 201.375 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-67/journal/page | none observed |

## P3 / tail / read (502 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 169.509 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.520 | 168.037 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 |
| p99 | 204.257 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.884 | 202.280 | 1.947 | n/a | 0.101 | 0.000 | n/a | n/a | 50.172 | 0.000 | 0.000 | 50.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1987ff240dea0aa600000000000001ae | 205.419 | 0.000 | n/a | 0.000 | 0.000 | 4.278 | 200.901 | 0.019 | n/a | 0.072 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-68/journal/page | none observed |
| 1987ff240dea0aa6000000000000022a | 205.160 | 0.000 | n/a | 0.000 | 0.000 | 4.556 | 200.475 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa6000000000000025a | 204.993 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 203.801 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-69/journal/page | none observed |
| 1987ff240dea0aa600000000000001a2 | 204.769 | 0.000 | n/a | 0.000 | 0.000 | 0.426 | 204.159 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-67/journal/page | none observed |
| 1987ff240dea0aa600000000000001e7 | 204.745 | 0.000 | n/a | 0.000 | 0.000 | 0.420 | 204.176 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa6000000000000027b | 204.257 | 0.000 | n/a | 0.000 | 0.000 | 0.434 | 203.680 | 0.007 | n/a | 0.034 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-60/journal/page | none observed |
| 1987ff240dea0aa6000000000000025b | 204.054 | 0.000 | n/a | 0.000 | 0.000 | 2.546 | 201.292 | 0.011 | n/a | 0.104 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-68/journal/page | none observed |
| 1987ff240dea0aa6000000000000019b | 203.868 | 0.000 | n/a | 0.000 | 0.000 | 2.884 | 200.730 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa6000000000000022c | 203.640 | 0.000 | n/a | 0.000 | 0.000 | 2.953 | 200.543 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa60000000000000262 | 203.369 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 202.344 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-63/journal/page | none observed |
| 1987ff240dea0aa60000000000000252 | 203.313 | 0.000 | n/a | 0.000 | 0.000 | 2.406 | 200.751 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa60000000000000200 | 203.278 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 202.280 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-64/journal/page | none observed |
| 1987ff240dea0aa60000000000000ee2 | 203.234 | 0.000 | n/a | 0.000 | 0.000 | 2.548 | 200.453 | 0.005 | n/a | 0.022 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa600000000000001cb | 203.073 | 0.000 | n/a | 0.000 | 0.000 | 0.899 | 201.957 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-66/journal/page | none observed |
| 1987ff240dea0aa600000000000001d9 | 203.013 | 0.000 | n/a | 0.000 | 0.000 | 1.163 | 201.670 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-42/journal/page | none observed |
| 1987ff240dea0aa6000000000000024b | 202.770 | 0.000 | n/a | 0.000 | 0.000 | 0.829 | 201.785 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.082 | 0.000 | 0.000 | 0.082 | gw-r/thread-65/journal/page | none observed |
| 1987ff240dea0aa60000000000000281 | 202.750 | 0.000 | n/a | 0.000 | 0.000 | 1.262 | 201.293 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-70/journal/page | none observed |
| 1987ff240dea0aa6000000000000023f | 202.616 | 0.000 | n/a | 0.000 | 0.000 | 1.178 | 201.203 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-65/journal/page | none observed |
| 1987ff240dea0aa60000000000000227 | 202.606 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 201.471 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-45/journal/page | none observed |
| 1987ff240dea0aa600000000000001eb | 202.565 | 0.000 | n/a | 0.000 | 0.000 | 1.089 | 201.273 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

## Writer heap, GC and scheduler stalls

Source 15ed651621cd68e09be33a0dc42eb5b2329fa74f; 3420 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 92.228 / 234.028 |
| GC events / total duration / maximum ms | 457 / 704.288 / 15.583 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":425,"4":16,"8":16} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 41.625 / 16 / 1255.953 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

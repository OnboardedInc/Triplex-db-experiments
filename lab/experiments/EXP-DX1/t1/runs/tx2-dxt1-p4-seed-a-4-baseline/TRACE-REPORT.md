# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/driver.queue.subject` (59.437 ms, trace `cc1fa70e5f0a8a5b00000000000007d4`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (39.221 ms, trace `cc1fa70e5f0a8a5b00000000000007cc`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (34.660 ms, trace `cc1fa70e5f0a8a5b00000000000007cd`); `gw-w/thread-64/gateway.admitted-work` (69.467 ms, trace `cc1fa70e5f0a8a5b00000000000020ee`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (38.841 ms, trace `cc1fa70e5f0a8a5b00000000000007d3`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-seed-a-4-baseline`; source `647da7a8545c6ff0acd545de48fde57601c3de71`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3708/3711 (99.919%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7169403.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 223 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13405.171 | 639.770 | 64.964 | 308 |
| L1 | 0 | 19965.569 | 430.652 | 20.055 | 462 |
| L4 | 0 | 19977.611 | 395.300 | 5.964 | 426 |
| L16 | 0 | 19946.657 | 365.935 | 13.215 | 474 |
| L64 | 0 | 19976.417 | 407.784 | 12.941 | 596 |
| L256 | 0 | 19977.107 | 368.592 | 8.145 | 486 |
| L1024 | 0 | 19971.892 | 3758.321 | 180.933 | 11970 |
| tail | 0 | 64609.948 | 10896.704 | 649.517 | 37449 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000007d4 | driver.queue.subject | 59.437 | cc1fa70e5f0a8a5b00000000000007cd | 6 / 32 |
| cc1fa70e5f0a8a5b00000000000007d4 | driver.queue.scheduler-late | 23.926 | none | 6 / 32 |
| cc1fa70e5f0a8a5b00000000000007d4 | driver.queue.scheduler-dispatch | 0.136 | none | 1 / 32 |

Observed active steps while trace cc1fa70e5f0a8a5b00000000000007d4 waited: [{"at":1794606482576.0237,"inFlight":5,"capacity":32,"active":[{"traceId":"cc1fa70e5f0a8a5b00000000000007cb","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007cc","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007ce","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007cd","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007d3","step":"client.http"}]},{"at":1794606482596.4268,"inFlight":4,"capacity":32,"active":[{"traceId":"cc1fa70e5f0a8a5b00000000000007cc","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007ce","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007cd","step":"client.http"},{"traceId":"cc1fa70e5f0a8a5b00000000000007d3","step":"client.http"}]}]

| cc1fa70e5f0a8a5b00000000000007cc | driver.queue.scheduler-late | 14.434 | none | 6 / 32 |
| cc1fa70e5f0a8a5b00000000000007cc | driver.queue.scheduler-dispatch | 0.035 | none | 6 / 32 |

Observed active steps while trace cc1fa70e5f0a8a5b00000000000007cc waited: []

| cc1fa70e5f0a8a5b00000000000007cd | driver.queue.subject | 20.659 | cc1fa70e5f0a8a5b00000000000007c3 | 7 / 32 |
| cc1fa70e5f0a8a5b00000000000007cd | driver.queue.scheduler-late | 5.258 | none | 7 / 32 |
| cc1fa70e5f0a8a5b00000000000007cd | driver.queue.scheduler-dispatch | 0.179 | none | 6 / 32 |

Observed active steps while trace cc1fa70e5f0a8a5b00000000000007cd waited: []

| cc1fa70e5f0a8a5b00000000000020ee | driver.queue.scheduler-dispatch | 0.050 | none | 0 / 32 |
| cc1fa70e5f0a8a5b00000000000020ee | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace cc1fa70e5f0a8a5b00000000000020ee waited: []

| cc1fa70e5f0a8a5b00000000000007d3 | driver.queue.scheduler-late | 25.951 | none | 5 / 32 |
| cc1fa70e5f0a8a5b00000000000007d3 | driver.queue.scheduler-dispatch | 0.014 | none | 5 / 32 |

Observed active steps while trace cc1fa70e5f0a8a5b00000000000007d3 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.226 | 1.019 | 0.000 | 1.448 | 5.239 | 0.101 | 0.000 | 0.147 | 1.219 | 6.519 | 0.037 | n/a | 0.411 | 12.388 | n/a | n/a | 0.059 | 6.352 | 0.225 | 0.059 |
| p99 | 90.942 | 6.678 | 5.860 | 16.485 | 22.745 | 1.505 | 13.848 | 1.257 | 5.585 | 37.994 | 0.280 | n/a | 2.038 | 47.966 | n/a | n/a | 0.343 | 33.000 | 0.612 | 0.343 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000424 | 90.942 | 22.745 | 1.505 | 0.000 | 0.092 | 2.762 | 37.994 | 0.280 | n/a | 2.038 | 23.438 | n/a | n/a | 0.088 | 24.341 | 0.268 | 0.088 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000428 | 82.509 | 5.239 | 0.310 | 10.721 | 0.066 | 5.585 | 12.324 | 0.037 | n/a | 0.186 | 47.966 | n/a | n/a | 0.075 | 16.337 | 0.198 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000440 | 58.138 | 5.553 | 0.435 | 0.391 | 0.070 | 4.615 | 20.646 | 0.061 | n/a | 0.834 | 25.474 | n/a | n/a | 0.058 | 6.449 | 0.111 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000437 | 53.915 | 18.422 | 0.011 | 13.848 | 0.719 | 0.739 | 7.582 | 0.039 | n/a | 0.215 | 12.258 | n/a | n/a | 0.082 | 33.000 | 0.612 | 0.082 | node-14/thread-0/node.gc | none observed |
| cc1fa70e5f0a8a5b0000000000000422 | 51.201 | 17.029 | 0.101 | 0.000 | 1.257 | 1.396 | 11.558 | 0.134 | n/a | 0.285 | 19.098 | n/a | n/a | 0.343 | 18.386 | 0.359 | 0.343 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000042c | 45.238 | 6.330 | 0.539 | 0.000 | 0.058 | 5.390 | 10.571 | 0.036 | n/a | 1.655 | 20.584 | n/a | n/a | 0.076 | 6.926 | 0.153 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000044e | 42.488 | 6.012 | 0.244 | 0.000 | 0.106 | 1.882 | 10.163 | 0.066 | n/a | 0.244 | 23.719 | n/a | n/a | 0.052 | 6.361 | 0.150 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000458 | 40.887 | 4.066 | 0.440 | 0.000 | 0.013 | 1.203 | 18.993 | 0.032 | n/a | 0.184 | 15.934 | n/a | n/a | 0.023 | 4.518 | 0.111 | 0.023 | gw-w/thread-45/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b000000000000042e | 40.586 | 4.770 | 0.373 | 0.000 | 0.063 | 2.292 | 15.757 | 0.042 | n/a | 0.179 | 17.055 | n/a | n/a | 0.056 | 5.206 | 0.128 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000448 | 40.145 | 6.250 | 0.006 | 4.968 | 0.186 | 0.822 | 1.855 | 0.040 | n/a | 0.753 | 25.222 | n/a | n/a | 0.042 | 11.411 | 0.284 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000436 | 36.695 | 5.263 | 0.478 | 0.000 | 0.466 | 1.578 | 10.113 | 0.033 | n/a | 0.193 | 18.481 | n/a | n/a | 0.090 | 6.208 | 0.169 | 0.090 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000434 | 36.345 | 6.827 | 0.482 | 0.000 | 0.144 | 1.781 | 14.073 | 0.039 | n/a | 0.512 | 12.388 | n/a | n/a | 0.099 | 7.453 | 0.205 | 0.099 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000431 | 35.391 | 9.181 | 0.010 | 0.000 | 0.592 | 1.199 | 5.193 | 0.039 | n/a | 0.182 | 18.858 | n/a | n/a | 0.136 | 9.783 | 0.276 | 0.136 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000044a | 34.696 | 4.004 | 0.192 | 0.276 | 0.057 | 1.451 | 10.020 | 0.048 | n/a | 0.758 | 17.854 | n/a | n/a | 0.037 | 4.529 | 0.131 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000042a | 32.226 | 7.066 | 0.007 | 0.000 | 0.410 | 0.967 | 2.442 | 0.056 | n/a | 1.152 | 20.021 | n/a | n/a | 0.104 | 7.484 | 0.232 | 0.104 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000043e | 31.378 | 7.362 | 0.858 | 0.000 | 0.124 | 1.711 | 8.496 | 0.071 | n/a | 0.623 | 12.069 | n/a | n/a | 0.064 | 8.344 | 0.266 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000444 | 31.043 | 6.187 | 0.018 | 0.000 | 0.147 | 1.022 | 1.257 | 0.029 | n/a | 0.821 | 21.470 | n/a | n/a | 0.092 | 6.352 | 0.205 | 0.092 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000446 | 29.097 | 4.373 | 0.492 | 0.000 | 0.049 | 1.096 | 10.969 | 0.032 | n/a | 0.192 | 11.859 | n/a | n/a | 0.035 | 4.914 | 0.169 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000043c | 26.600 | 6.716 | 0.393 | 0.000 | 0.119 | 1.769 | 5.582 | 0.044 | n/a | 0.417 | 11.483 | n/a | n/a | 0.077 | 7.228 | 0.272 | 0.077 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000452 | 24.716 | 4.014 | 0.187 | 0.569 | 0.059 | 1.220 | 6.519 | 0.032 | n/a | 0.380 | 11.697 | n/a | n/a | 0.040 | 4.829 | 0.195 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.896 | 1.313 | 0.000 | 1.888 | 4.603 | 0.007 | 0.000 | 0.410 | 1.022 | 1.241 | 0.025 | n/a | 0.513 | 9.279 | n/a | n/a | 0.047 | 5.512 | 0.271 | 0.047 |
| p99 | 32.226 | 3.268 | 0.000 | 3.033 | 7.066 | 0.018 | 1.557 | 0.973 | 4.382 | 5.251 | 0.067 | n/a | 1.152 | 21.470 | n/a | n/a | 0.193 | 7.484 | 0.450 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b000000000000042a | 32.226 | 7.066 | 0.007 | 0.000 | 0.410 | 0.967 | 2.442 | 0.056 | n/a | 1.152 | 20.021 | n/a | n/a | 0.104 | 7.484 | 0.232 | 0.104 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000444 | 31.043 | 6.187 | 0.018 | 0.000 | 0.147 | 1.022 | 1.257 | 0.029 | n/a | 0.821 | 21.470 | n/a | n/a | 0.092 | 6.352 | 0.205 | 0.092 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000426 | 22.138 | 3.935 | 0.007 | 0.000 | 0.782 | 4.382 | 1.241 | 0.024 | n/a | 0.411 | 11.162 | n/a | n/a | 0.193 | 4.725 | 0.213 | 0.193 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000441 | 20.867 | 3.111 | 0.005 | 1.557 | 0.973 | 1.046 | 4.646 | 0.025 | n/a | 0.189 | 9.279 | n/a | n/a | 0.035 | 5.647 | 0.271 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000044f | 19.896 | 4.104 | 0.005 | 0.000 | 0.359 | 1.215 | 1.076 | 0.023 | n/a | 0.768 | 12.303 | n/a | n/a | 0.043 | 4.468 | 0.225 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000042f | 16.740 | 4.748 | 0.006 | 0.000 | 0.157 | 0.735 | 5.251 | 0.067 | n/a | 0.678 | 4.986 | n/a | n/a | 0.111 | 4.911 | 0.293 | 0.111 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000044c | 15.074 | 4.603 | 0.010 | 0.000 | 0.319 | 1.219 | 1.021 | 0.025 | n/a | 0.513 | 7.316 | n/a | n/a | 0.047 | 4.933 | 0.327 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000456 | 13.386 | 4.777 | 0.013 | 0.000 | 0.722 | 1.004 | 0.917 | 0.023 | n/a | 0.184 | 5.708 | n/a | n/a | 0.040 | 5.512 | 0.412 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000454 | 13.107 | 3.921 | 0.005 | 1.498 | 0.475 | 0.771 | 0.969 | 0.023 | n/a | 0.230 | 5.170 | n/a | n/a | 0.044 | 5.900 | 0.450 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.220 | 0.000 | 0.000 | 0.297 | 3.655 | 0.004 | 0.000 | 0.057 | 0.580 | 0.889 | 0.025 | n/a | 0.156 | 7.749 | n/a | n/a | 0.039 | 4.240 | 0.114 | 0.039 |
| p99 | 37.343 | 0.711 | 0.000 | 1.904 | 3.985 | 0.198 | 0.000 | 17.119 | 1.274 | 13.211 | 0.047 | n/a | 0.171 | 18.362 | n/a | n/a | 0.042 | 20.779 | 0.688 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b000000000000045a | 37.343 | 3.985 | 0.198 | 0.000 | 0.057 | 1.274 | 13.211 | 0.047 | n/a | 0.171 | 18.362 | n/a | n/a | 0.039 | 4.240 | 0.114 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000c95 | 30.220 | 3.655 | 0.004 | 0.000 | 17.119 | 0.580 | 0.889 | 0.025 | n/a | 0.156 | 7.749 | n/a | n/a | 0.042 | 20.779 | 0.688 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.501ms; driver.publication 1.474ms; driver.publication 1.312ms; driver.publication 1.146ms |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.823 | 0.538 | 0.000 | 0.894 | 4.291 | 0.012 | 0.000 | 0.139 | 1.217 | 5.408 | 0.040 | n/a | 0.416 | 10.628 | n/a | n/a | 0.051 | 5.107 | 0.203 | 0.051 |
| p99 | 68.933 | 2.819 | 0.017 | 3.045 | 15.488 | 1.425 | 2.213 | 2.017 | 4.897 | 29.607 | 0.136 | n/a | 3.834 | 52.522 | n/a | n/a | 0.148 | 16.404 | 0.489 | 0.148 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b000000000000046c | 68.933 | 6.602 | 0.006 | 0.000 | 1.162 | 0.658 | 7.735 | 0.030 | n/a | 0.164 | 52.522 | n/a | n/a | 0.053 | 7.770 | 0.113 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000468 | 61.826 | 5.415 | 0.188 | 0.000 | 0.068 | 4.897 | 20.090 | 0.031 | n/a | 1.012 | 30.080 | n/a | n/a | 0.044 | 5.671 | 0.092 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004a2 | 51.555 | 4.779 | 0.286 | 0.414 | 0.106 | 1.456 | 29.607 | 0.036 | n/a | 0.681 | 14.135 | n/a | n/a | 0.055 | 5.586 | 0.108 | 0.055 | gw-w/thread-47/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b000000000000047f | 48.327 | 7.138 | 0.006 | 1.559 | 0.972 | 0.974 | 28.692 | 0.043 | n/a | 0.200 | 8.703 | n/a | n/a | 0.039 | 9.674 | 0.200 | 0.039 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| cc1fa70e5f0a8a5b000000000000045e | 41.868 | 4.161 | 0.162 | 0.295 | 0.057 | 1.791 | 20.619 | 0.040 | n/a | 0.222 | 14.478 | n/a | n/a | 0.043 | 4.675 | 0.112 | 0.043 | gw-w/thread-44/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b0000000000000466 | 37.753 | 15.488 | 0.010 | 0.000 | 0.905 | 3.828 | 4.551 | 0.045 | n/a | 0.605 | 12.179 | n/a | n/a | 0.141 | 16.404 | 0.435 | 0.141 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000498 | 35.859 | 6.133 | 0.265 | 0.475 | 0.073 | 1.713 | 12.313 | 0.042 | n/a | 0.922 | 13.867 | n/a | n/a | 0.056 | 6.946 | 0.194 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000046a | 35.723 | 4.041 | 0.269 | 0.319 | 0.098 | 1.366 | 2.184 | 0.039 | n/a | 0.637 | 26.704 | n/a | n/a | 0.065 | 4.727 | 0.132 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000045c | 35.628 | 5.010 | 0.197 | 0.000 | 0.065 | 1.805 | 13.456 | 0.043 | n/a | 0.491 | 14.523 | n/a | n/a | 0.038 | 5.272 | 0.148 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000047e | 32.347 | 5.426 | 1.425 | 0.245 | 0.062 | 2.957 | 10.324 | 0.044 | n/a | 0.197 | 11.588 | n/a | n/a | 0.080 | 7.157 | 0.221 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | client.encode 1.267ms |
| cc1fa70e5f0a8a5b0000000000000472 | 30.917 | 4.703 | 0.398 | 0.316 | 0.139 | 1.422 | 6.931 | 0.034 | n/a | 0.480 | 16.346 | n/a | n/a | 0.148 | 5.556 | 0.180 | 0.148 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000463 | 29.004 | 3.416 | 0.006 | 1.442 | 0.548 | 0.599 | 1.179 | 0.025 | n/a | 0.416 | 21.336 | n/a | n/a | 0.038 | 5.412 | 0.187 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000470 | 28.741 | 3.955 | 0.343 | 0.000 | 0.109 | 1.511 | 8.740 | 0.058 | n/a | 0.805 | 13.179 | n/a | n/a | 0.042 | 4.407 | 0.153 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000476 | 26.775 | 3.438 | 0.178 | 0.277 | 0.051 | 1.217 | 8.201 | 0.037 | n/a | 3.834 | 9.507 | n/a | n/a | 0.033 | 3.944 | 0.147 | 0.033 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004a3 | 25.678 | 4.549 | 0.007 | 0.000 | 0.246 | 4.135 | 1.549 | 0.040 | n/a | 2.058 | 13.050 | n/a | n/a | 0.045 | 4.802 | 0.187 | 0.045 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000049c | 25.617 | 4.063 | 0.185 | 0.363 | 0.075 | 1.491 | 8.514 | 0.055 | n/a | 0.200 | 10.628 | n/a | n/a | 0.043 | 4.686 | 0.183 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000486 | 25.608 | 4.774 | 0.289 | 0.419 | 0.103 | 1.356 | 9.239 | 0.043 | n/a | 0.467 | 8.864 | n/a | n/a | 0.055 | 5.585 | 0.218 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000460 | 25.177 | 6.419 | 0.008 | 2.213 | 0.624 | 0.800 | 1.186 | 0.027 | n/a | 2.149 | 11.695 | n/a | n/a | 0.056 | 9.264 | 0.368 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000047a | 24.492 | 3.629 | 0.245 | 0.232 | 0.106 | 0.977 | 7.483 | 0.054 | n/a | 0.389 | 11.315 | n/a | n/a | 0.062 | 4.212 | 0.172 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000494 | 24.409 | 7.056 | 0.009 | 0.000 | 0.530 | 0.941 | 1.648 | 0.025 | n/a | 0.177 | 13.921 | n/a | n/a | 0.102 | 7.595 | 0.311 | 0.102 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.579 | 0.573 | 0.000 | 1.401 | 3.416 | 0.006 | 0.000 | 0.674 | 0.848 | 1.596 | 0.032 | n/a | 0.416 | 10.705 | n/a | n/a | 0.047 | 4.313 | 0.283 | 0.047 |
| p99 | 37.753 | 2.404 | 0.000 | 3.031 | 15.488 | 0.010 | 1.442 | 0.969 | 3.828 | 4.551 | 0.136 | n/a | 0.984 | 21.336 | n/a | n/a | 0.141 | 16.404 | 0.435 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000466 | 37.753 | 15.488 | 0.010 | 0.000 | 0.905 | 3.828 | 4.551 | 0.045 | n/a | 0.605 | 12.179 | n/a | n/a | 0.141 | 16.404 | 0.435 | 0.141 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000463 | 29.004 | 3.416 | 0.006 | 1.442 | 0.548 | 0.599 | 1.179 | 0.025 | n/a | 0.416 | 21.336 | n/a | n/a | 0.038 | 5.412 | 0.187 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000048c | 19.345 | 2.952 | 0.006 | 0.000 | 0.969 | 0.848 | 1.934 | 0.049 | n/a | 0.394 | 12.151 | n/a | n/a | 0.041 | 3.927 | 0.203 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000477 | 18.701 | 3.356 | 0.006 | 0.000 | 0.203 | 0.811 | 2.512 | 0.136 | n/a | 0.482 | 11.149 | n/a | n/a | 0.044 | 3.566 | 0.191 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000049e | 18.579 | 4.333 | 0.006 | 0.000 | 0.913 | 0.703 | 1.596 | 0.032 | n/a | 0.233 | 10.705 | n/a | n/a | 0.058 | 5.252 | 0.283 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000482 | 13.570 | 4.113 | 0.006 | 0.000 | 0.194 | 1.160 | 2.284 | 0.057 | n/a | 0.984 | 4.716 | n/a | n/a | 0.056 | 4.313 | 0.318 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004a8 | 12.515 | 3.629 | 0.008 | 0.000 | 0.763 | 1.096 | 1.251 | 0.031 | n/a | 0.475 | 5.193 | n/a | n/a | 0.068 | 4.400 | 0.352 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000490 | 10.381 | 3.379 | 0.009 | 0.000 | 0.674 | 1.334 | 1.166 | 0.030 | n/a | 0.362 | 3.379 | n/a | n/a | 0.047 | 4.062 | 0.391 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.745 | 0.520 | 0.000 | 0.767 | 4.022 | 0.186 | 0.000 | 0.122 | 1.393 | 5.792 | 0.039 | n/a | 0.269 | 9.597 | n/a | n/a | 0.053 | 4.677 | 0.214 | 0.053 |
| p99 | 54.710 | 3.114 | 0.000 | 3.769 | 16.149 | 0.943 | 2.323 | 1.153 | 2.817 | 15.214 | 0.176 | n/a | 1.371 | 43.535 | n/a | n/a | 0.112 | 17.191 | 0.407 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000004fb | 54.710 | 3.437 | 0.194 | 0.000 | 0.051 | 1.409 | 5.082 | 0.063 | n/a | 0.902 | 43.535 | n/a | n/a | 0.038 | 3.681 | 0.067 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004da | 42.262 | 16.149 | 0.084 | 0.000 | 0.958 | 1.728 | 2.635 | 0.041 | n/a | 1.371 | 19.188 | n/a | n/a | 0.108 | 17.191 | 0.407 | 0.108 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004b0 | 40.068 | 6.241 | 0.335 | 0.529 | 0.063 | 2.024 | 15.214 | 0.059 | n/a | 0.967 | 14.572 | n/a | n/a | 0.064 | 7.168 | 0.179 | 0.064 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004b4 | 35.017 | 5.093 | 0.194 | 0.482 | 0.044 | 1.610 | 11.987 | 0.039 | n/a | 0.375 | 15.152 | n/a | n/a | 0.040 | 5.813 | 0.166 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004b8 | 33.123 | 5.105 | 0.007 | 2.323 | 1.080 | 0.913 | 7.454 | 0.033 | n/a | 0.189 | 15.974 | n/a | n/a | 0.044 | 8.516 | 0.257 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004b7 | 32.790 | 5.775 | 0.333 | 0.443 | 0.059 | 1.410 | 6.955 | 0.037 | n/a | 0.171 | 17.549 | n/a | n/a | 0.059 | 6.611 | 0.202 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004c8 | 32.334 | 7.415 | 0.007 | 0.000 | 0.736 | 2.078 | 6.950 | 0.120 | n/a | 0.522 | 14.448 | n/a | n/a | 0.056 | 8.158 | 0.252 | 0.056 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004e7 | 31.935 | 9.788 | 0.010 | 0.000 | 1.015 | 1.868 | 1.475 | 0.026 | n/a | 0.257 | 17.439 | n/a | n/a | 0.057 | 10.813 | 0.339 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004d5 | 31.620 | 4.240 | 0.943 | 0.215 | 0.066 | 1.499 | 6.311 | 0.030 | n/a | 0.197 | 18.076 | n/a | n/a | 0.042 | 5.464 | 0.173 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004e5 | 31.215 | 4.022 | 0.222 | 0.000 | 0.065 | 1.779 | 9.363 | 0.032 | n/a | 0.218 | 15.462 | n/a | n/a | 0.053 | 4.309 | 0.138 | 0.053 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004df | 30.388 | 4.097 | 0.378 | 0.238 | 0.122 | 2.034 | 10.114 | 0.043 | n/a | 0.430 | 12.820 | n/a | n/a | 0.112 | 4.836 | 0.159 | 0.112 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004d1 | 28.597 | 4.822 | 0.209 | 0.376 | 0.072 | 1.518 | 11.485 | 0.037 | n/a | 0.437 | 9.597 | n/a | n/a | 0.046 | 5.478 | 0.192 | 0.046 | gw-w/thread-45/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b00000000000004d9 | 25.409 | 4.692 | 0.240 | 0.239 | 0.111 | 1.453 | 9.727 | 0.042 | n/a | 0.185 | 8.666 | n/a | n/a | 0.054 | 5.282 | 0.208 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004cf | 24.202 | 8.082 | 0.007 | 0.000 | 0.769 | 0.819 | 1.389 | 0.027 | n/a | 0.189 | 12.857 | n/a | n/a | 0.064 | 8.857 | 0.366 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004e9 | 24.202 | 3.732 | 0.213 | 0.000 | 0.067 | 1.317 | 9.787 | 0.049 | n/a | 0.356 | 8.641 | n/a | n/a | 0.040 | 4.012 | 0.166 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004cd | 24.119 | 3.315 | 0.186 | 0.246 | 0.059 | 1.402 | 10.243 | 0.057 | n/a | 0.277 | 8.297 | n/a | n/a | 0.037 | 3.806 | 0.158 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004f1 | 23.362 | 3.447 | 0.204 | 0.000 | 0.059 | 1.194 | 5.792 | 0.032 | n/a | 0.201 | 12.394 | n/a | n/a | 0.038 | 3.710 | 0.159 | 0.038 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004c7 | 23.197 | 4.180 | 0.289 | 0.289 | 0.061 | 1.206 | 8.667 | 0.037 | n/a | 0.375 | 8.044 | n/a | n/a | 0.049 | 4.819 | 0.208 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004bf | 23.068 | 3.947 | 0.344 | 0.325 | 0.061 | 1.427 | 8.094 | 0.176 | n/a | 0.387 | 8.258 | n/a | n/a | 0.050 | 4.677 | 0.203 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004d3 | 22.745 | 5.015 | 0.247 | 0.440 | 0.102 | 1.665 | 6.892 | 0.051 | n/a | 0.172 | 8.105 | n/a | n/a | 0.057 | 5.804 | 0.255 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.705 | 0.793 | 0.000 | 1.671 | 3.342 | 0.006 | 0.000 | 0.499 | 0.845 | 1.296 | 0.035 | n/a | 0.286 | 8.045 | n/a | n/a | 0.067 | 3.969 | 0.283 | 0.067 |
| p99 | 19.739 | 1.692 | 0.000 | 3.260 | 6.057 | 0.013 | 0.000 | 1.153 | 1.556 | 2.554 | 0.055 | n/a | 0.470 | 13.266 | n/a | n/a | 0.101 | 7.010 | 0.383 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000004b2 | 19.739 | 5.850 | 0.007 | 0.000 | 1.153 | 0.858 | 1.296 | 0.046 | n/a | 0.390 | 10.069 | n/a | n/a | 0.070 | 7.010 | 0.355 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004ae | 19.636 | 3.140 | 0.006 | 0.000 | 1.022 | 0.570 | 1.109 | 0.028 | n/a | 0.458 | 13.266 | n/a | n/a | 0.036 | 4.169 | 0.212 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004ee | 17.155 | 6.057 | 0.011 | 0.000 | 0.499 | 0.946 | 1.277 | 0.035 | n/a | 0.217 | 8.045 | n/a | n/a | 0.067 | 6.567 | 0.383 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004f8 | 16.830 | 3.342 | 0.005 | 0.000 | 0.788 | 0.858 | 0.982 | 0.030 | n/a | 0.242 | 10.495 | n/a | n/a | 0.088 | 4.135 | 0.246 | 0.088 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004bd | 16.043 | 3.078 | 0.006 | 0.000 | 0.352 | 1.556 | 1.573 | 0.025 | n/a | 0.286 | 9.128 | n/a | n/a | 0.040 | 3.436 | 0.214 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004f6 | 15.705 | 3.104 | 0.005 | 0.000 | 0.201 | 0.755 | 1.414 | 0.054 | n/a | 0.349 | 9.785 | n/a | n/a | 0.037 | 3.310 | 0.211 | 0.037 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004d6 | 15.529 | 5.076 | 0.013 | 0.000 | 0.641 | 0.776 | 1.033 | 0.024 | n/a | 0.168 | 7.707 | n/a | n/a | 0.091 | 5.730 | 0.369 | 0.091 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004e1 | 14.045 | 3.558 | 0.007 | 0.000 | 0.404 | 0.950 | 2.554 | 0.051 | n/a | 0.470 | 5.950 | n/a | n/a | 0.101 | 3.969 | 0.283 | 0.101 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004c5 | 13.876 | 2.981 | 0.005 | 0.000 | 0.971 | 0.762 | 1.464 | 0.036 | n/a | 0.357 | 7.267 | n/a | n/a | 0.032 | 3.957 | 0.285 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004c3 | 13.456 | 3.764 | 0.008 | 0.000 | 0.184 | 0.845 | 2.013 | 0.055 | n/a | 0.269 | 6.244 | n/a | n/a | 0.074 | 3.956 | 0.294 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.199 | 0.370 | 0.000 | 1.204 | 3.789 | 0.077 | 0.000 | 0.144 | 1.288 | 4.201 | 0.033 | n/a | 0.271 | 11.030 | n/a | n/a | 0.048 | 4.322 | 0.207 | 0.048 |
| p99 | 59.352 | 2.581 | 0.000 | 2.720 | 13.276 | 4.033 | 0.000 | 1.104 | 4.646 | 16.108 | 0.105 | n/a | 3.729 | 43.773 | n/a | n/a | 0.091 | 13.738 | 0.393 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000536 | 59.352 | 3.789 | 0.322 | 0.000 | 0.083 | 1.504 | 9.477 | 0.052 | n/a | 0.308 | 43.773 | n/a | n/a | 0.044 | 4.194 | 0.071 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000520 | 45.649 | 13.276 | 0.012 | 0.000 | 0.450 | 3.337 | 16.108 | 0.080 | n/a | 0.425 | 11.927 | n/a | n/a | 0.034 | 13.738 | 0.301 | 0.034 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004fc | 40.424 | 3.317 | 0.005 | 0.000 | 1.054 | 0.764 | 2.749 | 0.046 | n/a | 1.111 | 31.335 | n/a | n/a | 0.042 | 4.376 | 0.108 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000051c | 35.963 | 9.824 | 0.217 | 0.000 | 0.121 | 1.507 | 10.211 | 0.053 | n/a | 0.189 | 13.765 | n/a | n/a | 0.075 | 10.163 | 0.283 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000504 | 34.314 | 4.492 | 0.004 | 0.000 | 0.815 | 1.870 | 2.162 | 0.026 | n/a | 0.611 | 24.308 | n/a | n/a | 0.025 | 5.312 | 0.155 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000050e | 34.260 | 3.776 | 0.237 | 0.000 | 0.127 | 1.540 | 8.086 | 0.051 | n/a | 0.243 | 20.116 | n/a | n/a | 0.084 | 4.139 | 0.121 | 0.084 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000051e | 33.453 | 4.178 | 0.325 | 0.000 | 0.069 | 1.446 | 16.017 | 0.077 | n/a | 0.271 | 11.030 | n/a | n/a | 0.041 | 4.571 | 0.137 | 0.041 | gw-w/thread-47/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b0000000000000507 | 32.149 | 4.028 | 0.197 | 0.000 | 0.056 | 4.646 | 13.556 | 0.031 | n/a | 0.204 | 9.394 | n/a | n/a | 0.036 | 4.281 | 0.133 | 0.036 | gw-w/thread-47/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b0000000000000546 | 30.697 | 4.343 | 0.278 | 0.000 | 0.067 | 1.942 | 11.706 | 0.066 | n/a | 0.390 | 11.828 | n/a | n/a | 0.076 | 4.688 | 0.153 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000052b | 30.419 | 5.082 | 0.007 | 0.000 | 0.448 | 0.614 | 1.181 | 0.023 | n/a | 0.167 | 22.835 | n/a | n/a | 0.062 | 5.537 | 0.182 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000050a | 29.636 | 4.738 | 0.226 | 0.000 | 0.060 | 1.663 | 6.881 | 0.105 | n/a | 0.433 | 15.478 | n/a | n/a | 0.052 | 5.024 | 0.170 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000054a | 27.894 | 3.878 | 0.277 | 0.000 | 0.061 | 1.915 | 7.608 | 0.065 | n/a | 3.729 | 10.311 | n/a | n/a | 0.051 | 4.216 | 0.151 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000522 | 25.969 | 5.217 | 0.324 | 0.000 | 0.055 | 1.647 | 5.654 | 0.031 | n/a | 0.166 | 12.817 | n/a | n/a | 0.057 | 5.596 | 0.215 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000540 | 25.769 | 7.173 | 0.349 | 0.000 | 0.064 | 1.385 | 5.188 | 0.030 | n/a | 0.164 | 11.347 | n/a | n/a | 0.067 | 7.587 | 0.294 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000053e | 25.700 | 3.303 | 0.218 | 0.000 | 0.065 | 1.401 | 6.609 | 0.040 | n/a | 1.733 | 12.284 | n/a | n/a | 0.047 | 3.586 | 0.140 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000050f | 25.251 | 5.569 | 0.006 | 0.000 | 0.468 | 0.606 | 1.204 | 0.025 | n/a | 0.190 | 17.127 | n/a | n/a | 0.055 | 6.043 | 0.239 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000054e | 25.041 | 3.400 | 0.222 | 0.000 | 0.105 | 1.511 | 9.513 | 0.036 | n/a | 0.455 | 9.743 | n/a | n/a | 0.055 | 3.728 | 0.149 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000501 | 24.567 | 3.722 | 0.248 | 0.000 | 0.049 | 1.782 | 10.913 | 0.036 | n/a | 0.409 | 7.372 | n/a | n/a | 0.036 | 4.020 | 0.164 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000528 | 24.443 | 3.419 | 4.033 | 0.000 | 0.066 | 1.227 | 6.472 | 0.033 | n/a | 0.182 | 8.961 | n/a | n/a | 0.050 | 7.518 | 0.308 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000548 | 22.633 | 3.687 | 0.272 | 0.000 | 0.056 | 1.423 | 5.843 | 0.033 | n/a | 0.219 | 11.049 | n/a | n/a | 0.052 | 4.014 | 0.177 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.348 | 0.572 | 0.000 | 1.536 | 3.328 | 0.006 | 0.000 | 0.568 | 0.772 | 1.060 | 0.027 | n/a | 0.287 | 9.448 | n/a | n/a | 0.044 | 4.120 | 0.252 | 0.044 |
| p99 | 40.424 | 1.646 | 0.000 | 2.584 | 4.724 | 0.077 | 0.000 | 1.104 | 1.468 | 4.201 | 0.104 | n/a | 1.111 | 31.335 | n/a | n/a | 0.060 | 5.238 | 0.392 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000004fc | 40.424 | 3.317 | 0.005 | 0.000 | 1.054 | 0.764 | 2.749 | 0.046 | n/a | 1.111 | 31.335 | n/a | n/a | 0.042 | 4.376 | 0.108 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000541 | 20.957 | 3.328 | 0.007 | 0.000 | 0.702 | 0.756 | 1.013 | 0.031 | n/a | 0.227 | 14.848 | n/a | n/a | 0.046 | 4.037 | 0.193 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000503 | 20.717 | 2.718 | 0.005 | 0.000 | 0.889 | 0.583 | 4.201 | 0.057 | n/a | 0.600 | 11.622 | n/a | n/a | 0.042 | 3.612 | 0.174 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000051a | 19.922 | 4.001 | 0.009 | 0.000 | 0.487 | 0.783 | 1.174 | 0.026 | n/a | 0.170 | 13.212 | n/a | n/a | 0.060 | 4.498 | 0.226 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000050c | 19.525 | 2.975 | 0.005 | 0.000 | 0.299 | 0.632 | 3.684 | 0.104 | n/a | 0.584 | 11.185 | n/a | n/a | 0.056 | 3.280 | 0.168 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000515 | 19.110 | 4.129 | 0.005 | 0.000 | 1.104 | 0.653 | 0.872 | 0.024 | n/a | 0.208 | 12.071 | n/a | n/a | 0.044 | 5.238 | 0.274 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000533 | 17.308 | 3.556 | 0.006 | 0.000 | 0.760 | 0.772 | 0.885 | 0.025 | n/a | 0.413 | 10.849 | n/a | n/a | 0.043 | 4.322 | 0.250 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000004ff | 16.348 | 3.360 | 0.006 | 0.000 | 0.754 | 1.303 | 0.913 | 0.027 | n/a | 0.481 | 9.448 | n/a | n/a | 0.055 | 4.120 | 0.252 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000525 | 15.585 | 3.969 | 0.006 | 0.000 | 0.802 | 0.814 | 1.557 | 0.074 | n/a | 0.287 | 8.017 | n/a | n/a | 0.058 | 4.777 | 0.307 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000052f | 15.142 | 2.897 | 0.006 | 0.000 | 0.236 | 1.468 | 1.069 | 0.023 | n/a | 0.529 | 8.874 | n/a | n/a | 0.040 | 3.139 | 0.207 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000513 | 13.268 | 4.724 | 0.036 | 0.000 | 0.441 | 0.873 | 0.896 | 0.025 | n/a | 0.177 | 6.038 | n/a | n/a | 0.058 | 5.201 | 0.392 | 0.058 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000054b | 13.260 | 4.205 | 0.077 | 0.000 | 0.235 | 0.906 | 1.588 | 0.041 | n/a | 0.799 | 5.367 | n/a | n/a | 0.042 | 4.517 | 0.341 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000053b | 10.385 | 2.781 | 0.005 | 0.000 | 0.568 | 0.808 | 1.060 | 0.031 | n/a | 0.227 | 4.864 | n/a | n/a | 0.042 | 3.354 | 0.323 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000537 | 10.109 | 2.825 | 0.006 | 0.000 | 0.199 | 0.587 | 0.911 | 0.026 | n/a | 0.225 | 5.281 | n/a | n/a | 0.048 | 3.031 | 0.300 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000517 | 8.855 | 2.624 | 0.005 | 0.000 | 0.144 | 0.580 | 0.936 | 0.024 | n/a | 0.186 | 4.312 | n/a | n/a | 0.044 | 2.773 | 0.313 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.532 | 0.465 | 0.000 | 1.369 | 4.024 | 0.011 | 0.000 | 0.172 | 1.165 | 2.825 | 0.037 | n/a | 0.431 | 8.236 | n/a | n/a | 0.051 | 4.240 | 0.236 | 0.051 |
| p99 | 54.728 | 4.448 | 0.000 | 7.908 | 9.957 | 0.397 | 0.000 | 1.123 | 4.366 | 20.616 | 0.222 | n/a | 3.590 | 31.903 | n/a | n/a | 0.159 | 10.832 | 0.542 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000562 | 54.728 | 3.242 | 0.185 | 0.000 | 0.062 | 3.229 | 14.613 | 0.038 | n/a | 1.416 | 31.903 | n/a | n/a | 0.040 | 3.490 | 0.064 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000596 | 41.470 | 3.529 | 0.282 | 0.000 | 0.067 | 4.366 | 20.616 | 0.064 | n/a | 0.521 | 11.980 | n/a | n/a | 0.045 | 3.878 | 0.094 | 0.045 | gw-w/thread-49/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b0000000000000589 | 35.854 | 8.873 | 0.008 | 0.000 | 0.799 | 0.891 | 2.825 | 0.030 | n/a | 3.224 | 19.101 | n/a | n/a | 0.103 | 9.680 | 0.270 | 0.103 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000055b | 31.575 | 3.178 | 0.279 | 0.000 | 0.107 | 1.468 | 10.808 | 0.043 | n/a | 1.436 | 14.193 | n/a | n/a | 0.063 | 3.565 | 0.113 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000059f | 31.308 | 3.276 | 0.268 | 0.000 | 0.139 | 1.514 | 14.696 | 0.048 | n/a | 0.241 | 11.062 | n/a | n/a | 0.063 | 3.684 | 0.118 | 0.063 | gw-w/thread-46/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b00000000000005a8 | 30.153 | 5.557 | 0.012 | 0.000 | 0.358 | 0.750 | 4.306 | 0.038 | n/a | 0.431 | 18.627 | n/a | n/a | 0.074 | 5.927 | 0.197 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000599 | 29.750 | 3.583 | 0.262 | 0.000 | 0.146 | 1.448 | 12.499 | 0.061 | n/a | 0.826 | 10.849 | n/a | n/a | 0.075 | 3.992 | 0.134 | 0.075 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000582 | 26.318 | 4.177 | 0.391 | 0.000 | 0.233 | 1.975 | 6.629 | 0.034 | n/a | 0.230 | 12.581 | n/a | n/a | 0.067 | 4.801 | 0.182 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005a7 | 26.250 | 3.950 | 0.287 | 0.000 | 0.066 | 1.393 | 10.630 | 0.040 | n/a | 0.205 | 9.617 | n/a | n/a | 0.060 | 4.304 | 0.164 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000059b | 26.020 | 3.590 | 0.246 | 0.000 | 0.074 | 1.005 | 8.831 | 0.076 | n/a | 0.809 | 11.323 | n/a | n/a | 0.064 | 3.910 | 0.150 | 0.064 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000058c | 25.943 | 4.978 | 0.215 | 0.000 | 0.068 | 1.969 | 10.002 | 0.030 | n/a | 0.503 | 8.136 | n/a | n/a | 0.043 | 5.260 | 0.203 | 0.043 | gw-w/thread-44/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b00000000000005ad | 24.812 | 4.127 | 0.397 | 0.000 | 0.129 | 1.324 | 8.635 | 0.036 | n/a | 0.260 | 9.813 | n/a | n/a | 0.090 | 4.653 | 0.188 | 0.090 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000576 | 23.986 | 4.378 | 0.323 | 0.000 | 0.146 | 1.945 | 7.871 | 0.059 | n/a | 0.724 | 8.421 | n/a | n/a | 0.119 | 4.847 | 0.202 | 0.119 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000588 | 23.342 | 3.080 | 0.215 | 0.000 | 0.064 | 1.451 | 9.085 | 0.066 | n/a | 0.779 | 8.556 | n/a | n/a | 0.046 | 3.359 | 0.144 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005b1 | 23.260 | 4.428 | 0.249 | 0.000 | 0.107 | 1.472 | 6.982 | 0.035 | n/a | 0.201 | 9.716 | n/a | n/a | 0.071 | 4.783 | 0.206 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000564 | 23.046 | 4.395 | 0.203 | 0.000 | 0.128 | 1.777 | 7.087 | 0.037 | n/a | 0.409 | 8.958 | n/a | n/a | 0.051 | 4.726 | 0.205 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000597 | 22.533 | 5.762 | 0.010 | 0.000 | 1.029 | 2.729 | 8.762 | 0.074 | n/a | 0.884 | 3.220 | n/a | n/a | 0.063 | 6.801 | 0.302 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000574 | 22.293 | 3.789 | 0.287 | 0.000 | 0.065 | 1.510 | 7.901 | 0.044 | n/a | 0.205 | 8.433 | n/a | n/a | 0.060 | 4.141 | 0.186 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000056e | 21.908 | 3.275 | 0.313 | 0.000 | 0.062 | 1.617 | 6.059 | 0.029 | n/a | 0.195 | 10.315 | n/a | n/a | 0.043 | 3.650 | 0.167 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000552 | 21.784 | 4.483 | 0.006 | 0.000 | 1.037 | 0.575 | 4.536 | 0.034 | n/a | 0.234 | 10.820 | n/a | n/a | 0.058 | 5.527 | 0.254 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.422 | 0.933 | 0.000 | 1.670 | 4.105 | 0.006 | 0.000 | 0.623 | 0.916 | 1.746 | 0.031 | n/a | 0.448 | 5.388 | n/a | n/a | 0.055 | 4.304 | 0.331 | 0.055 |
| p99 | 22.533 | 4.448 | 0.000 | 7.908 | 9.957 | 0.014 | 0.000 | 1.109 | 2.729 | 8.762 | 0.222 | n/a | 3.590 | 9.534 | n/a | n/a | 0.159 | 10.832 | 0.542 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000597 | 22.533 | 5.762 | 0.010 | 0.000 | 1.029 | 2.729 | 8.762 | 0.074 | n/a | 0.884 | 3.220 | n/a | n/a | 0.063 | 6.801 | 0.302 | 0.063 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005ab | 20.000 | 9.957 | 0.006 | 0.000 | 0.869 | 0.999 | 1.963 | 0.047 | n/a | 0.298 | 5.703 | n/a | n/a | 0.159 | 10.832 | 0.542 | 0.159 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000583 | 17.885 | 4.151 | 0.012 | 0.000 | 0.141 | 1.263 | 0.820 | 0.023 | n/a | 3.430 | 7.984 | n/a | n/a | 0.062 | 4.304 | 0.241 | 0.062 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000055d | 17.863 | 4.491 | 0.010 | 0.000 | 0.929 | 1.165 | 1.143 | 0.043 | n/a | 0.474 | 9.534 | n/a | n/a | 0.075 | 5.430 | 0.304 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000059d | 16.766 | 4.952 | 0.007 | 0.000 | 1.109 | 0.916 | 1.750 | 0.053 | n/a | 1.015 | 6.872 | n/a | n/a | 0.093 | 6.068 | 0.362 | 0.093 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000058f | 16.205 | 4.155 | 0.005 | 0.000 | 0.201 | 0.812 | 1.958 | 0.053 | n/a | 3.590 | 5.388 | n/a | n/a | 0.044 | 4.360 | 0.269 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000579 | 14.708 | 2.997 | 0.004 | 0.000 | 0.068 | 0.684 | 1.067 | 0.027 | n/a | 0.982 | 8.850 | n/a | n/a | 0.030 | 3.069 | 0.209 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.785ms |
| cc1fa70e5f0a8a5b0000000000000559 | 14.575 | 3.477 | 0.008 | 0.000 | 0.518 | 0.630 | 1.173 | 0.025 | n/a | 0.452 | 8.236 | n/a | n/a | 0.055 | 4.003 | 0.275 | 0.055 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005a4 | 14.422 | 4.105 | 0.006 | 0.000 | 1.059 | 1.008 | 2.055 | 0.052 | n/a | 0.303 | 5.778 | n/a | n/a | 0.057 | 5.170 | 0.358 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000550 | 13.802 | 5.869 | 0.012 | 0.000 | 0.259 | 2.265 | 2.482 | 0.222 | n/a | 0.203 | 2.415 | n/a | n/a | 0.075 | 6.139 | 0.445 | 0.075 | node-14/thread-0/driver.execute | none observed |
| cc1fa70e5f0a8a5b0000000000000554 | 13.650 | 2.988 | 0.005 | 0.000 | 0.170 | 1.637 | 2.521 | 0.031 | n/a | 0.494 | 5.755 | n/a | n/a | 0.048 | 3.164 | 0.232 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005af | 12.718 | 4.024 | 0.008 | 0.000 | 0.172 | 1.127 | 1.746 | 0.048 | n/a | 0.348 | 5.196 | n/a | n/a | 0.050 | 4.204 | 0.331 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000056f | 12.190 | 4.553 | 0.014 | 0.000 | 1.050 | 0.820 | 0.868 | 0.027 | n/a | 0.195 | 4.592 | n/a | n/a | 0.071 | 5.617 | 0.461 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000565 | 11.202 | 3.304 | 0.005 | 0.000 | 0.807 | 0.600 | 0.823 | 0.026 | n/a | 0.408 | 5.179 | n/a | n/a | 0.050 | 4.116 | 0.367 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000593 | 10.770 | 2.941 | 0.005 | 0.000 | 0.696 | 0.557 | 3.414 | 0.022 | n/a | 0.401 | 2.700 | n/a | n/a | 0.034 | 3.642 | 0.338 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b000000000000058d | 8.736 | 2.788 | 0.006 | 0.000 | 0.623 | 0.579 | 1.069 | 0.023 | n/a | 0.448 | 3.168 | n/a | n/a | 0.032 | 3.417 | 0.391 | 0.032 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.685 | 0.485 | 0.000 | 1.259 | 3.890 | 0.013 | 0.000 | 0.165 | 1.099 | 3.087 | 0.041 | n/a | 0.354 | 9.409 | n/a | n/a | 0.052 | 4.454 | 0.229 | 0.052 |
| p99 | 67.090 | 2.585 | 0.007 | 11.281 | 14.915 | n/a | 0.000 | 1.128 | 2.621 | 48.048 | 0.071 | n/a | 3.221 | 44.429 | n/a | n/a | 0.193 | 15.270 | 0.617 | 0.193 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000005c8 | 67.090 | 3.494 | 0.216 | 0.000 | 0.082 | 1.378 | 48.048 | 0.040 | n/a | 0.418 | 13.364 | n/a | n/a | 0.049 | 3.792 | 0.057 | 0.049 | gw-w/thread-47/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b00000000000005e2 | 64.592 | 4.988 | 0.393 | 0.000 | 0.108 | 1.623 | 11.417 | 0.032 | n/a | 3.221 | 42.745 | n/a | n/a | 0.064 | 5.489 | 0.085 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005e0 | 55.843 | 7.604 | 0.012 | 0.000 | 1.128 | 0.691 | 1.176 | 0.024 | n/a | 0.717 | 44.429 | n/a | n/a | 0.063 | 8.744 | 0.157 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005f0 | 37.922 | 3.796 | 0.272 | 0.000 | 0.098 | 1.376 | 19.582 | 0.037 | n/a | 0.214 | 12.477 | n/a | n/a | 0.068 | 4.167 | 0.110 | 0.068 | gw-w/thread-49/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b00000000000005b7 | 36.282 | 4.239 | 0.371 | 0.000 | 0.165 | 2.042 | 15.190 | 0.045 | n/a | 0.380 | 13.657 | n/a | n/a | 0.193 | 4.775 | 0.132 | 0.193 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000605 | 34.747 | 3.204 | 0.228 | 0.000 | 0.108 | 2.621 | 13.943 | 0.061 | n/a | 0.493 | 14.031 | n/a | n/a | 0.057 | 3.540 | 0.102 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000607 | 34.448 | 4.701 | 0.191 | 0.000 | 0.061 | 1.687 | 5.797 | 0.032 | n/a | 0.192 | 21.736 | n/a | n/a | 0.052 | 4.953 | 0.144 | 0.052 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005c2 | 34.337 | 3.775 | 0.285 | 0.000 | 0.109 | 1.582 | 10.387 | 0.031 | n/a | 0.354 | 17.746 | n/a | n/a | 0.069 | 4.169 | 0.121 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005dc | 33.814 | 5.044 | 0.348 | 0.000 | 0.139 | 1.652 | 14.598 | 0.049 | n/a | 0.246 | 11.647 | n/a | n/a | 0.091 | 5.531 | 0.164 | 0.091 | gw-w/thread-45/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b00000000000005fa | 32.976 | 4.616 | 0.295 | 0.000 | 0.082 | 1.545 | 12.155 | 0.069 | n/a | 0.249 | 13.906 | n/a | n/a | 0.058 | 4.994 | 0.151 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005ff | 32.754 | 3.658 | 0.431 | 0.000 | 0.072 | 1.553 | 9.494 | 0.067 | n/a | 0.254 | 17.171 | n/a | n/a | 0.054 | 4.161 | 0.127 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005c5 | 28.954 | 5.782 | 0.007 | 0.000 | 0.665 | 0.881 | 3.087 | 0.061 | n/a | 0.527 | 17.856 | n/a | n/a | 0.088 | 6.454 | 0.223 | 0.088 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005ec | 28.192 | 3.890 | 0.286 | 0.000 | 0.121 | 1.537 | 8.487 | 0.067 | n/a | 0.392 | 13.354 | n/a | n/a | 0.059 | 4.297 | 0.152 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005dd | 24.755 | 14.915 | 0.007 | 0.000 | 0.348 | 1.151 | 1.923 | 0.058 | n/a | 0.813 | 5.448 | n/a | n/a | 0.093 | 15.270 | 0.617 | 0.093 | node-14/thread-0/driver.publication | none observed |
| cc1fa70e5f0a8a5b00000000000005c0 | 24.104 | 5.487 | 0.006 | 0.000 | 0.364 | 0.851 | 4.253 | 0.071 | n/a | 0.314 | 12.707 | n/a | n/a | 0.051 | 5.857 | 0.243 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005bd | 24.047 | 4.311 | 0.007 | 0.000 | 0.205 | 0.789 | 1.617 | 0.028 | n/a | 0.227 | 16.812 | n/a | n/a | 0.052 | 4.522 | 0.188 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005e4 | 23.683 | 4.918 | 0.288 | 0.000 | 0.096 | 2.027 | 6.073 | 0.063 | n/a | 1.000 | 9.165 | n/a | n/a | 0.052 | 5.302 | 0.224 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005f1 | 22.975 | 3.198 | 0.006 | 0.000 | 0.738 | 0.613 | 4.410 | 0.029 | n/a | 0.190 | 13.744 | n/a | n/a | 0.046 | 3.942 | 0.172 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005fd | 22.725 | 4.783 | 0.326 | 0.000 | 0.084 | 1.892 | 4.554 | 0.042 | n/a | 0.291 | 10.697 | n/a | n/a | 0.057 | 5.193 | 0.229 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005d4 | 21.832 | 5.174 | 0.388 | 0.000 | 0.082 | 1.458 | 5.002 | 0.031 | n/a | 0.227 | 9.409 | n/a | n/a | 0.061 | 5.644 | 0.259 | 0.061 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.736 | 0.532 | 0.000 | 1.556 | 3.282 | 0.006 | 0.000 | 0.579 | 0.625 | 1.478 | 0.029 | n/a | 0.337 | 5.448 | n/a | n/a | 0.047 | 4.018 | 0.324 | 0.047 |
| p99 | 24.755 | 2.585 | 0.000 | 11.281 | 14.915 | n/a | 0.000 | 1.063 | 1.762 | 8.666 | 0.070 | n/a | 0.813 | 14.255 | n/a | n/a | 0.093 | 15.270 | 0.617 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000005dd | 24.755 | 14.915 | 0.007 | 0.000 | 0.348 | 1.151 | 1.923 | 0.058 | n/a | 0.813 | 5.448 | n/a | n/a | 0.093 | 15.270 | 0.617 | 0.093 | node-14/thread-0/driver.publication | none observed |
| cc1fa70e5f0a8a5b00000000000005f1 | 22.975 | 3.198 | 0.006 | 0.000 | 0.738 | 0.613 | 4.410 | 0.029 | n/a | 0.190 | 13.744 | n/a | n/a | 0.046 | 3.942 | 0.172 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005ed | 20.605 | 3.215 | 0.006 | 0.000 | 0.912 | 0.692 | 1.286 | 0.024 | n/a | 0.174 | 14.255 | n/a | n/a | 0.042 | 4.132 | 0.201 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005b5 | 15.027 | 3.517 | 0.006 | 0.000 | 1.063 | 0.563 | 1.546 | 0.054 | n/a | 0.406 | 7.828 | n/a | n/a | 0.044 | 4.586 | 0.305 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005d5 | 14.651 | 4.077 | 0.013 | 0.000 | 0.276 | 0.883 | 0.943 | 0.025 | n/a | 0.177 | 8.210 | n/a | n/a | 0.047 | 4.366 | 0.298 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005f7 | 14.052 | 3.875 | 0.010 | 0.000 | 0.134 | 0.780 | 1.995 | 0.044 | n/a | 0.293 | 6.870 | n/a | n/a | 0.052 | 4.018 | 0.286 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005cb | 13.928 | 4.747 | 0.007 | 0.000 | 0.624 | 0.991 | 1.697 | 0.070 | n/a | 0.374 | 5.376 | n/a | n/a | 0.044 | 5.378 | 0.386 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005fc | 13.736 | 2.178 | n/a | 0.000 | 0.937 | 1.762 | 8.666 | 0.040 | n/a | 0.075 | 0.000 | n/a | n/a | 0.078 | 3.116 | 0.227 | 0.078 | gw-w/thread-48/storage/begin-command! | none observed |
| cc1fa70e5f0a8a5b00000000000005ea | 13.272 | 4.325 | 0.006 | 0.000 | 0.468 | 0.585 | 1.253 | 0.027 | n/a | 0.270 | 6.287 | n/a | n/a | 0.051 | 4.799 | 0.362 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005d2 | 12.760 | 3.054 | 0.007 | 0.000 | 0.098 | 0.764 | 1.478 | 0.047 | n/a | 0.473 | 6.796 | n/a | n/a | 0.044 | 3.159 | 0.248 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005b2 | 11.105 | 3.282 | 0.006 | 0.000 | 0.315 | 0.549 | 1.542 | 0.055 | n/a | 0.397 | 4.919 | n/a | n/a | 0.041 | 3.603 | 0.324 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005c3 | 11.034 | 2.956 | 0.006 | 0.000 | 0.866 | 0.574 | 1.297 | 0.026 | n/a | 0.179 | 5.072 | n/a | n/a | 0.057 | 3.828 | 0.347 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005e6 | 10.592 | 4.089 | 0.006 | 0.000 | 0.579 | 0.583 | 1.361 | 0.025 | n/a | 0.413 | 3.472 | n/a | n/a | 0.063 | 4.674 | 0.441 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005f5 | 9.723 | 2.816 | 0.006 | 0.000 | 0.743 | 0.625 | 0.904 | 0.024 | n/a | 0.337 | 4.219 | n/a | n/a | 0.050 | 3.564 | 0.367 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b00000000000005cd | 8.920 | 2.633 | 0.005 | 0.000 | 0.471 | 0.536 | 0.811 | 0.022 | n/a | 0.375 | 4.021 | n/a | n/a | 0.045 | 3.110 | 0.349 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (845 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.245 | 0.822 | 0.000 | 1.657 | 3.693 | 0.006 | 0.000 | 0.743 | 0.778 | 1.218 | 0.030 | n/a | 0.287 | 7.189 | n/a | n/a | 0.038 | 4.685 | 0.311 | 0.038 |
| p99 | 70.649 | 3.762 | 1.431 | 5.144 | 13.339 | 3.344 | 0.000 | 25.681 | 15.666 | 16.038 | 4.251 | n/a | 4.806 | 38.841 | n/a | n/a | 0.117 | 34.726 | 0.712 | 0.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000007d4 | 101.513 | 6.047 | 0.013 | 0.000 | 83.499 | 0.704 | 1.262 | 0.152 | n/a | 0.324 | 9.446 | n/a | n/a | 0.065 | 89.560 | 0.882 | 0.065 | node-14/thread-0/driver.queue.subject | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007cc | 99.466 | 13.400 | 3.569 | 0.000 | 14.469 | 23.872 | 4.242 | 0.076 | n/a | 0.560 | 39.221 | n/a | n/a | 0.055 | 31.438 | 0.316 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007cd | 97.350 | 11.432 | 13.425 | 0.000 | 26.096 | 2.896 | 7.460 | 0.040 | n/a | 1.261 | 34.660 | n/a | n/a | 0.081 | 50.952 | 0.523 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007d3 | 95.646 | 4.760 | 9.556 | 0.000 | 25.966 | 7.504 | 1.368 | 6.761 | n/a | 0.848 | 38.841 | n/a | n/a | 0.042 | 40.281 | 0.421 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007cb | 93.335 | 14.722 | 3.262 | 0.000 | 24.074 | 3.225 | 1.993 | 0.988 | n/a | 0.433 | 44.551 | n/a | n/a | 0.087 | 42.058 | 0.451 | 0.087 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.127ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.579ms |
| cc1fa70e5f0a8a5b00000000000007ce | 92.578 | 13.139 | 27.137 | 0.000 | 4.650 | 0.931 | 2.135 | 1.728 | n/a | 4.806 | 37.984 | n/a | n/a | 0.068 | 44.925 | 0.485 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007c5 | 82.592 | 11.201 | 2.503 | 0.000 | 23.265 | 30.862 | 1.110 | 0.014 | n/a | 1.023 | 12.524 | n/a | n/a | 0.089 | 36.969 | 0.448 | 0.089 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.748ms; driver.publication 4.887ms; driver.expected-state.bind-receipt 3.325ms; driver.publication 2.127ms; driver.publication 1.619ms |
| cc1fa70e5f0a8a5b00000000000007c3 | 77.416 | 6.756 | 0.011 | 0.000 | 25.966 | 34.790 | 1.000 | 0.034 | n/a | 0.158 | 8.627 | n/a | n/a | 0.074 | 32.733 | 0.423 | 0.074 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.748ms; driver.publication 4.887ms; driver.expected-state.bind-receipt 3.325ms; driver.publication 2.127ms; driver.publication 1.579ms |
| cc1fa70e5f0a8a5b00000000000007c4 | 70.649 | 8.072 | 2.763 | 0.000 | 22.894 | 28.709 | 0.668 | 0.012 | n/a | 0.055 | 7.450 | n/a | n/a | 0.025 | 33.729 | 0.477 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.748ms; driver.publication 4.887ms; driver.expected-state.bind-receipt 3.325ms; driver.publication 2.127ms; driver.publication 1.579ms |
| cc1fa70e5f0a8a5b0000000000000610 | 69.986 | 14.085 | 0.047 | 0.000 | 0.957 | 8.927 | 20.727 | 0.104 | n/a | 2.973 | 22.099 | n/a | n/a | 0.067 | 15.089 | 0.216 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000952 | 65.740 | 2.318 | 0.005 | 0.000 | 26.946 | 3.353 | 0.920 | 0.032 | n/a | 0.459 | 31.681 | n/a | n/a | 0.026 | 29.269 | 0.445 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.254ms; driver.publication 1.011ms; driver.publication 1.009ms |
| cc1fa70e5f0a8a5b0000000000000730 | 64.658 | 13.106 | 0.335 | 0.000 | 3.867 | 2.184 | 6.479 | 0.067 | n/a | 1.392 | 37.167 | n/a | n/a | 0.061 | 17.309 | 0.268 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.247ms; driver.publication 1.635ms; driver.publication 1.353ms; driver.publication 1.248ms; driver.expected-state.bind-receipt 1.128ms |
| cc1fa70e5f0a8a5b00000000000007ca | 64.371 | 11.444 | 0.016 | 0.000 | 24.695 | 5.232 | 3.256 | 0.074 | n/a | 2.983 | 16.605 | n/a | n/a | 0.066 | 36.155 | 0.562 | 0.066 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 2.127ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.579ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b0000000000000c8c | 64.135 | 4.833 | 0.006 | 0.000 | 17.848 | 8.269 | 4.182 | 0.052 | n/a | 0.154 | 28.761 | n/a | n/a | 0.031 | 22.686 | 0.354 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.474ms; driver.publication 1.389ms; driver.publication 1.221ms; driver.publication 1.100ms; driver.publication 1.063ms |
| cc1fa70e5f0a8a5b00000000000008d4 | 63.614 | 23.680 | 0.017 | 0.000 | 1.448 | 11.150 | 9.196 | 0.138 | n/a | 1.853 | 16.084 | n/a | n/a | 0.050 | 25.144 | 0.395 | 0.050 | node-14/thread-0/client.transact | driver.publication 1.429ms |
| cc1fa70e5f0a8a5b0000000000000949 | 63.210 | 4.083 | 0.831 | 0.000 | 16.601 | 6.063 | 1.230 | 0.025 | n/a | 4.108 | 30.222 | n/a | n/a | 0.048 | 21.515 | 0.340 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.550ms |
| cc1fa70e5f0a8a5b00000000000007c6 | 63.198 | 9.849 | 3.212 | 0.000 | 1.441 | 27.386 | 0.686 | 1.337 | n/a | 0.282 | 18.973 | n/a | n/a | 0.031 | 14.503 | 0.229 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.127ms; driver.publication 1.619ms; driver.publication 1.579ms; driver.publication 1.570ms; driver.publication 1.129ms |
| cc1fa70e5f0a8a5b000000000000073d | 62.052 | 3.646 | 0.006 | 0.000 | 27.513 | 4.778 | 1.369 | 6.193 | n/a | 0.120 | 18.373 | n/a | n/a | 0.055 | 31.164 | 0.502 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.193ms; client.encode 3.373ms; driver.expected-state.bind-receipt 2.107ms; driver.publication 1.299ms; driver.publication 1.243ms |
| cc1fa70e5f0a8a5b0000000000000732 | 60.750 | 5.932 | 0.009 | 0.000 | 4.978 | 9.851 | 1.081 | 0.864 | n/a | 1.403 | 36.590 | n/a | n/a | 0.043 | 10.918 | 0.180 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.415ms; driver.publication 2.247ms; driver.publication 1.635ms; driver.publication 1.354ms; driver.publication 1.248ms |
| cc1fa70e5f0a8a5b0000000000000c93 | 58.304 | 11.884 | 0.017 | 0.000 | 0.155 | 9.230 | 7.128 | 0.061 | n/a | 0.300 | 29.494 | n/a | n/a | 0.035 | 12.056 | 0.207 | 0.035 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.501ms; driver.publication 1.474ms; driver.publication 1.383ms; driver.publication 1.146ms |

## P2 / L1024 / commit / 5-10 facts (490 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.837 | 0.677 | 0.000 | 1.515 | 3.180 | 0.006 | 0.000 | 0.768 | 0.767 | 1.023 | 0.029 | n/a | 0.282 | 6.755 | n/a | n/a | 0.038 | 4.150 | 0.306 | 0.038 |
| p99 | 69.986 | 2.334 | 2.075 | 4.824 | 10.135 | 3.212 | 0.000 | 25.966 | 24.274 | 9.968 | 5.513 | n/a | 4.108 | 36.883 | n/a | n/a | 0.120 | 33.729 | 0.704 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000007d3 | 95.646 | 4.760 | 9.556 | 0.000 | 25.966 | 7.504 | 1.368 | 6.761 | n/a | 0.848 | 38.841 | n/a | n/a | 0.042 | 40.281 | 0.421 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007ce | 92.578 | 13.139 | 27.137 | 0.000 | 4.650 | 0.931 | 2.135 | 1.728 | n/a | 4.806 | 37.984 | n/a | n/a | 0.068 | 44.925 | 0.485 | 0.068 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.071ms; driver.publication 1.670ms; driver.publication 1.619ms; driver.publication 1.595ms; driver.publication 1.570ms |
| cc1fa70e5f0a8a5b00000000000007c3 | 77.416 | 6.756 | 0.011 | 0.000 | 25.966 | 34.790 | 1.000 | 0.034 | n/a | 0.158 | 8.627 | n/a | n/a | 0.074 | 32.733 | 0.423 | 0.074 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.748ms; driver.publication 4.887ms; driver.expected-state.bind-receipt 3.325ms; driver.publication 2.127ms; driver.publication 1.579ms |
| cc1fa70e5f0a8a5b00000000000007c4 | 70.649 | 8.072 | 2.763 | 0.000 | 22.894 | 28.709 | 0.668 | 0.012 | n/a | 0.055 | 7.450 | n/a | n/a | 0.025 | 33.729 | 0.477 | 0.025 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.748ms; driver.publication 4.887ms; driver.expected-state.bind-receipt 3.325ms; driver.publication 2.127ms; driver.publication 1.579ms |
| cc1fa70e5f0a8a5b0000000000000610 | 69.986 | 14.085 | 0.047 | 0.000 | 0.957 | 8.927 | 20.727 | 0.104 | n/a | 2.973 | 22.099 | n/a | n/a | 0.067 | 15.089 | 0.216 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000952 | 65.740 | 2.318 | 0.005 | 0.000 | 26.946 | 3.353 | 0.920 | 0.032 | n/a | 0.459 | 31.681 | n/a | n/a | 0.026 | 29.269 | 0.445 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.254ms; driver.publication 1.011ms; driver.publication 1.009ms |
| cc1fa70e5f0a8a5b0000000000000949 | 63.210 | 4.083 | 0.831 | 0.000 | 16.601 | 6.063 | 1.230 | 0.025 | n/a | 4.108 | 30.222 | n/a | n/a | 0.048 | 21.515 | 0.340 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.550ms |
| cc1fa70e5f0a8a5b00000000000007c6 | 63.198 | 9.849 | 3.212 | 0.000 | 1.441 | 27.386 | 0.686 | 1.337 | n/a | 0.282 | 18.973 | n/a | n/a | 0.031 | 14.503 | 0.229 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.127ms; driver.publication 1.619ms; driver.publication 1.579ms; driver.publication 1.570ms; driver.publication 1.129ms |
| cc1fa70e5f0a8a5b000000000000073d | 62.052 | 3.646 | 0.006 | 0.000 | 27.513 | 4.778 | 1.369 | 6.193 | n/a | 0.120 | 18.373 | n/a | n/a | 0.055 | 31.164 | 0.502 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.193ms; client.encode 3.373ms; driver.expected-state.bind-receipt 2.107ms; driver.publication 1.299ms; driver.publication 1.243ms |
| cc1fa70e5f0a8a5b00000000000007dd | 57.950 | 6.392 | 0.013 | 0.000 | 28.321 | 3.505 | 1.582 | 0.035 | n/a | 0.213 | 17.838 | n/a | n/a | 0.051 | 34.726 | 0.599 | 0.051 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 2.413ms; driver.expected-state.bind-receipt 2.405ms; driver.publication 1.697ms; driver.publication 1.368ms; driver.publication 1.240ms |
| cc1fa70e5f0a8a5b00000000000007e2 | 56.715 | 4.324 | 0.008 | 0.000 | 42.902 | 1.573 | 0.985 | 0.033 | n/a | 0.522 | 6.308 | n/a | n/a | 0.061 | 47.234 | 0.833 | 0.061 | node-14/thread-0/driver.queue.subject | driver.publication 2.960ms; driver.expected-state.bind-receipt 2.413ms; driver.expected-state.bind-receipt 2.405ms; driver.publication 1.697ms; driver.publication 1.368ms |
| cc1fa70e5f0a8a5b00000000000007bf | 55.540 | 4.714 | 0.013 | 0.000 | 9.260 | 24.274 | 1.787 | 0.029 | n/a | 0.241 | 14.959 | n/a | n/a | 0.262 | 13.987 | 0.252 | 0.262 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.748ms; driver.publication 4.887ms; driver.expected-state.bind-receipt 3.325ms |
| cc1fa70e5f0a8a5b0000000000000c58 | 54.026 | 4.758 | 0.083 | 0.000 | 1.596 | 2.304 | 0.741 | 0.010 | n/a | 0.041 | 44.473 | n/a | n/a | 0.020 | 6.437 | 0.119 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.236ms; driver.publication 1.812ms; driver.publication 1.391ms; driver.publication 1.170ms; driver.publication 0.477ms |
| cc1fa70e5f0a8a5b0000000000000c55 | 52.568 | 4.917 | 0.010 | 0.000 | 0.456 | 7.416 | 1.441 | 4.361 | n/a | 0.073 | 33.844 | n/a | n/a | 0.050 | 5.384 | 0.102 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.812ms; driver.publication 1.391ms; driver.publication 1.169ms |
| cc1fa70e5f0a8a5b000000000000095a | 52.272 | 2.604 | 0.005 | 0.000 | 12.260 | 0.477 | 0.933 | 0.036 | n/a | 2.222 | 33.709 | n/a | n/a | 0.027 | 14.869 | 0.284 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.713ms; driver.publication 1.271ms; driver.publication 1.009ms |
| cc1fa70e5f0a8a5b0000000000000682 | 48.079 | 3.204 | 0.005 | 0.000 | 0.091 | 0.550 | 4.149 | 0.032 | n/a | 0.170 | 39.839 | n/a | n/a | 0.040 | 3.299 | 0.069 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.235ms; driver.publication 1.195ms |
| cc1fa70e5f0a8a5b000000000000076e | 47.233 | 3.204 | 0.007 | 0.000 | 4.609 | 0.414 | 1.958 | 0.013 | n/a | 0.069 | 36.883 | n/a | n/a | 0.076 | 7.819 | 0.166 | 0.076 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | client.encode 1.219ms; driver.publication 1.176ms |
| cc1fa70e5f0a8a5b00000000000006f8 | 46.521 | 4.586 | 0.006 | 0.000 | 1.090 | 5.919 | 6.869 | 0.053 | n/a | 0.234 | 27.723 | n/a | n/a | 0.041 | 5.682 | 0.122 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.018ms |
| cc1fa70e5f0a8a5b0000000000000a00 | 46.247 | 6.491 | 0.013 | 0.000 | 0.248 | 0.588 | 0.842 | 0.026 | n/a | 4.193 | 33.785 | n/a | n/a | 0.061 | 6.753 | 0.146 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| cc1fa70e5f0a8a5b0000000000000c90 | 45.584 | 4.310 | 0.006 | 0.000 | 5.132 | 0.784 | 1.528 | 0.029 | n/a | 0.375 | 33.373 | n/a | n/a | 0.048 | 9.448 | 0.207 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.221ms; driver.publication 1.100ms; driver.publication 1.063ms |

## P2/P4 / read-your-own-write / read (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 82.959 | n/a | n/a | n/a | 40.033 | 10.750 | 2.518 | 0.000 | 0.514 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.707 | 61.779 | 0.804 | 9.707 |
| p99 | 263.441 | n/a | n/a | n/a | 163.177 | 132.608 | 33.181 | 0.000 | 31.028 | 46.592 | 10.700 | n/a | 0.002 | 0.000 | n/a | n/a | 211.334 | 200.573 | 1.000 | 211.334 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000001972 | 263.441 | 45.964 | 4.322 | 1.143 | 0.000 | 0.678 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 211.334 | 51.428 | 0.195 | 211.334 | node-14/thread-3/socket.wait-first-byte | driver.publication 6.535ms; driver.expected-state.bind-receipt 5.360ms; driver.publication 5.355ms; driver.publication 4.569ms; driver.publication 4.042ms |
| cc1fa70e5f0a8a5b00000000000007dc | 216.472 | 28.583 | 15.279 | 4.030 | 0.000 | 4.083 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 164.498 | 47.891 | 0.221 | 164.498 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.960ms; driver.publication 2.659ms; driver.expected-state.bind-receipt 2.413ms; driver.expected-state.bind-receipt 2.405ms; driver.expected-state.bind-receipt 2.144ms |
| cc1fa70e5f0a8a5b0000000000001974 | 208.736 | 163.177 | 4.215 | 33.181 | 0.000 | 0.674 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.489 | 200.573 | 0.961 | 7.489 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 6.535ms; driver.expected-state.bind-receipt 5.360ms; driver.publication 5.355ms; driver.publication 4.569ms; driver.publication 4.042ms |
| cc1fa70e5f0a8a5b00000000000007e3 | 189.170 | 121.573 | 0.567 | 15.678 | 0.000 | 4.670 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 46.682 | 137.818 | 0.729 | 46.682 | node-14/thread-3/client.reach | driver.publication 2.960ms; driver.publication 2.659ms; driver.expected-state.bind-receipt 2.413ms; driver.expected-state.bind-receipt 2.144ms; driver.publication 1.836ms |
| cc1fa70e5f0a8a5b00000000000007de | 186.227 | 81.184 | 8.805 | 9.459 | 0.000 | 27.355 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.424 | 99.448 | 0.534 | 59.424 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.960ms; driver.publication 2.659ms; driver.expected-state.bind-receipt 2.413ms; driver.expected-state.bind-receipt 2.405ms; driver.expected-state.bind-receipt 2.144ms |
| cc1fa70e5f0a8a5b0000000000001f53 | 176.494 | 67.227 | 37.777 | 6.538 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 64.602 | 111.542 | 0.632 | 64.602 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.943ms; driver.publication 1.477ms; driver.publication 1.207ms; driver.publication 1.191ms; driver.publication 1.134ms |
| cc1fa70e5f0a8a5b00000000000007ea | 169.772 | 32.630 | 132.608 | 0.000 | 0.000 | 1.039 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.494 | 165.238 | 0.973 | 3.494 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 7.440ms; driver.publication 2.659ms; driver.expected-state.bind-receipt 2.144ms; driver.publication 1.836ms; driver.publication 1.494ms |
| cc1fa70e5f0a8a5b00000000000007c1 | 166.693 | 99.195 | 22.566 | 10.355 | 0.000 | 3.808 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.770 | 132.116 | 0.793 | 30.770 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 6.748ms; driver.expected-state.bind-receipt 3.325ms; driver.publication 3.071ms; driver.publication 2.127ms; driver.publication 1.670ms |
| cc1fa70e5f0a8a5b0000000000001f49 | 145.338 | 44.756 | 10.750 | 1.499 | 0.000 | 31.028 | 46.592 | 10.700 | n/a | 0.002 | 0.000 | n/a | n/a | 0.011 | 57.005 | 0.392 | 0.011 | gw-r/thread-48/gateway.response-write | driver.publication 1.943ms; driver.publication 1.477ms; driver.publication 1.134ms; driver.publication 1.107ms; driver.publication 1.094ms |
| cc1fa70e5f0a8a5b0000000000001f4b | 141.122 | 15.990 | 88.451 | 0.000 | 0.000 | 0.258 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.424 | 104.440 | 0.740 | 36.424 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.943ms; driver.publication 1.477ms; driver.publication 1.134ms; driver.publication 1.107ms; driver.publication 1.094ms |
| cc1fa70e5f0a8a5b0000000000001f54 | 132.433 | 49.340 | 37.949 | 3.349 | 0.000 | 0.254 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.539 | 90.639 | 0.684 | 41.539 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.943ms; driver.publication 1.477ms; driver.publication 1.191ms; driver.publication 1.134ms; driver.publication 1.024ms |
| cc1fa70e5f0a8a5b00000000000007d5 | 127.446 | 16.504 | 80.744 | 1.259 | 0.000 | 0.849 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 28.090 | 98.507 | 0.773 | 28.090 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 3.071ms; driver.publication 2.960ms; driver.expected-state.bind-receipt 2.413ms; driver.expected-state.bind-receipt 2.405ms; driver.publication 1.697ms |
| cc1fa70e5f0a8a5b0000000000001f46 | 122.131 | 42.511 | 23.418 | 4.643 | 0.000 | 0.369 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.191 | 70.572 | 0.578 | 51.191 | node-14/thread-3/socket.wait-first-byte | driver.publication 4.120ms; driver.publication 1.943ms; driver.publication 1.477ms; driver.publication 1.164ms; driver.publication 1.134ms |
| cc1fa70e5f0a8a5b0000000000001f27 | 106.453 | 62.742 | 0.343 | 7.173 | 0.000 | 0.434 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.760 | 70.259 | 0.660 | 35.760 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.306ms; driver.publication 1.200ms; driver.publication 1.188ms; driver.publication 1.115ms |
| cc1fa70e5f0a8a5b00000000000008d6 | 104.254 | 65.092 | 22.492 | 10.344 | 0.000 | 1.125 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.201 | 97.928 | 0.939 | 5.201 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.930ms; driver.publication 2.254ms; driver.publication 1.231ms |
| cc1fa70e5f0a8a5b0000000000001f2b | 104.162 | 12.358 | 90.563 | 0.000 | 0.000 | 0.262 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.978 | 102.921 | 0.988 | 0.978 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.306ms; driver.publication 1.200ms; driver.publication 1.188ms; driver.publication 1.186ms |
| cc1fa70e5f0a8a5b0000000000001bf2 | 94.051 | 14.366 | 38.879 | 0.000 | 0.000 | 0.149 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 40.656 | 53.246 | 0.566 | 40.656 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.083ms; driver.publication 1.077ms; driver.publication 1.045ms; driver.publication 1.029ms |
| cc1fa70e5f0a8a5b0000000000001bf0 | 92.005 | 45.612 | 40.628 | 2.951 | 0.000 | 0.419 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.395 | 89.191 | 0.969 | 2.395 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.100ms; driver.publication 1.083ms; driver.publication 1.077ms; driver.publication 1.045ms; driver.publication 1.029ms |
| cc1fa70e5f0a8a5b00000000000016b9 | 91.799 | 65.577 | 0.483 | 4.134 | 0.000 | 1.288 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.317 | 70.193 | 0.765 | 20.317 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 1.473ms |
| cc1fa70e5f0a8a5b0000000000001ae6 | 84.027 | 68.870 | 0.723 | 7.002 | 0.000 | 0.920 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.513 | 76.594 | 0.912 | 6.513 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 4.750ms; driver.publication 1.541ms; driver.publication 1.296ms; driver.publication 1.013ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.220 | 0.711 | 0.000 | 1.904 | 3.655 | 0.004 | 0.000 | 17.119 | 0.580 | 0.889 | 0.025 | n/a | 0.156 | 7.749 | n/a | n/a | 0.042 | 20.779 | 0.688 | 0.042 |
| p99 | 30.220 | 0.711 | 0.000 | 1.904 | 3.655 | 0.004 | 0.000 | 17.119 | 0.580 | 0.889 | 0.025 | n/a | 0.156 | 7.749 | n/a | n/a | 0.042 | 20.779 | 0.688 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000c95 | 30.220 | 3.655 | 0.004 | 0.000 | 17.119 | 0.580 | 0.889 | 0.025 | n/a | 0.156 | 7.749 | n/a | n/a | 0.042 | 20.779 | 0.688 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.501ms; driver.publication 1.474ms; driver.publication 1.312ms; driver.publication 1.146ms |

## P2 / tail / commit (2622 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.022 | 0.717 | 0.000 | 1.600 | 3.566 | 0.006 | 0.000 | 0.740 | 0.688 | 1.082 | 0.028 | n/a | 0.187 | 5.791 | n/a | n/a | 0.033 | 4.541 | 0.346 | 0.033 |
| p99 | 59.553 | 2.806 | 2.775 | 5.459 | 11.226 | 1.149 | 0.000 | 18.012 | 13.960 | 7.929 | 2.965 | n/a | 3.728 | 31.611 | n/a | n/a | 0.096 | 25.153 | 0.710 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b00000000000020ee | 96.301 | 5.205 | 0.318 | 0.000 | 0.052 | 2.588 | 71.372 | 0.065 | n/a | 0.138 | 16.497 | n/a | n/a | 0.066 | 5.576 | 0.058 | 0.066 | gw-w/thread-64/gateway.admitted-work | none observed |
| cc1fa70e5f0a8a5b0000000000000d05 | 90.188 | 5.064 | 0.106 | 0.000 | 0.654 | 10.986 | 2.116 | 0.061 | n/a | 10.411 | 60.770 | n/a | n/a | 0.020 | 5.824 | 0.065 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.publication 1.466ms; driver.publication 1.361ms; driver.expected-state.bind-receipt 1.050ms |
| cc1fa70e5f0a8a5b0000000000000d06 | 89.472 | 4.226 | 0.004 | 0.000 | 0.775 | 13.365 | 9.379 | 0.036 | n/a | 3.301 | 58.361 | n/a | n/a | 0.024 | 5.005 | 0.056 | 0.024 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.publication 1.466ms; driver.publication 1.361ms; driver.publication 1.243ms; driver.expected-state.bind-receipt 1.050ms |
| cc1fa70e5f0a8a5b0000000000000d04 | 88.757 | 7.345 | 0.008 | 0.000 | 1.232 | 5.748 | 1.896 | 0.090 | n/a | 0.184 | 72.215 | n/a | n/a | 0.040 | 8.585 | 0.097 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.466ms; driver.publication 1.361ms |
| cc1fa70e5f0a8a5b0000000000001986 | 88.500 | 8.468 | 0.013 | 0.000 | 27.290 | 34.777 | 0.891 | 0.431 | n/a | 0.511 | 15.986 | n/a | n/a | 0.133 | 35.771 | 0.404 | 0.133 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.569ms; driver.publication 4.042ms; client.encode 2.320ms; driver.publication 2.010ms; driver.expected-state.bind-receipt 1.765ms |
| cc1fa70e5f0a8a5b0000000000000d07 | 83.992 | 6.726 | 0.007 | 0.000 | 0.287 | 4.912 | 6.241 | 3.086 | n/a | 2.663 | 59.939 | n/a | n/a | 0.131 | 7.019 | 0.084 | 0.131 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.publication 1.466ms; driver.publication 1.361ms; driver.publication 1.285ms; driver.publication 1.243ms |
| cc1fa70e5f0a8a5b0000000000001113 | 74.976 | 13.638 | 0.011 | 0.000 | 12.222 | 28.335 | 4.432 | 0.066 | n/a | 1.752 | 14.477 | n/a | n/a | 0.042 | 25.870 | 0.345 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.218ms; driver.publication 3.722ms; driver.publication 3.595ms; driver.publication 3.395ms; driver.publication 1.158ms |
| cc1fa70e5f0a8a5b000000000000197d | 74.558 | 6.351 | 0.006 | 0.000 | 34.229 | 1.443 | 7.940 | 0.029 | n/a | 0.125 | 24.397 | n/a | n/a | 0.038 | 40.586 | 0.544 | 0.038 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 5.360ms; driver.publication 3.804ms; driver.publication 2.597ms; driver.publication 2.010ms; driver.publication 1.590ms |
| cc1fa70e5f0a8a5b00000000000014e1 | 73.226 | 1.926 | 0.002 | 0.000 | 64.188 | 2.942 | 0.455 | 0.015 | n/a | 0.075 | 3.604 | n/a | n/a | 0.019 | 66.116 | 0.903 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication 2.947ms; driver.publication 2.095ms; driver.publication 2.084ms; driver.expected-state.bind-receipt 1.654ms; driver.publication 1.630ms |
| cc1fa70e5f0a8a5b000000000000205a | 72.694 | 5.456 | 0.011 | 0.000 | 28.236 | 0.736 | 1.526 | 0.053 | n/a | 4.635 | 32.006 | n/a | n/a | 0.035 | 33.703 | 0.464 | 0.035 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.487ms; driver.publication 1.184ms |
| cc1fa70e5f0a8a5b0000000000000d03 | 72.443 | 2.967 | 0.005 | 0.000 | 0.430 | 2.946 | 7.929 | 0.102 | n/a | 0.179 | 57.861 | n/a | n/a | 0.025 | 3.402 | 0.047 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.466ms |
| cc1fa70e5f0a8a5b0000000000001d8b | 71.873 | 13.896 | 0.015 | 0.000 | 9.147 | 31.327 | 4.174 | 0.181 | n/a | 0.670 | 12.423 | n/a | n/a | 0.039 | 23.058 | 0.321 | 0.039 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.338ms; driver.publication 2.352ms; driver.publication 1.958ms; driver.expected-state.bind-receipt 1.763ms; driver.expected-state.bind-receipt 1.275ms |
| cc1fa70e5f0a8a5b0000000000000d08 | 70.172 | 3.639 | 0.007 | 0.000 | 0.444 | 1.200 | 0.877 | 4.639 | n/a | 0.250 | 59.055 | n/a | n/a | 0.062 | 4.089 | 0.058 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.publication 1.466ms; driver.publication 1.361ms; driver.publication 1.243ms; driver.publication 1.209ms |
| cc1fa70e5f0a8a5b0000000000001977 | 67.805 | 21.028 | 0.013 | 4.250 | 1.012 | 27.890 | 4.053 | 0.059 | n/a | 1.963 | 7.492 | n/a | n/a | 0.045 | 26.303 | 0.388 | 0.045 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 5.360ms; driver.publication 3.804ms; driver.publication 2.597ms; driver.publication 1.749ms; driver.publication 1.590ms |
| cc1fa70e5f0a8a5b00000000000014de | 67.499 | 9.413 | 0.012 | 0.000 | 0.402 | 19.290 | 2.672 | 0.052 | n/a | 0.808 | 34.824 | n/a | n/a | 0.025 | 9.828 | 0.146 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.994ms; driver.publication 2.947ms; driver.publication 2.095ms; driver.expected-state.bind-receipt 1.654ms; driver.publication 1.630ms |
| cc1fa70e5f0a8a5b0000000000000f7e | 66.531 | 8.828 | 0.242 | 0.000 | 0.014 | 2.594 | 15.406 | 0.049 | n/a | 0.526 | 38.842 | n/a | n/a | 0.031 | 9.084 | 0.137 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.352ms; driver.publication 1.165ms |
| cc1fa70e5f0a8a5b0000000000000d0a | 64.614 | 5.495 | 0.012 | 0.000 | 0.961 | 5.830 | 1.142 | 0.032 | n/a | 0.447 | 50.656 | n/a | n/a | 0.040 | 6.467 | 0.100 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.expected-state.bind-receipt 1.909ms; driver.publication 1.361ms; driver.publication 1.285ms; driver.publication 1.243ms |
| cc1fa70e5f0a8a5b0000000000001ace | 64.498 | 14.494 | 0.335 | 0.000 | 4.468 | 8.418 | 1.879 | 1.438 | n/a | 0.740 | 32.683 | n/a | n/a | 0.043 | 19.297 | 0.299 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 6.411ms; driver.publication 2.096ms; driver.publication 1.751ms; driver.expected-state.bind-receipt 1.432ms; driver.expected-state.bind-receipt 1.412ms |
| cc1fa70e5f0a8a5b0000000000001d8a | 63.788 | 14.274 | 0.007 | 7.546 | 0.245 | 33.005 | 4.615 | 0.066 | n/a | 1.214 | 2.722 | n/a | n/a | 0.093 | 22.073 | 0.346 | 0.093 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.338ms; driver.publication 2.352ms; driver.publication 1.958ms; driver.expected-state.bind-receipt 1.763ms; driver.publication 1.631ms |
| cc1fa70e5f0a8a5b00000000000013c4 | 63.414 | 3.768 | 0.005 | 0.000 | 31.481 | 2.300 | 0.857 | 0.025 | n/a | 2.066 | 22.865 | n/a | n/a | 0.046 | 35.254 | 0.556 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 1.896ms; driver.publication 1.752ms; driver.publication 1.390ms; driver.publication 1.279ms; driver.publication 1.220ms |

## P2 / tail / commit / 5-10 facts (1557 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.697 | 0.610 | 0.000 | 1.468 | 3.099 | 0.005 | 0.000 | 0.740 | 0.673 | 0.917 | 0.027 | n/a | 0.181 | 5.304 | n/a | n/a | 0.032 | 4.030 | 0.333 | 0.032 |
| p99 | 59.553 | 2.162 | 2.879 | 4.817 | 8.726 | 0.128 | 0.000 | 17.913 | 14.880 | 4.852 | 3.609 | n/a | 3.728 | 31.712 | n/a | n/a | 0.096 | 24.003 | 0.713 | 0.096 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc1fa70e5f0a8a5b0000000000000d05 | 90.188 | 5.064 | 0.106 | 0.000 | 0.654 | 10.986 | 2.116 | 0.061 | n/a | 10.411 | 60.770 | n/a | n/a | 0.020 | 5.824 | 0.065 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.publication 1.466ms; driver.publication 1.361ms; driver.expected-state.bind-receipt 1.050ms |
| cc1fa70e5f0a8a5b0000000000001986 | 88.500 | 8.468 | 0.013 | 0.000 | 27.290 | 34.777 | 0.891 | 0.431 | n/a | 0.511 | 15.986 | n/a | n/a | 0.133 | 35.771 | 0.404 | 0.133 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.569ms; driver.publication 4.042ms; client.encode 2.320ms; driver.publication 2.010ms; driver.expected-state.bind-receipt 1.765ms |
| cc1fa70e5f0a8a5b0000000000001113 | 74.976 | 13.638 | 0.011 | 0.000 | 12.222 | 28.335 | 4.432 | 0.066 | n/a | 1.752 | 14.477 | n/a | n/a | 0.042 | 25.870 | 0.345 | 0.042 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.218ms; driver.publication 3.722ms; driver.publication 3.595ms; driver.publication 3.395ms; driver.publication 1.158ms |
| cc1fa70e5f0a8a5b00000000000014e1 | 73.226 | 1.926 | 0.002 | 0.000 | 64.188 | 2.942 | 0.455 | 0.015 | n/a | 0.075 | 3.604 | n/a | n/a | 0.019 | 66.116 | 0.903 | 0.019 | node-14/thread-0/driver.queue.subject | driver.publication 2.947ms; driver.publication 2.095ms; driver.publication 2.084ms; driver.expected-state.bind-receipt 1.654ms; driver.publication 1.630ms |
| cc1fa70e5f0a8a5b000000000000205a | 72.694 | 5.456 | 0.011 | 0.000 | 28.236 | 0.736 | 1.526 | 0.053 | n/a | 4.635 | 32.006 | n/a | n/a | 0.035 | 33.703 | 0.464 | 0.035 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.487ms; driver.publication 1.184ms |
| cc1fa70e5f0a8a5b0000000000000d03 | 72.443 | 2.967 | 0.005 | 0.000 | 0.430 | 2.946 | 7.929 | 0.102 | n/a | 0.179 | 57.861 | n/a | n/a | 0.025 | 3.402 | 0.047 | 0.025 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.466ms |
| cc1fa70e5f0a8a5b0000000000001d8b | 71.873 | 13.896 | 0.015 | 0.000 | 9.147 | 31.327 | 4.174 | 0.181 | n/a | 0.670 | 12.423 | n/a | n/a | 0.039 | 23.058 | 0.321 | 0.039 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.338ms; driver.publication 2.352ms; driver.publication 1.958ms; driver.expected-state.bind-receipt 1.763ms; driver.expected-state.bind-receipt 1.275ms |
| cc1fa70e5f0a8a5b0000000000000d08 | 70.172 | 3.639 | 0.007 | 0.000 | 0.444 | 1.200 | 0.877 | 4.639 | n/a | 0.250 | 59.055 | n/a | n/a | 0.062 | 4.089 | 0.058 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.publication 1.466ms; driver.publication 1.361ms; driver.publication 1.243ms; driver.publication 1.209ms |
| cc1fa70e5f0a8a5b0000000000001977 | 67.805 | 21.028 | 0.013 | 4.250 | 1.012 | 27.890 | 4.053 | 0.059 | n/a | 1.963 | 7.492 | n/a | n/a | 0.045 | 26.303 | 0.388 | 0.045 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 5.360ms; driver.publication 3.804ms; driver.publication 2.597ms; driver.publication 1.749ms; driver.publication 1.590ms |
| cc1fa70e5f0a8a5b00000000000014de | 67.499 | 9.413 | 0.012 | 0.000 | 0.402 | 19.290 | 2.672 | 0.052 | n/a | 0.808 | 34.824 | n/a | n/a | 0.025 | 9.828 | 0.146 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.994ms; driver.publication 2.947ms; driver.publication 2.095ms; driver.expected-state.bind-receipt 1.654ms; driver.publication 1.630ms |
| cc1fa70e5f0a8a5b0000000000000d0a | 64.614 | 5.495 | 0.012 | 0.000 | 0.961 | 5.830 | 1.142 | 0.032 | n/a | 0.447 | 50.656 | n/a | n/a | 0.040 | 6.467 | 0.100 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.expected-state.bind-receipt 1.909ms; driver.publication 1.361ms; driver.publication 1.285ms; driver.publication 1.243ms |
| cc1fa70e5f0a8a5b00000000000013c4 | 63.414 | 3.768 | 0.005 | 0.000 | 31.481 | 2.300 | 0.857 | 0.025 | n/a | 2.066 | 22.865 | n/a | n/a | 0.046 | 35.254 | 0.556 | 0.046 | node-14/thread-0/driver.queue.subject | driver.publication 1.896ms; driver.publication 1.752ms; driver.publication 1.390ms; driver.publication 1.279ms; driver.publication 1.220ms |
| cc1fa70e5f0a8a5b0000000000001991 | 63.228 | 3.626 | 0.009 | 0.000 | 3.373 | 40.329 | 1.567 | 0.036 | n/a | 0.112 | 14.143 | n/a | n/a | 0.033 | 7.008 | 0.111 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 5.355ms; driver.publication 4.569ms; driver.publication 4.042ms; client.encode 2.320ms; driver.expected-state.bind-receipt 1.765ms |
| cc1fa70e5f0a8a5b0000000000001da7 | 61.437 | 6.856 | 0.010 | 0.000 | 0.210 | 0.568 | 1.012 | 0.028 | n/a | 0.362 | 52.337 | n/a | n/a | 0.052 | 7.077 | 0.115 | 0.052 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.233ms |
| cc1fa70e5f0a8a5b000000000000198f | 59.739 | 3.042 | 0.003 | 0.000 | 0.298 | 34.884 | 0.988 | 5.215 | n/a | 1.406 | 13.869 | n/a | n/a | 0.034 | 3.342 | 0.056 | 0.034 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.569ms; driver.publication 4.042ms; client.encode 2.320ms; driver.expected-state.bind-receipt 1.765ms; driver.publication 1.712ms |
| cc1fa70e5f0a8a5b000000000000198d | 59.553 | 5.877 | 0.005 | 0.000 | 0.637 | 31.898 | 1.243 | 5.014 | n/a | 1.311 | 13.535 | n/a | n/a | 0.031 | 6.520 | 0.109 | 0.031 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.569ms; client.encode 2.320ms; driver.expected-state.bind-receipt 1.765ms; driver.publication 1.712ms; driver.publication 1.484ms |
| cc1fa70e5f0a8a5b0000000000000d0c | 53.630 | 3.343 | 0.006 | 0.000 | 2.159 | 10.300 | 0.884 | 14.892 | n/a | 0.223 | 21.799 | n/a | n/a | 0.023 | 5.508 | 0.103 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 2.315ms; driver.expected-state.bind-receipt 1.909ms; driver.publication 1.363ms; driver.publication 1.361ms; driver.publication 1.285ms |
| cc1fa70e5f0a8a5b0000000000001121 | 52.309 | 2.692 | 0.004 | 0.000 | 4.904 | 25.760 | 1.006 | 0.021 | n/a | 0.104 | 17.794 | n/a | n/a | 0.022 | 7.601 | 0.145 | 0.022 | node-14/thread-0/socket.wait-first-byte | driver.publication 4.245ms |
| cc1fa70e5f0a8a5b0000000000001120 | 51.399 | 10.352 | 0.010 | 0.000 | 0.279 | 24.251 | 0.921 | 0.025 | n/a | 0.351 | 15.123 | n/a | n/a | 0.086 | 10.642 | 0.207 | 0.086 | node-14/thread-0/socket.wait-first-byte | none observed |
| cc1fa70e5f0a8a5b0000000000001daa | 51.397 | 7.015 | 0.195 | 0.000 | 1.045 | 4.309 | 0.910 | 2.100 | n/a | 0.150 | 35.658 | n/a | n/a | 0.016 | 8.254 | 0.161 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.762ms; driver.publication 1.269ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.122 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 200.586 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 |
| p99 | 203.072 | n/a | n/a | n/a | 22.059 | n/a | 1.599 | 0.000 | 6.661 | 201.559 | 0.132 | n/a | 0.206 | 0.000 | n/a | n/a | 0.353 | 23.658 | 0.266 | 0.353 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd0000000000000007 | 203.072 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 201.559 | 0.013 | n/a | 0.206 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000006 | 202.559 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.236 | 0.014 | n/a | 0.130 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000005 | 202.483 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 201.324 | 0.021 | n/a | 0.149 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000f34 | 201.393 | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 200.735 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000f35 | 201.354 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 200.630 | 0.004 | n/a | 0.046 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000f33 | 201.122 | 0.000 | n/a | 0.000 | 0.000 | 0.388 | 200.586 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000002 | 152.488 | 1.258 | n/a | 0.000 | 0.000 | 1.419 | 149.268 | 0.132 | n/a | 0.115 | 0.000 | n/a | n/a | 0.295 | 1.258 | 0.008 | 0.295 | gw-r/thread-46/gateway.admitted-work | none observed |
| 77ba05e150341bcd0000000000000f3a | 89.622 | 18.698 | n/a | 0.000 | 0.000 | 4.770 | 65.940 | 0.008 | n/a | 0.005 | 0.000 | n/a | n/a | 0.201 | 18.698 | 0.209 | 0.201 | gw-r/thread-47/gateway.admitted-work | none observed |
| 77ba05e150341bcd0000000000000f38 | 88.816 | 22.059 | n/a | 1.599 | 0.000 | 6.602 | 58.374 | 0.008 | n/a | 0.004 | 0.000 | n/a | n/a | 0.169 | 23.658 | 0.266 | 0.169 | gw-r/thread-47/gateway.admitted-work | none observed |
| 77ba05e150341bcd0000000000000f39 | 73.355 | 15.177 | n/a | 0.000 | 0.000 | 6.661 | 51.154 | 0.004 | n/a | 0.006 | 0.000 | n/a | n/a | 0.353 | 15.177 | 0.207 | 0.353 | gw-r/thread-46/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 810.007 | n/a | n/a | n/a | 9.256 | n/a | 0.000 | 0.000 | 0.637 | 799.699 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 1.246 | 9.256 | 0.011 | 1.246 |
| p99 | 1004.323 | n/a | n/a | n/a | 11.112 | n/a | 0.000 | 0.000 | 1.470 | 1000.991 | 0.018 | n/a | 0.401 | 0.000 | n/a | n/a | 1.855 | 11.112 | 0.817 | 1.855 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd00000000000000a4 | 1004.323 | 0.201 | n/a | 0.000 | 0.000 | 1.470 | 1000.991 | 0.013 | n/a | 0.401 | 0.000 | n/a | n/a | 1.246 | 0.201 | 0.000 | 1.246 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000a5 | 810.007 | 9.256 | n/a | 0.000 | 0.000 | 0.610 | 799.699 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 0.315 | 9.256 | 0.011 | 0.315 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000834 | 13.604 | 11.112 | n/a | 0.000 | 0.000 | 0.637 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.855 | 11.112 | 0.817 | 1.855 | node-14/thread-2/replica.fetch-feed | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 420.816 | n/a | n/a | n/a | 2.878 | n/a | 0.000 | 0.000 | 0.820 | 417.059 | 0.030 | n/a | 0.117 | 0.000 | n/a | n/a | 0.102 | 2.878 | 0.009 | 0.102 |
| p99 | 1003.307 | n/a | n/a | n/a | 10.353 | n/a | 0.000 | 0.000 | 3.793 | 1000.929 | 0.902 | n/a | 0.220 | 0.000 | n/a | n/a | 35.855 | 10.353 | 0.121 | 35.855 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd00000000000000bb | 1003.307 | 0.145 | n/a | 0.000 | 0.000 | 1.019 | 1000.929 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 1.118 | 0.145 | 0.000 | 1.118 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000ba | 1001.302 | 2.855 | n/a | 0.000 | 0.000 | 0.895 | 997.339 | 0.012 | n/a | 0.099 | 0.000 | n/a | n/a | 0.102 | 2.855 | 0.003 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000ae | 996.219 | 3.550 | n/a | 0.000 | 0.000 | 0.820 | 991.399 | 0.232 | n/a | 0.123 | 0.000 | n/a | n/a | 0.095 | 3.550 | 0.004 | 0.095 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000d0 | 994.768 | 2.461 | n/a | 0.000 | 0.000 | 3.441 | 988.696 | 0.013 | n/a | 0.071 | 0.000 | n/a | n/a | 0.086 | 2.461 | 0.002 | 0.086 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000b4 | 994.104 | 3.135 | n/a | 0.000 | 0.000 | 0.921 | 988.908 | 0.902 | n/a | 0.140 | 0.000 | n/a | n/a | 0.098 | 3.135 | 0.003 | 0.098 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000ab | 848.832 | 2.980 | n/a | 0.000 | 0.000 | 1.907 | 843.590 | 0.021 | n/a | 0.218 | 0.000 | n/a | n/a | 0.116 | 2.980 | 0.004 | 0.116 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000c2 | 838.615 | 7.248 | n/a | 0.000 | 0.000 | 1.244 | 829.816 | 0.014 | n/a | 0.154 | 0.000 | n/a | n/a | 0.139 | 7.248 | 0.009 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000a8 | 823.581 | 2.340 | n/a | 0.000 | 0.000 | 1.066 | 819.865 | 0.030 | n/a | 0.167 | 0.000 | n/a | n/a | 0.114 | 2.340 | 0.003 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000cb | 697.235 | 2.162 | n/a | 0.000 | 0.000 | 0.509 | 694.404 | 0.011 | n/a | 0.061 | 0.000 | n/a | n/a | 0.088 | 2.162 | 0.003 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000b3 | 617.663 | 6.504 | n/a | 0.000 | 0.000 | 2.099 | 608.536 | 0.060 | n/a | 0.220 | 0.000 | n/a | n/a | 0.244 | 6.504 | 0.011 | 0.244 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000ca | 566.942 | 4.960 | n/a | 0.000 | 0.000 | 3.793 | 557.465 | 0.474 | n/a | 0.090 | 0.000 | n/a | n/a | 0.160 | 4.960 | 0.009 | 0.160 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000c6 | 535.453 | 3.672 | n/a | 0.000 | 0.000 | 1.055 | 529.984 | 0.507 | n/a | 0.108 | 0.000 | n/a | n/a | 0.127 | 3.672 | 0.007 | 0.127 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000c0 | 531.040 | 2.364 | n/a | 0.000 | 0.000 | 1.052 | 527.308 | 0.072 | n/a | 0.149 | 0.000 | n/a | n/a | 0.096 | 2.364 | 0.004 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000c5 | 474.221 | 2.371 | n/a | 0.000 | 0.000 | 0.879 | 470.772 | 0.019 | n/a | 0.102 | 0.000 | n/a | n/a | 0.078 | 2.371 | 0.005 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000b6 | 420.816 | 2.671 | n/a | 0.000 | 0.000 | 0.678 | 417.059 | 0.210 | n/a | 0.120 | 0.000 | n/a | n/a | 0.077 | 2.671 | 0.006 | 0.077 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000c8 | 419.236 | 2.222 | n/a | 0.000 | 0.000 | 0.782 | 415.733 | 0.283 | n/a | 0.131 | 0.000 | n/a | n/a | 0.084 | 2.222 | 0.005 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000a7 | 384.927 | 4.182 | n/a | 0.000 | 0.000 | 0.791 | 379.385 | 0.015 | n/a | 0.130 | 0.000 | n/a | n/a | 0.426 | 4.182 | 0.011 | 0.426 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000b1 | 321.178 | 7.974 | n/a | 0.000 | 0.000 | 1.405 | 311.503 | 0.033 | n/a | 0.110 | 0.000 | n/a | n/a | 0.154 | 7.974 | 0.025 | 0.154 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000b9 | 285.121 | 2.367 | n/a | 0.000 | 0.000 | 0.647 | 281.853 | 0.034 | n/a | 0.133 | 0.000 | n/a | n/a | 0.087 | 2.367 | 0.008 | 0.087 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000b5 | 283.061 | 10.353 | n/a | 0.000 | 0.000 | 0.692 | 271.803 | 0.021 | n/a | 0.100 | 0.000 | n/a | n/a | 0.092 | 10.353 | 0.037 | 0.092 | gw-r/thread-47/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 399.000 | n/a | n/a | n/a | 4.028 | n/a | 0.554 | 0.000 | 0.684 | 394.139 | 0.017 | n/a | 0.069 | 0.000 | n/a | n/a | 0.140 | 4.537 | 0.013 | 0.140 |
| p99 | 1008.177 | n/a | n/a | n/a | 16.655 | n/a | 2.429 | 0.000 | 4.335 | 1003.413 | 1.228 | n/a | 0.139 | 0.000 | n/a | n/a | 44.279 | 18.349 | 0.666 | 44.279 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd00000000000000fe | 1008.177 | 4.815 | n/a | 0.689 | 0.000 | 1.090 | 1001.242 | 0.197 | n/a | 0.070 | 0.000 | n/a | n/a | 0.075 | 5.503 | 0.005 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000de | 1007.706 | 2.426 | n/a | 0.000 | 0.000 | 1.186 | 1003.413 | 0.498 | n/a | 0.096 | 0.000 | n/a | n/a | 0.088 | 2.426 | 0.002 | 0.088 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000010e | 1006.563 | 4.094 | n/a | 0.000 | 0.000 | 2.237 | 999.963 | 0.040 | n/a | 0.081 | 0.000 | n/a | n/a | 0.148 | 4.094 | 0.004 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000df | 1004.503 | 2.640 | n/a | 0.000 | 0.000 | 4.335 | 997.332 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.115 | 2.640 | 0.003 | 0.115 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000d2 | 1004.467 | 2.870 | n/a | 0.000 | 0.000 | 0.652 | 1000.608 | 0.145 | n/a | 0.080 | 0.000 | n/a | n/a | 0.112 | 2.870 | 0.003 | 0.112 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000105 | 1003.251 | 0.117 | n/a | 0.000 | 0.000 | 0.683 | 1001.182 | 0.024 | n/a | 0.139 | 0.000 | n/a | n/a | 1.106 | 0.117 | 0.000 | 1.106 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000d8 | 1002.554 | 0.186 | n/a | 0.000 | 0.000 | 0.520 | 1000.669 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 1.106 | 0.186 | 0.000 | 1.106 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000d1 | 1002.317 | 3.314 | n/a | 0.000 | 0.000 | 0.867 | 997.853 | 0.018 | n/a | 0.122 | 0.000 | n/a | n/a | 0.143 | 3.314 | 0.003 | 0.143 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000da | 979.999 | 4.454 | n/a | 0.000 | 0.000 | 0.545 | 974.578 | 0.204 | n/a | 0.127 | 0.000 | n/a | n/a | 0.091 | 4.454 | 0.005 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000100 | 968.297 | 5.190 | n/a | 0.000 | 0.000 | 0.793 | 962.007 | 0.013 | n/a | 0.138 | 0.000 | n/a | n/a | 0.157 | 5.190 | 0.005 | 0.157 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000e0 | 857.719 | 16.655 | n/a | 1.694 | 0.000 | 1.359 | 837.263 | 0.527 | n/a | 0.081 | 0.000 | n/a | n/a | 0.140 | 18.349 | 0.021 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000102 | 844.705 | 6.307 | n/a | 0.865 | 0.000 | 1.008 | 836.313 | 0.015 | n/a | 0.120 | 0.000 | n/a | n/a | 0.078 | 7.171 | 0.008 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000e4 | 761.773 | 6.556 | n/a | 1.989 | 0.000 | 0.649 | 752.345 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.137 | 8.545 | 0.011 | 0.137 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000eb | 647.035 | 2.999 | n/a | 0.000 | 0.000 | 0.645 | 643.084 | 0.082 | n/a | 0.045 | 0.000 | n/a | n/a | 0.181 | 2.999 | 0.005 | 0.181 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000fb | 639.358 | 5.985 | n/a | 2.429 | 0.000 | 0.684 | 630.017 | 0.020 | n/a | 0.088 | 0.000 | n/a | n/a | 0.134 | 8.415 | 0.013 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000db | 589.898 | 5.685 | n/a | 0.000 | 0.000 | 0.745 | 583.143 | 0.034 | n/a | 0.098 | 0.000 | n/a | n/a | 0.193 | 5.685 | 0.010 | 0.193 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000e8 | 558.079 | 8.130 | n/a | 1.465 | 0.000 | 0.600 | 547.527 | 0.017 | n/a | 0.059 | 0.000 | n/a | n/a | 0.282 | 9.595 | 0.017 | 0.282 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000d3 | 456.994 | 5.291 | n/a | 0.000 | 0.000 | 0.669 | 450.745 | 0.048 | n/a | 0.109 | 0.000 | n/a | n/a | 0.132 | 5.291 | 0.012 | 0.132 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000109 | 453.597 | 12.226 | n/a | 2.198 | 0.000 | 1.625 | 437.256 | 0.011 | n/a | 0.106 | 0.000 | n/a | n/a | 0.176 | 14.424 | 0.032 | 0.176 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000000e6 | 448.987 | 4.152 | n/a | 0.921 | 0.000 | 0.693 | 442.989 | 0.012 | n/a | 0.062 | 0.000 | n/a | n/a | 0.160 | 5.072 | 0.011 | 0.160 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 383.446 | n/a | n/a | n/a | 3.687 | n/a | 0.000 | 0.000 | 0.698 | 370.609 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.088 | 3.687 | 0.010 | 0.088 |
| p99 | 1005.399 | n/a | n/a | n/a | 16.763 | n/a | 1.199 | 0.000 | 8.296 | 1000.663 | 0.566 | n/a | 19.017 | 0.000 | n/a | n/a | 47.725 | 17.779 | 0.694 | 47.725 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd000000000000012b | 1005.399 | 4.643 | n/a | 0.694 | 0.000 | 1.467 | 998.208 | 0.221 | n/a | 0.052 | 0.000 | n/a | n/a | 0.115 | 5.337 | 0.005 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000126 | 1005.127 | 3.726 | n/a | 0.000 | 0.000 | 0.893 | 1000.375 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.080 | 3.726 | 0.004 | 0.080 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000137 | 1005.014 | 0.221 | n/a | 0.000 | 0.000 | 2.900 | 1000.663 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 1.177 | 0.221 | 0.000 | 1.177 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000012a | 995.391 | 3.705 | n/a | 0.000 | 0.000 | 2.194 | 989.229 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.204 | 3.705 | 0.004 | 0.204 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000011d | 995.369 | 2.835 | n/a | 0.000 | 0.000 | 0.531 | 991.879 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.074 | 2.835 | 0.003 | 0.074 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000115 | 995.332 | 4.056 | n/a | 0.000 | 0.000 | 0.746 | 990.375 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.087 | 4.056 | 0.004 | 0.087 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000141 | 911.573 | 2.977 | n/a | 0.000 | 0.000 | 0.566 | 907.920 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.068 | 2.977 | 0.003 | 0.068 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000112 | 874.669 | 8.520 | n/a | 0.000 | 0.000 | 1.714 | 863.543 | 0.566 | n/a | 0.069 | 0.000 | n/a | n/a | 0.257 | 8.520 | 0.010 | 0.257 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000127 | 800.465 | 6.951 | n/a | 1.086 | 0.000 | 0.617 | 791.552 | 0.144 | n/a | 0.035 | 0.000 | n/a | n/a | 0.080 | 8.037 | 0.010 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000011e | 795.659 | 3.636 | n/a | 0.000 | 0.000 | 0.781 | 790.941 | 0.169 | n/a | 0.054 | 0.000 | n/a | n/a | 0.078 | 3.636 | 0.005 | 0.078 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000148 | 728.817 | 3.599 | n/a | 0.000 | 0.000 | 0.645 | 705.457 | 0.023 | n/a | 19.017 | 0.000 | n/a | n/a | 0.076 | 3.599 | 0.005 | 0.076 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000010f | 728.010 | 5.211 | n/a | 0.972 | 0.000 | 8.296 | 713.403 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.072 | 6.183 | 0.008 | 0.072 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000134 | 722.668 | 6.907 | n/a | 0.000 | 0.000 | 0.792 | 714.790 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.110 | 6.907 | 0.010 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000013d | 679.284 | 3.234 | n/a | 0.000 | 0.000 | 0.704 | 675.201 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.075 | 3.234 | 0.005 | 0.075 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000142 | 668.942 | 5.319 | n/a | 0.000 | 0.000 | 0.661 | 662.728 | 0.099 | n/a | 0.055 | 0.000 | n/a | n/a | 0.081 | 5.319 | 0.008 | 0.081 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000132 | 666.196 | 3.168 | n/a | 0.000 | 0.000 | 0.654 | 662.237 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.083 | 3.168 | 0.005 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000139 | 617.589 | 15.134 | n/a | 0.910 | 0.000 | 0.600 | 600.626 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.261 | 16.043 | 0.026 | 0.261 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000124 | 616.761 | 3.726 | n/a | 0.000 | 0.000 | 0.579 | 612.244 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.129 | 3.726 | 0.006 | 0.129 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000012d | 598.552 | 3.914 | n/a | 0.772 | 0.000 | 0.665 | 592.941 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.197 | 4.686 | 0.008 | 0.197 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000012c | 398.093 | 3.687 | n/a | 0.000 | 0.000 | 0.735 | 393.523 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.097 | 3.687 | 0.009 | 0.097 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 452.378 | n/a | n/a | n/a | 3.180 | n/a | 0.000 | 0.000 | 0.688 | 449.363 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.087 | 3.266 | 0.008 | 0.087 |
| p99 | 1005.937 | n/a | n/a | n/a | 7.770 | n/a | 0.744 | 0.000 | 5.332 | 999.837 | 1.198 | n/a | 0.090 | 0.000 | n/a | n/a | 13.103 | 7.770 | 0.365 | 13.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd0000000000000184 | 1005.937 | 5.149 | n/a | 0.000 | 0.000 | 0.832 | 999.837 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.068 | 5.149 | 0.005 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000016d | 1003.824 | 2.973 | n/a | 0.647 | 0.000 | 0.710 | 999.354 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.094 | 3.620 | 0.004 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000164 | 1000.956 | 2.810 | n/a | 0.000 | 0.000 | 0.657 | 997.196 | 0.163 | n/a | 0.042 | 0.000 | n/a | n/a | 0.088 | 2.810 | 0.003 | 0.088 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000017d | 996.854 | 3.817 | n/a | 0.000 | 0.000 | 0.788 | 992.117 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.078 | 3.817 | 0.004 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000154 | 993.879 | 3.429 | n/a | 0.000 | 0.000 | 3.483 | 986.505 | 0.256 | n/a | 0.058 | 0.000 | n/a | n/a | 0.148 | 3.429 | 0.003 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000183 | 990.109 | 2.472 | n/a | 0.000 | 0.000 | 2.450 | 985.043 | 0.005 | n/a | 0.060 | 0.000 | n/a | n/a | 0.081 | 2.472 | 0.002 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000172 | 916.643 | 2.886 | n/a | 0.000 | 0.000 | 0.736 | 912.789 | 0.119 | n/a | 0.045 | 0.000 | n/a | n/a | 0.068 | 2.886 | 0.003 | 0.068 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000159 | 786.975 | 3.180 | n/a | 0.000 | 0.000 | 0.483 | 783.181 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.077 | 3.180 | 0.004 | 0.077 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000155 | 784.870 | 3.816 | n/a | 0.000 | 0.000 | 0.715 | 780.205 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.087 | 3.816 | 0.005 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000178 | 748.881 | 2.929 | n/a | 0.000 | 0.000 | 0.494 | 745.331 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.087 | 2.929 | 0.004 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000014f | 633.558 | 2.050 | n/a | 0.000 | 0.000 | 0.355 | 631.023 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.082 | 2.050 | 0.003 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000182 | 595.824 | 5.992 | n/a | 0.000 | 0.000 | 1.053 | 588.521 | 0.008 | n/a | 0.058 | 0.000 | n/a | n/a | 0.192 | 5.992 | 0.010 | 0.192 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000016b | 589.381 | 2.918 | n/a | 0.000 | 0.000 | 0.616 | 585.312 | 0.366 | n/a | 0.069 | 0.000 | n/a | n/a | 0.101 | 2.918 | 0.005 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000175 | 585.269 | 3.319 | n/a | 0.000 | 0.000 | 0.839 | 580.974 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.090 | 3.319 | 0.006 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000165 | 579.970 | 6.952 | n/a | 0.000 | 0.000 | 2.937 | 569.848 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.165 | 6.952 | 0.012 | 0.165 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000017b | 544.234 | 2.686 | n/a | 0.000 | 0.000 | 0.704 | 540.562 | 0.141 | n/a | 0.042 | 0.000 | n/a | n/a | 0.099 | 2.686 | 0.005 | 0.099 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000186 | 544.135 | 4.140 | n/a | 0.744 | 0.000 | 0.588 | 538.308 | 0.165 | n/a | 0.049 | 0.000 | n/a | n/a | 0.142 | 4.885 | 0.009 | 0.142 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000016f | 523.788 | 4.432 | n/a | 0.000 | 0.000 | 0.777 | 518.346 | 0.117 | n/a | 0.045 | 0.000 | n/a | n/a | 0.070 | 4.432 | 0.008 | 0.070 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000016e | 466.297 | 6.647 | n/a | 0.000 | 0.000 | 0.952 | 458.367 | 0.198 | n/a | 0.052 | 0.000 | n/a | n/a | 0.081 | 6.647 | 0.014 | 0.081 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000017a | 461.687 | 1.736 | n/a | 0.000 | 0.000 | 0.434 | 459.392 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.067 | 1.736 | 0.004 | 0.067 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 329.814 | n/a | n/a | n/a | 2.945 | n/a | 0.000 | 0.000 | 0.563 | 323.512 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.080 | 2.945 | 0.013 | 0.080 |
| p99 | 1001.542 | n/a | n/a | n/a | 11.111 | n/a | 1.035 | 0.000 | 5.700 | 998.520 | 1.901 | n/a | 0.104 | 0.000 | n/a | n/a | 41.497 | 11.111 | 0.332 | 41.497 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd00000000000001a4 | 1001.542 | 2.373 | n/a | 0.000 | 0.000 | 0.503 | 998.520 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.085 | 2.373 | 0.002 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001a3 | 999.723 | 2.829 | n/a | 0.000 | 0.000 | 0.432 | 996.353 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.062 | 2.829 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000188 | 995.437 | 2.852 | n/a | 0.000 | 0.000 | 0.588 | 991.728 | 0.163 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.852 | 0.003 | 0.064 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001c1 | 992.559 | 2.798 | n/a | 0.000 | 0.000 | 1.241 | 988.413 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.065 | 2.798 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001c0 | 990.714 | 2.893 | n/a | 0.000 | 0.000 | 0.536 | 986.746 | 0.402 | n/a | 0.069 | 0.000 | n/a | n/a | 0.068 | 2.893 | 0.003 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000197 | 971.237 | 3.888 | n/a | 0.000 | 0.000 | 2.123 | 963.945 | 1.085 | n/a | 0.033 | 0.000 | n/a | n/a | 0.163 | 3.888 | 0.004 | 0.163 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001a1 | 882.306 | 2.684 | n/a | 0.000 | 0.000 | 0.661 | 878.868 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.058 | 2.684 | 0.003 | 0.058 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000199 | 835.375 | 3.901 | n/a | 0.000 | 0.000 | 0.402 | 830.846 | 0.120 | n/a | 0.026 | 0.000 | n/a | n/a | 0.080 | 3.901 | 0.005 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001d1 | 792.342 | 1.835 | n/a | 0.000 | 0.000 | 4.832 | 785.478 | 0.013 | n/a | 0.104 | 0.000 | n/a | n/a | 0.080 | 1.835 | 0.002 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001be | 767.726 | 2.635 | n/a | 0.000 | 0.000 | 0.685 | 764.293 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.069 | 2.635 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000019d | 670.207 | 3.951 | n/a | 0.000 | 0.000 | 0.492 | 665.641 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.081 | 3.951 | 0.006 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001c2 | 657.605 | 4.067 | n/a | 0.000 | 0.000 | 0.700 | 652.611 | 0.017 | n/a | 0.058 | 0.000 | n/a | n/a | 0.153 | 4.067 | 0.006 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001b2 | 631.528 | 2.485 | n/a | 0.000 | 0.000 | 0.531 | 628.407 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.061 | 2.485 | 0.004 | 0.061 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001ac | 627.281 | 4.681 | n/a | 0.000 | 0.000 | 0.482 | 621.871 | 0.140 | n/a | 0.036 | 0.000 | n/a | n/a | 0.070 | 4.681 | 0.007 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001a5 | 608.857 | 3.628 | n/a | 0.000 | 0.000 | 2.011 | 602.938 | 0.134 | n/a | 0.049 | 0.000 | n/a | n/a | 0.097 | 3.628 | 0.006 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001cd | 540.937 | 11.111 | n/a | 0.000 | 0.000 | 0.891 | 528.545 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.321 | 11.111 | 0.021 | 0.321 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001b5 | 540.577 | 2.945 | n/a | 0.000 | 0.000 | 0.539 | 536.988 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 2.945 | 0.005 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001ca | 530.397 | 2.399 | n/a | 0.000 | 0.000 | 1.582 | 526.177 | 0.140 | n/a | 0.038 | 0.000 | n/a | n/a | 0.061 | 2.399 | 0.005 | 0.061 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000196 | 462.673 | 2.217 | n/a | 0.000 | 0.000 | 0.452 | 459.901 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.067 | 2.217 | 0.005 | 0.067 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001b4 | 459.545 | 7.814 | n/a | 0.000 | 0.000 | 1.942 | 449.304 | 0.348 | n/a | 0.033 | 0.000 | n/a | n/a | 0.104 | 7.814 | 0.017 | 0.104 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 338.151 | n/a | n/a | n/a | 3.097 | n/a | 0.000 | 0.000 | 0.602 | 330.563 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.113 | 3.097 | 0.010 | 0.113 |
| p99 | 1002.901 | n/a | n/a | n/a | 8.323 | n/a | 0.000 | 0.000 | 3.533 | 1000.955 | 0.277 | n/a | 0.085 | 0.000 | n/a | n/a | 34.043 | 8.323 | 0.657 | 34.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd000000000000020e | 1002.901 | 0.150 | n/a | 0.000 | 0.000 | 0.569 | 1000.955 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 1.132 | 0.150 | 0.000 | 1.132 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000213 | 1002.670 | 0.195 | n/a | 0.000 | 0.000 | 0.573 | 1000.707 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 1.151 | 0.195 | 0.000 | 1.151 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000215 | 998.469 | 2.637 | n/a | 0.000 | 0.000 | 3.533 | 992.029 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.217 | 2.637 | 0.003 | 0.217 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000020d | 989.996 | 2.486 | n/a | 0.000 | 0.000 | 1.930 | 985.257 | 0.161 | n/a | 0.074 | 0.000 | n/a | n/a | 0.087 | 2.486 | 0.003 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001e6 | 957.039 | 2.726 | n/a | 0.000 | 0.000 | 0.452 | 953.691 | 0.012 | n/a | 0.068 | 0.000 | n/a | n/a | 0.089 | 2.726 | 0.003 | 0.089 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001fa | 953.165 | 3.151 | n/a | 0.000 | 0.000 | 0.625 | 949.125 | 0.103 | n/a | 0.066 | 0.000 | n/a | n/a | 0.094 | 3.151 | 0.003 | 0.094 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000211 | 940.737 | 2.442 | n/a | 0.000 | 0.000 | 0.705 | 937.339 | 0.107 | n/a | 0.068 | 0.000 | n/a | n/a | 0.075 | 2.442 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000202 | 910.376 | 3.147 | n/a | 0.000 | 0.000 | 0.657 | 906.284 | 0.157 | n/a | 0.058 | 0.000 | n/a | n/a | 0.072 | 3.147 | 0.003 | 0.072 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001fb | 835.415 | 6.173 | n/a | 0.000 | 0.000 | 0.700 | 828.249 | 0.011 | n/a | 0.039 | 0.000 | n/a | n/a | 0.244 | 6.173 | 0.007 | 0.244 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001f3 | 807.828 | 2.472 | n/a | 0.000 | 0.000 | 0.487 | 804.591 | 0.143 | n/a | 0.049 | 0.000 | n/a | n/a | 0.086 | 2.472 | 0.003 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001fe | 780.298 | 3.129 | n/a | 0.000 | 0.000 | 0.602 | 776.418 | 0.012 | n/a | 0.042 | 0.000 | n/a | n/a | 0.095 | 3.129 | 0.004 | 0.095 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001d9 | 757.393 | 4.966 | n/a | 0.000 | 0.000 | 1.067 | 751.169 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.115 | 4.966 | 0.007 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001ec | 755.920 | 3.822 | n/a | 0.000 | 0.000 | 0.721 | 751.143 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.169 | 3.822 | 0.005 | 0.169 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001e4 | 663.303 | 2.996 | n/a | 0.000 | 0.000 | 0.682 | 659.430 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.123 | 2.996 | 0.005 | 0.123 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001f0 | 657.546 | 2.535 | n/a | 0.000 | 0.000 | 0.556 | 654.316 | 0.009 | n/a | 0.030 | 0.000 | n/a | n/a | 0.100 | 2.535 | 0.004 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001d5 | 617.092 | 2.106 | n/a | 0.000 | 0.000 | 0.469 | 614.365 | 0.032 | n/a | 0.057 | 0.000 | n/a | n/a | 0.063 | 2.106 | 0.003 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001f5 | 552.511 | 4.666 | n/a | 0.000 | 0.000 | 0.772 | 546.763 | 0.159 | n/a | 0.046 | 0.000 | n/a | n/a | 0.105 | 4.666 | 0.008 | 0.105 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000020c | 477.109 | 8.323 | n/a | 0.000 | 0.000 | 0.585 | 468.016 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.138 | 8.323 | 0.017 | 0.138 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001dd | 465.314 | 6.235 | n/a | 0.000 | 0.000 | 0.638 | 458.287 | 0.009 | n/a | 0.026 | 0.000 | n/a | n/a | 0.119 | 6.235 | 0.013 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000001ea | 440.731 | 2.481 | n/a | 0.000 | 0.000 | 0.477 | 437.587 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 0.113 | 2.481 | 0.006 | 0.113 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (766 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.590 | n/a | n/a | n/a | 3.328 | n/a | 0.000 | 0.000 | 0.254 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.432 | 3.333 | 0.282 | 7.432 |
| p99 | 104.100 | n/a | n/a | n/a | 13.737 | n/a | 1.162 | 0.000 | 0.815 | 99.273 | 0.120 | n/a | 0.050 | 0.000 | n/a | n/a | 48.414 | 14.338 | 0.814 | 48.414 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd0000000000000221 | 974.710 | 2.968 | n/a | 0.000 | 0.000 | 4.674 | 966.906 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.102 | 2.968 | 0.003 | 0.102 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000222 | 896.865 | 3.000 | n/a | 0.000 | 0.000 | 0.484 | 893.249 | 0.011 | n/a | 0.030 | 0.000 | n/a | n/a | 0.091 | 3.000 | 0.003 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000216 | 888.090 | 2.334 | n/a | 0.000 | 0.000 | 0.697 | 884.926 | 0.007 | n/a | 0.040 | 0.000 | n/a | n/a | 0.086 | 2.334 | 0.003 | 0.086 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000021d | 761.700 | 2.987 | n/a | 0.000 | 0.000 | 0.850 | 756.880 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.924 | 2.987 | 0.004 | 0.924 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000219 | 737.295 | 5.260 | n/a | 0.000 | 0.000 | 0.751 | 731.101 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.121 | 5.260 | 0.007 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000021a | 257.837 | 2.405 | n/a | 0.000 | 0.000 | 0.631 | 254.667 | 0.010 | n/a | 0.051 | 0.000 | n/a | n/a | 0.074 | 2.405 | 0.009 | 0.074 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000021f | 244.872 | 2.742 | n/a | 0.000 | 0.000 | 0.582 | 241.426 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.068 | 2.742 | 0.011 | 0.068 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000217 | 104.100 | 4.119 | n/a | 0.000 | 0.000 | 0.478 | 99.273 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.173 | 4.119 | 0.040 | 0.173 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000313 | 102.109 | 2.393 | n/a | 0.000 | 0.000 | 0.409 | 99.208 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.063 | 2.393 | 0.023 | 0.063 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000004e9 | 98.264 | 5.720 | n/a | 0.811 | 0.000 | 0.454 | 90.904 | 0.176 | n/a | 0.047 | 0.000 | n/a | n/a | 0.152 | 6.531 | 0.066 | 0.152 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000064b | 96.666 | 9.081 | n/a | 0.000 | 0.000 | 0.815 | 86.487 | 0.019 | n/a | 0.054 | 0.000 | n/a | n/a | 0.208 | 9.081 | 0.094 | 0.208 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000005f0 | 93.383 | 6.936 | n/a | 0.000 | 0.000 | 0.460 | 85.818 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.127 | 6.936 | 0.074 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000763 | 90.322 | 5.038 | n/a | 0.000 | 0.000 | 0.543 | 84.544 | 0.008 | n/a | 0.032 | 0.000 | n/a | n/a | 0.158 | 5.038 | 0.056 | 0.158 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000000409 | 88.146 | 9.155 | n/a | 1.004 | 0.000 | 0.500 | 77.258 | 0.086 | n/a | 0.021 | 0.000 | n/a | n/a | 0.122 | 10.159 | 0.115 | 0.122 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000046b | 87.961 | 3.093 | n/a | 0.000 | 0.000 | 0.438 | 84.241 | 0.104 | n/a | 0.015 | 0.000 | n/a | n/a | 0.069 | 3.093 | 0.035 | 0.069 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000007a8 | 83.122 | 2.486 | n/a | 0.000 | 0.000 | 0.715 | 79.677 | 0.106 | n/a | 0.029 | 0.000 | n/a | n/a | 0.109 | 2.486 | 0.030 | 0.109 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000004f2 | 81.597 | 3.524 | n/a | 0.000 | 0.000 | 0.606 | 77.337 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.090 | 3.524 | 0.043 | 0.090 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000082b | 79.897 | 7.246 | n/a | 0.000 | 0.000 | 0.560 | 71.638 | 0.115 | n/a | 0.027 | 0.000 | n/a | n/a | 0.311 | 7.246 | 0.091 | 0.311 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd00000000000002f5 | 79.123 | 11.721 | n/a | 0.000 | 0.000 | 0.652 | 66.400 | 0.130 | n/a | 0.025 | 0.000 | n/a | n/a | 0.195 | 11.721 | 0.148 | 0.195 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd000000000000066e | 78.475 | 4.434 | n/a | 0.000 | 0.000 | 0.420 | 73.355 | 0.156 | n/a | 0.024 | 0.000 | n/a | n/a | 0.085 | 4.434 | 0.057 | 0.085 | gw-r/thread-45/journal/page | none observed |

## P3 / tail / internal (2312 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.559 | n/a | n/a | n/a | 4.131 | n/a | 0.000 | 0.000 | 0.238 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.324 | 4.148 | 0.350 | 6.324 |
| p99 | 334.569 | n/a | n/a | n/a | 18.029 | n/a | 1.638 | 0.000 | 0.934 | 331.313 | 0.119 | n/a | 0.034 | 0.000 | n/a | n/a | 45.544 | 19.428 | 0.857 | 45.544 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 0e43ad2b2625e9dd0000000000001afb | 1002.282 | 0.107 | n/a | 0.000 | 0.000 | 0.377 | 1000.609 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 1.140 | 0.107 | 0.000 | 1.140 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ab4 | 989.830 | 4.634 | n/a | 0.000 | 0.000 | 0.641 | 984.403 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.115 | 4.634 | 0.005 | 0.115 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ab9 | 988.488 | 2.187 | n/a | 0.000 | 0.000 | 0.323 | 985.600 | 0.278 | n/a | 0.025 | 0.000 | n/a | n/a | 0.075 | 2.187 | 0.002 | 0.075 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ab0 | 986.125 | 2.509 | n/a | 0.000 | 0.000 | 0.509 | 983.000 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 2.509 | 0.003 | 0.069 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ad1 | 966.150 | 4.131 | n/a | 0.000 | 0.000 | 0.452 | 961.323 | 0.113 | n/a | 0.021 | 0.000 | n/a | n/a | 0.110 | 4.131 | 0.004 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ac2 | 952.328 | 2.253 | n/a | 0.000 | 0.000 | 0.365 | 949.574 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.070 | 2.253 | 0.002 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001af7 | 924.351 | 3.566 | n/a | 0.000 | 0.000 | 0.726 | 919.794 | 0.103 | n/a | 0.052 | 0.000 | n/a | n/a | 0.110 | 3.566 | 0.004 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001af2 | 924.198 | 4.339 | n/a | 0.000 | 0.000 | 0.457 | 919.111 | 0.120 | n/a | 0.034 | 0.000 | n/a | n/a | 0.138 | 4.339 | 0.005 | 0.138 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001aae | 920.334 | 3.452 | n/a | 0.000 | 0.000 | 0.488 | 916.228 | 0.015 | n/a | 0.042 | 0.000 | n/a | n/a | 0.109 | 3.452 | 0.004 | 0.109 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ab1 | 911.694 | 9.227 | n/a | 1.352 | 0.000 | 0.483 | 900.202 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.401 | 10.578 | 0.012 | 0.401 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001af4 | 803.496 | 2.824 | n/a | 0.000 | 0.000 | 0.492 | 799.846 | 0.098 | n/a | 0.046 | 0.000 | n/a | n/a | 0.191 | 2.824 | 0.004 | 0.191 | gw-r/thread-47/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ad4 | 750.414 | 2.399 | n/a | 0.000 | 0.000 | 0.471 | 747.342 | 0.117 | n/a | 0.021 | 0.000 | n/a | n/a | 0.065 | 2.399 | 0.003 | 0.065 | gw-r/thread-45/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ace | 679.524 | 4.365 | n/a | 0.000 | 0.000 | 0.643 | 674.370 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.110 | 4.365 | 0.006 | 0.110 | gw-r/thread-46/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001aba | 639.563 | 1.562 | n/a | 0.000 | 0.000 | 0.490 | 637.123 | 0.294 | n/a | 0.030 | 0.000 | n/a | n/a | 0.066 | 1.562 | 0.002 | 0.066 | gw-r/thread-49/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001aee | 634.167 | 1.959 | n/a | 0.000 | 0.000 | 0.515 | 631.558 | 0.005 | n/a | 0.025 | 0.000 | n/a | n/a | 0.106 | 1.959 | 0.003 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ad6 | 609.047 | 9.070 | n/a | 0.000 | 0.000 | 0.358 | 599.090 | 0.120 | n/a | 0.036 | 0.000 | n/a | n/a | 0.373 | 9.070 | 0.015 | 0.373 | gw-r/thread-50/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ac9 | 571.603 | 3.066 | n/a | 0.000 | 0.000 | 0.394 | 568.026 | 0.009 | n/a | 0.032 | 0.000 | n/a | n/a | 0.076 | 3.066 | 0.005 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ae4 | 534.274 | 5.511 | n/a | 0.000 | 0.000 | 0.471 | 527.992 | 0.108 | n/a | 0.044 | 0.000 | n/a | n/a | 0.148 | 5.511 | 0.010 | 0.148 | gw-r/thread-48/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001ae9 | 492.521 | 3.350 | n/a | 0.000 | 0.000 | 0.377 | 488.606 | 0.067 | n/a | 0.037 | 0.000 | n/a | n/a | 0.084 | 3.350 | 0.007 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 0e43ad2b2625e9dd0000000000001aec | 482.126 | 5.285 | n/a | 0.000 | 0.000 | 0.387 | 476.246 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.178 | 5.285 | 0.011 | 0.178 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.061 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.815 | 200.987 | 0.020 | n/a | 0.147 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 204.160 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.256 | 202.349 | 3.764 | n/a | 0.333 | 0.000 | n/a | n/a | 0.776 | 0.000 | 0.000 | 0.776 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd0000000000000009 | 204.160 | 0.000 | n/a | 0.000 | 0.000 | 2.256 | 200.987 | 0.012 | n/a | 0.128 | 0.000 | n/a | n/a | 0.776 | 0.000 | 0.000 | 0.776 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000038 | 203.651 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 202.349 | 0.117 | n/a | 0.246 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000020 | 203.471 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.771 | 0.031 | n/a | 0.333 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000012 | 203.363 | 0.000 | n/a | 0.000 | 0.000 | 0.755 | 202.270 | 0.031 | n/a | 0.198 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000013 | 203.221 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 201.929 | 0.048 | n/a | 0.193 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd000000000000002d | 203.141 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.895 | 0.024 | n/a | 0.215 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000034 | 203.081 | 0.000 | n/a | 0.000 | 0.000 | 1.307 | 201.431 | 0.014 | n/a | 0.150 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000024 | 203.053 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.539 | 0.020 | n/a | 0.308 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000019 | 202.897 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 201.407 | 0.018 | n/a | 0.189 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000032 | 202.894 | 0.000 | n/a | 0.000 | 0.000 | 1.148 | 201.234 | 0.014 | n/a | 0.190 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd000000000000003a | 202.878 | 0.000 | n/a | 0.000 | 0.000 | 1.244 | 201.307 | 0.020 | n/a | 0.165 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000023 | 202.859 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 201.617 | 0.043 | n/a | 0.215 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000008 | 202.816 | 0.000 | n/a | 0.000 | 0.000 | 1.271 | 201.249 | 0.014 | n/a | 0.168 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000043 | 202.814 | 0.000 | n/a | 0.000 | 0.000 | 1.246 | 201.205 | 0.014 | n/a | 0.167 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000018 | 202.789 | 0.000 | n/a | 0.000 | 0.000 | 0.902 | 201.399 | 0.025 | n/a | 0.251 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000014 | 202.782 | 0.000 | n/a | 0.000 | 0.000 | 1.180 | 201.253 | 0.025 | n/a | 0.158 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd000000000000001f | 202.759 | 0.000 | n/a | 0.000 | 0.000 | 0.985 | 201.447 | 0.015 | n/a | 0.198 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd000000000000002f | 202.750 | 0.000 | n/a | 0.000 | 0.000 | 1.422 | 200.956 | 0.024 | n/a | 0.125 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd000000000000004a | 202.737 | 0.000 | n/a | 0.000 | 0.000 | 1.093 | 201.278 | 0.054 | n/a | 0.163 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd000000000000004b | 202.680 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 201.574 | 0.045 | n/a | 0.219 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.876 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.801 | 200.866 | 0.013 | n/a | 0.098 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 205.756 | n/a | n/a | n/a | 0.558 | n/a | 0.000 | 0.000 | 3.682 | 204.501 | 3.957 | n/a | 0.319 | 0.000 | n/a | n/a | 0.398 | 0.558 | 0.005 | 0.398 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd0000000000000074 | 205.756 | 0.000 | n/a | 0.000 | 0.000 | 1.044 | 204.501 | 0.019 | n/a | 0.082 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd00000000000000b6 | 203.394 | 0.000 | n/a | 0.000 | 0.000 | 1.934 | 201.182 | 0.012 | n/a | 0.117 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd000000000000007a | 203.011 | 0.000 | n/a | 0.000 | 0.000 | 0.698 | 202.074 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000066 | 202.969 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.619 | 0.019 | n/a | 0.168 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd00000000000000ac | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 1.306 | 201.095 | 0.018 | n/a | 0.131 | 0.000 | n/a | n/a | 0.398 | 0.000 | 0.000 | 0.398 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd000000000000006c | 202.784 | 0.000 | n/a | 0.000 | 0.000 | 1.077 | 201.447 | 0.013 | n/a | 0.130 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000064 | 202.741 | 0.000 | n/a | 0.000 | 0.000 | 0.905 | 201.523 | 0.034 | n/a | 0.151 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd000000000000007e | 202.719 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.460 | 0.059 | n/a | 0.188 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd00000000000000be | 202.646 | 0.000 | n/a | 0.000 | 0.000 | 1.503 | 200.874 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd000000000000008f | 202.623 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 201.090 | 0.012 | n/a | 0.111 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000071 | 202.575 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 201.306 | 0.020 | n/a | 0.146 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd000000000000007b | 202.567 | 0.000 | n/a | 0.000 | 0.000 | 1.179 | 201.052 | 0.012 | n/a | 0.087 | 0.000 | n/a | n/a | 0.237 | 0.000 | 0.000 | 0.237 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000ab | 202.532 | 0.000 | n/a | 0.000 | 0.000 | 1.061 | 201.068 | 0.009 | n/a | 0.191 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000b8 | 202.504 | 0.000 | n/a | 0.000 | 0.000 | 1.157 | 200.848 | 0.013 | n/a | 0.149 | 0.000 | n/a | n/a | 0.337 | 0.000 | 0.000 | 0.337 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000085 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.283 | 0.013 | n/a | 0.108 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000080 | 202.404 | 0.000 | n/a | 0.000 | 0.000 | 0.683 | 201.381 | 0.025 | n/a | 0.189 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000096 | 202.392 | 0.000 | n/a | 0.000 | 0.000 | 0.931 | 201.099 | 0.026 | n/a | 0.137 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000b2 | 202.358 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 201.100 | 0.009 | n/a | 0.113 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000081 | 202.331 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 200.881 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000084 | 202.294 | 0.000 | n/a | 0.000 | 0.000 | 0.809 | 201.151 | 0.022 | n/a | 0.132 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.817 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.780 | 200.812 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 216.434 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 14.923 | 203.428 | 6.613 | n/a | 0.223 | 0.000 | n/a | n/a | 0.430 | 0.000 | 0.000 | 0.430 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd0000000000000125 | 216.434 | 0.000 | n/a | 0.000 | 0.000 | 14.923 | 201.197 | 0.026 | n/a | 0.093 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000d2 | 204.180 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 203.428 | 0.022 | n/a | 0.068 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000102 | 203.401 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 201.980 | 0.042 | n/a | 0.107 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000c8 | 203.228 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 201.999 | 0.038 | n/a | 0.223 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd00000000000000eb | 203.018 | 0.000 | n/a | 0.000 | 0.000 | 1.308 | 201.421 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd00000000000000f6 | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 201.455 | 0.013 | n/a | 0.118 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd00000000000000d9 | 202.615 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.435 | 0.012 | n/a | 0.121 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd00000000000000ee | 202.593 | 0.000 | n/a | 0.000 | 0.000 | 0.786 | 201.562 | 0.025 | n/a | 0.099 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd00000000000000e4 | 202.548 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 201.405 | 0.011 | n/a | 0.120 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000c9 | 202.510 | 0.000 | n/a | 0.000 | 0.000 | 1.228 | 200.991 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000c2 | 202.499 | 0.000 | n/a | 0.000 | 0.000 | 0.758 | 201.447 | 0.016 | n/a | 0.174 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd00000000000000fd | 202.499 | 0.000 | n/a | 0.000 | 0.000 | 1.149 | 201.132 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000111 | 202.369 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.210 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000100 | 202.329 | 0.000 | n/a | 0.000 | 0.000 | 0.890 | 201.169 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000000ff | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.031 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd00000000000000dc | 202.306 | 0.000 | n/a | 0.000 | 0.000 | 0.675 | 201.329 | 0.019 | n/a | 0.158 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd00000000000000d4 | 202.292 | 0.000 | n/a | 0.000 | 0.000 | 0.795 | 201.144 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd00000000000000f8 | 202.286 | 0.000 | n/a | 0.000 | 0.000 | 1.023 | 201.068 | 0.006 | n/a | 0.082 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd00000000000000ef | 202.281 | 0.000 | n/a | 0.000 | 0.000 | 0.836 | 201.257 | 0.006 | n/a | 0.089 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000109 | 202.197 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 201.229 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.688 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.775 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 207.236 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.666 | 204.366 | 5.392 | n/a | 0.116 | 0.000 | n/a | n/a | 0.377 | 0.000 | 0.000 | 0.377 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd000000000000013a | 207.236 | 0.000 | n/a | 0.000 | 0.000 | 2.666 | 204.366 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000158 | 203.172 | 0.000 | n/a | 0.000 | 0.000 | 1.199 | 201.583 | 0.028 | n/a | 0.107 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000163 | 202.888 | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.434 | 0.041 | n/a | 0.078 | 0.000 | n/a | n/a | 0.377 | 0.000 | 0.000 | 0.377 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000147 | 202.554 | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 201.781 | 0.013 | n/a | 0.116 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000178 | 202.477 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 201.754 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd000000000000018a | 202.403 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.420 | 0.016 | n/a | 0.097 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd000000000000013c | 202.393 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 201.086 | 0.006 | n/a | 0.073 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd000000000000014d | 202.391 | 0.000 | n/a | 0.000 | 0.000 | 0.932 | 201.214 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd000000000000015a | 202.372 | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 201.360 | 0.026 | n/a | 0.094 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000143 | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 0.831 | 201.187 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000129 | 202.239 | 0.000 | n/a | 0.000 | 0.000 | 0.916 | 201.089 | 0.011 | n/a | 0.093 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000177 | 202.231 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 200.911 | 0.006 | n/a | 0.100 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000150 | 202.224 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 201.358 | 0.016 | n/a | 0.093 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000142 | 202.177 | 0.000 | n/a | 0.000 | 0.000 | 1.027 | 200.931 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000153 | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 200.966 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd000000000000016f | 202.103 | 0.000 | n/a | 0.000 | 0.000 | 0.908 | 200.946 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000186 | 202.078 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.070 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd000000000000016e | 202.077 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 201.115 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000185 | 202.073 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 200.857 | 0.007 | n/a | 0.070 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000152 | 202.035 | 0.000 | n/a | 0.000 | 0.000 | 0.855 | 200.956 | 0.015 | n/a | 0.074 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.541 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 200.762 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 202.573 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.323 | 2.228 | n/a | 0.098 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd00000000000001c7 | 202.686 | 0.000 | n/a | 0.000 | 0.000 | 1.135 | 201.296 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000001b0 | 202.573 | 0.000 | n/a | 0.000 | 0.000 | 0.946 | 201.337 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd00000000000001d3 | 202.389 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.307 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000001be | 202.374 | 0.000 | n/a | 0.000 | 0.000 | 1.030 | 201.064 | 0.014 | n/a | 0.085 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd00000000000001f7 | 202.367 | 0.000 | n/a | 0.000 | 0.000 | 1.167 | 200.984 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000205 | 202.229 | 0.000 | n/a | 0.000 | 0.000 | 0.669 | 201.323 | 0.016 | n/a | 0.112 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd00000000000001ac | 202.131 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 201.195 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd00000000000001ed | 202.124 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 200.996 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd00000000000001b1 | 202.104 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 201.129 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd00000000000001c3 | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 200.850 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd00000000000001dc | 202.051 | 0.000 | n/a | 0.000 | 0.000 | 0.873 | 200.951 | 0.005 | n/a | 0.071 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd00000000000001e9 | 202.047 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.989 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000202 | 202.040 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 201.063 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd00000000000001e7 | 202.039 | 0.000 | n/a | 0.000 | 0.000 | 0.629 | 201.235 | 0.021 | n/a | 0.057 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd00000000000001e8 | 202.039 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 200.955 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000200 | 202.032 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.054 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd00000000000001ad | 202.019 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 200.924 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd00000000000001f4 | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.750 | 201.047 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd00000000000001b2 | 201.973 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.002 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd00000000000001e2 | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.591 | 201.136 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.645 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.768 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 |
| p99 | 202.712 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 201.561 | 3.144 | n/a | 0.105 | 0.000 | n/a | n/a | 0.358 | 0.000 | 0.000 | 0.358 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd000000000000021b | 205.952 | 0.000 | n/a | 0.000 | 0.000 | 3.090 | 202.639 | 0.029 | n/a | 0.069 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd000000000000020c | 202.712 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.487 | 0.010 | n/a | 0.099 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000275 | 202.485 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 201.561 | 0.016 | n/a | 0.105 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000238 | 202.412 | 0.000 | n/a | 0.000 | 0.000 | 0.927 | 201.173 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000251 | 202.376 | 0.000 | n/a | 0.000 | 0.000 | 0.834 | 201.238 | 0.037 | n/a | 0.079 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000248 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 201.119 | 0.012 | n/a | 0.084 | 0.000 | n/a | n/a | 0.205 | 0.000 | 0.000 | 0.205 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000211 | 202.314 | 0.000 | n/a | 0.000 | 0.000 | 0.748 | 201.318 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000250 | 202.275 | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 200.649 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.358 | 0.000 | 0.000 | 0.358 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000214 | 202.266 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.241 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000230 | 202.170 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 201.254 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd000000000000025a | 202.137 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 201.245 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000243 | 202.133 | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 201.196 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000279 | 202.123 | 0.000 | n/a | 0.000 | 0.000 | 0.989 | 200.827 | 0.009 | n/a | 0.110 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000247 | 202.100 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 200.964 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd000000000000023e | 202.089 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.083 | 0.017 | n/a | 0.077 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd000000000000026a | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.803 | 201.040 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000216 | 202.069 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.025 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000257 | 202.068 | 0.000 | n/a | 0.000 | 0.000 | 0.647 | 201.135 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000210 | 202.062 | 0.000 | n/a | 0.000 | 0.000 | 0.819 | 201.036 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd000000000000027b | 202.049 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 201.166 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-49/journal/page | none observed |

## P3 / L1024 / read (64 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 76.416 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.618 | 75.414 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 205.101 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.163 | 202.926 | 0.701 | n/a | 0.214 | 0.000 | n/a | n/a | 50.336 | 0.000 | 0.000 | 50.336 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd000000000000028f | 205.101 | 0.000 | n/a | 0.000 | 0.000 | 1.970 | 202.926 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd000000000000028b | 204.136 | 0.000 | n/a | 0.000 | 0.000 | 1.574 | 202.061 | 0.019 | n/a | 0.214 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000296 | 202.564 | 0.000 | n/a | 0.000 | 0.000 | 0.877 | 201.321 | 0.012 | n/a | 0.129 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000293 | 202.490 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 201.321 | 0.016 | n/a | 0.083 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000286 | 202.489 | 0.000 | n/a | 0.000 | 0.000 | 1.109 | 201.055 | 0.010 | n/a | 0.090 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000292 | 202.155 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.277 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000280 | 202.053 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 200.963 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000297 | 202.044 | 0.000 | n/a | 0.000 | 0.000 | 0.953 | 200.853 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000299 | 202.039 | 0.000 | n/a | 0.000 | 0.000 | 0.670 | 201.086 | 0.012 | n/a | 0.080 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000294 | 201.947 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 201.002 | 0.023 | n/a | 0.108 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000285 | 201.918 | 0.000 | n/a | 0.000 | 0.000 | 0.593 | 201.073 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000291 | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 0.559 | 201.106 | 0.010 | n/a | 0.097 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd000000000000028c | 201.816 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 200.880 | 0.011 | n/a | 0.068 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000298 | 201.748 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 200.766 | 0.006 | n/a | 0.055 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000284 | 201.671 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 200.737 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000281 | 201.663 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 200.835 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd000000000000027e | 201.626 | 0.000 | n/a | 0.000 | 0.000 | 0.551 | 200.877 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd000000000000028d | 201.522 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 200.787 | 0.019 | n/a | 0.069 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000288 | 201.509 | 0.000 | n/a | 0.000 | 0.000 | 0.605 | 200.652 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd000000000000027f | 201.340 | 0.000 | n/a | 0.000 | 0.000 | 0.443 | 200.735 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-43/journal/page | none observed |

## P3 / tail / read (210 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 85.649 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.500 | 84.662 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 201.979 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.719 | 201.091 | 0.985 | n/a | 0.075 | 0.000 | n/a | n/a | 50.249 | 0.000 | 0.000 | 50.249 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 77ba05e150341bcd0000000000000ec4 | 203.411 | 0.000 | n/a | 0.000 | 0.000 | 1.526 | 201.588 | 0.010 | n/a | 0.102 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000f08 | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 1.230 | 200.811 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000ec9 | 201.979 | 0.000 | n/a | 0.000 | 0.000 | 1.281 | 200.544 | 0.004 | n/a | 0.049 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000ee0 | 201.898 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.091 | 0.015 | n/a | 0.063 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000ec5 | 201.879 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 201.098 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000ef2 | 201.778 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 200.988 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000f18 | 201.771 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 200.833 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000f29 | 201.771 | 0.000 | n/a | 0.000 | 0.000 | 0.614 | 200.913 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000f20 | 201.720 | 0.000 | n/a | 0.000 | 0.000 | 0.743 | 200.807 | 0.004 | n/a | 0.055 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000f02 | 201.712 | 0.000 | n/a | 0.000 | 0.000 | 0.624 | 200.880 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000edf | 201.693 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 200.925 | 0.011 | n/a | 0.051 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 77ba05e150341bcd0000000000000eed | 201.685 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 200.746 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000f22 | 201.663 | 0.000 | n/a | 0.000 | 0.000 | 0.487 | 200.887 | 0.017 | n/a | 0.065 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-50/journal/page | none observed |
| 77ba05e150341bcd0000000000000f23 | 201.660 | 0.000 | n/a | 0.000 | 0.000 | 0.787 | 200.681 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000f0a | 201.652 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 200.809 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 77ba05e150341bcd0000000000000ed2 | 201.632 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 200.801 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-43/journal/page | none observed |
| 77ba05e150341bcd0000000000000f28 | 201.615 | 0.000 | n/a | 0.000 | 0.000 | 0.806 | 200.606 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 77ba05e150341bcd0000000000000ee4 | 201.590 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 200.724 | 0.005 | n/a | 0.057 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-48/journal/page | none observed |
| 77ba05e150341bcd0000000000000efa | 201.563 | 0.000 | n/a | 0.000 | 0.000 | 0.610 | 200.789 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 77ba05e150341bcd0000000000000f2a | 201.556 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 200.811 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

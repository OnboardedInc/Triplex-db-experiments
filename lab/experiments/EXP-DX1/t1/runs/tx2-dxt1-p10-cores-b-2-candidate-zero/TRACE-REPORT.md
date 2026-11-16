# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-44/peer.transact-await (includes order/network/storage)` (104.567 ms, trace `aadfb21218214bb20000000000001e9c`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (80.032 ms, trace `aadfb21218214bb2000000000000014b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (53.511 ms, trace `aadfb21218214bb200000000000001b3`); `node-14/thread-0/driver.queue.subject` (46.183 ms, trace `aadfb21218214bb200000000000011b5`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (44.667 ms, trace `aadfb21218214bb20000000000001e9d`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-cores-b-2-candidate-zero`; source `d709fd769d271992b6a87841489c90665585e919`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 4259/4259 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 4259/4259. Raw trace bytes: 10715746.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 263 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14341.139 | 270.744 | 11.152 | 457 |
| L1 | 0 | 44966.738 | 799.432 | 25.743 | 1476 |
| L4 | 0 | 44976.730 | 941.119 | 25.570 | 1762 |
| L16 | 0 | 44977.422 | 8441.972 | 61.957 | 34248 |
| L64 | 0 | 44982.721 | 8792.392 | 78.621 | 35836 |
| L256 | 0 | 44989.530 | 928.217 | 25.730 | 1560 |
| L1024 | 0 | 44985.452 | 1139.438 | 24.516 | 1598 |
| tail | 0 | 164360.651 | 4012.582 | 77.573 | 6125 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| aadfb21218214bb20000000000001e9c | driver.queue.scheduler-dispatch | 0.091 | none | 0 / 32 |
| aadfb21218214bb20000000000001e9c | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace aadfb21218214bb20000000000001e9c waited: []

| aadfb21218214bb2000000000000014b | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |
| aadfb21218214bb2000000000000014b | driver.queue.scheduler-late | 0.001 | none | 0 / 32 |

Observed active steps while trace aadfb21218214bb2000000000000014b waited: []

| aadfb21218214bb200000000000001b3 | driver.queue.scheduler-dispatch | 0.076 | none | 0 / 32 |
| aadfb21218214bb200000000000001b3 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace aadfb21218214bb200000000000001b3 waited: []

| aadfb21218214bb200000000000011b5 | driver.queue.subject | 46.183 | aadfb21218214bb200000000000011b3 | 3 / 32 |
| aadfb21218214bb200000000000011b5 | driver.queue.scheduler-late | 0.113 | none | 3 / 32 |
| aadfb21218214bb200000000000011b5 | driver.queue.scheduler-dispatch | 0.100 | none | 1 / 32 |

Observed active steps while trace aadfb21218214bb200000000000011b5 waited: [{"at":1794809349226.6758,"inFlight":3,"capacity":32,"active":[{"traceId":"aadfb21218214bb200000000000011b3","step":"triplex.transact"},{"traceId":"aadfb21218214bb200000000000011ba","step":"client.http"},{"traceId":"aadfb21218214bb200000000000011bb","step":"client.http"}]}]

| aadfb21218214bb20000000000001e9d | driver.queue.scheduler-dispatch | 0.039 | none | 1 / 32 |
| aadfb21218214bb20000000000001e9d | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace aadfb21218214bb20000000000001e9d waited: []

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.110 | 0.386 | 0.000 | 0.492 | 4.671 | 0.448 | 0.000 | 0.081 | 1.390 | 6.872 | 0.033 | n/a | 0.338 | 14.070 | n/a | n/a | 0.030 | 5.006 | 0.167 | 0.030 |
| p99 | 60.196 | 3.791 | 0.021 | 3.083 | 18.653 | n/a | 1.821 | 3.370 | 3.748 | 21.882 | 0.159 | n/a | 3.446 | 27.822 | n/a | n/a | 0.190 | 19.109 | 0.370 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000000f3 | 60.196 | 12.356 | 0.404 | 0.000 | 0.097 | 1.822 | 16.497 | 0.159 | n/a | 1.008 | 27.822 | n/a | n/a | 0.030 | 12.858 | 0.214 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| aadfb21218214bb2000000000000011d | 51.707 | 18.653 | 0.364 | 0.000 | 0.092 | 1.875 | 14.431 | 0.038 | n/a | 0.362 | 15.857 | n/a | n/a | 0.034 | 19.109 | 0.370 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| aadfb21218214bb20000000000000105 | 48.653 | 4.120 | 0.310 | 0.000 | 0.073 | 2.026 | 21.882 | 0.115 | n/a | 0.713 | 19.387 | n/a | n/a | 0.027 | 4.503 | 0.093 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| aadfb21218214bb200000000000000f7 | 48.512 | 5.863 | 0.234 | 0.000 | 0.070 | 1.614 | 13.236 | 0.029 | n/a | 0.116 | 27.315 | n/a | n/a | 0.035 | 6.167 | 0.127 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| aadfb21218214bb200000000000000fd | 44.614 | 7.391 | 0.243 | 0.000 | 0.167 | 3.748 | 16.185 | 0.033 | n/a | 0.122 | 16.650 | n/a | n/a | 0.075 | 7.801 | 0.175 | 0.075 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| aadfb21218214bb20000000000000117 | 37.983 | 6.230 | n/a | 0.000 | 3.370 | 3.118 | 1.754 | 0.021 | n/a | 0.100 | 23.320 | n/a | n/a | 0.070 | 9.600 | 0.253 | 0.070 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000010b | 36.451 | 5.102 | 0.205 | 0.000 | 0.133 | 1.205 | 12.716 | 0.035 | n/a | 0.093 | 16.923 | n/a | n/a | 0.041 | 5.439 | 0.149 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| aadfb21218214bb200000000000000f0 | 36.437 | 11.252 | n/a | 1.812 | 0.310 | 1.249 | 6.902 | 0.045 | n/a | 0.143 | 14.557 | n/a | n/a | 0.168 | 13.373 | 0.367 | 0.168 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000129 | 35.945 | 5.265 | 0.148 | 0.000 | 0.063 | 1.372 | 12.604 | 0.073 | n/a | 0.492 | 15.906 | n/a | n/a | 0.023 | 5.476 | 0.152 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| aadfb21218214bb20000000000000121 | 34.272 | 5.177 | 0.297 | 0.000 | 0.061 | 1.832 | 9.135 | 0.035 | n/a | 0.338 | 17.370 | n/a | n/a | 0.026 | 5.535 | 0.161 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.035ms |
| aadfb21218214bb200000000000000fb | 33.220 | 4.671 | 0.281 | 0.000 | 0.054 | 2.129 | 15.071 | 0.032 | n/a | 0.352 | 10.604 | n/a | n/a | 0.026 | 5.006 | 0.151 | 0.026 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.017ms |
| aadfb21218214bb20000000000000107 | 31.567 | 5.293 | n/a | 1.409 | 0.092 | 0.766 | 6.384 | 0.079 | n/a | 3.446 | 14.070 | n/a | n/a | 0.029 | 6.794 | 0.215 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000119 | 28.543 | 5.547 | 0.188 | 0.524 | 0.068 | 2.011 | 8.576 | 0.067 | n/a | 0.652 | 10.888 | n/a | n/a | 0.021 | 6.327 | 0.222 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000010d | 28.512 | 5.433 | 0.448 | 0.000 | 0.099 | 2.417 | 6.872 | 0.033 | n/a | 0.094 | 13.082 | n/a | n/a | 0.034 | 5.980 | 0.210 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000103 | 28.110 | 4.383 | 0.170 | 0.000 | 0.104 | 1.630 | 6.705 | 0.037 | n/a | 0.464 | 14.579 | n/a | n/a | 0.040 | 4.656 | 0.166 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.036ms |
| aadfb21218214bb20000000000000125 | 28.028 | 3.664 | 0.138 | 0.390 | 0.058 | 1.390 | 8.550 | 0.033 | n/a | 0.095 | 13.688 | n/a | n/a | 0.022 | 4.251 | 0.152 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.025ms |
| aadfb21218214bb20000000000000115 | 27.503 | 4.080 | 0.282 | 0.000 | 0.063 | 1.331 | 10.719 | 0.031 | n/a | 0.087 | 10.889 | n/a | n/a | 0.022 | 4.426 | 0.161 | 0.022 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000010f | 26.748 | 5.927 | 0.265 | 0.433 | 0.066 | 1.856 | 8.209 | 0.029 | n/a | 0.390 | 9.550 | n/a | n/a | 0.023 | 6.691 | 0.250 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000000f9 | 26.625 | 3.443 | n/a | 0.000 | 0.156 | 0.894 | 3.585 | 0.025 | n/a | 0.542 | 17.914 | n/a | n/a | 0.064 | 3.600 | 0.135 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000101 | 24.330 | 5.212 | n/a | 1.821 | 0.078 | 1.024 | 1.641 | 0.020 | n/a | 0.088 | 14.419 | n/a | n/a | 0.027 | 7.112 | 0.292 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.888 | 0.426 | 0.000 | 0.495 | 2.258 | n/a | 0.000 | 0.097 | 1.026 | 2.098 | 0.022 | n/a | 0.172 | 9.977 | n/a | n/a | 0.033 | 2.896 | 0.159 | 0.033 |
| p99 | 26.625 | 1.214 | 0.000 | 1.204 | 3.732 | n/a | 0.000 | 0.906 | 2.687 | 4.812 | 0.104 | n/a | 1.484 | 17.914 | n/a | n/a | 0.190 | 3.844 | 0.248 | 0.190 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000000f9 | 26.625 | 3.443 | n/a | 0.000 | 0.156 | 0.894 | 3.585 | 0.025 | n/a | 0.542 | 17.914 | n/a | n/a | 0.064 | 3.600 | 0.135 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000113 | 24.180 | 3.556 | n/a | 0.000 | 0.097 | 2.687 | 1.087 | 0.019 | n/a | 0.117 | 16.584 | n/a | n/a | 0.033 | 3.653 | 0.151 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000000f5 | 19.991 | 3.732 | n/a | 0.000 | 0.112 | 1.567 | 2.839 | 0.091 | n/a | 1.484 | 9.977 | n/a | n/a | 0.190 | 3.844 | 0.192 | 0.190 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.008ms |
| aadfb21218214bb2000000000000011f | 18.554 | 2.229 | n/a | 0.000 | 0.042 | 1.031 | 4.812 | 0.022 | n/a | 0.094 | 10.304 | n/a | n/a | 0.019 | 2.271 | 0.122 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000126 | 15.888 | 2.770 | n/a | 0.000 | 0.126 | 0.463 | 0.775 | 0.013 | n/a | 0.062 | 11.636 | n/a | n/a | 0.043 | 2.896 | 0.182 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000011b | 14.922 | 2.195 | n/a | 0.000 | 0.073 | 1.026 | 1.480 | 0.027 | n/a | 0.150 | 9.945 | n/a | n/a | 0.025 | 2.268 | 0.152 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000111 | 14.589 | 2.258 | n/a | 0.000 | 0.058 | 1.329 | 2.098 | 0.104 | n/a | 0.782 | 7.939 | n/a | n/a | 0.020 | 2.316 | 0.159 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000123 | 12.357 | 2.158 | n/a | 0.000 | 0.906 | 0.723 | 1.174 | 0.021 | n/a | 0.514 | 6.842 | n/a | n/a | 0.019 | 3.063 | 0.248 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000000ff | 11.342 | 1.815 | n/a | 0.000 | 0.074 | 0.780 | 2.634 | 0.021 | n/a | 0.172 | 5.810 | n/a | n/a | 0.035 | 1.889 | 0.167 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 23.920 | 0.000 | 0.000 | 0.495 | 3.809 | n/a | 0.000 | 0.078 | 1.438 | 5.007 | 0.034 | n/a | 0.345 | 11.410 | n/a | n/a | 0.029 | 4.217 | 0.171 | 0.029 |
| p99 | 87.749 | 2.957 | 0.047 | 3.126 | 10.966 | n/a | 0.550 | 2.284 | 4.800 | 17.473 | 1.394 | n/a | 5.236 | 80.032 | n/a | n/a | 0.090 | 11.054 | 0.430 | 0.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb2000000000000014b | 87.749 | 4.171 | n/a | 0.000 | 0.052 | 0.844 | 1.663 | 0.020 | n/a | 0.948 | 80.032 | n/a | n/a | 0.018 | 4.223 | 0.048 | 0.018 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.045ms |
| aadfb21218214bb200000000000001b3 | 72.795 | 3.898 | 0.292 | 0.265 | 0.078 | 1.992 | 12.300 | 0.104 | n/a | 0.325 | 53.511 | n/a | n/a | 0.030 | 4.533 | 0.062 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.025ms |
| aadfb21218214bb2000000000000013b | 56.687 | 4.078 | n/a | 0.000 | 0.076 | 0.936 | 6.944 | 0.032 | n/a | 0.088 | 44.500 | n/a | n/a | 0.031 | 4.154 | 0.073 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000134 | 48.144 | 3.545 | 0.173 | 0.000 | 0.070 | 1.153 | 17.473 | 0.031 | n/a | 0.118 | 25.559 | n/a | n/a | 0.022 | 3.788 | 0.079 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.061ms |
| aadfb21218214bb20000000000000132 | 47.435 | 2.576 | n/a | 0.000 | 0.080 | 2.754 | 1.942 | 0.046 | n/a | 0.218 | 39.793 | n/a | n/a | 0.027 | 2.655 | 0.056 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| aadfb21218214bb20000000000000199 | 43.813 | 4.247 | 0.351 | 0.252 | 0.073 | 2.201 | 16.296 | 0.074 | n/a | 2.333 | 17.957 | n/a | n/a | 0.031 | 4.923 | 0.112 | 0.031 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000015f | 41.663 | 4.149 | 0.293 | 0.353 | 0.092 | 3.699 | 17.435 | 0.067 | n/a | 1.644 | 13.898 | n/a | n/a | 0.032 | 4.886 | 0.117 | 0.032 | gw-w/thread-42/gateway.admitted-work | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb2000000000000012d | 40.109 | 4.422 | 0.317 | 0.322 | 0.235 | 4.291 | 11.752 | 0.087 | n/a | 0.405 | 18.221 | n/a | n/a | 0.057 | 5.295 | 0.132 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms |
| aadfb21218214bb2000000000000013f | 38.940 | 3.919 | 0.197 | 0.329 | 0.143 | 1.274 | 11.114 | 0.035 | n/a | 0.404 | 21.478 | n/a | n/a | 0.046 | 4.589 | 0.118 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000014e | 37.415 | 10.966 | n/a | 0.000 | 0.088 | 1.726 | 5.937 | 0.031 | n/a | 0.076 | 18.554 | n/a | n/a | 0.038 | 11.054 | 0.295 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001d8 | 37.199 | 7.329 | 0.195 | 0.489 | 0.079 | 1.883 | 12.464 | 0.034 | n/a | 0.430 | 14.258 | n/a | n/a | 0.039 | 8.092 | 0.218 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000149 | 36.471 | 5.985 | 0.240 | 0.367 | 0.115 | 2.966 | 10.953 | 0.048 | n/a | 0.102 | 15.656 | n/a | n/a | 0.040 | 6.706 | 0.184 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000013d | 36.127 | 4.640 | 0.463 | 0.550 | 0.063 | 4.410 | 8.501 | 0.032 | n/a | 3.191 | 14.247 | n/a | n/a | 0.029 | 5.717 | 0.158 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000016b | 35.821 | 4.260 | 0.363 | 0.000 | 0.065 | 1.408 | 10.225 | 0.042 | n/a | 0.524 | 18.908 | n/a | n/a | 0.025 | 4.688 | 0.131 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000017f | 34.914 | 5.697 | 0.205 | 0.000 | 0.161 | 1.266 | 10.699 | 0.033 | n/a | 0.118 | 16.684 | n/a | n/a | 0.050 | 6.063 | 0.174 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000015c | 34.811 | 2.136 | n/a | 0.000 | 0.050 | 3.572 | 5.649 | 0.024 | n/a | 0.080 | 23.272 | n/a | n/a | 0.028 | 2.187 | 0.063 | 0.028 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.075ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb2000000000000018d | 34.765 | 4.748 | 0.198 | 0.469 | 0.058 | 1.882 | 11.240 | 0.043 | n/a | 0.434 | 15.669 | n/a | n/a | 0.024 | 5.473 | 0.157 | 0.024 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000012b | 34.061 | 4.340 | 0.278 | 0.360 | 0.127 | 1.609 | 14.932 | 0.030 | n/a | 0.083 | 12.257 | n/a | n/a | 0.045 | 5.105 | 0.150 | 0.045 | gw-w/thread-45/gateway.admitted-work | none observed |
| aadfb21218214bb200000000000001d6 | 33.911 | 3.633 | 0.271 | 0.247 | 0.067 | 1.587 | 14.783 | 0.062 | n/a | 1.532 | 11.696 | n/a | n/a | 0.034 | 4.217 | 0.124 | 0.034 | gw-w/thread-48/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000000185 | 33.122 | 4.529 | 0.257 | 0.376 | 0.201 | 2.010 | 13.835 | 0.077 | n/a | 0.145 | 11.603 | n/a | n/a | 0.090 | 5.363 | 0.162 | 0.090 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.818 | 0.325 | 0.000 | 0.462 | 2.427 | n/a | 0.000 | 0.080 | 0.859 | 1.621 | 0.032 | n/a | 0.390 | 7.891 | n/a | n/a | 0.029 | 2.614 | 0.163 | 0.029 |
| p99 | 47.435 | 2.004 | 0.000 | 1.301 | 6.588 | n/a | 0.000 | 2.284 | 4.359 | 5.251 | 0.081 | n/a | 1.169 | 39.793 | n/a | n/a | 0.049 | 6.649 | 0.430 | 0.049 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000000132 | 47.435 | 2.576 | n/a | 0.000 | 0.080 | 2.754 | 1.942 | 0.046 | n/a | 0.218 | 39.793 | n/a | n/a | 0.027 | 2.655 | 0.056 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| aadfb21218214bb2000000000000015b | 23.920 | 1.998 | n/a | 0.000 | 0.062 | 4.236 | 3.181 | 0.029 | n/a | 0.074 | 14.312 | n/a | n/a | 0.027 | 2.060 | 0.086 | 0.027 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.031ms |
| aadfb21218214bb200000000000001d2 | 22.998 | 2.620 | n/a | 0.000 | 0.076 | 4.105 | 1.338 | 0.026 | n/a | 0.104 | 14.692 | n/a | n/a | 0.037 | 2.696 | 0.117 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| aadfb21218214bb2000000000000017d | 21.465 | 3.590 | n/a | 0.000 | 0.086 | 1.073 | 1.663 | 0.034 | n/a | 0.255 | 14.732 | n/a | n/a | 0.032 | 3.676 | 0.171 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000136 | 19.777 | 6.588 | n/a | 0.000 | 0.062 | 2.317 | 5.251 | 0.072 | n/a | 1.169 | 4.294 | n/a | n/a | 0.025 | 6.649 | 0.336 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.018ms |
| aadfb21218214bb20000000000000181 | 19.052 | 2.198 | n/a | 0.000 | 0.110 | 0.727 | 1.665 | 0.026 | n/a | 0.181 | 14.111 | n/a | n/a | 0.034 | 2.307 | 0.121 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000151 | 18.643 | 2.549 | n/a | 0.000 | 0.089 | 1.287 | 2.529 | 0.056 | n/a | 0.967 | 11.131 | n/a | n/a | 0.035 | 2.638 | 0.142 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| aadfb21218214bb20000000000000147 | 18.492 | 2.186 | n/a | 0.000 | 0.075 | 0.701 | 1.678 | 0.027 | n/a | 0.493 | 13.309 | n/a | n/a | 0.023 | 2.261 | 0.122 | 0.023 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000018b | 17.212 | 1.799 | n/a | 0.000 | 0.043 | 0.698 | 1.916 | 0.040 | n/a | 0.190 | 12.497 | n/a | n/a | 0.029 | 1.842 | 0.107 | 0.029 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001c6 | 16.602 | 2.529 | n/a | 0.000 | 0.052 | 0.824 | 1.567 | 0.049 | n/a | 0.752 | 10.807 | n/a | n/a | 0.021 | 2.582 | 0.155 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000016d | 15.433 | 2.427 | n/a | 0.000 | 0.087 | 2.771 | 1.512 | 0.034 | n/a | 0.677 | 7.891 | n/a | n/a | 0.033 | 2.514 | 0.163 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001bd | 14.818 | 1.562 | n/a | 0.000 | 0.034 | 4.359 | 1.380 | 0.041 | n/a | 1.143 | 6.284 | n/a | n/a | 0.016 | 1.595 | 0.108 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001ce | 14.366 | 2.352 | n/a | 0.000 | 0.078 | 0.924 | 1.282 | 0.027 | n/a | 0.130 | 9.538 | n/a | n/a | 0.036 | 2.430 | 0.169 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001a5 | 14.314 | 2.232 | n/a | 0.000 | 0.104 | 0.644 | 1.172 | 0.020 | n/a | 0.115 | 9.978 | n/a | n/a | 0.048 | 2.337 | 0.163 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001af | 14.189 | 3.033 | n/a | 0.000 | 0.122 | 1.217 | 2.016 | 0.081 | n/a | 0.746 | 6.926 | n/a | n/a | 0.049 | 3.155 | 0.222 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.014ms |
| aadfb21218214bb200000000000001da | 12.584 | 2.377 | n/a | 0.000 | 0.081 | 0.859 | 1.737 | 0.033 | n/a | 0.656 | 6.803 | n/a | n/a | 0.039 | 2.457 | 0.195 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000191 | 11.986 | 2.840 | n/a | 0.000 | 0.090 | 1.102 | 1.621 | 0.032 | n/a | 0.248 | 6.019 | n/a | n/a | 0.035 | 2.930 | 0.244 | 0.035 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000177 | 11.734 | 2.534 | n/a | 0.000 | 0.920 | 0.689 | 2.035 | 0.028 | n/a | 0.716 | 4.780 | n/a | n/a | 0.032 | 3.455 | 0.294 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 0.273ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.035ms |
| aadfb21218214bb20000000000000193 | 11.565 | 2.575 | n/a | 0.000 | 0.039 | 0.770 | 1.069 | 0.021 | n/a | 0.390 | 6.681 | n/a | n/a | 0.021 | 2.614 | 0.226 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001cc | 11.325 | 2.879 | n/a | 0.000 | 0.063 | 0.748 | 1.436 | 0.021 | n/a | 0.146 | 6.007 | n/a | n/a | 0.026 | 2.942 | 0.260 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.093 | 0.000 | 0.000 | 0.490 | 3.468 | n/a | 0.000 | 0.068 | 0.951 | 3.022 | 0.028 | n/a | 0.220 | 9.144 | n/a | n/a | 0.029 | 4.082 | 0.201 | 0.029 |
| p99 | 55.827 | 1.925 | 0.000 | 1.405 | 9.879 | n/a | 0.674 | 2.045 | 5.591 | 21.473 | 0.101 | n/a | 4.248 | 38.416 | n/a | n/a | 0.092 | 10.229 | 0.404 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000001e4 | 56.129 | 2.294 | n/a | 0.000 | 0.046 | 0.900 | 1.729 | 0.067 | n/a | 0.682 | 50.390 | n/a | n/a | 0.021 | 2.340 | 0.042 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001ef | 55.827 | 10.497 | n/a | 0.000 | 0.065 | 4.489 | 23.813 | 0.085 | n/a | 0.228 | 16.620 | n/a | n/a | 0.030 | 10.562 | 0.189 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000024c | 52.307 | 4.881 | 0.309 | 0.460 | 0.102 | 1.611 | 6.032 | 0.036 | n/a | 0.422 | 38.416 | n/a | n/a | 0.039 | 5.752 | 0.110 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| aadfb21218214bb20000000000000220 | 45.690 | 5.295 | 0.143 | 0.229 | 0.013 | 3.681 | 10.493 | 0.049 | n/a | 0.123 | 25.654 | n/a | n/a | 0.009 | 5.680 | 0.124 | 0.009 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001f1 | 43.442 | 5.263 | 0.189 | 0.442 | 0.051 | 1.967 | 21.473 | 0.101 | n/a | 3.015 | 10.918 | n/a | n/a | 0.022 | 5.946 | 0.137 | 0.022 | gw-w/thread-46/storage/begin-command! | none observed |
| aadfb21218214bb200000000000002a9 | 41.276 | 3.457 | 0.186 | 0.292 | 0.058 | 1.118 | 6.673 | 0.026 | n/a | 0.097 | 29.339 | n/a | n/a | 0.030 | 3.993 | 0.097 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.054ms |
| aadfb21218214bb20000000000000242 | 39.406 | 6.823 | 0.199 | 0.302 | 0.083 | 2.276 | 14.151 | 0.075 | n/a | 4.601 | 10.866 | n/a | n/a | 0.030 | 7.406 | 0.188 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001ec | 36.956 | 6.297 | 0.268 | 0.327 | 0.070 | 1.932 | 11.457 | 0.052 | n/a | 0.414 | 16.105 | n/a | n/a | 0.034 | 6.963 | 0.188 | 0.034 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000285 | 36.623 | 3.600 | 0.296 | 0.396 | 0.063 | 1.346 | 16.189 | 0.040 | n/a | 1.159 | 13.505 | n/a | n/a | 0.029 | 4.356 | 0.119 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.046ms |
| aadfb21218214bb20000000000000219 | 36.276 | 4.556 | 0.232 | 0.400 | 0.099 | 4.449 | 14.290 | 0.066 | n/a | 0.126 | 12.018 | n/a | n/a | 0.040 | 5.288 | 0.146 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000215 | 34.890 | 4.960 | 0.174 | 0.452 | 0.069 | 5.591 | 6.662 | 0.081 | n/a | 2.258 | 14.611 | n/a | n/a | 0.033 | 5.655 | 0.162 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000020d | 34.489 | 3.702 | 0.208 | 0.215 | 0.159 | 1.351 | 20.587 | 0.029 | n/a | 2.116 | 6.078 | n/a | n/a | 0.042 | 4.285 | 0.124 | 0.042 | gw-w/thread-49/gateway.admitted-work | none observed |
| aadfb21218214bb2000000000000023c | 33.896 | 4.708 | 0.175 | 0.448 | 0.065 | 1.688 | 5.618 | 0.026 | n/a | 3.202 | 17.939 | n/a | n/a | 0.029 | 5.396 | 0.159 | 0.029 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000201 | 32.176 | 3.468 | 0.199 | 0.408 | 0.079 | 1.794 | 8.206 | 0.094 | n/a | 0.209 | 17.690 | n/a | n/a | 0.030 | 4.153 | 0.129 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000250 | 31.774 | 5.095 | 0.250 | 0.303 | 0.073 | 1.920 | 13.858 | 0.052 | n/a | 0.147 | 10.050 | n/a | n/a | 0.028 | 5.720 | 0.180 | 0.028 | gw-w/thread-47/gateway.admitted-work | driver.reader-basis.broadcast 0.031ms |
| aadfb21218214bb200000000000001fe | 31.750 | 1.646 | n/a | 0.000 | 0.045 | 0.805 | 1.565 | 0.043 | n/a | 0.168 | 27.458 | n/a | n/a | 0.021 | 1.691 | 0.053 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000021f | 31.107 | 5.031 | n/a | 0.000 | 0.056 | 2.135 | 20.630 | 0.078 | n/a | 0.114 | 3.034 | n/a | n/a | 0.029 | 5.087 | 0.164 | 0.029 | gw-w/thread-44/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000000230 | 30.758 | 4.485 | 0.251 | 0.276 | 0.188 | 1.365 | 7.881 | 0.028 | n/a | 0.378 | 15.849 | n/a | n/a | 0.059 | 5.199 | 0.169 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001f9 | 29.568 | 4.618 | 0.292 | 0.466 | 0.080 | 2.012 | 12.895 | 0.048 | n/a | 0.173 | 8.935 | n/a | n/a | 0.049 | 5.456 | 0.185 | 0.049 | gw-w/thread-47/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000000295 | 29.313 | 6.274 | 0.239 | 0.000 | 0.054 | 2.069 | 9.841 | 0.032 | n/a | 0.156 | 10.622 | n/a | n/a | 0.024 | 6.567 | 0.224 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.071ms |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.880 | 0.000 | 0.000 | 0.490 | 2.514 | n/a | 0.000 | 0.065 | 0.808 | 1.608 | 0.028 | n/a | 0.210 | 7.063 | n/a | n/a | 0.029 | 2.626 | 0.198 | 0.029 |
| p99 | 56.129 | 1.604 | 0.000 | 1.382 | 5.031 | n/a | 0.000 | 1.592 | 3.945 | 20.630 | 3.598 | n/a | 3.273 | 50.390 | n/a | n/a | 0.092 | 5.087 | 0.332 | 0.092 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000001e4 | 56.129 | 2.294 | n/a | 0.000 | 0.046 | 0.900 | 1.729 | 0.067 | n/a | 0.682 | 50.390 | n/a | n/a | 0.021 | 2.340 | 0.042 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001fe | 31.750 | 1.646 | n/a | 0.000 | 0.045 | 0.805 | 1.565 | 0.043 | n/a | 0.168 | 27.458 | n/a | n/a | 0.021 | 1.691 | 0.053 | 0.021 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000021f | 31.107 | 5.031 | n/a | 0.000 | 0.056 | 2.135 | 20.630 | 0.078 | n/a | 0.114 | 3.034 | n/a | n/a | 0.029 | 5.087 | 0.164 | 0.029 | gw-w/thread-44/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000000247 | 23.936 | 3.050 | n/a | 0.000 | 0.042 | 0.640 | 4.607 | 0.018 | n/a | 3.273 | 12.281 | n/a | n/a | 0.024 | 3.092 | 0.129 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.071ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb200000000000001e1 | 21.361 | 4.388 | n/a | 0.000 | 0.084 | 0.862 | 1.491 | 0.067 | n/a | 3.244 | 11.182 | n/a | n/a | 0.042 | 4.472 | 0.209 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000029f | 20.285 | 1.950 | n/a | 0.000 | 0.066 | 1.159 | 5.834 | 0.043 | n/a | 0.868 | 10.326 | n/a | n/a | 0.037 | 2.017 | 0.099 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000001e8 | 19.728 | 3.845 | n/a | 0.000 | 0.114 | 0.864 | 1.593 | 0.026 | n/a | 0.130 | 13.106 | n/a | n/a | 0.049 | 3.959 | 0.201 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000211 | 19.093 | 2.108 | n/a | 0.000 | 0.076 | 0.951 | 1.684 | 0.028 | n/a | 0.392 | 13.824 | n/a | n/a | 0.030 | 2.184 | 0.114 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000299 | 18.101 | 3.825 | n/a | 0.000 | 0.195 | 1.090 | 2.884 | 0.051 | n/a | 0.403 | 9.588 | n/a | n/a | 0.066 | 4.020 | 0.222 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000025d | 16.531 | 3.030 | n/a | 0.000 | 0.089 | 0.634 | 4.405 | 0.057 | n/a | 0.112 | 8.171 | n/a | n/a | 0.032 | 3.119 | 0.189 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.079ms |
| aadfb21218214bb20000000000000283 | 16.455 | 2.297 | n/a | 0.000 | 0.054 | 0.755 | 4.165 | 0.021 | n/a | 0.092 | 9.036 | n/a | n/a | 0.036 | 2.351 | 0.143 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000029b | 16.360 | 1.760 | n/a | 0.000 | 0.055 | 3.945 | 1.623 | 0.032 | n/a | 0.141 | 8.778 | n/a | n/a | 0.026 | 1.815 | 0.111 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000279 | 16.083 | 3.139 | n/a | 0.000 | 0.179 | 0.815 | 1.934 | 0.021 | n/a | 0.094 | 9.808 | n/a | n/a | 0.092 | 3.318 | 0.206 | 0.092 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000266 | 16.065 | 4.271 | n/a | 0.000 | 0.086 | 1.410 | 6.558 | 0.046 | n/a | 0.298 | 3.349 | n/a | n/a | 0.047 | 4.357 | 0.271 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000203 | 15.922 | 2.559 | n/a | 0.000 | 0.880 | 0.720 | 1.082 | 0.019 | n/a | 0.095 | 10.550 | n/a | n/a | 0.016 | 3.439 | 0.216 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000224 | 15.155 | 2.514 | n/a | 0.000 | 0.051 | 0.719 | 1.097 | 3.598 | n/a | 0.082 | 7.063 | n/a | n/a | 0.031 | 2.564 | 0.169 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000022c | 14.915 | 2.703 | n/a | 0.000 | 0.116 | 0.811 | 0.994 | 0.018 | n/a | 0.408 | 9.822 | n/a | n/a | 0.042 | 2.819 | 0.189 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000280 | 14.880 | 1.902 | n/a | 0.000 | 0.041 | 0.610 | 1.002 | 0.015 | n/a | 0.290 | 11.000 | n/a | n/a | 0.020 | 1.943 | 0.131 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000002a3 | 13.197 | 2.694 | n/a | 0.000 | 0.160 | 1.027 | 2.252 | 0.049 | n/a | 0.993 | 5.960 | n/a | n/a | 0.062 | 2.854 | 0.216 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000228 | 12.988 | 2.212 | n/a | 0.000 | 0.050 | 0.865 | 1.691 | 0.031 | n/a | 0.793 | 7.327 | n/a | n/a | 0.020 | 2.262 | 0.174 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1701 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.116 | 0.460 | 0.000 | 0.523 | 2.254 | n/a | 0.000 | 0.045 | 0.622 | 1.040 | 0.013 | n/a | 0.125 | 5.297 | n/a | n/a | 0.015 | 2.548 | 0.243 | 0.015 |
| p99 | 38.962 | 2.303 | 0.055 | 1.876 | 6.994 | n/a | 0.259 | 13.510 | 6.684 | 7.671 | 0.049 | n/a | 3.741 | 24.071 | n/a | n/a | 0.053 | 16.314 | 0.625 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000002f9 | 57.125 | 2.703 | n/a | 0.000 | 0.021 | 0.566 | 39.586 | 0.024 | n/a | 1.090 | 13.125 | n/a | n/a | 0.011 | 2.724 | 0.048 | 0.011 | gw-w/thread-48/commit.prepare-and-validate | driver.publication.readback 0.058ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.043ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000000397 | 53.034 | 5.956 | n/a | 0.000 | 16.367 | 1.870 | 4.765 | 0.026 | n/a | 0.092 | 23.936 | n/a | n/a | 0.021 | 22.323 | 0.421 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.048ms; driver.publication.readback 0.043ms; driver.reader-basis.broadcast 0.043ms; driver.publication.readback 0.026ms |
| aadfb21218214bb20000000000000394 | 49.628 | 2.971 | n/a | 0.000 | 0.014 | 1.950 | 0.762 | 0.007 | n/a | 0.015 | 43.902 | n/a | n/a | 0.008 | 2.985 | 0.060 | 0.008 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.reader-basis.broadcast 0.043ms; driver.publication.persist-deferred 0.018ms |
| aadfb21218214bb2000000000000081d | 47.528 | 5.396 | n/a | 0.000 | 0.039 | 15.104 | 4.412 | 0.041 | n/a | 1.650 | 20.870 | n/a | n/a | 0.018 | 5.435 | 0.114 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 1.135ms; driver.publication.readback 0.596ms; driver.reader-basis.broadcast 0.086ms; driver.publication.readback 0.067ms; driver.publication.readback 0.058ms |
| aadfb21218214bb200000000000002f8 | 46.225 | 2.622 | n/a | 0.000 | 0.161 | 0.369 | 1.605 | 0.035 | n/a | 0.139 | 41.284 | n/a | n/a | 0.010 | 2.783 | 0.060 | 0.010 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.060ms; driver.publication.persist-deferred 0.021ms |
| aadfb21218214bb20000000000000393 | 45.628 | 4.029 | n/a | 0.000 | 0.027 | 0.458 | 4.449 | 0.017 | n/a | 0.072 | 36.563 | n/a | n/a | 0.013 | 4.055 | 0.089 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000039d | 44.752 | 2.398 | n/a | 0.000 | 0.032 | 5.276 | 1.018 | 0.017 | n/a | 7.595 | 28.401 | n/a | n/a | 0.016 | 2.430 | 0.054 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.112ms; driver.publication.readback 0.073ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb2000000000000081b | 43.902 | 6.994 | n/a | 0.000 | 16.060 | 0.997 | 1.640 | 0.012 | n/a | 0.073 | 18.102 | n/a | n/a | 0.024 | 23.054 | 0.525 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.596ms; driver.publication.readback 0.067ms; driver.publication.readback 0.058ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.045ms |
| aadfb21218214bb2000000000000054b | 43.660 | 9.972 | n/a | 0.000 | 0.027 | 9.723 | 10.892 | 0.058 | n/a | 1.003 | 11.969 | n/a | n/a | 0.015 | 9.999 | 0.229 | 0.015 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.055ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.014ms |
| aadfb21218214bb20000000000000903 | 43.593 | 3.763 | n/a | 0.000 | 27.376 | 0.702 | 1.010 | 0.014 | n/a | 0.884 | 9.818 | n/a | n/a | 0.025 | 31.140 | 0.714 | 0.025 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.778ms; driver.reader-basis.broadcast 0.116ms; driver.publication.readback 0.065ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms |
| aadfb21218214bb20000000000000902 | 42.469 | 4.953 | n/a | 0.000 | 2.941 | 8.008 | 2.789 | 0.016 | n/a | 0.239 | 23.517 | n/a | n/a | 0.006 | 7.894 | 0.186 | 0.006 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.778ms; driver.reader-basis.broadcast 0.116ms; driver.publication.readback 0.065ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.042ms |
| aadfb21218214bb20000000000000861 | 42.363 | 4.780 | n/a | 0.000 | 0.024 | 0.503 | 1.499 | 0.013 | n/a | 0.053 | 35.478 | n/a | n/a | 0.014 | 4.804 | 0.113 | 0.014 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.042ms; driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb20000000000000363 | 42.111 | 2.419 | n/a | 0.000 | 23.206 | 0.405 | 1.051 | 0.015 | n/a | 0.363 | 14.639 | n/a | n/a | 0.013 | 25.625 | 0.609 | 0.013 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.140ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms; driver.publication.readback 0.050ms |
| aadfb21218214bb20000000000000906 | 41.920 | 2.104 | n/a | 0.000 | 28.850 | 0.688 | 2.890 | 0.026 | n/a | 0.153 | 7.196 | n/a | n/a | 0.014 | 30.954 | 0.738 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.778ms; driver.reader-basis.broadcast 0.116ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms |
| aadfb21218214bb200000000000002ba | 39.774 | 4.677 | 0.552 | 0.429 | 0.041 | 1.680 | 18.361 | 0.044 | n/a | 0.158 | 13.805 | n/a | n/a | 0.027 | 5.699 | 0.143 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| aadfb21218214bb2000000000000073f | 39.462 | 3.111 | n/a | 0.000 | 0.052 | 3.059 | 1.183 | 0.013 | n/a | 0.369 | 31.651 | n/a | n/a | 0.023 | 3.163 | 0.080 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000503 | 39.460 | 2.049 | n/a | 0.000 | 25.965 | 1.781 | 1.814 | 0.028 | n/a | 0.128 | 7.681 | n/a | n/a | 0.015 | 28.013 | 0.710 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.086ms; driver.reader-basis.broadcast 0.067ms |
| aadfb21218214bb2000000000000035e | 38.962 | 3.660 | n/a | 0.000 | 0.724 | 7.103 | 1.891 | 0.027 | n/a | 0.794 | 24.757 | n/a | n/a | 0.005 | 4.384 | 0.113 | 0.005 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.readback 0.059ms; driver.publication.readback 0.058ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| aadfb21218214bb20000000000000519 | 38.885 | 2.448 | n/a | 0.000 | 0.016 | 0.569 | 1.003 | 0.014 | n/a | 0.094 | 34.729 | n/a | n/a | 0.011 | 2.464 | 0.063 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms |
| aadfb21218214bb20000000000000cf5 | 38.385 | 7.278 | n/a | 0.000 | 15.976 | 1.837 | 1.154 | 0.015 | n/a | 0.775 | 11.332 | n/a | n/a | 0.019 | 23.254 | 0.606 | 0.019 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.135ms; driver.publication.persist-deferred 0.021ms |

## P2 / L16 / commit / 5-10 facts (990 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.623 | 0.000 | 0.000 | 0.412 | 1.793 | n/a | 0.000 | 0.044 | 0.593 | 0.868 | 0.013 | n/a | 0.126 | 4.754 | n/a | n/a | 0.014 | 2.031 | 0.223 | 0.014 |
| p99 | 33.468 | 1.999 | 0.053 | 1.081 | 4.935 | n/a | 0.000 | 14.608 | 6.446 | 4.900 | 0.050 | n/a | 3.489 | 21.502 | n/a | n/a | 0.053 | 16.314 | 0.679 | 0.053 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb2000000000000039d | 44.752 | 2.398 | n/a | 0.000 | 0.032 | 5.276 | 1.018 | 0.017 | n/a | 7.595 | 28.401 | n/a | n/a | 0.016 | 2.430 | 0.054 | 0.016 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.112ms; driver.publication.readback 0.073ms; driver.publication.readback 0.037ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000000906 | 41.920 | 2.104 | n/a | 0.000 | 28.850 | 0.688 | 2.890 | 0.026 | n/a | 0.153 | 7.196 | n/a | n/a | 0.014 | 30.954 | 0.738 | 0.014 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.778ms; driver.reader-basis.broadcast 0.116ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms; driver.publication.readback 0.049ms |
| aadfb21218214bb20000000000000503 | 39.460 | 2.049 | n/a | 0.000 | 25.965 | 1.781 | 1.814 | 0.028 | n/a | 0.128 | 7.681 | n/a | n/a | 0.015 | 28.013 | 0.710 | 0.015 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.086ms; driver.reader-basis.broadcast 0.067ms |
| aadfb21218214bb20000000000000519 | 38.885 | 2.448 | n/a | 0.000 | 0.016 | 0.569 | 1.003 | 0.014 | n/a | 0.094 | 34.729 | n/a | n/a | 0.011 | 2.464 | 0.063 | 0.011 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.080ms |
| aadfb21218214bb20000000000000740 | 36.962 | 1.923 | n/a | 0.000 | 0.137 | 3.074 | 0.846 | 0.008 | n/a | 0.060 | 30.811 | n/a | n/a | 0.104 | 2.060 | 0.056 | 0.104 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000000366 | 35.952 | 1.919 | n/a | 0.000 | 1.203 | 8.293 | 4.318 | 0.023 | n/a | 0.069 | 20.118 | n/a | n/a | 0.010 | 3.122 | 0.087 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.140ms; driver.publication.persist-deferred 0.062ms; driver.publication.readback 0.058ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.038ms |
| aadfb21218214bb20000000000000e23 | 35.732 | 2.591 | n/a | 0.000 | 0.777 | 0.770 | 1.414 | 0.031 | n/a | 0.198 | 29.931 | n/a | n/a | 0.020 | 3.368 | 0.094 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000036c | 34.976 | 1.330 | n/a | 0.000 | 21.739 | 0.484 | 1.278 | 0.027 | n/a | 0.114 | 9.994 | n/a | n/a | 0.010 | 23.069 | 0.660 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.067ms; driver.publication.readback 0.055ms; driver.publication.readback 0.053ms; driver.publication.readback 0.040ms; driver.publication.persist-deferred 0.038ms |
| aadfb21218214bb20000000000000647 | 33.648 | 3.635 | n/a | 0.000 | 6.493 | 0.729 | 1.385 | 0.024 | n/a | 1.171 | 20.196 | n/a | n/a | 0.014 | 10.128 | 0.301 | 0.014 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.172ms; driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.028ms |
| aadfb21218214bb20000000000000818 | 33.468 | 1.427 | n/a | 0.000 | 15.403 | 10.725 | 0.896 | 0.011 | n/a | 0.854 | 4.139 | n/a | n/a | 0.012 | 16.830 | 0.503 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.596ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.045ms; driver.publication.readback 0.035ms; driver.publication.persist-deferred 0.025ms |
| aadfb21218214bb2000000000000039b | 33.079 | 2.990 | n/a | 2.137 | 4.827 | 0.631 | 0.916 | 0.010 | n/a | 0.041 | 21.502 | n/a | n/a | 0.024 | 9.954 | 0.301 | 0.024 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.043ms; driver.publication.readback 0.026ms; driver.publication.readback 0.015ms; driver.publication.persist-deferred 0.014ms |
| aadfb21218214bb20000000000000646 | 32.380 | 4.390 | n/a | 0.000 | 5.178 | 3.622 | 0.826 | 0.008 | n/a | 0.429 | 17.891 | n/a | n/a | 0.036 | 9.568 | 0.295 | 0.036 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.172ms; driver.publication.readback 0.117ms; driver.publication.persist-deferred 0.028ms |
| aadfb21218214bb20000000000000fb0 | 32.136 | 1.391 | n/a | 0.000 | 0.024 | 0.348 | 1.113 | 0.009 | n/a | 1.049 | 28.191 | n/a | n/a | 0.011 | 1.415 | 0.044 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.179ms; driver.publication.readback 0.054ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.019ms |
| aadfb21218214bb20000000000000329 | 30.603 | 3.309 | n/a | 0.000 | 17.470 | 0.750 | 0.941 | 0.016 | n/a | 0.133 | 7.945 | n/a | n/a | 0.039 | 20.779 | 0.679 | 0.039 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.086ms; driver.publication.readback 0.054ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.044ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb2000000000000083e | 30.505 | 1.726 | n/a | 0.000 | 17.609 | 0.400 | 0.867 | 0.014 | n/a | 0.416 | 9.459 | n/a | n/a | 0.013 | 19.335 | 0.634 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.255ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.013ms |
| aadfb21218214bb200000000000009a9 | 29.659 | 1.865 | n/a | 0.000 | 2.198 | 1.860 | 0.618 | 0.012 | n/a | 2.853 | 20.240 | n/a | n/a | 0.015 | 4.063 | 0.137 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms; driver.publication.readback 0.069ms; driver.publication.readback 0.066ms; driver.publication.readback 0.058ms; driver.publication.readback 0.042ms |
| aadfb21218214bb20000000000000e24 | 28.304 | 1.317 | n/a | 0.000 | 0.034 | 2.494 | 0.773 | 0.016 | n/a | 0.140 | 23.516 | n/a | n/a | 0.016 | 1.351 | 0.048 | 0.016 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.018ms |
| aadfb21218214bb20000000000000396 | 28.104 | 1.800 | n/a | 0.000 | 0.040 | 11.877 | 1.181 | 0.028 | n/a | 3.138 | 10.021 | n/a | n/a | 0.019 | 1.840 | 0.065 | 0.019 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.051ms; driver.publication.readback 0.048ms; driver.reader-basis.broadcast 0.043ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.018ms |
| aadfb21218214bb2000000000000083d | 27.887 | 1.333 | n/a | 0.000 | 0.021 | 0.293 | 0.552 | 0.007 | n/a | 0.437 | 25.234 | n/a | n/a | 0.011 | 1.354 | 0.049 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.255ms; driver.publication.persist-deferred 0.022ms |
| aadfb21218214bb20000000000000731 | 27.875 | 1.741 | n/a | 0.000 | 10.104 | 0.556 | 2.039 | 0.039 | n/a | 0.161 | 13.220 | n/a | n/a | 0.014 | 11.845 | 0.425 | 0.014 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.155ms; driver.publication.readback 0.115ms; driver.publication.persist-deferred 0.083ms; driver.publication.persist-deferred 0.021ms; driver.publication.persist-deferred 0.013ms |

## P2/P4 / read-your-own-write / read (37 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.335 | n/a | n/a | n/a | 36.529 | 2.292 | 3.745 | 0.000 | 0.470 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.762 | 54.631 | 0.755 | 12.762 |
| p99 | 219.439 | n/a | n/a | n/a | 100.018 | 93.373 | 18.594 | 0.000 | 104.986 | 83.324 | 60.161 | n/a | 0.014 | 0.000 | n/a | n/a | 88.353 | 119.139 | 1.000 | 88.353 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000002123 | 219.439 | 100.018 | 0.526 | 18.594 | 0.000 | 16.948 | 83.324 | 0.003 | n/a | 0.012 | 0.000 | n/a | n/a | 0.013 | 119.139 | 0.543 | 0.013 | gw-r/thread-44/gateway.admitted-work | driver.expected-state.bind-receipt 2.344ms; client.encode 1.045ms; driver.reader-basis.broadcast 0.347ms; driver.reader-basis.broadcast 0.266ms; driver.publication.readback 0.136ms |
| aadfb21218214bb200000000000017b7 | 177.149 | 51.278 | 4.434 | 3.354 | 0.000 | 104.986 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.097 | 59.066 | 0.333 | 13.097 | node-14/thread-3/socket.queue-and-write | driver.expected-state.bind-receipt 1.400ms; driver.expected-state.bind-receipt 1.078ms; driver.reader-basis.broadcast 0.261ms; driver.reader-basis.broadcast 0.261ms; driver.publication.persist-deferred 0.131ms |
| aadfb21218214bb200000000000017b4 | 143.952 | 30.074 | 2.292 | 0.860 | 0.000 | 97.335 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.391 | 33.226 | 0.231 | 13.391 | node-14/thread-3/socket.queue-and-write | driver.expected-state.bind-receipt 1.400ms; driver.expected-state.bind-receipt 1.078ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.111ms; driver.publication.readback 0.084ms |
| aadfb21218214bb2000000000000113d | 132.841 | 35.306 | 4.514 | 4.109 | 0.000 | 0.558 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 88.353 | 43.929 | 0.331 | 88.353 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.220ms; driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.110ms; driver.publication.readback 0.089ms; driver.publication.readback 0.068ms |
| aadfb21218214bb200000000000017b1 | 123.539 | 42.818 | 1.779 | 10.034 | 0.000 | 0.459 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 68.449 | 54.631 | 0.442 | 68.449 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.400ms; driver.expected-state.bind-receipt 1.078ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.111ms; driver.publication.readback 0.084ms |
| aadfb21218214bb200000000000017d8 | 116.873 | 34.979 | 0.184 | 1.720 | 0.000 | 28.812 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 51.178 | 36.883 | 0.316 | 51.178 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.609ms; driver.publication.readback 0.482ms; driver.reader-basis.broadcast 0.272ms; driver.publication.persist-deferred 0.156ms; driver.publication.readback 0.118ms |
| aadfb21218214bb20000000000001142 | 112.677 | 14.057 | 93.373 | 0.000 | 0.000 | 0.469 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.778 | 107.430 | 0.953 | 4.778 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.183ms; driver.publication.readback 0.089ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms; driver.publication.readback 0.057ms |
| aadfb21218214bb2000000000000125c | 106.078 | 22.652 | 6.144 | 1.216 | 0.000 | 6.177 | 9.707 | 60.161 | n/a | 0.014 | 0.000 | n/a | n/a | 0.006 | 30.012 | 0.283 | 0.006 | gw-r/thread-62/gateway.admission-wait | driver.reader-basis.broadcast 0.493ms; driver.publication.readback 0.155ms; driver.publication.readback 0.119ms; driver.publication.readback 0.118ms; driver.publication.readback 0.053ms |
| aadfb21218214bb2000000000000113e | 102.800 | 70.012 | 4.198 | 8.276 | 0.000 | 0.455 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 19.859 | 82.486 | 0.802 | 19.859 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.220ms; driver.publication.readback 0.110ms; driver.publication.readback 0.089ms; driver.publication.readback 0.068ms; driver.publication.readback 0.057ms |
| aadfb21218214bb200000000000017af | 101.592 | 68.958 | 2.671 | 5.032 | 0.000 | 0.429 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 24.502 | 76.661 | 0.755 | 24.502 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.400ms; driver.expected-state.bind-receipt 1.078ms; driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.111ms; driver.publication.readback 0.075ms |
| aadfb21218214bb20000000000000613 | 100.360 | 74.305 | 0.665 | 8.761 | 0.000 | 0.810 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.819 | 83.732 | 0.834 | 15.819 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.322ms; driver.publication.readback 0.173ms; driver.publication.readback 0.094ms; driver.reader-basis.broadcast 0.076ms; driver.publication.readback 0.073ms |
| aadfb21218214bb2000000000000125b | 98.944 | 23.740 | 0.213 | 0.000 | 0.000 | 8.512 | 66.464 | 0.004 | n/a | 0.005 | 0.000 | n/a | n/a | 0.006 | 23.953 | 0.242 | 0.006 | gw-r/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.493ms; driver.publication.readback 0.155ms; driver.publication.readback 0.119ms; driver.publication.readback 0.118ms; driver.publication.readback 0.055ms |
| aadfb21218214bb200000000000017d6 | 94.944 | 36.366 | 0.297 | 1.435 | 0.000 | 0.501 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 56.345 | 38.098 | 0.401 | 56.345 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.482ms; driver.reader-basis.broadcast 0.272ms; driver.publication.readback 0.118ms; driver.publication.readback 0.104ms; driver.publication.readback 0.051ms |
| aadfb21218214bb2000000000000141b | 90.254 | 78.128 | 0.362 | 2.924 | 0.000 | 2.783 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.057 | 81.414 | 0.902 | 6.057 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.437ms; driver.expected-state.bind-receipt 1.136ms; driver.expected-state.bind-receipt 1.035ms; driver.reader-basis.broadcast 1.033ms; driver.publication.readback 0.173ms |
| aadfb21218214bb20000000000000fba | 89.557 | 52.592 | 0.310 | 6.179 | 0.000 | 0.470 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 30.007 | 59.080 | 0.660 | 30.007 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.121ms; driver.publication.readback 0.072ms; driver.publication.readback 0.031ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.007ms |
| aadfb21218214bb200000000000013f3 | 85.499 | 61.859 | 7.948 | 3.745 | 0.000 | 0.762 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.185 | 73.552 | 0.860 | 11.185 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.544ms; driver.publication.readback 0.188ms; driver.publication.readback 0.126ms; driver.publication.persist-deferred 0.089ms; driver.publication.readback 0.065ms |
| aadfb21218214bb20000000000001321 | 81.735 | 40.548 | 1.285 | 4.629 | 0.000 | 0.419 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 34.854 | 46.462 | 0.568 | 34.854 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.119ms; driver.publication.readback 0.079ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.030ms |
| aadfb21218214bb20000000000001673 | 80.790 | 61.162 | 5.920 | 5.909 | 0.000 | 7.139 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.660 | 72.991 | 0.903 | 0.660 | node-14/thread-2/replica.pull-at | driver.reader-basis.broadcast 0.631ms; driver.publication.readback 0.089ms; driver.publication.readback 0.074ms; driver.publication.readback 0.048ms; driver.publication.readback 0.043ms |
| aadfb21218214bb20000000000000ab8 | 80.335 | 26.225 | 3.282 | 1.910 | 0.000 | 0.200 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.718 | 31.417 | 0.391 | 48.718 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.142ms; driver.publication.readback 0.066ms; driver.publication.readback 0.054ms; driver.publication.readback 0.039ms; driver.publication.readback 0.037ms |
| aadfb21218214bb20000000000001939 | 79.382 | 38.734 | 17.104 | 3.842 | 0.000 | 4.138 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 15.564 | 59.680 | 0.752 | 15.564 | node-14/thread-3/client.reach-decode-and-cache | driver.publication.readback 0.159ms; driver.publication.readback 0.062ms; driver.publication.readback 0.060ms; driver.publication.readback 0.050ms; driver.publication.readback 0.035ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 22.866 | 0.478 | 0.000 | 0.581 | 3.522 | 0.297 | 0.000 | 0.042 | 4.215 | 7.027 | 0.032 | n/a | 0.174 | 7.542 | n/a | n/a | 0.015 | 3.861 | 0.169 | 0.015 |
| p99 | 22.866 | 0.478 | 0.000 | 0.581 | 3.522 | 0.297 | 0.000 | 0.042 | 4.215 | 7.027 | 0.032 | n/a | 0.174 | 7.542 | n/a | n/a | 0.015 | 3.861 | 0.169 | 0.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000000fe6 | 22.866 | 3.522 | 0.297 | 0.000 | 0.042 | 4.215 | 7.027 | 0.032 | n/a | 0.174 | 7.542 | n/a | n/a | 0.015 | 3.861 | 0.169 | 0.015 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.310ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.014ms |

## P2 / L64 / commit (1776 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.884 | 0.333 | 0.000 | 0.497 | 2.193 | n/a | 0.000 | 0.038 | 0.535 | 0.943 | 0.013 | n/a | 0.083 | 4.738 | n/a | n/a | 0.012 | 2.487 | 0.257 | 0.012 |
| p99 | 34.121 | 2.017 | 0.041 | 1.957 | 6.703 | n/a | 0.239 | 10.556 | 6.339 | 9.220 | 0.052 | n/a | 2.988 | 22.253 | n/a | n/a | 0.040 | 13.257 | 0.654 | 0.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000011b5 | 65.619 | 1.144 | n/a | 0.000 | 46.395 | 0.709 | 1.362 | 0.031 | n/a | 5.340 | 10.629 | n/a | n/a | 0.009 | 47.540 | 0.724 | 0.009 | node-14/thread-0/driver.queue.subject | driver.oracle-record 4.188ms; driver.expected-state.bind-receipt 1.052ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.167ms; driver.publication.readback 0.103ms |
| aadfb21218214bb200000000000010d4 | 50.267 | 3.326 | n/a | 0.000 | 0.030 | 0.791 | 2.169 | 0.027 | n/a | 0.096 | 43.817 | n/a | n/a | 0.012 | 3.356 | 0.067 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.434ms; driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.014ms |
| aadfb21218214bb200000000000011b3 | 49.680 | 4.468 | n/a | 0.000 | 0.019 | 20.004 | 8.625 | 0.045 | n/a | 0.155 | 16.356 | n/a | n/a | 0.009 | 4.486 | 0.090 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.oracle-record 4.188ms; driver.expected-state.bind-receipt 1.052ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.103ms; driver.publication.readback 0.064ms |
| aadfb21218214bb200000000000010d6 | 49.010 | 1.849 | n/a | 0.000 | 1.071 | 3.606 | 0.875 | 0.014 | n/a | 0.049 | 41.539 | n/a | n/a | 0.007 | 2.920 | 0.060 | 0.007 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.434ms; driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb200000000000010d7 | 47.583 | 1.183 | n/a | 0.000 | 0.016 | 1.454 | 0.785 | 0.008 | n/a | 0.034 | 44.094 | n/a | n/a | 0.008 | 1.200 | 0.025 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.434ms; driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.064ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.019ms |
| aadfb21218214bb20000000000001804 | 44.823 | 3.338 | n/a | 0.000 | 3.675 | 0.307 | 2.036 | 0.019 | n/a | 0.048 | 35.393 | n/a | n/a | 0.006 | 7.013 | 0.156 | 0.006 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.readback 0.068ms; driver.publication.readback 0.045ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb2000000000000117f | 44.465 | 3.430 | n/a | 0.000 | 0.025 | 0.431 | 3.536 | 0.013 | n/a | 0.053 | 36.967 | n/a | n/a | 0.011 | 3.455 | 0.078 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.075ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb200000000000010d9 | 43.355 | 4.540 | n/a | 0.000 | 1.593 | 0.550 | 0.966 | 0.012 | n/a | 0.073 | 35.609 | n/a | n/a | 0.012 | 6.134 | 0.141 | 0.012 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.434ms; driver.publication.readback 0.064ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.019ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000001182 | 42.198 | 4.149 | n/a | 0.000 | 0.012 | 0.726 | 4.317 | 0.040 | n/a | 0.150 | 32.797 | n/a | n/a | 0.007 | 4.161 | 0.099 | 0.007 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.publication.readback 0.064ms; driver.publication.readback 0.063ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb2000000000000147d | 41.610 | 1.580 | n/a | 0.000 | 0.031 | 0.503 | 20.013 | 0.004 | n/a | 0.016 | 19.447 | n/a | n/a | 0.016 | 1.611 | 0.039 | 0.016 | gw-w/thread-65/commit.prepare-and-validate | driver.reader-basis.broadcast 0.272ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000001803 | 39.531 | 1.598 | n/a | 0.000 | 2.263 | 0.956 | 1.242 | 0.023 | n/a | 1.088 | 32.353 | n/a | n/a | 0.007 | 3.862 | 0.098 | 0.007 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.readback 0.045ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| aadfb21218214bb20000000000001127 | 37.731 | 2.259 | n/a | 0.000 | 3.788 | 1.615 | 0.645 | 0.005 | n/a | 3.249 | 26.166 | n/a | n/a | 0.004 | 6.047 | 0.160 | 0.004 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.114ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.043ms; driver.publication.readback 0.042ms |
| aadfb21218214bb200000000000010fb | 35.821 | 7.676 | n/a | 0.000 | 0.525 | 7.563 | 5.864 | 0.059 | n/a | 0.079 | 14.019 | n/a | n/a | 0.037 | 8.201 | 0.229 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.160ms; driver.publication.readback 0.123ms; driver.publication.persist-deferred 0.019ms |
| aadfb21218214bb20000000000001805 | 35.440 | 2.171 | n/a | 0.000 | 0.334 | 1.826 | 0.971 | 0.014 | n/a | 0.046 | 30.074 | n/a | n/a | 0.004 | 2.506 | 0.071 | 0.004 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb2000000000000142d | 35.245 | 2.648 | n/a | 0.000 | 0.092 | 25.916 | 0.916 | 0.014 | n/a | 0.250 | 5.392 | n/a | n/a | 0.016 | 2.740 | 0.078 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| aadfb21218214bb2000000000000153f | 35.213 | 1.141 | n/a | 0.000 | 26.777 | 2.413 | 0.647 | 0.010 | n/a | 0.071 | 4.145 | n/a | n/a | 0.009 | 27.918 | 0.793 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.032ms; driver.publication.readback 0.029ms |
| aadfb21218214bb20000000000001b0a | 34.891 | 1.913 | n/a | 0.000 | 23.876 | 2.396 | 0.715 | 0.014 | n/a | 0.538 | 5.429 | n/a | n/a | 0.010 | 25.790 | 0.739 | 0.010 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb200000000000016f3 | 34.121 | 3.069 | n/a | 0.000 | 0.009 | 18.101 | 4.771 | 0.004 | n/a | 0.017 | 8.146 | n/a | n/a | 0.004 | 3.077 | 0.090 | 0.004 | node-14/thread-0/socket.wait-first-byte | driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.008ms |
| aadfb21218214bb200000000000011e1 | 33.830 | 8.439 | n/a | 0.000 | 0.019 | 4.049 | 6.608 | 0.030 | n/a | 0.167 | 14.508 | n/a | n/a | 0.009 | 8.458 | 0.250 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms; driver.publication.readback 0.114ms; driver.publication.persist-deferred 0.035ms |
| aadfb21218214bb200000000000016f2 | 33.597 | 1.617 | n/a | 0.000 | 0.024 | 0.376 | 24.107 | 0.012 | n/a | 0.039 | 7.408 | n/a | n/a | 0.013 | 1.641 | 0.049 | 0.013 | gw-w/thread-65/commit.prepare-and-validate | none observed |

## P2 / L64 / commit / 5-10 facts (1060 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.548 | 0.000 | 0.000 | 0.391 | 1.740 | n/a | 0.000 | 0.037 | 0.518 | 0.810 | 0.013 | n/a | 0.080 | 4.216 | n/a | n/a | 0.012 | 1.956 | 0.241 | 0.012 |
| p99 | 33.830 | 1.998 | 0.037 | 0.943 | 5.660 | n/a | 0.000 | 12.198 | 6.701 | 6.608 | 0.050 | n/a | 2.968 | 19.447 | n/a | n/a | 0.041 | 13.138 | 0.648 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000011b5 | 65.619 | 1.144 | n/a | 0.000 | 46.395 | 0.709 | 1.362 | 0.031 | n/a | 5.340 | 10.629 | n/a | n/a | 0.009 | 47.540 | 0.724 | 0.009 | node-14/thread-0/driver.queue.subject | driver.oracle-record 4.188ms; driver.expected-state.bind-receipt 1.052ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.167ms; driver.publication.readback 0.103ms |
| aadfb21218214bb200000000000011b3 | 49.680 | 4.468 | n/a | 0.000 | 0.019 | 20.004 | 8.625 | 0.045 | n/a | 0.155 | 16.356 | n/a | n/a | 0.009 | 4.486 | 0.090 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.oracle-record 4.188ms; driver.expected-state.bind-receipt 1.052ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.103ms; driver.publication.readback 0.064ms |
| aadfb21218214bb200000000000010d7 | 47.583 | 1.183 | n/a | 0.000 | 0.016 | 1.454 | 0.785 | 0.008 | n/a | 0.034 | 44.094 | n/a | n/a | 0.008 | 1.200 | 0.025 | 0.008 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.434ms; driver.reader-basis.broadcast 0.177ms; driver.publication.readback 0.064ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.019ms |
| aadfb21218214bb2000000000000147d | 41.610 | 1.580 | n/a | 0.000 | 0.031 | 0.503 | 20.013 | 0.004 | n/a | 0.016 | 19.447 | n/a | n/a | 0.016 | 1.611 | 0.039 | 0.016 | gw-w/thread-65/commit.prepare-and-validate | driver.reader-basis.broadcast 0.272ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000001803 | 39.531 | 1.598 | n/a | 0.000 | 2.263 | 0.956 | 1.242 | 0.023 | n/a | 1.088 | 32.353 | n/a | n/a | 0.007 | 3.862 | 0.098 | 0.007 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.072ms; driver.publication.readback 0.045ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.017ms; driver.publication.persist-deferred 0.016ms |
| aadfb21218214bb20000000000001127 | 37.731 | 2.259 | n/a | 0.000 | 3.788 | 1.615 | 0.645 | 0.005 | n/a | 3.249 | 26.166 | n/a | n/a | 0.004 | 6.047 | 0.160 | 0.004 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.114ms; driver.publication.readback 0.057ms; driver.publication.readback 0.051ms; driver.publication.persist-deferred 0.043ms; driver.publication.readback 0.042ms |
| aadfb21218214bb20000000000001805 | 35.440 | 2.171 | n/a | 0.000 | 0.334 | 1.826 | 0.971 | 0.014 | n/a | 0.046 | 30.074 | n/a | n/a | 0.004 | 2.506 | 0.071 | 0.004 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.045ms; driver.publication.readback 0.026ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb2000000000000142d | 35.245 | 2.648 | n/a | 0.000 | 0.092 | 25.916 | 0.916 | 0.014 | n/a | 0.250 | 5.392 | n/a | n/a | 0.016 | 2.740 | 0.078 | 0.016 | node-14/thread-0/socket.wait-first-byte | none observed |
| aadfb21218214bb2000000000000153f | 35.213 | 1.141 | n/a | 0.000 | 26.777 | 2.413 | 0.647 | 0.010 | n/a | 0.071 | 4.145 | n/a | n/a | 0.009 | 27.918 | 0.793 | 0.009 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.057ms; driver.publication.readback 0.046ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.032ms; driver.publication.readback 0.029ms |
| aadfb21218214bb20000000000001b0a | 34.891 | 1.913 | n/a | 0.000 | 23.876 | 2.396 | 0.715 | 0.014 | n/a | 0.538 | 5.429 | n/a | n/a | 0.010 | 25.790 | 0.739 | 0.010 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.persist-deferred 0.015ms |
| aadfb21218214bb200000000000011e1 | 33.830 | 8.439 | n/a | 0.000 | 0.019 | 4.049 | 6.608 | 0.030 | n/a | 0.167 | 14.508 | n/a | n/a | 0.009 | 8.458 | 0.250 | 0.009 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.240ms; driver.publication.readback 0.114ms; driver.publication.persist-deferred 0.035ms |
| aadfb21218214bb200000000000016f2 | 33.597 | 1.617 | n/a | 0.000 | 0.024 | 0.376 | 24.107 | 0.012 | n/a | 0.039 | 7.408 | n/a | n/a | 0.013 | 1.641 | 0.049 | 0.013 | gw-w/thread-65/commit.prepare-and-validate | none observed |
| aadfb21218214bb200000000000010da | 33.458 | 1.843 | n/a | 0.000 | 0.045 | 1.521 | 1.379 | 1.487 | n/a | 0.117 | 27.046 | n/a | n/a | 0.019 | 1.888 | 0.056 | 0.019 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.146ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.060ms; driver.publication.readback 0.053ms; driver.publication.readback 0.038ms |
| aadfb21218214bb20000000000001407 | 32.593 | 2.378 | n/a | 0.000 | 0.018 | 0.982 | 0.458 | 0.008 | n/a | 0.060 | 28.680 | n/a | n/a | 0.009 | 2.396 | 0.074 | 0.009 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.496ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.053ms; driver.publication.persist-deferred 0.016ms |
| aadfb21218214bb20000000000001bec | 32.171 | 1.588 | n/a | 0.000 | 23.916 | 0.427 | 1.250 | 0.029 | n/a | 0.753 | 4.200 | n/a | n/a | 0.008 | 25.504 | 0.793 | 0.008 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.060ms; driver.publication.readback 0.054ms; driver.publication.readback 0.038ms; driver.publication.readback 0.030ms; driver.publication.persist-deferred 0.023ms |
| aadfb21218214bb200000000000015a8 | 31.936 | 2.325 | n/a | 0.000 | 2.298 | 7.505 | 0.626 | 0.012 | n/a | 1.334 | 17.823 | n/a | n/a | 0.014 | 4.623 | 0.145 | 0.014 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.598ms; driver.publication.persist-deferred 0.040ms |
| aadfb21218214bb2000000000000124d | 31.603 | 2.129 | n/a | 0.000 | 0.073 | 0.442 | 0.875 | 0.008 | n/a | 2.252 | 25.799 | n/a | n/a | 0.024 | 2.202 | 0.070 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.076ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.055ms; driver.publication.readback 0.049ms; driver.publication.persist-deferred 0.020ms |
| aadfb21218214bb20000000000001a6e | 31.582 | 1.458 | n/a | 0.000 | 1.592 | 0.830 | 16.233 | 0.043 | n/a | 0.067 | 11.350 | n/a | n/a | 0.008 | 3.050 | 0.097 | 0.008 | gw-w/thread-46/gateway.request-parse | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000001a6f | 31.551 | 1.696 | n/a | 0.000 | 1.142 | 1.005 | 17.829 | 0.010 | n/a | 0.601 | 9.265 | n/a | n/a | 0.003 | 2.838 | 0.090 | 0.003 | gw-w/thread-42/gateway.route | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb200000000000011fe | 30.795 | 1.420 | n/a | 0.000 | 0.605 | 18.298 | 10.400 | 0.025 | n/a | 0.041 | 0.000 | n/a | n/a | 0.006 | 2.025 | 0.066 | 0.006 | node-14/thread-0/socket.wait-first-byte | driver.expected-state.bind-receipt 1.658ms; driver.publication.persist-deferred 0.127ms; driver.publication.readback 0.058ms |

## P2 / L256 / commit (95 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.644 | 0.000 | 0.000 | 0.476 | 3.301 | n/a | 0.000 | 0.050 | 1.038 | 2.325 | 0.020 | n/a | 0.081 | 6.223 | n/a | n/a | 0.020 | 3.598 | 0.251 | 0.020 |
| p99 | 36.996 | 2.004 | 0.000 | 2.009 | 9.062 | n/a | 0.000 | 2.750 | 2.480 | 23.295 | 0.110 | n/a | 0.446 | 30.196 | n/a | n/a | 0.060 | 9.262 | 0.474 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000001ded | 36.996 | 6.689 | 0.375 | 0.000 | 0.119 | 1.678 | 23.295 | 0.029 | n/a | 0.446 | 4.329 | n/a | n/a | 0.037 | 7.183 | 0.194 | 0.037 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.385ms |
| aadfb21218214bb20000000000001dd7 | 35.627 | 2.195 | n/a | 0.000 | 0.038 | 0.515 | 2.598 | 0.013 | n/a | 0.054 | 30.196 | n/a | n/a | 0.018 | 2.233 | 0.063 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e03 | 25.113 | 4.129 | 0.245 | 0.000 | 0.053 | 1.333 | 8.504 | 0.021 | n/a | 0.073 | 10.731 | n/a | n/a | 0.023 | 4.427 | 0.176 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.435ms |
| aadfb21218214bb20000000000001dfd | 24.757 | 4.497 | 0.196 | 0.000 | 0.055 | 1.674 | 8.211 | 0.025 | n/a | 0.086 | 9.995 | n/a | n/a | 0.020 | 4.747 | 0.192 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.147ms |
| aadfb21218214bb20000000000001e5b | 24.028 | 9.062 | 0.159 | 0.000 | 0.041 | 1.254 | 6.763 | 0.033 | n/a | 0.104 | 6.597 | n/a | n/a | 0.016 | 9.262 | 0.385 | 0.016 | node-14/thread-6/client.persist-and-resolve | driver.reader-basis.broadcast 0.343ms |
| aadfb21218214bb20000000000001e73 | 23.924 | 7.542 | 0.497 | 0.000 | 0.058 | 2.019 | 5.045 | 0.023 | n/a | 0.097 | 8.622 | n/a | n/a | 0.021 | 8.097 | 0.338 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.348ms |
| aadfb21218214bb20000000000001dd9 | 23.813 | 3.301 | 0.245 | 0.000 | 0.035 | 1.362 | 8.638 | 0.031 | n/a | 0.396 | 9.787 | n/a | n/a | 0.018 | 3.581 | 0.150 | 0.018 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.937ms |
| aadfb21218214bb20000000000001e3d | 22.755 | 3.210 | 0.244 | 0.000 | 0.144 | 1.668 | 9.866 | 0.031 | n/a | 0.331 | 7.216 | n/a | n/a | 0.045 | 3.598 | 0.158 | 0.045 | gw-w/thread-44/gateway.admitted-work | driver.reader-basis.broadcast 0.378ms |
| aadfb21218214bb20000000000001dc8 | 22.444 | 4.294 | 0.196 | 0.000 | 0.054 | 1.973 | 9.822 | 0.038 | n/a | 0.149 | 5.896 | n/a | n/a | 0.021 | 4.544 | 0.202 | 0.021 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.154ms |
| aadfb21218214bb20000000000001e23 | 22.045 | 4.386 | 0.184 | 0.000 | 0.055 | 1.652 | 8.722 | 0.034 | n/a | 0.149 | 6.842 | n/a | n/a | 0.020 | 4.625 | 0.210 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.411ms |
| aadfb21218214bb20000000000001df7 | 21.114 | 5.420 | 0.422 | 0.000 | 0.058 | 2.247 | 3.032 | 0.036 | n/a | 0.184 | 9.694 | n/a | n/a | 0.022 | 5.900 | 0.279 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.599ms |
| aadfb21218214bb20000000000001e51 | 21.108 | 3.563 | 0.255 | 0.000 | 0.159 | 1.253 | 7.811 | 0.020 | n/a | 0.080 | 7.925 | n/a | n/a | 0.043 | 3.977 | 0.188 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.365ms |
| aadfb21218214bb20000000000001e1d | 19.961 | 3.616 | 1.134 | 0.000 | 0.033 | 1.411 | 8.872 | 0.014 | n/a | 0.052 | 4.810 | n/a | n/a | 0.019 | 4.783 | 0.240 | 0.019 | gw-w/thread-66/gateway.admitted-work | driver.reader-basis.broadcast 0.849ms |
| aadfb21218214bb20000000000001e43 | 19.944 | 3.840 | 0.481 | 0.000 | 0.047 | 1.585 | 5.873 | 0.019 | n/a | 0.071 | 8.005 | n/a | n/a | 0.021 | 4.369 | 0.219 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.893ms |
| aadfb21218214bb20000000000001e2f | 19.502 | 3.543 | 0.336 | 0.000 | 0.041 | 1.603 | 7.275 | 0.024 | n/a | 0.073 | 6.589 | n/a | n/a | 0.018 | 3.920 | 0.201 | 0.018 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.573ms |
| aadfb21218214bb20000000000001e31 | 19.496 | 3.823 | 0.178 | 0.000 | 0.060 | 1.463 | 6.683 | 0.021 | n/a | 0.077 | 7.169 | n/a | n/a | 0.021 | 4.062 | 0.208 | 0.021 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.361ms |
| aadfb21218214bb20000000000001e39 | 19.495 | 3.311 | 0.178 | 0.000 | 0.050 | 1.494 | 4.076 | 0.051 | n/a | 0.154 | 10.158 | n/a | n/a | 0.022 | 3.539 | 0.182 | 0.022 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.565ms |
| aadfb21218214bb20000000000001e27 | 19.355 | 3.114 | 0.223 | 0.000 | 0.057 | 1.262 | 8.716 | 0.022 | n/a | 0.068 | 5.872 | n/a | n/a | 0.021 | 3.394 | 0.175 | 0.021 | gw-w/thread-65/gateway.admitted-work | driver.reader-basis.broadcast 0.860ms |
| aadfb21218214bb20000000000001e11 | 18.803 | 4.486 | n/a | 0.000 | 0.061 | 0.655 | 2.551 | 0.029 | n/a | 0.092 | 10.906 | n/a | n/a | 0.023 | 4.547 | 0.242 | 0.023 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e83 | 18.786 | 6.171 | 0.256 | 0.000 | 0.039 | 1.346 | 6.097 | 0.064 | n/a | 0.104 | 4.692 | n/a | n/a | 0.017 | 6.466 | 0.344 | 0.017 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.885 | 0.000 | 0.000 | 0.423 | 2.049 | n/a | 0.000 | 0.044 | 0.544 | 1.097 | 0.016 | n/a | 0.068 | 5.092 | n/a | n/a | 0.019 | 2.233 | 0.251 | 0.019 |
| p99 | 35.627 | 1.177 | 0.000 | 0.802 | 4.096 | n/a | 0.000 | 2.444 | 2.298 | 4.144 | 0.043 | n/a | 0.322 | 30.196 | n/a | n/a | 0.060 | 4.472 | 0.401 | 0.060 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000001dd7 | 35.627 | 2.195 | n/a | 0.000 | 0.038 | 0.515 | 2.598 | 0.013 | n/a | 0.054 | 30.196 | n/a | n/a | 0.018 | 2.233 | 0.063 | 0.018 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001df1 | 16.090 | 1.798 | n/a | 0.000 | 0.089 | 0.521 | 0.942 | 0.015 | n/a | 0.066 | 12.598 | n/a | n/a | 0.060 | 1.887 | 0.117 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ddc | 15.769 | 1.577 | n/a | 0.000 | 0.028 | 2.298 | 0.836 | 0.015 | n/a | 0.207 | 10.792 | n/a | n/a | 0.014 | 1.605 | 0.102 | 0.014 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001dff | 15.143 | 4.011 | n/a | 0.000 | 0.120 | 0.484 | 0.886 | 0.019 | n/a | 0.303 | 9.293 | n/a | n/a | 0.026 | 4.131 | 0.273 | 0.026 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001de7 | 15.091 | 2.833 | n/a | 0.000 | 0.054 | 1.058 | 1.833 | 0.037 | n/a | 0.198 | 9.059 | n/a | n/a | 0.019 | 2.887 | 0.191 | 0.019 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001dda | 14.997 | 2.917 | n/a | 0.000 | 0.040 | 0.642 | 2.490 | 0.015 | n/a | 0.046 | 8.823 | n/a | n/a | 0.025 | 2.957 | 0.197 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e3f | 14.644 | 4.096 | n/a | 0.000 | 0.098 | 1.414 | 1.439 | 0.022 | n/a | 0.081 | 7.448 | n/a | n/a | 0.045 | 4.194 | 0.286 | 0.045 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e28 | 14.321 | 1.928 | n/a | 0.000 | 2.444 | 0.553 | 0.995 | 0.018 | n/a | 0.276 | 8.091 | n/a | n/a | 0.017 | 4.372 | 0.305 | 0.017 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e57 | 11.612 | 3.440 | n/a | 0.000 | 0.103 | 1.058 | 1.664 | 0.030 | n/a | 0.102 | 5.177 | n/a | n/a | 0.040 | 3.543 | 0.305 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e16 | 11.488 | 3.532 | n/a | 0.000 | 0.044 | 1.038 | 1.158 | 0.022 | n/a | 0.322 | 5.348 | n/a | n/a | 0.024 | 3.576 | 0.311 | 0.024 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e48 | 11.355 | 2.670 | n/a | 0.000 | 0.038 | 0.826 | 1.991 | 0.029 | n/a | 0.120 | 5.662 | n/a | n/a | 0.020 | 2.708 | 0.238 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.726ms |
| aadfb21218214bb20000000000001df4 | 11.148 | 2.744 | n/a | 0.000 | 0.048 | 1.102 | 2.325 | 0.043 | n/a | 0.208 | 4.655 | n/a | n/a | 0.023 | 2.792 | 0.250 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e4b | 11.139 | 2.441 | n/a | 0.000 | 2.031 | 0.453 | 1.028 | 0.015 | n/a | 0.050 | 5.104 | n/a | n/a | 0.016 | 4.472 | 0.401 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e13 | 11.016 | 1.911 | n/a | 0.000 | 0.028 | 0.539 | 1.362 | 0.020 | n/a | 0.096 | 7.045 | n/a | n/a | 0.014 | 1.939 | 0.176 | 0.014 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e1e | 10.600 | 1.693 | n/a | 0.000 | 0.037 | 0.463 | 4.144 | 0.030 | n/a | 0.085 | 4.131 | n/a | n/a | 0.016 | 1.730 | 0.163 | 0.016 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e78 | 10.412 | 1.824 | n/a | 0.000 | 0.928 | 0.711 | 1.682 | 0.016 | n/a | 0.206 | 5.033 | n/a | n/a | 0.011 | 2.752 | 0.264 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e01 | 9.903 | 1.722 | n/a | 0.000 | 0.045 | 0.375 | 1.180 | 0.012 | n/a | 0.053 | 6.499 | n/a | n/a | 0.017 | 1.766 | 0.178 | 0.017 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001dcf | 9.885 | 2.444 | n/a | 0.000 | 0.042 | 0.544 | 1.987 | 0.015 | n/a | 0.068 | 4.765 | n/a | n/a | 0.020 | 2.486 | 0.252 | 0.020 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e4e | 9.688 | 1.599 | n/a | 0.000 | 0.019 | 0.421 | 0.999 | 0.014 | n/a | 0.053 | 6.569 | n/a | n/a | 0.014 | 1.617 | 0.167 | 0.014 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e05 | 9.507 | 1.871 | n/a | 0.000 | 0.031 | 0.330 | 0.995 | 0.016 | n/a | 0.051 | 6.200 | n/a | n/a | 0.012 | 1.902 | 0.200 | 0.012 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.958 | 0.157 | 0.000 | 0.440 | 3.336 | n/a | 0.000 | 0.047 | 0.906 | 2.193 | 0.019 | n/a | 0.112 | 6.131 | n/a | n/a | 0.021 | 3.716 | 0.223 | 0.021 |
| p99 | 128.082 | 3.002 | 0.040 | 1.767 | 6.450 | n/a | 2.451 | 2.707 | 5.653 | 43.765 | 0.063 | n/a | 0.770 | 104.567 | n/a | n/a | 0.074 | 7.382 | 0.537 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000001e9c | 128.082 | 5.252 | n/a | 0.000 | 0.094 | 3.065 | 14.668 | 0.026 | n/a | 0.370 | 104.567 | n/a | n/a | 0.041 | 5.345 | 0.042 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.646ms; driver.reader-basis.broadcast 0.332ms |
| aadfb21218214bb20000000000001e9d | 62.507 | 4.258 | 0.245 | 0.000 | 0.041 | 2.064 | 10.890 | 0.037 | n/a | 0.288 | 44.667 | n/a | n/a | 0.017 | 4.544 | 0.073 | 0.017 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.332ms |
| aadfb21218214bb20000000000001ed2 | 60.455 | 3.831 | 0.308 | 0.000 | 0.136 | 1.399 | 43.765 | 0.018 | n/a | 0.066 | 10.868 | n/a | n/a | 0.064 | 4.275 | 0.071 | 0.064 | gw-w/thread-48/gateway.admitted-work | driver.reader-basis.broadcast 0.388ms |
| aadfb21218214bb20000000000001f24 | 41.813 | 6.450 | 0.407 | 0.000 | 0.046 | 1.698 | 4.624 | 0.016 | n/a | 0.305 | 28.245 | n/a | n/a | 0.020 | 6.904 | 0.165 | 0.020 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ee6 | 26.854 | 3.416 | 0.284 | 0.000 | 0.139 | 0.953 | 5.156 | 0.019 | n/a | 0.354 | 16.492 | n/a | n/a | 0.041 | 3.839 | 0.143 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e98 | 25.240 | 3.772 | 0.353 | 0.000 | 0.059 | 1.253 | 5.891 | 0.016 | n/a | 0.060 | 13.815 | n/a | n/a | 0.021 | 4.184 | 0.166 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f1c | 25.144 | 5.199 | 0.313 | 0.000 | 0.132 | 2.430 | 8.615 | 0.022 | n/a | 0.072 | 8.319 | n/a | n/a | 0.040 | 5.645 | 0.224 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ec1 | 24.860 | 4.513 | 0.289 | 0.000 | 0.163 | 1.672 | 6.635 | 0.022 | n/a | 0.093 | 11.422 | n/a | n/a | 0.050 | 4.965 | 0.200 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ede | 24.733 | 4.564 | 0.408 | 0.000 | 0.047 | 2.050 | 10.141 | 0.021 | n/a | 0.109 | 7.372 | n/a | n/a | 0.022 | 5.020 | 0.203 | 0.022 | gw-w/thread-46/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000001eaf | 22.855 | 3.921 | 0.171 | 0.000 | 0.040 | 5.653 | 3.371 | 0.025 | n/a | 0.104 | 9.552 | n/a | n/a | 0.019 | 4.132 | 0.181 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001eea | 22.572 | 2.919 | 0.208 | 0.000 | 0.054 | 0.868 | 6.098 | 0.017 | n/a | 0.291 | 12.099 | n/a | n/a | 0.019 | 3.181 | 0.141 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ea7 | 22.530 | 3.515 | 0.309 | 0.000 | 0.050 | 1.303 | 6.587 | 0.031 | n/a | 0.593 | 10.119 | n/a | n/a | 0.022 | 3.874 | 0.172 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f34 | 22.490 | 4.439 | 0.203 | 0.000 | 0.049 | 1.292 | 11.446 | 0.028 | n/a | 0.294 | 4.698 | n/a | n/a | 0.041 | 4.690 | 0.209 | 0.041 | gw-w/thread-45/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000001ee4 | 21.675 | 3.427 | 0.302 | 0.000 | 0.114 | 1.061 | 11.678 | 0.026 | n/a | 0.055 | 4.977 | n/a | n/a | 0.035 | 3.843 | 0.177 | 0.035 | gw-w/thread-46/commit.prepare-and-validate | none observed |
| aadfb21218214bb20000000000001efe | 20.940 | 3.683 | 0.338 | 0.000 | 0.175 | 2.090 | 6.371 | 0.035 | n/a | 0.093 | 8.118 | n/a | n/a | 0.037 | 4.196 | 0.200 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ec6 | 20.387 | 4.597 | 0.211 | 0.000 | 0.042 | 1.954 | 7.798 | 0.025 | n/a | 0.062 | 5.677 | n/a | n/a | 0.019 | 4.851 | 0.238 | 0.019 | gw-w/thread-47/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000001f44 | 20.238 | 3.290 | 0.172 | 0.000 | 0.046 | 1.508 | 3.768 | 0.046 | n/a | 0.102 | 11.268 | n/a | n/a | 0.037 | 3.508 | 0.173 | 0.037 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ecc | 20.073 | 3.727 | 0.389 | 0.000 | 0.052 | 1.363 | 8.216 | 0.040 | n/a | 0.117 | 6.149 | n/a | n/a | 0.020 | 4.167 | 0.208 | 0.020 | gw-w/thread-65/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000001f22 | 20.006 | 3.479 | 0.259 | 0.000 | 0.044 | 0.896 | 4.037 | 0.045 | n/a | 0.745 | 10.477 | n/a | n/a | 0.025 | 3.782 | 0.189 | 0.025 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f04 | 19.773 | 3.142 | 0.207 | 0.000 | 0.050 | 0.875 | 1.816 | 0.020 | n/a | 0.071 | 13.572 | n/a | n/a | 0.020 | 3.399 | 0.172 | 0.020 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.465 | 0.000 | 0.000 | 0.440 | 2.136 | n/a | 0.000 | 0.042 | 0.667 | 1.318 | 0.018 | n/a | 0.153 | 5.554 | n/a | n/a | 0.019 | 2.193 | 0.235 | 0.019 |
| p99 | 128.082 | 1.996 | 0.000 | 0.793 | 5.252 | n/a | 2.451 | 2.707 | 3.065 | 14.668 | 0.063 | n/a | 0.770 | 104.567 | n/a | n/a | 0.074 | 6.222 | 0.444 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb20000000000001e9c | 128.082 | 5.252 | n/a | 0.000 | 0.094 | 3.065 | 14.668 | 0.026 | n/a | 0.370 | 104.567 | n/a | n/a | 0.041 | 5.345 | 0.042 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.646ms; driver.reader-basis.broadcast 0.332ms |
| aadfb21218214bb20000000000001f3a | 17.719 | 4.482 | n/a | 0.000 | 0.101 | 0.890 | 1.336 | 0.020 | n/a | 0.397 | 10.420 | n/a | n/a | 0.074 | 4.583 | 0.259 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001eca | 15.657 | 1.927 | n/a | 0.000 | 0.071 | 0.833 | 2.269 | 0.063 | n/a | 0.205 | 10.267 | n/a | n/a | 0.021 | 1.998 | 0.128 | 0.021 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.384ms |
| aadfb21218214bb20000000000001ecd | 15.406 | 2.300 | n/a | 0.000 | 2.707 | 0.820 | 1.826 | 0.039 | n/a | 0.167 | 7.525 | n/a | n/a | 0.022 | 5.006 | 0.325 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ec5 | 15.131 | 3.713 | n/a | 0.000 | 0.030 | 1.304 | 8.238 | 0.025 | n/a | 0.297 | 1.509 | n/a | n/a | 0.016 | 3.743 | 0.247 | 0.016 | gw-w/thread-65/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000001e88 | 14.399 | 2.177 | n/a | 0.000 | 0.051 | 0.532 | 3.616 | 0.038 | n/a | 0.153 | 7.814 | n/a | n/a | 0.019 | 2.228 | 0.155 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f36 | 14.018 | 3.725 | n/a | 2.451 | 0.046 | 0.884 | 0.933 | 0.017 | n/a | 0.374 | 5.554 | n/a | n/a | 0.034 | 6.222 | 0.444 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f2e | 13.909 | 2.077 | n/a | 0.000 | 0.065 | 0.617 | 1.318 | 0.020 | n/a | 0.495 | 9.290 | n/a | n/a | 0.029 | 2.142 | 0.154 | 0.029 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001eb5 | 13.361 | 2.155 | n/a | 0.000 | 0.054 | 1.324 | 1.550 | 0.044 | n/a | 0.770 | 7.433 | n/a | n/a | 0.031 | 2.209 | 0.165 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ed4 | 12.683 | 1.893 | n/a | 0.000 | 0.037 | 0.427 | 2.635 | 0.013 | n/a | 0.249 | 7.413 | n/a | n/a | 0.016 | 1.930 | 0.152 | 0.016 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.337ms |
| aadfb21218214bb20000000000001ead | 11.770 | 1.971 | n/a | 0.000 | 0.035 | 2.498 | 0.864 | 0.014 | n/a | 0.046 | 6.326 | n/a | n/a | 0.016 | 2.006 | 0.170 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ec7 | 11.470 | 2.136 | n/a | 0.000 | 0.042 | 0.599 | 0.990 | 0.018 | n/a | 0.074 | 7.594 | n/a | n/a | 0.017 | 2.178 | 0.190 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f12 | 11.126 | 3.314 | n/a | 0.000 | 0.972 | 0.733 | 1.417 | 0.025 | n/a | 0.106 | 4.535 | n/a | n/a | 0.024 | 4.287 | 0.385 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f18 | 11.058 | 2.604 | n/a | 0.000 | 1.552 | 2.450 | 0.392 | 0.005 | n/a | 0.026 | 4.008 | n/a | n/a | 0.021 | 4.156 | 0.376 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.038ms |
| aadfb21218214bb20000000000001eb9 | 10.705 | 2.766 | n/a | 0.000 | 0.074 | 0.667 | 0.969 | 0.014 | n/a | 0.293 | 5.891 | n/a | n/a | 0.030 | 2.841 | 0.265 | 0.030 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e91 | 10.510 | 2.195 | n/a | 0.000 | 0.039 | 0.741 | 1.433 | 0.018 | n/a | 0.060 | 6.004 | n/a | n/a | 0.019 | 2.234 | 0.213 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001eb3 | 10.487 | 1.623 | n/a | 0.000 | 0.030 | 0.486 | 1.054 | 0.015 | n/a | 0.300 | 6.964 | n/a | n/a | 0.014 | 1.653 | 0.158 | 0.014 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001e85 | 10.465 | 2.061 | n/a | 0.000 | 1.739 | 0.436 | 1.118 | 0.017 | n/a | 0.058 | 5.024 | n/a | n/a | 0.013 | 3.800 | 0.363 | 0.013 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ef7 | 10.318 | 1.809 | n/a | 0.000 | 0.037 | 0.792 | 1.851 | 0.030 | n/a | 0.134 | 5.646 | n/a | n/a | 0.020 | 1.846 | 0.179 | 0.020 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f0d | 10.301 | 2.955 | n/a | 0.000 | 0.027 | 0.894 | 1.734 | 0.023 | n/a | 0.125 | 4.526 | n/a | n/a | 0.016 | 2.983 | 0.290 | 0.016 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (365 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.705 | 0.151 | 0.000 | 0.459 | 3.340 | n/a | 0.000 | 0.051 | 0.880 | 1.470 | 0.019 | n/a | 0.097 | 5.396 | n/a | n/a | 0.032 | 3.634 | 0.283 | 0.032 |
| p99 | 38.333 | 2.446 | 0.000 | 2.712 | 7.976 | n/a | 1.544 | 1.997 | 4.250 | 11.457 | 0.066 | n/a | 1.076 | 19.782 | n/a | n/a | 0.100 | 8.613 | 0.534 | 0.100 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb200000000000021b7 | 49.038 | 4.187 | 0.222 | 0.000 | 0.101 | 2.079 | 4.232 | 0.019 | n/a | 0.067 | 38.081 | n/a | n/a | 0.051 | 4.510 | 0.092 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.019ms |
| aadfb21218214bb20000000000002214 | 47.125 | 3.412 | 0.203 | 0.000 | 0.046 | 1.085 | 31.511 | 0.021 | n/a | 0.079 | 10.736 | n/a | n/a | 0.032 | 3.661 | 0.078 | 0.032 | gw-w/thread-66/gateway.admitted-work | none observed |
| aadfb21218214bb200000000000020bf | 40.981 | 3.060 | 0.172 | 0.000 | 0.046 | 0.814 | 4.275 | 0.016 | n/a | 0.041 | 32.528 | n/a | n/a | 0.028 | 3.278 | 0.080 | 0.028 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.371ms |
| aadfb21218214bb2000000000000206b | 38.333 | 1.887 | n/a | 0.000 | 0.040 | 0.393 | 28.162 | 0.023 | n/a | 0.055 | 7.753 | n/a | n/a | 0.019 | 1.928 | 0.050 | 0.019 | gw-w/thread-45/commit.prepare-and-validate | none observed |
| aadfb21218214bb20000000000001fe8 | 32.643 | 3.320 | n/a | 0.000 | 0.091 | 0.958 | 0.838 | 0.016 | n/a | 0.346 | 26.998 | n/a | n/a | 0.076 | 3.411 | 0.104 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.421ms |
| aadfb21218214bb2000000000000208f | 30.288 | 4.802 | 0.318 | 0.000 | 0.039 | 1.303 | 3.964 | 0.015 | n/a | 0.039 | 19.782 | n/a | n/a | 0.024 | 5.159 | 0.170 | 0.024 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000021b8 | 29.311 | 3.543 | n/a | 0.000 | 0.054 | 9.862 | 0.789 | 0.013 | n/a | 0.041 | 14.967 | n/a | n/a | 0.042 | 3.597 | 0.123 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f83 | 28.921 | 3.461 | 0.313 | 0.000 | 0.181 | 1.140 | 11.457 | 0.024 | n/a | 0.082 | 12.163 | n/a | n/a | 0.100 | 3.955 | 0.137 | 0.100 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f74 | 27.573 | 4.405 | 0.247 | 0.000 | 0.104 | 1.748 | 10.037 | 0.017 | n/a | 0.053 | 10.892 | n/a | n/a | 0.070 | 4.756 | 0.173 | 0.070 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000002174 | 26.738 | 8.075 | 0.207 | 0.000 | 0.057 | 0.839 | 5.133 | 0.017 | n/a | 0.043 | 12.333 | n/a | n/a | 0.034 | 8.339 | 0.312 | 0.034 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000021f2 | 24.982 | 3.422 | 0.248 | 0.000 | 0.076 | 1.288 | 6.942 | 0.021 | n/a | 0.378 | 12.558 | n/a | n/a | 0.049 | 3.746 | 0.150 | 0.049 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000002210 | 24.835 | 6.518 | 0.478 | 0.000 | 0.063 | 2.169 | 11.350 | 0.021 | n/a | 0.080 | 4.107 | n/a | n/a | 0.049 | 7.060 | 0.284 | 0.049 | gw-w/thread-65/gateway.admitted-work | none observed |
| aadfb21218214bb20000000000002075 | 24.416 | 5.527 | 0.342 | 0.000 | 0.050 | 1.858 | 7.817 | 0.031 | n/a | 0.356 | 8.410 | n/a | n/a | 0.026 | 5.919 | 0.242 | 0.026 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000211b | 24.092 | 3.329 | 0.178 | 0.000 | 0.054 | 1.177 | 8.703 | 0.026 | n/a | 0.402 | 10.191 | n/a | n/a | 0.032 | 3.561 | 0.148 | 0.032 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000020d7 | 23.926 | 3.295 | 0.267 | 0.000 | 0.051 | 1.103 | 6.727 | 0.024 | n/a | 0.069 | 12.358 | n/a | n/a | 0.032 | 3.613 | 0.151 | 0.032 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.367ms |
| aadfb21218214bb20000000000002008 | 23.614 | 3.134 | 0.271 | 0.000 | 0.085 | 0.995 | 9.011 | 0.025 | n/a | 0.392 | 9.653 | n/a | n/a | 0.048 | 3.490 | 0.148 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000002111 | 23.552 | 3.875 | 0.314 | 0.000 | 0.110 | 3.088 | 5.779 | 0.026 | n/a | 0.092 | 10.208 | n/a | n/a | 0.060 | 4.299 | 0.183 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000020c3 | 23.327 | 3.274 | 0.335 | 0.000 | 0.130 | 1.157 | 7.924 | 0.031 | n/a | 0.451 | 9.970 | n/a | n/a | 0.054 | 3.739 | 0.160 | 0.054 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.930ms |
| aadfb21218214bb20000000000002028 | 23.269 | 3.365 | 0.257 | 0.000 | 0.048 | 3.146 | 8.696 | 0.022 | n/a | 0.058 | 7.647 | n/a | n/a | 0.030 | 3.670 | 0.158 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f62 | 23.094 | 4.465 | 0.183 | 0.000 | 0.057 | 1.647 | 11.916 | 0.027 | n/a | 0.081 | 4.678 | n/a | n/a | 0.040 | 4.705 | 0.204 | 0.040 | gw-w/thread-65/gateway.admitted-work | none observed |

## P2 / tail / commit / 5-10 facts (109 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.129 | 0.000 | 0.000 | 0.447 | 2.397 | n/a | 0.000 | 0.049 | 0.690 | 1.033 | 0.019 | n/a | 0.095 | 5.185 | n/a | n/a | 0.031 | 2.622 | 0.254 | 0.031 |
| p99 | 32.643 | 2.003 | 0.000 | 1.270 | 4.809 | n/a | 0.000 | 2.006 | 3.475 | 5.915 | 0.044 | n/a | 0.758 | 13.510 | n/a | n/a | 0.076 | 5.074 | 0.437 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| aadfb21218214bb2000000000000206b | 38.333 | 1.887 | n/a | 0.000 | 0.040 | 0.393 | 28.162 | 0.023 | n/a | 0.055 | 7.753 | n/a | n/a | 0.019 | 1.928 | 0.050 | 0.019 | gw-w/thread-45/commit.prepare-and-validate | none observed |
| aadfb21218214bb20000000000001fe8 | 32.643 | 3.320 | n/a | 0.000 | 0.091 | 0.958 | 0.838 | 0.016 | n/a | 0.346 | 26.998 | n/a | n/a | 0.076 | 3.411 | 0.104 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.421ms |
| aadfb21218214bb20000000000001fe2 | 20.778 | 1.582 | n/a | 0.000 | 0.030 | 4.532 | 1.044 | 0.013 | n/a | 0.047 | 13.510 | n/a | n/a | 0.020 | 1.613 | 0.078 | 0.020 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000021a6 | 19.691 | 4.809 | n/a | 0.000 | 0.125 | 2.045 | 5.915 | 0.037 | n/a | 0.136 | 6.554 | n/a | n/a | 0.070 | 4.934 | 0.251 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000002079 | 19.123 | 5.025 | n/a | 0.000 | 0.049 | 1.639 | 3.634 | 0.084 | n/a | 1.076 | 7.583 | n/a | n/a | 0.033 | 5.074 | 0.265 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001fce | 16.787 | 3.702 | n/a | 0.000 | 0.086 | 0.825 | 0.897 | 0.014 | n/a | 0.289 | 10.922 | n/a | n/a | 0.051 | 3.788 | 0.226 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ffc | 16.024 | 1.916 | n/a | 0.000 | 0.062 | 3.417 | 0.853 | 0.014 | n/a | 0.049 | 9.679 | n/a | n/a | 0.035 | 1.978 | 0.123 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000209b | 15.679 | 2.542 | n/a | 0.000 | 0.080 | 0.786 | 0.754 | 0.014 | n/a | 0.161 | 11.292 | n/a | n/a | 0.049 | 2.622 | 0.167 | 0.049 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000002056 | 15.411 | 2.729 | n/a | 0.000 | 0.031 | 0.837 | 1.795 | 0.032 | n/a | 0.166 | 9.796 | n/a | n/a | 0.025 | 2.760 | 0.179 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f4d | 15.195 | 2.558 | n/a | 0.000 | 1.261 | 0.927 | 1.799 | 0.032 | n/a | 0.125 | 8.462 | n/a | n/a | 0.031 | 3.819 | 0.251 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001f79 | 14.891 | 1.964 | n/a | 0.000 | 0.038 | 0.569 | 1.021 | 0.017 | n/a | 0.264 | 10.989 | n/a | n/a | 0.029 | 2.001 | 0.134 | 0.029 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000020da | 14.589 | 2.848 | n/a | 0.000 | 0.042 | 0.593 | 0.974 | 0.013 | n/a | 0.300 | 9.779 | n/a | n/a | 0.041 | 2.890 | 0.198 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000001ff2 | 14.219 | 1.937 | n/a | 0.000 | 0.036 | 3.475 | 0.910 | 0.017 | n/a | 0.054 | 7.764 | n/a | n/a | 0.027 | 1.973 | 0.139 | 0.027 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000021fa | 13.813 | 3.499 | n/a | 0.000 | 0.108 | 1.098 | 1.171 | 0.024 | n/a | 0.083 | 7.757 | n/a | n/a | 0.072 | 3.607 | 0.261 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb20000000000002153 | 13.644 | 1.760 | n/a | 0.000 | 2.129 | 0.883 | 0.638 | 0.010 | n/a | 0.031 | 8.174 | n/a | n/a | 0.019 | 3.889 | 0.285 | 0.019 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.017ms |
| aadfb21218214bb20000000000001fb6 | 13.431 | 2.545 | n/a | 0.000 | 0.068 | 0.780 | 1.532 | 0.028 | n/a | 0.095 | 8.334 | n/a | n/a | 0.048 | 2.614 | 0.195 | 0.048 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.304ms |
| aadfb21218214bb20000000000001f92 | 13.289 | 4.092 | n/a | 0.000 | 0.052 | 1.179 | 1.342 | 0.022 | n/a | 0.097 | 6.467 | n/a | n/a | 0.040 | 4.144 | 0.312 | 0.040 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb2000000000000217a | 13.223 | 4.458 | n/a | 0.000 | 0.065 | 1.124 | 1.859 | 0.031 | n/a | 0.108 | 5.536 | n/a | n/a | 0.041 | 4.523 | 0.342 | 0.041 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | none observed |
| aadfb21218214bb200000000000020b0 | 13.097 | 1.974 | n/a | 0.000 | 0.045 | 0.690 | 1.423 | 0.025 | n/a | 0.578 | 8.334 | n/a | n/a | 0.028 | 2.019 | 0.154 | 0.028 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.190ms |
| aadfb21218214bb20000000000002096 | 13.091 | 2.253 | n/a | 0.000 | 2.006 | 0.555 | 0.953 | 0.017 | n/a | 0.347 | 6.936 | n/a | n/a | 0.025 | 4.259 | 0.325 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.412 | n/a | n/a | n/a | 2.513 | n/a | 0.000 | 0.000 | 1.033 | 200.636 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.289 | 2.513 | 0.006 | 0.289 |
| p99 | 387.341 | n/a | n/a | n/a | 24.290 | n/a | 4.947 | 0.000 | 8.346 | 382.855 | 0.105 | n/a | 0.183 | 0.000 | n/a | n/a | 42.061 | 29.237 | 0.354 | 42.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab0000000000000002 | 387.341 | 2.513 | n/a | 0.000 | 0.000 | 1.488 | 382.855 | 0.105 | n/a | 0.082 | 0.000 | n/a | n/a | 0.299 | 2.513 | 0.006 | 0.299 | gw-r/thread-43/gateway.admitted-work | none observed |
| 8f1f83189dd94a200000000000000005 | 202.901 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 201.629 | 0.020 | n/a | 0.183 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000006 | 202.367 | 0.000 | n/a | 0.000 | 0.000 | 1.033 | 200.891 | 0.012 | n/a | 0.106 | 0.000 | n/a | n/a | 0.326 | 0.000 | 0.000 | 0.326 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000146d | 201.436 | 0.000 | n/a | 0.000 | 0.000 | 0.668 | 200.636 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000146c | 201.412 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.658 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000001470 | 82.597 | 24.290 | n/a | 4.947 | 0.000 | 0.790 | 52.275 | 0.003 | n/a | 0.003 | 0.000 | n/a | n/a | 0.289 | 29.237 | 0.354 | 0.289 | gw-r/thread-62/gateway.admitted-work | none observed |
| 8f1f83189dd94a200000000000001472 | 73.063 | 15.229 | n/a | 1.078 | 0.000 | 5.259 | 51.307 | 0.008 | n/a | 0.010 | 0.000 | n/a | n/a | 0.172 | 16.307 | 0.223 | 0.172 | gw-r/thread-44/gateway.admitted-work | none observed |
| 8f1f83189dd94a200000000000001473 | 65.467 | 15.938 | n/a | 1.439 | 0.000 | 6.029 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 42.061 | 17.377 | 0.265 | 42.061 | node-14/thread-5/socket.wait-first-byte | none observed |
| 8f1f83189dd94a200000000000001471 | 62.128 | 17.922 | n/a | 0.000 | 0.000 | 8.346 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.860 | 17.922 | 0.288 | 35.860 | node-14/thread-5/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 812.922 | n/a | n/a | n/a | 0.192 | n/a | 0.000 | 0.000 | 0.556 | 789.073 | 0.012 | n/a | 0.278 | 0.000 | n/a | n/a | 0.292 | 0.192 | 0.000 | 0.292 |
| p99 | 1004.763 | n/a | n/a | n/a | 22.697 | n/a | 0.000 | 0.000 | 1.286 | 1001.761 | 0.017 | n/a | 0.287 | 0.000 | n/a | n/a | 1.233 | 22.697 | 0.028 | 1.233 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab00000000000000a4 | 1004.763 | 0.192 | n/a | 0.000 | 0.000 | 1.286 | 1001.761 | 0.012 | n/a | 0.278 | 0.000 | n/a | n/a | 1.233 | 0.192 | 0.000 | 1.233 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab00000000000000a5 | 812.922 | 22.697 | n/a | 0.000 | 0.000 | 0.556 | 789.073 | 0.017 | n/a | 0.287 | 0.000 | n/a | n/a | 0.292 | 22.697 | 0.028 | 0.292 | gw-r/thread-62/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 418.364 | n/a | n/a | n/a | 2.333 | n/a | 0.000 | 0.000 | 0.696 | 414.852 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.084 | 2.333 | 0.006 | 0.084 |
| p99 | 1006.615 | n/a | n/a | n/a | 14.535 | n/a | 0.000 | 0.000 | 4.222 | 1002.153 | 0.053 | n/a | 0.166 | 0.000 | n/a | n/a | 19.135 | 14.535 | 0.287 | 19.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab00000000000000b5 | 1006.615 | 0.169 | n/a | 0.000 | 0.000 | 4.222 | 1000.918 | 0.013 | n/a | 0.121 | 0.000 | n/a | n/a | 1.172 | 0.169 | 0.000 | 1.172 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000000d1 | 1005.385 | 2.445 | n/a | 0.000 | 0.000 | 0.569 | 1002.153 | 0.019 | n/a | 0.126 | 0.000 | n/a | n/a | 0.073 | 2.445 | 0.002 | 0.073 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab00000000000000ae | 1003.844 | 0.139 | n/a | 0.000 | 0.000 | 0.607 | 1001.693 | 0.036 | n/a | 0.166 | 0.000 | n/a | n/a | 1.204 | 0.139 | 0.000 | 1.204 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab00000000000000bd | 1000.803 | 2.601 | n/a | 0.000 | 0.000 | 0.614 | 997.411 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.088 | 2.601 | 0.003 | 0.088 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab00000000000000bc | 993.781 | 2.225 | n/a | 0.000 | 0.000 | 0.900 | 990.413 | 0.032 | n/a | 0.127 | 0.000 | n/a | n/a | 0.084 | 2.225 | 0.002 | 0.084 | gw-r/thread-47/journal/page | none observed |
| e0a18e9401846aab00000000000000ab | 898.210 | 3.743 | n/a | 0.000 | 0.000 | 0.668 | 893.509 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.235 | 3.743 | 0.004 | 0.235 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab00000000000000a8 | 869.796 | 1.992 | n/a | 0.000 | 0.000 | 2.134 | 865.360 | 0.053 | n/a | 0.164 | 0.000 | n/a | n/a | 0.093 | 1.992 | 0.002 | 0.093 | gw-r/thread-47/journal/page | none observed |
| e0a18e9401846aab00000000000000c3 | 851.933 | 5.475 | n/a | 0.000 | 0.000 | 2.313 | 843.940 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.109 | 5.475 | 0.006 | 0.109 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000000cc | 713.125 | 2.312 | n/a | 0.000 | 0.000 | 1.625 | 709.052 | 0.015 | n/a | 0.052 | 0.000 | n/a | n/a | 0.069 | 2.312 | 0.003 | 0.069 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab00000000000000b4 | 590.936 | 2.400 | n/a | 0.000 | 0.000 | 0.896 | 587.441 | 0.015 | n/a | 0.105 | 0.000 | n/a | n/a | 0.078 | 2.400 | 0.004 | 0.078 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab00000000000000cb | 555.704 | 2.251 | n/a | 0.000 | 0.000 | 2.728 | 550.524 | 0.025 | n/a | 0.103 | 0.000 | n/a | n/a | 0.072 | 2.251 | 0.004 | 0.072 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab00000000000000c2 | 513.406 | 2.350 | n/a | 0.000 | 0.000 | 0.745 | 510.096 | 0.022 | n/a | 0.121 | 0.000 | n/a | n/a | 0.072 | 2.350 | 0.005 | 0.072 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab00000000000000c8 | 507.586 | 2.348 | n/a | 0.000 | 0.000 | 0.683 | 504.332 | 0.046 | n/a | 0.090 | 0.000 | n/a | n/a | 0.087 | 2.348 | 0.005 | 0.087 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000000c6 | 497.208 | 2.404 | n/a | 0.000 | 0.000 | 1.113 | 493.516 | 0.013 | n/a | 0.084 | 0.000 | n/a | n/a | 0.078 | 2.404 | 0.005 | 0.078 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab00000000000000c9 | 443.656 | 2.118 | n/a | 0.000 | 0.000 | 0.699 | 440.711 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.071 | 2.118 | 0.005 | 0.071 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab00000000000000b9 | 418.364 | 2.543 | n/a | 0.000 | 0.000 | 0.778 | 414.852 | 0.013 | n/a | 0.097 | 0.000 | n/a | n/a | 0.082 | 2.543 | 0.006 | 0.082 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab00000000000000a7 | 331.832 | 2.333 | n/a | 0.000 | 0.000 | 0.742 | 328.524 | 0.013 | n/a | 0.106 | 0.000 | n/a | n/a | 0.113 | 2.333 | 0.007 | 0.113 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab00000000000000b2 | 319.986 | 4.172 | n/a | 0.000 | 0.000 | 0.745 | 314.868 | 0.012 | n/a | 0.089 | 0.000 | n/a | n/a | 0.099 | 4.172 | 0.013 | 0.099 | gw-r/thread-47/journal/page | none observed |
| e0a18e9401846aab00000000000000b7 | 281.297 | 14.535 | n/a | 0.000 | 0.000 | 0.696 | 265.790 | 0.014 | n/a | 0.074 | 0.000 | n/a | n/a | 0.189 | 14.535 | 0.052 | 0.189 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab00000000000000ce | 276.669 | 2.280 | n/a | 0.000 | 0.000 | 0.310 | 273.895 | 0.020 | n/a | 0.094 | 0.000 | n/a | n/a | 0.071 | 2.280 | 0.008 | 0.071 | gw-r/thread-48/journal/page | none observed |

## P3 / L1 / internal (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.862 | n/a | n/a | n/a | 3.346 | n/a | 0.000 | 0.000 | 0.677 | 416.195 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.082 | 3.757 | 0.010 | 0.082 |
| p99 | 1007.127 | n/a | n/a | n/a | 10.956 | n/a | 2.795 | 0.000 | 11.566 | 1001.490 | 0.054 | n/a | 3.650 | 0.000 | n/a | n/a | 49.878 | 11.637 | 0.454 | 49.878 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab00000000000000d3 | 1007.127 | 5.983 | n/a | 0.781 | 0.000 | 0.652 | 999.379 | 0.030 | n/a | 0.109 | 0.000 | n/a | n/a | 0.193 | 6.764 | 0.007 | 0.193 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab00000000000000fe | 1005.873 | 4.434 | n/a | 0.627 | 0.000 | 3.759 | 996.812 | 0.010 | n/a | 0.103 | 0.000 | n/a | n/a | 0.129 | 5.061 | 0.005 | 0.129 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000000de | 1004.694 | 3.834 | n/a | 0.522 | 0.000 | 0.975 | 999.200 | 0.010 | n/a | 0.074 | 0.000 | n/a | n/a | 0.079 | 4.356 | 0.004 | 0.079 | gw-r/thread-47/journal/page | none observed |
| e0a18e9401846aab0000000000000115 | 1003.767 | 0.209 | n/a | 0.000 | 0.000 | 1.173 | 1001.060 | 0.019 | n/a | 0.154 | 0.000 | n/a | n/a | 1.152 | 0.209 | 0.000 | 1.152 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000000138 | 1003.621 | 0.133 | n/a | 0.000 | 0.000 | 0.736 | 1001.490 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 1.168 | 0.133 | 0.000 | 1.168 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab000000000000010d | 1003.200 | 0.114 | n/a | 0.000 | 0.000 | 0.837 | 1000.952 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 1.172 | 0.114 | 0.000 | 1.172 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000000155 | 1001.630 | 5.643 | n/a | 0.000 | 0.000 | 1.675 | 994.092 | 0.006 | n/a | 0.080 | 0.000 | n/a | n/a | 0.134 | 5.643 | 0.006 | 0.134 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000000105 | 1001.184 | 3.083 | n/a | 0.716 | 0.000 | 0.569 | 996.690 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.077 | 3.799 | 0.004 | 0.077 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab00000000000000d2 | 1000.480 | 7.796 | n/a | 0.774 | 0.000 | 0.666 | 990.922 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.226 | 8.570 | 0.009 | 0.226 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab000000000000012c | 999.684 | 4.137 | n/a | 0.000 | 0.000 | 0.693 | 994.648 | 0.014 | n/a | 0.088 | 0.000 | n/a | n/a | 0.104 | 4.137 | 0.004 | 0.104 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab000000000000012b | 995.985 | 2.531 | n/a | 0.000 | 0.000 | 0.396 | 992.901 | 0.019 | n/a | 0.075 | 0.000 | n/a | n/a | 0.064 | 2.531 | 0.003 | 0.064 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab000000000000011e | 995.573 | 3.504 | n/a | 0.559 | 0.000 | 0.813 | 990.529 | 0.014 | n/a | 0.077 | 0.000 | n/a | n/a | 0.078 | 4.063 | 0.004 | 0.078 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000000da | 987.112 | 7.579 | n/a | 0.748 | 0.000 | 0.726 | 977.857 | 0.011 | n/a | 0.063 | 0.000 | n/a | n/a | 0.128 | 8.327 | 0.008 | 0.128 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000000127 | 986.008 | 2.708 | n/a | 0.000 | 0.000 | 0.540 | 982.590 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.064 | 2.708 | 0.003 | 0.064 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab00000000000000d9 | 983.935 | 7.046 | n/a | 1.450 | 0.000 | 0.816 | 974.321 | 0.022 | n/a | 0.093 | 0.000 | n/a | n/a | 0.187 | 8.496 | 0.009 | 0.187 | gw-r/thread-47/journal/page | none observed |
| e0a18e9401846aab00000000000000df | 983.833 | 6.698 | n/a | 0.678 | 0.000 | 1.052 | 975.152 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.179 | 7.376 | 0.007 | 0.179 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000000101 | 955.746 | 2.869 | n/a | 0.000 | 0.000 | 0.893 | 951.815 | 0.018 | n/a | 0.086 | 0.000 | n/a | n/a | 0.065 | 2.869 | 0.003 | 0.065 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000000112 | 901.081 | 6.239 | n/a | 0.768 | 0.000 | 0.663 | 893.204 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.150 | 7.007 | 0.008 | 0.150 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab00000000000000e0 | 881.915 | 4.787 | n/a | 0.539 | 0.000 | 1.079 | 875.289 | 0.025 | n/a | 0.100 | 0.000 | n/a | n/a | 0.095 | 5.326 | 0.006 | 0.095 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000000142 | 876.277 | 5.048 | n/a | 0.000 | 0.000 | 5.685 | 865.328 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.163 | 5.048 | 0.006 | 0.163 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (106 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 353.316 | n/a | n/a | n/a | 2.828 | n/a | 0.000 | 0.000 | 0.590 | 347.180 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.065 | 2.890 | 0.009 | 0.065 |
| p99 | 1003.969 | n/a | n/a | n/a | 9.311 | n/a | 0.668 | 0.000 | 4.550 | 1001.000 | 1.231 | n/a | 0.083 | 0.000 | n/a | n/a | 23.015 | 9.311 | 0.292 | 23.015 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab000000000000018b | 1005.869 | 0.121 | n/a | 0.000 | 0.000 | 3.977 | 1000.615 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 1.103 | 0.121 | 0.000 | 1.103 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000001a7 | 1003.969 | 0.135 | n/a | 0.000 | 0.000 | 0.889 | 1001.258 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 1.617 | 0.135 | 0.000 | 1.617 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab000000000000016f | 1003.895 | 2.349 | n/a | 0.668 | 0.000 | 0.524 | 1000.230 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.092 | 3.017 | 0.003 | 0.092 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000000165 | 1003.026 | 0.144 | n/a | 0.000 | 0.000 | 0.684 | 1001.000 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 1.106 | 0.144 | 0.000 | 1.106 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000000186 | 1002.468 | 0.111 | n/a | 0.000 | 0.000 | 0.506 | 1000.728 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.077 | 0.111 | 0.000 | 1.077 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab00000000000001c6 | 996.292 | 2.523 | n/a | 0.000 | 0.000 | 0.494 | 993.172 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.063 | 2.523 | 0.003 | 0.063 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab000000000000019b | 996.223 | 2.906 | n/a | 0.000 | 0.000 | 0.460 | 992.717 | 0.013 | n/a | 0.065 | 0.000 | n/a | n/a | 0.061 | 2.906 | 0.003 | 0.061 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab00000000000001c5 | 991.941 | 2.504 | n/a | 0.000 | 0.000 | 4.550 | 984.787 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.067 | 2.504 | 0.003 | 0.067 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000001eb | 991.828 | 2.223 | n/a | 0.000 | 0.000 | 0.549 | 988.934 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.064 | 2.223 | 0.002 | 0.064 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000000185 | 986.688 | 2.925 | n/a | 0.000 | 0.000 | 1.167 | 982.486 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 0.064 | 2.925 | 0.003 | 0.064 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab00000000000001a9 | 982.061 | 2.215 | n/a | 0.000 | 0.000 | 3.955 | 975.755 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.055 | 2.215 | 0.002 | 0.055 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab000000000000017f | 981.546 | 2.546 | n/a | 0.000 | 0.000 | 0.490 | 978.413 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.062 | 2.546 | 0.003 | 0.062 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000000175 | 880.030 | 3.097 | n/a | 0.000 | 0.000 | 0.448 | 876.372 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.066 | 3.097 | 0.004 | 0.066 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab00000000000001a6 | 862.464 | 3.031 | n/a | 0.000 | 0.000 | 0.762 | 858.558 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.070 | 3.031 | 0.004 | 0.070 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab000000000000019d | 843.501 | 7.141 | n/a | 0.000 | 0.000 | 0.620 | 835.588 | 0.003 | n/a | 0.016 | 0.000 | n/a | n/a | 0.133 | 7.141 | 0.008 | 0.133 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab00000000000001d6 | 806.590 | 1.526 | n/a | 0.000 | 0.000 | 0.452 | 804.504 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.055 | 1.526 | 0.002 | 0.055 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab00000000000001f8 | 789.140 | 2.948 | n/a | 0.000 | 0.000 | 0.428 | 785.632 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.065 | 2.948 | 0.004 | 0.065 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab00000000000001f1 | 778.424 | 1.786 | n/a | 0.000 | 0.000 | 0.644 | 775.902 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.054 | 1.786 | 0.002 | 0.054 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab00000000000001de | 768.153 | 3.745 | n/a | 0.000 | 0.000 | 0.906 | 763.354 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.059 | 3.745 | 0.005 | 0.059 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab00000000000001c4 | 733.917 | 2.655 | n/a | 0.000 | 0.000 | 0.540 | 730.608 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.058 | 2.655 | 0.004 | 0.058 | gw-r/thread-41/journal/page | none observed |

## P3 / L16 / internal (1527 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.193 | n/a | n/a | n/a | 3.208 | n/a | 0.000 | 0.000 | 0.218 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.991 | 3.209 | 0.267 | 6.991 |
| p99 | 247.027 | n/a | n/a | n/a | 13.581 | n/a | 1.006 | 0.000 | 1.450 | 244.319 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 46.354 | 13.842 | 0.833 | 46.354 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab0000000000000218 | 1014.639 | 2.333 | n/a | 0.000 | 0.000 | 0.619 | 1011.571 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.067 | 2.333 | 0.002 | 0.067 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000000213 | 1002.898 | 0.188 | n/a | 0.000 | 0.000 | 0.870 | 1000.649 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 1.134 | 0.188 | 0.000 | 1.134 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab00000000000001ff | 995.860 | 2.472 | n/a | 0.000 | 0.000 | 0.522 | 992.765 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.063 | 2.472 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000000212 | 995.105 | 2.344 | n/a | 0.000 | 0.000 | 0.534 | 992.111 | 0.004 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 2.344 | 0.002 | 0.075 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000000225 | 991.656 | 4.615 | n/a | 0.000 | 0.000 | 0.436 | 986.434 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.114 | 4.615 | 0.005 | 0.114 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000000219 | 985.786 | 2.441 | n/a | 0.000 | 0.000 | 0.670 | 982.499 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.105 | 2.441 | 0.002 | 0.105 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000000217 | 924.376 | 5.463 | n/a | 0.000 | 0.000 | 0.839 | 917.877 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.153 | 5.463 | 0.006 | 0.153 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab000000000000021a | 921.169 | 1.656 | n/a | 0.000 | 0.000 | 0.550 | 918.868 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.061 | 1.656 | 0.002 | 0.061 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000000226 | 917.413 | 2.082 | n/a | 0.000 | 0.000 | 0.531 | 914.690 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.068 | 2.082 | 0.002 | 0.068 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000000208 | 873.449 | 2.445 | n/a | 0.000 | 0.000 | 0.341 | 870.593 | 0.003 | n/a | 0.013 | 0.000 | n/a | n/a | 0.053 | 2.445 | 0.003 | 0.053 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000000200 | 860.244 | 2.110 | n/a | 0.000 | 0.000 | 0.543 | 857.482 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.110 | 0.002 | 0.064 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000000203 | 798.302 | 2.490 | n/a | 0.000 | 0.000 | 3.031 | 792.666 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.072 | 2.490 | 0.003 | 0.072 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000000221 | 787.800 | 1.978 | n/a | 0.000 | 0.000 | 0.543 | 785.154 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.060 | 1.978 | 0.003 | 0.060 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab000000000000021d | 777.763 | 4.383 | n/a | 0.000 | 0.000 | 0.720 | 772.496 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.106 | 4.383 | 0.006 | 0.106 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000000210 | 439.325 | 2.247 | n/a | 0.000 | 0.000 | 0.356 | 436.611 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.056 | 2.247 | 0.005 | 0.056 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab000000000000020f | 247.027 | 2.215 | n/a | 0.000 | 0.000 | 0.403 | 244.319 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.059 | 2.215 | 0.009 | 0.059 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab000000000000021e | 233.422 | 4.419 | n/a | 0.000 | 0.000 | 0.605 | 228.288 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.077 | 4.419 | 0.019 | 0.077 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000000204 | 220.483 | 2.230 | n/a | 0.000 | 0.000 | 0.930 | 217.218 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.054 | 2.230 | 0.010 | 0.054 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000000224 | 203.196 | 4.350 | n/a | 0.000 | 0.000 | 0.625 | 198.051 | 0.003 | n/a | 0.035 | 0.000 | n/a | n/a | 0.132 | 4.350 | 0.021 | 0.132 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000000209 | 201.677 | 2.124 | n/a | 0.000 | 0.000 | 0.465 | 198.986 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.062 | 2.124 | 0.011 | 0.062 | gw-r/thread-41/journal/page | none observed |

## P3 / L64 / internal (1575 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.124 | n/a | n/a | n/a | 3.884 | n/a | 0.000 | 0.000 | 0.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.381 | 3.907 | 0.324 | 6.381 |
| p99 | 366.465 | n/a | n/a | n/a | 15.935 | n/a | 1.549 | 0.000 | 1.321 | 362.877 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 47.625 | 17.406 | 0.850 | 47.625 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab0000000000001ac1 | 1002.276 | 0.130 | n/a | 0.000 | 0.000 | 0.395 | 1000.602 | 0.008 | n/a | 0.040 | 0.000 | n/a | n/a | 1.100 | 0.130 | 0.000 | 1.100 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001ac6 | 996.786 | 3.684 | n/a | 0.000 | 0.000 | 0.290 | 992.717 | 0.006 | n/a | 0.021 | 0.000 | n/a | n/a | 0.068 | 3.684 | 0.004 | 0.068 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001acb | 954.521 | 2.995 | n/a | 0.000 | 0.000 | 0.219 | 951.190 | 0.013 | n/a | 0.047 | 0.000 | n/a | n/a | 0.059 | 2.995 | 0.003 | 0.059 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001ac3 | 941.844 | 10.851 | n/a | 0.000 | 0.000 | 0.771 | 929.947 | 0.008 | n/a | 0.023 | 0.000 | n/a | n/a | 0.245 | 10.851 | 0.012 | 0.245 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001ae3 | 930.116 | 3.402 | n/a | 0.000 | 0.000 | 0.490 | 926.127 | 0.010 | n/a | 0.023 | 0.000 | n/a | n/a | 0.064 | 3.402 | 0.004 | 0.064 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001ad5 | 912.713 | 2.679 | n/a | 0.000 | 0.000 | 0.454 | 909.485 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.062 | 2.679 | 0.003 | 0.062 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001abf | 860.904 | 3.543 | n/a | 0.000 | 0.000 | 0.639 | 856.622 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.062 | 3.543 | 0.004 | 0.062 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001ae6 | 718.320 | 2.875 | n/a | 0.000 | 0.000 | 0.612 | 714.747 | 0.006 | n/a | 0.020 | 0.000 | n/a | n/a | 0.061 | 2.875 | 0.004 | 0.061 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001acc | 678.970 | 1.729 | n/a | 0.000 | 0.000 | 0.322 | 676.790 | 0.017 | n/a | 0.047 | 0.000 | n/a | n/a | 0.066 | 1.729 | 0.003 | 0.066 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001ae8 | 644.728 | 9.537 | n/a | 1.308 | 0.000 | 0.334 | 633.128 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.388 | 10.845 | 0.017 | 0.388 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001ae1 | 638.154 | 2.283 | n/a | 0.000 | 0.000 | 0.372 | 635.398 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.054 | 2.283 | 0.004 | 0.054 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001af6 | 559.348 | 4.243 | n/a | 0.000 | 0.000 | 0.428 | 554.580 | 0.008 | n/a | 0.026 | 0.000 | n/a | n/a | 0.062 | 4.243 | 0.008 | 0.062 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001adb | 548.286 | 5.056 | n/a | 0.000 | 0.000 | 0.481 | 542.608 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.110 | 5.056 | 0.009 | 0.110 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001afb | 521.719 | 5.266 | n/a | 0.000 | 0.000 | 3.326 | 512.687 | 0.278 | n/a | 0.018 | 0.000 | n/a | n/a | 0.143 | 5.266 | 0.010 | 0.143 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001aff | 445.500 | 5.365 | n/a | 0.000 | 0.000 | 0.483 | 439.530 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.114 | 5.365 | 0.012 | 0.114 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001af4 | 366.465 | 3.148 | n/a | 0.000 | 0.000 | 0.344 | 362.877 | 0.010 | n/a | 0.033 | 0.000 | n/a | n/a | 0.053 | 3.148 | 0.009 | 0.053 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001ada | 350.582 | 1.900 | n/a | 0.000 | 0.000 | 0.309 | 348.291 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.054 | 1.900 | 0.005 | 0.054 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001af7 | 341.958 | 2.262 | n/a | 0.000 | 0.000 | 0.301 | 339.286 | 0.009 | n/a | 0.028 | 0.000 | n/a | n/a | 0.072 | 2.262 | 0.007 | 0.072 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001af2 | 304.960 | 3.015 | n/a | 0.000 | 0.000 | 0.589 | 301.256 | 0.007 | n/a | 0.028 | 0.000 | n/a | n/a | 0.065 | 3.015 | 0.010 | 0.065 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001aed | 295.112 | 6.566 | n/a | 1.037 | 0.000 | 0.346 | 287.040 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.087 | 7.603 | 0.026 | 0.087 | gw-r/thread-62/journal/page | none observed |

## P3 / L256 / internal (97 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 353.476 | n/a | n/a | n/a | 3.357 | n/a | 0.000 | 0.000 | 0.462 | 349.921 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.077 | 3.386 | 0.009 | 0.077 |
| p99 | 1004.500 | n/a | n/a | n/a | 16.465 | n/a | 2.695 | 0.000 | 2.516 | 1000.643 | 0.271 | n/a | 0.079 | 0.000 | n/a | n/a | 45.037 | 17.797 | 0.678 | 45.037 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab0000000000001b85 | 1004.500 | 2.736 | n/a | 0.528 | 0.000 | 0.505 | 1000.643 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.068 | 3.264 | 0.003 | 0.068 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001b53 | 1002.689 | 2.505 | n/a | 0.000 | 0.000 | 0.603 | 999.443 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.092 | 2.505 | 0.002 | 0.092 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001b45 | 1002.300 | 0.164 | n/a | 0.000 | 0.000 | 0.477 | 1000.406 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 1.224 | 0.164 | 0.000 | 1.224 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001b58 | 1002.030 | 0.115 | n/a | 0.000 | 0.000 | 0.351 | 1000.453 | 0.003 | n/a | 0.027 | 0.000 | n/a | n/a | 1.081 | 0.115 | 0.000 | 1.081 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001b4a | 1001.765 | 2.356 | n/a | 0.000 | 0.000 | 0.413 | 998.915 | 0.004 | n/a | 0.021 | 0.000 | n/a | n/a | 0.055 | 2.356 | 0.002 | 0.055 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001b81 | 1001.332 | 3.192 | n/a | 0.000 | 0.000 | 0.709 | 997.320 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.077 | 3.192 | 0.003 | 0.077 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001b5a | 1000.928 | 2.364 | n/a | 0.000 | 0.000 | 0.379 | 998.099 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.055 | 2.364 | 0.002 | 0.055 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001b54 | 1000.636 | 2.909 | n/a | 0.000 | 0.000 | 0.565 | 997.069 | 0.007 | n/a | 0.035 | 0.000 | n/a | n/a | 0.051 | 2.909 | 0.003 | 0.051 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001b61 | 999.827 | 4.667 | n/a | 0.000 | 0.000 | 0.526 | 994.523 | 0.004 | n/a | 0.016 | 0.000 | n/a | n/a | 0.093 | 4.667 | 0.005 | 0.093 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001b73 | 999.236 | 4.067 | n/a | 0.472 | 0.000 | 0.492 | 994.088 | 0.002 | n/a | 0.014 | 0.000 | n/a | n/a | 0.102 | 4.539 | 0.005 | 0.102 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001b09 | 997.743 | 2.303 | n/a | 0.000 | 0.000 | 0.280 | 995.071 | 0.007 | n/a | 0.022 | 0.000 | n/a | n/a | 0.061 | 2.303 | 0.002 | 0.061 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001b86 | 995.443 | 3.928 | n/a | 0.000 | 0.000 | 0.616 | 990.791 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.079 | 3.928 | 0.004 | 0.079 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001b70 | 956.952 | 6.955 | n/a | 1.804 | 0.000 | 1.488 | 946.548 | 0.003 | n/a | 0.022 | 0.000 | n/a | n/a | 0.131 | 8.759 | 0.009 | 0.131 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001b18 | 942.541 | 3.534 | n/a | 0.000 | 0.000 | 0.403 | 938.469 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.106 | 3.534 | 0.004 | 0.106 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001b6b | 926.344 | 3.108 | n/a | 0.000 | 0.000 | 0.322 | 922.789 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.075 | 3.108 | 0.003 | 0.075 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001b5e | 924.513 | 3.676 | n/a | 0.000 | 0.000 | 0.492 | 920.256 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.057 | 3.676 | 0.004 | 0.057 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001b84 | 919.637 | 3.687 | n/a | 0.557 | 0.000 | 0.534 | 914.747 | 0.004 | n/a | 0.037 | 0.000 | n/a | n/a | 0.072 | 4.243 | 0.005 | 0.072 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001b7e | 896.831 | 3.741 | n/a | 0.600 | 0.000 | 0.375 | 892.032 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.068 | 4.342 | 0.005 | 0.068 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001b55 | 891.451 | 2.361 | n/a | 0.000 | 0.000 | 0.476 | 888.538 | 0.004 | n/a | 0.013 | 0.000 | n/a | n/a | 0.059 | 2.361 | 0.003 | 0.059 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001b05 | 883.988 | 3.154 | n/a | 0.000 | 0.000 | 0.311 | 880.415 | 0.007 | n/a | 0.025 | 0.000 | n/a | n/a | 0.077 | 3.154 | 0.004 | 0.077 | gw-r/thread-62/journal/page | none observed |

## P3 / L1024 / internal (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 358.897 | n/a | n/a | n/a | 2.850 | n/a | 0.000 | 0.000 | 0.518 | 356.852 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.106 | 3.043 | 0.011 | 0.106 |
| p99 | 1002.814 | n/a | n/a | n/a | 9.054 | n/a | 1.474 | 0.000 | 3.188 | 1000.734 | 0.245 | n/a | 0.069 | 0.000 | n/a | n/a | 36.975 | 9.054 | 0.691 | 36.975 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab0000000000001bf9 | 1003.569 | 3.843 | n/a | 0.000 | 0.000 | 0.594 | 998.995 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.075 | 3.843 | 0.004 | 0.075 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001c15 | 1002.814 | 0.177 | n/a | 0.000 | 0.000 | 0.642 | 1000.738 | 0.006 | n/a | 0.101 | 0.000 | n/a | n/a | 1.151 | 0.177 | 0.000 | 1.151 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001bc2 | 1002.603 | 0.106 | n/a | 0.000 | 0.000 | 0.630 | 1000.734 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 1.087 | 0.106 | 0.000 | 1.087 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001c0e | 1002.485 | 0.187 | n/a | 0.000 | 0.000 | 0.523 | 1000.561 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.168 | 0.187 | 0.000 | 1.168 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001be0 | 1002.424 | 0.145 | n/a | 0.000 | 0.000 | 0.498 | 1000.605 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 1.117 | 0.145 | 0.000 | 1.117 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001be8 | 1002.396 | 0.125 | n/a | 0.000 | 0.000 | 0.555 | 1000.577 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 1.094 | 0.125 | 0.000 | 1.094 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001c28 | 1001.434 | 2.390 | n/a | 0.000 | 0.000 | 0.719 | 998.221 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.069 | 2.390 | 0.002 | 0.069 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001bf1 | 1000.301 | 4.160 | n/a | 0.000 | 0.000 | 0.618 | 995.343 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.122 | 4.160 | 0.004 | 0.122 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001bf2 | 1000.012 | 3.520 | n/a | 0.000 | 0.000 | 0.676 | 995.711 | 0.002 | n/a | 0.037 | 0.000 | n/a | n/a | 0.065 | 3.520 | 0.004 | 0.065 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001bf8 | 996.755 | 2.675 | n/a | 0.000 | 0.000 | 0.324 | 993.649 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.069 | 2.675 | 0.003 | 0.069 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001bea | 992.988 | 2.609 | n/a | 0.000 | 0.000 | 0.470 | 989.737 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.143 | 2.609 | 0.003 | 0.143 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001c0a | 992.003 | 2.542 | n/a | 0.000 | 0.000 | 0.404 | 988.946 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.073 | 2.542 | 0.003 | 0.073 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001be5 | 959.854 | 7.388 | n/a | 0.000 | 0.000 | 0.983 | 951.210 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.246 | 7.388 | 0.008 | 0.246 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001bbf | 955.198 | 4.024 | n/a | 0.967 | 0.000 | 0.730 | 949.352 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.095 | 4.991 | 0.005 | 0.095 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001c1b | 918.076 | 5.207 | n/a | 0.000 | 0.000 | 0.549 | 912.158 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.123 | 5.207 | 0.006 | 0.123 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001bfe | 908.615 | 2.484 | n/a | 0.000 | 0.000 | 0.465 | 905.566 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.066 | 2.484 | 0.003 | 0.066 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001c26 | 857.520 | 2.513 | n/a | 0.000 | 0.000 | 0.659 | 854.251 | 0.004 | n/a | 0.031 | 0.000 | n/a | n/a | 0.062 | 2.513 | 0.003 | 0.062 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001b93 | 838.538 | 4.552 | n/a | 0.000 | 0.000 | 0.546 | 833.280 | 0.003 | n/a | 0.026 | 0.000 | n/a | n/a | 0.130 | 4.552 | 0.005 | 0.130 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001bbc | 837.418 | 2.241 | n/a | 0.000 | 0.000 | 0.574 | 834.480 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.075 | 2.241 | 0.003 | 0.075 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001c00 | 806.099 | 2.021 | n/a | 0.000 | 0.000 | 0.396 | 803.580 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.071 | 2.021 | 0.003 | 0.071 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / internal (367 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 357.418 | n/a | n/a | n/a | 3.075 | n/a | 0.000 | 0.000 | 0.447 | 350.081 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.093 | 3.075 | 0.010 | 0.093 |
| p99 | 1005.311 | n/a | n/a | n/a | 11.284 | n/a | 1.151 | 0.000 | 3.390 | 1001.307 | 0.087 | n/a | 0.062 | 0.000 | n/a | n/a | 45.669 | 11.425 | 0.714 | 45.669 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| e0a18e9401846aab0000000000001ced | 1023.654 | 2.393 | n/a | 0.000 | 0.000 | 0.810 | 1020.350 | 0.003 | n/a | 0.032 | 0.000 | n/a | n/a | 0.066 | 2.393 | 0.002 | 0.066 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001d40 | 1007.061 | 4.464 | n/a | 0.000 | 0.000 | 0.723 | 1001.774 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.071 | 4.464 | 0.004 | 0.071 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001c6d | 1005.413 | 4.484 | n/a | 0.000 | 0.000 | 0.482 | 1000.344 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.073 | 4.484 | 0.004 | 0.073 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001d92 | 1005.311 | 4.599 | n/a | 0.000 | 0.000 | 0.513 | 1000.106 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.060 | 4.599 | 0.005 | 0.060 | gw-r/thread-43/journal/page | none observed |
| e0a18e9401846aab0000000000001c2d | 1004.917 | 4.596 | n/a | 0.000 | 0.000 | 0.526 | 999.646 | 0.002 | n/a | 0.019 | 0.000 | n/a | n/a | 0.128 | 4.596 | 0.005 | 0.128 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001e50 | 1004.865 | 3.164 | n/a | 0.000 | 0.000 | 0.587 | 1000.975 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.079 | 3.164 | 0.003 | 0.079 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001e44 | 1004.744 | 2.648 | n/a | 0.000 | 0.000 | 0.326 | 1001.656 | 0.003 | n/a | 0.051 | 0.000 | n/a | n/a | 0.060 | 2.648 | 0.003 | 0.060 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001db8 | 1004.029 | 6.394 | n/a | 0.000 | 0.000 | 1.728 | 995.465 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.413 | 6.394 | 0.006 | 0.413 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001d1f | 1003.876 | 8.735 | n/a | 0.000 | 0.000 | 0.522 | 994.481 | 0.002 | n/a | 0.018 | 0.000 | n/a | n/a | 0.118 | 8.735 | 0.009 | 0.118 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001dce | 1003.808 | 3.777 | n/a | 0.000 | 0.000 | 0.526 | 999.393 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.065 | 3.777 | 0.004 | 0.065 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001cfd | 1003.494 | 0.187 | n/a | 0.000 | 0.000 | 0.828 | 1001.307 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 1.117 | 0.187 | 0.000 | 1.117 | gw-r/thread-46/journal/page | none observed |
| e0a18e9401846aab0000000000001c2c | 1002.970 | 2.261 | n/a | 0.000 | 0.000 | 0.385 | 1000.196 | 0.007 | n/a | 0.038 | 0.000 | n/a | n/a | 0.083 | 2.261 | 0.002 | 0.083 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001e52 | 1002.831 | 0.143 | n/a | 0.000 | 0.000 | 0.651 | 1000.845 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 1.126 | 0.143 | 0.000 | 1.126 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001cb0 | 1002.748 | 2.365 | n/a | 0.000 | 0.000 | 0.355 | 999.921 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.076 | 2.365 | 0.002 | 0.076 | gw-r/thread-48/journal/page | none observed |
| e0a18e9401846aab0000000000001c41 | 1002.667 | 2.450 | n/a | 0.000 | 0.000 | 0.623 | 999.498 | 0.004 | n/a | 0.026 | 0.000 | n/a | n/a | 0.067 | 2.450 | 0.002 | 0.067 | gw-r/thread-41/journal/page | none observed |
| e0a18e9401846aab0000000000001df1 | 1002.580 | 3.419 | n/a | 0.000 | 0.000 | 0.521 | 998.461 | 0.008 | n/a | 0.051 | 0.000 | n/a | n/a | 0.121 | 3.419 | 0.003 | 0.121 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001e2c | 1002.405 | 0.111 | n/a | 0.000 | 0.000 | 0.550 | 1000.611 | 0.003 | n/a | 0.039 | 0.000 | n/a | n/a | 1.091 | 0.111 | 0.000 | 1.091 | gw-r/thread-62/journal/page | none observed |
| e0a18e9401846aab0000000000001d6a | 1002.374 | 0.147 | n/a | 0.000 | 0.000 | 0.409 | 1000.602 | 0.007 | n/a | 0.048 | 0.000 | n/a | n/a | 1.160 | 0.147 | 0.000 | 1.160 | gw-r/thread-45/journal/page | none observed |
| e0a18e9401846aab0000000000001c57 | 1002.370 | 0.191 | n/a | 0.000 | 0.000 | 0.505 | 1000.514 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 1.123 | 0.191 | 0.000 | 1.123 | gw-r/thread-44/journal/page | none observed |
| e0a18e9401846aab0000000000001e24 | 1002.370 | 0.083 | n/a | 0.000 | 0.000 | 0.438 | 1000.718 | 0.003 | n/a | 0.044 | 0.000 | n/a | n/a | 1.085 | 0.083 | 0.000 | 1.085 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / read (77 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.252 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.892 | 201.092 | 0.015 | n/a | 0.124 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 |
| p99 | 206.477 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.220 | 205.140 | 5.638 | n/a | 0.913 | 0.000 | n/a | n/a | 49.763 | 0.000 | 0.000 | 49.763 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a20000000000000000b | 206.477 | 0.000 | n/a | 0.000 | 0.000 | 4.071 | 202.177 | 0.012 | n/a | 0.108 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a20000000000000001b | 206.382 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 205.140 | 0.054 | n/a | 0.163 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000000e | 206.323 | 0.000 | n/a | 0.000 | 0.000 | 1.305 | 204.655 | 0.033 | n/a | 0.192 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000004d | 206.294 | 0.000 | n/a | 0.000 | 0.000 | 1.405 | 204.626 | 0.016 | n/a | 0.144 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000015 | 205.721 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 203.609 | 0.014 | n/a | 0.189 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000002c | 205.066 | 0.000 | n/a | 0.000 | 0.000 | 0.548 | 204.225 | 0.014 | n/a | 0.166 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a20000000000000002e | 204.690 | 0.000 | n/a | 0.000 | 0.000 | 1.742 | 202.503 | 0.030 | n/a | 0.300 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000031 | 204.062 | 0.000 | n/a | 0.000 | 0.000 | 1.023 | 201.919 | 0.026 | n/a | 0.913 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000002a | 204.042 | 0.000 | n/a | 0.000 | 0.000 | 1.716 | 201.930 | 0.027 | n/a | 0.171 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000059 | 203.975 | 0.000 | n/a | 0.000 | 0.000 | 1.156 | 202.489 | 0.015 | n/a | 0.104 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a20000000000000000f | 203.897 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 202.532 | 0.023 | n/a | 0.305 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a20000000000000003f | 203.881 | 0.000 | n/a | 0.000 | 0.000 | 1.393 | 202.022 | 0.057 | n/a | 0.279 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000003d | 203.342 | 0.000 | n/a | 0.000 | 0.000 | 1.809 | 201.209 | 0.013 | n/a | 0.131 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a200000000000000009 | 203.243 | 0.000 | n/a | 0.000 | 0.000 | 1.458 | 201.149 | 0.017 | n/a | 0.216 | 0.000 | n/a | n/a | 0.402 | 0.000 | 0.000 | 0.402 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000044 | 203.224 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 201.973 | 0.014 | n/a | 0.148 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000024 | 203.191 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 201.852 | 0.039 | n/a | 0.261 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a200000000000000038 | 203.154 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.911 | 0.013 | n/a | 0.073 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a200000000000000047 | 203.093 | 0.000 | n/a | 0.000 | 0.000 | 1.945 | 200.841 | 0.015 | n/a | 0.108 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a200000000000000020 | 203.006 | 0.000 | n/a | 0.000 | 0.000 | 0.667 | 201.792 | 0.056 | n/a | 0.349 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000013 | 202.990 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.802 | 0.012 | n/a | 0.153 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / read (226 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.999 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.741 | 200.924 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 |
| p99 | 205.814 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.323 | 204.378 | 6.495 | n/a | 0.238 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a2000000000000000a2 | 208.307 | 0.000 | n/a | 0.000 | 0.000 | 3.828 | 204.181 | 0.019 | n/a | 0.165 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a2000000000000000be | 205.829 | 0.000 | n/a | 0.000 | 0.000 | 1.053 | 204.482 | 0.011 | n/a | 0.144 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a2000000000000000d4 | 205.814 | 0.000 | n/a | 0.000 | 0.000 | 0.948 | 204.623 | 0.012 | n/a | 0.138 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000102 | 205.659 | 0.000 | n/a | 0.000 | 0.000 | 1.189 | 204.074 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.304 | 0.000 | 0.000 | 0.304 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a2000000000000000e3 | 205.408 | 0.000 | n/a | 0.000 | 0.000 | 0.966 | 204.109 | 0.010 | n/a | 0.116 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a200000000000000155 | 205.324 | 0.000 | n/a | 0.000 | 0.000 | 4.342 | 200.810 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000062 | 205.250 | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 204.378 | 0.015 | n/a | 0.219 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000005c | 205.045 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 203.985 | 0.018 | n/a | 0.169 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000081 | 204.900 | 0.000 | n/a | 0.000 | 0.000 | 0.641 | 204.041 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a2000000000000000da | 204.782 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 204.030 | 0.013 | n/a | 0.118 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a20000000000000005e | 204.680 | 0.000 | n/a | 0.000 | 0.000 | 0.603 | 203.844 | 0.011 | n/a | 0.108 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a2000000000000000bc | 204.605 | 0.000 | n/a | 0.000 | 0.000 | 3.652 | 200.714 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a2000000000000000c1 | 204.499 | 0.000 | n/a | 0.000 | 0.000 | 0.611 | 202.960 | 0.033 | n/a | 0.768 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a200000000000000061 | 204.284 | 0.000 | n/a | 0.000 | 0.000 | 2.175 | 201.839 | 0.012 | n/a | 0.100 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a2000000000000000d9 | 204.082 | 0.000 | n/a | 0.000 | 0.000 | 1.774 | 202.100 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a2000000000000000ac | 204.072 | 0.000 | n/a | 0.000 | 0.000 | 2.931 | 200.941 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a2000000000000000e6 | 204.018 | 0.000 | n/a | 0.000 | 0.000 | 2.371 | 201.448 | 0.009 | n/a | 0.096 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000007b | 203.842 | 0.000 | n/a | 0.000 | 0.000 | 1.265 | 202.097 | 0.025 | n/a | 0.214 | 0.000 | n/a | n/a | 0.242 | 0.000 | 0.000 | 0.242 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000076 | 203.810 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 202.664 | 0.012 | n/a | 0.113 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 8f1f83189dd94a2000000000000000cd | 203.771 | 0.000 | n/a | 0.000 | 0.000 | 1.995 | 201.481 | 0.014 | n/a | 0.158 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |

## P3 / L4 / read (224 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.561 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 200.706 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 205.653 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.799 | 204.738 | 4.102 | n/a | 0.184 | 0.000 | n/a | n/a | 0.292 | 0.000 | 0.000 | 0.292 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a20000000000000024a | 214.719 | 0.000 | n/a | 0.000 | 0.000 | 0.484 | 213.979 | 0.014 | n/a | 0.138 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000199 | 205.883 | 0.000 | n/a | 0.000 | 0.000 | 4.997 | 200.692 | 0.017 | n/a | 0.053 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000167 | 205.653 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 204.823 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a2000000000000001cd | 205.603 | 0.000 | n/a | 0.000 | 0.000 | 0.658 | 204.738 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a2000000000000001f5 | 204.745 | 0.000 | n/a | 0.000 | 0.000 | 3.799 | 200.763 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000245 | 204.673 | 0.000 | n/a | 0.000 | 0.000 | 3.801 | 200.693 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a2000000000000001f2 | 204.169 | 0.000 | n/a | 0.000 | 0.000 | 3.309 | 200.620 | 0.015 | n/a | 0.026 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a20000000000000021c | 203.843 | 0.000 | n/a | 0.000 | 0.000 | 2.847 | 200.742 | 0.009 | n/a | 0.058 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000195 | 203.495 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 202.565 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a2000000000000001a7 | 203.401 | 0.000 | n/a | 0.000 | 0.000 | 0.472 | 202.709 | 0.015 | n/a | 0.076 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a2000000000000001e5 | 203.318 | 0.000 | n/a | 0.000 | 0.000 | 2.194 | 200.989 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000197 | 203.284 | 0.000 | n/a | 0.000 | 0.000 | 1.946 | 201.063 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a2000000000000001bc | 203.266 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 202.432 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000020e | 203.203 | 0.000 | n/a | 0.000 | 0.000 | 2.045 | 200.983 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a2000000000000001a4 | 203.194 | 0.000 | n/a | 0.000 | 0.000 | 2.025 | 200.843 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000172 | 203.116 | 0.000 | n/a | 0.000 | 0.000 | 0.659 | 202.210 | 0.013 | n/a | 0.155 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000178 | 203.016 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.944 | 0.010 | n/a | 0.176 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a2000000000000001d0 | 203.011 | 0.000 | n/a | 0.000 | 0.000 | 2.060 | 200.786 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000022b | 202.970 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 201.784 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000018e | 202.955 | 0.000 | n/a | 0.000 | 0.000 | 2.046 | 200.660 | 0.007 | n/a | 0.049 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / read (159 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.240 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 77.242 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 |
| p99 | 205.073 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.072 | 204.191 | 4.059 | n/a | 0.104 | 0.000 | n/a | n/a | 0.272 | 0.000 | 0.000 | 0.272 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a20000000000000027f | 205.767 | 0.000 | n/a | 0.000 | 0.000 | 1.113 | 204.314 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.248 | 0.000 | 0.000 | 0.248 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000261 | 205.073 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 204.191 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000266 | 204.775 | 0.000 | n/a | 0.000 | 0.000 | 0.653 | 203.939 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000273 | 202.417 | 0.000 | n/a | 0.000 | 0.000 | 0.769 | 201.419 | 0.012 | n/a | 0.104 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000029c | 202.300 | 0.000 | n/a | 0.000 | 0.000 | 1.075 | 200.938 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000025d | 202.269 | 0.000 | n/a | 0.000 | 0.000 | 0.717 | 201.357 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a20000000000000028a | 202.245 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 200.739 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000028c | 202.187 | 0.000 | n/a | 0.000 | 0.000 | 0.810 | 201.128 | 0.010 | n/a | 0.091 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000285 | 202.166 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.119 | 0.018 | n/a | 0.095 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000259 | 202.125 | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 201.035 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a20000000000000025a | 202.043 | 0.000 | n/a | 0.000 | 0.000 | 0.537 | 201.324 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000025f | 201.997 | 0.000 | n/a | 0.000 | 0.000 | 0.695 | 201.108 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000265 | 201.982 | 0.000 | n/a | 0.000 | 0.000 | 0.839 | 200.935 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000276 | 201.917 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 200.522 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000286 | 201.851 | 0.000 | n/a | 0.000 | 0.000 | 0.627 | 201.010 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000029b | 201.811 | 0.000 | n/a | 0.000 | 0.000 | 0.586 | 201.068 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000299 | 201.787 | 0.000 | n/a | 0.000 | 0.000 | 0.390 | 201.208 | 0.017 | n/a | 0.073 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000293 | 201.777 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 200.992 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000255 | 201.767 | 0.000 | n/a | 0.000 | 0.000 | 0.613 | 200.950 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000254 | 201.752 | 0.000 | n/a | 0.000 | 0.000 | 0.501 | 201.051 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (144 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.959 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.431 | 94.239 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 |
| p99 | 202.126 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.311 | 201.104 | 3.824 | n/a | 0.078 | 0.000 | n/a | n/a | 50.104 | 0.000 | 0.000 | 50.104 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a200000000000000ea9 | 204.577 | 0.000 | n/a | 0.000 | 0.000 | 3.840 | 200.583 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000e87 | 202.126 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 201.104 | 0.010 | n/a | 0.063 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000e53 | 201.996 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.970 | 0.035 | n/a | 0.078 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000e54 | 201.949 | 0.000 | n/a | 0.000 | 0.000 | 0.618 | 201.152 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000e98 | 201.831 | 0.000 | n/a | 0.000 | 0.000 | 0.541 | 201.104 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000e6a | 201.737 | 0.000 | n/a | 0.000 | 0.000 | 0.527 | 201.008 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000e72 | 201.686 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 200.604 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000e79 | 201.681 | 0.000 | n/a | 0.000 | 0.000 | 0.400 | 201.091 | 0.019 | n/a | 0.071 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000e9f | 201.647 | 0.000 | n/a | 0.000 | 0.000 | 0.568 | 200.857 | 0.009 | n/a | 0.047 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000e6b | 201.577 | 0.000 | n/a | 0.000 | 0.000 | 0.571 | 200.862 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000e84 | 201.556 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 200.736 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000e91 | 201.555 | 0.000 | n/a | 0.000 | 0.000 | 0.467 | 200.943 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000e5f | 201.534 | 0.000 | n/a | 0.000 | 0.000 | 0.408 | 200.840 | 0.015 | n/a | 0.079 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000e58 | 201.484 | 0.000 | n/a | 0.000 | 0.000 | 0.522 | 200.809 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.086 | 0.000 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000e92 | 201.448 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 200.746 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000e93 | 201.441 | 0.000 | n/a | 0.000 | 0.000 | 0.530 | 200.754 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000eaa | 201.423 | 0.000 | n/a | 0.000 | 0.000 | 0.571 | 200.589 | 0.009 | n/a | 0.051 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000e7a | 201.384 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 200.657 | 0.010 | n/a | 0.022 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000e8f | 201.378 | 0.000 | n/a | 0.000 | 0.000 | 0.507 | 200.646 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000e78 | 201.369 | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 200.704 | 0.007 | n/a | 0.044 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / read (229 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.103 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.454 | 200.542 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 |
| p99 | 209.443 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.938 | 205.101 | 2.313 | n/a | 0.087 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a200000000000000f44 | 219.938 | 0.000 | n/a | 0.000 | 0.000 | 0.338 | 219.480 | 0.004 | n/a | 0.039 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000ec8 | 210.206 | 0.000 | n/a | 0.000 | 0.000 | 3.949 | 205.101 | 0.018 | n/a | 1.047 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000f80 | 209.443 | 0.000 | n/a | 0.000 | 0.000 | 0.399 | 208.872 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000f01 | 205.450 | 0.000 | n/a | 0.000 | 0.000 | 0.401 | 201.152 | 3.775 | n/a | 0.029 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000f22 | 204.792 | 0.000 | n/a | 0.000 | 0.000 | 0.174 | 204.493 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000fb3 | 203.952 | 0.000 | n/a | 0.000 | 0.000 | 2.938 | 200.865 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000f4f | 202.802 | 0.000 | n/a | 0.000 | 0.000 | 0.720 | 201.885 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000ef6 | 202.795 | 0.000 | n/a | 0.000 | 0.000 | 0.418 | 202.215 | 0.012 | n/a | 0.051 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000f75 | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 1.813 | 200.636 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.089 | 0.000 | 0.000 | 0.089 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000f7b | 202.188 | 0.000 | n/a | 0.000 | 0.000 | 0.851 | 201.067 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.188 | 0.000 | 0.000 | 0.188 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000edf | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.305 | 0.005 | n/a | 0.024 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000000ecc | 202.104 | 0.000 | n/a | 0.000 | 0.000 | 1.385 | 200.580 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000eba | 202.022 | 0.000 | n/a | 0.000 | 0.000 | 0.423 | 201.349 | 0.015 | n/a | 0.100 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000f34 | 202.003 | 0.000 | n/a | 0.000 | 0.000 | 0.703 | 201.035 | 0.009 | n/a | 0.064 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000000f38 | 201.910 | 0.000 | n/a | 0.000 | 0.000 | 1.130 | 200.625 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000eeb | 201.908 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 201.121 | 0.016 | n/a | 0.087 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000faf | 201.782 | 0.000 | n/a | 0.000 | 0.000 | 0.580 | 201.026 | 0.008 | n/a | 0.083 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000000f50 | 201.777 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.831 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000ee6 | 201.753 | 0.000 | n/a | 0.000 | 0.000 | 1.182 | 200.439 | 0.010 | n/a | 0.031 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000000fac | 201.731 | 0.000 | n/a | 0.000 | 0.000 | 0.696 | 200.799 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-44/journal/page | none observed |

## P3 / L1024 / read (230 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.172 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.476 | 200.526 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 |
| p99 | 202.594 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 201.791 | 1.794 | n/a | 0.102 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a200000000000000fc9 | 207.084 | 0.000 | n/a | 0.000 | 0.000 | 0.601 | 206.326 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a200000000000001099 | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 0.375 | 202.287 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000103e | 202.594 | 0.000 | n/a | 0.000 | 0.000 | 1.841 | 200.528 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000fed | 202.569 | 0.000 | n/a | 0.000 | 0.000 | 0.596 | 201.791 | 0.004 | n/a | 0.043 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000000fd3 | 202.405 | 0.000 | n/a | 0.000 | 0.000 | 0.595 | 201.633 | 0.004 | n/a | 0.040 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000001021 | 202.364 | 0.000 | n/a | 0.000 | 0.000 | 1.117 | 201.074 | 0.008 | n/a | 0.086 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000ff1 | 202.263 | 0.000 | n/a | 0.000 | 0.000 | 0.554 | 201.537 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a20000000000000100f | 202.145 | 0.000 | n/a | 0.000 | 0.000 | 0.979 | 200.883 | 0.007 | n/a | 0.059 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000104b | 202.133 | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 201.330 | 0.011 | n/a | 0.116 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a2000000000000010a4 | 202.085 | 0.000 | n/a | 0.000 | 0.000 | 1.415 | 200.527 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.094 | 0.000 | 0.000 | 0.094 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000000ffe | 202.055 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 201.075 | 0.007 | n/a | 0.087 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000106c | 202.048 | 0.000 | n/a | 0.000 | 0.000 | 1.473 | 200.384 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a20000000000000104c | 201.998 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 200.865 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.243 | 0.000 | 0.000 | 0.243 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000106e | 201.963 | 0.000 | n/a | 0.000 | 0.000 | 0.706 | 200.914 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.260 | 0.000 | 0.000 | 0.260 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a2000000000000010a0 | 201.941 | 0.000 | n/a | 0.000 | 0.000 | 1.265 | 200.476 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000000ff7 | 201.929 | 0.000 | n/a | 0.000 | 0.000 | 0.356 | 201.343 | 0.009 | n/a | 0.104 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000001045 | 201.920 | 0.000 | n/a | 0.000 | 0.000 | 1.241 | 200.534 | 0.005 | n/a | 0.026 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a200000000000001047 | 201.894 | 0.000 | n/a | 0.000 | 0.000 | 0.566 | 201.082 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000100e | 201.884 | 0.000 | n/a | 0.000 | 0.000 | 0.917 | 200.682 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a200000000000001004 | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 0.415 | 201.191 | 0.010 | n/a | 0.101 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-44/journal/page | none observed |

## P3 / tail / read (845 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.125 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.502 | 200.515 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 203.318 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.703 | 201.274 | 1.191 | n/a | 0.111 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8f1f83189dd94a20000000000000131d | 205.312 | 0.000 | n/a | 0.000 | 0.000 | 4.278 | 200.808 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a2000000000000012ad | 205.226 | 0.000 | n/a | 0.000 | 0.000 | 0.737 | 204.289 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a200000000000001205 | 204.476 | 0.000 | n/a | 0.000 | 0.000 | 3.782 | 200.537 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a2000000000000013af | 203.965 | 0.000 | n/a | 0.000 | 0.000 | 3.056 | 200.740 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.092 | 0.000 | 0.000 | 0.092 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000001368 | 203.840 | 0.000 | n/a | 0.000 | 0.000 | 2.302 | 201.194 | 0.011 | n/a | 0.111 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-45/journal/page | none observed |
| 8f1f83189dd94a2000000000000011b9 | 203.821 | 0.000 | n/a | 0.000 | 0.000 | 2.928 | 200.737 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a2000000000000013b6 | 203.648 | 0.000 | n/a | 0.000 | 0.000 | 2.770 | 200.656 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a2000000000000011a0 | 203.406 | 0.000 | n/a | 0.000 | 0.000 | 2.642 | 200.602 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a2000000000000013d2 | 203.318 | 0.000 | n/a | 0.000 | 0.000 | 0.516 | 202.666 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.087 | 0.000 | 0.000 | 0.087 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a20000000000000142d | 203.315 | 0.000 | n/a | 0.000 | 0.000 | 2.703 | 200.482 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-43/journal/page | none observed |
| 8f1f83189dd94a20000000000000115b | 203.257 | 0.000 | n/a | 0.000 | 0.000 | 0.240 | 202.520 | 0.062 | n/a | 0.259 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a2000000000000010d7 | 203.149 | 0.000 | n/a | 0.000 | 0.000 | 2.513 | 200.471 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-41/journal/page | none observed |
| 8f1f83189dd94a2000000000000012bd | 202.911 | 0.000 | n/a | 0.000 | 0.000 | 2.331 | 200.451 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.088 | 0.000 | 0.000 | 0.088 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000001114 | 202.896 | 0.000 | n/a | 0.000 | 0.000 | 1.863 | 200.853 | 0.009 | n/a | 0.086 | 0.000 | n/a | n/a | 0.085 | 0.000 | 0.000 | 0.085 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a2000000000000012af | 202.894 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 201.420 | 0.013 | n/a | 0.138 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000001312 | 202.771 | 0.000 | n/a | 0.000 | 0.000 | 2.117 | 200.475 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-62/journal/page | none observed |
| 8f1f83189dd94a200000000000001308 | 202.718 | 0.000 | n/a | 0.000 | 0.000 | 1.841 | 200.634 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-48/journal/page | none observed |
| 8f1f83189dd94a200000000000001271 | 202.586 | 0.000 | n/a | 0.000 | 0.000 | 0.947 | 201.274 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-44/journal/page | none observed |
| 8f1f83189dd94a200000000000001178 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.928 | 200.471 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 8f1f83189dd94a20000000000000125d | 202.517 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.505 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-44/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3707 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.951 ms; post-ACK p50/p99: 0.380/1.775 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 10.547 | 10.077 | 9.840 | reported |
| All-primary p99 ms | 37.983 | 37.001 | 35.045 | <=50 |
| L256 5-10 p50Ms | 9.919 | 9.663 | 9.343 | <=10 |
| L256 5-10 p99Ms | 35.627 | 35.273 | 35.273 | <=50 |
| L256 11-25 p50Ms | 13.311 | 12.799 | 12.543 | <=10 |
| L256 11-25 p99Ms | 16.060 | 15.520 | 15.519 | <=50 |
| L256 26-50 p50Ms | 13.887 | 12.031 | 12.031 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 18.803 | 18.092 | 18.091 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 8.959 | 8.639 | 8.383 | <=10 |
| Burst 11-25 p50 ms | 11.199 | 10.623 | 10.431 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 35.627 | 35.273 | 35.273 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 19.333 | 18.865 | 18.865 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 1 | 36.127/36.127 | 33.894 | 14.717 | 48.263 | 0.787/0.097 |
| 5-10 | 250-1000 | 134 | 11.428/35.589 | 11.009 | 6.323 | 15.724 | 0.071/0.022 |
| 5-10 | 50-100 | 81 | 8.236/21.277 | 7.857 | 4.317 | 10.930 | 0.049/0.019 |
| 11-25 | 250-1000 | 81 | 13.719/87.696 | 12.824 | 7.262 | 18.077 | 0.076/0.024 |
| 26-50 | 100-250 | 11 | 14.729/31.475 | 12.978 | 5.985 | 15.511 | 0.077/0.026 |
| 5-10 | 100-250 | 71 | 10.088/56.083 | 9.837 | 5.597 | 13.659 | 0.060/0.021 |
| 26-50 | 250-1000 | 22 | 17.396/55.762 | 16.082 | 7.894 | 21.115 | 0.088/0.025 |
| 5-10 | overlap | 793 | 10.016/33.943 | 9.709 | 5.731 | 13.261 | 0.033/0.017 |
| 26-50 | 0-50 | 203 | 13.890/37.327 | 12.811 | 6.755 | 16.895 | 0.061/0.021 |
| 11-25 | 100-250 | 29 | 12.434/19.045 | 11.796 | 5.719 | 15.942 | 0.068/0.024 |
| 11-25 | overlap | 381 | 12.396/47.489 | 11.733 | 6.932 | 16.234 | 0.038/0.018 |
| 11-25 | 0-50 | 542 | 10.115/25.052 | 9.540 | 5.074 | 12.810 | 0.047/0.020 |
| 5-10 | 0-50 | 1153 | 7.989/22.308 | 7.625 | 4.216 | 10.446 | 0.040/0.019 |
| 26-50 | overlap | 143 | 15.883/42.339 | 15.050 | 8.638 | 21.430 | 0.049/0.020 |
| 11-25 | 50-100 | 43 | 11.063/39.410 | 10.335 | 5.161 | 13.937 | 0.058/0.023 |
| 26-50 | 50-100 | 19 | 14.242/22.409 | 13.056 | 6.793 | 16.463 | 0.071/0.023 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1845 | 4 | 260.321 |
| burst | 1862 | 4 | 222.115 |

## Writer heap, GC and scheduler stalls

Source d709fd769d271992b6a87841489c90665585e919; 3707 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 480.677 / 539.325 |
| GC events / total duration / maximum ms | 830 / 1821.725 / 38.264 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":816,"4":7,"8":7} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 37.983 / 8 / 482.437 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

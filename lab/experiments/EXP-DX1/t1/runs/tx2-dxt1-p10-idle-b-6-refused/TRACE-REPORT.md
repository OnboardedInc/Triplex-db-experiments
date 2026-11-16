# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-50/peer.transact-await (includes order/network/storage)` (47.587 ms, trace `d62c64b47eb831930000000000000448`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (15.290 ms, trace `d62c64b47eb8319300000000000000f1`); `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (34.117 ms, trace `d62c64b47eb831930000000000000449`); `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (29.157 ms, trace `d62c64b47eb831930000000000000634`); `node-14/thread-0/socket.wait-first-byte` (22.687 ms, trace `d62c64b47eb831930000000000000262`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p10-idle-b-6-refused`; source `a0785bcf96f7afea3965b3028db2e27f4fbef6a9`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 1250/1250 (100.000%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 1250/1250. Raw trace bytes: 51707514.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 4051 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 5999.018 | 1241.562 | 13.343 | 4049 |
| idle-10 | 0 | 2486.481 | 690.832 | 10.121 | 3025 |
| idle-25 | 0 | 4731.858 | 779.038 | 6.245 | 3034 |
| idle-50 | 0 | 8461.108 | 818.142 | 9.282 | 3034 |
| idle-100 | 0 | 15909.358 | 900.744 | 19.645 | 3034 |
| idle-250 | 0 | 38256.721 | 1139.653 | 24.294 | 3030 |
| idle-500 | 0 | 75509.319 | 1560.379 | 43.978 | 3034 |
| idle-1000 | 0 | 148013.249 | 2502.362 | 82.969 | 3012 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| d62c64b47eb831930000000000000448 | driver.queue.scheduler-dispatch | 0.033 | none | 0 / 32 |
| d62c64b47eb831930000000000000448 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace d62c64b47eb831930000000000000448 waited: []

| d62c64b47eb8319300000000000000f1 | driver.queue.scheduler-late | 3.585 | none | 0 / 32 |
| d62c64b47eb8319300000000000000f1 | driver.queue.scheduler-dispatch | 0.121 | none | 0 / 32 |

Observed active steps while trace d62c64b47eb8319300000000000000f1 waited: []

| d62c64b47eb831930000000000000449 | driver.queue.scheduler-dispatch | 0.058 | none | 1 / 32 |
| d62c64b47eb831930000000000000449 | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace d62c64b47eb831930000000000000449 waited: []

| d62c64b47eb831930000000000000634 | driver.queue.scheduler-dispatch | 0.104 | none | 0 / 32 |
| d62c64b47eb831930000000000000634 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace d62c64b47eb831930000000000000634 waited: []

| d62c64b47eb831930000000000000262 | driver.queue.scheduler-dispatch | 0.125 | none | 0 / 32 |
| d62c64b47eb831930000000000000262 | driver.queue.scheduler-late | 0.018 | none | 0 / 32 |

Observed active steps while trace d62c64b47eb831930000000000000262 waited: []

## P2 / warmup / commit (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.632 | 0.668 | 0.000 | 0.512 | 2.377 | n/a | 0.000 | 0.052 | 0.543 | 1.094 | 0.012 | 0.000 | 0.129 | 4.725 | 0.499 | n/a | 0.023 | 2.587 | 0.250 | 0.023 |
| p99 | 36.433 | 3.009 | 0.036 | 2.147 | 4.521 | n/a | 1.396 | 2.098 | 4.049 | 4.560 | 0.026 | 0.000 | 3.220 | 15.290 | 5.603 | n/a | 0.056 | 6.363 | 0.426 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000000f1 | 39.667 | 6.718 | n/a | 1.500 | 3.706 | 0.557 | 3.936 | 0.016 | 0.000 | 2.906 | 15.290 | 4.902 | n/a | 0.137 | 11.923 | 0.301 | 0.137 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| d62c64b47eb831930000000000000262 | 36.785 | 3.552 | n/a | 0.000 | 0.143 | 23.090 | 1.314 | 0.016 | 0.000 | 3.744 | 4.477 | 0.405 | n/a | 0.043 | 3.695 | 0.100 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| d62c64b47eb831930000000000000142 | 36.433 | 2.077 | n/a | 0.000 | 0.948 | 0.479 | 0.731 | 0.007 | 0.000 | 0.204 | 31.552 | 0.413 | n/a | 0.022 | 3.024 | 0.083 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| d62c64b47eb8319300000000000000f3 | 34.823 | 2.731 | n/a | 1.396 | 1.413 | 1.288 | 3.550 | 0.011 | 0.000 | 0.052 | 20.845 | 3.514 | n/a | 0.022 | 5.540 | 0.159 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.395ms; driver.publication.readback 0.463ms; driver.publication.persist-deferred 0.081ms |
| d62c64b47eb8319300000000000001cb | 24.721 | 2.590 | n/a | 0.000 | 1.080 | 0.647 | 1.519 | 0.013 | 0.000 | 0.092 | 10.097 | 8.664 | n/a | 0.019 | 3.670 | 0.148 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000233 | 20.937 | 2.567 | n/a | 0.000 | 0.042 | 0.560 | 1.152 | 0.012 | 0.000 | 1.766 | 8.577 | 6.237 | n/a | 0.023 | 2.610 | 0.125 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000217 | 20.150 | 2.110 | n/a | 0.000 | 0.864 | 0.684 | 2.053 | 0.014 | 0.000 | 0.042 | 13.493 | 0.874 | n/a | 0.016 | 2.975 | 0.148 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| d62c64b47eb831930000000000000263 | 19.112 | 2.303 | n/a | 0.000 | 9.198 | 0.535 | 1.291 | 0.014 | 0.000 | 0.506 | 4.725 | 0.520 | n/a | 0.021 | 11.501 | 0.602 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.019ms |
| d62c64b47eb831930000000000000134 | 19.067 | 3.289 | n/a | 0.000 | 0.111 | 0.502 | 3.876 | 0.009 | 0.000 | 0.036 | 7.012 | 4.193 | n/a | 0.039 | 3.400 | 0.178 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000211 | 18.321 | 5.656 | n/a | 0.000 | 0.061 | 0.982 | 0.836 | 0.010 | 0.000 | 0.311 | 7.915 | 2.519 | n/a | 0.031 | 5.717 | 0.312 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000246 | 18.055 | 3.576 | n/a | 0.000 | 0.068 | 5.363 | 1.177 | 0.016 | 0.000 | 0.291 | 6.592 | 0.924 | n/a | 0.049 | 3.644 | 0.202 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000011e | 17.048 | 2.829 | n/a | 0.000 | 0.050 | 0.549 | 1.111 | 0.008 | 0.000 | 0.502 | 10.720 | 1.243 | n/a | 0.035 | 2.879 | 0.169 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000160 | 16.917 | 2.493 | n/a | 0.000 | 0.109 | 0.732 | 3.080 | 0.022 | 0.000 | 0.136 | 6.422 | 3.888 | n/a | 0.035 | 2.602 | 0.154 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000000f5 | 16.866 | 4.092 | n/a | 1.406 | 0.866 | 0.852 | 2.539 | 0.012 | 0.000 | 0.517 | 5.546 | 0.993 | n/a | 0.045 | 6.363 | 0.377 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.792ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.022ms |
| d62c64b47eb831930000000000000154 | 16.814 | 2.113 | n/a | 0.000 | 0.787 | 0.712 | 1.621 | 0.019 | 0.000 | 3.220 | 7.858 | 0.467 | n/a | 0.017 | 2.899 | 0.172 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| d62c64b47eb83193000000000000013e | 16.631 | 3.122 | n/a | 0.000 | 0.047 | 0.591 | 4.769 | 0.013 | 0.000 | 0.060 | 7.582 | 0.428 | n/a | 0.019 | 3.169 | 0.191 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000001f3 | 16.565 | 3.067 | n/a | 0.000 | 0.099 | 0.572 | 0.811 | 0.007 | 0.000 | 0.059 | 7.222 | 4.691 | n/a | 0.037 | 3.166 | 0.191 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000001d9 | 16.484 | 1.967 | n/a | 0.000 | 0.034 | 0.370 | 0.652 | 0.007 | 0.000 | 0.063 | 12.463 | 0.911 | n/a | 0.017 | 2.001 | 0.121 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000114 | 16.442 | 3.219 | n/a | 0.000 | 0.121 | 0.484 | 1.172 | 0.012 | 0.000 | 0.275 | 9.817 | 1.302 | n/a | 0.041 | 3.340 | 0.203 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000227 | 16.298 | 2.963 | n/a | 0.000 | 0.126 | 0.561 | 0.752 | 0.007 | 0.000 | 0.057 | 10.955 | 0.844 | n/a | 0.032 | 3.089 | 0.190 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |

## P2 / warmup / commit / 5-10 facts (201 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.632 | 0.668 | 0.000 | 0.512 | 2.377 | n/a | 0.000 | 0.052 | 0.543 | 1.094 | 0.012 | 0.000 | 0.129 | 4.725 | 0.499 | n/a | 0.023 | 2.587 | 0.250 | 0.023 |
| p99 | 36.433 | 3.009 | 0.036 | 2.147 | 4.521 | n/a | 1.396 | 2.098 | 4.049 | 4.560 | 0.026 | 0.000 | 3.220 | 15.290 | 5.603 | n/a | 0.056 | 6.363 | 0.426 | 0.056 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000000f1 | 39.667 | 6.718 | n/a | 1.500 | 3.706 | 0.557 | 3.936 | 0.016 | 0.000 | 2.906 | 15.290 | 4.902 | n/a | 0.137 | 11.923 | 0.301 | 0.137 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.010ms |
| d62c64b47eb831930000000000000262 | 36.785 | 3.552 | n/a | 0.000 | 0.143 | 23.090 | 1.314 | 0.016 | 0.000 | 3.744 | 4.477 | 0.405 | n/a | 0.043 | 3.695 | 0.100 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| d62c64b47eb831930000000000000142 | 36.433 | 2.077 | n/a | 0.000 | 0.948 | 0.479 | 0.731 | 0.007 | 0.000 | 0.204 | 31.552 | 0.413 | n/a | 0.022 | 3.024 | 0.083 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.038ms |
| d62c64b47eb8319300000000000000f3 | 34.823 | 2.731 | n/a | 1.396 | 1.413 | 1.288 | 3.550 | 0.011 | 0.000 | 0.052 | 20.845 | 3.514 | n/a | 0.022 | 5.540 | 0.159 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.395ms; driver.publication.readback 0.463ms; driver.publication.persist-deferred 0.081ms |
| d62c64b47eb8319300000000000001cb | 24.721 | 2.590 | n/a | 0.000 | 1.080 | 0.647 | 1.519 | 0.013 | 0.000 | 0.092 | 10.097 | 8.664 | n/a | 0.019 | 3.670 | 0.148 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000233 | 20.937 | 2.567 | n/a | 0.000 | 0.042 | 0.560 | 1.152 | 0.012 | 0.000 | 1.766 | 8.577 | 6.237 | n/a | 0.023 | 2.610 | 0.125 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000217 | 20.150 | 2.110 | n/a | 0.000 | 0.864 | 0.684 | 2.053 | 0.014 | 0.000 | 0.042 | 13.493 | 0.874 | n/a | 0.016 | 2.975 | 0.148 | 0.016 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.088ms |
| d62c64b47eb831930000000000000263 | 19.112 | 2.303 | n/a | 0.000 | 9.198 | 0.535 | 1.291 | 0.014 | 0.000 | 0.506 | 4.725 | 0.520 | n/a | 0.021 | 11.501 | 0.602 | 0.021 | node-14/thread-0/driver.queue.scheduler-late | driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.019ms |
| d62c64b47eb831930000000000000134 | 19.067 | 3.289 | n/a | 0.000 | 0.111 | 0.502 | 3.876 | 0.009 | 0.000 | 0.036 | 7.012 | 4.193 | n/a | 0.039 | 3.400 | 0.178 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000211 | 18.321 | 5.656 | n/a | 0.000 | 0.061 | 0.982 | 0.836 | 0.010 | 0.000 | 0.311 | 7.915 | 2.519 | n/a | 0.031 | 5.717 | 0.312 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000246 | 18.055 | 3.576 | n/a | 0.000 | 0.068 | 5.363 | 1.177 | 0.016 | 0.000 | 0.291 | 6.592 | 0.924 | n/a | 0.049 | 3.644 | 0.202 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000011e | 17.048 | 2.829 | n/a | 0.000 | 0.050 | 0.549 | 1.111 | 0.008 | 0.000 | 0.502 | 10.720 | 1.243 | n/a | 0.035 | 2.879 | 0.169 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000160 | 16.917 | 2.493 | n/a | 0.000 | 0.109 | 0.732 | 3.080 | 0.022 | 0.000 | 0.136 | 6.422 | 3.888 | n/a | 0.035 | 2.602 | 0.154 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000000f5 | 16.866 | 4.092 | n/a | 1.406 | 0.866 | 0.852 | 2.539 | 0.012 | 0.000 | 0.517 | 5.546 | 0.993 | n/a | 0.045 | 6.363 | 0.377 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.792ms; driver.publication.readback 0.104ms; driver.publication.persist-deferred 0.022ms |
| d62c64b47eb831930000000000000154 | 16.814 | 2.113 | n/a | 0.000 | 0.787 | 0.712 | 1.621 | 0.019 | 0.000 | 3.220 | 7.858 | 0.467 | n/a | 0.017 | 2.899 | 0.172 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.043ms |
| d62c64b47eb83193000000000000013e | 16.631 | 3.122 | n/a | 0.000 | 0.047 | 0.591 | 4.769 | 0.013 | 0.000 | 0.060 | 7.582 | 0.428 | n/a | 0.019 | 3.169 | 0.191 | 0.019 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000001f3 | 16.565 | 3.067 | n/a | 0.000 | 0.099 | 0.572 | 0.811 | 0.007 | 0.000 | 0.059 | 7.222 | 4.691 | n/a | 0.037 | 3.166 | 0.191 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000001d9 | 16.484 | 1.967 | n/a | 0.000 | 0.034 | 0.370 | 0.652 | 0.007 | 0.000 | 0.063 | 12.463 | 0.911 | n/a | 0.017 | 2.001 | 0.121 | 0.017 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000114 | 16.442 | 3.219 | n/a | 0.000 | 0.121 | 0.484 | 1.172 | 0.012 | 0.000 | 0.275 | 9.817 | 1.302 | n/a | 0.041 | 3.340 | 0.203 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000227 | 16.298 | 2.963 | n/a | 0.000 | 0.126 | 0.561 | 0.752 | 0.007 | 0.000 | 0.057 | 10.955 | 0.844 | n/a | 0.032 | 3.089 | 0.190 | 0.032 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.128ms |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.621 | 0.000 | 0.000 | 0.616 | 3.012 | n/a | 0.000 | 0.654 | 3.516 | 0.785 | 0.005 | 0.000 | 0.019 | 6.126 | 0.483 | n/a | 0.021 | 3.666 | 0.251 | 0.021 |
| p99 | 14.621 | 0.000 | 0.000 | 0.616 | 3.012 | n/a | 0.000 | 0.654 | 3.516 | 0.785 | 0.005 | 0.000 | 0.019 | 6.126 | 0.483 | n/a | 0.021 | 3.666 | 0.251 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb83193000000000000028b | 14.621 | 3.012 | n/a | 0.000 | 0.654 | 3.516 | 0.785 | 0.005 | 0.000 | 0.019 | 6.126 | 0.483 | n/a | 0.021 | 3.666 | 0.251 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.045ms |

## P2 / outside-phases / commit / 5-10 facts (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.621 | 0.000 | 0.000 | 0.616 | 3.012 | n/a | 0.000 | 0.654 | 3.516 | 0.785 | 0.005 | 0.000 | 0.019 | 6.126 | 0.483 | n/a | 0.021 | 3.666 | 0.251 | 0.021 |
| p99 | 14.621 | 0.000 | 0.000 | 0.616 | 3.012 | n/a | 0.000 | 0.654 | 3.516 | 0.785 | 0.005 | 0.000 | 0.019 | 6.126 | 0.483 | n/a | 0.021 | 3.666 | 0.251 | 0.021 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb83193000000000000028b | 14.621 | 3.012 | n/a | 0.000 | 0.654 | 3.516 | 0.785 | 0.005 | 0.000 | 0.019 | 6.126 | 0.483 | n/a | 0.021 | 3.666 | 0.251 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.164ms; driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.045ms |

## P2 / idle-10 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.708 | 0.748 | 0.000 | 0.489 | 2.175 | n/a | 0.000 | 0.039 | 0.572 | 0.924 | 0.012 | 0.000 | 0.160 | 4.634 | 0.449 | n/a | 0.017 | 2.270 | 0.234 | 0.017 |
| p99 | 18.392 | 2.996 | 0.063 | 1.033 | 3.471 | n/a | 0.000 | 2.340 | 3.309 | 4.613 | 0.034 | 0.000 | 3.035 | 10.326 | 2.932 | n/a | 0.073 | 5.000 | 0.432 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000002a2 | 19.337 | 2.760 | n/a | 0.000 | 0.647 | 0.657 | 4.419 | 0.034 | 0.000 | 0.094 | 10.255 | 0.450 | n/a | 0.021 | 3.406 | 0.176 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.190ms; driver.publication.persist-deferred 0.064ms |
| d62c64b47eb8319300000000000002f8 | 18.392 | 2.309 | n/a | 0.000 | 0.971 | 0.775 | 3.827 | 0.034 | 0.000 | 3.035 | 6.982 | 0.449 | n/a | 0.010 | 3.281 | 0.178 | 0.010 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.017ms |
| d62c64b47eb831930000000000000293 | 17.214 | 2.036 | n/a | 0.000 | 0.042 | 0.859 | 0.916 | 0.013 | 0.000 | 3.593 | 8.819 | 0.915 | n/a | 0.021 | 2.078 | 0.121 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.027ms |
| d62c64b47eb83193000000000000028d | 17.112 | 2.915 | n/a | 0.000 | 1.970 | 0.813 | 1.130 | 0.013 | 0.000 | 0.089 | 9.657 | 0.507 | n/a | 0.018 | 4.885 | 0.285 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.030ms |
| d62c64b47eb831930000000000000304 | 16.950 | 2.056 | n/a | 0.000 | 0.016 | 5.173 | 1.457 | 0.022 | 0.000 | 0.178 | 7.599 | 0.436 | n/a | 0.013 | 2.072 | 0.122 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.055ms |
| d62c64b47eb831930000000000000312 | 15.821 | 2.603 | n/a | 0.000 | 0.015 | 0.703 | 1.151 | 0.017 | 0.000 | 0.372 | 10.519 | 0.428 | n/a | 0.012 | 2.618 | 0.165 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.253ms |
| d62c64b47eb831930000000000000309 | 15.515 | 3.088 | n/a | 0.000 | 0.039 | 0.501 | 0.934 | 0.009 | 0.000 | 0.080 | 10.193 | 0.651 | n/a | 0.020 | 3.127 | 0.202 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.042ms |
| d62c64b47eb8319300000000000002b4 | 15.450 | 2.650 | n/a | 0.000 | 0.878 | 0.568 | 1.204 | 0.014 | 0.000 | 0.061 | 9.230 | 0.827 | n/a | 0.018 | 3.529 | 0.228 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.152ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.037ms |
| d62c64b47eb83193000000000000039f | 15.252 | 2.065 | n/a | 0.000 | 0.108 | 0.617 | 2.522 | 0.023 | 0.000 | 0.668 | 8.814 | 0.423 | n/a | 0.013 | 2.173 | 0.142 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms |
| d62c64b47eb8319300000000000002aa | 15.131 | 2.680 | n/a | 0.000 | 0.418 | 0.650 | 1.002 | 0.015 | 0.000 | 0.438 | 9.419 | 0.490 | n/a | 0.018 | 3.098 | 0.205 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.039ms |
| d62c64b47eb8319300000000000002e6 | 15.059 | 2.341 | n/a | 0.000 | 1.950 | 0.407 | 2.744 | 0.014 | 0.000 | 0.068 | 7.103 | 0.419 | n/a | 0.014 | 4.291 | 0.285 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000002d4 | 14.853 | 2.590 | n/a | 0.000 | 0.012 | 0.502 | 0.885 | 0.013 | 0.000 | 0.070 | 10.326 | 0.442 | n/a | 0.013 | 2.602 | 0.175 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms |
| d62c64b47eb83193000000000000035d | 14.825 | 2.896 | n/a | 0.000 | 0.407 | 0.552 | 0.968 | 0.010 | 0.000 | 0.073 | 9.030 | 0.814 | n/a | 0.074 | 3.303 | 0.223 | 0.074 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.199ms |
| d62c64b47eb8319300000000000002d8 | 14.684 | 2.890 | n/a | 0.000 | 1.503 | 0.818 | 1.020 | 0.014 | 0.000 | 0.307 | 7.606 | 0.511 | n/a | 0.016 | 4.393 | 0.299 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.037ms |
| d62c64b47eb8319300000000000003b3 | 14.662 | 1.614 | n/a | 0.000 | 0.014 | 1.253 | 0.971 | 0.014 | 0.000 | 0.318 | 9.329 | 1.137 | n/a | 0.011 | 1.628 | 0.111 | 0.011 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000385 | 14.574 | 1.828 | n/a | 0.000 | 0.019 | 2.084 | 1.368 | 0.022 | 0.000 | 0.085 | 8.335 | 0.823 | n/a | 0.011 | 1.847 | 0.127 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000029b | 14.530 | 3.469 | n/a | 0.000 | 0.091 | 0.533 | 0.763 | 0.009 | 0.000 | 0.077 | 8.491 | 1.064 | n/a | 0.034 | 3.560 | 0.245 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.033ms |
| d62c64b47eb831930000000000000299 | 14.519 | 2.463 | n/a | 0.000 | 0.037 | 0.947 | 1.272 | 0.021 | 0.000 | 0.151 | 9.030 | 0.578 | n/a | 0.019 | 2.500 | 0.172 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.647ms; driver.publication.readback 0.116ms |
| d62c64b47eb83193000000000000030b | 14.290 | 2.315 | n/a | 0.000 | 0.043 | 0.622 | 1.385 | 0.027 | 0.000 | 0.840 | 8.339 | 0.699 | n/a | 0.019 | 2.359 | 0.165 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.039ms |
| d62c64b47eb831930000000000000292 | 14.264 | 3.460 | n/a | 0.000 | 0.048 | 0.647 | 4.613 | 0.022 | 0.000 | 0.070 | 4.906 | 0.451 | n/a | 0.047 | 3.508 | 0.246 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-10 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.708 | 0.748 | 0.000 | 0.489 | 2.175 | n/a | 0.000 | 0.039 | 0.572 | 0.924 | 0.012 | 0.000 | 0.160 | 4.634 | 0.449 | n/a | 0.017 | 2.270 | 0.234 | 0.017 |
| p99 | 18.392 | 2.996 | 0.063 | 1.033 | 3.471 | n/a | 0.000 | 2.340 | 3.309 | 4.613 | 0.034 | 0.000 | 3.035 | 10.326 | 2.932 | n/a | 0.073 | 5.000 | 0.432 | 0.073 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000002a2 | 19.337 | 2.760 | n/a | 0.000 | 0.647 | 0.657 | 4.419 | 0.034 | 0.000 | 0.094 | 10.255 | 0.450 | n/a | 0.021 | 3.406 | 0.176 | 0.021 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.190ms; driver.publication.persist-deferred 0.064ms |
| d62c64b47eb8319300000000000002f8 | 18.392 | 2.309 | n/a | 0.000 | 0.971 | 0.775 | 3.827 | 0.034 | 0.000 | 3.035 | 6.982 | 0.449 | n/a | 0.010 | 3.281 | 0.178 | 0.010 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.017ms |
| d62c64b47eb831930000000000000293 | 17.214 | 2.036 | n/a | 0.000 | 0.042 | 0.859 | 0.916 | 0.013 | 0.000 | 3.593 | 8.819 | 0.915 | n/a | 0.021 | 2.078 | 0.121 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.027ms |
| d62c64b47eb83193000000000000028d | 17.112 | 2.915 | n/a | 0.000 | 1.970 | 0.813 | 1.130 | 0.013 | 0.000 | 0.089 | 9.657 | 0.507 | n/a | 0.018 | 4.885 | 0.285 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.047ms; driver.publication.persist-deferred 0.030ms |
| d62c64b47eb831930000000000000304 | 16.950 | 2.056 | n/a | 0.000 | 0.016 | 5.173 | 1.457 | 0.022 | 0.000 | 0.178 | 7.599 | 0.436 | n/a | 0.013 | 2.072 | 0.122 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.098ms; driver.publication.readback 0.055ms |
| d62c64b47eb831930000000000000312 | 15.821 | 2.603 | n/a | 0.000 | 0.015 | 0.703 | 1.151 | 0.017 | 0.000 | 0.372 | 10.519 | 0.428 | n/a | 0.012 | 2.618 | 0.165 | 0.012 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.253ms |
| d62c64b47eb831930000000000000309 | 15.515 | 3.088 | n/a | 0.000 | 0.039 | 0.501 | 0.934 | 0.009 | 0.000 | 0.080 | 10.193 | 0.651 | n/a | 0.020 | 3.127 | 0.202 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.068ms; driver.publication.persist-deferred 0.042ms |
| d62c64b47eb8319300000000000002b4 | 15.450 | 2.650 | n/a | 0.000 | 0.878 | 0.568 | 1.204 | 0.014 | 0.000 | 0.061 | 9.230 | 0.827 | n/a | 0.018 | 3.529 | 0.228 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.152ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.037ms |
| d62c64b47eb83193000000000000039f | 15.252 | 2.065 | n/a | 0.000 | 0.108 | 0.617 | 2.522 | 0.023 | 0.000 | 0.668 | 8.814 | 0.423 | n/a | 0.013 | 2.173 | 0.142 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.070ms |
| d62c64b47eb8319300000000000002aa | 15.131 | 2.680 | n/a | 0.000 | 0.418 | 0.650 | 1.002 | 0.015 | 0.000 | 0.438 | 9.419 | 0.490 | n/a | 0.018 | 3.098 | 0.205 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.106ms; driver.publication.persist-deferred 0.039ms |
| d62c64b47eb8319300000000000002e6 | 15.059 | 2.341 | n/a | 0.000 | 1.950 | 0.407 | 2.744 | 0.014 | 0.000 | 0.068 | 7.103 | 0.419 | n/a | 0.014 | 4.291 | 0.285 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000002d4 | 14.853 | 2.590 | n/a | 0.000 | 0.012 | 0.502 | 0.885 | 0.013 | 0.000 | 0.070 | 10.326 | 0.442 | n/a | 0.013 | 2.602 | 0.175 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.041ms |
| d62c64b47eb83193000000000000035d | 14.825 | 2.896 | n/a | 0.000 | 0.407 | 0.552 | 0.968 | 0.010 | 0.000 | 0.073 | 9.030 | 0.814 | n/a | 0.074 | 3.303 | 0.223 | 0.074 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.199ms |
| d62c64b47eb8319300000000000002d8 | 14.684 | 2.890 | n/a | 0.000 | 1.503 | 0.818 | 1.020 | 0.014 | 0.000 | 0.307 | 7.606 | 0.511 | n/a | 0.016 | 4.393 | 0.299 | 0.016 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.037ms |
| d62c64b47eb8319300000000000003b3 | 14.662 | 1.614 | n/a | 0.000 | 0.014 | 1.253 | 0.971 | 0.014 | 0.000 | 0.318 | 9.329 | 1.137 | n/a | 0.011 | 1.628 | 0.111 | 0.011 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000385 | 14.574 | 1.828 | n/a | 0.000 | 0.019 | 2.084 | 1.368 | 0.022 | 0.000 | 0.085 | 8.335 | 0.823 | n/a | 0.011 | 1.847 | 0.127 | 0.011 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000029b | 14.530 | 3.469 | n/a | 0.000 | 0.091 | 0.533 | 0.763 | 0.009 | 0.000 | 0.077 | 8.491 | 1.064 | n/a | 0.034 | 3.560 | 0.245 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.033ms |
| d62c64b47eb831930000000000000299 | 14.519 | 2.463 | n/a | 0.000 | 0.037 | 0.947 | 1.272 | 0.021 | 0.000 | 0.151 | 9.030 | 0.578 | n/a | 0.019 | 2.500 | 0.172 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.647ms; driver.publication.readback 0.116ms |
| d62c64b47eb83193000000000000030b | 14.290 | 2.315 | n/a | 0.000 | 0.043 | 0.622 | 1.385 | 0.027 | 0.000 | 0.840 | 8.339 | 0.699 | n/a | 0.019 | 2.359 | 0.165 | 0.019 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.048ms; driver.publication.persist-deferred 0.039ms |
| d62c64b47eb831930000000000000292 | 14.264 | 3.460 | n/a | 0.000 | 0.048 | 0.647 | 4.613 | 0.022 | 0.000 | 0.070 | 4.906 | 0.451 | n/a | 0.047 | 3.508 | 0.246 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.432 | 1.000 | 0.000 | 0.503 | 2.033 | n/a | 0.000 | 0.041 | 0.505 | 0.881 | 0.011 | 0.000 | 0.093 | 3.735 | 0.430 | n/a | 0.021 | 2.201 | 0.258 | 0.021 |
| p99 | 38.491 | 2.998 | 0.042 | 1.043 | 4.508 | n/a | 0.000 | 1.582 | 2.072 | 3.929 | 0.046 | 0.000 | 1.747 | 34.117 | 1.184 | n/a | 0.048 | 4.830 | 0.446 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000448 | 53.902 | 2.183 | n/a | 0.000 | 0.035 | 1.889 | 1.346 | 0.029 | 0.000 | 0.453 | 47.587 | 0.359 | n/a | 0.021 | 2.218 | 0.041 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000449 | 38.491 | 1.994 | n/a | 0.000 | 0.060 | 0.506 | 1.115 | 0.011 | 0.000 | 0.093 | 34.117 | 0.557 | n/a | 0.038 | 2.054 | 0.053 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.033ms |
| d62c64b47eb831930000000000000456 | 21.664 | 1.834 | n/a | 0.000 | 0.024 | 0.564 | 1.367 | 0.020 | 0.000 | 0.188 | 16.845 | 0.810 | n/a | 0.013 | 1.858 | 0.086 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000454 | 20.602 | 2.649 | n/a | 0.000 | 0.567 | 0.342 | 0.646 | 0.006 | 0.000 | 0.192 | 15.687 | 0.500 | n/a | 0.014 | 3.216 | 0.156 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| d62c64b47eb8319300000000000003c8 | 19.376 | 3.281 | n/a | 0.000 | 0.060 | 0.636 | 3.786 | 0.018 | 7.316 | 0.058 | 3.749 | 0.430 | n/a | 0.042 | 3.341 | 0.172 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d62c64b47eb831930000000000000480 | 18.948 | 2.342 | n/a | 0.000 | 0.031 | 1.329 | 3.929 | 0.005 | 0.000 | 0.153 | 10.331 | 0.811 | n/a | 0.016 | 2.373 | 0.125 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003dc | 18.702 | 3.477 | n/a | 0.000 | 0.064 | 0.997 | 0.990 | 0.012 | 0.000 | 0.048 | 12.557 | 0.513 | n/a | 0.045 | 3.541 | 0.189 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000044a | 18.051 | 3.181 | n/a | 0.000 | 0.108 | 3.157 | 1.332 | 0.022 | 0.000 | 0.198 | 9.615 | 0.398 | n/a | 0.040 | 3.289 | 0.182 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.105ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.017ms |
| d62c64b47eb8319300000000000004de | 17.227 | 2.789 | n/a | 0.000 | 0.088 | 0.611 | 1.276 | 0.026 | 0.000 | 1.142 | 10.510 | 0.750 | n/a | 0.035 | 2.877 | 0.167 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| d62c64b47eb8319300000000000003da | 15.765 | 5.561 | n/a | 0.000 | 0.118 | 1.558 | 1.220 | 0.017 | 0.000 | 0.165 | 6.558 | 0.525 | n/a | 0.043 | 5.679 | 0.360 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000041f | 14.985 | 2.426 | n/a | 0.000 | 0.028 | 0.535 | 1.202 | 0.013 | 0.000 | 1.747 | 8.220 | 0.800 | n/a | 0.014 | 2.454 | 0.164 | 0.014 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000045a | 13.792 | 2.775 | n/a | 0.000 | 0.086 | 0.621 | 0.950 | 0.012 | 0.000 | 0.104 | 8.400 | 0.815 | n/a | 0.029 | 2.861 | 0.207 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000497 | 13.513 | 2.591 | n/a | 0.000 | 0.066 | 0.764 | 1.875 | 0.006 | 0.000 | 0.031 | 7.717 | 0.416 | n/a | 0.046 | 2.657 | 0.197 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000450 | 12.598 | 1.942 | n/a | 0.000 | 0.043 | 0.633 | 4.190 | 0.017 | 0.000 | 0.063 | 5.256 | 0.430 | n/a | 0.022 | 1.985 | 0.158 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003d6 | 12.542 | 1.772 | n/a | 0.000 | 0.031 | 0.420 | 0.823 | 0.010 | 0.000 | 0.363 | 7.934 | 1.172 | n/a | 0.017 | 1.803 | 0.144 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003f5 | 12.307 | 1.798 | n/a | 0.000 | 0.035 | 0.643 | 1.421 | 0.018 | 0.000 | 0.084 | 7.561 | 0.728 | n/a | 0.020 | 1.833 | 0.149 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000004b3 | 11.887 | 3.965 | n/a | 0.000 | 0.865 | 0.886 | 0.903 | 0.013 | 0.000 | 0.563 | 4.267 | 0.407 | n/a | 0.019 | 4.830 | 0.406 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000409 | 11.744 | 2.283 | n/a | 0.000 | 0.025 | 0.536 | 0.558 | 0.004 | 0.000 | 0.016 | 7.466 | 0.838 | n/a | 0.017 | 2.309 | 0.197 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003d8 | 11.587 | 2.060 | n/a | 0.000 | 0.064 | 0.618 | 1.091 | 0.013 | 0.000 | 0.087 | 6.716 | 0.905 | n/a | 0.033 | 2.124 | 0.183 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000045e | 11.535 | 1.801 | n/a | 0.000 | 0.045 | 0.389 | 0.764 | 0.010 | 0.000 | 0.259 | 7.415 | 0.832 | n/a | 0.021 | 1.846 | 0.160 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-25 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.432 | 1.000 | 0.000 | 0.503 | 2.033 | n/a | 0.000 | 0.041 | 0.505 | 0.881 | 0.011 | 0.000 | 0.093 | 3.735 | 0.430 | n/a | 0.021 | 2.201 | 0.258 | 0.021 |
| p99 | 38.491 | 2.998 | 0.042 | 1.043 | 4.508 | n/a | 0.000 | 1.582 | 2.072 | 3.929 | 0.046 | 0.000 | 1.747 | 34.117 | 1.184 | n/a | 0.048 | 4.830 | 0.446 | 0.048 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000448 | 53.902 | 2.183 | n/a | 0.000 | 0.035 | 1.889 | 1.346 | 0.029 | 0.000 | 0.453 | 47.587 | 0.359 | n/a | 0.021 | 2.218 | 0.041 | 0.021 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000449 | 38.491 | 1.994 | n/a | 0.000 | 0.060 | 0.506 | 1.115 | 0.011 | 0.000 | 0.093 | 34.117 | 0.557 | n/a | 0.038 | 2.054 | 0.053 | 0.038 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.033ms |
| d62c64b47eb831930000000000000456 | 21.664 | 1.834 | n/a | 0.000 | 0.024 | 0.564 | 1.367 | 0.020 | 0.000 | 0.188 | 16.845 | 0.810 | n/a | 0.013 | 1.858 | 0.086 | 0.013 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000454 | 20.602 | 2.649 | n/a | 0.000 | 0.567 | 0.342 | 0.646 | 0.006 | 0.000 | 0.192 | 15.687 | 0.500 | n/a | 0.014 | 3.216 | 0.156 | 0.014 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.057ms |
| d62c64b47eb8319300000000000003c8 | 19.376 | 3.281 | n/a | 0.000 | 0.060 | 0.636 | 3.786 | 0.018 | 7.316 | 0.058 | 3.749 | 0.430 | n/a | 0.042 | 3.341 | 0.172 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d62c64b47eb831930000000000000480 | 18.948 | 2.342 | n/a | 0.000 | 0.031 | 1.329 | 3.929 | 0.005 | 0.000 | 0.153 | 10.331 | 0.811 | n/a | 0.016 | 2.373 | 0.125 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003dc | 18.702 | 3.477 | n/a | 0.000 | 0.064 | 0.997 | 0.990 | 0.012 | 0.000 | 0.048 | 12.557 | 0.513 | n/a | 0.045 | 3.541 | 0.189 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000044a | 18.051 | 3.181 | n/a | 0.000 | 0.108 | 3.157 | 1.332 | 0.022 | 0.000 | 0.198 | 9.615 | 0.398 | n/a | 0.040 | 3.289 | 0.182 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.113ms; driver.publication.readback 0.105ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.033ms; driver.publication.persist-deferred 0.017ms |
| d62c64b47eb8319300000000000004de | 17.227 | 2.789 | n/a | 0.000 | 0.088 | 0.611 | 1.276 | 0.026 | 0.000 | 1.142 | 10.510 | 0.750 | n/a | 0.035 | 2.877 | 0.167 | 0.035 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.062ms |
| d62c64b47eb8319300000000000003da | 15.765 | 5.561 | n/a | 0.000 | 0.118 | 1.558 | 1.220 | 0.017 | 0.000 | 0.165 | 6.558 | 0.525 | n/a | 0.043 | 5.679 | 0.360 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000041f | 14.985 | 2.426 | n/a | 0.000 | 0.028 | 0.535 | 1.202 | 0.013 | 0.000 | 1.747 | 8.220 | 0.800 | n/a | 0.014 | 2.454 | 0.164 | 0.014 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000045a | 13.792 | 2.775 | n/a | 0.000 | 0.086 | 0.621 | 0.950 | 0.012 | 0.000 | 0.104 | 8.400 | 0.815 | n/a | 0.029 | 2.861 | 0.207 | 0.029 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000497 | 13.513 | 2.591 | n/a | 0.000 | 0.066 | 0.764 | 1.875 | 0.006 | 0.000 | 0.031 | 7.717 | 0.416 | n/a | 0.046 | 2.657 | 0.197 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000450 | 12.598 | 1.942 | n/a | 0.000 | 0.043 | 0.633 | 4.190 | 0.017 | 0.000 | 0.063 | 5.256 | 0.430 | n/a | 0.022 | 1.985 | 0.158 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003d6 | 12.542 | 1.772 | n/a | 0.000 | 0.031 | 0.420 | 0.823 | 0.010 | 0.000 | 0.363 | 7.934 | 1.172 | n/a | 0.017 | 1.803 | 0.144 | 0.017 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003f5 | 12.307 | 1.798 | n/a | 0.000 | 0.035 | 0.643 | 1.421 | 0.018 | 0.000 | 0.084 | 7.561 | 0.728 | n/a | 0.020 | 1.833 | 0.149 | 0.020 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000004b3 | 11.887 | 3.965 | n/a | 0.000 | 0.865 | 0.886 | 0.903 | 0.013 | 0.000 | 0.563 | 4.267 | 0.407 | n/a | 0.019 | 4.830 | 0.406 | 0.019 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000409 | 11.744 | 2.283 | n/a | 0.000 | 0.025 | 0.536 | 0.558 | 0.004 | 0.000 | 0.016 | 7.466 | 0.838 | n/a | 0.017 | 2.309 | 0.197 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000003d8 | 11.587 | 2.060 | n/a | 0.000 | 0.064 | 0.618 | 1.091 | 0.013 | 0.000 | 0.087 | 6.716 | 0.905 | n/a | 0.033 | 2.124 | 0.183 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000045e | 11.535 | 1.801 | n/a | 0.000 | 0.045 | 0.389 | 0.764 | 0.010 | 0.000 | 0.259 | 7.415 | 0.832 | n/a | 0.021 | 1.846 | 0.160 | 0.021 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.784 | 0.971 | 0.000 | 0.479 | 1.909 | n/a | 0.000 | 0.041 | 0.477 | 0.774 | 0.010 | 0.000 | 0.080 | 3.250 | 0.412 | n/a | 0.023 | 1.954 | 0.274 | 0.023 |
| p99 | 16.416 | 3.003 | 0.041 | 1.020 | 3.683 | n/a | 0.000 | 1.802 | 2.426 | 4.769 | 0.024 | 0.000 | 3.266 | 11.701 | 0.937 | n/a | 0.050 | 5.204 | 0.459 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000526 | 20.403 | 2.376 | n/a | 0.000 | 0.039 | 0.561 | 1.146 | 0.013 | 0.000 | 2.265 | 13.153 | 0.828 | n/a | 0.022 | 2.415 | 0.118 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms |
| d62c64b47eb83193000000000000054b | 16.416 | 2.721 | n/a | 0.000 | 0.091 | 0.454 | 0.940 | 0.008 | 0.000 | 0.033 | 11.701 | 0.432 | n/a | 0.035 | 2.812 | 0.171 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000501 | 14.717 | 2.326 | n/a | 0.000 | 0.036 | 0.646 | 1.876 | 0.023 | 0.000 | 0.479 | 8.902 | 0.408 | n/a | 0.022 | 2.363 | 0.161 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000618 | 14.494 | 1.780 | n/a | 0.000 | 0.040 | 0.551 | 1.147 | 0.017 | 0.000 | 0.052 | 10.469 | 0.416 | n/a | 0.022 | 1.820 | 0.126 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000532 | 13.651 | 4.067 | n/a | 0.000 | 0.126 | 1.081 | 1.015 | 0.014 | 0.000 | 0.314 | 6.051 | 0.937 | n/a | 0.045 | 4.193 | 0.307 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000051e | 12.968 | 1.657 | n/a | 0.000 | 0.036 | 1.345 | 1.235 | 0.017 | 0.000 | 0.069 | 8.179 | 0.409 | n/a | 0.020 | 1.692 | 0.131 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000051a | 12.763 | 2.228 | n/a | 0.000 | 0.038 | 0.695 | 1.295 | 0.017 | 0.000 | 0.080 | 7.970 | 0.417 | n/a | 0.023 | 2.266 | 0.178 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005ed | 12.745 | 3.446 | n/a | 0.000 | 0.086 | 1.649 | 1.403 | 0.020 | 0.000 | 0.145 | 5.526 | 0.434 | n/a | 0.036 | 3.532 | 0.277 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005d9 | 12.670 | 1.834 | n/a | 0.000 | 0.065 | 1.512 | 1.775 | 0.031 | 0.000 | 0.138 | 6.417 | 0.856 | n/a | 0.041 | 1.899 | 0.150 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005ab | 12.203 | 1.898 | n/a | 0.000 | 0.038 | 0.465 | 1.218 | 0.015 | 0.000 | 0.074 | 8.025 | 0.448 | n/a | 0.022 | 1.936 | 0.159 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000545 | 12.143 | 2.931 | n/a | 0.000 | 0.101 | 2.426 | 0.618 | 0.005 | 0.000 | 0.281 | 4.966 | 0.772 | n/a | 0.042 | 3.031 | 0.250 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005c0 | 11.845 | 2.972 | n/a | 0.000 | 0.108 | 0.502 | 0.643 | 0.010 | 0.000 | 3.946 | 3.236 | 0.393 | n/a | 0.035 | 3.080 | 0.260 | 0.035 | gw-w/thread-48/d/transact-async | none observed |
| d62c64b47eb83193000000000000054f | 11.840 | 2.769 | n/a | 0.000 | 0.106 | 0.541 | 1.015 | 0.014 | 0.000 | 0.260 | 6.668 | 0.430 | n/a | 0.037 | 2.875 | 0.243 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000539 | 11.653 | 3.651 | n/a | 0.000 | 1.553 | 0.638 | 0.757 | 0.010 | 0.000 | 0.268 | 4.333 | 0.422 | n/a | 0.022 | 5.204 | 0.447 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000549 | 11.375 | 1.890 | n/a | 0.000 | 0.051 | 0.496 | 1.157 | 0.013 | 0.000 | 0.529 | 6.797 | 0.406 | n/a | 0.036 | 1.941 | 0.171 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000562 | 11.357 | 3.081 | n/a | 0.000 | 1.802 | 0.570 | 1.240 | 0.019 | 0.000 | 0.078 | 4.133 | 0.406 | n/a | 0.029 | 4.883 | 0.430 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000597 | 11.351 | 3.026 | n/a | 0.000 | 0.100 | 1.740 | 0.846 | 0.011 | 0.000 | 0.211 | 4.536 | 0.841 | n/a | 0.040 | 3.126 | 0.275 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000004ff | 11.323 | 1.751 | n/a | 0.000 | 0.038 | 0.443 | 2.386 | 0.023 | 0.000 | 0.076 | 6.185 | 0.397 | n/a | 0.023 | 1.789 | 0.158 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000593 | 11.276 | 2.376 | n/a | 0.000 | 0.040 | 0.584 | 4.789 | 0.015 | 0.000 | 0.050 | 3.074 | 0.326 | n/a | 0.023 | 2.416 | 0.214 | 0.023 | gw-w/thread-53/storage/commit! | none observed |
| d62c64b47eb83193000000000000053f | 11.266 | 2.283 | n/a | 0.000 | 0.037 | 0.530 | 1.197 | 0.015 | 0.000 | 0.405 | 6.371 | 0.406 | n/a | 0.023 | 2.320 | 0.206 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-50 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 7.784 | 0.971 | 0.000 | 0.479 | 1.909 | n/a | 0.000 | 0.041 | 0.477 | 0.774 | 0.010 | 0.000 | 0.080 | 3.250 | 0.412 | n/a | 0.023 | 1.954 | 0.274 | 0.023 |
| p99 | 16.416 | 3.003 | 0.041 | 1.020 | 3.683 | n/a | 0.000 | 1.802 | 2.426 | 4.769 | 0.024 | 0.000 | 3.266 | 11.701 | 0.937 | n/a | 0.050 | 5.204 | 0.459 | 0.050 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000526 | 20.403 | 2.376 | n/a | 0.000 | 0.039 | 0.561 | 1.146 | 0.013 | 0.000 | 2.265 | 13.153 | 0.828 | n/a | 0.022 | 2.415 | 0.118 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.085ms |
| d62c64b47eb83193000000000000054b | 16.416 | 2.721 | n/a | 0.000 | 0.091 | 0.454 | 0.940 | 0.008 | 0.000 | 0.033 | 11.701 | 0.432 | n/a | 0.035 | 2.812 | 0.171 | 0.035 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000501 | 14.717 | 2.326 | n/a | 0.000 | 0.036 | 0.646 | 1.876 | 0.023 | 0.000 | 0.479 | 8.902 | 0.408 | n/a | 0.022 | 2.363 | 0.161 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000618 | 14.494 | 1.780 | n/a | 0.000 | 0.040 | 0.551 | 1.147 | 0.017 | 0.000 | 0.052 | 10.469 | 0.416 | n/a | 0.022 | 1.820 | 0.126 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000532 | 13.651 | 4.067 | n/a | 0.000 | 0.126 | 1.081 | 1.015 | 0.014 | 0.000 | 0.314 | 6.051 | 0.937 | n/a | 0.045 | 4.193 | 0.307 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000051e | 12.968 | 1.657 | n/a | 0.000 | 0.036 | 1.345 | 1.235 | 0.017 | 0.000 | 0.069 | 8.179 | 0.409 | n/a | 0.020 | 1.692 | 0.131 | 0.020 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000051a | 12.763 | 2.228 | n/a | 0.000 | 0.038 | 0.695 | 1.295 | 0.017 | 0.000 | 0.080 | 7.970 | 0.417 | n/a | 0.023 | 2.266 | 0.178 | 0.023 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005ed | 12.745 | 3.446 | n/a | 0.000 | 0.086 | 1.649 | 1.403 | 0.020 | 0.000 | 0.145 | 5.526 | 0.434 | n/a | 0.036 | 3.532 | 0.277 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005d9 | 12.670 | 1.834 | n/a | 0.000 | 0.065 | 1.512 | 1.775 | 0.031 | 0.000 | 0.138 | 6.417 | 0.856 | n/a | 0.041 | 1.899 | 0.150 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005ab | 12.203 | 1.898 | n/a | 0.000 | 0.038 | 0.465 | 1.218 | 0.015 | 0.000 | 0.074 | 8.025 | 0.448 | n/a | 0.022 | 1.936 | 0.159 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000545 | 12.143 | 2.931 | n/a | 0.000 | 0.101 | 2.426 | 0.618 | 0.005 | 0.000 | 0.281 | 4.966 | 0.772 | n/a | 0.042 | 3.031 | 0.250 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000005c0 | 11.845 | 2.972 | n/a | 0.000 | 0.108 | 0.502 | 0.643 | 0.010 | 0.000 | 3.946 | 3.236 | 0.393 | n/a | 0.035 | 3.080 | 0.260 | 0.035 | gw-w/thread-48/d/transact-async | none observed |
| d62c64b47eb83193000000000000054f | 11.840 | 2.769 | n/a | 0.000 | 0.106 | 0.541 | 1.015 | 0.014 | 0.000 | 0.260 | 6.668 | 0.430 | n/a | 0.037 | 2.875 | 0.243 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000539 | 11.653 | 3.651 | n/a | 0.000 | 1.553 | 0.638 | 0.757 | 0.010 | 0.000 | 0.268 | 4.333 | 0.422 | n/a | 0.022 | 5.204 | 0.447 | 0.022 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000549 | 11.375 | 1.890 | n/a | 0.000 | 0.051 | 0.496 | 1.157 | 0.013 | 0.000 | 0.529 | 6.797 | 0.406 | n/a | 0.036 | 1.941 | 0.171 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000562 | 11.357 | 3.081 | n/a | 0.000 | 1.802 | 0.570 | 1.240 | 0.019 | 0.000 | 0.078 | 4.133 | 0.406 | n/a | 0.029 | 4.883 | 0.430 | 0.029 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000597 | 11.351 | 3.026 | n/a | 0.000 | 0.100 | 1.740 | 0.846 | 0.011 | 0.000 | 0.211 | 4.536 | 0.841 | n/a | 0.040 | 3.126 | 0.275 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000004ff | 11.323 | 1.751 | n/a | 0.000 | 0.038 | 0.443 | 2.386 | 0.023 | 0.000 | 0.076 | 6.185 | 0.397 | n/a | 0.023 | 1.789 | 0.158 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000593 | 11.276 | 2.376 | n/a | 0.000 | 0.040 | 0.584 | 4.789 | 0.015 | 0.000 | 0.050 | 3.074 | 0.326 | n/a | 0.023 | 2.416 | 0.214 | 0.023 | gw-w/thread-53/storage/commit! | none observed |
| d62c64b47eb83193000000000000053f | 11.266 | 2.283 | n/a | 0.000 | 0.037 | 0.530 | 1.197 | 0.015 | 0.000 | 0.405 | 6.371 | 0.406 | n/a | 0.023 | 2.320 | 0.206 | 0.023 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.106 | 0.939 | 0.000 | 0.491 | 2.101 | n/a | 0.000 | 0.041 | 0.450 | 0.773 | 0.009 | 0.000 | 0.057 | 3.496 | 0.417 | n/a | 0.024 | 2.214 | 0.280 | 0.024 |
| p99 | 19.428 | 3.106 | 0.035 | 0.999 | 3.943 | n/a | 0.000 | 2.010 | 1.310 | 4.584 | 0.024 | 0.000 | 2.384 | 11.047 | 1.106 | n/a | 0.054 | 5.566 | 0.512 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000634 | 37.625 | 2.700 | n/a | 0.000 | 0.108 | 0.675 | 0.835 | 0.013 | 0.000 | 3.676 | 29.157 | 0.422 | n/a | 0.040 | 2.807 | 0.075 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000067c | 19.428 | 2.485 | n/a | 0.000 | 0.038 | 0.460 | 3.913 | 0.011 | 8.501 | 0.042 | 3.530 | 0.426 | n/a | 0.023 | 2.523 | 0.130 | 0.023 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d62c64b47eb831930000000000000695 | 17.770 | 2.583 | n/a | 0.000 | 0.053 | 0.541 | 4.547 | 0.013 | 0.000 | 0.047 | 9.036 | 0.914 | n/a | 0.037 | 2.636 | 0.148 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000693 | 15.211 | 2.392 | n/a | 0.000 | 0.036 | 0.521 | 0.714 | 0.011 | 0.000 | 0.063 | 11.047 | 0.403 | n/a | 0.024 | 2.428 | 0.160 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006ec | 15.057 | 1.609 | n/a | 0.000 | 0.030 | 0.453 | 4.584 | 0.022 | 0.000 | 0.060 | 7.871 | 0.408 | n/a | 0.019 | 1.639 | 0.109 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000643 | 14.933 | 3.323 | n/a | 0.000 | 1.585 | 0.495 | 0.910 | 0.007 | 0.000 | 0.032 | 7.778 | 0.775 | n/a | 0.028 | 4.908 | 0.329 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000065a | 14.841 | 3.227 | n/a | 0.000 | 0.123 | 1.249 | 1.314 | 0.019 | 0.000 | 0.043 | 8.008 | 0.813 | n/a | 0.047 | 3.350 | 0.226 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006aa | 14.307 | 1.782 | n/a | 0.000 | 0.091 | 0.295 | 0.613 | 0.006 | 0.000 | 0.039 | 10.655 | 0.793 | n/a | 0.034 | 1.872 | 0.131 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000742 | 13.557 | 3.607 | n/a | 0.000 | 0.106 | 0.758 | 1.314 | 0.024 | 0.000 | 0.082 | 6.743 | 0.883 | n/a | 0.040 | 3.714 | 0.274 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000647 | 13.426 | 2.343 | n/a | 0.000 | 0.030 | 4.181 | 1.303 | 0.018 | 0.000 | 0.044 | 4.587 | 0.897 | n/a | 0.023 | 2.373 | 0.177 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000064b | 13.202 | 1.770 | n/a | 0.000 | 0.037 | 0.274 | 5.759 | 0.009 | 0.000 | 0.043 | 4.492 | 0.795 | n/a | 0.022 | 1.807 | 0.137 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006d4 | 12.985 | 2.546 | n/a | 0.000 | 0.082 | 0.563 | 4.237 | 0.012 | 0.000 | 0.042 | 4.670 | 0.807 | n/a | 0.025 | 2.627 | 0.202 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000630 | 12.715 | 2.019 | n/a | 0.000 | 0.105 | 0.661 | 1.392 | 0.022 | 0.000 | 1.085 | 6.605 | 0.787 | n/a | 0.040 | 2.124 | 0.167 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000656 | 12.347 | 1.820 | n/a | 0.000 | 0.045 | 0.472 | 0.805 | 0.012 | 0.000 | 0.056 | 8.322 | 0.791 | n/a | 0.023 | 1.865 | 0.151 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006f2 | 12.298 | 4.432 | n/a | 0.000 | 2.010 | 0.452 | 1.058 | 0.013 | 0.000 | 0.071 | 3.817 | 0.414 | n/a | 0.031 | 6.442 | 0.524 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000710 | 12.018 | 2.687 | n/a | 0.000 | 1.489 | 0.496 | 0.682 | 0.010 | 0.000 | 0.042 | 5.655 | 0.939 | n/a | 0.018 | 4.176 | 0.347 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000684 | 11.854 | 1.751 | n/a | 0.000 | 0.040 | 1.310 | 1.228 | 0.022 | 0.000 | 0.079 | 6.578 | 0.827 | n/a | 0.021 | 1.791 | 0.151 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000716 | 11.846 | 2.310 | n/a | 0.000 | 0.036 | 0.562 | 1.180 | 0.021 | 0.000 | 0.074 | 3.947 | 3.694 | n/a | 0.024 | 2.345 | 0.198 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006c3 | 11.755 | 2.981 | n/a | 0.000 | 0.126 | 0.537 | 0.865 | 0.008 | 0.000 | 0.039 | 6.325 | 0.834 | n/a | 0.040 | 3.107 | 0.264 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000066f | 11.587 | 2.860 | n/a | 0.000 | 0.113 | 0.953 | 0.890 | 0.005 | 0.000 | 0.010 | 5.937 | 0.777 | n/a | 0.040 | 2.974 | 0.257 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-100 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.106 | 0.939 | 0.000 | 0.491 | 2.101 | n/a | 0.000 | 0.041 | 0.450 | 0.773 | 0.009 | 0.000 | 0.057 | 3.496 | 0.417 | n/a | 0.024 | 2.214 | 0.280 | 0.024 |
| p99 | 19.428 | 3.106 | 0.035 | 0.999 | 3.943 | n/a | 0.000 | 2.010 | 1.310 | 4.584 | 0.024 | 0.000 | 2.384 | 11.047 | 1.106 | n/a | 0.054 | 5.566 | 0.512 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000634 | 37.625 | 2.700 | n/a | 0.000 | 0.108 | 0.675 | 0.835 | 0.013 | 0.000 | 3.676 | 29.157 | 0.422 | n/a | 0.040 | 2.807 | 0.075 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000067c | 19.428 | 2.485 | n/a | 0.000 | 0.038 | 0.460 | 3.913 | 0.011 | 8.501 | 0.042 | 3.530 | 0.426 | n/a | 0.023 | 2.523 | 0.130 | 0.023 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d62c64b47eb831930000000000000695 | 17.770 | 2.583 | n/a | 0.000 | 0.053 | 0.541 | 4.547 | 0.013 | 0.000 | 0.047 | 9.036 | 0.914 | n/a | 0.037 | 2.636 | 0.148 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000693 | 15.211 | 2.392 | n/a | 0.000 | 0.036 | 0.521 | 0.714 | 0.011 | 0.000 | 0.063 | 11.047 | 0.403 | n/a | 0.024 | 2.428 | 0.160 | 0.024 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006ec | 15.057 | 1.609 | n/a | 0.000 | 0.030 | 0.453 | 4.584 | 0.022 | 0.000 | 0.060 | 7.871 | 0.408 | n/a | 0.019 | 1.639 | 0.109 | 0.019 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000643 | 14.933 | 3.323 | n/a | 0.000 | 1.585 | 0.495 | 0.910 | 0.007 | 0.000 | 0.032 | 7.778 | 0.775 | n/a | 0.028 | 4.908 | 0.329 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000065a | 14.841 | 3.227 | n/a | 0.000 | 0.123 | 1.249 | 1.314 | 0.019 | 0.000 | 0.043 | 8.008 | 0.813 | n/a | 0.047 | 3.350 | 0.226 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006aa | 14.307 | 1.782 | n/a | 0.000 | 0.091 | 0.295 | 0.613 | 0.006 | 0.000 | 0.039 | 10.655 | 0.793 | n/a | 0.034 | 1.872 | 0.131 | 0.034 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000742 | 13.557 | 3.607 | n/a | 0.000 | 0.106 | 0.758 | 1.314 | 0.024 | 0.000 | 0.082 | 6.743 | 0.883 | n/a | 0.040 | 3.714 | 0.274 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000647 | 13.426 | 2.343 | n/a | 0.000 | 0.030 | 4.181 | 1.303 | 0.018 | 0.000 | 0.044 | 4.587 | 0.897 | n/a | 0.023 | 2.373 | 0.177 | 0.023 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000064b | 13.202 | 1.770 | n/a | 0.000 | 0.037 | 0.274 | 5.759 | 0.009 | 0.000 | 0.043 | 4.492 | 0.795 | n/a | 0.022 | 1.807 | 0.137 | 0.022 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006d4 | 12.985 | 2.546 | n/a | 0.000 | 0.082 | 0.563 | 4.237 | 0.012 | 0.000 | 0.042 | 4.670 | 0.807 | n/a | 0.025 | 2.627 | 0.202 | 0.025 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000630 | 12.715 | 2.019 | n/a | 0.000 | 0.105 | 0.661 | 1.392 | 0.022 | 0.000 | 1.085 | 6.605 | 0.787 | n/a | 0.040 | 2.124 | 0.167 | 0.040 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000656 | 12.347 | 1.820 | n/a | 0.000 | 0.045 | 0.472 | 0.805 | 0.012 | 0.000 | 0.056 | 8.322 | 0.791 | n/a | 0.023 | 1.865 | 0.151 | 0.023 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006f2 | 12.298 | 4.432 | n/a | 0.000 | 2.010 | 0.452 | 1.058 | 0.013 | 0.000 | 0.071 | 3.817 | 0.414 | n/a | 0.031 | 6.442 | 0.524 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000710 | 12.018 | 2.687 | n/a | 0.000 | 1.489 | 0.496 | 0.682 | 0.010 | 0.000 | 0.042 | 5.655 | 0.939 | n/a | 0.018 | 4.176 | 0.347 | 0.018 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000684 | 11.854 | 1.751 | n/a | 0.000 | 0.040 | 1.310 | 1.228 | 0.022 | 0.000 | 0.079 | 6.578 | 0.827 | n/a | 0.021 | 1.791 | 0.151 | 0.021 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000716 | 11.846 | 2.310 | n/a | 0.000 | 0.036 | 0.562 | 1.180 | 0.021 | 0.000 | 0.074 | 3.947 | 3.694 | n/a | 0.024 | 2.345 | 0.198 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000006c3 | 11.755 | 2.981 | n/a | 0.000 | 0.126 | 0.537 | 0.865 | 0.008 | 0.000 | 0.039 | 6.325 | 0.834 | n/a | 0.040 | 3.107 | 0.264 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000066f | 11.587 | 2.860 | n/a | 0.000 | 0.113 | 0.953 | 0.890 | 0.005 | 0.000 | 0.010 | 5.937 | 0.777 | n/a | 0.040 | 2.974 | 0.257 | 0.040 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.019 | 0.163 | 0.000 | 0.491 | 2.017 | n/a | 0.000 | 0.045 | 0.449 | 0.729 | 0.008 | 0.000 | 0.045 | 3.504 | 0.422 | n/a | 0.026 | 2.113 | 0.287 | 0.026 |
| p99 | 17.630 | 2.504 | 0.028 | 1.062 | 4.807 | n/a | 0.000 | 2.349 | 2.050 | 4.602 | 0.023 | 0.000 | 0.635 | 9.590 | 3.418 | n/a | 0.054 | 5.820 | 0.496 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000839 | 28.881 | 3.240 | n/a | 0.000 | 0.199 | 0.517 | 4.745 | 0.003 | 14.558 | 0.017 | 5.184 | 0.375 | n/a | 0.042 | 3.439 | 0.119 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d62c64b47eb831930000000000000829 | 17.630 | 2.257 | n/a | 0.000 | 0.037 | 0.397 | 0.606 | 0.005 | 0.000 | 0.021 | 13.380 | 0.906 | n/a | 0.021 | 2.294 | 0.130 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000809 | 17.180 | 3.032 | n/a | 0.000 | 0.104 | 3.977 | 1.263 | 0.018 | 0.000 | 0.054 | 8.261 | 0.432 | n/a | 0.039 | 3.136 | 0.183 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000858 | 16.012 | 1.933 | n/a | 0.000 | 0.040 | 0.342 | 4.602 | 0.008 | 0.000 | 0.028 | 8.604 | 0.431 | n/a | 0.024 | 1.973 | 0.123 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000834 | 14.570 | 1.840 | n/a | 0.000 | 0.042 | 0.339 | 4.372 | 0.010 | 0.000 | 0.041 | 7.463 | 0.437 | n/a | 0.026 | 1.883 | 0.129 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000832 | 14.188 | 1.830 | n/a | 0.000 | 0.043 | 0.524 | 1.241 | 0.015 | 0.000 | 3.471 | 6.622 | 0.420 | n/a | 0.021 | 1.872 | 0.132 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007b4 | 13.593 | 3.510 | n/a | 0.000 | 2.483 | 0.449 | 0.803 | 0.013 | 0.000 | 0.532 | 4.952 | 0.819 | n/a | 0.031 | 5.994 | 0.441 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000775 | 13.101 | 1.802 | n/a | 0.000 | 0.039 | 0.327 | 0.863 | 0.008 | 0.000 | 0.036 | 9.590 | 0.414 | n/a | 0.023 | 1.841 | 0.141 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007dc | 12.917 | 3.472 | n/a | 0.000 | 2.349 | 0.617 | 1.371 | 0.019 | 0.000 | 0.051 | 4.567 | 0.443 | n/a | 0.030 | 5.820 | 0.451 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008a7 | 12.420 | 1.824 | n/a | 0.000 | 0.040 | 0.508 | 1.192 | 0.013 | 0.000 | 0.063 | 4.447 | 4.309 | n/a | 0.024 | 1.864 | 0.150 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000830 | 12.090 | 2.017 | n/a | 0.000 | 0.042 | 0.457 | 0.769 | 0.004 | 0.000 | 0.016 | 8.344 | 0.421 | n/a | 0.021 | 2.058 | 0.170 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000082b | 11.956 | 1.755 | n/a | 0.000 | 0.041 | 0.402 | 0.669 | 0.010 | 0.000 | 0.039 | 8.211 | 0.803 | n/a | 0.026 | 1.796 | 0.150 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000822 | 11.751 | 1.817 | n/a | 0.000 | 0.047 | 0.393 | 0.677 | 0.009 | 0.000 | 0.226 | 5.133 | 3.418 | n/a | 0.033 | 1.864 | 0.159 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007ec | 11.415 | 2.964 | n/a | 0.000 | 0.097 | 0.870 | 0.652 | 0.005 | 0.000 | 0.012 | 6.350 | 0.424 | n/a | 0.042 | 3.061 | 0.268 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000824 | 11.078 | 2.619 | n/a | 0.000 | 0.066 | 0.461 | 1.271 | 0.016 | 0.000 | 0.099 | 6.082 | 0.396 | n/a | 0.068 | 2.685 | 0.242 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000827 | 10.932 | 3.863 | n/a | 0.000 | 0.067 | 0.560 | 0.925 | 0.011 | 0.000 | 0.240 | 4.816 | 0.406 | n/a | 0.042 | 3.930 | 0.360 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000873 | 10.739 | 2.296 | n/a | 0.000 | 0.986 | 0.345 | 0.857 | 0.007 | 0.000 | 0.028 | 5.467 | 0.734 | n/a | 0.020 | 3.282 | 0.306 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000084d | 10.733 | 1.854 | n/a | 0.000 | 0.039 | 2.050 | 0.604 | 0.006 | 0.000 | 0.016 | 5.323 | 0.816 | n/a | 0.024 | 1.893 | 0.176 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000078e | 10.484 | 2.272 | n/a | 0.000 | 0.038 | 1.255 | 1.052 | 0.014 | 0.000 | 0.036 | 4.958 | 0.840 | n/a | 0.021 | 2.309 | 0.220 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007a9 | 10.439 | 4.879 | n/a | 0.000 | 0.108 | 0.594 | 1.147 | 0.016 | 0.000 | 0.096 | 3.162 | 0.397 | n/a | 0.040 | 4.987 | 0.478 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-250 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.019 | 0.163 | 0.000 | 0.491 | 2.017 | n/a | 0.000 | 0.045 | 0.449 | 0.729 | 0.008 | 0.000 | 0.045 | 3.504 | 0.422 | n/a | 0.026 | 2.113 | 0.287 | 0.026 |
| p99 | 17.630 | 2.504 | 0.028 | 1.062 | 4.807 | n/a | 0.000 | 2.349 | 2.050 | 4.602 | 0.023 | 0.000 | 0.635 | 9.590 | 3.418 | n/a | 0.054 | 5.820 | 0.496 | 0.054 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000839 | 28.881 | 3.240 | n/a | 0.000 | 0.199 | 0.517 | 4.745 | 0.003 | 14.558 | 0.017 | 5.184 | 0.375 | n/a | 0.042 | 3.439 | 0.119 | 0.042 | gw-w/thread--1/jdk.GCPhasePause | none observed |
| d62c64b47eb831930000000000000829 | 17.630 | 2.257 | n/a | 0.000 | 0.037 | 0.397 | 0.606 | 0.005 | 0.000 | 0.021 | 13.380 | 0.906 | n/a | 0.021 | 2.294 | 0.130 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000809 | 17.180 | 3.032 | n/a | 0.000 | 0.104 | 3.977 | 1.263 | 0.018 | 0.000 | 0.054 | 8.261 | 0.432 | n/a | 0.039 | 3.136 | 0.183 | 0.039 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000858 | 16.012 | 1.933 | n/a | 0.000 | 0.040 | 0.342 | 4.602 | 0.008 | 0.000 | 0.028 | 8.604 | 0.431 | n/a | 0.024 | 1.973 | 0.123 | 0.024 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000834 | 14.570 | 1.840 | n/a | 0.000 | 0.042 | 0.339 | 4.372 | 0.010 | 0.000 | 0.041 | 7.463 | 0.437 | n/a | 0.026 | 1.883 | 0.129 | 0.026 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000832 | 14.188 | 1.830 | n/a | 0.000 | 0.043 | 0.524 | 1.241 | 0.015 | 0.000 | 3.471 | 6.622 | 0.420 | n/a | 0.021 | 1.872 | 0.132 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007b4 | 13.593 | 3.510 | n/a | 0.000 | 2.483 | 0.449 | 0.803 | 0.013 | 0.000 | 0.532 | 4.952 | 0.819 | n/a | 0.031 | 5.994 | 0.441 | 0.031 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000775 | 13.101 | 1.802 | n/a | 0.000 | 0.039 | 0.327 | 0.863 | 0.008 | 0.000 | 0.036 | 9.590 | 0.414 | n/a | 0.023 | 1.841 | 0.141 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007dc | 12.917 | 3.472 | n/a | 0.000 | 2.349 | 0.617 | 1.371 | 0.019 | 0.000 | 0.051 | 4.567 | 0.443 | n/a | 0.030 | 5.820 | 0.451 | 0.030 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008a7 | 12.420 | 1.824 | n/a | 0.000 | 0.040 | 0.508 | 1.192 | 0.013 | 0.000 | 0.063 | 4.447 | 4.309 | n/a | 0.024 | 1.864 | 0.150 | 0.024 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000830 | 12.090 | 2.017 | n/a | 0.000 | 0.042 | 0.457 | 0.769 | 0.004 | 0.000 | 0.016 | 8.344 | 0.421 | n/a | 0.021 | 2.058 | 0.170 | 0.021 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000082b | 11.956 | 1.755 | n/a | 0.000 | 0.041 | 0.402 | 0.669 | 0.010 | 0.000 | 0.039 | 8.211 | 0.803 | n/a | 0.026 | 1.796 | 0.150 | 0.026 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000822 | 11.751 | 1.817 | n/a | 0.000 | 0.047 | 0.393 | 0.677 | 0.009 | 0.000 | 0.226 | 5.133 | 3.418 | n/a | 0.033 | 1.864 | 0.159 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007ec | 11.415 | 2.964 | n/a | 0.000 | 0.097 | 0.870 | 0.652 | 0.005 | 0.000 | 0.012 | 6.350 | 0.424 | n/a | 0.042 | 3.061 | 0.268 | 0.042 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000824 | 11.078 | 2.619 | n/a | 0.000 | 0.066 | 0.461 | 1.271 | 0.016 | 0.000 | 0.099 | 6.082 | 0.396 | n/a | 0.068 | 2.685 | 0.242 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000827 | 10.932 | 3.863 | n/a | 0.000 | 0.067 | 0.560 | 0.925 | 0.011 | 0.000 | 0.240 | 4.816 | 0.406 | n/a | 0.042 | 3.930 | 0.360 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000873 | 10.739 | 2.296 | n/a | 0.000 | 0.986 | 0.345 | 0.857 | 0.007 | 0.000 | 0.028 | 5.467 | 0.734 | n/a | 0.020 | 3.282 | 0.306 | 0.020 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000084d | 10.733 | 1.854 | n/a | 0.000 | 0.039 | 2.050 | 0.604 | 0.006 | 0.000 | 0.016 | 5.323 | 0.816 | n/a | 0.024 | 1.893 | 0.176 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000078e | 10.484 | 2.272 | n/a | 0.000 | 0.038 | 1.255 | 1.052 | 0.014 | 0.000 | 0.036 | 4.958 | 0.840 | n/a | 0.021 | 2.309 | 0.220 | 0.021 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000007a9 | 10.439 | 4.879 | n/a | 0.000 | 0.108 | 0.594 | 1.147 | 0.016 | 0.000 | 0.096 | 3.162 | 0.397 | n/a | 0.040 | 4.987 | 0.478 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (21 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.603 | n/a | n/a | n/a | 12.061 | 1.131 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 13.909 | 0.999 | 0.009 |
| p99 | 39.441 | n/a | n/a | n/a | 23.072 | 16.190 | 1.762 | 0.000 | 21.318 | 5.440 | 0.006 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.041 | 25.317 | 0.999 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000003ae | 39.441 | 14.462 | 1.131 | 1.762 | 0.000 | 21.318 | 0.750 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.008 | 17.355 | 0.440 | 0.008 | node-14/thread-4/socket.wait-first-byte | driver.publication.readback 0.063ms; driver.publication.readback 0.058ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.028ms; driver.publication.persist-deferred 0.018ms |
| d62c64b47eb831930000000000000146 | 31.094 | 23.072 | 1.266 | 0.980 | 0.000 | 4.603 | 1.151 | 0.006 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.006 | 25.317 | 0.814 | 0.006 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.096ms; driver.publication.readback 0.064ms; driver.publication.persist-deferred 0.016ms; driver.publication.persist-deferred 0.013ms |
| d62c64b47eb8319300000000000003ac | 29.380 | 16.398 | 0.338 | 1.595 | 0.000 | 6.781 | 4.245 | 0.002 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.015 | 18.331 | 0.624 | 0.015 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.063ms; driver.publication.readback 0.062ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.017ms |
| d62c64b47eb8319300000000000001eb | 23.077 | 12.815 | 0.537 | 0.557 | 0.000 | 3.707 | 5.440 | 0.006 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.008 | 13.909 | 0.603 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.065ms; driver.publication.persist-deferred 0.016ms |
| d62c64b47eb8319300000000000006d7 | 17.228 | 14.394 | 0.385 | 0.555 | 0.000 | 1.333 | 0.545 | 0.002 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.009 | 15.334 | 0.890 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.016ms |
| d62c64b47eb83193000000000000093e | 16.384 | 0.180 | 16.190 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.014 | 16.370 | 0.999 | 0.014 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.132ms; driver.reader-basis.broadcast 0.106ms; driver.publication.persist-deferred 0.032ms |
| d62c64b47eb8319300000000000000f9 | 16.323 | 14.203 | 2.111 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 16.314 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.094ms; driver.publication.persist-deferred 0.017ms |
| d62c64b47eb8319300000000000000f4 | 15.590 | 12.499 | 3.050 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.041 | 15.549 | 0.997 | 0.041 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.463ms; driver.publication.persist-deferred 0.081ms |
| d62c64b47eb831930000000000000145 | 15.340 | 14.845 | 0.482 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.012 | 15.328 | 0.999 | 0.012 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.096ms; driver.publication.readback 0.073ms; driver.publication.persist-deferred 0.015ms; driver.publication.persist-deferred 0.013ms |
| d62c64b47eb8319300000000000002fd | 15.268 | 12.891 | 2.368 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 15.260 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.035ms; driver.publication.persist-deferred 0.015ms |
| d62c64b47eb831930000000000000290 | 14.603 | 13.226 | 1.361 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.017 | 14.586 | 0.999 | 0.017 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.097ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.013ms |
| d62c64b47eb831930000000000000291 | 13.146 | 12.061 | 1.078 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 13.138 | 0.999 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.097ms; driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.013ms |
| d62c64b47eb831930000000000000103 | 12.170 | 11.293 | 0.868 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 12.161 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.020ms |
| d62c64b47eb83193000000000000011b | 11.977 | 11.921 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 11.968 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.015ms |
| d62c64b47eb831930000000000000a3d | 11.905 | 0.255 | 11.641 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 11.896 | 0.999 | 0.009 | node-14/thread-0/rpc.replica.observe | driver.publication.readback 0.080ms; driver.publication.persist-deferred 0.018ms |
| d62c64b47eb8319300000000000000ff | 11.754 | 11.699 | 0.048 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.007 | 11.747 | 0.999 | 0.007 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.052ms; driver.publication.persist-deferred 0.024ms |
| d62c64b47eb831930000000000000115 | 11.283 | 11.239 | 0.037 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.008 | 11.276 | 0.999 | 0.008 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.018ms |
| d62c64b47eb8319300000000000001f0 | 11.155 | 11.095 | 0.051 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 11.146 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.020ms |
| d62c64b47eb83193000000000000011f | 11.111 | 9.705 | 1.391 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.015 | 11.096 | 0.999 | 0.015 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.025ms |
| d62c64b47eb8319300000000000001f4 | 11.108 | 8.651 | 2.449 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | n/a | 0.009 | 11.099 | 0.999 | 0.009 | node-14/thread-3/replica.pull-at | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.016ms |

## P2 / idle-500 / commit (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.204 | 0.492 | 0.000 | 0.500 | 2.098 | n/a | 0.000 | 0.052 | 0.441 | 0.668 | 0.006 | 0.000 | 0.035 | 3.734 | 0.423 | n/a | 0.039 | 2.165 | 0.293 | 0.039 |
| p99 | 17.929 | 1.490 | 0.030 | 1.060 | 4.474 | n/a | 0.000 | 1.730 | 1.074 | 2.804 | 0.021 | 0.000 | 0.406 | 10.696 | 1.029 | n/a | 0.064 | 4.872 | 0.498 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000008d7 | 19.178 | 2.098 | n/a | 0.000 | 0.066 | 0.609 | 2.461 | 0.020 | 0.000 | 0.150 | 12.877 | 0.859 | n/a | 0.038 | 2.165 | 0.113 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| d62c64b47eb83193000000000000092c | 17.929 | 1.995 | n/a | 0.000 | 0.049 | 0.350 | 4.364 | 0.006 | 0.000 | 0.017 | 10.696 | 0.416 | n/a | 0.038 | 2.044 | 0.114 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009fb | 15.376 | 3.555 | n/a | 0.000 | 0.139 | 0.521 | 1.011 | 0.007 | 0.000 | 0.194 | 9.450 | 0.447 | n/a | 0.052 | 3.694 | 0.240 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a21 | 12.336 | 3.484 | n/a | 0.000 | 0.136 | 1.007 | 0.777 | 0.005 | 0.000 | 0.023 | 5.774 | 1.087 | n/a | 0.044 | 3.620 | 0.293 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008d4 | 12.301 | 3.521 | n/a | 0.000 | 1.185 | 0.602 | 0.576 | 0.005 | 0.000 | 0.139 | 5.874 | 0.381 | n/a | 0.018 | 4.706 | 0.383 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.223ms |
| d62c64b47eb831930000000000000960 | 11.875 | 4.739 | n/a | 0.000 | 0.106 | 0.459 | 1.292 | 0.005 | 0.000 | 0.037 | 4.784 | 0.404 | n/a | 0.049 | 4.845 | 0.408 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a0f | 11.539 | 2.480 | n/a | 0.000 | 0.068 | 0.691 | 1.229 | 0.014 | 0.000 | 0.049 | 6.161 | 0.799 | n/a | 0.048 | 2.548 | 0.221 | 0.048 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008bb | 11.481 | 1.841 | n/a | 0.000 | 0.045 | 4.381 | 0.778 | 0.004 | 0.000 | 0.008 | 3.985 | 0.403 | n/a | 0.036 | 1.886 | 0.164 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.091ms |
| d62c64b47eb8319300000000000009e7 | 11.105 | 2.879 | n/a | 0.000 | 0.118 | 1.074 | 0.675 | 0.004 | 0.000 | 0.057 | 5.803 | 0.445 | n/a | 0.049 | 2.997 | 0.270 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008f5 | 10.741 | 3.465 | n/a | 0.000 | 0.138 | 0.442 | 0.782 | 0.005 | 0.000 | 0.015 | 4.938 | 0.914 | n/a | 0.043 | 3.603 | 0.335 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009d3 | 10.514 | 1.922 | n/a | 0.000 | 0.079 | 0.616 | 1.320 | 0.017 | 0.000 | 0.132 | 5.523 | 0.870 | n/a | 0.035 | 2.001 | 0.190 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009c4 | 10.448 | 2.943 | n/a | 0.000 | 0.115 | 0.641 | 1.426 | 0.016 | 0.000 | 0.074 | 4.553 | 0.622 | n/a | 0.059 | 3.057 | 0.293 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009d8 | 10.442 | 1.866 | n/a | 0.000 | 0.055 | 0.591 | 1.301 | 0.013 | 0.000 | 0.045 | 6.106 | 0.422 | n/a | 0.043 | 1.921 | 0.184 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a00 | 10.424 | 2.828 | n/a | 0.000 | 0.130 | 0.350 | 0.611 | 0.006 | 0.000 | 0.207 | 5.397 | 0.842 | n/a | 0.053 | 2.958 | 0.284 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009f6 | 10.198 | 2.958 | n/a | 0.000 | 0.128 | 0.583 | 1.271 | 0.014 | 0.000 | 0.047 | 4.567 | 0.581 | n/a | 0.051 | 3.086 | 0.303 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000910 | 10.165 | 1.891 | n/a | 0.000 | 0.057 | 0.547 | 2.804 | 0.018 | 0.000 | 0.046 | 4.339 | 0.423 | n/a | 0.040 | 1.948 | 0.192 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000091a | 10.100 | 3.780 | n/a | 0.000 | 1.092 | 0.801 | 0.696 | 0.009 | 0.000 | 0.037 | 3.226 | 0.423 | n/a | 0.036 | 4.872 | 0.482 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000096a | 10.033 | 2.922 | n/a | 0.000 | 0.048 | 0.672 | 0.569 | 0.005 | 0.000 | 0.035 | 4.954 | 0.790 | n/a | 0.039 | 2.970 | 0.296 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009e2 | 9.987 | 1.918 | n/a | 0.000 | 0.067 | 0.582 | 1.285 | 0.012 | 0.000 | 0.168 | 5.051 | 0.858 | n/a | 0.045 | 1.986 | 0.199 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009fe | 9.985 | 1.842 | n/a | 0.000 | 0.051 | 1.038 | 0.665 | 0.006 | 0.000 | 0.017 | 5.495 | 0.836 | n/a | 0.036 | 1.893 | 0.190 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-500 / commit / 5-10 facts (150 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.204 | 0.492 | 0.000 | 0.500 | 2.098 | n/a | 0.000 | 0.052 | 0.441 | 0.668 | 0.006 | 0.000 | 0.035 | 3.734 | 0.423 | n/a | 0.039 | 2.165 | 0.293 | 0.039 |
| p99 | 17.929 | 1.490 | 0.030 | 1.060 | 4.474 | n/a | 0.000 | 1.730 | 1.074 | 2.804 | 0.021 | 0.000 | 0.406 | 10.696 | 1.029 | n/a | 0.064 | 4.872 | 0.498 | 0.064 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb8319300000000000008d7 | 19.178 | 2.098 | n/a | 0.000 | 0.066 | 0.609 | 2.461 | 0.020 | 0.000 | 0.150 | 12.877 | 0.859 | n/a | 0.038 | 2.165 | 0.113 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.112ms |
| d62c64b47eb83193000000000000092c | 17.929 | 1.995 | n/a | 0.000 | 0.049 | 0.350 | 4.364 | 0.006 | 0.000 | 0.017 | 10.696 | 0.416 | n/a | 0.038 | 2.044 | 0.114 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009fb | 15.376 | 3.555 | n/a | 0.000 | 0.139 | 0.521 | 1.011 | 0.007 | 0.000 | 0.194 | 9.450 | 0.447 | n/a | 0.052 | 3.694 | 0.240 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a21 | 12.336 | 3.484 | n/a | 0.000 | 0.136 | 1.007 | 0.777 | 0.005 | 0.000 | 0.023 | 5.774 | 1.087 | n/a | 0.044 | 3.620 | 0.293 | 0.044 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008d4 | 12.301 | 3.521 | n/a | 0.000 | 1.185 | 0.602 | 0.576 | 0.005 | 0.000 | 0.139 | 5.874 | 0.381 | n/a | 0.018 | 4.706 | 0.383 | 0.018 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.223ms |
| d62c64b47eb831930000000000000960 | 11.875 | 4.739 | n/a | 0.000 | 0.106 | 0.459 | 1.292 | 0.005 | 0.000 | 0.037 | 4.784 | 0.404 | n/a | 0.049 | 4.845 | 0.408 | 0.049 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a0f | 11.539 | 2.480 | n/a | 0.000 | 0.068 | 0.691 | 1.229 | 0.014 | 0.000 | 0.049 | 6.161 | 0.799 | n/a | 0.048 | 2.548 | 0.221 | 0.048 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008bb | 11.481 | 1.841 | n/a | 0.000 | 0.045 | 4.381 | 0.778 | 0.004 | 0.000 | 0.008 | 3.985 | 0.403 | n/a | 0.036 | 1.886 | 0.164 | 0.036 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.091ms |
| d62c64b47eb8319300000000000009e7 | 11.105 | 2.879 | n/a | 0.000 | 0.118 | 1.074 | 0.675 | 0.004 | 0.000 | 0.057 | 5.803 | 0.445 | n/a | 0.049 | 2.997 | 0.270 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000008f5 | 10.741 | 3.465 | n/a | 0.000 | 0.138 | 0.442 | 0.782 | 0.005 | 0.000 | 0.015 | 4.938 | 0.914 | n/a | 0.043 | 3.603 | 0.335 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009d3 | 10.514 | 1.922 | n/a | 0.000 | 0.079 | 0.616 | 1.320 | 0.017 | 0.000 | 0.132 | 5.523 | 0.870 | n/a | 0.035 | 2.001 | 0.190 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009c4 | 10.448 | 2.943 | n/a | 0.000 | 0.115 | 0.641 | 1.426 | 0.016 | 0.000 | 0.074 | 4.553 | 0.622 | n/a | 0.059 | 3.057 | 0.293 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009d8 | 10.442 | 1.866 | n/a | 0.000 | 0.055 | 0.591 | 1.301 | 0.013 | 0.000 | 0.045 | 6.106 | 0.422 | n/a | 0.043 | 1.921 | 0.184 | 0.043 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a00 | 10.424 | 2.828 | n/a | 0.000 | 0.130 | 0.350 | 0.611 | 0.006 | 0.000 | 0.207 | 5.397 | 0.842 | n/a | 0.053 | 2.958 | 0.284 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009f6 | 10.198 | 2.958 | n/a | 0.000 | 0.128 | 0.583 | 1.271 | 0.014 | 0.000 | 0.047 | 4.567 | 0.581 | n/a | 0.051 | 3.086 | 0.303 | 0.051 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000910 | 10.165 | 1.891 | n/a | 0.000 | 0.057 | 0.547 | 2.804 | 0.018 | 0.000 | 0.046 | 4.339 | 0.423 | n/a | 0.040 | 1.948 | 0.192 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000091a | 10.100 | 3.780 | n/a | 0.000 | 1.092 | 0.801 | 0.696 | 0.009 | 0.000 | 0.037 | 3.226 | 0.423 | n/a | 0.036 | 4.872 | 0.482 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb83193000000000000096a | 10.033 | 2.922 | n/a | 0.000 | 0.048 | 0.672 | 0.569 | 0.005 | 0.000 | 0.035 | 4.954 | 0.790 | n/a | 0.039 | 2.970 | 0.296 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009e2 | 9.987 | 1.918 | n/a | 0.000 | 0.067 | 0.582 | 1.285 | 0.012 | 0.000 | 0.168 | 5.051 | 0.858 | n/a | 0.045 | 1.986 | 0.199 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb8319300000000000009fe | 9.985 | 1.842 | n/a | 0.000 | 0.051 | 1.038 | 0.665 | 0.006 | 0.000 | 0.017 | 5.495 | 0.836 | n/a | 0.036 | 1.893 | 0.190 | 0.036 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.788 | 0.362 | 0.000 | 0.555 | 2.390 | n/a | 0.000 | 0.050 | 0.471 | 0.673 | 0.005 | 0.000 | 0.030 | 3.929 | 0.442 | n/a | 0.039 | 2.517 | 0.298 | 0.039 |
| p99 | 17.995 | 3.009 | 0.000 | 1.198 | 5.649 | n/a | 0.000 | 3.047 | 1.423 | 1.500 | 0.023 | 0.000 | 0.332 | 8.909 | 1.119 | n/a | 0.108 | 6.041 | 0.512 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000bb5 | 30.920 | 2.072 | n/a | 0.000 | 0.048 | 0.399 | 0.707 | 0.006 | 0.000 | 0.052 | 8.909 | 18.688 | n/a | 0.038 | 2.120 | 0.069 | 0.038 | tx/thread-96/transactor.triplex-function | none observed |
| d62c64b47eb831930000000000000a2d | 17.995 | 1.877 | n/a | 0.000 | 0.054 | 0.327 | 0.890 | 0.005 | 0.000 | 0.023 | 13.968 | 0.812 | n/a | 0.038 | 1.931 | 0.107 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000be5 | 13.231 | 5.890 | n/a | 0.000 | 0.151 | 0.837 | 0.915 | 0.005 | 0.000 | 0.014 | 4.522 | 0.788 | n/a | 0.108 | 6.041 | 0.457 | 0.108 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b5b | 12.995 | 3.644 | n/a | 0.000 | 0.113 | 0.585 | 0.974 | 0.004 | 0.000 | 0.019 | 6.683 | 0.917 | n/a | 0.056 | 3.757 | 0.289 | 0.056 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b73 | 12.665 | 3.224 | n/a | 0.000 | 0.132 | 1.372 | 0.945 | 0.008 | 0.000 | 0.058 | 5.958 | 0.912 | n/a | 0.057 | 3.355 | 0.265 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a9f | 12.337 | 3.612 | n/a | 0.000 | 2.015 | 0.515 | 0.720 | 0.004 | 0.000 | 0.027 | 4.611 | 0.799 | n/a | 0.035 | 5.626 | 0.456 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b94 | 12.043 | 2.749 | n/a | 0.000 | 0.060 | 0.490 | 0.643 | 0.005 | 0.000 | 0.020 | 7.145 | 0.885 | n/a | 0.047 | 2.809 | 0.233 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000bd6 | 12.008 | 5.649 | n/a | 0.000 | 0.046 | 0.683 | 0.670 | 0.005 | 0.000 | 0.025 | 4.449 | 0.442 | n/a | 0.039 | 5.695 | 0.474 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000ac3 | 11.955 | 1.841 | n/a | 0.000 | 0.056 | 0.566 | 1.229 | 0.013 | 0.000 | 0.051 | 7.192 | 0.971 | n/a | 0.036 | 1.896 | 0.159 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b97 | 11.778 | 2.561 | n/a | 0.000 | 0.053 | 0.819 | 0.601 | 0.004 | 0.000 | 0.009 | 6.762 | 0.928 | n/a | 0.041 | 2.614 | 0.222 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b82 | 11.618 | 3.863 | n/a | 0.000 | 3.051 | 0.777 | 0.571 | 0.005 | 0.000 | 0.021 | 2.843 | 0.423 | n/a | 0.064 | 6.914 | 0.595 | 0.064 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| d62c64b47eb831930000000000000bdf | 11.324 | 2.807 | n/a | 0.000 | 0.052 | 0.582 | 1.434 | 0.012 | 0.000 | 0.039 | 5.814 | 0.540 | n/a | 0.043 | 2.859 | 0.252 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000aba | 11.226 | 2.746 | n/a | 0.000 | 0.039 | 0.640 | 1.204 | 0.014 | 0.000 | 0.039 | 5.718 | 0.803 | n/a | 0.023 | 2.784 | 0.248 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a4b | 11.116 | 2.558 | n/a | 0.000 | 3.047 | 0.463 | 1.219 | 0.011 | 0.000 | 0.044 | 3.358 | 0.397 | n/a | 0.020 | 5.605 | 0.504 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b64 | 11.034 | 3.493 | n/a | 0.000 | 0.127 | 0.591 | 0.756 | 0.007 | 0.000 | 0.027 | 5.527 | 0.455 | n/a | 0.052 | 3.621 | 0.328 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b38 | 11.014 | 2.545 | n/a | 0.000 | 0.040 | 1.423 | 0.636 | 0.007 | 0.000 | 0.032 | 5.338 | 0.969 | n/a | 0.024 | 2.585 | 0.235 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b3b | 10.922 | 3.260 | n/a | 0.000 | 0.101 | 0.728 | 1.433 | 0.022 | 0.000 | 0.056 | 4.823 | 0.461 | n/a | 0.036 | 3.362 | 0.308 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000bb2 | 10.830 | 1.959 | n/a | 0.000 | 0.042 | 0.399 | 0.674 | 0.006 | 0.000 | 0.198 | 6.563 | 0.964 | n/a | 0.025 | 2.000 | 0.185 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a66 | 10.782 | 3.371 | n/a | 0.000 | 1.544 | 0.532 | 0.589 | 0.004 | 0.000 | 0.083 | 4.215 | 0.421 | n/a | 0.022 | 4.915 | 0.456 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000ab7 | 10.771 | 3.115 | n/a | 0.000 | 0.112 | 0.479 | 0.711 | 0.004 | 0.000 | 0.052 | 5.470 | 0.777 | n/a | 0.051 | 3.227 | 0.300 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / idle-1000 / commit / 5-10 facts (149 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 8.788 | 0.362 | 0.000 | 0.555 | 2.390 | n/a | 0.000 | 0.050 | 0.471 | 0.673 | 0.005 | 0.000 | 0.030 | 3.929 | 0.442 | n/a | 0.039 | 2.517 | 0.298 | 0.039 |
| p99 | 17.995 | 3.009 | 0.000 | 1.198 | 5.649 | n/a | 0.000 | 3.047 | 1.423 | 1.500 | 0.023 | 0.000 | 0.332 | 8.909 | 1.119 | n/a | 0.108 | 6.041 | 0.512 | 0.108 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d62c64b47eb831930000000000000bb5 | 30.920 | 2.072 | n/a | 0.000 | 0.048 | 0.399 | 0.707 | 0.006 | 0.000 | 0.052 | 8.909 | 18.688 | n/a | 0.038 | 2.120 | 0.069 | 0.038 | tx/thread-96/transactor.triplex-function | none observed |
| d62c64b47eb831930000000000000a2d | 17.995 | 1.877 | n/a | 0.000 | 0.054 | 0.327 | 0.890 | 0.005 | 0.000 | 0.023 | 13.968 | 0.812 | n/a | 0.038 | 1.931 | 0.107 | 0.038 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000be5 | 13.231 | 5.890 | n/a | 0.000 | 0.151 | 0.837 | 0.915 | 0.005 | 0.000 | 0.014 | 4.522 | 0.788 | n/a | 0.108 | 6.041 | 0.457 | 0.108 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b5b | 12.995 | 3.644 | n/a | 0.000 | 0.113 | 0.585 | 0.974 | 0.004 | 0.000 | 0.019 | 6.683 | 0.917 | n/a | 0.056 | 3.757 | 0.289 | 0.056 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b73 | 12.665 | 3.224 | n/a | 0.000 | 0.132 | 1.372 | 0.945 | 0.008 | 0.000 | 0.058 | 5.958 | 0.912 | n/a | 0.057 | 3.355 | 0.265 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a9f | 12.337 | 3.612 | n/a | 0.000 | 2.015 | 0.515 | 0.720 | 0.004 | 0.000 | 0.027 | 4.611 | 0.799 | n/a | 0.035 | 5.626 | 0.456 | 0.035 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b94 | 12.043 | 2.749 | n/a | 0.000 | 0.060 | 0.490 | 0.643 | 0.005 | 0.000 | 0.020 | 7.145 | 0.885 | n/a | 0.047 | 2.809 | 0.233 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000bd6 | 12.008 | 5.649 | n/a | 0.000 | 0.046 | 0.683 | 0.670 | 0.005 | 0.000 | 0.025 | 4.449 | 0.442 | n/a | 0.039 | 5.695 | 0.474 | 0.039 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000ac3 | 11.955 | 1.841 | n/a | 0.000 | 0.056 | 0.566 | 1.229 | 0.013 | 0.000 | 0.051 | 7.192 | 0.971 | n/a | 0.036 | 1.896 | 0.159 | 0.036 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b97 | 11.778 | 2.561 | n/a | 0.000 | 0.053 | 0.819 | 0.601 | 0.004 | 0.000 | 0.009 | 6.762 | 0.928 | n/a | 0.041 | 2.614 | 0.222 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b82 | 11.618 | 3.863 | n/a | 0.000 | 3.051 | 0.777 | 0.571 | 0.005 | 0.000 | 0.021 | 2.843 | 0.423 | n/a | 0.064 | 6.914 | 0.595 | 0.064 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| d62c64b47eb831930000000000000bdf | 11.324 | 2.807 | n/a | 0.000 | 0.052 | 0.582 | 1.434 | 0.012 | 0.000 | 0.039 | 5.814 | 0.540 | n/a | 0.043 | 2.859 | 0.252 | 0.043 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000aba | 11.226 | 2.746 | n/a | 0.000 | 0.039 | 0.640 | 1.204 | 0.014 | 0.000 | 0.039 | 5.718 | 0.803 | n/a | 0.023 | 2.784 | 0.248 | 0.023 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a4b | 11.116 | 2.558 | n/a | 0.000 | 3.047 | 0.463 | 1.219 | 0.011 | 0.000 | 0.044 | 3.358 | 0.397 | n/a | 0.020 | 5.605 | 0.504 | 0.020 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b64 | 11.034 | 3.493 | n/a | 0.000 | 0.127 | 0.591 | 0.756 | 0.007 | 0.000 | 0.027 | 5.527 | 0.455 | n/a | 0.052 | 3.621 | 0.328 | 0.052 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b38 | 11.014 | 2.545 | n/a | 0.000 | 0.040 | 1.423 | 0.636 | 0.007 | 0.000 | 0.032 | 5.338 | 0.969 | n/a | 0.024 | 2.585 | 0.235 | 0.024 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000b3b | 10.922 | 3.260 | n/a | 0.000 | 0.101 | 0.728 | 1.433 | 0.022 | 0.000 | 0.056 | 4.823 | 0.461 | n/a | 0.036 | 3.362 | 0.308 | 0.036 | gw-w/thread-53/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000bb2 | 10.830 | 1.959 | n/a | 0.000 | 0.042 | 0.399 | 0.674 | 0.006 | 0.000 | 0.198 | 6.563 | 0.964 | n/a | 0.025 | 2.000 | 0.185 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000a66 | 10.782 | 3.371 | n/a | 0.000 | 1.544 | 0.532 | 0.589 | 0.004 | 0.000 | 0.083 | 4.215 | 0.421 | n/a | 0.022 | 4.915 | 0.456 | 0.022 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| d62c64b47eb831930000000000000ab7 | 10.771 | 3.115 | n/a | 0.000 | 0.112 | 0.479 | 0.711 | 0.004 | 0.000 | 0.052 | 5.470 | 0.777 | n/a | 0.051 | 3.227 | 0.300 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.535 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.680 | 200.781 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.086 | 0.041 | 0.000 | 0.086 |
| p99 | 418.554 | n/a | n/a | n/a | 14.534 | n/a | 3.362 | 0.000 | 3.021 | 414.055 | 0.099 | 23.484 | 0.109 | 0.000 | n/a | n/a | 0.289 | 17.896 | 0.115 | 0.289 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f86230000000000000002 | 418.554 | 2.726 | n/a | 0.000 | 0.000 | 1.308 | 414.055 | 0.099 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.289 | 2.726 | 0.007 | 0.289 | gw-r/thread-51/gateway.admitted-work | none observed |
| c447e008c74f50250000000000000005 | 202.754 | 0.050 | n/a | 0.000 | 0.000 | 1.181 | 201.349 | 0.010 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.086 | 0.050 | 0.000 | 0.086 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000924 | 201.676 | 0.031 | n/a | 0.000 | 0.000 | 0.444 | 201.043 | 0.010 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.074 | 0.031 | 0.000 | 0.074 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000925 | 201.636 | 0.040 | n/a | 0.000 | 0.000 | 0.680 | 200.781 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.077 | 0.040 | 0.000 | 0.077 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000926 | 201.535 | 0.021 | n/a | 0.000 | 0.000 | 0.574 | 200.841 | 0.009 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.048 | 0.021 | 0.000 | 0.048 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000923 | 201.477 | 0.041 | n/a | 0.000 | 0.000 | 0.648 | 200.636 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.105 | 0.041 | 0.000 | 0.105 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f50250000000000000929 | 156.230 | 14.534 | n/a | 3.362 | 0.000 | 3.021 | 111.635 | 0.004 | 23.484 | 0.007 | 0.000 | n/a | n/a | 0.182 | 17.896 | 0.115 | 0.182 | gw-r/thread-49/gateway.admitted-work | none observed |
| c447e008c74f50250000000000000006 | 88.016 | 0.132 | n/a | 0.000 | 0.000 | 0.765 | 86.894 | 0.011 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.105 | 0.132 | 0.001 | 0.105 | gw-r/thread-46/journal/page | none observed |

## P3 / outside-phases / internal (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.208 | n/a | n/a | n/a | 0.309 | n/a | 0.000 | 0.000 | 1.037 | 7.500 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.078 | 0.309 | 0.000 | 0.078 |
| p99 | 1005.560 | n/a | n/a | n/a | 2.558 | n/a | 0.000 | 0.000 | 1.847 | 1001.599 | 0.017 | 0.000 | 0.307 | 0.000 | n/a | n/a | 1.482 | 2.558 | 0.228 | 1.482 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f862300000000000000a4 | 1005.560 | 0.309 | n/a | 0.000 | 0.000 | 1.847 | 1001.599 | 0.017 | 0.000 | 0.307 | 0.000 | n/a | n/a | 1.482 | 0.309 | 0.000 | 1.482 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000237 | 11.208 | 2.558 | n/a | 0.000 | 0.000 | 1.037 | 7.500 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.078 | 2.558 | 0.228 | 0.078 | gw-r/thread-46/journal/page | none observed |

## P3 / warmup / internal (202 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.710 | n/a | n/a | n/a | 2.551 | n/a | 0.000 | 0.000 | 0.692 | 20.186 | 0.009 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.069 | 2.551 | 0.117 | 0.069 |
| p99 | 47.607 | n/a | n/a | n/a | 6.586 | n/a | 0.000 | 0.000 | 7.023 | 37.808 | 0.547 | 0.000 | 0.165 | 0.000 | n/a | n/a | 0.236 | 6.586 | 0.316 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f86230000000000000234 | 1003.413 | 0.106 | n/a | 0.000 | 0.000 | 0.623 | 1001.479 | 0.010 | 0.000 | 0.090 | 0.000 | n/a | n/a | 1.105 | 0.106 | 0.000 | 1.105 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000000f4 | 63.688 | 5.459 | n/a | 0.000 | 0.000 | 0.541 | 57.416 | 0.020 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.164 | 5.459 | 0.086 | 0.164 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000000a5 | 47.607 | 7.061 | n/a | 0.000 | 0.000 | 2.413 | 37.808 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.256 | 7.061 | 0.148 | 0.256 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f8623000000000000017a | 40.224 | 2.192 | n/a | 0.000 | 0.000 | 0.694 | 37.185 | 0.011 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.079 | 2.192 | 0.054 | 0.079 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f8623000000000000019c | 37.909 | 5.310 | n/a | 0.000 | 0.000 | 1.935 | 30.421 | 0.013 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.162 | 5.310 | 0.140 | 0.162 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000001c5 | 37.901 | 2.234 | n/a | 0.000 | 0.000 | 0.702 | 34.819 | 0.015 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.059 | 2.234 | 0.059 | 0.059 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000199 | 37.633 | 2.217 | n/a | 0.000 | 0.000 | 0.318 | 23.936 | 0.005 | 11.085 | 0.016 | 0.000 | n/a | n/a | 0.056 | 2.217 | 0.059 | 0.056 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000001a0 | 36.870 | 4.490 | n/a | 0.000 | 0.000 | 0.594 | 31.618 | 0.012 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.095 | 4.490 | 0.122 | 0.095 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000110 | 35.108 | 2.421 | n/a | 0.000 | 0.000 | 2.177 | 30.361 | 0.012 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.064 | 2.421 | 0.069 | 0.064 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000210 | 34.960 | 8.573 | n/a | 0.000 | 0.000 | 0.573 | 25.687 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.101 | 8.573 | 0.245 | 0.101 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000189 | 34.820 | 2.317 | n/a | 0.000 | 0.000 | 0.357 | 32.057 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.063 | 2.317 | 0.067 | 0.063 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000000d1 | 34.473 | 2.302 | n/a | 0.000 | 0.000 | 0.542 | 31.367 | 0.051 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.072 | 2.302 | 0.067 | 0.072 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000001e0 | 32.962 | 2.262 | n/a | 0.000 | 0.000 | 0.488 | 30.105 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.056 | 2.262 | 0.069 | 0.056 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f862300000000000001f2 | 32.847 | 3.995 | n/a | 0.000 | 0.000 | 0.634 | 28.112 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.054 | 3.995 | 0.122 | 0.054 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000000e7 | 32.822 | 5.839 | n/a | 0.000 | 0.000 | 0.801 | 25.929 | 0.022 | 0.000 | 0.101 | 0.000 | n/a | n/a | 0.130 | 5.839 | 0.178 | 0.130 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000171 | 32.524 | 6.586 | n/a | 0.000 | 0.000 | 0.810 | 24.885 | 0.021 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.122 | 6.586 | 0.203 | 0.122 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000000b0 | 32.481 | 2.544 | n/a | 0.000 | 0.000 | 1.690 | 28.037 | 0.018 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.075 | 2.544 | 0.078 | 0.075 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000000c7 | 31.755 | 5.053 | n/a | 0.000 | 0.000 | 7.023 | 14.827 | 4.617 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.175 | 5.053 | 0.159 | 0.175 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f862300000000000000ea | 31.453 | 4.738 | n/a | 0.000 | 0.000 | 0.671 | 25.789 | 0.020 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.130 | 4.738 | 0.151 | 0.130 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000000cc | 31.428 | 5.801 | n/a | 0.000 | 0.000 | 0.802 | 24.401 | 0.085 | 0.000 | 0.144 | 0.000 | n/a | n/a | 0.196 | 5.801 | 0.185 | 0.196 | gw-r/thread-51/journal/page | none observed |

## P3 / idle-10 / internal (148 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.652 | n/a | n/a | n/a | 2.445 | n/a | 0.000 | 0.000 | 0.586 | 5.538 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.065 | 2.445 | 0.279 | 0.065 |
| p99 | 27.376 | n/a | n/a | n/a | 6.103 | n/a | 0.000 | 0.000 | 7.751 | 23.376 | 0.559 | 0.000 | 0.213 | 0.000 | n/a | n/a | 0.172 | 6.103 | 0.778 | 0.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f86230000000000000360 | 1003.106 | 2.279 | n/a | 0.000 | 0.000 | 0.428 | 988.786 | 0.005 | 11.497 | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.279 | 0.002 | 0.072 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000362 | 27.376 | 2.771 | n/a | 0.000 | 0.000 | 1.130 | 23.376 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.058 | 2.771 | 0.101 | 0.058 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000355 | 26.936 | 4.104 | n/a | 0.000 | 0.000 | 20.645 | 2.086 | 0.006 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.087 | 4.104 | 0.152 | 0.087 | node-14/thread-3/socket.wait-first-byte | none observed |
| da3a95c7970f86230000000000000239 | 25.913 | 6.509 | n/a | 0.000 | 0.000 | 0.510 | 18.502 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.350 | 6.509 | 0.251 | 0.350 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000002bc | 19.244 | 3.547 | n/a | 0.000 | 0.000 | 0.530 | 15.040 | 0.004 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.058 | 3.547 | 0.184 | 0.058 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f862300000000000002a2 | 17.987 | 4.408 | n/a | 0.000 | 0.000 | 1.177 | 12.236 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.127 | 4.408 | 0.245 | 0.127 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f8623000000000000024c | 17.874 | 2.612 | n/a | 0.000 | 0.000 | 0.503 | 14.649 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.073 | 2.612 | 0.146 | 0.073 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000332 | 17.649 | 5.072 | n/a | 0.000 | 0.000 | 2.162 | 10.299 | 0.003 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.098 | 5.072 | 0.287 | 0.098 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000291 | 17.081 | 2.231 | n/a | 0.000 | 0.000 | 0.625 | 14.119 | 0.003 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.067 | 2.231 | 0.131 | 0.067 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000002ed | 16.863 | 2.242 | n/a | 0.000 | 0.000 | 2.546 | 12.003 | 0.003 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.056 | 2.242 | 0.133 | 0.056 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000278 | 15.805 | 2.148 | n/a | 0.000 | 0.000 | 0.319 | 13.208 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.075 | 2.148 | 0.136 | 0.075 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000298 | 15.798 | 4.402 | n/a | 0.000 | 0.000 | 2.222 | 9.019 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.107 | 4.402 | 0.279 | 0.107 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000282 | 15.529 | 3.490 | n/a | 0.000 | 0.000 | 0.586 | 11.316 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.088 | 3.490 | 0.225 | 0.088 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000341 | 15.176 | 4.881 | n/a | 0.000 | 0.000 | 3.595 | 6.583 | 0.003 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.103 | 4.881 | 0.322 | 0.103 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f8623000000000000026f | 14.877 | 2.542 | n/a | 0.000 | 0.000 | 7.751 | 4.472 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.068 | 2.542 | 0.171 | 0.068 | node-14/thread-3/socket.wait-first-byte | none observed |
| da3a95c7970f86230000000000000307 | 14.741 | 2.277 | n/a | 0.000 | 0.000 | 0.431 | 11.942 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.061 | 2.277 | 0.154 | 0.061 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f8623000000000000023f | 14.640 | 2.836 | n/a | 0.000 | 0.000 | 0.474 | 11.200 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.070 | 2.836 | 0.194 | 0.070 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000002dd | 14.629 | 4.375 | n/a | 0.000 | 0.000 | 0.619 | 9.499 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.087 | 4.375 | 0.299 | 0.087 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f8623000000000000034f | 14.580 | 2.342 | n/a | 0.000 | 0.000 | 2.474 | 9.664 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.054 | 2.342 | 0.161 | 0.054 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f8623000000000000032e | 14.558 | 2.223 | n/a | 0.000 | 0.000 | 0.473 | 11.795 | 0.002 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.058 | 2.223 | 0.153 | 0.058 | gw-r/thread-44/journal/page | none observed |

## P3 / idle-25 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.902 | n/a | n/a | n/a | 2.370 | n/a | 0.000 | 0.000 | 0.549 | 21.059 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.059 | 2.370 | 0.100 | 0.059 |
| p99 | 66.469 | n/a | n/a | n/a | 5.152 | n/a | 0.000 | 0.000 | 4.805 | 62.644 | 0.415 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.160 | 5.152 | 0.262 | 0.160 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f8623000000000000048b | 1002.524 | 0.097 | n/a | 0.000 | 0.000 | 0.492 | 1000.758 | 0.006 | 0.000 | 0.075 | 0.000 | n/a | n/a | 1.096 | 0.097 | 0.000 | 1.096 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000003ec | 66.469 | 2.633 | n/a | 0.000 | 0.000 | 1.100 | 62.644 | 0.002 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.066 | 2.633 | 0.040 | 0.066 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f8623000000000000048f | 50.494 | 2.587 | n/a | 0.000 | 0.000 | 0.432 | 47.321 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.143 | 2.587 | 0.051 | 0.143 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000003f7 | 36.844 | 2.396 | n/a | 0.000 | 0.000 | 0.346 | 34.014 | 0.006 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.062 | 2.396 | 0.065 | 0.062 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f8623000000000000047f | 36.260 | 1.937 | n/a | 0.000 | 0.000 | 0.387 | 33.827 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.055 | 1.937 | 0.053 | 0.055 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f86230000000000000423 | 33.660 | 4.186 | n/a | 0.000 | 0.000 | 0.302 | 29.043 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.095 | 4.186 | 0.124 | 0.095 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f8623000000000000036e | 31.416 | 2.303 | n/a | 0.000 | 0.000 | 0.485 | 28.549 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.058 | 2.303 | 0.073 | 0.058 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000003b7 | 30.803 | 2.218 | n/a | 0.000 | 0.000 | 1.236 | 27.238 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.063 | 2.218 | 0.072 | 0.063 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f8623000000000000037c | 30.529 | 2.581 | n/a | 0.000 | 0.000 | 0.699 | 27.129 | 0.013 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.062 | 2.581 | 0.085 | 0.062 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f8623000000000000042d | 30.270 | 2.912 | n/a | 0.000 | 0.000 | 0.401 | 26.846 | 0.003 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.082 | 2.912 | 0.096 | 0.082 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000401 | 30.128 | 4.131 | n/a | 0.000 | 0.000 | 0.618 | 25.215 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.112 | 4.131 | 0.137 | 0.112 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000003f3 | 29.912 | 2.031 | n/a | 0.000 | 0.000 | 0.285 | 27.518 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.053 | 2.031 | 0.068 | 0.053 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000380 | 29.240 | 4.881 | n/a | 0.000 | 0.000 | 0.942 | 23.239 | 0.007 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.113 | 4.881 | 0.167 | 0.113 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000003ab | 29.095 | 2.087 | n/a | 0.000 | 0.000 | 0.333 | 26.593 | 0.004 | 0.000 | 0.020 | 0.000 | n/a | n/a | 0.057 | 2.087 | 0.072 | 0.057 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f8623000000000000039a | 29.002 | 3.567 | n/a | 0.000 | 0.000 | 0.704 | 24.649 | 0.002 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.055 | 3.567 | 0.123 | 0.055 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000003e9 | 28.814 | 5.698 | n/a | 0.000 | 0.000 | 0.609 | 22.282 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.160 | 5.698 | 0.198 | 0.160 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000003a5 | 28.803 | 4.660 | n/a | 0.000 | 0.000 | 0.469 | 23.538 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.101 | 4.660 | 0.162 | 0.101 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000003c3 | 28.730 | 2.324 | n/a | 0.000 | 0.000 | 0.689 | 25.595 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.080 | 2.324 | 0.081 | 0.080 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f86230000000000000441 | 28.729 | 1.980 | n/a | 0.000 | 0.000 | 0.416 | 26.240 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.050 | 1.980 | 0.069 | 0.050 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000473 | 28.637 | 2.729 | n/a | 0.000 | 0.000 | 3.223 | 22.577 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.067 | 2.729 | 0.095 | 0.067 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-50 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 49.810 | n/a | n/a | n/a | 2.371 | n/a | 0.000 | 0.000 | 0.536 | 46.406 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.063 | 2.371 | 0.048 | 0.063 |
| p99 | 91.890 | n/a | n/a | n/a | 4.757 | n/a | 0.000 | 0.000 | 1.864 | 89.115 | 0.205 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.159 | 4.757 | 0.092 | 0.159 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f862300000000000005b9 | 1001.950 | 0.080 | n/a | 0.000 | 0.000 | 0.280 | 1000.459 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.094 | 0.080 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000005bc | 91.890 | 2.336 | n/a | 0.000 | 0.000 | 0.370 | 89.115 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.053 | 2.336 | 0.025 | 0.053 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000004c6 | 56.918 | 1.934 | n/a | 0.000 | 0.000 | 0.323 | 54.594 | 0.002 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.058 | 1.934 | 0.034 | 0.058 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000589 | 55.588 | 2.892 | n/a | 0.000 | 0.000 | 0.505 | 52.093 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.057 | 2.892 | 0.052 | 0.057 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000004d8 | 55.559 | 3.495 | n/a | 0.000 | 0.000 | 0.694 | 51.226 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.102 | 3.495 | 0.063 | 0.102 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000005b2 | 55.482 | 2.396 | n/a | 0.000 | 0.000 | 1.113 | 51.898 | 0.002 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.052 | 2.396 | 0.043 | 0.052 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000004a1 | 55.188 | 3.421 | n/a | 0.000 | 0.000 | 0.373 | 51.277 | 0.002 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.098 | 3.421 | 0.062 | 0.098 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000516 | 55.119 | 4.196 | n/a | 0.000 | 0.000 | 1.489 | 49.298 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.094 | 4.196 | 0.076 | 0.094 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f8623000000000000049c | 55.060 | 3.927 | n/a | 0.000 | 0.000 | 0.595 | 50.408 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.091 | 3.927 | 0.071 | 0.091 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f8623000000000000055c | 54.905 | 2.867 | n/a | 0.000 | 0.000 | 0.618 | 51.310 | 0.005 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.064 | 2.867 | 0.052 | 0.064 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000004ee | 54.856 | 3.220 | n/a | 0.000 | 0.000 | 0.569 | 50.977 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.057 | 3.220 | 0.059 | 0.057 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000004bb | 54.781 | 3.271 | n/a | 0.000 | 0.000 | 0.461 | 50.968 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.069 | 3.271 | 0.060 | 0.069 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000549 | 54.701 | 3.468 | n/a | 0.000 | 0.000 | 0.544 | 50.586 | 0.005 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.061 | 3.468 | 0.063 | 0.061 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000004de | 54.615 | 2.346 | n/a | 0.000 | 0.000 | 0.539 | 51.575 | 0.011 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.062 | 2.346 | 0.043 | 0.062 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000004e4 | 54.492 | 2.549 | n/a | 0.000 | 0.000 | 0.635 | 51.224 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.069 | 2.549 | 0.047 | 0.069 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000004e8 | 54.464 | 3.591 | n/a | 0.000 | 0.000 | 0.932 | 49.814 | 0.003 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.109 | 3.591 | 0.066 | 0.109 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000004be | 53.979 | 2.135 | n/a | 0.000 | 0.000 | 0.563 | 51.170 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.058 | 2.135 | 0.040 | 0.058 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000534 | 53.663 | 2.240 | n/a | 0.000 | 0.000 | 0.471 | 50.807 | 0.008 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.077 | 2.240 | 0.042 | 0.077 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f862300000000000005a5 | 53.528 | 4.119 | n/a | 0.000 | 0.000 | 0.715 | 48.558 | 0.003 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.095 | 4.119 | 0.077 | 0.095 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f8623000000000000057d | 53.493 | 1.945 | n/a | 0.000 | 0.000 | 0.769 | 50.703 | 0.006 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.051 | 1.945 | 0.036 | 0.051 | gw-r/thread-49/journal/page | none observed |

## P3 / idle-100 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 100.073 | n/a | n/a | n/a | 2.267 | n/a | 0.000 | 0.000 | 0.520 | 96.575 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.061 | 2.267 | 0.023 | 0.061 |
| p99 | 251.291 | n/a | n/a | n/a | 5.359 | n/a | 0.000 | 0.000 | 2.938 | 245.987 | 0.196 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.132 | 5.359 | 0.054 | 0.132 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f862300000000000006e5 | 1002.312 | 0.090 | n/a | 0.000 | 0.000 | 0.432 | 1000.580 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.164 | 0.090 | 0.000 | 1.164 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000006e8 | 251.291 | 4.620 | n/a | 0.000 | 0.000 | 0.520 | 245.987 | 0.006 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.109 | 4.620 | 0.018 | 0.109 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000005cd | 128.386 | 2.365 | n/a | 0.000 | 0.000 | 1.237 | 124.605 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.126 | 2.365 | 0.018 | 0.126 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000611 | 116.279 | 4.011 | n/a | 0.000 | 0.000 | 0.644 | 111.474 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.096 | 4.011 | 0.034 | 0.096 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000005dc | 109.800 | 3.979 | n/a | 0.000 | 0.000 | 0.907 | 104.792 | 0.002 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.095 | 3.979 | 0.036 | 0.095 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000628 | 109.652 | 3.528 | n/a | 0.000 | 0.000 | 1.375 | 104.673 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.058 | 3.528 | 0.032 | 0.058 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000667 | 109.206 | 2.040 | n/a | 0.000 | 0.000 | 0.375 | 95.840 | 0.020 | 10.837 | 0.039 | 0.000 | n/a | n/a | 0.055 | 2.040 | 0.019 | 0.055 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000006ce | 108.465 | 3.371 | n/a | 0.000 | 0.000 | 0.588 | 104.418 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.060 | 3.371 | 0.031 | 0.060 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000619 | 106.167 | 3.185 | n/a | 0.000 | 0.000 | 0.749 | 102.105 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.067 | 3.185 | 0.030 | 0.067 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f862300000000000005e0 | 105.818 | 2.300 | n/a | 0.000 | 0.000 | 0.364 | 103.054 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.061 | 2.300 | 0.022 | 0.061 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f8623000000000000063e | 105.371 | 4.159 | n/a | 0.000 | 0.000 | 0.659 | 100.426 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.087 | 4.159 | 0.039 | 0.087 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000005ed | 105.321 | 1.939 | n/a | 0.000 | 0.000 | 0.493 | 102.763 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.056 | 1.939 | 0.018 | 0.056 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000678 | 104.711 | 2.071 | n/a | 0.000 | 0.000 | 1.281 | 101.264 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.055 | 2.071 | 0.020 | 0.055 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f86230000000000000649 | 104.677 | 2.043 | n/a | 0.000 | 0.000 | 0.356 | 102.160 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.059 | 2.043 | 0.020 | 0.059 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000689 | 104.617 | 4.304 | n/a | 0.000 | 0.000 | 0.582 | 99.574 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.113 | 4.304 | 0.041 | 0.113 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000005bd | 104.524 | 4.260 | n/a | 0.000 | 0.000 | 0.441 | 99.684 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.102 | 4.260 | 0.041 | 0.102 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f8623000000000000060d | 104.139 | 4.453 | n/a | 0.000 | 0.000 | 0.423 | 99.159 | 0.002 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.088 | 4.453 | 0.043 | 0.088 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000006a3 | 103.892 | 2.100 | n/a | 0.000 | 0.000 | 0.425 | 101.266 | 0.003 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.069 | 2.100 | 0.020 | 0.069 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000005f1 | 103.847 | 2.590 | n/a | 0.000 | 0.000 | 0.542 | 100.609 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.059 | 2.590 | 0.025 | 0.059 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000005c9 | 103.713 | 4.278 | n/a | 0.000 | 0.000 | 0.531 | 98.820 | 0.003 | 0.000 | 0.007 | 0.000 | n/a | n/a | 0.073 | 4.278 | 0.041 | 0.073 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-250 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 250.057 | n/a | n/a | n/a | 2.432 | n/a | 0.000 | 0.000 | 0.525 | 246.437 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.069 | 2.432 | 0.010 | 0.069 |
| p99 | 498.859 | n/a | n/a | n/a | 5.035 | n/a | 0.000 | 0.000 | 3.584 | 495.894 | 0.031 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.236 | 5.035 | 0.020 | 0.236 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f86230000000000000812 | 1003.302 | 0.128 | n/a | 0.000 | 0.000 | 1.078 | 1000.950 | 0.003 | 0.000 | 0.045 | 0.000 | n/a | n/a | 1.096 | 0.128 | 0.000 | 1.096 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000815 | 498.859 | 2.407 | n/a | 0.000 | 0.000 | 0.462 | 495.894 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.065 | 2.407 | 0.005 | 0.065 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000007aa | 268.631 | 2.069 | n/a | 0.000 | 0.000 | 0.488 | 265.972 | 0.012 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.063 | 2.069 | 0.008 | 0.063 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000734 | 257.717 | 3.414 | n/a | 0.000 | 0.000 | 0.584 | 253.615 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.067 | 3.414 | 0.013 | 0.067 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000780 | 256.221 | 2.353 | n/a | 0.000 | 0.000 | 0.680 | 253.080 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.071 | 2.353 | 0.009 | 0.071 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f8623000000000000080c | 256.174 | 2.094 | n/a | 0.000 | 0.000 | 0.496 | 253.462 | 0.007 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.061 | 2.094 | 0.008 | 0.061 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f862300000000000007a4 | 256.054 | 2.429 | n/a | 0.000 | 0.000 | 0.445 | 253.086 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.067 | 2.429 | 0.009 | 0.067 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f8623000000000000079d | 255.639 | 2.185 | n/a | 0.000 | 0.000 | 0.506 | 252.849 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.062 | 2.185 | 0.009 | 0.062 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f8623000000000000076d | 255.331 | 4.791 | n/a | 0.000 | 0.000 | 0.734 | 249.620 | 0.006 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.127 | 4.791 | 0.019 | 0.127 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000758 | 255.326 | 4.290 | n/a | 0.000 | 0.000 | 0.668 | 250.146 | 0.005 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.124 | 4.290 | 0.017 | 0.124 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f862300000000000007d4 | 255.119 | 4.471 | n/a | 0.000 | 0.000 | 15.121 | 235.359 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.114 | 4.471 | 0.018 | 0.114 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000006f8 | 255.031 | 4.165 | n/a | 0.000 | 0.000 | 0.344 | 250.339 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.131 | 4.165 | 0.016 | 0.131 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000717 | 254.808 | 4.698 | n/a | 0.000 | 0.000 | 1.752 | 248.084 | 0.003 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.236 | 4.698 | 0.018 | 0.236 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000724 | 254.707 | 5.035 | n/a | 0.000 | 0.000 | 0.722 | 248.824 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.097 | 5.035 | 0.020 | 0.097 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000007c6 | 253.992 | 2.094 | n/a | 0.000 | 0.000 | 0.469 | 251.324 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.072 | 2.094 | 0.008 | 0.072 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000006fc | 253.793 | 2.387 | n/a | 0.000 | 0.000 | 0.403 | 250.909 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.057 | 2.387 | 0.009 | 0.057 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f8623000000000000074c | 253.784 | 3.977 | n/a | 0.000 | 0.000 | 0.771 | 248.859 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.125 | 3.977 | 0.016 | 0.125 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f8623000000000000078d | 253.640 | 4.639 | n/a | 0.000 | 0.000 | 0.596 | 248.200 | 0.015 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.138 | 4.639 | 0.018 | 0.138 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000728 | 253.579 | 4.324 | n/a | 0.000 | 0.000 | 0.654 | 248.433 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.101 | 4.324 | 0.017 | 0.101 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000007e6 | 253.127 | 2.041 | n/a | 0.000 | 0.000 | 0.355 | 250.617 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.066 | 2.041 | 0.008 | 0.066 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-500 / internal (151 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 499.959 | n/a | n/a | n/a | 2.936 | n/a | 0.000 | 0.000 | 0.627 | 495.438 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.074 | 3.214 | 0.006 | 0.074 |
| p99 | 1001.227 | n/a | n/a | n/a | 8.308 | n/a | 1.154 | 0.000 | 4.177 | 998.356 | 0.015 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.942 | 8.721 | 0.018 | 0.942 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f8623000000000000093f | 1002.206 | 0.102 | n/a | 0.000 | 0.000 | 0.399 | 1000.550 | 0.004 | 0.000 | 0.026 | 0.000 | n/a | n/a | 1.125 | 0.102 | 0.000 | 1.125 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000942 | 1001.227 | 2.292 | n/a | 0.000 | 0.000 | 0.472 | 998.356 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.063 | 2.292 | 0.002 | 0.063 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000885 | 513.245 | 13.774 | n/a | 0.531 | 0.000 | 2.519 | 496.202 | 0.004 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.172 | 14.305 | 0.028 | 0.172 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f86230000000000000877 | 508.151 | 2.316 | n/a | 0.000 | 0.000 | 0.272 | 505.457 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.063 | 2.316 | 0.005 | 0.063 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f8623000000000000091d | 507.896 | 2.936 | n/a | 0.000 | 0.000 | 0.381 | 504.471 | 0.005 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.079 | 2.936 | 0.006 | 0.079 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f8623000000000000093b | 506.271 | 2.493 | n/a | 0.715 | 0.000 | 0.603 | 502.310 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.100 | 3.208 | 0.006 | 0.100 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000008f2 | 505.720 | 5.636 | n/a | 0.000 | 0.000 | 1.859 | 498.074 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.122 | 5.636 | 0.011 | 0.122 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f8623000000000000090d | 505.483 | 4.624 | n/a | 1.164 | 0.000 | 0.529 | 498.959 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.157 | 5.788 | 0.011 | 0.157 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f86230000000000000834 | 505.048 | 2.191 | n/a | 0.000 | 0.000 | 2.684 | 500.050 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.067 | 2.191 | 0.004 | 0.067 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000905 | 504.702 | 6.147 | n/a | 1.099 | 0.000 | 0.776 | 496.479 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.169 | 7.246 | 0.014 | 0.169 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f86230000000000000902 | 504.607 | 8.308 | n/a | 0.000 | 0.000 | 0.781 | 495.407 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.078 | 8.308 | 0.016 | 0.078 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f862300000000000008a0 | 504.221 | 3.078 | n/a | 1.093 | 0.000 | 0.511 | 499.381 | 0.013 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.095 | 4.171 | 0.008 | 0.095 | gw-r/thread-46/journal/page | none observed |
| da3a95c7970f86230000000000000847 | 503.816 | 4.135 | n/a | 0.000 | 0.000 | 0.821 | 498.714 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.114 | 4.135 | 0.008 | 0.114 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f8623000000000000092e | 503.736 | 2.267 | n/a | 0.722 | 0.000 | 0.446 | 500.191 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.082 | 2.989 | 0.006 | 0.082 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f862300000000000008ed | 503.605 | 5.856 | n/a | 0.000 | 0.000 | 0.900 | 496.695 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.124 | 5.856 | 0.012 | 0.124 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000008a7 | 503.537 | 4.605 | n/a | 0.807 | 0.000 | 0.329 | 497.675 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.080 | 5.411 | 0.011 | 0.080 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000831 | 503.440 | 2.370 | n/a | 0.000 | 0.000 | 0.572 | 500.386 | 0.007 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.059 | 2.370 | 0.005 | 0.059 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f8623000000000000082f | 503.191 | 3.384 | n/a | 0.000 | 0.000 | 0.775 | 498.925 | 0.002 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.095 | 3.384 | 0.007 | 0.095 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f862300000000000008ae | 503.168 | 6.282 | n/a | 1.154 | 0.000 | 0.679 | 494.838 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.167 | 7.436 | 0.015 | 0.167 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000008e9 | 503.097 | 3.668 | n/a | 0.775 | 0.000 | 1.641 | 496.910 | 0.008 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.083 | 4.443 | 0.009 | 0.083 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-1000 / internal (154 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 999.909 | n/a | n/a | n/a | 3.127 | n/a | 0.000 | 0.000 | 0.580 | 995.444 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.080 | 3.386 | 0.003 | 0.080 |
| p99 | 1006.117 | n/a | n/a | n/a | 8.017 | n/a | 1.470 | 0.000 | 4.179 | 1001.117 | 0.017 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.106 | 8.897 | 0.590 | 1.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a95c7970f862300000000000009f1 | 1009.368 | 8.017 | n/a | 0.880 | 0.000 | 0.801 | 999.443 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.187 | 8.897 | 0.009 | 0.187 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000a16 | 1006.117 | 6.644 | n/a | 0.000 | 0.000 | 0.704 | 998.545 | 0.006 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.180 | 6.644 | 0.007 | 0.180 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f862300000000000009a3 | 1004.982 | 5.128 | n/a | 0.626 | 0.000 | 0.487 | 998.509 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.161 | 5.754 | 0.006 | 0.161 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000a48 | 1004.856 | 5.985 | n/a | 0.000 | 0.000 | 0.509 | 998.202 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.110 | 5.985 | 0.006 | 0.110 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f8623000000000000094f | 1004.822 | 10.892 | n/a | 0.000 | 0.000 | 0.713 | 993.074 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.114 | 10.892 | 0.011 | 0.114 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000a0f | 1004.357 | 3.624 | n/a | 0.000 | 0.000 | 0.771 | 999.851 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.066 | 3.624 | 0.004 | 0.066 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f8623000000000000099b | 1004.208 | 4.960 | n/a | 0.490 | 0.000 | 0.601 | 997.896 | 0.010 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.187 | 5.450 | 0.005 | 0.187 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000991 | 1004.160 | 2.959 | n/a | 0.556 | 0.000 | 0.366 | 1000.164 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.088 | 3.515 | 0.004 | 0.088 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f862300000000000009f7 | 1003.968 | 5.977 | n/a | 0.000 | 0.000 | 0.594 | 997.245 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.124 | 5.977 | 0.006 | 0.124 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000009d0 | 1003.907 | 5.432 | n/a | 0.000 | 0.000 | 0.699 | 997.629 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.112 | 5.432 | 0.005 | 0.112 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f86230000000000000a07 | 1003.848 | 4.879 | n/a | 0.780 | 0.000 | 0.391 | 997.662 | 0.010 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.089 | 5.659 | 0.006 | 0.089 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000a2a | 1003.788 | 2.374 | n/a | 0.000 | 0.000 | 0.469 | 1000.806 | 0.008 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.083 | 2.374 | 0.002 | 0.083 | gw-r/thread-44/journal/page | none observed |
| da3a95c7970f86230000000000000a00 | 1003.666 | 3.843 | n/a | 0.673 | 0.000 | 0.347 | 998.603 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.144 | 4.516 | 0.004 | 0.144 | gw-r/thread-48/journal/page | none observed |
| da3a95c7970f86230000000000000a59 | 1003.567 | 3.629 | n/a | 0.000 | 0.000 | 0.418 | 999.403 | 0.008 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.063 | 3.629 | 0.004 | 0.063 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f86230000000000000a42 | 1003.491 | 3.477 | n/a | 0.000 | 0.000 | 0.677 | 999.224 | 0.010 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.071 | 3.477 | 0.003 | 0.071 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f862300000000000009a9 | 1003.434 | 3.396 | n/a | 0.503 | 0.000 | 0.548 | 998.876 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.081 | 3.899 | 0.004 | 0.081 | gw-r/thread-47/journal/page | none observed |
| da3a95c7970f862300000000000009dd | 1003.403 | 5.531 | n/a | 0.000 | 0.000 | 0.626 | 997.110 | 0.005 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.108 | 5.531 | 0.006 | 0.108 | gw-r/thread-50/journal/page | none observed |
| da3a95c7970f862300000000000009e5 | 1003.214 | 5.688 | n/a | 0.000 | 0.000 | 0.586 | 996.779 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.117 | 5.688 | 0.006 | 0.117 | gw-r/thread-51/journal/page | none observed |
| da3a95c7970f86230000000000000a6a | 1003.128 | 3.236 | n/a | 0.000 | 0.000 | 4.179 | 995.569 | 0.009 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.104 | 3.236 | 0.003 | 0.104 | gw-r/thread-49/journal/page | none observed |
| da3a95c7970f8623000000000000095a | 1003.068 | 2.499 | n/a | 0.868 | 0.000 | 0.690 | 998.868 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.088 | 3.367 | 0.003 | 0.088 | gw-r/thread-50/journal/page | none observed |

## P3 / warmup / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.369 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.599 | 197.781 | 0.013 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.077 | 0.041 | 0.000 | 0.077 |
| p99 | 202.330 | n/a | n/a | n/a | 0.074 | n/a | 0.000 | 0.000 | 1.038 | 201.020 | 1.333 | 0.000 | 3.227 | 0.000 | n/a | n/a | 0.151 | 0.074 | 0.001 | 0.151 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f502500000000000000d1 | 202.330 | 0.051 | n/a | 0.000 | 0.000 | 1.007 | 201.020 | 0.022 | 0.000 | 0.090 | 0.000 | n/a | n/a | 0.139 | 0.051 | 0.000 | 0.139 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000000cf | 201.779 | 0.038 | n/a | 0.000 | 0.000 | 0.599 | 197.781 | 0.013 | 0.000 | 3.227 | 0.000 | n/a | n/a | 0.121 | 0.038 | 0.000 | 0.121 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000000ce | 201.605 | 0.041 | n/a | 0.000 | 0.000 | 0.567 | 200.853 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.077 | 0.041 | 0.000 | 0.077 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f502500000000000000d0 | 201.369 | 0.025 | n/a | 0.000 | 0.000 | 0.508 | 200.684 | 0.026 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.066 | 0.025 | 0.000 | 0.066 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f502500000000000000d2 | 134.345 | 0.057 | n/a | 0.000 | 0.000 | 1.038 | 133.118 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.074 | 0.057 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000002e | 52.134 | 0.074 | n/a | 0.000 | 0.000 | 0.808 | 49.730 | 1.333 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.151 | 0.074 | 0.001 | 0.151 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-10 / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.621 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.558 | 200.548 | 0.005 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.104 | 0.041 | 0.000 | 0.104 |
| p99 | 203.414 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.795 | 200.689 | 0.008 | 11.350 | 0.097 | 0.000 | n/a | n/a | 0.114 | 0.047 | 0.000 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f50250000000000000166 | 203.414 | 0.033 | n/a | 0.000 | 0.000 | 0.500 | 191.363 | 0.008 | 11.350 | 0.097 | 0.000 | n/a | n/a | 0.063 | 0.033 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000167 | 201.693 | 0.047 | n/a | 0.000 | 0.000 | 0.795 | 200.548 | 0.005 | 0.147 | 0.039 | 0.000 | n/a | n/a | 0.111 | 0.047 | 0.000 | 0.111 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000168 | 201.621 | 0.041 | n/a | 0.000 | 0.000 | 0.719 | 200.689 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.114 | 0.041 | 0.000 | 0.114 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000169 | 201.316 | 0.041 | n/a | 0.000 | 0.000 | 0.558 | 200.575 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.104 | 0.041 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f5025000000000000016a | 116.586 | 0.038 | n/a | 0.000 | 0.000 | 0.553 | 115.914 | 0.003 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.060 | 0.038 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-25 / read (6 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.033 | n/a | n/a | n/a | 0.038 | n/a | 0.000 | 0.000 | 0.485 | 200.539 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.097 | 0.038 | 0.000 | 0.097 |
| p99 | 201.783 | n/a | n/a | n/a | 0.112 | n/a | 0.000 | 0.000 | 1.655 | 200.805 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.157 | 0.112 | 0.001 | 0.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f50250000000000000202 | 201.783 | 0.038 | n/a | 0.000 | 0.000 | 0.786 | 200.805 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.097 | 0.038 | 0.000 | 0.097 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000201 | 201.733 | 0.038 | n/a | 0.000 | 0.000 | 0.920 | 200.632 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.099 | 0.038 | 0.000 | 0.099 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000203 | 201.228 | 0.027 | n/a | 0.000 | 0.000 | 0.450 | 200.645 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.054 | 0.027 | 0.000 | 0.054 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f50250000000000000200 | 201.033 | 0.028 | n/a | 0.000 | 0.000 | 0.368 | 200.539 | 0.006 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.053 | 0.028 | 0.000 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000204 | 134.094 | 0.112 | n/a | 0.000 | 0.000 | 1.655 | 132.132 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.149 | 0.112 | 0.001 | 0.149 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000001b0 | 66.443 | 0.057 | n/a | 0.000 | 0.000 | 0.485 | 65.709 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.157 | 0.057 | 0.001 | 0.157 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-50 / read (27 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 51.603 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.507 | 50.882 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.065 | 0.047 | 0.001 | 0.065 |
| p99 | 201.562 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 0.860 | 200.670 | 0.014 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.161 | 0.073 | 0.001 | 0.161 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f5025000000000000029b | 201.562 | 0.052 | n/a | 0.000 | 0.000 | 0.690 | 200.615 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.161 | 0.052 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f5025000000000000029a | 201.302 | 0.032 | n/a | 0.000 | 0.000 | 0.495 | 200.670 | 0.004 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.060 | 0.032 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000029c | 201.276 | 0.036 | n/a | 0.000 | 0.000 | 0.544 | 200.573 | 0.003 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.084 | 0.036 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f5025000000000000029d | 201.155 | 0.024 | n/a | 0.000 | 0.000 | 0.414 | 200.611 | 0.004 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.060 | 0.024 | 0.000 | 0.060 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f5025000000000000029e | 161.643 | 0.045 | n/a | 0.000 | 0.000 | 0.666 | 160.811 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.068 | 0.045 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000029f | 92.792 | 0.043 | n/a | 0.000 | 0.000 | 0.427 | 92.231 | 0.003 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.053 | 0.043 | 0.000 | 0.053 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f50250000000000000221 | 56.118 | 0.047 | n/a | 0.000 | 0.000 | 0.393 | 55.577 | 0.005 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.065 | 0.047 | 0.001 | 0.065 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f5025000000000000020e | 52.660 | 0.045 | n/a | 0.000 | 0.000 | 0.507 | 52.003 | 0.005 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.052 | 0.045 | 0.001 | 0.052 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000297 | 52.641 | 0.073 | n/a | 0.000 | 0.000 | 0.643 | 51.768 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.114 | 0.073 | 0.001 | 0.114 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f5025000000000000021b | 52.508 | 0.055 | n/a | 0.000 | 0.000 | 0.580 | 51.757 | 0.005 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.075 | 0.055 | 0.001 | 0.075 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000278 | 52.452 | 0.048 | n/a | 0.000 | 0.000 | 0.629 | 51.661 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.063 | 0.048 | 0.001 | 0.063 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000235 | 52.055 | 0.044 | n/a | 0.000 | 0.000 | 0.467 | 51.465 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.063 | 0.044 | 0.001 | 0.063 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000021d | 51.919 | 0.067 | n/a | 0.000 | 0.000 | 0.860 | 50.882 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 0.090 | 0.067 | 0.001 | 0.090 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000226 | 51.603 | 0.044 | n/a | 0.000 | 0.000 | 0.396 | 51.062 | 0.006 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.061 | 0.044 | 0.001 | 0.061 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f50250000000000000262 | 51.021 | 0.054 | n/a | 0.000 | 0.000 | 0.519 | 50.353 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.077 | 0.054 | 0.001 | 0.077 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000269 | 50.968 | 0.037 | n/a | 0.000 | 0.000 | 0.390 | 50.453 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.049 | 0.037 | 0.001 | 0.049 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f50250000000000000230 | 50.958 | 0.043 | n/a | 0.000 | 0.000 | 0.317 | 50.517 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.053 | 0.043 | 0.001 | 0.053 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f50250000000000000273 | 50.891 | 0.065 | n/a | 0.000 | 0.000 | 0.472 | 50.228 | 0.003 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.101 | 0.065 | 0.001 | 0.101 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000232 | 50.713 | 0.070 | n/a | 0.000 | 0.000 | 0.770 | 49.737 | 0.005 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.090 | 0.070 | 0.001 | 0.090 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000282 | 50.673 | 0.050 | n/a | 0.000 | 0.000 | 0.539 | 50.003 | 0.002 | 0.000 | 0.013 | 0.000 | n/a | n/a | 0.065 | 0.050 | 0.001 | 0.065 | gw-r/thread-48/journal/page | none observed |

## P3 / idle-100 / read (154 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 96.840 | n/a | n/a | n/a | 0.046 | n/a | 0.000 | 0.000 | 0.501 | 96.003 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.058 | 0.046 | 0.000 | 0.058 |
| p99 | 201.789 | n/a | n/a | n/a | 0.088 | n/a | 0.000 | 0.000 | 4.439 | 201.052 | 0.021 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.127 | 0.088 | 0.001 | 0.127 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f50250000000000000335 | 202.015 | 0.033 | n/a | 0.000 | 0.000 | 0.791 | 201.052 | 0.007 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.063 | 0.033 | 0.000 | 0.063 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000336 | 201.789 | 0.026 | n/a | 0.000 | 0.000 | 0.474 | 201.185 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.053 | 0.026 | 0.000 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000033a | 201.593 | 0.028 | n/a | 0.000 | 0.000 | 0.429 | 201.010 | 0.007 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.053 | 0.028 | 0.000 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000334 | 201.582 | 0.030 | n/a | 0.000 | 0.000 | 0.507 | 200.910 | 0.008 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.052 | 0.030 | 0.000 | 0.052 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f50250000000000000337 | 201.228 | 0.031 | n/a | 0.000 | 0.000 | 0.421 | 200.657 | 0.005 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.058 | 0.031 | 0.000 | 0.058 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000338 | 201.065 | 0.024 | n/a | 0.000 | 0.000 | 0.449 | 200.497 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.054 | 0.024 | 0.000 | 0.054 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f502500000000000002a8 | 122.063 | 0.069 | n/a | 0.000 | 0.000 | 0.918 | 120.944 | 0.002 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.098 | 0.069 | 0.001 | 0.098 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000002ca | 110.399 | 0.041 | n/a | 0.000 | 0.000 | 0.471 | 109.816 | 0.002 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.051 | 0.041 | 0.000 | 0.051 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000002d5 | 104.511 | 0.041 | n/a | 0.000 | 0.000 | 0.551 | 103.835 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.051 | 0.041 | 0.000 | 0.051 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000328 | 104.012 | 0.040 | n/a | 0.000 | 0.000 | 0.663 | 103.182 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.058 | 0.040 | 0.000 | 0.058 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f502500000000000002af | 103.998 | 0.041 | n/a | 0.000 | 0.000 | 0.362 | 103.510 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.050 | 0.041 | 0.000 | 0.050 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000002ba | 103.898 | 0.082 | n/a | 0.000 | 0.000 | 0.765 | 102.871 | 0.008 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.088 | 0.082 | 0.001 | 0.088 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f502500000000000002b1 | 103.610 | 0.040 | n/a | 0.000 | 0.000 | 0.473 | 103.033 | 0.002 | 0.000 | 0.010 | 0.000 | n/a | n/a | 0.051 | 0.040 | 0.000 | 0.051 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000002d0 | 102.559 | 0.038 | n/a | 0.000 | 0.000 | 0.867 | 101.584 | 0.002 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.051 | 0.038 | 0.000 | 0.051 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f502500000000000002c4 | 102.122 | 0.070 | n/a | 0.000 | 0.000 | 2.521 | 99.367 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.124 | 0.070 | 0.001 | 0.124 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000002ce | 101.807 | 0.049 | n/a | 0.000 | 0.000 | 0.554 | 101.111 | 0.007 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.061 | 0.049 | 0.000 | 0.061 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000302 | 101.443 | 0.042 | n/a | 0.000 | 0.000 | 0.460 | 100.821 | 0.008 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.050 | 0.042 | 0.000 | 0.050 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000310 | 101.264 | 0.062 | n/a | 0.000 | 0.000 | 0.603 | 100.489 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.076 | 0.062 | 0.001 | 0.076 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000002b8 | 101.137 | 0.046 | n/a | 0.000 | 0.000 | 0.486 | 100.515 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.061 | 0.046 | 0.000 | 0.061 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000002f9 | 101.012 | 0.049 | n/a | 0.000 | 0.000 | 0.429 | 100.457 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.055 | 0.049 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |

## P3 / idle-250 / read (155 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.287 | n/a | n/a | n/a | 0.033 | n/a | 0.000 | 0.000 | 0.478 | 200.590 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.059 | 0.033 | 0.000 | 0.059 |
| p99 | 204.167 | n/a | n/a | n/a | 0.069 | n/a | 0.000 | 0.000 | 3.160 | 201.561 | 0.017 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.120 | 0.069 | 0.000 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f50250000000000000414 | 204.189 | 0.031 | n/a | 0.000 | 0.000 | 3.105 | 200.931 | 0.008 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.050 | 0.031 | 0.000 | 0.050 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000410 | 204.167 | 0.031 | n/a | 0.000 | 0.000 | 3.091 | 200.936 | 0.007 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.054 | 0.031 | 0.000 | 0.054 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000003ce | 204.159 | 0.031 | n/a | 0.000 | 0.000 | 3.260 | 200.778 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.054 | 0.031 | 0.000 | 0.054 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f502500000000000003ec | 203.921 | 0.055 | n/a | 0.000 | 0.000 | 3.160 | 200.599 | 0.004 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.065 | 0.055 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000402 | 203.772 | 0.029 | n/a | 0.000 | 0.000 | 2.980 | 200.672 | 0.004 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.048 | 0.029 | 0.000 | 0.048 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000406 | 203.481 | 0.057 | n/a | 0.000 | 0.000 | 1.452 | 201.815 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.120 | 0.057 | 0.000 | 0.120 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000380 | 202.967 | 0.040 | n/a | 0.000 | 0.000 | 2.316 | 200.517 | 0.003 | 0.000 | 0.031 | 0.000 | n/a | n/a | 0.059 | 0.040 | 0.000 | 0.059 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000003a6 | 202.179 | 0.030 | n/a | 0.000 | 0.000 | 1.033 | 200.999 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.054 | 0.030 | 0.000 | 0.054 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000360 | 202.136 | 0.036 | n/a | 0.000 | 0.000 | 0.426 | 201.561 | 0.006 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.060 | 0.036 | 0.000 | 0.060 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000046a | 202.048 | 0.026 | n/a | 0.000 | 0.000 | 0.979 | 200.941 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.046 | 0.026 | 0.000 | 0.046 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000044e | 202.026 | 0.031 | n/a | 0.000 | 0.000 | 0.985 | 200.890 | 0.011 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.053 | 0.031 | 0.000 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000042e | 202.009 | 0.062 | n/a | 0.000 | 0.000 | 1.004 | 200.763 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.117 | 0.062 | 0.000 | 0.117 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000038e | 202.005 | 0.029 | n/a | 0.000 | 0.000 | 1.019 | 200.840 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.055 | 0.029 | 0.000 | 0.055 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f50250000000000000382 | 201.950 | 0.029 | n/a | 0.000 | 0.000 | 0.563 | 201.249 | 0.005 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.053 | 0.029 | 0.000 | 0.053 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000346 | 201.935 | 0.025 | n/a | 0.000 | 0.000 | 0.965 | 200.826 | 0.006 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.044 | 0.025 | 0.000 | 0.044 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000003be | 201.933 | 0.043 | n/a | 0.000 | 0.000 | 1.212 | 200.574 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.065 | 0.043 | 0.000 | 0.065 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000376 | 201.922 | 0.030 | n/a | 0.000 | 0.000 | 1.269 | 200.530 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.052 | 0.030 | 0.000 | 0.052 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000352 | 201.915 | 0.042 | n/a | 0.000 | 0.000 | 0.656 | 201.055 | 0.006 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.095 | 0.042 | 0.000 | 0.095 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f502500000000000003ee | 201.827 | 0.045 | n/a | 0.000 | 0.000 | 1.187 | 200.494 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.067 | 0.045 | 0.000 | 0.067 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000003de | 201.811 | 0.031 | n/a | 0.000 | 0.000 | 0.904 | 200.764 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.056 | 0.031 | 0.000 | 0.056 | gw-r/thread-50/journal/page | none observed |

## P3 / idle-500 / read (427 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.246 | n/a | n/a | n/a | 0.039 | n/a | 0.000 | 0.000 | 0.552 | 200.614 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.060 | 0.039 | 0.000 | 0.060 |
| p99 | 204.760 | n/a | n/a | n/a | 0.079 | n/a | 0.000 | 0.000 | 3.899 | 202.032 | 0.708 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.126 | 0.079 | 0.001 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f50250000000000000620 | 215.273 | 0.040 | n/a | 0.000 | 0.000 | 14.619 | 200.512 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.064 | 0.040 | 0.000 | 0.064 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f50250000000000000555 | 205.114 | 0.046 | n/a | 0.000 | 0.000 | 0.525 | 204.376 | 0.007 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.111 | 0.046 | 0.000 | 0.111 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000055d | 205.089 | 0.040 | n/a | 0.000 | 0.000 | 4.154 | 200.776 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.081 | 0.040 | 0.000 | 0.081 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000492 | 204.848 | 0.031 | n/a | 0.000 | 0.000 | 4.093 | 200.627 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.056 | 0.031 | 0.000 | 0.056 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f502500000000000005b8 | 204.760 | 0.052 | n/a | 0.000 | 0.000 | 3.663 | 200.903 | 0.007 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.070 | 0.052 | 0.000 | 0.070 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f5025000000000000049a | 204.676 | 0.037 | n/a | 0.000 | 0.000 | 0.516 | 204.018 | 0.004 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.057 | 0.037 | 0.000 | 0.057 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000005df | 204.423 | 0.038 | n/a | 0.000 | 0.000 | 0.697 | 203.577 | 0.005 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.068 | 0.038 | 0.000 | 0.068 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f502500000000000005e7 | 204.323 | 0.045 | n/a | 0.000 | 0.000 | 3.397 | 200.758 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.076 | 0.045 | 0.000 | 0.076 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000005af | 204.109 | 0.029 | n/a | 0.000 | 0.000 | 3.102 | 200.862 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.057 | 0.029 | 0.000 | 0.057 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f50250000000000000599 | 203.734 | 0.041 | n/a | 0.000 | 0.000 | 2.833 | 200.742 | 0.007 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.067 | 0.041 | 0.000 | 0.067 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f502500000000000005e2 | 203.297 | 0.053 | n/a | 0.000 | 0.000 | 2.293 | 200.837 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.061 | 0.053 | 0.000 | 0.061 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000053d | 203.183 | 0.046 | n/a | 0.000 | 0.000 | 2.231 | 200.744 | 0.004 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.121 | 0.046 | 0.000 | 0.121 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000572 | 203.139 | 0.045 | n/a | 0.000 | 0.000 | 2.525 | 200.470 | 0.004 | 0.000 | 0.028 | 0.000 | n/a | n/a | 0.066 | 0.045 | 0.000 | 0.066 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f5025000000000000062d | 203.120 | 0.032 | n/a | 0.000 | 0.000 | 0.578 | 202.412 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.059 | 0.032 | 0.000 | 0.059 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000055b | 203.090 | 0.029 | n/a | 0.000 | 0.000 | 2.312 | 200.656 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.056 | 0.029 | 0.000 | 0.056 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000617 | 203.027 | 0.034 | n/a | 0.000 | 0.000 | 2.186 | 200.687 | 0.007 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.052 | 0.034 | 0.000 | 0.052 | gw-r/thread-46/journal/page | none observed |
| c447e008c74f502500000000000005ea | 202.932 | 0.047 | n/a | 0.000 | 0.000 | 1.893 | 200.863 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.060 | 0.047 | 0.000 | 0.060 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f5025000000000000050f | 202.892 | 0.031 | n/a | 0.000 | 0.000 | 2.179 | 200.589 | 0.004 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.057 | 0.031 | 0.000 | 0.057 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000542 | 202.811 | 0.042 | n/a | 0.000 | 0.000 | 1.828 | 200.835 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.069 | 0.042 | 0.000 | 0.069 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000058a | 202.703 | 0.049 | n/a | 0.000 | 0.000 | 1.443 | 201.029 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.119 | 0.049 | 0.000 | 0.119 | gw-r/thread-46/journal/page | none observed |

## P3 / idle-1000 / read (754 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.335 | n/a | n/a | n/a | 0.031 | n/a | 0.000 | 0.000 | 0.531 | 200.632 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.061 | 0.031 | 0.000 | 0.061 |
| p99 | 203.833 | n/a | n/a | n/a | 0.073 | n/a | 0.000 | 0.000 | 1.763 | 201.276 | 0.026 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.153 | 0.073 | 0.001 | 0.153 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c447e008c74f50250000000000000775 | 205.235 | 0.022 | n/a | 0.000 | 0.000 | 4.627 | 200.484 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.055 | 0.022 | 0.000 | 0.055 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000703 | 205.162 | 0.039 | n/a | 0.000 | 0.000 | 3.990 | 200.986 | 0.005 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.089 | 0.039 | 0.000 | 0.089 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f50250000000000000722 | 204.785 | 0.032 | n/a | 0.000 | 0.000 | 0.526 | 204.122 | 0.004 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000007ea | 204.343 | 0.029 | n/a | 0.000 | 0.000 | 0.561 | 203.627 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.087 | 0.029 | 0.000 | 0.087 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000699 | 204.319 | 0.027 | n/a | 0.000 | 0.000 | 0.341 | 203.852 | 0.008 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.049 | 0.027 | 0.000 | 0.049 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000006a5 | 204.311 | 0.025 | n/a | 0.000 | 0.000 | 3.346 | 200.840 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.048 | 0.025 | 0.000 | 0.048 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f502500000000000006b0 | 204.020 | 0.027 | n/a | 0.000 | 0.000 | 0.517 | 203.384 | 0.004 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.053 | 0.027 | 0.000 | 0.053 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000090a | 203.833 | 0.035 | n/a | 0.000 | 0.000 | 2.649 | 200.959 | 0.010 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.107 | 0.035 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f50250000000000000813 | 203.624 | 0.023 | n/a | 0.000 | 0.000 | 0.422 | 203.076 | 0.006 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.057 | 0.023 | 0.000 | 0.057 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000008e7 | 203.193 | 0.022 | n/a | 0.000 | 0.000 | 2.134 | 200.937 | 0.009 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.049 | 0.022 | 0.000 | 0.049 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f5025000000000000070a | 202.740 | 0.028 | n/a | 0.000 | 0.000 | 1.763 | 200.818 | 0.019 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.059 | 0.028 | 0.000 | 0.059 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f50250000000000000815 | 202.704 | 0.045 | n/a | 0.000 | 0.000 | 1.774 | 200.685 | 0.007 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.153 | 0.045 | 0.000 | 0.153 | gw-r/thread-48/journal/page | none observed |
| c447e008c74f50250000000000000914 | 202.548 | 0.048 | n/a | 0.000 | 0.000 | 0.910 | 201.322 | 0.012 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.169 | 0.048 | 0.000 | 0.169 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f50250000000000000694 | 202.479 | 0.040 | n/a | 0.000 | 0.000 | 1.178 | 201.120 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.082 | 0.040 | 0.000 | 0.082 | gw-r/thread-49/journal/page | none observed |
| c447e008c74f502500000000000008f1 | 202.450 | 0.025 | n/a | 0.000 | 0.000 | 1.461 | 200.835 | 0.010 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.067 | 0.025 | 0.000 | 0.067 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f50250000000000000874 | 202.423 | 0.041 | n/a | 0.000 | 0.000 | 1.596 | 200.639 | 0.010 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.103 | 0.041 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| c447e008c74f5025000000000000081f | 202.356 | 0.023 | n/a | 0.000 | 0.000 | 1.323 | 200.897 | 0.005 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.063 | 0.023 | 0.000 | 0.063 | gw-r/thread-50/journal/page | none observed |
| c447e008c74f502500000000000006d0 | 202.331 | 0.039 | n/a | 0.000 | 0.000 | 1.265 | 200.909 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.062 | 0.039 | 0.000 | 0.062 | gw-r/thread-47/journal/page | none observed |
| c447e008c74f502500000000000007e9 | 202.321 | 0.037 | n/a | 0.000 | 0.000 | 0.601 | 201.449 | 0.009 | 0.000 | 0.061 | 0.000 | n/a | n/a | 0.164 | 0.037 | 0.000 | 0.164 | gw-r/thread-44/journal/page | none observed |
| c447e008c74f5025000000000000081d | 202.303 | 0.044 | n/a | 0.000 | 0.000 | 0.977 | 201.014 | 0.007 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.196 | 0.044 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 1250 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/1.949 ms; post-ACK p50/p99: 0.331/0.835 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 8.725 | 8.321 | 8.205 | reported |
| All-primary p99 ms | 20.602 | 20.291 | 19.753 | <=50 |
| L256 5-10 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 5-10 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 11-25 p50Ms | unavailable | unavailable | unavailable | <=10 |
| L256 11-25 p99Ms | unavailable | unavailable | unavailable | <=50 |
| L256 26-50 p50Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| L256 26-50 p99Ms | unavailable | unavailable | unavailable | p99<=100; p50 reported |
| Burst 5-10 p50 ms | unavailable | unavailable | unavailable | <=10 |
| Burst 11-25 p50 ms | unavailable | unavailable | unavailable | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | unavailable | unavailable | unavailable | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | unavailable | unavailable | unavailable | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5-10 | >=1000 | 7 | 9.263/35.961 | 8.886 | 4.884 | 11.276 | 0.079/0.018 |
| 5-10 | overlap | 53 | 11.030/38.431 | 10.469 | 6.462 | 15.134 | 0.071/0.018 |
| 5-10 | 0-50 | 593 | 9.071/20.894 | 8.621 | 4.875 | 12.366 | 0.069/0.017 |
| 5-10 | 250-1000 | 299 | 8.270/17.941 | 7.848 | 4.398 | 10.785 | 0.079/0.018 |
| 5-10 | 50-100 | 149 | 7.969/19.390 | 7.576 | 4.082 | 10.389 | 0.069/0.017 |
| 5-10 | 100-250 | 149 | 7.965/17.593 | 7.569 | 4.004 | 10.133 | 0.073/0.017 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1250 | 1 | 53.902 |

## Writer heap, GC and scheduler stalls

Source a0785bcf96f7afea3965b3028db2e27f4fbef6a9; 1250 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 371.831 / 413.184 |
| GC events / total duration / maximum ms | 245 / 515.912 / 29.646 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":241,"4":2,"8":2} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 20.602 / 1 / 53.902 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

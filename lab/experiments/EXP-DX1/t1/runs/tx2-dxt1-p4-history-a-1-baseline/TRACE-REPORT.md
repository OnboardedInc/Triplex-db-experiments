# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-49/peer.transact-await (includes order/network/storage)` (204.083 ms, trace `b3a652f8fbe566db0000000000000480`); `gw-w/thread-42/peer.transact-await (includes order/network/storage)` (168.340 ms, trace `b3a652f8fbe566db00000000000004e8`); `node-13/thread-0/driver.queue.subject` (138.952 ms, trace `b3a652f8fbe566db0000000000001f1b`); `gw-w/thread-46/peer.transact-await (includes order/network/storage)` (38.993 ms, trace `b3a652f8fbe566db0000000000001e4f`); `gw-w/thread-49/commit.prepare-and-validate` (135.014 ms, trace `b3a652f8fbe566db000000000000059d`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-history-a-1-baseline`; source `a057992d28395c9431fc578a145f4678ae26ea21`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8796298.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 325 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 13458.337 | 1069.335 | 1617.293 | 308 |
| L1 | 1 | 19955.904 | 1153.233 | 213.833 | 462 |
| L4 | 4 | 19970.193 | 1617.768 | 1524.953 | 426 |
| L16 | 16 | 19967.865 | 1404.309 | 1891.315 | 474 |
| L64 | 64 | 19970.025 | 1361.979 | 1908.533 | 596 |
| L256 | 256 | 19149.302 | 1551.163 | 2002.432 | 483 |
| tail | 0 | 84549.856 | 16933.172 | 1041.416 | 49445 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| b3a652f8fbe566db0000000000000480 | driver.queue.scheduler-dispatch | 0.062 | none | 0 / 32 |
| b3a652f8fbe566db0000000000000480 | driver.queue.scheduler-late | 0.006 | none | 0 / 32 |

Observed active steps while trace b3a652f8fbe566db0000000000000480 waited: []

| b3a652f8fbe566db00000000000004e8 | driver.queue.scheduler-dispatch | 0.069 | none | 0 / 32 |
| b3a652f8fbe566db00000000000004e8 | driver.queue.scheduler-late | 0.003 | none | 0 / 32 |

Observed active steps while trace b3a652f8fbe566db00000000000004e8 waited: []

| b3a652f8fbe566db0000000000001f1b | driver.queue.subject | 138.952 | b3a652f8fbe566db0000000000001f17 | 7 / 32 |
| b3a652f8fbe566db0000000000001f1b | driver.queue.scheduler-late | 7.792 | none | 7 / 32 |
| b3a652f8fbe566db0000000000001f1b | driver.queue.scheduler-dispatch | 0.085 | none | 5 / 32 |

Observed active steps while trace b3a652f8fbe566db0000000000001f1b waited: [{"at":1794600480135.8115,"inFlight":7,"capacity":32,"active":[{"traceId":"b3a652f8fbe566db0000000000001f11","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f12","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f13","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f14","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f16","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f18","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f19","step":"client.http"}]},{"at":1794600480168.5518,"inFlight":7,"capacity":32,"active":[{"traceId":"b3a652f8fbe566db0000000000001f12","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f13","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f14","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f16","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f18","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f19","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f17","step":"client.http"}]},{"at":1794600480189.6555,"inFlight":6,"capacity":32,"active":[{"traceId":"b3a652f8fbe566db0000000000001f14","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f16","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f18","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f19","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f17","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f15","step":"client.http"}]},{"at":1794600480231.3,"inFlight":7,"capacity":32,"active":[{"traceId":"b3a652f8fbe566db0000000000001f17","step":"driver.execute"},{"traceId":"b3a652f8fbe566db0000000000001f21","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f25","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f26","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f27","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f1a","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f1d","step":"client.http"}]},{"at":1794600480253.046,"inFlight":6,"capacity":32,"active":[{"traceId":"b3a652f8fbe566db0000000000001f17","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f1a","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f1d","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f2a","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f2e","step":"client.http"},{"traceId":"b3a652f8fbe566db0000000000001f30","step":"client.http"}]}]

| b3a652f8fbe566db0000000000001e4f | driver.queue.scheduler-dispatch | 0.161 | none | 1 / 32 |
| b3a652f8fbe566db0000000000001e4f | driver.queue.scheduler-late | 0.004 | none | 1 / 32 |

Observed active steps while trace b3a652f8fbe566db0000000000001e4f waited: []

| b3a652f8fbe566db000000000000059d | driver.queue.scheduler-late | 0.272 | none | 0 / 32 |
| b3a652f8fbe566db000000000000059d | driver.queue.scheduler-dispatch | 0.115 | none | 0 / 32 |

Observed active steps while trace b3a652f8fbe566db000000000000059d waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.302 | 0.548 | 0.000 | 0.771 | 6.338 | 0.039 | 0.000 | 0.110 | 1.574 | 7.411 | 0.045 | n/a | 0.458 | 14.296 | n/a | n/a | 0.057 | 7.164 | 0.240 | 0.057 |
| p99 | 127.186 | 5.337 | 4.599 | 11.570 | 57.813 | 1.152 | 1.421 | 1.095 | 15.015 | 35.504 | 0.329 | n/a | 3.797 | 71.521 | n/a | n/a | 3.899 | 58.436 | 0.459 | 3.899 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000436 | 127.186 | 57.813 | 0.554 | 0.000 | 0.070 | 5.793 | 35.504 | 0.329 | n/a | 0.488 | 26.576 | n/a | n/a | 0.059 | 58.436 | 0.459 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000448 | 106.542 | 4.810 | 0.226 | 0.000 | 0.063 | 1.234 | 28.333 | 0.049 | n/a | 0.259 | 71.521 | n/a | n/a | 0.048 | 5.099 | 0.048 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000433 | 68.293 | 25.113 | 0.039 | 0.000 | 0.757 | 0.995 | 16.901 | 0.190 | n/a | 1.174 | 22.714 | n/a | n/a | 0.411 | 25.909 | 0.379 | 0.411 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000464 | 55.306 | 4.166 | 0.229 | 0.283 | 0.059 | 15.015 | 12.299 | 0.050 | n/a | 1.348 | 21.783 | n/a | n/a | 0.074 | 4.737 | 0.086 | 0.074 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000043a | 55.009 | 9.569 | 1.051 | 0.000 | 0.063 | 9.333 | 14.848 | 0.050 | n/a | 0.649 | 19.375 | n/a | n/a | 0.072 | 10.682 | 0.194 | 0.072 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000046a | 50.775 | 15.405 | 0.271 | 1.421 | 0.090 | 1.574 | 11.153 | 0.054 | n/a | 3.570 | 17.188 | n/a | n/a | 0.050 | 17.186 | 0.338 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000044e | 49.375 | 7.326 | 0.366 | 0.000 | 0.059 | 1.631 | 10.640 | 0.045 | n/a | 0.295 | 28.976 | n/a | n/a | 0.037 | 7.751 | 0.157 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 1.154ms |
| b3a652f8fbe566db000000000000045c | 47.917 | 8.388 | 1.152 | 0.348 | 0.057 | 2.362 | 15.820 | 0.080 | n/a | 3.783 | 15.888 | n/a | n/a | 0.039 | 9.945 | 0.208 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000446 | 44.541 | 10.318 | 0.275 | 0.000 | 0.089 | 3.234 | 18.358 | 0.060 | n/a | 0.437 | 11.703 | n/a | n/a | 0.069 | 10.681 | 0.240 | 0.069 | gw-w/thread-46/gateway.admitted-work | driver.worker-message 1.624ms |
| b3a652f8fbe566db000000000000044b | 43.554 | 4.993 | 0.004 | 0.000 | 0.299 | 0.773 | 1.610 | 0.028 | n/a | 0.704 | 35.074 | n/a | n/a | 0.069 | 5.296 | 0.122 | 0.069 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000458 | 42.526 | 5.336 | 0.329 | 0.443 | 0.055 | 2.266 | 13.188 | 0.042 | n/a | 0.254 | 16.714 | n/a | n/a | 3.899 | 6.164 | 0.145 | 3.899 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000043e | 40.553 | 4.460 | 0.385 | 0.000 | 0.063 | 5.177 | 17.905 | 0.050 | n/a | 0.288 | 12.162 | n/a | n/a | 0.063 | 4.909 | 0.121 | 0.063 | gw-w/thread-45/gateway.admitted-work | none observed |
| b3a652f8fbe566db0000000000000440 | 39.551 | 9.359 | 0.214 | 0.000 | 0.110 | 2.870 | 12.129 | 0.043 | n/a | 0.458 | 14.296 | n/a | n/a | 0.073 | 9.683 | 0.245 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000460 | 37.862 | 11.559 | 0.160 | 0.495 | 0.054 | 1.629 | 8.984 | 0.060 | n/a | 0.622 | 14.264 | n/a | n/a | 0.034 | 12.269 | 0.324 | 0.034 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000452 | 36.302 | 6.722 | 0.692 | 0.424 | 0.058 | 1.971 | 10.598 | 0.041 | n/a | 0.522 | 15.220 | n/a | n/a | 0.055 | 7.895 | 0.217 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000438 | 34.659 | 12.348 | 0.009 | 0.000 | 0.924 | 3.863 | 1.265 | 0.034 | n/a | 3.797 | 12.066 | n/a | n/a | 0.355 | 13.281 | 0.383 | 0.355 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000450 | 32.210 | 6.338 | 0.798 | 0.352 | 0.094 | 6.639 | 6.850 | 0.075 | n/a | 0.410 | 10.608 | n/a | n/a | 0.046 | 7.583 | 0.235 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000455 | 31.271 | 3.646 | 0.005 | 0.000 | 0.638 | 0.840 | 1.965 | 0.053 | n/a | 0.474 | 23.608 | n/a | n/a | 0.041 | 4.289 | 0.137 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000045a | 31.124 | 10.394 | 0.006 | 0.000 | 0.241 | 0.732 | 2.548 | 0.041 | n/a | 0.199 | 16.896 | n/a | n/a | 0.068 | 10.640 | 0.342 | 0.068 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000443 | 30.348 | 8.671 | 0.007 | 0.000 | 0.445 | 1.593 | 5.187 | 0.046 | n/a | 0.205 | 14.129 | n/a | n/a | 0.066 | 9.122 | 0.301 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.269 | 0.887 | 0.000 | 1.749 | 3.794 | 0.005 | 0.000 | 0.638 | 0.839 | 1.681 | 0.031 | n/a | 0.474 | 12.066 | n/a | n/a | 0.047 | 4.289 | 0.266 | 0.047 |
| p99 | 34.659 | 1.321 | 4.599 | 8.150 | 12.348 | 0.011 | 0.000 | 1.095 | 3.863 | 2.584 | 0.053 | n/a | 3.797 | 23.608 | n/a | n/a | 0.355 | 13.281 | 0.383 | 0.355 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000438 | 34.659 | 12.348 | 0.009 | 0.000 | 0.924 | 3.863 | 1.265 | 0.034 | n/a | 3.797 | 12.066 | n/a | n/a | 0.355 | 13.281 | 0.383 | 0.355 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000455 | 31.271 | 3.646 | 0.005 | 0.000 | 0.638 | 0.840 | 1.965 | 0.053 | n/a | 0.474 | 23.608 | n/a | n/a | 0.041 | 4.289 | 0.137 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000461 | 29.311 | 4.633 | 0.005 | 0.000 | 1.000 | 0.971 | 2.333 | 0.032 | n/a | 1.585 | 18.682 | n/a | n/a | 0.070 | 5.638 | 0.192 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000043c | 21.778 | 6.427 | 0.005 | 0.000 | 0.128 | 0.667 | 1.237 | 0.025 | n/a | 0.606 | 12.569 | n/a | n/a | 0.115 | 6.560 | 0.301 | 0.115 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000465 | 19.269 | 3.794 | 0.005 | 0.000 | 0.445 | 0.647 | 1.750 | 0.031 | n/a | 0.187 | 12.365 | n/a | n/a | 0.044 | 4.245 | 0.220 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000453 | 15.929 | 4.073 | 0.004 | 0.000 | 0.155 | 0.721 | 1.180 | 0.023 | n/a | 0.195 | 9.538 | n/a | n/a | 0.040 | 4.232 | 0.266 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000045d | 15.808 | 3.191 | 0.011 | 0.000 | 0.796 | 0.839 | 2.584 | 0.026 | n/a | 0.511 | 7.801 | n/a | n/a | 0.047 | 3.999 | 0.253 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000468 | 14.452 | 3.401 | 0.005 | 0.000 | 0.610 | 1.035 | 1.681 | 0.041 | n/a | 0.414 | 7.227 | n/a | n/a | 0.039 | 4.016 | 0.278 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000441 | 12.037 | 3.203 | 0.004 | 0.000 | 1.095 | 0.527 | 1.348 | 0.023 | n/a | 0.145 | 5.634 | n/a | n/a | 0.057 | 4.302 | 0.357 | 0.057 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 87.133 | n/a | n/a | n/a | 43.004 | 16.502 | 2.578 | 0.000 | 0.361 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.437 | 71.304 | 0.920 | 4.437 |
| p99 | 395.796 | n/a | n/a | n/a | 97.482 | 322.370 | 20.761 | 0.000 | 2.110 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 177.921 | 390.966 | 1.000 | 177.921 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000001e95 | 395.796 | 66.249 | 317.859 | 6.858 | 0.000 | 0.394 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.437 | 390.966 | 0.988 | 4.437 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 2.633ms; driver.publication 2.094ms; driver.publication 1.723ms |
| b3a652f8fbe566db0000000000001e8f | 387.742 | 35.856 | 312.256 | 2.578 | 0.000 | 0.596 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.455 | 350.690 | 0.904 | 36.455 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.publication 2.094ms |
| b3a652f8fbe566db0000000000001e7f | 386.934 | 73.790 | 224.927 | 5.610 | 0.000 | 0.571 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 82.035 | 304.327 | 0.787 | 82.035 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.publication 2.094ms |
| b3a652f8fbe566db0000000000001e90 | 380.218 | 57.246 | 237.304 | 8.213 | 0.000 | 0.379 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 77.076 | 302.763 | 0.796 | 77.076 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.publication 2.094ms |
| b3a652f8fbe566db0000000000001e96 | 351.351 | 23.955 | 322.370 | 1.271 | 0.000 | 0.748 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.007 | 347.596 | 0.989 | 3.007 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 2.633ms; driver.publication 2.094ms; driver.publication 1.723ms |
| b3a652f8fbe566db0000000000001e74 | 315.678 | 46.624 | 87.351 | 2.931 | 0.000 | 0.851 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 177.921 | 136.906 | 0.434 | 177.921 | node-13/thread-3/socket.wait-first-byte | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.568ms; driver.publication 4.359ms; driver.publication 2.633ms |
| b3a652f8fbe566db0000000000001e89 | 296.058 | 54.806 | 104.852 | 8.172 | 0.000 | 0.451 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 127.776 | 167.831 | 0.567 | 127.776 | node-13/thread-3/socket.wait-first-byte | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.publication 2.094ms |
| b3a652f8fbe566db0000000000001e92 | 210.986 | 53.652 | 108.578 | 4.810 | 0.000 | 0.408 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.537 | 167.040 | 0.792 | 43.537 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.expected-state.bind-receipt 1.529ms |
| b3a652f8fbe566db00000000000007f7 | 197.718 | 97.461 | 58.428 | 16.759 | 0.000 | 1.414 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.656 | 172.648 | 0.873 | 23.656 | node-13/thread-3/client.reach | driver.publication 105.514ms; driver.publication 1.610ms; driver.publication 1.175ms; driver.expected-state.bind-receipt 1.066ms |
| b3a652f8fbe566db0000000000001e91 | 190.176 | 36.873 | 53.235 | 2.578 | 0.000 | 0.277 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 97.213 | 92.686 | 0.487 | 97.213 | node-13/thread-3/socket.wait-first-byte | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.expected-state.bind-receipt 1.529ms |
| b3a652f8fbe566db0000000000001e76 | 179.158 | 24.704 | 52.752 | 1.950 | 0.000 | 0.361 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.391 | 79.406 | 0.443 | 99.391 | node-13/thread-3/socket.wait-first-byte | driver.publication 4.359ms; driver.publication 2.633ms; driver.expected-state.bind-receipt 1.920ms; driver.publication 1.901ms; driver.publication 1.825ms |
| b3a652f8fbe566db0000000000001e8b | 171.206 | 56.235 | 16.090 | 11.409 | 0.000 | 0.437 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 87.035 | 83.734 | 0.489 | 87.035 | node-13/thread-3/socket.wait-first-byte | driver.publication 7.314ms; driver.publication 5.385ms; driver.publication 4.359ms; driver.publication 2.633ms; driver.publication 1.825ms |
| b3a652f8fbe566db0000000000001e6f | 143.852 | 81.560 | 46.868 | 15.407 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.016 | 143.836 | 1.000 | 0.016 | node-13/thread-2/replica.pull-at | driver.publication 4.568ms; driver.expected-state.bind-receipt 1.920ms; driver.publication 1.901ms; driver.publication 1.618ms; driver.publication 1.539ms |
| b3a652f8fbe566db0000000000001e7b | 141.524 | 66.443 | 32.488 | 9.174 | 0.000 | 0.385 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.034 | 108.105 | 0.764 | 33.034 | node-13/thread-3/socket.wait-first-byte | driver.publication 4.359ms; driver.publication 2.633ms; driver.expected-state.bind-receipt 1.920ms; driver.publication 1.901ms; driver.publication 1.825ms |
| b3a652f8fbe566db0000000000001e70 | 139.576 | 81.575 | 42.582 | 15.407 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 139.564 | 1.000 | 0.011 | node-13/thread-2/replica.pull-at | driver.publication 4.568ms; driver.expected-state.bind-receipt 1.920ms; driver.publication 1.901ms; driver.publication 1.618ms; driver.publication 1.539ms |
| b3a652f8fbe566db0000000000001341 | 135.697 | 69.627 | 1.498 | 8.337 | 0.000 | 0.528 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 55.707 | 79.462 | 0.586 | 55.707 | node-13/thread-3/socket.wait-first-byte | driver.publication 3.582ms; driver.publication 2.279ms; driver.publication 1.881ms; driver.publication 1.873ms; driver.publication 1.749ms |
| b3a652f8fbe566db00000000000019ac | 128.563 | 97.482 | 9.977 | 15.809 | 0.000 | 0.965 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.331 | 123.268 | 0.959 | 4.331 | node-13/thread-3/worker.gateway-observer.observe | driver.publication 1.690ms; driver.expected-state.bind-receipt 1.666ms; driver.publication 1.589ms; driver.publication 1.376ms; driver.publication 1.156ms |
| b3a652f8fbe566db0000000000000e36 | 127.835 | 78.733 | 1.275 | 7.881 | 0.000 | 0.693 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 39.253 | 87.890 | 0.688 | 39.253 | node-13/thread-3/client.reach | client.encode 2.884ms; driver.publication 1.634ms; driver.publication 1.274ms |
| b3a652f8fbe566db00000000000013ca | 124.678 | 54.420 | 1.467 | 8.515 | 0.000 | 0.349 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 59.927 | 64.402 | 0.517 | 59.927 | node-13/thread-3/socket.wait-first-byte | driver.publication 3.401ms; driver.expected-state.bind-receipt 2.798ms; driver.publication 2.468ms; driver.publication 1.851ms; driver.publication 1.741ms |
| b3a652f8fbe566db0000000000001e4c | 122.504 | 94.971 | 27.513 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 122.485 | 1.000 | 0.020 | node-13/thread-2/replica.pull-at | driver.publication 5.990ms; driver.publication 1.794ms; driver.expected-state.bind-receipt 1.021ms |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.545 | 0.507 | 0.000 | 0.474 | 4.648 | 0.260 | 0.000 | 0.055 | 1.354 | 8.788 | 0.043 | n/a | 0.221 | 13.382 | n/a | n/a | 0.061 | 6.121 | 0.162 | 0.061 |
| p99 | 43.905 | 0.639 | 0.000 | 0.875 | 5.806 | 2.129 | 0.270 | 0.063 | 5.498 | 21.720 | 0.071 | n/a | 0.607 | 14.399 | n/a | n/a | 0.074 | 7.110 | 0.172 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db000000000000046c | 43.905 | 4.648 | 2.129 | 0.270 | 0.063 | 1.354 | 21.720 | 0.043 | n/a | 0.221 | 13.382 | n/a | n/a | 0.074 | 7.110 | 0.162 | 0.074 | gw-w/thread-46/gateway.admitted-work | none observed |
| b3a652f8fbe566db000000000000061b | 35.545 | 5.806 | 0.260 | 0.000 | 0.055 | 5.498 | 8.788 | 0.071 | n/a | 0.607 | 14.399 | n/a | n/a | 0.061 | 6.121 | 0.172 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.174 | 0.514 | 0.000 | 1.331 | 5.176 | 0.012 | 0.000 | 0.122 | 1.241 | 5.971 | 0.043 | n/a | 0.673 | 12.668 | n/a | n/a | 0.049 | 6.408 | 0.220 | 0.049 |
| p99 | 271.050 | 2.603 | 4.246 | 7.732 | 13.052 | 3.399 | 2.038 | 2.595 | 5.086 | 55.909 | 0.104 | n/a | 3.947 | 204.083 | n/a | n/a | 0.130 | 13.254 | 0.447 | 0.130 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000480 | 271.050 | 6.034 | 0.353 | 0.318 | 0.067 | 1.580 | 55.909 | 0.104 | n/a | 2.472 | 204.083 | n/a | n/a | 0.130 | 6.772 | 0.025 | 0.130 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000470 | 144.645 | 5.171 | 0.255 | 0.281 | 0.047 | 1.860 | 13.861 | 0.053 | n/a | 0.226 | 122.845 | n/a | n/a | 0.045 | 5.755 | 0.040 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000490 | 59.791 | 9.240 | 0.006 | 0.000 | 0.642 | 0.781 | 5.971 | 0.033 | n/a | 0.271 | 42.781 | n/a | n/a | 0.065 | 9.888 | 0.165 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000491 | 59.448 | 4.489 | 0.146 | 0.293 | 0.042 | 1.923 | 41.142 | 0.041 | n/a | 0.716 | 10.621 | n/a | n/a | 0.034 | 4.971 | 0.084 | 0.034 | gw-w/thread-44/gateway.admitted-work | driver.publication 1.345ms; driver.expected-state.bind-receipt 1.114ms |
| b3a652f8fbe566db0000000000000489 | 57.849 | 3.980 | 0.005 | 0.000 | 0.978 | 0.595 | 1.343 | 0.032 | n/a | 0.260 | 50.591 | n/a | n/a | 0.066 | 4.963 | 0.086 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004a8 | 48.193 | 9.275 | 0.224 | 2.038 | 0.076 | 5.086 | 14.513 | 0.098 | n/a | 0.411 | 16.422 | n/a | n/a | 0.049 | 11.613 | 0.241 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000047d | 45.786 | 13.052 | 0.008 | 0.000 | 0.195 | 1.019 | 3.153 | 0.087 | n/a | 1.157 | 27.023 | n/a | n/a | 0.093 | 13.254 | 0.289 | 0.093 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000484 | 43.677 | 5.923 | 0.167 | 0.245 | 0.072 | 1.241 | 22.616 | 0.100 | n/a | 0.366 | 12.903 | n/a | n/a | 0.044 | 6.408 | 0.147 | 0.044 | gw-w/thread-46/gateway.admitted-work | none observed |
| b3a652f8fbe566db00000000000004b2 | 42.653 | 6.520 | 0.171 | 0.000 | 0.059 | 2.276 | 13.780 | 0.062 | n/a | 0.302 | 19.439 | n/a | n/a | 0.042 | 6.750 | 0.158 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000048c | 42.126 | 5.176 | 0.225 | 0.432 | 0.050 | 1.719 | 11.054 | 0.085 | n/a | 2.379 | 20.968 | n/a | n/a | 0.039 | 5.882 | 0.140 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004ab | 40.015 | 4.035 | 0.153 | 0.242 | 0.013 | 3.992 | 18.095 | 0.039 | n/a | 0.518 | 12.903 | n/a | n/a | 0.025 | 4.443 | 0.111 | 0.025 | gw-w/thread-42/gateway.admitted-work | driver.publication 1.468ms |
| b3a652f8fbe566db0000000000000498 | 39.150 | 4.316 | 0.163 | 0.289 | 0.043 | 1.529 | 14.520 | 0.054 | n/a | 3.594 | 14.608 | n/a | n/a | 0.033 | 4.811 | 0.123 | 0.033 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000482 | 37.861 | 6.042 | 0.225 | 0.448 | 0.054 | 1.638 | 11.048 | 0.055 | n/a | 3.947 | 14.312 | n/a | n/a | 0.093 | 6.769 | 0.179 | 0.093 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000475 | 36.053 | 4.188 | 0.005 | 0.000 | 0.753 | 0.696 | 1.216 | 0.027 | n/a | 0.194 | 28.923 | n/a | n/a | 0.049 | 4.947 | 0.137 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000047a | 35.176 | 5.973 | 0.164 | 0.405 | 0.056 | 1.603 | 16.171 | 0.045 | n/a | 1.496 | 9.220 | n/a | n/a | 0.045 | 6.597 | 0.188 | 0.045 | gw-w/thread-47/gateway.admitted-work | none observed |
| b3a652f8fbe566db00000000000004a4 | 33.139 | 6.992 | 3.399 | 0.294 | 0.042 | 1.469 | 11.423 | 0.069 | n/a | 0.273 | 9.132 | n/a | n/a | 0.046 | 10.727 | 0.324 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004bc | 32.201 | 5.145 | 0.274 | 0.000 | 0.052 | 1.543 | 11.599 | 0.087 | n/a | 0.791 | 12.672 | n/a | n/a | 0.037 | 5.471 | 0.170 | 0.037 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004aa | 31.674 | 5.032 | 0.010 | 0.000 | 0.727 | 0.912 | 5.836 | 0.055 | n/a | 2.582 | 16.475 | n/a | n/a | 0.044 | 5.769 | 0.182 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000472 | 31.465 | 7.855 | 0.012 | 0.000 | 0.590 | 1.347 | 1.352 | 0.029 | n/a | 3.609 | 16.575 | n/a | n/a | 0.094 | 8.457 | 0.269 | 0.094 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004be | 31.344 | 9.121 | 0.176 | 0.675 | 0.079 | 4.475 | 8.063 | 0.035 | n/a | 0.278 | 8.368 | n/a | n/a | 0.075 | 10.050 | 0.321 | 0.075 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.421 | 0.561 | 0.000 | 1.617 | 3.755 | 0.005 | 0.000 | 0.819 | 0.696 | 1.343 | 0.032 | n/a | 0.299 | 6.478 | n/a | n/a | 0.049 | 4.947 | 0.270 | 0.049 |
| p99 | 57.849 | 1.138 | 0.085 | 1.874 | 9.446 | 0.012 | 0.000 | 2.595 | 2.063 | 5.366 | 0.058 | n/a | 3.567 | 50.591 | n/a | n/a | 0.076 | 9.752 | 0.403 | 0.076 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000489 | 57.849 | 3.980 | 0.005 | 0.000 | 0.978 | 0.595 | 1.343 | 0.032 | n/a | 0.260 | 50.591 | n/a | n/a | 0.066 | 4.963 | 0.086 | 0.066 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000475 | 36.053 | 4.188 | 0.005 | 0.000 | 0.753 | 0.696 | 1.216 | 0.027 | n/a | 0.194 | 28.923 | n/a | n/a | 0.049 | 4.947 | 0.137 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000478 | 24.190 | 9.446 | 0.012 | 0.000 | 0.294 | 1.885 | 5.065 | 0.051 | n/a | 0.885 | 6.478 | n/a | n/a | 0.074 | 9.752 | 0.403 | 0.074 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004ba | 23.171 | 3.655 | 0.005 | 0.000 | 2.595 | 2.063 | 5.366 | 0.055 | n/a | 3.567 | 5.822 | n/a | n/a | 0.044 | 6.255 | 0.270 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.530ms; driver.publication 0.138ms |
| b3a652f8fbe566db000000000000049e | 16.421 | 2.877 | 0.004 | 0.000 | 0.870 | 0.546 | 1.864 | 0.049 | n/a | 0.737 | 9.439 | n/a | n/a | 0.034 | 3.751 | 0.228 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000493 | 16.185 | 4.537 | 0.007 | 0.000 | 0.643 | 1.023 | 0.945 | 0.025 | n/a | 0.227 | 8.701 | n/a | n/a | 0.076 | 5.187 | 0.320 | 0.076 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004a2 | 13.764 | 3.755 | 0.009 | 0.000 | 1.069 | 0.884 | 2.509 | 0.058 | n/a | 0.299 | 5.110 | n/a | n/a | 0.071 | 4.833 | 0.351 | 0.071 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004b0 | 12.124 | 3.389 | 0.003 | 0.000 | 0.819 | 0.693 | 1.238 | 0.027 | n/a | 0.525 | 5.403 | n/a | n/a | 0.027 | 4.211 | 0.347 | 0.027 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.692 | 0.520 | 0.000 | 0.772 | 4.560 | 0.097 | 0.000 | 0.094 | 1.329 | 3.539 | 0.047 | n/a | 0.356 | 11.550 | n/a | n/a | 0.052 | 5.450 | 0.223 | 0.052 |
| p99 | 184.936 | 2.404 | 0.102 | 4.317 | 11.858 | 2.064 | 0.380 | 1.173 | 6.166 | 30.740 | 0.124 | n/a | 1.399 | 168.340 | n/a | n/a | 0.086 | 12.089 | 0.459 | 0.086 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db00000000000004e8 | 184.936 | 4.836 | 0.295 | 0.000 | 0.072 | 1.379 | 8.905 | 0.077 | n/a | 0.953 | 168.340 | n/a | n/a | 0.080 | 5.203 | 0.028 | 0.080 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004ca | 50.975 | 8.049 | 0.180 | 0.000 | 0.075 | 1.711 | 30.740 | 0.090 | n/a | 0.232 | 9.849 | n/a | n/a | 0.048 | 8.304 | 0.163 | 0.048 | gw-w/thread-47/gateway.admitted-work | none observed |
| b3a652f8fbe566db00000000000004e0 | 45.472 | 6.214 | 0.168 | 0.000 | 0.084 | 3.160 | 16.090 | 0.073 | n/a | 1.110 | 18.532 | n/a | n/a | 0.041 | 6.466 | 0.142 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004d2 | 44.889 | 4.524 | 2.064 | 0.380 | 0.080 | 2.059 | 18.271 | 0.079 | n/a | 0.444 | 16.933 | n/a | n/a | 0.055 | 7.048 | 0.157 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004f9 | 42.965 | 11.858 | 0.006 | 0.000 | 0.225 | 1.891 | 3.627 | 0.113 | n/a | 0.460 | 24.698 | n/a | n/a | 0.086 | 12.089 | 0.281 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004e4 | 41.958 | 6.189 | 0.543 | 0.000 | 0.068 | 2.461 | 15.110 | 0.124 | n/a | 0.356 | 17.056 | n/a | n/a | 0.051 | 6.800 | 0.162 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000504 | 38.572 | 5.573 | 0.170 | 0.000 | 0.089 | 4.167 | 8.787 | 0.039 | n/a | 0.482 | 19.197 | n/a | n/a | 0.069 | 5.832 | 0.151 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.705ms |
| b3a652f8fbe566db00000000000004d4 | 37.211 | 9.123 | 0.097 | 0.000 | 0.053 | 2.480 | 12.819 | 0.062 | n/a | 0.232 | 12.292 | n/a | n/a | 0.053 | 9.273 | 0.249 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.worker-message 0.604ms |
| b3a652f8fbe566db00000000000004f2 | 36.994 | 5.294 | 0.097 | 0.000 | 0.058 | 1.650 | 17.893 | 0.058 | n/a | 0.320 | 11.547 | n/a | n/a | 0.077 | 5.450 | 0.147 | 0.077 | gw-w/thread-42/gateway.admitted-work | none observed |
| b3a652f8fbe566db00000000000004c2 | 33.689 | 8.363 | 0.218 | 0.000 | 0.051 | 1.597 | 8.350 | 0.054 | n/a | 0.503 | 14.513 | n/a | n/a | 0.040 | 8.632 | 0.256 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000050e | 33.519 | 7.259 | 0.154 | 0.000 | 0.053 | 6.166 | 7.997 | 0.045 | n/a | 0.252 | 11.550 | n/a | n/a | 0.043 | 7.466 | 0.223 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004da | 32.827 | 3.304 | 1.236 | 0.000 | 0.051 | 2.420 | 9.859 | 0.094 | n/a | 0.241 | 15.582 | n/a | n/a | 0.039 | 4.591 | 0.140 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.697ms |
| b3a652f8fbe566db00000000000004e6 | 32.575 | 4.219 | 0.270 | 0.000 | 0.062 | 1.905 | 8.903 | 0.072 | n/a | 0.940 | 16.156 | n/a | n/a | 0.048 | 4.552 | 0.140 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004ec | 32.359 | 3.667 | 0.198 | 0.000 | 0.101 | 0.990 | 7.394 | 0.034 | n/a | 0.425 | 19.490 | n/a | n/a | 0.060 | 3.966 | 0.123 | 0.060 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004bf | 29.452 | 3.811 | 0.005 | 0.000 | 0.211 | 0.668 | 1.419 | 0.029 | n/a | 0.496 | 22.769 | n/a | n/a | 0.044 | 4.027 | 0.137 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004fc | 28.643 | 3.766 | 0.221 | 0.000 | 0.087 | 1.297 | 8.769 | 0.032 | n/a | 0.265 | 14.150 | n/a | n/a | 0.057 | 4.074 | 0.142 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004cb | 28.533 | 4.232 | 0.005 | 0.000 | 0.094 | 0.703 | 2.006 | 0.036 | n/a | 0.241 | 21.170 | n/a | n/a | 0.045 | 4.332 | 0.152 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004f8 | 28.524 | 4.621 | 0.887 | 0.000 | 0.052 | 1.627 | 10.167 | 0.045 | n/a | 0.251 | 10.814 | n/a | n/a | 0.060 | 5.560 | 0.195 | 0.060 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004c4 | 28.376 | 2.993 | 0.005 | 0.000 | 0.129 | 0.675 | 1.247 | 0.050 | n/a | 0.278 | 22.962 | n/a | n/a | 0.039 | 3.127 | 0.110 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000508 | 27.692 | 5.857 | 0.236 | 0.000 | 0.067 | 2.232 | 10.072 | 0.052 | n/a | 0.232 | 8.889 | n/a | n/a | 0.055 | 6.160 | 0.222 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.055 | 0.552 | 0.000 | 1.643 | 4.177 | 0.005 | 0.000 | 0.389 | 0.812 | 1.419 | 0.045 | n/a | 0.368 | 8.907 | n/a | n/a | 0.053 | 4.795 | 0.234 | 0.053 |
| p99 | 29.452 | 1.143 | 0.000 | 2.195 | 5.770 | 0.015 | 0.000 | 1.173 | 2.531 | 2.841 | 0.102 | n/a | 0.900 | 22.962 | n/a | n/a | 0.078 | 6.922 | 0.459 | 0.078 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db00000000000004bf | 29.452 | 3.811 | 0.005 | 0.000 | 0.211 | 0.668 | 1.419 | 0.029 | n/a | 0.496 | 22.769 | n/a | n/a | 0.044 | 4.027 | 0.137 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004c4 | 28.376 | 2.993 | 0.005 | 0.000 | 0.129 | 0.675 | 1.247 | 0.050 | n/a | 0.278 | 22.962 | n/a | n/a | 0.039 | 3.127 | 0.110 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004f3 | 24.910 | 4.400 | 0.005 | 0.000 | 0.389 | 2.531 | 2.107 | 0.047 | n/a | 0.320 | 15.058 | n/a | n/a | 0.052 | 4.795 | 0.192 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000509 | 22.338 | 4.198 | 0.010 | 0.000 | 1.029 | 0.812 | 1.569 | 0.054 | n/a | 0.412 | 14.195 | n/a | n/a | 0.058 | 5.238 | 0.234 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004e9 | 19.388 | 5.770 | 0.015 | 0.000 | 1.137 | 1.451 | 2.063 | 0.062 | n/a | 0.900 | 7.913 | n/a | n/a | 0.078 | 6.922 | 0.357 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004cf | 19.055 | 4.177 | 0.005 | 0.000 | 0.772 | 0.982 | 2.841 | 0.102 | n/a | 0.368 | 9.754 | n/a | n/a | 0.053 | 4.954 | 0.260 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004d7 | 17.530 | 4.560 | 0.009 | 0.000 | 0.351 | 0.859 | 2.045 | 0.045 | n/a | 0.699 | 8.907 | n/a | n/a | 0.054 | 4.920 | 0.281 | 0.054 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000501 | 13.780 | 2.615 | 0.005 | 0.000 | 0.595 | 0.560 | 1.013 | 0.031 | n/a | 0.201 | 8.717 | n/a | n/a | 0.043 | 3.214 | 0.233 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000004d5 | 11.886 | 4.278 | 0.009 | 0.000 | 1.173 | 0.851 | 1.037 | 0.031 | n/a | 0.510 | 3.935 | n/a | n/a | 0.061 | 5.461 | 0.459 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000050b | 9.729 | 3.222 | 0.005 | 0.000 | 0.104 | 0.734 | 1.033 | 0.029 | n/a | 0.207 | 4.337 | n/a | n/a | 0.059 | 3.330 | 0.342 | 0.059 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 30.363 | 0.518 | 0.000 | 1.281 | 5.154 | 0.012 | 0.000 | 0.124 | 1.334 | 7.004 | 0.038 | n/a | 0.467 | 13.381 | n/a | n/a | 0.052 | 5.784 | 0.216 | 0.052 |
| p99 | 129.999 | 2.995 | 0.011 | 4.145 | 15.757 | 1.767 | 0.000 | 1.968 | 5.373 | 19.409 | 0.092 | n/a | 4.422 | 118.934 | n/a | n/a | 0.106 | 16.848 | 0.431 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000547 | 129.999 | 5.529 | 0.005 | 0.000 | 1.968 | 1.053 | 1.907 | 0.035 | n/a | 0.485 | 118.934 | n/a | n/a | 0.082 | 7.502 | 0.058 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000055c | 69.817 | 6.313 | 0.243 | 0.000 | 0.056 | 1.476 | 11.626 | 0.043 | n/a | 0.370 | 49.639 | n/a | n/a | 0.050 | 6.613 | 0.095 | 0.050 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000533 | 67.613 | 15.757 | 0.011 | 0.000 | 1.080 | 4.797 | 19.409 | 0.092 | n/a | 0.506 | 25.855 | n/a | n/a | 0.106 | 16.848 | 0.249 | 0.106 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000517 | 50.930 | 7.552 | 0.006 | 0.000 | 0.353 | 2.319 | 4.701 | 0.021 | n/a | 2.593 | 33.331 | n/a | n/a | 0.054 | 7.910 | 0.155 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.038ms |
| b3a652f8fbe566db000000000000051e | 48.842 | 9.597 | 0.143 | 0.000 | 0.097 | 4.853 | 13.061 | 0.070 | n/a | 1.144 | 19.807 | n/a | n/a | 0.070 | 9.837 | 0.201 | 0.070 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000053e | 40.938 | 6.593 | 0.222 | 0.000 | 0.144 | 2.220 | 18.401 | 0.059 | n/a | 0.404 | 12.814 | n/a | n/a | 0.082 | 6.959 | 0.170 | 0.082 | gw-w/thread-44/gateway.admitted-work | none observed |
| b3a652f8fbe566db0000000000000530 | 40.849 | 10.711 | 0.239 | 0.000 | 0.050 | 1.813 | 11.481 | 0.072 | n/a | 1.081 | 15.361 | n/a | n/a | 0.040 | 11.001 | 0.269 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000554 | 40.814 | 12.005 | 0.167 | 0.000 | 0.066 | 2.063 | 9.367 | 0.080 | n/a | 1.042 | 15.977 | n/a | n/a | 0.048 | 12.237 | 0.300 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000051f | 40.805 | 6.202 | 0.008 | 0.000 | 0.882 | 1.237 | 18.004 | 0.030 | n/a | 0.925 | 13.451 | n/a | n/a | 0.066 | 7.092 | 0.174 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000516 | 39.793 | 6.851 | 0.008 | 0.000 | 0.756 | 0.990 | 1.353 | 0.027 | n/a | 0.561 | 29.195 | n/a | n/a | 0.052 | 7.615 | 0.191 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000054e | 35.996 | 4.816 | 0.343 | 0.000 | 0.096 | 2.222 | 8.586 | 0.039 | n/a | 0.248 | 19.591 | n/a | n/a | 0.055 | 5.254 | 0.146 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000562 | 35.084 | 8.525 | 0.281 | 0.000 | 0.054 | 4.180 | 9.535 | 0.047 | n/a | 0.479 | 11.938 | n/a | n/a | 0.045 | 8.860 | 0.253 | 0.045 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000546 | 34.470 | 5.828 | 0.359 | 0.000 | 0.090 | 5.373 | 8.011 | 0.043 | n/a | 0.228 | 14.485 | n/a | n/a | 0.053 | 6.277 | 0.182 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000055e | 34.135 | 8.156 | 1.001 | 0.000 | 0.057 | 1.510 | 11.010 | 0.061 | n/a | 0.771 | 11.527 | n/a | n/a | 0.043 | 9.214 | 0.270 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 2.622ms |
| b3a652f8fbe566db000000000000053c | 33.732 | 10.605 | 1.106 | 0.000 | 0.092 | 2.659 | 8.542 | 0.065 | n/a | 0.306 | 10.289 | n/a | n/a | 0.066 | 11.804 | 0.350 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000051b | 33.644 | 7.962 | 0.269 | 0.000 | 0.049 | 1.947 | 9.626 | 0.059 | n/a | 1.499 | 12.191 | n/a | n/a | 0.043 | 8.280 | 0.246 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000552 | 32.408 | 9.751 | 0.448 | 0.000 | 0.083 | 1.611 | 7.637 | 0.038 | n/a | 0.244 | 12.526 | n/a | n/a | 0.070 | 10.282 | 0.317 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000522 | 32.282 | 3.723 | 0.285 | 0.000 | 0.046 | 1.204 | 9.095 | 0.067 | n/a | 4.422 | 13.381 | n/a | n/a | 0.060 | 4.053 | 0.126 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000523 | 31.957 | 12.675 | 0.012 | 0.000 | 1.086 | 0.993 | 2.056 | 0.026 | n/a | 0.706 | 14.324 | n/a | n/a | 0.079 | 13.773 | 0.431 | 0.079 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000055a | 31.173 | 6.503 | 1.767 | 0.000 | 0.100 | 1.774 | 7.004 | 0.036 | n/a | 0.252 | 13.676 | n/a | n/a | 0.060 | 8.370 | 0.269 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.658 | 0.852 | 0.000 | 1.726 | 3.710 | 0.005 | 0.000 | 0.756 | 0.822 | 1.236 | 0.030 | n/a | 0.422 | 13.451 | n/a | n/a | 0.051 | 4.726 | 0.209 | 0.051 |
| p99 | 129.999 | 1.921 | 0.011 | 3.437 | 6.851 | 0.010 | 0.000 | 1.968 | 4.430 | 18.004 | 0.058 | n/a | 0.925 | 118.934 | n/a | n/a | 0.082 | 7.615 | 0.430 | 0.082 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000547 | 129.999 | 5.529 | 0.005 | 0.000 | 1.968 | 1.053 | 1.907 | 0.035 | n/a | 0.485 | 118.934 | n/a | n/a | 0.082 | 7.502 | 0.058 | 0.082 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000051f | 40.805 | 6.202 | 0.008 | 0.000 | 0.882 | 1.237 | 18.004 | 0.030 | n/a | 0.925 | 13.451 | n/a | n/a | 0.066 | 7.092 | 0.174 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000516 | 39.793 | 6.851 | 0.008 | 0.000 | 0.756 | 0.990 | 1.353 | 0.027 | n/a | 0.561 | 29.195 | n/a | n/a | 0.052 | 7.615 | 0.191 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000052d | 23.469 | 3.301 | 0.004 | 0.000 | 0.265 | 4.430 | 1.183 | 0.033 | n/a | 0.422 | 13.780 | n/a | n/a | 0.051 | 3.571 | 0.152 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000539 | 22.717 | 4.721 | 0.010 | 0.000 | 1.053 | 0.822 | 1.992 | 0.055 | n/a | 0.597 | 13.390 | n/a | n/a | 0.076 | 5.784 | 0.255 | 0.076 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000512 | 22.634 | 2.936 | 0.005 | 0.000 | 0.089 | 0.651 | 1.096 | 0.024 | n/a | 0.179 | 17.615 | n/a | n/a | 0.040 | 3.029 | 0.134 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000527 | 22.544 | 4.727 | 0.010 | 0.000 | 0.207 | 0.739 | 1.140 | 0.034 | n/a | 0.496 | 15.135 | n/a | n/a | 0.058 | 4.944 | 0.219 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000555 | 21.658 | 3.996 | 0.005 | 0.000 | 0.784 | 0.903 | 1.236 | 0.032 | n/a | 0.308 | 14.337 | n/a | n/a | 0.056 | 4.786 | 0.221 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000529 | 21.360 | 3.081 | 0.005 | 0.000 | 0.973 | 0.724 | 1.154 | 0.029 | n/a | 0.467 | 14.887 | n/a | n/a | 0.041 | 4.059 | 0.190 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000054f | 18.488 | 2.761 | 0.004 | 0.000 | 0.595 | 0.714 | 1.718 | 0.058 | n/a | 0.389 | 12.207 | n/a | n/a | 0.041 | 3.361 | 0.182 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000543 | 17.526 | 3.635 | 0.005 | 0.000 | 0.124 | 0.554 | 1.247 | 0.029 | n/a | 0.198 | 11.686 | n/a | n/a | 0.048 | 3.764 | 0.215 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000054b | 16.352 | 3.710 | 0.006 | 0.000 | 1.009 | 0.884 | 1.126 | 0.030 | n/a | 0.254 | 9.289 | n/a | n/a | 0.044 | 4.726 | 0.289 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000050f | 15.614 | 3.104 | 0.006 | 0.000 | 0.151 | 0.848 | 1.092 | 0.026 | n/a | 0.430 | 9.915 | n/a | n/a | 0.043 | 3.261 | 0.209 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000052b | 12.428 | 3.000 | 0.005 | 0.000 | 0.602 | 0.558 | 3.891 | 0.023 | n/a | 0.172 | 4.136 | n/a | n/a | 0.040 | 3.607 | 0.290 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000055f | 11.916 | 4.153 | 0.005 | 0.000 | 0.971 | 0.766 | 1.146 | 0.031 | n/a | 0.225 | 4.563 | n/a | n/a | 0.055 | 5.129 | 0.430 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.238 | 0.635 | 0.000 | 1.534 | 4.656 | 0.009 | 0.000 | 0.283 | 1.397 | 6.278 | 0.042 | n/a | 0.466 | 12.753 | n/a | n/a | 0.054 | 5.400 | 0.235 | 0.054 |
| p99 | 169.212 | 2.930 | 2.230 | 5.277 | 13.003 | 2.124 | 0.000 | 1.226 | 10.400 | 136.234 | 1.771 | n/a | 3.447 | 138.315 | n/a | n/a | 0.112 | 14.193 | 0.436 | 0.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db000000000000059d | 169.212 | 9.921 | 0.014 | 0.000 | 0.387 | 1.020 | 136.234 | 0.048 | n/a | 0.226 | 21.279 | n/a | n/a | 0.083 | 10.322 | 0.061 | 0.083 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| b3a652f8fbe566db00000000000005bb | 154.567 | 3.217 | 0.169 | 0.000 | 0.046 | 1.118 | 10.557 | 0.074 | n/a | 1.033 | 138.315 | n/a | n/a | 0.039 | 3.432 | 0.022 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005a0 | 127.287 | 3.691 | 0.160 | 0.000 | 0.045 | 1.181 | 15.459 | 0.034 | n/a | 0.553 | 106.108 | n/a | n/a | 0.056 | 3.896 | 0.031 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000588 | 126.757 | 4.646 | 0.213 | 0.000 | 0.055 | 1.894 | 8.588 | 0.038 | n/a | 0.599 | 110.684 | n/a | n/a | 0.040 | 4.915 | 0.039 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005a1 | 116.657 | 5.605 | 0.009 | 0.000 | 0.986 | 0.746 | 0.789 | 0.024 | n/a | 0.375 | 108.076 | n/a | n/a | 0.049 | 6.600 | 0.057 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005a2 | 100.258 | 5.598 | 0.005 | 0.000 | 0.876 | 3.257 | 0.789 | 0.025 | n/a | 0.416 | 89.227 | n/a | n/a | 0.065 | 6.479 | 0.065 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.105ms |
| b3a652f8fbe566db00000000000005a3 | 97.195 | 4.105 | 0.005 | 0.000 | 0.096 | 4.540 | 6.941 | 0.029 | n/a | 0.179 | 81.258 | n/a | n/a | 0.042 | 4.207 | 0.043 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 3.304ms; driver.publication 1.105ms |
| b3a652f8fbe566db00000000000005aa | 54.625 | 9.790 | 0.205 | 0.000 | 1.092 | 8.970 | 19.124 | 0.046 | n/a | 0.603 | 14.739 | n/a | n/a | 0.056 | 11.088 | 0.203 | 0.056 | gw-w/thread-45/gateway.admitted-work | none observed |
| b3a652f8fbe566db0000000000000576 | 47.069 | 13.003 | 1.134 | 0.000 | 0.056 | 1.832 | 13.268 | 0.112 | n/a | 0.699 | 16.896 | n/a | n/a | 0.070 | 14.193 | 0.302 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000058a | 46.917 | 12.033 | 0.154 | 0.000 | 0.060 | 1.584 | 17.300 | 0.087 | n/a | 0.372 | 15.267 | n/a | n/a | 0.060 | 12.247 | 0.261 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005ad | 44.813 | 7.216 | 2.124 | 0.000 | 0.137 | 2.186 | 14.539 | 0.090 | n/a | 0.466 | 17.945 | n/a | n/a | 0.112 | 9.477 | 0.211 | 0.112 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000573 | 40.122 | 8.308 | 0.007 | 0.000 | 0.437 | 0.720 | 15.567 | 0.063 | n/a | 0.307 | 14.633 | n/a | n/a | 0.081 | 8.751 | 0.218 | 0.081 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000598 | 38.813 | 10.867 | 0.166 | 0.000 | 0.059 | 2.343 | 10.542 | 0.042 | n/a | 0.308 | 14.435 | n/a | n/a | 0.052 | 11.092 | 0.286 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005c5 | 38.541 | 11.195 | 0.359 | 0.000 | 0.083 | 1.420 | 9.612 | 0.048 | n/a | 0.237 | 15.500 | n/a | n/a | 0.087 | 11.637 | 0.302 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.828ms; driver.publication 1.242ms |
| b3a652f8fbe566db000000000000057e | 38.534 | 8.398 | 0.164 | 0.000 | 0.058 | 1.406 | 9.772 | 0.081 | n/a | 3.420 | 15.184 | n/a | n/a | 0.050 | 8.620 | 0.224 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000056f | 36.619 | 4.656 | 0.418 | 0.000 | 0.053 | 1.382 | 7.384 | 0.043 | n/a | 0.198 | 22.421 | n/a | n/a | 0.063 | 5.128 | 0.140 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000059c | 34.505 | 3.649 | 0.236 | 0.000 | 0.055 | 1.629 | 14.226 | 0.089 | n/a | 0.927 | 13.655 | n/a | n/a | 0.039 | 3.940 | 0.114 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000578 | 32.556 | 3.640 | 0.225 | 0.000 | 0.108 | 1.083 | 11.388 | 0.028 | n/a | 0.440 | 15.585 | n/a | n/a | 0.059 | 3.973 | 0.122 | 0.059 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005ab | 32.400 | 7.068 | 0.006 | 0.000 | 1.226 | 10.400 | 10.485 | 0.099 | n/a | 0.766 | 2.302 | n/a | n/a | 0.048 | 8.299 | 0.256 | 0.048 | node-13/thread-0/socket.wait-first-byte | none observed |
| b3a652f8fbe566db0000000000000586 | 31.532 | 4.090 | 0.105 | 0.000 | 0.053 | 1.397 | 9.154 | 0.052 | n/a | 0.598 | 16.039 | n/a | n/a | 0.044 | 4.248 | 0.135 | 0.044 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.812 | 0.635 | 0.000 | 1.749 | 4.365 | 0.005 | 0.000 | 0.720 | 0.946 | 1.103 | 0.030 | n/a | 0.416 | 5.259 | n/a | n/a | 0.054 | 4.821 | 0.300 | 0.054 |
| p99 | 116.657 | 1.861 | 2.230 | 5.277 | 7.068 | 0.010 | 0.000 | 1.226 | 10.400 | 10.485 | 1.771 | n/a | 1.253 | 108.076 | n/a | n/a | 0.103 | 8.299 | 0.436 | 0.103 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db00000000000005a1 | 116.657 | 5.605 | 0.009 | 0.000 | 0.986 | 0.746 | 0.789 | 0.024 | n/a | 0.375 | 108.076 | n/a | n/a | 0.049 | 6.600 | 0.057 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005a2 | 100.258 | 5.598 | 0.005 | 0.000 | 0.876 | 3.257 | 0.789 | 0.025 | n/a | 0.416 | 89.227 | n/a | n/a | 0.065 | 6.479 | 0.065 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.105ms |
| b3a652f8fbe566db00000000000005ab | 32.400 | 7.068 | 0.006 | 0.000 | 1.226 | 10.400 | 10.485 | 0.099 | n/a | 0.766 | 2.302 | n/a | n/a | 0.048 | 8.299 | 0.256 | 0.048 | node-13/thread-0/socket.wait-first-byte | none observed |
| b3a652f8fbe566db0000000000000571 | 30.523 | 5.467 | 0.007 | 0.000 | 0.856 | 2.986 | 2.067 | 0.077 | n/a | 0.422 | 18.537 | n/a | n/a | 0.103 | 6.331 | 0.207 | 0.103 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000058c | 29.562 | 6.883 | 0.005 | 0.000 | 0.765 | 3.893 | 1.040 | 1.771 | n/a | 0.491 | 14.679 | n/a | n/a | 0.036 | 7.652 | 0.259 | 0.036 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.933ms |
| b3a652f8fbe566db0000000000000564 | 23.099 | 3.998 | 0.005 | 0.000 | 0.214 | 5.932 | 7.310 | 0.068 | n/a | 0.259 | 5.259 | n/a | n/a | 0.052 | 4.217 | 0.183 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005b0 | 22.152 | 4.365 | 0.005 | 0.000 | 0.261 | 1.043 | 0.909 | 0.024 | n/a | 0.229 | 15.250 | n/a | n/a | 0.067 | 4.630 | 0.209 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000056c | 17.072 | 4.025 | 0.005 | 0.000 | 1.084 | 0.742 | 1.199 | 0.187 | n/a | 0.894 | 8.867 | n/a | n/a | 0.069 | 5.114 | 0.300 | 0.069 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000568 | 13.812 | 4.114 | 0.005 | 0.000 | 0.705 | 0.780 | 1.194 | 0.030 | n/a | 0.484 | 6.446 | n/a | n/a | 0.054 | 4.824 | 0.349 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000579 | 13.718 | 4.528 | 0.010 | 0.000 | 0.283 | 0.963 | 1.535 | 0.042 | n/a | 0.861 | 5.430 | n/a | n/a | 0.066 | 4.821 | 0.351 | 0.066 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005be | 13.066 | 4.440 | 0.006 | 0.000 | 0.347 | 1.811 | 1.103 | 0.026 | n/a | 0.273 | 4.985 | n/a | n/a | 0.075 | 4.793 | 0.367 | 0.075 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005b8 | 12.397 | 4.402 | 0.010 | 0.000 | 0.989 | 0.811 | 1.081 | 0.025 | n/a | 0.171 | 4.829 | n/a | n/a | 0.080 | 5.400 | 0.436 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005a7 | 11.565 | 3.323 | 0.005 | 0.000 | 0.774 | 0.946 | 1.113 | 0.053 | n/a | 1.253 | 4.060 | n/a | n/a | 0.038 | 4.102 | 0.355 | 0.038 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005c2 | 10.110 | 3.782 | 0.009 | 0.000 | 0.402 | 0.775 | 0.760 | 0.024 | n/a | 0.175 | 4.089 | n/a | n/a | 0.094 | 4.193 | 0.415 | 0.094 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000583 | 10.077 | 3.110 | 0.005 | 0.000 | 0.720 | 0.579 | 1.036 | 0.031 | n/a | 0.480 | 4.069 | n/a | n/a | 0.047 | 3.835 | 0.381 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000596 | 9.435 | 2.931 | 0.005 | 0.000 | 0.276 | 0.547 | 1.246 | 0.029 | n/a | 0.186 | 4.173 | n/a | n/a | 0.042 | 3.212 | 0.340 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.113 | 0.535 | 0.000 | 1.656 | 5.588 | 0.012 | 0.000 | 0.176 | 1.330 | 2.634 | 0.040 | n/a | 0.364 | 11.035 | n/a | n/a | 0.056 | 6.407 | 0.282 | 0.056 |
| p99 | 144.143 | 3.341 | 13.538 | 18.438 | 64.501 | n/a | 0.000 | 5.960 | 19.986 | 54.145 | 0.175 | n/a | 3.942 | 121.255 | n/a | n/a | 0.115 | 64.774 | 0.637 | 0.115 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000000619 | 144.143 | 7.126 | 0.256 | 0.000 | 0.083 | 1.585 | 12.150 | 0.092 | n/a | 1.536 | 121.255 | n/a | n/a | 0.060 | 7.465 | 0.052 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005ed | 143.193 | 16.059 | 0.012 | 0.000 | 0.563 | 1.236 | 7.577 | 0.041 | n/a | 3.396 | 114.193 | n/a | n/a | 0.115 | 16.635 | 0.116 | 0.115 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005d6 | 101.757 | 64.501 | 0.233 | 0.000 | 0.040 | 1.478 | 16.233 | 0.030 | n/a | 0.381 | 18.827 | n/a | n/a | 0.034 | 64.774 | 0.637 | 0.034 | node-13/thread-8/client.persist-and-resolve | none observed |
| b3a652f8fbe566db0000000000000613 | 89.082 | 25.363 | 0.006 | 0.000 | 0.355 | 1.273 | 2.634 | 0.033 | n/a | 1.258 | 58.075 | n/a | n/a | 0.084 | 25.723 | 0.289 | 0.084 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000614 | 83.694 | 4.314 | 1.095 | 0.000 | 0.059 | 8.113 | 54.145 | 0.048 | n/a | 0.598 | 15.263 | n/a | n/a | 0.059 | 5.469 | 0.065 | 0.059 | gw-w/thread-48/gateway.admitted-work | driver.expected-state.bind-receipt 12.804ms; driver.publication 5.110ms |
| b3a652f8fbe566db0000000000000600 | 66.518 | 6.325 | 0.177 | 0.000 | 0.046 | 1.182 | 6.868 | 0.029 | n/a | 0.185 | 51.662 | n/a | n/a | 0.043 | 6.549 | 0.098 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005f0 | 42.645 | 11.307 | 0.200 | 0.000 | 0.061 | 2.869 | 16.268 | 0.047 | n/a | 0.619 | 11.233 | n/a | n/a | 0.041 | 11.568 | 0.271 | 0.041 | gw-w/thread-45/gateway.admitted-work | none observed |
| b3a652f8fbe566db00000000000005dc | 40.382 | 6.870 | 1.340 | 0.000 | 0.064 | 7.638 | 7.837 | 0.038 | n/a | 0.391 | 16.137 | n/a | n/a | 0.067 | 8.274 | 0.205 | 0.067 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005f8 | 39.293 | 13.767 | 0.194 | 0.000 | 0.061 | 2.115 | 13.162 | 0.053 | n/a | 0.227 | 9.655 | n/a | n/a | 0.061 | 14.021 | 0.357 | 0.061 | gw-w/thread-46/gateway.admitted-work | none observed |
| b3a652f8fbe566db000000000000060f | 35.008 | 3.929 | n/a | 0.000 | 0.159 | 19.986 | 10.691 | 0.051 | n/a | 0.104 | 0.000 | n/a | n/a | 0.088 | 4.088 | 0.117 | 0.088 | node-13/thread-0/socket.wait-first-byte | none observed |
| b3a652f8fbe566db00000000000005de | 34.057 | 9.039 | 0.476 | 0.000 | 0.096 | 1.856 | 8.953 | 0.053 | n/a | 0.292 | 13.212 | n/a | n/a | 0.079 | 9.611 | 0.282 | 0.079 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005f6 | 33.309 | 8.610 | 0.287 | 0.000 | 0.049 | 1.808 | 9.940 | 0.042 | n/a | 0.235 | 12.285 | n/a | n/a | 0.053 | 8.946 | 0.269 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005cb | 31.589 | 4.430 | 0.330 | 0.000 | 0.083 | 4.044 | 6.527 | 0.058 | n/a | 0.348 | 15.697 | n/a | n/a | 0.072 | 4.843 | 0.153 | 0.072 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000060e | 31.313 | 5.901 | 0.156 | 0.000 | 0.050 | 1.431 | 11.497 | 0.046 | n/a | 0.493 | 11.696 | n/a | n/a | 0.043 | 6.107 | 0.195 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005e8 | 30.860 | 7.066 | 1.677 | 0.000 | 0.056 | 2.517 | 6.518 | 0.045 | n/a | 0.341 | 12.600 | n/a | n/a | 0.038 | 8.800 | 0.285 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005ec | 30.632 | 5.510 | 0.338 | 0.000 | 0.066 | 2.164 | 13.338 | 0.175 | n/a | 0.933 | 8.025 | n/a | n/a | 0.085 | 5.914 | 0.193 | 0.085 | gw-w/thread-42/gateway.admitted-work | none observed |
| b3a652f8fbe566db0000000000000604 | 30.546 | 3.712 | 0.234 | 0.000 | 0.051 | 1.330 | 10.635 | 0.060 | n/a | 0.230 | 14.250 | n/a | n/a | 0.044 | 3.997 | 0.131 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005e4 | 30.492 | 5.981 | 0.223 | 0.000 | 0.052 | 3.048 | 5.395 | 0.082 | n/a | 0.391 | 15.229 | n/a | n/a | 0.090 | 6.256 | 0.205 | 0.090 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000611 | 27.038 | 6.330 | 0.206 | 0.000 | 0.053 | 2.137 | 6.008 | 0.041 | n/a | 0.264 | 11.959 | n/a | n/a | 0.040 | 6.589 | 0.244 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000601 | 26.587 | 4.021 | 0.006 | 0.000 | 0.541 | 0.484 | 1.319 | 0.032 | n/a | 0.183 | 19.948 | n/a | n/a | 0.052 | 4.568 | 0.172 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.010 | 0.817 | 0.000 | 1.855 | 4.974 | 0.006 | 0.000 | 0.611 | 0.987 | 1.319 | 0.033 | n/a | 0.290 | 6.774 | n/a | n/a | 0.053 | 6.092 | 0.352 | 0.053 |
| p99 | 35.008 | 2.024 | 3.021 | 6.548 | 11.529 | n/a | 0.000 | 5.960 | 19.986 | 10.691 | 0.057 | n/a | 3.942 | 19.948 | n/a | n/a | 0.095 | 12.243 | 0.524 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db000000000000060f | 35.008 | 3.929 | n/a | 0.000 | 0.159 | 19.986 | 10.691 | 0.051 | n/a | 0.104 | 0.000 | n/a | n/a | 0.088 | 4.088 | 0.117 | 0.088 | node-13/thread-0/socket.wait-first-byte | none observed |
| b3a652f8fbe566db0000000000000601 | 26.587 | 4.021 | 0.006 | 0.000 | 0.541 | 0.484 | 1.319 | 0.032 | n/a | 0.183 | 19.948 | n/a | n/a | 0.052 | 4.568 | 0.172 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005c6 | 24.633 | 4.974 | 0.005 | 0.000 | 1.702 | 1.581 | 0.885 | 0.020 | n/a | 0.487 | 14.939 | n/a | n/a | 0.041 | 6.681 | 0.271 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005f1 | 23.374 | 11.529 | 0.005 | 0.000 | 0.709 | 0.643 | 1.000 | 0.033 | n/a | 0.193 | 9.217 | n/a | n/a | 0.046 | 12.243 | 0.524 | 0.046 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000609 | 20.952 | 3.589 | 0.005 | 0.000 | 5.960 | 4.859 | 1.160 | 0.039 | n/a | 0.207 | 5.083 | n/a | n/a | 0.049 | 9.555 | 0.456 | 0.049 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| b3a652f8fbe566db00000000000005e1 | 20.097 | 9.352 | 0.011 | 0.000 | 0.176 | 0.837 | 1.196 | 0.039 | n/a | 0.210 | 8.181 | n/a | n/a | 0.095 | 9.539 | 0.475 | 0.095 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005df | 19.840 | 5.439 | 0.005 | 0.000 | 0.936 | 1.285 | 1.797 | 0.057 | n/a | 0.334 | 9.941 | n/a | n/a | 0.046 | 6.380 | 0.322 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005e9 | 18.010 | 5.156 | 0.010 | 0.000 | 0.271 | 0.798 | 1.133 | 0.025 | n/a | 3.942 | 6.615 | n/a | n/a | 0.060 | 5.438 | 0.302 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000000605 | 17.393 | 5.503 | 0.010 | 0.000 | 0.578 | 0.723 | 1.042 | 0.028 | n/a | 0.491 | 8.964 | n/a | n/a | 0.053 | 6.092 | 0.350 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005f9 | 17.298 | 7.660 | 0.017 | 0.000 | 0.313 | 1.070 | 1.177 | 0.029 | n/a | 0.223 | 6.736 | n/a | n/a | 0.073 | 7.989 | 0.462 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005e5 | 16.937 | 4.210 | 0.006 | 0.000 | 0.291 | 2.706 | 1.621 | 0.036 | n/a | 0.370 | 7.646 | n/a | n/a | 0.051 | 4.508 | 0.266 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005c8 | 16.755 | 5.588 | 0.010 | 0.000 | 0.611 | 1.237 | 2.004 | 0.031 | n/a | 0.445 | 6.774 | n/a | n/a | 0.056 | 6.209 | 0.371 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005fd | 13.837 | 4.545 | 0.012 | 0.000 | 0.627 | 0.987 | 1.902 | 0.040 | n/a | 0.322 | 5.340 | n/a | n/a | 0.062 | 5.185 | 0.375 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db000000000000060b | 11.998 | 3.558 | 0.005 | 0.000 | 0.656 | 0.523 | 1.515 | 0.025 | n/a | 0.184 | 5.491 | n/a | n/a | 0.041 | 4.219 | 0.352 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db00000000000005d7 | 11.843 | 3.884 | 0.005 | 0.000 | 0.847 | 0.870 | 1.694 | 0.040 | n/a | 0.290 | 4.153 | n/a | n/a | 0.061 | 4.736 | 0.400 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3468 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.630 | 0.801 | 0.000 | 1.699 | 3.772 | 0.006 | 0.000 | 0.796 | 0.796 | 1.158 | 0.030 | n/a | 0.228 | 6.456 | n/a | n/a | 0.035 | 4.874 | 0.339 | 0.035 |
| p99 | 108.182 | 3.202 | 2.823 | 7.403 | 14.868 | 1.212 | 0.000 | 32.486 | 20.034 | 11.910 | 3.667 | n/a | 4.308 | 52.972 | n/a | n/a | 0.116 | 42.387 | 0.758 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000001f1b | 181.038 | 5.198 | 0.005 | 0.000 | 146.830 | 1.990 | 9.606 | 1.603 | n/a | 0.169 | 15.590 | n/a | n/a | 0.049 | 152.033 | 0.840 | 0.049 | node-13/thread-0/driver.queue.subject | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000001e4f | 175.021 | 41.980 | 4.789 | 0.000 | 0.165 | 14.227 | 51.259 | 0.117 | n/a | 1.686 | 60.708 | n/a | n/a | 0.087 | 46.935 | 0.268 | 0.087 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 11.922ms; driver.publication 5.990ms; driver.publication 4.978ms; driver.expected-state.bind-receipt 3.949ms; driver.publication 3.645ms |
| b3a652f8fbe566db0000000000001f17 | 160.456 | 15.708 | 0.008 | 0.000 | 54.098 | 46.894 | 8.385 | 0.074 | n/a | 0.615 | 34.624 | n/a | n/a | 0.049 | 69.815 | 0.435 | 0.049 | node-13/thread-0/socket.wait-first-byte | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000001f1d | 156.571 | 6.055 | 0.007 | 0.000 | 109.615 | 11.134 | 1.484 | 0.036 | n/a | 5.763 | 22.399 | n/a | n/a | 0.078 | 115.677 | 0.739 | 0.078 | node-13/thread-0/driver.queue.subject | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000001f1e | 153.372 | 4.523 | 0.010 | 0.000 | 131.674 | 0.916 | 0.931 | 0.043 | n/a | 3.083 | 12.148 | n/a | n/a | 0.044 | 136.207 | 0.888 | 0.044 | node-13/thread-0/driver.queue.subject | driver.publication 11.255ms; driver.publication 6.515ms; driver.publication 2.906ms; driver.publication 2.895ms; driver.publication 2.207ms |
| b3a652f8fbe566db0000000000000ee1 | 153.225 | 4.588 | 0.006 | 0.000 | 116.999 | 3.650 | 1.576 | 0.089 | n/a | 2.831 | 23.457 | n/a | n/a | 0.028 | 121.594 | 0.794 | 0.028 | node-13/thread-0/driver.queue.subject | driver.publication 52.203ms; driver.publication 6.946ms; driver.publication 4.650ms; driver.publication 4.093ms; driver.publication 3.986ms |
| b3a652f8fbe566db00000000000007fa | 151.215 | 114.490 | 0.010 | 0.000 | 0.999 | 0.880 | 2.578 | 0.031 | n/a | 1.039 | 31.122 | n/a | n/a | 0.067 | 115.499 | 0.764 | 0.067 | node-13/thread-0/driver.publication | driver.publication 1.175ms |
| b3a652f8fbe566db0000000000001e52 | 149.464 | 17.684 | 0.008 | 0.000 | 80.162 | 13.039 | 5.172 | 0.047 | n/a | 1.227 | 32.045 | n/a | n/a | 0.080 | 97.854 | 0.655 | 0.080 | node-13/thread-0/driver.queue.subject | driver.publication 4.978ms; driver.expected-state.bind-receipt 3.949ms; driver.publication 3.645ms; driver.publication 3.037ms; driver.publication 2.753ms |
| b3a652f8fbe566db0000000000001f15 | 147.679 | 7.279 | 0.012 | 0.000 | 102.219 | 26.255 | 2.761 | 0.050 | n/a | 0.137 | 8.917 | n/a | n/a | 0.050 | 109.510 | 0.742 | 0.050 | node-13/thread-0/driver.queue.subject | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.895ms; client.encode 2.845ms; driver.publication 1.526ms |
| b3a652f8fbe566db00000000000007fc | 146.587 | 3.310 | 0.003 | 0.000 | 0.952 | 109.952 | 2.217 | 0.054 | n/a | 1.929 | 28.145 | n/a | n/a | 0.025 | 4.265 | 0.029 | 0.025 | node-13/thread-0/socket.wait-first-byte | driver.publication 105.514ms; driver.expected-state.bind-receipt 1.066ms; driver.publication 0.293ms |
| b3a652f8fbe566db0000000000001f1a | 145.209 | 5.259 | 0.009 | 0.000 | 110.189 | 3.609 | 2.721 | 0.057 | n/a | 0.662 | 22.663 | n/a | n/a | 0.040 | 115.457 | 0.795 | 0.040 | node-13/thread-0/driver.queue.subject | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000000a35 | 143.911 | 4.398 | 0.004 | 0.000 | 0.859 | 0.850 | 1.825 | 0.047 | n/a | 0.275 | 135.611 | n/a | n/a | 0.042 | 5.261 | 0.037 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | none observed |
| b3a652f8fbe566db0000000000001f92 | 142.586 | 7.583 | 0.013 | 0.000 | 76.782 | 0.837 | 1.676 | 0.034 | n/a | 0.477 | 55.071 | n/a | n/a | 0.112 | 84.378 | 0.592 | 0.112 | node-13/thread-0/driver.queue.subject | driver.publication 7.197ms; driver.publication 5.215ms; driver.publication 4.431ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.500ms |
| b3a652f8fbe566db0000000000000a36 | 141.265 | 5.068 | 0.006 | 0.000 | 0.091 | 3.288 | 1.127 | 0.028 | n/a | 0.154 | 131.460 | n/a | n/a | 0.044 | 5.165 | 0.037 | 0.044 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 1.577ms |
| b3a652f8fbe566db000000000000198d | 138.982 | 4.205 | 0.006 | 0.000 | 111.241 | 4.426 | 5.306 | 0.030 | n/a | 0.465 | 13.276 | n/a | n/a | 0.028 | 115.451 | 0.831 | 0.028 | node-13/thread-0/driver.queue.subject | driver.publication 2.199ms; driver.publication 1.559ms; driver.publication 1.423ms; driver.publication 1.386ms; driver.publication 1.368ms |
| b3a652f8fbe566db0000000000001f8e | 135.495 | 12.355 | 0.136 | 0.000 | 0.505 | 14.803 | 70.138 | 0.081 | n/a | 5.943 | 31.488 | n/a | n/a | 0.045 | 12.996 | 0.096 | 0.045 | gw-w/thread-65/storage/commit! | driver.publication 7.197ms; driver.publication 2.771ms; driver.plan-and-encode-command 1.395ms |
| b3a652f8fbe566db0000000000001988 | 135.138 | 7.707 | 0.009 | 0.000 | 0.174 | 31.111 | 8.394 | 0.085 | n/a | 1.461 | 86.161 | n/a | n/a | 0.036 | 7.890 | 0.058 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.199ms; driver.publication 1.423ms; driver.publication 1.386ms; driver.publication 1.368ms; driver.publication 1.133ms |
| b3a652f8fbe566db00000000000007fd | 130.823 | 5.107 | 0.010 | 0.000 | 0.660 | 9.867 | 5.481 | 0.057 | n/a | 1.860 | 107.717 | n/a | n/a | 0.064 | 5.777 | 0.044 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 105.514ms; driver.publication 1.610ms; driver.expected-state.bind-receipt 1.066ms |
| b3a652f8fbe566db0000000000000ee2 | 129.813 | 11.399 | 0.011 | 0.000 | 16.167 | 13.579 | 2.362 | 0.051 | n/a | 8.137 | 78.037 | n/a | n/a | 0.069 | 27.577 | 0.212 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 52.203ms; driver.publication 6.946ms; driver.publication 4.093ms; driver.publication 3.986ms |
| b3a652f8fbe566db0000000000001f8f | 129.667 | 10.489 | 0.072 | 0.000 | 33.044 | 36.804 | 1.096 | 15.563 | n/a | 0.279 | 32.276 | n/a | n/a | 0.043 | 43.605 | 0.336 | 0.043 | node-13/thread-0/socket.wait-first-byte | driver.publication 7.197ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.500ms; driver.publication 2.039ms; driver.plan-and-encode-command 1.395ms |

## P2 / tail / commit / 5-10 facts (2048 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.194 | 0.657 | 0.000 | 1.558 | 3.294 | 0.006 | 0.000 | 0.820 | 0.773 | 0.977 | 0.029 | n/a | 0.230 | 5.873 | n/a | n/a | 0.035 | 4.343 | 0.331 | 0.035 |
| p99 | 100.770 | 2.488 | 2.753 | 5.931 | 12.095 | 0.217 | 0.000 | 34.622 | 20.034 | 6.869 | 4.110 | n/a | 4.308 | 54.572 | n/a | n/a | 0.119 | 46.226 | 0.777 | 0.119 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b3a652f8fbe566db0000000000001f17 | 160.456 | 15.708 | 0.008 | 0.000 | 54.098 | 46.894 | 8.385 | 0.074 | n/a | 0.615 | 34.624 | n/a | n/a | 0.049 | 69.815 | 0.435 | 0.049 | node-13/thread-0/socket.wait-first-byte | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000001f1d | 156.571 | 6.055 | 0.007 | 0.000 | 109.615 | 11.134 | 1.484 | 0.036 | n/a | 5.763 | 22.399 | n/a | n/a | 0.078 | 115.677 | 0.739 | 0.078 | node-13/thread-0/driver.queue.subject | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000001f1e | 153.372 | 4.523 | 0.010 | 0.000 | 131.674 | 0.916 | 0.931 | 0.043 | n/a | 3.083 | 12.148 | n/a | n/a | 0.044 | 136.207 | 0.888 | 0.044 | node-13/thread-0/driver.queue.subject | driver.publication 11.255ms; driver.publication 6.515ms; driver.publication 2.906ms; driver.publication 2.895ms; driver.publication 2.207ms |
| b3a652f8fbe566db0000000000000ee1 | 153.225 | 4.588 | 0.006 | 0.000 | 116.999 | 3.650 | 1.576 | 0.089 | n/a | 2.831 | 23.457 | n/a | n/a | 0.028 | 121.594 | 0.794 | 0.028 | node-13/thread-0/driver.queue.subject | driver.publication 52.203ms; driver.publication 6.946ms; driver.publication 4.650ms; driver.publication 4.093ms; driver.publication 3.986ms |
| b3a652f8fbe566db00000000000007fc | 146.587 | 3.310 | 0.003 | 0.000 | 0.952 | 109.952 | 2.217 | 0.054 | n/a | 1.929 | 28.145 | n/a | n/a | 0.025 | 4.265 | 0.029 | 0.025 | node-13/thread-0/socket.wait-first-byte | driver.publication 105.514ms; driver.expected-state.bind-receipt 1.066ms; driver.publication 0.293ms |
| b3a652f8fbe566db0000000000001f1a | 145.209 | 5.259 | 0.009 | 0.000 | 110.189 | 3.609 | 2.721 | 0.057 | n/a | 0.662 | 22.663 | n/a | n/a | 0.040 | 115.457 | 0.795 | 0.040 | node-13/thread-0/driver.queue.subject | driver.publication 13.659ms; driver.publication 11.255ms; driver.publication 2.906ms; driver.publication 2.895ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000001f92 | 142.586 | 7.583 | 0.013 | 0.000 | 76.782 | 0.837 | 1.676 | 0.034 | n/a | 0.477 | 55.071 | n/a | n/a | 0.112 | 84.378 | 0.592 | 0.112 | node-13/thread-0/driver.queue.subject | driver.publication 7.197ms; driver.publication 5.215ms; driver.publication 4.431ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.500ms |
| b3a652f8fbe566db0000000000001988 | 135.138 | 7.707 | 0.009 | 0.000 | 0.174 | 31.111 | 8.394 | 0.085 | n/a | 1.461 | 86.161 | n/a | n/a | 0.036 | 7.890 | 0.058 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.199ms; driver.publication 1.423ms; driver.publication 1.386ms; driver.publication 1.368ms; driver.publication 1.133ms |
| b3a652f8fbe566db00000000000007fd | 130.823 | 5.107 | 0.010 | 0.000 | 0.660 | 9.867 | 5.481 | 0.057 | n/a | 1.860 | 107.717 | n/a | n/a | 0.064 | 5.777 | 0.044 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 105.514ms; driver.publication 1.610ms; driver.expected-state.bind-receipt 1.066ms |
| b3a652f8fbe566db0000000000001f8f | 129.667 | 10.489 | 0.072 | 0.000 | 33.044 | 36.804 | 1.096 | 15.563 | n/a | 0.279 | 32.276 | n/a | n/a | 0.043 | 43.605 | 0.336 | 0.043 | node-13/thread-0/socket.wait-first-byte | driver.publication 7.197ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.500ms; driver.publication 2.039ms; driver.plan-and-encode-command 1.395ms |
| b3a652f8fbe566db0000000000000ee0 | 125.676 | 14.868 | 0.008 | 0.000 | 6.313 | 16.753 | 15.619 | 0.073 | n/a | 1.695 | 70.300 | n/a | n/a | 0.047 | 21.189 | 0.169 | 0.047 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 52.203ms; driver.publication 4.093ms |
| b3a652f8fbe566db0000000000000a37 | 124.873 | 2.740 | 0.005 | 0.000 | 0.781 | 4.708 | 0.849 | 0.030 | n/a | 0.367 | 115.351 | n/a | n/a | 0.041 | 3.527 | 0.028 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.577ms; driver.publication 1.007ms |
| b3a652f8fbe566db0000000000001f90 | 123.604 | 8.746 | 0.254 | 0.000 | 25.067 | 30.061 | 8.735 | 17.937 | n/a | 1.285 | 31.479 | n/a | n/a | 0.039 | 34.068 | 0.276 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 7.197ms; driver.publication 5.215ms; driver.publication 2.771ms; driver.expected-state.bind-receipt 2.500ms; driver.publication 2.039ms |
| b3a652f8fbe566db0000000000001f8d | 121.517 | 7.847 | 0.016 | 0.000 | 2.587 | 28.957 | 39.029 | 21.454 | n/a | 0.219 | 21.343 | n/a | n/a | 0.065 | 10.449 | 0.086 | 0.065 | gw-w/thread-67/commit.prepare-and-validate | driver.publication 7.197ms; driver.plan-and-encode-command 1.395ms |
| b3a652f8fbe566db0000000000001f13 | 120.631 | 16.209 | 0.426 | 0.000 | 3.135 | 19.741 | 8.980 | 0.069 | n/a | 4.447 | 67.586 | n/a | n/a | 0.036 | 19.770 | 0.164 | 0.036 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 13.659ms; driver.publication 11.255ms; client.encode 2.845ms |
| b3a652f8fbe566db0000000000000edf | 118.413 | 57.828 | 0.008 | 0.000 | 7.126 | 4.078 | 1.790 | 0.080 | n/a | 0.250 | 47.188 | n/a | n/a | 0.064 | 64.962 | 0.549 | 0.064 | node-13/thread-0/driver.publication | driver.publication 4.093ms |
| b3a652f8fbe566db0000000000001e55 | 117.542 | 3.930 | 0.008 | 0.000 | 100.078 | 4.545 | 1.542 | 0.044 | n/a | 0.157 | 7.204 | n/a | n/a | 0.034 | 104.016 | 0.885 | 0.034 | node-13/thread-0/driver.queue.subject | driver.publication 11.922ms; driver.publication 4.978ms; driver.expected-state.bind-receipt 3.949ms; driver.publication 3.645ms; driver.publication 3.037ms |
| b3a652f8fbe566db0000000000001f14 | 111.767 | 11.160 | 0.016 | 0.000 | 8.619 | 32.667 | 4.036 | 0.040 | n/a | 0.270 | 54.887 | n/a | n/a | 0.072 | 19.794 | 0.177 | 0.072 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 13.659ms; driver.publication 11.255ms; client.encode 2.845ms; driver.publication 1.526ms |
| b3a652f8fbe566db0000000000000a38 | 110.792 | 3.010 | 0.005 | 0.000 | 0.324 | 5.804 | 0.667 | 0.025 | n/a | 0.198 | 100.678 | n/a | n/a | 0.081 | 3.339 | 0.030 | 0.081 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.577ms; driver.publication 1.007ms |
| b3a652f8fbe566db0000000000001992 | 101.463 | 2.491 | 0.006 | 0.000 | 91.654 | 0.498 | 0.787 | 0.034 | n/a | 0.488 | 5.472 | n/a | n/a | 0.032 | 94.152 | 0.928 | 0.032 | node-13/thread-0/driver.queue.subject | driver.publication 2.199ms; driver.publication 1.559ms; driver.publication 1.423ms; driver.publication 1.386ms; driver.publication 1.368ms |

## P1 / warmup / read (1018 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.059 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.023 | 0.000 | 0.000 | 0.023 |
| p99 | 305.084 | n/a | n/a | n/a | 1.052 | n/a | 0.000 | 305.004 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.388 | 305.071 | 1.000 | 0.388 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bf4d7dc38a2b8e6f0000000000000758 | 309.348 | 0.424 | n/a | 0.000 | 308.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 309.341 | 1.000 | 0.007 | node-13/thread-5/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000008e5 | 307.484 | 0.580 | n/a | 0.000 | 306.897 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 307.477 | 1.000 | 0.007 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f000000000000075e | 307.335 | 0.054 | n/a | 0.000 | 307.277 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.331 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f000000000000075f | 307.316 | 0.022 | n/a | 0.000 | 307.292 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.314 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f0000000000000760 | 307.284 | 0.046 | n/a | 0.000 | 307.233 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 307.279 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f0000000000000761 | 307.269 | 0.020 | n/a | 0.000 | 307.246 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 307.267 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000004da | 307.219 | 0.091 | n/a | 0.000 | 307.124 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 307.214 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000004d9 | 307.203 | 0.498 | n/a | 0.000 | 306.698 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 307.196 | 1.000 | 0.008 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000008ef | 306.203 | 0.106 | n/a | 0.000 | 306.090 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 306.197 | 1.000 | 0.006 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000008f0 | 306.170 | 0.045 | n/a | 0.000 | 306.118 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 306.164 | 1.000 | 0.007 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000008ff | 305.084 | 0.068 | n/a | 0.000 | 305.004 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 305.071 | 1.000 | 0.012 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f3440000000000000900 | 305.037 | 0.073 | n/a | 0.000 | 304.953 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 305.026 | 1.000 | 0.011 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000004ed | 303.399 | 0.049 | n/a | 0.000 | 303.347 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.396 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000004ec | 303.336 | 0.048 | n/a | 0.000 | 303.285 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 303.333 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000004eb | 303.321 | 0.074 | n/a | 0.000 | 303.237 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.009 | 303.312 | 1.000 | 0.009 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000004f3 | 303.282 | 0.048 | n/a | 0.000 | 303.230 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 303.278 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f344000000000001b1cf | 294.515 | 0.379 | n/a | 0.000 | 294.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 294.511 | 1.000 | 0.004 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| da3a4b4afb64f344000000000001b1d0 | 294.389 | 0.065 | n/a | 0.000 | 294.322 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 294.387 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| da3a4b4afb64f344000000000001b1eb | 293.398 | 0.158 | n/a | 0.000 | 293.239 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 293.397 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| da3a4b4afb64f344000000000001b1fa | 293.080 | 0.049 | n/a | 0.000 | 293.029 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 293.078 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.041ms |

## P1 / L1 / read (373 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.018 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.017 | 0.000 | 0.000 | 0.017 |
| p99 | 285.032 | n/a | n/a | n/a | 0.289 | n/a | 0.000 | 284.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.211 | 285.030 | 1.000 | 0.211 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b4f1d8f56bcb60500000000000077dff | 307.998 | 0.086 | n/a | 0.000 | 307.910 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.996 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.058ms |
| b4f1d8f56bcb605000000000000710a7 | 307.197 | 0.136 | n/a | 0.000 | 307.058 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 307.195 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.044ms; replica.apply-delta 0.037ms |
| b4f1d8f56bcb6050000000000005f0f0 | 292.786 | 0.226 | n/a | 0.000 | 292.557 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.783 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000050cff | 285.032 | 0.141 | n/a | 0.000 | 284.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 285.030 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000836ee | 283.256 | 0.159 | n/a | 0.000 | 283.094 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 283.253 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000004ff8b | 279.987 | 0.141 | n/a | 0.000 | 279.843 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.984 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000093f60 | 275.242 | 0.362 | n/a | 0.000 | 274.877 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.239 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000007b422 | 275.198 | 0.199 | n/a | 0.000 | 274.995 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.194 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| b4f1d8f56bcb605000000000000767c6 | 275.011 | 0.170 | n/a | 0.000 | 274.838 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 275.008 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000070548 | 273.668 | 0.199 | n/a | 0.000 | 273.466 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 273.665 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000007b611 | 270.485 | 0.126 | n/a | 0.000 | 270.356 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 270.482 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000007db77 | 269.739 | 0.168 | n/a | 0.000 | 269.567 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 269.735 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000094e59 | 268.933 | 0.141 | n/a | 0.000 | 268.790 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 268.930 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000007a3e4 | 265.846 | 0.289 | n/a | 0.000 | 265.552 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 265.841 | 1.000 | 0.005 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000007b627 | 263.222 | 0.125 | n/a | 0.000 | 263.094 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 263.218 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000008c7db | 261.502 | 0.114 | n/a | 0.000 | 261.385 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 261.499 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000007a3fb | 168.871 | 0.384 | n/a | 0.000 | 168.476 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 168.860 | 1.000 | 0.011 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.041ms |
| b4f1d8f56bcb6050000000000007b630 | 53.971 | 0.395 | n/a | 0.000 | 53.569 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 53.964 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| b4f1d8f56bcb6050000000000007b62f | 16.854 | 0.194 | n/a | 0.000 | 16.653 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 16.847 | 1.000 | 0.007 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| b4f1d8f56bcb60500000000000094e5a | 14.180 | 0.190 | n/a | 0.000 | 13.972 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.019 | 14.161 | 0.999 | 0.019 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.076ms |

## P1 / L4 / read (916 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.024 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 0.000 | 0.000 | 0.021 |
| p99 | 278.306 | n/a | n/a | n/a | 0.304 | n/a | 0.000 | 278.170 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.306 | 278.303 | 1.000 | 0.306 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a4b4afb64f34400000000000767a4 | 290.167 | 0.124 | n/a | 0.000 | 290.042 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 290.165 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f0000000000077ce7 | 290.099 | 0.315 | n/a | 0.000 | 289.780 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 290.095 | 1.000 | 0.004 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000d8c0c | 289.375 | 0.179 | n/a | 0.000 | 289.193 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.372 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000d8c0d | 289.354 | 0.036 | n/a | 0.000 | 289.316 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 289.352 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000009db45 | 279.602 | 0.449 | n/a | 0.000 | 279.149 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 279.598 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f3440000000000041778 | 279.212 | 0.355 | n/a | 0.000 | 278.855 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 279.210 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f0000000000042833 | 279.159 | 0.215 | n/a | 0.000 | 278.941 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 279.156 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000a81fe | 278.446 | 0.033 | n/a | 0.000 | 278.411 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.444 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000a81fd | 278.420 | 0.102 | n/a | 0.000 | 278.316 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.417 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f000000000004c27b | 278.306 | 0.133 | n/a | 0.000 | 278.170 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 278.303 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| da3a4b4afb64f3440000000000044c8b | 277.984 | 0.154 | n/a | 0.000 | 277.827 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.981 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000009db59 | 277.948 | 0.075 | n/a | 0.000 | 277.870 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.945 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f000000000004649c | 277.926 | 0.100 | n/a | 0.000 | 277.823 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.923 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000a1fb4 | 277.440 | 0.116 | n/a | 0.000 | 277.303 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.020 | 277.419 | 1.000 | 0.020 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000a1fb6 | 277.286 | 0.052 | n/a | 0.000 | 277.232 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.284 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f344000000000004a538 | 277.131 | 0.217 | n/a | 0.000 | 276.911 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.128 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f000000000006b1c5 | 274.992 | 0.123 | n/a | 0.000 | 274.864 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 274.988 | 1.000 | 0.005 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.043ms |
| da3a4b4afb64f344000000000006f058 | 274.545 | 0.396 | n/a | 0.000 | 274.146 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.542 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f0000000000070524 | 274.410 | 0.239 | n/a | 0.000 | 274.168 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 274.407 | 1.000 | 0.003 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb605000000000000d090e | 274.281 | 0.222 | n/a | 0.000 | 274.058 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.279 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |

## P1 / L16 / read (1154 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.091 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.028 | 0.000 | 0.000 | 0.028 |
| p99 | 377.958 | n/a | n/a | n/a | 0.230 | n/a | 0.000 | 377.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.390 | 377.958 | 1.000 | 0.390 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| bf4d7dc38a2b8e6f00000000000ae370 | 381.594 | 0.015 | n/a | 0.000 | 381.579 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 381.593 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000ae36f | 381.589 | 0.025 | n/a | 0.000 | 381.563 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 381.588 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000ae36e | 381.575 | 0.125 | n/a | 0.000 | 381.448 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 381.574 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000ae393 | 380.547 | 0.023 | n/a | 0.000 | 380.523 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 380.546 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000ae394 | 380.542 | 0.023 | n/a | 0.000 | 380.518 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 380.541 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000110d77 | 378.990 | 0.069 | n/a | 0.000 | 378.920 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.989 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000110d76 | 378.928 | 0.144 | n/a | 0.000 | 378.780 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 378.924 | 1.000 | 0.004 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000adc69 | 378.406 | 0.061 | n/a | 0.000 | 378.344 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 378.405 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000adc68 | 378.356 | 0.185 | n/a | 0.000 | 378.170 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 378.355 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000adc78 | 377.981 | 0.017 | n/a | 0.000 | 377.963 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.980 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000adc76 | 377.963 | 0.074 | n/a | 0.000 | 377.888 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.962 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000adc77 | 377.958 | 0.030 | n/a | 0.000 | 377.928 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.958 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000110d9f | 377.954 | 0.036 | n/a | 0.000 | 377.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.953 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000110da0 | 377.938 | 0.028 | n/a | 0.000 | 377.909 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.937 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000110d9e | 377.911 | 0.025 | n/a | 0.000 | 377.885 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.910 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb60500000000000110d9d | 377.887 | 0.031 | n/a | 0.000 | 377.855 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 377.886 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f000000000009d15f | 316.933 | 0.145 | n/a | 0.000 | 316.786 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 316.931 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| bf4d7dc38a2b8e6f000000000009d160 | 316.912 | 0.049 | n/a | 0.000 | 316.862 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.911 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| bf4d7dc38a2b8e6f000000000009d161 | 316.906 | 0.031 | n/a | 0.000 | 316.874 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.905 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| bf4d7dc38a2b8e6f000000000009d162 | 316.905 | 0.014 | n/a | 0.000 | 316.889 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 316.904 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.048ms |

## P1 / L64 / read (2544 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 241.284 | n/a | n/a | n/a | 0.022 | n/a | 0.000 | 241.261 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 241.283 | 1.000 | 0.002 |
| p99 | 414.534 | n/a | n/a | n/a | 1.278 | n/a | 0.000 | 414.494 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.471 | 414.533 | 1.000 | 0.471 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a4b4afb64f34400000000000fae94 | 416.779 | 0.165 | n/a | 0.000 | 416.611 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 416.776 | 1.000 | 0.003 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa580 | 416.492 | 0.124 | n/a | 0.000 | 416.366 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 416.490 | 1.000 | 0.002 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d032 | 415.676 | 0.039 | n/a | 0.000 | 415.637 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.675 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d031 | 415.624 | 0.035 | n/a | 0.000 | 415.588 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.623 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d030 | 415.573 | 0.031 | n/a | 0.000 | 415.541 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.572 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d02f | 415.541 | 0.075 | n/a | 0.000 | 415.464 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.539 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000faeb9 | 415.526 | 0.026 | n/a | 0.000 | 415.499 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.525 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d02e | 415.464 | 0.037 | n/a | 0.000 | 415.427 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.463 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000faeb8 | 415.450 | 0.025 | n/a | 0.000 | 415.425 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.449 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000faeb7 | 415.420 | 0.029 | n/a | 0.000 | 415.390 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 415.419 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d02d | 415.416 | 0.048 | n/a | 0.000 | 415.366 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 415.415 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000faeb6 | 415.403 | 0.050 | n/a | 0.000 | 415.353 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.402 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa5a5 | 415.400 | 0.016 | n/a | 0.000 | 415.383 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.399 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa5a4 | 415.378 | 0.014 | n/a | 0.000 | 415.363 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.377 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| da3a4b4afb64f34400000000000faeb5 | 415.375 | 0.032 | n/a | 0.000 | 415.341 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 415.373 | 1.000 | 0.002 | node-13/thread-6/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa5a3 | 415.363 | 0.019 | n/a | 0.000 | 415.343 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.362 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa5a2 | 415.348 | 0.013 | n/a | 0.000 | 415.334 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.347 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa5a1 | 415.340 | 0.018 | n/a | 0.000 | 415.321 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.339 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |
| b4f1d8f56bcb6050000000000015d02c | 415.333 | 0.208 | n/a | 0.000 | 415.122 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 415.331 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | none observed |
| bf4d7dc38a2b8e6f00000000000fa5a0 | 415.321 | 0.027 | n/a | 0.000 | 415.294 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 415.320 | 1.000 | 0.001 | node-13/thread-5/reader.straddle-await-ack | none observed |

## P1 / L256 / read (5977 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 243.512 | n/a | n/a | n/a | 0.024 | n/a | 0.000 | 243.483 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 243.511 | 1.000 | 0.001 |
| p99 | 378.621 | n/a | n/a | n/a | 3.735 | n/a | 0.000 | 378.548 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.356 | 378.620 | 1.000 | 0.356 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| da3a4b4afb64f344000000000013146a | 393.345 | 0.456 | n/a | 0.000 | 392.876 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 393.332 | 1.000 | 0.013 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| b4f1d8f56bcb6050000000000019268d | 393.000 | 0.428 | n/a | 0.000 | 392.559 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.013 | 392.987 | 1.000 | 0.013 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb6050000000000019268e | 392.743 | 0.111 | n/a | 0.000 | 392.626 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 392.737 | 1.000 | 0.006 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb6050000000000019268f | 392.670 | 0.064 | n/a | 0.000 | 392.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 392.664 | 1.000 | 0.006 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb60500000000000192694 | 392.624 | 0.122 | n/a | 0.000 | 392.500 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 392.622 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb60500000000000192690 | 392.622 | 0.019 | n/a | 0.000 | 392.600 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 392.619 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb60500000000000192692 | 392.618 | 0.029 | n/a | 0.000 | 392.588 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 392.616 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb60500000000000192691 | 392.616 | 0.023 | n/a | 0.000 | 392.590 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 392.613 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb60500000000000192693 | 392.613 | 0.016 | n/a | 0.000 | 392.595 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 392.611 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| bf4d7dc38a2b8e6f00000000001300de | 390.480 | 0.250 | n/a | 0.000 | 390.222 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.007 | 390.473 | 1.000 | 0.007 | node-13/thread-5/reader.straddle-await-ack | replica.apply-delta 0.027ms |
| b4f1d8f56bcb605000000000001926db | 389.777 | 0.104 | n/a | 0.000 | 389.672 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 389.775 | 1.000 | 0.002 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926df | 389.742 | 0.071 | n/a | 0.000 | 389.670 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 389.741 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926de | 389.728 | 0.016 | n/a | 0.000 | 389.708 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 389.725 | 1.000 | 0.003 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926dd | 389.723 | 0.024 | n/a | 0.000 | 389.698 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 389.722 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926e1 | 389.715 | 0.044 | n/a | 0.000 | 389.670 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 389.714 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926dc | 389.714 | 0.024 | n/a | 0.000 | 389.689 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 389.713 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926e0 | 389.710 | 0.025 | n/a | 0.000 | 389.684 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 389.709 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| b4f1d8f56bcb605000000000001926e2 | 389.697 | 0.014 | n/a | 0.000 | 389.682 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 389.696 | 1.000 | 0.001 | node-13/thread-4/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| da3a4b4afb64f34400000000001314bd | 388.664 | 0.079 | n/a | 0.000 | 388.584 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 388.663 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |
| da3a4b4afb64f34400000000001314be | 388.654 | 0.025 | n/a | 0.000 | 388.627 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 388.652 | 1.000 | 0.001 | node-13/thread-6/reader.straddle-await-ack | replica.apply-delta 0.024ms |

## P1 / tail / read (56 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.040 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.040 | 0.000 | 0.000 | 0.040 |
| p99 | 1.332 | n/a | n/a | n/a | 1.326 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.268 | 1.326 | 0.996 | 0.268 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| b4f1d8f56bcb605000000000001c2ddb | 1.332 | 1.326 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 1.326 | 0.996 | 0.005 | node-13/thread-4/replica.pull-at | none observed |
| da3a4b4afb64f344000000000016454c | 0.268 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de9 | 0.259 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.259 | 0.000 | 0.000 | 0.259 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de4 | 0.229 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de5 | 0.203 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | uncovered | none observed |
| bf4d7dc38a2b8e6f00000000001611b2 | 0.153 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | uncovered | none observed |
| da3a4b4afb64f3440000000000164557 | 0.149 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de8 | 0.120 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de1 | 0.114 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de3 | 0.071 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.071 | 0.000 | 0.000 | 0.071 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2dec | 0.066 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.066 | 0.000 | 0.000 | 0.066 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2ddc | 0.064 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.064 | 0.000 | 0.000 | 0.064 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2ded | 0.064 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.064 | 0.000 | 0.000 | 0.064 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2dda | 0.062 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.062 | 0.000 | 0.000 | 0.062 | uncovered | none observed |
| da3a4b4afb64f3440000000000164545 | 0.061 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.061 | 0.000 | 0.000 | 0.061 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2dde | 0.053 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.053 | 0.000 | 0.000 | 0.053 | uncovered | none observed |
| b4f1d8f56bcb605000000000001c2de2 | 0.051 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 0.000 | 0.000 | 0.051 | uncovered | none observed |
| da3a4b4afb64f3440000000000164555 | 0.051 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.051 | 0.000 | 0.000 | 0.051 | uncovered | none observed |
| bf4d7dc38a2b8e6f00000000001611ba | 0.047 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.047 | 0.000 | 0.000 | 0.047 | uncovered | none observed |
| bf4d7dc38a2b8e6f00000000001611b8 | 0.047 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.047 | 0.000 | 0.000 | 0.047 | uncovered | none observed |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.368 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 200.652 | 0.015 | n/a | 0.048 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 |
| p99 | 203.240 | n/a | n/a | n/a | 24.260 | n/a | 1.290 | 0.000 | 5.756 | 201.788 | 0.107 | n/a | 0.227 | 0.000 | n/a | n/a | 0.341 | 24.260 | 0.276 | 0.341 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd7090000000000000005 | 203.240 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 201.788 | 0.024 | n/a | 0.227 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-47/journal/page | none observed |
| d9f8237f1f8bd7090000000000000007 | 202.788 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.452 | 0.020 | n/a | 0.227 | 0.000 | n/a | n/a | 0.208 | 0.000 | 0.000 | 0.208 | gw-r/thread-47/journal/page | none observed |
| d9f8237f1f8bd7090000000000000006 | 202.342 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 201.020 | 0.017 | n/a | 0.138 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000efb | 201.460 | 0.000 | n/a | 0.000 | 0.000 | 0.398 | 200.875 | 0.033 | n/a | 0.058 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000efd | 201.368 | 0.000 | n/a | 0.000 | 0.000 | 0.360 | 200.866 | 0.015 | n/a | 0.048 | 0.000 | n/a | n/a | 0.079 | 0.000 | 0.000 | 0.079 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000efe | 201.368 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.652 | 0.007 | n/a | 0.043 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000efc | 201.315 | 0.000 | n/a | 0.000 | 0.000 | 0.600 | 200.572 | 0.007 | n/a | 0.031 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000002 | 132.409 | 2.074 | n/a | 0.000 | 0.000 | 1.650 | 128.155 | 0.107 | n/a | 0.083 | 0.000 | n/a | n/a | 0.341 | 2.074 | 0.016 | 0.341 | gw-r/thread-48/gateway.admitted-work | none observed |
| d9f8237f1f8bd7090000000000000f01 | 103.920 | 24.260 | n/a | 0.000 | 0.000 | 2.324 | 77.016 | 0.003 | n/a | 0.004 | 0.000 | n/a | n/a | 0.313 | 24.260 | 0.233 | 0.313 | gw-r/thread-50/gateway.admitted-work | none observed |
| d9f8237f1f8bd7090000000000000f02 | 87.598 | 16.904 | n/a | 0.000 | 0.000 | 5.756 | 64.717 | 0.004 | n/a | 0.007 | 0.000 | n/a | n/a | 0.210 | 16.904 | 0.193 | 0.210 | gw-r/thread-69/gateway.admitted-work | none observed |
| d9f8237f1f8bd7090000000000000f03 | 80.331 | 20.896 | n/a | 1.290 | 0.000 | 2.192 | 55.661 | 0.007 | n/a | 0.006 | 0.000 | n/a | n/a | 0.279 | 22.186 | 0.276 | 0.279 | gw-r/thread-50/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1004.787 | n/a | n/a | n/a | 0.255 | n/a | 0.000 | 0.000 | 1.384 | 1001.771 | 0.020 | n/a | 0.293 | 0.000 | n/a | n/a | 1.179 | 0.255 | 0.000 | 1.179 |
| p99 | 17563.465 | n/a | n/a | n/a | 0.361 | n/a | 0.000 | 0.000 | 16557.887 | 1001.782 | 0.046 | n/a | 0.820 | 0.000 | n/a | n/a | 2.611 | 0.361 | 0.000 | 2.611 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c00000000000000a4 | 17563.465 | 0.361 | n/a | 0.000 | 0.000 | 16557.887 | 1001.771 | 0.016 | n/a | 0.820 | 0.000 | n/a | n/a | 2.611 | 0.361 | 0.000 | 2.611 | node-13/thread-2/socket.wait-first-byte | none observed |
| c3ed4c323f60973c00000000000000a5 | 1004.787 | 0.255 | n/a | 0.000 | 0.000 | 1.384 | 1001.630 | 0.046 | n/a | 0.293 | 0.000 | n/a | n/a | 1.179 | 0.255 | 0.000 | 1.179 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c00000000000000a6 | 1003.938 | 0.135 | n/a | 0.000 | 0.000 | 0.663 | 1001.782 | 0.020 | n/a | 0.214 | 0.000 | n/a | n/a | 1.124 | 0.135 | 0.000 | 1.124 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / internal (30 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 412.779 | n/a | n/a | n/a | 4.844 | n/a | 0.000 | 0.000 | 0.896 | 404.124 | 0.022 | n/a | 0.094 | 0.000 | n/a | n/a | 0.142 | 6.198 | 0.020 | 0.142 |
| p99 | 1007.093 | n/a | n/a | n/a | 25.100 | n/a | 2.777 | 0.000 | 5.879 | 1001.586 | 0.342 | n/a | 0.155 | 0.000 | n/a | n/a | 49.405 | 25.100 | 0.189 | 49.405 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c00000000000000be | 1007.093 | 4.844 | n/a | 0.738 | 0.000 | 0.715 | 1000.435 | 0.176 | n/a | 0.093 | 0.000 | n/a | n/a | 0.093 | 5.582 | 0.006 | 0.093 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c00000000000000b6 | 1005.382 | 0.181 | n/a | 0.000 | 0.000 | 2.344 | 1001.586 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 1.126 | 0.181 | 0.000 | 1.126 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000000d2 | 993.778 | 3.862 | n/a | 0.596 | 0.000 | 0.737 | 988.129 | 0.227 | n/a | 0.065 | 0.000 | n/a | n/a | 0.163 | 4.458 | 0.004 | 0.163 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c00000000000000b0 | 988.385 | 3.718 | n/a | 0.000 | 0.000 | 0.583 | 983.866 | 0.014 | n/a | 0.066 | 0.000 | n/a | n/a | 0.137 | 3.718 | 0.004 | 0.137 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c00000000000000bd | 973.402 | 4.925 | n/a | 2.718 | 0.000 | 3.069 | 962.282 | 0.170 | n/a | 0.096 | 0.000 | n/a | n/a | 0.142 | 7.643 | 0.008 | 0.142 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000000ad | 830.969 | 3.920 | n/a | 0.000 | 0.000 | 4.098 | 822.538 | 0.029 | n/a | 0.147 | 0.000 | n/a | n/a | 0.237 | 3.920 | 0.005 | 0.237 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c00000000000000c4 | 782.169 | 13.458 | n/a | 2.362 | 0.000 | 0.759 | 765.213 | 0.021 | n/a | 0.085 | 0.000 | n/a | n/a | 0.271 | 15.821 | 0.020 | 0.271 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c00000000000000aa | 767.308 | 2.932 | n/a | 0.000 | 0.000 | 1.084 | 762.895 | 0.015 | n/a | 0.153 | 0.000 | n/a | n/a | 0.229 | 2.932 | 0.004 | 0.229 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c00000000000000b5 | 674.506 | 11.558 | n/a | 0.000 | 0.000 | 1.241 | 661.331 | 0.040 | n/a | 0.155 | 0.000 | n/a | n/a | 0.181 | 11.558 | 0.017 | 0.181 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c00000000000000cd | 631.707 | 4.429 | n/a | 0.544 | 0.000 | 0.860 | 625.705 | 0.011 | n/a | 0.079 | 0.000 | n/a | n/a | 0.079 | 4.973 | 0.008 | 0.079 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c00000000000000cb | 627.801 | 10.725 | n/a | 2.777 | 0.000 | 0.761 | 613.042 | 0.211 | n/a | 0.105 | 0.000 | n/a | n/a | 0.180 | 13.502 | 0.022 | 0.180 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c00000000000000c3 | 582.578 | 3.712 | n/a | 2.623 | 0.000 | 0.896 | 574.804 | 0.342 | n/a | 0.123 | 0.000 | n/a | n/a | 0.078 | 6.335 | 0.011 | 0.078 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000000c9 | 580.082 | 14.429 | n/a | 1.234 | 0.000 | 1.732 | 562.430 | 0.011 | n/a | 0.086 | 0.000 | n/a | n/a | 0.159 | 15.663 | 0.027 | 0.159 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c00000000000000b9 | 455.522 | 4.786 | n/a | 0.000 | 0.000 | 0.915 | 449.533 | 0.078 | n/a | 0.089 | 0.000 | n/a | n/a | 0.121 | 4.786 | 0.011 | 0.121 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c00000000000000a9 | 418.620 | 8.262 | n/a | 0.000 | 0.000 | 5.879 | 404.124 | 0.031 | n/a | 0.135 | 0.000 | n/a | n/a | 0.189 | 8.262 | 0.020 | 0.189 | gw-r/thread-47/journal/page | none observed |
| c3ed4c323f60973c00000000000000c7 | 412.779 | 2.481 | n/a | 0.000 | 0.000 | 1.300 | 408.655 | 0.159 | n/a | 0.106 | 0.000 | n/a | n/a | 0.077 | 2.481 | 0.006 | 0.077 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c00000000000000ca | 384.203 | 6.534 | n/a | 1.507 | 0.000 | 0.940 | 374.949 | 0.012 | n/a | 0.083 | 0.000 | n/a | n/a | 0.177 | 8.042 | 0.021 | 0.177 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c00000000000000bb | 346.736 | 7.876 | n/a | 1.624 | 0.000 | 1.738 | 335.101 | 0.137 | n/a | 0.142 | 0.000 | n/a | n/a | 0.117 | 9.500 | 0.027 | 0.117 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000000b2 | 321.323 | 6.717 | n/a | 0.000 | 0.000 | 0.756 | 313.501 | 0.029 | n/a | 0.140 | 0.000 | n/a | n/a | 0.180 | 6.717 | 0.021 | 0.180 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c00000000000000c0 | 271.519 | 6.043 | n/a | 1.407 | 0.000 | 0.595 | 263.257 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.170 | 7.450 | 0.027 | 0.170 | gw-r/thread-68/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 406.333 | n/a | n/a | n/a | 4.351 | n/a | 0.433 | 0.000 | 0.773 | 392.413 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 0.159 | 4.705 | 0.017 | 0.159 |
| p99 | 1003.166 | n/a | n/a | n/a | 14.150 | n/a | 2.783 | 0.000 | 2.263 | 1001.052 | 0.626 | n/a | 0.145 | 0.000 | n/a | n/a | 43.149 | 15.312 | 0.621 | 43.149 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c00000000000000d4 | 1003.166 | 0.229 | n/a | 0.000 | 0.000 | 0.710 | 1000.913 | 0.015 | n/a | 0.132 | 0.000 | n/a | n/a | 1.167 | 0.229 | 0.000 | 1.167 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c00000000000000db | 1002.992 | 0.163 | n/a | 0.000 | 0.000 | 0.508 | 1001.052 | 0.024 | n/a | 0.114 | 0.000 | n/a | n/a | 1.131 | 0.163 | 0.000 | 1.131 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c0000000000000110 | 999.083 | 4.705 | n/a | 0.000 | 0.000 | 0.823 | 991.605 | 0.024 | n/a | 0.084 | 0.000 | n/a | n/a | 1.841 | 4.705 | 0.005 | 1.841 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000000e2 | 998.338 | 4.373 | n/a | 0.000 | 0.000 | 0.521 | 992.733 | 0.013 | n/a | 0.090 | 0.000 | n/a | n/a | 0.608 | 4.373 | 0.004 | 0.608 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c0000000000000104 | 991.089 | 4.281 | n/a | 0.533 | 0.000 | 0.669 | 985.399 | 0.012 | n/a | 0.079 | 0.000 | n/a | n/a | 0.116 | 4.814 | 0.005 | 0.116 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c0000000000000101 | 989.157 | 7.296 | n/a | 0.000 | 0.000 | 0.839 | 980.822 | 0.031 | n/a | 0.059 | 0.000 | n/a | n/a | 0.111 | 7.296 | 0.007 | 0.111 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000108 | 986.147 | 2.936 | n/a | 0.000 | 0.000 | 0.923 | 982.138 | 0.022 | n/a | 0.066 | 0.000 | n/a | n/a | 0.063 | 2.936 | 0.003 | 0.063 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000000d3 | 985.129 | 3.305 | n/a | 0.433 | 0.000 | 0.592 | 980.509 | 0.019 | n/a | 0.137 | 0.000 | n/a | n/a | 0.134 | 3.739 | 0.004 | 0.134 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000000dd | 980.896 | 4.167 | n/a | 0.784 | 0.000 | 0.716 | 974.769 | 0.212 | n/a | 0.059 | 0.000 | n/a | n/a | 0.189 | 4.951 | 0.005 | 0.189 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000000e7 | 816.757 | 3.838 | n/a | 0.533 | 0.000 | 0.852 | 811.267 | 0.031 | n/a | 0.125 | 0.000 | n/a | n/a | 0.110 | 4.372 | 0.005 | 0.110 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000000e3 | 797.793 | 5.648 | n/a | 0.000 | 0.000 | 0.806 | 791.001 | 0.025 | n/a | 0.122 | 0.000 | n/a | n/a | 0.192 | 5.648 | 0.007 | 0.192 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c0000000000000105 | 789.243 | 4.510 | n/a | 0.000 | 0.000 | 0.837 | 783.753 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.067 | 4.510 | 0.006 | 0.067 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000000e1 | 744.329 | 5.317 | n/a | 2.392 | 0.000 | 0.773 | 735.621 | 0.013 | n/a | 0.089 | 0.000 | n/a | n/a | 0.123 | 7.709 | 0.010 | 0.123 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000000df | 743.218 | 3.877 | n/a | 0.492 | 0.000 | 0.775 | 737.793 | 0.016 | n/a | 0.122 | 0.000 | n/a | n/a | 0.142 | 4.369 | 0.006 | 0.142 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000000ee | 636.347 | 7.706 | n/a | 0.000 | 0.000 | 0.674 | 627.585 | 0.026 | n/a | 0.097 | 0.000 | n/a | n/a | 0.259 | 7.706 | 0.012 | 0.259 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c00000000000000fe | 594.009 | 8.955 | n/a | 0.754 | 0.000 | 0.929 | 583.164 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.111 | 9.709 | 0.016 | 0.111 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c00000000000000eb | 577.018 | 13.315 | n/a | 0.566 | 0.000 | 1.543 | 561.091 | 0.208 | n/a | 0.094 | 0.000 | n/a | n/a | 0.202 | 13.880 | 0.024 | 0.202 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c00000000000000de | 537.402 | 12.496 | n/a | 1.566 | 0.000 | 1.134 | 521.891 | 0.020 | n/a | 0.105 | 0.000 | n/a | n/a | 0.188 | 14.063 | 0.026 | 0.188 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c000000000000010a | 464.712 | 14.150 | n/a | 1.162 | 0.000 | 0.644 | 448.497 | 0.009 | n/a | 0.045 | 0.000 | n/a | n/a | 0.206 | 15.312 | 0.033 | 0.206 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000000d7 | 453.151 | 10.138 | n/a | 2.783 | 0.000 | 0.996 | 438.907 | 0.022 | n/a | 0.097 | 0.000 | n/a | n/a | 0.209 | 12.921 | 0.029 | 0.209 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 369.872 | n/a | n/a | n/a | 4.514 | n/a | 0.000 | 0.000 | 0.808 | 365.854 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.133 | 4.631 | 0.011 | 0.133 |
| p99 | 1004.694 | n/a | n/a | n/a | 22.518 | n/a | 3.227 | 0.000 | 3.960 | 1001.018 | 0.168 | n/a | 0.127 | 0.000 | n/a | n/a | 45.797 | 23.684 | 0.390 | 45.797 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c0000000000000129 | 1004.694 | 0.203 | n/a | 0.000 | 0.000 | 2.214 | 1001.018 | 0.017 | n/a | 0.095 | 0.000 | n/a | n/a | 1.147 | 0.203 | 0.000 | 1.147 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c0000000000000117 | 1003.340 | 0.124 | n/a | 0.000 | 0.000 | 0.563 | 1000.752 | 0.008 | n/a | 0.066 | 0.000 | n/a | n/a | 1.826 | 0.124 | 0.000 | 1.826 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c000000000000012f | 1003.260 | 0.153 | n/a | 0.000 | 0.000 | 0.943 | 1000.938 | 0.016 | n/a | 0.092 | 0.000 | n/a | n/a | 1.117 | 0.153 | 0.000 | 1.117 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c000000000000013c | 1000.584 | 3.117 | n/a | 0.000 | 0.000 | 2.218 | 995.029 | 0.089 | n/a | 0.058 | 0.000 | n/a | n/a | 0.073 | 3.117 | 0.003 | 0.073 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c000000000000012e | 995.890 | 3.473 | n/a | 0.000 | 0.000 | 3.960 | 988.259 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.117 | 3.473 | 0.003 | 0.117 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000120 | 988.009 | 4.777 | n/a | 0.000 | 0.000 | 0.687 | 980.228 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 2.236 | 4.777 | 0.005 | 2.236 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000000144 | 967.124 | 5.205 | n/a | 0.000 | 0.000 | 0.545 | 961.177 | 0.008 | n/a | 0.046 | 0.000 | n/a | n/a | 0.142 | 5.205 | 0.005 | 0.142 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c0000000000000114 | 869.975 | 3.628 | n/a | 0.000 | 0.000 | 0.904 | 865.148 | 0.133 | n/a | 0.076 | 0.000 | n/a | n/a | 0.087 | 3.628 | 0.004 | 0.087 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c000000000000014c | 753.974 | 5.492 | n/a | 0.000 | 0.000 | 0.584 | 747.729 | 0.003 | n/a | 0.028 | 0.000 | n/a | n/a | 0.138 | 5.492 | 0.007 | 0.138 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c000000000000012b | 735.163 | 4.994 | n/a | 0.000 | 0.000 | 0.808 | 729.113 | 0.009 | n/a | 0.127 | 0.000 | n/a | n/a | 0.112 | 4.994 | 0.007 | 0.112 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c0000000000000121 | 734.534 | 2.759 | n/a | 0.000 | 0.000 | 0.767 | 730.861 | 0.008 | n/a | 0.060 | 0.000 | n/a | n/a | 0.080 | 2.759 | 0.004 | 0.080 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c0000000000000142 | 716.331 | 2.531 | n/a | 0.000 | 0.000 | 0.793 | 712.850 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.086 | 2.531 | 0.004 | 0.086 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c0000000000000137 | 713.777 | 4.514 | n/a | 0.000 | 0.000 | 0.642 | 708.430 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.117 | 4.514 | 0.006 | 0.117 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c0000000000000111 | 691.279 | 3.826 | n/a | 2.045 | 0.000 | 0.835 | 684.353 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.156 | 5.871 | 0.008 | 0.156 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c0000000000000139 | 683.357 | 6.604 | n/a | 0.000 | 0.000 | 0.922 | 675.537 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.248 | 6.604 | 0.010 | 0.248 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c0000000000000127 | 677.648 | 4.704 | n/a | 3.227 | 0.000 | 0.934 | 668.607 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.133 | 7.930 | 0.012 | 0.133 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c0000000000000132 | 640.645 | 4.513 | n/a | 0.000 | 0.000 | 0.869 | 635.090 | 0.007 | n/a | 0.065 | 0.000 | n/a | n/a | 0.100 | 4.513 | 0.007 | 0.100 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c0000000000000146 | 621.922 | 6.712 | n/a | 0.000 | 0.000 | 1.004 | 614.011 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.133 | 6.712 | 0.011 | 0.133 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c000000000000013d | 594.107 | 22.518 | n/a | 1.166 | 0.000 | 0.614 | 569.472 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.288 | 23.684 | 0.040 | 0.288 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c000000000000013e | 406.906 | 4.631 | n/a | 0.000 | 0.000 | 1.125 | 400.895 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.176 | 4.631 | 0.011 | 0.176 | gw-r/thread-71/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 397.688 | n/a | n/a | n/a | 3.223 | n/a | 0.000 | 0.000 | 0.815 | 391.374 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.116 | 3.234 | 0.008 | 0.116 |
| p99 | 1004.232 | n/a | n/a | n/a | 21.478 | n/a | 4.996 | 0.000 | 3.762 | 1001.128 | 0.319 | n/a | 0.123 | 0.000 | n/a | n/a | 29.863 | 21.478 | 0.700 | 29.863 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c000000000000018a | 1004.232 | 0.112 | n/a | 0.000 | 0.000 | 2.037 | 1000.907 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 1.106 | 0.112 | 0.000 | 1.106 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000158 | 1004.157 | 0.450 | n/a | 0.000 | 0.000 | 1.346 | 1001.072 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 1.200 | 0.450 | 0.000 | 1.200 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c0000000000000172 | 1003.279 | 0.191 | n/a | 0.000 | 0.000 | 0.972 | 1000.854 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 1.188 | 0.191 | 0.000 | 1.188 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000183 | 1003.203 | 0.146 | n/a | 0.000 | 0.000 | 0.703 | 1001.128 | 0.009 | n/a | 0.094 | 0.000 | n/a | n/a | 1.124 | 0.146 | 0.000 | 1.124 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c0000000000000169 | 992.368 | 2.966 | n/a | 0.000 | 0.000 | 0.549 | 988.600 | 0.148 | n/a | 0.042 | 0.000 | n/a | n/a | 0.064 | 2.966 | 0.003 | 0.064 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c000000000000018c | 959.274 | 3.022 | n/a | 0.000 | 0.000 | 1.999 | 954.125 | 0.006 | n/a | 0.033 | 0.000 | n/a | n/a | 0.090 | 3.022 | 0.003 | 0.090 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c0000000000000179 | 957.344 | 3.240 | n/a | 0.000 | 0.000 | 2.807 | 950.786 | 0.132 | n/a | 0.044 | 0.000 | n/a | n/a | 0.336 | 3.240 | 0.003 | 0.336 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c000000000000015e | 822.346 | 5.545 | n/a | 0.000 | 0.000 | 0.466 | 815.784 | 0.319 | n/a | 0.054 | 0.000 | n/a | n/a | 0.177 | 5.545 | 0.007 | 0.177 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c000000000000017e | 795.177 | 2.904 | n/a | 0.000 | 0.000 | 1.278 | 790.815 | 0.007 | n/a | 0.100 | 0.000 | n/a | n/a | 0.073 | 2.904 | 0.004 | 0.073 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c000000000000015a | 744.933 | 6.000 | n/a | 0.000 | 0.000 | 1.104 | 737.501 | 0.009 | n/a | 0.057 | 0.000 | n/a | n/a | 0.261 | 6.000 | 0.008 | 0.261 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c0000000000000171 | 631.535 | 5.210 | n/a | 0.000 | 0.000 | 2.587 | 623.515 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.167 | 5.210 | 0.008 | 0.167 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000000188 | 629.695 | 3.811 | n/a | 0.000 | 0.000 | 1.052 | 624.694 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.063 | 3.811 | 0.006 | 0.063 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c0000000000000153 | 615.621 | 4.728 | n/a | 0.000 | 0.000 | 0.907 | 609.248 | 0.021 | n/a | 0.072 | 0.000 | n/a | n/a | 0.645 | 4.728 | 0.008 | 0.645 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c000000000000018e | 594.418 | 2.687 | n/a | 4.996 | 0.000 | 0.754 | 585.814 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.117 | 7.683 | 0.013 | 0.117 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c0000000000000181 | 579.923 | 2.619 | n/a | 0.000 | 0.000 | 0.663 | 576.321 | 0.127 | n/a | 0.069 | 0.000 | n/a | n/a | 0.124 | 2.619 | 0.005 | 0.124 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000175 | 572.973 | 3.105 | n/a | 0.000 | 0.000 | 0.666 | 569.068 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.068 | 3.105 | 0.005 | 0.068 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c000000000000016a | 555.792 | 7.008 | n/a | 0.000 | 0.000 | 2.330 | 546.042 | 0.188 | n/a | 0.060 | 0.000 | n/a | n/a | 0.165 | 7.008 | 0.013 | 0.165 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c000000000000017a | 516.844 | 4.013 | n/a | 0.000 | 0.000 | 0.768 | 511.914 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.095 | 4.013 | 0.008 | 0.095 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c000000000000017b | 478.999 | 4.979 | n/a | 0.000 | 0.000 | 0.729 | 473.144 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.091 | 4.979 | 0.010 | 0.091 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c000000000000016b | 437.925 | 2.620 | n/a | 0.000 | 0.000 | 0.768 | 434.364 | 0.021 | n/a | 0.064 | 0.000 | n/a | n/a | 0.087 | 2.620 | 0.006 | 0.087 | gw-r/thread-70/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 337.648 | n/a | n/a | n/a | 4.523 | n/a | 0.000 | 0.000 | 0.700 | 323.049 | 0.009 | n/a | 0.040 | 0.000 | n/a | n/a | 0.127 | 4.523 | 0.013 | 0.127 |
| p99 | 1002.681 | n/a | n/a | n/a | 19.411 | n/a | 0.000 | 0.000 | 11.231 | 1000.826 | 2.633 | n/a | 0.105 | 0.000 | n/a | n/a | 47.427 | 19.411 | 0.720 | 47.427 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c00000000000001ab | 1002.681 | 0.112 | n/a | 0.000 | 0.000 | 0.520 | 1000.826 | 0.013 | n/a | 0.105 | 0.000 | n/a | n/a | 1.106 | 0.112 | 0.000 | 1.106 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c00000000000001c8 | 1001.406 | 9.522 | n/a | 0.000 | 0.000 | 0.780 | 990.821 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.214 | 9.522 | 0.010 | 0.214 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000000190 | 994.592 | 2.604 | n/a | 0.000 | 0.000 | 2.384 | 989.469 | 0.006 | n/a | 0.057 | 0.000 | n/a | n/a | 0.072 | 2.604 | 0.003 | 0.072 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c000000000000019f | 990.867 | 7.083 | n/a | 0.000 | 0.000 | 3.946 | 979.616 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.108 | 7.083 | 0.007 | 0.108 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000001c9 | 973.946 | 3.454 | n/a | 0.000 | 0.000 | 0.867 | 967.389 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 2.175 | 3.454 | 0.004 | 2.175 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000001aa | 931.346 | 5.109 | n/a | 0.000 | 0.000 | 0.629 | 925.243 | 0.198 | n/a | 0.040 | 0.000 | n/a | n/a | 0.128 | 5.109 | 0.005 | 0.128 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c00000000000001ad | 926.542 | 10.145 | n/a | 0.000 | 0.000 | 6.764 | 909.491 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.098 | 10.145 | 0.011 | 0.098 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c00000000000001a1 | 839.881 | 4.458 | n/a | 0.000 | 0.000 | 0.572 | 834.650 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.148 | 4.458 | 0.005 | 0.148 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000001c7 | 814.762 | 5.650 | n/a | 0.000 | 0.000 | 0.642 | 808.135 | 0.159 | n/a | 0.029 | 0.000 | n/a | n/a | 0.148 | 5.650 | 0.007 | 0.148 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000001d9 | 739.368 | 1.644 | n/a | 0.000 | 0.000 | 0.630 | 736.895 | 0.076 | n/a | 0.057 | 0.000 | n/a | n/a | 0.067 | 1.644 | 0.002 | 0.067 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000001d2 | 704.090 | 2.656 | n/a | 0.000 | 0.000 | 1.188 | 700.032 | 0.116 | n/a | 0.032 | 0.000 | n/a | n/a | 0.067 | 2.656 | 0.004 | 0.067 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000001bb | 677.531 | 2.444 | n/a | 0.000 | 0.000 | 0.539 | 674.431 | 0.006 | n/a | 0.027 | 0.000 | n/a | n/a | 0.085 | 2.444 | 0.004 | 0.085 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000001a5 | 631.174 | 8.782 | n/a | 0.000 | 0.000 | 0.927 | 621.285 | 0.011 | n/a | 0.042 | 0.000 | n/a | n/a | 0.127 | 8.782 | 0.014 | 0.127 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000001ca | 617.914 | 2.784 | n/a | 0.000 | 0.000 | 1.611 | 613.335 | 0.005 | n/a | 0.087 | 0.000 | n/a | n/a | 0.092 | 2.784 | 0.005 | 0.092 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000001b5 | 577.042 | 4.797 | n/a | 0.000 | 0.000 | 1.013 | 570.912 | 0.158 | n/a | 0.062 | 0.000 | n/a | n/a | 0.099 | 4.797 | 0.008 | 0.099 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c00000000000001ae | 551.820 | 6.974 | n/a | 0.000 | 0.000 | 1.441 | 543.085 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.248 | 6.974 | 0.013 | 0.248 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c00000000000001bd | 548.004 | 15.456 | n/a | 0.000 | 0.000 | 0.732 | 531.621 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.144 | 15.456 | 0.028 | 0.144 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000001d5 | 545.170 | 3.194 | n/a | 0.000 | 0.000 | 0.697 | 541.112 | 0.006 | n/a | 0.034 | 0.000 | n/a | n/a | 0.127 | 3.194 | 0.006 | 0.127 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000001be | 542.276 | 3.491 | n/a | 0.000 | 0.000 | 0.835 | 537.617 | 0.171 | n/a | 0.058 | 0.000 | n/a | n/a | 0.104 | 3.491 | 0.006 | 0.104 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c000000000000019e | 469.091 | 3.000 | n/a | 0.000 | 0.000 | 0.713 | 465.222 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.116 | 3.000 | 0.006 | 0.116 | gw-r/thread-51/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 307.252 | n/a | n/a | n/a | 3.375 | n/a | 0.000 | 0.000 | 0.701 | 301.673 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.093 | 3.375 | 0.011 | 0.093 |
| p99 | 1004.101 | n/a | n/a | n/a | 11.974 | n/a | 0.000 | 0.000 | 4.122 | 1001.291 | 0.323 | n/a | 0.101 | 0.000 | n/a | n/a | 32.988 | 11.974 | 0.478 | 32.988 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c000000000000021b | 1004.101 | 0.333 | n/a | 0.000 | 0.000 | 1.192 | 1001.291 | 0.009 | n/a | 0.085 | 0.000 | n/a | n/a | 1.190 | 0.333 | 0.000 | 1.190 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c0000000000000216 | 1003.130 | 0.146 | n/a | 0.000 | 0.000 | 0.555 | 1001.184 | 0.020 | n/a | 0.101 | 0.000 | n/a | n/a | 1.125 | 0.146 | 0.000 | 1.125 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000000202 | 1001.408 | 2.394 | n/a | 0.000 | 0.000 | 0.633 | 998.115 | 0.130 | n/a | 0.056 | 0.000 | n/a | n/a | 0.081 | 2.394 | 0.002 | 0.081 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c0000000000000215 | 1000.775 | 3.375 | n/a | 0.000 | 0.000 | 0.781 | 996.470 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.090 | 3.375 | 0.003 | 0.090 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000001ee | 995.907 | 2.472 | n/a | 0.000 | 0.000 | 2.477 | 990.818 | 0.012 | n/a | 0.057 | 0.000 | n/a | n/a | 0.070 | 2.472 | 0.002 | 0.070 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c000000000000020a | 942.984 | 3.759 | n/a | 0.000 | 0.000 | 0.578 | 938.525 | 0.006 | n/a | 0.043 | 0.000 | n/a | n/a | 0.073 | 3.759 | 0.004 | 0.073 | gw-r/thread-70/journal/page | none observed |
| c3ed4c323f60973c0000000000000219 | 924.540 | 2.815 | n/a | 0.000 | 0.000 | 0.630 | 920.766 | 0.169 | n/a | 0.054 | 0.000 | n/a | n/a | 0.105 | 2.815 | 0.003 | 0.105 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c000000000000021d | 895.099 | 4.604 | n/a | 0.000 | 0.000 | 0.806 | 889.301 | 0.009 | n/a | 0.050 | 0.000 | n/a | n/a | 0.329 | 4.604 | 0.005 | 0.329 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c0000000000000203 | 782.263 | 3.156 | n/a | 0.000 | 0.000 | 0.701 | 778.230 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.104 | 3.156 | 0.004 | 0.104 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c00000000000001fb | 731.379 | 8.011 | n/a | 0.000 | 0.000 | 2.688 | 720.332 | 0.130 | n/a | 0.064 | 0.000 | n/a | n/a | 0.154 | 8.011 | 0.011 | 0.154 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000001e1 | 717.735 | 3.825 | n/a | 0.000 | 0.000 | 0.743 | 713.054 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.068 | 3.825 | 0.005 | 0.068 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000000206 | 713.587 | 8.988 | n/a | 0.000 | 0.000 | 3.388 | 700.688 | 0.323 | n/a | 0.075 | 0.000 | n/a | n/a | 0.125 | 8.988 | 0.013 | 0.125 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000001f8 | 713.004 | 3.872 | n/a | 0.000 | 0.000 | 0.611 | 708.293 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.162 | 3.872 | 0.005 | 0.162 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c00000000000001f4 | 696.963 | 2.657 | n/a | 0.000 | 0.000 | 0.719 | 693.463 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.072 | 2.657 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| c3ed4c323f60973c00000000000001ec | 683.242 | 9.836 | n/a | 0.000 | 0.000 | 0.675 | 672.531 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.138 | 9.836 | 0.014 | 0.138 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c00000000000001de | 587.884 | 2.567 | n/a | 0.000 | 0.000 | 2.034 | 583.079 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.122 | 2.567 | 0.004 | 0.122 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000000213 | 526.696 | 2.481 | n/a | 0.000 | 0.000 | 0.425 | 523.574 | 0.112 | n/a | 0.043 | 0.000 | n/a | n/a | 0.062 | 2.481 | 0.005 | 0.062 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c00000000000001fd | 500.998 | 8.908 | n/a | 0.000 | 0.000 | 3.837 | 488.049 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.145 | 8.908 | 0.018 | 0.145 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c00000000000001f2 | 495.207 | 3.410 | n/a | 0.000 | 0.000 | 2.888 | 488.767 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.073 | 3.410 | 0.007 | 0.073 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c00000000000001e5 | 467.453 | 4.846 | n/a | 0.000 | 0.000 | 0.900 | 461.466 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.196 | 4.846 | 0.010 | 0.196 | gw-r/thread-48/journal/page | none observed |

## P3 / tail / internal (2978 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.977 | n/a | n/a | n/a | 4.153 | n/a | 0.000 | 0.000 | 0.269 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.113 | 4.154 | 0.355 | 6.113 |
| p99 | 340.602 | n/a | n/a | n/a | 22.726 | n/a | 1.930 | 0.000 | 1.424 | 334.440 | 0.135 | n/a | 0.044 | 0.000 | n/a | n/a | 48.117 | 23.055 | 0.858 | 48.117 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| c3ed4c323f60973c0000000000001a5a | 1002.602 | 0.116 | n/a | 0.000 | 0.000 | 0.411 | 1000.914 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 1.093 | 0.116 | 0.000 | 1.093 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000000229 | 1002.516 | 0.126 | n/a | 0.000 | 0.000 | 0.484 | 1000.704 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 1.119 | 0.126 | 0.000 | 1.119 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000001a9e | 1002.477 | 0.121 | n/a | 0.000 | 0.000 | 0.317 | 1000.886 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 1.090 | 0.121 | 0.000 | 1.090 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c0000000000001a74 | 1002.273 | 0.117 | n/a | 0.000 | 0.000 | 0.399 | 1000.600 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 1.094 | 0.117 | 0.000 | 1.094 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000001a50 | 1002.128 | 0.094 | n/a | 0.000 | 0.000 | 0.378 | 1000.529 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 1.089 | 0.094 | 0.000 | 1.089 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c0000000000001a9a | 999.435 | 4.568 | n/a | 0.000 | 0.000 | 0.529 | 994.207 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.097 | 4.568 | 0.005 | 0.097 | gw-r/thread-69/journal/page | none observed |
| c3ed4c323f60973c0000000000001a95 | 991.768 | 2.878 | n/a | 0.000 | 0.000 | 0.477 | 988.240 | 0.097 | n/a | 0.020 | 0.000 | n/a | n/a | 0.056 | 2.878 | 0.003 | 0.056 | gw-r/thread-67/journal/page | none observed |
| c3ed4c323f60973c0000000000001a4e | 970.617 | 2.733 | n/a | 0.000 | 0.000 | 0.367 | 967.422 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.064 | 2.733 | 0.003 | 0.064 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c0000000000001a65 | 939.927 | 5.381 | n/a | 0.000 | 0.000 | 0.393 | 933.998 | 0.005 | n/a | 0.027 | 0.000 | n/a | n/a | 0.125 | 5.381 | 0.006 | 0.125 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c0000000000001a55 | 913.449 | 3.493 | n/a | 0.000 | 0.000 | 0.422 | 909.403 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.097 | 3.493 | 0.004 | 0.097 | gw-r/thread-71/journal/page | none observed |
| c3ed4c323f60973c0000000000001a52 | 828.625 | 12.201 | n/a | 1.684 | 0.000 | 0.785 | 813.293 | 0.380 | n/a | 0.034 | 0.000 | n/a | n/a | 0.248 | 13.885 | 0.017 | 0.248 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c000000000000021e | 826.224 | 3.861 | n/a | 0.000 | 0.000 | 0.710 | 821.349 | 0.142 | n/a | 0.039 | 0.000 | n/a | n/a | 0.124 | 3.861 | 0.005 | 0.124 | gw-r/thread-49/journal/page | none observed |
| c3ed4c323f60973c0000000000001a77 | 807.995 | 4.386 | n/a | 0.000 | 0.000 | 0.441 | 803.007 | 0.008 | n/a | 0.034 | 0.000 | n/a | n/a | 0.118 | 4.386 | 0.005 | 0.118 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c000000000000022b | 741.027 | 3.265 | n/a | 0.000 | 0.000 | 0.628 | 736.980 | 0.006 | n/a | 0.074 | 0.000 | n/a | n/a | 0.074 | 3.265 | 0.004 | 0.074 | gw-r/thread-48/journal/page | none observed |
| c3ed4c323f60973c0000000000001a97 | 735.441 | 2.099 | n/a | 0.000 | 0.000 | 0.405 | 732.850 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.060 | 2.099 | 0.003 | 0.060 | gw-r/thread-68/journal/page | none observed |
| c3ed4c323f60973c0000000000000226 | 719.345 | 2.960 | n/a | 0.000 | 0.000 | 0.709 | 715.518 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.106 | 2.960 | 0.004 | 0.106 | gw-r/thread-51/journal/page | none observed |
| c3ed4c323f60973c0000000000001a70 | 707.134 | 4.282 | n/a | 0.000 | 0.000 | 0.492 | 702.202 | 0.004 | n/a | 0.017 | 0.000 | n/a | n/a | 0.136 | 4.282 | 0.006 | 0.136 | gw-r/thread-44/journal/page | none observed |
| c3ed4c323f60973c0000000000000221 | 660.486 | 3.561 | n/a | 0.000 | 0.000 | 0.833 | 655.964 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.084 | 3.561 | 0.005 | 0.084 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c0000000000001a6b | 645.618 | 3.680 | n/a | 0.000 | 0.000 | 0.636 | 641.218 | 0.007 | n/a | 0.026 | 0.000 | n/a | n/a | 0.051 | 3.680 | 0.006 | 0.051 | gw-r/thread-50/journal/page | none observed |
| c3ed4c323f60973c0000000000001a8f | 589.656 | 3.890 | n/a | 0.000 | 0.000 | 0.573 | 585.026 | 0.080 | n/a | 0.027 | 0.000 | n/a | n/a | 0.061 | 3.890 | 0.007 | 0.061 | gw-r/thread-49/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.503 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.005 | 201.097 | 0.018 | n/a | 0.131 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 228.982 | n/a | n/a | n/a | 0.701 | n/a | 0.000 | 0.000 | 27.715 | 203.528 | 2.794 | n/a | 0.305 | 0.000 | n/a | n/a | 49.836 | 0.701 | 0.003 | 49.836 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd709000000000000002f | 228.982 | 0.000 | n/a | 0.000 | 0.000 | 27.715 | 200.985 | 0.017 | n/a | 0.126 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd709000000000000001f | 204.855 | 0.000 | n/a | 0.000 | 0.000 | 3.143 | 201.368 | 0.027 | n/a | 0.177 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd7090000000000000051 | 204.728 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 203.528 | 0.031 | n/a | 0.140 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd7090000000000000036 | 204.651 | 0.000 | n/a | 0.000 | 0.000 | 2.871 | 201.428 | 0.040 | n/a | 0.169 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000013 | 204.546 | 0.000 | n/a | 0.000 | 0.000 | 1.298 | 202.648 | 0.026 | n/a | 0.230 | 0.000 | n/a | n/a | 0.344 | 0.000 | 0.000 | 0.344 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000009 | 204.349 | 0.000 | n/a | 0.000 | 0.000 | 2.341 | 201.437 | 0.017 | n/a | 0.157 | 0.000 | n/a | n/a | 0.397 | 0.000 | 0.000 | 0.397 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd709000000000000002e | 203.995 | 0.000 | n/a | 0.000 | 0.000 | 1.433 | 201.247 | 0.019 | n/a | 0.135 | 0.000 | n/a | n/a | 1.161 | 0.000 | 0.000 | 1.161 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd709000000000000000f | 203.639 | 0.000 | n/a | 0.000 | 0.000 | 1.519 | 201.829 | 0.012 | n/a | 0.158 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| d9f8237f1f8bd7090000000000000035 | 203.633 | 0.000 | n/a | 0.000 | 0.000 | 2.035 | 201.269 | 0.022 | n/a | 0.173 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-47/journal/page | none observed |
| d9f8237f1f8bd7090000000000000012 | 203.448 | 0.000 | n/a | 0.000 | 0.000 | 1.222 | 201.854 | 0.063 | n/a | 0.178 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-44/journal/page | none observed |
| d9f8237f1f8bd709000000000000001d | 203.445 | 0.000 | n/a | 0.000 | 0.000 | 0.623 | 202.471 | 0.019 | n/a | 0.234 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd7090000000000000017 | 203.295 | 0.000 | n/a | 0.000 | 0.000 | 1.847 | 201.104 | 0.015 | n/a | 0.174 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd7090000000000000039 | 203.205 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.995 | 0.063 | n/a | 0.119 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd709000000000000002c | 203.157 | 0.000 | n/a | 0.000 | 0.000 | 1.453 | 201.360 | 0.037 | n/a | 0.185 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000055 | 203.147 | 0.701 | n/a | 0.000 | 0.000 | 1.080 | 201.098 | 0.015 | n/a | 0.129 | 0.000 | n/a | n/a | 0.123 | 0.701 | 0.003 | 0.123 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000056 | 203.093 | 0.000 | n/a | 0.000 | 0.000 | 0.923 | 201.856 | 0.033 | n/a | 0.157 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-44/journal/page | none observed |
| d9f8237f1f8bd7090000000000000020 | 203.074 | 0.000 | n/a | 0.000 | 0.000 | 1.773 | 200.982 | 0.016 | n/a | 0.130 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000054 | 203.028 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.997 | 0.019 | n/a | 0.121 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd709000000000000003f | 203.021 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.642 | 0.018 | n/a | 0.177 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-44/journal/page | none observed |
| d9f8237f1f8bd709000000000000003b | 203.015 | 0.000 | n/a | 0.000 | 0.000 | 1.472 | 201.255 | 0.012 | n/a | 0.146 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-51/journal/page | none observed |

## P3 / L1 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.049 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.860 | 200.932 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 |
| p99 | 220.949 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 21.463 | 219.595 | 33.994 | n/a | 0.209 | 0.000 | n/a | n/a | 50.493 | 0.000 | 0.000 | 50.493 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd7090000000000000077 | 220.949 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 219.595 | 0.084 | n/a | 0.191 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000064 | 207.324 | 0.000 | n/a | 0.000 | 0.000 | 5.614 | 201.279 | 0.019 | n/a | 0.209 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd70900000000000000bb | 204.580 | 0.000 | n/a | 0.000 | 0.000 | 3.460 | 200.926 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd70900000000000000b0 | 204.387 | 0.000 | n/a | 0.000 | 0.000 | 0.768 | 203.418 | 0.008 | n/a | 0.100 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000090 | 204.170 | 0.000 | n/a | 0.000 | 0.000 | 1.685 | 202.143 | 0.022 | n/a | 0.187 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000091 | 203.918 | 0.000 | n/a | 0.000 | 0.000 | 2.316 | 201.302 | 0.014 | n/a | 0.152 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000000a2 | 203.877 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 200.681 | 0.010 | n/a | 0.067 | 0.000 | n/a | n/a | 2.216 | 0.000 | 0.000 | 2.216 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000059 | 203.188 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 201.682 | 0.029 | n/a | 0.173 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000078 | 203.047 | 0.000 | n/a | 0.000 | 0.000 | 1.467 | 201.259 | 0.014 | n/a | 0.105 | 0.000 | n/a | n/a | 0.202 | 0.000 | 0.000 | 0.202 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd7090000000000000079 | 203.040 | 0.000 | n/a | 0.000 | 0.000 | 1.151 | 201.304 | 0.024 | n/a | 0.121 | 0.000 | n/a | n/a | 0.440 | 0.000 | 0.000 | 0.440 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000000b2 | 203.005 | 0.000 | n/a | 0.000 | 0.000 | 1.979 | 200.760 | 0.046 | n/a | 0.069 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd70900000000000000b7 | 203.005 | 0.000 | n/a | 0.000 | 0.000 | 1.234 | 201.359 | 0.040 | n/a | 0.207 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd709000000000000005b | 202.944 | 0.000 | n/a | 0.000 | 0.000 | 0.956 | 201.640 | 0.017 | n/a | 0.161 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd70900000000000000bc | 202.902 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.474 | 0.017 | n/a | 0.136 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd709000000000000009b | 202.771 | 0.000 | n/a | 0.000 | 0.000 | 1.101 | 201.372 | 0.016 | n/a | 0.137 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd7090000000000000062 | 202.759 | 0.000 | n/a | 0.000 | 0.000 | 1.085 | 201.345 | 0.054 | n/a | 0.117 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd709000000000000006c | 202.565 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.213 | 0.013 | n/a | 0.120 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd709000000000000008e | 202.544 | 0.000 | n/a | 0.000 | 0.000 | 0.754 | 201.493 | 0.022 | n/a | 0.164 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd709000000000000007b | 202.505 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 201.250 | 0.016 | n/a | 0.145 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000095 | 202.493 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.415 | 0.017 | n/a | 0.153 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.949 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.822 | 200.901 | 0.010 | n/a | 0.089 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 |
| p99 | 203.340 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.177 | 201.873 | 4.390 | n/a | 0.257 | 0.000 | n/a | n/a | 1.246 | 0.000 | 0.000 | 1.246 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd70900000000000000ed | 203.340 | 0.000 | n/a | 0.000 | 0.000 | 2.146 | 200.934 | 0.014 | n/a | 0.110 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd709000000000000011a | 203.250 | 0.000 | n/a | 0.000 | 0.000 | 0.811 | 201.125 | 0.010 | n/a | 0.057 | 0.000 | n/a | n/a | 1.246 | 0.000 | 0.000 | 1.246 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd70900000000000000c2 | 203.036 | 0.000 | n/a | 0.000 | 0.000 | 1.665 | 201.128 | 0.009 | n/a | 0.130 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd70900000000000000fc | 202.961 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 201.574 | 0.041 | n/a | 0.180 | 0.000 | n/a | n/a | 0.339 | 0.000 | 0.000 | 0.339 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000000f6 | 202.927 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.576 | 0.052 | n/a | 0.257 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000000fa | 202.889 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.622 | 0.032 | n/a | 0.191 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000000da | 202.846 | 0.000 | n/a | 0.000 | 0.000 | 1.041 | 201.521 | 0.030 | n/a | 0.139 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000118 | 202.767 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 201.524 | 0.006 | n/a | 0.106 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd70900000000000000eb | 202.739 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 201.246 | 0.013 | n/a | 0.125 | 0.000 | n/a | n/a | 0.171 | 0.000 | 0.000 | 0.171 | gw-r/thread-44/journal/page | none observed |
| d9f8237f1f8bd70900000000000000ea | 202.735 | 0.000 | n/a | 0.000 | 0.000 | 0.925 | 201.477 | 0.028 | n/a | 0.168 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000000f9 | 202.728 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 201.689 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd70900000000000000d2 | 202.664 | 0.000 | n/a | 0.000 | 0.000 | 0.575 | 201.873 | 0.018 | n/a | 0.091 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd70900000000000000fb | 202.659 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 201.325 | 0.011 | n/a | 0.124 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd7090000000000000112 | 202.627 | 0.000 | n/a | 0.000 | 0.000 | 0.901 | 201.459 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-47/journal/page | none observed |
| d9f8237f1f8bd7090000000000000101 | 202.619 | 0.000 | n/a | 0.000 | 0.000 | 1.522 | 200.891 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000000f8 | 202.603 | 0.000 | n/a | 0.000 | 0.000 | 0.843 | 201.426 | 0.015 | n/a | 0.185 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000000c7 | 202.497 | 0.000 | n/a | 0.000 | 0.000 | 0.904 | 201.308 | 0.033 | n/a | 0.111 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000000d7 | 202.469 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 201.019 | 0.011 | n/a | 0.096 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd7090000000000000120 | 202.445 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 201.369 | 0.016 | n/a | 0.124 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd70900000000000000f1 | 202.421 | 0.000 | n/a | 0.000 | 0.000 | 1.056 | 200.994 | 0.014 | n/a | 0.139 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.775 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 200.832 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 208.407 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.913 | 201.814 | 14.004 | n/a | 0.167 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd709000000000000015a | 208.407 | 0.000 | n/a | 0.000 | 0.000 | 6.913 | 201.250 | 0.020 | n/a | 0.091 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd7090000000000000139 | 206.579 | 0.000 | n/a | 0.000 | 0.000 | 4.515 | 201.814 | 0.007 | n/a | 0.074 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd709000000000000014f | 205.664 | 0.000 | n/a | 0.000 | 0.000 | 4.315 | 201.155 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd7090000000000000137 | 203.524 | 0.000 | n/a | 0.000 | 0.000 | 1.240 | 201.809 | 0.026 | n/a | 0.095 | 0.000 | n/a | n/a | 0.354 | 0.000 | 0.000 | 0.354 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000154 | 203.155 | 0.000 | n/a | 0.000 | 0.000 | 1.917 | 200.933 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd7090000000000000142 | 202.944 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 201.509 | 0.036 | n/a | 0.128 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd709000000000000016e | 202.922 | 0.000 | n/a | 0.000 | 0.000 | 1.196 | 201.265 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.363 | 0.000 | 0.000 | 0.363 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd7090000000000000176 | 202.827 | 0.000 | n/a | 0.000 | 0.000 | 1.349 | 201.238 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd709000000000000015f | 202.757 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 200.915 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd709000000000000013b | 202.709 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.428 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000170 | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 1.301 | 201.050 | 0.016 | n/a | 0.106 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd709000000000000014d | 202.510 | 0.000 | n/a | 0.000 | 0.000 | 1.122 | 201.126 | 0.006 | n/a | 0.086 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd709000000000000017b | 202.444 | 0.000 | n/a | 0.000 | 0.000 | 1.212 | 201.037 | 0.012 | n/a | 0.070 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd7090000000000000160 | 202.428 | 0.000 | n/a | 0.000 | 0.000 | 1.022 | 201.148 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000136 | 202.416 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 201.316 | 0.017 | n/a | 0.080 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000182 | 202.366 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 201.219 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd709000000000000014c | 202.355 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 201.180 | 0.006 | n/a | 0.115 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd709000000000000014a | 202.322 | 0.000 | n/a | 0.000 | 0.000 | 0.896 | 201.212 | 0.007 | n/a | 0.094 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd7090000000000000132 | 202.305 | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 201.327 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd709000000000000014e | 202.285 | 0.000 | n/a | 0.000 | 0.000 | 0.850 | 201.223 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.722 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 200.821 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 203.962 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.774 | 201.327 | 3.141 | n/a | 0.115 | 0.000 | n/a | n/a | 0.330 | 0.000 | 0.000 | 0.330 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd70900000000000001e7 | 204.326 | 0.000 | n/a | 0.000 | 0.000 | 3.275 | 200.862 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000001ea | 203.962 | 0.000 | n/a | 0.000 | 0.000 | 2.828 | 200.948 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd709000000000000019b | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 1.512 | 201.031 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd70900000000000001e9 | 202.588 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.291 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000001fc | 202.517 | 0.000 | n/a | 0.000 | 0.000 | 1.291 | 200.955 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd70900000000000001bc | 202.431 | 0.000 | n/a | 0.000 | 0.000 | 1.097 | 201.133 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd70900000000000001e1 | 202.413 | 0.000 | n/a | 0.000 | 0.000 | 1.152 | 200.981 | 0.011 | n/a | 0.071 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd70900000000000001ef | 202.409 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.319 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd70900000000000001c2 | 202.405 | 0.000 | n/a | 0.000 | 0.000 | 0.820 | 201.334 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000001a1 | 202.321 | 0.000 | n/a | 0.000 | 0.000 | 1.018 | 201.031 | 0.009 | n/a | 0.087 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000001b4 | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 1.050 | 201.082 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd70900000000000001b1 | 202.241 | 0.000 | n/a | 0.000 | 0.000 | 0.943 | 200.981 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.232 | 0.000 | 0.000 | 0.232 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd70900000000000001a9 | 202.241 | 0.000 | n/a | 0.000 | 0.000 | 1.009 | 200.989 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000001c9 | 202.235 | 0.000 | n/a | 0.000 | 0.000 | 1.145 | 200.859 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd70900000000000001f8 | 202.232 | 0.000 | n/a | 0.000 | 0.000 | 0.900 | 201.118 | 0.006 | n/a | 0.093 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd70900000000000001a4 | 202.228 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 201.079 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd70900000000000001d8 | 202.191 | 0.000 | n/a | 0.000 | 0.000 | 0.689 | 201.257 | 0.011 | n/a | 0.087 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd709000000000000019d | 202.159 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 201.119 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd70900000000000001eb | 202.157 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.327 | 0.027 | n/a | 0.081 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd7090000000000000192 | 202.153 | 0.000 | n/a | 0.000 | 0.000 | 0.747 | 201.202 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (96 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.948 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.862 | 0.008 | n/a | 0.062 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 |
| p99 | 210.235 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 9.146 | 204.600 | 6.759 | n/a | 0.243 | 0.000 | n/a | n/a | 0.619 | 0.000 | 0.000 | 0.619 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd7090000000000000214 | 210.235 | 0.000 | n/a | 0.000 | 0.000 | 9.146 | 200.873 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd7090000000000000217 | 206.868 | 0.000 | n/a | 0.000 | 0.000 | 1.872 | 204.600 | 0.010 | n/a | 0.229 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd709000000000000023b | 206.051 | 0.000 | n/a | 0.000 | 0.000 | 4.726 | 201.109 | 0.008 | n/a | 0.078 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd7090000000000000235 | 205.267 | 0.000 | n/a | 0.000 | 0.000 | 2.256 | 202.140 | 0.008 | n/a | 0.243 | 0.000 | n/a | n/a | 0.619 | 0.000 | 0.000 | 0.619 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd709000000000000024f | 204.581 | 0.000 | n/a | 0.000 | 0.000 | 3.419 | 200.911 | 0.007 | n/a | 0.061 | 0.000 | n/a | n/a | 0.183 | 0.000 | 0.000 | 0.183 | gw-r/thread-46/journal/page | none observed |
| d9f8237f1f8bd7090000000000000260 | 203.771 | 0.000 | n/a | 0.000 | 0.000 | 2.787 | 200.797 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000249 | 203.516 | 0.000 | n/a | 0.000 | 0.000 | 2.273 | 201.037 | 0.016 | n/a | 0.073 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000244 | 203.405 | 0.000 | n/a | 0.000 | 0.000 | 2.207 | 200.986 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000274 | 203.380 | 0.000 | n/a | 0.000 | 0.000 | 1.485 | 201.464 | 0.013 | n/a | 0.123 | 0.000 | n/a | n/a | 0.295 | 0.000 | 0.000 | 0.295 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd709000000000000021d | 203.289 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 201.643 | 0.018 | n/a | 0.113 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000234 | 203.210 | 0.000 | n/a | 0.000 | 0.000 | 1.225 | 201.650 | 0.052 | n/a | 0.104 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd7090000000000000237 | 202.848 | 0.000 | n/a | 0.000 | 0.000 | 1.074 | 201.476 | 0.022 | n/a | 0.080 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000258 | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 1.214 | 201.278 | 0.006 | n/a | 0.098 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000211 | 202.738 | 0.000 | n/a | 0.000 | 0.000 | 1.690 | 200.791 | 0.011 | n/a | 0.070 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000279 | 202.613 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 201.287 | 0.019 | n/a | 0.084 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd7090000000000000222 | 202.598 | 0.000 | n/a | 0.000 | 0.000 | 0.898 | 201.378 | 0.030 | n/a | 0.132 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000255 | 202.595 | 0.000 | n/a | 0.000 | 0.000 | 1.420 | 200.858 | 0.011 | n/a | 0.053 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd709000000000000022b | 202.492 | 0.000 | n/a | 0.000 | 0.000 | 0.497 | 201.718 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd709000000000000026d | 202.481 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.173 | 0.008 | n/a | 0.110 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000228 | 202.463 | 0.000 | n/a | 0.000 | 0.000 | 1.132 | 201.049 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-68/journal/page | none observed |

## P3 / tail / read (275 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.017 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.521 | 79.830 | 0.006 | n/a | 0.032 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 202.595 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.691 | 201.160 | 2.642 | n/a | 0.092 | 0.000 | n/a | n/a | 50.068 | 0.000 | 0.000 | 50.068 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d9f8237f1f8bd7090000000000000ed6 | 202.811 | 0.000 | n/a | 0.000 | 0.000 | 1.831 | 200.798 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd709000000000000028d | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 201.421 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.394 | 0.000 | 0.000 | 0.394 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000ed9 | 202.595 | 0.000 | n/a | 0.000 | 0.000 | 0.608 | 201.645 | 0.029 | n/a | 0.145 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd7090000000000000ec5 | 202.354 | 0.000 | n/a | 0.000 | 0.000 | 1.413 | 200.743 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000e9f | 202.328 | 0.000 | n/a | 0.000 | 0.000 | 1.675 | 200.506 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.112 | 0.000 | 0.000 | 0.112 | gw-r/thread-48/journal/page | none observed |
| d9f8237f1f8bd7090000000000000e81 | 202.207 | 0.000 | n/a | 0.000 | 0.000 | 1.364 | 200.701 | 0.009 | n/a | 0.048 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-70/journal/page | none observed |
| d9f8237f1f8bd7090000000000000292 | 202.020 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 200.952 | 0.005 | n/a | 0.069 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-51/journal/page | none observed |
| d9f8237f1f8bd7090000000000000ebd | 202.017 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 201.063 | 0.011 | n/a | 0.046 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd7090000000000000284 | 201.985 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.075 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd709000000000000028b | 201.937 | 0.000 | n/a | 0.000 | 0.000 | 0.649 | 201.077 | 0.008 | n/a | 0.070 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000286 | 201.909 | 0.000 | n/a | 0.000 | 0.000 | 0.733 | 200.944 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-69/journal/page | none observed |
| d9f8237f1f8bd7090000000000000295 | 201.849 | 0.000 | n/a | 0.000 | 0.000 | 0.535 | 201.125 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd7090000000000000ef2 | 201.844 | 0.000 | n/a | 0.000 | 0.000 | 0.498 | 201.160 | 0.015 | n/a | 0.071 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-49/journal/page | none observed |
| d9f8237f1f8bd7090000000000000e96 | 201.813 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 200.952 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd709000000000000027f | 201.800 | 0.000 | n/a | 0.000 | 0.000 | 0.594 | 201.006 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-68/journal/page | none observed |
| d9f8237f1f8bd709000000000000028a | 201.771 | 0.000 | n/a | 0.000 | 0.000 | 0.625 | 200.943 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-44/journal/page | none observed |
| d9f8237f1f8bd7090000000000000296 | 201.757 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 200.951 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-50/journal/page | none observed |
| d9f8237f1f8bd709000000000000027e | 201.754 | 0.000 | n/a | 0.000 | 0.000 | 0.417 | 201.134 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-71/journal/page | none observed |
| d9f8237f1f8bd7090000000000000e9a | 201.738 | 0.000 | n/a | 0.000 | 0.000 | 1.166 | 200.469 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.069 | 0.000 | 0.000 | 0.069 | gw-r/thread-67/journal/page | none observed |
| d9f8237f1f8bd7090000000000000ec8 | 201.732 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 200.964 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-71/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

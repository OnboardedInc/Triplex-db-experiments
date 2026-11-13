# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-48/gateway.admitted-work` (113.928 ms, trace `ea244b9682c3667e0000000000000135`); `gw-w/thread-48/commit.prepare-and-validate` (50.722 ms, trace `ea244b9682c3667e00000000000002dc`); `node-13/thread-0/driver.queue.subject` (84.068 ms, trace `ea244b9682c3667e0000000000001d21`); `node-13/thread-5/socket.wait-first-byte` (42.873 ms, trace `ea244b9682c3667e00000000000002dd`); `node-13/thread-0/driver.queue.subject` (56.787 ms, trace `ea244b9682c3667e0000000000001d20`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-log-zero-a-1-baseline`; source `ef7473361c138176ead9c0222b2ccc53e33dde11`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 6662323.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 222 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 14385.914 | 608.388 | 55.393 | 311 |
| L1 | 0 | 19932.188 | 471.176 | 24.305 | 462 |
| L4 | 0 | 19962.640 | 390.545 | 14.302 | 426 |
| L16 | 0 | 19999.280 | 379.631 | 7.103 | 479 |
| L64 | 0 | 19048.564 | 426.927 | 11.737 | 591 |
| L256 | 0 | 19968.010 | 380.574 | 8.130 | 481 |
| L1024 | 0 | 20000.615 | 3723.829 | 194.544 | 11993 |
| tail | 0 | 64573.281 | 11136.606 | 629.964 | 37431 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| ea244b9682c3667e0000000000000135 | driver.queue.scheduler-dispatch | 0.073 | none | 0 / 32 |
| ea244b9682c3667e0000000000000135 | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace ea244b9682c3667e0000000000000135 waited: []

| ea244b9682c3667e00000000000002dc | driver.queue.scheduler-late | 0.094 | none | 0 / 32 |
| ea244b9682c3667e00000000000002dc | driver.queue.scheduler-dispatch | 0.063 | none | 0 / 32 |

Observed active steps while trace ea244b9682c3667e00000000000002dc waited: []

| ea244b9682c3667e0000000000001d21 | driver.queue.subject | 84.068 | ea244b9682c3667e0000000000001d20 | 1 / 32 |
| ea244b9682c3667e0000000000001d21 | driver.queue.scheduler-late | 14.270 | none | 1 / 32 |
| ea244b9682c3667e0000000000001d21 | driver.queue.scheduler-dispatch | 0.061 | none | 1 / 32 |

Observed active steps while trace ea244b9682c3667e0000000000001d21 waited: [{"at":1794608660188.8984,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d1c","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d22","step":"client.http"}]},{"at":1794608660211.9788,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d1d","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d25","step":"client.http"}]},{"at":1794608660239.4915,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d1d","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d25","step":"client.http"}]},{"at":1794608660259.442,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d20","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d29","step":"client.http"}]}]

| ea244b9682c3667e00000000000002dd | driver.queue.scheduler-dispatch | 0.047 | none | 1 / 32 |
| ea244b9682c3667e00000000000002dd | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace ea244b9682c3667e00000000000002dd waited: []

| ea244b9682c3667e0000000000001d20 | driver.queue.subject | 56.787 | ea244b9682c3667e0000000000001d1d | 1 / 32 |
| ea244b9682c3667e0000000000001d20 | driver.queue.scheduler-late | 16.770 | none | 1 / 32 |
| ea244b9682c3667e0000000000001d20 | driver.queue.scheduler-dispatch | 0.064 | none | 1 / 32 |

Observed active steps while trace ea244b9682c3667e0000000000001d20 waited: [{"at":1794608660188.8984,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d1c","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d22","step":"client.http"}]},{"at":1794608660211.9788,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d1d","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d25","step":"client.http"}]},{"at":1794608660239.4915,"inFlight":2,"capacity":32,"active":[{"traceId":"ea244b9682c3667e0000000000001d1d","step":"client.http"},{"traceId":"ea244b9682c3667e0000000000001d25","step":"client.http"}]}]

## P2 / warmup / commit (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 37.468 | 0.558 | 0.000 | 1.180 | 6.128 | 0.242 | 0.000 | 0.254 | 1.738 | 8.512 | 0.071 | n/a | 0.480 | 19.013 | n/a | n/a | 0.055 | 7.025 | 0.199 | 0.055 |
| p99 | 71.174 | 7.556 | 0.898 | 11.609 | 18.484 | 1.363 | 5.852 | 24.604 | 4.269 | 36.294 | 0.417 | n/a | 2.934 | 29.557 | n/a | n/a | 0.496 | 45.867 | 0.718 | 0.496 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000000f1 | 71.174 | 18.484 | 0.890 | 0.000 | 0.146 | 2.940 | 21.603 | 0.384 | n/a | 1.256 | 25.372 | n/a | n/a | 0.099 | 19.520 | 0.274 | 0.099 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000127 | 68.797 | 6.968 | 0.286 | 0.327 | 0.136 | 2.358 | 36.294 | 0.064 | n/a | 0.834 | 21.454 | n/a | n/a | 0.076 | 7.717 | 0.112 | 0.076 | gw-w/thread-45/gateway.admitted-work | none observed |
| ea244b9682c3667e0000000000000105 | 63.852 | 17.858 | 0.012 | 3.392 | 24.604 | 1.245 | 7.701 | 0.055 | n/a | 0.554 | 8.375 | n/a | n/a | 0.054 | 45.867 | 0.718 | 0.054 | node-13/thread-0/driver.queue.scheduler-late | none observed |
| ea244b9682c3667e00000000000000ee | 62.378 | 17.076 | 0.031 | 5.852 | 0.576 | 1.633 | 6.552 | 0.147 | n/a | 0.460 | 29.557 | n/a | n/a | 0.496 | 23.534 | 0.377 | 0.496 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000010d | 49.298 | 6.612 | 0.265 | 0.339 | 0.095 | 2.529 | 11.334 | 0.053 | n/a | 0.236 | 27.797 | n/a | n/a | 0.039 | 7.310 | 0.148 | 0.039 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000109 | 48.307 | 5.774 | 0.242 | 0.000 | 0.072 | 4.269 | 14.194 | 0.075 | n/a | 0.275 | 23.369 | n/a | n/a | 0.038 | 6.088 | 0.126 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000f5 | 48.175 | 6.760 | 0.470 | 0.000 | 0.087 | 2.870 | 15.340 | 0.089 | n/a | 0.490 | 21.996 | n/a | n/a | 0.072 | 7.317 | 0.152 | 0.072 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000103 | 48.083 | 6.184 | 0.332 | 0.000 | 0.508 | 2.115 | 16.354 | 0.099 | n/a | 0.288 | 22.128 | n/a | n/a | 0.076 | 7.025 | 0.146 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000125 | 45.180 | 5.539 | 0.476 | 0.303 | 0.112 | 1.500 | 18.514 | 0.130 | n/a | 1.300 | 17.254 | n/a | n/a | 0.052 | 6.429 | 0.142 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000101 | 44.884 | 6.487 | 0.351 | 0.000 | 0.254 | 2.027 | 15.976 | 0.096 | n/a | 0.344 | 19.270 | n/a | n/a | 0.080 | 7.092 | 0.158 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000011b | 44.222 | 4.735 | 0.299 | 0.334 | 0.116 | 1.746 | 14.750 | 0.056 | n/a | 0.294 | 21.821 | n/a | n/a | 0.071 | 5.484 | 0.124 | 0.071 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000011f | 39.875 | 5.957 | 0.471 | 0.375 | 0.093 | 1.725 | 15.082 | 0.071 | n/a | 0.335 | 15.693 | n/a | n/a | 0.073 | 6.896 | 0.173 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000115 | 39.066 | 6.128 | 0.007 | 1.597 | 0.608 | 3.328 | 2.036 | 0.044 | n/a | 0.257 | 25.019 | n/a | n/a | 0.042 | 8.340 | 0.213 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000f9 | 39.024 | 4.629 | 0.562 | 0.000 | 0.062 | 2.294 | 18.268 | 0.164 | n/a | 0.951 | 12.045 | n/a | n/a | 0.050 | 5.253 | 0.135 | 0.050 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000117 | 37.468 | 4.023 | 0.294 | 0.254 | 0.118 | 2.030 | 11.388 | 0.046 | n/a | 0.246 | 19.013 | n/a | n/a | 0.055 | 4.689 | 0.125 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000f7 | 35.060 | 8.137 | 0.013 | 0.000 | 0.719 | 1.913 | 1.569 | 0.051 | n/a | 1.151 | 21.342 | n/a | n/a | 0.165 | 8.869 | 0.253 | 0.165 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000fb | 34.954 | 4.824 | 0.332 | 0.000 | 0.073 | 3.215 | 12.984 | 0.048 | n/a | 0.774 | 12.651 | n/a | n/a | 0.053 | 5.229 | 0.150 | 0.053 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000fc | 34.394 | 7.307 | 0.011 | 0.000 | 1.716 | 1.326 | 2.437 | 0.114 | n/a | 0.457 | 20.910 | n/a | n/a | 0.117 | 9.035 | 0.263 | 0.117 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000ff | 33.693 | 7.072 | 0.011 | 0.000 | 1.076 | 1.039 | 4.593 | 0.043 | n/a | 0.260 | 19.544 | n/a | n/a | 0.055 | 8.159 | 0.242 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000113 | 31.801 | 6.570 | 1.363 | 0.468 | 0.116 | 1.738 | 8.512 | 0.060 | n/a | 0.483 | 12.430 | n/a | n/a | 0.062 | 8.516 | 0.268 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.662 | 0.884 | 0.000 | 1.846 | 4.991 | 0.011 | 0.000 | 0.743 | 1.326 | 2.435 | 0.083 | n/a | 0.480 | 15.438 | n/a | n/a | 0.055 | 5.200 | 0.209 | 0.055 |
| p99 | 35.060 | 2.899 | 0.898 | 4.417 | 8.137 | 0.018 | 0.000 | 1.716 | 1.913 | 3.644 | 0.417 | n/a | 2.934 | 21.342 | n/a | n/a | 0.212 | 9.035 | 0.396 | 0.212 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000000f7 | 35.060 | 8.137 | 0.013 | 0.000 | 0.719 | 1.913 | 1.569 | 0.051 | n/a | 1.151 | 21.342 | n/a | n/a | 0.165 | 8.869 | 0.253 | 0.165 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000fc | 34.394 | 7.307 | 0.011 | 0.000 | 1.716 | 1.326 | 2.437 | 0.114 | n/a | 0.457 | 20.910 | n/a | n/a | 0.117 | 9.035 | 0.263 | 0.117 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000111 | 29.053 | 5.008 | 0.005 | 0.000 | 1.062 | 0.975 | 1.096 | 0.034 | n/a | 0.239 | 20.594 | n/a | n/a | 0.041 | 6.075 | 0.209 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000000f3 | 26.191 | 4.991 | 0.012 | 0.000 | 0.197 | 1.470 | 3.413 | 0.123 | n/a | 1.057 | 14.715 | n/a | n/a | 0.212 | 5.200 | 0.199 | 0.212 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000011d | 25.662 | 3.352 | 0.006 | 0.000 | 0.318 | 1.048 | 2.435 | 0.083 | n/a | 2.934 | 15.438 | n/a | n/a | 0.048 | 3.676 | 0.143 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000119 | 24.667 | 4.023 | 0.006 | 0.000 | 0.743 | 1.106 | 1.646 | 0.044 | n/a | 0.260 | 16.770 | n/a | n/a | 0.068 | 4.772 | 0.193 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000123 | 21.136 | 3.472 | 0.006 | 0.000 | 0.752 | 1.344 | 2.470 | 0.143 | n/a | 0.615 | 12.286 | n/a | n/a | 0.048 | 4.231 | 0.200 | 0.048 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000010f | 17.501 | 6.032 | 0.012 | 0.000 | 0.887 | 1.255 | 3.644 | 0.069 | n/a | 0.278 | 5.270 | n/a | n/a | 0.055 | 6.931 | 0.396 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000121 | 15.671 | 3.475 | 0.018 | 0.000 | 0.327 | 1.387 | 1.653 | 0.417 | n/a | 0.480 | 7.875 | n/a | n/a | 0.037 | 3.820 | 0.244 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 39.612 | 0.533 | 0.000 | 0.854 | 5.254 | 0.017 | 0.000 | 0.242 | 2.015 | 8.897 | 0.087 | n/a | 0.696 | 15.238 | n/a | n/a | 0.058 | 6.408 | 0.184 | 0.058 |
| p99 | 147.362 | 5.313 | 1.023 | 19.544 | 23.451 | 3.934 | 3.108 | 18.121 | 8.529 | 116.706 | 0.166 | n/a | 7.473 | 67.354 | n/a | n/a | 0.178 | 23.846 | 0.658 | 0.178 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000000135 | 147.362 | 4.852 | 0.289 | 0.299 | 0.075 | 2.207 | 116.706 | 0.166 | n/a | 0.907 | 21.815 | n/a | n/a | 0.045 | 5.516 | 0.037 | 0.045 | gw-w/thread-48/gateway.admitted-work | none observed |
| ea244b9682c3667e0000000000000143 | 97.017 | 3.938 | 0.218 | 0.259 | 0.111 | 1.356 | 19.752 | 0.075 | n/a | 3.899 | 67.354 | n/a | n/a | 0.054 | 4.526 | 0.047 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000139 | 83.650 | 10.137 | 0.009 | 1.811 | 0.737 | 1.509 | 18.647 | 0.147 | n/a | 0.407 | 50.152 | n/a | n/a | 0.095 | 12.694 | 0.152 | 0.095 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000149 | 69.755 | 23.451 | 0.017 | 0.000 | 0.378 | 1.606 | 4.603 | 0.101 | n/a | 2.340 | 37.210 | n/a | n/a | 0.049 | 23.846 | 0.342 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000134 | 65.423 | 9.776 | 0.009 | 0.000 | 1.127 | 6.975 | 36.339 | 0.104 | n/a | 0.923 | 10.080 | n/a | n/a | 0.090 | 10.912 | 0.167 | 0.090 | gw-w/thread-44/gateway.admitted-work | none observed |
| ea244b9682c3667e000000000000016f | 63.018 | 5.252 | 0.580 | 0.425 | 0.130 | 2.362 | 33.645 | 0.074 | n/a | 0.300 | 20.166 | n/a | n/a | 0.085 | 6.387 | 0.101 | 0.085 | gw-w/thread-42/gateway.admitted-work | none observed |
| ea244b9682c3667e000000000000012b | 60.051 | 4.950 | 0.255 | 0.380 | 0.077 | 1.665 | 14.876 | 0.098 | n/a | 0.251 | 37.446 | n/a | n/a | 0.054 | 5.661 | 0.094 | 0.054 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000132 | 57.648 | 4.846 | 0.395 | 0.363 | 0.088 | 2.599 | 10.485 | 0.116 | n/a | 1.078 | 37.635 | n/a | n/a | 0.043 | 5.692 | 0.099 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000013b | 50.610 | 3.793 | 0.183 | 0.247 | 0.068 | 1.995 | 24.363 | 0.156 | n/a | 0.263 | 19.505 | n/a | n/a | 0.038 | 4.290 | 0.085 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000014b | 49.876 | 5.319 | 3.934 | 0.372 | 0.132 | 2.088 | 22.072 | 0.119 | n/a | 0.550 | 15.238 | n/a | n/a | 0.051 | 9.758 | 0.196 | 0.051 | gw-w/thread-48/gateway.admitted-work | driver.expected-state.bind-receipt 4.565ms; driver.publication 1.479ms |
| ea244b9682c3667e000000000000013d | 48.764 | 6.026 | 0.175 | 0.425 | 0.069 | 3.325 | 16.153 | 0.081 | n/a | 1.248 | 21.223 | n/a | n/a | 0.040 | 6.694 | 0.137 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000015f | 45.096 | 3.832 | 0.250 | 0.333 | 0.119 | 8.529 | 17.107 | 0.049 | n/a | 0.546 | 14.273 | n/a | n/a | 0.058 | 4.534 | 0.101 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000163 | 44.751 | 5.819 | 0.341 | 0.486 | 0.073 | 2.105 | 23.864 | 0.066 | n/a | 0.264 | 11.677 | n/a | n/a | 0.056 | 6.719 | 0.150 | 0.056 | gw-w/thread-46/gateway.admitted-work | none observed |
| ea244b9682c3667e000000000000014c | 44.585 | 13.303 | 0.014 | 3.108 | 0.242 | 1.135 | 7.384 | 0.085 | n/a | 0.319 | 18.937 | n/a | n/a | 0.057 | 16.667 | 0.374 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000147 | 43.798 | 4.085 | 0.487 | 0.274 | 0.128 | 1.813 | 20.624 | 0.092 | n/a | 3.338 | 12.897 | n/a | n/a | 0.059 | 4.974 | 0.114 | 0.059 | gw-w/thread-42/gateway.admitted-work | none observed |
| ea244b9682c3667e0000000000000169 | 43.654 | 5.254 | 0.312 | 0.541 | 0.136 | 2.072 | 15.443 | 0.120 | n/a | 1.034 | 18.684 | n/a | n/a | 0.057 | 6.243 | 0.143 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000129 | 43.455 | 6.585 | 0.302 | 0.000 | 0.126 | 2.164 | 16.020 | 0.052 | n/a | 3.472 | 14.681 | n/a | n/a | 0.054 | 7.013 | 0.161 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000013f | 42.891 | 6.674 | 0.395 | 0.572 | 0.078 | 2.633 | 15.887 | 0.082 | n/a | 0.696 | 15.816 | n/a | n/a | 0.059 | 7.718 | 0.180 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000016d | 40.753 | 6.402 | 0.710 | 0.000 | 0.117 | 4.885 | 12.077 | 0.099 | n/a | 0.663 | 15.715 | n/a | n/a | 0.084 | 7.229 | 0.177 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000137 | 40.571 | 4.920 | 0.333 | 0.380 | 0.081 | 2.043 | 16.584 | 0.145 | n/a | 0.437 | 15.574 | n/a | n/a | 0.073 | 5.714 | 0.141 | 0.073 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 33.747 | 0.915 | 0.000 | 1.865 | 4.250 | 0.007 | 0.000 | 0.947 | 1.061 | 2.496 | 0.086 | n/a | 0.498 | 8.952 | n/a | n/a | 0.071 | 6.408 | 0.187 | 0.071 |
| p99 | 65.423 | 1.925 | 1.023 | 2.628 | 9.776 | 0.010 | 0.000 | 18.121 | 6.975 | 36.339 | 0.119 | n/a | 7.473 | 24.016 | n/a | n/a | 0.105 | 22.205 | 0.658 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000000134 | 65.423 | 9.776 | 0.009 | 0.000 | 1.127 | 6.975 | 36.339 | 0.104 | n/a | 0.923 | 10.080 | n/a | n/a | 0.090 | 10.912 | 0.167 | 0.090 | gw-w/thread-44/gateway.admitted-work | none observed |
| ea244b9682c3667e0000000000000145 | 39.612 | 5.647 | 0.009 | 0.000 | 1.089 | 3.627 | 4.895 | 0.056 | n/a | 0.235 | 24.016 | n/a | n/a | 0.037 | 6.746 | 0.170 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000130 | 34.798 | 5.563 | 0.010 | 0.000 | 0.927 | 4.163 | 2.496 | 0.087 | n/a | 6.696 | 14.786 | n/a | n/a | 0.070 | 6.500 | 0.187 | 0.070 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000016b | 34.760 | 5.100 | 0.007 | 0.000 | 1.301 | 1.942 | 2.755 | 0.119 | n/a | 7.473 | 15.980 | n/a | n/a | 0.083 | 6.408 | 0.184 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000174 | 33.747 | 4.078 | 0.006 | 0.000 | 18.121 | 0.946 | 1.255 | 0.053 | n/a | 0.243 | 8.952 | n/a | n/a | 0.094 | 22.205 | 0.658 | 0.094 | node-13/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.789ms; driver.publication 1.453ms |
| ea244b9682c3667e000000000000014f | 20.250 | 4.250 | 0.006 | 0.000 | 0.301 | 1.011 | 5.143 | 0.086 | n/a | 0.498 | 8.884 | n/a | n/a | 0.071 | 4.557 | 0.225 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000159 | 15.981 | 4.010 | 0.008 | 0.000 | 0.391 | 1.061 | 1.367 | 0.042 | n/a | 0.270 | 8.727 | n/a | n/a | 0.105 | 4.408 | 0.276 | 0.105 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000015d | 12.613 | 3.865 | 0.006 | 0.000 | 0.947 | 0.955 | 1.518 | 0.109 | n/a | 0.918 | 4.239 | n/a | n/a | 0.057 | 4.818 | 0.382 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.535 | 0.504 | 0.000 | 1.342 | 4.431 | 0.184 | 0.000 | 0.160 | 1.514 | 5.490 | 0.074 | n/a | 0.395 | 16.226 | n/a | n/a | 0.054 | 4.887 | 0.185 | 0.054 |
| p99 | 93.437 | 3.626 | 0.005 | 4.830 | 14.100 | 1.175 | 0.493 | 1.256 | 5.092 | 34.042 | 0.146 | n/a | 3.842 | 86.482 | n/a | n/a | 0.105 | 15.822 | 0.443 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000001b8 | 93.437 | 3.782 | 0.007 | 0.000 | 0.367 | 0.806 | 1.659 | 0.041 | n/a | 0.240 | 86.482 | n/a | n/a | 0.054 | 4.156 | 0.044 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000181 | 72.267 | 14.100 | 1.175 | 0.442 | 0.104 | 2.885 | 14.483 | 0.087 | n/a | 0.289 | 38.614 | n/a | n/a | 0.087 | 15.822 | 0.219 | 0.087 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000018e | 62.092 | 4.361 | 0.366 | 0.000 | 0.085 | 1.733 | 34.042 | 0.080 | n/a | 2.821 | 18.559 | n/a | n/a | 0.043 | 4.813 | 0.078 | 0.043 | gw-w/thread-45/gateway.admitted-work | none observed |
| ea244b9682c3667e00000000000001b6 | 51.645 | 4.387 | 0.322 | 0.000 | 0.178 | 1.667 | 29.657 | 0.044 | n/a | 0.233 | 15.093 | n/a | n/a | 0.063 | 4.887 | 0.095 | 0.063 | gw-w/thread-45/gateway.admitted-work | none observed |
| ea244b9682c3667e00000000000001ba | 51.475 | 6.325 | 0.338 | 0.000 | 0.193 | 1.852 | 11.474 | 0.074 | n/a | 3.151 | 27.963 | n/a | n/a | 0.105 | 6.856 | 0.133 | 0.105 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000184 | 48.010 | 5.045 | 0.237 | 0.000 | 0.079 | 2.035 | 9.045 | 0.126 | n/a | 0.741 | 30.656 | n/a | n/a | 0.045 | 5.361 | 0.112 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000194 | 45.597 | 3.861 | 0.242 | 0.000 | 0.188 | 1.469 | 11.060 | 0.101 | n/a | 0.354 | 28.258 | n/a | n/a | 0.065 | 4.291 | 0.094 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000017d | 42.529 | 3.862 | 0.225 | 0.000 | 0.084 | 1.996 | 21.292 | 0.079 | n/a | 0.261 | 14.687 | n/a | n/a | 0.042 | 4.171 | 0.098 | 0.042 | gw-w/thread-42/gateway.admitted-work | none observed |
| ea244b9682c3667e000000000000019a | 40.926 | 5.078 | 0.315 | 0.000 | 0.089 | 2.184 | 9.672 | 0.118 | n/a | 1.417 | 22.010 | n/a | n/a | 0.042 | 5.482 | 0.134 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001a0 | 39.982 | 6.517 | 0.286 | 0.000 | 0.104 | 2.210 | 7.733 | 0.060 | n/a | 0.254 | 22.754 | n/a | n/a | 0.064 | 6.907 | 0.173 | 0.064 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000198 | 39.293 | 5.090 | 0.252 | 0.000 | 0.158 | 3.400 | 10.993 | 0.089 | n/a | 0.287 | 18.946 | n/a | n/a | 0.079 | 5.499 | 0.140 | 0.079 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001b0 | 38.048 | 5.979 | 0.267 | 0.000 | 0.074 | 2.223 | 15.527 | 0.127 | n/a | 0.363 | 13.445 | n/a | n/a | 0.042 | 6.320 | 0.166 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001be | 35.898 | 3.837 | 0.245 | 0.000 | 0.131 | 5.092 | 6.061 | 0.082 | n/a | 3.374 | 17.008 | n/a | n/a | 0.069 | 4.212 | 0.117 | 0.069 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001c0 | 34.850 | 6.152 | 0.006 | 0.000 | 0.925 | 4.035 | 5.490 | 0.046 | n/a | 3.842 | 14.294 | n/a | n/a | 0.058 | 7.083 | 0.203 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001a2 | 34.533 | 4.122 | 0.228 | 0.000 | 0.092 | 1.742 | 12.170 | 0.059 | n/a | 0.277 | 15.797 | n/a | n/a | 0.045 | 4.442 | 0.129 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000186 | 33.247 | 4.360 | 0.006 | 0.000 | 0.318 | 0.786 | 2.610 | 0.036 | n/a | 0.437 | 24.649 | n/a | n/a | 0.045 | 4.684 | 0.141 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000018c | 32.511 | 4.535 | 0.300 | 0.493 | 0.117 | 1.652 | 8.736 | 0.103 | n/a | 0.306 | 16.226 | n/a | n/a | 0.044 | 5.445 | 0.167 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001a6 | 32.096 | 4.130 | 0.288 | 0.000 | 0.077 | 1.514 | 6.397 | 0.089 | n/a | 0.885 | 18.652 | n/a | n/a | 0.064 | 4.494 | 0.140 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000019e | 31.818 | 4.907 | 0.202 | 0.000 | 0.081 | 2.478 | 7.123 | 0.055 | n/a | 0.219 | 16.712 | n/a | n/a | 0.041 | 5.190 | 0.163 | 0.041 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001b4 | 31.535 | 7.482 | 0.006 | 0.000 | 0.091 | 0.945 | 3.869 | 0.077 | n/a | 0.395 | 18.616 | n/a | n/a | 0.054 | 7.579 | 0.240 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.673 | 0.932 | 0.000 | 1.815 | 3.625 | 0.006 | 0.000 | 0.558 | 0.867 | 1.318 | 0.037 | n/a | 0.450 | 11.192 | n/a | n/a | 0.052 | 4.464 | 0.219 | 0.052 |
| p99 | 30.778 | 2.476 | 0.005 | 2.826 | 6.056 | 0.011 | 0.000 | 1.123 | 1.491 | 2.081 | 0.146 | n/a | 1.364 | 19.917 | n/a | n/a | 0.097 | 6.424 | 0.360 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e000000000000017f | 30.778 | 5.368 | 0.011 | 0.000 | 1.044 | 1.491 | 1.906 | 0.082 | n/a | 0.895 | 19.917 | n/a | n/a | 0.064 | 6.424 | 0.209 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000018a | 25.650 | 5.140 | 0.007 | 0.000 | 0.277 | 0.843 | 1.442 | 0.035 | n/a | 0.203 | 17.652 | n/a | n/a | 0.052 | 5.424 | 0.211 | 0.052 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001c3 | 23.223 | 3.175 | 0.006 | 0.000 | 1.123 | 0.759 | 0.960 | 0.034 | n/a | 0.450 | 16.672 | n/a | n/a | 0.045 | 4.303 | 0.185 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000017b | 21.706 | 3.527 | 0.006 | 0.000 | 0.932 | 0.818 | 1.122 | 0.037 | n/a | 0.435 | 14.788 | n/a | n/a | 0.042 | 4.464 | 0.206 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001ae | 19.897 | 4.250 | 0.006 | 0.000 | 0.410 | 0.867 | 1.146 | 0.037 | n/a | 0.199 | 12.922 | n/a | n/a | 0.058 | 4.667 | 0.235 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001bb | 19.673 | 3.584 | 0.006 | 0.000 | 0.714 | 1.013 | 1.747 | 0.092 | n/a | 1.364 | 11.107 | n/a | n/a | 0.044 | 4.305 | 0.219 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000192 | 17.680 | 3.896 | 0.005 | 0.000 | 0.103 | 0.870 | 1.318 | 0.039 | n/a | 0.190 | 11.192 | n/a | n/a | 0.065 | 4.004 | 0.226 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000190 | 17.296 | 6.056 | 0.010 | 0.000 | 0.160 | 0.988 | 1.743 | 0.140 | n/a | 0.498 | 7.604 | n/a | n/a | 0.097 | 6.227 | 0.360 | 0.097 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001a4 | 16.162 | 3.625 | 0.007 | 0.000 | 0.924 | 1.479 | 2.081 | 0.146 | n/a | 1.121 | 6.708 | n/a | n/a | 0.071 | 4.556 | 0.282 | 0.071 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001c6 | 10.922 | 2.659 | 0.007 | 0.000 | 0.558 | 0.633 | 1.232 | 0.033 | n/a | 0.910 | 4.851 | n/a | n/a | 0.040 | 3.223 | 0.295 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 93.830 | n/a | n/a | n/a | 43.158 | 3.424 | 5.126 | 0.000 | 0.587 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.592 | 68.020 | 0.850 | 16.592 |
| p99 | 224.240 | n/a | n/a | n/a | 114.124 | 111.963 | 35.117 | 0.000 | 1.563 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 172.329 | 170.799 | 1.000 | 172.329 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000001075 | 224.240 | 41.506 | 0.445 | 8.749 | 0.000 | 1.211 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 172.329 | 50.700 | 0.226 | 172.329 | node-13/thread-3/socket.wait-first-byte | driver.publication 4.251ms; driver.expected-state.add-commit 3.290ms; driver.publication 2.951ms; driver.publication 2.528ms; driver.expected-state.bind-receipt 2.263ms |
| ea244b9682c3667e000000000000106f | 211.556 | 98.821 | 11.091 | 11.629 | 0.000 | 0.914 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 89.101 | 121.541 | 0.575 | 89.101 | node-13/thread-3/socket.wait-first-byte | driver.publication 4.251ms; driver.expected-state.add-commit 3.290ms; driver.publication 2.951ms; driver.expected-state.bind-receipt 2.263ms; driver.publication 1.938ms |
| ea244b9682c3667e00000000000005e1 | 187.600 | 50.510 | 47.970 | 5.187 | 0.000 | 0.899 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 83.034 | 103.667 | 0.553 | 83.034 | node-13/thread-3/socket.wait-first-byte | driver.publication 3.906ms; client.encode 2.268ms; driver.publication 1.361ms; client.encode 1.272ms; driver.publication 1.144ms |
| ea244b9682c3667e0000000000001a91 | 183.038 | 67.712 | 23.999 | 6.775 | 0.000 | 0.688 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 83.864 | 98.486 | 0.538 | 83.864 | node-13/thread-3/socket.wait-first-byte | driver.publication 2.383ms; driver.publication 2.373ms; driver.publication 2.045ms; driver.publication 1.474ms; driver.publication 1.291ms |
| ea244b9682c3667e00000000000005e0 | 173.472 | 70.825 | 64.857 | 35.117 | 0.000 | 0.770 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.903 | 170.799 | 0.985 | 1.903 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 3.906ms; client.encode 2.268ms; driver.publication 1.361ms; client.encode 1.272ms; driver.publication 1.144ms |
| ea244b9682c3667e0000000000001a9d | 163.986 | 23.168 | 111.963 | 5.126 | 0.000 | 0.195 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.535 | 140.257 | 0.855 | 23.535 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.373ms; driver.publication 1.291ms; driver.expected-state.bind-receipt 1.242ms; driver.publication 1.193ms; driver.publication 1.136ms |
| ea244b9682c3667e0000000000001a9c | 155.872 | 24.799 | 110.737 | 0.000 | 0.000 | 0.305 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.031 | 135.536 | 0.870 | 20.031 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.373ms; driver.publication 1.291ms; driver.expected-state.bind-receipt 1.242ms; driver.publication 1.193ms; driver.publication 1.148ms |
| ea244b9682c3667e0000000000000856 | 148.593 | 114.124 | 0.615 | 11.516 | 0.000 | 1.563 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 20.775 | 126.256 | 0.850 | 20.775 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.337ms; driver.publication 1.228ms |
| ea244b9682c3667e0000000000001a9f | 131.868 | 43.158 | 85.561 | 0.000 | 0.000 | 0.202 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.946 | 128.720 | 0.976 | 2.946 | node-13/thread-0/rpc.gateway-observer.observe | driver.publication 2.373ms; driver.expected-state.bind-receipt 1.242ms; driver.publication 1.136ms |
| ea244b9682c3667e00000000000017d1 | 124.068 | 77.281 | 3.424 | 7.567 | 0.000 | 0.556 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 35.241 | 88.271 | 0.711 | 35.241 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.727ms; driver.publication 1.408ms; driver.publication 1.202ms; driver.publication 1.135ms |
| ea244b9682c3667e0000000000001929 | 121.679 | 102.869 | 1.640 | 12.941 | 0.000 | 0.579 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.650 | 117.450 | 0.965 | 3.650 | node-13/thread-3/client.reach | driver.publication 1.878ms; driver.publication 1.845ms; driver.publication 1.516ms; driver.publication 1.287ms; driver.publication 1.212ms |
| ea244b9682c3667e0000000000001928 | 120.994 | 83.039 | 0.594 | 12.941 | 0.000 | 1.405 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 23.015 | 96.574 | 0.798 | 23.015 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.878ms; driver.publication 1.845ms; driver.publication 1.516ms; driver.publication 1.428ms; driver.publication 1.287ms |
| ea244b9682c3667e0000000000001d16 | 101.570 | 52.260 | 38.333 | 4.847 | 0.000 | 0.587 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.543 | 95.440 | 0.940 | 5.543 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 6.208ms; driver.publication 5.597ms; driver.publication 4.430ms; driver.publication 4.058ms; driver.expected-state.bind-receipt 1.704ms |
| ea244b9682c3667e0000000000001072 | 98.171 | 57.984 | 1.927 | 6.017 | 0.000 | 0.715 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 31.528 | 65.928 | 0.672 | 31.528 | node-13/thread-3/socket.wait-first-byte | driver.publication 2.951ms; driver.publication 1.607ms; driver.publication 1.405ms; driver.publication 1.218ms; driver.publication 1.133ms |
| ea244b9682c3667e0000000000001a93 | 93.830 | 38.363 | 5.853 | 3.245 | 0.000 | 0.601 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 45.768 | 47.461 | 0.506 | 45.768 | node-13/thread-3/socket.wait-first-byte | driver.publication 2.383ms; driver.publication 1.291ms; driver.publication 1.285ms; driver.publication 1.193ms; driver.publication 1.148ms |
| ea244b9682c3667e0000000000001af2 | 83.056 | 62.954 | 0.237 | 6.865 | 0.000 | 0.821 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.179 | 70.056 | 0.843 | 12.179 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.116ms |
| ea244b9682c3667e00000000000005dd | 80.882 | 53.163 | 2.530 | 7.070 | 0.000 | 1.184 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 16.935 | 62.763 | 0.776 | 16.935 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.632ms; driver.publication 1.157ms; driver.publication 1.034ms |
| ea244b9682c3667e0000000000000be6 | 75.440 | 64.729 | 0.355 | 8.042 | 0.000 | 0.578 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.736 | 73.126 | 0.969 | 1.736 | node-13/thread-3/client.reach-decode-and-cache | driver.publication 1.071ms |
| ea244b9682c3667e0000000000001d0f | 68.031 | 0.941 | 67.079 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 68.020 | 1.000 | 0.011 | node-13/thread-0/rpc.replica.observe | driver.publication 3.671ms; driver.expected-state.bind-receipt 3.077ms; driver.publication 2.792ms; driver.publication 1.124ms |
| ea244b9682c3667e0000000000001d10 | 66.100 | 6.617 | 59.472 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.010 | 66.090 | 1.000 | 0.010 | node-13/thread-0/rpc.replica.observe | driver.publication 3.671ms; driver.expected-state.bind-receipt 3.077ms; driver.publication 2.792ms; driver.publication 1.124ms |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.803 | 0.560 | 0.000 | 1.410 | 4.298 | 0.018 | 0.000 | 0.135 | 1.425 | 3.527 | 0.052 | n/a | 0.422 | 11.899 | n/a | n/a | 0.056 | 4.803 | 0.196 | 0.056 |
| p99 | 64.418 | 2.212 | 0.010 | 3.976 | 16.724 | 0.393 | 0.000 | 1.128 | 6.671 | 39.914 | 4.011 | n/a | 23.092 | 28.621 | n/a | n/a | 0.074 | 17.615 | 0.409 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000001db | 64.418 | 4.981 | 0.342 | 0.000 | 0.084 | 1.781 | 39.914 | 0.095 | n/a | 0.184 | 16.994 | n/a | n/a | 0.044 | 5.407 | 0.084 | 0.044 | gw-w/thread-48/gateway.admitted-work | none observed |
| ea244b9682c3667e00000000000001ed | 61.228 | 16.724 | 0.018 | 0.000 | 0.873 | 6.671 | 20.124 | 0.254 | n/a | 0.840 | 15.668 | n/a | n/a | 0.055 | 17.615 | 0.288 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000207 | 46.954 | 3.972 | 0.231 | 0.000 | 0.083 | 3.011 | 10.726 | 0.048 | n/a | 0.221 | 28.621 | n/a | n/a | 0.042 | 4.286 | 0.091 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000020b | 46.109 | 3.581 | 0.238 | 0.000 | 0.112 | 1.209 | 6.748 | 0.043 | n/a | 23.092 | 11.029 | n/a | n/a | 0.057 | 3.931 | 0.085 | 0.057 | gw-w/thread-46/d/transact-async | none observed |
| ea244b9682c3667e00000000000001d1 | 42.286 | 5.576 | 0.004 | 0.000 | 0.801 | 1.567 | 2.488 | 0.042 | n/a | 3.311 | 28.465 | n/a | n/a | 0.033 | 6.381 | 0.151 | 0.033 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.151ms |
| ea244b9682c3667e00000000000001d4 | 36.350 | 5.042 | 0.219 | 0.000 | 0.083 | 1.834 | 12.939 | 0.140 | n/a | 3.070 | 12.955 | n/a | n/a | 0.067 | 5.344 | 0.147 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001f5 | 35.348 | 4.214 | 0.325 | 0.000 | 0.083 | 1.425 | 9.052 | 0.100 | n/a | 0.438 | 19.653 | n/a | n/a | 0.058 | 4.621 | 0.131 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000020d | 35.255 | 4.648 | 0.393 | 0.000 | 0.077 | 2.434 | 11.940 | 0.090 | n/a | 3.539 | 12.089 | n/a | n/a | 0.043 | 5.119 | 0.145 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001f7 | 34.909 | 5.101 | 0.348 | 0.000 | 0.101 | 3.689 | 9.159 | 0.095 | n/a | 0.329 | 16.026 | n/a | n/a | 0.061 | 5.550 | 0.159 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000217 | 33.779 | 4.909 | 0.216 | 0.000 | 0.135 | 1.613 | 10.941 | 4.011 | n/a | 0.276 | 11.619 | n/a | n/a | 0.059 | 5.260 | 0.156 | 0.059 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000213 | 32.736 | 4.441 | 0.263 | 0.000 | 0.072 | 2.068 | 12.738 | 0.164 | n/a | 1.034 | 11.899 | n/a | n/a | 0.056 | 4.776 | 0.146 | 0.056 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001d0 | 30.008 | 4.146 | 0.007 | 0.000 | 0.207 | 1.198 | 2.058 | 0.129 | n/a | 1.561 | 20.628 | n/a | n/a | 0.073 | 4.361 | 0.145 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001d9 | 29.724 | 3.858 | 0.006 | 0.000 | 0.811 | 1.334 | 2.753 | 0.089 | n/a | 1.011 | 19.787 | n/a | n/a | 0.074 | 4.675 | 0.157 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001eb | 29.374 | 3.908 | 0.197 | 0.000 | 0.075 | 1.533 | 8.643 | 0.080 | n/a | 0.249 | 14.643 | n/a | n/a | 0.045 | 4.181 | 0.142 | 0.045 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001df | 29.191 | 3.459 | 0.214 | 0.000 | 0.132 | 1.725 | 12.155 | 0.114 | n/a | 0.387 | 10.942 | n/a | n/a | 0.062 | 3.805 | 0.130 | 0.062 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001d7 | 28.550 | 3.255 | 0.202 | 0.000 | 0.079 | 2.807 | 9.175 | 0.064 | n/a | 0.500 | 12.425 | n/a | n/a | 0.043 | 3.536 | 0.124 | 0.043 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000203 | 28.421 | 5.169 | 0.216 | 0.000 | 0.072 | 1.517 | 5.215 | 0.042 | n/a | 0.214 | 15.932 | n/a | n/a | 0.043 | 5.458 | 0.192 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001ef | 28.003 | 5.073 | 0.336 | 0.000 | 0.072 | 1.558 | 6.352 | 0.045 | n/a | 0.182 | 14.338 | n/a | n/a | 0.046 | 5.481 | 0.196 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001ff | 27.494 | 5.661 | 0.259 | 0.000 | 0.082 | 2.140 | 8.572 | 0.069 | n/a | 0.308 | 10.345 | n/a | n/a | 0.058 | 6.002 | 0.218 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000215 | 26.395 | 3.992 | 0.254 | 0.000 | 0.070 | 1.479 | 5.857 | 0.052 | n/a | 3.940 | 10.695 | n/a | n/a | 0.055 | 4.316 | 0.164 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.609 | 0.861 | 0.000 | 1.712 | 3.940 | 0.006 | 0.000 | 0.811 | 0.952 | 1.622 | 0.042 | n/a | 0.422 | 9.887 | n/a | n/a | 0.059 | 4.675 | 0.291 | 0.059 |
| p99 | 30.008 | 1.872 | 0.010 | 3.976 | 6.073 | 0.014 | 0.000 | 1.128 | 1.819 | 4.673 | 0.129 | n/a | 1.561 | 20.628 | n/a | n/a | 0.074 | 6.930 | 0.409 | 0.074 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000001d0 | 30.008 | 4.146 | 0.007 | 0.000 | 0.207 | 1.198 | 2.058 | 0.129 | n/a | 1.561 | 20.628 | n/a | n/a | 0.073 | 4.361 | 0.145 | 0.073 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001d9 | 29.724 | 3.858 | 0.006 | 0.000 | 0.811 | 1.334 | 2.753 | 0.089 | n/a | 1.011 | 19.787 | n/a | n/a | 0.074 | 4.675 | 0.157 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001f3 | 23.225 | 3.585 | 0.006 | 0.000 | 0.197 | 0.711 | 1.102 | 0.039 | n/a | 0.229 | 17.304 | n/a | n/a | 0.052 | 3.788 | 0.163 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001e7 | 22.334 | 6.073 | 0.006 | 0.000 | 0.851 | 0.990 | 1.786 | 0.109 | n/a | 0.485 | 11.970 | n/a | n/a | 0.065 | 6.930 | 0.310 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001e0 | 21.434 | 3.940 | 0.007 | 0.000 | 0.129 | 0.954 | 1.622 | 0.055 | n/a | 0.232 | 14.455 | n/a | n/a | 0.040 | 4.077 | 0.190 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000204 | 21.088 | 4.260 | 0.011 | 0.000 | 1.072 | 0.952 | 4.099 | 0.073 | n/a | 0.396 | 10.167 | n/a | n/a | 0.056 | 5.343 | 0.253 | 0.056 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001e2 | 19.079 | 2.968 | 0.006 | 0.000 | 0.866 | 0.516 | 1.704 | 0.035 | n/a | 0.422 | 12.520 | n/a | n/a | 0.043 | 3.840 | 0.201 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000201 | 18.609 | 4.851 | 0.012 | 0.000 | 0.597 | 1.819 | 1.135 | 0.037 | n/a | 0.210 | 9.887 | n/a | n/a | 0.062 | 5.459 | 0.293 | 0.062 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000020f | 17.903 | 3.841 | 0.006 | 0.000 | 0.741 | 1.284 | 1.469 | 0.042 | n/a | 0.593 | 9.880 | n/a | n/a | 0.048 | 4.587 | 0.256 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001e5 | 16.740 | 4.710 | 0.011 | 0.000 | 1.087 | 0.943 | 4.673 | 0.045 | n/a | 0.293 | 4.908 | n/a | n/a | 0.070 | 5.808 | 0.347 | 0.070 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001ca | 16.195 | 4.299 | 0.006 | 0.000 | 0.522 | 0.916 | 2.779 | 0.039 | n/a | 0.509 | 7.056 | n/a | n/a | 0.071 | 4.827 | 0.298 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001fc | 15.626 | 3.535 | 0.006 | 0.000 | 1.039 | 0.694 | 0.970 | 0.033 | n/a | 0.232 | 9.058 | n/a | n/a | 0.059 | 4.580 | 0.293 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000001cc | 14.429 | 3.546 | 0.006 | 0.000 | 1.128 | 0.702 | 1.023 | 0.037 | n/a | 0.272 | 7.668 | n/a | n/a | 0.046 | 4.680 | 0.324 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000209 | 13.820 | 3.072 | 0.006 | 0.000 | 0.938 | 1.583 | 1.058 | 0.037 | n/a | 0.537 | 6.549 | n/a | n/a | 0.040 | 4.017 | 0.291 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000219 | 11.636 | 4.557 | 0.014 | 0.000 | 0.190 | 0.925 | 1.032 | 0.045 | n/a | 0.840 | 3.967 | n/a | n/a | 0.065 | 4.761 | 0.409 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.301 | 0.582 | 0.000 | 1.545 | 4.814 | 0.011 | 0.000 | 0.250 | 1.152 | 4.085 | 0.056 | n/a | 0.463 | 9.398 | n/a | n/a | 0.053 | 5.265 | 0.250 | 0.053 |
| p99 | 65.099 | 2.845 | 0.009 | 6.655 | 9.968 | 3.048 | 0.000 | 1.106 | 6.447 | 27.372 | 0.751 | n/a | 4.077 | 54.545 | n/a | n/a | 0.121 | 10.892 | 0.460 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000000222 | 65.099 | 4.611 | 0.010 | 0.000 | 0.531 | 0.831 | 4.085 | 0.037 | n/a | 0.390 | 54.545 | n/a | n/a | 0.059 | 5.152 | 0.079 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000228 | 47.810 | 4.891 | 0.291 | 0.000 | 0.084 | 1.582 | 18.507 | 0.076 | n/a | 0.245 | 22.064 | n/a | n/a | 0.070 | 5.265 | 0.110 | 0.070 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000022f | 47.489 | 5.275 | 0.266 | 0.000 | 0.059 | 1.737 | 21.958 | 0.056 | n/a | 0.405 | 17.691 | n/a | n/a | 0.042 | 5.600 | 0.118 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000026c | 45.585 | 5.749 | 0.305 | 0.000 | 0.114 | 1.488 | 21.900 | 0.048 | n/a | 0.537 | 15.389 | n/a | n/a | 0.056 | 6.168 | 0.135 | 0.056 | gw-w/thread-46/gateway.admitted-work | none observed |
| ea244b9682c3667e0000000000000270 | 45.138 | 4.962 | 0.007 | 0.000 | 0.326 | 1.152 | 24.177 | 0.034 | n/a | 0.231 | 14.217 | n/a | n/a | 0.032 | 5.294 | 0.117 | 0.032 | gw-w/thread-49/gateway.route | none observed |
| ea244b9682c3667e000000000000024b | 42.824 | 4.814 | 0.239 | 0.000 | 0.067 | 1.538 | 15.430 | 0.079 | n/a | 0.452 | 20.159 | n/a | n/a | 0.046 | 5.121 | 0.120 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000237 | 39.818 | 3.573 | 0.194 | 0.000 | 0.064 | 1.100 | 27.372 | 0.084 | n/a | 0.465 | 6.906 | n/a | n/a | 0.058 | 3.832 | 0.096 | 0.058 | gw-w/thread-49/commit.prepare-and-validate | none observed |
| ea244b9682c3667e000000000000027e | 32.580 | 5.268 | 3.048 | 0.000 | 0.093 | 1.621 | 11.455 | 0.074 | n/a | 0.251 | 10.716 | n/a | n/a | 0.054 | 8.409 | 0.258 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000257 | 32.335 | 8.795 | 0.008 | 0.000 | 0.683 | 0.803 | 2.874 | 0.042 | n/a | 0.795 | 18.286 | n/a | n/a | 0.050 | 9.486 | 0.293 | 0.050 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000255 | 31.398 | 5.661 | 0.377 | 0.000 | 0.098 | 2.333 | 11.598 | 0.070 | n/a | 0.982 | 10.200 | n/a | n/a | 0.077 | 6.137 | 0.195 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000259 | 30.865 | 3.909 | 0.376 | 0.000 | 0.115 | 1.331 | 8.971 | 0.056 | n/a | 0.463 | 15.587 | n/a | n/a | 0.057 | 4.400 | 0.143 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000022b | 30.294 | 4.576 | 0.010 | 0.000 | 0.604 | 1.165 | 5.006 | 0.099 | n/a | 3.879 | 14.901 | n/a | n/a | 0.054 | 5.190 | 0.171 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000231 | 30.114 | 3.323 | 0.233 | 0.000 | 0.137 | 1.095 | 5.457 | 0.045 | n/a | 0.479 | 19.277 | n/a | n/a | 0.069 | 3.693 | 0.123 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000268 | 29.457 | 3.652 | 0.331 | 0.000 | 0.077 | 6.447 | 3.927 | 0.081 | n/a | 4.077 | 10.784 | n/a | n/a | 0.081 | 4.060 | 0.138 | 0.081 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000027a | 28.875 | 3.395 | 0.176 | 0.000 | 0.079 | 1.236 | 11.215 | 0.112 | n/a | 0.623 | 11.998 | n/a | n/a | 0.041 | 3.650 | 0.126 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000021e | 28.681 | 5.554 | 0.257 | 0.000 | 0.072 | 1.980 | 8.235 | 0.067 | n/a | 0.587 | 11.888 | n/a | n/a | 0.040 | 5.883 | 0.205 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000241 | 28.615 | 3.357 | 0.192 | 0.000 | 0.077 | 1.183 | 7.468 | 0.081 | n/a | 0.990 | 15.229 | n/a | n/a | 0.039 | 3.625 | 0.127 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000246 | 28.615 | 3.650 | 0.006 | 0.000 | 0.485 | 0.741 | 1.351 | 0.026 | n/a | 0.154 | 22.143 | n/a | n/a | 0.058 | 4.141 | 0.145 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.116ms |
| ea244b9682c3667e0000000000000224 | 28.409 | 6.551 | 0.011 | 0.000 | 0.720 | 0.910 | 2.219 | 0.064 | n/a | 0.386 | 17.492 | n/a | n/a | 0.055 | 7.283 | 0.256 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000265 | 28.361 | 6.317 | 0.008 | 0.000 | 0.906 | 4.353 | 12.327 | 0.096 | n/a | 0.559 | 3.673 | n/a | n/a | 0.121 | 7.231 | 0.255 | 0.121 | gw-w/thread-49/storage/begin-command! | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.895 | 0.623 | 0.000 | 1.652 | 3.650 | 0.006 | 0.000 | 0.485 | 0.823 | 1.438 | 0.037 | n/a | 0.429 | 6.400 | n/a | n/a | 0.052 | 4.346 | 0.292 | 0.052 |
| p99 | 65.099 | 2.060 | 0.005 | 2.592 | 8.379 | 0.012 | 0.000 | 1.106 | 6.241 | 12.327 | 0.105 | n/a | 3.879 | 54.545 | n/a | n/a | 0.121 | 9.282 | 0.407 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000000222 | 65.099 | 4.611 | 0.010 | 0.000 | 0.531 | 0.831 | 4.085 | 0.037 | n/a | 0.390 | 54.545 | n/a | n/a | 0.059 | 5.152 | 0.079 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000022b | 30.294 | 4.576 | 0.010 | 0.000 | 0.604 | 1.165 | 5.006 | 0.099 | n/a | 3.879 | 14.901 | n/a | n/a | 0.054 | 5.190 | 0.171 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000246 | 28.615 | 3.650 | 0.006 | 0.000 | 0.485 | 0.741 | 1.351 | 0.026 | n/a | 0.154 | 22.143 | n/a | n/a | 0.058 | 4.141 | 0.145 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.116ms |
| ea244b9682c3667e0000000000000265 | 28.361 | 6.317 | 0.008 | 0.000 | 0.906 | 4.353 | 12.327 | 0.096 | n/a | 0.559 | 3.673 | n/a | n/a | 0.121 | 7.231 | 0.255 | 0.121 | gw-w/thread-49/storage/begin-command! | none observed |
| ea244b9682c3667e000000000000021d | 23.418 | 8.379 | 0.012 | 0.000 | 0.892 | 6.241 | 3.742 | 0.105 | n/a | 0.619 | 3.310 | n/a | n/a | 0.119 | 9.282 | 0.396 | 0.119 | node-13/thread-0/socket.wait-first-byte | none observed |
| ea244b9682c3667e000000000000026a | 17.987 | 5.163 | 0.007 | 0.000 | 0.232 | 0.906 | 4.525 | 0.045 | n/a | 0.639 | 6.400 | n/a | n/a | 0.068 | 5.402 | 0.300 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000023c | 16.703 | 3.035 | 0.006 | 0.000 | 0.275 | 5.148 | 1.021 | 0.029 | n/a | 0.176 | 6.962 | n/a | n/a | 0.052 | 3.315 | 0.198 | 0.052 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000027c | 16.270 | 3.802 | 0.006 | 0.000 | 0.539 | 0.770 | 0.953 | 0.032 | n/a | 0.233 | 9.853 | n/a | n/a | 0.082 | 4.346 | 0.267 | 0.082 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000226 | 15.895 | 4.486 | 0.011 | 0.000 | 0.771 | 0.876 | 1.033 | 0.032 | n/a | 0.196 | 8.427 | n/a | n/a | 0.061 | 5.268 | 0.331 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000025a | 14.534 | 4.262 | 0.006 | 0.000 | 1.033 | 0.658 | 1.043 | 0.037 | n/a | 0.440 | 7.008 | n/a | n/a | 0.047 | 5.301 | 0.365 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000024f | 13.871 | 3.349 | 0.006 | 0.000 | 0.108 | 0.823 | 1.700 | 0.059 | n/a | 0.854 | 6.923 | n/a | n/a | 0.049 | 3.463 | 0.250 | 0.049 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000232 | 12.979 | 3.456 | 0.006 | 0.000 | 0.331 | 1.941 | 1.438 | 0.042 | n/a | 0.749 | 4.974 | n/a | n/a | 0.042 | 3.793 | 0.292 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000278 | 11.438 | 3.547 | 0.006 | 0.000 | 1.106 | 0.636 | 1.041 | 0.032 | n/a | 0.203 | 4.818 | n/a | n/a | 0.050 | 4.658 | 0.407 | 0.050 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000260 | 10.967 | 3.341 | 0.006 | 0.000 | 0.323 | 0.800 | 1.470 | 0.045 | n/a | 0.429 | 4.517 | n/a | n/a | 0.036 | 3.669 | 0.335 | 0.036 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000272 | 10.394 | 3.457 | 0.006 | 0.000 | 0.276 | 0.609 | 1.380 | 0.066 | n/a | 0.500 | 4.061 | n/a | n/a | 0.039 | 3.739 | 0.360 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000025c | 10.226 | 3.630 | 0.005 | 0.000 | 0.253 | 0.610 | 1.564 | 0.037 | n/a | 0.190 | 3.885 | n/a | n/a | 0.052 | 3.888 | 0.380 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.459 | 0.654 | 0.000 | 1.849 | 3.568 | 0.006 | 0.000 | 0.089 | 0.743 | 0.982 | 0.035 | n/a | 0.370 | 4.496 | n/a | n/a | 0.049 | 4.120 | 0.254 | 0.049 |
| p99 | 16.247 | 1.268 | 0.000 | 1.946 | 4.189 | 0.010 | 0.000 | 0.545 | 1.126 | 1.125 | 0.040 | n/a | 3.724 | 9.552 | n/a | n/a | 0.058 | 4.287 | 0.297 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000000966 | 16.247 | 3.568 | 0.006 | 0.000 | 0.545 | 1.126 | 0.982 | 0.040 | n/a | 0.370 | 9.552 | n/a | n/a | 0.058 | 4.120 | 0.254 | 0.058 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000027f | 14.459 | 4.189 | 0.010 | 0.000 | 0.089 | 0.743 | 1.125 | 0.035 | n/a | 3.724 | 4.496 | n/a | n/a | 0.049 | 4.287 | 0.297 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit / 5-10 facts (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.459 | 0.654 | 0.000 | 1.849 | 3.568 | 0.006 | 0.000 | 0.089 | 0.743 | 0.982 | 0.035 | n/a | 0.370 | 4.496 | n/a | n/a | 0.049 | 4.120 | 0.254 | 0.049 |
| p99 | 16.247 | 1.268 | 0.000 | 1.946 | 4.189 | 0.010 | 0.000 | 0.545 | 1.126 | 1.125 | 0.040 | n/a | 3.724 | 9.552 | n/a | n/a | 0.058 | 4.287 | 0.297 | 0.058 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000000966 | 16.247 | 3.568 | 0.006 | 0.000 | 0.545 | 1.126 | 0.982 | 0.040 | n/a | 0.370 | 9.552 | n/a | n/a | 0.058 | 4.120 | 0.254 | 0.058 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000027f | 14.459 | 4.189 | 0.010 | 0.000 | 0.089 | 0.743 | 1.125 | 0.035 | n/a | 3.724 | 4.496 | n/a | n/a | 0.049 | 4.287 | 0.297 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.021 | 0.515 | 0.000 | 1.196 | 4.060 | 0.023 | 0.000 | 0.148 | 1.154 | 3.011 | 0.047 | n/a | 0.270 | 8.921 | n/a | n/a | 0.052 | 4.527 | 0.249 | 0.052 |
| p99 | 64.278 | 4.139 | 0.236 | 6.965 | 10.108 | n/a | 0.000 | 1.107 | 5.382 | 26.263 | 0.110 | n/a | 2.261 | 41.560 | n/a | n/a | 0.224 | 10.408 | 0.434 | 0.224 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e000000000000028f | 64.278 | 4.767 | 0.239 | 0.000 | 0.108 | 2.256 | 15.047 | 0.055 | n/a | 0.189 | 41.560 | n/a | n/a | 0.057 | 5.114 | 0.080 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002a5 | 44.386 | 2.951 | 1.345 | 0.000 | 0.069 | 1.339 | 26.263 | 0.073 | n/a | 0.250 | 12.044 | n/a | n/a | 0.051 | 4.365 | 0.098 | 0.051 | gw-w/thread-48/gateway.request-parse | none observed |
| ea244b9682c3667e00000000000002d4 | 39.091 | 6.733 | 0.898 | 0.000 | 0.148 | 2.196 | 7.786 | 0.110 | n/a | 1.229 | 19.867 | n/a | n/a | 0.124 | 7.780 | 0.199 | 0.124 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000295 | 38.860 | 4.329 | 0.214 | 0.000 | 0.077 | 1.314 | 5.741 | 0.075 | n/a | 0.322 | 26.748 | n/a | n/a | 0.039 | 4.620 | 0.119 | 0.039 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002a1 | 35.138 | 4.983 | 0.283 | 0.000 | 0.066 | 2.313 | 14.593 | 0.052 | n/a | 0.270 | 12.534 | n/a | n/a | 0.043 | 5.332 | 0.152 | 0.043 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000029d | 31.298 | 5.225 | 0.241 | 0.000 | 0.065 | 5.382 | 1.980 | 0.047 | n/a | 0.254 | 18.051 | n/a | n/a | 0.053 | 5.532 | 0.177 | 0.053 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002d2 | 31.133 | 3.829 | 0.220 | 0.000 | 0.069 | 1.513 | 5.924 | 0.037 | n/a | 0.201 | 19.294 | n/a | n/a | 0.046 | 4.118 | 0.132 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002bd | 29.746 | 3.021 | 0.203 | 0.000 | 0.062 | 1.026 | 10.745 | 0.037 | n/a | 0.193 | 14.418 | n/a | n/a | 0.042 | 3.286 | 0.110 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000297 | 29.221 | 3.256 | 0.204 | 0.000 | 0.061 | 1.478 | 10.295 | 0.103 | n/a | 2.261 | 11.522 | n/a | n/a | 0.040 | 3.521 | 0.120 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000028d | 28.919 | 10.108 | 0.007 | 0.000 | 0.293 | 1.119 | 1.272 | 0.038 | n/a | 0.243 | 15.779 | n/a | n/a | 0.060 | 10.408 | 0.360 | 0.060 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002b9 | 28.402 | 3.466 | 0.279 | 0.000 | 0.056 | 1.525 | 9.743 | 0.074 | n/a | 0.280 | 12.939 | n/a | n/a | 0.040 | 3.801 | 0.134 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002a9 | 27.880 | 3.239 | 0.186 | 0.000 | 0.071 | 1.154 | 9.905 | 0.063 | n/a | 0.935 | 12.287 | n/a | n/a | 0.040 | 3.496 | 0.125 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002cc | 27.581 | 4.060 | 0.317 | 0.000 | 0.150 | 1.149 | 5.537 | 0.052 | n/a | 1.046 | 15.211 | n/a | n/a | 0.060 | 4.527 | 0.164 | 0.060 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000284 | 27.340 | 5.792 | 0.375 | 0.000 | 0.107 | 1.894 | 7.261 | 0.055 | n/a | 0.280 | 11.352 | n/a | n/a | 0.224 | 6.275 | 0.230 | 0.224 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000286 | 26.353 | 7.096 | 0.011 | 0.000 | 1.107 | 0.891 | 1.260 | 0.032 | n/a | 0.539 | 15.359 | n/a | n/a | 0.057 | 8.214 | 0.312 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000028a | 25.955 | 5.007 | 0.005 | 0.000 | 0.967 | 0.686 | 1.135 | 0.031 | n/a | 0.226 | 17.843 | n/a | n/a | 0.055 | 5.979 | 0.230 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002b5 | 25.817 | 3.295 | 0.188 | 0.000 | 0.070 | 1.223 | 12.377 | 0.082 | n/a | 0.783 | 7.760 | n/a | n/a | 0.038 | 3.552 | 0.138 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002b1 | 23.939 | 5.104 | 0.295 | 0.000 | 0.113 | 1.791 | 5.381 | 0.037 | n/a | 0.483 | 10.656 | n/a | n/a | 0.077 | 5.512 | 0.230 | 0.077 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002c7 | 23.787 | 3.774 | 0.264 | 0.000 | 0.109 | 1.453 | 9.138 | 0.059 | n/a | 0.871 | 8.067 | n/a | n/a | 0.055 | 4.146 | 0.174 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002ad | 22.654 | 3.838 | 0.006 | 0.000 | 0.083 | 0.751 | 2.602 | 0.073 | n/a | 0.940 | 14.316 | n/a | n/a | 0.045 | 3.927 | 0.173 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.774 | 0.569 | 0.000 | 1.727 | 3.599 | 0.007 | 0.000 | 0.606 | 0.859 | 1.109 | 0.033 | n/a | 0.235 | 6.311 | n/a | n/a | 0.055 | 4.200 | 0.328 | 0.055 |
| p99 | 21.021 | 1.692 | 0.236 | 3.467 | 6.002 | n/a | 0.000 | 1.080 | 1.773 | 10.112 | 0.108 | n/a | 1.752 | 11.427 | n/a | n/a | 0.079 | 6.641 | 0.434 | 0.079 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000002c5 | 21.021 | 3.261 | 0.007 | 0.000 | 0.606 | 0.538 | 4.935 | 0.032 | n/a | 0.174 | 11.427 | n/a | n/a | 0.041 | 3.874 | 0.184 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000029f | 20.076 | 6.002 | 0.023 | 0.000 | 0.617 | 1.216 | 2.173 | 0.108 | n/a | 0.955 | 8.921 | n/a | n/a | 0.061 | 6.641 | 0.331 | 0.061 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002ba | 18.264 | 5.447 | 0.009 | 0.000 | 0.531 | 0.981 | 0.939 | 0.030 | n/a | 0.182 | 10.083 | n/a | n/a | 0.063 | 5.987 | 0.328 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002c9 | 15.319 | 2.688 | n/a | 0.000 | 0.541 | 1.773 | 10.112 | 0.059 | n/a | 0.073 | 0.000 | n/a | n/a | 0.073 | 3.228 | 0.211 | 0.073 | gw-w/thread-45/gateway.admitted-work | none observed |
| ea244b9682c3667e0000000000000298 | 15.038 | 4.407 | 0.009 | 0.000 | 0.961 | 0.874 | 1.498 | 0.052 | n/a | 0.324 | 6.857 | n/a | n/a | 0.057 | 5.376 | 0.357 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002ab | 15.025 | 3.495 | 0.007 | 0.000 | 0.623 | 0.883 | 2.258 | 0.081 | n/a | 1.163 | 6.472 | n/a | n/a | 0.042 | 4.125 | 0.275 | 0.042 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e000000000000029b | 14.719 | 5.244 | 0.010 | 0.000 | 0.447 | 0.859 | 0.993 | 0.032 | n/a | 0.212 | 6.843 | n/a | n/a | 0.079 | 5.701 | 0.387 | 0.079 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000290 | 13.774 | 5.193 | 0.006 | 0.000 | 0.774 | 0.565 | 0.990 | 0.031 | n/a | 0.171 | 6.006 | n/a | n/a | 0.039 | 5.973 | 0.434 | 0.039 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002b7 | 13.363 | 3.665 | 0.006 | 0.000 | 0.066 | 0.787 | 2.554 | 0.047 | n/a | 0.254 | 5.942 | n/a | n/a | 0.042 | 3.737 | 0.280 | 0.042 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000282 | 13.142 | 4.038 | 0.007 | 0.000 | 0.378 | 0.890 | 1.109 | 0.038 | n/a | 0.306 | 6.311 | n/a | n/a | 0.065 | 4.423 | 0.337 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002be | 13.035 | 3.561 | 0.006 | 0.000 | 0.634 | 1.535 | 0.944 | 0.033 | n/a | 0.482 | 5.777 | n/a | n/a | 0.063 | 4.200 | 0.322 | 0.063 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002a2 | 12.613 | 3.599 | 0.006 | 0.000 | 0.610 | 0.850 | 1.101 | 0.045 | n/a | 1.752 | 4.596 | n/a | n/a | 0.055 | 4.215 | 0.334 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002c2 | 12.436 | 2.996 | 0.005 | 0.000 | 1.080 | 0.504 | 1.098 | 0.030 | n/a | 0.177 | 6.514 | n/a | n/a | 0.033 | 4.081 | 0.328 | 0.033 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e00000000000002b3 | 9.642 | 3.250 | 0.006 | 0.000 | 0.487 | 0.653 | 1.156 | 0.033 | n/a | 0.235 | 3.779 | n/a | n/a | 0.042 | 3.743 | 0.388 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (846 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.609 | 0.788 | 0.000 | 1.619 | 3.628 | 0.005 | 0.000 | 0.765 | 0.819 | 1.194 | 0.034 | n/a | 0.321 | 7.238 | n/a | n/a | 0.039 | 4.673 | 0.301 | 0.039 |
| p99 | 77.645 | 2.977 | 2.720 | 5.387 | 12.549 | 2.396 | 0.000 | 22.009 | 21.826 | 11.896 | 5.677 | n/a | 5.188 | 43.405 | n/a | n/a | 0.126 | 31.490 | 0.687 | 0.126 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000002dc | 107.332 | 12.728 | 0.031 | 0.000 | 0.157 | 8.854 | 58.750 | 8.337 | n/a | 1.013 | 17.403 | n/a | n/a | 0.059 | 12.916 | 0.120 | 0.059 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| ea244b9682c3667e00000000000002dd | 102.470 | 4.413 | 0.270 | 0.000 | 0.049 | 43.699 | 28.438 | 0.055 | n/a | 0.242 | 25.251 | n/a | n/a | 0.053 | 4.732 | 0.046 | 0.053 | node-13/thread-5/socket.wait-first-byte | none observed |
| ea244b9682c3667e00000000000002f7 | 96.632 | 16.373 | 0.008 | 0.000 | 20.630 | 51.138 | 1.240 | 0.042 | n/a | 0.194 | 6.966 | n/a | n/a | 0.040 | 37.012 | 0.383 | 0.040 | node-13/thread-0/socket.wait-first-byte | driver.publication 5.218ms; driver.publication 4.332ms; client.encode 3.171ms; driver.expected-state.bind-receipt 1.395ms; driver.publication 1.044ms |
| ea244b9682c3667e00000000000002f5 | 87.363 | 7.191 | 0.005 | 0.000 | 0.573 | 40.597 | 1.203 | 11.648 | n/a | 0.112 | 26.001 | n/a | n/a | 0.032 | 7.769 | 0.089 | 0.032 | node-13/thread-0/socket.wait-first-byte | driver.publication 5.218ms |
| ea244b9682c3667e000000000000036b | 86.467 | 3.089 | 0.008 | 0.000 | 50.950 | 9.447 | 2.169 | 0.088 | n/a | 0.333 | 20.352 | n/a | n/a | 0.031 | 54.046 | 0.625 | 0.031 | node-13/thread-0/driver.queue.subject | driver.publication 5.338ms; driver.publication 2.604ms; driver.publication 1.638ms; driver.publication 1.225ms; driver.publication 1.176ms |
| ea244b9682c3667e000000000000070a | 85.370 | 7.770 | 0.277 | 0.000 | 0.044 | 6.490 | 6.048 | 0.169 | n/a | 5.188 | 59.339 | n/a | n/a | 0.046 | 8.091 | 0.095 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.786ms; driver.publication 1.459ms; driver.publication 1.138ms |
| ea244b9682c3667e0000000000000958 | 82.224 | 5.430 | 0.005 | 0.000 | 55.232 | 4.977 | 1.597 | 0.038 | n/a | 0.211 | 14.687 | n/a | n/a | 0.047 | 60.668 | 0.738 | 0.047 | node-13/thread-0/driver.queue.subject | driver.publication 1.777ms; driver.publication 1.559ms; driver.publication 1.551ms; driver.publication 1.524ms; driver.publication 1.390ms |
| ea244b9682c3667e00000000000002f4 | 80.916 | 8.736 | 7.049 | 0.000 | 0.027 | 6.976 | 16.815 | 0.125 | n/a | 0.871 | 40.272 | n/a | n/a | 0.045 | 15.811 | 0.195 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 5.218ms |
| ea244b9682c3667e00000000000002f6 | 77.645 | 6.833 | 0.010 | 0.000 | 0.195 | 43.341 | 1.728 | 0.039 | n/a | 0.181 | 25.263 | n/a | n/a | 0.056 | 7.038 | 0.091 | 0.056 | node-13/thread-0/socket.wait-first-byte | driver.publication 5.218ms; driver.publication 4.332ms |
| ea244b9682c3667e000000000000095e | 76.772 | 12.831 | 0.017 | 0.000 | 2.948 | 7.129 | 4.384 | 5.677 | n/a | 0.352 | 43.405 | n/a | n/a | 0.030 | 15.796 | 0.206 | 0.030 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.838ms; driver.publication 1.777ms; driver.publication 1.551ms; driver.publication 1.524ms; driver.publication 1.280ms |
| ea244b9682c3667e00000000000002fc | 75.761 | 16.700 | 0.165 | 0.000 | 27.787 | 2.856 | 1.969 | 1.381 | n/a | 0.517 | 24.358 | n/a | n/a | 0.028 | 44.652 | 0.589 | 0.028 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 4.332ms; driver.publication 3.476ms; client.encode 3.171ms; driver.publication 1.562ms; driver.expected-state.bind-receipt 1.395ms |
| ea244b9682c3667e00000000000002fb | 72.007 | 16.805 | 0.067 | 0.000 | 34.699 | 3.782 | 2.497 | 0.101 | n/a | 3.402 | 10.605 | n/a | n/a | 0.048 | 51.571 | 0.716 | 0.048 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 4.332ms; driver.publication 1.562ms; driver.expected-state.bind-receipt 1.395ms; driver.expected-state.bind-receipt 1.348ms; driver.publication 1.044ms |
| ea244b9682c3667e0000000000000301 | 71.938 | 3.207 | 0.007 | 0.000 | 0.483 | 6.962 | 0.805 | 0.037 | n/a | 0.158 | 60.238 | n/a | n/a | 0.041 | 3.697 | 0.051 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.493ms; driver.publication 1.301ms; driver.publication 1.127ms |
| ea244b9682c3667e0000000000000859 | 71.184 | 4.514 | 0.008 | 0.000 | 0.613 | 21.826 | 2.301 | 0.052 | n/a | 0.305 | 41.488 | n/a | n/a | 0.076 | 5.135 | 0.072 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.228ms |
| ea244b9682c3667e000000000000085d | 69.490 | 6.614 | 0.010 | 0.000 | 1.049 | 1.265 | 3.875 | 0.037 | n/a | 5.361 | 51.242 | n/a | n/a | 0.037 | 7.673 | 0.110 | 0.037 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.337ms; driver.publication 1.147ms; driver.publication 1.011ms |
| ea244b9682c3667e00000000000005ed | 65.903 | 11.876 | 0.146 | 0.000 | 2.700 | 29.762 | 2.182 | 0.056 | n/a | 0.280 | 18.881 | n/a | n/a | 0.020 | 14.723 | 0.223 | 0.020 | node-13/thread-0/socket.wait-first-byte | driver.publication 3.906ms; client.encode 2.268ms; driver.publication 1.361ms; driver.publication 1.125ms |
| ea244b9682c3667e00000000000005ec | 65.378 | 5.555 | 0.005 | 0.000 | 3.840 | 42.499 | 1.470 | 0.052 | n/a | 0.299 | 11.630 | n/a | n/a | 0.028 | 9.400 | 0.144 | 0.028 | node-13/thread-0/socket.wait-first-byte | driver.publication 3.906ms; driver.publication 1.361ms |
| ea244b9682c3667e000000000000035c | 63.370 | 9.355 | 4.770 | 0.000 | 3.684 | 20.374 | 6.212 | 0.064 | n/a | 0.211 | 18.666 | n/a | n/a | 0.034 | 17.810 | 0.281 | 0.034 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 3.350ms; driver.publication 2.815ms; driver.publication 2.039ms; driver.publication 2.030ms; driver.publication 1.167ms |
| ea244b9682c3667e0000000000000302 | 61.898 | 4.623 | 0.006 | 0.000 | 0.250 | 4.348 | 0.802 | 0.053 | n/a | 0.273 | 51.460 | n/a | n/a | 0.083 | 4.878 | 0.079 | 0.083 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.301ms; driver.publication 1.127ms |
| ea244b9682c3667e000000000000070c | 61.542 | 5.921 | 0.005 | 0.000 | 1.345 | 0.851 | 1.177 | 0.038 | n/a | 0.136 | 52.028 | n/a | n/a | 0.040 | 7.271 | 0.118 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 0.206ms |

## P2 / L1024 / commit / 5-10 facts (491 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.562 | 0.675 | 0.000 | 1.514 | 3.158 | 0.005 | 0.000 | 0.770 | 0.799 | 1.041 | 0.034 | n/a | 0.318 | 6.412 | n/a | n/a | 0.039 | 4.146 | 0.299 | 0.039 |
| p99 | 71.938 | 2.451 | 2.125 | 4.564 | 8.383 | 0.260 | 0.000 | 21.429 | 16.444 | 11.291 | 7.663 | n/a | 3.966 | 45.984 | n/a | n/a | 0.135 | 24.401 | 0.643 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e00000000000002dc | 107.332 | 12.728 | 0.031 | 0.000 | 0.157 | 8.854 | 58.750 | 8.337 | n/a | 1.013 | 17.403 | n/a | n/a | 0.059 | 12.916 | 0.120 | 0.059 | gw-w/thread-48/commit.prepare-and-validate | none observed |
| ea244b9682c3667e00000000000002f5 | 87.363 | 7.191 | 0.005 | 0.000 | 0.573 | 40.597 | 1.203 | 11.648 | n/a | 0.112 | 26.001 | n/a | n/a | 0.032 | 7.769 | 0.089 | 0.032 | node-13/thread-0/socket.wait-first-byte | driver.publication 5.218ms |
| ea244b9682c3667e000000000000036b | 86.467 | 3.089 | 0.008 | 0.000 | 50.950 | 9.447 | 2.169 | 0.088 | n/a | 0.333 | 20.352 | n/a | n/a | 0.031 | 54.046 | 0.625 | 0.031 | node-13/thread-0/driver.queue.subject | driver.publication 5.338ms; driver.publication 2.604ms; driver.publication 1.638ms; driver.publication 1.225ms; driver.publication 1.176ms |
| ea244b9682c3667e00000000000002fc | 75.761 | 16.700 | 0.165 | 0.000 | 27.787 | 2.856 | 1.969 | 1.381 | n/a | 0.517 | 24.358 | n/a | n/a | 0.028 | 44.652 | 0.589 | 0.028 | node-13/thread-0/driver.queue.scheduler-late | driver.publication 4.332ms; driver.publication 3.476ms; client.encode 3.171ms; driver.publication 1.562ms; driver.expected-state.bind-receipt 1.395ms |
| ea244b9682c3667e0000000000000301 | 71.938 | 3.207 | 0.007 | 0.000 | 0.483 | 6.962 | 0.805 | 0.037 | n/a | 0.158 | 60.238 | n/a | n/a | 0.041 | 3.697 | 0.051 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.493ms; driver.publication 1.301ms; driver.publication 1.127ms |
| ea244b9682c3667e0000000000000859 | 71.184 | 4.514 | 0.008 | 0.000 | 0.613 | 21.826 | 2.301 | 0.052 | n/a | 0.305 | 41.488 | n/a | n/a | 0.076 | 5.135 | 0.072 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.228ms |
| ea244b9682c3667e00000000000005ec | 65.378 | 5.555 | 0.005 | 0.000 | 3.840 | 42.499 | 1.470 | 0.052 | n/a | 0.299 | 11.630 | n/a | n/a | 0.028 | 9.400 | 0.144 | 0.028 | node-13/thread-0/socket.wait-first-byte | driver.publication 3.906ms; driver.publication 1.361ms |
| ea244b9682c3667e000000000000070c | 61.542 | 5.921 | 0.005 | 0.000 | 1.345 | 0.851 | 1.177 | 0.038 | n/a | 0.136 | 52.028 | n/a | n/a | 0.040 | 7.271 | 0.118 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 0.206ms |
| ea244b9682c3667e00000000000005e9 | 58.391 | 8.383 | 0.006 | 0.000 | 0.953 | 42.124 | 0.989 | 0.027 | n/a | 0.337 | 5.518 | n/a | n/a | 0.055 | 9.342 | 0.160 | 0.055 | node-13/thread-0/socket.wait-first-byte | client.encode 2.268ms; driver.publication 1.144ms |
| ea244b9682c3667e0000000000000356 | 57.822 | 3.902 | 0.006 | 0.000 | 4.028 | 5.600 | 8.024 | 0.110 | n/a | 0.357 | 35.756 | n/a | n/a | 0.039 | 7.937 | 0.137 | 0.039 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.932ms; driver.publication 3.039ms; driver.publication 2.815ms; driver.expected-state.bind-receipt 2.073ms; driver.publication 2.030ms |
| ea244b9682c3667e000000000000050b | 57.190 | 3.165 | 0.002 | 0.000 | 0.854 | 0.427 | 0.955 | 3.482 | n/a | 1.195 | 47.081 | n/a | n/a | 0.030 | 4.021 | 0.070 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 1.317ms; driver.publication 1.122ms |
| ea244b9682c3667e000000000000085b | 55.827 | 4.651 | 0.009 | 0.000 | 0.583 | 1.155 | 2.229 | 0.034 | n/a | 1.119 | 45.984 | n/a | n/a | 0.062 | 5.244 | 0.094 | 0.062 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 1.337ms |
| ea244b9682c3667e000000000000085c | 55.249 | 2.972 | 0.006 | 0.000 | 1.866 | 1.104 | 1.305 | 0.043 | n/a | 0.236 | 47.651 | n/a | n/a | 0.065 | 4.844 | 0.088 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.337ms; driver.publication 1.011ms |
| ea244b9682c3667e00000000000002f2 | 53.814 | 12.549 | 0.014 | 0.000 | 10.338 | 0.764 | 11.105 | 2.798 | n/a | 0.624 | 15.574 | n/a | n/a | 0.049 | 22.900 | 0.426 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.446ms |
| ea244b9682c3667e000000000000085f | 51.373 | 3.703 | 0.008 | 0.000 | 0.975 | 1.920 | 1.563 | 0.030 | n/a | 1.788 | 41.350 | n/a | n/a | 0.035 | 4.686 | 0.091 | 0.035 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.147ms; driver.publication 1.011ms |
| ea244b9682c3667e000000000000035a | 50.885 | 4.967 | 0.007 | 0.000 | 4.121 | 6.664 | 11.291 | 0.047 | n/a | 0.185 | 23.546 | n/a | n/a | 0.058 | 9.095 | 0.179 | 0.058 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.815ms; driver.publication 2.030ms; driver.publication 1.167ms; driver.publication 1.146ms; driver.publication 1.037ms |
| ea244b9682c3667e0000000000000329 | 48.942 | 2.322 | 0.004 | 0.000 | 29.164 | 0.511 | 1.226 | 0.031 | n/a | 4.259 | 11.394 | n/a | n/a | 0.031 | 31.490 | 0.643 | 0.031 | node-13/thread-0/driver.queue.subject | driver.publication 1.301ms; driver.publication 1.139ms |
| ea244b9682c3667e0000000000000304 | 48.638 | 3.385 | 0.004 | 0.000 | 0.320 | 2.247 | 1.145 | 0.040 | n/a | 1.749 | 39.679 | n/a | n/a | 0.070 | 3.709 | 0.076 | 0.070 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000000816 | 48.367 | 2.787 | 0.003 | 0.000 | 21.611 | 10.032 | 7.510 | 0.034 | n/a | 0.921 | 5.425 | n/a | n/a | 0.045 | 24.401 | 0.505 | 0.045 | node-13/thread-0/driver.queue.subject | client.encode 1.792ms; driver.publication 1.465ms; driver.publication 1.100ms; driver.publication 1.074ms |
| ea244b9682c3667e0000000000000869 | 47.775 | 3.233 | 0.004 | 0.000 | 0.699 | 3.975 | 1.480 | 4.871 | n/a | 0.066 | 33.395 | n/a | n/a | 0.052 | 3.936 | 0.082 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.337ms; driver.publication 1.042ms |

## P2 / tail / commit (2621 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.120 | 0.761 | 0.000 | 1.624 | 3.590 | 0.005 | 0.000 | 0.762 | 0.719 | 1.045 | 0.030 | n/a | 0.214 | 5.769 | n/a | n/a | 0.034 | 4.601 | 0.352 | 0.034 |
| p99 | 52.429 | 3.149 | 2.986 | 6.473 | 11.499 | 0.871 | 0.000 | 17.852 | 13.323 | 8.892 | 2.297 | n/a | 3.605 | 26.150 | n/a | n/a | 0.101 | 24.867 | 0.713 | 0.101 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000001d21 | 107.085 | 2.565 | 0.004 | 0.000 | 98.399 | 0.535 | 1.043 | 0.038 | n/a | 0.116 | 4.365 | n/a | n/a | 0.021 | 100.968 | 0.943 | 0.021 | node-13/thread-0/driver.queue.subject | driver.publication 6.208ms; driver.publication 5.597ms; driver.publication 4.144ms; driver.publication 4.058ms; driver.publication 3.520ms |
| ea244b9682c3667e0000000000001d20 | 100.862 | 9.615 | 0.006 | 0.000 | 73.621 | 6.229 | 1.300 | 0.044 | n/a | 0.832 | 9.186 | n/a | n/a | 0.029 | 83.242 | 0.825 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 6.208ms; driver.publication 5.597ms; driver.publication 4.058ms; driver.publication 3.520ms; driver.expected-state.bind-receipt 1.704ms |
| ea244b9682c3667e0000000000001c0d | 88.539 | 3.731 | 0.010 | 0.000 | 68.063 | 3.536 | 1.148 | 3.814 | n/a | 0.135 | 8.072 | n/a | n/a | 0.029 | 71.804 | 0.811 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 5.101ms; driver.publication 2.167ms; driver.publication 1.943ms; driver.publication 1.631ms; driver.publication 1.360ms |
| ea244b9682c3667e0000000000001d1d | 87.745 | 11.163 | 0.005 | 0.000 | 39.523 | 27.337 | 4.109 | 0.071 | n/a | 0.293 | 5.214 | n/a | n/a | 0.029 | 50.691 | 0.578 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 6.208ms; driver.publication 5.597ms; driver.publication 4.430ms; driver.publication 4.058ms; driver.expected-state.bind-receipt 1.704ms |
| ea244b9682c3667e0000000000001544 | 80.913 | 1.962 | 0.003 | 0.000 | 54.892 | 3.272 | 0.804 | 2.636 | n/a | 0.034 | 17.281 | n/a | n/a | 0.028 | 56.857 | 0.703 | 0.028 | node-13/thread-0/driver.queue.subject | driver.publication 3.530ms; driver.publication 1.344ms; driver.publication 1.320ms; driver.publication 1.180ms; driver.publication 1.102ms |
| ea244b9682c3667e0000000000001d26 | 73.611 | 2.416 | 0.003 | 0.000 | 64.947 | 0.469 | 1.161 | 0.034 | n/a | 0.331 | 4.221 | n/a | n/a | 0.029 | 67.366 | 0.915 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 4.144ms; driver.publication 3.520ms; driver.publication 1.142ms |
| ea244b9682c3667e0000000000001c11 | 72.186 | 3.103 | 0.058 | 0.000 | 0.844 | 3.734 | 1.382 | 2.154 | n/a | 0.207 | 60.682 | n/a | n/a | 0.022 | 4.005 | 0.055 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 5.101ms; driver.publication 2.167ms; driver.publication 1.631ms |
| ea244b9682c3667e000000000000107e | 69.855 | 6.969 | 0.004 | 0.000 | 14.486 | 4.009 | 1.304 | 0.017 | n/a | 0.139 | 42.893 | n/a | n/a | 0.033 | 21.459 | 0.307 | 0.033 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 2.951ms; driver.publication 1.218ms; driver.publication 1.133ms |
| ea244b9682c3667e0000000000001c10 | 69.268 | 3.964 | 0.004 | 0.000 | 2.885 | 0.983 | 1.289 | 4.493 | n/a | 0.068 | 55.553 | n/a | n/a | 0.029 | 6.853 | 0.099 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.101ms; driver.publication 1.631ms; driver.publication 0.149ms |
| ea244b9682c3667e0000000000001c0c | 68.607 | 5.023 | 0.006 | 0.000 | 9.135 | 0.897 | 6.840 | 0.038 | n/a | 0.222 | 45.988 | n/a | n/a | 0.458 | 14.164 | 0.206 | 0.458 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 5.101ms; driver.publication 1.360ms; driver.publication 1.273ms |
| ea244b9682c3667e00000000000011ab | 66.297 | 3.084 | 0.004 | 0.000 | 54.634 | 0.827 | 0.670 | 0.027 | n/a | 1.295 | 5.707 | n/a | n/a | 0.048 | 57.722 | 0.871 | 0.048 | node-13/thread-0/driver.queue.subject | driver.publication 1.252ms; driver.publication 1.199ms; driver.publication 1.174ms; driver.publication 1.103ms; driver.publication 1.031ms |
| ea244b9682c3667e0000000000001530 | 62.417 | 4.123 | 0.004 | 0.000 | 50.246 | 0.553 | 0.953 | 0.028 | n/a | 0.783 | 5.689 | n/a | n/a | 0.038 | 54.373 | 0.871 | 0.038 | node-13/thread-0/driver.queue.subject | driver.publication 1.661ms; driver.publication 1.436ms; driver.publication 1.356ms; driver.publication 1.273ms; driver.publication 1.121ms |
| ea244b9682c3667e0000000000001546 | 61.536 | 4.030 | 0.090 | 0.000 | 0.665 | 8.738 | 0.662 | 1.071 | n/a | 0.026 | 46.208 | n/a | n/a | 0.046 | 4.785 | 0.078 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.530ms; driver.publication 1.102ms |
| ea244b9682c3667e0000000000001082 | 60.606 | 3.025 | 0.003 | 0.000 | 3.395 | 7.017 | 0.869 | 0.856 | n/a | 0.161 | 45.257 | n/a | n/a | 0.025 | 6.422 | 0.106 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.251ms; driver.publication 0.962ms |
| ea244b9682c3667e00000000000010d1 | 60.011 | 13.817 | 0.006 | 0.000 | 4.643 | 13.888 | 1.187 | 0.796 | n/a | 0.178 | 25.418 | n/a | n/a | 0.078 | 18.466 | 0.308 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.415ms; driver.publication 2.344ms; driver.publication 2.300ms; driver.publication 1.594ms; driver.publication 1.520ms |
| ea244b9682c3667e0000000000001545 | 59.801 | 5.841 | 0.008 | 0.000 | 1.094 | 6.495 | 1.495 | 1.506 | n/a | 0.094 | 43.225 | n/a | n/a | 0.042 | 6.942 | 0.116 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.102ms |
| ea244b9682c3667e00000000000010cf | 58.898 | 16.413 | 1.576 | 0.000 | 2.592 | 9.794 | 4.494 | 5.122 | n/a | 0.145 | 18.703 | n/a | n/a | 0.059 | 20.581 | 0.349 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 3.415ms; driver.publication 2.300ms; driver.publication 1.594ms; driver.publication 1.520ms; driver.publication 1.486ms |
| ea244b9682c3667e00000000000010c7 | 58.700 | 4.722 | 9.706 | 0.000 | 0.071 | 0.984 | 8.938 | 0.044 | n/a | 0.130 | 33.984 | n/a | n/a | 0.122 | 14.499 | 0.247 | 0.122 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 7.100ms; client.encode 1.413ms |
| ea244b9682c3667e00000000000011a8 | 57.949 | 9.024 | 0.012 | 0.000 | 0.169 | 15.520 | 3.766 | 0.070 | n/a | 0.444 | 28.906 | n/a | n/a | 0.037 | 9.205 | 0.159 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.274ms; driver.publication 1.252ms; driver.publication 1.174ms; driver.publication 1.103ms |
| ea244b9682c3667e0000000000001543 | 56.940 | 5.290 | 0.004 | 0.000 | 2.817 | 2.344 | 2.660 | 0.053 | n/a | 6.670 | 37.068 | n/a | n/a | 0.032 | 8.111 | 0.142 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.102ms |

## P2 / tail / commit / 5-10 facts (1556 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.761 | 0.647 | 0.000 | 1.511 | 3.170 | 0.005 | 0.000 | 0.771 | 0.690 | 0.891 | 0.029 | n/a | 0.212 | 5.141 | n/a | n/a | 0.034 | 4.091 | 0.347 | 0.034 |
| p99 | 54.521 | 2.167 | 2.700 | 5.180 | 10.067 | 0.194 | 0.000 | 17.852 | 13.432 | 5.383 | 2.497 | n/a | 3.393 | 24.660 | n/a | n/a | 0.109 | 24.867 | 0.729 | 0.109 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| ea244b9682c3667e0000000000001d21 | 107.085 | 2.565 | 0.004 | 0.000 | 98.399 | 0.535 | 1.043 | 0.038 | n/a | 0.116 | 4.365 | n/a | n/a | 0.021 | 100.968 | 0.943 | 0.021 | node-13/thread-0/driver.queue.subject | driver.publication 6.208ms; driver.publication 5.597ms; driver.publication 4.144ms; driver.publication 4.058ms; driver.publication 3.520ms |
| ea244b9682c3667e0000000000001d20 | 100.862 | 9.615 | 0.006 | 0.000 | 73.621 | 6.229 | 1.300 | 0.044 | n/a | 0.832 | 9.186 | n/a | n/a | 0.029 | 83.242 | 0.825 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 6.208ms; driver.publication 5.597ms; driver.publication 4.058ms; driver.publication 3.520ms; driver.expected-state.bind-receipt 1.704ms |
| ea244b9682c3667e0000000000001c0d | 88.539 | 3.731 | 0.010 | 0.000 | 68.063 | 3.536 | 1.148 | 3.814 | n/a | 0.135 | 8.072 | n/a | n/a | 0.029 | 71.804 | 0.811 | 0.029 | node-13/thread-0/driver.queue.subject | driver.publication 5.101ms; driver.publication 2.167ms; driver.publication 1.943ms; driver.publication 1.631ms; driver.publication 1.360ms |
| ea244b9682c3667e0000000000001544 | 80.913 | 1.962 | 0.003 | 0.000 | 54.892 | 3.272 | 0.804 | 2.636 | n/a | 0.034 | 17.281 | n/a | n/a | 0.028 | 56.857 | 0.703 | 0.028 | node-13/thread-0/driver.queue.subject | driver.publication 3.530ms; driver.publication 1.344ms; driver.publication 1.320ms; driver.publication 1.180ms; driver.publication 1.102ms |
| ea244b9682c3667e0000000000001c11 | 72.186 | 3.103 | 0.058 | 0.000 | 0.844 | 3.734 | 1.382 | 2.154 | n/a | 0.207 | 60.682 | n/a | n/a | 0.022 | 4.005 | 0.055 | 0.022 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 5.101ms; driver.publication 2.167ms; driver.publication 1.631ms |
| ea244b9682c3667e0000000000001c10 | 69.268 | 3.964 | 0.004 | 0.000 | 2.885 | 0.983 | 1.289 | 4.493 | n/a | 0.068 | 55.553 | n/a | n/a | 0.029 | 6.853 | 0.099 | 0.029 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 5.101ms; driver.publication 1.631ms; driver.publication 0.149ms |
| ea244b9682c3667e00000000000011ab | 66.297 | 3.084 | 0.004 | 0.000 | 54.634 | 0.827 | 0.670 | 0.027 | n/a | 1.295 | 5.707 | n/a | n/a | 0.048 | 57.722 | 0.871 | 0.048 | node-13/thread-0/driver.queue.subject | driver.publication 1.252ms; driver.publication 1.199ms; driver.publication 1.174ms; driver.publication 1.103ms; driver.publication 1.031ms |
| ea244b9682c3667e0000000000001530 | 62.417 | 4.123 | 0.004 | 0.000 | 50.246 | 0.553 | 0.953 | 0.028 | n/a | 0.783 | 5.689 | n/a | n/a | 0.038 | 54.373 | 0.871 | 0.038 | node-13/thread-0/driver.queue.subject | driver.publication 1.661ms; driver.publication 1.436ms; driver.publication 1.356ms; driver.publication 1.273ms; driver.publication 1.121ms |
| ea244b9682c3667e0000000000001546 | 61.536 | 4.030 | 0.090 | 0.000 | 0.665 | 8.738 | 0.662 | 1.071 | n/a | 0.026 | 46.208 | n/a | n/a | 0.046 | 4.785 | 0.078 | 0.046 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.530ms; driver.publication 1.102ms |
| ea244b9682c3667e0000000000001082 | 60.606 | 3.025 | 0.003 | 0.000 | 3.395 | 7.017 | 0.869 | 0.856 | n/a | 0.161 | 45.257 | n/a | n/a | 0.025 | 6.422 | 0.106 | 0.025 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 4.251ms; driver.publication 0.962ms |
| ea244b9682c3667e00000000000010d1 | 60.011 | 13.817 | 0.006 | 0.000 | 4.643 | 13.888 | 1.187 | 0.796 | n/a | 0.178 | 25.418 | n/a | n/a | 0.078 | 18.466 | 0.308 | 0.078 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 3.415ms; driver.publication 2.344ms; driver.publication 2.300ms; driver.publication 1.594ms; driver.publication 1.520ms |
| ea244b9682c3667e0000000000001545 | 59.801 | 5.841 | 0.008 | 0.000 | 1.094 | 6.495 | 1.495 | 1.506 | n/a | 0.094 | 43.225 | n/a | n/a | 0.042 | 6.942 | 0.116 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.102ms |
| ea244b9682c3667e00000000000011a8 | 57.949 | 9.024 | 0.012 | 0.000 | 0.169 | 15.520 | 3.766 | 0.070 | n/a | 0.444 | 28.906 | n/a | n/a | 0.037 | 9.205 | 0.159 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.274ms; driver.publication 1.252ms; driver.publication 1.174ms; driver.publication 1.103ms |
| ea244b9682c3667e000000000000163c | 55.954 | 16.211 | 0.009 | 0.000 | 0.702 | 24.012 | 3.668 | 0.227 | n/a | 0.518 | 10.576 | n/a | n/a | 0.031 | 16.923 | 0.302 | 0.031 | node-13/thread-0/socket.wait-first-byte | driver.publication 3.824ms; driver.publication 3.583ms; driver.publication 1.455ms; driver.publication 1.312ms; driver.publication 1.304ms |
| ea244b9682c3667e00000000000017e0 | 55.843 | 4.638 | 0.005 | 0.000 | 36.040 | 2.351 | 6.250 | 0.050 | n/a | 2.388 | 4.075 | n/a | n/a | 0.045 | 40.683 | 0.729 | 0.045 | node-13/thread-0/driver.queue.subject | driver.publication 2.935ms; driver.publication 1.354ms; driver.publication 1.164ms |
| ea244b9682c3667e00000000000010ce | 54.521 | 13.406 | 2.721 | 0.000 | 10.095 | 8.199 | 1.327 | 0.059 | n/a | 5.754 | 12.899 | n/a | n/a | 0.060 | 26.222 | 0.481 | 0.060 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 7.100ms; driver.publication 2.300ms; driver.publication 1.594ms; driver.publication 1.520ms; driver.publication 1.486ms |
| ea244b9682c3667e0000000000001802 | 54.116 | 3.542 | 0.005 | 0.000 | 38.815 | 0.443 | 0.803 | 0.028 | n/a | 0.123 | 10.309 | n/a | n/a | 0.050 | 42.362 | 0.783 | 0.050 | node-13/thread-0/driver.queue.subject | driver.publication 1.415ms; driver.expected-state.bind-receipt 1.329ms; driver.publication 1.097ms; driver.publication 1.062ms |
| ea244b9682c3667e0000000000001d25 | 52.018 | 7.178 | 0.008 | 0.000 | 5.095 | 36.088 | 1.923 | 0.045 | n/a | 0.284 | 1.363 | n/a | n/a | 0.035 | 12.281 | 0.236 | 0.035 | node-13/thread-0/socket.wait-first-byte | driver.publication 4.463ms; driver.publication 3.520ms |
| ea244b9682c3667e0000000000001d87 | 48.489 | 4.552 | 0.007 | 0.000 | 4.129 | 8.434 | 13.188 | 0.057 | n/a | 3.297 | 14.767 | n/a | n/a | 0.057 | 8.689 | 0.179 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| ea244b9682c3667e0000000000001548 | 47.294 | 3.074 | 0.006 | 0.000 | 1.021 | 6.302 | 0.807 | 0.028 | n/a | 0.147 | 35.862 | n/a | n/a | 0.047 | 4.101 | 0.087 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.publication 3.530ms; driver.publication 1.320ms |

## P3 / outside-phases / read (11 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.388 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 200.642 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 |
| p99 | 251.755 | n/a | n/a | n/a | 22.099 | n/a | 1.459 | 0.000 | 6.572 | 247.350 | 0.106 | n/a | 0.145 | 0.000 | n/a | n/a | 41.094 | 23.558 | 0.294 | 41.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee600000000000000002 | 251.755 | 2.752 | n/a | 0.000 | 0.000 | 1.070 | 247.350 | 0.106 | n/a | 0.145 | 0.000 | n/a | n/a | 0.332 | 2.752 | 0.011 | 0.332 | gw-r/thread-46/gateway.admitted-work | none observed |
| 066f76d6a53bdd260000000000000006 | 203.599 | 0.000 | n/a | 0.000 | 0.000 | 1.592 | 201.206 | 0.054 | n/a | 0.133 | 0.000 | n/a | n/a | 0.615 | 0.000 | 0.000 | 0.615 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000005 | 203.455 | 0.000 | n/a | 0.000 | 0.000 | 1.730 | 201.349 | 0.014 | n/a | 0.137 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000007 | 202.444 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 201.280 | 0.011 | n/a | 0.129 | 0.000 | n/a | n/a | 0.228 | 0.000 | 0.000 | 0.228 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd260000000000000f2b | 201.549 | 0.000 | n/a | 0.000 | 0.000 | 0.599 | 200.755 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-70/journal/page | none observed |
| 066f76d6a53bdd260000000000000f2c | 201.388 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.539 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd26000000000000018f | 201.246 | 0.000 | n/a | 0.000 | 0.000 | 0.447 | 200.642 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000f2d | 201.097 | 0.000 | n/a | 0.000 | 0.000 | 0.508 | 200.440 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000f31 | 94.871 | 20.590 | n/a | 0.000 | 0.000 | 6.156 | 67.840 | 0.016 | n/a | 0.076 | 0.000 | n/a | n/a | 0.194 | 20.590 | 0.217 | 0.194 | gw-r/thread-69/gateway.admitted-work | none observed |
| 066f76d6a53bdd260000000000000f30 | 80.059 | 22.099 | n/a | 1.459 | 0.000 | 4.751 | 51.558 | 0.004 | n/a | 0.003 | 0.000 | n/a | n/a | 0.185 | 23.558 | 0.294 | 0.185 | gw-r/thread-70/gateway.admitted-work | none observed |
| 066f76d6a53bdd260000000000000f32 | 66.466 | 18.800 | n/a | 0.000 | 0.000 | 6.572 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 41.094 | 18.800 | 0.283 | 41.094 | node-13/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (4 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.361 | n/a | n/a | n/a | 2.340 | n/a | 0.000 | 0.000 | 0.443 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.303 | 2.340 | 0.022 | 1.303 |
| p99 | 1006.060 | n/a | n/a | n/a | 12.804 | n/a | 5.563 | 0.000 | 1.898 | 1001.699 | 1.176 | n/a | 0.857 | 0.000 | n/a | n/a | 12.745 | 18.367 | 0.189 | 12.745 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee6000000000000000a4 | 1006.060 | 0.291 | n/a | 0.000 | 0.000 | 1.898 | 1001.699 | 0.012 | n/a | 0.857 | 0.000 | n/a | n/a | 1.303 | 0.291 | 0.000 | 1.303 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000000a5 | 834.281 | 12.804 | n/a | 5.563 | 0.000 | 0.794 | 812.601 | 1.176 | n/a | 0.286 | 0.000 | n/a | n/a | 1.057 | 18.367 | 0.022 | 1.057 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000001d8 | 15.361 | 2.340 | n/a | 0.000 | 0.000 | 0.276 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.745 | 2.340 | 0.152 | 12.745 | node-13/thread-2/socket.wait-first-byte | none observed |
| f14df80169c0ee60000000000000083b | 14.494 | 2.745 | n/a | 0.000 | 0.000 | 0.443 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 11.305 | 2.745 | 0.189 | 11.305 | node-13/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 404.825 | n/a | n/a | n/a | 3.150 | n/a | 0.000 | 0.000 | 0.849 | 400.337 | 0.017 | n/a | 0.094 | 0.000 | n/a | n/a | 0.123 | 3.150 | 0.008 | 0.123 |
| p99 | 1004.930 | n/a | n/a | n/a | 8.627 | n/a | 0.000 | 0.000 | 3.992 | 1001.054 | 0.731 | n/a | 0.169 | 0.000 | n/a | n/a | 8.650 | 8.627 | 0.261 | 8.650 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee6000000000000000b4 | 1004.930 | 2.800 | n/a | 0.000 | 0.000 | 0.688 | 1000.908 | 0.186 | n/a | 0.115 | 0.000 | n/a | n/a | 0.234 | 2.800 | 0.003 | 0.234 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000d0 | 1003.608 | 0.249 | n/a | 0.000 | 0.000 | 0.965 | 1001.054 | 0.018 | n/a | 0.114 | 0.000 | n/a | n/a | 1.208 | 0.249 | 0.000 | 1.208 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000bb | 1003.333 | 0.198 | n/a | 0.000 | 0.000 | 0.812 | 1001.026 | 0.018 | n/a | 0.130 | 0.000 | n/a | n/a | 1.148 | 0.198 | 0.000 | 1.148 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000ae | 994.669 | 4.426 | n/a | 0.000 | 0.000 | 0.791 | 989.249 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.099 | 4.426 | 0.004 | 0.099 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000000ba | 979.553 | 4.414 | n/a | 0.000 | 0.000 | 1.004 | 973.805 | 0.010 | n/a | 0.098 | 0.000 | n/a | n/a | 0.221 | 4.414 | 0.005 | 0.221 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000ab | 859.492 | 3.226 | n/a | 0.000 | 0.000 | 0.625 | 855.199 | 0.172 | n/a | 0.133 | 0.000 | n/a | n/a | 0.137 | 3.226 | 0.004 | 0.137 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000a8 | 820.650 | 2.188 | n/a | 0.000 | 0.000 | 0.748 | 816.882 | 0.601 | n/a | 0.109 | 0.000 | n/a | n/a | 0.123 | 2.188 | 0.003 | 0.123 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000c2 | 816.558 | 6.763 | n/a | 0.000 | 0.000 | 0.562 | 809.018 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.119 | 6.763 | 0.008 | 0.119 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000cb | 666.294 | 2.564 | n/a | 0.000 | 0.000 | 3.964 | 659.635 | 0.012 | n/a | 0.048 | 0.000 | n/a | n/a | 0.071 | 2.564 | 0.004 | 0.071 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000b3 | 643.403 | 2.824 | n/a | 0.000 | 0.000 | 2.033 | 638.360 | 0.014 | n/a | 0.090 | 0.000 | n/a | n/a | 0.082 | 2.824 | 0.004 | 0.082 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000ca | 591.259 | 3.242 | n/a | 0.000 | 0.000 | 0.590 | 586.934 | 0.336 | n/a | 0.066 | 0.000 | n/a | n/a | 0.090 | 3.242 | 0.005 | 0.090 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000000c0 | 559.294 | 3.116 | n/a | 0.000 | 0.000 | 0.963 | 554.178 | 0.731 | n/a | 0.115 | 0.000 | n/a | n/a | 0.191 | 3.116 | 0.006 | 0.191 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee6000000000000000c6 | 558.545 | 4.203 | n/a | 0.000 | 0.000 | 1.092 | 553.031 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.129 | 4.203 | 0.008 | 0.129 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000c5 | 448.496 | 2.108 | n/a | 0.000 | 0.000 | 0.645 | 445.574 | 0.014 | n/a | 0.083 | 0.000 | n/a | n/a | 0.072 | 2.108 | 0.005 | 0.072 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000000b6 | 404.825 | 3.615 | n/a | 0.000 | 0.000 | 0.691 | 400.337 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.094 | 3.615 | 0.009 | 0.094 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000000c8 | 402.740 | 4.199 | n/a | 0.000 | 0.000 | 1.154 | 397.077 | 0.065 | n/a | 0.110 | 0.000 | n/a | n/a | 0.135 | 4.199 | 0.010 | 0.135 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000000a7 | 361.380 | 3.736 | n/a | 0.000 | 0.000 | 1.593 | 355.813 | 0.015 | n/a | 0.098 | 0.000 | n/a | n/a | 0.125 | 3.736 | 0.010 | 0.125 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000000b8 | 330.306 | 5.849 | n/a | 0.000 | 0.000 | 0.690 | 323.452 | 0.025 | n/a | 0.092 | 0.000 | n/a | n/a | 0.197 | 5.849 | 0.018 | 0.197 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000b0 | 307.769 | 8.627 | n/a | 0.000 | 0.000 | 1.193 | 297.574 | 0.030 | n/a | 0.169 | 0.000 | n/a | n/a | 0.177 | 8.627 | 0.028 | 0.177 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000cc | 277.404 | 2.298 | n/a | 0.000 | 0.000 | 0.849 | 273.916 | 0.161 | n/a | 0.091 | 0.000 | n/a | n/a | 0.089 | 2.298 | 0.008 | 0.089 | gw-r/thread-43/journal/page | none observed |

## P3 / L1 / internal (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 427.617 | n/a | n/a | n/a | 5.275 | n/a | 0.515 | 0.000 | 0.805 | 416.861 | 0.015 | n/a | 0.081 | 0.000 | n/a | n/a | 0.160 | 5.323 | 0.017 | 0.160 |
| p99 | 1005.596 | n/a | n/a | n/a | 20.765 | n/a | 2.675 | 0.000 | 2.850 | 1000.934 | 2.416 | n/a | 0.231 | 0.000 | n/a | n/a | 45.257 | 21.593 | 0.604 | 45.257 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee6000000000000000d3 | 1005.596 | 5.465 | n/a | 0.585 | 0.000 | 0.907 | 998.329 | 0.019 | n/a | 0.074 | 0.000 | n/a | n/a | 0.217 | 6.050 | 0.006 | 0.217 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000106 | 1003.139 | 0.172 | n/a | 0.000 | 0.000 | 0.803 | 1000.927 | 0.015 | n/a | 0.101 | 0.000 | n/a | n/a | 1.121 | 0.172 | 0.000 | 1.121 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000000d9 | 1003.062 | 0.166 | n/a | 0.000 | 0.000 | 0.717 | 1000.934 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 1.113 | 0.166 | 0.000 | 1.113 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000e0 | 1001.584 | 4.162 | n/a | 0.573 | 0.000 | 0.811 | 995.782 | 0.037 | n/a | 0.103 | 0.000 | n/a | n/a | 0.115 | 4.735 | 0.005 | 0.115 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee60000000000000010f | 1000.959 | 5.275 | n/a | 0.000 | 0.000 | 2.818 | 992.654 | 0.015 | n/a | 0.092 | 0.000 | n/a | n/a | 0.105 | 5.275 | 0.005 | 0.105 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee600000000000000102 | 996.962 | 3.265 | n/a | 0.000 | 0.000 | 0.740 | 992.784 | 0.019 | n/a | 0.078 | 0.000 | n/a | n/a | 0.077 | 3.265 | 0.003 | 0.077 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000000df | 992.045 | 4.079 | n/a | 0.673 | 0.000 | 1.252 | 985.874 | 0.013 | n/a | 0.068 | 0.000 | n/a | n/a | 0.086 | 4.752 | 0.005 | 0.086 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000000d2 | 990.121 | 15.690 | n/a | 1.307 | 0.000 | 1.210 | 971.587 | 0.013 | n/a | 0.135 | 0.000 | n/a | n/a | 0.179 | 16.997 | 0.017 | 0.179 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000ff | 986.830 | 6.207 | n/a | 0.799 | 0.000 | 0.687 | 978.858 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.202 | 7.006 | 0.007 | 0.202 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000000db | 875.481 | 6.529 | n/a | 0.586 | 0.000 | 1.129 | 866.967 | 0.027 | n/a | 0.094 | 0.000 | n/a | n/a | 0.149 | 7.115 | 0.008 | 0.149 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000000e1 | 828.621 | 9.472 | n/a | 0.704 | 0.000 | 0.750 | 817.273 | 0.011 | n/a | 0.077 | 0.000 | n/a | n/a | 0.334 | 10.177 | 0.012 | 0.334 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000103 | 821.175 | 2.875 | n/a | 0.638 | 0.000 | 0.805 | 816.682 | 0.011 | n/a | 0.069 | 0.000 | n/a | n/a | 0.094 | 3.514 | 0.004 | 0.094 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000000e5 | 779.242 | 4.688 | n/a | 0.515 | 0.000 | 0.855 | 772.999 | 0.013 | n/a | 0.080 | 0.000 | n/a | n/a | 0.092 | 5.202 | 0.007 | 0.092 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000000ec | 648.045 | 4.534 | n/a | 0.000 | 0.000 | 0.859 | 641.355 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 1.197 | 4.534 | 0.007 | 1.197 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000000fc | 595.021 | 4.580 | n/a | 0.000 | 0.000 | 2.439 | 587.616 | 0.230 | n/a | 0.078 | 0.000 | n/a | n/a | 0.078 | 4.580 | 0.008 | 0.078 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000000dc | 591.147 | 8.206 | n/a | 1.131 | 0.000 | 0.664 | 578.547 | 2.416 | n/a | 0.071 | 0.000 | n/a | n/a | 0.113 | 9.337 | 0.016 | 0.113 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000000e8 | 563.123 | 18.598 | n/a | 1.808 | 0.000 | 1.096 | 541.235 | 0.028 | n/a | 0.145 | 0.000 | n/a | n/a | 0.212 | 20.406 | 0.036 | 0.212 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000109 | 478.105 | 20.765 | n/a | 0.828 | 0.000 | 0.697 | 455.560 | 0.017 | n/a | 0.092 | 0.000 | n/a | n/a | 0.148 | 21.593 | 0.045 | 0.148 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000000e7 | 453.760 | 4.773 | n/a | 0.653 | 0.000 | 1.307 | 446.823 | 0.018 | n/a | 0.075 | 0.000 | n/a | n/a | 0.111 | 5.426 | 0.012 | 0.111 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000000d5 | 438.755 | 5.923 | n/a | 0.788 | 0.000 | 0.922 | 430.889 | 0.017 | n/a | 0.083 | 0.000 | n/a | n/a | 0.134 | 6.710 | 0.015 | 0.134 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 377.979 | n/a | n/a | n/a | 3.825 | n/a | 0.000 | 0.000 | 0.698 | 369.187 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.129 | 4.168 | 0.011 | 0.129 |
| p99 | 1052.831 | n/a | n/a | n/a | 11.671 | n/a | 2.213 | 0.000 | 2.241 | 1049.129 | 0.371 | n/a | 0.103 | 0.000 | n/a | n/a | 46.697 | 13.884 | 0.167 | 46.697 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee60000000000000012c | 1052.831 | 3.027 | n/a | 0.000 | 0.000 | 0.500 | 1049.129 | 0.008 | n/a | 0.047 | 0.000 | n/a | n/a | 0.119 | 3.027 | 0.003 | 0.119 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000000128 | 1007.143 | 4.370 | n/a | 0.000 | 0.000 | 0.775 | 1001.793 | 0.007 | n/a | 0.052 | 0.000 | n/a | n/a | 0.146 | 4.370 | 0.004 | 0.146 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee60000000000000011e | 1003.113 | 0.141 | n/a | 0.000 | 0.000 | 0.669 | 1000.996 | 0.013 | n/a | 0.075 | 0.000 | n/a | n/a | 1.219 | 0.141 | 0.000 | 1.219 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000000139 | 993.732 | 2.909 | n/a | 0.000 | 0.000 | 0.806 | 989.877 | 0.010 | n/a | 0.062 | 0.000 | n/a | n/a | 0.069 | 2.909 | 0.003 | 0.069 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000116 | 983.758 | 3.825 | n/a | 0.730 | 0.000 | 1.145 | 977.795 | 0.019 | n/a | 0.088 | 0.000 | n/a | n/a | 0.155 | 4.556 | 0.005 | 0.155 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee60000000000000012d | 955.955 | 8.427 | n/a | 0.000 | 0.000 | 0.752 | 946.455 | 0.011 | n/a | 0.074 | 0.000 | n/a | n/a | 0.234 | 8.427 | 0.009 | 0.234 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000142 | 939.982 | 3.753 | n/a | 0.000 | 0.000 | 0.670 | 935.388 | 0.022 | n/a | 0.062 | 0.000 | n/a | n/a | 0.087 | 3.753 | 0.004 | 0.087 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000000113 | 858.074 | 3.045 | n/a | 0.723 | 0.000 | 0.524 | 853.547 | 0.008 | n/a | 0.090 | 0.000 | n/a | n/a | 0.138 | 3.768 | 0.004 | 0.138 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000129 | 771.945 | 9.276 | n/a | 1.258 | 0.000 | 0.748 | 760.417 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.178 | 10.534 | 0.014 | 0.178 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee600000000000000120 | 736.881 | 3.041 | n/a | 0.000 | 0.000 | 0.311 | 733.399 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.087 | 3.041 | 0.004 | 0.087 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000149 | 722.922 | 2.852 | n/a | 0.000 | 0.000 | 0.533 | 719.346 | 0.009 | n/a | 0.061 | 0.000 | n/a | n/a | 0.122 | 2.852 | 0.004 | 0.122 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000136 | 708.341 | 2.372 | n/a | 0.000 | 0.000 | 0.773 | 705.011 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.104 | 2.372 | 0.003 | 0.104 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000110 | 694.897 | 3.832 | n/a | 0.647 | 0.000 | 0.617 | 689.375 | 0.147 | n/a | 0.065 | 0.000 | n/a | n/a | 0.214 | 4.479 | 0.006 | 0.214 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee600000000000000134 | 678.716 | 3.166 | n/a | 0.000 | 0.000 | 0.663 | 674.748 | 0.013 | n/a | 0.042 | 0.000 | n/a | n/a | 0.083 | 3.166 | 0.005 | 0.083 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee60000000000000013e | 653.481 | 4.272 | n/a | 0.000 | 0.000 | 1.370 | 647.673 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.093 | 4.272 | 0.007 | 0.093 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000143 | 652.673 | 5.727 | n/a | 0.817 | 0.000 | 0.689 | 645.131 | 0.014 | n/a | 0.103 | 0.000 | n/a | n/a | 0.191 | 6.544 | 0.010 | 0.191 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000000126 | 649.860 | 3.818 | n/a | 0.000 | 0.000 | 2.241 | 643.650 | 0.008 | n/a | 0.029 | 0.000 | n/a | n/a | 0.115 | 3.818 | 0.006 | 0.115 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee60000000000000012f | 614.771 | 5.311 | n/a | 0.000 | 0.000 | 0.827 | 608.311 | 0.154 | n/a | 0.038 | 0.000 | n/a | n/a | 0.129 | 5.311 | 0.009 | 0.129 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee60000000000000013a | 598.167 | 11.026 | n/a | 0.566 | 0.000 | 1.047 | 585.255 | 0.014 | n/a | 0.096 | 0.000 | n/a | n/a | 0.164 | 11.592 | 0.019 | 0.164 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee60000000000000013c | 420.102 | 3.008 | n/a | 0.000 | 0.000 | 1.013 | 415.897 | 0.011 | n/a | 0.091 | 0.000 | n/a | n/a | 0.082 | 3.008 | 0.007 | 0.082 | gw-r/thread-48/journal/page | none observed |

## P3 / L16 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 421.542 | n/a | n/a | n/a | 3.159 | n/a | 0.000 | 0.000 | 0.671 | 418.554 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.139 | 3.248 | 0.009 | 0.139 |
| p99 | 1007.640 | n/a | n/a | n/a | 16.321 | n/a | 0.884 | 0.000 | 3.271 | 1000.820 | 0.596 | n/a | 0.108 | 0.000 | n/a | n/a | 40.311 | 16.321 | 0.673 | 40.311 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee60000000000000018b | 1007.640 | 6.343 | n/a | 0.000 | 0.000 | 0.671 | 999.958 | 0.441 | n/a | 0.041 | 0.000 | n/a | n/a | 0.186 | 6.343 | 0.006 | 0.186 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000165 | 1003.199 | 0.198 | n/a | 0.000 | 0.000 | 0.899 | 1000.820 | 0.014 | n/a | 0.078 | 0.000 | n/a | n/a | 1.191 | 0.198 | 0.000 | 1.191 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee600000000000000186 | 1002.371 | 0.115 | n/a | 0.000 | 0.000 | 0.452 | 1000.632 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 1.118 | 0.115 | 0.000 | 1.118 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee60000000000000016f | 997.064 | 2.879 | n/a | 0.000 | 0.000 | 0.682 | 993.239 | 0.132 | n/a | 0.050 | 0.000 | n/a | n/a | 0.083 | 2.879 | 0.003 | 0.083 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000155 | 993.123 | 4.545 | n/a | 0.000 | 0.000 | 1.031 | 987.339 | 0.005 | n/a | 0.062 | 0.000 | n/a | n/a | 0.141 | 4.545 | 0.005 | 0.141 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000185 | 992.740 | 3.541 | n/a | 0.000 | 0.000 | 2.089 | 986.982 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.082 | 3.541 | 0.004 | 0.082 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee60000000000000017f | 987.024 | 2.414 | n/a | 0.000 | 0.000 | 0.675 | 983.797 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.074 | 2.414 | 0.002 | 0.074 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000174 | 938.544 | 3.365 | n/a | 0.000 | 0.000 | 1.047 | 934.001 | 0.005 | n/a | 0.045 | 0.000 | n/a | n/a | 0.081 | 3.365 | 0.004 | 0.081 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee60000000000000015b | 804.746 | 3.121 | n/a | 0.000 | 0.000 | 0.774 | 800.722 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.073 | 3.121 | 0.004 | 0.073 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee60000000000000017a | 785.166 | 3.023 | n/a | 0.000 | 0.000 | 0.644 | 781.367 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.079 | 3.023 | 0.004 | 0.079 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000156 | 772.377 | 6.021 | n/a | 0.000 | 0.000 | 0.816 | 765.272 | 0.005 | n/a | 0.040 | 0.000 | n/a | n/a | 0.223 | 6.021 | 0.008 | 0.223 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000150 | 632.667 | 4.307 | n/a | 0.000 | 0.000 | 0.578 | 627.495 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.207 | 4.307 | 0.007 | 0.207 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee600000000000000183 | 622.201 | 5.763 | n/a | 0.000 | 0.000 | 1.003 | 615.187 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.167 | 5.763 | 0.009 | 0.167 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee60000000000000016e | 611.477 | 2.730 | n/a | 0.000 | 0.000 | 0.467 | 608.155 | 0.005 | n/a | 0.041 | 0.000 | n/a | n/a | 0.079 | 2.730 | 0.004 | 0.079 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000167 | 594.926 | 16.321 | n/a | 0.000 | 0.000 | 0.931 | 577.197 | 0.236 | n/a | 0.061 | 0.000 | n/a | n/a | 0.179 | 16.321 | 0.027 | 0.179 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee60000000000000017d | 579.952 | 3.248 | n/a | 0.000 | 0.000 | 0.453 | 575.965 | 0.005 | n/a | 0.038 | 0.000 | n/a | n/a | 0.242 | 3.248 | 0.006 | 0.242 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000177 | 568.861 | 2.944 | n/a | 0.000 | 0.000 | 0.579 | 565.129 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 0.158 | 2.944 | 0.005 | 0.158 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000189 | 566.470 | 2.774 | n/a | 0.769 | 0.000 | 0.478 | 562.301 | 0.005 | n/a | 0.036 | 0.000 | n/a | n/a | 0.106 | 3.543 | 0.006 | 0.106 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee600000000000000171 | 555.776 | 4.748 | n/a | 0.000 | 0.000 | 0.393 | 550.086 | 0.215 | n/a | 0.049 | 0.000 | n/a | n/a | 0.286 | 4.748 | 0.009 | 0.286 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000000176 | 432.151 | 4.540 | n/a | 0.000 | 0.000 | 0.461 | 426.975 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.139 | 4.540 | 0.011 | 0.139 | gw-r/thread-48/journal/page | none observed |

## P3 / L64 / internal (48 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 331.007 | n/a | n/a | n/a | 4.127 | n/a | 0.000 | 0.000 | 0.583 | 323.615 | 0.007 | n/a | 0.039 | 0.000 | n/a | n/a | 0.096 | 4.127 | 0.013 | 0.096 |
| p99 | 1007.577 | n/a | n/a | n/a | 10.490 | n/a | 0.000 | 0.000 | 3.357 | 1001.280 | 0.269 | n/a | 0.075 | 0.000 | n/a | n/a | 43.071 | 10.490 | 0.675 | 43.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee6000000000000001a6 | 1007.577 | 5.310 | n/a | 0.000 | 0.000 | 0.704 | 1001.280 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.200 | 5.310 | 0.005 | 0.200 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000001c4 | 1002.633 | 0.126 | n/a | 0.000 | 0.000 | 0.535 | 1000.786 | 0.006 | n/a | 0.061 | 0.000 | n/a | n/a | 1.119 | 0.126 | 0.000 | 1.119 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000001c3 | 998.927 | 3.641 | n/a | 0.000 | 0.000 | 0.561 | 994.575 | 0.020 | n/a | 0.044 | 0.000 | n/a | n/a | 0.086 | 3.641 | 0.004 | 0.086 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000001a7 | 994.210 | 2.604 | n/a | 0.000 | 0.000 | 0.554 | 990.936 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.080 | 2.604 | 0.003 | 0.080 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee60000000000000019a | 983.152 | 5.621 | n/a | 0.000 | 0.000 | 2.102 | 975.098 | 0.132 | n/a | 0.039 | 0.000 | n/a | n/a | 0.161 | 5.621 | 0.006 | 0.161 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee6000000000000001a4 | 902.159 | 3.125 | n/a | 0.000 | 0.000 | 0.399 | 898.337 | 0.180 | n/a | 0.036 | 0.000 | n/a | n/a | 0.083 | 3.125 | 0.003 | 0.083 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee60000000000000019c | 844.256 | 5.994 | n/a | 0.000 | 0.000 | 0.901 | 837.240 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.073 | 5.994 | 0.007 | 0.073 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000001c1 | 775.514 | 2.791 | n/a | 0.000 | 0.000 | 0.436 | 772.179 | 0.008 | n/a | 0.037 | 0.000 | n/a | n/a | 0.063 | 2.791 | 0.004 | 0.063 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000001d5 | 766.553 | 1.726 | n/a | 0.000 | 0.000 | 0.604 | 763.979 | 0.117 | n/a | 0.054 | 0.000 | n/a | n/a | 0.073 | 1.726 | 0.002 | 0.073 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000001b5 | 654.082 | 3.351 | n/a | 0.000 | 0.000 | 0.583 | 649.924 | 0.008 | n/a | 0.028 | 0.000 | n/a | n/a | 0.188 | 3.351 | 0.005 | 0.188 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000001a0 | 640.990 | 5.714 | n/a | 0.000 | 0.000 | 0.817 | 634.334 | 0.004 | n/a | 0.041 | 0.000 | n/a | n/a | 0.080 | 5.714 | 0.009 | 0.080 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000001c6 | 629.215 | 2.938 | n/a | 0.000 | 0.000 | 0.661 | 625.448 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.093 | 2.938 | 0.005 | 0.093 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000001a8 | 595.202 | 4.884 | n/a | 0.000 | 0.000 | 2.070 | 588.100 | 0.004 | n/a | 0.048 | 0.000 | n/a | n/a | 0.096 | 4.884 | 0.008 | 0.096 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000001af | 595.149 | 4.787 | n/a | 0.000 | 0.000 | 0.698 | 589.349 | 0.160 | n/a | 0.074 | 0.000 | n/a | n/a | 0.081 | 4.787 | 0.008 | 0.081 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000001b8 | 569.783 | 3.294 | n/a | 0.000 | 0.000 | 0.561 | 565.799 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.077 | 3.294 | 0.006 | 0.077 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000001ce | 554.603 | 4.193 | n/a | 0.000 | 0.000 | 0.572 | 549.519 | 0.120 | n/a | 0.034 | 0.000 | n/a | n/a | 0.166 | 4.193 | 0.008 | 0.166 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee6000000000000001d1 | 540.770 | 2.756 | n/a | 0.000 | 0.000 | 1.319 | 536.553 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.101 | 2.756 | 0.005 | 0.101 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000198 | 484.795 | 2.416 | n/a | 0.000 | 0.000 | 0.684 | 481.527 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.108 | 2.416 | 0.005 | 0.108 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000001b7 | 430.522 | 10.490 | n/a | 0.000 | 0.000 | 0.879 | 418.919 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.171 | 10.490 | 0.024 | 0.171 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000001c7 | 398.801 | 5.367 | n/a | 0.000 | 0.000 | 1.183 | 392.060 | 0.023 | n/a | 0.063 | 0.000 | n/a | n/a | 0.105 | 5.367 | 0.013 | 0.105 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 305.136 | n/a | n/a | n/a | 2.662 | n/a | 0.000 | 0.000 | 0.605 | 300.716 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.090 | 2.662 | 0.009 | 0.090 |
| p99 | 1003.572 | n/a | n/a | n/a | 10.460 | n/a | 0.000 | 0.000 | 4.380 | 1001.257 | 1.287 | n/a | 0.085 | 0.000 | n/a | n/a | 13.843 | 10.460 | 0.559 | 13.843 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee600000000000000212 | 1003.572 | 0.198 | n/a | 0.000 | 0.000 | 0.759 | 1001.257 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 1.270 | 0.198 | 0.000 | 1.270 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000000219 | 1003.550 | 0.310 | n/a | 0.000 | 0.000 | 0.879 | 1001.102 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 1.163 | 0.310 | 0.000 | 1.163 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000000217 | 1003.072 | 0.151 | n/a | 0.000 | 0.000 | 0.744 | 1000.985 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 1.128 | 0.151 | 0.000 | 1.128 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000001fe | 1002.423 | 2.368 | n/a | 0.000 | 0.000 | 0.476 | 999.426 | 0.020 | n/a | 0.066 | 0.000 | n/a | n/a | 0.067 | 2.368 | 0.002 | 0.067 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee6000000000000001ea | 990.396 | 2.538 | n/a | 0.000 | 0.000 | 0.391 | 987.363 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 2.538 | 0.003 | 0.064 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000000211 | 985.665 | 2.609 | n/a | 0.000 | 0.000 | 0.596 | 982.314 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.077 | 2.609 | 0.003 | 0.077 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000000215 | 959.148 | 3.164 | n/a | 0.000 | 0.000 | 0.609 | 955.229 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.101 | 3.164 | 0.003 | 0.101 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000000206 | 924.586 | 2.800 | n/a | 0.000 | 0.000 | 0.526 | 921.093 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.135 | 2.800 | 0.003 | 0.135 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee6000000000000001f7 | 816.795 | 2.444 | n/a | 0.000 | 0.000 | 0.611 | 813.496 | 0.116 | n/a | 0.041 | 0.000 | n/a | n/a | 0.087 | 2.444 | 0.003 | 0.087 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000001ff | 808.442 | 2.135 | n/a | 0.000 | 0.000 | 0.544 | 805.639 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.090 | 2.135 | 0.003 | 0.090 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000000202 | 746.582 | 2.621 | n/a | 0.000 | 0.000 | 0.678 | 743.165 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.071 | 2.621 | 0.004 | 0.071 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee6000000000000001dd | 738.431 | 3.004 | n/a | 0.000 | 0.000 | 2.692 | 732.636 | 0.005 | n/a | 0.030 | 0.000 | n/a | n/a | 0.064 | 3.004 | 0.004 | 0.064 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000001f0 | 728.438 | 2.072 | n/a | 0.000 | 0.000 | 4.380 | 721.830 | 0.014 | n/a | 0.067 | 0.000 | n/a | n/a | 0.075 | 2.072 | 0.003 | 0.075 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000001f4 | 701.030 | 2.640 | n/a | 0.000 | 0.000 | 0.633 | 697.627 | 0.005 | n/a | 0.035 | 0.000 | n/a | n/a | 0.089 | 2.640 | 0.004 | 0.089 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee6000000000000001e8 | 673.130 | 2.234 | n/a | 0.000 | 0.000 | 0.458 | 670.333 | 0.004 | n/a | 0.025 | 0.000 | n/a | n/a | 0.076 | 2.234 | 0.003 | 0.076 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000001d9 | 610.042 | 2.178 | n/a | 0.000 | 0.000 | 0.421 | 607.228 | 0.123 | n/a | 0.029 | 0.000 | n/a | n/a | 0.063 | 2.178 | 0.004 | 0.063 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000001f9 | 537.884 | 2.213 | n/a | 0.000 | 0.000 | 1.805 | 533.751 | 0.005 | n/a | 0.034 | 0.000 | n/a | n/a | 0.076 | 2.213 | 0.004 | 0.076 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee60000000000000020f | 484.056 | 4.409 | n/a | 0.000 | 0.000 | 0.605 | 478.822 | 0.114 | n/a | 0.038 | 0.000 | n/a | n/a | 0.068 | 4.409 | 0.009 | 0.068 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee6000000000000001ee | 470.884 | 3.195 | n/a | 0.000 | 0.000 | 0.587 | 466.888 | 0.005 | n/a | 0.051 | 0.000 | n/a | n/a | 0.158 | 3.195 | 0.007 | 0.158 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000001e1 | 464.409 | 5.145 | n/a | 0.000 | 0.000 | 0.846 | 458.302 | 0.002 | n/a | 0.030 | 0.000 | n/a | n/a | 0.084 | 5.145 | 0.011 | 0.084 | gw-r/thread-48/journal/page | none observed |

## P3 / L1024 / internal (765 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.690 | n/a | n/a | n/a | 3.341 | n/a | 0.000 | 0.000 | 0.256 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.405 | 3.341 | 0.273 | 7.405 |
| p99 | 144.674 | n/a | n/a | n/a | 13.620 | n/a | 1.079 | 0.000 | 0.893 | 124.139 | 0.134 | n/a | 0.055 | 0.000 | n/a | n/a | 44.741 | 13.620 | 0.822 | 44.741 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee600000000000000226 | 995.341 | 2.793 | n/a | 0.000 | 0.000 | 0.411 | 991.984 | 0.009 | n/a | 0.044 | 0.000 | n/a | n/a | 0.100 | 2.793 | 0.003 | 0.100 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee60000000000000021b | 855.753 | 2.423 | n/a | 0.000 | 0.000 | 0.790 | 852.407 | 0.006 | n/a | 0.047 | 0.000 | n/a | n/a | 0.081 | 2.423 | 0.003 | 0.081 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000227 | 855.317 | 2.472 | n/a | 0.000 | 0.000 | 0.625 | 852.041 | 0.010 | n/a | 0.061 | 0.000 | n/a | n/a | 0.108 | 2.472 | 0.003 | 0.108 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee60000000000000021e | 722.092 | 2.493 | n/a | 0.000 | 0.000 | 0.687 | 718.515 | 0.225 | n/a | 0.082 | 0.000 | n/a | n/a | 0.090 | 2.493 | 0.003 | 0.090 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000223 | 686.113 | 3.574 | n/a | 0.000 | 0.000 | 0.691 | 681.638 | 0.012 | n/a | 0.067 | 0.000 | n/a | n/a | 0.130 | 3.574 | 0.005 | 0.130 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee600000000000000224 | 251.776 | 3.280 | n/a | 0.000 | 0.000 | 0.802 | 247.544 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.076 | 3.280 | 0.013 | 0.076 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee60000000000000021f | 250.683 | 3.116 | n/a | 0.000 | 0.000 | 0.433 | 246.901 | 0.100 | n/a | 0.048 | 0.000 | n/a | n/a | 0.085 | 3.116 | 0.012 | 0.085 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000004ed | 144.674 | 19.782 | n/a | 0.000 | 0.000 | 0.592 | 124.139 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.096 | 19.782 | 0.137 | 0.096 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee60000000000000021c | 123.856 | 3.605 | n/a | 0.000 | 0.000 | 0.457 | 119.450 | 0.139 | n/a | 0.036 | 0.000 | n/a | n/a | 0.169 | 3.605 | 0.029 | 0.169 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000000221 | 106.571 | 4.195 | n/a | 0.000 | 0.000 | 0.552 | 101.564 | 0.010 | n/a | 0.060 | 0.000 | n/a | n/a | 0.189 | 4.195 | 0.039 | 0.189 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee600000000000000313 | 106.478 | 2.814 | n/a | 0.000 | 0.000 | 0.649 | 102.782 | 0.108 | n/a | 0.051 | 0.000 | n/a | n/a | 0.073 | 2.814 | 0.026 | 0.073 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee60000000000000066f | 104.181 | 12.837 | n/a | 0.000 | 0.000 | 1.995 | 89.187 | 0.008 | n/a | 0.021 | 0.000 | n/a | n/a | 0.132 | 12.837 | 0.123 | 0.132 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee60000000000000082a | 94.325 | 5.218 | n/a | 0.000 | 0.000 | 0.764 | 87.958 | 0.179 | n/a | 0.035 | 0.000 | n/a | n/a | 0.170 | 5.218 | 0.055 | 0.170 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee6000000000000002f6 | 94.174 | 5.790 | n/a | 0.000 | 0.000 | 0.589 | 87.644 | 0.026 | n/a | 0.040 | 0.000 | n/a | n/a | 0.084 | 5.790 | 0.061 | 0.084 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee60000000000000046f | 93.875 | 4.067 | n/a | 0.000 | 0.000 | 0.599 | 89.004 | 0.081 | n/a | 0.052 | 0.000 | n/a | n/a | 0.071 | 4.067 | 0.043 | 0.071 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000000764 | 92.227 | 6.344 | n/a | 0.000 | 0.000 | 0.485 | 85.236 | 0.005 | n/a | 0.015 | 0.000 | n/a | n/a | 0.142 | 6.344 | 0.069 | 0.142 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee6000000000000005f1 | 88.746 | 5.539 | n/a | 0.000 | 0.000 | 0.463 | 82.516 | 0.003 | n/a | 0.025 | 0.000 | n/a | n/a | 0.200 | 5.539 | 0.062 | 0.200 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee60000000000000063c | 87.699 | 11.789 | n/a | 0.000 | 0.000 | 0.468 | 75.020 | 0.007 | n/a | 0.023 | 0.000 | n/a | n/a | 0.392 | 11.789 | 0.134 | 0.392 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee6000000000000007a7 | 83.874 | 2.774 | n/a | 0.000 | 0.000 | 0.556 | 80.376 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.108 | 2.774 | 0.033 | 0.108 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000000796 | 80.952 | 9.533 | n/a | 0.000 | 0.000 | 0.562 | 70.637 | 0.003 | n/a | 0.010 | 0.000 | n/a | n/a | 0.208 | 9.533 | 0.118 | 0.208 | gw-r/thread-49/journal/page | none observed |

## P3 / tail / internal (2315 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.312 | n/a | n/a | n/a | 4.090 | n/a | 0.000 | 0.000 | 0.241 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.263 | 4.109 | 0.347 | 6.263 |
| p99 | 347.432 | n/a | n/a | n/a | 16.702 | n/a | 1.703 | 0.000 | 0.831 | 342.523 | 0.114 | n/a | 0.034 | 0.000 | n/a | n/a | 46.040 | 17.493 | 0.851 | 46.040 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f14df80169c0ee600000000000001ab6 | 1002.256 | 0.164 | n/a | 0.000 | 0.000 | 0.432 | 1000.441 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 1.167 | 0.164 | 0.000 | 1.167 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000001b02 | 1002.206 | 0.118 | n/a | 0.000 | 0.000 | 0.535 | 1000.428 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 1.087 | 0.118 | 0.000 | 1.087 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000001ac0 | 990.269 | 2.756 | n/a | 0.000 | 0.000 | 0.352 | 986.999 | 0.085 | n/a | 0.023 | 0.000 | n/a | n/a | 0.053 | 2.756 | 0.003 | 0.053 | gw-r/thread-70/journal/page | none observed |
| f14df80169c0ee600000000000001afe | 988.965 | 4.916 | n/a | 0.000 | 0.000 | 0.585 | 983.257 | 0.084 | n/a | 0.025 | 0.000 | n/a | n/a | 0.097 | 4.916 | 0.005 | 0.097 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000001af9 | 981.720 | 6.111 | n/a | 0.000 | 0.000 | 0.525 | 974.725 | 0.146 | n/a | 0.035 | 0.000 | n/a | n/a | 0.177 | 6.111 | 0.006 | 0.177 | gw-r/thread-47/journal/page | none observed |
| f14df80169c0ee600000000000001ad9 | 980.704 | 2.768 | n/a | 0.000 | 0.000 | 0.425 | 977.424 | 0.004 | n/a | 0.024 | 0.000 | n/a | n/a | 0.059 | 2.768 | 0.003 | 0.059 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000001ab4 | 966.240 | 4.485 | n/a | 0.000 | 0.000 | 0.392 | 961.268 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 0.065 | 4.485 | 0.005 | 0.065 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000001aca | 955.194 | 7.981 | n/a | 0.000 | 0.000 | 0.579 | 946.423 | 0.004 | n/a | 0.029 | 0.000 | n/a | n/a | 0.178 | 7.981 | 0.008 | 0.178 | gw-r/thread-50/journal/page | none observed |
| f14df80169c0ee600000000000001abb | 949.230 | 3.494 | n/a | 0.000 | 0.000 | 0.378 | 945.204 | 0.004 | n/a | 0.028 | 0.000 | n/a | n/a | 0.122 | 3.494 | 0.004 | 0.122 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee600000000000001ab8 | 841.978 | 9.468 | n/a | 0.000 | 0.000 | 0.594 | 831.523 | 0.003 | n/a | 0.037 | 0.000 | n/a | n/a | 0.353 | 9.468 | 0.011 | 0.353 | gw-r/thread-69/journal/page | none observed |
| f14df80169c0ee600000000000001adb | 807.951 | 2.898 | n/a | 0.000 | 0.000 | 0.436 | 804.436 | 0.077 | n/a | 0.028 | 0.000 | n/a | n/a | 0.077 | 2.898 | 0.004 | 0.077 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000001afb | 748.031 | 2.149 | n/a | 0.000 | 0.000 | 0.510 | 745.191 | 0.084 | n/a | 0.018 | 0.000 | n/a | n/a | 0.080 | 2.149 | 0.003 | 0.080 | gw-r/thread-48/journal/page | none observed |
| f14df80169c0ee600000000000001ad5 | 743.875 | 3.363 | n/a | 0.000 | 0.000 | 0.416 | 739.961 | 0.008 | n/a | 0.045 | 0.000 | n/a | n/a | 0.082 | 3.363 | 0.005 | 0.082 | gw-r/thread-49/journal/page | none observed |
| f14df80169c0ee600000000000001ad0 | 635.638 | 2.210 | n/a | 0.000 | 0.000 | 0.302 | 632.784 | 0.260 | n/a | 0.028 | 0.000 | n/a | n/a | 0.055 | 2.210 | 0.003 | 0.055 | gw-r/thread-70/journal/page | none observed |
| f14df80169c0ee600000000000001ac1 | 582.422 | 1.729 | n/a | 0.000 | 0.000 | 0.305 | 580.099 | 0.205 | n/a | 0.019 | 0.000 | n/a | n/a | 0.065 | 1.729 | 0.003 | 0.065 | gw-r/thread-46/journal/page | none observed |
| f14df80169c0ee600000000000001af3 | 562.196 | 2.533 | n/a | 0.000 | 0.000 | 0.471 | 559.097 | 0.004 | n/a | 0.023 | 0.000 | n/a | n/a | 0.067 | 2.533 | 0.005 | 0.067 | gw-r/thread-45/journal/page | none observed |
| f14df80169c0ee600000000000001add | 551.239 | 8.420 | n/a | 1.389 | 0.000 | 0.606 | 540.129 | 0.090 | n/a | 0.022 | 0.000 | n/a | n/a | 0.583 | 9.809 | 0.018 | 0.583 | gw-r/thread-70/journal/page | none observed |
| f14df80169c0ee600000000000001af5 | 546.938 | 4.508 | n/a | 0.000 | 0.000 | 0.419 | 541.854 | 0.004 | n/a | 0.030 | 0.000 | n/a | n/a | 0.124 | 4.508 | 0.008 | 0.124 | gw-r/thread-43/journal/page | none observed |
| f14df80169c0ee600000000000001ae9 | 461.362 | 3.313 | n/a | 0.000 | 0.000 | 0.798 | 457.162 | 0.003 | n/a | 0.033 | 0.000 | n/a | n/a | 0.054 | 3.313 | 0.007 | 0.054 | gw-r/thread-69/journal/page | none observed |
| f14df80169c0ee600000000000001aeb | 458.487 | 2.367 | n/a | 0.000 | 0.000 | 0.476 | 455.537 | 0.005 | n/a | 0.039 | 0.000 | n/a | n/a | 0.063 | 2.367 | 0.005 | 0.063 | gw-r/thread-69/journal/page | none observed |

## P3 / warmup / read (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.910 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.917 | 0.014 | n/a | 0.122 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 |
| p99 | 204.748 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.654 | 202.047 | 4.517 | n/a | 0.537 | 0.000 | n/a | n/a | 0.422 | 0.000 | 0.000 | 0.422 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd26000000000000004d | 204.748 | 0.000 | n/a | 0.000 | 0.000 | 3.654 | 200.835 | 0.013 | n/a | 0.094 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000014 | 204.116 | 0.000 | n/a | 0.000 | 0.000 | 1.666 | 202.047 | 0.021 | n/a | 0.235 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000032 | 203.453 | 0.000 | n/a | 0.000 | 0.000 | 2.107 | 201.033 | 0.012 | n/a | 0.196 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000043 | 203.328 | 0.000 | n/a | 0.000 | 0.000 | 1.162 | 201.782 | 0.015 | n/a | 0.174 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000035 | 203.170 | 0.000 | n/a | 0.000 | 0.000 | 1.323 | 201.479 | 0.017 | n/a | 0.177 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd26000000000000004a | 203.067 | 0.000 | n/a | 0.000 | 0.000 | 1.104 | 201.545 | 0.060 | n/a | 0.151 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000009 | 202.930 | 0.000 | n/a | 0.000 | 0.000 | 1.472 | 200.918 | 0.012 | n/a | 0.127 | 0.000 | n/a | n/a | 0.401 | 0.000 | 0.000 | 0.401 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd26000000000000002d | 202.732 | 0.000 | n/a | 0.000 | 0.000 | 1.177 | 201.190 | 0.012 | n/a | 0.161 | 0.000 | n/a | n/a | 0.191 | 0.000 | 0.000 | 0.191 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000000b | 202.690 | 0.000 | n/a | 0.000 | 0.000 | 0.921 | 201.463 | 0.014 | n/a | 0.162 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd26000000000000004f | 202.635 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.324 | 0.053 | n/a | 0.191 | 0.000 | n/a | n/a | 0.199 | 0.000 | 0.000 | 0.199 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000057 | 202.619 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 201.594 | 0.086 | n/a | 0.155 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000054 | 202.583 | 0.000 | n/a | 0.000 | 0.000 | 0.937 | 201.366 | 0.025 | n/a | 0.157 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000020 | 202.578 | 0.000 | n/a | 0.000 | 0.000 | 0.945 | 201.274 | 0.015 | n/a | 0.171 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000055 | 202.546 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.244 | 0.028 | n/a | 0.145 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000013 | 202.395 | 0.000 | n/a | 0.000 | 0.000 | 0.742 | 201.223 | 0.022 | n/a | 0.271 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000038 | 202.377 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.958 | 0.013 | n/a | 0.537 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000024 | 202.365 | 0.000 | n/a | 0.000 | 0.000 | 0.867 | 201.190 | 0.024 | n/a | 0.159 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000027 | 202.348 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 201.157 | 0.015 | n/a | 0.149 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000017 | 202.346 | 0.000 | n/a | 0.000 | 0.000 | 0.846 | 201.175 | 0.011 | n/a | 0.189 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000008 | 202.335 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 201.001 | 0.012 | n/a | 0.142 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.943 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.833 | 200.924 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 206.631 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.850 | 204.534 | 4.744 | n/a | 0.469 | 0.000 | n/a | n/a | 0.455 | 0.000 | 0.000 | 0.455 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd260000000000000091 | 206.631 | 0.000 | n/a | 0.000 | 0.000 | 3.552 | 202.482 | 0.173 | n/a | 0.243 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000073 | 205.953 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 204.534 | 0.038 | n/a | 0.162 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000000b2 | 205.310 | 0.000 | n/a | 0.000 | 0.000 | 3.481 | 201.538 | 0.021 | n/a | 0.161 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd2600000000000000aa | 204.894 | 0.000 | n/a | 0.000 | 0.000 | 3.850 | 200.811 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.125 | 0.000 | 0.000 | 0.125 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000000b1 | 203.967 | 0.000 | n/a | 0.000 | 0.000 | 1.548 | 201.972 | 0.048 | n/a | 0.168 | 0.000 | n/a | n/a | 0.231 | 0.000 | 0.000 | 0.231 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000008f | 203.655 | 0.000 | n/a | 0.000 | 0.000 | 1.295 | 201.894 | 0.088 | n/a | 0.151 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000096 | 203.635 | 0.000 | n/a | 0.000 | 0.000 | 1.194 | 201.796 | 0.045 | n/a | 0.469 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd26000000000000005c | 203.594 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 201.687 | 0.079 | n/a | 0.460 | 0.000 | n/a | n/a | 0.215 | 0.000 | 0.000 | 0.215 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000092 | 203.231 | 0.000 | n/a | 0.000 | 0.000 | 1.158 | 201.677 | 0.039 | n/a | 0.218 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000065 | 203.182 | 0.000 | n/a | 0.000 | 0.000 | 0.987 | 201.804 | 0.031 | n/a | 0.197 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd2600000000000000b8 | 203.169 | 0.000 | n/a | 0.000 | 0.000 | 1.510 | 201.249 | 0.016 | n/a | 0.109 | 0.000 | n/a | n/a | 0.284 | 0.000 | 0.000 | 0.284 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000000b9 | 203.058 | 0.000 | n/a | 0.000 | 0.000 | 1.591 | 201.035 | 0.013 | n/a | 0.136 | 0.000 | n/a | n/a | 0.283 | 0.000 | 0.000 | 0.283 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd260000000000000066 | 203.036 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.727 | 0.029 | n/a | 0.122 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd26000000000000007f | 202.981 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 201.915 | 0.038 | n/a | 0.153 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000000b6 | 202.948 | 0.000 | n/a | 0.000 | 0.000 | 1.202 | 201.147 | 0.024 | n/a | 0.120 | 0.000 | n/a | n/a | 0.455 | 0.000 | 0.000 | 0.455 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000081 | 202.930 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 201.549 | 0.036 | n/a | 0.150 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000061 | 202.850 | 0.000 | n/a | 0.000 | 0.000 | 1.083 | 201.430 | 0.014 | n/a | 0.139 | 0.000 | n/a | n/a | 0.184 | 0.000 | 0.000 | 0.184 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd2600000000000000be | 202.812 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.895 | 0.028 | n/a | 0.188 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd2600000000000000bd | 202.786 | 0.000 | n/a | 0.000 | 0.000 | 0.857 | 201.580 | 0.029 | n/a | 0.162 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd260000000000000071 | 202.754 | 0.000 | n/a | 0.000 | 0.000 | 1.036 | 201.302 | 0.033 | n/a | 0.144 | 0.000 | n/a | n/a | 0.239 | 0.000 | 0.000 | 0.239 | gw-r/thread-50/journal/page | none observed |

## P3 / L4 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.827 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.880 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 |
| p99 | 203.014 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 201.952 | 51.708 | n/a | 0.197 | 0.000 | n/a | n/a | 0.353 | 0.000 | 0.000 | 0.353 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd2600000000000000e4 | 203.014 | 0.000 | n/a | 0.000 | 0.000 | 0.827 | 201.952 | 0.007 | n/a | 0.078 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000000fd | 202.723 | 0.000 | n/a | 0.000 | 0.000 | 1.610 | 200.806 | 0.007 | n/a | 0.072 | 0.000 | n/a | n/a | 0.227 | 0.000 | 0.000 | 0.227 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd2600000000000000ff | 202.669 | 0.000 | n/a | 0.000 | 0.000 | 0.598 | 201.553 | 0.301 | n/a | 0.111 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd26000000000000010c | 202.638 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 201.365 | 0.043 | n/a | 0.090 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000000cf | 202.610 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.557 | 0.024 | n/a | 0.108 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000000c8 | 202.564 | 0.000 | n/a | 0.000 | 0.000 | 0.988 | 201.232 | 0.009 | n/a | 0.161 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000102 | 202.500 | 0.000 | n/a | 0.000 | 0.000 | 1.028 | 201.134 | 0.013 | n/a | 0.140 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd2600000000000000e6 | 202.456 | 0.000 | n/a | 0.000 | 0.000 | 0.725 | 201.456 | 0.023 | n/a | 0.134 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd26000000000000011c | 202.409 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 201.387 | 0.006 | n/a | 0.116 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000109 | 202.380 | 0.000 | n/a | 0.000 | 0.000 | 0.886 | 201.205 | 0.010 | n/a | 0.155 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd26000000000000011a | 202.374 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 201.323 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd26000000000000011e | 202.368 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.039 | 0.007 | n/a | 0.089 | 0.000 | n/a | n/a | 0.164 | 0.000 | 0.000 | 0.164 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000000da | 202.359 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.154 | 0.011 | n/a | 0.089 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd2600000000000000ef | 202.272 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 201.178 | 0.021 | n/a | 0.081 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000101 | 202.269 | 0.000 | n/a | 0.000 | 0.000 | 0.882 | 201.087 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.212 | 0.000 | 0.000 | 0.212 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd2600000000000000ca | 202.261 | 0.000 | n/a | 0.000 | 0.000 | 0.997 | 201.016 | 0.009 | n/a | 0.082 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000000f1 | 202.246 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 201.341 | 0.013 | n/a | 0.126 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd2600000000000000ce | 202.241 | 0.000 | n/a | 0.000 | 0.000 | 1.001 | 200.945 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000000f6 | 202.235 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 201.300 | 0.034 | n/a | 0.143 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd2600000000000000d7 | 202.233 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.234 | 0.034 | n/a | 0.114 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.651 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.719 | 200.781 | 0.009 | n/a | 0.065 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 206.398 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.946 | 203.228 | 4.402 | n/a | 0.342 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd26000000000000013e | 206.398 | 0.000 | n/a | 0.000 | 0.000 | 2.946 | 203.228 | 0.018 | n/a | 0.085 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000151 | 203.114 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.873 | 0.011 | n/a | 0.114 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000175 | 202.549 | 0.000 | n/a | 0.000 | 0.000 | 0.763 | 201.522 | 0.011 | n/a | 0.133 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000152 | 202.482 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 201.203 | 0.015 | n/a | 0.094 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd26000000000000013c | 202.473 | 0.000 | n/a | 0.000 | 0.000 | 1.010 | 201.092 | 0.025 | n/a | 0.126 | 0.000 | n/a | n/a | 0.220 | 0.000 | 0.000 | 0.220 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000176 | 202.464 | 0.000 | n/a | 0.000 | 0.000 | 0.865 | 201.363 | 0.007 | n/a | 0.121 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000142 | 202.460 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 201.161 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd26000000000000012b | 202.397 | 0.000 | n/a | 0.000 | 0.000 | 0.702 | 201.457 | 0.012 | n/a | 0.120 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000137 | 202.330 | 0.000 | n/a | 0.000 | 0.000 | 1.110 | 200.934 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000129 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.991 | 201.049 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000014a | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.347 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd26000000000000015f | 202.310 | 0.000 | n/a | 0.000 | 0.000 | 0.995 | 200.948 | 0.010 | n/a | 0.078 | 0.000 | n/a | n/a | 0.280 | 0.000 | 0.000 | 0.280 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000157 | 202.279 | 0.000 | n/a | 0.000 | 0.000 | 1.290 | 200.796 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd26000000000000013b | 202.257 | 0.000 | n/a | 0.000 | 0.000 | 0.910 | 201.112 | 0.006 | n/a | 0.103 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000143 | 202.211 | 0.000 | n/a | 0.000 | 0.000 | 0.756 | 201.225 | 0.018 | n/a | 0.109 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000180 | 202.165 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 200.982 | 0.005 | n/a | 0.066 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd26000000000000014e | 202.164 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 201.004 | 0.007 | n/a | 0.090 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000168 | 202.140 | 0.000 | n/a | 0.000 | 0.000 | 0.792 | 201.069 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.176 | 0.000 | 0.000 | 0.176 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000163 | 202.137 | 0.000 | n/a | 0.000 | 0.000 | 0.606 | 201.296 | 0.012 | n/a | 0.103 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd260000000000000136 | 202.125 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 201.114 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |

## P3 / L64 / read (103 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.489 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.644 | 200.688 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 |
| p99 | 202.809 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.789 | 201.932 | 2.745 | n/a | 0.114 | 0.000 | n/a | n/a | 0.324 | 0.000 | 0.000 | 0.324 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd2600000000000001a0 | 204.501 | 0.000 | n/a | 0.000 | 0.000 | 1.262 | 203.008 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000190 | 202.809 | 0.000 | n/a | 0.000 | 0.000 | 0.635 | 201.932 | 0.015 | n/a | 0.066 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000001ee | 202.390 | 0.000 | n/a | 0.000 | 0.000 | 0.888 | 201.202 | 0.011 | n/a | 0.094 | 0.000 | n/a | n/a | 0.195 | 0.000 | 0.000 | 0.195 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd2600000000000001d0 | 202.346 | 0.000 | n/a | 0.000 | 0.000 | 0.875 | 201.230 | 0.015 | n/a | 0.096 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000019d | 202.175 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 200.879 | 0.020 | n/a | 0.053 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000001c0 | 202.170 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 201.002 | 0.010 | n/a | 0.073 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd2600000000000001e6 | 202.165 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 200.864 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000001e5 | 202.152 | 0.000 | n/a | 0.000 | 0.000 | 0.715 | 201.146 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000001d6 | 202.111 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 201.064 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000001d3 | 202.079 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 200.993 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000001bf | 202.077 | 0.000 | n/a | 0.000 | 0.000 | 0.971 | 200.845 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000001bb | 202.000 | 0.000 | n/a | 0.000 | 0.000 | 0.681 | 201.141 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000001ab | 201.985 | 0.000 | n/a | 0.000 | 0.000 | 0.974 | 200.732 | 0.007 | n/a | 0.047 | 0.000 | n/a | n/a | 0.225 | 0.000 | 0.000 | 0.225 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd2600000000000001c8 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.808 | 200.951 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd2600000000000001cd | 201.946 | 0.000 | n/a | 0.000 | 0.000 | 0.622 | 201.090 | 0.009 | n/a | 0.114 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd2600000000000001aa | 201.943 | 0.000 | n/a | 0.000 | 0.000 | 0.699 | 200.996 | 0.007 | n/a | 0.110 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000001b4 | 201.943 | 0.000 | n/a | 0.000 | 0.000 | 0.728 | 200.992 | 0.009 | n/a | 0.073 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000192 | 201.933 | 0.000 | n/a | 0.000 | 0.000 | 0.813 | 200.840 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd2600000000000001eb | 201.930 | 0.000 | n/a | 0.000 | 0.000 | 0.858 | 200.845 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.154 | 0.000 | 0.000 | 0.154 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd2600000000000001d9 | 201.899 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 201.074 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.532 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.652 | 200.726 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 |
| p99 | 203.219 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.409 | 201.725 | 2.337 | n/a | 0.156 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd260000000000000275 | 203.400 | 0.000 | n/a | 0.000 | 0.000 | 1.364 | 201.665 | 0.012 | n/a | 0.167 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000216 | 203.219 | 0.000 | n/a | 0.000 | 0.000 | 0.847 | 202.167 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd260000000000000276 | 202.985 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 201.685 | 0.019 | n/a | 0.151 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000207 | 202.916 | 0.000 | n/a | 0.000 | 0.000 | 1.847 | 200.889 | 0.007 | n/a | 0.067 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd26000000000000026a | 202.688 | 0.000 | n/a | 0.000 | 0.000 | 1.292 | 201.165 | 0.007 | n/a | 0.075 | 0.000 | n/a | n/a | 0.148 | 0.000 | 0.000 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000277 | 202.577 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 201.383 | 0.011 | n/a | 0.081 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000228 | 202.452 | 0.000 | n/a | 0.000 | 0.000 | 0.913 | 201.240 | 0.012 | n/a | 0.156 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000021f | 202.367 | 0.000 | n/a | 0.000 | 0.000 | 0.463 | 201.725 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000211 | 202.356 | 0.000 | n/a | 0.000 | 0.000 | 0.934 | 201.202 | 0.009 | n/a | 0.078 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000220 | 202.325 | 0.000 | n/a | 0.000 | 0.000 | 1.054 | 200.983 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.200 | 0.000 | 0.000 | 0.200 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd260000000000000260 | 202.211 | 0.000 | n/a | 0.000 | 0.000 | 0.853 | 201.107 | 0.010 | n/a | 0.072 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000026b | 202.169 | 0.000 | n/a | 0.000 | 0.000 | 0.954 | 200.960 | 0.009 | n/a | 0.075 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000253 | 202.143 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 200.997 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000233 | 202.139 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 201.190 | 0.011 | n/a | 0.085 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd26000000000000020f | 202.112 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 201.143 | 0.006 | n/a | 0.105 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000244 | 202.107 | 0.000 | n/a | 0.000 | 0.000 | 0.837 | 201.084 | 0.010 | n/a | 0.075 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000274 | 202.074 | 0.000 | n/a | 0.000 | 0.000 | 0.571 | 201.084 | 0.012 | n/a | 0.085 | 0.000 | n/a | n/a | 0.321 | 0.000 | 0.000 | 0.321 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd26000000000000020b | 202.071 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 200.831 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000247 | 202.034 | 0.000 | n/a | 0.000 | 0.000 | 0.891 | 200.864 | 0.005 | n/a | 0.091 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000234 | 202.009 | 0.000 | n/a | 0.000 | 0.000 | 0.949 | 200.792 | 0.016 | n/a | 0.059 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / read (65 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 79.654 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.576 | 78.448 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 206.773 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.787 | 205.792 | 2.377 | n/a | 0.113 | 0.000 | n/a | n/a | 61.719 | 0.000 | 0.000 | 61.719 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd260000000000000289 | 206.773 | 0.000 | n/a | 0.000 | 0.000 | 0.751 | 205.792 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000282 | 202.315 | 0.000 | n/a | 0.000 | 0.000 | 1.047 | 201.063 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd26000000000000027b | 202.106 | 0.000 | n/a | 0.000 | 0.000 | 1.008 | 200.758 | 0.007 | n/a | 0.056 | 0.000 | n/a | n/a | 0.277 | 0.000 | 0.000 | 0.277 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd26000000000000028d | 202.078 | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 200.888 | 0.006 | n/a | 0.062 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000280 | 202.021 | 0.000 | n/a | 0.000 | 0.000 | 0.887 | 200.866 | 0.005 | n/a | 0.059 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000279 | 201.847 | 0.000 | n/a | 0.000 | 0.000 | 0.539 | 201.090 | 0.009 | n/a | 0.095 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000286 | 201.795 | 0.000 | n/a | 0.000 | 0.000 | 0.770 | 200.771 | 0.006 | n/a | 0.063 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd26000000000000027a | 201.723 | 0.000 | n/a | 0.000 | 0.000 | 0.732 | 200.777 | 0.006 | n/a | 0.056 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000292 | 201.649 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 200.626 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000285 | 201.622 | 0.000 | n/a | 0.000 | 0.000 | 0.685 | 200.721 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd26000000000000027e | 201.566 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 200.854 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000291 | 201.548 | 0.000 | n/a | 0.000 | 0.000 | 0.630 | 200.654 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd26000000000000028c | 201.491 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 200.640 | 0.005 | n/a | 0.053 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd26000000000000027f | 201.467 | 0.000 | n/a | 0.000 | 0.000 | 0.374 | 200.925 | 0.014 | n/a | 0.063 | 0.000 | n/a | n/a | 0.091 | 0.000 | 0.000 | 0.091 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd26000000000000028b | 201.466 | 0.000 | n/a | 0.000 | 0.000 | 0.577 | 200.665 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000287 | 201.435 | 0.000 | n/a | 0.000 | 0.000 | 0.490 | 200.696 | 0.011 | n/a | 0.113 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-45/journal/page | none observed |
| 066f76d6a53bdd26000000000000028e | 201.308 | 0.000 | n/a | 0.000 | 0.000 | 0.503 | 200.632 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000290 | 201.086 | 0.000 | n/a | 0.000 | 0.000 | 0.385 | 200.536 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd26000000000000027c | 193.954 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 192.940 | 0.004 | n/a | 0.015 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000293 | 188.112 | 0.000 | n/a | 0.000 | 0.000 | 0.633 | 187.251 | 0.009 | n/a | 0.041 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / read (222 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 84.889 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 83.852 | 0.005 | n/a | 0.032 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 |
| p99 | 202.233 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.520 | 201.155 | 1.476 | n/a | 0.089 | 0.000 | n/a | n/a | 0.320 | 0.000 | 0.000 | 0.320 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 066f76d6a53bdd260000000000000f09 | 202.424 | 0.000 | n/a | 0.000 | 0.000 | 0.736 | 201.502 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000f23 | 202.364 | 0.000 | n/a | 0.000 | 0.000 | 1.140 | 200.842 | 0.009 | n/a | 0.060 | 0.000 | n/a | n/a | 0.314 | 0.000 | 0.000 | 0.314 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000ecb | 202.233 | 0.000 | n/a | 0.000 | 0.000 | 0.766 | 201.201 | 0.032 | n/a | 0.061 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000ef0 | 201.953 | 0.000 | n/a | 0.000 | 0.000 | 1.236 | 200.545 | 0.004 | n/a | 0.054 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000ef5 | 201.855 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 201.155 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.102 | 0.000 | 0.000 | 0.102 | gw-r/thread-69/journal/page | none observed |
| 066f76d6a53bdd260000000000000f22 | 201.812 | 0.000 | n/a | 0.000 | 0.000 | 0.480 | 201.108 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.095 | 0.000 | 0.000 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 066f76d6a53bdd260000000000000ee7 | 201.805 | 0.000 | n/a | 0.000 | 0.000 | 0.676 | 200.946 | 0.007 | n/a | 0.057 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000eb6 | 201.788 | 0.000 | n/a | 0.000 | 0.000 | 0.583 | 200.974 | 0.020 | n/a | 0.071 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000eb5 | 201.729 | 0.000 | n/a | 0.000 | 0.000 | 0.563 | 201.004 | 0.016 | n/a | 0.066 | 0.000 | n/a | n/a | 0.080 | 0.000 | 0.000 | 0.080 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000eed | 201.694 | 0.000 | n/a | 0.000 | 0.000 | 0.876 | 200.616 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000f1a | 201.665 | 0.000 | n/a | 0.000 | 0.000 | 0.692 | 200.776 | 0.004 | n/a | 0.047 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000ed6 | 201.641 | 0.000 | n/a | 0.000 | 0.000 | 0.547 | 200.889 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-70/journal/page | none observed |
| 066f76d6a53bdd260000000000000f0c | 201.611 | 0.000 | n/a | 0.000 | 0.000 | 0.609 | 200.842 | 0.006 | n/a | 0.058 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000ebc | 201.584 | 0.000 | n/a | 0.000 | 0.000 | 0.579 | 200.862 | 0.003 | n/a | 0.056 | 0.000 | n/a | n/a | 0.084 | 0.000 | 0.000 | 0.084 | gw-r/thread-47/journal/page | none observed |
| 066f76d6a53bdd260000000000000eec | 201.521 | 0.000 | n/a | 0.000 | 0.000 | 0.574 | 200.770 | 0.004 | n/a | 0.059 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000f21 | 201.514 | 0.000 | n/a | 0.000 | 0.000 | 0.581 | 200.755 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-43/journal/page | none observed |
| 066f76d6a53bdd260000000000000ec4 | 201.492 | 0.000 | n/a | 0.000 | 0.000 | 0.492 | 200.809 | 0.022 | n/a | 0.054 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 066f76d6a53bdd260000000000000eff | 201.480 | 0.000 | n/a | 0.000 | 0.000 | 0.571 | 200.749 | 0.004 | n/a | 0.052 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 066f76d6a53bdd260000000000000f18 | 201.445 | 0.000 | n/a | 0.000 | 0.000 | 0.691 | 200.593 | 0.003 | n/a | 0.038 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 066f76d6a53bdd260000000000000ed9 | 201.434 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 200.731 | 0.004 | n/a | 0.044 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-69/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-51/peer.transact-await (includes order/network/storage)` (69.816 ms, trace `d056e27dfdcaeec30000000000000129`); `gw-w/thread-47/peer.transact-await (includes order/network/storage)` (45.767 ms, trace `d056e27dfdcaeec30000000000000884`); `node-14/thread-0/driver.queue.subject` (35.871 ms, trace `d056e27dfdcaeec300000000000010ce`); `gw-w/thread-52/peer.transact-await (includes order/network/storage)` (24.573 ms, trace `d056e27dfdcaeec300000000000001b5`); `node-14/thread-0/driver.queue.subject` (79.987 ms, trace `d056e27dfdcaeec30000000000000886`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p11-size-a-zero-before`; source `f9a84dcb52993e2ceff0210533d12e885ceb6d0d`; subjects 10000; tracing full.

Recorders: gateway, gw-jfr, node, postgres, tx-jfr. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3624/3625 (99.972%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3625/3625. Raw trace bytes: 32186835.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 19827 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13367.515 | 257.852 | 10.989 | 282 |
| L1 | 0 | 41764.096 | 774.863 | 37.293 | 924 |
| L4 | 0 | 44819.986 | 927.902 | 29.673 | 1214 |
| L16 | 0 | 43047.251 | 8298.479 | 87.036 | 33621 |
| L64 | 0 | 44656.778 | 8846.520 | 84.174 | 35373 |
| L256 | 0 | 44120.675 | 933.420 | 24.873 | 1010 |
| L1024 | 0 | 42320.302 | 948.847 | 26.620 | 1050 |
| tail | 0 | 13482.055 | 290.897 | 6.968 | 322 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| d056e27dfdcaeec30000000000000129 | driver.queue.scheduler-dispatch | 0.104 | none | 0 / 32 |
| d056e27dfdcaeec30000000000000129 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace d056e27dfdcaeec30000000000000129 waited: []

| d056e27dfdcaeec30000000000000884 | driver.queue.subject | 40.500 | d056e27dfdcaeec30000000000000882 | 3 / 32 |
| d056e27dfdcaeec30000000000000884 | driver.queue.scheduler-late | 1.885 | none | 3 / 32 |
| d056e27dfdcaeec30000000000000884 | driver.queue.scheduler-dispatch | 0.092 | none | 4 / 32 |

Observed active steps while trace d056e27dfdcaeec30000000000000884 waited: [{"at":1794827592663.7144,"inFlight":4,"capacity":32,"active":[{"traceId":"d056e27dfdcaeec30000000000000881","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000882","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000883","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000885","step":"client.http"}]}]

| d056e27dfdcaeec300000000000010ce | driver.queue.subject | 35.871 | d056e27dfdcaeec300000000000010cd | 1 / 32 |
| d056e27dfdcaeec300000000000010ce | driver.queue.scheduler-dispatch | 0.091 | none | 0 / 32 |
| d056e27dfdcaeec300000000000010ce | driver.queue.scheduler-late | 0.002 | none | 1 / 32 |

Observed active steps while trace d056e27dfdcaeec300000000000010ce waited: [{"at":1794827611818.6958,"inFlight":1,"capacity":32,"active":[{"traceId":"d056e27dfdcaeec300000000000010cc","step":"client.http"}]}]

| d056e27dfdcaeec300000000000001b5 | driver.queue.scheduler-dispatch | 0.102 | none | 0 / 32 |
| d056e27dfdcaeec300000000000001b5 | driver.queue.scheduler-late | 0.004 | none | 0 / 32 |

Observed active steps while trace d056e27dfdcaeec300000000000001b5 waited: []

| d056e27dfdcaeec30000000000000886 | driver.queue.subject | 79.987 | d056e27dfdcaeec30000000000000884 | 4 / 32 |
| d056e27dfdcaeec30000000000000886 | driver.queue.scheduler-dispatch | 0.096 | none | 1 / 32 |
| d056e27dfdcaeec30000000000000886 | driver.queue.scheduler-late | 0.001 | none | 4 / 32 |

Observed active steps while trace d056e27dfdcaeec30000000000000886 waited: [{"at":1794827592663.7144,"inFlight":4,"capacity":32,"active":[{"traceId":"d056e27dfdcaeec30000000000000881","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000882","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000883","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000885","step":"client.http"}]},{"at":1794827592683.3296,"inFlight":5,"capacity":32,"active":[{"traceId":"d056e27dfdcaeec30000000000000881","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000883","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000885","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000887","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000884","step":"client.http"}]},{"at":1794827592702.9292,"inFlight":5,"capacity":32,"active":[{"traceId":"d056e27dfdcaeec30000000000000883","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000885","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000887","step":"client.http"},{"traceId":"d056e27dfdcaeec30000000000000884","step":"client.http"},{"traceId":"d056e27dfdcaeec3000000000000088a","step":"client.http"}]},{"at":1794827592723.1453,"inFlight":2,"capacity":32,"active":[{"traceId":"d056e27dfdcaeec30000000000000884","step":"client.http"},{"traceId":"d056e27dfdcaeec3000000000000088a","step":"client.http"}]}]

## P2 / warmup / commit (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.274 | 0.700 | 0.000 | 0.745 | 3.034 | n/a | 0.000 | 0.085 | 1.022 | 2.525 | 0.024 | 0.000 | 0.739 | 9.802 | 2.647 | n/a | 0.036 | 3.167 | 0.153 | 0.036 |
| p99 | 72.435 | 3.810 | 0.000 | 4.727 | 14.538 | n/a | 3.074 | 2.756 | 3.639 | 11.199 | 0.072 | 0.000 | 6.748 | 28.415 | 12.448 | n/a | 0.147 | 18.736 | 0.353 | 0.147 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec300000000000000f2 | 72.435 | 14.538 | n/a | 1.442 | 2.756 | 1.242 | 11.199 | 0.070 | 0.000 | 0.179 | 28.415 | 12.448 | n/a | 0.147 | 18.736 | 0.259 | 0.147 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.030ms |
| d056e27dfdcaeec300000000000000f9 | 37.324 | 3.260 | n/a | 0.000 | 0.089 | 1.359 | 3.199 | 0.024 | 0.000 | 0.524 | 20.511 | 8.316 | n/a | 0.040 | 3.350 | 0.090 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| d056e27dfdcaeec30000000000000105 | 34.945 | 2.896 | n/a | 0.000 | 0.085 | 3.639 | 2.794 | 0.049 | 0.000 | 1.050 | 20.336 | 4.050 | n/a | 0.045 | 2.981 | 0.085 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000010f | 27.756 | 5.332 | n/a | 2.147 | 0.117 | 0.848 | 1.879 | 0.020 | 0.000 | 0.645 | 9.086 | 7.646 | n/a | 0.036 | 7.596 | 0.274 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000000f6 | 26.534 | 3.642 | n/a | 0.000 | 0.076 | 0.883 | 1.997 | 0.024 | 0.000 | 6.748 | 12.275 | 0.860 | n/a | 0.030 | 3.718 | 0.140 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| d056e27dfdcaeec30000000000000115 | 26.494 | 2.173 | n/a | 0.000 | 0.059 | 1.022 | 1.771 | 0.021 | 0.000 | 0.870 | 9.802 | 10.751 | n/a | 0.024 | 2.232 | 0.084 | 0.024 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec30000000000000102 | 26.228 | 5.953 | n/a | 3.074 | 0.237 | 1.069 | 2.525 | 0.025 | 0.000 | 1.417 | 10.706 | 1.140 | n/a | 0.081 | 9.264 | 0.353 | 0.081 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000000ff | 25.274 | 3.809 | n/a | 1.591 | 0.055 | 0.468 | 1.895 | 0.019 | 0.000 | 0.739 | 12.408 | 4.264 | n/a | 0.026 | 5.455 | 0.216 | 0.026 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| d056e27dfdcaeec3000000000000010c | 19.899 | 2.978 | n/a | 0.000 | 0.064 | 0.730 | 4.309 | 0.024 | 0.000 | 0.092 | 7.880 | 3.795 | n/a | 0.027 | 3.042 | 0.153 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000000fc | 19.133 | 1.954 | n/a | 0.000 | 0.079 | 1.130 | 2.593 | 0.021 | 0.000 | 0.708 | 11.395 | 1.214 | n/a | 0.039 | 2.033 | 0.106 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| d056e27dfdcaeec30000000000000109 | 18.399 | 4.670 | n/a | 0.000 | 0.218 | 1.439 | 1.971 | 0.029 | 0.000 | 1.297 | 6.030 | 2.647 | n/a | 0.098 | 4.888 | 0.266 | 0.098 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000011a | 18.188 | 3.034 | n/a | 0.000 | 0.134 | 1.631 | 2.437 | 0.072 | 0.000 | 4.260 | 6.039 | 0.530 | n/a | 0.052 | 3.167 | 0.174 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000118 | 15.495 | 2.297 | n/a | 0.000 | 0.064 | 0.845 | 5.521 | 0.026 | 0.000 | 0.106 | 5.968 | 0.639 | n/a | 0.030 | 2.361 | 0.152 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000112 | 13.915 | 2.875 | n/a | 0.000 | 0.176 | 0.919 | 3.346 | 0.021 | 0.000 | 1.035 | 4.961 | 0.559 | n/a | 0.024 | 3.051 | 0.219 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.133 | 0.534 | 0.000 | 0.688 | 2.978 | n/a | 0.000 | 0.079 | 1.022 | 2.593 | 0.024 | 0.000 | 0.870 | 7.880 | 1.214 | n/a | 0.030 | 3.051 | 0.152 | 0.030 |
| p99 | 37.324 | 0.961 | 0.000 | 1.320 | 4.670 | n/a | 0.000 | 0.218 | 1.631 | 5.521 | 0.072 | 0.000 | 6.748 | 20.511 | 10.751 | n/a | 0.098 | 4.888 | 0.266 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec300000000000000f9 | 37.324 | 3.260 | n/a | 0.000 | 0.089 | 1.359 | 3.199 | 0.024 | 0.000 | 0.524 | 20.511 | 8.316 | n/a | 0.040 | 3.350 | 0.090 | 0.040 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.009ms |
| d056e27dfdcaeec300000000000000f6 | 26.534 | 3.642 | n/a | 0.000 | 0.076 | 0.883 | 1.997 | 0.024 | 0.000 | 6.748 | 12.275 | 0.860 | n/a | 0.030 | 3.718 | 0.140 | 0.030 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| d056e27dfdcaeec30000000000000115 | 26.494 | 2.173 | n/a | 0.000 | 0.059 | 1.022 | 1.771 | 0.021 | 0.000 | 0.870 | 9.802 | 10.751 | n/a | 0.024 | 2.232 | 0.084 | 0.024 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec3000000000000010c | 19.899 | 2.978 | n/a | 0.000 | 0.064 | 0.730 | 4.309 | 0.024 | 0.000 | 0.092 | 7.880 | 3.795 | n/a | 0.027 | 3.042 | 0.153 | 0.027 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000000fc | 19.133 | 1.954 | n/a | 0.000 | 0.079 | 1.130 | 2.593 | 0.021 | 0.000 | 0.708 | 11.395 | 1.214 | n/a | 0.039 | 2.033 | 0.106 | 0.039 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.020ms |
| d056e27dfdcaeec30000000000000109 | 18.399 | 4.670 | n/a | 0.000 | 0.218 | 1.439 | 1.971 | 0.029 | 0.000 | 1.297 | 6.030 | 2.647 | n/a | 0.098 | 4.888 | 0.266 | 0.098 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000011a | 18.188 | 3.034 | n/a | 0.000 | 0.134 | 1.631 | 2.437 | 0.072 | 0.000 | 4.260 | 6.039 | 0.530 | n/a | 0.052 | 3.167 | 0.174 | 0.052 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000118 | 15.495 | 2.297 | n/a | 0.000 | 0.064 | 0.845 | 5.521 | 0.026 | 0.000 | 0.106 | 5.968 | 0.639 | n/a | 0.030 | 2.361 | 0.152 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000112 | 13.915 | 2.875 | n/a | 0.000 | 0.176 | 0.919 | 3.346 | 0.021 | 0.000 | 1.035 | 4.961 | 0.559 | n/a | 0.024 | 3.051 | 0.219 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 21.487 | 0.596 | 0.000 | 0.709 | 3.260 | n/a | 0.000 | 0.101 | 1.029 | 1.968 | 0.025 | 0.000 | 0.406 | 9.203 | 3.740 | n/a | 0.037 | 3.497 | 0.158 | 0.037 |
| p99 | 124.232 | 3.702 | 0.028 | 2.609 | 9.014 | n/a | 0.000 | 2.474 | 7.223 | 24.677 | 0.460 | 12.933 | 3.975 | 69.816 | 22.487 | n/a | 0.080 | 10.289 | 0.431 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000000129 | 124.232 | 7.913 | n/a | 0.000 | 0.109 | 1.020 | 11.348 | 0.030 | 12.933 | 0.403 | 69.816 | 20.617 | n/a | 0.043 | 8.021 | 0.065 | 0.043 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.033ms |
| d056e27dfdcaeec30000000000000123 | 65.482 | 3.854 | n/a | 0.000 | 0.113 | 1.115 | 2.031 | 0.044 | 0.000 | 1.534 | 34.264 | 22.487 | n/a | 0.040 | 3.967 | 0.061 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000126 | 47.435 | 9.014 | n/a | 0.000 | 1.275 | 7.223 | 24.677 | 0.221 | 0.000 | 0.934 | 3.226 | 0.840 | n/a | 0.025 | 10.289 | 0.217 | 0.025 | gw-w/thread-52/storage/begin-command! | none observed |
| d056e27dfdcaeec3000000000000014c | 40.437 | 6.738 | n/a | 0.000 | 0.138 | 1.303 | 4.816 | 0.029 | 0.000 | 0.116 | 20.657 | 6.574 | n/a | 0.064 | 6.876 | 0.170 | 0.064 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000131 | 33.430 | 5.048 | n/a | 0.000 | 0.197 | 1.654 | 2.361 | 0.032 | 0.000 | 0.548 | 15.008 | 8.503 | n/a | 0.080 | 5.245 | 0.157 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000188 | 33.271 | 6.990 | n/a | 0.000 | 2.474 | 0.742 | 1.767 | 0.021 | 0.000 | 0.520 | 7.164 | 13.567 | n/a | 0.026 | 9.464 | 0.284 | 0.026 | tx/thread-84/transactor.triplex-function | driver.reader-basis.broadcast 0.041ms |
| d056e27dfdcaeec30000000000000172 | 28.807 | 5.448 | n/a | 0.000 | 0.094 | 2.422 | 2.549 | 0.031 | 0.000 | 0.762 | 13.321 | 4.120 | n/a | 0.061 | 5.542 | 0.192 | 0.061 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000137 | 28.446 | 8.156 | n/a | 0.000 | 0.175 | 1.077 | 2.015 | 0.460 | 0.000 | 0.239 | 9.586 | 6.683 | n/a | 0.056 | 8.330 | 0.293 | 0.056 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000013f | 27.188 | 3.748 | n/a | 0.000 | 0.101 | 3.340 | 6.218 | 0.054 | 0.000 | 0.174 | 9.417 | 4.097 | n/a | 0.040 | 3.849 | 0.142 | 0.040 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001a6 | 26.761 | 5.529 | n/a | 0.000 | 0.167 | 1.336 | 6.708 | 0.064 | 0.000 | 0.279 | 8.005 | 4.612 | n/a | 0.062 | 5.696 | 0.213 | 0.062 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000156 | 26.113 | 3.403 | n/a | 0.000 | 0.069 | 1.166 | 5.874 | 0.058 | 0.000 | 1.577 | 10.188 | 3.740 | n/a | 0.037 | 3.473 | 0.133 | 0.037 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| d056e27dfdcaeec30000000000000191 | 25.700 | 3.801 | n/a | 0.000 | 0.137 | 1.171 | 2.532 | 0.055 | 0.000 | 0.311 | 9.975 | 7.653 | n/a | 0.065 | 3.937 | 0.153 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000145 | 25.255 | 2.219 | n/a | 0.000 | 0.066 | 2.046 | 1.483 | 0.023 | 0.000 | 0.976 | 13.591 | 4.823 | n/a | 0.027 | 2.286 | 0.091 | 0.027 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec3000000000000017e | 24.813 | 7.728 | n/a | 0.000 | 0.114 | 1.027 | 1.968 | 0.021 | 0.000 | 0.124 | 9.932 | 3.850 | n/a | 0.050 | 7.841 | 0.316 | 0.050 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000018a | 24.306 | 3.780 | n/a | 0.000 | 0.166 | 0.963 | 1.613 | 0.021 | 0.000 | 0.115 | 13.954 | 3.637 | n/a | 0.059 | 3.946 | 0.162 | 0.059 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| d056e27dfdcaeec3000000000000016e | 24.192 | 2.601 | n/a | 0.000 | 0.151 | 2.529 | 2.504 | 0.051 | 0.000 | 0.890 | 14.827 | 0.579 | n/a | 0.061 | 2.751 | 0.114 | 0.061 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| d056e27dfdcaeec3000000000000016a | 24.023 | 1.871 | n/a | 0.000 | 0.058 | 1.516 | 1.161 | 0.021 | 0.000 | 0.100 | 11.355 | 7.917 | n/a | 0.025 | 1.929 | 0.080 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000015f | 23.837 | 2.853 | n/a | 0.000 | 0.057 | 1.168 | 1.914 | 0.043 | 0.000 | 0.203 | 12.764 | 4.801 | n/a | 0.035 | 2.910 | 0.122 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000170 | 23.510 | 1.816 | n/a | 0.000 | 0.041 | 0.601 | 2.334 | 0.021 | 0.000 | 1.002 | 9.203 | 8.470 | n/a | 0.022 | 1.857 | 0.079 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000165 | 23.459 | 4.837 | n/a | 0.000 | 0.073 | 1.379 | 2.816 | 0.072 | 0.000 | 1.258 | 9.248 | 3.740 | n/a | 0.035 | 4.910 | 0.209 | 0.035 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (22 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.569 | 0.000 | 0.000 | 0.451 | 2.601 | n/a | 0.000 | 0.078 | 1.029 | 1.693 | 0.025 | 0.000 | 0.235 | 8.726 | 2.422 | n/a | 0.030 | 2.750 | 0.154 | 0.030 |
| p99 | 65.482 | 1.971 | 0.028 | 0.919 | 9.014 | n/a | 0.000 | 1.275 | 7.223 | 24.677 | 0.221 | 0.000 | 3.975 | 34.264 | 22.487 | n/a | 0.080 | 10.289 | 0.364 | 0.080 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000000123 | 65.482 | 3.854 | n/a | 0.000 | 0.113 | 1.115 | 2.031 | 0.044 | 0.000 | 1.534 | 34.264 | 22.487 | n/a | 0.040 | 3.967 | 0.061 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000126 | 47.435 | 9.014 | n/a | 0.000 | 1.275 | 7.223 | 24.677 | 0.221 | 0.000 | 0.934 | 3.226 | 0.840 | n/a | 0.025 | 10.289 | 0.217 | 0.025 | gw-w/thread-52/storage/begin-command! | none observed |
| d056e27dfdcaeec30000000000000131 | 33.430 | 5.048 | n/a | 0.000 | 0.197 | 1.654 | 2.361 | 0.032 | 0.000 | 0.548 | 15.008 | 8.503 | n/a | 0.080 | 5.245 | 0.157 | 0.080 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000016e | 24.192 | 2.601 | n/a | 0.000 | 0.151 | 2.529 | 2.504 | 0.051 | 0.000 | 0.890 | 14.827 | 0.579 | n/a | 0.061 | 2.751 | 0.114 | 0.061 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.037ms |
| d056e27dfdcaeec3000000000000016a | 24.023 | 1.871 | n/a | 0.000 | 0.058 | 1.516 | 1.161 | 0.021 | 0.000 | 0.100 | 11.355 | 7.917 | n/a | 0.025 | 1.929 | 0.080 | 0.025 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000015f | 23.837 | 2.853 | n/a | 0.000 | 0.057 | 1.168 | 1.914 | 0.043 | 0.000 | 0.203 | 12.764 | 4.801 | n/a | 0.035 | 2.910 | 0.122 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000170 | 23.510 | 1.816 | n/a | 0.000 | 0.041 | 0.601 | 2.334 | 0.021 | 0.000 | 1.002 | 9.203 | 8.470 | n/a | 0.022 | 1.857 | 0.079 | 0.022 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000144 | 22.803 | 2.012 | n/a | 0.000 | 0.070 | 0.794 | 1.218 | 0.025 | 0.000 | 0.406 | 13.996 | 4.252 | n/a | 0.030 | 2.082 | 0.091 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.060ms |
| d056e27dfdcaeec30000000000000193 | 21.487 | 3.326 | n/a | 0.000 | 0.171 | 1.032 | 4.725 | 0.022 | 0.000 | 0.098 | 8.510 | 3.542 | n/a | 0.060 | 3.497 | 0.163 | 0.060 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.029ms |
| d056e27dfdcaeec30000000000000198 | 20.699 | 1.799 | n/a | 0.000 | 0.071 | 0.716 | 1.606 | 0.023 | 0.000 | 0.134 | 12.485 | 3.824 | n/a | 0.042 | 1.870 | 0.090 | 0.042 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.044ms |
| d056e27dfdcaeec3000000000000019e | 20.682 | 3.145 | n/a | 0.000 | 0.139 | 0.751 | 1.693 | 0.026 | 0.000 | 0.435 | 9.208 | 5.221 | n/a | 0.063 | 3.284 | 0.159 | 0.063 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000018d | 19.569 | 1.973 | n/a | 0.000 | 0.078 | 0.983 | 1.245 | 0.025 | 0.000 | 0.104 | 8.004 | 7.117 | n/a | 0.039 | 2.051 | 0.105 | 0.039 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000013b | 17.851 | 2.287 | n/a | 0.000 | 1.056 | 1.029 | 1.947 | 0.081 | 0.000 | 0.235 | 10.132 | 1.061 | n/a | 0.021 | 3.343 | 0.187 | 0.021 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000184 | 17.576 | 2.685 | n/a | 0.000 | 0.065 | 1.103 | 2.342 | 0.046 | 0.000 | 0.835 | 7.041 | 3.432 | n/a | 0.029 | 2.750 | 0.156 | 0.029 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000162 | 17.435 | 4.055 | n/a | 0.000 | 0.137 | 1.022 | 1.542 | 0.020 | 0.000 | 0.765 | 7.401 | 2.422 | n/a | 0.070 | 4.193 | 0.240 | 0.070 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000019b | 17.231 | 2.653 | n/a | 0.000 | 0.071 | 1.291 | 1.896 | 0.048 | 0.000 | 0.127 | 8.726 | 2.383 | n/a | 0.037 | 2.724 | 0.158 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000017b | 15.479 | 2.067 | n/a | 0.000 | 0.078 | 1.206 | 1.677 | 0.042 | 0.000 | 3.975 | 5.888 | 0.516 | n/a | 0.030 | 2.145 | 0.139 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.034ms |
| d056e27dfdcaeec30000000000000153 | 15.021 | 2.079 | n/a | 0.000 | 0.055 | 0.743 | 1.605 | 0.022 | 0.000 | 0.498 | 8.898 | 1.093 | n/a | 0.028 | 2.134 | 0.142 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000015b | 11.688 | 3.260 | n/a | 0.000 | 0.991 | 0.837 | 1.104 | 0.020 | 0.000 | 0.210 | 4.754 | 0.489 | n/a | 0.022 | 4.251 | 0.364 | 0.022 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.491ms; driver.publication.persist-deferred 0.018ms |
| d056e27dfdcaeec300000000000001a4 | 11.525 | 3.296 | n/a | 0.000 | 0.722 | 1.105 | 1.445 | 0.025 | 0.000 | 0.136 | 4.245 | 0.526 | n/a | 0.025 | 4.017 | 0.349 | 0.025 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.196 | n/a | n/a | n/a | 34.227 | 1.003 | 2.154 | 0.000 | 16.453 | 5.654 | 0.005 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.007 | 46.178 | 0.631 | 0.007 |
| p99 | 179.641 | n/a | n/a | n/a | 73.730 | 80.833 | 16.780 | 0.000 | 70.694 | 77.932 | 70.856 | 13.567 | 0.036 | 0.000 | n/a | n/a | 0.047 | 112.877 | 1.000 | 0.047 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001223 | 179.641 | 34.227 | 1.003 | 4.820 | 0.000 | 70.694 | 9.640 | 59.229 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.004 | 40.050 | 0.223 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.154ms; driver.reader-basis.broadcast 0.200ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.189ms; driver.publication.readback 0.179ms |
| d056e27dfdcaeec3000000000000122c | 175.244 | 31.251 | 80.833 | 0.793 | 0.000 | 61.463 | 0.881 | 0.010 | 0.000 | 0.009 | 0.000 | n/a | n/a | 0.005 | 112.877 | 0.644 | 0.005 | node-14/thread-0/rpc.gateway-observer.observe | driver.expected-state.bind-receipt 1.154ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.189ms; driver.publication.readback 0.179ms; driver.publication.readback 0.074ms |
| d056e27dfdcaeec30000000000001224 | 148.126 | 16.742 | 1.889 | 4.243 | 0.000 | 65.455 | 0.908 | 58.868 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.004 | 22.874 | 0.154 | 0.004 | node-14/thread-3/socket.wait-first-byte | driver.expected-state.bind-receipt 1.154ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.189ms; driver.publication.readback 0.179ms; driver.publication.readback 0.069ms |
| d056e27dfdcaeec30000000000001227 | 128.666 | 26.340 | 0.359 | 1.752 | 0.000 | 34.567 | 1.475 | 64.157 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.005 | 28.451 | 0.221 | 0.005 | gw-r/thread-49/gateway.admission-wait | driver.expected-state.bind-receipt 1.154ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.179ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms |
| d056e27dfdcaeec30000000000001d44 | 127.222 | 50.622 | 0.445 | 7.686 | 0.000 | 4.606 | 63.843 | 0.004 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.011 | 58.753 | 0.462 | 0.011 | gw-r/thread-46/gateway.admitted-work | driver.reader-basis.broadcast 0.347ms; driver.publication.readback 0.070ms; driver.publication.persist-deferred 0.034ms |
| d056e27dfdcaeec30000000000001221 | 126.734 | 33.399 | 0.770 | 1.532 | 0.000 | 25.155 | 65.854 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.006 | 35.702 | 0.282 | 0.006 | gw-r/thread-48/gateway.admitted-work | driver.expected-state.bind-receipt 1.154ms; driver.reader-basis.broadcast 0.200ms; driver.reader-basis.broadcast 0.197ms; driver.publication.readback 0.179ms; driver.publication.readback 0.080ms |
| d056e27dfdcaeec3000000000000193a | 126.025 | 50.062 | 13.016 | 2.720 | 0.000 | 58.478 | 1.728 | 0.005 | 0.000 | 0.012 | 0.000 | n/a | n/a | 0.005 | 65.798 | 0.522 | 0.005 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.538ms; driver.reader-basis.broadcast 0.272ms; driver.publication.readback 0.126ms; driver.publication.readback 0.072ms; driver.publication.readback 0.068ms |
| d056e27dfdcaeec30000000000000fe2 | 121.714 | 36.989 | 4.222 | 1.326 | 0.000 | 63.257 | 10.634 | 5.279 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.003 | 42.537 | 0.349 | 0.003 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.185ms; driver.reader-basis.broadcast 0.159ms; driver.publication.readback 0.054ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms |
| d056e27dfdcaeec30000000000001933 | 119.089 | 55.303 | 0.155 | 5.972 | 0.000 | 51.061 | 6.586 | 0.002 | 0.000 | 0.002 | 0.000 | n/a | n/a | 0.007 | 61.430 | 0.516 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.272ms; driver.publication.readback 0.126ms; driver.publication.readback 0.068ms; driver.publication.readback 0.060ms; driver.publication.readback 0.057ms |
| d056e27dfdcaeec300000000000008e6 | 118.053 | 35.233 | 40.372 | 1.795 | 0.000 | 34.262 | 1.587 | 4.757 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.010 | 77.401 | 0.656 | 0.010 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.250ms; driver.publication.readback 0.113ms; driver.publication.readback 0.065ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.055ms |
| d056e27dfdcaeec3000000000000114f | 110.402 | 27.250 | 1.634 | 0.000 | 0.000 | 3.576 | 77.932 | 0.002 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.004 | 28.884 | 0.262 | 0.004 | gw-r/thread-49/gateway.admitted-work | driver.publication.readback 0.286ms; driver.publication.readback 0.188ms; driver.reader-basis.broadcast 0.173ms; driver.publication.readback 0.131ms; driver.publication.readback 0.061ms |
| d056e27dfdcaeec30000000000001151 | 104.034 | 13.548 | 0.242 | 1.047 | 0.000 | 3.173 | 15.153 | 70.856 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.009 | 14.837 | 0.143 | 0.009 | gw-r/thread-51/gateway.admission-wait | driver.publication.readback 0.286ms; driver.publication.readback 0.188ms; driver.reader-basis.broadcast 0.173ms; driver.publication.readback 0.131ms; driver.publication.readback 0.058ms |
| d056e27dfdcaeec300000000000008e1 | 103.531 | 28.210 | 50.687 | 0.000 | 0.000 | 22.579 | 2.020 | 0.005 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.016 | 78.896 | 0.762 | 0.016 | node-14/thread-0/rpc.gateway-observer.observe | driver.reader-basis.broadcast 0.250ms; driver.publication.readback 0.217ms; driver.publication.readback 0.113ms; driver.publication.readback 0.065ms; driver.publication.readback 0.060ms |
| d056e27dfdcaeec30000000000001724 | 100.740 | 73.730 | 0.268 | 7.056 | 0.000 | 0.667 | 18.994 | 0.007 | 0.000 | 0.006 | 0.000 | n/a | n/a | 0.011 | 81.054 | 0.805 | 0.011 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 2.242ms; driver.expected-state.bind-receipt 1.322ms; driver.reader-basis.broadcast 0.568ms; driver.publication.readback 0.203ms; driver.publication.readback 0.080ms |
| d056e27dfdcaeec300000000000008dd | 99.136 | 29.668 | 4.492 | 1.488 | 0.000 | 50.616 | 9.391 | 3.463 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.008 | 35.648 | 0.360 | 0.008 | node-14/thread-3/socket.wait-first-byte | driver.publication.readback 0.331ms; driver.reader-basis.broadcast 0.250ms; driver.publication.readback 0.217ms; driver.publication.readback 0.113ms; driver.publication.readback 0.065ms |
| d056e27dfdcaeec30000000000001492 | 95.338 | 47.707 | 0.340 | 12.077 | 0.000 | 7.124 | 14.505 | 0.005 | 13.567 | 0.006 | 0.000 | n/a | n/a | 0.007 | 60.124 | 0.631 | 0.007 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.196ms; driver.reader-basis.broadcast 0.552ms; driver.publication.readback 0.132ms; driver.publication.readback 0.115ms; driver.publication.readback 0.106ms |
| d056e27dfdcaeec30000000000000fe0 | 94.870 | 49.361 | 5.325 | 5.106 | 0.000 | 19.690 | 2.214 | 13.167 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.004 | 59.792 | 0.630 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.reader-basis.broadcast 0.185ms; driver.publication.readback 0.054ms; driver.publication.readback 0.049ms; driver.publication.readback 0.039ms; driver.publication.readback 0.035ms |
| d056e27dfdcaeec30000000000001b72 | 91.387 | 48.650 | 0.222 | 3.434 | 0.000 | 28.807 | 10.261 | 0.002 | 0.000 | 0.005 | 0.000 | n/a | n/a | 0.007 | 52.306 | 0.572 | 0.007 | node-14/thread-3/socket.wait-first-byte | driver.reader-basis.broadcast 0.269ms; driver.publication.readback 0.061ms; driver.publication.readback 0.060ms; driver.publication.readback 0.050ms; driver.publication.readback 0.050ms |
| d056e27dfdcaeec30000000000000df7 | 89.252 | 54.675 | 6.611 | 16.780 | 0.000 | 0.824 | 10.336 | 0.006 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.004 | 78.066 | 0.875 | 0.004 | node-14/thread-3/client.reach-decode-and-cache | driver.expected-state.bind-receipt 1.029ms; driver.publication.readback 0.170ms; driver.reader-basis.broadcast 0.139ms; driver.publication.readback 0.107ms; driver.publication.readback 0.089ms |
| d056e27dfdcaeec30000000000000411 | 86.955 | 56.853 | 0.410 | 13.134 | 0.000 | 1.274 | 15.244 | 0.009 | 0.000 | 0.018 | 0.000 | n/a | n/a | 0.012 | 70.397 | 0.810 | 0.012 | node-14/thread-3/worker.gateway-observer.observe | driver.publication.readback 0.128ms; driver.reader-basis.broadcast 0.082ms; driver.publication.readback 0.078ms; driver.publication.readback 0.075ms; driver.publication.readback 0.062ms |

## P2 / L4 / commit (59 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.655 | 0.233 | 0.000 | 0.597 | 2.977 | n/a | 0.000 | 0.069 | 0.959 | 1.957 | 0.030 | 0.000 | 0.256 | 7.846 | 1.430 | n/a | 0.034 | 3.083 | 0.172 | 0.034 |
| p99 | 90.069 | 2.159 | 0.000 | 3.123 | 19.946 | n/a | 0.000 | 1.888 | 8.674 | 28.009 | 0.163 | 0.000 | 4.069 | 31.838 | 8.014 | n/a | 0.242 | 20.052 | 0.328 | 0.242 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec300000000000001b5 | 90.069 | 19.946 | n/a | 0.000 | 0.106 | 7.522 | 28.009 | 0.163 | 0.000 | 0.972 | 31.838 | 1.454 | n/a | 0.059 | 20.052 | 0.223 | 0.059 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.019ms |
| d056e27dfdcaeec300000000000001d9 | 33.137 | 4.642 | n/a | 0.000 | 0.089 | 3.379 | 16.993 | 0.141 | 0.000 | 0.345 | 6.914 | 0.588 | n/a | 0.045 | 4.731 | 0.143 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001c1 | 32.738 | 4.382 | n/a | 0.000 | 0.243 | 1.718 | 2.908 | 0.070 | 0.000 | 0.363 | 19.219 | 3.740 | n/a | 0.095 | 4.625 | 0.141 | 0.095 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000205 | 28.385 | 9.243 | n/a | 0.000 | 0.065 | 1.443 | 3.611 | 0.091 | 0.000 | 0.918 | 8.519 | 4.454 | n/a | 0.041 | 9.309 | 0.328 | 0.041 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000215 | 26.288 | 4.022 | n/a | 0.000 | 0.131 | 1.023 | 1.383 | 0.024 | 0.000 | 0.491 | 12.010 | 7.146 | n/a | 0.058 | 4.153 | 0.158 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| d056e27dfdcaeec300000000000001a9 | 26.111 | 4.458 | n/a | 0.000 | 0.218 | 1.830 | 2.741 | 0.070 | 0.000 | 0.552 | 9.998 | 6.152 | n/a | 0.092 | 4.676 | 0.179 | 0.092 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001be | 25.712 | 4.533 | n/a | 0.000 | 0.055 | 0.813 | 5.096 | 0.025 | 0.000 | 0.115 | 8.952 | 6.091 | n/a | 0.032 | 4.588 | 0.178 | 0.032 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000233 | 25.054 | 3.311 | n/a | 0.000 | 0.129 | 1.098 | 5.321 | 0.028 | 0.000 | 3.013 | 6.477 | 5.611 | n/a | 0.067 | 3.439 | 0.137 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000022c | 24.862 | 3.042 | n/a | 0.000 | 0.049 | 1.238 | 2.785 | 0.050 | 0.000 | 3.105 | 9.929 | 4.636 | n/a | 0.028 | 3.091 | 0.124 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| d056e27dfdcaeec300000000000001f8 | 24.385 | 2.354 | n/a | 0.000 | 0.018 | 0.422 | 0.910 | 0.013 | 0.000 | 0.208 | 12.438 | 8.014 | n/a | 0.010 | 2.371 | 0.097 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |
| d056e27dfdcaeec300000000000001ab | 24.174 | 3.148 | n/a | 0.000 | 0.123 | 0.970 | 1.330 | 0.023 | 0.000 | 0.112 | 15.111 | 3.302 | n/a | 0.054 | 3.271 | 0.135 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001b9 | 24.163 | 2.816 | n/a | 0.000 | 0.099 | 0.836 | 5.742 | 0.052 | 0.000 | 0.508 | 9.937 | 4.129 | n/a | 0.045 | 2.915 | 0.121 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000202 | 23.904 | 3.578 | n/a | 0.000 | 0.060 | 8.674 | 1.341 | 0.021 | 0.000 | 0.143 | 9.383 | 0.678 | n/a | 0.024 | 3.638 | 0.152 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000022e | 23.723 | 6.381 | n/a | 0.000 | 0.216 | 1.248 | 2.199 | 0.031 | 0.000 | 0.144 | 7.846 | 5.585 | n/a | 0.073 | 6.597 | 0.278 | 0.073 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000221 | 22.981 | 1.798 | n/a | 0.000 | 0.051 | 0.888 | 1.965 | 0.041 | 0.000 | 0.217 | 13.085 | 4.910 | n/a | 0.027 | 1.849 | 0.080 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000231 | 22.783 | 3.126 | n/a | 0.000 | 0.052 | 5.031 | 2.570 | 0.053 | 0.000 | 0.231 | 10.946 | 0.747 | n/a | 0.028 | 3.178 | 0.139 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000217 | 22.563 | 4.953 | n/a | 0.000 | 0.183 | 1.134 | 2.283 | 0.032 | 0.000 | 0.207 | 11.313 | 2.387 | n/a | 0.072 | 5.136 | 0.228 | 0.072 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.021ms |
| d056e27dfdcaeec30000000000000219 | 20.180 | 3.989 | n/a | 0.000 | 0.129 | 1.872 | 4.375 | 0.025 | 0.000 | 0.197 | 5.951 | 3.576 | n/a | 0.067 | 4.117 | 0.204 | 0.067 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.047ms |
| d056e27dfdcaeec3000000000000023b | 19.803 | 2.312 | n/a | 0.000 | 0.055 | 0.709 | 7.306 | 0.039 | 0.000 | 0.376 | 7.864 | 1.114 | n/a | 0.026 | 2.368 | 0.120 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| d056e27dfdcaeec300000000000001e1 | 19.475 | 2.365 | n/a | 0.000 | 0.055 | 0.823 | 4.184 | 0.025 | 0.000 | 0.072 | 7.918 | 4.007 | n/a | 0.027 | 2.419 | 0.124 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.033 | 0.000 | 0.000 | 0.467 | 2.384 | n/a | 0.000 | 0.077 | 0.959 | 1.965 | 0.033 | 0.000 | 0.345 | 7.007 | 0.977 | n/a | 0.036 | 2.550 | 0.143 | 0.036 |
| p99 | 33.137 | 2.000 | 0.000 | 0.841 | 4.642 | n/a | 0.000 | 0.813 | 3.379 | 16.993 | 0.141 | 0.000 | 4.069 | 19.219 | 8.014 | n/a | 0.095 | 4.731 | 0.285 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec300000000000001d9 | 33.137 | 4.642 | n/a | 0.000 | 0.089 | 3.379 | 16.993 | 0.141 | 0.000 | 0.345 | 6.914 | 0.588 | n/a | 0.045 | 4.731 | 0.143 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001c1 | 32.738 | 4.382 | n/a | 0.000 | 0.243 | 1.718 | 2.908 | 0.070 | 0.000 | 0.363 | 19.219 | 3.740 | n/a | 0.095 | 4.625 | 0.141 | 0.095 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000215 | 26.288 | 4.022 | n/a | 0.000 | 0.131 | 1.023 | 1.383 | 0.024 | 0.000 | 0.491 | 12.010 | 7.146 | n/a | 0.058 | 4.153 | 0.158 | 0.058 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.023ms |
| d056e27dfdcaeec300000000000001a9 | 26.111 | 4.458 | n/a | 0.000 | 0.218 | 1.830 | 2.741 | 0.070 | 0.000 | 0.552 | 9.998 | 6.152 | n/a | 0.092 | 4.676 | 0.179 | 0.092 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000233 | 25.054 | 3.311 | n/a | 0.000 | 0.129 | 1.098 | 5.321 | 0.028 | 0.000 | 3.013 | 6.477 | 5.611 | n/a | 0.067 | 3.439 | 0.137 | 0.067 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001f8 | 24.385 | 2.354 | n/a | 0.000 | 0.018 | 0.422 | 0.910 | 0.013 | 0.000 | 0.208 | 12.438 | 8.014 | n/a | 0.010 | 2.371 | 0.097 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.066ms; driver.publication.persist-deferred 0.018ms |
| d056e27dfdcaeec300000000000001ab | 24.174 | 3.148 | n/a | 0.000 | 0.123 | 0.970 | 1.330 | 0.023 | 0.000 | 0.112 | 15.111 | 3.302 | n/a | 0.054 | 3.271 | 0.135 | 0.054 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001b9 | 24.163 | 2.816 | n/a | 0.000 | 0.099 | 0.836 | 5.742 | 0.052 | 0.000 | 0.508 | 9.937 | 4.129 | n/a | 0.045 | 2.915 | 0.121 | 0.045 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000221 | 22.981 | 1.798 | n/a | 0.000 | 0.051 | 0.888 | 1.965 | 0.041 | 0.000 | 0.217 | 13.085 | 4.910 | n/a | 0.027 | 1.849 | 0.080 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000023b | 19.803 | 2.312 | n/a | 0.000 | 0.055 | 0.709 | 7.306 | 0.039 | 0.000 | 0.376 | 7.864 | 1.114 | n/a | 0.026 | 2.368 | 0.120 | 0.026 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.051ms |
| d056e27dfdcaeec300000000000001e1 | 19.475 | 2.365 | n/a | 0.000 | 0.055 | 0.823 | 4.184 | 0.025 | 0.000 | 0.072 | 7.918 | 4.007 | n/a | 0.027 | 2.419 | 0.124 | 0.027 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000001b0 | 19.243 | 2.510 | n/a | 0.000 | 0.072 | 0.932 | 2.305 | 0.024 | 0.000 | 0.158 | 7.534 | 5.671 | n/a | 0.037 | 2.582 | 0.134 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000239 | 18.884 | 2.465 | n/a | 0.000 | 0.085 | 2.693 | 3.031 | 0.071 | 0.000 | 1.086 | 8.786 | 0.620 | n/a | 0.047 | 2.550 | 0.135 | 0.047 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000200 | 17.971 | 2.170 | n/a | 0.000 | 0.084 | 1.629 | 2.976 | 0.078 | 0.000 | 0.338 | 10.069 | 0.592 | n/a | 0.034 | 2.254 | 0.125 | 0.034 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000208 | 17.876 | 2.384 | n/a | 0.000 | 0.082 | 1.378 | 1.585 | 0.031 | 0.000 | 0.736 | 10.878 | 0.765 | n/a | 0.036 | 2.466 | 0.138 | 0.036 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.032ms |
| d056e27dfdcaeec30000000000000211 | 17.796 | 4.251 | n/a | 0.000 | 0.055 | 1.685 | 5.264 | 0.060 | 0.000 | 0.163 | 5.927 | 0.359 | n/a | 0.032 | 4.306 | 0.242 | 0.032 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.016ms |
| d056e27dfdcaeec300000000000001c4 | 17.698 | 3.313 | n/a | 0.000 | 0.106 | 0.993 | 2.437 | 0.024 | 0.000 | 0.108 | 6.063 | 4.604 | n/a | 0.051 | 3.419 | 0.193 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000000229 | 17.033 | 1.940 | n/a | 0.000 | 0.056 | 0.867 | 1.733 | 0.042 | 0.000 | 0.727 | 6.608 | 5.032 | n/a | 0.028 | 1.996 | 0.117 | 0.028 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.022ms |
| d056e27dfdcaeec300000000000001f1 | 16.891 | 3.348 | n/a | 0.000 | 0.077 | 1.607 | 5.190 | 0.049 | 0.000 | 0.229 | 5.367 | 0.977 | n/a | 0.048 | 3.425 | 0.203 | 0.048 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec3000000000000023f | 16.639 | 2.340 | n/a | 0.000 | 0.083 | 1.284 | 1.957 | 0.054 | 0.000 | 4.069 | 4.412 | 2.403 | n/a | 0.037 | 2.423 | 0.146 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (1653 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.904 | 0.480 | 0.000 | 0.528 | 2.262 | n/a | 0.000 | 0.049 | 0.646 | 1.118 | 0.013 | 0.000 | 0.116 | 5.520 | 0.800 | n/a | 0.017 | 2.587 | 0.214 | 0.017 |
| p99 | 51.100 | 2.403 | 0.034 | 2.109 | 6.955 | n/a | 0.000 | 13.797 | 7.313 | 6.301 | 0.054 | 0.000 | 3.917 | 29.790 | 13.837 | n/a | 0.057 | 16.495 | 0.609 | 0.057 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000000884 | 94.820 | 1.932 | n/a | 0.000 | 42.477 | 0.513 | 1.811 | 0.030 | 0.000 | 0.163 | 45.767 | 2.115 | n/a | 0.013 | 44.409 | 0.468 | 0.013 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.reader-basis.broadcast 0.102ms; driver.publication.readback 0.074ms |
| d056e27dfdcaeec30000000000000886 | 87.667 | 1.644 | n/a | 0.000 | 80.083 | 0.567 | 1.117 | 0.018 | 0.000 | 0.061 | 3.724 | 0.438 | n/a | 0.015 | 81.728 | 0.932 | 0.015 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.063ms |
| d056e27dfdcaeec30000000000000883 | 79.526 | 5.969 | n/a | 0.000 | 8.071 | 0.542 | 1.144 | 0.006 | 0.000 | 0.255 | 51.265 | 12.247 | n/a | 0.027 | 14.041 | 0.177 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.108ms; driver.reader-basis.broadcast 0.102ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.022ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000000885 | 70.063 | 1.404 | n/a | 0.000 | 0.040 | 0.450 | 0.665 | 0.006 | 0.000 | 0.047 | 53.595 | 13.837 | n/a | 0.020 | 1.444 | 0.021 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.063ms |
| d056e27dfdcaeec30000000000000881 | 65.846 | 3.801 | n/a | 0.000 | 2.063 | 5.613 | 1.390 | 0.013 | 0.000 | 1.549 | 50.333 | 1.067 | n/a | 0.017 | 5.864 | 0.089 | 0.017 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms; driver.publication.readback 0.086ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.022ms |
| d056e27dfdcaeec30000000000000930 | 64.879 | 2.143 | n/a | 0.000 | 0.031 | 0.531 | 5.741 | 0.070 | 0.000 | 3.097 | 26.024 | 27.224 | n/a | 0.017 | 2.174 | 0.034 | 0.017 | tx/thread-84/transactor.triplex-function | driver.publication.readback 0.139ms; driver.reader-basis.broadcast 0.099ms; driver.publication.readback 0.084ms; driver.publication.readback 0.064ms; driver.publication.readback 0.056ms |
| d056e27dfdcaeec300000000000004d8 | 60.296 | 14.917 | n/a | 0.000 | 0.089 | 23.885 | 6.681 | 0.054 | 0.000 | 4.295 | 9.102 | 1.234 | n/a | 0.039 | 15.006 | 0.249 | 0.039 | node-14/thread-0/socket.wait-first-byte | driver.publication.readback 0.068ms; driver.reader-basis.broadcast 0.047ms; driver.publication.readback 0.044ms; driver.publication.persist-deferred 0.031ms; driver.publication.persist-deferred 0.016ms |
| d056e27dfdcaeec3000000000000079a | 59.780 | 1.625 | n/a | 0.000 | 38.531 | 1.071 | 0.821 | 0.012 | 0.000 | 0.369 | 16.883 | 0.451 | n/a | 0.016 | 40.156 | 0.672 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.233ms; driver.reader-basis.broadcast 0.170ms; driver.publication.readback 0.088ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| d056e27dfdcaeec3000000000000079e | 55.475 | 6.390 | n/a | 0.000 | 0.037 | 7.281 | 3.064 | 0.054 | 0.000 | 1.232 | 36.815 | 0.577 | n/a | 0.024 | 6.427 | 0.116 | 0.024 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.233ms; driver.reader-basis.broadcast 0.170ms; driver.publication.readback 0.088ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| d056e27dfdcaeec3000000000000065f | 55.405 | 2.167 | n/a | 0.000 | 7.792 | 7.787 | 6.138 | 0.005 | 17.294 | 0.031 | 13.791 | 0.387 | n/a | 0.013 | 9.959 | 0.180 | 0.013 | gw-w/thread--1/jdk.GCPhasePause | driver.expected-state.bind-receipt 1.746ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.023ms |
| d056e27dfdcaeec30000000000000271 | 55.361 | 2.233 | n/a | 0.000 | 0.069 | 0.776 | 1.375 | 0.022 | 0.000 | 0.536 | 49.272 | 1.049 | n/a | 0.030 | 2.302 | 0.042 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| d056e27dfdcaeec30000000000000882 | 53.510 | 8.643 | n/a | 0.000 | 1.414 | 2.125 | 1.256 | 0.006 | 0.000 | 0.028 | 34.663 | 5.368 | n/a | 0.007 | 10.057 | 0.188 | 0.007 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.102ms; driver.publication.readback 0.086ms |
| d056e27dfdcaeec30000000000000887 | 53.449 | 1.428 | n/a | 0.000 | 0.054 | 0.667 | 0.923 | 0.013 | 0.000 | 0.094 | 49.673 | 0.573 | n/a | 0.025 | 1.481 | 0.028 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.063ms |
| d056e27dfdcaeec3000000000000079d | 52.235 | 4.101 | n/a | 0.000 | 15.311 | 0.533 | 2.945 | 0.030 | 0.000 | 1.380 | 17.141 | 10.777 | n/a | 0.018 | 19.412 | 0.372 | 0.018 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.233ms; driver.reader-basis.broadcast 0.170ms; driver.publication.readback 0.088ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| d056e27dfdcaeec30000000000000450 | 52.077 | 3.027 | n/a | 0.000 | 0.039 | 0.613 | 1.345 | 0.016 | 0.000 | 0.109 | 11.310 | 35.600 | n/a | 0.018 | 3.066 | 0.059 | 0.018 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec30000000000000935 | 51.425 | 2.130 | n/a | 0.000 | 0.015 | 1.681 | 0.787 | 0.015 | 0.000 | 0.089 | 45.817 | 0.875 | n/a | 0.015 | 2.146 | 0.042 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.032ms |
| d056e27dfdcaeec300000000000004e5 | 51.100 | 2.849 | n/a | 0.000 | 0.464 | 0.353 | 5.148 | 0.038 | 12.106 | 0.087 | 11.023 | 19.023 | n/a | 0.009 | 3.313 | 0.065 | 0.009 | tx/thread-84/transactor.triplex-function | driver.publication.readback 0.120ms; driver.reader-basis.broadcast 0.049ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000000660 | 49.532 | 6.764 | n/a | 0.000 | 0.042 | 0.871 | 3.157 | 0.031 | 0.000 | 7.105 | 27.169 | 4.364 | n/a | 0.028 | 6.806 | 0.137 | 0.028 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.023ms |
| d056e27dfdcaeec30000000000000324 | 49.518 | 5.030 | n/a | 0.000 | 21.005 | 1.338 | 1.409 | 0.009 | 0.000 | 0.776 | 14.683 | 5.252 | n/a | 0.015 | 26.035 | 0.526 | 0.015 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.156ms; driver.publication.readback 0.075ms; driver.publication.readback 0.072ms; driver.publication.readback 0.070ms; driver.publication.readback 0.047ms |
| d056e27dfdcaeec300000000000004e4 | 47.292 | 2.238 | n/a | 0.000 | 0.030 | 0.497 | 1.201 | 0.011 | 12.106 | 1.469 | 29.062 | 0.660 | n/a | 0.018 | 2.268 | 0.048 | 0.018 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (986 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.741 | 0.000 | 0.000 | 0.416 | 1.840 | n/a | 0.000 | 0.051 | 0.637 | 0.954 | 0.012 | 0.000 | 0.123 | 5.196 | 0.594 | n/a | 0.017 | 2.145 | 0.196 | 0.017 |
| p99 | 43.781 | 1.980 | 0.030 | 0.991 | 5.325 | n/a | 0.000 | 13.797 | 6.762 | 6.138 | 0.065 | 0.000 | 3.604 | 29.209 | 13.837 | n/a | 0.061 | 16.325 | 0.638 | 0.061 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000000886 | 87.667 | 1.644 | n/a | 0.000 | 80.083 | 0.567 | 1.117 | 0.018 | 0.000 | 0.061 | 3.724 | 0.438 | n/a | 0.015 | 81.728 | 0.932 | 0.015 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.063ms |
| d056e27dfdcaeec30000000000000885 | 70.063 | 1.404 | n/a | 0.000 | 0.040 | 0.450 | 0.665 | 0.006 | 0.000 | 0.047 | 53.595 | 13.837 | n/a | 0.020 | 1.444 | 0.021 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.063ms |
| d056e27dfdcaeec30000000000000930 | 64.879 | 2.143 | n/a | 0.000 | 0.031 | 0.531 | 5.741 | 0.070 | 0.000 | 3.097 | 26.024 | 27.224 | n/a | 0.017 | 2.174 | 0.034 | 0.017 | tx/thread-84/transactor.triplex-function | driver.publication.readback 0.139ms; driver.reader-basis.broadcast 0.099ms; driver.publication.readback 0.084ms; driver.publication.readback 0.064ms; driver.publication.readback 0.056ms |
| d056e27dfdcaeec3000000000000079a | 59.780 | 1.625 | n/a | 0.000 | 38.531 | 1.071 | 0.821 | 0.012 | 0.000 | 0.369 | 16.883 | 0.451 | n/a | 0.016 | 40.156 | 0.672 | 0.016 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.233ms; driver.reader-basis.broadcast 0.170ms; driver.publication.readback 0.088ms; driver.publication.readback 0.058ms; driver.publication.readback 0.058ms |
| d056e27dfdcaeec3000000000000065f | 55.405 | 2.167 | n/a | 0.000 | 7.792 | 7.787 | 6.138 | 0.005 | 17.294 | 0.031 | 13.791 | 0.387 | n/a | 0.013 | 9.959 | 0.180 | 0.013 | gw-w/thread--1/jdk.GCPhasePause | driver.expected-state.bind-receipt 1.746ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.039ms; driver.publication.persist-deferred 0.023ms |
| d056e27dfdcaeec30000000000000271 | 55.361 | 2.233 | n/a | 0.000 | 0.069 | 0.776 | 1.375 | 0.022 | 0.000 | 0.536 | 49.272 | 1.049 | n/a | 0.030 | 2.302 | 0.042 | 0.030 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.015ms |
| d056e27dfdcaeec30000000000000887 | 53.449 | 1.428 | n/a | 0.000 | 0.054 | 0.667 | 0.923 | 0.013 | 0.000 | 0.094 | 49.673 | 0.573 | n/a | 0.025 | 1.481 | 0.028 | 0.025 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.127ms; driver.publication.readback 0.108ms; driver.publication.readback 0.108ms; driver.publication.readback 0.074ms; driver.publication.persist-deferred 0.063ms |
| d056e27dfdcaeec30000000000000935 | 51.425 | 2.130 | n/a | 0.000 | 0.015 | 1.681 | 0.787 | 0.015 | 0.000 | 0.089 | 45.817 | 0.875 | n/a | 0.015 | 2.146 | 0.042 | 0.015 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.064ms; driver.publication.readback 0.056ms; driver.publication.readback 0.046ms; driver.publication.readback 0.038ms; driver.publication.persist-deferred 0.032ms |
| d056e27dfdcaeec3000000000000045d | 45.483 | 1.890 | n/a | 0.000 | 0.702 | 2.255 | 4.262 | 0.016 | 0.000 | 0.054 | 35.843 | 0.452 | n/a | 0.009 | 2.592 | 0.057 | 0.009 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.128ms; driver.publication.persist-deferred 0.020ms |
| d056e27dfdcaeec30000000000000314 | 43.781 | 2.505 | n/a | 0.000 | 0.072 | 0.709 | 1.640 | 0.031 | 0.000 | 2.037 | 27.548 | 9.206 | n/a | 0.033 | 2.578 | 0.059 | 0.033 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.104ms; driver.reader-basis.broadcast 0.027ms; driver.publication.persist-deferred 0.016ms |
| d056e27dfdcaeec30000000000000938 | 43.296 | 1.564 | n/a | 0.000 | 0.028 | 1.055 | 0.649 | 0.012 | 0.000 | 0.073 | 37.513 | 2.387 | n/a | 0.015 | 1.592 | 0.037 | 0.015 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.293ms; driver.publication.readback 0.056ms; driver.publication.persist-deferred 0.032ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000000e03 | 40.783 | 1.816 | n/a | 0.000 | 4.515 | 0.481 | 1.439 | 0.021 | 0.000 | 5.026 | 20.918 | 6.549 | n/a | 0.018 | 6.332 | 0.155 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.170ms; driver.publication.readback 0.072ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000000663 | 40.661 | 1.454 | n/a | 0.000 | 0.257 | 16.749 | 0.632 | 0.005 | 0.000 | 0.155 | 20.952 | 0.449 | n/a | 0.009 | 1.711 | 0.042 | 0.009 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.746ms; driver.publication.readback 0.106ms; driver.publication.readback 0.071ms; driver.publication.readback 0.062ms; driver.publication.persist-deferred 0.039ms |
| d056e27dfdcaeec30000000000000a28 | 39.745 | 1.293 | n/a | 0.000 | 9.179 | 0.564 | 1.423 | 0.031 | 0.000 | 0.141 | 25.403 | 1.700 | n/a | 0.010 | 10.473 | 0.264 | 0.010 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.150ms; driver.reader-basis.broadcast 0.124ms; driver.publication.readback 0.043ms; driver.publication.persist-deferred 0.018ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec300000000000009f5 | 39.289 | 1.262 | n/a | 0.000 | 0.051 | 1.221 | 5.152 | 0.004 | 13.015 | 0.010 | 16.785 | 1.764 | n/a | 0.025 | 1.312 | 0.033 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.020ms |
| d056e27dfdcaeec30000000000000df2 | 39.265 | 1.725 | n/a | 0.000 | 0.043 | 0.685 | 1.208 | 0.020 | 0.000 | 0.104 | 23.292 | 12.171 | n/a | 0.017 | 1.768 | 0.045 | 0.017 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000000283 | 37.309 | 1.853 | n/a | 0.000 | 0.017 | 0.912 | 1.390 | 0.020 | 0.000 | 0.069 | 29.209 | 3.826 | n/a | 0.013 | 1.870 | 0.050 | 0.013 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec300000000000003b9 | 36.138 | 2.117 | n/a | 0.000 | 0.041 | 0.657 | 1.220 | 0.014 | 0.000 | 0.327 | 4.412 | 27.329 | n/a | 0.021 | 2.157 | 0.060 | 0.021 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec30000000000000788 | 35.199 | 2.481 | n/a | 0.000 | 0.038 | 0.593 | 0.900 | 0.007 | 0.000 | 0.129 | 29.890 | 1.142 | n/a | 0.018 | 2.519 | 0.072 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.135ms; driver.reader-basis.broadcast 0.079ms; driver.publication.readback 0.065ms; driver.publication.readback 0.032ms; driver.publication.persist-deferred 0.025ms |
| d056e27dfdcaeec30000000000000ade | 35.120 | 2.701 | n/a | 0.000 | 0.087 | 0.722 | 0.938 | 0.014 | 0.000 | 0.494 | 10.229 | 19.892 | n/a | 0.043 | 2.788 | 0.079 | 0.043 | tx/thread-84/transactor.triplex-function | driver.reader-basis.broadcast 0.129ms |

## P2 / L64 / commit (1735 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.343 | 0.482 | 0.000 | 0.546 | 2.316 | n/a | 0.000 | 0.041 | 0.569 | 1.039 | 0.013 | 0.000 | 0.088 | 4.656 | 0.813 | n/a | 0.014 | 2.626 | 0.247 | 0.014 |
| p99 | 48.826 | 2.807 | 0.042 | 2.177 | 7.328 | n/a | 0.000 | 20.641 | 7.337 | 4.541 | 0.048 | 0.000 | 2.425 | 28.255 | 8.521 | n/a | 0.041 | 23.217 | 0.655 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec300000000000010ce | 90.551 | 11.440 | n/a | 0.000 | 35.964 | 7.001 | 3.879 | 0.044 | 0.000 | 0.159 | 26.220 | 5.830 | n/a | 0.013 | 47.404 | 0.524 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.173ms; driver.publication.readback 0.108ms; driver.publication.readback 0.096ms; driver.publication.readback 0.056ms; driver.publication.readback 0.049ms |
| d056e27dfdcaeec30000000000001ab0 | 65.714 | 2.581 | n/a | 0.000 | 0.019 | 50.545 | 1.249 | 0.021 | 0.000 | 0.048 | 9.379 | 1.864 | n/a | 0.009 | 2.599 | 0.040 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.026ms |
| d056e27dfdcaeec300000000000010c0 | 65.303 | 1.249 | n/a | 0.000 | 29.270 | 0.298 | 0.530 | 0.006 | 0.000 | 0.169 | 33.280 | 0.494 | n/a | 0.008 | 30.518 | 0.467 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.394ms; driver.publication.persist-deferred 0.160ms; driver.publication.readback 0.056ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000001ab1 | 63.245 | 3.127 | n/a | 0.000 | 0.111 | 48.054 | 1.387 | 0.016 | 0.000 | 0.653 | 8.546 | 1.336 | n/a | 0.016 | 3.238 | 0.051 | 0.016 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.026ms |
| d056e27dfdcaeec30000000000001ab2 | 62.174 | 1.567 | n/a | 0.000 | 4.022 | 43.623 | 0.927 | 0.019 | 0.000 | 0.041 | 11.449 | 0.519 | n/a | 0.008 | 5.589 | 0.090 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.026ms |
| d056e27dfdcaeec3000000000000112d | 61.118 | 1.138 | n/a | 0.000 | 46.538 | 4.933 | 1.300 | 0.023 | 0.000 | 3.867 | 2.909 | 0.401 | n/a | 0.010 | 47.675 | 0.780 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.435ms; driver.publication.readback 0.291ms; driver.publication.readback 0.059ms; driver.publication.readback 0.058ms; driver.publication.readback 0.054ms |
| d056e27dfdcaeec30000000000001ab5 | 61.058 | 7.405 | n/a | 0.000 | 25.259 | 11.712 | 2.060 | 0.011 | 0.000 | 0.026 | 11.652 | 2.927 | n/a | 0.007 | 32.663 | 0.535 | 0.007 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.111ms; driver.publication.readback 0.110ms; driver.publication.readback 0.085ms; driver.publication.readback 0.069ms |
| d056e27dfdcaeec3000000000000176e | 59.965 | 3.790 | n/a | 0.000 | 5.131 | 0.331 | 1.472 | 0.011 | 0.000 | 0.049 | 14.056 | 35.116 | n/a | 0.009 | 8.921 | 0.149 | 0.009 | tx/thread-84/transactor.triplex-function | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.163ms; driver.publication.readback 0.131ms; driver.publication.readback 0.108ms; driver.publication.readback 0.057ms |
| d056e27dfdcaeec30000000000001149 | 59.318 | 4.734 | n/a | 0.000 | 0.069 | 0.626 | 39.391 | 0.004 | 0.000 | 0.040 | 13.416 | 1.008 | n/a | 0.030 | 4.803 | 0.081 | 0.030 | gw-w/thread-69/commit.prepare-and-validate | driver.reader-basis.broadcast 0.433ms; driver.publication.readback 0.065ms; driver.publication.readback 0.061ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec3000000000000176d | 56.844 | 3.216 | n/a | 0.000 | 2.366 | 1.085 | 1.014 | 0.013 | 0.000 | 0.476 | 46.180 | 2.482 | n/a | 0.013 | 5.582 | 0.098 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.163ms; driver.publication.readback 0.131ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.033ms |
| d056e27dfdcaeec300000000000018dd | 56.791 | 7.065 | n/a | 0.000 | 0.045 | 0.683 | 4.718 | 0.033 | 0.000 | 1.555 | 12.893 | 29.782 | n/a | 0.018 | 7.110 | 0.125 | 0.018 | tx/thread-84/transactor.triplex-function | driver.reader-basis.broadcast 0.281ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.020ms |
| d056e27dfdcaeec300000000000013e0 | 55.062 | 4.246 | n/a | 0.000 | 28.259 | 3.982 | 2.789 | 0.039 | 0.000 | 0.293 | 14.266 | 1.175 | n/a | 0.012 | 32.505 | 0.590 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.066ms; driver.publication.readback 0.062ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.019ms |
| d056e27dfdcaeec30000000000001ab4 | 54.612 | 3.042 | n/a | 0.000 | 27.094 | 10.477 | 0.968 | 0.017 | 0.000 | 3.816 | 8.165 | 1.020 | n/a | 0.013 | 30.136 | 0.552 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.110ms; driver.publication.readback 0.085ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms |
| d056e27dfdcaeec300000000000018df | 50.767 | 2.529 | n/a | 0.000 | 1.675 | 2.000 | 1.468 | 0.014 | 0.000 | 0.029 | 41.636 | 1.405 | n/a | 0.012 | 4.204 | 0.083 | 0.012 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.281ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.020ms; driver.publication.persist-deferred 0.019ms |
| d056e27dfdcaeec3000000000000112b | 49.812 | 5.392 | n/a | 0.000 | 0.022 | 8.227 | 2.341 | 0.031 | 0.000 | 0.390 | 32.852 | 0.546 | n/a | 0.010 | 5.414 | 0.109 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.021ms |
| d056e27dfdcaeec30000000000001ab6 | 49.087 | 7.473 | n/a | 0.000 | 23.752 | 8.268 | 0.852 | 0.010 | 0.000 | 0.176 | 3.914 | 4.636 | n/a | 0.005 | 31.226 | 0.636 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.110ms; driver.publication.readback 0.085ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms |
| d056e27dfdcaeec30000000000001ab7 | 49.071 | 9.114 | n/a | 0.000 | 6.556 | 12.084 | 1.087 | 0.023 | 0.000 | 0.048 | 18.474 | 1.681 | n/a | 0.004 | 15.670 | 0.319 | 0.004 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.249ms; driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.139ms; driver.publication.readback 0.135ms; driver.publication.readback 0.111ms |
| d056e27dfdcaeec300000000000015f3 | 48.826 | 3.300 | n/a | 0.000 | 0.078 | 0.419 | 0.856 | 0.012 | 0.000 | 0.107 | 37.060 | 6.968 | n/a | 0.026 | 3.377 | 0.069 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.231ms |
| d056e27dfdcaeec300000000000014fa | 48.734 | 4.099 | n/a | 0.000 | 1.421 | 2.939 | 1.097 | 0.005 | 0.000 | 4.950 | 26.455 | 7.763 | n/a | 0.006 | 5.520 | 0.113 | 0.006 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.218ms; driver.publication.readback 0.048ms; driver.publication.readback 0.048ms; driver.publication.readback 0.046ms; driver.publication.persist-deferred 0.016ms |
| d056e27dfdcaeec3000000000000108b | 48.342 | 1.887 | n/a | 0.000 | 20.641 | 0.382 | 0.934 | 0.017 | 0.000 | 0.339 | 19.459 | 4.673 | n/a | 0.010 | 22.528 | 0.466 | 0.010 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.067ms; driver.publication.readback 0.045ms; driver.publication.persist-deferred 0.029ms; driver.publication.persist-deferred 0.020ms |

## P2 / L64 / commit / 5-10 facts (1064 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 9.931 | 0.000 | 0.000 | 0.421 | 1.871 | n/a | 0.000 | 0.042 | 0.569 | 0.891 | 0.013 | 0.000 | 0.088 | 4.337 | 0.624 | n/a | 0.014 | 2.108 | 0.227 | 0.014 |
| p99 | 46.247 | 1.964 | 0.046 | 1.090 | 6.115 | n/a | 0.000 | 21.411 | 8.084 | 5.001 | 0.049 | 0.000 | 2.314 | 29.719 | 6.710 | n/a | 0.038 | 23.217 | 0.685 | 0.038 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001ab0 | 65.714 | 2.581 | n/a | 0.000 | 0.019 | 50.545 | 1.249 | 0.021 | 0.000 | 0.048 | 9.379 | 1.864 | n/a | 0.009 | 2.599 | 0.040 | 0.009 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.026ms |
| d056e27dfdcaeec300000000000010c0 | 65.303 | 1.249 | n/a | 0.000 | 29.270 | 0.298 | 0.530 | 0.006 | 0.000 | 0.169 | 33.280 | 0.494 | n/a | 0.008 | 30.518 | 0.467 | 0.008 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.394ms; driver.publication.persist-deferred 0.160ms; driver.publication.readback 0.056ms; driver.publication.readback 0.055ms; driver.publication.persist-deferred 0.017ms |
| d056e27dfdcaeec30000000000001ab2 | 62.174 | 1.567 | n/a | 0.000 | 4.022 | 43.623 | 0.927 | 0.019 | 0.000 | 0.041 | 11.449 | 0.519 | n/a | 0.008 | 5.589 | 0.090 | 0.008 | node-14/thread-0/socket.wait-first-byte | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.069ms; driver.publication.persist-deferred 0.026ms |
| d056e27dfdcaeec3000000000000112d | 61.118 | 1.138 | n/a | 0.000 | 46.538 | 4.933 | 1.300 | 0.023 | 0.000 | 3.867 | 2.909 | 0.401 | n/a | 0.010 | 47.675 | 0.780 | 0.010 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.435ms; driver.publication.readback 0.291ms; driver.publication.readback 0.059ms; driver.publication.readback 0.058ms; driver.publication.readback 0.054ms |
| d056e27dfdcaeec3000000000000176d | 56.844 | 3.216 | n/a | 0.000 | 2.366 | 1.085 | 1.014 | 0.013 | 0.000 | 0.476 | 46.180 | 2.482 | n/a | 0.013 | 5.582 | 0.098 | 0.013 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.163ms; driver.publication.readback 0.131ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.033ms |
| d056e27dfdcaeec300000000000013e0 | 55.062 | 4.246 | n/a | 0.000 | 28.259 | 3.982 | 2.789 | 0.039 | 0.000 | 0.293 | 14.266 | 1.175 | n/a | 0.012 | 32.505 | 0.590 | 0.012 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.066ms; driver.publication.readback 0.062ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.025ms; driver.publication.persist-deferred 0.019ms |
| d056e27dfdcaeec30000000000001ab4 | 54.612 | 3.042 | n/a | 0.000 | 27.094 | 10.477 | 0.968 | 0.017 | 0.000 | 3.816 | 8.165 | 1.020 | n/a | 0.013 | 30.136 | 0.552 | 0.013 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.110ms; driver.publication.readback 0.085ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms |
| d056e27dfdcaeec3000000000000112b | 49.812 | 5.392 | n/a | 0.000 | 0.022 | 8.227 | 2.341 | 0.031 | 0.000 | 0.390 | 32.852 | 0.546 | n/a | 0.010 | 5.414 | 0.109 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication.readback 0.059ms; driver.publication.readback 0.058ms; driver.publication.readback 0.054ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.021ms |
| d056e27dfdcaeec30000000000001ab6 | 49.087 | 7.473 | n/a | 0.000 | 23.752 | 8.268 | 0.852 | 0.010 | 0.000 | 0.176 | 3.914 | 4.636 | n/a | 0.005 | 31.226 | 0.636 | 0.005 | node-14/thread-0/driver.queue.scheduler-late | driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.110ms; driver.publication.readback 0.085ms; driver.publication.readback 0.069ms; driver.publication.readback 0.068ms |
| d056e27dfdcaeec300000000000015f3 | 48.826 | 3.300 | n/a | 0.000 | 0.078 | 0.419 | 0.856 | 0.012 | 0.000 | 0.107 | 37.060 | 6.968 | n/a | 0.026 | 3.377 | 0.069 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.231ms |
| d056e27dfdcaeec30000000000001ab9 | 46.247 | 10.727 | n/a | 0.000 | 1.791 | 10.962 | 0.693 | 0.008 | 0.000 | 0.023 | 18.127 | 3.913 | n/a | 0.003 | 12.518 | 0.271 | 0.003 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.249ms; driver.reader-basis.broadcast 0.194ms; driver.publication.readback 0.139ms; driver.publication.readback 0.135ms; driver.publication.readback 0.111ms |
| d056e27dfdcaeec30000000000001c3f | 44.055 | 2.298 | n/a | 0.000 | 0.034 | 2.714 | 0.846 | 0.011 | 0.000 | 0.077 | 10.324 | 27.735 | n/a | 0.015 | 2.333 | 0.053 | 0.015 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec300000000000015f4 | 43.786 | 1.879 | n/a | 0.000 | 0.041 | 0.422 | 0.695 | 0.025 | 0.000 | 0.191 | 11.932 | 28.577 | n/a | 0.023 | 1.920 | 0.044 | 0.023 | tx/thread-84/transactor.triplex-function | driver.reader-basis.broadcast 0.231ms; driver.publication.readback 0.053ms; driver.publication.persist-deferred 0.021ms |
| d056e27dfdcaeec300000000000018de | 42.537 | 3.120 | n/a | 0.000 | 1.740 | 1.229 | 1.302 | 0.019 | 0.000 | 0.099 | 34.518 | 0.492 | n/a | 0.017 | 4.861 | 0.114 | 0.017 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.281ms |
| d056e27dfdcaeec300000000000014b7 | 42.104 | 1.287 | n/a | 0.000 | 30.604 | 0.311 | 1.186 | 0.030 | 0.000 | 1.396 | 6.781 | 0.493 | n/a | 0.013 | 31.892 | 0.757 | 0.013 | node-14/thread-0/driver.queue.subject | driver.reader-basis.broadcast 0.221ms; driver.publication.readback 0.113ms; driver.publication.readback 0.071ms; driver.publication.readback 0.064ms; driver.publication.readback 0.056ms |
| d056e27dfdcaeec3000000000000176f | 42.026 | 3.513 | n/a | 0.000 | 0.750 | 1.195 | 0.521 | 0.005 | 0.000 | 0.016 | 35.428 | 0.589 | n/a | 0.009 | 4.263 | 0.101 | 0.009 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.261ms; driver.publication.readback 0.163ms; driver.publication.readback 0.057ms; driver.publication.persist-deferred 0.018ms |
| d056e27dfdcaeec30000000000001bf8 | 40.487 | 2.668 | n/a | 0.000 | 0.027 | 0.610 | 1.810 | 0.019 | 0.000 | 0.064 | 34.212 | 1.065 | n/a | 0.010 | 2.695 | 0.067 | 0.010 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.685ms; driver.publication.readback 0.050ms; driver.publication.persist-deferred 0.016ms |
| d056e27dfdcaeec300000000000010cd | 40.199 | 1.362 | n/a | 0.000 | 29.180 | 0.424 | 0.800 | 0.013 | 0.000 | 0.135 | 7.600 | 0.674 | n/a | 0.011 | 30.542 | 0.760 | 0.011 | node-14/thread-0/driver.queue.subject | driver.publication.readback 0.108ms; driver.publication.readback 0.096ms; driver.publication.persist-deferred 0.024ms; driver.publication.persist-deferred 0.018ms |
| d056e27dfdcaeec30000000000001480 | 39.728 | 1.950 | n/a | 0.000 | 23.795 | 3.003 | 0.613 | 0.010 | 0.000 | 0.250 | 9.551 | 0.535 | n/a | 0.020 | 25.745 | 0.648 | 0.020 | node-14/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 1.043ms; driver.publication.readback 0.120ms; driver.publication.readback 0.116ms; driver.publication.persist-deferred 0.044ms; driver.publication.persist-deferred 0.043ms |
| d056e27dfdcaeec300000000000017e6 | 38.916 | 1.969 | n/a | 0.000 | 1.672 | 0.608 | 0.892 | 0.015 | 0.000 | 0.363 | 15.308 | 18.080 | n/a | 0.010 | 3.640 | 0.094 | 0.010 | tx/thread-84/transactor.triplex-function | driver.reader-basis.broadcast 0.410ms; driver.publication.readback 0.111ms; driver.publication.persist-deferred 0.104ms; driver.publication.readback 0.061ms; driver.publication.readback 0.053ms |

## P2 / L256 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.226 | 0.000 | 0.000 | 0.588 | 2.719 | n/a | 0.000 | 0.047 | 0.663 | 1.302 | 0.018 | 0.000 | 0.126 | 5.219 | 1.372 | n/a | 0.023 | 2.779 | 0.233 | 0.023 |
| p99 | 29.720 | 2.251 | 0.000 | 2.224 | 6.113 | n/a | 0.000 | 2.356 | 1.722 | 13.158 | 0.042 | 0.000 | 0.792 | 16.151 | 5.480 | n/a | 0.042 | 7.824 | 0.588 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001d21 | 29.720 | 2.378 | n/a | 0.000 | 0.045 | 0.598 | 13.158 | 0.018 | 0.000 | 0.042 | 8.181 | 5.280 | n/a | 0.020 | 2.423 | 0.082 | 0.020 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| d056e27dfdcaeec30000000000001d2d | 23.569 | 2.337 | n/a | 0.000 | 0.047 | 0.707 | 2.033 | 0.038 | 0.000 | 0.245 | 16.151 | 1.988 | n/a | 0.022 | 2.384 | 0.101 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d30 | 19.144 | 3.283 | n/a | 0.000 | 0.094 | 0.964 | 1.858 | 0.029 | 0.000 | 0.134 | 11.103 | 1.645 | n/a | 0.034 | 3.377 | 0.176 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d23 | 18.552 | 2.281 | n/a | 0.000 | 1.876 | 0.732 | 3.492 | 0.014 | 0.000 | 0.317 | 6.838 | 2.991 | n/a | 0.012 | 4.156 | 0.224 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d26 | 18.075 | 3.761 | n/a | 0.000 | 0.135 | 0.807 | 1.450 | 0.018 | 0.000 | 0.431 | 7.463 | 3.969 | n/a | 0.042 | 3.896 | 0.216 | 0.042 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d38 | 18.071 | 3.113 | n/a | 0.000 | 0.107 | 1.722 | 1.132 | 0.019 | 0.000 | 0.089 | 6.366 | 5.480 | n/a | 0.041 | 3.220 | 0.178 | 0.041 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.865ms |
| d056e27dfdcaeec30000000000001d49 | 18.020 | 3.597 | n/a | 0.000 | 0.081 | 0.762 | 1.159 | 0.020 | 0.000 | 0.167 | 9.073 | 3.127 | n/a | 0.032 | 3.678 | 0.204 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d65 | 17.780 | 2.507 | n/a | 0.000 | 0.046 | 0.516 | 1.053 | 0.015 | 0.000 | 0.113 | 9.792 | 3.714 | n/a | 0.024 | 2.553 | 0.144 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d2b | 17.744 | 2.706 | n/a | 0.000 | 0.034 | 0.571 | 2.274 | 0.013 | 0.000 | 0.262 | 8.803 | 3.052 | n/a | 0.028 | 2.740 | 0.154 | 0.028 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d36 | 17.656 | 4.022 | n/a | 0.000 | 0.055 | 0.703 | 1.362 | 0.019 | 0.000 | 0.405 | 6.968 | 4.090 | n/a | 0.031 | 4.077 | 0.231 | 0.031 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d1e | 17.223 | 2.304 | n/a | 0.000 | 0.040 | 0.501 | 1.078 | 0.014 | 0.000 | 0.247 | 8.481 | 4.533 | n/a | 0.025 | 2.344 | 0.136 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d75 | 16.729 | 2.369 | n/a | 0.000 | 0.045 | 0.893 | 1.871 | 0.031 | 0.000 | 0.252 | 6.191 | 5.058 | n/a | 0.018 | 2.414 | 0.144 | 0.018 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d62 | 15.873 | 4.025 | n/a | 0.000 | 0.076 | 0.795 | 2.809 | 0.035 | 0.000 | 0.792 | 6.512 | 0.796 | n/a | 0.033 | 4.101 | 0.258 | 0.033 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.930ms |
| d056e27dfdcaeec30000000000001d5b | 15.847 | 4.748 | n/a | 0.000 | 0.042 | 0.620 | 1.471 | 0.018 | 0.000 | 0.128 | 5.450 | 3.351 | n/a | 0.020 | 4.790 | 0.302 | 0.020 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d33 | 15.685 | 4.793 | n/a | 0.000 | 0.087 | 1.080 | 2.495 | 0.039 | 0.000 | 0.189 | 4.752 | 2.214 | n/a | 0.037 | 4.880 | 0.311 | 0.037 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d4f | 15.676 | 4.321 | n/a | 0.000 | 0.025 | 0.783 | 2.885 | 0.032 | 0.000 | 0.121 | 5.219 | 2.275 | n/a | 0.013 | 4.346 | 0.277 | 0.013 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d78 | 15.373 | 4.187 | n/a | 0.000 | 0.060 | 1.225 | 2.562 | 0.042 | 0.000 | 0.321 | 6.005 | 0.940 | n/a | 0.031 | 4.247 | 0.276 | 0.031 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.199ms |
| d056e27dfdcaeec30000000000001d8e | 14.383 | 6.113 | n/a | 0.000 | 0.052 | 0.638 | 1.797 | 0.016 | 0.000 | 0.481 | 3.891 | 1.372 | n/a | 0.023 | 6.164 | 0.429 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d53 | 14.371 | 4.399 | n/a | 0.000 | 0.032 | 0.603 | 1.389 | 0.012 | 0.000 | 0.051 | 5.984 | 1.888 | n/a | 0.012 | 4.431 | 0.308 | 0.012 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d6d | 13.967 | 2.286 | n/a | 0.000 | 0.055 | 0.677 | 1.742 | 0.024 | 0.000 | 0.201 | 8.496 | 0.462 | n/a | 0.023 | 2.341 | 0.168 | 0.023 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.919ms |

## P2 / L256 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 11.182 | 0.000 | 0.000 | 0.517 | 2.517 | n/a | 0.000 | 0.047 | 0.671 | 1.132 | 0.018 | 0.000 | 0.120 | 5.239 | 0.863 | n/a | 0.022 | 2.570 | 0.214 | 0.022 |
| p99 | 29.720 | 2.251 | 0.000 | 0.853 | 5.468 | n/a | 0.000 | 2.356 | 1.722 | 13.158 | 0.038 | 0.000 | 0.431 | 11.103 | 5.480 | n/a | 0.042 | 7.824 | 0.588 | 0.042 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001d21 | 29.720 | 2.378 | n/a | 0.000 | 0.045 | 0.598 | 13.158 | 0.018 | 0.000 | 0.042 | 8.181 | 5.280 | n/a | 0.020 | 2.423 | 0.082 | 0.020 | gw-w/thread-50/commit.prepare-and-validate | none observed |
| d056e27dfdcaeec30000000000001d30 | 19.144 | 3.283 | n/a | 0.000 | 0.094 | 0.964 | 1.858 | 0.029 | 0.000 | 0.134 | 11.103 | 1.645 | n/a | 0.034 | 3.377 | 0.176 | 0.034 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d23 | 18.552 | 2.281 | n/a | 0.000 | 1.876 | 0.732 | 3.492 | 0.014 | 0.000 | 0.317 | 6.838 | 2.991 | n/a | 0.012 | 4.156 | 0.224 | 0.012 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d26 | 18.075 | 3.761 | n/a | 0.000 | 0.135 | 0.807 | 1.450 | 0.018 | 0.000 | 0.431 | 7.463 | 3.969 | n/a | 0.042 | 3.896 | 0.216 | 0.042 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d38 | 18.071 | 3.113 | n/a | 0.000 | 0.107 | 1.722 | 1.132 | 0.019 | 0.000 | 0.089 | 6.366 | 5.480 | n/a | 0.041 | 3.220 | 0.178 | 0.041 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.865ms |
| d056e27dfdcaeec30000000000001d49 | 18.020 | 3.597 | n/a | 0.000 | 0.081 | 0.762 | 1.159 | 0.020 | 0.000 | 0.167 | 9.073 | 3.127 | n/a | 0.032 | 3.678 | 0.204 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d65 | 17.780 | 2.507 | n/a | 0.000 | 0.046 | 0.516 | 1.053 | 0.015 | 0.000 | 0.113 | 9.792 | 3.714 | n/a | 0.024 | 2.553 | 0.144 | 0.024 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d1e | 17.223 | 2.304 | n/a | 0.000 | 0.040 | 0.501 | 1.078 | 0.014 | 0.000 | 0.247 | 8.481 | 4.533 | n/a | 0.025 | 2.344 | 0.136 | 0.025 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d75 | 16.729 | 2.369 | n/a | 0.000 | 0.045 | 0.893 | 1.871 | 0.031 | 0.000 | 0.252 | 6.191 | 5.058 | n/a | 0.018 | 2.414 | 0.144 | 0.018 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d6d | 13.967 | 2.286 | n/a | 0.000 | 0.055 | 0.677 | 1.742 | 0.024 | 0.000 | 0.201 | 8.496 | 0.462 | n/a | 0.023 | 2.341 | 0.168 | 0.023 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.919ms |
| d056e27dfdcaeec30000000000001d8a | 13.788 | 3.704 | n/a | 0.000 | 0.078 | 0.712 | 0.875 | 0.013 | 0.000 | 0.099 | 6.749 | 1.528 | n/a | 0.030 | 3.782 | 0.274 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d28 | 13.687 | 2.641 | n/a | 0.000 | 0.084 | 0.610 | 1.025 | 0.015 | 0.000 | 0.339 | 4.282 | 4.662 | n/a | 0.028 | 2.725 | 0.199 | 0.028 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec30000000000001d7e | 13.305 | 5.468 | n/a | 0.000 | 2.356 | 0.655 | 0.879 | 0.018 | 0.000 | 0.109 | 3.265 | 0.533 | n/a | 0.022 | 7.824 | 0.588 | 0.022 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d87 | 12.196 | 2.869 | n/a | 0.000 | 0.104 | 1.556 | 1.534 | 0.031 | 0.000 | 0.220 | 5.358 | 0.489 | n/a | 0.035 | 2.973 | 0.244 | 0.035 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d9d | 12.183 | 3.389 | n/a | 0.000 | 0.092 | 0.787 | 1.160 | 0.019 | 0.000 | 0.368 | 5.509 | 0.820 | n/a | 0.040 | 3.481 | 0.286 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d43 | 12.049 | 2.429 | n/a | 0.000 | 0.036 | 0.604 | 1.082 | 0.017 | 0.000 | 0.126 | 7.164 | 0.578 | n/a | 0.015 | 2.465 | 0.205 | 0.015 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d5e | 11.326 | 2.743 | n/a | 0.000 | 0.057 | 1.029 | 1.778 | 0.031 | 0.000 | 0.247 | 4.821 | 0.596 | n/a | 0.025 | 2.801 | 0.247 | 0.025 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001da4 | 11.182 | 3.332 | n/a | 0.000 | 0.079 | 0.841 | 1.006 | 0.015 | 0.000 | 0.106 | 3.940 | 1.823 | n/a | 0.040 | 3.411 | 0.305 | 0.040 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d80 | 11.061 | 2.367 | n/a | 0.000 | 0.059 | 0.620 | 0.909 | 0.015 | 0.000 | 0.073 | 3.770 | 3.218 | n/a | 0.028 | 2.427 | 0.219 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001d16 | 11.033 | 2.517 | n/a | 0.000 | 0.049 | 0.599 | 1.302 | 0.018 | 0.000 | 0.058 | 5.903 | 0.564 | n/a | 0.024 | 2.566 | 0.233 | 0.024 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit (52 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.651 | 0.748 | 0.000 | 0.596 | 3.074 | n/a | 0.000 | 0.051 | 0.673 | 1.399 | 0.018 | 0.000 | 0.117 | 5.289 | 1.299 | n/a | 0.024 | 3.167 | 0.232 | 0.024 |
| p99 | 50.234 | 2.000 | 0.000 | 2.092 | 5.274 | n/a | 0.000 | 3.369 | 2.483 | 15.941 | 2.757 | 0.000 | 0.622 | 42.540 | 7.188 | n/a | 0.106 | 7.822 | 0.490 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001e2b | 50.234 | 2.511 | n/a | 0.000 | 0.043 | 0.686 | 1.004 | 0.019 | 0.000 | 0.069 | 42.540 | 3.338 | n/a | 0.023 | 2.554 | 0.051 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001db9 | 35.168 | 4.458 | n/a | 0.000 | 0.036 | 0.630 | 1.949 | 0.020 | 0.000 | 0.122 | 26.817 | 1.116 | n/a | 0.020 | 4.495 | 0.128 | 0.020 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.701ms |
| d056e27dfdcaeec30000000000001dbf | 31.771 | 2.287 | n/a | 0.000 | 0.039 | 0.602 | 15.941 | 0.015 | 0.000 | 0.048 | 6.461 | 6.360 | n/a | 0.017 | 2.326 | 0.073 | 0.017 | gw-w/thread-52/commit.prepare-and-validate | none observed |
| d056e27dfdcaeec30000000000001ddd | 26.100 | 5.274 | n/a | 0.000 | 0.082 | 2.046 | 11.918 | 2.757 | 0.000 | 0.311 | 3.311 | 0.358 | n/a | 0.043 | 5.356 | 0.205 | 0.043 | gw-w/thread-50/storage/begin-command! | none observed |
| d056e27dfdcaeec30000000000001dbe | 22.395 | 5.026 | n/a | 0.000 | 0.042 | 2.483 | 12.687 | 0.036 | 0.000 | 0.146 | 1.717 | 0.229 | n/a | 0.029 | 5.068 | 0.226 | 0.029 | gw-w/thread-48/storage/begin-command! | driver.reader-basis.broadcast 0.299ms |
| d056e27dfdcaeec30000000000001df5 | 21.150 | 4.841 | n/a | 0.000 | 0.080 | 0.625 | 1.528 | 0.015 | 0.000 | 0.070 | 11.918 | 2.042 | n/a | 0.030 | 4.921 | 0.233 | 0.030 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001df3 | 18.977 | 3.144 | n/a | 0.000 | 0.035 | 1.553 | 1.819 | 0.016 | 0.000 | 0.080 | 9.757 | 2.553 | n/a | 0.021 | 3.179 | 0.168 | 0.021 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dec | 18.887 | 2.938 | n/a | 0.000 | 0.086 | 0.543 | 1.291 | 0.014 | 0.000 | 0.334 | 6.445 | 7.188 | n/a | 0.046 | 3.025 | 0.160 | 0.046 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec30000000000001dca | 18.152 | 4.055 | n/a | 0.000 | 0.088 | 0.878 | 1.866 | 0.026 | 0.000 | 0.622 | 6.932 | 3.643 | n/a | 0.043 | 4.143 | 0.228 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e10 | 17.526 | 3.864 | n/a | 0.000 | 0.048 | 0.616 | 1.531 | 0.018 | 0.000 | 0.075 | 10.410 | 0.934 | n/a | 0.030 | 3.912 | 0.223 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001db6 | 17.125 | 2.595 | n/a | 0.000 | 0.039 | 0.470 | 1.233 | 0.014 | 0.000 | 0.097 | 8.844 | 3.813 | n/a | 0.020 | 2.635 | 0.154 | 0.020 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001de2 | 16.878 | 2.858 | n/a | 0.000 | 0.076 | 0.735 | 1.481 | 0.029 | 0.000 | 0.123 | 7.615 | 3.917 | n/a | 0.043 | 2.935 | 0.174 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.935ms |
| d056e27dfdcaeec30000000000001ddb | 16.781 | 3.910 | n/a | 0.000 | 0.048 | 0.686 | 1.399 | 0.016 | 0.000 | 0.125 | 5.812 | 4.758 | n/a | 0.028 | 3.958 | 0.236 | 0.028 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dd8 | 16.760 | 5.256 | n/a | 0.000 | 0.052 | 0.630 | 1.417 | 0.018 | 0.000 | 0.117 | 5.857 | 3.386 | n/a | 0.027 | 5.308 | 0.317 | 0.027 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dcd | 16.377 | 4.958 | n/a | 0.000 | 0.136 | 1.056 | 4.054 | 0.026 | 0.000 | 0.427 | 4.805 | 0.855 | n/a | 0.061 | 5.094 | 0.311 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.983ms |
| d056e27dfdcaeec30000000000001dd2 | 15.974 | 4.453 | n/a | 0.000 | 3.369 | 0.645 | 1.146 | 0.016 | 0.000 | 0.456 | 3.771 | 2.089 | n/a | 0.029 | 7.822 | 0.490 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dd5 | 15.835 | 2.678 | n/a | 0.000 | 0.038 | 0.361 | 0.864 | 0.022 | 0.000 | 0.366 | 8.220 | 3.273 | n/a | 0.013 | 2.717 | 0.172 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e1b | 15.776 | 4.980 | n/a | 0.000 | 0.057 | 1.881 | 3.238 | 0.008 | 0.000 | 0.353 | 3.931 | 1.299 | n/a | 0.029 | 5.037 | 0.319 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication.persist-deferred 0.031ms |
| d056e27dfdcaeec30000000000001e2e | 15.300 | 3.521 | n/a | 0.000 | 0.098 | 0.726 | 1.411 | 0.020 | 0.000 | 0.122 | 6.689 | 2.668 | n/a | 0.046 | 3.618 | 0.236 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001daa | 14.930 | 1.748 | n/a | 0.000 | 0.024 | 0.265 | 1.378 | 0.026 | 0.000 | 0.163 | 6.954 | 4.360 | n/a | 0.011 | 1.772 | 0.119 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (35 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.987 | 0.671 | 0.000 | 0.580 | 2.858 | n/a | 0.000 | 0.064 | 0.704 | 1.298 | 0.020 | 0.000 | 0.125 | 4.984 | 0.855 | n/a | 0.025 | 2.935 | 0.232 | 0.025 |
| p99 | 50.234 | 1.995 | 0.000 | 1.499 | 5.274 | n/a | 0.000 | 3.369 | 2.483 | 12.687 | 2.757 | 0.000 | 0.622 | 42.540 | 7.188 | n/a | 0.106 | 7.822 | 0.490 | 0.106 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001e2b | 50.234 | 2.511 | n/a | 0.000 | 0.043 | 0.686 | 1.004 | 0.019 | 0.000 | 0.069 | 42.540 | 3.338 | n/a | 0.023 | 2.554 | 0.051 | 0.023 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001ddd | 26.100 | 5.274 | n/a | 0.000 | 0.082 | 2.046 | 11.918 | 2.757 | 0.000 | 0.311 | 3.311 | 0.358 | n/a | 0.043 | 5.356 | 0.205 | 0.043 | gw-w/thread-50/storage/begin-command! | none observed |
| d056e27dfdcaeec30000000000001dbe | 22.395 | 5.026 | n/a | 0.000 | 0.042 | 2.483 | 12.687 | 0.036 | 0.000 | 0.146 | 1.717 | 0.229 | n/a | 0.029 | 5.068 | 0.226 | 0.029 | gw-w/thread-48/storage/begin-command! | driver.reader-basis.broadcast 0.299ms |
| d056e27dfdcaeec30000000000001dec | 18.887 | 2.938 | n/a | 0.000 | 0.086 | 0.543 | 1.291 | 0.014 | 0.000 | 0.334 | 6.445 | 7.188 | n/a | 0.046 | 3.025 | 0.160 | 0.046 | tx/thread-84/transactor.triplex-function | none observed |
| d056e27dfdcaeec30000000000001dca | 18.152 | 4.055 | n/a | 0.000 | 0.088 | 0.878 | 1.866 | 0.026 | 0.000 | 0.622 | 6.932 | 3.643 | n/a | 0.043 | 4.143 | 0.228 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001de2 | 16.878 | 2.858 | n/a | 0.000 | 0.076 | 0.735 | 1.481 | 0.029 | 0.000 | 0.123 | 7.615 | 3.917 | n/a | 0.043 | 2.935 | 0.174 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.935ms |
| d056e27dfdcaeec30000000000001ddb | 16.781 | 3.910 | n/a | 0.000 | 0.048 | 0.686 | 1.399 | 0.016 | 0.000 | 0.125 | 5.812 | 4.758 | n/a | 0.028 | 3.958 | 0.236 | 0.028 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dcd | 16.377 | 4.958 | n/a | 0.000 | 0.136 | 1.056 | 4.054 | 0.026 | 0.000 | 0.427 | 4.805 | 0.855 | n/a | 0.061 | 5.094 | 0.311 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.983ms |
| d056e27dfdcaeec30000000000001dd2 | 15.974 | 4.453 | n/a | 0.000 | 3.369 | 0.645 | 1.146 | 0.016 | 0.000 | 0.456 | 3.771 | 2.089 | n/a | 0.029 | 7.822 | 0.490 | 0.029 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dd5 | 15.835 | 2.678 | n/a | 0.000 | 0.038 | 0.361 | 0.864 | 0.022 | 0.000 | 0.366 | 8.220 | 3.273 | n/a | 0.013 | 2.717 | 0.172 | 0.013 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e2e | 15.300 | 3.521 | n/a | 0.000 | 0.098 | 0.726 | 1.411 | 0.020 | 0.000 | 0.122 | 6.689 | 2.668 | n/a | 0.046 | 3.618 | 0.236 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001daa | 14.930 | 1.748 | n/a | 0.000 | 0.024 | 0.265 | 1.378 | 0.026 | 0.000 | 0.163 | 6.954 | 4.360 | n/a | 0.011 | 1.772 | 0.119 | 0.011 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dc4 | 14.604 | 3.452 | n/a | 0.000 | 0.116 | 1.087 | 1.428 | 0.023 | 0.000 | 0.502 | 5.020 | 2.941 | n/a | 0.035 | 3.568 | 0.244 | 0.035 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001dcf | 13.722 | 3.859 | n/a | 0.000 | 0.091 | 0.767 | 1.298 | 0.016 | 0.000 | 0.430 | 4.420 | 2.735 | n/a | 0.106 | 3.950 | 0.288 | 0.106 | gw-w/thread-52/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001de9 | 13.480 | 3.936 | n/a | 0.000 | 0.066 | 0.764 | 1.441 | 0.021 | 0.000 | 0.455 | 4.521 | 2.247 | n/a | 0.028 | 4.002 | 0.297 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 1.024ms |
| d056e27dfdcaeec30000000000001e1c | 13.048 | 3.074 | n/a | 0.000 | 2.960 | 1.661 | 1.069 | 0.024 | 0.000 | 0.079 | 3.330 | 0.839 | n/a | 0.011 | 6.034 | 0.462 | 0.011 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e01 | 13.041 | 3.553 | n/a | 0.000 | 0.124 | 0.736 | 1.991 | 0.033 | 0.000 | 0.116 | 5.818 | 0.632 | n/a | 0.037 | 3.677 | 0.282 | 0.037 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e25 | 12.987 | 2.800 | n/a | 0.000 | 0.042 | 0.796 | 2.177 | 0.033 | 0.000 | 0.118 | 6.384 | 0.619 | n/a | 0.018 | 2.841 | 0.219 | 0.018 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001ddf | 12.813 | 2.898 | n/a | 0.000 | 0.068 | 0.686 | 0.916 | 0.015 | 0.000 | 0.280 | 5.385 | 2.542 | n/a | 0.024 | 2.966 | 0.231 | 0.024 | gw-w/thread-51/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e16 | 12.545 | 3.090 | n/a | 0.000 | 0.076 | 0.810 | 1.620 | 0.023 | 0.000 | 0.099 | 5.029 | 1.765 | n/a | 0.032 | 3.167 | 0.252 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.239 | 0.893 | 0.000 | 0.698 | 3.014 | n/a | 0.000 | 0.065 | 0.586 | 1.347 | 0.019 | 0.000 | 0.095 | 5.141 | 1.361 | n/a | 0.027 | 3.311 | 0.258 | 0.027 |
| p99 | 18.031 | 1.953 | 0.000 | 2.211 | 6.767 | n/a | 0.000 | 2.493 | 1.061 | 8.374 | 0.059 | 0.000 | 0.530 | 8.442 | 4.547 | n/a | 0.043 | 6.899 | 0.414 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001e68 | 18.031 | 4.027 | n/a | 0.000 | 0.041 | 0.496 | 1.932 | 0.018 | 0.000 | 0.053 | 8.128 | 3.299 | n/a | 0.038 | 4.068 | 0.226 | 0.038 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e51 | 17.602 | 6.767 | n/a | 0.000 | 0.072 | 0.489 | 2.031 | 0.014 | 0.000 | 0.064 | 5.814 | 2.321 | n/a | 0.030 | 6.838 | 0.389 | 0.030 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e62 | 17.092 | 4.640 | n/a | 0.000 | 0.077 | 0.978 | 8.374 | 0.059 | 0.000 | 0.159 | 2.342 | 0.433 | n/a | 0.031 | 4.716 | 0.276 | 0.031 | gw-w/thread-50/gateway.admitted-work | none observed |
| d056e27dfdcaeec30000000000001e5e | 17.041 | 5.785 | n/a | 0.000 | 0.035 | 0.495 | 2.273 | 0.021 | 0.000 | 0.109 | 5.967 | 2.338 | n/a | 0.018 | 5.820 | 0.342 | 0.018 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e45 | 16.665 | 4.406 | n/a | 0.000 | 2.493 | 0.604 | 2.629 | 0.032 | 0.000 | 0.095 | 5.023 | 1.361 | n/a | 0.022 | 6.899 | 0.414 | 0.022 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e63 | 14.638 | 2.278 | n/a | 0.000 | 0.107 | 0.586 | 1.171 | 0.019 | 0.000 | 0.066 | 5.821 | 4.547 | n/a | 0.043 | 2.385 | 0.163 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e47 | 13.821 | 3.657 | n/a | 0.000 | 0.076 | 0.831 | 1.779 | 0.023 | 0.000 | 0.530 | 5.068 | 1.830 | n/a | 0.027 | 3.733 | 0.270 | 0.027 | gw-w/thread-72/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e59 | 13.750 | 2.237 | n/a | 0.000 | 0.043 | 0.495 | 1.321 | 0.022 | 0.000 | 0.103 | 8.442 | 1.072 | n/a | 0.016 | 2.281 | 0.166 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e56 | 13.239 | 2.315 | n/a | 0.000 | 0.065 | 0.596 | 1.401 | 0.025 | 0.000 | 0.436 | 5.478 | 2.887 | n/a | 0.034 | 2.381 | 0.180 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.364ms |
| d056e27dfdcaeec30000000000001e4f | 12.865 | 3.768 | n/a | 0.000 | 0.084 | 1.061 | 1.754 | 0.042 | 0.000 | 0.173 | 5.141 | 0.805 | n/a | 0.037 | 3.852 | 0.299 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e4a | 12.140 | 3.014 | n/a | 0.000 | 0.036 | 0.533 | 1.347 | 0.017 | 0.000 | 0.067 | 5.667 | 1.442 | n/a | 0.016 | 3.051 | 0.251 | 0.016 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e3d | 10.899 | 2.638 | n/a | 0.000 | 0.122 | 0.524 | 0.953 | 0.015 | 0.000 | 0.090 | 5.768 | 0.761 | n/a | 0.028 | 2.760 | 0.253 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.727ms |
| d056e27dfdcaeec30000000000001e42 | 10.476 | 2.655 | n/a | 0.000 | 0.044 | 0.646 | 1.010 | 0.038 | 0.000 | 0.130 | 3.643 | 2.292 | n/a | 0.019 | 2.699 | 0.258 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e5b | 9.082 | 3.499 | n/a | 0.000 | 0.062 | 0.622 | 1.035 | 0.013 | 0.000 | 0.270 | 2.801 | 0.754 | n/a | 0.027 | 3.560 | 0.392 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e4c | 8.907 | 2.980 | n/a | 0.000 | 0.331 | 0.479 | 0.890 | 0.013 | 0.000 | 0.065 | 3.319 | 0.807 | n/a | 0.023 | 3.311 | 0.372 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.220ms |
| d056e27dfdcaeec30000000000001e65 | 8.809 | 2.119 | n/a | 0.000 | 0.041 | 0.588 | 1.257 | 0.017 | 0.000 | 0.093 | 3.851 | 0.826 | n/a | 0.016 | 2.160 | 0.245 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 10.899 | 0.822 | 0.000 | 0.508 | 2.638 | n/a | 0.000 | 0.065 | 0.588 | 1.171 | 0.019 | 0.000 | 0.103 | 3.851 | 0.807 | n/a | 0.027 | 2.699 | 0.253 | 0.027 |
| p99 | 17.092 | 0.999 | 0.000 | 0.863 | 4.640 | n/a | 0.000 | 0.331 | 1.061 | 8.374 | 0.059 | 0.000 | 0.436 | 8.442 | 4.547 | n/a | 0.043 | 4.716 | 0.392 | 0.043 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| d056e27dfdcaeec30000000000001e62 | 17.092 | 4.640 | n/a | 0.000 | 0.077 | 0.978 | 8.374 | 0.059 | 0.000 | 0.159 | 2.342 | 0.433 | n/a | 0.031 | 4.716 | 0.276 | 0.031 | gw-w/thread-50/gateway.admitted-work | none observed |
| d056e27dfdcaeec30000000000001e63 | 14.638 | 2.278 | n/a | 0.000 | 0.107 | 0.586 | 1.171 | 0.019 | 0.000 | 0.066 | 5.821 | 4.547 | n/a | 0.043 | 2.385 | 0.163 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e59 | 13.750 | 2.237 | n/a | 0.000 | 0.043 | 0.495 | 1.321 | 0.022 | 0.000 | 0.103 | 8.442 | 1.072 | n/a | 0.016 | 2.281 | 0.166 | 0.016 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e56 | 13.239 | 2.315 | n/a | 0.000 | 0.065 | 0.596 | 1.401 | 0.025 | 0.000 | 0.436 | 5.478 | 2.887 | n/a | 0.034 | 2.381 | 0.180 | 0.034 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.364ms |
| d056e27dfdcaeec30000000000001e4f | 12.865 | 3.768 | n/a | 0.000 | 0.084 | 1.061 | 1.754 | 0.042 | 0.000 | 0.173 | 5.141 | 0.805 | n/a | 0.037 | 3.852 | 0.299 | 0.037 | gw-w/thread-50/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e3d | 10.899 | 2.638 | n/a | 0.000 | 0.122 | 0.524 | 0.953 | 0.015 | 0.000 | 0.090 | 5.768 | 0.761 | n/a | 0.028 | 2.760 | 0.253 | 0.028 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.727ms |
| d056e27dfdcaeec30000000000001e42 | 10.476 | 2.655 | n/a | 0.000 | 0.044 | 0.646 | 1.010 | 0.038 | 0.000 | 0.130 | 3.643 | 2.292 | n/a | 0.019 | 2.699 | 0.258 | 0.019 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e5b | 9.082 | 3.499 | n/a | 0.000 | 0.062 | 0.622 | 1.035 | 0.013 | 0.000 | 0.270 | 2.801 | 0.754 | n/a | 0.027 | 3.560 | 0.392 | 0.027 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| d056e27dfdcaeec30000000000001e4c | 8.907 | 2.980 | n/a | 0.000 | 0.331 | 0.479 | 0.890 | 0.013 | 0.000 | 0.065 | 3.319 | 0.807 | n/a | 0.023 | 3.311 | 0.372 | 0.023 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.reader-basis.broadcast 0.220ms |
| d056e27dfdcaeec30000000000001e65 | 8.809 | 2.119 | n/a | 0.000 | 0.041 | 0.588 | 1.257 | 0.017 | 0.000 | 0.093 | 3.851 | 0.826 | n/a | 0.016 | 2.160 | 0.245 | 0.016 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P3 / outside-phases / read (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.571 | n/a | n/a | n/a | 0.141 | n/a | 0.000 | 0.000 | 1.034 | 200.696 | 0.007 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.143 | 0.141 | 0.001 | 0.143 |
| p99 | 348.122 | n/a | n/a | n/a | 24.734 | n/a | 1.437 | 0.000 | 5.478 | 344.113 | 0.099 | 23.750 | 0.262 | 0.000 | n/a | n/a | 0.294 | 25.702 | 0.341 | 0.294 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000000002 | 348.122 | 2.533 | n/a | 0.000 | 0.000 | 1.002 | 344.113 | 0.099 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.294 | 2.533 | 0.007 | 0.294 | gw-r/thread-49/gateway.admitted-work | none observed |
| 1ebbbbd0e42de4ac0000000000000005 | 203.915 | 0.053 | n/a | 0.000 | 0.000 | 2.438 | 201.135 | 0.019 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.143 | 0.053 | 0.000 | 0.143 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000006 | 203.706 | 0.141 | n/a | 0.000 | 0.000 | 1.034 | 202.135 | 0.021 | 0.000 | 0.262 | 0.000 | n/a | n/a | 0.114 | 0.141 | 0.001 | 0.114 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001033 | 201.686 | 0.042 | n/a | 0.000 | 0.000 | 0.790 | 200.696 | 0.004 | 0.000 | 0.049 | 0.000 | n/a | n/a | 0.105 | 0.042 | 0.000 | 0.105 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001032 | 201.571 | 0.035 | n/a | 0.000 | 0.000 | 0.494 | 200.903 | 0.010 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001038 | 153.078 | 16.631 | n/a | 1.437 | 0.000 | 5.234 | 105.805 | 0.007 | 23.750 | 0.011 | 0.000 | n/a | n/a | 0.203 | 18.068 | 0.118 | 0.203 | gw-r/thread-50/gateway.admitted-work | none observed |
| 1ebbbbd0e42de4ac0000000000001037 | 95.220 | 17.958 | n/a | 0.000 | 0.000 | 5.478 | 49.208 | 0.007 | 22.403 | 0.011 | 0.000 | n/a | n/a | 0.155 | 17.958 | 0.189 | 0.155 | gw-r/thread-52/gateway.admitted-work | none observed |
| 1ebbbbd0e42de4ac0000000000001036 | 75.376 | 24.734 | n/a | 0.968 | 0.000 | 4.133 | 45.290 | 0.003 | 0.000 | 0.003 | 0.000 | n/a | n/a | 0.245 | 25.702 | 0.341 | 0.245 | gw-r/thread-53/gateway.admitted-work | none observed |

## P3 / outside-phases / internal (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1005.107 | n/a | n/a | n/a | 0.288 | n/a | 0.000 | 0.000 | 1.575 | 1001.470 | 0.014 | 0.000 | 0.509 | 0.000 | n/a | n/a | 1.250 | 0.288 | 0.000 | 1.250 |
| p99 | 1005.107 | n/a | n/a | n/a | 0.288 | n/a | 0.000 | 0.000 | 1.575 | 1001.470 | 0.014 | 0.000 | 0.509 | 0.000 | n/a | n/a | 1.250 | 0.288 | 0.000 | 1.250 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c84509910000000000000000a4 | 1005.107 | 0.288 | n/a | 0.000 | 0.000 | 1.575 | 1001.470 | 0.014 | 0.000 | 0.509 | 0.000 | n/a | n/a | 1.250 | 0.288 | 0.000 | 1.250 | gw-r/thread-51/journal/page | none observed |

## P3 / warmup / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 852.439 | n/a | n/a | n/a | 2.157 | n/a | 0.000 | 0.000 | 0.760 | 830.191 | 0.013 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.173 | 2.157 | 0.005 | 0.173 |
| p99 | 1008.819 | n/a | n/a | n/a | 14.621 | n/a | 3.503 | 0.000 | 1.881 | 1006.114 | 0.062 | 0.000 | 3.196 | 0.000 | n/a | n/a | 1.194 | 18.124 | 0.150 | 1.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c84509910000000000000000bd | 1008.819 | 0.107 | n/a | 0.000 | 0.000 | 1.274 | 1006.114 | 0.025 | 0.000 | 0.204 | 0.000 | n/a | n/a | 1.094 | 0.107 | 0.000 | 1.094 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000000aa | 1005.598 | 0.142 | n/a | 0.000 | 0.000 | 0.815 | 1003.268 | 0.062 | 0.000 | 0.186 | 0.000 | n/a | n/a | 1.125 | 0.142 | 0.000 | 1.125 | gw-r/thread-49/journal/page | none observed |
| 614e46c84509910000000000000000a7 | 1005.084 | 0.152 | n/a | 0.000 | 0.000 | 1.079 | 1002.453 | 0.017 | 0.000 | 0.190 | 0.000 | n/a | n/a | 1.194 | 0.152 | 0.000 | 1.194 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000000c4 | 1004.467 | 0.116 | n/a | 0.000 | 0.000 | 1.027 | 1002.126 | 0.010 | 0.000 | 0.091 | 0.000 | n/a | n/a | 1.097 | 0.116 | 0.000 | 1.097 | gw-r/thread-51/journal/page | none observed |
| 614e46c84509910000000000000000b8 | 1004.279 | 0.111 | n/a | 0.000 | 0.000 | 1.826 | 1001.203 | 0.008 | 0.000 | 0.035 | 0.000 | n/a | n/a | 1.097 | 0.111 | 0.000 | 1.097 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000000b1 | 1004.129 | 0.147 | n/a | 0.000 | 0.000 | 0.913 | 1001.860 | 0.013 | 0.000 | 0.085 | 0.000 | n/a | n/a | 1.111 | 0.147 | 0.000 | 1.111 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000000c8 | 1003.077 | 0.129 | n/a | 0.000 | 0.000 | 0.922 | 1000.812 | 0.012 | 0.000 | 0.099 | 0.000 | n/a | n/a | 1.102 | 0.129 | 0.000 | 1.102 | gw-r/thread-51/journal/page | none observed |
| 614e46c84509910000000000000000ad | 1002.988 | 0.142 | n/a | 0.000 | 0.000 | 0.587 | 1001.020 | 0.015 | 0.000 | 0.112 | 0.000 | n/a | n/a | 1.112 | 0.142 | 0.000 | 1.112 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000000b7 | 1002.937 | 0.119 | n/a | 0.000 | 0.000 | 0.603 | 1000.988 | 0.013 | 0.000 | 0.115 | 0.000 | n/a | n/a | 1.099 | 0.119 | 0.000 | 1.099 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000000c1 | 965.784 | 2.276 | n/a | 0.000 | 0.000 | 0.457 | 962.870 | 0.012 | 0.000 | 0.097 | 0.000 | n/a | n/a | 0.072 | 2.276 | 0.002 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 614e46c84509910000000000000000b3 | 899.358 | 9.304 | n/a | 0.000 | 0.000 | 0.748 | 889.074 | 0.015 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.120 | 9.304 | 0.010 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000000a5 | 852.439 | 14.621 | n/a | 3.503 | 0.000 | 0.668 | 830.191 | 0.007 | 0.000 | 3.196 | 0.000 | n/a | n/a | 0.252 | 18.124 | 0.021 | 0.252 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000000c0 | 638.345 | 2.165 | n/a | 0.000 | 0.000 | 0.558 | 635.466 | 0.012 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.070 | 2.165 | 0.003 | 0.070 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000000b9 | 473.409 | 2.152 | n/a | 0.000 | 0.000 | 0.538 | 470.534 | 0.009 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.141 | 2.152 | 0.005 | 0.141 | gw-r/thread-51/journal/page | none observed |
| 614e46c84509910000000000000000b5 | 442.698 | 2.747 | n/a | 0.000 | 0.000 | 0.472 | 439.315 | 0.013 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.085 | 2.747 | 0.006 | 0.085 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000000be | 366.571 | 9.253 | n/a | 1.085 | 0.000 | 0.760 | 355.218 | 0.011 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.141 | 10.339 | 0.028 | 0.141 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000000b0 | 301.481 | 5.219 | n/a | 0.000 | 0.000 | 0.592 | 295.404 | 0.013 | 0.000 | 0.081 | 0.000 | n/a | n/a | 0.173 | 5.219 | 0.017 | 0.173 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000000c6 | 279.291 | 3.238 | n/a | 0.000 | 0.000 | 0.944 | 274.923 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.113 | 3.238 | 0.012 | 0.113 | gw-r/thread-49/journal/page | none observed |
| 614e46c84509910000000000000000ba | 254.737 | 2.157 | n/a | 0.000 | 0.000 | 1.702 | 250.704 | 0.012 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.078 | 2.157 | 0.008 | 0.078 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000000c5 | 253.818 | 2.260 | n/a | 0.000 | 0.000 | 0.538 | 250.852 | 0.021 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.076 | 2.260 | 0.009 | 0.076 | gw-r/thread-50/journal/page | none observed |

## P3 / L1 / internal (72 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 658.828 | n/a | n/a | n/a | 2.677 | n/a | 0.000 | 0.000 | 0.710 | 654.422 | 0.009 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.167 | 2.696 | 0.008 | 0.167 |
| p99 | 1007.166 | n/a | n/a | n/a | 14.486 | n/a | 2.489 | 0.000 | 3.666 | 1005.195 | 3.561 | 14.022 | 0.195 | 0.000 | n/a | n/a | 1.505 | 16.136 | 0.441 | 1.505 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000000138 | 1007.166 | 0.138 | n/a | 0.000 | 0.000 | 0.595 | 1005.195 | 0.013 | 0.000 | 0.112 | 0.000 | n/a | n/a | 1.113 | 0.138 | 0.000 | 1.113 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000000f3 | 1006.562 | 0.216 | n/a | 0.000 | 0.000 | 0.787 | 1000.727 | 3.561 | 0.000 | 0.078 | 0.000 | n/a | n/a | 1.192 | 0.216 | 0.000 | 1.192 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000000128 | 1006.392 | 0.132 | n/a | 0.000 | 0.000 | 3.666 | 1001.349 | 0.012 | 0.000 | 0.105 | 0.000 | n/a | n/a | 1.128 | 0.132 | 0.000 | 1.128 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000000117 | 1005.588 | 0.111 | n/a | 0.000 | 0.000 | 2.454 | 1001.798 | 0.009 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.158 | 0.111 | 0.000 | 1.158 | gw-r/thread-46/journal/page | none observed |
| 614e46c8450991000000000000000113 | 1005.214 | 0.194 | n/a | 0.000 | 0.000 | 0.868 | 1002.922 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.176 | 0.194 | 0.000 | 1.176 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000000100 | 1004.900 | 0.268 | n/a | 0.000 | 0.000 | 2.251 | 1001.017 | 0.029 | 0.000 | 0.136 | 0.000 | n/a | n/a | 1.199 | 0.268 | 0.000 | 1.199 | gw-r/thread-46/journal/page | none observed |
| 614e46c84509910000000000000000d4 | 1003.987 | 0.161 | n/a | 0.000 | 0.000 | 1.878 | 1000.757 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.109 | 0.161 | 0.000 | 1.109 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000000d0 | 1003.938 | 0.125 | n/a | 0.000 | 0.000 | 1.853 | 1000.755 | 0.012 | 0.000 | 0.096 | 0.000 | n/a | n/a | 1.096 | 0.125 | 0.000 | 1.096 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000000111 | 1003.722 | 0.122 | n/a | 0.000 | 0.000 | 0.918 | 1001.465 | 0.013 | 0.000 | 0.097 | 0.000 | n/a | n/a | 1.106 | 0.122 | 0.000 | 1.106 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000000db | 1003.427 | 0.126 | n/a | 0.000 | 0.000 | 0.975 | 1001.097 | 0.010 | 0.000 | 0.088 | 0.000 | n/a | n/a | 1.131 | 0.126 | 0.000 | 1.131 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000000d6 | 1003.375 | 0.147 | n/a | 0.000 | 0.000 | 0.604 | 1001.280 | 0.024 | 0.000 | 0.195 | 0.000 | n/a | n/a | 1.125 | 0.147 | 0.000 | 1.125 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000000ef | 1003.360 | 0.153 | n/a | 0.000 | 0.000 | 1.028 | 1000.952 | 0.013 | 0.000 | 0.083 | 0.000 | n/a | n/a | 1.132 | 0.153 | 0.000 | 1.132 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000000103 | 1003.251 | 0.118 | n/a | 0.000 | 0.000 | 0.694 | 1000.846 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.505 | 0.118 | 0.000 | 1.505 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000000109 | 1003.061 | 0.175 | n/a | 0.000 | 0.000 | 1.111 | 1000.624 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 1.100 | 0.175 | 0.000 | 1.100 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000000139 | 1003.036 | 0.121 | n/a | 0.000 | 0.000 | 0.666 | 1001.091 | 0.011 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.108 | 0.121 | 0.000 | 1.108 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000000d1 | 1003.023 | 0.147 | n/a | 0.000 | 0.000 | 0.517 | 1001.210 | 0.010 | 0.000 | 0.069 | 0.000 | n/a | n/a | 1.069 | 0.147 | 0.000 | 1.069 | gw-r/thread-49/journal/page | none observed |
| 614e46c845099100000000000000010b | 1003.002 | 0.105 | n/a | 0.000 | 0.000 | 0.880 | 1000.847 | 0.009 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.104 | 0.105 | 0.000 | 1.104 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000000cb | 1002.947 | 0.145 | n/a | 0.000 | 0.000 | 0.821 | 1000.791 | 0.018 | 0.000 | 0.077 | 0.000 | n/a | n/a | 1.094 | 0.145 | 0.000 | 1.094 | gw-r/thread-52/journal/page | none observed |
| 614e46c845099100000000000000012f | 1002.857 | 0.250 | n/a | 0.000 | 0.000 | 0.535 | 1000.856 | 0.007 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.143 | 0.250 | 0.000 | 1.143 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000000121 | 1002.795 | 0.167 | n/a | 0.000 | 0.000 | 0.810 | 1000.667 | 0.007 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.112 | 0.167 | 0.000 | 1.112 | gw-r/thread-51/journal/page | none observed |

## P3 / L4 / internal (80 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 518.496 | n/a | n/a | n/a | 2.304 | n/a | 0.000 | 0.000 | 0.616 | 513.674 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.095 | 2.304 | 0.006 | 0.095 |
| p99 | 1005.584 | n/a | n/a | n/a | 17.064 | n/a | 0.910 | 0.000 | 4.102 | 1002.469 | 5.233 | 12.850 | 0.143 | 0.000 | n/a | n/a | 1.196 | 17.975 | 0.376 | 1.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000000146 | 1005.584 | 0.228 | n/a | 0.000 | 0.000 | 3.447 | 1000.707 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 1.157 | 0.228 | 0.000 | 1.157 | gw-r/thread-46/journal/page | none observed |
| 614e46c8450991000000000000000153 | 1005.069 | 0.298 | n/a | 0.000 | 0.000 | 1.397 | 1002.034 | 0.015 | 0.000 | 0.143 | 0.000 | n/a | n/a | 1.183 | 0.298 | 0.000 | 1.183 | gw-r/thread-46/journal/page | none observed |
| 614e46c84509910000000000000001ab | 1004.704 | 0.212 | n/a | 0.000 | 0.000 | 0.776 | 1002.469 | 0.006 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.196 | 0.212 | 0.000 | 1.196 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000001c1 | 1003.985 | 0.293 | n/a | 0.000 | 0.000 | 1.713 | 1000.757 | 0.007 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.164 | 0.293 | 0.000 | 1.164 | gw-r/thread-49/journal/page | none observed |
| 614e46c845099100000000000000015a | 1003.730 | 0.186 | n/a | 0.000 | 0.000 | 1.293 | 1001.037 | 0.026 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.154 | 0.186 | 0.000 | 1.154 | gw-r/thread-51/journal/page | none observed |
| 614e46c84509910000000000000001a3 | 1003.708 | 0.116 | n/a | 0.000 | 0.000 | 0.593 | 1001.807 | 0.011 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.107 | 0.116 | 0.000 | 1.107 | gw-r/thread-48/journal/page | none observed |
| 614e46c845099100000000000000014e | 1003.650 | 0.167 | n/a | 0.000 | 0.000 | 0.709 | 1001.596 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.118 | 0.167 | 0.000 | 1.118 | gw-r/thread-49/journal/page | none observed |
| 614e46c845099100000000000000017c | 1003.232 | 0.208 | n/a | 0.000 | 0.000 | 1.183 | 1000.703 | 0.006 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.115 | 0.208 | 0.000 | 1.115 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000000189 | 1003.221 | 0.120 | n/a | 0.000 | 0.000 | 1.027 | 1000.915 | 0.006 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.102 | 0.120 | 0.000 | 1.102 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000001c6 | 1003.202 | 0.136 | n/a | 0.000 | 0.000 | 0.727 | 1001.146 | 0.011 | 0.000 | 0.080 | 0.000 | n/a | n/a | 1.102 | 0.136 | 0.000 | 1.102 | gw-r/thread-46/journal/page | none observed |
| 614e46c845099100000000000000017a | 1003.171 | 0.223 | n/a | 0.000 | 0.000 | 0.707 | 1001.004 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 1.149 | 0.223 | 0.000 | 1.149 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000001b6 | 1002.873 | 0.125 | n/a | 0.000 | 0.000 | 0.561 | 1000.981 | 0.007 | 0.000 | 0.073 | 0.000 | n/a | n/a | 1.125 | 0.125 | 0.000 | 1.125 | gw-r/thread-48/journal/page | none observed |
| 614e46c845099100000000000000014d | 1002.817 | 0.162 | n/a | 0.000 | 0.000 | 0.681 | 987.942 | 0.005 | 12.850 | 0.055 | 0.000 | n/a | n/a | 1.122 | 0.162 | 0.000 | 1.122 | gw-r/thread-46/journal/page | none observed |
| 614e46c8450991000000000000000197 | 1002.777 | 0.141 | n/a | 0.000 | 0.000 | 0.614 | 1000.874 | 0.006 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.100 | 0.141 | 0.000 | 1.100 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000000172 | 1002.764 | 0.162 | n/a | 0.000 | 0.000 | 0.616 | 1000.816 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.134 | 0.162 | 0.000 | 1.134 | gw-r/thread-49/journal/page | none observed |
| 614e46c845099100000000000000017d | 1002.690 | 0.194 | n/a | 0.000 | 0.000 | 0.601 | 1000.724 | 0.008 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.120 | 0.194 | 0.000 | 1.120 | gw-r/thread-50/journal/page | none observed |
| 614e46c845099100000000000000015f | 1002.651 | 0.126 | n/a | 0.000 | 0.000 | 0.764 | 1000.606 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.098 | 0.126 | 0.000 | 1.098 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000000157 | 1002.649 | 0.132 | n/a | 0.000 | 0.000 | 0.513 | 1000.824 | 0.023 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.099 | 0.132 | 0.000 | 1.099 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000000196 | 1002.601 | 0.196 | n/a | 0.000 | 0.000 | 0.705 | 1000.523 | 0.004 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.145 | 0.196 | 0.000 | 1.145 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000000162 | 1002.492 | 0.122 | n/a | 0.000 | 0.000 | 0.491 | 1000.750 | 0.005 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.078 | 0.122 | 0.000 | 1.078 | gw-r/thread-53/journal/page | none observed |

## P3 / L16 / internal (1484 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.429 | n/a | n/a | n/a | 3.446 | n/a | 0.000 | 0.000 | 0.522 | 9.000 | 0.004 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.076 | 3.446 | 0.269 | 0.076 |
| p99 | 323.264 | n/a | n/a | n/a | 12.773 | n/a | 0.999 | 0.000 | 5.735 | 320.380 | 0.296 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.093 | 13.248 | 0.831 | 1.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c84509910000000000000001da | 1003.720 | 0.200 | n/a | 0.000 | 0.000 | 0.559 | 1001.763 | 0.014 | 0.000 | 0.072 | 0.000 | n/a | n/a | 1.112 | 0.200 | 0.000 | 1.112 | gw-r/thread-49/journal/page | none observed |
| 614e46c84509910000000000000001d6 | 1003.665 | 0.167 | n/a | 0.000 | 0.000 | 0.842 | 1001.484 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 1.113 | 0.167 | 0.000 | 1.113 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000001d8 | 1002.802 | 0.243 | n/a | 0.000 | 0.000 | 0.882 | 1000.493 | 0.004 | 0.000 | 0.018 | 0.000 | n/a | n/a | 1.161 | 0.243 | 0.000 | 1.161 | gw-r/thread-46/journal/page | none observed |
| 614e46c84509910000000000000001dc | 1002.702 | 0.151 | n/a | 0.000 | 0.000 | 0.567 | 1000.855 | 0.003 | 0.000 | 0.017 | 0.000 | n/a | n/a | 1.109 | 0.151 | 0.000 | 1.109 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000001e6 | 1002.586 | 0.111 | n/a | 0.000 | 0.000 | 0.578 | 1000.738 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 1.107 | 0.111 | 0.000 | 1.107 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000001cd | 1002.337 | 0.106 | n/a | 0.000 | 0.000 | 0.493 | 1000.607 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.093 | 0.106 | 0.000 | 1.093 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000001e7 | 1002.300 | 0.114 | n/a | 0.000 | 0.000 | 0.457 | 1000.606 | 0.006 | 0.000 | 0.018 | 0.000 | n/a | n/a | 1.099 | 0.114 | 0.000 | 1.099 | gw-r/thread-49/journal/page | none observed |
| 614e46c84509910000000000000001dd | 1002.216 | 0.148 | n/a | 0.000 | 0.000 | 0.379 | 1000.537 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.110 | 0.148 | 0.000 | 1.110 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000001c8 | 972.627 | 3.555 | n/a | 0.000 | 0.000 | 0.773 | 968.175 | 0.005 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.072 | 3.555 | 0.004 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 614e46c84509910000000000000001c9 | 942.358 | 3.965 | n/a | 0.000 | 0.000 | 0.978 | 937.273 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.107 | 3.965 | 0.004 | 0.107 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000001de | 844.774 | 4.740 | n/a | 0.000 | 0.000 | 0.667 | 839.205 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.112 | 4.740 | 0.006 | 0.112 | gw-r/thread-52/journal/page | none observed |
| 614e46c84509910000000000000001df | 831.872 | 2.517 | n/a | 0.000 | 0.000 | 0.674 | 828.556 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 0.077 | 2.517 | 0.003 | 0.077 | gw-r/thread-51/journal/page | none observed |
| 614e46c84509910000000000000001e3 | 829.175 | 2.240 | n/a | 0.000 | 0.000 | 0.757 | 826.050 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.065 | 2.240 | 0.003 | 0.065 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000001d9 | 515.418 | 7.070 | n/a | 0.550 | 0.000 | 0.605 | 507.041 | 0.005 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.119 | 7.620 | 0.015 | 0.119 | gw-r/thread-53/journal/page | none observed |
| 614e46c84509910000000000000001cb | 323.264 | 2.217 | n/a | 0.000 | 0.000 | 0.562 | 320.380 | 0.004 | 0.000 | 0.023 | 0.000 | n/a | n/a | 0.077 | 2.217 | 0.007 | 0.077 | gw-r/thread-48/journal/page | none observed |
| 614e46c84509910000000000000001e1 | 254.873 | 2.257 | n/a | 0.000 | 0.000 | 0.604 | 251.878 | 0.006 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.090 | 2.257 | 0.009 | 0.090 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000001d5 | 248.618 | 2.556 | n/a | 0.000 | 0.000 | 0.466 | 245.478 | 0.008 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.060 | 2.556 | 0.010 | 0.060 | gw-r/thread-50/journal/page | none observed |
| 614e46c84509910000000000000008e1 | 118.820 | 2.936 | n/a | 0.000 | 0.000 | 0.398 | 115.231 | 0.123 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.113 | 2.936 | 0.025 | 0.113 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000000bc3 | 113.307 | 3.790 | n/a | 0.000 | 0.000 | 0.905 | 108.440 | 0.005 | 0.000 | 0.016 | 0.000 | n/a | n/a | 0.151 | 3.790 | 0.033 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 614e46c84509910000000000000004a2 | 109.092 | 4.976 | n/a | 0.000 | 0.000 | 0.318 | 103.683 | 0.004 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.077 | 4.976 | 0.046 | 0.077 | gw-r/thread-53/journal/page | none observed |

## P3 / L64 / internal (1530 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.842 | n/a | n/a | n/a | 3.995 | n/a | 0.000 | 0.000 | 0.474 | 6.936 | 0.005 | 0.000 | 0.011 | 0.000 | n/a | n/a | 0.099 | 4.021 | 0.354 | 0.099 |
| p99 | 347.830 | n/a | n/a | n/a | 15.446 | n/a | 1.643 | 0.000 | 4.643 | 339.251 | 0.377 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.544 | 15.970 | 0.847 | 1.544 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000001a3e | 1003.561 | 0.105 | n/a | 0.000 | 0.000 | 0.414 | 1000.806 | 0.006 | 0.000 | 0.041 | 0.000 | n/a | n/a | 2.189 | 0.105 | 0.000 | 2.189 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001a42 | 1002.625 | 0.106 | n/a | 0.000 | 0.000 | 0.324 | 1001.017 | 0.012 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.107 | 0.106 | 0.000 | 1.107 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001a39 | 1002.563 | 0.107 | n/a | 0.000 | 0.000 | 0.385 | 1000.920 | 0.011 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.085 | 0.107 | 0.000 | 1.085 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001a5a | 1002.384 | 0.150 | n/a | 0.000 | 0.000 | 0.509 | 1000.554 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.134 | 0.150 | 0.000 | 1.134 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001a58 | 1002.329 | 0.179 | n/a | 0.000 | 0.000 | 0.463 | 1000.539 | 0.006 | 0.000 | 0.023 | 0.000 | n/a | n/a | 1.119 | 0.179 | 0.000 | 1.119 | gw-r/thread-46/journal/page | none observed |
| 614e46c8450991000000000000001a6f | 1002.177 | 0.124 | n/a | 0.000 | 0.000 | 0.437 | 1000.489 | 0.007 | 0.000 | 0.020 | 0.000 | n/a | n/a | 1.101 | 0.124 | 0.000 | 1.101 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001a3b | 1001.240 | 0.101 | n/a | 0.000 | 0.000 | 0.388 | 1000.673 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.042 | 0.101 | 0.000 | 0.042 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001a4b | 969.932 | 6.946 | n/a | 0.000 | 0.000 | 0.545 | 962.249 | 0.007 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.153 | 6.946 | 0.007 | 0.153 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001a67 | 923.456 | 2.327 | n/a | 0.000 | 0.000 | 0.464 | 920.548 | 0.009 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.062 | 2.327 | 0.003 | 0.062 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001a3c | 804.297 | 13.166 | n/a | 0.000 | 0.000 | 0.548 | 790.246 | 0.013 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.281 | 13.166 | 0.016 | 0.281 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001a55 | 700.632 | 2.045 | n/a | 0.000 | 0.000 | 0.335 | 698.105 | 0.014 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.087 | 2.045 | 0.003 | 0.087 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001a52 | 685.010 | 4.848 | n/a | 0.000 | 0.000 | 0.393 | 679.604 | 0.008 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.133 | 4.848 | 0.007 | 0.133 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001a6c | 638.885 | 9.712 | n/a | 1.704 | 0.000 | 2.412 | 624.888 | 0.007 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.136 | 11.416 | 0.018 | 0.136 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001a44 | 633.029 | 2.306 | n/a | 0.000 | 0.000 | 0.719 | 629.886 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.072 | 2.306 | 0.004 | 0.072 | gw-r/thread-46/journal/page | none observed |
| 614e46c8450991000000000000001a4f | 377.103 | 1.800 | n/a | 0.000 | 0.000 | 0.653 | 374.535 | 0.009 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.066 | 1.800 | 0.005 | 0.066 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001a5c | 347.830 | 8.467 | n/a | 0.000 | 0.000 | 0.686 | 338.396 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.248 | 8.467 | 0.024 | 0.248 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001a5f | 342.792 | 7.392 | n/a | 0.000 | 0.000 | 0.601 | 334.686 | 0.003 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.079 | 7.392 | 0.022 | 0.079 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001a6a | 341.678 | 2.027 | n/a | 0.000 | 0.000 | 0.272 | 339.251 | 0.010 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.076 | 2.027 | 0.006 | 0.076 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001a66 | 304.316 | 3.340 | n/a | 0.000 | 0.000 | 0.345 | 300.534 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.069 | 3.340 | 0.011 | 0.069 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001a5e | 296.336 | 2.673 | n/a | 0.000 | 0.000 | 0.371 | 293.189 | 0.007 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.072 | 2.673 | 0.009 | 0.072 | gw-r/thread-50/journal/page | none observed |

## P3 / L256 / internal (75 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 586.227 | n/a | n/a | n/a | 3.181 | n/a | 0.000 | 0.000 | 0.524 | 576.861 | 0.007 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.171 | 3.260 | 0.007 | 0.171 |
| p99 | 1006.159 | n/a | n/a | n/a | 14.329 | n/a | 3.612 | 0.000 | 2.810 | 1004.054 | 0.284 | 11.723 | 0.065 | 0.000 | n/a | n/a | 2.172 | 16.508 | 0.396 | 2.172 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000001a77 | 1006.159 | 0.184 | n/a | 0.000 | 0.000 | 0.752 | 1004.054 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.135 | 0.184 | 0.000 | 1.135 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001acc | 1004.699 | 0.232 | n/a | 0.000 | 0.000 | 2.810 | 1000.528 | 0.006 | 0.000 | 0.025 | 0.000 | n/a | n/a | 1.098 | 0.232 | 0.000 | 1.098 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001ad6 | 1004.645 | 0.155 | n/a | 0.000 | 0.000 | 2.178 | 1001.128 | 0.011 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.115 | 0.155 | 0.000 | 1.115 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001ab7 | 1004.387 | 0.167 | n/a | 0.000 | 0.000 | 2.321 | 1000.715 | 0.013 | 0.000 | 0.055 | 0.000 | n/a | n/a | 1.117 | 0.167 | 0.000 | 1.117 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001ac0 | 1003.619 | 0.150 | n/a | 0.000 | 0.000 | 1.824 | 1000.507 | 0.007 | 0.000 | 0.021 | 0.000 | n/a | n/a | 1.110 | 0.150 | 0.000 | 1.110 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001a9b | 1003.455 | 0.155 | n/a | 0.000 | 0.000 | 0.427 | 1000.673 | 0.007 | 0.000 | 0.022 | 0.000 | n/a | n/a | 2.172 | 0.155 | 0.000 | 2.172 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001abb | 1002.836 | 0.184 | n/a | 0.000 | 0.000 | 0.624 | 1000.837 | 0.012 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.137 | 0.184 | 0.000 | 1.137 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001ada | 1002.739 | 0.124 | n/a | 0.000 | 0.000 | 0.658 | 1000.817 | 0.009 | 0.000 | 0.040 | 0.000 | n/a | n/a | 1.091 | 0.124 | 0.000 | 1.091 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001ae7 | 1002.705 | 0.152 | n/a | 0.000 | 0.000 | 0.520 | 1000.863 | 0.019 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.101 | 0.152 | 0.000 | 1.101 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001aac | 1002.680 | 0.168 | n/a | 0.000 | 0.000 | 0.599 | 1000.735 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 1.125 | 0.168 | 0.000 | 1.125 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001a85 | 1002.624 | 0.116 | n/a | 0.000 | 0.000 | 0.410 | 1000.953 | 0.016 | 0.000 | 0.059 | 0.000 | n/a | n/a | 1.069 | 0.116 | 0.000 | 1.069 | gw-r/thread-46/journal/page | none observed |
| 614e46c8450991000000000000001ab9 | 1002.594 | 0.132 | n/a | 0.000 | 0.000 | 0.407 | 1000.888 | 0.013 | 0.000 | 0.065 | 0.000 | n/a | n/a | 1.089 | 0.132 | 0.000 | 1.089 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001abd | 1002.583 | 0.145 | n/a | 0.000 | 0.000 | 0.541 | 1000.760 | 0.011 | 0.000 | 0.053 | 0.000 | n/a | n/a | 1.073 | 0.145 | 0.000 | 1.073 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001ab4 | 1002.503 | 0.195 | n/a | 0.000 | 0.000 | 0.609 | 1000.514 | 0.006 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.147 | 0.195 | 0.000 | 1.147 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001ab6 | 1002.481 | 0.221 | n/a | 0.000 | 0.000 | 0.705 | 1000.421 | 0.006 | 0.000 | 0.011 | 0.000 | n/a | n/a | 1.117 | 0.221 | 0.000 | 1.117 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001aec | 1002.478 | 0.152 | n/a | 0.000 | 0.000 | 0.451 | 1000.725 | 0.009 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.100 | 0.152 | 0.000 | 1.100 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001ac9 | 1002.404 | 0.135 | n/a | 0.000 | 0.000 | 0.546 | 1000.582 | 0.008 | 0.000 | 0.036 | 0.000 | n/a | n/a | 1.098 | 0.135 | 0.000 | 1.098 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001adf | 1002.396 | 0.105 | n/a | 0.000 | 0.000 | 0.482 | 1000.683 | 0.005 | 0.000 | 0.033 | 0.000 | n/a | n/a | 1.087 | 0.105 | 0.000 | 1.087 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001aae | 1002.374 | 0.178 | n/a | 0.000 | 0.000 | 0.547 | 1000.517 | 0.005 | 0.000 | 0.027 | 0.000 | n/a | n/a | 1.100 | 0.178 | 0.000 | 1.100 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001a94 | 1002.372 | 0.118 | n/a | 0.000 | 0.000 | 0.475 | 1000.633 | 0.007 | 0.000 | 0.042 | 0.000 | n/a | n/a | 1.097 | 0.118 | 0.000 | 1.097 | gw-r/thread-50/journal/page | none observed |

## P3 / L1024 / internal (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 579.891 | n/a | n/a | n/a | 2.736 | n/a | 0.000 | 0.000 | 0.516 | 576.645 | 0.005 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.157 | 2.805 | 0.007 | 0.157 |
| p99 | 1013.258 | n/a | n/a | n/a | 12.590 | n/a | 1.142 | 0.000 | 3.356 | 1004.959 | 0.027 | 0.000 | 0.102 | 0.000 | n/a | n/a | 1.466 | 13.732 | 0.828 | 1.466 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000001afd | 1013.258 | 6.875 | n/a | 0.641 | 0.000 | 0.585 | 1004.959 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.161 | 7.516 | 0.007 | 0.161 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001b2e | 1009.192 | 6.615 | n/a | 0.000 | 0.000 | 0.529 | 1001.258 | 0.005 | 0.000 | 0.026 | 0.000 | n/a | n/a | 0.759 | 6.615 | 0.007 | 0.759 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001b2c | 1006.041 | 0.168 | n/a | 0.000 | 0.000 | 0.617 | 1004.029 | 0.023 | 0.000 | 0.087 | 0.000 | n/a | n/a | 1.117 | 0.168 | 0.000 | 1.117 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b2f | 1005.085 | 0.109 | n/a | 0.000 | 0.000 | 2.661 | 1001.094 | 0.020 | 0.000 | 0.090 | 0.000 | n/a | n/a | 1.112 | 0.109 | 0.000 | 1.112 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001b32 | 1003.476 | 0.149 | n/a | 0.000 | 0.000 | 0.549 | 1001.556 | 0.013 | 0.000 | 0.102 | 0.000 | n/a | n/a | 1.107 | 0.149 | 0.000 | 1.107 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b39 | 1002.962 | 0.124 | n/a | 0.000 | 0.000 | 0.463 | 1001.189 | 0.009 | 0.000 | 0.066 | 0.000 | n/a | n/a | 1.110 | 0.124 | 0.000 | 1.110 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001b3a | 1002.875 | 0.122 | n/a | 0.000 | 0.000 | 0.510 | 1001.072 | 0.006 | 0.000 | 0.057 | 0.000 | n/a | n/a | 1.108 | 0.122 | 0.000 | 1.108 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001b4f | 1002.860 | 0.178 | n/a | 0.000 | 0.000 | 0.650 | 1000.845 | 0.008 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.126 | 0.178 | 0.000 | 1.126 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001b3f | 1002.786 | 0.182 | n/a | 0.000 | 0.000 | 0.581 | 1000.836 | 0.009 | 0.000 | 0.050 | 0.000 | n/a | n/a | 1.128 | 0.182 | 0.000 | 1.128 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b5f | 1002.594 | 0.116 | n/a | 0.000 | 0.000 | 0.427 | 1000.883 | 0.009 | 0.000 | 0.067 | 0.000 | n/a | n/a | 1.092 | 0.116 | 0.000 | 1.092 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001b66 | 1002.580 | 0.218 | n/a | 0.000 | 0.000 | 0.591 | 1000.572 | 0.004 | 0.000 | 0.031 | 0.000 | n/a | n/a | 1.163 | 0.218 | 0.000 | 1.163 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001b42 | 1002.544 | 6.637 | n/a | 0.000 | 0.000 | 0.525 | 995.272 | 0.004 | 0.000 | 0.022 | 0.000 | n/a | n/a | 0.083 | 6.637 | 0.007 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001b34 | 1002.473 | 0.108 | n/a | 0.000 | 0.000 | 0.502 | 1000.685 | 0.011 | 0.000 | 0.032 | 0.000 | n/a | n/a | 1.135 | 0.108 | 0.000 | 1.135 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000001b5c | 1002.468 | 0.146 | n/a | 0.000 | 0.000 | 0.458 | 1000.707 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 1.098 | 0.146 | 0.000 | 1.098 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000001b06 | 1002.467 | 0.126 | n/a | 0.000 | 0.000 | 0.318 | 1000.863 | 0.012 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.090 | 0.126 | 0.000 | 1.090 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b17 | 1002.457 | 0.142 | n/a | 0.000 | 0.000 | 0.476 | 1000.670 | 0.027 | 0.000 | 0.043 | 0.000 | n/a | n/a | 1.098 | 0.142 | 0.000 | 1.098 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b3b | 1002.404 | 0.133 | n/a | 0.000 | 0.000 | 0.559 | 1000.523 | 0.005 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.150 | 0.133 | 0.000 | 1.150 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b58 | 1002.333 | 0.210 | n/a | 0.000 | 0.000 | 0.524 | 1000.445 | 0.004 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.119 | 0.210 | 0.000 | 1.119 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b13 | 1002.332 | 0.139 | n/a | 0.000 | 0.000 | 0.389 | 1000.647 | 0.008 | 0.000 | 0.041 | 0.000 | n/a | n/a | 1.109 | 0.139 | 0.000 | 1.109 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b11 | 1002.329 | 0.094 | n/a | 0.000 | 0.000 | 0.420 | 1000.669 | 0.012 | 0.000 | 0.046 | 0.000 | n/a | n/a | 1.089 | 0.094 | 0.000 | 1.089 | gw-r/thread-53/journal/page | none observed |

## P3 / tail / internal (23 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 710.729 | n/a | n/a | n/a | 3.187 | n/a | 0.000 | 0.000 | 0.521 | 700.802 | 0.006 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.171 | 3.187 | 0.005 | 0.171 |
| p99 | 1003.804 | n/a | n/a | n/a | 12.676 | n/a | 0.915 | 0.000 | 1.171 | 1000.926 | 0.363 | 0.000 | 0.064 | 0.000 | n/a | n/a | 2.196 | 13.356 | 0.088 | 2.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 614e46c8450991000000000000001b7d | 1003.804 | 0.154 | n/a | 0.000 | 0.000 | 0.664 | 1000.762 | 0.004 | 0.000 | 0.024 | 0.000 | n/a | n/a | 2.196 | 0.154 | 0.000 | 2.196 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000001b7c | 1003.158 | 0.221 | n/a | 0.000 | 0.000 | 0.795 | 1000.926 | 0.018 | 0.000 | 0.064 | 0.000 | n/a | n/a | 1.135 | 0.221 | 0.000 | 1.135 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001b72 | 1002.563 | 0.115 | n/a | 0.000 | 0.000 | 0.728 | 1000.576 | 0.006 | 0.000 | 0.030 | 0.000 | n/a | n/a | 1.108 | 0.115 | 0.000 | 1.108 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000001b6a | 1002.402 | 0.155 | n/a | 0.000 | 0.000 | 0.512 | 1000.550 | 0.004 | 0.000 | 0.058 | 0.000 | n/a | n/a | 1.124 | 0.155 | 0.000 | 1.124 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b85 | 1002.352 | 0.115 | n/a | 0.000 | 0.000 | 0.545 | 1000.553 | 0.004 | 0.000 | 0.039 | 0.000 | n/a | n/a | 1.095 | 0.115 | 0.000 | 1.095 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001b87 | 1002.281 | 0.097 | n/a | 0.000 | 0.000 | 0.338 | 1000.704 | 0.008 | 0.000 | 0.034 | 0.000 | n/a | n/a | 1.099 | 0.097 | 0.000 | 1.099 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b8d | 1002.111 | 0.119 | n/a | 0.000 | 0.000 | 0.427 | 1000.434 | 0.008 | 0.000 | 0.024 | 0.000 | n/a | n/a | 1.099 | 0.119 | 0.000 | 1.099 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001b6c | 1000.942 | 0.114 | n/a | 0.000 | 0.000 | 0.418 | 1000.351 | 0.003 | 0.000 | 0.014 | 0.000 | n/a | n/a | 0.042 | 0.114 | 0.000 | 0.042 | gw-r/thread-53/journal/page | none observed |
| 614e46c8450991000000000000001b6e | 906.062 | 12.676 | n/a | 0.000 | 0.000 | 1.171 | 891.883 | 0.008 | 0.000 | 0.021 | 0.000 | n/a | n/a | 0.303 | 12.676 | 0.014 | 0.303 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b7f | 820.039 | 3.187 | n/a | 0.000 | 0.000 | 0.466 | 816.248 | 0.005 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.096 | 3.187 | 0.004 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 614e46c8450991000000000000001b78 | 749.548 | 9.074 | n/a | 0.000 | 0.000 | 0.723 | 739.423 | 0.009 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.274 | 9.074 | 0.012 | 0.274 | gw-r/thread-50/journal/page | none observed |
| 614e46c8450991000000000000001b83 | 710.729 | 12.440 | n/a | 0.915 | 0.000 | 0.571 | 696.494 | 0.005 | 0.000 | 0.019 | 0.000 | n/a | n/a | 0.285 | 13.356 | 0.019 | 0.285 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001b69 | 703.917 | 2.649 | n/a | 0.000 | 0.000 | 0.346 | 700.802 | 0.005 | 0.000 | 0.024 | 0.000 | n/a | n/a | 0.091 | 2.649 | 0.004 | 0.091 | gw-r/thread-49/journal/page | none observed |
| 614e46c8450991000000000000001b88 | 684.513 | 2.516 | n/a | 0.000 | 0.000 | 0.385 | 681.494 | 0.004 | 0.000 | 0.025 | 0.000 | n/a | n/a | 0.089 | 2.516 | 0.004 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001b7e | 544.191 | 2.778 | n/a | 0.000 | 0.000 | 0.406 | 540.884 | 0.007 | 0.000 | 0.027 | 0.000 | n/a | n/a | 0.089 | 2.778 | 0.005 | 0.089 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b6d | 434.449 | 3.699 | n/a | 0.000 | 0.000 | 0.366 | 430.209 | 0.007 | 0.000 | 0.030 | 0.000 | n/a | n/a | 0.137 | 3.699 | 0.009 | 0.137 | gw-r/thread-52/journal/page | none observed |
| 614e46c8450991000000000000001b8c | 430.375 | 6.550 | n/a | 0.000 | 0.000 | 0.760 | 422.946 | 0.002 | 0.000 | 0.015 | 0.000 | n/a | n/a | 0.101 | 6.550 | 0.015 | 0.101 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b74 | 349.131 | 7.506 | n/a | 0.000 | 0.000 | 0.735 | 340.681 | 0.010 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.159 | 7.506 | 0.021 | 0.159 | gw-r/thread-51/journal/page | none observed |
| 614e46c8450991000000000000001b7a | 284.622 | 8.284 | n/a | 0.000 | 0.000 | 0.391 | 275.751 | 0.009 | 0.000 | 0.037 | 0.000 | n/a | n/a | 0.150 | 8.284 | 0.029 | 0.150 | gw-r/thread-71/journal/page | none observed |
| 614e46c8450991000000000000001b89 | 269.106 | 3.951 | n/a | 0.000 | 0.000 | 0.521 | 264.458 | 0.010 | 0.000 | 0.033 | 0.000 | n/a | n/a | 0.134 | 3.951 | 0.015 | 0.134 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / read (69 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.779 | n/a | n/a | n/a | 0.041 | n/a | 0.000 | 0.000 | 0.844 | 201.448 | 0.015 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.095 | 0.041 | 0.000 | 0.095 |
| p99 | 211.014 | n/a | n/a | n/a | 0.096 | n/a | 0.000 | 0.000 | 5.517 | 206.009 | 0.367 | 0.000 | 0.748 | 0.000 | n/a | n/a | 0.293 | 0.096 | 0.002 | 0.293 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac000000000000002f | 211.014 | 0.077 | n/a | 0.000 | 0.000 | 5.517 | 205.032 | 0.016 | 0.000 | 0.191 | 0.000 | n/a | n/a | 0.182 | 0.077 | 0.000 | 0.182 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000000e | 207.577 | 0.051 | n/a | 0.000 | 0.000 | 1.200 | 206.009 | 0.014 | 0.000 | 0.166 | 0.000 | n/a | n/a | 0.137 | 0.051 | 0.000 | 0.137 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000004b | 206.675 | 0.030 | n/a | 0.000 | 0.000 | 1.456 | 205.001 | 0.012 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.075 | 0.030 | 0.000 | 0.075 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000000c | 206.585 | 0.037 | n/a | 0.000 | 0.000 | 1.022 | 204.920 | 0.050 | 0.000 | 0.468 | 0.000 | n/a | n/a | 0.089 | 0.037 | 0.000 | 0.089 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000007 | 206.078 | 0.034 | n/a | 0.000 | 0.000 | 0.854 | 204.898 | 0.013 | 0.000 | 0.137 | 0.000 | n/a | n/a | 0.142 | 0.034 | 0.000 | 0.142 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000021 | 205.950 | 0.033 | n/a | 0.000 | 0.000 | 0.773 | 204.781 | 0.033 | 0.000 | 0.237 | 0.000 | n/a | n/a | 0.092 | 0.033 | 0.000 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000038 | 205.750 | 0.033 | n/a | 0.000 | 0.000 | 0.706 | 204.732 | 0.021 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000052 | 205.621 | 0.036 | n/a | 0.000 | 0.000 | 0.598 | 204.727 | 0.018 | 0.000 | 0.151 | 0.000 | n/a | n/a | 0.092 | 0.036 | 0.000 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000014 | 205.077 | 0.060 | n/a | 0.000 | 0.000 | 1.722 | 202.882 | 0.034 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.149 | 0.060 | 0.000 | 0.149 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000000f | 205.057 | 0.033 | n/a | 0.000 | 0.000 | 3.713 | 201.093 | 0.015 | 0.000 | 0.113 | 0.000 | n/a | n/a | 0.089 | 0.033 | 0.000 | 0.089 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000002d | 204.777 | 0.030 | n/a | 0.000 | 0.000 | 0.563 | 203.978 | 0.015 | 0.000 | 0.119 | 0.000 | n/a | n/a | 0.072 | 0.030 | 0.000 | 0.072 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000023 | 204.507 | 0.037 | n/a | 0.000 | 0.000 | 0.972 | 203.140 | 0.023 | 0.000 | 0.234 | 0.000 | n/a | n/a | 0.101 | 0.037 | 0.000 | 0.101 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000031 | 204.481 | 0.034 | n/a | 0.000 | 0.000 | 2.553 | 201.647 | 0.016 | 0.000 | 0.145 | 0.000 | n/a | n/a | 0.086 | 0.034 | 0.000 | 0.086 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000020 | 204.036 | 0.096 | n/a | 0.000 | 0.000 | 1.479 | 202.009 | 0.015 | 0.000 | 0.230 | 0.000 | n/a | n/a | 0.207 | 0.096 | 0.000 | 0.207 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000047 | 203.960 | 0.047 | n/a | 0.000 | 0.000 | 0.758 | 202.875 | 0.013 | 0.000 | 0.131 | 0.000 | n/a | n/a | 0.136 | 0.047 | 0.000 | 0.136 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000011 | 203.856 | 0.049 | n/a | 0.000 | 0.000 | 1.481 | 202.056 | 0.018 | 0.000 | 0.156 | 0.000 | n/a | n/a | 0.096 | 0.049 | 0.000 | 0.096 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000004d | 203.791 | 0.045 | n/a | 0.000 | 0.000 | 2.618 | 200.901 | 0.015 | 0.000 | 0.120 | 0.000 | n/a | n/a | 0.092 | 0.045 | 0.000 | 0.092 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000034 | 203.772 | 0.059 | n/a | 0.000 | 0.000 | 0.840 | 202.597 | 0.019 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.130 | 0.059 | 0.000 | 0.130 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000040 | 203.752 | 0.041 | n/a | 0.000 | 0.000 | 1.154 | 202.239 | 0.021 | 0.000 | 0.177 | 0.000 | n/a | n/a | 0.120 | 0.041 | 0.000 | 0.120 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000024 | 203.724 | 0.045 | n/a | 0.000 | 0.000 | 1.120 | 202.029 | 0.079 | 0.000 | 0.326 | 0.000 | n/a | n/a | 0.126 | 0.045 | 0.000 | 0.126 | gw-r/thread-53/journal/page | none observed |

## P3 / L1 / read (209 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.264 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.777 | 201.028 | 0.012 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.090 | 0.040 | 0.000 | 0.090 |
| p99 | 206.568 | n/a | n/a | n/a | 0.086 | n/a | 0.000 | 0.000 | 4.677 | 205.037 | 4.716 | 0.000 | 2.481 | 0.000 | n/a | n/a | 0.196 | 0.086 | 0.001 | 0.196 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac000000000000006d | 214.987 | 0.045 | n/a | 0.000 | 0.000 | 1.131 | 213.555 | 0.021 | 0.000 | 0.136 | 0.000 | n/a | n/a | 0.099 | 0.045 | 0.000 | 0.099 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000008f | 206.608 | 0.063 | n/a | 0.000 | 0.000 | 4.693 | 201.484 | 0.015 | 0.000 | 0.170 | 0.000 | n/a | n/a | 0.183 | 0.063 | 0.000 | 0.183 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000008e | 206.568 | 0.052 | n/a | 0.000 | 0.000 | 0.778 | 205.469 | 0.011 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.146 | 0.052 | 0.000 | 0.146 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000006f | 206.270 | 0.039 | n/a | 0.000 | 0.000 | 5.087 | 200.937 | 0.012 | 0.000 | 0.105 | 0.000 | n/a | n/a | 0.090 | 0.039 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000de | 206.041 | 0.032 | n/a | 0.000 | 0.000 | 0.790 | 205.037 | 0.008 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.083 | 0.032 | 0.000 | 0.083 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000060 | 205.939 | 0.030 | n/a | 0.000 | 0.000 | 0.885 | 204.824 | 0.012 | 0.000 | 0.108 | 0.000 | n/a | n/a | 0.079 | 0.030 | 0.000 | 0.079 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000007e | 205.937 | 0.058 | n/a | 0.000 | 0.000 | 3.478 | 202.096 | 0.012 | 0.000 | 0.141 | 0.000 | n/a | n/a | 0.151 | 0.058 | 0.000 | 0.151 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000bc | 205.835 | 0.034 | n/a | 0.000 | 0.000 | 0.674 | 204.831 | 0.031 | 0.000 | 0.182 | 0.000 | n/a | n/a | 0.084 | 0.034 | 0.000 | 0.084 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000a9 | 205.815 | 0.038 | n/a | 0.000 | 0.000 | 4.067 | 201.427 | 0.040 | 0.000 | 0.153 | 0.000 | n/a | n/a | 0.090 | 0.038 | 0.000 | 0.090 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000112 | 205.786 | 0.035 | n/a | 0.000 | 0.000 | 4.560 | 201.016 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.070 | 0.035 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000c7 | 205.724 | 0.078 | n/a | 0.000 | 0.000 | 4.258 | 201.095 | 0.010 | 0.000 | 0.117 | 0.000 | n/a | n/a | 0.166 | 0.078 | 0.000 | 0.166 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000b0 | 205.654 | 0.059 | n/a | 0.000 | 0.000 | 0.983 | 204.322 | 0.013 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.140 | 0.059 | 0.000 | 0.140 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000df | 205.630 | 0.043 | n/a | 0.000 | 0.000 | 4.677 | 200.750 | 0.007 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.093 | 0.043 | 0.000 | 0.093 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000b4 | 205.540 | 0.029 | n/a | 0.000 | 0.000 | 3.323 | 202.006 | 0.010 | 0.000 | 0.098 | 0.000 | n/a | n/a | 0.074 | 0.029 | 0.000 | 0.074 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000054 | 205.359 | 0.033 | n/a | 0.000 | 0.000 | 4.134 | 200.991 | 0.013 | 0.000 | 0.109 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000b9 | 205.145 | 0.036 | n/a | 0.000 | 0.000 | 0.598 | 204.278 | 0.018 | 0.000 | 0.125 | 0.000 | n/a | n/a | 0.090 | 0.036 | 0.000 | 0.090 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000005c | 204.958 | 0.032 | n/a | 0.000 | 0.000 | 3.784 | 200.865 | 0.011 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.171 | 0.032 | 0.000 | 0.171 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000ba | 204.896 | 0.030 | n/a | 0.000 | 0.000 | 4.046 | 200.660 | 0.009 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.091 | 0.030 | 0.000 | 0.091 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000ec | 204.873 | 0.039 | n/a | 0.000 | 0.000 | 0.872 | 203.788 | 0.007 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.094 | 0.039 | 0.000 | 0.094 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000000ed | 204.827 | 0.028 | n/a | 0.000 | 0.000 | 0.570 | 204.098 | 0.007 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.070 | 0.028 | 0.000 | 0.070 | gw-r/thread-48/journal/page | none observed |

## P3 / L4 / read (208 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.687 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.661 | 200.812 | 0.007 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.083 | 0.040 | 0.000 | 0.083 |
| p99 | 205.785 | n/a | n/a | n/a | 0.080 | n/a | 0.000 | 0.000 | 3.654 | 203.908 | 2.258 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.197 | 0.080 | 0.001 | 0.197 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac000000000000014e | 207.542 | 0.035 | n/a | 0.000 | 0.000 | 0.485 | 206.831 | 0.019 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.074 | 0.035 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000014b | 206.643 | 0.044 | n/a | 0.000 | 0.000 | 4.585 | 201.848 | 0.006 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.084 | 0.044 | 0.000 | 0.084 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000158 | 205.785 | 0.041 | n/a | 0.000 | 0.000 | 0.723 | 204.809 | 0.016 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.115 | 0.041 | 0.000 | 0.115 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000015d | 205.566 | 0.029 | n/a | 0.000 | 0.000 | 1.534 | 203.826 | 0.024 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.062 | 0.029 | 0.000 | 0.062 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001f1 | 205.193 | 0.054 | n/a | 0.000 | 0.000 | 1.045 | 203.908 | 0.006 | 0.000 | 0.050 | 0.000 | n/a | n/a | 0.132 | 0.054 | 0.000 | 0.132 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000195 | 204.866 | 0.038 | n/a | 0.000 | 0.000 | 3.654 | 201.018 | 0.009 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.083 | 0.038 | 0.000 | 0.083 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000161 | 204.724 | 0.058 | n/a | 0.000 | 0.000 | 1.363 | 203.072 | 0.016 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.131 | 0.058 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000213 | 204.306 | 0.033 | n/a | 0.000 | 0.000 | 0.511 | 203.570 | 0.012 | 0.000 | 0.103 | 0.000 | n/a | n/a | 0.078 | 0.033 | 0.000 | 0.078 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001c8 | 204.292 | 0.051 | n/a | 0.000 | 0.000 | 0.631 | 203.447 | 0.005 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.115 | 0.051 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001ef | 203.173 | 0.078 | n/a | 0.000 | 0.000 | 1.278 | 201.483 | 0.014 | 0.000 | 0.118 | 0.000 | n/a | n/a | 0.201 | 0.078 | 0.000 | 0.201 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000150 | 203.093 | 0.030 | n/a | 0.000 | 0.000 | 2.169 | 187.912 | 0.006 | 12.850 | 0.058 | 0.000 | n/a | n/a | 0.067 | 0.030 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001aa | 203.045 | 0.041 | n/a | 0.000 | 0.000 | 0.821 | 201.928 | 0.014 | 0.000 | 0.146 | 0.000 | n/a | n/a | 0.096 | 0.041 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001c3 | 203.029 | 0.076 | n/a | 0.000 | 0.000 | 1.060 | 201.563 | 0.018 | 0.000 | 0.138 | 0.000 | n/a | n/a | 0.174 | 0.076 | 0.000 | 0.174 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001cf | 202.938 | 0.040 | n/a | 0.000 | 0.000 | 0.802 | 201.854 | 0.014 | 0.000 | 0.135 | 0.000 | n/a | n/a | 0.094 | 0.040 | 0.000 | 0.094 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000178 | 202.935 | 0.041 | n/a | 0.000 | 0.000 | 0.987 | 201.682 | 0.014 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.087 | 0.041 | 0.000 | 0.087 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001b5 | 202.924 | 0.032 | n/a | 0.000 | 0.000 | 0.557 | 202.108 | 0.075 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.077 | 0.032 | 0.000 | 0.077 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac00000000000001c0 | 202.908 | 0.059 | n/a | 0.000 | 0.000 | 1.665 | 200.971 | 0.007 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.149 | 0.059 | 0.000 | 0.149 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000018c | 202.901 | 0.039 | n/a | 0.000 | 0.000 | 2.001 | 200.719 | 0.007 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.083 | 0.039 | 0.000 | 0.083 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000153 | 202.885 | 0.038 | n/a | 0.000 | 0.000 | 0.988 | 201.654 | 0.011 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.083 | 0.038 | 0.000 | 0.083 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000017b | 202.873 | 0.038 | n/a | 0.000 | 0.000 | 0.851 | 201.742 | 0.028 | 0.000 | 0.126 | 0.000 | n/a | n/a | 0.088 | 0.038 | 0.000 | 0.088 | gw-r/thread-49/journal/page | none observed |

## P3 / L16 / read (154 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 81.327 | n/a | n/a | n/a | 0.047 | n/a | 0.000 | 0.000 | 0.586 | 78.910 | 0.006 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.070 | 0.047 | 0.001 | 0.070 |
| p99 | 204.921 | n/a | n/a | n/a | 0.156 | n/a | 0.000 | 0.000 | 4.880 | 202.580 | 2.995 | 11.582 | 0.154 | 0.000 | n/a | n/a | 0.532 | 0.156 | 0.002 | 0.532 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac000000000000025b | 206.905 | 0.043 | n/a | 0.000 | 0.000 | 5.882 | 200.826 | 0.007 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.082 | 0.043 | 0.000 | 0.082 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000025c | 204.921 | 0.028 | n/a | 0.000 | 0.000 | 4.139 | 200.651 | 0.005 | 0.000 | 0.032 | 0.000 | n/a | n/a | 0.067 | 0.028 | 0.000 | 0.067 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000024a | 203.587 | 0.034 | n/a | 0.000 | 0.000 | 0.584 | 202.849 | 0.009 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.069 | 0.034 | 0.000 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000220 | 203.479 | 0.156 | n/a | 0.000 | 0.000 | 1.381 | 201.242 | 0.013 | 0.000 | 0.127 | 0.000 | n/a | n/a | 0.560 | 0.156 | 0.001 | 0.560 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000023a | 203.400 | 0.042 | n/a | 0.000 | 0.000 | 0.759 | 202.428 | 0.006 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.110 | 0.042 | 0.000 | 0.110 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000022f | 203.270 | 0.051 | n/a | 0.000 | 0.000 | 0.492 | 202.580 | 0.006 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.097 | 0.051 | 0.000 | 0.097 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000247 | 202.885 | 0.045 | n/a | 0.000 | 0.000 | 0.792 | 201.771 | 0.017 | 0.000 | 0.154 | 0.000 | n/a | n/a | 0.106 | 0.045 | 0.000 | 0.106 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000025e | 202.813 | 0.069 | n/a | 0.000 | 0.000 | 1.132 | 201.362 | 0.008 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.176 | 0.069 | 0.000 | 0.176 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000252 | 202.711 | 0.039 | n/a | 0.000 | 0.000 | 0.990 | 201.455 | 0.011 | 0.000 | 0.116 | 0.000 | n/a | n/a | 0.101 | 0.039 | 0.000 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000225 | 202.470 | 0.042 | n/a | 0.000 | 0.000 | 0.834 | 201.358 | 0.012 | 0.000 | 0.124 | 0.000 | n/a | n/a | 0.099 | 0.042 | 0.000 | 0.099 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000024e | 202.460 | 0.038 | n/a | 0.000 | 0.000 | 0.656 | 201.579 | 0.012 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.091 | 0.038 | 0.000 | 0.091 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000246 | 202.384 | 0.047 | n/a | 0.000 | 0.000 | 1.021 | 201.073 | 0.008 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.156 | 0.047 | 0.000 | 0.156 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000245 | 202.363 | 0.117 | n/a | 0.000 | 0.000 | 0.546 | 201.102 | 0.008 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.532 | 0.117 | 0.001 | 0.532 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000239 | 202.329 | 0.098 | n/a | 0.000 | 0.000 | 1.026 | 200.942 | 0.009 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.198 | 0.098 | 0.000 | 0.198 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000226 | 202.274 | 0.027 | n/a | 0.000 | 0.000 | 1.001 | 201.109 | 0.005 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.059 | 0.027 | 0.000 | 0.059 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000240 | 202.254 | 0.060 | n/a | 0.000 | 0.000 | 1.183 | 200.804 | 0.006 | 0.000 | 0.048 | 0.000 | n/a | n/a | 0.153 | 0.060 | 0.000 | 0.153 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000231 | 202.215 | 0.030 | n/a | 0.000 | 0.000 | 0.750 | 201.276 | 0.009 | 0.000 | 0.079 | 0.000 | n/a | n/a | 0.072 | 0.030 | 0.000 | 0.072 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000022b | 202.181 | 0.045 | n/a | 0.000 | 0.000 | 0.987 | 200.981 | 0.007 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.093 | 0.045 | 0.000 | 0.093 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000023b | 202.156 | 0.043 | n/a | 0.000 | 0.000 | 0.914 | 201.006 | 0.006 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.125 | 0.043 | 0.000 | 0.125 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000023c | 202.124 | 0.043 | n/a | 0.000 | 0.000 | 0.859 | 201.045 | 0.008 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.090 | 0.043 | 0.000 | 0.090 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (143 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 92.019 | n/a | n/a | n/a | 0.040 | n/a | 0.000 | 0.000 | 0.456 | 91.448 | 0.007 | 0.000 | 0.034 | 0.000 | n/a | n/a | 0.067 | 0.040 | 0.000 | 0.067 |
| p99 | 202.465 | n/a | n/a | n/a | 0.110 | n/a | 0.000 | 0.000 | 4.331 | 201.645 | 26.735 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.164 | 0.110 | 0.026 | 0.164 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac0000000000000e10 | 203.434 | 0.045 | n/a | 0.000 | 0.000 | 2.615 | 200.609 | 0.007 | 0.000 | 0.035 | 0.000 | n/a | n/a | 0.123 | 0.045 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dd4 | 202.465 | 0.046 | n/a | 0.000 | 0.000 | 0.597 | 201.621 | 0.028 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.079 | 0.046 | 0.000 | 0.079 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ddf | 202.410 | 0.029 | n/a | 0.000 | 0.000 | 0.521 | 201.645 | 0.020 | 0.000 | 0.107 | 0.000 | n/a | n/a | 0.088 | 0.029 | 0.000 | 0.088 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dee | 202.393 | 0.032 | n/a | 0.000 | 0.000 | 0.528 | 201.666 | 0.012 | 0.000 | 0.088 | 0.000 | n/a | n/a | 0.067 | 0.032 | 0.000 | 0.067 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dd5 | 202.347 | 0.045 | n/a | 0.000 | 0.000 | 0.807 | 201.311 | 0.014 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.092 | 0.045 | 0.000 | 0.092 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dd6 | 202.209 | 0.046 | n/a | 0.000 | 0.000 | 0.733 | 201.217 | 0.014 | 0.000 | 0.075 | 0.000 | n/a | n/a | 0.124 | 0.046 | 0.000 | 0.124 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e07 | 202.164 | 0.063 | n/a | 0.000 | 0.000 | 0.784 | 201.081 | 0.011 | 0.000 | 0.062 | 0.000 | n/a | n/a | 0.164 | 0.063 | 0.000 | 0.164 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ded | 202.057 | 0.048 | n/a | 0.000 | 0.000 | 0.770 | 201.029 | 0.023 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.111 | 0.048 | 0.000 | 0.111 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dfa | 202.016 | 0.047 | n/a | 0.000 | 0.000 | 0.901 | 200.910 | 0.005 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.109 | 0.047 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dc7 | 202.008 | 0.032 | n/a | 0.000 | 0.000 | 0.683 | 201.131 | 0.014 | 0.000 | 0.060 | 0.000 | n/a | n/a | 0.089 | 0.032 | 0.000 | 0.089 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000df9 | 202.004 | 0.044 | n/a | 0.000 | 0.000 | 0.740 | 201.016 | 0.014 | 0.000 | 0.084 | 0.000 | n/a | n/a | 0.107 | 0.044 | 0.000 | 0.107 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e08 | 201.987 | 0.033 | n/a | 0.000 | 0.000 | 0.833 | 200.986 | 0.007 | 0.000 | 0.053 | 0.000 | n/a | n/a | 0.074 | 0.033 | 0.000 | 0.074 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000de0 | 201.930 | 0.046 | n/a | 0.000 | 0.000 | 0.744 | 200.965 | 0.011 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.079 | 0.046 | 0.000 | 0.079 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dfd | 201.898 | 0.048 | n/a | 0.000 | 0.000 | 0.556 | 201.089 | 0.014 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.126 | 0.048 | 0.000 | 0.126 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dce | 201.890 | 0.030 | n/a | 0.000 | 0.000 | 0.498 | 201.194 | 0.013 | 0.000 | 0.078 | 0.000 | n/a | n/a | 0.077 | 0.030 | 0.000 | 0.077 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dd8 | 201.877 | 0.041 | n/a | 0.000 | 0.000 | 0.718 | 200.962 | 0.008 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.103 | 0.041 | 0.000 | 0.103 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dc5 | 201.869 | 0.058 | n/a | 0.000 | 0.000 | 0.908 | 200.721 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.134 | 0.058 | 0.000 | 0.134 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e0d | 201.760 | 0.040 | n/a | 0.000 | 0.000 | 0.575 | 200.973 | 0.015 | 0.000 | 0.069 | 0.000 | n/a | n/a | 0.087 | 0.040 | 0.000 | 0.087 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dc8 | 201.729 | 0.040 | n/a | 0.000 | 0.000 | 0.837 | 200.717 | 0.008 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.082 | 0.040 | 0.000 | 0.082 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000dea | 201.708 | 0.026 | n/a | 0.000 | 0.000 | 0.435 | 201.129 | 0.007 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.063 | 0.026 | 0.000 | 0.063 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / read (216 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.442 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.531 | 200.685 | 0.009 | 0.000 | 0.044 | 0.000 | n/a | n/a | 0.077 | 0.036 | 0.000 | 0.077 |
| p99 | 205.172 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 4.107 | 201.818 | 2.545 | 0.000 | 0.099 | 0.000 | n/a | n/a | 0.185 | 0.068 | 0.001 | 0.185 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac0000000000000e25 | 211.900 | 0.044 | n/a | 0.000 | 0.000 | 0.584 | 211.101 | 0.011 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.106 | 0.044 | 0.000 | 0.106 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e3a | 205.786 | 0.030 | n/a | 0.000 | 0.000 | 4.436 | 201.155 | 0.014 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.082 | 0.030 | 0.000 | 0.082 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ee4 | 205.172 | 0.037 | n/a | 0.000 | 0.000 | 4.107 | 200.875 | 0.008 | 0.000 | 0.054 | 0.000 | n/a | n/a | 0.091 | 0.037 | 0.000 | 0.091 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e61 | 204.956 | 0.039 | n/a | 0.000 | 0.000 | 3.839 | 200.907 | 0.011 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.092 | 0.039 | 0.000 | 0.092 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ecc | 204.723 | 0.031 | n/a | 0.000 | 0.000 | 3.513 | 201.038 | 0.019 | 0.000 | 0.055 | 0.000 | n/a | n/a | 0.068 | 0.031 | 0.000 | 0.068 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e42 | 203.448 | 0.066 | n/a | 0.000 | 0.000 | 2.287 | 200.873 | 0.010 | 0.000 | 0.045 | 0.000 | n/a | n/a | 0.168 | 0.066 | 0.000 | 0.168 | gw-r/thread-46/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ea1 | 203.362 | 0.033 | n/a | 0.000 | 0.000 | 0.777 | 202.388 | 0.015 | 0.000 | 0.080 | 0.000 | n/a | n/a | 0.069 | 0.033 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ee6 | 203.156 | 0.025 | n/a | 0.000 | 0.000 | 0.448 | 200.824 | 1.745 | 0.000 | 0.052 | 0.000 | n/a | n/a | 0.063 | 0.025 | 0.000 | 0.063 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000eb9 | 202.763 | 0.042 | n/a | 0.000 | 0.000 | 1.977 | 200.610 | 0.004 | 0.000 | 0.029 | 0.000 | n/a | n/a | 0.100 | 0.042 | 0.000 | 0.100 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ebd | 202.599 | 0.056 | n/a | 0.000 | 0.000 | 0.736 | 201.524 | 0.019 | 0.000 | 0.106 | 0.000 | n/a | n/a | 0.157 | 0.056 | 0.000 | 0.157 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e26 | 202.516 | 0.037 | n/a | 0.000 | 0.000 | 0.518 | 201.818 | 0.008 | 0.000 | 0.039 | 0.000 | n/a | n/a | 0.096 | 0.037 | 0.000 | 0.096 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e3b | 202.435 | 0.066 | n/a | 0.000 | 0.000 | 0.711 | 201.364 | 0.019 | 0.000 | 0.091 | 0.000 | n/a | n/a | 0.185 | 0.066 | 0.000 | 0.185 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ed5 | 202.415 | 0.032 | n/a | 0.000 | 0.000 | 0.438 | 201.806 | 0.012 | 0.000 | 0.057 | 0.000 | n/a | n/a | 0.070 | 0.032 | 0.000 | 0.070 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e35 | 202.414 | 0.047 | n/a | 0.000 | 0.000 | 0.728 | 201.458 | 0.008 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.117 | 0.047 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e9e | 202.313 | 0.035 | n/a | 0.000 | 0.000 | 0.580 | 201.453 | 0.024 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.078 | 0.035 | 0.000 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e9a | 202.231 | 0.053 | n/a | 0.000 | 0.000 | 0.833 | 201.129 | 0.013 | 0.000 | 0.085 | 0.000 | n/a | n/a | 0.118 | 0.053 | 0.000 | 0.118 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ea4 | 202.212 | 0.064 | n/a | 0.000 | 0.000 | 0.851 | 201.042 | 0.012 | 0.000 | 0.068 | 0.000 | n/a | n/a | 0.175 | 0.064 | 0.000 | 0.175 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e34 | 202.209 | 0.038 | n/a | 0.000 | 0.000 | 0.552 | 201.472 | 0.012 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.069 | 0.038 | 0.000 | 0.069 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ec6 | 202.204 | 0.027 | n/a | 0.000 | 0.000 | 1.275 | 200.785 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.067 | 0.027 | 0.000 | 0.067 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000e16 | 202.201 | 0.024 | n/a | 0.000 | 0.000 | 1.194 | 200.871 | 0.008 | 0.000 | 0.040 | 0.000 | n/a | n/a | 0.065 | 0.024 | 0.000 | 0.065 | gw-r/thread-51/journal/page | none observed |

## P3 / L1024 / read (214 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.414 | n/a | n/a | n/a | 0.035 | n/a | 0.000 | 0.000 | 0.499 | 200.714 | 0.006 | 0.000 | 0.047 | 0.000 | n/a | n/a | 0.079 | 0.035 | 0.000 | 0.079 |
| p99 | 205.192 | n/a | n/a | n/a | 0.083 | n/a | 0.000 | 0.000 | 2.083 | 203.691 | 3.341 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.194 | 0.083 | 0.001 | 0.194 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac0000000000000f0f | 209.887 | 0.036 | n/a | 0.000 | 0.000 | 0.577 | 209.126 | 0.014 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.075 | 0.036 | 0.000 | 0.075 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fb8 | 207.325 | 0.040 | n/a | 0.000 | 0.000 | 0.607 | 206.510 | 0.004 | 0.000 | 0.046 | 0.000 | n/a | n/a | 0.118 | 0.040 | 0.000 | 0.118 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f3c | 205.192 | 0.049 | n/a | 0.000 | 0.000 | 0.779 | 200.872 | 3.341 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.095 | 0.049 | 0.000 | 0.095 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f21 | 204.966 | 0.056 | n/a | 0.000 | 0.000 | 0.743 | 203.691 | 0.110 | 0.000 | 0.142 | 0.000 | n/a | n/a | 0.224 | 0.056 | 0.000 | 0.224 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f37 | 203.159 | 0.035 | n/a | 0.000 | 0.000 | 0.573 | 202.339 | 0.016 | 0.000 | 0.102 | 0.000 | n/a | n/a | 0.095 | 0.035 | 0.000 | 0.095 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fb5 | 203.064 | 0.038 | n/a | 0.000 | 0.000 | 2.083 | 200.793 | 0.003 | 0.000 | 0.042 | 0.000 | n/a | n/a | 0.106 | 0.038 | 0.000 | 0.106 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fa3 | 202.912 | 0.028 | n/a | 0.000 | 0.000 | 2.310 | 200.462 | 0.004 | 0.000 | 0.036 | 0.000 | n/a | n/a | 0.071 | 0.028 | 0.000 | 0.071 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f7a | 202.901 | 0.042 | n/a | 0.000 | 0.000 | 1.823 | 200.802 | 0.006 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.172 | 0.042 | 0.000 | 0.172 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f5f | 202.747 | 0.038 | n/a | 0.000 | 0.000 | 0.740 | 201.741 | 0.013 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.103 | 0.038 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fcb | 202.552 | 0.056 | n/a | 0.000 | 0.000 | 0.815 | 201.385 | 0.012 | 0.000 | 0.100 | 0.000 | n/a | n/a | 0.183 | 0.056 | 0.000 | 0.183 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f7f | 202.408 | 0.049 | n/a | 0.000 | 0.000 | 0.665 | 201.465 | 0.013 | 0.000 | 0.096 | 0.000 | n/a | n/a | 0.120 | 0.049 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f67 | 202.395 | 0.046 | n/a | 0.000 | 0.000 | 0.810 | 201.348 | 0.012 | 0.000 | 0.083 | 0.000 | n/a | n/a | 0.096 | 0.046 | 0.000 | 0.096 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fa0 | 202.333 | 0.040 | n/a | 0.000 | 0.000 | 0.451 | 201.673 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.099 | 0.040 | 0.000 | 0.099 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f95 | 202.332 | 0.062 | n/a | 0.000 | 0.000 | 0.615 | 201.370 | 0.013 | 0.000 | 0.092 | 0.000 | n/a | n/a | 0.180 | 0.062 | 0.000 | 0.180 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f2f | 202.325 | 0.033 | n/a | 0.000 | 0.000 | 0.423 | 201.748 | 0.007 | 0.000 | 0.038 | 0.000 | n/a | n/a | 0.076 | 0.033 | 0.000 | 0.076 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f80 | 202.283 | 0.048 | n/a | 0.000 | 0.000 | 0.899 | 201.157 | 0.009 | 0.000 | 0.073 | 0.000 | n/a | n/a | 0.097 | 0.048 | 0.000 | 0.097 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f2c | 202.219 | 0.073 | n/a | 0.000 | 0.000 | 0.796 | 201.081 | 0.010 | 0.000 | 0.066 | 0.000 | n/a | n/a | 0.193 | 0.073 | 0.000 | 0.193 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f31 | 202.209 | 0.055 | n/a | 0.000 | 0.000 | 0.670 | 201.228 | 0.016 | 0.000 | 0.111 | 0.000 | n/a | n/a | 0.128 | 0.055 | 0.000 | 0.128 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fd0 | 202.138 | 0.047 | n/a | 0.000 | 0.000 | 0.792 | 201.091 | 0.012 | 0.000 | 0.082 | 0.000 | n/a | n/a | 0.113 | 0.047 | 0.000 | 0.113 | gw-r/thread-52/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000f8c | 202.135 | 0.043 | n/a | 0.000 | 0.000 | 0.663 | 201.210 | 0.008 | 0.000 | 0.094 | 0.000 | n/a | n/a | 0.117 | 0.043 | 0.000 | 0.117 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / read (70 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.411 | n/a | n/a | n/a | 0.036 | n/a | 0.000 | 0.000 | 0.514 | 200.753 | 0.006 | 0.000 | 0.051 | 0.000 | n/a | n/a | 0.081 | 0.036 | 0.000 | 0.081 |
| p99 | 202.788 | n/a | n/a | n/a | 0.068 | n/a | 0.000 | 0.000 | 0.911 | 201.761 | 1.979 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.198 | 0.068 | 0.001 | 0.198 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1ebbbbd0e42de4ac0000000000000fee | 202.788 | 0.046 | n/a | 0.000 | 0.000 | 0.816 | 201.747 | 0.010 | 0.000 | 0.077 | 0.000 | n/a | n/a | 0.092 | 0.046 | 0.000 | 0.092 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000100b | 202.641 | 0.034 | n/a | 0.000 | 0.000 | 0.604 | 201.761 | 0.012 | 0.000 | 0.140 | 0.000 | n/a | n/a | 0.088 | 0.034 | 0.000 | 0.088 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fe9 | 202.314 | 0.048 | n/a | 0.000 | 0.000 | 0.771 | 201.295 | 0.011 | 0.000 | 0.093 | 0.000 | n/a | n/a | 0.097 | 0.048 | 0.000 | 0.097 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001021 | 202.314 | 0.029 | n/a | 0.000 | 0.000 | 0.747 | 201.387 | 0.009 | 0.000 | 0.074 | 0.000 | n/a | n/a | 0.068 | 0.029 | 0.000 | 0.068 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000100c | 202.270 | 0.031 | n/a | 0.000 | 0.000 | 0.710 | 201.383 | 0.019 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.069 | 0.031 | 0.000 | 0.069 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001020 | 202.257 | 0.051 | n/a | 0.000 | 0.000 | 0.911 | 201.118 | 0.006 | 0.000 | 0.064 | 0.000 | n/a | n/a | 0.107 | 0.051 | 0.000 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000fef | 202.192 | 0.055 | n/a | 0.000 | 0.000 | 0.884 | 200.974 | 0.013 | 0.000 | 0.070 | 0.000 | n/a | n/a | 0.198 | 0.055 | 0.000 | 0.198 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000feb | 202.167 | 0.030 | n/a | 0.000 | 0.000 | 0.536 | 201.451 | 0.007 | 0.000 | 0.063 | 0.000 | n/a | n/a | 0.080 | 0.030 | 0.000 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ffb | 202.149 | 0.041 | n/a | 0.000 | 0.000 | 0.668 | 201.226 | 0.008 | 0.000 | 0.089 | 0.000 | n/a | n/a | 0.117 | 0.041 | 0.000 | 0.117 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ff5 | 202.085 | 0.048 | n/a | 0.000 | 0.000 | 0.700 | 201.095 | 0.015 | 0.000 | 0.086 | 0.000 | n/a | n/a | 0.142 | 0.048 | 0.000 | 0.142 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000101f | 202.050 | 0.044 | n/a | 0.000 | 0.000 | 0.727 | 201.089 | 0.006 | 0.000 | 0.076 | 0.000 | n/a | n/a | 0.108 | 0.044 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000101e | 202.049 | 0.033 | n/a | 0.000 | 0.000 | 0.560 | 201.286 | 0.010 | 0.000 | 0.087 | 0.000 | n/a | n/a | 0.073 | 0.033 | 0.000 | 0.073 | gw-r/thread-71/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000101a | 201.962 | 0.041 | n/a | 0.000 | 0.000 | 0.796 | 200.947 | 0.004 | 0.000 | 0.056 | 0.000 | n/a | n/a | 0.118 | 0.041 | 0.000 | 0.118 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001004 | 201.893 | 0.038 | n/a | 0.000 | 0.000 | 0.688 | 201.018 | 0.005 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.086 | 0.038 | 0.000 | 0.086 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ffa | 201.856 | 0.042 | n/a | 0.000 | 0.000 | 0.527 | 201.077 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.128 | 0.042 | 0.000 | 0.128 | gw-r/thread-53/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001022 | 201.822 | 0.042 | n/a | 0.000 | 0.000 | 0.641 | 200.948 | 0.011 | 0.000 | 0.059 | 0.000 | n/a | n/a | 0.120 | 0.042 | 0.000 | 0.120 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001027 | 201.732 | 0.048 | n/a | 0.000 | 0.000 | 0.517 | 200.943 | 0.010 | 0.000 | 0.065 | 0.000 | n/a | n/a | 0.148 | 0.048 | 0.000 | 0.148 | gw-r/thread-49/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000001010 | 201.730 | 0.059 | n/a | 0.000 | 0.000 | 0.691 | 200.759 | 0.007 | 0.000 | 0.043 | 0.000 | n/a | n/a | 0.171 | 0.059 | 0.000 | 0.171 | gw-r/thread-51/journal/page | none observed |
| 1ebbbbd0e42de4ac000000000000100f | 201.672 | 0.028 | n/a | 0.000 | 0.000 | 0.329 | 201.157 | 0.010 | 0.000 | 0.072 | 0.000 | n/a | n/a | 0.076 | 0.028 | 0.000 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 1ebbbbd0e42de4ac0000000000000ff0 | 201.672 | 0.034 | n/a | 0.000 | 0.000 | 0.648 | 200.853 | 0.004 | 0.000 | 0.058 | 0.000 | n/a | n/a | 0.075 | 0.034 | 0.000 | 0.075 | gw-r/thread-50/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.


## Commit clock definitions (diagnostic)

Authoritative verdict: unchanged scheduled-offer to benchmark finish. ACK-only retains actual offer lateness. Corrected is a counterfactual on-time offer with the clock stopped at ACK; it also removes real GC/event-loop lateness and cannot qualify a PASS. 0 of 3530 primary commands lack a qualified ACK. Non-latency P2 values and read/feed clocks are unchanged.

Timer lateness p50/p99: 0.002/3.962 ms; post-ACK p50/p99: 0.389/1.927 ms.

| Measurement | today | ACK-only | corrected diagnostic | unchanged bar |
| --- | --- | --- | --- | --- |
| All-primary p50 ms | 12.298 | 11.793 | 11.423 | reported |
| All-primary p99 ms | 50.234 | 49.882 | 47.954 | <=50 |
| L256 5-10 p50Ms | 11.327 | 10.943 | 10.751 | <=10 |
| L256 5-10 p99Ms | 29.720 | 29.237 | 29.235 | <=50 |
| L256 11-25 p50Ms | 15.423 | 14.719 | 14.719 | <=10 |
| L256 11-25 p99Ms | 23.569 | 23.132 | 23.131 | <=50 |
| L256 26-50 p50Ms | 14.399 | 13.695 | 13.695 | p99<=100; p50 reported |
| L256 26-50 p99Ms | 15.847 | 14.645 | 14.644 | p99<=100; p50 reported |
| Burst 5-10 p50 ms | 10.815 | 10.431 | 10.047 | <=10 |
| Burst 11-25 p50 ms | 12.863 | 12.223 | 11.839 | <=10 |
| L256 writer p99 ratio | unavailable | unavailable | unavailable | <=1.25 |
| L256 writer maximum ms | 29.720 | 29.237 | 29.235 | <=2000 |
| L1024 writer p99 ratio | unavailable | unavailable | unavailable | <=2 |
| L1024 writer maximum ms | 50.234 | 49.882 | 49.881 | reported |
| Recovery ms | unavailable | unavailable | unavailable | <=60000; unavailable is not met |


## Commit service by actual idle gap

Actual idle gap from every earlier non-expired completion; exact active-prefix overlap, not a 40-row heuristic. Service includes work after ACK. Layer marginal quantiles do not add.

| fact band | gap ms | n | service p50/p99 ms | to-ACK service p50 ms | peer p50 ms | gateway scopes p50 ms | client before/after p50 ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26-50 | >=1000 | 8 | 27.639/89.963 | 26.214 | 13.953 | 33.159 | 0.118/0.038 |
| 5-10 | >=1000 | 57 | 13.912/50.191 | 13.484 | 8.798 | 22.109 | 0.077/0.022 |
| 5-10 | 250-1000 | 66 | 15.447/65.370 | 15.147 | 9.629 | 23.478 | 0.078/0.020 |
| 11-25 | 250-1000 | 35 | 17.184/40.299 | 16.607 | 10.210 | 25.545 | 0.082/0.021 |
| 5-10 | 100-250 | 22 | 10.794/32.458 | 10.405 | 6.590 | 15.488 | 0.067/0.021 |
| 11-25 | >=1000 | 24 | 16.708/124.123 | 15.900 | 8.541 | 22.698 | 0.088/0.021 |
| 26-50 | 250-1000 | 14 | 17.991/35.132 | 17.016 | 8.934 | 22.250 | 0.104/0.029 |
| 11-25 | 100-250 | 14 | 14.992/24.783 | 14.494 | 9.000 | 22.687 | 0.070/0.020 |
| 11-25 | overlap | 420 | 14.167/49.093 | 13.501 | 8.376 | 19.327 | 0.043/0.017 |
| 5-10 | 0-50 | 1021 | 9.095/31.188 | 8.781 | 4.994 | 12.329 | 0.045/0.017 |
| 5-10 | 50-100 | 61 | 10.141/23.965 | 9.558 | 5.669 | 13.413 | 0.057/0.019 |
| 11-25 | 0-50 | 489 | 11.245/37.105 | 10.609 | 5.884 | 14.413 | 0.051/0.018 |
| 26-50 | overlap | 156 | 17.970/54.834 | 17.002 | 11.114 | 26.658 | 0.058/0.019 |
| 11-25 | 50-100 | 34 | 11.560/25.336 | 10.955 | 5.761 | 15.251 | 0.067/0.017 |
| 5-10 | overlap | 910 | 12.116/44.782 | 11.811 | 7.830 | 17.385 | 0.039/0.017 |
| 26-50 | 0-50 | 185 | 14.575/60.207 | 13.558 | 7.382 | 18.573 | 0.064/0.018 |
| 26-50 | 50-100 | 14 | 16.365/26.927 | 14.620 | 7.978 | 20.933 | 0.077/0.020 |

| phase type | primary commands | >50 ms | slow wall ms |
| --- | --- | --- | --- |
| sparse | 1849 | 18 | 1174.906 |
| burst | 1681 | 18 | 1152.985 |

## Writer heap, GC and scheduler stalls

Source f9a84dcb52993e2ceff0210533d12e885ceb6d0d; 3530 complete primary writer rows; timed telemetry only. GC event durations are observations, not exclusive CPU.

| writer metric | observed |
| --- | --- |
| Heap used median / peak MiB | 442.091 / 534.707 |
| GC events / total duration / maximum ms | 636 / 1422.056 / 38.223 |
| GC events >50 ms / total duration ms | 0 / 0.000 |
| GC kinds (1 minor, 4 major, 8 incremental) | {"1":626,"4":5,"8":5} |
| Scheduler lateness >50 ms, per-command intervals / sum ms | 0 / 0.000 |
| Union stall episodes / duration ms | 0 / 0.000 |
| All-primary p99 / over-50-ms requests / summed request wall ms | 50.234 / 36 / 2327.890 |

Full heap-space samples and scheduler-lateness trace IDs are in WRITER-STATS.json and trace/raw.

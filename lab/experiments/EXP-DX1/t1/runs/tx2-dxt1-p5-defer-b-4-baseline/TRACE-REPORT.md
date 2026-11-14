# Trace report

The slowest observed commits spent their largest exclusive interval in `node-14/thread-0/node.gc` (89.892 ms, trace `854d20932ad6977700000000000003ca`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (220.788 ms, trace `854d20932ad69777000000000000020d`); `node-14/thread-0/driver.queue.subject` (123.936 ms, trace `854d20932ad6977700000000000003d4`); `node-14/thread-0/socket.wait-first-byte` (145.516 ms, trace `854d20932ad6977700000000000003c6`); `node-14/thread-0/socket.wait-first-byte` (157.937 ms, trace `854d20932ad6977700000000000003c5`). These are observed spans, not proof of the transactor's internal cause.

Run `tx2-dxt1-p5-defer-b-4-baseline`; source `3ff6db5ae859a18b9afcf85c58ee7cd70c829800`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3710/3711 (99.973%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 7686175.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 227 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: NOT-RUN.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 0 | 13560.882 | 627.862 | 5.945 | 454 |
| L1 | 0 | 19027.182 | 446.594 | 9.219 | 665 |
| L4 | 0 | 19964.466 | 404.664 | 8.970 | 628 |
| L16 | 0 | 19980.659 | 431.396 | 12.222 | 686 |
| L64 | 0 | 19976.129 | 503.118 | 25.843 | 870 |
| L256 | 0 | 19972.742 | 544.043 | 16.162 | 688 |
| L1024 | 0 | 19981.317 | 4188.474 | 48.558 | 17196 |
| tail | 0 | 64458.793 | 11867.344 | 111.763 | 52772 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| 854d20932ad6977700000000000003ca | driver.queue.scheduler-late | 39.328 | none | 3 / 32 |
| 854d20932ad6977700000000000003ca | driver.queue.scheduler-dispatch | 0.903 | none | 3 / 32 |

Observed active steps while trace 854d20932ad6977700000000000003ca waited: []

| 854d20932ad69777000000000000020d | driver.queue.scheduler-dispatch | 0.051 | none | 0 / 32 |
| 854d20932ad69777000000000000020d | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace 854d20932ad69777000000000000020d waited: []

| 854d20932ad6977700000000000003d4 | driver.queue.subject | 123.936 | 854d20932ad6977700000000000003d3 | 7 / 32 |
| 854d20932ad6977700000000000003d4 | driver.queue.scheduler-late | 48.464 | none | 7 / 32 |
| 854d20932ad6977700000000000003d4 | driver.queue.scheduler-dispatch | 0.070 | none | 7 / 32 |

Observed active steps while trace 854d20932ad6977700000000000003d4 waited: [{"at":1794641243499.2944,"inFlight":9,"capacity":32,"active":[{"traceId":"854d20932ad6977700000000000003ce","step":"client.http"},{"traceId":"854d20932ad6977700000000000003cf","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d0","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d1","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d2","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d3","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d5","step":"client.commit-send-queue"},{"traceId":"854d20932ad6977700000000000003d6","step":"client.commit-send-queue"},{"traceId":"854d20932ad6977700000000000003d7","step":"client.commit-send-queue"}]},{"at":1794641243526.6577,"inFlight":12,"capacity":32,"active":[{"traceId":"854d20932ad6977700000000000003cf","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d0","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d1","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d2","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d3","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d5","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d6","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d7","step":"client.http"},{"traceId":"854d20932ad6977700000000000003d9","step":"client.http"},{"traceId":"854d20932ad6977700000000000003da","step":"client.http"},{"traceId":"854d20932ad6977700000000000003dc","step":"client.commit-send-queue"},{"traceId":"854d20932ad6977700000000000003db","step":"client.commit-send-queue"}]}]

| 854d20932ad6977700000000000003c6 | driver.queue.scheduler-late | 1.282 | none | 3 / 32 |
| 854d20932ad6977700000000000003c6 | driver.queue.scheduler-dispatch | 0.030 | none | 3 / 32 |

Observed active steps while trace 854d20932ad6977700000000000003c6 waited: []

| 854d20932ad6977700000000000003c5 | driver.queue.scheduler-late | 1.574 | none | 2 / 32 |
| 854d20932ad6977700000000000003c5 | driver.queue.scheduler-dispatch | 0.136 | none | 2 / 32 |

Observed active steps while trace 854d20932ad6977700000000000003c5 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 35.335 | 0.653 | 0.000 | 1.083 | 5.341 | 0.031 | 0.000 | 0.170 | 1.385 | 9.255 | 0.058 | n/a | 0.458 | 16.271 | n/a | n/a | 0.051 | 6.052 | 0.177 | 0.051 |
| p99 | 147.243 | 7.010 | 0.004 | 8.662 | 16.197 | 0.500 | 5.692 | 0.977 | 5.361 | 31.408 | 0.428 | n/a | 5.810 | 116.649 | n/a | n/a | 0.511 | 17.115 | 0.486 | 0.511 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad6977700000000000000f2 | 147.243 | 16.197 | 0.011 | 0.000 | 0.907 | 1.344 | 7.949 | 0.132 | n/a | 3.542 | 116.649 | n/a | n/a | 0.511 | 17.115 | 0.116 | 0.511 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000000f5 | 80.568 | 13.653 | 0.500 | 0.000 | 0.086 | 2.726 | 31.408 | 0.341 | n/a | 5.810 | 25.987 | n/a | n/a | 0.055 | 14.239 | 0.177 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000101 | 58.379 | 5.036 | 0.390 | 0.000 | 0.128 | 5.361 | 27.294 | 0.073 | n/a | 0.211 | 19.587 | n/a | n/a | 0.300 | 5.554 | 0.095 | 0.300 | gw-w/thread-47/gateway.admitted-work | none observed |
| 854d20932ad6977700000000000000fd | 55.132 | 8.088 | 0.344 | 0.000 | 0.132 | 2.645 | 25.604 | 0.052 | n/a | 0.152 | 18.029 | n/a | n/a | 0.085 | 8.564 | 0.155 | 0.085 | gw-w/thread-43/gateway.admitted-work | none observed |
| 854d20932ad6977700000000000000f9 | 53.387 | 5.398 | 0.318 | 0.000 | 0.117 | 1.678 | 23.215 | 0.058 | n/a | 0.138 | 22.363 | n/a | n/a | 0.102 | 5.833 | 0.109 | 0.102 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000119 | 49.969 | 9.127 | 0.010 | 5.692 | 0.977 | 1.793 | 4.264 | 0.102 | n/a | 0.966 | 26.991 | n/a | n/a | 0.048 | 15.806 | 0.316 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000111 | 46.740 | 9.178 | 0.312 | 0.000 | 0.072 | 5.356 | 9.362 | 0.064 | n/a | 0.446 | 21.899 | n/a | n/a | 0.051 | 9.562 | 0.205 | 0.051 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000107 | 46.319 | 4.361 | 0.203 | 0.000 | 0.166 | 1.385 | 14.805 | 0.045 | n/a | 1.856 | 23.458 | n/a | n/a | 0.040 | 4.729 | 0.102 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000103 | 43.109 | 9.358 | 0.006 | 0.000 | 0.214 | 1.448 | 3.532 | 0.101 | n/a | 1.246 | 27.093 | n/a | n/a | 0.111 | 9.578 | 0.222 | 0.111 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000010f | 40.614 | 5.114 | 0.339 | 0.456 | 0.081 | 1.709 | 21.779 | 0.063 | n/a | 0.194 | 10.837 | n/a | n/a | 0.042 | 5.990 | 0.147 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| 854d20932ad697770000000000000115 | 39.355 | 8.865 | 0.019 | 0.000 | 0.833 | 1.803 | 3.816 | 0.053 | n/a | 0.562 | 23.320 | n/a | n/a | 0.084 | 9.717 | 0.247 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000117 | 37.404 | 4.854 | 0.333 | 0.360 | 0.086 | 2.017 | 17.794 | 0.100 | n/a | 0.159 | 11.648 | n/a | n/a | 0.053 | 5.633 | 0.151 | 0.053 | gw-w/thread-45/gateway.admitted-work | none observed |
| 854d20932ad6977700000000000000fb | 37.184 | 5.894 | 0.008 | 0.000 | 0.520 | 1.052 | 1.942 | 0.063 | n/a | 0.914 | 26.632 | n/a | n/a | 0.158 | 6.422 | 0.173 | 0.158 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000105 | 35.957 | 4.441 | 0.206 | 0.000 | 0.086 | 1.420 | 10.914 | 0.052 | n/a | 0.458 | 18.331 | n/a | n/a | 0.049 | 4.733 | 0.132 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000123 | 35.335 | 6.114 | 0.292 | 0.281 | 0.179 | 1.764 | 9.255 | 0.428 | n/a | 0.676 | 16.271 | n/a | n/a | 0.074 | 6.866 | 0.194 | 0.074 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000011b | 35.207 | 4.665 | 0.356 | 0.439 | 0.122 | 1.811 | 12.292 | 0.076 | n/a | 0.112 | 15.266 | n/a | n/a | 0.067 | 5.582 | 0.159 | 0.067 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000129 | 34.557 | 3.894 | 0.472 | 0.000 | 0.076 | 1.365 | 12.056 | 0.081 | n/a | 0.648 | 15.917 | n/a | n/a | 0.049 | 4.443 | 0.129 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000010d | 34.074 | 5.341 | 0.184 | 0.000 | 0.079 | 1.578 | 9.883 | 0.052 | n/a | 0.632 | 16.280 | n/a | n/a | 0.047 | 5.604 | 0.164 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000011f | 32.172 | 3.559 | 0.196 | 0.246 | 0.071 | 1.251 | 9.883 | 0.056 | n/a | 0.357 | 16.513 | n/a | n/a | 0.041 | 4.071 | 0.127 | 0.041 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000109 | 29.576 | 5.877 | 0.005 | 0.000 | 0.170 | 1.000 | 11.046 | 0.065 | n/a | 0.119 | 11.253 | n/a | n/a | 0.041 | 6.052 | 0.205 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.825 | 1.058 | 0.000 | 2.292 | 5.038 | 0.008 | 0.000 | 0.725 | 1.020 | 1.944 | 0.046 | n/a | 0.556 | 11.885 | n/a | n/a | 0.057 | 6.962 | 0.295 | 0.057 |
| p99 | 39.355 | 2.760 | 0.000 | 8.662 | 12.946 | 0.031 | 1.975 | 0.833 | 1.803 | 4.721 | 0.067 | n/a | 0.914 | 26.632 | n/a | n/a | 0.441 | 13.284 | 0.486 | 0.441 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad697770000000000000115 | 39.355 | 8.865 | 0.019 | 0.000 | 0.833 | 1.803 | 3.816 | 0.053 | n/a | 0.562 | 23.320 | n/a | n/a | 0.084 | 9.717 | 0.247 | 0.084 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000000fb | 37.184 | 5.894 | 0.008 | 0.000 | 0.520 | 1.052 | 1.942 | 0.063 | n/a | 0.914 | 26.632 | n/a | n/a | 0.158 | 6.422 | 0.173 | 0.158 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000000f7 | 27.911 | 9.084 | 0.015 | 0.000 | 0.725 | 1.305 | 1.944 | 0.045 | n/a | 0.556 | 13.796 | n/a | n/a | 0.441 | 9.823 | 0.352 | 0.441 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000000ff | 27.309 | 12.946 | 0.031 | 0.000 | 0.307 | 0.902 | 2.684 | 0.042 | n/a | 0.116 | 9.999 | n/a | n/a | 0.282 | 13.284 | 0.486 | 0.282 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000121 | 25.825 | 5.038 | 0.012 | 1.975 | 0.588 | 0.972 | 4.721 | 0.046 | n/a | 0.119 | 12.297 | n/a | n/a | 0.057 | 7.614 | 0.295 | 0.057 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000011d | 22.151 | 4.420 | 0.006 | 1.798 | 0.738 | 1.020 | 1.632 | 0.045 | n/a | 0.562 | 11.885 | n/a | n/a | 0.047 | 6.962 | 0.314 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000125 | 19.983 | 4.218 | 0.008 | 0.000 | 0.822 | 1.185 | 2.192 | 0.067 | n/a | 0.760 | 10.681 | n/a | n/a | 0.051 | 5.047 | 0.253 | 0.051 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000127 | 16.486 | 3.837 | 0.006 | 0.000 | 0.381 | 0.810 | 1.830 | 0.045 | n/a | 0.341 | 9.189 | n/a | n/a | 0.047 | 4.224 | 0.256 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000113 | 12.339 | 3.474 | 0.005 | 0.000 | 0.798 | 0.776 | 1.337 | 0.047 | n/a | 0.099 | 5.766 | n/a | n/a | 0.037 | 4.277 | 0.347 | 0.037 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (2 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 36.586 | 0.000 | 0.000 | 0.379 | 3.859 | 0.195 | 0.000 | 0.061 | 1.645 | 17.895 | 0.068 | n/a | 0.136 | 8.591 | n/a | n/a | 0.042 | 4.345 | 0.107 | 0.042 |
| p99 | 43.297 | 0.288 | 0.000 | 0.397 | 4.089 | 0.235 | 0.448 | 0.079 | 2.945 | 21.759 | 0.167 | n/a | 0.233 | 17.340 | n/a | n/a | 0.097 | 4.621 | 0.119 | 0.097 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad69777000000000000012b | 43.297 | 3.859 | 0.235 | 0.448 | 0.079 | 2.945 | 17.895 | 0.167 | n/a | 0.233 | 17.340 | n/a | n/a | 0.097 | 4.621 | 0.107 | 0.097 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000017e | 36.586 | 4.089 | 0.195 | 0.000 | 0.061 | 1.645 | 21.759 | 0.068 | n/a | 0.136 | 8.591 | n/a | n/a | 0.042 | 4.345 | 0.119 | 0.042 | gw-w/thread-45/gateway.admitted-work | none observed |

## P2 / L1 / commit (40 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 32.320 | 0.599 | 0.000 | 1.222 | 5.364 | 0.039 | 0.000 | 0.208 | 1.521 | 5.524 | 0.062 | n/a | 0.395 | 14.419 | n/a | n/a | 0.057 | 6.076 | 0.201 | 0.057 |
| p99 | 132.453 | 5.589 | 0.002 | 6.365 | 14.913 | 0.430 | 3.307 | 7.500 | 4.000 | 24.994 | 2.916 | n/a | 4.363 | 120.550 | n/a | n/a | 0.276 | 17.686 | 0.625 | 0.276 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad697770000000000000134 | 132.453 | 4.821 | 0.005 | 0.000 | 0.781 | 4.000 | 2.071 | 0.044 | n/a | 0.124 | 120.550 | n/a | n/a | 0.058 | 5.607 | 0.042 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000141 | 125.593 | 3.694 | 0.283 | 0.000 | 0.118 | 1.679 | 24.803 | 0.083 | n/a | 0.441 | 94.428 | n/a | n/a | 0.064 | 4.094 | 0.033 | 0.064 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000017c | 66.211 | 4.158 | 0.280 | 0.000 | 0.078 | 1.737 | 11.255 | 0.062 | n/a | 0.144 | 48.451 | n/a | n/a | 0.046 | 4.516 | 0.068 | 0.046 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000136 | 61.388 | 7.603 | 0.287 | 0.000 | 0.089 | 2.282 | 15.684 | 0.089 | n/a | 3.190 | 32.098 | n/a | n/a | 0.065 | 7.979 | 0.130 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000147 | 60.215 | 5.114 | 0.203 | 0.000 | 0.078 | 2.088 | 21.626 | 0.148 | n/a | 4.363 | 26.549 | n/a | n/a | 0.047 | 5.395 | 0.090 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000014b | 54.555 | 6.896 | 0.430 | 0.610 | 0.207 | 2.418 | 21.725 | 0.157 | n/a | 2.639 | 19.361 | n/a | n/a | 0.113 | 8.143 | 0.149 | 0.113 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000174 | 50.799 | 8.374 | 0.260 | 0.000 | 0.077 | 1.918 | 11.142 | 0.059 | n/a | 0.533 | 28.388 | n/a | n/a | 0.047 | 8.712 | 0.171 | 0.047 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000143 | 49.325 | 6.092 | 0.241 | 0.624 | 0.093 | 2.389 | 16.171 | 0.128 | n/a | 1.529 | 22.007 | n/a | n/a | 0.051 | 7.051 | 0.143 | 0.051 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000012f | 45.097 | 6.220 | 0.223 | 0.372 | 0.078 | 1.437 | 17.875 | 2.916 | n/a | 0.120 | 15.806 | n/a | n/a | 0.049 | 6.894 | 0.153 | 0.049 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000013f | 45.087 | 4.131 | 0.282 | 0.426 | 0.078 | 1.936 | 17.039 | 0.060 | n/a | 0.458 | 20.621 | n/a | n/a | 0.057 | 4.916 | 0.109 | 0.057 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000168 | 44.565 | 5.490 | 0.294 | 0.422 | 0.123 | 1.521 | 24.994 | 0.059 | n/a | 0.123 | 11.448 | n/a | n/a | 0.092 | 6.328 | 0.142 | 0.092 | gw-w/thread-48/gateway.admitted-work | none observed |
| 854d20932ad69777000000000000014f | 42.694 | 14.913 | 0.039 | 1.918 | 0.816 | 2.050 | 3.789 | 0.057 | n/a | 0.579 | 18.469 | n/a | n/a | 0.063 | 17.686 | 0.414 | 0.063 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000014d | 41.396 | 5.955 | 0.006 | 3.307 | 0.824 | 0.962 | 2.152 | 0.037 | n/a | 0.849 | 27.266 | n/a | n/a | 0.038 | 10.092 | 0.244 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000016e | 39.395 | 4.753 | 0.201 | 0.755 | 0.080 | 1.320 | 14.613 | 0.051 | n/a | 3.252 | 14.307 | n/a | n/a | 0.063 | 5.790 | 0.147 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000152 | 38.898 | 4.083 | 0.278 | 0.000 | 0.139 | 1.273 | 17.820 | 0.058 | n/a | 0.618 | 14.351 | n/a | n/a | 0.276 | 4.501 | 0.116 | 0.276 | gw-w/thread-47/gateway.admitted-work | none observed |
| 854d20932ad697770000000000000139 | 38.271 | 4.503 | 0.304 | 0.396 | 0.135 | 1.492 | 13.828 | 0.057 | n/a | 0.100 | 17.391 | n/a | n/a | 0.065 | 5.337 | 0.139 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000138 | 37.118 | 11.952 | 0.010 | 0.000 | 0.800 | 3.469 | 6.888 | 0.106 | n/a | 0.838 | 12.933 | n/a | n/a | 0.121 | 12.761 | 0.344 | 0.121 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000172 | 36.694 | 5.377 | 0.208 | 0.000 | 0.065 | 1.765 | 11.844 | 0.062 | n/a | 0.665 | 16.667 | n/a | n/a | 0.041 | 5.650 | 0.154 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000164 | 35.492 | 3.868 | 0.236 | 0.000 | 0.143 | 2.059 | 12.486 | 0.094 | n/a | 0.533 | 16.007 | n/a | n/a | 0.065 | 4.247 | 0.120 | 0.065 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000158 | 34.191 | 6.173 | 0.333 | 0.460 | 0.083 | 1.749 | 11.377 | 0.146 | n/a | 0.173 | 13.639 | n/a | n/a | 0.058 | 7.048 | 0.206 | 0.058 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.322 | 0.725 | 0.000 | 1.487 | 3.760 | 0.005 | 0.000 | 0.781 | 0.921 | 1.739 | 0.048 | n/a | 0.278 | 8.371 | n/a | n/a | 0.056 | 4.415 | 0.256 | 0.056 |
| p99 | 132.453 | 1.273 | 0.002 | 2.070 | 11.952 | 0.012 | 1.577 | 7.500 | 4.000 | 6.888 | 0.378 | n/a | 0.838 | 120.550 | n/a | n/a | 0.121 | 12.827 | 0.625 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad697770000000000000134 | 132.453 | 4.821 | 0.005 | 0.000 | 0.781 | 4.000 | 2.071 | 0.044 | n/a | 0.124 | 120.550 | n/a | n/a | 0.058 | 5.607 | 0.042 | 0.058 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000138 | 37.118 | 11.952 | 0.010 | 0.000 | 0.800 | 3.469 | 6.888 | 0.106 | n/a | 0.838 | 12.933 | n/a | n/a | 0.121 | 12.761 | 0.344 | 0.121 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000179 | 20.529 | 3.744 | 0.005 | 1.577 | 7.500 | 0.808 | 1.214 | 0.041 | n/a | 0.344 | 5.232 | n/a | n/a | 0.063 | 12.827 | 0.625 | 0.063 | node-14/thread-0/driver.queue.subject | driver.publication 1.138ms; driver.expected-state.bind-receipt 1.034ms |
| 854d20932ad697770000000000000154 | 19.420 | 3.960 | 0.009 | 0.000 | 1.092 | 1.653 | 3.304 | 0.106 | n/a | 0.278 | 8.958 | n/a | n/a | 0.059 | 5.062 | 0.261 | 0.059 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000149 | 19.322 | 3.138 | 0.005 | 0.000 | 1.159 | 0.900 | 1.739 | 0.378 | n/a | 0.395 | 11.573 | n/a | n/a | 0.036 | 4.302 | 0.223 | 0.036 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000170 | 17.001 | 4.118 | 0.008 | 0.000 | 0.230 | 1.549 | 3.429 | 0.194 | n/a | 0.702 | 6.714 | n/a | n/a | 0.056 | 4.357 | 0.256 | 0.056 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000015e | 14.889 | 3.381 | 0.012 | 0.000 | 0.208 | 0.921 | 1.713 | 0.048 | n/a | 0.184 | 8.371 | n/a | n/a | 0.052 | 3.601 | 0.242 | 0.052 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000162 | 12.502 | 3.760 | 0.005 | 0.000 | 0.650 | 0.851 | 1.153 | 0.032 | n/a | 0.126 | 5.885 | n/a | n/a | 0.041 | 4.415 | 0.353 | 0.041 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 80.988 | n/a | n/a | n/a | 32.438 | 12.713 | 1.597 | 0.000 | 0.379 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.885 | 58.851 | 0.787 | 12.885 |
| p99 | 256.773 | n/a | n/a | n/a | 100.376 | 156.674 | 22.734 | 0.000 | 70.459 | 52.522 | 16.036 | n/a | 0.038 | 0.000 | n/a | n/a | 163.381 | 157.764 | 1.000 | 163.381 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad69777000000000000147b | 256.773 | 59.737 | 4.651 | 5.852 | 0.000 | 23.153 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 163.381 | 70.240 | 0.274 | 163.381 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.867ms; driver.publication 2.196ms; driver.publication 2.168ms; driver.publication 2.108ms; driver.publication 1.870ms |
| 854d20932ad69777000000000000147d | 197.479 | 38.119 | 2.014 | 3.383 | 0.000 | 0.303 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 153.661 | 43.515 | 0.220 | 153.661 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.108ms; driver.publication 1.870ms; driver.publication 1.576ms; driver.publication 1.425ms; driver.publication 1.215ms |
| 854d20932ad697770000000000001478 | 189.559 | 46.840 | 0.604 | 6.158 | 0.000 | 70.459 | 49.412 | 16.036 | n/a | 0.038 | 0.000 | n/a | n/a | 0.013 | 53.601 | 0.283 | 0.013 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.867ms; driver.publication 2.108ms; driver.publication 1.934ms; driver.publication 1.870ms; driver.publication 1.576ms |
| 854d20932ad6977700000000000003e5 | 177.853 | 15.372 | 54.908 | 0.000 | 0.000 | 0.367 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 107.206 | 70.280 | 0.395 | 107.206 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.057ms; driver.publication 1.737ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.418ms; driver.publication 1.390ms |
| 854d20932ad697770000000000001abf | 165.568 | 49.402 | 9.527 | 6.454 | 0.000 | 0.293 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 99.892 | 65.383 | 0.395 | 99.892 | node-14/thread-3/socket.wait-first-byte | driver.publication 10.795ms; driver.publication 1.816ms; driver.publication 1.333ms; driver.expected-state.bind-receipt 1.279ms; driver.expected-state.bind-receipt 1.251ms |
| 854d20932ad697770000000000001476 | 161.391 | 100.376 | 11.525 | 9.742 | 0.000 | 0.949 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 38.799 | 121.644 | 0.754 | 38.799 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.867ms; driver.expected-state.bind-receipt 2.180ms; driver.publication 2.108ms; driver.publication 2.079ms; driver.publication 1.934ms |
| 854d20932ad6977700000000000003f1 | 160.177 | 20.047 | 81.411 | 10.122 | 0.000 | 0.379 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 48.219 | 111.580 | 0.697 | 48.219 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.057ms; driver.publication 1.737ms; driver.expected-state.bind-receipt 1.721ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.418ms |
| 854d20932ad6977700000000000003c8 | 158.014 | 1.090 | 156.674 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.250 | 157.764 | 0.998 | 0.250 | node-14/thread-0/rpc.replica.observe | client.encode 3.460ms; driver.publication 3.188ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.275ms; driver.plan-and-encode-command 1.314ms |
| 854d20932ad6977700000000000003f2 | 157.577 | 12.524 | 111.538 | 0.000 | 0.000 | 0.414 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 33.101 | 124.062 | 0.787 | 33.101 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.057ms; driver.publication 1.737ms; driver.expected-state.bind-receipt 1.721ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.418ms |
| 854d20932ad697770000000000000e66 | 154.118 | 47.539 | 22.676 | 3.721 | 0.000 | 25.345 | 50.961 | 3.860 | n/a | 0.009 | 0.000 | n/a | n/a | 0.007 | 73.936 | 0.480 | 0.007 | gw-r/thread-46/gateway.response-write | driver.publication 1.539ms; driver.publication 1.118ms; driver.publication 1.086ms; driver.publication 1.059ms; driver.publication 1.006ms |
| 854d20932ad697770000000000001769 | 152.860 | 35.634 | 25.822 | 4.108 | 0.000 | 0.490 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 86.806 | 65.564 | 0.429 | 86.806 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.674ms; driver.publication 1.453ms; driver.publication 1.273ms; driver.publication 1.178ms; driver.publication 1.166ms |
| 854d20932ad6977700000000000003e4 | 151.328 | 67.726 | 57.207 | 7.122 | 0.000 | 1.400 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 17.874 | 132.054 | 0.873 | 17.874 | node-14/thread-3/client.reach-decode-and-cache | driver.publication 2.057ms; driver.publication 1.737ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.390ms; driver.publication 1.389ms |
| 854d20932ad6977700000000000003e6 | 150.845 | 23.451 | 40.779 | 2.571 | 0.000 | 3.327 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 80.718 | 66.801 | 0.443 | 80.718 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.057ms; driver.publication 1.737ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.390ms; driver.publication 1.389ms |
| 854d20932ad6977700000000000003c9 | 149.441 | 44.481 | 104.936 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 149.417 | 1.000 | 0.024 | node-14/thread-0/rpc.replica.observe | client.encode 3.460ms; driver.publication 2.616ms; driver.plan-and-encode-command 1.314ms; driver.expected-state.bind-receipt 1.009ms |
| 854d20932ad6977700000000000003e8 | 144.714 | 25.400 | 18.633 | 1.127 | 0.000 | 0.866 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 98.687 | 45.161 | 0.312 | 98.687 | node-14/thread-3/socket.wait-first-byte | driver.publication 2.057ms; driver.publication 1.737ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.418ms; driver.publication 1.390ms |
| 854d20932ad697770000000000000e6a | 143.894 | 19.995 | 47.589 | 0.000 | 0.000 | 0.392 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 75.919 | 67.583 | 0.470 | 75.919 | node-14/thread-3/socket.wait-first-byte | driver.publication 1.539ms; driver.publication 1.118ms; driver.publication 1.059ms; driver.publication 1.006ms |
| 854d20932ad69777000000000000176d | 134.083 | 27.986 | 103.873 | 0.000 | 0.000 | 0.591 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.633 | 131.859 | 0.983 | 1.633 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.674ms; driver.publication 1.307ms; driver.publication 1.178ms; driver.publication 1.166ms; driver.publication 1.134ms |
| 854d20932ad6977700000000000003f4 | 129.377 | 28.603 | 87.540 | 0.000 | 0.000 | 0.348 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.885 | 116.143 | 0.898 | 12.885 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 2.057ms; driver.publication 1.418ms; driver.publication 1.390ms; driver.publication 1.389ms; driver.publication 1.337ms |
| 854d20932ad697770000000000000e72 | 120.601 | 35.607 | 72.168 | 0.000 | 0.000 | 0.323 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 12.503 | 107.776 | 0.894 | 12.503 | node-14/thread-0/rpc.gateway-observer.observe | driver.publication 1.539ms; driver.publication 1.118ms; driver.publication 1.059ms |
| 854d20932ad6977700000000000002f2 | 115.719 | 51.186 | 5.537 | 5.766 | 0.000 | 0.679 | 52.522 | 0.004 | n/a | 0.011 | 0.000 | n/a | n/a | 0.013 | 62.489 | 0.540 | 0.013 | gw-r/thread-45/gateway.response-write | driver.publication 1.359ms; driver.publication 1.252ms; driver.publication 1.135ms; driver.publication 1.067ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 27.610 | 0.667 | 0.000 | 1.247 | 5.006 | 0.209 | 0.000 | 0.182 | 1.685 | 5.936 | 0.068 | n/a | 0.484 | 10.989 | n/a | n/a | 0.066 | 5.595 | 0.218 | 0.066 |
| p99 | 58.646 | 4.091 | 0.004 | 4.275 | 11.142 | 0.452 | 0.538 | 1.189 | 5.666 | 16.965 | 0.156 | n/a | 3.521 | 28.582 | n/a | n/a | 0.137 | 11.443 | 0.412 | 0.137 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad6977700000000000001c4 | 58.646 | 4.304 | 0.267 | 0.000 | 0.101 | 5.666 | 16.034 | 0.106 | n/a | 3.521 | 28.582 | n/a | n/a | 0.066 | 4.672 | 0.080 | 0.066 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000192 | 44.688 | 8.155 | 0.452 | 0.000 | 0.097 | 3.453 | 16.561 | 0.065 | n/a | 0.687 | 15.130 | n/a | n/a | 0.088 | 8.704 | 0.195 | 0.088 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000189 | 44.684 | 5.136 | 0.296 | 0.000 | 0.208 | 2.273 | 14.579 | 0.136 | n/a | 1.348 | 20.614 | n/a | n/a | 0.093 | 5.640 | 0.126 | 0.093 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000194 | 42.323 | 7.297 | 0.255 | 0.454 | 0.087 | 1.811 | 16.965 | 0.125 | n/a | 0.888 | 14.369 | n/a | n/a | 0.073 | 8.093 | 0.191 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000186 | 39.107 | 4.859 | 0.300 | 0.000 | 0.104 | 2.187 | 14.734 | 0.048 | n/a | 0.651 | 16.101 | n/a | n/a | 0.124 | 5.263 | 0.135 | 0.124 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001a0 | 38.627 | 5.075 | 0.269 | 0.312 | 0.113 | 2.014 | 16.919 | 0.146 | n/a | 0.861 | 12.851 | n/a | n/a | 0.067 | 5.770 | 0.149 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001a6 | 38.304 | 5.051 | 0.250 | 0.402 | 0.069 | 2.069 | 9.950 | 0.120 | n/a | 0.310 | 20.038 | n/a | n/a | 0.046 | 5.771 | 0.151 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000019a | 37.613 | 5.177 | 0.259 | 0.423 | 0.115 | 1.976 | 12.537 | 0.115 | n/a | 0.728 | 16.206 | n/a | n/a | 0.076 | 5.974 | 0.159 | 0.076 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001a8 | 36.130 | 4.283 | 0.209 | 0.000 | 0.072 | 1.685 | 12.671 | 0.056 | n/a | 3.357 | 13.750 | n/a | n/a | 0.047 | 4.564 | 0.126 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001ca | 35.733 | 8.693 | 0.230 | 0.488 | 0.051 | 1.748 | 5.936 | 0.054 | n/a | 0.219 | 18.259 | n/a | n/a | 0.056 | 9.462 | 0.265 | 0.056 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000019e | 35.531 | 4.202 | 0.262 | 0.538 | 0.127 | 1.906 | 15.562 | 0.068 | n/a | 1.154 | 11.646 | n/a | n/a | 0.066 | 5.129 | 0.144 | 0.066 | gw-w/thread-43/gateway.admitted-work | none observed |
| 854d20932ad697770000000000000182 | 33.205 | 5.667 | 0.248 | 0.000 | 0.120 | 1.831 | 11.671 | 0.073 | n/a | 0.115 | 13.407 | n/a | n/a | 0.072 | 6.035 | 0.182 | 0.072 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001ba | 32.086 | 6.825 | 0.007 | 0.000 | 0.218 | 3.680 | 4.741 | 0.128 | n/a | 0.169 | 16.266 | n/a | n/a | 0.051 | 7.051 | 0.220 | 0.051 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000184 | 31.462 | 5.006 | 0.012 | 0.000 | 0.364 | 1.229 | 7.049 | 0.052 | n/a | 0.439 | 17.224 | n/a | n/a | 0.087 | 5.382 | 0.171 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001ac | 29.820 | 5.561 | 0.273 | 0.373 | 0.071 | 2.000 | 11.740 | 0.068 | n/a | 0.174 | 9.496 | n/a | n/a | 0.065 | 6.278 | 0.211 | 0.065 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001bc | 29.656 | 5.913 | 0.253 | 0.000 | 0.074 | 2.829 | 10.493 | 0.052 | n/a | 0.116 | 9.852 | n/a | n/a | 0.074 | 6.240 | 0.210 | 0.074 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000018b | 29.654 | 4.814 | 0.007 | 0.000 | 0.947 | 0.871 | 2.781 | 0.050 | n/a | 0.603 | 19.537 | n/a | n/a | 0.046 | 5.767 | 0.194 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001c2 | 28.167 | 4.193 | 0.245 | 0.000 | 0.066 | 1.821 | 10.464 | 0.130 | n/a | 0.936 | 10.240 | n/a | n/a | 0.072 | 4.505 | 0.160 | 0.072 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000019c | 27.782 | 11.142 | 0.007 | 0.000 | 0.295 | 0.828 | 2.205 | 0.038 | n/a | 0.120 | 13.087 | n/a | n/a | 0.061 | 11.443 | 0.412 | 0.061 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001b8 | 27.610 | 4.636 | 0.371 | 0.000 | 0.140 | 2.451 | 8.084 | 0.116 | n/a | 0.166 | 11.509 | n/a | n/a | 0.137 | 5.147 | 0.186 | 0.137 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 18.119 | 0.782 | 0.000 | 1.763 | 4.396 | 0.008 | 0.000 | 0.657 | 1.201 | 2.075 | 0.049 | n/a | 0.481 | 9.913 | n/a | n/a | 0.061 | 5.201 | 0.282 | 0.061 |
| p99 | 31.462 | 1.775 | 0.000 | 4.275 | 6.226 | 0.032 | 0.000 | 1.189 | 1.608 | 7.049 | 0.156 | n/a | 1.107 | 17.224 | n/a | n/a | 0.091 | 7.301 | 0.380 | 0.091 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad697770000000000000184 | 31.462 | 5.006 | 0.012 | 0.000 | 0.364 | 1.229 | 7.049 | 0.052 | n/a | 0.439 | 17.224 | n/a | n/a | 0.087 | 5.382 | 0.171 | 0.087 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001b4 | 23.502 | 5.993 | 0.017 | 0.000 | 0.617 | 1.608 | 3.429 | 0.156 | n/a | 0.481 | 11.142 | n/a | n/a | 0.059 | 6.626 | 0.282 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001aa | 21.164 | 6.226 | 0.007 | 0.000 | 1.069 | 1.428 | 1.454 | 0.043 | n/a | 0.170 | 10.737 | n/a | n/a | 0.031 | 7.301 | 0.345 | 0.031 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000180 | 18.805 | 3.856 | 0.011 | 0.000 | 0.227 | 1.253 | 1.893 | 0.049 | n/a | 0.623 | 10.832 | n/a | n/a | 0.061 | 4.094 | 0.218 | 0.061 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000190 | 18.652 | 4.396 | 0.010 | 0.000 | 1.189 | 0.977 | 1.260 | 0.038 | n/a | 0.497 | 10.205 | n/a | n/a | 0.080 | 5.595 | 0.300 | 0.080 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000196 | 18.119 | 3.642 | 0.006 | 0.000 | 0.811 | 1.423 | 4.339 | 0.108 | n/a | 1.107 | 6.624 | n/a | n/a | 0.059 | 4.460 | 0.246 | 0.059 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000198 | 17.054 | 5.742 | 0.032 | 0.000 | 0.710 | 0.981 | 2.096 | 0.042 | n/a | 0.516 | 6.864 | n/a | n/a | 0.071 | 6.484 | 0.380 | 0.071 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001c8 | 17.043 | 3.873 | 0.005 | 0.000 | 0.980 | 0.739 | 1.306 | 0.040 | n/a | 0.125 | 9.913 | n/a | n/a | 0.063 | 4.859 | 0.285 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001cc | 16.057 | 4.537 | 0.008 | 0.000 | 0.657 | 1.103 | 2.075 | 0.085 | n/a | 0.185 | 7.317 | n/a | n/a | 0.091 | 5.201 | 0.324 | 0.091 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001c0 | 13.681 | 3.413 | 0.005 | 0.000 | 0.410 | 1.201 | 2.685 | 0.099 | n/a | 0.653 | 5.168 | n/a | n/a | 0.047 | 3.828 | 0.280 | 0.047 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.038 | 0.597 | 0.000 | 1.476 | 4.499 | 0.019 | 0.000 | 0.204 | 1.417 | 6.370 | 0.069 | n/a | 0.241 | 12.895 | n/a | n/a | 0.063 | 5.142 | 0.172 | 0.063 |
| p99 | 240.023 | 2.893 | 0.014 | 4.413 | 21.732 | 0.663 | 0.866 | 1.119 | 4.974 | 103.931 | 0.629 | n/a | 4.819 | 220.788 | n/a | n/a | 0.120 | 22.269 | 0.389 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad69777000000000000020d | 240.023 | 4.124 | 0.212 | 0.239 | 0.052 | 1.323 | 12.540 | 0.062 | n/a | 0.615 | 220.788 | n/a | n/a | 0.069 | 4.627 | 0.019 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001fb | 123.290 | 4.457 | 0.329 | 0.277 | 0.058 | 1.333 | 103.931 | 0.048 | n/a | 0.562 | 12.247 | n/a | n/a | 0.049 | 5.120 | 0.042 | 0.049 | gw-w/thread-47/gateway.admitted-work | none observed |
| 854d20932ad6977700000000000001f3 | 66.709 | 21.732 | 0.019 | 0.000 | 0.518 | 3.552 | 26.821 | 0.192 | n/a | 4.819 | 9.010 | n/a | n/a | 0.046 | 22.269 | 0.334 | 0.046 | node-14/thread-0/client.validation-and-staging | none observed |
| 854d20932ad6977700000000000001fd | 61.197 | 4.285 | 0.354 | 0.317 | 0.057 | 1.641 | 36.622 | 0.052 | n/a | 0.501 | 17.278 | n/a | n/a | 0.090 | 5.014 | 0.082 | 0.090 | gw-w/thread-43/gateway.admitted-work | none observed |
| 854d20932ad6977700000000000001f1 | 52.102 | 8.000 | 0.504 | 0.866 | 0.142 | 2.618 | 10.775 | 0.136 | n/a | 0.241 | 28.701 | n/a | n/a | 0.120 | 9.511 | 0.183 | 0.120 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001e1 | 50.579 | 7.308 | 0.273 | 0.340 | 0.059 | 1.520 | 18.098 | 0.072 | n/a | 0.393 | 22.445 | n/a | n/a | 0.071 | 7.981 | 0.158 | 0.071 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001d7 | 49.003 | 4.908 | 0.005 | 0.000 | 0.265 | 2.465 | 7.324 | 0.034 | n/a | 1.459 | 32.516 | n/a | n/a | 0.026 | 5.179 | 0.106 | 0.026 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 1.197ms |
| 854d20932ad697770000000000000209 | 44.801 | 6.109 | 0.337 | 0.487 | 0.108 | 2.649 | 15.040 | 0.075 | n/a | 0.134 | 19.745 | n/a | n/a | 0.117 | 7.041 | 0.157 | 0.117 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001da | 42.779 | 5.311 | 0.240 | 0.480 | 0.053 | 1.817 | 16.918 | 0.050 | n/a | 4.134 | 13.713 | n/a | n/a | 0.063 | 6.084 | 0.142 | 0.063 | gw-w/thread-46/gateway.admitted-work | none observed |
| 854d20932ad69777000000000000021b | 42.660 | 4.970 | 0.296 | 0.000 | 0.068 | 2.909 | 25.768 | 0.109 | n/a | 0.618 | 7.857 | n/a | n/a | 0.066 | 5.334 | 0.125 | 0.066 | gw-w/thread-47/gateway.admitted-work | none observed |
| 854d20932ad69777000000000000020f | 40.438 | 4.325 | 0.006 | 0.000 | 0.204 | 1.720 | 2.837 | 0.155 | n/a | 0.243 | 30.863 | n/a | n/a | 0.084 | 4.536 | 0.112 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000213 | 38.241 | 3.749 | 0.223 | 0.327 | 0.091 | 4.832 | 10.040 | 0.102 | n/a | 0.163 | 18.630 | n/a | n/a | 0.085 | 4.390 | 0.115 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001e2 | 37.001 | 8.457 | 0.015 | 0.000 | 1.000 | 0.855 | 6.312 | 0.129 | n/a | 0.192 | 19.977 | n/a | n/a | 0.066 | 9.471 | 0.256 | 0.066 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000205 | 34.780 | 4.702 | 0.359 | 0.248 | 0.135 | 1.768 | 9.593 | 0.061 | n/a | 0.395 | 17.399 | n/a | n/a | 0.120 | 5.445 | 0.157 | 0.120 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000207 | 31.246 | 4.128 | 0.005 | 0.000 | 0.434 | 1.377 | 2.861 | 0.093 | n/a | 0.715 | 21.594 | n/a | n/a | 0.039 | 4.567 | 0.146 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001e5 | 30.222 | 3.708 | 0.006 | 0.000 | 0.212 | 1.585 | 6.644 | 0.095 | n/a | 0.176 | 17.759 | n/a | n/a | 0.037 | 3.926 | 0.130 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000211 | 29.654 | 3.786 | 0.245 | 0.317 | 0.054 | 1.399 | 6.370 | 0.080 | n/a | 0.123 | 17.217 | n/a | n/a | 0.063 | 4.402 | 0.148 | 0.063 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001e8 | 29.363 | 6.106 | 0.006 | 0.000 | 0.754 | 0.952 | 1.587 | 0.038 | n/a | 0.482 | 19.375 | n/a | n/a | 0.064 | 6.866 | 0.234 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000219 | 29.141 | 3.545 | 0.206 | 0.000 | 0.065 | 1.598 | 9.829 | 0.629 | n/a | 3.074 | 10.144 | n/a | n/a | 0.049 | 3.817 | 0.131 | 0.049 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000020a | 29.115 | 7.890 | 0.010 | 0.000 | 0.815 | 0.880 | 1.538 | 0.051 | n/a | 0.107 | 17.769 | n/a | n/a | 0.055 | 8.715 | 0.299 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 26.025 | 1.051 | 0.000 | 1.762 | 4.325 | 0.006 | 0.000 | 0.705 | 1.095 | 1.729 | 0.051 | n/a | 0.176 | 15.436 | n/a | n/a | 0.055 | 4.645 | 0.234 | 0.055 |
| p99 | 40.438 | 2.802 | 0.014 | 4.413 | 7.890 | 0.013 | 0.000 | 1.119 | 1.720 | 6.931 | 0.155 | n/a | 1.543 | 30.863 | n/a | n/a | 0.095 | 8.715 | 0.389 | 0.095 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad69777000000000000020f | 40.438 | 4.325 | 0.006 | 0.000 | 0.204 | 1.720 | 2.837 | 0.155 | n/a | 0.243 | 30.863 | n/a | n/a | 0.084 | 4.536 | 0.112 | 0.084 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000207 | 31.246 | 4.128 | 0.005 | 0.000 | 0.434 | 1.377 | 2.861 | 0.093 | n/a | 0.715 | 21.594 | n/a | n/a | 0.039 | 4.567 | 0.146 | 0.039 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001e5 | 30.222 | 3.708 | 0.006 | 0.000 | 0.212 | 1.585 | 6.644 | 0.095 | n/a | 0.176 | 17.759 | n/a | n/a | 0.037 | 3.926 | 0.130 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001e8 | 29.363 | 6.106 | 0.006 | 0.000 | 0.754 | 0.952 | 1.587 | 0.038 | n/a | 0.482 | 19.375 | n/a | n/a | 0.064 | 6.866 | 0.234 | 0.064 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000020a | 29.115 | 7.890 | 0.010 | 0.000 | 0.815 | 0.880 | 1.538 | 0.051 | n/a | 0.107 | 17.769 | n/a | n/a | 0.055 | 8.715 | 0.299 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001d6 | 29.038 | 3.119 | 0.006 | 0.000 | 0.259 | 1.690 | 1.648 | 0.049 | n/a | 0.131 | 22.099 | n/a | n/a | 0.038 | 3.384 | 0.117 | 0.038 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001ed | 27.546 | 3.479 | 0.006 | 0.000 | 0.727 | 0.966 | 6.931 | 0.099 | n/a | 0.162 | 15.131 | n/a | n/a | 0.046 | 4.212 | 0.153 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001f9 | 26.025 | 4.833 | 0.008 | 0.000 | 1.119 | 0.817 | 1.305 | 0.039 | n/a | 0.079 | 17.748 | n/a | n/a | 0.078 | 5.960 | 0.229 | 0.078 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000201 | 24.458 | 5.064 | 0.005 | 0.000 | 0.705 | 1.095 | 1.596 | 0.047 | n/a | 0.472 | 15.436 | n/a | n/a | 0.039 | 5.773 | 0.236 | 0.039 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001df | 19.945 | 4.682 | 0.013 | 0.000 | 0.950 | 1.336 | 2.929 | 0.137 | n/a | 1.543 | 8.260 | n/a | n/a | 0.095 | 5.645 | 0.283 | 0.095 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001d0 | 17.434 | 3.228 | 0.006 | 0.000 | 0.351 | 1.155 | 2.142 | 0.073 | n/a | 0.189 | 10.233 | n/a | n/a | 0.057 | 3.585 | 0.206 | 0.057 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001d2 | 17.335 | 3.764 | 0.007 | 0.000 | 0.874 | 1.237 | 1.485 | 0.049 | n/a | 0.140 | 9.727 | n/a | n/a | 0.052 | 4.645 | 0.268 | 0.052 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000215 | 16.586 | 3.211 | 0.005 | 0.000 | 0.786 | 0.691 | 1.729 | 0.045 | n/a | 0.124 | 9.936 | n/a | n/a | 0.060 | 4.002 | 0.241 | 0.060 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000001eb | 15.184 | 4.720 | 0.010 | 0.000 | 0.619 | 0.924 | 2.580 | 0.132 | n/a | 0.986 | 5.133 | n/a | n/a | 0.080 | 5.349 | 0.352 | 0.080 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000021f | 12.428 | 4.499 | 0.006 | 0.000 | 0.328 | 0.957 | 1.331 | 0.038 | n/a | 0.127 | 5.088 | n/a | n/a | 0.055 | 4.833 | 0.389 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 25.005 | 0.819 | 0.000 | 1.907 | 4.673 | 0.011 | 0.000 | 0.291 | 1.218 | 4.401 | 0.045 | n/a | 0.369 | 10.324 | n/a | n/a | 0.057 | 5.261 | 0.238 | 0.057 |
| p99 | 49.783 | 3.990 | 0.022 | 5.885 | 12.151 | 0.431 | 0.566 | 4.031 | 6.018 | 28.943 | 4.237 | n/a | 13.034 | 27.660 | n/a | n/a | 0.166 | 12.345 | 0.487 | 0.166 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad69777000000000000022f | 49.783 | 7.224 | 0.431 | 0.000 | 0.079 | 2.206 | 11.915 | 0.052 | n/a | 0.116 | 27.660 | n/a | n/a | 0.099 | 7.735 | 0.155 | 0.099 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000024d | 43.504 | 5.458 | 0.008 | 0.000 | 1.058 | 2.647 | 5.480 | 4.237 | n/a | 0.090 | 24.458 | n/a | n/a | 0.069 | 6.523 | 0.150 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.599ms; driver.expected-state.bind-receipt 1.026ms |
| 854d20932ad69777000000000000025c | 42.243 | 4.115 | 0.316 | 0.000 | 0.072 | 1.638 | 28.943 | 0.037 | n/a | 0.127 | 6.930 | n/a | n/a | 0.065 | 4.503 | 0.107 | 0.065 | gw-w/thread-45/gateway.admitted-work | none observed |
| 854d20932ad697770000000000000252 | 42.180 | 8.267 | 0.412 | 0.000 | 0.196 | 3.567 | 12.002 | 0.067 | n/a | 0.476 | 17.026 | n/a | n/a | 0.166 | 8.875 | 0.210 | 0.166 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000024c | 41.777 | 8.135 | 0.014 | 0.000 | 0.170 | 1.269 | 3.542 | 0.086 | n/a | 13.034 | 15.391 | n/a | n/a | 0.138 | 8.319 | 0.199 | 0.138 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000234 | 40.327 | 6.950 | 0.005 | 0.000 | 0.924 | 1.186 | 7.548 | 0.033 | n/a | 4.208 | 19.429 | n/a | n/a | 0.043 | 7.879 | 0.195 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000027b | 40.242 | 4.637 | 0.309 | 0.318 | 0.058 | 1.867 | 14.745 | 0.052 | n/a | 0.562 | 17.621 | n/a | n/a | 0.073 | 5.322 | 0.132 | 0.073 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000236 | 39.930 | 4.862 | 0.256 | 0.000 | 0.079 | 2.080 | 17.471 | 0.054 | n/a | 0.444 | 14.619 | n/a | n/a | 0.065 | 5.197 | 0.130 | 0.065 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000248 | 39.718 | 6.215 | 0.335 | 0.000 | 0.072 | 2.137 | 9.643 | 0.060 | n/a | 0.529 | 20.679 | n/a | n/a | 0.050 | 6.622 | 0.167 | 0.050 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000265 | 36.362 | 5.383 | 0.276 | 0.000 | 0.021 | 1.363 | 6.059 | 0.037 | n/a | 0.291 | 22.862 | n/a | n/a | 0.070 | 5.680 | 0.156 | 0.070 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.197ms; driver.publication 1.701ms |
| 854d20932ad697770000000000000246 | 35.355 | 4.526 | 0.364 | 0.000 | 0.099 | 1.405 | 11.766 | 0.049 | n/a | 0.329 | 16.733 | n/a | n/a | 0.084 | 4.989 | 0.141 | 0.084 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000025e | 34.494 | 9.367 | 0.008 | 0.000 | 0.741 | 1.248 | 3.877 | 0.083 | n/a | 0.188 | 18.886 | n/a | n/a | 0.095 | 10.116 | 0.293 | 0.095 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000224 | 32.861 | 3.757 | 0.212 | 0.000 | 0.063 | 1.295 | 12.374 | 0.047 | n/a | 0.598 | 14.478 | n/a | n/a | 0.038 | 4.032 | 0.123 | 0.038 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000281 | 30.792 | 5.235 | 0.274 | 0.566 | 0.065 | 1.408 | 13.031 | 0.041 | n/a | 0.108 | 10.007 | n/a | n/a | 0.058 | 6.140 | 0.199 | 0.058 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000264 | 30.083 | 9.003 | 0.006 | 0.000 | 0.652 | 0.804 | 1.283 | 0.034 | n/a | 0.428 | 17.795 | n/a | n/a | 0.078 | 9.661 | 0.321 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000240 | 29.571 | 8.029 | 0.008 | 0.000 | 0.473 | 1.082 | 4.401 | 0.035 | n/a | 0.084 | 15.363 | n/a | n/a | 0.096 | 8.510 | 0.288 | 0.096 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000276 | 28.356 | 4.815 | 0.005 | 0.000 | 0.592 | 0.593 | 4.978 | 0.042 | n/a | 0.090 | 17.201 | n/a | n/a | 0.040 | 5.413 | 0.191 | 0.040 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000022a | 28.103 | 5.237 | 0.006 | 0.000 | 0.907 | 1.732 | 1.522 | 0.030 | n/a | 0.505 | 18.098 | n/a | n/a | 0.065 | 6.150 | 0.219 | 0.065 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000232 | 27.722 | 3.764 | 0.006 | 0.000 | 0.767 | 0.860 | 1.691 | 0.054 | n/a | 0.111 | 20.415 | n/a | n/a | 0.054 | 4.536 | 0.164 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000287 | 27.609 | 4.430 | 0.188 | 0.384 | 0.065 | 1.399 | 5.955 | 0.055 | n/a | 0.117 | 14.970 | n/a | n/a | 0.046 | 5.067 | 0.184 | 0.046 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (17 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 19.001 | 0.884 | 0.000 | 1.973 | 4.168 | 0.006 | 0.000 | 0.849 | 0.907 | 1.691 | 0.042 | n/a | 0.378 | 8.118 | n/a | n/a | 0.048 | 4.936 | 0.331 | 0.048 |
| p99 | 43.504 | 3.847 | 0.022 | 4.367 | 7.594 | 0.020 | 0.000 | 4.031 | 6.018 | 8.257 | 4.237 | n/a | 3.479 | 24.458 | n/a | n/a | 0.131 | 11.303 | 0.462 | 0.131 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad69777000000000000024d | 43.504 | 5.458 | 0.008 | 0.000 | 1.058 | 2.647 | 5.480 | 4.237 | n/a | 0.090 | 24.458 | n/a | n/a | 0.069 | 6.523 | 0.150 | 0.069 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.599ms; driver.expected-state.bind-receipt 1.026ms |
| 854d20932ad697770000000000000232 | 27.722 | 3.764 | 0.006 | 0.000 | 0.767 | 0.860 | 1.691 | 0.054 | n/a | 0.111 | 20.415 | n/a | n/a | 0.054 | 4.536 | 0.164 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000260 | 24.720 | 7.594 | 0.020 | 0.000 | 0.849 | 1.376 | 5.920 | 0.068 | n/a | 0.217 | 8.547 | n/a | n/a | 0.131 | 8.462 | 0.342 | 0.131 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000262 | 24.489 | 7.260 | 0.011 | 0.000 | 4.031 | 0.760 | 2.468 | 0.045 | n/a | 0.422 | 9.415 | n/a | n/a | 0.075 | 11.303 | 0.462 | 0.075 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.526ms; driver.expected-state.bind-receipt 1.083ms |
| 854d20932ad69777000000000000026c | 22.987 | 4.447 | 0.005 | 0.000 | 0.760 | 6.018 | 7.028 | 0.062 | n/a | 0.411 | 4.212 | n/a | n/a | 0.043 | 5.212 | 0.227 | 0.043 | node-14/thread-0/socket.wait-first-byte | none observed |
| 854d20932ad69777000000000000022c | 22.276 | 6.601 | 0.005 | 0.000 | 0.987 | 0.724 | 1.290 | 0.030 | n/a | 0.396 | 12.199 | n/a | n/a | 0.045 | 7.592 | 0.341 | 0.045 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000271 | 21.266 | 4.168 | 0.007 | 0.000 | 0.266 | 0.771 | 8.257 | 0.042 | n/a | 0.103 | 7.609 | n/a | n/a | 0.043 | 4.441 | 0.209 | 0.043 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000223 | 20.711 | 4.683 | 0.005 | 0.000 | 0.248 | 4.794 | 4.315 | 0.097 | n/a | 3.479 | 3.039 | n/a | n/a | 0.051 | 4.936 | 0.238 | 0.051 | node-14/thread-0/socket.wait-first-byte | none observed |
| 854d20932ad69777000000000000027f | 19.001 | 5.667 | 0.012 | 0.000 | 0.938 | 1.064 | 1.304 | 0.042 | n/a | 0.170 | 9.701 | n/a | n/a | 0.102 | 6.617 | 0.348 | 0.102 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000228 | 18.469 | 3.702 | 0.005 | 0.000 | 1.099 | 0.929 | 1.094 | 0.032 | n/a | 0.378 | 11.192 | n/a | n/a | 0.038 | 4.806 | 0.260 | 0.038 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000238 | 16.442 | 4.015 | 0.005 | 0.000 | 0.200 | 0.907 | 1.049 | 0.035 | n/a | 0.356 | 9.824 | n/a | n/a | 0.048 | 4.221 | 0.257 | 0.048 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000256 | 15.911 | 4.034 | 0.009 | 0.000 | 1.218 | 0.886 | 1.376 | 0.048 | n/a | 0.137 | 8.118 | n/a | n/a | 0.085 | 5.261 | 0.331 | 0.085 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000285 | 15.130 | 3.542 | 0.005 | 0.000 | 0.903 | 0.574 | 2.945 | 0.036 | n/a | 0.459 | 6.628 | n/a | n/a | 0.038 | 4.450 | 0.294 | 0.038 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000279 | 14.459 | 4.152 | 0.005 | 0.000 | 0.638 | 0.701 | 1.090 | 0.037 | n/a | 0.445 | 7.359 | n/a | n/a | 0.031 | 4.796 | 0.332 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000267 | 13.980 | 5.408 | 0.008 | 0.000 | 0.580 | 0.960 | 1.161 | 0.034 | n/a | 0.118 | 5.655 | n/a | n/a | 0.057 | 5.996 | 0.429 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000283 | 12.678 | 3.274 | 0.006 | 0.000 | 1.060 | 1.114 | 1.825 | 0.071 | n/a | 0.601 | 4.684 | n/a | n/a | 0.043 | 4.341 | 0.342 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000242 | 10.430 | 3.504 | 0.006 | 0.000 | 0.596 | 0.710 | 1.027 | 0.031 | n/a | 0.388 | 4.128 | n/a | n/a | 0.040 | 4.105 | 0.394 | 0.040 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.763 | 0.447 | 0.000 | 1.030 | 3.813 | 0.051 | 0.000 | 0.117 | 1.201 | 2.454 | 0.045 | n/a | 0.137 | 9.706 | n/a | n/a | 0.056 | 4.254 | 0.225 | 0.056 |
| p99 | 139.211 | 3.803 | 0.005 | 4.859 | 20.881 | n/a | 0.347 | 24.329 | 4.520 | 24.065 | 0.095 | n/a | 0.974 | 111.447 | n/a | n/a | 0.114 | 45.261 | 0.657 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad6977700000000000002ac | 139.211 | 3.415 | 0.222 | 0.000 | 0.069 | 1.383 | 22.263 | 0.044 | n/a | 0.323 | 111.447 | n/a | n/a | 0.046 | 3.706 | 0.027 | 0.046 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002ad | 97.871 | 5.795 | 0.007 | 0.000 | 1.033 | 1.250 | 1.748 | 0.053 | n/a | 0.175 | 87.767 | n/a | n/a | 0.043 | 6.835 | 0.070 | 0.043 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002d3 | 68.915 | 20.881 | 0.051 | 0.000 | 24.329 | 1.457 | 3.006 | 0.063 | n/a | 0.223 | 18.808 | n/a | n/a | 0.097 | 45.261 | 0.657 | 0.097 | node-14/thread-0/driver.queue.scheduler-late | none observed |
| 854d20932ad697770000000000000296 | 51.898 | 4.780 | 0.258 | 0.271 | 0.066 | 1.354 | 22.703 | 0.053 | n/a | 0.338 | 21.998 | n/a | n/a | 0.076 | 5.375 | 0.104 | 0.076 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002d9 | 41.927 | 3.593 | 0.182 | 0.000 | 0.059 | 1.324 | 24.065 | 0.053 | n/a | 0.106 | 12.472 | n/a | n/a | 0.072 | 3.834 | 0.091 | 0.072 | gw-w/thread-47/gateway.admitted-work | none observed |
| 854d20932ad69777000000000000028f | 32.645 | 5.499 | 0.338 | 0.287 | 0.117 | 1.177 | 10.532 | 0.054 | n/a | 0.312 | 14.221 | n/a | n/a | 0.107 | 6.242 | 0.191 | 0.107 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000028b | 30.343 | 3.619 | 0.219 | 0.347 | 0.068 | 1.323 | 14.183 | 0.048 | n/a | 0.103 | 10.369 | n/a | n/a | 0.063 | 4.254 | 0.140 | 0.063 | gw-w/thread-45/gateway.admitted-work | none observed |
| 854d20932ad69777000000000000029c | 29.562 | 3.902 | 0.197 | 0.000 | 0.068 | 1.893 | 6.100 | 0.060 | n/a | 0.536 | 16.766 | n/a | n/a | 0.042 | 4.167 | 0.141 | 0.042 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002a8 | 27.118 | 3.487 | 0.249 | 0.000 | 0.064 | 1.775 | 8.913 | 0.036 | n/a | 0.088 | 12.451 | n/a | n/a | 0.055 | 3.800 | 0.140 | 0.055 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000029e | 26.857 | 3.852 | 0.240 | 0.000 | 0.086 | 1.529 | 8.082 | 0.045 | n/a | 0.087 | 12.885 | n/a | n/a | 0.052 | 4.178 | 0.156 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002c0 | 25.540 | 5.778 | 0.010 | 0.000 | 0.602 | 1.167 | 1.911 | 0.050 | n/a | 0.432 | 15.522 | n/a | n/a | 0.068 | 6.390 | 0.250 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002c2 | 25.193 | 5.259 | 0.307 | 0.000 | 0.111 | 1.764 | 6.398 | 0.045 | n/a | 0.374 | 10.872 | n/a | n/a | 0.062 | 5.677 | 0.225 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002b0 | 25.078 | 3.750 | 0.222 | 0.000 | 0.103 | 1.223 | 7.466 | 0.036 | n/a | 0.106 | 12.115 | n/a | n/a | 0.056 | 4.076 | 0.163 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002d5 | 24.068 | 5.001 | 0.302 | 0.000 | 0.090 | 2.071 | 7.215 | 0.037 | n/a | 0.137 | 9.132 | n/a | n/a | 0.084 | 5.392 | 0.224 | 0.084 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002db | 23.392 | 3.311 | 0.189 | 0.000 | 0.066 | 1.165 | 6.648 | 0.076 | n/a | 0.170 | 11.720 | n/a | n/a | 0.047 | 3.565 | 0.152 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002c4 | 22.639 | 3.465 | 0.204 | 0.000 | 0.101 | 1.178 | 8.224 | 0.069 | n/a | 0.482 | 8.856 | n/a | n/a | 0.060 | 3.770 | 0.167 | 0.060 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002b8 | 21.669 | 3.762 | 0.199 | 0.000 | 0.062 | 1.501 | 5.146 | 0.036 | n/a | 0.091 | 10.758 | n/a | n/a | 0.114 | 4.023 | 0.186 | 0.114 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000299 | 21.557 | 5.052 | 0.005 | 0.000 | 0.111 | 0.876 | 2.089 | 0.050 | n/a | 0.120 | 13.208 | n/a | n/a | 0.045 | 5.168 | 0.240 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000294 | 21.206 | 5.186 | 0.006 | 0.000 | 0.588 | 1.201 | 5.010 | 0.045 | n/a | 0.100 | 9.016 | n/a | n/a | 0.053 | 5.780 | 0.273 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002b4 | 21.154 | 3.850 | 0.005 | 0.000 | 0.655 | 0.710 | 2.454 | 0.081 | n/a | 0.250 | 13.105 | n/a | n/a | 0.044 | 4.510 | 0.213 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (14 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.497 | 0.756 | 0.000 | 1.702 | 3.743 | 0.005 | 0.000 | 0.461 | 1.059 | 1.398 | 0.041 | n/a | 0.105 | 6.171 | n/a | n/a | 0.052 | 4.460 | 0.315 | 0.052 |
| p99 | 25.540 | 1.941 | 0.004 | 2.682 | 5.778 | n/a | 0.000 | 1.704 | 4.520 | 9.886 | 0.095 | n/a | 0.974 | 15.522 | n/a | n/a | 0.094 | 6.390 | 0.439 | 0.094 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad6977700000000000002c0 | 25.540 | 5.778 | 0.010 | 0.000 | 0.602 | 1.167 | 1.911 | 0.050 | n/a | 0.432 | 15.522 | n/a | n/a | 0.068 | 6.390 | 0.250 | 0.068 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002ba | 20.177 | 3.475 | 0.007 | 0.000 | 0.277 | 4.520 | 1.766 | 0.047 | n/a | 0.105 | 9.932 | n/a | n/a | 0.049 | 3.758 | 0.186 | 0.049 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002a6 | 17.325 | 5.619 | 0.011 | 0.000 | 0.342 | 1.039 | 1.398 | 0.041 | n/a | 0.123 | 8.680 | n/a | n/a | 0.072 | 5.972 | 0.345 | 0.072 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002cc | 17.237 | 4.058 | 0.005 | 0.000 | 0.604 | 0.565 | 1.210 | 0.042 | n/a | 0.974 | 9.706 | n/a | n/a | 0.072 | 4.668 | 0.271 | 0.072 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002be | 16.344 | 5.268 | 0.007 | 0.000 | 0.226 | 1.151 | 1.412 | 0.045 | n/a | 0.504 | 7.680 | n/a | n/a | 0.052 | 5.500 | 0.337 | 0.052 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002d0 | 16.040 | 2.737 | n/a | 0.000 | 0.710 | 2.533 | 9.886 | 0.019 | n/a | 0.061 | 0.000 | n/a | n/a | 0.094 | 3.447 | 0.215 | 0.094 | gw-w/thread-45/gateway /v1/db/{db}/release | none observed |
| 854d20932ad6977700000000000002c5 | 15.572 | 3.197 | 0.005 | 0.000 | 0.448 | 0.467 | 1.198 | 0.034 | n/a | 0.073 | 10.114 | n/a | n/a | 0.035 | 3.650 | 0.234 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002a2 | 15.497 | 3.601 | 0.006 | 0.000 | 0.461 | 1.105 | 2.001 | 0.095 | n/a | 0.226 | 7.933 | n/a | n/a | 0.069 | 4.068 | 0.262 | 0.069 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002a9 | 14.252 | 4.816 | 0.005 | 0.000 | 0.911 | 1.164 | 1.012 | 0.033 | n/a | 0.070 | 6.171 | n/a | n/a | 0.070 | 5.732 | 0.402 | 0.070 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000297 | 14.179 | 3.743 | 0.005 | 0.000 | 1.277 | 0.740 | 2.410 | 0.069 | n/a | 0.812 | 5.090 | n/a | n/a | 0.033 | 5.024 | 0.354 | 0.033 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000289 | 13.058 | 3.378 | 0.006 | 0.000 | 1.076 | 1.156 | 1.548 | 0.047 | n/a | 0.145 | 5.656 | n/a | n/a | 0.046 | 4.460 | 0.342 | 0.046 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002b2 | 12.355 | 3.781 | 0.005 | 0.000 | 0.110 | 1.059 | 1.373 | 0.034 | n/a | 0.069 | 5.884 | n/a | n/a | 0.040 | 3.897 | 0.315 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000029f | 12.147 | 4.941 | 0.005 | 0.000 | 0.341 | 0.696 | 0.987 | 0.032 | n/a | 0.094 | 4.994 | n/a | n/a | 0.057 | 5.288 | 0.435 | 0.057 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000002c9 | 9.276 | 2.367 | 0.004 | 0.000 | 1.704 | 0.574 | 0.976 | 0.033 | n/a | 0.066 | 3.520 | n/a | n/a | 0.032 | 4.075 | 0.439 | 0.032 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.155ms |

## P2 / L1024 / commit (855 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.830 | 0.923 | 0.000 | 1.682 | 3.836 | 0.005 | 0.000 | 0.824 | 0.872 | 1.283 | 0.037 | n/a | 0.149 | 7.310 | n/a | n/a | 0.039 | 5.035 | 0.323 | 0.039 |
| p99 | 203.673 | 3.321 | 0.129 | 5.549 | 50.469 | 19.932 | 0.000 | 64.557 | 17.922 | 12.344 | 5.210 | n/a | 4.349 | 62.653 | n/a | n/a | 0.124 | 132.288 | 0.756 | 0.124 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad6977700000000000003ca | 281.759 | 50.469 | 0.009 | 89.892 | 40.230 | 17.922 | 7.128 | 0.249 | n/a | 2.351 | 73.446 | n/a | n/a | 0.062 | 180.600 | 0.641 | 0.062 | node-14/thread-0/node.gc | driver.publication 8.667ms; driver.expected-state.bind-receipt 4.829ms; driver.publication 3.188ms; driver.publication 2.616ms; driver.publication 2.476ms |
| 854d20932ad6977700000000000003d4 | 234.570 | 4.138 | 0.004 | 0.000 | 172.470 | 0.761 | 1.431 | 0.113 | n/a | 0.124 | 55.469 | n/a | n/a | 0.060 | 176.612 | 0.753 | 0.060 | node-14/thread-0/driver.queue.subject | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003c6 | 224.403 | 5.026 | 0.004 | 0.000 | 1.312 | 145.845 | 3.010 | 3.706 | n/a | 0.033 | 65.416 | n/a | n/a | 0.051 | 6.342 | 0.028 | 0.051 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.667ms; driver.expected-state.bind-receipt 4.829ms; client.encode 3.460ms; driver.publication 3.188ms; client.encode 2.739ms |
| 854d20932ad6977700000000000003c5 | 222.118 | 7.517 | 0.006 | 0.000 | 1.710 | 158.488 | 2.848 | 0.053 | n/a | 4.349 | 46.998 | n/a | n/a | 0.149 | 9.233 | 0.042 | 0.149 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.667ms; driver.expected-state.bind-receipt 4.829ms; client.encode 3.460ms; driver.publication 3.188ms; client.encode 2.739ms |
| 854d20932ad6977700000000000003cf | 220.338 | 55.631 | 21.194 | 0.000 | 103.305 | 5.507 | 2.651 | 5.541 | n/a | 0.079 | 26.372 | n/a | n/a | 0.057 | 180.130 | 0.818 | 0.057 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d0 | 218.243 | 58.750 | 16.821 | 0.000 | 98.633 | 6.118 | 1.204 | 10.275 | n/a | 0.517 | 25.876 | n/a | n/a | 0.048 | 174.205 | 0.798 | 0.048 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003c7 | 217.073 | 23.099 | 0.043 | 0.000 | 1.199 | 156.515 | 4.143 | 0.676 | n/a | 4.948 | 26.248 | n/a | n/a | 0.200 | 24.342 | 0.112 | 0.200 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.667ms; driver.expected-state.bind-receipt 4.829ms; client.encode 3.460ms; driver.publication 3.188ms; driver.publication 2.616ms |
| 854d20932ad6977700000000000003ce | 216.152 | 36.186 | 4.531 | 0.000 | 105.061 | 38.950 | 3.386 | 0.155 | n/a | 8.306 | 19.446 | n/a | n/a | 0.131 | 145.777 | 0.674 | 0.131 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.publication 2.476ms; driver.publication 1.550ms; driver.expected-state.bind-receipt 1.433ms |
| 854d20932ad6977700000000000003d1 | 203.673 | 66.132 | 11.354 | 0.000 | 81.866 | 6.996 | 0.810 | 10.029 | n/a | 0.038 | 26.347 | n/a | n/a | 0.101 | 159.352 | 0.782 | 0.101 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d3 | 189.122 | 66.723 | 10.320 | 0.000 | 64.557 | 12.818 | 1.125 | 0.023 | n/a | 0.051 | 33.452 | n/a | n/a | 0.053 | 141.600 | 0.749 | 0.053 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d2 | 187.947 | 66.312 | 11.607 | 0.000 | 64.225 | 15.306 | 1.088 | 1.602 | n/a | 0.026 | 27.688 | n/a | n/a | 0.092 | 142.145 | 0.756 | 0.092 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d7 | 174.634 | 68.973 | 22.345 | 0.000 | 27.668 | 5.226 | 1.275 | 6.836 | n/a | 0.163 | 42.094 | n/a | n/a | 0.055 | 118.985 | 0.681 | 0.055 | node-14/thread-0/client.validation-and-staging | driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; client.encode 2.414ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d5 | 171.829 | 68.647 | 19.932 | 0.000 | 43.709 | 5.332 | 0.651 | 0.014 | n/a | 0.019 | 33.487 | n/a | n/a | 0.038 | 132.288 | 0.770 | 0.038 | node-14/thread-0/client.validation-and-staging | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d6 | 171.469 | 68.198 | 20.677 | 0.000 | 41.814 | 4.840 | 5.629 | 0.107 | n/a | 3.483 | 26.679 | n/a | n/a | 0.043 | 130.689 | 0.762 | 0.043 | node-14/thread-0/client.validation-and-staging | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d9 | 164.878 | 7.086 | 7.962 | 0.000 | 72.694 | 11.857 | 7.740 | 5.912 | n/a | 0.121 | 51.467 | n/a | n/a | 0.039 | 87.742 | 0.532 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.389ms; driver.publication 1.274ms |
| 854d20932ad6977700000000000003db | 139.021 | 4.315 | 5.405 | 0.000 | 68.467 | 2.124 | 1.166 | 0.021 | n/a | 0.139 | 57.334 | n/a | n/a | 0.050 | 78.187 | 0.562 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.389ms; driver.publication 1.274ms |
| 854d20932ad6977700000000000003da | 137.876 | 4.624 | 12.521 | 0.000 | 60.574 | 17.145 | 1.212 | 0.056 | n/a | 0.064 | 41.651 | n/a | n/a | 0.029 | 77.719 | 0.564 | 0.029 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.274ms; driver.expected-state.bind-receipt 1.249ms |
| 854d20932ad6977700000000000003dd | 130.713 | 3.793 | 0.004 | 0.000 | 72.140 | 2.273 | 1.267 | 0.043 | n/a | 0.155 | 50.990 | n/a | n/a | 0.049 | 75.937 | 0.581 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.389ms; driver.publication 1.274ms |
| 854d20932ad6977700000000000003dc | 125.704 | 4.781 | 29.162 | 0.000 | 35.551 | 1.862 | 2.943 | 0.023 | n/a | 0.038 | 51.310 | n/a | n/a | 0.034 | 69.493 | 0.553 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.274ms; driver.expected-state.bind-receipt 1.249ms |
| 854d20932ad697770000000000000504 | 102.865 | 5.295 | 0.006 | 0.000 | 1.103 | 0.739 | 7.615 | 0.040 | n/a | 0.105 | 87.926 | n/a | n/a | 0.037 | 6.404 | 0.062 | 0.037 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1024 / commit / 5-10 facts (497 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.937 | 0.785 | 0.000 | 1.533 | 3.404 | 0.005 | 0.000 | 0.863 | 0.846 | 1.090 | 0.035 | n/a | 0.143 | 6.442 | n/a | n/a | 0.039 | 4.477 | 0.323 | 0.039 |
| p99 | 203.673 | 2.332 | 0.108 | 5.146 | 66.312 | 20.677 | 0.000 | 72.140 | 15.306 | 11.162 | 5.912 | n/a | 4.211 | 57.334 | n/a | n/a | 0.120 | 141.600 | 0.770 | 0.120 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad6977700000000000003d4 | 234.570 | 4.138 | 0.004 | 0.000 | 172.470 | 0.761 | 1.431 | 0.113 | n/a | 0.124 | 55.469 | n/a | n/a | 0.060 | 176.612 | 0.753 | 0.060 | node-14/thread-0/driver.queue.subject | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003c6 | 224.403 | 5.026 | 0.004 | 0.000 | 1.312 | 145.845 | 3.010 | 3.706 | n/a | 0.033 | 65.416 | n/a | n/a | 0.051 | 6.342 | 0.028 | 0.051 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.667ms; driver.expected-state.bind-receipt 4.829ms; client.encode 3.460ms; driver.publication 3.188ms; client.encode 2.739ms |
| 854d20932ad6977700000000000003c5 | 222.118 | 7.517 | 0.006 | 0.000 | 1.710 | 158.488 | 2.848 | 0.053 | n/a | 4.349 | 46.998 | n/a | n/a | 0.149 | 9.233 | 0.042 | 0.149 | node-14/thread-0/socket.wait-first-byte | driver.publication 8.667ms; driver.expected-state.bind-receipt 4.829ms; client.encode 3.460ms; driver.publication 3.188ms; client.encode 2.739ms |
| 854d20932ad6977700000000000003d0 | 218.243 | 58.750 | 16.821 | 0.000 | 98.633 | 6.118 | 1.204 | 10.275 | n/a | 0.517 | 25.876 | n/a | n/a | 0.048 | 174.205 | 0.798 | 0.048 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d1 | 203.673 | 66.132 | 11.354 | 0.000 | 81.866 | 6.996 | 0.810 | 10.029 | n/a | 0.038 | 26.347 | n/a | n/a | 0.101 | 159.352 | 0.782 | 0.101 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d3 | 189.122 | 66.723 | 10.320 | 0.000 | 64.557 | 12.818 | 1.125 | 0.023 | n/a | 0.051 | 33.452 | n/a | n/a | 0.053 | 141.600 | 0.749 | 0.053 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d2 | 187.947 | 66.312 | 11.607 | 0.000 | 64.225 | 15.306 | 1.088 | 1.602 | n/a | 0.026 | 27.688 | n/a | n/a | 0.092 | 142.145 | 0.756 | 0.092 | node-14/thread-0/driver.queue.scheduler-late | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d7 | 174.634 | 68.973 | 22.345 | 0.000 | 27.668 | 5.226 | 1.275 | 6.836 | n/a | 0.163 | 42.094 | n/a | n/a | 0.055 | 118.985 | 0.681 | 0.055 | node-14/thread-0/client.validation-and-staging | driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; client.encode 2.414ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d5 | 171.829 | 68.647 | 19.932 | 0.000 | 43.709 | 5.332 | 0.651 | 0.014 | n/a | 0.019 | 33.487 | n/a | n/a | 0.038 | 132.288 | 0.770 | 0.038 | node-14/thread-0/client.validation-and-staging | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d6 | 171.469 | 68.198 | 20.677 | 0.000 | 41.814 | 4.840 | 5.629 | 0.107 | n/a | 3.483 | 26.679 | n/a | n/a | 0.043 | 130.689 | 0.762 | 0.043 | node-14/thread-0/client.validation-and-staging | client.encode 3.460ms; driver.publication 2.616ms; driver.expected-state.bind-receipt 2.543ms; driver.publication 2.476ms; driver.publication 1.550ms |
| 854d20932ad6977700000000000003d9 | 164.878 | 7.086 | 7.962 | 0.000 | 72.694 | 11.857 | 7.740 | 5.912 | n/a | 0.121 | 51.467 | n/a | n/a | 0.039 | 87.742 | 0.532 | 0.039 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.389ms; driver.publication 1.274ms |
| 854d20932ad6977700000000000003db | 139.021 | 4.315 | 5.405 | 0.000 | 68.467 | 2.124 | 1.166 | 0.021 | n/a | 0.139 | 57.334 | n/a | n/a | 0.050 | 78.187 | 0.562 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.389ms; driver.publication 1.274ms |
| 854d20932ad6977700000000000003da | 137.876 | 4.624 | 12.521 | 0.000 | 60.574 | 17.145 | 1.212 | 0.056 | n/a | 0.064 | 41.651 | n/a | n/a | 0.029 | 77.719 | 0.564 | 0.029 | node-14/thread-0/driver.queue.scheduler-late | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.274ms; driver.expected-state.bind-receipt 1.249ms |
| 854d20932ad6977700000000000003dd | 130.713 | 3.793 | 0.004 | 0.000 | 72.140 | 2.273 | 1.267 | 0.043 | n/a | 0.155 | 50.990 | n/a | n/a | 0.049 | 75.937 | 0.581 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.389ms; driver.publication 1.274ms |
| 854d20932ad6977700000000000003dc | 125.704 | 4.781 | 29.162 | 0.000 | 35.551 | 1.862 | 2.943 | 0.023 | n/a | 0.038 | 51.310 | n/a | n/a | 0.034 | 69.493 | 0.553 | 0.034 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.543ms; driver.expected-state.bind-receipt 1.433ms; driver.publication 1.412ms; driver.publication 1.274ms; driver.expected-state.bind-receipt 1.249ms |
| 854d20932ad6977700000000000006c2 | 86.337 | 4.044 | 0.006 | 0.000 | 0.227 | 0.546 | 0.905 | 0.032 | n/a | 0.049 | 80.479 | n/a | n/a | 0.050 | 4.276 | 0.050 | 0.050 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.627ms |
| 854d20932ad6977700000000000003a8 | 79.240 | 4.243 | 0.008 | 0.000 | 1.000 | 0.647 | 4.830 | 0.079 | n/a | 0.130 | 68.268 | n/a | n/a | 0.035 | 5.251 | 0.066 | 0.035 | gw-w/thread-41/peer.transact-await (includes order/network/storage) | driver.publication 1.159ms |
| 854d20932ad697770000000000000506 | 78.657 | 5.116 | 0.004 | 0.000 | 51.111 | 2.175 | 14.392 | 0.074 | n/a | 0.223 | 5.520 | n/a | n/a | 0.042 | 56.231 | 0.715 | 0.042 | node-14/thread-0/driver.queue.subject | driver.publication 1.172ms; driver.publication 1.088ms; driver.publication 1.024ms |
| 854d20932ad6977700000000000006c5 | 74.748 | 4.333 | 0.004 | 0.000 | 0.993 | 12.783 | 1.971 | 0.066 | n/a | 0.228 | 54.259 | n/a | n/a | 0.110 | 5.331 | 0.071 | 0.110 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.ack-and-subject-state 2.300ms; driver.expected-state.bind-receipt 1.587ms; driver.publication 1.504ms; driver.publication 1.322ms; driver.expected-state.bind-receipt 1.005ms |
| 854d20932ad697770000000000000505 | 74.079 | 3.641 | 0.010 | 0.000 | 0.988 | 2.771 | 1.331 | 0.053 | n/a | 0.439 | 64.802 | n/a | n/a | 0.043 | 4.639 | 0.063 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.172ms |

## P2 / tail / commit (2613 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.900 | 0.819 | 0.000 | 1.640 | 3.662 | 0.005 | 0.000 | 0.742 | 0.727 | 1.135 | 0.030 | n/a | 0.106 | 5.397 | n/a | n/a | 0.035 | 4.674 | 0.360 | 0.035 |
| p99 | 56.948 | 3.247 | 0.047 | 5.133 | 11.598 | 0.460 | 0.000 | 19.326 | 12.616 | 9.346 | 1.721 | n/a | 3.072 | 35.258 | n/a | n/a | 0.098 | 26.917 | 0.714 | 0.098 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad697770000000000001614 | 88.494 | 4.896 | 0.004 | 0.000 | 70.755 | 4.145 | 2.347 | 0.043 | n/a | 0.489 | 5.783 | n/a | n/a | 0.031 | 75.656 | 0.855 | 0.031 | node-14/thread-0/driver.queue.subject | driver.publication 1.696ms; driver.expected-state.bind-receipt 1.469ms; driver.publication 1.421ms; driver.expected-state.bind-receipt 1.266ms; driver.publication 1.239ms |
| 854d20932ad6977700000000000017cf | 85.540 | 3.587 | 19.191 | 0.000 | 0.011 | 1.254 | 4.926 | 0.027 | n/a | 0.254 | 56.265 | n/a | n/a | 0.026 | 22.789 | 0.266 | 0.026 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 3.378ms; driver.publication 2.688ms; driver.publication 1.200ms; driver.publication 1.125ms |
| 854d20932ad697770000000000001b07 | 79.134 | 3.333 | 0.002 | 0.000 | 2.278 | 10.417 | 1.125 | 0.032 | n/a | 0.042 | 61.855 | n/a | n/a | 0.049 | 5.614 | 0.071 | 0.049 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 4.032ms; driver.publication 2.517ms |
| 854d20932ad6977700000000000012b4 | 77.270 | 3.190 | 0.007 | 0.000 | 0.981 | 0.669 | 1.423 | 0.062 | n/a | 0.411 | 70.473 | n/a | n/a | 0.054 | 4.177 | 0.054 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000012b5 | 76.755 | 6.133 | 0.004 | 0.000 | 0.495 | 0.594 | 2.945 | 0.037 | n/a | 0.099 | 66.411 | n/a | n/a | 0.035 | 6.633 | 0.086 | 0.035 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.271ms |
| 854d20932ad697770000000000000bb3 | 74.143 | 3.293 | 0.005 | 0.000 | 0.678 | 15.499 | 1.596 | 0.051 | n/a | 0.197 | 52.794 | n/a | n/a | 0.030 | 3.976 | 0.054 | 0.030 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.403ms; driver.publication 1.598ms; driver.publication 1.350ms; driver.publication 1.297ms; driver.publication 1.260ms |
| 854d20932ad6977700000000000012b6 | 73.893 | 4.769 | 0.012 | 0.000 | 0.358 | 5.802 | 1.849 | 0.053 | n/a | 0.147 | 60.857 | n/a | n/a | 0.047 | 5.139 | 0.070 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.271ms; driver.publication 1.222ms |
| 854d20932ad697770000000000001613 | 72.185 | 9.633 | 0.010 | 0.000 | 6.686 | 0.673 | 2.333 | 0.035 | n/a | 0.062 | 52.709 | n/a | n/a | 0.044 | 16.329 | 0.226 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.469ms; driver.publication 1.421ms; driver.publication 1.338ms |
| 854d20932ad697770000000000001b08 | 71.159 | 7.827 | 0.003 | 0.000 | 0.636 | 5.312 | 0.650 | 0.013 | n/a | 0.024 | 56.649 | n/a | n/a | 0.045 | 8.467 | 0.119 | 0.045 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.517ms |
| 854d20932ad697770000000000001b06 | 69.501 | 7.923 | 0.010 | 0.000 | 1.146 | 3.748 | 1.375 | 0.046 | n/a | 0.079 | 55.116 | n/a | n/a | 0.058 | 9.078 | 0.131 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000a3e | 65.954 | 8.731 | 0.008 | 0.000 | 37.802 | 7.300 | 0.951 | 0.031 | n/a | 0.087 | 10.969 | n/a | n/a | 0.074 | 46.541 | 0.706 | 0.074 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 35.243ms; driver.expected-state.bind-receipt 1.534ms |
| 854d20932ad697770000000000000bb4 | 65.233 | 3.855 | 0.092 | 0.000 | 0.644 | 11.833 | 1.188 | 0.027 | n/a | 0.102 | 47.455 | n/a | n/a | 0.037 | 4.591 | 0.070 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.403ms; driver.publication 1.350ms; driver.publication 1.297ms; driver.publication 1.260ms |
| 854d20932ad6977700000000000012b7 | 65.028 | 2.941 | 0.006 | 0.000 | 0.266 | 5.243 | 1.233 | 0.041 | n/a | 0.158 | 55.098 | n/a | n/a | 0.042 | 3.213 | 0.049 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.302ms; driver.publication 1.271ms; driver.publication 1.222ms |
| 854d20932ad6977700000000000014af | 64.554 | 3.912 | 0.004 | 0.000 | 0.974 | 0.465 | 0.839 | 0.024 | n/a | 0.062 | 58.243 | n/a | n/a | 0.031 | 4.890 | 0.076 | 0.031 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000a41 | 64.405 | 4.898 | 0.012 | 0.000 | 42.467 | 0.875 | 1.477 | 0.076 | n/a | 0.100 | 14.471 | n/a | n/a | 0.030 | 47.377 | 0.736 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 11.686ms; driver.publication 3.208ms; driver.expected-state.bind-receipt 1.534ms; driver.publication 1.427ms; driver.expected-state.bind-receipt 1.313ms |
| 854d20932ad6977700000000000011d8 | 64.041 | 2.882 | 0.003 | 0.000 | 50.766 | 0.457 | 1.882 | 0.030 | n/a | 1.736 | 6.231 | n/a | n/a | 0.054 | 53.651 | 0.838 | 0.054 | node-14/thread-0/driver.queue.subject | driver.publication 2.111ms; driver.publication 1.574ms; driver.publication 1.179ms; driver.publication 1.146ms |
| 854d20932ad697770000000000001452 | 62.944 | 8.633 | 0.005 | 0.000 | 0.673 | 39.961 | 1.362 | 0.045 | n/a | 3.759 | 8.466 | n/a | n/a | 0.040 | 9.310 | 0.148 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| 854d20932ad697770000000000000bb2 | 62.018 | 3.169 | 0.004 | 0.000 | 0.813 | 0.668 | 1.046 | 0.031 | n/a | 0.091 | 56.168 | n/a | n/a | 0.030 | 3.985 | 0.064 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad69777000000000000174c | 61.817 | 5.494 | 0.006 | 0.000 | 17.458 | 25.217 | 5.379 | 0.086 | n/a | 0.139 | 8.005 | n/a | n/a | 0.033 | 22.958 | 0.371 | 0.033 | node-14/thread-0/socket.wait-first-byte | driver.publication 6.384ms; driver.publication 2.958ms; driver.publication 1.459ms; driver.publication 1.340ms; driver.publication 1.322ms |
| 854d20932ad697770000000000000a3f | 60.859 | 11.565 | 2.376 | 0.000 | 25.971 | 7.197 | 1.228 | 0.018 | n/a | 0.767 | 11.707 | n/a | n/a | 0.031 | 39.912 | 0.656 | 0.031 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 23.006ms; driver.publication 3.208ms; driver.expected-state.bind-receipt 1.534ms |

## P2 / tail / commit / 5-10 facts (1551 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 12.445 | 0.662 | 0.000 | 1.496 | 3.216 | 0.005 | 0.000 | 0.753 | 0.715 | 0.950 | 0.029 | n/a | 0.107 | 5.036 | n/a | n/a | 0.035 | 4.161 | 0.351 | 0.035 |
| p99 | 58.015 | 2.267 | 0.043 | 4.720 | 9.358 | 0.137 | 0.000 | 17.587 | 13.727 | 4.879 | 1.868 | n/a | 3.122 | 35.258 | n/a | n/a | 0.093 | 23.947 | 0.717 | 0.093 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 854d20932ad697770000000000001b07 | 79.134 | 3.333 | 0.002 | 0.000 | 2.278 | 10.417 | 1.125 | 0.032 | n/a | 0.042 | 61.855 | n/a | n/a | 0.049 | 5.614 | 0.071 | 0.049 | gw-w/thread-63/peer.transact-await (includes order/network/storage) | driver.publication 4.032ms; driver.publication 2.517ms |
| 854d20932ad6977700000000000012b4 | 77.270 | 3.190 | 0.007 | 0.000 | 0.981 | 0.669 | 1.423 | 0.062 | n/a | 0.411 | 70.473 | n/a | n/a | 0.054 | 4.177 | 0.054 | 0.054 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad6977700000000000012b6 | 73.893 | 4.769 | 0.012 | 0.000 | 0.358 | 5.802 | 1.849 | 0.053 | n/a | 0.147 | 60.857 | n/a | n/a | 0.047 | 5.139 | 0.070 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.271ms; driver.publication 1.222ms |
| 854d20932ad697770000000000001b08 | 71.159 | 7.827 | 0.003 | 0.000 | 0.636 | 5.312 | 0.650 | 0.013 | n/a | 0.024 | 56.649 | n/a | n/a | 0.045 | 8.467 | 0.119 | 0.045 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.publication 2.517ms |
| 854d20932ad697770000000000001b06 | 69.501 | 7.923 | 0.010 | 0.000 | 1.146 | 3.748 | 1.375 | 0.046 | n/a | 0.079 | 55.116 | n/a | n/a | 0.058 | 9.078 | 0.131 | 0.058 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000a3e | 65.954 | 8.731 | 0.008 | 0.000 | 37.802 | 7.300 | 0.951 | 0.031 | n/a | 0.087 | 10.969 | n/a | n/a | 0.074 | 46.541 | 0.706 | 0.074 | node-14/thread-0/driver.queue.scheduler-late | driver.publication 35.243ms; driver.expected-state.bind-receipt 1.534ms |
| 854d20932ad697770000000000000bb4 | 65.233 | 3.855 | 0.092 | 0.000 | 0.644 | 11.833 | 1.188 | 0.027 | n/a | 0.102 | 47.455 | n/a | n/a | 0.037 | 4.591 | 0.070 | 0.037 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 2.403ms; driver.publication 1.350ms; driver.publication 1.297ms; driver.publication 1.260ms |
| 854d20932ad6977700000000000012b7 | 65.028 | 2.941 | 0.006 | 0.000 | 0.266 | 5.243 | 1.233 | 0.041 | n/a | 0.158 | 55.098 | n/a | n/a | 0.042 | 3.213 | 0.049 | 0.042 | gw-w/thread-64/peer.transact-await (includes order/network/storage) | driver.publication 1.302ms; driver.publication 1.271ms; driver.publication 1.222ms |
| 854d20932ad6977700000000000014af | 64.554 | 3.912 | 0.004 | 0.000 | 0.974 | 0.465 | 0.839 | 0.024 | n/a | 0.062 | 58.243 | n/a | n/a | 0.031 | 4.890 | 0.076 | 0.031 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000000a41 | 64.405 | 4.898 | 0.012 | 0.000 | 42.467 | 0.875 | 1.477 | 0.076 | n/a | 0.100 | 14.471 | n/a | n/a | 0.030 | 47.377 | 0.736 | 0.030 | node-14/thread-0/driver.queue.subject | driver.publication 11.686ms; driver.publication 3.208ms; driver.expected-state.bind-receipt 1.534ms; driver.publication 1.427ms; driver.expected-state.bind-receipt 1.313ms |
| 854d20932ad6977700000000000011d8 | 64.041 | 2.882 | 0.003 | 0.000 | 50.766 | 0.457 | 1.882 | 0.030 | n/a | 1.736 | 6.231 | n/a | n/a | 0.054 | 53.651 | 0.838 | 0.054 | node-14/thread-0/driver.queue.subject | driver.publication 2.111ms; driver.publication 1.574ms; driver.publication 1.179ms; driver.publication 1.146ms |
| 854d20932ad697770000000000001452 | 62.944 | 8.633 | 0.005 | 0.000 | 0.673 | 39.961 | 1.362 | 0.045 | n/a | 3.759 | 8.466 | n/a | n/a | 0.040 | 9.310 | 0.148 | 0.040 | node-14/thread-0/socket.wait-first-byte | none observed |
| 854d20932ad697770000000000000bb2 | 62.018 | 3.169 | 0.004 | 0.000 | 0.813 | 0.668 | 1.046 | 0.031 | n/a | 0.091 | 56.168 | n/a | n/a | 0.030 | 3.985 | 0.064 | 0.030 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| 854d20932ad697770000000000001a0d | 59.572 | 4.972 | 0.036 | 0.000 | 32.306 | 7.906 | 0.730 | 0.022 | n/a | 0.269 | 13.285 | n/a | n/a | 0.045 | 37.314 | 0.626 | 0.045 | node-14/thread-0/driver.queue.subject | driver.publication 4.049ms; driver.expected-state.bind-receipt 2.744ms; driver.publication 2.239ms; driver.publication 1.159ms |
| 854d20932ad6977700000000000014b0 | 58.462 | 3.250 | 0.006 | 0.000 | 0.716 | 1.954 | 0.724 | 0.018 | n/a | 0.046 | 51.723 | n/a | n/a | 0.026 | 3.972 | 0.068 | 0.026 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.067ms |
| 854d20932ad697770000000000001411 | 58.015 | 22.883 | 0.242 | 0.000 | 1.762 | 2.530 | 7.975 | 0.071 | n/a | 3.637 | 18.881 | n/a | n/a | 0.036 | 24.887 | 0.429 | 0.036 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.publication 6.309ms; client.parse 2.368ms |
| 854d20932ad697770000000000001a0a | 57.104 | 28.532 | 0.014 | 0.000 | 1.289 | 14.781 | 6.962 | 0.081 | n/a | 0.666 | 4.728 | n/a | n/a | 0.052 | 29.835 | 0.522 | 0.052 | node-14/thread-0/driver.execute | driver.publication 2.239ms |
| 854d20932ad697770000000000001410 | 55.399 | 27.954 | 0.017 | 0.000 | 5.547 | 7.965 | 2.533 | 0.100 | n/a | 0.265 | 10.892 | n/a | n/a | 0.125 | 33.518 | 0.605 | 0.125 | gw-w/thread-66/peer.transact-await (includes order/network/storage) | driver.plan-and-encode-command 1.479ms |
| 854d20932ad697770000000000000d7f | 54.704 | 3.053 | 0.005 | 0.000 | 3.510 | 2.212 | 0.979 | 0.082 | n/a | 0.683 | 44.146 | n/a | n/a | 0.033 | 6.568 | 0.120 | 0.033 | gw-w/thread-43/peer.transact-await (includes order/network/storage) | driver.expected-state.bind-receipt 1.170ms; driver.publication 1.034ms |
| 854d20932ad6977700000000000011d6 | 54.082 | 11.696 | 0.012 | 0.000 | 3.137 | 18.577 | 2.785 | 3.860 | n/a | 0.335 | 13.660 | n/a | n/a | 0.020 | 14.845 | 0.274 | 0.020 | node-14/thread-0/socket.wait-first-byte | driver.publication 2.111ms; driver.publication 1.574ms; driver.publication 1.431ms; driver.publication 1.179ms |

## P3 / outside-phases / read (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.378 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.079 | 200.630 | 0.009 | n/a | 0.043 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 |
| p99 | 466.001 | n/a | n/a | n/a | 18.695 | n/a | 1.300 | 0.000 | 7.787 | 457.922 | 0.803 | n/a | 0.250 | 0.000 | n/a | n/a | 43.000 | 19.995 | 0.269 | 43.000 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000000002 | 466.001 | 3.151 | n/a | 0.000 | 0.000 | 3.666 | 457.922 | 0.803 | n/a | 0.118 | 0.000 | n/a | n/a | 0.341 | 3.151 | 0.007 | 0.341 | gw-r/thread-40/gateway.admitted-work | none observed |
| cc6d39ab59d320da0000000000000006 | 205.877 | 0.000 | n/a | 0.000 | 0.000 | 1.079 | 204.256 | 0.042 | n/a | 0.250 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000007 | 203.530 | 0.000 | n/a | 0.000 | 0.000 | 1.453 | 201.599 | 0.012 | n/a | 0.222 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000ef6 | 202.450 | 0.000 | n/a | 0.000 | 0.000 | 0.796 | 201.418 | 0.013 | n/a | 0.060 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000005 | 202.204 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 201.052 | 0.018 | n/a | 0.147 | 0.000 | n/a | n/a | 0.250 | 0.000 | 0.000 | 0.250 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000ef4 | 201.378 | 0.000 | n/a | 0.000 | 0.000 | 0.621 | 200.600 | 0.005 | n/a | 0.043 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000ef5 | 201.176 | 0.000 | n/a | 0.000 | 0.000 | 0.399 | 200.630 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.096 | 0.000 | 0.000 | 0.096 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000efb | 79.423 | 18.695 | n/a | 1.300 | 0.000 | 3.124 | 55.999 | 0.005 | n/a | 0.010 | 0.000 | n/a | n/a | 0.291 | 19.995 | 0.252 | 0.291 | gw-r/thread-66/gateway.admitted-work | none observed |
| cc6d39ab59d320da0000000000000ef9 | 76.822 | 17.588 | n/a | 0.000 | 0.000 | 3.613 | 55.404 | 0.005 | n/a | 0.005 | 0.000 | n/a | n/a | 0.207 | 17.588 | 0.229 | 0.207 | gw-r/thread-68/gateway.admitted-work | none observed |
| cc6d39ab59d320da0000000000000efa | 69.474 | 18.687 | n/a | 0.000 | 0.000 | 7.787 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 43.000 | 18.687 | 0.269 | 43.000 | node-14/thread-4/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 939.884 | n/a | n/a | n/a | 5.117 | n/a | 0.000 | 0.000 | 0.683 | 924.404 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 1.360 | 5.117 | 0.015 | 1.360 |
| p99 | 1009.586 | n/a | n/a | n/a | 14.459 | n/a | 0.000 | 0.000 | 5.954 | 1001.660 | 0.012 | n/a | 0.291 | 0.000 | n/a | n/a | 10.070 | 14.459 | 0.329 | 10.070 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f500000000000000a4 | 1009.586 | 0.310 | n/a | 0.000 | 0.000 | 5.954 | 1001.660 | 0.012 | n/a | 0.291 | 0.000 | n/a | n/a | 1.360 | 0.310 | 0.000 | 1.360 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000a5 | 939.884 | 14.459 | n/a | 0.000 | 0.000 | 0.683 | 924.404 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.280 | 14.459 | 0.015 | 0.280 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000081c | 15.537 | 5.117 | n/a | 0.000 | 0.000 | 0.350 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.070 | 5.117 | 0.329 | 10.070 | node-14/thread-2/socket.wait-first-byte | none observed |

## P3 / warmup / internal (29 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 436.376 | n/a | n/a | n/a | 3.736 | n/a | 0.000 | 0.000 | 1.146 | 428.349 | 0.015 | n/a | 0.099 | 0.000 | n/a | n/a | 0.143 | 3.736 | 0.010 | 0.143 |
| p99 | 1016.988 | n/a | n/a | n/a | 11.527 | n/a | 1.091 | 0.000 | 7.339 | 1002.148 | 0.110 | n/a | 0.293 | 0.000 | n/a | n/a | 16.879 | 12.618 | 0.528 | 16.879 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f500000000000000d0 | 1016.988 | 11.527 | n/a | 1.091 | 0.000 | 7.339 | 996.747 | 0.045 | n/a | 0.101 | 0.000 | n/a | n/a | 0.138 | 12.618 | 0.012 | 0.138 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000bb | 1013.077 | 3.901 | n/a | 0.000 | 0.000 | 6.806 | 1002.148 | 0.016 | n/a | 0.099 | 0.000 | n/a | n/a | 0.108 | 3.901 | 0.004 | 0.108 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000b4 | 1004.324 | 0.172 | n/a | 0.000 | 0.000 | 1.587 | 1001.247 | 0.019 | n/a | 0.142 | 0.000 | n/a | n/a | 1.157 | 0.172 | 0.000 | 1.157 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000bc | 997.977 | 3.108 | n/a | 0.000 | 0.000 | 0.679 | 994.004 | 0.014 | n/a | 0.072 | 0.000 | n/a | n/a | 0.100 | 3.108 | 0.003 | 0.100 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ae | 890.854 | 2.447 | n/a | 0.000 | 0.000 | 0.837 | 887.084 | 0.110 | n/a | 0.293 | 0.000 | n/a | n/a | 0.083 | 2.447 | 0.003 | 0.083 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000b2 | 783.159 | 5.406 | n/a | 0.000 | 0.000 | 1.021 | 776.456 | 0.010 | n/a | 0.113 | 0.000 | n/a | n/a | 0.152 | 5.406 | 0.007 | 0.152 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ca | 729.554 | 2.835 | n/a | 0.000 | 0.000 | 1.182 | 725.317 | 0.019 | n/a | 0.100 | 0.000 | n/a | n/a | 0.101 | 2.835 | 0.004 | 0.101 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ab | 720.383 | 5.538 | n/a | 0.000 | 0.000 | 1.941 | 712.573 | 0.022 | n/a | 0.170 | 0.000 | n/a | n/a | 0.139 | 5.538 | 0.008 | 0.139 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000c0 | 701.250 | 4.734 | n/a | 0.000 | 0.000 | 0.760 | 695.408 | 0.027 | n/a | 0.103 | 0.000 | n/a | n/a | 0.217 | 4.734 | 0.007 | 0.217 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000c6 | 690.458 | 3.433 | n/a | 0.000 | 0.000 | 0.617 | 686.224 | 0.016 | n/a | 0.075 | 0.000 | n/a | n/a | 0.093 | 3.433 | 0.005 | 0.093 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000a8 | 667.981 | 2.291 | n/a | 0.000 | 0.000 | 0.869 | 664.494 | 0.030 | n/a | 0.133 | 0.000 | n/a | n/a | 0.165 | 2.291 | 0.003 | 0.165 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000c2 | 665.852 | 6.824 | n/a | 0.000 | 0.000 | 4.144 | 654.659 | 0.011 | n/a | 0.044 | 0.000 | n/a | n/a | 0.170 | 6.824 | 0.010 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000cb | 531.227 | 2.211 | n/a | 0.000 | 0.000 | 0.495 | 528.282 | 0.016 | n/a | 0.069 | 0.000 | n/a | n/a | 0.153 | 2.211 | 0.004 | 0.153 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ba | 447.579 | 3.828 | n/a | 0.000 | 0.000 | 2.667 | 440.857 | 0.014 | n/a | 0.069 | 0.000 | n/a | n/a | 0.143 | 3.828 | 0.009 | 0.143 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000b8 | 436.376 | 7.065 | n/a | 0.000 | 0.000 | 0.573 | 428.349 | 0.036 | n/a | 0.101 | 0.000 | n/a | n/a | 0.253 | 7.065 | 0.016 | 0.253 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000a7 | 409.756 | 2.521 | n/a | 0.000 | 0.000 | 0.750 | 406.202 | 0.033 | n/a | 0.130 | 0.000 | n/a | n/a | 0.120 | 2.521 | 0.006 | 0.120 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000c3 | 326.231 | 3.158 | n/a | 0.000 | 0.000 | 3.124 | 319.733 | 0.015 | n/a | 0.125 | 0.000 | n/a | n/a | 0.077 | 3.158 | 0.010 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000c5 | 308.996 | 2.353 | n/a | 0.000 | 0.000 | 1.471 | 304.981 | 0.012 | n/a | 0.082 | 0.000 | n/a | n/a | 0.096 | 2.353 | 0.008 | 0.096 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000aa | 301.136 | 5.851 | n/a | 0.000 | 0.000 | 0.750 | 294.085 | 0.013 | n/a | 0.095 | 0.000 | n/a | n/a | 0.341 | 5.851 | 0.019 | 0.341 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ac | 279.812 | 6.386 | n/a | 0.000 | 0.000 | 0.658 | 272.486 | 0.013 | n/a | 0.083 | 0.000 | n/a | n/a | 0.186 | 6.386 | 0.023 | 0.186 | gw-r/thread-45/journal/page | none observed |

## P3 / L1 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 338.627 | n/a | n/a | n/a | 4.592 | n/a | 0.651 | 0.000 | 0.904 | 330.535 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.131 | 5.342 | 0.015 | 0.131 |
| p99 | 1010.723 | n/a | n/a | n/a | 16.455 | n/a | 2.514 | 0.000 | 4.311 | 1003.113 | 0.038 | n/a | 3.020 | 0.000 | n/a | n/a | 41.084 | 18.222 | 0.419 | 41.084 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000000102 | 1010.723 | 5.498 | n/a | 0.899 | 0.000 | 1.035 | 1003.113 | 0.013 | n/a | 0.076 | 0.000 | n/a | n/a | 0.089 | 6.397 | 0.006 | 0.089 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000106 | 1008.490 | 5.799 | n/a | 0.677 | 0.000 | 2.191 | 999.617 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.112 | 6.476 | 0.006 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000d2 | 1003.459 | 0.118 | n/a | 0.000 | 0.000 | 0.776 | 1001.352 | 0.024 | n/a | 0.108 | 0.000 | n/a | n/a | 1.081 | 0.118 | 0.000 | 1.081 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000de | 1003.341 | 0.194 | n/a | 0.000 | 0.000 | 0.978 | 1000.907 | 0.013 | n/a | 0.099 | 0.000 | n/a | n/a | 1.148 | 0.194 | 0.000 | 1.148 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000da | 987.257 | 4.171 | n/a | 2.514 | 0.000 | 0.917 | 979.392 | 0.011 | n/a | 0.088 | 0.000 | n/a | n/a | 0.164 | 6.685 | 0.007 | 0.164 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000d1 | 982.405 | 6.767 | n/a | 1.479 | 0.000 | 1.071 | 972.839 | 0.035 | n/a | 0.100 | 0.000 | n/a | n/a | 0.113 | 8.247 | 0.008 | 0.113 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000d9 | 976.118 | 5.516 | n/a | 1.047 | 0.000 | 0.948 | 968.386 | 0.011 | n/a | 0.072 | 0.000 | n/a | n/a | 0.140 | 6.563 | 0.007 | 0.140 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000010e | 971.221 | 3.520 | n/a | 0.000 | 0.000 | 0.776 | 966.766 | 0.005 | n/a | 0.054 | 0.000 | n/a | n/a | 0.100 | 3.520 | 0.004 | 0.100 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000e5 | 955.490 | 4.989 | n/a | 0.673 | 0.000 | 1.116 | 948.366 | 0.026 | n/a | 0.110 | 0.000 | n/a | n/a | 0.210 | 5.662 | 0.006 | 0.210 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000e0 | 921.810 | 6.800 | n/a | 0.783 | 0.000 | 0.886 | 913.004 | 0.014 | n/a | 0.078 | 0.000 | n/a | n/a | 0.245 | 7.583 | 0.008 | 0.245 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ff | 853.662 | 6.896 | n/a | 0.617 | 0.000 | 4.311 | 841.592 | 0.018 | n/a | 0.126 | 0.000 | n/a | n/a | 0.101 | 7.514 | 0.009 | 0.101 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000e1 | 666.407 | 3.832 | n/a | 0.568 | 0.000 | 0.918 | 660.926 | 0.014 | n/a | 0.058 | 0.000 | n/a | n/a | 0.091 | 4.399 | 0.007 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000103 | 663.578 | 4.516 | n/a | 0.848 | 0.000 | 0.961 | 657.010 | 0.013 | n/a | 0.087 | 0.000 | n/a | n/a | 0.144 | 5.364 | 0.008 | 0.144 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000dc | 623.889 | 4.592 | n/a | 1.830 | 0.000 | 2.778 | 614.477 | 0.013 | n/a | 0.066 | 0.000 | n/a | n/a | 0.132 | 6.423 | 0.010 | 0.132 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000e9 | 607.523 | 16.455 | n/a | 1.767 | 0.000 | 0.904 | 588.064 | 0.010 | n/a | 0.064 | 0.000 | n/a | n/a | 0.258 | 18.222 | 0.030 | 0.258 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000d5 | 549.522 | 5.349 | n/a | 1.018 | 0.000 | 3.709 | 538.969 | 0.022 | n/a | 0.154 | 0.000 | n/a | n/a | 0.301 | 6.367 | 0.012 | 0.301 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000fd | 542.781 | 3.963 | n/a | 0.000 | 0.000 | 1.755 | 536.914 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.073 | 3.963 | 0.007 | 0.073 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000ec | 527.053 | 3.063 | n/a | 0.000 | 0.000 | 0.844 | 520.705 | 0.019 | n/a | 0.063 | 0.000 | n/a | n/a | 2.359 | 3.063 | 0.006 | 2.359 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000108 | 467.656 | 12.280 | n/a | 0.590 | 0.000 | 0.645 | 453.793 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.273 | 12.871 | 0.028 | 0.273 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000000fc | 459.304 | 5.074 | n/a | 0.000 | 0.000 | 1.977 | 452.119 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.086 | 5.074 | 0.011 | 0.086 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 455.668 | n/a | n/a | n/a | 3.911 | n/a | 0.000 | 0.000 | 0.808 | 441.707 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.123 | 4.077 | 0.010 | 0.123 |
| p99 | 1010.393 | n/a | n/a | n/a | 10.360 | n/a | 1.110 | 0.000 | 2.781 | 1001.214 | 8.358 | n/a | 0.161 | 0.000 | n/a | n/a | 47.815 | 10.960 | 0.438 | 47.815 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000000115 | 1010.393 | 6.460 | n/a | 1.104 | 0.000 | 1.741 | 1000.745 | 0.008 | n/a | 0.124 | 0.000 | n/a | n/a | 0.212 | 7.564 | 0.007 | 0.212 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000012a | 1003.522 | 0.163 | n/a | 0.000 | 0.000 | 0.884 | 1001.214 | 0.016 | n/a | 0.107 | 0.000 | n/a | n/a | 1.138 | 0.163 | 0.000 | 1.138 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000141 | 1003.521 | 0.216 | n/a | 0.000 | 0.000 | 0.808 | 1001.209 | 0.020 | n/a | 0.092 | 0.000 | n/a | n/a | 1.177 | 0.216 | 0.000 | 1.177 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000138 | 999.045 | 3.190 | n/a | 0.000 | 0.000 | 0.814 | 994.857 | 0.008 | n/a | 0.087 | 0.000 | n/a | n/a | 0.089 | 3.190 | 0.003 | 0.089 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000126 | 998.019 | 5.423 | n/a | 0.000 | 0.000 | 0.961 | 991.363 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.195 | 5.423 | 0.005 | 0.195 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000012c | 997.211 | 4.077 | n/a | 0.000 | 0.000 | 0.668 | 992.253 | 0.017 | n/a | 0.072 | 0.000 | n/a | n/a | 0.124 | 4.077 | 0.004 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000011d | 992.211 | 3.828 | n/a | 1.110 | 0.000 | 0.729 | 986.366 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.117 | 4.938 | 0.005 | 0.117 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000149 | 859.202 | 4.090 | n/a | 0.842 | 0.000 | 2.781 | 851.240 | 0.008 | n/a | 0.088 | 0.000 | n/a | n/a | 0.153 | 4.932 | 0.006 | 0.153 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000133 | 825.164 | 4.911 | n/a | 0.000 | 0.000 | 0.504 | 819.579 | 0.008 | n/a | 0.065 | 0.000 | n/a | n/a | 0.098 | 4.911 | 0.006 | 0.098 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000124 | 807.149 | 5.841 | n/a | 0.000 | 0.000 | 1.583 | 799.486 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 0.149 | 5.841 | 0.007 | 0.149 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000013d | 767.976 | 3.384 | n/a | 0.000 | 0.000 | 0.712 | 763.692 | 0.013 | n/a | 0.051 | 0.000 | n/a | n/a | 0.123 | 3.384 | 0.004 | 0.123 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000012e | 763.467 | 5.062 | n/a | 0.714 | 0.000 | 0.680 | 756.698 | 0.007 | n/a | 0.068 | 0.000 | n/a | n/a | 0.239 | 5.776 | 0.008 | 0.239 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000112 | 723.836 | 3.166 | n/a | 0.670 | 0.000 | 0.501 | 719.334 | 0.013 | n/a | 0.072 | 0.000 | n/a | n/a | 0.080 | 3.836 | 0.005 | 0.080 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000127 | 622.591 | 7.945 | n/a | 0.000 | 0.000 | 0.998 | 613.426 | 0.009 | n/a | 0.066 | 0.000 | n/a | n/a | 0.147 | 7.945 | 0.013 | 0.147 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000011e | 612.944 | 5.992 | n/a | 0.000 | 0.000 | 1.590 | 605.165 | 0.006 | n/a | 0.050 | 0.000 | n/a | n/a | 0.142 | 5.992 | 0.010 | 0.142 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000135 | 569.769 | 2.869 | n/a | 0.000 | 0.000 | 0.981 | 565.758 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.106 | 2.869 | 0.005 | 0.106 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000010f | 547.180 | 3.690 | n/a | 0.666 | 0.000 | 0.957 | 541.701 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 0.108 | 4.356 | 0.008 | 0.108 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000013a | 545.458 | 3.344 | n/a | 0.000 | 0.000 | 0.917 | 541.043 | 0.012 | n/a | 0.072 | 0.000 | n/a | n/a | 0.071 | 3.344 | 0.006 | 0.071 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000011b | 519.108 | 3.928 | n/a | 0.000 | 0.000 | 1.484 | 513.412 | 0.009 | n/a | 0.161 | 0.000 | n/a | n/a | 0.114 | 3.928 | 0.008 | 0.114 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000143 | 477.838 | 8.500 | n/a | 0.885 | 0.000 | 0.792 | 467.236 | 0.008 | n/a | 0.082 | 0.000 | n/a | n/a | 0.336 | 9.385 | 0.020 | 0.336 | gw-r/thread-40/journal/page | none observed |

## P3 / L16 / internal (46 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 321.356 | n/a | n/a | n/a | 3.678 | n/a | 0.000 | 0.000 | 0.689 | 317.942 | 0.008 | n/a | 0.055 | 0.000 | n/a | n/a | 0.117 | 3.826 | 0.009 | 0.117 |
| p99 | 1004.769 | n/a | n/a | n/a | 9.097 | n/a | 0.945 | 0.000 | 4.637 | 1001.267 | 0.047 | n/a | 0.111 | 0.000 | n/a | n/a | 27.071 | 9.219 | 0.608 | 27.071 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000000188 | 1004.769 | 0.136 | n/a | 0.000 | 0.000 | 2.154 | 1001.267 | 0.011 | n/a | 0.080 | 0.000 | n/a | n/a | 1.121 | 0.136 | 0.000 | 1.121 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000175 | 1004.292 | 0.139 | n/a | 0.000 | 0.000 | 2.385 | 1000.588 | 0.006 | n/a | 0.059 | 0.000 | n/a | n/a | 1.114 | 0.139 | 0.000 | 1.114 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000017b | 1003.904 | 0.206 | n/a | 0.000 | 0.000 | 1.246 | 1001.204 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 1.188 | 0.206 | 0.000 | 1.188 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000165 | 1003.522 | 0.248 | n/a | 0.000 | 0.000 | 0.888 | 1001.099 | 0.026 | n/a | 0.079 | 0.000 | n/a | n/a | 1.181 | 0.248 | 0.000 | 1.181 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000181 | 1003.151 | 0.138 | n/a | 0.000 | 0.000 | 0.741 | 1001.092 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 1.120 | 0.138 | 0.000 | 1.120 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000155 | 990.175 | 5.375 | n/a | 0.000 | 0.000 | 2.740 | 981.670 | 0.006 | n/a | 0.111 | 0.000 | n/a | n/a | 0.274 | 5.375 | 0.005 | 0.274 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000018a | 986.428 | 4.070 | n/a | 0.000 | 0.000 | 0.987 | 981.252 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.075 | 4.070 | 0.004 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000016f | 939.617 | 3.678 | n/a | 0.000 | 0.000 | 0.637 | 935.171 | 0.010 | n/a | 0.045 | 0.000 | n/a | n/a | 0.076 | 3.678 | 0.004 | 0.076 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000015a | 851.637 | 4.696 | n/a | 0.000 | 0.000 | 0.646 | 846.146 | 0.013 | n/a | 0.055 | 0.000 | n/a | n/a | 0.081 | 4.696 | 0.006 | 0.081 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000016e | 845.840 | 3.013 | n/a | 0.000 | 0.000 | 0.562 | 842.117 | 0.011 | n/a | 0.056 | 0.000 | n/a | n/a | 0.082 | 3.013 | 0.004 | 0.082 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000186 | 759.518 | 4.884 | n/a | 0.000 | 0.000 | 0.721 | 753.664 | 0.005 | n/a | 0.064 | 0.000 | n/a | n/a | 0.180 | 4.884 | 0.006 | 0.180 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000178 | 722.521 | 6.221 | n/a | 0.000 | 0.000 | 0.787 | 715.297 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.148 | 6.221 | 0.009 | 0.148 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000018c | 710.957 | 3.181 | n/a | 0.767 | 0.000 | 0.364 | 706.502 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.107 | 3.948 | 0.006 | 0.107 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000017f | 684.430 | 4.406 | n/a | 0.000 | 0.000 | 0.708 | 678.968 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.293 | 4.406 | 0.006 | 0.293 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000171 | 629.811 | 4.187 | n/a | 0.000 | 0.000 | 0.634 | 624.852 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.073 | 4.187 | 0.007 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000156 | 619.351 | 3.826 | n/a | 0.000 | 0.000 | 0.836 | 614.488 | 0.019 | n/a | 0.068 | 0.000 | n/a | n/a | 0.115 | 3.826 | 0.006 | 0.115 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000168 | 517.465 | 5.361 | n/a | 0.000 | 0.000 | 0.595 | 511.244 | 0.019 | n/a | 0.061 | 0.000 | n/a | n/a | 0.185 | 5.361 | 0.010 | 0.185 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000153 | 515.029 | 2.832 | n/a | 0.000 | 0.000 | 0.898 | 511.103 | 0.018 | n/a | 0.078 | 0.000 | n/a | n/a | 0.100 | 2.832 | 0.005 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000150 | 480.528 | 4.464 | n/a | 0.000 | 0.000 | 0.568 | 475.224 | 0.006 | n/a | 0.079 | 0.000 | n/a | n/a | 0.187 | 4.464 | 0.009 | 0.187 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000014f | 420.172 | 2.822 | n/a | 0.000 | 0.000 | 2.148 | 414.997 | 0.011 | n/a | 0.083 | 0.000 | n/a | n/a | 0.110 | 2.822 | 0.007 | 0.110 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (51 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 321.207 | n/a | n/a | n/a | 3.876 | n/a | 0.000 | 0.000 | 0.718 | 313.530 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.119 | 3.876 | 0.018 | 0.119 |
| p99 | 1005.134 | n/a | n/a | n/a | 8.766 | n/a | 0.908 | 0.000 | 5.099 | 1001.340 | 0.492 | n/a | 0.128 | 0.000 | n/a | n/a | 14.637 | 8.766 | 0.697 | 14.637 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f500000000000001ab | 1005.134 | 4.868 | n/a | 0.000 | 0.000 | 1.044 | 999.032 | 0.009 | n/a | 0.056 | 0.000 | n/a | n/a | 0.124 | 4.868 | 0.005 | 0.124 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000018e | 1003.590 | 0.096 | n/a | 0.000 | 0.000 | 0.959 | 1001.340 | 0.006 | n/a | 0.045 | 0.000 | n/a | n/a | 1.144 | 0.096 | 0.000 | 1.144 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001a9 | 1002.507 | 0.205 | n/a | 0.000 | 0.000 | 0.478 | 1000.624 | 0.006 | n/a | 0.041 | 0.000 | n/a | n/a | 1.153 | 0.205 | 0.000 | 1.153 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001c8 | 998.830 | 3.298 | n/a | 0.000 | 0.000 | 0.622 | 994.777 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.087 | 3.298 | 0.003 | 0.087 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001c9 | 994.490 | 2.728 | n/a | 0.000 | 0.000 | 3.910 | 987.747 | 0.005 | n/a | 0.028 | 0.000 | n/a | n/a | 0.072 | 2.728 | 0.003 | 0.072 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001ac | 989.250 | 6.893 | n/a | 0.908 | 0.000 | 0.887 | 980.304 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.208 | 7.801 | 0.008 | 0.208 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001c6 | 917.381 | 3.482 | n/a | 0.000 | 0.000 | 0.693 | 913.094 | 0.007 | n/a | 0.036 | 0.000 | n/a | n/a | 0.069 | 3.482 | 0.004 | 0.069 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000019e | 897.290 | 2.685 | n/a | 0.000 | 0.000 | 3.105 | 891.368 | 0.005 | n/a | 0.044 | 0.000 | n/a | n/a | 0.082 | 2.685 | 0.003 | 0.082 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001ba | 811.841 | 2.960 | n/a | 0.000 | 0.000 | 0.445 | 808.284 | 0.014 | n/a | 0.053 | 0.000 | n/a | n/a | 0.085 | 2.960 | 0.004 | 0.085 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001a1 | 751.628 | 5.050 | n/a | 0.000 | 0.000 | 0.380 | 746.071 | 0.006 | n/a | 0.036 | 0.000 | n/a | n/a | 0.086 | 5.050 | 0.007 | 0.086 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001d2 | 709.575 | 3.446 | n/a | 0.000 | 0.000 | 0.502 | 705.394 | 0.009 | n/a | 0.049 | 0.000 | n/a | n/a | 0.176 | 3.446 | 0.005 | 0.176 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001d9 | 622.794 | 4.102 | n/a | 0.000 | 0.000 | 1.008 | 617.433 | 0.009 | n/a | 0.072 | 0.000 | n/a | n/a | 0.170 | 4.102 | 0.007 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001bd | 597.363 | 5.313 | n/a | 0.000 | 0.000 | 0.816 | 591.084 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.114 | 5.313 | 0.009 | 0.114 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000019d | 589.788 | 4.101 | n/a | 0.000 | 0.000 | 0.599 | 584.795 | 0.015 | n/a | 0.050 | 0.000 | n/a | n/a | 0.227 | 4.101 | 0.007 | 0.227 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001d5 | 547.469 | 2.408 | n/a | 0.000 | 0.000 | 0.704 | 544.108 | 0.014 | n/a | 0.128 | 0.000 | n/a | n/a | 0.107 | 2.408 | 0.004 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001a4 | 519.923 | 4.313 | n/a | 0.000 | 0.000 | 0.833 | 514.630 | 0.005 | n/a | 0.050 | 0.000 | n/a | n/a | 0.091 | 4.313 | 0.008 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001ca | 500.246 | 3.285 | n/a | 0.000 | 0.000 | 0.417 | 496.406 | 0.006 | n/a | 0.028 | 0.000 | n/a | n/a | 0.104 | 3.285 | 0.007 | 0.104 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001ad | 462.277 | 5.474 | n/a | 0.000 | 0.000 | 0.786 | 455.851 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 0.102 | 5.474 | 0.012 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001b4 | 446.274 | 7.990 | n/a | 0.000 | 0.000 | 0.863 | 437.242 | 0.004 | n/a | 0.032 | 0.000 | n/a | n/a | 0.143 | 7.990 | 0.018 | 0.143 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001b2 | 444.451 | 6.434 | n/a | 0.000 | 0.000 | 0.614 | 437.144 | 0.010 | n/a | 0.029 | 0.000 | n/a | n/a | 0.221 | 6.434 | 0.014 | 0.221 | gw-r/thread-46/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 419.084 | n/a | n/a | n/a | 2.968 | n/a | 0.000 | 0.000 | 0.652 | 415.961 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.086 | 2.968 | 0.008 | 0.086 |
| p99 | 1003.112 | n/a | n/a | n/a | 19.218 | n/a | 1.539 | 0.000 | 5.542 | 1000.770 | 0.021 | n/a | 0.088 | 0.000 | n/a | n/a | 49.090 | 20.757 | 0.593 | 49.090 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000000202 | 1003.112 | 4.369 | n/a | 0.000 | 0.000 | 0.666 | 997.883 | 0.007 | n/a | 0.053 | 0.000 | n/a | n/a | 0.134 | 4.369 | 0.004 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000021a | 1002.547 | 0.117 | n/a | 0.000 | 0.000 | 0.497 | 1000.770 | 0.007 | n/a | 0.051 | 0.000 | n/a | n/a | 1.104 | 0.117 | 0.000 | 1.104 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000215 | 1001.997 | 2.693 | n/a | 0.000 | 0.000 | 0.757 | 998.418 | 0.007 | n/a | 0.050 | 0.000 | n/a | n/a | 0.073 | 2.693 | 0.003 | 0.073 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000020b | 999.750 | 2.588 | n/a | 0.000 | 0.000 | 0.590 | 996.448 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.071 | 2.588 | 0.003 | 0.071 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001ee | 995.806 | 2.378 | n/a | 0.000 | 0.000 | 0.667 | 992.633 | 0.010 | n/a | 0.036 | 0.000 | n/a | n/a | 0.081 | 2.378 | 0.002 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000219 | 986.589 | 2.680 | n/a | 0.000 | 0.000 | 0.444 | 983.327 | 0.006 | n/a | 0.040 | 0.000 | n/a | n/a | 0.092 | 2.680 | 0.003 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000021c | 976.365 | 3.845 | n/a | 0.000 | 0.000 | 0.497 | 971.807 | 0.010 | n/a | 0.043 | 0.000 | n/a | n/a | 0.163 | 3.845 | 0.004 | 0.163 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000216 | 958.217 | 19.218 | n/a | 1.539 | 0.000 | 0.660 | 936.330 | 0.014 | n/a | 0.058 | 0.000 | n/a | n/a | 0.398 | 20.757 | 0.022 | 0.398 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001f8 | 944.609 | 2.981 | n/a | 0.000 | 0.000 | 0.516 | 940.910 | 0.010 | n/a | 0.047 | 0.000 | n/a | n/a | 0.146 | 2.981 | 0.003 | 0.146 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001fc | 869.948 | 2.831 | n/a | 0.000 | 0.000 | 0.486 | 866.496 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.080 | 2.831 | 0.003 | 0.080 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001ec | 799.150 | 5.104 | n/a | 0.000 | 0.000 | 0.410 | 793.366 | 0.007 | n/a | 0.033 | 0.000 | n/a | n/a | 0.230 | 5.104 | 0.006 | 0.230 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000203 | 675.660 | 2.501 | n/a | 0.000 | 0.000 | 3.395 | 669.656 | 0.006 | n/a | 0.019 | 0.000 | n/a | n/a | 0.083 | 2.501 | 0.004 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000213 | 620.108 | 2.752 | n/a | 0.000 | 0.000 | 0.779 | 616.462 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.073 | 2.752 | 0.004 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000206 | 613.682 | 2.681 | n/a | 0.000 | 0.000 | 0.514 | 610.351 | 0.012 | n/a | 0.059 | 0.000 | n/a | n/a | 0.065 | 2.681 | 0.004 | 0.065 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001f2 | 604.253 | 4.152 | n/a | 0.000 | 0.000 | 0.709 | 599.239 | 0.011 | n/a | 0.067 | 0.000 | n/a | n/a | 0.075 | 4.152 | 0.007 | 0.075 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001f4 | 588.352 | 3.343 | n/a | 0.000 | 0.000 | 0.626 | 584.271 | 0.007 | n/a | 0.042 | 0.000 | n/a | n/a | 0.063 | 3.343 | 0.006 | 0.063 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001e1 | 584.948 | 4.741 | n/a | 0.000 | 0.000 | 0.704 | 579.318 | 0.006 | n/a | 0.088 | 0.000 | n/a | n/a | 0.091 | 4.741 | 0.008 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001df | 521.676 | 4.194 | n/a | 0.000 | 0.000 | 0.973 | 516.402 | 0.005 | n/a | 0.029 | 0.000 | n/a | n/a | 0.073 | 4.194 | 0.008 | 0.073 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001e7 | 500.295 | 3.979 | n/a | 0.000 | 0.000 | 3.104 | 493.026 | 0.006 | n/a | 0.048 | 0.000 | n/a | n/a | 0.132 | 3.979 | 0.008 | 0.132 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f500000000000001de | 481.153 | 3.484 | n/a | 0.000 | 0.000 | 0.736 | 476.830 | 0.007 | n/a | 0.029 | 0.000 | n/a | n/a | 0.066 | 3.484 | 0.007 | 0.066 | gw-r/thread-46/journal/page | none observed |

## P3 / L1024 / internal (723 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.720 | n/a | n/a | n/a | 3.479 | n/a | 0.000 | 0.000 | 0.265 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.707 | 3.479 | 0.274 | 7.707 |
| p99 | 241.522 | n/a | n/a | n/a | 18.070 | n/a | 1.132 | 0.000 | 2.301 | 238.355 | 0.012 | n/a | 0.058 | 0.000 | n/a | n/a | 47.067 | 18.705 | 0.811 | 47.067 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000000228 | 1016.752 | 2.358 | n/a | 0.000 | 0.000 | 0.511 | 1013.728 | 0.005 | n/a | 0.047 | 0.000 | n/a | n/a | 0.102 | 2.358 | 0.002 | 0.102 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000021d | 736.421 | 3.804 | n/a | 0.000 | 0.000 | 0.745 | 731.691 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.113 | 3.804 | 0.005 | 0.113 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000229 | 690.448 | 2.037 | n/a | 0.000 | 0.000 | 0.447 | 687.805 | 0.012 | n/a | 0.065 | 0.000 | n/a | n/a | 0.082 | 2.037 | 0.003 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000225 | 630.400 | 2.359 | n/a | 0.000 | 0.000 | 0.663 | 627.182 | 0.012 | n/a | 0.069 | 0.000 | n/a | n/a | 0.116 | 2.359 | 0.004 | 0.116 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000220 | 578.700 | 2.205 | n/a | 0.000 | 0.000 | 2.704 | 573.559 | 0.006 | n/a | 0.126 | 0.000 | n/a | n/a | 0.100 | 2.205 | 0.004 | 0.100 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000226 | 389.542 | 3.160 | n/a | 0.000 | 0.000 | 1.378 | 384.860 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.099 | 3.160 | 0.008 | 0.099 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000021e | 266.820 | 3.460 | n/a | 0.000 | 0.000 | 0.647 | 262.511 | 0.012 | n/a | 0.043 | 0.000 | n/a | n/a | 0.147 | 3.460 | 0.013 | 0.147 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000221 | 241.522 | 2.512 | n/a | 0.000 | 0.000 | 0.507 | 238.355 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.092 | 2.512 | 0.010 | 0.092 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000223 | 170.924 | 3.276 | n/a | 0.000 | 0.000 | 2.332 | 165.103 | 0.004 | n/a | 0.050 | 0.000 | n/a | n/a | 0.159 | 3.276 | 0.019 | 0.159 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f500000000000003fb | 144.843 | 6.661 | n/a | 0.000 | 0.000 | 0.389 | 137.694 | 0.008 | n/a | 0.026 | 0.000 | n/a | n/a | 0.065 | 6.661 | 0.046 | 0.065 | gw-r/thread-65/journal/page | none observed |
| 95a831e6fe7ef0f500000000000002e7 | 117.765 | 20.617 | n/a | 0.000 | 0.000 | 17.119 | 74.469 | 0.053 | n/a | 4.676 | 0.000 | n/a | n/a | 0.831 | 20.617 | 0.175 | 0.831 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000444 | 108.448 | 7.341 | n/a | 0.000 | 0.000 | 2.121 | 98.808 | 0.017 | n/a | 0.062 | 0.000 | n/a | n/a | 0.100 | 7.341 | 0.068 | 0.100 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000004d6 | 106.322 | 6.246 | n/a | 0.000 | 0.000 | 0.719 | 99.206 | 0.004 | n/a | 0.042 | 0.000 | n/a | n/a | 0.105 | 6.246 | 0.059 | 0.105 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000064a | 101.252 | 5.156 | n/a | 0.000 | 0.000 | 0.635 | 95.360 | 0.003 | n/a | 0.014 | 0.000 | n/a | n/a | 0.084 | 5.156 | 0.051 | 0.084 | gw-r/thread-65/journal/page | none observed |
| 95a831e6fe7ef0f50000000000000737 | 91.559 | 2.685 | n/a | 0.000 | 0.000 | 0.510 | 88.277 | 0.002 | n/a | 0.009 | 0.000 | n/a | n/a | 0.074 | 2.685 | 0.029 | 0.074 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000061c | 91.497 | 4.077 | n/a | 0.000 | 0.000 | 0.344 | 86.854 | 0.133 | n/a | 0.011 | 0.000 | n/a | n/a | 0.078 | 4.077 | 0.045 | 0.078 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f500000000000005d1 | 90.003 | 3.934 | n/a | 0.000 | 0.000 | 1.050 | 84.712 | 0.187 | n/a | 0.032 | 0.000 | n/a | n/a | 0.088 | 3.934 | 0.044 | 0.088 | gw-r/thread-42/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000077b | 89.364 | 2.827 | n/a | 0.000 | 0.000 | 0.315 | 86.139 | 0.003 | n/a | 0.007 | 0.000 | n/a | n/a | 0.073 | 2.827 | 0.032 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f5000000000000045b | 87.711 | 3.455 | n/a | 0.000 | 0.000 | 0.450 | 83.656 | 0.004 | n/a | 0.034 | 0.000 | n/a | n/a | 0.112 | 3.455 | 0.039 | 0.112 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f500000000000002e8 | 82.088 | 18.902 | n/a | 0.000 | 0.000 | 2.424 | 60.020 | 0.007 | n/a | 0.239 | 0.000 | n/a | n/a | 0.498 | 18.902 | 0.230 | 0.498 | gw-r/thread-47/journal/page | none observed |

## P3 / tail / internal (2245 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.856 | n/a | n/a | n/a | 4.265 | n/a | 0.000 | 0.000 | 0.242 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.250 | 4.290 | 0.348 | 6.250 |
| p99 | 344.523 | n/a | n/a | n/a | 18.815 | n/a | 1.568 | 0.000 | 1.886 | 341.140 | 0.014 | n/a | 0.040 | 0.000 | n/a | n/a | 46.763 | 20.230 | 0.844 | 46.763 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 95a831e6fe7ef0f50000000000001a8c | 1003.052 | 3.882 | n/a | 0.000 | 0.000 | 0.487 | 996.723 | 0.004 | n/a | 0.027 | 0.000 | n/a | n/a | 1.930 | 3.882 | 0.004 | 1.930 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a47 | 1002.616 | 0.203 | n/a | 0.000 | 0.000 | 0.502 | 1000.734 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 1.117 | 0.203 | 0.000 | 1.117 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a6a | 1002.493 | 0.148 | n/a | 0.000 | 0.000 | 0.532 | 1000.665 | 0.008 | n/a | 0.035 | 0.000 | n/a | n/a | 1.105 | 0.148 | 0.000 | 1.105 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a94 | 1002.094 | 0.093 | n/a | 0.000 | 0.000 | 0.281 | 1000.593 | 0.006 | n/a | 0.038 | 0.000 | n/a | n/a | 1.083 | 0.093 | 0.000 | 1.083 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a46 | 1001.160 | 3.697 | n/a | 0.000 | 0.000 | 0.650 | 996.725 | 0.004 | n/a | 0.020 | 0.000 | n/a | n/a | 0.063 | 3.697 | 0.004 | 0.063 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a51 | 999.998 | 3.559 | n/a | 0.000 | 0.000 | 2.489 | 993.810 | 0.008 | n/a | 0.036 | 0.000 | n/a | n/a | 0.096 | 3.559 | 0.004 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a90 | 981.800 | 4.268 | n/a | 0.000 | 0.000 | 0.857 | 976.525 | 0.005 | n/a | 0.048 | 0.000 | n/a | n/a | 0.095 | 4.268 | 0.004 | 0.095 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a6d | 916.796 | 3.376 | n/a | 0.000 | 0.000 | 0.503 | 912.676 | 0.006 | n/a | 0.024 | 0.000 | n/a | n/a | 0.210 | 3.376 | 0.004 | 0.210 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a5b | 841.801 | 6.537 | n/a | 0.000 | 0.000 | 0.295 | 834.749 | 0.010 | n/a | 0.040 | 0.000 | n/a | n/a | 0.170 | 6.537 | 0.008 | 0.170 | gw-r/thread-46/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a4c | 813.022 | 6.396 | n/a | 0.000 | 0.000 | 0.621 | 805.771 | 0.045 | n/a | 0.031 | 0.000 | n/a | n/a | 0.158 | 6.396 | 0.008 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a49 | 730.058 | 12.834 | n/a | 0.000 | 0.000 | 0.835 | 716.070 | 0.006 | n/a | 0.026 | 0.000 | n/a | n/a | 0.287 | 12.834 | 0.018 | 0.287 | gw-r/thread-40/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a66 | 708.917 | 2.051 | n/a | 0.000 | 0.000 | 0.342 | 706.404 | 0.005 | n/a | 0.020 | 0.000 | n/a | n/a | 0.096 | 2.051 | 0.003 | 0.096 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a61 | 682.421 | 5.327 | n/a | 0.000 | 0.000 | 0.414 | 676.450 | 0.014 | n/a | 0.036 | 0.000 | n/a | n/a | 0.179 | 5.327 | 0.008 | 0.179 | gw-r/thread-47/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a85 | 656.850 | 2.751 | n/a | 0.000 | 0.000 | 0.463 | 653.511 | 0.009 | n/a | 0.038 | 0.000 | n/a | n/a | 0.078 | 2.751 | 0.004 | 0.078 | gw-r/thread-45/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a8d | 644.818 | 2.990 | n/a | 0.000 | 0.000 | 1.062 | 640.569 | 0.010 | n/a | 0.053 | 0.000 | n/a | n/a | 0.134 | 2.990 | 0.005 | 0.134 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a7b | 571.234 | 3.430 | n/a | 0.000 | 0.000 | 0.450 | 567.202 | 0.033 | n/a | 0.041 | 0.000 | n/a | n/a | 0.078 | 3.430 | 0.006 | 0.078 | gw-r/thread-44/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a52 | 474.988 | 3.077 | n/a | 0.000 | 0.000 | 0.403 | 471.361 | 0.012 | n/a | 0.040 | 0.000 | n/a | n/a | 0.095 | 3.077 | 0.006 | 0.095 | gw-r/thread-43/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a6f | 463.627 | 9.437 | n/a | 0.000 | 0.000 | 0.585 | 453.343 | 0.003 | n/a | 0.020 | 0.000 | n/a | n/a | 0.239 | 9.437 | 0.020 | 0.239 | gw-r/thread-65/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a87 | 458.296 | 3.041 | n/a | 0.000 | 0.000 | 0.657 | 454.471 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.089 | 3.041 | 0.007 | 0.089 | gw-r/thread-65/journal/page | none observed |
| 95a831e6fe7ef0f50000000000001a88 | 455.806 | 3.814 | n/a | 0.000 | 0.000 | 0.296 | 451.543 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.081 | 3.814 | 0.008 | 0.081 | gw-r/thread-44/journal/page | none observed |

## P3 / warmup / read (73 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.571 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 201.360 | 0.019 | n/a | 0.152 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 |
| p99 | 212.931 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.710 | 206.870 | 4.312 | n/a | 9.365 | 0.000 | n/a | n/a | 0.405 | 0.000 | 0.000 | 0.405 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da000000000000002b | 212.931 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 202.519 | 0.018 | n/a | 9.365 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000003e | 209.299 | 0.000 | n/a | 0.000 | 0.000 | 5.664 | 203.129 | 0.041 | n/a | 0.213 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000021 | 208.576 | 0.000 | n/a | 0.000 | 0.000 | 2.741 | 205.523 | 0.014 | n/a | 0.168 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000000d | 208.558 | 0.000 | n/a | 0.000 | 0.000 | 2.815 | 205.301 | 0.021 | n/a | 0.234 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000000f | 207.959 | 0.000 | n/a | 0.000 | 0.000 | 0.788 | 206.870 | 0.092 | n/a | 0.102 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000046 | 206.983 | 0.000 | n/a | 0.000 | 0.000 | 2.061 | 204.635 | 0.014 | n/a | 0.157 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000049 | 206.710 | 0.000 | n/a | 0.000 | 0.000 | 2.260 | 201.817 | 2.342 | n/a | 0.166 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000020 | 206.393 | 0.000 | n/a | 0.000 | 0.000 | 3.776 | 202.138 | 0.073 | n/a | 0.252 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000008 | 206.292 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 204.906 | 0.212 | n/a | 0.179 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000041 | 205.994 | 0.000 | n/a | 0.000 | 0.000 | 2.774 | 202.819 | 0.023 | n/a | 0.244 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000015 | 205.956 | 0.000 | n/a | 0.000 | 0.000 | 2.486 | 202.924 | 0.033 | n/a | 0.168 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000001c | 205.668 | 0.000 | n/a | 0.000 | 0.000 | 0.903 | 204.500 | 0.028 | n/a | 0.109 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000035 | 205.460 | 0.000 | n/a | 0.000 | 0.000 | 3.369 | 201.662 | 0.023 | n/a | 0.229 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000040 | 205.356 | 0.000 | n/a | 0.000 | 0.000 | 1.014 | 203.996 | 0.020 | n/a | 0.152 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000050 | 205.159 | 0.000 | n/a | 0.000 | 0.000 | 0.546 | 204.271 | 0.049 | n/a | 0.190 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000002c | 205.017 | 0.000 | n/a | 0.000 | 0.000 | 3.351 | 201.332 | 0.017 | n/a | 0.183 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da000000000000003d | 204.945 | 0.000 | n/a | 0.000 | 0.000 | 2.260 | 202.383 | 0.035 | n/a | 0.125 | 0.000 | n/a | n/a | 0.142 | 0.000 | 0.000 | 0.142 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000004a | 203.989 | 0.000 | n/a | 0.000 | 0.000 | 0.642 | 202.939 | 0.119 | n/a | 0.156 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da000000000000005b | 203.793 | 0.000 | n/a | 0.000 | 0.000 | 1.579 | 201.373 | 0.027 | n/a | 0.421 | 0.000 | n/a | n/a | 0.393 | 0.000 | 0.000 | 0.393 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000000e | 203.782 | 0.000 | n/a | 0.000 | 0.000 | 1.916 | 201.472 | 0.015 | n/a | 0.223 | 0.000 | n/a | n/a | 0.157 | 0.000 | 0.000 | 0.157 | gw-r/thread-44/journal/page | none observed |

## P3 / L1 / read (89 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.362 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.958 | 201.120 | 0.016 | n/a | 0.110 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 207.689 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 6.216 | 206.181 | 32.094 | n/a | 0.736 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da000000000000007c | 207.689 | 0.000 | n/a | 0.000 | 0.000 | 1.264 | 206.181 | 0.015 | n/a | 0.098 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da000000000000008d | 207.228 | 0.000 | n/a | 0.000 | 0.000 | 6.216 | 200.778 | 0.014 | n/a | 0.101 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da000000000000009f | 206.903 | 0.000 | n/a | 0.000 | 0.000 | 0.912 | 205.611 | 0.082 | n/a | 0.158 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000000be | 206.137 | 0.000 | n/a | 0.000 | 0.000 | 0.639 | 205.184 | 0.014 | n/a | 0.114 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000005f | 205.815 | 0.000 | n/a | 0.000 | 0.000 | 0.690 | 204.770 | 0.096 | n/a | 0.138 | 0.000 | n/a | n/a | 0.121 | 0.000 | 0.000 | 0.121 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000069 | 205.650 | 0.000 | n/a | 0.000 | 0.000 | 4.508 | 200.898 | 0.012 | n/a | 0.101 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da00000000000000c1 | 205.579 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 204.425 | 0.010 | n/a | 0.153 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000063 | 205.420 | 0.000 | n/a | 0.000 | 0.000 | 0.637 | 204.558 | 0.012 | n/a | 0.094 | 0.000 | n/a | n/a | 0.118 | 0.000 | 0.000 | 0.118 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000007e | 205.402 | 0.000 | n/a | 0.000 | 0.000 | 0.592 | 204.585 | 0.022 | n/a | 0.073 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da00000000000000bc | 205.248 | 0.000 | n/a | 0.000 | 0.000 | 0.821 | 204.177 | 0.016 | n/a | 0.145 | 0.000 | n/a | n/a | 0.090 | 0.000 | 0.000 | 0.090 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000000a6 | 205.028 | 0.000 | n/a | 0.000 | 0.000 | 0.636 | 204.139 | 0.016 | n/a | 0.121 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da00000000000000a1 | 204.862 | 0.000 | n/a | 0.000 | 0.000 | 0.711 | 203.902 | 0.014 | n/a | 0.099 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000090 | 204.839 | 0.000 | n/a | 0.000 | 0.000 | 1.510 | 202.463 | 0.112 | n/a | 0.378 | 0.000 | n/a | n/a | 0.375 | 0.000 | 0.000 | 0.375 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da000000000000006d | 204.829 | 0.000 | n/a | 0.000 | 0.000 | 0.616 | 203.957 | 0.014 | n/a | 0.072 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000099 | 204.469 | 0.000 | n/a | 0.000 | 0.000 | 2.531 | 201.531 | 0.045 | n/a | 0.253 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da00000000000000a7 | 204.080 | 0.000 | n/a | 0.000 | 0.000 | 1.108 | 202.715 | 0.018 | n/a | 0.123 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000000a9 | 204.052 | 0.000 | n/a | 0.000 | 0.000 | 2.089 | 201.596 | 0.010 | n/a | 0.111 | 0.000 | n/a | n/a | 0.246 | 0.000 | 0.000 | 0.246 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000092 | 204.034 | 0.000 | n/a | 0.000 | 0.000 | 2.253 | 201.361 | 0.031 | n/a | 0.197 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000064 | 203.942 | 0.000 | n/a | 0.000 | 0.000 | 1.064 | 202.195 | 0.024 | n/a | 0.518 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000008f | 203.814 | 0.000 | n/a | 0.000 | 0.000 | 1.198 | 201.605 | 0.035 | n/a | 0.736 | 0.000 | n/a | n/a | 0.240 | 0.000 | 0.000 | 0.240 | gw-r/thread-45/journal/page | none observed |

## P3 / L4 / read (91 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.170 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.940 | 201.021 | 0.010 | n/a | 0.083 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 |
| p99 | 206.458 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.871 | 204.751 | 4.747 | n/a | 0.177 | 0.000 | n/a | n/a | 50.062 | 0.000 | 0.000 | 50.062 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da00000000000000cc | 206.458 | 0.000 | n/a | 0.000 | 0.000 | 4.871 | 201.280 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000000cf | 206.452 | 0.000 | n/a | 0.000 | 0.000 | 1.314 | 204.751 | 0.033 | n/a | 0.134 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000011f | 204.547 | 0.000 | n/a | 0.000 | 0.000 | 3.209 | 201.125 | 0.008 | n/a | 0.092 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da00000000000000c5 | 203.852 | 0.000 | n/a | 0.000 | 0.000 | 2.863 | 200.758 | 0.009 | n/a | 0.088 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da00000000000000e8 | 203.722 | 0.000 | n/a | 0.000 | 0.000 | 1.461 | 201.852 | 0.035 | n/a | 0.165 | 0.000 | n/a | n/a | 0.209 | 0.000 | 0.000 | 0.209 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000115 | 203.650 | 0.000 | n/a | 0.000 | 0.000 | 2.428 | 200.939 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da00000000000000fd | 203.516 | 0.000 | n/a | 0.000 | 0.000 | 0.906 | 202.334 | 0.032 | n/a | 0.100 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000010a | 203.387 | 0.000 | n/a | 0.000 | 0.000 | 0.889 | 202.158 | 0.016 | n/a | 0.146 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000000e5 | 203.202 | 0.000 | n/a | 0.000 | 0.000 | 2.037 | 200.907 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000000ea | 203.180 | 0.000 | n/a | 0.000 | 0.000 | 1.255 | 201.666 | 0.007 | n/a | 0.073 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da00000000000000e9 | 203.119 | 0.000 | n/a | 0.000 | 0.000 | 1.322 | 201.356 | 0.017 | n/a | 0.127 | 0.000 | n/a | n/a | 0.297 | 0.000 | 0.000 | 0.297 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000000f9 | 203.104 | 0.000 | n/a | 0.000 | 0.000 | 0.920 | 201.929 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da00000000000000fc | 203.095 | 0.000 | n/a | 0.000 | 0.000 | 0.826 | 202.006 | 0.047 | n/a | 0.086 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000113 | 203.069 | 0.000 | n/a | 0.000 | 0.000 | 0.994 | 201.798 | 0.010 | n/a | 0.130 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000000fe | 203.049 | 0.000 | n/a | 0.000 | 0.000 | 1.011 | 201.800 | 0.015 | n/a | 0.117 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da00000000000000c6 | 202.960 | 0.000 | n/a | 0.000 | 0.000 | 1.096 | 201.593 | 0.007 | n/a | 0.097 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000000e2 | 202.914 | 0.000 | n/a | 0.000 | 0.000 | 1.393 | 201.134 | 0.010 | n/a | 0.109 | 0.000 | n/a | n/a | 0.268 | 0.000 | 0.000 | 0.268 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da00000000000000ed | 202.875 | 0.000 | n/a | 0.000 | 0.000 | 1.268 | 201.345 | 0.009 | n/a | 0.108 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000114 | 202.858 | 0.000 | n/a | 0.000 | 0.000 | 1.406 | 201.145 | 0.020 | n/a | 0.081 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000128 | 202.815 | 0.000 | n/a | 0.000 | 0.000 | 0.697 | 201.756 | 0.019 | n/a | 0.177 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-43/journal/page | none observed |

## P3 / L16 / read (90 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.878 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.789 | 200.926 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 |
| p99 | 207.405 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.740 | 204.722 | 3.989 | n/a | 0.532 | 0.000 | n/a | n/a | 0.632 | 0.000 | 0.000 | 0.632 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da0000000000000151 | 207.405 | 0.000 | n/a | 0.000 | 0.000 | 4.740 | 202.332 | 0.021 | n/a | 0.137 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000013b | 206.883 | 0.000 | n/a | 0.000 | 0.000 | 3.000 | 203.649 | 0.006 | n/a | 0.060 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da000000000000013d | 205.721 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 204.722 | 0.020 | n/a | 0.097 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000012d | 205.683 | 0.000 | n/a | 0.000 | 0.000 | 0.729 | 204.611 | 0.021 | n/a | 0.188 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000150 | 204.980 | 0.000 | n/a | 0.000 | 0.000 | 1.637 | 202.585 | 0.022 | n/a | 0.480 | 0.000 | n/a | n/a | 0.256 | 0.000 | 0.000 | 0.256 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000138 | 204.458 | 0.000 | n/a | 0.000 | 0.000 | 1.274 | 202.841 | 0.008 | n/a | 0.089 | 0.000 | n/a | n/a | 0.247 | 0.000 | 0.000 | 0.247 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da000000000000014f | 204.026 | 0.000 | n/a | 0.000 | 0.000 | 1.860 | 201.397 | 0.015 | n/a | 0.121 | 0.000 | n/a | n/a | 0.632 | 0.000 | 0.000 | 0.632 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000164 | 204.022 | 0.000 | n/a | 0.000 | 0.000 | 0.919 | 202.283 | 0.094 | n/a | 0.532 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000012f | 203.495 | 0.000 | n/a | 0.000 | 0.000 | 2.386 | 200.926 | 0.008 | n/a | 0.074 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da000000000000014e | 203.153 | 0.000 | n/a | 0.000 | 0.000 | 1.633 | 201.344 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000160 | 203.152 | 0.000 | n/a | 0.000 | 0.000 | 1.474 | 201.241 | 0.016 | n/a | 0.128 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000191 | 203.097 | 0.000 | n/a | 0.000 | 0.000 | 1.052 | 201.630 | 0.032 | n/a | 0.125 | 0.000 | n/a | n/a | 0.257 | 0.000 | 0.000 | 0.257 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000155 | 203.006 | 0.000 | n/a | 0.000 | 0.000 | 1.720 | 201.052 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000167 | 202.877 | 0.000 | n/a | 0.000 | 0.000 | 1.345 | 201.295 | 0.007 | n/a | 0.107 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000186 | 202.869 | 0.000 | n/a | 0.000 | 0.000 | 1.227 | 201.327 | 0.008 | n/a | 0.091 | 0.000 | n/a | n/a | 0.216 | 0.000 | 0.000 | 0.216 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000144 | 202.855 | 0.000 | n/a | 0.000 | 0.000 | 0.620 | 201.954 | 0.012 | n/a | 0.123 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da000000000000018e | 202.684 | 0.000 | n/a | 0.000 | 0.000 | 1.869 | 200.633 | 0.006 | n/a | 0.054 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000013e | 202.680 | 0.000 | n/a | 0.000 | 0.000 | 1.331 | 201.013 | 0.008 | n/a | 0.075 | 0.000 | n/a | n/a | 0.253 | 0.000 | 0.000 | 0.253 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da000000000000015c | 202.660 | 0.000 | n/a | 0.000 | 0.000 | 1.051 | 201.297 | 0.015 | n/a | 0.094 | 0.000 | n/a | n/a | 0.204 | 0.000 | 0.000 | 0.204 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000172 | 202.627 | 0.000 | n/a | 0.000 | 0.000 | 0.874 | 201.434 | 0.045 | n/a | 0.122 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-45/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.840 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.740 | 200.830 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 |
| p99 | 206.074 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.497 | 203.761 | 5.094 | n/a | 0.338 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da000000000000019e | 227.215 | 0.000 | n/a | 0.000 | 0.000 | 22.948 | 203.761 | 0.022 | n/a | 0.171 | 0.000 | n/a | n/a | 0.313 | 0.000 | 0.000 | 0.313 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da00000000000001dd | 206.074 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 204.821 | 0.031 | n/a | 0.129 | 0.000 | n/a | n/a | 0.312 | 0.000 | 0.000 | 0.312 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da00000000000001eb | 204.578 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 203.372 | 0.077 | n/a | 0.338 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da00000000000001cb | 204.522 | 0.000 | n/a | 0.000 | 0.000 | 2.850 | 201.335 | 0.008 | n/a | 0.077 | 0.000 | n/a | n/a | 0.251 | 0.000 | 0.000 | 0.251 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000001cc | 203.681 | 0.000 | n/a | 0.000 | 0.000 | 1.657 | 201.717 | 0.011 | n/a | 0.119 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da00000000000001c3 | 203.629 | 0.000 | n/a | 0.000 | 0.000 | 1.466 | 201.889 | 0.010 | n/a | 0.094 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da00000000000001c1 | 203.491 | 0.000 | n/a | 0.000 | 0.000 | 2.479 | 200.765 | 0.008 | n/a | 0.054 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000001cf | 203.489 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 202.336 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da00000000000001f2 | 203.143 | 0.000 | n/a | 0.000 | 0.000 | 1.463 | 201.376 | 0.011 | n/a | 0.095 | 0.000 | n/a | n/a | 0.198 | 0.000 | 0.000 | 0.198 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000001b4 | 202.899 | 0.000 | n/a | 0.000 | 0.000 | 2.047 | 200.664 | 0.007 | n/a | 0.055 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da00000000000001ac | 202.804 | 0.000 | n/a | 0.000 | 0.000 | 1.100 | 201.467 | 0.010 | n/a | 0.116 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000001f0 | 202.799 | 0.000 | n/a | 0.000 | 0.000 | 0.752 | 200.794 | 0.010 | n/a | 1.144 | 0.000 | n/a | n/a | 0.099 | 0.000 | 0.000 | 0.099 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da00000000000001a5 | 202.774 | 0.000 | n/a | 0.000 | 0.000 | 0.797 | 201.778 | 0.009 | n/a | 0.079 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da00000000000001d7 | 202.656 | 0.000 | n/a | 0.000 | 0.000 | 0.785 | 201.575 | 0.015 | n/a | 0.120 | 0.000 | n/a | n/a | 0.160 | 0.000 | 0.000 | 0.160 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000195 | 202.586 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.024 | 0.179 | n/a | 0.076 | 0.000 | n/a | n/a | 0.236 | 0.000 | 0.000 | 0.236 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da00000000000001a8 | 202.541 | 0.000 | n/a | 0.000 | 0.000 | 0.883 | 201.377 | 0.007 | n/a | 0.109 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da00000000000001fb | 202.493 | 0.000 | n/a | 0.000 | 0.000 | 0.866 | 201.392 | 0.021 | n/a | 0.116 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da00000000000001e6 | 202.443 | 0.000 | n/a | 0.000 | 0.000 | 0.870 | 201.357 | 0.006 | n/a | 0.108 | 0.000 | n/a | n/a | 0.101 | 0.000 | 0.000 | 0.101 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da00000000000001bc | 202.436 | 0.000 | n/a | 0.000 | 0.000 | 1.462 | 200.781 | 0.007 | n/a | 0.076 | 0.000 | n/a | n/a | 0.111 | 0.000 | 0.000 | 0.111 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da00000000000001f3 | 202.387 | 0.000 | n/a | 0.000 | 0.000 | 0.735 | 201.407 | 0.012 | n/a | 0.107 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-43/journal/page | none observed |

## P3 / L256 / read (101 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.744 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 200.841 | 0.010 | n/a | 0.066 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 205.209 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.420 | 203.683 | 2.549 | n/a | 0.142 | 0.000 | n/a | n/a | 0.291 | 0.000 | 0.000 | 0.291 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da0000000000000219 | 208.536 | 0.000 | n/a | 0.000 | 0.000 | 1.915 | 206.436 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da000000000000023d | 205.209 | 0.000 | n/a | 0.000 | 0.000 | 4.113 | 200.811 | 0.008 | n/a | 0.072 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000243 | 204.752 | 0.000 | n/a | 0.000 | 0.000 | 0.871 | 203.683 | 0.011 | n/a | 0.084 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000276 | 204.710 | 0.000 | n/a | 0.000 | 0.000 | 3.420 | 201.096 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000254 | 204.109 | 0.000 | n/a | 0.000 | 0.000 | 3.246 | 200.681 | 0.006 | n/a | 0.053 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000023b | 202.925 | 0.000 | n/a | 0.000 | 0.000 | 1.139 | 201.503 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000224 | 202.837 | 0.000 | n/a | 0.000 | 0.000 | 0.998 | 201.535 | 0.014 | n/a | 0.109 | 0.000 | n/a | n/a | 0.181 | 0.000 | 0.000 | 0.181 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da000000000000020b | 202.752 | 0.000 | n/a | 0.000 | 0.000 | 0.760 | 201.724 | 0.016 | n/a | 0.102 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000025c | 202.742 | 0.000 | n/a | 0.000 | 0.000 | 0.802 | 201.649 | 0.016 | n/a | 0.098 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000277 | 202.689 | 0.000 | n/a | 0.000 | 0.000 | 1.248 | 201.200 | 0.007 | n/a | 0.081 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000245 | 202.652 | 0.000 | n/a | 0.000 | 0.000 | 0.662 | 201.684 | 0.017 | n/a | 0.142 | 0.000 | n/a | n/a | 0.147 | 0.000 | 0.000 | 0.147 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000022e | 202.587 | 0.000 | n/a | 0.000 | 0.000 | 1.078 | 201.141 | 0.014 | n/a | 0.092 | 0.000 | n/a | n/a | 0.261 | 0.000 | 0.000 | 0.261 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000228 | 202.494 | 0.000 | n/a | 0.000 | 0.000 | 0.990 | 201.246 | 0.013 | n/a | 0.100 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da000000000000022b | 202.426 | 0.000 | n/a | 0.000 | 0.000 | 0.863 | 201.283 | 0.010 | n/a | 0.121 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da000000000000023c | 202.379 | 0.000 | n/a | 0.000 | 0.000 | 0.781 | 200.975 | 0.326 | n/a | 0.027 | 0.000 | n/a | n/a | 0.270 | 0.000 | 0.000 | 0.270 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da000000000000021a | 202.350 | 0.000 | n/a | 0.000 | 0.000 | 1.001 | 201.149 | 0.006 | n/a | 0.091 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da000000000000021f | 202.349 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.162 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000248 | 202.320 | 0.000 | n/a | 0.000 | 0.000 | 1.263 | 200.879 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000272 | 202.287 | 0.000 | n/a | 0.000 | 0.000 | 0.726 | 201.254 | 0.012 | n/a | 0.105 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da000000000000020e | 202.285 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 201.121 | 0.041 | n/a | 0.068 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-47/journal/page | none observed |

## P3 / L1024 / read (66 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 69.839 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.617 | 68.945 | 0.006 | n/a | 0.042 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 |
| p99 | 210.596 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 8.503 | 201.912 | 28.562 | n/a | 0.253 | 0.000 | n/a | n/a | 0.402 | 0.000 | 0.000 | 0.402 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da000000000000028c | 210.596 | 0.000 | n/a | 0.000 | 0.000 | 8.503 | 201.912 | 0.006 | n/a | 0.070 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000288 | 203.146 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.612 | 0.019 | n/a | 0.253 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000028a | 203.066 | 0.000 | n/a | 0.000 | 0.000 | 1.444 | 201.302 | 0.031 | n/a | 0.064 | 0.000 | n/a | n/a | 0.224 | 0.000 | 0.000 | 0.224 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da000000000000027c | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 0.881 | 201.291 | 0.012 | n/a | 0.135 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000287 | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.153 | 0.011 | n/a | 0.059 | 0.000 | n/a | n/a | 0.194 | 0.000 | 0.000 | 0.194 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da000000000000027b | 202.316 | 0.000 | n/a | 0.000 | 0.000 | 0.712 | 201.386 | 0.011 | n/a | 0.099 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da000000000000028e | 202.273 | 0.000 | n/a | 0.000 | 0.000 | 0.918 | 201.021 | 0.013 | n/a | 0.067 | 0.000 | n/a | n/a | 0.254 | 0.000 | 0.000 | 0.254 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000027d | 202.164 | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 201.128 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000281 | 202.115 | 0.000 | n/a | 0.000 | 0.000 | 1.155 | 200.773 | 0.014 | n/a | 0.064 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000284 | 202.019 | 0.000 | n/a | 0.000 | 0.000 | 0.524 | 201.266 | 0.016 | n/a | 0.115 | 0.000 | n/a | n/a | 0.098 | 0.000 | 0.000 | 0.098 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000282 | 202.015 | 0.000 | n/a | 0.000 | 0.000 | 0.531 | 201.255 | 0.006 | n/a | 0.084 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da000000000000028f | 201.942 | 0.000 | n/a | 0.000 | 0.000 | 0.497 | 201.247 | 0.008 | n/a | 0.076 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000291 | 201.935 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 200.960 | 0.009 | n/a | 0.074 | 0.000 | n/a | n/a | 0.219 | 0.000 | 0.000 | 0.219 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da000000000000028d | 201.679 | 0.000 | n/a | 0.000 | 0.000 | 0.587 | 200.875 | 0.014 | n/a | 0.082 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da000000000000027f | 201.638 | 0.000 | n/a | 0.000 | 0.000 | 0.590 | 200.818 | 0.026 | n/a | 0.053 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000292 | 201.607 | 0.000 | n/a | 0.000 | 0.000 | 0.578 | 200.825 | 0.006 | n/a | 0.067 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000293 | 201.434 | 0.000 | n/a | 0.000 | 0.000 | 0.602 | 200.630 | 0.005 | n/a | 0.046 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000289 | 187.900 | 0.000 | n/a | 0.000 | 0.000 | 0.929 | 186.738 | 0.005 | n/a | 0.037 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-44/journal/page | none observed |
| cc6d39ab59d320da0000000000000286 | 166.284 | 0.000 | n/a | 0.000 | 0.000 | 1.338 | 164.770 | 0.010 | n/a | 0.042 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da000000000000028b | 156.161 | 0.000 | n/a | 0.000 | 0.000 | 0.705 | 149.116 | 6.102 | n/a | 0.035 | 0.000 | n/a | n/a | 0.203 | 0.000 | 0.000 | 0.203 | gw-r/thread-40/journal/page | none observed |

## P3 / tail / read (219 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 88.318 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.542 | 87.215 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 |
| p99 | 203.088 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.682 | 201.542 | 5.802 | n/a | 0.174 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| cc6d39ab59d320da0000000000000ebe | 230.457 | 0.000 | n/a | 0.000 | 0.000 | 0.485 | 229.806 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.083 | 0.000 | 0.000 | 0.083 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000ea8 | 203.291 | 0.000 | n/a | 0.000 | 0.000 | 2.243 | 200.801 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-65/journal/page | none observed |
| cc6d39ab59d320da0000000000000e83 | 203.088 | 0.000 | n/a | 0.000 | 0.000 | 1.000 | 201.625 | 0.015 | n/a | 0.174 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000e82 | 202.852 | 0.000 | n/a | 0.000 | 0.000 | 0.992 | 201.542 | 0.025 | n/a | 0.112 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-65/journal/page | none observed |
| cc6d39ab59d320da0000000000000e79 | 202.803 | 0.000 | n/a | 0.000 | 0.000 | 2.108 | 200.501 | 0.005 | n/a | 0.056 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000e92 | 202.636 | 0.000 | n/a | 0.000 | 0.000 | 1.688 | 200.776 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000ee5 | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 1.524 | 200.842 | 0.009 | n/a | 0.053 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000ed7 | 202.480 | 0.000 | n/a | 0.000 | 0.000 | 1.062 | 201.042 | 0.011 | n/a | 0.060 | 0.000 | n/a | n/a | 0.305 | 0.000 | 0.000 | 0.305 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000e88 | 202.472 | 0.000 | n/a | 0.000 | 0.000 | 1.059 | 201.121 | 0.010 | n/a | 0.092 | 0.000 | n/a | n/a | 0.190 | 0.000 | 0.000 | 0.190 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000eaf | 202.402 | 0.000 | n/a | 0.000 | 0.000 | 0.784 | 201.221 | 0.013 | n/a | 0.109 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000e8c | 202.172 | 0.000 | n/a | 0.000 | 0.000 | 0.655 | 201.101 | 0.015 | n/a | 0.252 | 0.000 | n/a | n/a | 0.150 | 0.000 | 0.000 | 0.150 | gw-r/thread-65/journal/page | none observed |
| cc6d39ab59d320da0000000000000eb3 | 202.146 | 0.000 | n/a | 0.000 | 0.000 | 0.682 | 201.153 | 0.067 | n/a | 0.079 | 0.000 | n/a | n/a | 0.165 | 0.000 | 0.000 | 0.165 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000ee6 | 202.005 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 201.087 | 0.011 | n/a | 0.078 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-43/journal/page | none observed |
| cc6d39ab59d320da0000000000000e7e | 201.992 | 0.000 | n/a | 0.000 | 0.000 | 0.514 | 201.296 | 0.005 | n/a | 0.049 | 0.000 | n/a | n/a | 0.128 | 0.000 | 0.000 | 0.128 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000e84 | 201.976 | 0.000 | n/a | 0.000 | 0.000 | 0.790 | 201.009 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-42/journal/page | none observed |
| cc6d39ab59d320da0000000000000e7d | 201.948 | 0.000 | n/a | 0.000 | 0.000 | 0.646 | 201.083 | 0.009 | n/a | 0.093 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-45/journal/page | none observed |
| cc6d39ab59d320da0000000000000eec | 201.880 | 0.000 | n/a | 0.000 | 0.000 | 0.738 | 200.827 | 0.006 | n/a | 0.064 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-40/journal/page | none observed |
| cc6d39ab59d320da0000000000000eba | 201.878 | 0.000 | n/a | 0.000 | 0.000 | 0.458 | 201.186 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.126 | 0.000 | 0.000 | 0.126 | gw-r/thread-47/journal/page | none observed |
| cc6d39ab59d320da0000000000000e97 | 201.798 | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 200.455 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.106 | 0.000 | 0.000 | 0.106 | gw-r/thread-46/journal/page | none observed |
| cc6d39ab59d320da0000000000000edd | 201.788 | 0.000 | n/a | 0.000 | 0.000 | 0.449 | 201.047 | 0.015 | n/a | 0.146 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 | gw-r/thread-40/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining uninstrumented Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.

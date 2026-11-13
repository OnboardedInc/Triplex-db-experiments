# Trace report

The slowest observed commits spent their largest exclusive interval in `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (257.058 ms, trace `f3b411525e1399cd000000000000045a`); `gw-w/thread-69/peer.transact-await (includes order/network/storage)` (145.603 ms, trace `f3b411525e1399cd0000000000000e4b`); `gw-w/thread-45/peer.transact-await (includes order/network/storage)` (200.584 ms, trace `f3b411525e1399cd00000000000005ed`); `node-15/thread-0/driver.queue.subject` (87.740 ms, trace `f3b411525e1399cd00000000000007d4`); `gw-w/thread-67/peer.transact-await (includes order/network/storage)` (144.165 ms, trace `f3b411525e1399cd0000000000000e49`). These are observed spans, not proof of the closed-source transactor's internal cause.

Run `tx2-dxt1-p4-history-a-2-history-192`; source `a057992d28395c9431fc578a145f4678ae26ea21`; subjects 10000; tracing summary.

Recorders: gateway, node. The summary default keeps Node/gateway spans and system sampling. Full adds JVM JFR, native Datomic logs/metrics and Postgres statement/wait tracing. Without JFR, gateway own scope can include unmeasured JVM GC/safepoints; that GC share is n/a.

Commit coverage: 3709/3711 (99.946%) have at least 95% of wall time covered by named layer spans. Target: 99%. Writer trace completeness: 3711/3711. Raw trace bytes: 8815736.

Units: ms; n/a means not causally measured (including closed transactor/storage shares), not zero work. TypeScript share is a fraction. Quantiles are per column (their values do not add). TypeScript own code is instrumented Node scope wall time excluding observed remote waits/GC, not on-CPU time; it can include unmeasured scheduling waits. Event-loop wait records explicit worker RPC handoff/reply waits after subtracting linked worker/socket/server work. Other per-request event-loop delay is not causally measured (n/a when no RPC); timestamped timer drift is an estimated overlay. Driver offer queue is separate. Peer-wait includes network, transactor queue and storage; these internal shares remain unknown unless independently correlated. No unrelated Postgres or JFR event is assigned to a transaction.

Linux clock alignment: shared boot monotonic clock; 322 source calibrations, offsets preserved in raw traces and trace-summary.json.

Network is residual socket wait around matched gateway spans, including callback scheduling uncertainty. Gateway receive begins at Jetty dispatch: earlier Jetty/socket queue is invisible. Node and gateway observations with the same Linux boot ID are aligned through their measured monotonic offsets. Other host/epoch-only overlays remain approximate. Response-first-byte includes network and callback scheduling; no finer causal claim is made.

Evidence checks: source/run/slot binding, final histograms, writer trace IDs and interval content checked. Oracle: PASS.

## Writer thread scheduler accounting

Actual Linux per-thread counters at request and synchronous span boundaries. Runtime includes Node/runtime/GC work; synchronous-scope columns cover observed synchronous work only. Async scopes can contain another request and are not assigned exclusive CPU. Disabled scheduler wait accounting is n/a.

| phase | readers | observed interval ms | on-CPU runtime ms | waiting for CPU ms | samples |
| --- | ---: | ---: | ---: | ---: | ---: |
| warmup | 16 | 13439.943 | 1039.310 | 1565.896 | 308 |
| L1 | 1 | 19952.284 | 1162.955 | 212.077 | 470 |
| L4 | 4 | 19962.303 | 1613.564 | 1542.204 | 426 |
| L16 | 16 | 19978.616 | 1404.274 | 1929.280 | 474 |
| L64 | 64 | 19965.516 | 1454.516 | 1968.834 | 596 |
| L256 | 256 | 19979.281 | 1599.770 | 2233.530 | 486 |
| tail | 0 | 84568.861 | 16426.398 | 980.949 | 49445 |

## Queue wait dependencies

| trace | cause | ms | behind trace | in-flight at boundary / capacity |
| --- | --- | ---: | --- | --- |
| f3b411525e1399cd000000000000045a | driver.queue.scheduler-late | 0.496 | none | 0 / 32 |
| f3b411525e1399cd000000000000045a | driver.queue.scheduler-dispatch | 0.227 | none | 0 / 32 |

Observed active steps while trace f3b411525e1399cd000000000000045a waited: []

| f3b411525e1399cd0000000000000e4b | driver.queue.scheduler-late | 0.767 | none | 4 / 32 |
| f3b411525e1399cd0000000000000e4b | driver.queue.scheduler-dispatch | 0.114 | none | 4 / 32 |

Observed active steps while trace f3b411525e1399cd0000000000000e4b waited: []

| f3b411525e1399cd00000000000005ed | driver.queue.scheduler-dispatch | 0.052 | none | 0 / 32 |
| f3b411525e1399cd00000000000005ed | driver.queue.scheduler-late | 0.002 | none | 0 / 32 |

Observed active steps while trace f3b411525e1399cd00000000000005ed waited: []

| f3b411525e1399cd00000000000007d4 | driver.queue.subject | 87.740 | f3b411525e1399cd00000000000007d0 | 8 / 32 |
| f3b411525e1399cd00000000000007d4 | driver.queue.scheduler-late | 2.344 | none | 8 / 32 |
| f3b411525e1399cd00000000000007d4 | driver.queue.scheduler-dispatch | 0.070 | none | 6 / 32 |

Observed active steps while trace f3b411525e1399cd00000000000007d4 waited: [{"at":1794600926895.9382,"inFlight":9,"capacity":32,"active":[{"traceId":"f3b411525e1399cd00000000000007cd","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007ce","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007cf","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d0","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d1","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d2","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d3","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d5","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d7","step":"client.http"}]},{"at":1794600926916.1467,"inFlight":12,"capacity":32,"active":[{"traceId":"f3b411525e1399cd00000000000007cd","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007ce","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007cf","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d0","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d1","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d2","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d3","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d5","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d7","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d8","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d9","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007da","step":"client.http"}]},{"at":1794600926937.6409,"inFlight":10,"capacity":32,"active":[{"traceId":"f3b411525e1399cd00000000000007d0","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d1","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d2","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d3","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d5","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d7","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d8","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007d9","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007da","step":"client.http"},{"traceId":"f3b411525e1399cd00000000000007dc","step":"client.http"}]}]

| f3b411525e1399cd0000000000000e49 | driver.queue.scheduler-late | 0.310 | none | 2 / 32 |
| f3b411525e1399cd0000000000000e49 | driver.queue.scheduler-dispatch | 0.007 | none | 2 / 32 |

Observed active steps while trace f3b411525e1399cd0000000000000e49 waited: []

## P2 / warmup / commit (28 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 42.521 | 0.490 | 0.000 | 1.401 | 5.417 | 0.118 | 0.000 | 0.111 | 1.412 | 9.974 | 0.053 | n/a | 0.378 | 17.112 | n/a | n/a | 0.063 | 6.284 | 0.208 | 0.063 |
| p99 | 274.063 | 4.593 | 2.210 | 4.368 | 28.778 | 2.584 | 0.709 | 1.209 | 20.156 | 23.151 | 0.299 | n/a | 5.215 | 257.058 | n/a | n/a | 0.329 | 29.466 | 0.391 | 0.329 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd000000000000045a | 274.063 | 8.363 | 0.007 | 0.000 | 0.723 | 1.041 | 6.437 | 0.046 | n/a | 0.265 | 257.058 | n/a | n/a | 0.125 | 9.093 | 0.033 | 0.125 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000436 | 162.196 | 28.778 | 0.611 | 0.000 | 0.077 | 3.133 | 23.151 | 0.299 | n/a | 3.831 | 102.261 | n/a | n/a | 0.054 | 29.466 | 0.182 | 0.054 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.989ms |
| f3b411525e1399cd000000000000045b | 72.256 | 7.806 | 0.545 | 0.398 | 0.123 | 1.507 | 13.662 | 0.038 | n/a | 3.932 | 44.203 | n/a | n/a | 0.043 | 8.871 | 0.123 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 1.680ms; driver.expected-state.bind-receipt 1.033ms |
| f3b411525e1399cd0000000000000449 | 70.542 | 9.942 | 0.010 | 0.000 | 0.070 | 0.992 | 2.389 | 0.030 | n/a | 0.727 | 56.319 | n/a | n/a | 0.062 | 10.022 | 0.142 | 0.062 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000433 | 63.765 | 17.004 | 0.118 | 0.000 | 0.610 | 1.408 | 10.038 | 0.124 | n/a | 5.215 | 28.919 | n/a | n/a | 0.329 | 17.732 | 0.278 | 0.329 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000464 | 52.627 | 10.871 | 0.185 | 0.709 | 0.055 | 1.809 | 17.810 | 0.062 | n/a | 0.287 | 20.805 | n/a | n/a | 0.035 | 11.820 | 0.225 | 0.035 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000450 | 51.722 | 4.431 | 1.107 | 0.000 | 0.059 | 20.156 | 11.954 | 0.074 | n/a | 0.939 | 12.954 | n/a | n/a | 0.047 | 5.597 | 0.108 | 0.047 | node-15/thread-8/socket.wait-first-byte | none observed |
| f3b411525e1399cd0000000000000448 | 51.484 | 5.417 | 0.350 | 0.000 | 0.121 | 1.809 | 15.905 | 0.077 | n/a | 0.266 | 27.463 | n/a | n/a | 0.075 | 5.887 | 0.114 | 0.075 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000044e | 51.213 | 9.463 | 2.584 | 0.000 | 0.106 | 1.998 | 11.701 | 0.047 | n/a | 0.316 | 24.937 | n/a | n/a | 0.061 | 12.153 | 0.237 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000458 | 48.707 | 6.640 | 0.764 | 0.000 | 0.085 | 1.523 | 19.361 | 0.073 | n/a | 0.270 | 19.924 | n/a | n/a | 0.068 | 7.489 | 0.154 | 0.068 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000046a | 47.433 | 9.367 | 0.888 | 0.000 | 0.052 | 2.912 | 14.696 | 0.042 | n/a | 0.275 | 19.152 | n/a | n/a | 0.049 | 10.306 | 0.217 | 0.049 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000043a | 45.627 | 14.697 | 0.411 | 0.000 | 0.069 | 2.854 | 14.081 | 0.081 | n/a | 1.021 | 12.348 | n/a | n/a | 0.065 | 15.176 | 0.333 | 0.065 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000460 | 45.285 | 10.097 | 0.849 | 0.000 | 0.084 | 1.483 | 11.700 | 0.046 | n/a | 0.197 | 20.764 | n/a | n/a | 0.065 | 11.030 | 0.244 | 0.065 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000452 | 42.527 | 6.816 | 1.339 | 0.601 | 0.071 | 2.623 | 13.526 | 0.070 | n/a | 0.331 | 17.112 | n/a | n/a | 0.038 | 8.827 | 0.208 | 0.038 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000446 | 42.521 | 9.194 | 0.544 | 0.000 | 0.087 | 2.434 | 14.991 | 0.060 | n/a | 0.254 | 14.889 | n/a | n/a | 0.067 | 9.825 | 0.231 | 0.067 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000043e | 42.380 | 4.929 | 0.283 | 0.000 | 0.068 | 3.029 | 15.115 | 0.057 | n/a | 0.307 | 18.531 | n/a | n/a | 0.063 | 5.280 | 0.125 | 0.063 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000440 | 36.646 | 6.013 | 0.291 | 0.000 | 0.081 | 2.899 | 9.974 | 0.035 | n/a | 0.210 | 17.045 | n/a | n/a | 0.100 | 6.385 | 0.174 | 0.100 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000443 | 30.509 | 5.284 | 0.005 | 0.000 | 0.638 | 1.138 | 3.014 | 0.051 | n/a | 0.968 | 19.362 | n/a | n/a | 0.049 | 5.927 | 0.194 | 0.049 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000043c | 26.431 | 4.123 | 0.005 | 0.000 | 0.744 | 0.610 | 1.728 | 0.041 | n/a | 0.660 | 18.457 | n/a | n/a | 0.064 | 4.872 | 0.184 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000438 | 24.827 | 5.256 | 0.006 | 0.000 | 0.111 | 1.412 | 1.660 | 0.081 | n/a | 0.837 | 15.347 | n/a | n/a | 0.116 | 5.373 | 0.216 | 0.116 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / warmup / commit / 5-10 facts (9 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 16.052 | 0.634 | 0.000 | 1.994 | 4.123 | 0.005 | 0.000 | 0.595 | 0.911 | 2.224 | 0.049 | n/a | 0.660 | 6.667 | n/a | n/a | 0.065 | 4.872 | 0.293 | 0.065 |
| p99 | 26.431 | 2.610 | 0.714 | 2.956 | 5.256 | 0.010 | 0.000 | 1.132 | 1.412 | 3.602 | 0.113 | n/a | 1.201 | 18.457 | n/a | n/a | 0.116 | 6.284 | 0.391 | 0.116 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd000000000000043c | 26.431 | 4.123 | 0.005 | 0.000 | 0.744 | 0.610 | 1.728 | 0.041 | n/a | 0.660 | 18.457 | n/a | n/a | 0.064 | 4.872 | 0.184 | 0.064 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000438 | 24.827 | 5.256 | 0.006 | 0.000 | 0.111 | 1.412 | 1.660 | 0.081 | n/a | 0.837 | 15.347 | n/a | n/a | 0.116 | 5.373 | 0.216 | 0.116 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000461 | 24.652 | 4.616 | 0.005 | 0.000 | 0.491 | 0.636 | 2.252 | 0.023 | n/a | 1.201 | 15.386 | n/a | n/a | 0.041 | 5.112 | 0.207 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000455 | 23.595 | 3.956 | 0.005 | 0.000 | 0.595 | 0.911 | 2.224 | 0.049 | n/a | 0.412 | 15.377 | n/a | n/a | 0.065 | 4.556 | 0.193 | 0.065 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000468 | 16.052 | 5.175 | 0.010 | 0.000 | 1.100 | 1.060 | 1.969 | 0.093 | n/a | 0.378 | 6.202 | n/a | n/a | 0.066 | 6.284 | 0.391 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000441 | 15.606 | 3.960 | 0.008 | 0.000 | 1.132 | 0.677 | 3.602 | 0.044 | n/a | 0.355 | 5.735 | n/a | n/a | 0.093 | 5.100 | 0.327 | 0.093 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000045d | 15.578 | 4.050 | 0.005 | 0.000 | 0.515 | 1.019 | 2.562 | 0.113 | n/a | 1.089 | 6.169 | n/a | n/a | 0.055 | 4.570 | 0.293 | 0.055 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000465 | 15.410 | 4.167 | 0.006 | 0.000 | 0.692 | 1.070 | 2.262 | 0.058 | n/a | 0.984 | 6.090 | n/a | n/a | 0.081 | 4.865 | 0.316 | 0.081 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000453 | 13.223 | 3.581 | 0.005 | 0.000 | 0.510 | 0.681 | 1.525 | 0.028 | n/a | 0.191 | 6.667 | n/a | n/a | 0.036 | 4.096 | 0.310 | 0.036 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / outside-phases / commit (1 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 47.776 | 0.000 | 0.000 | 0.354 | 5.618 | 0.469 | 0.356 | 0.065 | 1.757 | 15.559 | 0.074 | n/a | 0.347 | 23.490 | n/a | n/a | 0.041 | 6.509 | 0.136 | 0.041 |
| p99 | 47.776 | 0.000 | 0.000 | 0.354 | 5.618 | 0.469 | 0.356 | 0.065 | 1.757 | 15.559 | 0.074 | n/a | 0.347 | 23.490 | n/a | n/a | 0.041 | 6.509 | 0.136 | 0.041 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd000000000000046c | 47.776 | 5.618 | 0.469 | 0.356 | 0.065 | 1.757 | 15.559 | 0.074 | n/a | 0.347 | 23.490 | n/a | n/a | 0.041 | 6.509 | 0.136 | 0.041 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 31.640 | 0.538 | 0.000 | 1.146 | 5.107 | 0.017 | 0.000 | 0.147 | 1.407 | 9.578 | 0.042 | n/a | 0.502 | 13.886 | n/a | n/a | 0.048 | 6.171 | 0.218 | 0.048 |
| p99 | 99.204 | 5.545 | 2.047 | 5.818 | 21.985 | 2.679 | 3.448 | 26.660 | 6.438 | 26.548 | 0.121 | n/a | 5.980 | 74.262 | n/a | n/a | 0.157 | 32.225 | 0.758 | 0.157 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000482 | 99.204 | 7.518 | 0.805 | 0.310 | 0.050 | 1.687 | 14.033 | 0.036 | n/a | 0.463 | 74.262 | n/a | n/a | 0.041 | 8.683 | 0.088 | 0.041 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004af | 81.398 | 5.107 | 0.239 | 0.422 | 0.054 | 2.092 | 19.616 | 0.033 | n/a | 0.503 | 53.295 | n/a | n/a | 0.038 | 5.821 | 0.072 | 0.038 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000047c | 59.771 | 8.435 | 0.685 | 0.411 | 0.056 | 3.092 | 21.662 | 0.038 | n/a | 0.209 | 25.135 | n/a | n/a | 0.048 | 9.587 | 0.160 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004ab | 57.168 | 7.920 | 0.010 | 0.000 | 0.147 | 3.576 | 23.325 | 0.121 | n/a | 3.117 | 18.900 | n/a | n/a | 0.052 | 8.078 | 0.141 | 0.052 | gw-w/thread-46/gateway.admitted-work | none observed |
| f3b411525e1399cd00000000000004bd | 56.819 | 11.769 | 0.351 | 0.528 | 0.220 | 2.818 | 21.299 | 0.066 | n/a | 1.115 | 18.593 | n/a | n/a | 0.062 | 12.868 | 0.226 | 0.062 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000470 | 56.532 | 6.448 | 0.333 | 0.550 | 0.096 | 2.224 | 15.665 | 0.092 | n/a | 0.346 | 30.725 | n/a | n/a | 0.054 | 7.427 | 0.131 | 0.054 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000047a | 55.688 | 9.227 | 0.722 | 0.000 | 0.063 | 2.125 | 26.548 | 0.072 | n/a | 0.638 | 16.240 | n/a | n/a | 0.054 | 10.011 | 0.180 | 0.054 | gw-w/thread-45/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000477 | 48.721 | 6.825 | 0.164 | 0.482 | 0.061 | 1.776 | 25.052 | 0.048 | n/a | 2.507 | 11.768 | n/a | n/a | 0.038 | 7.532 | 0.155 | 0.038 | gw-w/thread-42/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000499 | 47.745 | 10.598 | 0.014 | 0.000 | 0.727 | 1.399 | 4.688 | 0.089 | n/a | 0.576 | 29.504 | n/a | n/a | 0.149 | 11.339 | 0.237 | 0.149 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004b9 | 45.664 | 21.985 | 0.013 | 0.000 | 0.654 | 1.082 | 8.020 | 0.044 | n/a | 3.553 | 10.156 | n/a | n/a | 0.157 | 22.653 | 0.496 | 0.157 | node-15/thread-0/client.validation-and-staging | none observed |
| f3b411525e1399cd0000000000000491 | 44.105 | 10.617 | 0.196 | 0.595 | 0.017 | 3.043 | 14.523 | 0.034 | n/a | 0.562 | 14.478 | n/a | n/a | 0.040 | 11.425 | 0.259 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 1.802ms; driver.expected-state.bind-receipt 1.166ms |
| f3b411525e1399cd00000000000004ba | 42.517 | 5.553 | 0.011 | 0.000 | 26.660 | 1.292 | 1.358 | 0.028 | n/a | 0.608 | 6.871 | n/a | n/a | 0.135 | 32.225 | 0.758 | 0.135 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.750ms; driver.publication 1.088ms |
| f3b411525e1399cd0000000000000490 | 41.490 | 7.974 | 0.006 | 0.000 | 0.267 | 0.744 | 10.843 | 0.043 | n/a | 0.198 | 21.369 | n/a | n/a | 0.045 | 8.248 | 0.199 | 0.045 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000046e | 40.342 | 4.542 | 1.938 | 0.000 | 0.112 | 1.877 | 12.461 | 0.042 | n/a | 0.218 | 19.100 | n/a | n/a | 0.050 | 6.593 | 0.163 | 0.050 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004bf | 39.542 | 6.805 | 0.358 | 3.448 | 0.056 | 1.387 | 16.585 | 0.084 | n/a | 0.476 | 10.281 | n/a | n/a | 0.060 | 10.668 | 0.270 | 0.060 | gw-w/thread-44/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000478 | 38.829 | 7.763 | 0.006 | 0.000 | 1.230 | 6.438 | 14.466 | 0.094 | n/a | 1.263 | 7.514 | n/a | n/a | 0.054 | 9.000 | 0.232 | 0.054 | gw-w/thread-47/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000480 | 38.380 | 5.979 | 0.374 | 0.000 | 0.049 | 1.626 | 10.488 | 0.052 | n/a | 3.050 | 16.708 | n/a | n/a | 0.055 | 6.402 | 0.167 | 0.055 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000488 | 35.921 | 5.236 | 0.363 | 0.466 | 0.106 | 1.890 | 10.571 | 0.045 | n/a | 0.247 | 16.945 | n/a | n/a | 0.053 | 6.171 | 0.172 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004b5 | 34.955 | 4.876 | 0.142 | 0.290 | 0.046 | 1.344 | 11.417 | 0.049 | n/a | 1.070 | 15.684 | n/a | n/a | 0.037 | 5.355 | 0.153 | 0.037 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000048c | 34.906 | 3.905 | 0.175 | 0.341 | 0.052 | 1.451 | 10.764 | 0.044 | n/a | 0.246 | 17.885 | n/a | n/a | 0.042 | 4.473 | 0.128 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L1 / commit / 5-10 facts (8 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.543 | 0.546 | 0.000 | 1.658 | 3.398 | 0.006 | 0.000 | 0.751 | 0.764 | 1.478 | 0.028 | n/a | 0.511 | 6.871 | n/a | n/a | 0.046 | 3.786 | 0.279 | 0.046 |
| p99 | 42.517 | 1.912 | 0.000 | 2.880 | 7.763 | 0.011 | 0.000 | 26.660 | 6.438 | 14.466 | 0.094 | n/a | 5.980 | 14.994 | n/a | n/a | 0.135 | 32.225 | 0.758 | 0.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd00000000000004ba | 42.517 | 5.553 | 0.011 | 0.000 | 26.660 | 1.292 | 1.358 | 0.028 | n/a | 0.608 | 6.871 | n/a | n/a | 0.135 | 32.225 | 0.758 | 0.135 | node-15/thread-0/driver.queue.subject | driver.expected-state.bind-receipt 3.750ms; driver.publication 1.088ms |
| f3b411525e1399cd0000000000000478 | 38.829 | 7.763 | 0.006 | 0.000 | 1.230 | 6.438 | 14.466 | 0.094 | n/a | 1.263 | 7.514 | n/a | n/a | 0.054 | 9.000 | 0.232 | 0.054 | gw-w/thread-47/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000475 | 30.669 | 6.032 | 0.010 | 0.000 | 1.013 | 1.059 | 1.509 | 0.026 | n/a | 5.980 | 14.994 | n/a | n/a | 0.046 | 7.054 | 0.230 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000489 | 16.619 | 3.029 | 0.005 | 0.000 | 0.751 | 0.677 | 1.375 | 0.026 | n/a | 0.220 | 10.491 | n/a | n/a | 0.043 | 3.786 | 0.228 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000049e | 14.543 | 3.408 | 0.005 | 0.000 | 0.790 | 0.764 | 1.736 | 0.055 | n/a | 0.293 | 7.450 | n/a | n/a | 0.040 | 4.204 | 0.289 | 0.040 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004b1 | 13.429 | 3.368 | 0.006 | 0.000 | 0.374 | 0.747 | 2.007 | 0.046 | n/a | 0.686 | 6.151 | n/a | n/a | 0.044 | 3.749 | 0.279 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000493 | 10.778 | 3.398 | 0.005 | 0.000 | 0.125 | 0.627 | 1.157 | 0.031 | n/a | 0.511 | 4.874 | n/a | n/a | 0.051 | 3.528 | 0.327 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004a2 | 9.291 | 2.503 | 0.006 | 0.000 | 0.401 | 1.160 | 1.478 | 0.028 | n/a | 0.188 | 3.479 | n/a | n/a | 0.048 | 2.909 | 0.313 | 0.048 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |

## P2/P4 / read-your-own-write / read (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 77.776 | n/a | n/a | n/a | 35.845 | 7.072 | 2.628 | 0.000 | 0.478 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.384 | 58.009 | 0.914 | 4.384 |
| p99 | 221.370 | n/a | n/a | n/a | 144.306 | 125.711 | 28.096 | 0.000 | 35.238 | 53.062 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 163.112 | 196.805 | 1.000 | 163.112 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000001f63 | 221.370 | 144.306 | 11.659 | 28.096 | 0.000 | 0.936 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 36.374 | 184.061 | 0.831 | 36.374 | node-15/thread-3/client.reach | driver.publication 4.701ms; driver.publication 3.907ms; driver.publication 1.665ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.570ms |
| f3b411525e1399cd0000000000001f5f | 219.370 | 31.948 | 21.426 | 2.534 | 0.000 | 0.351 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 163.112 | 55.907 | 0.255 | 163.112 | node-15/thread-3/socket.wait-first-byte | driver.publication 4.701ms; driver.publication 1.665ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.540ms; driver.publication 1.344ms |
| f3b411525e1399cd0000000000001f69 | 200.470 | 64.720 | 125.711 | 6.374 | 0.000 | 0.754 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 2.911 | 196.805 | 0.982 | 2.911 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 4.701ms; driver.publication 3.907ms; driver.publication 1.665ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.570ms |
| f3b411525e1399cd0000000000001f70 | 193.189 | 70.453 | 92.655 | 6.838 | 0.000 | 0.513 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.730 | 169.946 | 0.880 | 22.730 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 4.701ms; driver.publication 3.907ms; driver.publication 1.570ms; driver.publication 1.185ms; driver.publication 1.161ms |
| f3b411525e1399cd0000000000001f5c | 183.112 | 78.474 | 3.364 | 12.958 | 0.000 | 35.238 | 53.062 | 0.002 | n/a | 0.006 | 0.000 | n/a | n/a | 0.009 | 94.795 | 0.518 | 0.009 | gw-r/thread-48/gateway.admitted-work | driver.publication 1.665ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.540ms; driver.publication 1.344ms; driver.publication 1.329ms |
| f3b411525e1399cd0000000000001f64 | 167.770 | 29.167 | 2.713 | 2.457 | 0.000 | 1.208 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 132.225 | 34.338 | 0.205 | 132.225 | node-15/thread-3/socket.wait-first-byte | driver.publication 4.701ms; driver.publication 1.665ms; driver.expected-state.bind-receipt 1.576ms; driver.publication 1.540ms; driver.publication 1.329ms |
| f3b411525e1399cd0000000000001afb | 153.405 | 90.844 | 5.017 | 9.172 | 0.000 | 0.628 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.744 | 105.033 | 0.685 | 47.744 | node-15/thread-3/client.reach | driver.publication 2.507ms; driver.publication 1.415ms; driver.publication 1.328ms; driver.publication 1.326ms; driver.expected-state.bind-receipt 1.306ms |
| f3b411525e1399cd00000000000014e2 | 149.649 | 85.213 | 3.609 | 12.950 | 0.000 | 0.849 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 47.028 | 101.772 | 0.680 | 47.028 | node-15/thread-3/socket.wait-first-byte | driver.publication 2.504ms; driver.publication 1.863ms; client.encode 1.552ms; driver.publication 1.548ms; driver.publication 1.401ms |
| f3b411525e1399cd0000000000001afc | 147.299 | 24.733 | 116.833 | 4.272 | 0.000 | 0.298 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 1.163 | 145.839 | 0.990 | 1.163 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 2.507ms; driver.publication 1.415ms; driver.publication 1.326ms; driver.expected-state.bind-receipt 1.306ms; driver.publication 1.193ms |
| f3b411525e1399cd0000000000001dad | 129.706 | 61.346 | 45.519 | 9.070 | 0.000 | 0.591 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 13.181 | 115.934 | 0.894 | 13.181 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 1.641ms; driver.publication 1.539ms; driver.publication 1.321ms; driver.expected-state.bind-receipt 1.224ms |
| f3b411525e1399cd0000000000001a6b | 119.821 | 34.833 | 18.428 | 3.127 | 0.000 | 0.365 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 63.067 | 56.388 | 0.471 | 63.067 | node-15/thread-3/socket.wait-first-byte | driver.publication 4.174ms; driver.publication 2.234ms; driver.publication 1.821ms; driver.publication 1.444ms; driver.publication 1.206ms |
| f3b411525e1399cd00000000000016b3 | 111.570 | 72.278 | 22.123 | 9.979 | 0.000 | 0.540 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.650 | 104.380 | 0.936 | 6.650 | node-15/thread-3/client.reach | driver.publication 2.708ms; driver.publication 1.744ms; driver.expected-state.bind-receipt 1.588ms; driver.publication 1.329ms |
| f3b411525e1399cd0000000000000985 | 105.231 | 63.059 | 0.727 | 13.330 | 0.000 | 1.614 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 26.502 | 77.116 | 0.733 | 26.502 | node-15/thread-3/client.reach | driver.publication 5.583ms; driver.publication 4.638ms; driver.publication 2.880ms; driver.publication 2.381ms; driver.expected-state.bind-receipt 1.581ms |
| f3b411525e1399cd0000000000001086 | 104.853 | 35.858 | 61.809 | 1.374 | 0.000 | 0.333 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 5.479 | 99.041 | 0.945 | 5.479 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 1.832ms; driver.publication 1.349ms; driver.publication 1.161ms; driver.publication 1.124ms; driver.expected-state.bind-receipt 1.076ms |
| f3b411525e1399cd0000000000001a6a | 93.861 | 60.763 | 19.143 | 10.240 | 0.000 | 0.585 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.129 | 90.146 | 0.960 | 3.129 | node-15/thread-3/client.reach | driver.publication 2.234ms; driver.publication 1.444ms; driver.publication 1.050ms |
| f3b411525e1399cd0000000000001084 | 88.924 | 65.723 | 3.828 | 9.466 | 0.000 | 0.868 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 9.039 | 79.017 | 0.889 | 9.039 | node-15/thread-3/client.reach | driver.publication 1.832ms; driver.publication 1.349ms; driver.publication 1.253ms; driver.expected-state.bind-receipt 1.076ms |
| f3b411525e1399cd0000000000001d2b | 87.986 | 57.912 | 0.389 | 5.379 | 0.000 | 1.456 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 22.849 | 63.680 | 0.724 | 22.849 | node-15/thread-3/client.reach | driver.publication 1.379ms; driver.publication 1.208ms |
| f3b411525e1399cd00000000000013f0 | 87.839 | 21.040 | 59.261 | 0.000 | 0.000 | 0.411 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 7.126 | 80.302 | 0.914 | 7.126 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 1.456ms; driver.publication 1.186ms; driver.publication 1.054ms |
| f3b411525e1399cd00000000000013eb | 83.044 | 66.075 | 1.485 | 4.501 | 0.000 | 0.794 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 10.189 | 72.061 | 0.868 | 10.189 | node-15/thread-3/client.reach | driver.publication 2.048ms; driver.publication 1.456ms; driver.publication 1.173ms; driver.publication 1.054ms |
| f3b411525e1399cd00000000000013ee | 82.411 | 17.868 | 60.876 | 0.000 | 0.000 | 0.478 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 3.190 | 78.743 | 0.955 | 3.190 | node-15/thread-0/rpc.gateway-observer.observe | driver.publication 1.456ms; driver.publication 1.186ms; driver.publication 1.173ms; driver.publication 1.054ms |

## P2 / L4 / commit (39 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 28.745 | 0.491 | 0.000 | 1.402 | 5.097 | 0.147 | 0.000 | 0.102 | 1.443 | 7.540 | 0.044 | n/a | 0.382 | 12.774 | n/a | n/a | 0.051 | 5.715 | 0.216 | 0.051 |
| p99 | 141.135 | 2.647 | 5.400 | 5.757 | 11.563 | 2.843 | 1.509 | 1.101 | 4.409 | 106.893 | 0.104 | n/a | 3.898 | 108.178 | n/a | n/a | 0.105 | 12.985 | 0.351 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd00000000000004fa | 141.135 | 10.517 | 0.011 | 0.000 | 0.127 | 1.092 | 106.893 | 0.045 | n/a | 0.300 | 22.088 | n/a | n/a | 0.063 | 10.655 | 0.075 | 0.063 | gw-w/thread-46/gateway.request-parse | none observed |
| f3b411525e1399cd00000000000004f3 | 132.623 | 7.564 | 0.309 | 0.000 | 0.067 | 1.569 | 13.387 | 0.055 | n/a | 1.445 | 108.178 | n/a | n/a | 0.048 | 7.941 | 0.060 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004ec | 116.327 | 5.822 | 0.213 | 0.000 | 0.056 | 1.433 | 11.386 | 0.052 | n/a | 0.467 | 96.855 | n/a | n/a | 0.043 | 6.092 | 0.052 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000501 | 61.855 | 6.800 | 0.187 | 0.000 | 0.066 | 2.061 | 7.662 | 0.076 | n/a | 0.314 | 44.591 | n/a | n/a | 0.099 | 7.053 | 0.114 | 0.099 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004e8 | 59.550 | 10.278 | 0.405 | 0.399 | 0.065 | 1.920 | 17.882 | 0.045 | n/a | 0.395 | 28.060 | n/a | n/a | 0.100 | 11.148 | 0.187 | 0.100 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.worker-message 0.704ms |
| f3b411525e1399cd00000000000004de | 59.055 | 6.310 | 0.285 | 0.445 | 0.067 | 2.437 | 15.342 | 0.040 | n/a | 3.898 | 30.184 | n/a | n/a | 0.048 | 7.106 | 0.120 | 0.048 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004d2 | 43.767 | 3.697 | 2.843 | 0.219 | 0.085 | 1.657 | 20.410 | 0.100 | n/a | 0.567 | 14.126 | n/a | n/a | 0.062 | 6.845 | 0.156 | 0.062 | gw-w/thread-47/gateway.admitted-work | none observed |
| f3b411525e1399cd00000000000004ca | 42.372 | 11.563 | 0.189 | 0.368 | 0.069 | 1.963 | 11.711 | 0.063 | n/a | 0.307 | 16.087 | n/a | n/a | 0.052 | 12.188 | 0.288 | 0.052 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004da | 40.745 | 3.660 | 0.743 | 0.313 | 0.084 | 4.409 | 16.305 | 0.056 | n/a | 0.240 | 14.876 | n/a | n/a | 0.060 | 4.800 | 0.118 | 0.060 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004fd | 40.246 | 6.981 | 0.166 | 0.000 | 0.067 | 2.692 | 13.929 | 0.040 | n/a | 0.516 | 15.813 | n/a | n/a | 0.042 | 7.214 | 0.179 | 0.042 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004e6 | 37.224 | 11.184 | 0.190 | 1.509 | 0.102 | 1.683 | 12.374 | 0.055 | n/a | 0.529 | 9.542 | n/a | n/a | 0.056 | 12.985 | 0.349 | 0.056 | gw-w/thread-46/gateway.admitted-work | driver.worker-message 0.708ms |
| f3b411525e1399cd00000000000004c3 | 35.958 | 4.897 | 0.428 | 0.298 | 0.080 | 1.678 | 12.469 | 0.073 | n/a | 0.754 | 15.216 | n/a | n/a | 0.066 | 5.702 | 0.159 | 0.066 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004f7 | 34.667 | 6.237 | 0.153 | 0.000 | 0.058 | 1.463 | 15.573 | 0.094 | n/a | 0.431 | 10.605 | n/a | n/a | 0.051 | 6.448 | 0.186 | 0.051 | gw-w/thread-46/gateway.admitted-work | none observed |
| f3b411525e1399cd00000000000004e0 | 34.182 | 3.689 | 0.310 | 0.296 | 0.056 | 1.712 | 10.769 | 0.044 | n/a | 1.207 | 16.051 | n/a | n/a | 0.048 | 4.351 | 0.127 | 0.048 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004f9 | 33.855 | 5.097 | 0.228 | 0.000 | 0.080 | 2.083 | 11.822 | 0.031 | n/a | 0.464 | 13.994 | n/a | n/a | 0.056 | 5.405 | 0.160 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 0.563ms |
| f3b411525e1399cd00000000000004d4 | 32.645 | 4.031 | 2.584 | 0.340 | 0.096 | 1.570 | 9.612 | 0.047 | n/a | 0.262 | 14.012 | n/a | n/a | 0.091 | 7.051 | 0.216 | 0.091 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000505 | 31.588 | 6.643 | 0.222 | 0.000 | 0.061 | 1.354 | 11.946 | 0.035 | n/a | 0.573 | 10.709 | n/a | n/a | 0.044 | 6.927 | 0.219 | 0.044 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004e4 | 31.414 | 3.378 | 0.147 | 0.231 | 0.057 | 1.246 | 9.060 | 0.038 | n/a | 0.283 | 16.935 | n/a | n/a | 0.040 | 3.813 | 0.121 | 0.040 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000509 | 30.902 | 4.620 | 0.210 | 0.000 | 0.069 | 1.556 | 15.932 | 0.050 | n/a | 0.826 | 7.595 | n/a | n/a | 0.042 | 4.900 | 0.159 | 0.042 | gw-w/thread-47/gateway.admitted-work | none observed |
| f3b411525e1399cd00000000000004cd | 28.745 | 3.470 | 0.005 | 0.000 | 1.022 | 1.501 | 7.540 | 0.043 | n/a | 0.198 | 14.925 | n/a | n/a | 0.040 | 4.498 | 0.156 | 0.040 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L4 / commit / 5-10 facts (10 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 17.727 | 0.740 | 0.000 | 1.832 | 3.803 | 0.006 | 0.000 | 0.416 | 0.699 | 1.367 | 0.029 | n/a | 0.240 | 9.046 | n/a | n/a | 0.050 | 4.446 | 0.298 | 0.050 |
| p99 | 21.214 | 1.918 | 0.004 | 2.500 | 5.942 | 0.010 | 0.000 | 1.101 | 1.992 | 4.477 | 0.104 | n/a | 1.223 | 14.390 | n/a | n/a | 0.105 | 6.662 | 0.351 | 0.105 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000502 | 21.214 | 3.803 | 0.006 | 0.000 | 0.156 | 0.672 | 1.580 | 0.038 | n/a | 0.518 | 14.390 | n/a | n/a | 0.053 | 3.964 | 0.187 | 0.053 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000050a | 20.582 | 2.956 | 0.006 | 0.000 | 0.232 | 0.637 | 4.477 | 0.029 | n/a | 0.382 | 11.818 | n/a | n/a | 0.046 | 3.193 | 0.155 | 0.046 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004c0 | 20.093 | 3.726 | 0.006 | 0.000 | 0.901 | 0.941 | 1.458 | 0.034 | n/a | 0.240 | 12.744 | n/a | n/a | 0.043 | 4.633 | 0.231 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004e9 | 19.358 | 5.942 | 0.010 | 0.000 | 0.709 | 1.052 | 1.921 | 0.104 | n/a | 1.223 | 8.291 | n/a | n/a | 0.105 | 6.662 | 0.344 | 0.105 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004f4 | 19.104 | 4.815 | 0.007 | 0.000 | 0.862 | 0.987 | 1.300 | 0.027 | n/a | 0.202 | 10.837 | n/a | n/a | 0.067 | 5.684 | 0.298 | 0.067 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004d8 | 17.727 | 5.300 | 0.010 | 0.000 | 0.405 | 0.866 | 1.166 | 0.030 | n/a | 0.181 | 9.689 | n/a | n/a | 0.080 | 5.715 | 0.322 | 0.080 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004cf | 15.546 | 3.838 | 0.006 | 0.000 | 1.101 | 0.699 | 1.031 | 0.024 | n/a | 0.195 | 8.602 | n/a | n/a | 0.050 | 4.945 | 0.318 | 0.050 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004c5 | 15.102 | 3.325 | 0.006 | 0.000 | 0.416 | 0.643 | 1.367 | 0.026 | n/a | 0.231 | 9.046 | n/a | n/a | 0.042 | 3.747 | 0.248 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000004d6 | 13.855 | 4.116 | 0.007 | 0.000 | 0.324 | 1.992 | 1.751 | 0.053 | n/a | 0.367 | 5.204 | n/a | n/a | 0.042 | 4.446 | 0.321 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000050c | 9.675 | 2.809 | 0.006 | 0.000 | 0.585 | 0.696 | 1.111 | 0.028 | n/a | 0.500 | 3.889 | n/a | n/a | 0.051 | 3.400 | 0.351 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L16 / commit (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 29.373 | 0.626 | 0.000 | 1.493 | 5.451 | 0.013 | 0.000 | 0.313 | 1.482 | 5.693 | 0.042 | n/a | 0.277 | 12.130 | n/a | n/a | 0.058 | 5.950 | 0.244 | 0.058 |
| p99 | 102.078 | 2.582 | 2.345 | 6.054 | 18.443 | 3.837 | 0.000 | 0.950 | 6.677 | 22.283 | 0.102 | n/a | 3.998 | 70.054 | n/a | n/a | 0.141 | 19.316 | 0.429 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd000000000000055e | 102.078 | 16.259 | 1.072 | 0.000 | 0.146 | 1.621 | 12.317 | 0.042 | n/a | 0.482 | 70.054 | n/a | n/a | 0.086 | 17.476 | 0.171 | 0.086 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000051b | 91.350 | 4.853 | 0.309 | 0.000 | 0.807 | 2.499 | 12.752 | 0.043 | n/a | 2.132 | 67.892 | n/a | n/a | 0.063 | 5.969 | 0.065 | 0.063 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000546 | 78.405 | 3.975 | 0.788 | 0.000 | 0.059 | 6.677 | 10.626 | 0.063 | n/a | 0.255 | 55.912 | n/a | n/a | 0.051 | 4.821 | 0.061 | 0.051 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000532 | 63.363 | 8.415 | 1.242 | 0.000 | 0.070 | 1.581 | 7.705 | 0.034 | n/a | 0.203 | 44.072 | n/a | n/a | 0.041 | 9.727 | 0.154 | 0.041 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000554 | 59.039 | 7.207 | 0.271 | 0.000 | 0.055 | 3.252 | 17.931 | 0.053 | n/a | 0.260 | 29.968 | n/a | n/a | 0.042 | 7.533 | 0.128 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.worker-message 0.648ms |
| f3b411525e1399cd000000000000055a | 50.997 | 7.455 | 0.302 | 0.000 | 0.086 | 1.482 | 22.283 | 0.090 | n/a | 2.292 | 16.952 | n/a | n/a | 0.056 | 7.843 | 0.154 | 0.056 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000515 | 49.491 | 5.313 | 3.837 | 0.000 | 0.064 | 2.168 | 20.140 | 0.068 | n/a | 0.428 | 17.428 | n/a | n/a | 0.045 | 9.213 | 0.186 | 0.045 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000527 | 45.793 | 3.624 | 0.005 | 0.000 | 0.411 | 1.127 | 1.666 | 0.041 | n/a | 0.325 | 38.541 | n/a | n/a | 0.053 | 4.040 | 0.088 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000054e | 45.002 | 13.653 | 0.300 | 0.000 | 0.076 | 2.594 | 10.604 | 0.067 | n/a | 3.998 | 13.667 | n/a | n/a | 0.042 | 14.029 | 0.312 | 0.042 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000533 | 44.990 | 18.443 | 0.010 | 0.000 | 0.863 | 3.459 | 10.247 | 0.102 | n/a | 0.588 | 11.220 | n/a | n/a | 0.057 | 19.316 | 0.429 | 0.057 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000053e | 42.953 | 3.745 | 0.484 | 0.000 | 0.081 | 4.671 | 16.845 | 0.041 | n/a | 0.277 | 16.764 | n/a | n/a | 0.047 | 4.309 | 0.100 | 0.047 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000530 | 41.219 | 9.863 | 0.096 | 0.000 | 0.081 | 6.074 | 12.482 | 0.069 | n/a | 0.365 | 12.130 | n/a | n/a | 0.059 | 10.041 | 0.244 | 0.059 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000051e | 39.103 | 6.164 | 0.372 | 0.000 | 0.087 | 1.662 | 12.054 | 0.082 | n/a | 0.903 | 17.722 | n/a | n/a | 0.057 | 6.623 | 0.169 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000562 | 36.651 | 9.196 | 1.599 | 0.000 | 0.106 | 2.251 | 11.904 | 0.051 | n/a | 0.269 | 11.213 | n/a | n/a | 0.061 | 10.902 | 0.297 | 0.061 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000051f | 32.674 | 8.423 | 0.006 | 0.000 | 0.500 | 1.007 | 7.891 | 0.039 | n/a | 0.202 | 14.538 | n/a | n/a | 0.068 | 8.929 | 0.273 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000055c | 32.622 | 3.933 | 0.259 | 0.000 | 0.093 | 1.806 | 11.434 | 0.045 | n/a | 0.451 | 14.543 | n/a | n/a | 0.058 | 4.285 | 0.131 | 0.058 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000552 | 32.520 | 7.557 | 1.104 | 0.000 | 0.087 | 1.681 | 9.285 | 0.046 | n/a | 0.541 | 12.157 | n/a | n/a | 0.061 | 8.749 | 0.269 | 0.061 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000522 | 31.944 | 4.593 | 0.268 | 0.000 | 0.109 | 1.519 | 14.994 | 0.050 | n/a | 0.321 | 10.024 | n/a | n/a | 0.065 | 4.970 | 0.156 | 0.065 | gw-w/thread-46/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000555 | 30.589 | 5.930 | 0.013 | 0.000 | 0.415 | 1.729 | 2.127 | 0.084 | n/a | 1.145 | 19.026 | n/a | n/a | 0.120 | 6.358 | 0.208 | 0.120 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000517 | 29.833 | 8.489 | 0.004 | 0.000 | 0.725 | 2.734 | 2.290 | 0.024 | n/a | 0.243 | 15.294 | n/a | n/a | 0.031 | 9.218 | 0.309 | 0.031 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.236ms |

## P2 / L16 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 20.210 | 0.842 | 0.000 | 1.648 | 4.244 | 0.006 | 0.000 | 0.554 | 0.896 | 1.595 | 0.034 | n/a | 0.240 | 11.383 | n/a | n/a | 0.068 | 4.668 | 0.251 | 0.068 |
| p99 | 45.793 | 2.426 | 0.189 | 6.054 | 8.423 | 0.013 | 0.000 | 0.950 | 1.729 | 7.891 | 0.084 | n/a | 1.145 | 38.541 | n/a | n/a | 0.141 | 8.929 | 0.350 | 0.141 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000527 | 45.793 | 3.624 | 0.005 | 0.000 | 0.411 | 1.127 | 1.666 | 0.041 | n/a | 0.325 | 38.541 | n/a | n/a | 0.053 | 4.040 | 0.088 | 0.053 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000051f | 32.674 | 8.423 | 0.006 | 0.000 | 0.500 | 1.007 | 7.891 | 0.039 | n/a | 0.202 | 14.538 | n/a | n/a | 0.068 | 8.929 | 0.273 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000555 | 30.589 | 5.930 | 0.013 | 0.000 | 0.415 | 1.729 | 2.127 | 0.084 | n/a | 1.145 | 19.026 | n/a | n/a | 0.120 | 6.358 | 0.208 | 0.120 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000510 | 27.885 | 4.345 | 0.009 | 0.000 | 0.313 | 1.336 | 1.366 | 0.032 | n/a | 0.276 | 20.138 | n/a | n/a | 0.068 | 4.668 | 0.167 | 0.068 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000512 | 21.971 | 4.244 | 0.006 | 0.000 | 0.470 | 1.165 | 1.595 | 0.034 | n/a | 0.240 | 14.154 | n/a | n/a | 0.063 | 4.720 | 0.215 | 0.063 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000052d | 21.205 | 5.839 | 0.012 | 0.000 | 0.654 | 1.390 | 2.050 | 0.071 | n/a | 0.375 | 10.720 | n/a | n/a | 0.094 | 6.505 | 0.307 | 0.094 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000516 | 20.900 | 3.999 | 0.006 | 0.000 | 0.459 | 0.896 | 3.692 | 0.059 | n/a | 0.235 | 11.475 | n/a | n/a | 0.080 | 4.464 | 0.214 | 0.080 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000539 | 20.210 | 3.333 | 0.006 | 0.000 | 0.950 | 0.644 | 1.208 | 0.027 | n/a | 0.215 | 13.772 | n/a | n/a | 0.055 | 4.289 | 0.212 | 0.055 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000055f | 20.091 | 5.486 | 0.010 | 0.000 | 0.584 | 0.794 | 1.442 | 0.032 | n/a | 0.219 | 11.383 | n/a | n/a | 0.141 | 6.080 | 0.303 | 0.141 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000054f | 18.648 | 4.536 | 0.011 | 0.000 | 0.701 | 0.725 | 1.110 | 0.030 | n/a | 0.219 | 11.245 | n/a | n/a | 0.069 | 5.248 | 0.281 | 0.069 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000543 | 17.379 | 3.284 | 0.006 | 0.000 | 0.835 | 0.769 | 1.729 | 0.050 | n/a | 0.399 | 10.260 | n/a | n/a | 0.047 | 4.125 | 0.237 | 0.047 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000547 | 17.001 | 4.498 | 0.010 | 0.000 | 0.652 | 0.842 | 1.096 | 0.025 | n/a | 0.244 | 9.557 | n/a | n/a | 0.078 | 5.159 | 0.303 | 0.078 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000529 | 15.349 | 3.295 | 0.006 | 0.000 | 0.554 | 0.645 | 1.262 | 0.030 | n/a | 0.230 | 9.286 | n/a | n/a | 0.041 | 3.855 | 0.251 | 0.041 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000052b | 13.951 | 3.285 | 0.006 | 0.000 | 0.581 | 0.941 | 1.705 | 0.046 | n/a | 0.373 | 6.967 | n/a | n/a | 0.047 | 3.872 | 0.278 | 0.047 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000054b | 12.079 | 3.731 | 0.006 | 0.000 | 0.489 | 0.665 | 1.223 | 0.031 | n/a | 0.204 | 5.685 | n/a | n/a | 0.044 | 4.226 | 0.350 | 0.044 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit (50 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.635 | 0.669 | 0.000 | 1.644 | 5.417 | 0.009 | 0.000 | 0.297 | 1.338 | 2.242 | 0.038 | n/a | 0.287 | 9.986 | n/a | n/a | 0.057 | 6.181 | 0.280 | 0.057 |
| p99 | 120.379 | 3.007 | 0.022 | 5.096 | 18.836 | 8.738 | 0.000 | 1.303 | 10.044 | 57.305 | 0.135 | n/a | 3.471 | 109.322 | n/a | n/a | 0.153 | 21.099 | 0.525 | 0.153 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000571 | 120.379 | 7.898 | 0.006 | 0.000 | 0.822 | 0.943 | 1.089 | 0.028 | n/a | 0.167 | 109.322 | n/a | n/a | 0.103 | 8.726 | 0.072 | 0.103 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000589 | 115.553 | 5.638 | 8.738 | 0.000 | 0.058 | 5.751 | 8.984 | 0.047 | n/a | 0.550 | 85.745 | n/a | n/a | 0.042 | 14.434 | 0.125 | 0.042 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005c2 | 100.868 | 9.939 | 0.232 | 0.000 | 0.089 | 2.942 | 18.184 | 0.100 | n/a | 1.034 | 68.295 | n/a | n/a | 0.051 | 10.260 | 0.102 | 0.051 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005bc | 100.039 | 3.933 | 0.169 | 0.000 | 0.046 | 1.338 | 12.376 | 0.035 | n/a | 0.182 | 81.919 | n/a | n/a | 0.040 | 4.148 | 0.041 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000576 | 98.382 | 18.836 | 2.153 | 0.000 | 0.109 | 7.434 | 39.961 | 0.135 | n/a | 0.774 | 28.889 | n/a | n/a | 0.089 | 21.099 | 0.214 | 0.089 | gw-w/thread-49/gateway.admitted-work | none observed |
| f3b411525e1399cd000000000000059d | 80.037 | 7.826 | 0.271 | 0.000 | 0.989 | 3.986 | 57.305 | 0.034 | n/a | 0.416 | 9.159 | n/a | n/a | 0.051 | 9.086 | 0.114 | 0.051 | gw-w/thread-44/gateway.admitted-work | none observed |
| f3b411525e1399cd000000000000058b | 74.153 | 4.710 | 0.247 | 0.000 | 0.057 | 1.851 | 19.320 | 0.084 | n/a | 0.245 | 47.560 | n/a | n/a | 0.078 | 5.014 | 0.068 | 0.078 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005ac | 50.268 | 3.800 | 0.006 | 0.000 | 0.368 | 2.729 | 39.481 | 0.107 | n/a | 1.007 | 2.710 | n/a | n/a | 0.060 | 4.175 | 0.083 | 0.060 | gw-w/thread-42/storage/begin-command! | none observed |
| f3b411525e1399cd00000000000005ae | 48.247 | 11.626 | 3.052 | 0.000 | 0.107 | 6.599 | 11.624 | 0.059 | n/a | 0.398 | 14.715 | n/a | n/a | 0.066 | 14.786 | 0.306 | 0.066 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.worker-message 2.495ms |
| f3b411525e1399cd00000000000005ab | 47.357 | 11.576 | 1.348 | 0.000 | 0.083 | 1.471 | 17.561 | 0.040 | n/a | 0.466 | 14.753 | n/a | n/a | 0.059 | 13.007 | 0.275 | 0.059 | gw-w/thread-49/gateway.admitted-work | none observed |
| f3b411525e1399cd00000000000005a1 | 45.880 | 5.162 | 0.210 | 0.000 | 0.076 | 1.568 | 12.087 | 0.039 | n/a | 0.402 | 26.286 | n/a | n/a | 0.051 | 5.448 | 0.119 | 0.051 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000593 | 40.511 | 5.783 | 1.335 | 0.000 | 0.056 | 10.044 | 11.553 | 0.037 | n/a | 0.229 | 11.429 | n/a | n/a | 0.043 | 7.175 | 0.177 | 0.043 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005bf | 40.504 | 11.125 | 0.013 | 0.000 | 1.303 | 2.928 | 5.513 | 0.050 | n/a | 1.510 | 17.909 | n/a | n/a | 0.153 | 12.441 | 0.307 | 0.153 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000057e | 37.543 | 9.554 | 2.017 | 0.000 | 0.051 | 1.641 | 11.865 | 0.063 | n/a | 0.391 | 11.898 | n/a | n/a | 0.062 | 11.622 | 0.310 | 0.062 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000059e | 35.998 | 7.338 | 0.006 | 0.000 | 0.771 | 0.657 | 5.472 | 0.028 | n/a | 0.204 | 21.464 | n/a | n/a | 0.057 | 8.115 | 0.225 | 0.057 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000587 | 35.730 | 7.801 | 0.164 | 0.000 | 0.057 | 1.595 | 11.768 | 0.040 | n/a | 0.250 | 14.012 | n/a | n/a | 0.043 | 8.022 | 0.225 | 0.043 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000056f | 34.544 | 6.058 | 0.285 | 0.000 | 0.066 | 3.442 | 8.888 | 0.040 | n/a | 0.248 | 15.454 | n/a | n/a | 0.061 | 6.410 | 0.186 | 0.061 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000578 | 33.294 | 6.767 | 0.289 | 0.000 | 0.100 | 1.885 | 11.808 | 0.035 | n/a | 0.176 | 12.164 | n/a | n/a | 0.068 | 7.156 | 0.215 | 0.068 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005c6 | 32.659 | 8.259 | 1.864 | 0.000 | 0.043 | 0.984 | 9.609 | 0.040 | n/a | 0.197 | 11.618 | n/a | n/a | 0.044 | 10.166 | 0.311 | 0.044 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000599 | 31.465 | 8.227 | 0.257 | 0.000 | 0.011 | 1.399 | 12.210 | 0.045 | n/a | 0.581 | 8.704 | n/a | n/a | 0.032 | 8.495 | 0.270 | 0.032 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L64 / commit / 5-10 facts (16 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.685 | 0.819 | 0.000 | 1.993 | 4.708 | 0.006 | 0.000 | 0.798 | 0.943 | 1.146 | 0.029 | n/a | 0.213 | 5.591 | n/a | n/a | 0.060 | 5.508 | 0.331 | 0.060 |
| p99 | 120.379 | 1.921 | 0.022 | 5.096 | 11.125 | 0.013 | 0.000 | 1.303 | 2.928 | 39.481 | 0.107 | n/a | 1.510 | 109.322 | n/a | n/a | 0.153 | 12.441 | 0.464 | 0.153 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000571 | 120.379 | 7.898 | 0.006 | 0.000 | 0.822 | 0.943 | 1.089 | 0.028 | n/a | 0.167 | 109.322 | n/a | n/a | 0.103 | 8.726 | 0.072 | 0.103 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005ac | 50.268 | 3.800 | 0.006 | 0.000 | 0.368 | 2.729 | 39.481 | 0.107 | n/a | 1.007 | 2.710 | n/a | n/a | 0.060 | 4.175 | 0.083 | 0.060 | gw-w/thread-42/storage/begin-command! | none observed |
| f3b411525e1399cd00000000000005bf | 40.504 | 11.125 | 0.013 | 0.000 | 1.303 | 2.928 | 5.513 | 0.050 | n/a | 1.510 | 17.909 | n/a | n/a | 0.153 | 12.441 | 0.307 | 0.153 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000058d | 29.707 | 7.481 | 0.008 | 0.000 | 0.520 | 1.002 | 1.090 | 0.026 | n/a | 0.511 | 18.994 | n/a | n/a | 0.075 | 8.009 | 0.270 | 0.075 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.715ms |
| f3b411525e1399cd00000000000005c3 | 19.447 | 4.880 | 0.011 | 0.000 | 1.245 | 1.372 | 1.284 | 0.035 | n/a | 0.219 | 10.360 | n/a | n/a | 0.042 | 6.135 | 0.315 | 0.042 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000056c | 19.316 | 5.203 | 0.009 | 0.000 | 0.969 | 1.219 | 1.131 | 0.025 | n/a | 0.209 | 10.483 | n/a | n/a | 0.068 | 6.181 | 0.320 | 0.068 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005a2 | 18.412 | 3.599 | 0.006 | 0.000 | 0.798 | 0.576 | 4.582 | 0.052 | n/a | 0.210 | 8.533 | n/a | n/a | 0.057 | 4.402 | 0.239 | 0.057 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000564 | 15.745 | 4.651 | 0.006 | 0.000 | 0.798 | 2.175 | 4.314 | 0.082 | n/a | 0.339 | 3.329 | n/a | n/a | 0.051 | 5.455 | 0.346 | 0.051 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000568 | 15.685 | 6.514 | 0.006 | 0.000 | 0.436 | 0.707 | 1.124 | 0.025 | n/a | 0.168 | 6.649 | n/a | n/a | 0.055 | 6.956 | 0.444 | 0.055 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005b1 | 13.977 | 4.991 | 0.007 | 0.000 | 0.578 | 1.199 | 1.167 | 0.038 | n/a | 0.478 | 5.413 | n/a | n/a | 0.107 | 5.576 | 0.399 | 0.107 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000583 | 13.890 | 3.926 | 0.006 | 0.000 | 1.140 | 0.745 | 1.046 | 0.029 | n/a | 0.213 | 6.729 | n/a | n/a | 0.056 | 5.072 | 0.365 | 0.056 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005b9 | 13.571 | 5.375 | 0.011 | 0.000 | 0.121 | 1.324 | 0.887 | 0.024 | n/a | 0.173 | 5.591 | n/a | n/a | 0.063 | 5.508 | 0.406 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000579 | 12.598 | 4.708 | 0.006 | 0.000 | 1.133 | 0.654 | 0.975 | 0.028 | n/a | 0.186 | 4.819 | n/a | n/a | 0.089 | 5.848 | 0.464 | 0.089 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005a8 | 12.479 | 2.994 | 0.006 | 0.000 | 1.127 | 0.790 | 1.551 | 0.078 | n/a | 0.659 | 5.229 | n/a | n/a | 0.046 | 4.126 | 0.331 | 0.046 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000597 | 12.038 | 3.222 | 0.006 | 0.000 | 1.011 | 0.763 | 1.680 | 0.041 | n/a | 0.813 | 4.460 | n/a | n/a | 0.040 | 4.240 | 0.352 | 0.040 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005a4 | 11.634 | 4.259 | 0.009 | 0.000 | 0.204 | 0.675 | 1.146 | 0.026 | n/a | 0.205 | 5.019 | n/a | n/a | 0.091 | 4.472 | 0.384 | 0.091 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit (43 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 24.657 | 0.751 | 0.000 | 1.592 | 6.553 | 0.013 | 0.000 | 0.156 | 1.474 | 2.782 | 0.041 | n/a | 0.288 | 10.272 | n/a | n/a | 0.057 | 7.594 | 0.303 | 0.057 |
| p99 | 223.123 | 2.756 | 1.888 | 5.921 | 16.434 | n/a | 0.000 | 1.583 | 12.502 | 46.646 | 1.703 | n/a | 3.358 | 200.584 | n/a | n/a | 3.449 | 17.699 | 0.542 | 3.449 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd00000000000005ed | 223.123 | 5.895 | 3.555 | 0.000 | 0.054 | 1.531 | 8.076 | 0.042 | n/a | 3.358 | 200.584 | n/a | n/a | 0.028 | 9.504 | 0.043 | 0.028 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 4.108ms |
| f3b411525e1399cd0000000000000601 | 157.210 | 4.005 | 2.361 | 0.000 | 0.087 | 1.030 | 42.042 | 1.703 | n/a | 0.355 | 105.579 | n/a | n/a | 0.047 | 6.454 | 0.041 | 0.047 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005d7 | 112.941 | 16.434 | 0.972 | 0.000 | 0.293 | 4.721 | 46.646 | 0.108 | n/a | 0.500 | 43.071 | n/a | n/a | 0.196 | 17.699 | 0.157 | 0.196 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | driver.worker-message 0.829ms; driver.worker-message 0.801ms; driver.worker-message 0.552ms |
| f3b411525e1399cd0000000000000602 | 80.031 | 5.134 | 0.010 | 0.000 | 1.048 | 0.687 | 1.205 | 0.041 | n/a | 0.246 | 71.616 | n/a | n/a | 0.045 | 6.192 | 0.077 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005dd | 62.475 | 7.883 | 0.560 | 0.000 | 0.105 | 5.615 | 21.049 | 0.087 | n/a | 0.388 | 26.710 | n/a | n/a | 0.078 | 8.548 | 0.137 | 0.078 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005f7 | 52.401 | 8.875 | 0.466 | 0.000 | 0.060 | 1.474 | 8.986 | 0.039 | n/a | 0.246 | 32.211 | n/a | n/a | 0.044 | 9.401 | 0.179 | 0.044 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005f9 | 47.504 | 12.225 | 0.321 | 0.000 | 0.083 | 1.642 | 18.533 | 0.070 | n/a | 0.218 | 14.339 | n/a | n/a | 0.073 | 12.629 | 0.266 | 0.073 | gw-w/thread-47/gateway.admitted-work | none observed |
| f3b411525e1399cd00000000000005ee | 42.899 | 8.929 | 0.006 | 0.000 | 0.266 | 0.770 | 1.486 | 0.032 | n/a | 0.244 | 31.118 | n/a | n/a | 0.049 | 9.201 | 0.214 | 0.049 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005f1 | 41.018 | 8.310 | 0.337 | 0.000 | 0.092 | 2.665 | 13.394 | 0.066 | n/a | 0.295 | 15.763 | n/a | n/a | 0.096 | 8.740 | 0.213 | 0.096 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000060f | 40.366 | 7.045 | 0.212 | 0.000 | 0.057 | 4.391 | 12.738 | 0.061 | n/a | 0.241 | 15.564 | n/a | n/a | 0.055 | 7.315 | 0.181 | 0.055 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000061c | 38.659 | 5.374 | 5.098 | 0.000 | 0.100 | 6.673 | 8.119 | 0.071 | n/a | 0.253 | 12.904 | n/a | n/a | 0.067 | 10.572 | 0.273 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000061a | 37.667 | 11.037 | 0.244 | 0.000 | 0.056 | 2.017 | 9.361 | 0.036 | n/a | 0.469 | 14.405 | n/a | n/a | 0.044 | 11.336 | 0.301 | 0.044 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.worker-message 2.143ms |
| f3b411525e1399cd00000000000005df | 36.978 | 9.922 | 0.512 | 0.000 | 0.115 | 1.616 | 9.359 | 0.041 | n/a | 0.270 | 15.061 | n/a | n/a | 0.082 | 10.548 | 0.285 | 0.082 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000614 | 36.545 | 5.145 | 0.296 | 0.000 | 0.049 | 1.672 | 10.735 | 0.040 | n/a | 0.211 | 18.340 | n/a | n/a | 0.058 | 5.490 | 0.150 | 0.058 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000612 | 36.030 | 6.473 | 0.099 | 0.000 | 0.083 | 12.502 | 6.221 | 0.041 | n/a | 0.309 | 10.244 | n/a | n/a | 0.057 | 6.655 | 0.185 | 0.057 | node-15/thread-8/socket.wait-first-byte | none observed |
| f3b411525e1399cd00000000000005e9 | 35.167 | 7.507 | 3.522 | 0.000 | 0.063 | 1.587 | 10.480 | 0.058 | n/a | 0.738 | 11.145 | n/a | n/a | 0.067 | 11.093 | 0.315 | 0.067 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005cc | 30.251 | 7.981 | 0.211 | 0.000 | 0.055 | 2.224 | 8.348 | 0.036 | n/a | 0.246 | 11.083 | n/a | n/a | 0.067 | 8.248 | 0.273 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005fd | 28.455 | 9.954 | 0.297 | 0.000 | 0.092 | 2.684 | 8.484 | 0.042 | n/a | 0.291 | 6.552 | n/a | n/a | 0.059 | 10.343 | 0.363 | 0.059 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005e5 | 27.978 | 8.483 | 0.315 | 0.000 | 0.062 | 2.693 | 2.620 | 0.050 | n/a | 0.336 | 13.310 | n/a | n/a | 0.109 | 8.860 | 0.317 | 0.109 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005cd | 25.394 | 6.610 | 0.009 | 0.000 | 1.072 | 1.005 | 2.005 | 0.051 | n/a | 0.367 | 14.163 | n/a | n/a | 0.113 | 7.690 | 0.303 | 0.113 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |

## P2 / L256 / commit / 5-10 facts (15 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.124 | 0.964 | 0.000 | 2.104 | 5.189 | 0.007 | 0.000 | 0.694 | 0.769 | 1.209 | 0.033 | n/a | 0.219 | 6.587 | n/a | n/a | 0.053 | 5.841 | 0.367 | 0.053 |
| p99 | 80.031 | 1.636 | 1.888 | 5.921 | 8.653 | n/a | 0.000 | 1.583 | 4.529 | 19.353 | 0.050 | n/a | 0.698 | 71.616 | n/a | n/a | 3.449 | 9.359 | 0.542 | 3.449 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000602 | 80.031 | 5.134 | 0.010 | 0.000 | 1.048 | 0.687 | 1.205 | 0.041 | n/a | 0.246 | 71.616 | n/a | n/a | 0.045 | 6.192 | 0.077 | 0.045 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000060a | 24.701 | 8.179 | 0.007 | 0.000 | 0.890 | 4.529 | 2.793 | 0.050 | n/a | 0.359 | 7.851 | n/a | n/a | 0.043 | 9.076 | 0.367 | 0.043 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005d8 | 24.124 | 8.653 | 0.012 | 0.000 | 0.694 | 2.108 | 2.001 | 0.037 | n/a | 0.269 | 10.272 | n/a | n/a | 0.077 | 9.359 | 0.388 | 0.077 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000610 | 23.489 | 2.216 | n/a | 0.000 | 0.156 | 1.596 | 19.353 | 0.027 | n/a | 0.065 | 0.000 | n/a | n/a | 0.075 | 2.372 | 0.101 | 0.075 | gw-w/thread-46/gateway.admitted-work | none observed |
| f3b411525e1399cd0000000000000606 | 22.234 | 5.602 | 0.012 | 0.000 | 1.106 | 0.590 | 1.013 | 0.024 | n/a | 0.219 | 10.217 | n/a | n/a | 3.449 | 6.720 | 0.302 | 3.449 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005fe | 16.403 | 4.531 | 0.006 | 0.000 | 0.464 | 0.725 | 4.741 | 0.030 | n/a | 0.217 | 5.642 | n/a | n/a | 0.046 | 5.001 | 0.305 | 0.046 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005e0 | 15.380 | 5.189 | 0.006 | 0.000 | 0.646 | 0.810 | 1.771 | 0.044 | n/a | 0.698 | 6.151 | n/a | n/a | 0.065 | 5.841 | 0.380 | 0.065 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005c9 | 15.124 | 5.286 | 0.013 | 0.000 | 0.393 | 1.061 | 1.227 | 0.031 | n/a | 0.478 | 6.587 | n/a | n/a | 0.047 | 5.692 | 0.376 | 0.047 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005c7 | 14.688 | 6.263 | 0.008 | 0.000 | 1.583 | 0.656 | 1.447 | 0.035 | n/a | 0.198 | 4.444 | n/a | n/a | 0.053 | 7.854 | 0.535 | 0.053 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005ea | 14.652 | 6.875 | 0.006 | 0.000 | 1.061 | 0.588 | 1.142 | 0.026 | n/a | 0.234 | 4.618 | n/a | n/a | 0.101 | 7.942 | 0.542 | 0.101 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005e2 | 14.156 | 6.078 | 0.007 | 0.000 | 0.672 | 1.009 | 1.147 | 0.033 | n/a | 0.203 | 4.953 | n/a | n/a | 0.054 | 6.757 | 0.477 | 0.054 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005f2 | 13.883 | 3.643 | 0.006 | 0.000 | 0.804 | 0.770 | 1.104 | 0.034 | n/a | 0.193 | 7.287 | n/a | n/a | 0.043 | 4.453 | 0.321 | 0.043 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd000000000000060c | 13.655 | 3.759 | 0.006 | 0.000 | 1.107 | 0.600 | 1.102 | 0.025 | n/a | 0.194 | 6.824 | n/a | n/a | 0.040 | 4.871 | 0.357 | 0.040 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005e6 | 12.944 | 3.590 | 0.006 | 0.000 | 0.494 | 0.699 | 1.079 | 0.042 | n/a | 0.199 | 6.782 | n/a | n/a | 0.053 | 4.090 | 0.316 | 0.053 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000005fa | 12.412 | 4.643 | 0.006 | 0.000 | 0.310 | 0.769 | 1.209 | 0.029 | n/a | 0.457 | 4.937 | n/a | n/a | 0.052 | 4.959 | 0.400 | 0.052 | gw-w/thread-42/peer.transact-await (includes order/network/storage) | none observed |

## P2 / tail / commit (3468 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 15.313 | 0.792 | 0.000 | 1.659 | 3.701 | 0.006 | 0.000 | 0.764 | 0.753 | 1.123 | 0.029 | n/a | 0.223 | 6.238 | n/a | n/a | 0.037 | 4.732 | 0.337 | 0.037 |
| p99 | 87.412 | 2.974 | 2.238 | 5.430 | 11.119 | 0.890 | 0.000 | 24.742 | 16.718 | 12.607 | 3.209 | n/a | 4.081 | 55.414 | n/a | n/a | 0.114 | 31.436 | 0.768 | 0.114 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000e4b | 224.710 | 12.920 | 0.007 | 0.000 | 0.881 | 60.005 | 4.200 | 0.045 | n/a | 0.946 | 145.603 | n/a | n/a | 0.103 | 13.808 | 0.061 | 0.103 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms; driver.expected-state.bind-receipt 1.896ms |
| f3b411525e1399cd00000000000007d4 | 174.498 | 3.188 | 0.005 | 0.000 | 90.153 | 3.435 | 0.841 | 0.028 | n/a | 0.406 | 76.398 | n/a | n/a | 0.044 | 93.346 | 0.535 | 0.044 | node-15/thread-0/driver.queue.subject | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.393ms; driver.publication 1.377ms; driver.publication 1.263ms |
| f3b411525e1399cd0000000000000e49 | 171.912 | 3.009 | 0.055 | 0.000 | 0.317 | 22.822 | 1.034 | 0.031 | n/a | 0.460 | 144.165 | n/a | n/a | 0.020 | 3.380 | 0.020 | 0.020 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms; driver.publication 1.834ms |
| f3b411525e1399cd0000000000000e48 | 170.589 | 3.299 | 0.003 | 0.000 | 0.829 | 15.215 | 1.168 | 3.739 | n/a | 0.035 | 146.265 | n/a | n/a | 0.037 | 4.131 | 0.024 | 0.037 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms |
| f3b411525e1399cd0000000000000e4a | 168.974 | 3.645 | 0.006 | 0.000 | 0.602 | 14.818 | 0.746 | 3.183 | n/a | 0.190 | 145.741 | n/a | n/a | 0.043 | 4.252 | 0.025 | 0.043 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms; driver.publication 1.834ms; driver.publication 1.269ms |
| f3b411525e1399cd0000000000000e47 | 166.190 | 4.759 | 0.004 | 0.000 | 1.033 | 0.699 | 23.328 | 0.020 | n/a | 0.142 | 136.171 | n/a | n/a | 0.034 | 5.797 | 0.035 | 0.034 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000e52 | 156.442 | 5.010 | 0.005 | 0.000 | 136.146 | 0.662 | 2.027 | 0.043 | n/a | 0.200 | 12.315 | n/a | n/a | 0.035 | 141.161 | 0.902 | 0.035 | node-15/thread-0/driver.queue.subject | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.827ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms |
| f3b411525e1399cd0000000000000e4e | 156.079 | 4.445 | 0.010 | 0.000 | 135.044 | 8.438 | 0.789 | 0.028 | n/a | 0.827 | 6.437 | n/a | n/a | 0.061 | 139.499 | 0.894 | 0.061 | node-15/thread-0/driver.queue.subject | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.827ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms |
| f3b411525e1399cd0000000000000e4c | 144.250 | 7.416 | 0.005 | 0.000 | 0.392 | 1.093 | 5.785 | 0.056 | n/a | 1.104 | 128.323 | n/a | n/a | 0.077 | 7.813 | 0.054 | 0.077 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms; driver.publication 1.840ms; driver.publication 1.834ms; driver.publication 1.269ms |
| f3b411525e1399cd0000000000000e51 | 139.683 | 4.848 | 0.010 | 0.000 | 126.895 | 0.973 | 1.524 | 0.052 | n/a | 0.349 | 4.983 | n/a | n/a | 0.048 | 131.753 | 0.943 | 0.048 | node-15/thread-0/driver.queue.subject | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.827ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms |
| f3b411525e1399cd0000000000001dec | 136.923 | 6.698 | 0.011 | 0.000 | 0.870 | 9.820 | 69.527 | 0.979 | n/a | 1.689 | 47.291 | n/a | n/a | 0.040 | 7.578 | 0.055 | 0.040 | gw-w/thread-47/gateway.admitted-work | driver.publication 2.114ms; driver.plan-and-encode-command 1.236ms; driver.publication 1.114ms; driver.publication 1.102ms; driver.publication 1.060ms |
| f3b411525e1399cd0000000000000c08 | 135.469 | 6.827 | 0.006 | 0.000 | 0.176 | 7.244 | 2.470 | 0.038 | n/a | 0.176 | 118.469 | n/a | n/a | 0.064 | 7.008 | 0.052 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.562ms; driver.publication 1.943ms |
| f3b411525e1399cd00000000000007e0 | 134.079 | 3.684 | 0.006 | 0.000 | 97.583 | 0.689 | 1.464 | 0.929 | n/a | 0.506 | 29.147 | n/a | n/a | 0.072 | 101.272 | 0.755 | 0.072 | node-15/thread-0/driver.queue.subject | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.377ms; driver.publication 1.307ms; driver.publication 1.263ms |
| f3b411525e1399cd00000000000007cd | 131.535 | 5.320 | 0.039 | 0.000 | 1.028 | 0.553 | 0.916 | 0.026 | n/a | 0.208 | 123.397 | n/a | n/a | 0.048 | 6.386 | 0.049 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.393ms |
| f3b411525e1399cd0000000000000c07 | 127.306 | 4.613 | 0.010 | 0.000 | 0.140 | 1.652 | 1.299 | 0.119 | n/a | 0.307 | 119.096 | n/a | n/a | 0.072 | 4.762 | 0.037 | 0.072 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000007ce | 125.394 | 3.205 | 0.006 | 0.000 | 0.655 | 2.330 | 0.668 | 0.020 | n/a | 0.624 | 117.853 | n/a | n/a | 0.032 | 3.866 | 0.031 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.393ms; driver.publication 1.126ms |
| f3b411525e1399cd0000000000000e64 | 123.149 | 6.547 | 0.005 | 0.000 | 96.186 | 0.632 | 2.177 | 0.016 | n/a | 0.166 | 17.391 | n/a | n/a | 0.030 | 102.738 | 0.834 | 0.030 | node-15/thread-0/driver.queue.subject | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.827ms; driver.publication 1.460ms; driver.publication 1.453ms |
| f3b411525e1399cd00000000000007df | 117.066 | 3.944 | 0.013 | 0.000 | 19.103 | 4.249 | 0.699 | 0.027 | n/a | 0.638 | 88.334 | n/a | n/a | 0.060 | 23.060 | 0.197 | 0.060 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.377ms; driver.publication 1.307ms; driver.publication 1.263ms |
| f3b411525e1399cd00000000000007cc | 111.979 | 3.564 | 0.006 | 0.000 | 0.149 | 0.980 | 1.340 | 0.064 | n/a | 0.355 | 105.458 | n/a | n/a | 0.063 | 3.719 | 0.033 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000007db | 111.473 | 5.236 | 0.005 | 0.000 | 24.742 | 1.466 | 1.296 | 0.030 | n/a | 0.190 | 78.471 | n/a | n/a | 0.036 | 29.983 | 0.269 | 0.036 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.377ms; driver.publication 1.263ms; driver.publication 1.237ms |

## P2 / tail / commit / 5-10 facts (2048 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 13.691 | 0.678 | 0.000 | 1.530 | 3.264 | 0.005 | 0.000 | 0.779 | 0.747 | 0.978 | 0.028 | n/a | 0.222 | 5.668 | n/a | n/a | 0.037 | 4.240 | 0.330 | 0.037 |
| p99 | 89.014 | 2.210 | 2.238 | 4.945 | 9.682 | 0.179 | 0.000 | 26.688 | 16.335 | 6.447 | 3.516 | n/a | 3.645 | 59.196 | n/a | n/a | 0.121 | 31.626 | 0.775 | 0.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| f3b411525e1399cd0000000000000e4b | 224.710 | 12.920 | 0.007 | 0.000 | 0.881 | 60.005 | 4.200 | 0.045 | n/a | 0.946 | 145.603 | n/a | n/a | 0.103 | 13.808 | 0.061 | 0.103 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms; driver.expected-state.bind-receipt 1.896ms |
| f3b411525e1399cd00000000000007d4 | 174.498 | 3.188 | 0.005 | 0.000 | 90.153 | 3.435 | 0.841 | 0.028 | n/a | 0.406 | 76.398 | n/a | n/a | 0.044 | 93.346 | 0.535 | 0.044 | node-15/thread-0/driver.queue.subject | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.393ms; driver.publication 1.377ms; driver.publication 1.263ms |
| f3b411525e1399cd0000000000000e49 | 171.912 | 3.009 | 0.055 | 0.000 | 0.317 | 22.822 | 1.034 | 0.031 | n/a | 0.460 | 144.165 | n/a | n/a | 0.020 | 3.380 | 0.020 | 0.020 | gw-w/thread-67/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms; driver.publication 1.834ms |
| f3b411525e1399cd0000000000000e48 | 170.589 | 3.299 | 0.003 | 0.000 | 0.829 | 15.215 | 1.168 | 3.739 | n/a | 0.035 | 146.265 | n/a | n/a | 0.037 | 4.131 | 0.024 | 0.037 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms |
| f3b411525e1399cd0000000000000e4a | 168.974 | 3.645 | 0.006 | 0.000 | 0.602 | 14.818 | 0.746 | 3.183 | n/a | 0.190 | 145.741 | n/a | n/a | 0.043 | 4.252 | 0.025 | 0.043 | gw-w/thread-71/peer.transact-await (includes order/network/storage) | driver.publication 2.709ms; driver.publication 1.834ms; driver.publication 1.269ms |
| f3b411525e1399cd0000000000000e47 | 166.190 | 4.759 | 0.004 | 0.000 | 1.033 | 0.699 | 23.328 | 0.020 | n/a | 0.142 | 136.171 | n/a | n/a | 0.034 | 5.797 | 0.035 | 0.034 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd0000000000000e4e | 156.079 | 4.445 | 0.010 | 0.000 | 135.044 | 8.438 | 0.789 | 0.028 | n/a | 0.827 | 6.437 | n/a | n/a | 0.061 | 139.499 | 0.894 | 0.061 | node-15/thread-0/driver.queue.subject | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.827ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms |
| f3b411525e1399cd0000000000000e51 | 139.683 | 4.848 | 0.010 | 0.000 | 126.895 | 0.973 | 1.524 | 0.052 | n/a | 0.349 | 4.983 | n/a | n/a | 0.048 | 131.753 | 0.943 | 0.048 | node-15/thread-0/driver.queue.subject | driver.publication 3.847ms; driver.publication 3.283ms; driver.publication 2.827ms; driver.publication 2.709ms; driver.expected-state.bind-receipt 1.924ms |
| f3b411525e1399cd0000000000000c08 | 135.469 | 6.827 | 0.006 | 0.000 | 0.176 | 7.244 | 2.470 | 0.038 | n/a | 0.176 | 118.469 | n/a | n/a | 0.064 | 7.008 | 0.052 | 0.064 | gw-w/thread-46/peer.transact-await (includes order/network/storage) | driver.publication 2.562ms; driver.publication 1.943ms |
| f3b411525e1399cd00000000000007cd | 131.535 | 5.320 | 0.039 | 0.000 | 1.028 | 0.553 | 0.916 | 0.026 | n/a | 0.208 | 123.397 | n/a | n/a | 0.048 | 6.386 | 0.049 | 0.048 | gw-w/thread-44/peer.transact-await (includes order/network/storage) | driver.publication 1.393ms |
| f3b411525e1399cd0000000000000c07 | 127.306 | 4.613 | 0.010 | 0.000 | 0.140 | 1.652 | 1.299 | 0.119 | n/a | 0.307 | 119.096 | n/a | n/a | 0.072 | 4.762 | 0.037 | 0.072 | gw-w/thread-69/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000007ce | 125.394 | 3.205 | 0.006 | 0.000 | 0.655 | 2.330 | 0.668 | 0.020 | n/a | 0.624 | 117.853 | n/a | n/a | 0.032 | 3.866 | 0.031 | 0.032 | gw-w/thread-48/peer.transact-await (includes order/network/storage) | driver.publication 1.393ms; driver.publication 1.126ms |
| f3b411525e1399cd00000000000007df | 117.066 | 3.944 | 0.013 | 0.000 | 19.103 | 4.249 | 0.699 | 0.027 | n/a | 0.638 | 88.334 | n/a | n/a | 0.060 | 23.060 | 0.197 | 0.060 | gw-w/thread-73/peer.transact-await (includes order/network/storage) | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.377ms; driver.publication 1.307ms; driver.publication 1.263ms |
| f3b411525e1399cd00000000000007cc | 111.979 | 3.564 | 0.006 | 0.000 | 0.149 | 0.980 | 1.340 | 0.064 | n/a | 0.355 | 105.458 | n/a | n/a | 0.063 | 3.719 | 0.033 | 0.063 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | none observed |
| f3b411525e1399cd00000000000007d0 | 109.788 | 2.757 | 0.005 | 0.000 | 3.395 | 17.124 | 1.013 | 0.094 | n/a | 0.208 | 85.162 | n/a | n/a | 0.030 | 6.157 | 0.056 | 0.030 | gw-w/thread-45/peer.transact-await (includes order/network/storage) | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.393ms; driver.publication 1.377ms; driver.publication 1.263ms |
| f3b411525e1399cd00000000000007dc | 107.745 | 2.966 | 0.007 | 0.000 | 0.368 | 3.067 | 0.934 | 0.023 | n/a | 0.981 | 99.358 | n/a | n/a | 0.042 | 3.341 | 0.031 | 0.042 | gw-w/thread-70/peer.transact-await (includes order/network/storage) | driver.publication 2.091ms; driver.publication 1.470ms; driver.publication 1.377ms; driver.publication 1.263ms; driver.publication 1.237ms |
| f3b411525e1399cd00000000000007d1 | 102.874 | 5.162 | 0.102 | 0.000 | 2.144 | 12.228 | 1.208 | 0.040 | n/a | 1.854 | 80.095 | n/a | n/a | 0.042 | 7.408 | 0.072 | 0.042 | gw-w/thread-49/peer.transact-await (includes order/network/storage) | driver.publication 1.470ms; driver.publication 1.393ms; driver.publication 1.377ms; driver.publication 1.263ms; driver.publication 1.237ms |
| f3b411525e1399cd000000000000104b | 101.233 | 5.911 | 0.005 | 0.000 | 85.386 | 0.517 | 1.391 | 0.052 | n/a | 0.723 | 7.218 | n/a | n/a | 0.030 | 91.302 | 0.902 | 0.030 | node-15/thread-0/driver.queue.subject | driver.publication 1.298ms; driver.publication 1.044ms |
| f3b411525e1399cd0000000000000c0a | 96.699 | 3.424 | 0.011 | 0.000 | 0.913 | 19.015 | 0.530 | 0.021 | n/a | 0.126 | 72.590 | n/a | n/a | 0.067 | 4.348 | 0.045 | 0.067 | gw-w/thread-47/peer.transact-await (includes order/network/storage) | driver.publication 4.593ms; driver.publication 2.562ms; driver.publication 1.943ms; driver.publication 1.531ms |
| f3b411525e1399cd0000000000000c09 | 89.868 | 4.942 | 0.008 | 0.000 | 0.714 | 4.407 | 0.794 | 0.025 | n/a | 0.145 | 78.765 | n/a | n/a | 0.068 | 5.664 | 0.063 | 0.068 | gw-w/thread-65/peer.transact-await (includes order/network/storage) | driver.publication 1.943ms |

## P1 / warmup / read (989 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.067 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.000 | 0.000 | 0.024 |
| p99 | 522.373 | n/a | n/a | n/a | 0.848 | n/a | 0.000 | 522.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.436 | 522.369 | 1.000 | 0.436 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b8ab7c9ef995f840000000000030594 | 523.155 | 0.138 | n/a | 0.000 | 523.015 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 523.153 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f840000000000030599 | 522.892 | 0.013 | n/a | 0.000 | 522.878 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.891 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f840000000000030598 | 522.884 | 0.013 | n/a | 0.000 | 522.870 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.883 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f840000000000030597 | 522.877 | 0.014 | n/a | 0.000 | 522.863 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.876 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f840000000000030596 | 522.874 | 0.021 | n/a | 0.000 | 522.851 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.873 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000003011e | 522.425 | 0.016 | n/a | 0.000 | 522.408 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.424 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000003011d | 522.411 | 0.016 | n/a | 0.000 | 522.394 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.410 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000003011c | 522.402 | 0.021 | n/a | 0.000 | 522.380 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.401 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000003011b | 522.390 | 0.039 | n/a | 0.000 | 522.350 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 522.389 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000003011a | 522.373 | 0.134 | n/a | 0.000 | 522.235 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 522.369 | 1.000 | 0.004 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000030a42 | 521.566 | 0.185 | n/a | 0.000 | 521.377 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 521.563 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000030a5c | 520.215 | 0.040 | n/a | 0.000 | 520.173 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 520.213 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000030a5d | 520.194 | 0.021 | n/a | 0.000 | 520.171 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 520.193 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000030a66 | 519.746 | 0.030 | n/a | 0.000 | 519.714 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 519.744 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000030a67 | 519.736 | 0.035 | n/a | 0.000 | 519.699 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 519.734 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000030a68 | 519.714 | 0.018 | n/a | 0.000 | 519.694 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 519.713 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f84000000000001b0a9 | 317.122 | 0.017 | n/a | 0.000 | 317.104 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.121 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 8b8ab7c9ef995f84000000000001b0a8 | 317.116 | 0.019 | n/a | 0.000 | 317.096 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.115 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 8b8ab7c9ef995f84000000000001b0a7 | 317.111 | 0.040 | n/a | 0.000 | 317.070 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 317.110 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| 8b8ab7c9ef995f84000000000001b0a6 | 317.060 | 0.138 | n/a | 0.000 | 316.920 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 317.058 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.031ms |

## P1 / L1 / read (376 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.020 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.018 | 0.000 | 0.000 | 0.018 |
| p99 | 289.866 | n/a | n/a | n/a | 0.302 | n/a | 0.000 | 289.757 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.252 | 289.864 | 1.000 | 0.252 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fca6ed01434732090000000000082f9f | 306.102 | 0.230 | n/a | 0.000 | 305.868 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 306.098 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.086ms |
| fca6ed0143473209000000000007a47d | 294.898 | 0.302 | n/a | 0.000 | 294.589 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 294.892 | 1.000 | 0.006 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000093e5a | 291.861 | 0.281 | n/a | 0.000 | 291.575 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.856 | 1.000 | 0.005 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000076ba1 | 289.866 | 0.107 | n/a | 0.000 | 289.757 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 289.864 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000050eee | 278.781 | 0.185 | n/a | 0.000 | 278.592 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 278.777 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000005d7bc | 276.655 | 0.344 | n/a | 0.000 | 276.309 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.652 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000007c641 | 273.671 | 0.189 | n/a | 0.000 | 273.478 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 273.667 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000006e4db | 272.462 | 0.207 | n/a | 0.000 | 272.252 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.459 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000074f07 | 272.073 | 0.152 | n/a | 0.000 | 271.917 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 272.069 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000004ff09 | 270.291 | 0.153 | n/a | 0.000 | 270.132 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 270.285 | 1.000 | 0.006 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000932fc | 268.415 | 0.207 | n/a | 0.000 | 268.206 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 268.413 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000006ef88 | 266.925 | 0.107 | n/a | 0.000 | 266.816 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 266.923 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.061ms |
| fca6ed0143473209000000000008bb90 | 262.786 | 0.195 | n/a | 0.000 | 262.588 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 262.782 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000007a503 | 262.752 | 0.097 | n/a | 0.000 | 262.652 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 262.749 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.033ms |
| fca6ed0143473209000000000007a4e5 | 260.749 | 1.073 | n/a | 0.000 | 259.664 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.012 | 260.737 | 1.000 | 0.012 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.053ms |
| fca6ed0143473209000000000007953c | 260.348 | 0.163 | n/a | 0.000 | 260.183 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 260.346 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000007954f | 180.756 | 0.155 | n/a | 0.000 | 180.598 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 180.753 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.029ms |
| fca6ed0143473209000000000007a525 | 44.778 | 0.272 | n/a | 0.000 | 44.502 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 44.774 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.031ms |
| fca6ed01434732090000000000093e8f | 27.381 | 21.066 | n/a | 0.000 | 0.000 | 1.441 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 4.874 | 21.066 | 0.769 | 4.874 | node-15/thread-4/replica.pull-at | replica.apply-delta 0.089ms; replica.apply-delta 0.052ms |
| fca6ed0143473209000000000007a51a | 17.198 | 0.254 | n/a | 0.000 | 16.937 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.008 | 17.191 | 1.000 | 0.008 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.060ms |

## P1 / L4 / read (909 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.027 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.022 | 0.000 | 0.000 | 0.022 |
| p99 | 276.618 | n/a | n/a | n/a | 0.337 | n/a | 0.000 | 276.402 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.321 | 276.615 | 1.000 | 0.321 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b8ab7c9ef995f8400000000000780d4 | 391.576 | 0.409 | n/a | 0.000 | 391.162 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 391.571 | 1.000 | 0.006 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000d5b0d | 391.031 | 0.472 | n/a | 0.000 | 390.554 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 391.026 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000d5b0e | 390.979 | 0.053 | n/a | 0.000 | 390.925 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 390.978 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000007692c | 389.788 | 0.225 | n/a | 0.000 | 389.559 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 389.784 | 1.000 | 0.004 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000bb0f4 | 278.561 | 0.048 | n/a | 0.000 | 278.512 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 278.560 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000bb0f3 | 278.541 | 0.141 | n/a | 0.000 | 278.398 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 278.539 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f84000000000006c69a | 278.385 | 0.122 | n/a | 0.000 | 278.258 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 278.381 | 1.000 | 0.005 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fca6ed014347320900000000000c93de | 277.591 | 0.026 | n/a | 0.000 | 277.562 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 277.589 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| fca6ed014347320900000000000c93dd | 277.586 | 0.109 | n/a | 0.000 | 277.475 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 277.584 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.045ms |
| fb9ea0b34c367cdd000000000005dcdc | 276.618 | 0.213 | n/a | 0.000 | 276.402 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.615 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f84000000000005f12a | 276.057 | 0.231 | n/a | 0.000 | 275.823 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.054 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000006b2ca | 276.017 | 0.114 | n/a | 0.000 | 275.900 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 276.014 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.036ms |
| 8b8ab7c9ef995f84000000000004bb0a | 275.913 | 0.122 | n/a | 0.000 | 275.789 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 275.911 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000004ae6e | 275.894 | 0.206 | n/a | 0.000 | 275.683 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.006 | 275.889 | 1.000 | 0.006 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000a5990 | 275.344 | 0.140 | n/a | 0.000 | 275.200 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 275.340 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000a599a | 274.852 | 0.035 | n/a | 0.000 | 274.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 274.850 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000007788a | 273.046 | 0.304 | n/a | 0.000 | 272.731 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.011 | 273.035 | 1.000 | 0.011 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.035ms |
| fb9ea0b34c367cdd00000000000540c2 | 271.950 | 0.156 | n/a | 0.000 | 271.792 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 271.948 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fca6ed014347320900000000000d6a6c | 271.856 | 0.040 | n/a | 0.000 | 271.814 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 271.855 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |
| fca6ed014347320900000000000d6a6b | 271.834 | 0.201 | n/a | 0.000 | 271.629 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 271.830 | 1.000 | 0.004 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.038ms |

## P1 / L16 / read (1187 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.094 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.031 | 0.000 | 0.000 | 0.031 |
| p99 | 293.653 | n/a | n/a | n/a | 0.617 | n/a | 0.000 | 293.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.384 | 293.649 | 1.000 | 0.384 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fca6ed014347320900000000000f3b68 | 297.012 | 0.020 | n/a | 0.000 | 296.992 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 297.012 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fca6ed014347320900000000000f3b67 | 297.002 | 0.106 | n/a | 0.000 | 296.894 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 297.000 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fca6ed014347320900000000000f3b7d | 296.385 | 0.012 | n/a | 0.000 | 296.372 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.385 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fca6ed014347320900000000000f3b7c | 296.378 | 0.013 | n/a | 0.000 | 296.365 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.377 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fca6ed014347320900000000000f3b7a | 296.373 | 0.022 | n/a | 0.000 | 296.349 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.372 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| fca6ed014347320900000000000f3b7b | 296.370 | 0.013 | n/a | 0.000 | 296.356 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 296.369 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | replica.apply-delta 0.042ms |
| 8b8ab7c9ef995f84000000000009544b | 294.483 | 0.026 | n/a | 0.000 | 294.456 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.482 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 8b8ab7c9ef995f84000000000009544a | 294.481 | 0.033 | n/a | 0.000 | 294.447 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.480 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 8b8ab7c9ef995f840000000000095447 | 294.459 | 0.122 | n/a | 0.000 | 294.334 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 294.456 | 1.000 | 0.004 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 8b8ab7c9ef995f840000000000095449 | 294.445 | 0.015 | n/a | 0.000 | 294.429 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.444 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| 8b8ab7c9ef995f840000000000095448 | 294.443 | 0.022 | n/a | 0.000 | 294.420 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 294.442 | 1.000 | 0.001 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.067ms |
| fb9ea0b34c367cdd0000000000092b44 | 293.653 | 0.219 | n/a | 0.000 | 293.430 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 293.649 | 1.000 | 0.004 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| fb9ea0b34c367cdd0000000000092b45 | 293.576 | 0.052 | n/a | 0.000 | 293.521 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 293.573 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| fb9ea0b34c367cdd000000000009a646 | 292.828 | 0.043 | n/a | 0.000 | 292.784 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 292.826 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| fb9ea0b34c367cdd000000000009a645 | 292.730 | 0.227 | n/a | 0.000 | 292.500 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.727 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.048ms |
| fb9ea0b34c367cdd0000000000092b50 | 292.340 | 0.103 | n/a | 0.000 | 292.216 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.021 | 292.319 | 1.000 | 0.021 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| fb9ea0b34c367cdd0000000000092b51 | 292.229 | 0.032 | n/a | 0.000 | 292.195 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 292.227 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| 8b8ab7c9ef995f84000000000009d145 | 292.087 | 0.132 | n/a | 0.000 | 291.952 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 292.084 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | replica.apply-delta 0.051ms |
| fb9ea0b34c367cdd0000000000092b55 | 291.980 | 0.098 | n/a | 0.000 | 291.877 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.005 | 291.975 | 1.000 | 0.005 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.037ms |
| fb9ea0b34c367cdd000000000009a657 | 291.958 | 0.140 | n/a | 0.000 | 291.818 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 291.957 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | replica.apply-delta 0.048ms |

## P1 / L64 / read (2605 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 163.042 | n/a | n/a | n/a | 0.021 | n/a | 0.000 | 162.966 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 163.040 | 1.000 | 0.002 |
| p99 | 365.908 | n/a | n/a | n/a | 1.461 | n/a | 0.000 | 365.892 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.477 | 365.907 | 1.000 | 0.477 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fb9ea0b34c367cdd00000000000d0f88 | 369.635 | 0.026 | n/a | 0.000 | 369.609 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.635 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd00000000000d0f87 | 369.609 | 0.013 | n/a | 0.000 | 369.596 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.609 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd00000000000d0f86 | 369.606 | 0.021 | n/a | 0.000 | 369.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 369.605 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd00000000000d0f85 | 369.586 | 0.106 | n/a | 0.000 | 369.478 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 369.584 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000132647 | 368.808 | 0.317 | n/a | 0.000 | 368.488 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 368.806 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f8400000000000d58cd | 368.807 | 0.203 | n/a | 0.000 | 368.601 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 368.804 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000013266e | 367.574 | 0.014 | n/a | 0.000 | 367.559 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.573 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000013266d | 367.560 | 0.013 | n/a | 0.000 | 367.546 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.559 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000013266c | 367.552 | 0.016 | n/a | 0.000 | 367.535 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.551 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000013266b | 367.534 | 0.024 | n/a | 0.000 | 367.509 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.533 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000013266a | 367.511 | 0.025 | n/a | 0.000 | 367.485 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.510 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000132669 | 367.505 | 0.084 | n/a | 0.000 | 367.420 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.503 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd00000000000d0fa8 | 367.156 | 0.025 | n/a | 0.000 | 367.128 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 367.153 | 1.000 | 0.003 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd00000000000d0faa | 367.151 | 0.012 | n/a | 0.000 | 367.139 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.000 | 367.151 | 1.000 | 0.000 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd00000000000d0fa9 | 367.144 | 0.012 | n/a | 0.000 | 367.131 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 367.143 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f8400000000000d58f4 | 366.924 | 0.039 | n/a | 0.000 | 366.882 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 366.921 | 1.000 | 0.002 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f8400000000000d58f3 | 366.874 | 0.045 | n/a | 0.000 | 366.827 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 366.871 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f8400000000000d58f2 | 366.819 | 0.066 | n/a | 0.000 | 366.750 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 366.816 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | none observed |
| 8b8ab7c9ef995f8400000000000d58f1 | 366.753 | 0.075 | n/a | 0.000 | 366.675 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 366.750 | 1.000 | 0.003 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fca6ed01434732090000000000132692 | 366.601 | 0.047 | n/a | 0.000 | 366.553 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 366.600 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |

## P1 / L256 / read (6024 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 240.122 | n/a | n/a | n/a | 0.028 | n/a | 0.000 | 240.107 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 240.121 | 1.000 | 0.001 |
| p99 | 319.597 | n/a | n/a | n/a | 20.476 | n/a | 35.334 | 319.537 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.468 | 319.595 | 1.000 | 0.468 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 8b8ab7c9ef995f840000000000141977 | 327.387 | 0.217 | n/a | 0.000 | 327.166 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.004 | 327.383 | 1.000 | 0.004 | node-15/thread-5/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd19 | 327.328 | 0.019 | n/a | 0.000 | 327.307 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.327 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd18 | 327.316 | 0.033 | n/a | 0.000 | 327.282 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.315 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd17 | 327.293 | 0.034 | n/a | 0.000 | 327.257 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.292 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd16 | 327.255 | 0.019 | n/a | 0.000 | 327.234 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.254 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd15 | 327.236 | 0.021 | n/a | 0.000 | 327.214 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.235 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd14 | 327.221 | 0.020 | n/a | 0.000 | 327.200 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.219 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd13 | 327.208 | 0.022 | n/a | 0.000 | 327.184 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.206 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd12 | 327.202 | 0.057 | n/a | 0.000 | 327.142 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 327.199 | 1.000 | 0.002 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd11 | 327.153 | 0.031 | n/a | 0.000 | 327.120 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 327.152 | 1.000 | 0.001 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fca6ed0143473209000000000019dd10 | 327.130 | 0.131 | n/a | 0.000 | 326.995 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.003 | 327.126 | 1.000 | 0.003 | node-15/thread-4/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae8 | 325.813 | 0.034 | n/a | 0.000 | 325.779 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.813 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae7 | 325.793 | 0.017 | n/a | 0.000 | 325.775 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.792 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae6 | 325.753 | 0.021 | n/a | 0.000 | 325.731 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.752 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae5 | 325.736 | 0.031 | n/a | 0.000 | 325.704 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.735 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae4 | 325.683 | 0.096 | n/a | 0.000 | 325.585 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.681 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae3 | 325.576 | 0.047 | n/a | 0.000 | 325.527 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.574 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae2 | 325.506 | 0.039 | n/a | 0.000 | 325.464 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.503 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae1 | 325.461 | 0.047 | n/a | 0.000 | 325.412 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.002 | 325.459 | 1.000 | 0.002 | node-15/thread-6/reader.straddle-await-ack | none observed |
| fb9ea0b34c367cdd000000000013bae0 | 325.418 | 0.049 | n/a | 0.000 | 325.368 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.001 | 325.417 | 1.000 | 0.001 | node-15/thread-6/reader.straddle-await-ack | none observed |

## P1 / tail / read (5 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 0.093 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 |
| p99 | 0.187 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| fca6ed014347320900000000001be0a5 | 0.187 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | uncovered | none observed |
| fca6ed014347320900000000001be0a7 | 0.138 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 | uncovered | none observed |
| fca6ed014347320900000000001be0a3 | 0.093 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.093 | 0.000 | 0.000 | 0.093 | uncovered | none observed |
| fca6ed014347320900000000001be0a4 | 0.077 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.077 | 0.000 | 0.000 | 0.077 | uncovered | none observed |
| fca6ed014347320900000000001be0a6 | 0.024 | 0.000 | n/a | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 0.024 | 0.000 | 0.000 | 0.024 | uncovered | none observed |

## P3 / outside-phases / read (12 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.577 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.620 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 |
| p99 | 209.306 | n/a | n/a | n/a | 26.372 | n/a | 19.177 | 0.000 | 9.809 | 202.869 | 0.129 | n/a | 0.144 | 0.000 | n/a | n/a | 32.551 | 29.175 | 0.436 | 32.551 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed0000000000000002 | 209.306 | 2.196 | n/a | 0.000 | 0.000 | 3.598 | 202.869 | 0.129 | n/a | 0.111 | 0.000 | n/a | n/a | 0.403 | 2.196 | 0.010 | 0.403 | gw-r/thread-47/gateway.admitted-work | none observed |
| 829385578d4a11ec0000000000000006 | 202.642 | 0.000 | n/a | 0.000 | 0.000 | 1.012 | 201.252 | 0.017 | n/a | 0.144 | 0.000 | n/a | n/a | 0.218 | 0.000 | 0.000 | 0.218 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000007 | 201.877 | 0.000 | n/a | 0.000 | 0.000 | 0.753 | 200.870 | 0.009 | n/a | 0.067 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000005 | 201.834 | 0.000 | n/a | 0.000 | 0.000 | 0.730 | 200.860 | 0.012 | n/a | 0.102 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000f0d | 201.651 | 0.000 | n/a | 0.000 | 0.000 | 0.481 | 200.912 | 0.023 | n/a | 0.127 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-71/journal/page | none observed |
| 829385578d4a11ec0000000000000f0f | 201.590 | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.588 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-71/journal/page | none observed |
| 829385578d4a11ec0000000000000f10 | 201.577 | 0.000 | n/a | 0.000 | 0.000 | 0.721 | 200.652 | 0.008 | n/a | 0.053 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 | gw-r/thread-76/journal/page | none observed |
| 829385578d4a11ec0000000000000f0e | 201.356 | 0.000 | n/a | 0.000 | 0.000 | 0.536 | 200.620 | 0.040 | n/a | 0.051 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000f13 | 93.388 | 23.102 | n/a | 1.459 | 0.000 | 9.809 | 58.809 | 0.009 | n/a | 0.006 | 0.000 | n/a | n/a | 0.193 | 24.561 | 0.263 | 0.193 | gw-r/thread-46/gateway.admitted-work | none observed |
| 829385578d4a11ec0000000000000f14 | 89.585 | 18.955 | n/a | 0.000 | 0.000 | 5.521 | 64.506 | 0.022 | n/a | 0.010 | 0.000 | n/a | n/a | 0.571 | 18.955 | 0.212 | 0.571 | gw-r/thread-76/gateway.admitted-work | none observed |
| 829385578d4a11ec0000000000000f15 | 86.222 | 26.372 | n/a | 0.000 | 0.000 | 5.376 | 54.230 | 0.010 | n/a | 0.010 | 0.000 | n/a | n/a | 0.224 | 26.372 | 0.306 | 0.224 | gw-r/thread-76/gateway.admitted-work | none observed |
| 829385578d4a11ec0000000000000f16 | 66.873 | 9.998 | n/a | 19.177 | 0.000 | 5.147 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 32.551 | 29.175 | 0.436 | 32.551 | node-15/thread-7/socket.wait-first-byte | none observed |

## P3 / outside-phases / internal (3 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 1004.127 | n/a | n/a | n/a | 0.161 | n/a | 0.000 | 0.000 | 1.217 | 1001.437 | 0.014 | n/a | 0.157 | 0.000 | n/a | n/a | 1.099 | 0.161 | 0.000 | 1.099 |
| p99 | 17512.504 | n/a | n/a | n/a | 0.319 | n/a | 0.000 | 0.000 | 16509.157 | 1001.668 | 0.020 | n/a | 0.341 | 0.000 | n/a | n/a | 1.135 | 0.319 | 0.000 | 1.135 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed00000000000000a4 | 17512.504 | 0.319 | n/a | 0.000 | 0.000 | 16509.157 | 1001.668 | 0.014 | n/a | 0.341 | 0.000 | n/a | n/a | 1.004 | 0.319 | 0.000 | 1.004 | node-15/thread-2/socket.wait-first-byte | none observed |
| 7ac2d11c64b734ed00000000000000a5 | 1004.127 | 0.161 | n/a | 0.000 | 0.000 | 1.217 | 1001.437 | 0.020 | n/a | 0.157 | 0.000 | n/a | n/a | 1.135 | 0.161 | 0.000 | 1.135 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000a6 | 1002.514 | 0.134 | n/a | 0.000 | 0.000 | 0.521 | 1000.684 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 1.099 | 0.134 | 0.000 | 1.099 | gw-r/thread-48/journal/page | none observed |

## P3 / warmup / internal (32 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 380.256 | n/a | n/a | n/a | 4.782 | n/a | 0.000 | 0.000 | 1.005 | 370.307 | 0.026 | n/a | 0.100 | 0.000 | n/a | n/a | 0.185 | 5.701 | 0.017 | 0.185 |
| p99 | 1004.256 | n/a | n/a | n/a | 34.016 | n/a | 4.588 | 0.000 | 6.599 | 1001.536 | 0.774 | n/a | 0.227 | 0.000 | n/a | n/a | 31.191 | 36.682 | 0.746 | 31.191 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed00000000000000b6 | 1004.256 | 0.294 | n/a | 0.000 | 0.000 | 1.005 | 1001.536 | 0.051 | n/a | 0.210 | 0.000 | n/a | n/a | 1.160 | 0.294 | 0.000 | 1.160 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000c5 | 1003.954 | 0.267 | n/a | 0.000 | 0.000 | 1.198 | 1001.172 | 0.013 | n/a | 0.146 | 0.000 | n/a | n/a | 1.157 | 0.267 | 0.000 | 1.157 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000be | 1003.895 | 0.135 | n/a | 0.000 | 0.000 | 1.295 | 1001.185 | 0.023 | n/a | 0.120 | 0.000 | n/a | n/a | 1.137 | 0.135 | 0.000 | 1.137 | gw-r/thread-43/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000d4 | 1003.778 | 0.115 | n/a | 0.000 | 0.000 | 1.168 | 1001.238 | 0.013 | n/a | 0.129 | 0.000 | n/a | n/a | 1.115 | 0.115 | 0.000 | 1.115 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000b0 | 983.747 | 4.343 | n/a | 0.611 | 0.000 | 0.725 | 977.857 | 0.026 | n/a | 0.108 | 0.000 | n/a | n/a | 0.076 | 4.954 | 0.005 | 0.076 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000bd | 981.170 | 9.581 | n/a | 0.000 | 0.000 | 1.390 | 969.942 | 0.026 | n/a | 0.097 | 0.000 | n/a | n/a | 0.133 | 9.581 | 0.010 | 0.133 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000ad | 857.803 | 9.220 | n/a | 1.917 | 0.000 | 1.177 | 845.196 | 0.021 | n/a | 0.072 | 0.000 | n/a | n/a | 0.201 | 11.136 | 0.013 | 0.201 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000aa | 738.354 | 15.886 | n/a | 3.475 | 0.000 | 6.599 | 711.910 | 0.015 | n/a | 0.075 | 0.000 | n/a | n/a | 0.394 | 19.361 | 0.026 | 0.394 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000b4 | 651.956 | 4.782 | n/a | 0.567 | 0.000 | 0.583 | 645.789 | 0.020 | n/a | 0.104 | 0.000 | n/a | n/a | 0.112 | 5.348 | 0.008 | 0.112 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000cf | 650.970 | 2.693 | n/a | 3.008 | 0.000 | 1.035 | 643.860 | 0.185 | n/a | 0.082 | 0.000 | n/a | n/a | 0.106 | 5.701 | 0.009 | 0.106 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000cd | 614.735 | 3.165 | n/a | 0.000 | 0.000 | 2.848 | 608.367 | 0.198 | n/a | 0.077 | 0.000 | n/a | n/a | 0.080 | 3.165 | 0.005 | 0.080 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000c3 | 578.346 | 4.486 | n/a | 0.000 | 0.000 | 2.067 | 570.698 | 0.774 | n/a | 0.117 | 0.000 | n/a | n/a | 0.205 | 4.486 | 0.008 | 0.205 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000cb | 560.166 | 6.708 | n/a | 0.000 | 0.000 | 1.150 | 551.869 | 0.169 | n/a | 0.100 | 0.000 | n/a | n/a | 0.169 | 6.708 | 0.012 | 0.169 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000a9 | 456.311 | 9.385 | n/a | 0.000 | 0.000 | 2.556 | 440.875 | 0.017 | n/a | 0.085 | 0.000 | n/a | n/a | 3.393 | 9.385 | 0.021 | 3.393 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000c9 | 391.490 | 2.968 | n/a | 0.000 | 0.000 | 0.511 | 387.697 | 0.040 | n/a | 0.152 | 0.000 | n/a | n/a | 0.121 | 2.968 | 0.008 | 0.121 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000cc | 390.669 | 2.874 | n/a | 0.000 | 0.000 | 1.084 | 385.971 | 0.522 | n/a | 0.136 | 0.000 | n/a | n/a | 0.082 | 2.874 | 0.007 | 0.082 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000ba | 380.256 | 5.256 | n/a | 1.042 | 0.000 | 3.363 | 370.307 | 0.016 | n/a | 0.087 | 0.000 | n/a | n/a | 0.185 | 6.299 | 0.017 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000bb | 338.725 | 5.448 | n/a | 1.958 | 0.000 | 1.140 | 329.850 | 0.011 | n/a | 0.191 | 0.000 | n/a | n/a | 0.127 | 7.406 | 0.022 | 0.127 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000b2 | 315.187 | 9.152 | n/a | 0.808 | 0.000 | 0.847 | 304.162 | 0.012 | n/a | 0.086 | 0.000 | n/a | n/a | 0.119 | 9.960 | 0.032 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000b8 | 281.250 | 14.472 | n/a | 4.588 | 0.000 | 0.896 | 260.915 | 0.082 | n/a | 0.117 | 0.000 | n/a | n/a | 0.180 | 19.060 | 0.068 | 0.180 | gw-r/thread-46/journal/page | none observed |

## P3 / L1 / internal (44 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 388.547 | n/a | n/a | n/a | 4.864 | n/a | 0.000 | 0.000 | 0.820 | 384.423 | 0.014 | n/a | 0.076 | 0.000 | n/a | n/a | 0.181 | 5.039 | 0.016 | 0.181 |
| p99 | 1008.998 | n/a | n/a | n/a | 24.667 | n/a | 1.906 | 0.000 | 3.250 | 1001.623 | 3.583 | n/a | 0.264 | 0.000 | n/a | n/a | 42.508 | 25.895 | 0.713 | 42.508 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed00000000000000de | 1008.998 | 8.006 | n/a | 1.906 | 0.000 | 0.623 | 998.057 | 0.031 | n/a | 0.118 | 0.000 | n/a | n/a | 0.258 | 9.911 | 0.010 | 0.258 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000e3 | 1006.697 | 0.460 | n/a | 0.000 | 0.000 | 3.149 | 1001.623 | 0.047 | n/a | 0.264 | 0.000 | n/a | n/a | 1.153 | 0.460 | 0.000 | 1.153 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000104 | 1003.343 | 0.205 | n/a | 0.000 | 0.000 | 0.820 | 1001.061 | 0.024 | n/a | 0.065 | 0.000 | n/a | n/a | 1.167 | 0.205 | 0.000 | 1.167 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000d7 | 1002.867 | 0.139 | n/a | 0.000 | 0.000 | 0.688 | 1000.790 | 0.019 | n/a | 0.101 | 0.000 | n/a | n/a | 1.131 | 0.139 | 0.000 | 1.131 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000010c | 1001.453 | 3.706 | n/a | 0.000 | 0.000 | 1.022 | 996.529 | 0.014 | n/a | 0.081 | 0.000 | n/a | n/a | 0.102 | 3.706 | 0.004 | 0.102 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000df | 1000.647 | 6.295 | n/a | 0.000 | 0.000 | 0.850 | 992.737 | 0.583 | n/a | 0.095 | 0.000 | n/a | n/a | 0.085 | 6.295 | 0.006 | 0.085 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000d6 | 996.411 | 7.551 | n/a | 0.861 | 0.000 | 0.597 | 987.053 | 0.032 | n/a | 0.124 | 0.000 | n/a | n/a | 0.193 | 8.412 | 0.008 | 0.193 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000114 | 987.939 | 10.452 | n/a | 0.000 | 0.000 | 0.969 | 976.158 | 0.020 | n/a | 0.103 | 0.000 | n/a | n/a | 0.236 | 10.452 | 0.011 | 0.236 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000108 | 984.144 | 3.353 | n/a | 0.000 | 0.000 | 1.512 | 979.081 | 0.023 | n/a | 0.065 | 0.000 | n/a | n/a | 0.110 | 3.353 | 0.003 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000e5 | 930.357 | 5.469 | n/a | 1.116 | 0.000 | 0.639 | 922.866 | 0.039 | n/a | 0.110 | 0.000 | n/a | n/a | 0.118 | 6.585 | 0.007 | 0.118 | gw-r/thread-43/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000e6 | 825.185 | 8.947 | n/a | 0.000 | 0.000 | 1.037 | 814.868 | 0.029 | n/a | 0.116 | 0.000 | n/a | n/a | 0.188 | 8.947 | 0.011 | 0.188 | gw-r/thread-43/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000ea | 803.311 | 7.737 | n/a | 0.000 | 0.000 | 1.002 | 794.138 | 0.014 | n/a | 0.123 | 0.000 | n/a | n/a | 0.297 | 7.737 | 0.010 | 0.297 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000109 | 757.467 | 6.657 | n/a | 0.000 | 0.000 | 0.798 | 749.804 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.142 | 6.657 | 0.009 | 0.142 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000f1 | 633.274 | 2.224 | n/a | 0.000 | 0.000 | 0.610 | 630.210 | 0.016 | n/a | 0.090 | 0.000 | n/a | n/a | 0.125 | 2.224 | 0.004 | 0.125 | gw-r/thread-43/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000ee | 606.760 | 19.366 | n/a | 0.957 | 0.000 | 0.726 | 585.116 | 0.229 | n/a | 0.073 | 0.000 | n/a | n/a | 0.294 | 20.323 | 0.033 | 0.294 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000101 | 605.695 | 7.026 | n/a | 0.627 | 0.000 | 1.046 | 596.762 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.158 | 7.653 | 0.013 | 0.158 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed000000000000010e | 496.106 | 24.667 | n/a | 1.227 | 0.000 | 3.250 | 466.709 | 0.007 | n/a | 0.080 | 0.000 | n/a | n/a | 0.164 | 25.895 | 0.052 | 0.164 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000e0 | 495.243 | 5.971 | n/a | 0.573 | 0.000 | 0.975 | 483.985 | 3.583 | n/a | 0.074 | 0.000 | n/a | n/a | 0.081 | 6.545 | 0.013 | 0.081 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000e2 | 479.980 | 4.425 | n/a | 0.614 | 0.000 | 1.329 | 473.329 | 0.015 | n/a | 0.131 | 0.000 | n/a | n/a | 0.137 | 5.039 | 0.010 | 0.137 | gw-r/thread-43/journal/page | none observed |
| 7ac2d11c64b734ed00000000000000da | 451.379 | 4.106 | n/a | 0.000 | 0.000 | 1.142 | 445.949 | 0.012 | n/a | 0.076 | 0.000 | n/a | n/a | 0.093 | 4.106 | 0.009 | 0.093 | gw-r/thread-67/journal/page | none observed |

## P3 / L4 / internal (41 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 366.846 | n/a | n/a | n/a | 3.767 | n/a | 0.000 | 0.000 | 0.765 | 363.099 | 0.008 | n/a | 0.050 | 0.000 | n/a | n/a | 0.118 | 3.767 | 0.010 | 0.118 |
| p99 | 1004.478 | n/a | n/a | n/a | 13.357 | n/a | 0.855 | 0.000 | 4.046 | 1001.193 | 0.367 | n/a | 0.354 | 0.000 | n/a | n/a | 49.902 | 13.357 | 0.455 | 49.902 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed000000000000013f | 1004.478 | 6.125 | n/a | 0.000 | 0.000 | 0.787 | 997.335 | 0.008 | n/a | 0.052 | 0.000 | n/a | n/a | 0.172 | 6.125 | 0.006 | 0.172 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed000000000000011b | 1003.402 | 0.199 | n/a | 0.000 | 0.000 | 0.765 | 1001.193 | 0.033 | n/a | 0.064 | 0.000 | n/a | n/a | 1.148 | 0.199 | 0.000 | 1.148 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000132 | 1003.366 | 0.143 | n/a | 0.000 | 0.000 | 0.845 | 1000.988 | 0.021 | n/a | 0.076 | 0.000 | n/a | n/a | 1.295 | 0.143 | 0.000 | 1.295 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000131 | 1002.788 | 2.590 | n/a | 0.000 | 0.000 | 0.683 | 999.319 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.097 | 2.590 | 0.003 | 0.097 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000124 | 987.850 | 2.710 | n/a | 0.000 | 0.000 | 0.730 | 984.071 | 0.179 | n/a | 0.058 | 0.000 | n/a | n/a | 0.101 | 2.710 | 0.003 | 0.101 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed000000000000012d | 978.295 | 2.569 | n/a | 0.000 | 0.000 | 2.402 | 973.185 | 0.014 | n/a | 0.065 | 0.000 | n/a | n/a | 0.060 | 2.569 | 0.003 | 0.060 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000147 | 943.065 | 2.928 | n/a | 0.000 | 0.000 | 0.584 | 939.407 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.103 | 2.928 | 0.003 | 0.103 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000118 | 835.831 | 2.481 | n/a | 0.000 | 0.000 | 0.661 | 832.544 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.084 | 2.481 | 0.003 | 0.084 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed000000000000013b | 767.198 | 4.186 | n/a | 0.000 | 0.000 | 0.967 | 761.876 | 0.009 | n/a | 0.042 | 0.000 | n/a | n/a | 0.118 | 4.186 | 0.005 | 0.118 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000012e | 762.941 | 4.460 | n/a | 0.000 | 0.000 | 0.671 | 757.369 | 0.009 | n/a | 0.354 | 0.000 | n/a | n/a | 0.077 | 4.460 | 0.006 | 0.077 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000125 | 755.652 | 2.407 | n/a | 0.000 | 0.000 | 3.457 | 749.663 | 0.009 | n/a | 0.046 | 0.000 | n/a | n/a | 0.070 | 2.407 | 0.003 | 0.070 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000144 | 745.193 | 4.360 | n/a | 0.000 | 0.000 | 0.674 | 740.028 | 0.009 | n/a | 0.052 | 0.000 | n/a | n/a | 0.071 | 4.360 | 0.006 | 0.071 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed000000000000014f | 733.144 | 4.377 | n/a | 0.000 | 0.000 | 3.283 | 725.208 | 0.009 | n/a | 0.033 | 0.000 | n/a | n/a | 0.233 | 4.377 | 0.006 | 0.233 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000135 | 706.716 | 3.055 | n/a | 0.000 | 0.000 | 0.818 | 702.528 | 0.006 | n/a | 0.046 | 0.000 | n/a | n/a | 0.262 | 3.055 | 0.004 | 0.262 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed000000000000012b | 694.910 | 3.153 | n/a | 0.000 | 0.000 | 1.733 | 689.848 | 0.008 | n/a | 0.069 | 0.000 | n/a | n/a | 0.098 | 3.153 | 0.005 | 0.098 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000140 | 690.820 | 12.149 | n/a | 0.855 | 0.000 | 0.866 | 676.709 | 0.012 | n/a | 0.093 | 0.000 | n/a | n/a | 0.136 | 13.004 | 0.019 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000115 | 679.609 | 3.019 | n/a | 0.000 | 0.000 | 0.778 | 675.669 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.107 | 3.019 | 0.004 | 0.107 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000149 | 636.575 | 4.684 | n/a | 0.660 | 0.000 | 0.656 | 630.368 | 0.008 | n/a | 0.044 | 0.000 | n/a | n/a | 0.156 | 5.344 | 0.008 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed000000000000013c | 595.302 | 2.835 | n/a | 0.000 | 0.000 | 0.612 | 591.691 | 0.005 | n/a | 0.042 | 0.000 | n/a | n/a | 0.115 | 2.835 | 0.005 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000122 | 380.669 | 3.225 | n/a | 0.000 | 0.000 | 0.539 | 376.757 | 0.010 | n/a | 0.048 | 0.000 | n/a | n/a | 0.089 | 3.225 | 0.008 | 0.089 | gw-r/thread-46/journal/page | none observed |

## P3 / L16 / internal (45 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 392.712 | n/a | n/a | n/a | 3.447 | n/a | 0.000 | 0.000 | 0.755 | 389.025 | 0.008 | n/a | 0.042 | 0.000 | n/a | n/a | 0.110 | 3.447 | 0.010 | 0.110 |
| p99 | 1004.123 | n/a | n/a | n/a | 9.183 | n/a | 0.711 | 0.000 | 4.382 | 1001.480 | 0.762 | n/a | 0.133 | 0.000 | n/a | n/a | 45.027 | 9.183 | 0.354 | 45.027 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed000000000000016b | 1004.123 | 0.118 | n/a | 0.000 | 0.000 | 1.305 | 1001.480 | 0.024 | n/a | 0.076 | 0.000 | n/a | n/a | 1.119 | 0.118 | 0.000 | 1.119 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000018e | 1003.272 | 0.220 | n/a | 0.000 | 0.000 | 0.754 | 1001.074 | 0.010 | n/a | 0.071 | 0.000 | n/a | n/a | 1.144 | 0.220 | 0.000 | 1.144 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000175 | 1003.081 | 0.146 | n/a | 0.000 | 0.000 | 0.755 | 1000.985 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 1.121 | 0.146 | 0.000 | 1.121 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000186 | 1002.837 | 0.215 | n/a | 0.000 | 0.000 | 0.607 | 1000.813 | 0.008 | n/a | 0.057 | 0.000 | n/a | n/a | 1.137 | 0.215 | 0.000 | 1.137 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000017b | 993.963 | 3.946 | n/a | 0.000 | 0.000 | 3.226 | 986.500 | 0.129 | n/a | 0.038 | 0.000 | n/a | n/a | 0.123 | 3.946 | 0.004 | 0.123 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000018d | 989.826 | 4.799 | n/a | 0.000 | 0.000 | 2.148 | 982.750 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.080 | 4.799 | 0.005 | 0.080 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed000000000000015b | 937.612 | 5.422 | n/a | 0.000 | 0.000 | 1.247 | 930.718 | 0.013 | n/a | 0.092 | 0.000 | n/a | n/a | 0.119 | 5.422 | 0.006 | 0.119 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000160 | 823.835 | 3.321 | n/a | 0.000 | 0.000 | 0.624 | 819.625 | 0.147 | n/a | 0.049 | 0.000 | n/a | n/a | 0.069 | 3.321 | 0.004 | 0.069 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000181 | 794.145 | 3.134 | n/a | 0.000 | 0.000 | 2.130 | 788.331 | 0.386 | n/a | 0.075 | 0.000 | n/a | n/a | 0.088 | 3.134 | 0.004 | 0.088 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed000000000000015c | 763.027 | 3.447 | n/a | 0.000 | 0.000 | 0.591 | 758.815 | 0.008 | n/a | 0.056 | 0.000 | n/a | n/a | 0.110 | 3.447 | 0.005 | 0.110 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000018b | 637.806 | 2.407 | n/a | 0.000 | 0.000 | 0.731 | 634.530 | 0.011 | n/a | 0.054 | 0.000 | n/a | n/a | 0.071 | 2.407 | 0.004 | 0.071 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000174 | 611.679 | 5.586 | n/a | 0.000 | 0.000 | 0.748 | 605.170 | 0.012 | n/a | 0.074 | 0.000 | n/a | n/a | 0.089 | 5.586 | 0.009 | 0.089 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000191 | 583.939 | 5.998 | n/a | 0.000 | 0.000 | 0.946 | 569.921 | 0.762 | n/a | 0.042 | 0.000 | n/a | n/a | 6.269 | 5.998 | 0.010 | 6.269 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000156 | 582.600 | 2.329 | n/a | 0.000 | 0.000 | 0.861 | 579.235 | 0.015 | n/a | 0.067 | 0.000 | n/a | n/a | 0.094 | 2.329 | 0.004 | 0.094 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed000000000000017e | 580.083 | 3.386 | n/a | 0.000 | 0.000 | 0.906 | 575.482 | 0.143 | n/a | 0.085 | 0.000 | n/a | n/a | 0.082 | 3.386 | 0.006 | 0.082 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000184 | 564.760 | 2.872 | n/a | 0.000 | 0.000 | 0.667 | 561.036 | 0.009 | n/a | 0.055 | 0.000 | n/a | n/a | 0.120 | 2.872 | 0.005 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000178 | 554.362 | 4.554 | n/a | 0.000 | 0.000 | 0.652 | 549.051 | 0.006 | n/a | 0.035 | 0.000 | n/a | n/a | 0.064 | 4.554 | 0.008 | 0.064 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed000000000000016d | 527.770 | 8.510 | n/a | 0.000 | 0.000 | 1.175 | 517.735 | 0.176 | n/a | 0.050 | 0.000 | n/a | n/a | 0.124 | 8.510 | 0.016 | 0.124 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000159 | 442.242 | 6.739 | n/a | 0.000 | 0.000 | 0.863 | 434.358 | 0.011 | n/a | 0.050 | 0.000 | n/a | n/a | 0.222 | 6.739 | 0.015 | 0.222 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed000000000000016e | 438.626 | 3.533 | n/a | 0.000 | 0.000 | 0.518 | 434.415 | 0.012 | n/a | 0.049 | 0.000 | n/a | n/a | 0.100 | 3.533 | 0.008 | 0.100 | gw-r/thread-46/journal/page | none observed |

## P3 / L64 / internal (49 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 335.681 | n/a | n/a | n/a | 4.209 | n/a | 0.000 | 0.000 | 0.966 | 327.705 | 0.012 | n/a | 0.052 | 0.000 | n/a | n/a | 0.127 | 4.355 | 0.014 | 0.127 |
| p99 | 1016.303 | n/a | n/a | n/a | 21.308 | n/a | 4.818 | 0.000 | 6.552 | 1001.194 | 2.859 | n/a | 0.094 | 0.000 | n/a | n/a | 33.942 | 21.308 | 0.574 | 33.942 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed00000000000001ae | 1016.303 | 0.137 | n/a | 0.000 | 0.000 | 6.552 | 1001.194 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 8.335 | 0.137 | 0.000 | 8.335 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001cc | 1005.790 | 8.952 | n/a | 0.000 | 0.000 | 5.345 | 991.091 | 0.150 | n/a | 0.065 | 0.000 | n/a | n/a | 0.186 | 8.952 | 0.009 | 0.186 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000193 | 988.634 | 2.577 | n/a | 0.700 | 0.000 | 2.365 | 982.854 | 0.010 | n/a | 0.052 | 0.000 | n/a | n/a | 0.077 | 3.277 | 0.003 | 0.077 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001cd | 969.327 | 3.231 | n/a | 4.818 | 0.000 | 0.810 | 960.274 | 0.007 | n/a | 0.045 | 0.000 | n/a | n/a | 0.143 | 8.049 | 0.008 | 0.143 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001b0 | 965.440 | 5.060 | n/a | 0.000 | 0.000 | 0.618 | 959.498 | 0.006 | n/a | 0.037 | 0.000 | n/a | n/a | 0.221 | 5.060 | 0.005 | 0.221 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001a2 | 931.980 | 5.090 | n/a | 0.000 | 0.000 | 1.413 | 922.396 | 2.859 | n/a | 0.081 | 0.000 | n/a | n/a | 0.141 | 5.090 | 0.005 | 0.141 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001ad | 883.642 | 2.764 | n/a | 0.000 | 0.000 | 0.704 | 880.025 | 0.005 | n/a | 0.058 | 0.000 | n/a | n/a | 0.086 | 2.764 | 0.003 | 0.086 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001a4 | 840.421 | 4.966 | n/a | 0.000 | 0.000 | 1.011 | 834.244 | 0.013 | n/a | 0.053 | 0.000 | n/a | n/a | 0.134 | 4.966 | 0.006 | 0.134 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001ca | 801.000 | 6.357 | n/a | 0.000 | 0.000 | 1.307 | 793.046 | 0.122 | n/a | 0.063 | 0.000 | n/a | n/a | 0.104 | 6.357 | 0.008 | 0.104 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001be | 709.241 | 2.571 | n/a | 0.000 | 0.000 | 3.509 | 702.890 | 0.128 | n/a | 0.037 | 0.000 | n/a | n/a | 0.105 | 2.571 | 0.004 | 0.105 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001dd | 693.694 | 2.820 | n/a | 0.000 | 0.000 | 0.966 | 689.760 | 0.006 | n/a | 0.072 | 0.000 | n/a | n/a | 0.070 | 2.820 | 0.004 | 0.070 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001a8 | 638.421 | 4.355 | n/a | 0.000 | 0.000 | 4.051 | 629.743 | 0.098 | n/a | 0.065 | 0.000 | n/a | n/a | 0.108 | 4.355 | 0.007 | 0.108 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001d6 | 632.712 | 3.165 | n/a | 0.579 | 0.000 | 0.601 | 628.224 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.095 | 3.743 | 0.006 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001ce | 631.948 | 6.785 | n/a | 0.000 | 0.000 | 2.480 | 622.373 | 0.157 | n/a | 0.038 | 0.000 | n/a | n/a | 0.114 | 6.785 | 0.011 | 0.114 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001b8 | 593.932 | 4.266 | n/a | 0.000 | 0.000 | 1.891 | 587.434 | 0.162 | n/a | 0.052 | 0.000 | n/a | n/a | 0.127 | 4.266 | 0.007 | 0.127 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001d9 | 570.063 | 8.816 | n/a | 0.000 | 0.000 | 0.640 | 560.143 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.398 | 8.816 | 0.015 | 0.398 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001c2 | 569.169 | 3.243 | n/a | 0.000 | 0.000 | 1.190 | 564.532 | 0.028 | n/a | 0.081 | 0.000 | n/a | n/a | 0.096 | 3.243 | 0.006 | 0.096 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001a0 | 540.730 | 9.872 | n/a | 0.000 | 0.000 | 1.280 | 528.739 | 0.419 | n/a | 0.094 | 0.000 | n/a | n/a | 0.327 | 9.872 | 0.018 | 0.327 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001b1 | 534.652 | 5.677 | n/a | 0.000 | 0.000 | 2.326 | 526.452 | 0.016 | n/a | 0.062 | 0.000 | n/a | n/a | 0.119 | 5.677 | 0.011 | 0.119 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed000000000000019d | 444.597 | 5.792 | n/a | 0.000 | 0.000 | 2.568 | 435.751 | 0.011 | n/a | 0.052 | 0.000 | n/a | n/a | 0.423 | 5.792 | 0.013 | 0.423 | gw-r/thread-48/journal/page | none observed |

## P3 / L256 / internal (42 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 400.423 | n/a | n/a | n/a | 5.299 | n/a | 0.000 | 0.000 | 0.846 | 385.014 | 0.010 | n/a | 0.046 | 0.000 | n/a | n/a | 0.122 | 5.299 | 0.012 | 0.122 |
| p99 | 1003.931 | n/a | n/a | n/a | 12.122 | n/a | 0.000 | 0.000 | 4.332 | 1000.975 | 0.293 | n/a | 0.088 | 0.000 | n/a | n/a | 20.574 | 12.122 | 0.774 | 20.574 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed0000000000000219 | 1003.931 | 4.320 | n/a | 0.000 | 0.000 | 0.616 | 998.857 | 0.010 | n/a | 0.055 | 0.000 | n/a | n/a | 0.074 | 4.320 | 0.004 | 0.074 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed000000000000021d | 1003.380 | 0.146 | n/a | 0.000 | 0.000 | 1.044 | 1000.975 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 1.121 | 0.146 | 0.000 | 1.121 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000218 | 999.818 | 7.272 | n/a | 0.000 | 0.000 | 2.291 | 990.098 | 0.006 | n/a | 0.044 | 0.000 | n/a | n/a | 0.108 | 7.272 | 0.007 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed000000000000021f | 996.391 | 6.163 | n/a | 0.000 | 0.000 | 0.846 | 989.030 | 0.137 | n/a | 0.052 | 0.000 | n/a | n/a | 0.165 | 6.163 | 0.006 | 0.165 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000206 | 994.846 | 11.289 | n/a | 0.000 | 0.000 | 1.585 | 981.598 | 0.141 | n/a | 0.032 | 0.000 | n/a | n/a | 0.202 | 11.289 | 0.011 | 0.202 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001f2 | 970.508 | 5.561 | n/a | 0.000 | 0.000 | 3.466 | 961.315 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.101 | 5.561 | 0.006 | 0.101 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed000000000000021c | 966.773 | 8.111 | n/a | 0.000 | 0.000 | 0.893 | 957.379 | 0.182 | n/a | 0.041 | 0.000 | n/a | n/a | 0.167 | 8.111 | 0.008 | 0.167 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001fc | 888.864 | 3.192 | n/a | 0.000 | 0.000 | 0.697 | 884.831 | 0.005 | n/a | 0.052 | 0.000 | n/a | n/a | 0.087 | 3.192 | 0.004 | 0.087 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed000000000000020e | 856.092 | 5.151 | n/a | 0.000 | 0.000 | 2.024 | 848.685 | 0.007 | n/a | 0.046 | 0.000 | n/a | n/a | 0.181 | 5.151 | 0.006 | 0.181 | gw-r/thread-48/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001ff | 814.351 | 4.018 | n/a | 0.000 | 0.000 | 3.961 | 806.121 | 0.115 | n/a | 0.044 | 0.000 | n/a | n/a | 0.091 | 4.018 | 0.005 | 0.091 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000207 | 778.422 | 2.707 | n/a | 0.000 | 0.000 | 0.768 | 774.584 | 0.111 | n/a | 0.044 | 0.000 | n/a | n/a | 0.208 | 2.707 | 0.003 | 0.208 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed000000000000020a | 746.095 | 3.640 | n/a | 0.000 | 0.000 | 3.012 | 739.202 | 0.115 | n/a | 0.034 | 0.000 | n/a | n/a | 0.092 | 3.640 | 0.005 | 0.092 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001e5 | 735.414 | 8.830 | n/a | 0.000 | 0.000 | 0.823 | 725.551 | 0.019 | n/a | 0.067 | 0.000 | n/a | n/a | 0.124 | 8.830 | 0.012 | 0.124 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001f8 | 713.041 | 2.563 | n/a | 0.000 | 0.000 | 0.764 | 709.481 | 0.118 | n/a | 0.048 | 0.000 | n/a | n/a | 0.068 | 2.563 | 0.004 | 0.068 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001f0 | 691.946 | 12.122 | n/a | 0.000 | 0.000 | 0.858 | 678.676 | 0.014 | n/a | 0.064 | 0.000 | n/a | n/a | 0.212 | 12.122 | 0.018 | 0.212 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001e1 | 615.746 | 2.148 | n/a | 0.000 | 0.000 | 1.275 | 611.874 | 0.278 | n/a | 0.068 | 0.000 | n/a | n/a | 0.103 | 2.148 | 0.003 | 0.103 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000201 | 516.333 | 4.627 | n/a | 0.000 | 0.000 | 1.607 | 509.569 | 0.293 | n/a | 0.088 | 0.000 | n/a | n/a | 0.148 | 4.627 | 0.009 | 0.148 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000216 | 510.028 | 6.318 | n/a | 0.000 | 0.000 | 0.457 | 503.019 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.196 | 6.318 | 0.012 | 0.196 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001f7 | 473.467 | 2.913 | n/a | 0.000 | 0.000 | 2.281 | 468.118 | 0.011 | n/a | 0.049 | 0.000 | n/a | n/a | 0.095 | 2.913 | 0.006 | 0.095 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed00000000000001e9 | 464.890 | 7.963 | n/a | 0.000 | 0.000 | 0.535 | 456.206 | 0.012 | n/a | 0.060 | 0.000 | n/a | n/a | 0.114 | 7.963 | 0.017 | 0.114 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / internal (3032 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 14.617 | n/a | n/a | n/a | 4.088 | n/a | 0.000 | 0.000 | 0.264 | 0.000 | 0.000 | n/a | 0.000 | 0.000 | n/a | n/a | 6.524 | 4.101 | 0.333 | 6.524 |
| p99 | 305.773 | n/a | n/a | n/a | 18.626 | n/a | 1.485 | 0.000 | 0.988 | 300.852 | 0.122 | n/a | 0.037 | 0.000 | n/a | n/a | 46.121 | 19.665 | 0.859 | 46.121 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 7ac2d11c64b734ed000000000000022b | 1004.822 | 2.999 | n/a | 0.000 | 0.000 | 0.440 | 1001.241 | 0.007 | n/a | 0.037 | 0.000 | n/a | n/a | 0.097 | 2.999 | 0.003 | 0.097 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001ad6 | 1002.664 | 0.163 | n/a | 0.000 | 0.000 | 0.471 | 1000.820 | 0.011 | n/a | 0.062 | 0.000 | n/a | n/a | 1.136 | 0.163 | 0.000 | 1.136 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a8a | 1002.576 | 0.130 | n/a | 0.000 | 0.000 | 0.479 | 1000.770 | 0.013 | n/a | 0.082 | 0.000 | n/a | n/a | 1.103 | 0.130 | 0.000 | 1.103 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a94 | 997.493 | 3.470 | n/a | 0.000 | 0.000 | 0.547 | 993.385 | 0.006 | n/a | 0.030 | 0.000 | n/a | n/a | 0.056 | 3.470 | 0.003 | 0.056 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001aad | 996.211 | 3.680 | n/a | 0.000 | 0.000 | 0.490 | 991.878 | 0.088 | n/a | 0.027 | 0.000 | n/a | n/a | 0.050 | 3.680 | 0.004 | 0.050 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a8f | 965.328 | 8.301 | n/a | 0.000 | 0.000 | 0.629 | 956.179 | 0.007 | n/a | 0.024 | 0.000 | n/a | n/a | 0.188 | 8.301 | 0.009 | 0.188 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001ad2 | 963.131 | 4.337 | n/a | 0.000 | 0.000 | 0.481 | 958.197 | 0.006 | n/a | 0.023 | 0.000 | n/a | n/a | 0.086 | 4.337 | 0.005 | 0.086 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001ace | 956.091 | 3.155 | n/a | 0.000 | 0.000 | 0.488 | 952.332 | 0.006 | n/a | 0.031 | 0.000 | n/a | n/a | 0.078 | 3.155 | 0.003 | 0.078 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a9e | 954.621 | 6.038 | n/a | 0.000 | 0.000 | 0.475 | 947.878 | 0.006 | n/a | 0.029 | 0.000 | n/a | n/a | 0.194 | 6.038 | 0.006 | 0.194 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a88 | 946.091 | 3.729 | n/a | 0.000 | 0.000 | 0.423 | 941.671 | 0.193 | n/a | 0.026 | 0.000 | n/a | n/a | 0.049 | 3.729 | 0.004 | 0.049 | gw-r/thread-46/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000220 | 853.681 | 2.061 | n/a | 0.000 | 0.000 | 0.777 | 850.685 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.095 | 2.061 | 0.002 | 0.095 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed000000000000022c | 849.414 | 5.065 | n/a | 0.000 | 0.000 | 0.585 | 843.509 | 0.005 | n/a | 0.033 | 0.000 | n/a | n/a | 0.216 | 5.065 | 0.006 | 0.216 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a8c | 848.162 | 8.724 | n/a | 0.000 | 0.000 | 0.408 | 838.749 | 0.006 | n/a | 0.039 | 0.000 | n/a | n/a | 0.236 | 8.724 | 0.010 | 0.236 | gw-r/thread-50/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001aaf | 802.298 | 3.172 | n/a | 0.000 | 0.000 | 0.434 | 798.527 | 0.094 | n/a | 0.025 | 0.000 | n/a | n/a | 0.046 | 3.172 | 0.004 | 0.046 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001acf | 764.404 | 5.752 | n/a | 0.000 | 0.000 | 0.372 | 757.829 | 0.193 | n/a | 0.038 | 0.000 | n/a | n/a | 0.221 | 5.752 | 0.008 | 0.221 | gw-r/thread-49/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000228 | 744.482 | 3.256 | n/a | 0.000 | 0.000 | 0.726 | 740.371 | 0.014 | n/a | 0.042 | 0.000 | n/a | n/a | 0.073 | 3.256 | 0.004 | 0.073 | gw-r/thread-47/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001aa9 | 711.651 | 2.348 | n/a | 0.000 | 0.000 | 0.388 | 708.719 | 0.103 | n/a | 0.024 | 0.000 | n/a | n/a | 0.069 | 2.348 | 0.003 | 0.069 | gw-r/thread-67/journal/page | none observed |
| 7ac2d11c64b734ed0000000000000223 | 710.035 | 2.212 | n/a | 0.000 | 0.000 | 0.510 | 707.194 | 0.005 | n/a | 0.031 | 0.000 | n/a | n/a | 0.083 | 2.212 | 0.003 | 0.083 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001aa4 | 625.168 | 2.996 | n/a | 0.000 | 0.000 | 0.502 | 621.493 | 0.095 | n/a | 0.020 | 0.000 | n/a | n/a | 0.062 | 2.996 | 0.005 | 0.062 | gw-r/thread-45/journal/page | none observed |
| 7ac2d11c64b734ed0000000000001a95 | 599.500 | 2.754 | n/a | 0.000 | 0.000 | 0.389 | 596.053 | 0.093 | n/a | 0.023 | 0.000 | n/a | n/a | 0.188 | 2.754 | 0.005 | 0.188 | gw-r/thread-45/journal/page | none observed |

## P3 / warmup / read (74 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.386 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.959 | 201.072 | 0.024 | n/a | 0.133 | 0.000 | n/a | n/a | 0.143 | 0.000 | 0.000 | 0.143 |
| p99 | 225.345 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.122 | 203.345 | 3.780 | n/a | 22.362 | 0.000 | n/a | n/a | 53.575 | 0.000 | 0.000 | 53.575 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec0000000000000010 | 225.345 | 0.000 | n/a | 0.000 | 0.000 | 1.531 | 201.139 | 0.019 | n/a | 22.362 | 0.000 | n/a | n/a | 0.294 | 0.000 | 0.000 | 0.294 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000024 | 208.311 | 0.000 | n/a | 0.000 | 0.000 | 3.598 | 203.345 | 0.086 | n/a | 0.765 | 0.000 | n/a | n/a | 0.517 | 0.000 | 0.000 | 0.517 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000022 | 206.040 | 0.000 | n/a | 0.000 | 0.000 | 3.388 | 202.395 | 0.009 | n/a | 0.117 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000044 | 205.219 | 0.000 | n/a | 0.000 | 0.000 | 2.007 | 202.863 | 0.056 | n/a | 0.170 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec000000000000000e | 203.990 | 0.000 | n/a | 0.000 | 0.000 | 1.814 | 201.726 | 0.094 | n/a | 0.240 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000035 | 203.921 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 202.420 | 0.098 | n/a | 0.239 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000025 | 203.907 | 0.000 | n/a | 0.000 | 0.000 | 0.759 | 202.619 | 0.055 | n/a | 0.240 | 0.000 | n/a | n/a | 0.234 | 0.000 | 0.000 | 0.234 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec000000000000000c | 203.393 | 0.000 | n/a | 0.000 | 0.000 | 1.643 | 201.313 | 0.028 | n/a | 0.269 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000028 | 203.361 | 0.000 | n/a | 0.000 | 0.000 | 0.550 | 202.220 | 0.262 | n/a | 0.216 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000051 | 203.347 | 0.000 | n/a | 0.000 | 0.000 | 1.332 | 201.668 | 0.016 | n/a | 0.131 | 0.000 | n/a | n/a | 0.201 | 0.000 | 0.000 | 0.201 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000021 | 203.209 | 0.000 | n/a | 0.000 | 0.000 | 1.353 | 201.499 | 0.022 | n/a | 0.191 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000018 | 203.205 | 0.000 | n/a | 0.000 | 0.000 | 1.792 | 201.064 | 0.028 | n/a | 0.135 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-43/journal/page | none observed |
| 829385578d4a11ec000000000000003b | 203.045 | 0.000 | n/a | 0.000 | 0.000 | 1.273 | 201.437 | 0.026 | n/a | 0.195 | 0.000 | n/a | n/a | 0.114 | 0.000 | 0.000 | 0.114 | gw-r/thread-43/journal/page | none observed |
| 829385578d4a11ec000000000000000f | 202.994 | 0.000 | n/a | 0.000 | 0.000 | 0.893 | 201.673 | 0.052 | n/a | 0.244 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000041 | 202.979 | 0.000 | n/a | 0.000 | 0.000 | 1.183 | 201.438 | 0.041 | n/a | 0.183 | 0.000 | n/a | n/a | 0.133 | 0.000 | 0.000 | 0.133 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec000000000000004e | 202.933 | 0.000 | n/a | 0.000 | 0.000 | 1.463 | 201.174 | 0.020 | n/a | 0.163 | 0.000 | n/a | n/a | 0.113 | 0.000 | 0.000 | 0.113 | gw-r/thread-43/journal/page | none observed |
| 829385578d4a11ec000000000000003e | 202.914 | 0.000 | n/a | 0.000 | 0.000 | 1.125 | 201.413 | 0.030 | n/a | 0.179 | 0.000 | n/a | n/a | 0.167 | 0.000 | 0.000 | 0.167 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000014 | 202.836 | 0.000 | n/a | 0.000 | 0.000 | 0.907 | 201.533 | 0.026 | n/a | 0.159 | 0.000 | n/a | n/a | 0.211 | 0.000 | 0.000 | 0.211 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000026 | 202.831 | 0.000 | n/a | 0.000 | 0.000 | 0.951 | 201.509 | 0.053 | n/a | 0.167 | 0.000 | n/a | n/a | 0.152 | 0.000 | 0.000 | 0.152 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000009 | 202.804 | 0.000 | n/a | 0.000 | 0.000 | 1.164 | 201.148 | 0.017 | n/a | 0.129 | 0.000 | n/a | n/a | 0.345 | 0.000 | 0.000 | 0.345 | gw-r/thread-49/journal/page | none observed |

## P3 / L1 / read (87 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 202.001 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.777 | 200.951 | 0.013 | n/a | 0.103 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 206.031 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.612 | 204.541 | 8.377 | n/a | 0.301 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec0000000000000079 | 206.031 | 0.000 | n/a | 0.000 | 0.000 | 1.203 | 204.541 | 0.025 | n/a | 0.131 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-43/journal/page | none observed |
| 829385578d4a11ec00000000000000b7 | 204.152 | 0.000 | n/a | 0.000 | 0.000 | 1.838 | 201.891 | 0.014 | n/a | 0.134 | 0.000 | n/a | n/a | 0.276 | 0.000 | 0.000 | 0.276 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000081 | 203.490 | 0.000 | n/a | 0.000 | 0.000 | 1.539 | 201.469 | 0.022 | n/a | 0.205 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000073 | 203.299 | 0.000 | n/a | 0.000 | 0.000 | 1.810 | 201.154 | 0.013 | n/a | 0.115 | 0.000 | n/a | n/a | 0.207 | 0.000 | 0.000 | 0.207 | gw-r/thread-43/journal/page | none observed |
| 829385578d4a11ec0000000000000077 | 203.218 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.820 | 0.024 | n/a | 0.208 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000009b | 203.040 | 0.000 | n/a | 0.000 | 0.000 | 1.120 | 201.592 | 0.017 | n/a | 0.151 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000006a | 202.863 | 0.000 | n/a | 0.000 | 0.000 | 0.963 | 201.561 | 0.039 | n/a | 0.164 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000093 | 202.735 | 0.000 | n/a | 0.000 | 0.000 | 0.812 | 201.631 | 0.031 | n/a | 0.161 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec000000000000006c | 202.715 | 0.000 | n/a | 0.000 | 0.000 | 0.969 | 201.411 | 0.015 | n/a | 0.140 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000000b6 | 202.704 | 0.000 | n/a | 0.000 | 0.000 | 1.123 | 201.203 | 0.013 | n/a | 0.111 | 0.000 | n/a | n/a | 0.255 | 0.000 | 0.000 | 0.255 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec00000000000000bb | 202.693 | 0.000 | n/a | 0.000 | 0.000 | 1.042 | 201.389 | 0.011 | n/a | 0.098 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000094 | 202.654 | 0.000 | n/a | 0.000 | 0.000 | 1.105 | 201.280 | 0.012 | n/a | 0.118 | 0.000 | n/a | n/a | 0.140 | 0.000 | 0.000 | 0.140 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec00000000000000bd | 202.563 | 0.000 | n/a | 0.000 | 0.000 | 1.019 | 201.336 | 0.008 | n/a | 0.096 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec00000000000000b4 | 202.526 | 0.000 | n/a | 0.000 | 0.000 | 1.274 | 200.940 | 0.006 | n/a | 0.120 | 0.000 | n/a | n/a | 0.186 | 0.000 | 0.000 | 0.186 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000070 | 202.462 | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 201.322 | 0.079 | n/a | 0.088 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000076 | 202.461 | 0.000 | n/a | 0.000 | 0.000 | 0.935 | 201.080 | 0.012 | n/a | 0.126 | 0.000 | n/a | n/a | 0.307 | 0.000 | 0.000 | 0.307 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000074 | 202.419 | 0.000 | n/a | 0.000 | 0.000 | 0.673 | 201.286 | 0.043 | n/a | 0.301 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000080 | 202.418 | 0.000 | n/a | 0.000 | 0.000 | 0.961 | 201.162 | 0.020 | n/a | 0.114 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000066 | 202.381 | 0.000 | n/a | 0.000 | 0.000 | 0.973 | 201.166 | 0.010 | n/a | 0.112 | 0.000 | n/a | n/a | 0.120 | 0.000 | 0.000 | 0.120 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000089 | 202.378 | 0.000 | n/a | 0.000 | 0.000 | 0.757 | 201.209 | 0.074 | n/a | 0.160 | 0.000 | n/a | n/a | 0.177 | 0.000 | 0.000 | 0.177 | gw-r/thread-46/journal/page | none observed |

## P3 / L4 / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.835 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.799 | 200.848 | 0.009 | n/a | 0.069 | 0.000 | n/a | n/a | 0.130 | 0.000 | 0.000 | 0.130 |
| p99 | 204.838 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 3.849 | 203.560 | 2.979 | n/a | 0.190 | 0.000 | n/a | n/a | 49.933 | 0.000 | 0.000 | 49.933 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec00000000000000c6 | 204.838 | 0.000 | n/a | 0.000 | 0.000 | 3.849 | 200.799 | 0.008 | n/a | 0.080 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000000d2 | 204.621 | 0.000 | n/a | 0.000 | 0.000 | 0.824 | 203.560 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.146 | 0.000 | 0.000 | 0.146 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec00000000000000fd | 204.220 | 0.000 | n/a | 0.000 | 0.000 | 1.759 | 201.849 | 0.016 | n/a | 0.190 | 0.000 | n/a | n/a | 0.407 | 0.000 | 0.000 | 0.407 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000000c4 | 202.932 | 0.000 | n/a | 0.000 | 0.000 | 2.003 | 200.752 | 0.008 | n/a | 0.061 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec00000000000000e9 | 202.910 | 0.000 | n/a | 0.000 | 0.000 | 1.753 | 200.917 | 0.008 | n/a | 0.079 | 0.000 | n/a | n/a | 0.153 | 0.000 | 0.000 | 0.153 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec00000000000000cc | 202.817 | 0.000 | n/a | 0.000 | 0.000 | 1.686 | 200.917 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000116 | 202.716 | 0.000 | n/a | 0.000 | 0.000 | 0.983 | 201.407 | 0.018 | n/a | 0.084 | 0.000 | n/a | n/a | 0.223 | 0.000 | 0.000 | 0.223 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec00000000000000dd | 202.663 | 0.000 | n/a | 0.000 | 0.000 | 1.270 | 201.191 | 0.008 | n/a | 0.090 | 0.000 | n/a | n/a | 0.104 | 0.000 | 0.000 | 0.104 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec00000000000000f1 | 202.643 | 0.000 | n/a | 0.000 | 0.000 | 1.276 | 201.007 | 0.007 | n/a | 0.079 | 0.000 | n/a | n/a | 0.274 | 0.000 | 0.000 | 0.274 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000105 | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 1.065 | 201.270 | 0.007 | n/a | 0.092 | 0.000 | n/a | n/a | 0.192 | 0.000 | 0.000 | 0.192 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec00000000000000e5 | 202.625 | 0.000 | n/a | 0.000 | 0.000 | 0.957 | 201.433 | 0.012 | n/a | 0.115 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec00000000000000fb | 202.562 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.225 | 0.008 | n/a | 0.084 | 0.000 | n/a | n/a | 0.213 | 0.000 | 0.000 | 0.213 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000000e2 | 202.534 | 0.000 | n/a | 0.000 | 0.000 | 1.164 | 201.149 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec00000000000000ce | 202.508 | 0.000 | n/a | 0.000 | 0.000 | 0.844 | 201.302 | 0.014 | n/a | 0.119 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec00000000000000eb | 202.502 | 0.000 | n/a | 0.000 | 0.000 | 1.280 | 200.967 | 0.007 | n/a | 0.069 | 0.000 | n/a | n/a | 0.179 | 0.000 | 0.000 | 0.179 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000106 | 202.460 | 0.000 | n/a | 0.000 | 0.000 | 1.355 | 200.832 | 0.008 | n/a | 0.068 | 0.000 | n/a | n/a | 0.197 | 0.000 | 0.000 | 0.197 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec00000000000000dc | 202.363 | 0.000 | n/a | 0.000 | 0.000 | 1.186 | 200.989 | 0.009 | n/a | 0.080 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000000c2 | 202.280 | 0.000 | n/a | 0.000 | 0.000 | 0.805 | 201.176 | 0.010 | n/a | 0.093 | 0.000 | n/a | n/a | 0.196 | 0.000 | 0.000 | 0.196 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000000cd | 202.262 | 0.000 | n/a | 0.000 | 0.000 | 0.816 | 201.226 | 0.007 | n/a | 0.106 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec00000000000000cb | 202.262 | 0.000 | n/a | 0.000 | 0.000 | 0.955 | 201.061 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.155 | 0.000 | 0.000 | 0.155 | gw-r/thread-47/journal/page | none observed |

## P3 / L16 / read (93 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.765 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.776 | 200.846 | 0.007 | n/a | 0.063 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 |
| p99 | 205.492 | n/a | n/a | n/a | 3.689 | n/a | 0.000 | 0.000 | 7.765 | 203.470 | 5.573 | n/a | 0.190 | 0.000 | n/a | n/a | 0.322 | 3.689 | 0.018 | 0.322 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec0000000000000130 | 205.492 | 3.689 | n/a | 0.000 | 0.000 | 0.654 | 200.891 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.187 | 3.689 | 0.018 | 0.187 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000138 | 205.060 | 0.000 | n/a | 0.000 | 0.000 | 1.375 | 203.470 | 0.009 | n/a | 0.089 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000185 | 203.859 | 0.000 | n/a | 0.000 | 0.000 | 2.710 | 200.950 | 0.010 | n/a | 0.079 | 0.000 | n/a | n/a | 0.109 | 0.000 | 0.000 | 0.109 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec000000000000017e | 203.407 | 0.000 | n/a | 0.000 | 0.000 | 2.393 | 200.778 | 0.006 | n/a | 0.049 | 0.000 | n/a | n/a | 0.182 | 0.000 | 0.000 | 0.182 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000169 | 203.192 | 0.000 | n/a | 0.000 | 0.000 | 1.070 | 201.817 | 0.008 | n/a | 0.190 | 0.000 | n/a | n/a | 0.107 | 0.000 | 0.000 | 0.107 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000147 | 202.755 | 0.000 | n/a | 0.000 | 0.000 | 1.087 | 201.338 | 0.007 | n/a | 0.084 | 0.000 | n/a | n/a | 0.238 | 0.000 | 0.000 | 0.238 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec000000000000013a | 202.741 | 0.000 | n/a | 0.000 | 0.000 | 0.964 | 201.454 | 0.024 | n/a | 0.125 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec000000000000013c | 202.696 | 0.000 | n/a | 0.000 | 0.000 | 1.327 | 201.078 | 0.012 | n/a | 0.073 | 0.000 | n/a | n/a | 0.206 | 0.000 | 0.000 | 0.206 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000014f | 202.680 | 0.000 | n/a | 0.000 | 0.000 | 1.026 | 201.234 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 0.322 | 0.000 | 0.000 | 0.322 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000150 | 202.662 | 0.000 | n/a | 0.000 | 0.000 | 1.164 | 201.228 | 0.013 | n/a | 0.086 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000162 | 202.552 | 0.000 | n/a | 0.000 | 0.000 | 1.068 | 201.251 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000187 | 202.514 | 0.000 | n/a | 0.000 | 0.000 | 0.841 | 201.448 | 0.008 | n/a | 0.107 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000159 | 202.512 | 0.000 | n/a | 0.000 | 0.000 | 0.982 | 201.268 | 0.009 | n/a | 0.077 | 0.000 | n/a | n/a | 0.175 | 0.000 | 0.000 | 0.175 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000166 | 202.471 | 0.865 | n/a | 0.000 | 0.000 | 0.612 | 200.844 | 0.006 | n/a | 0.052 | 0.000 | n/a | n/a | 0.091 | 0.865 | 0.004 | 0.091 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000189 | 202.460 | 0.000 | n/a | 0.000 | 0.000 | 1.103 | 201.093 | 0.008 | n/a | 0.097 | 0.000 | n/a | n/a | 0.159 | 0.000 | 0.000 | 0.159 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec000000000000016d | 202.433 | 0.000 | n/a | 0.000 | 0.000 | 0.897 | 201.253 | 0.011 | n/a | 0.101 | 0.000 | n/a | n/a | 0.172 | 0.000 | 0.000 | 0.172 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec000000000000015e | 202.427 | 0.000 | n/a | 0.000 | 0.000 | 0.832 | 201.240 | 0.010 | n/a | 0.077 | 0.000 | n/a | n/a | 0.269 | 0.000 | 0.000 | 0.269 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000174 | 202.293 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 201.236 | 0.019 | n/a | 0.084 | 0.000 | n/a | n/a | 0.137 | 0.000 | 0.000 | 0.137 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000172 | 202.241 | 0.000 | n/a | 0.000 | 0.000 | 0.938 | 201.053 | 0.010 | n/a | 0.070 | 0.000 | n/a | n/a | 0.170 | 0.000 | 0.000 | 0.170 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000016e | 202.211 | 0.000 | n/a | 0.000 | 0.000 | 0.939 | 201.069 | 0.006 | n/a | 0.076 | 0.000 | n/a | n/a | 0.122 | 0.000 | 0.000 | 0.122 | gw-r/thread-49/journal/page | none observed |

## P3 / L64 / read (104 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.755 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.762 | 200.819 | 0.008 | n/a | 0.063 | 0.000 | n/a | n/a | 0.138 | 0.000 | 0.000 | 0.138 |
| p99 | 204.591 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.649 | 201.683 | 1.699 | n/a | 0.133 | 0.000 | n/a | n/a | 0.335 | 0.000 | 0.000 | 0.335 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec00000000000001b0 | 232.327 | 0.000 | n/a | 0.000 | 0.000 | 31.248 | 200.833 | 0.007 | n/a | 0.066 | 0.000 | n/a | n/a | 0.173 | 0.000 | 0.000 | 0.173 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec000000000000019f | 204.591 | 0.000 | n/a | 0.000 | 0.000 | 1.282 | 203.045 | 0.013 | n/a | 0.112 | 0.000 | n/a | n/a | 0.139 | 0.000 | 0.000 | 0.139 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec00000000000001f9 | 203.646 | 0.000 | n/a | 0.000 | 0.000 | 1.845 | 201.525 | 0.007 | n/a | 0.129 | 0.000 | n/a | n/a | 0.141 | 0.000 | 0.000 | 0.141 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec00000000000001b3 | 203.143 | 0.000 | n/a | 0.000 | 0.000 | 1.901 | 200.819 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.298 | 0.000 | 0.000 | 0.298 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000001c4 | 202.655 | 0.000 | n/a | 0.000 | 0.000 | 0.731 | 201.683 | 0.010 | n/a | 0.115 | 0.000 | n/a | n/a | 0.116 | 0.000 | 0.000 | 0.116 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec00000000000001a7 | 202.646 | 0.000 | n/a | 0.000 | 0.000 | 0.996 | 201.220 | 0.012 | n/a | 0.177 | 0.000 | n/a | n/a | 0.241 | 0.000 | 0.000 | 0.241 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec00000000000001e1 | 202.546 | 0.000 | n/a | 0.000 | 0.000 | 1.045 | 201.182 | 0.012 | n/a | 0.063 | 0.000 | n/a | n/a | 0.244 | 0.000 | 0.000 | 0.244 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec00000000000001c9 | 202.542 | 0.000 | n/a | 0.000 | 0.000 | 1.222 | 201.035 | 0.010 | n/a | 0.086 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec000000000000019d | 202.524 | 0.000 | n/a | 0.000 | 0.000 | 0.915 | 201.266 | 0.014 | n/a | 0.084 | 0.000 | n/a | n/a | 0.245 | 0.000 | 0.000 | 0.245 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec00000000000001b7 | 202.521 | 0.000 | n/a | 0.000 | 0.000 | 1.017 | 201.237 | 0.023 | n/a | 0.078 | 0.000 | n/a | n/a | 0.166 | 0.000 | 0.000 | 0.166 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000018d | 202.498 | 0.000 | n/a | 0.000 | 0.000 | 1.303 | 200.986 | 0.009 | n/a | 0.071 | 0.000 | n/a | n/a | 0.127 | 0.000 | 0.000 | 0.127 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec00000000000001d0 | 202.495 | 0.000 | n/a | 0.000 | 0.000 | 0.798 | 201.444 | 0.012 | n/a | 0.097 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec00000000000001a2 | 202.464 | 0.000 | n/a | 0.000 | 0.000 | 1.055 | 201.135 | 0.011 | n/a | 0.073 | 0.000 | n/a | n/a | 0.189 | 0.000 | 0.000 | 0.189 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000194 | 202.394 | 0.000 | n/a | 0.000 | 0.000 | 0.807 | 201.371 | 0.007 | n/a | 0.094 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec00000000000001bf | 202.384 | 0.000 | n/a | 0.000 | 0.000 | 0.884 | 201.246 | 0.012 | n/a | 0.096 | 0.000 | n/a | n/a | 0.145 | 0.000 | 0.000 | 0.145 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec00000000000001df | 202.358 | 0.000 | n/a | 0.000 | 0.000 | 1.107 | 201.049 | 0.009 | n/a | 0.076 | 0.000 | n/a | n/a | 0.117 | 0.000 | 0.000 | 0.117 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec00000000000001dc | 202.357 | 0.000 | n/a | 0.000 | 0.000 | 1.341 | 200.800 | 0.013 | n/a | 0.048 | 0.000 | n/a | n/a | 0.156 | 0.000 | 0.000 | 0.156 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec00000000000001d5 | 202.323 | 0.000 | n/a | 0.000 | 0.000 | 1.032 | 201.045 | 0.009 | n/a | 0.089 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec00000000000001a6 | 202.254 | 0.000 | n/a | 0.000 | 0.000 | 1.003 | 201.028 | 0.007 | n/a | 0.097 | 0.000 | n/a | n/a | 0.119 | 0.000 | 0.000 | 0.119 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000191 | 202.251 | 0.000 | n/a | 0.000 | 0.000 | 1.169 | 200.781 | 0.007 | n/a | 0.071 | 0.000 | n/a | n/a | 0.222 | 0.000 | 0.000 | 0.222 | gw-r/thread-47/journal/page | none observed |

## P3 / L256 / read (100 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 201.801 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.779 | 200.843 | 0.007 | n/a | 0.062 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 |
| p99 | 205.540 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 4.616 | 201.400 | 3.081 | n/a | 0.127 | 0.000 | n/a | n/a | 0.368 | 0.000 | 0.000 | 0.368 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec0000000000000211 | 226.258 | 0.000 | n/a | 0.000 | 0.000 | 5.931 | 219.986 | 0.064 | n/a | 0.084 | 0.000 | n/a | n/a | 0.193 | 0.000 | 0.000 | 0.193 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000241 | 205.540 | 0.000 | n/a | 0.000 | 0.000 | 4.616 | 200.737 | 0.006 | n/a | 0.051 | 0.000 | n/a | n/a | 0.131 | 0.000 | 0.000 | 0.131 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000026b | 204.959 | 0.000 | n/a | 0.000 | 0.000 | 3.452 | 201.282 | 0.011 | n/a | 0.090 | 0.000 | n/a | n/a | 0.124 | 0.000 | 0.000 | 0.124 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000223 | 204.343 | 0.000 | n/a | 0.000 | 0.000 | 3.234 | 200.869 | 0.008 | n/a | 0.073 | 0.000 | n/a | n/a | 0.158 | 0.000 | 0.000 | 0.158 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec000000000000023d | 203.334 | 0.000 | n/a | 0.000 | 0.000 | 2.297 | 200.791 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000247 | 203.128 | 0.000 | n/a | 0.000 | 0.000 | 1.132 | 201.155 | 0.009 | n/a | 0.083 | 0.000 | n/a | n/a | 0.749 | 0.000 | 0.000 | 0.749 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000234 | 202.918 | 0.000 | n/a | 0.000 | 0.000 | 1.879 | 200.789 | 0.009 | n/a | 0.063 | 0.000 | n/a | n/a | 0.178 | 0.000 | 0.000 | 0.178 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec000000000000023e | 202.663 | 0.000 | n/a | 0.000 | 0.000 | 1.306 | 201.028 | 0.008 | n/a | 0.093 | 0.000 | n/a | n/a | 0.229 | 0.000 | 0.000 | 0.229 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000025b | 202.614 | 0.000 | n/a | 0.000 | 0.000 | 1.359 | 200.959 | 0.006 | n/a | 0.068 | 0.000 | n/a | n/a | 0.221 | 0.000 | 0.000 | 0.221 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000022d | 202.570 | 0.000 | n/a | 0.000 | 0.000 | 1.200 | 201.168 | 0.012 | n/a | 0.081 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000270 | 202.563 | 0.000 | n/a | 0.000 | 0.000 | 1.153 | 201.104 | 0.007 | n/a | 0.085 | 0.000 | n/a | n/a | 0.214 | 0.000 | 0.000 | 0.214 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000217 | 202.553 | 0.000 | n/a | 0.000 | 0.000 | 0.879 | 201.333 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.249 | 0.000 | 0.000 | 0.249 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000265 | 202.540 | 0.000 | n/a | 0.000 | 0.000 | 0.984 | 201.280 | 0.010 | n/a | 0.085 | 0.000 | n/a | n/a | 0.180 | 0.000 | 0.000 | 0.180 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec000000000000021a | 202.511 | 0.000 | n/a | 0.000 | 0.000 | 1.194 | 201.116 | 0.015 | n/a | 0.078 | 0.000 | n/a | n/a | 0.108 | 0.000 | 0.000 | 0.108 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000021b | 202.471 | 0.000 | n/a | 0.000 | 0.000 | 1.242 | 201.044 | 0.010 | n/a | 0.065 | 0.000 | n/a | n/a | 0.110 | 0.000 | 0.000 | 0.110 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000266 | 202.421 | 0.000 | n/a | 0.000 | 0.000 | 0.868 | 201.359 | 0.006 | n/a | 0.083 | 0.000 | n/a | n/a | 0.105 | 0.000 | 0.000 | 0.105 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000216 | 202.388 | 0.000 | n/a | 0.000 | 0.000 | 0.922 | 201.209 | 0.012 | n/a | 0.077 | 0.000 | n/a | n/a | 0.168 | 0.000 | 0.000 | 0.168 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec000000000000022f | 202.345 | 0.000 | n/a | 0.000 | 0.000 | 0.941 | 201.164 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.161 | 0.000 | 0.000 | 0.161 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000263 | 202.340 | 0.000 | n/a | 0.000 | 0.000 | 1.261 | 200.885 | 0.007 | n/a | 0.058 | 0.000 | n/a | n/a | 0.129 | 0.000 | 0.000 | 0.129 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000226 | 202.329 | 0.000 | n/a | 0.000 | 0.000 | 1.080 | 201.034 | 0.006 | n/a | 0.077 | 0.000 | n/a | n/a | 0.132 | 0.000 | 0.000 | 0.132 | gw-r/thread-50/journal/page | none observed |

## P3 / tail / read (280 retained requests)

| quantile | wallMs | cpuRuntimeMs | cpuRunqueueMs | cpuScopeWallMs | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | typescriptMs | typescriptShare | unexplainedMs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| p50 | 83.600 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 0.511 | 82.915 | 0.007 | n/a | 0.030 | 0.000 | n/a | n/a | 0.123 | 0.000 | 0.000 | 0.123 |
| p99 | 202.236 | n/a | n/a | n/a | 0.000 | n/a | 0.000 | 0.000 | 2.835 | 201.111 | 1.124 | n/a | 0.085 | 0.000 | n/a | n/a | 49.892 | 0.000 | 0.000 | 49.892 |

| slowest trace | wall ms | typescript | event-loop | typescript-gc | driver-queue | network | gateway | gateway-queue | gateway-gc | peer-call | peer-wait | transactor | postgres | unknown | TypeScript ms | TypeScript share | unexplained ms | largest step | overlapping same-thread work |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 829385578d4a11ec0000000000000ea3 | 202.808 | 0.000 | n/a | 0.000 | 0.000 | 1.750 | 200.844 | 0.009 | n/a | 0.070 | 0.000 | n/a | n/a | 0.135 | 0.000 | 0.000 | 0.135 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000e9f | 202.408 | 0.000 | n/a | 0.000 | 0.000 | 1.321 | 200.809 | 0.007 | n/a | 0.041 | 0.000 | n/a | n/a | 0.230 | 0.000 | 0.000 | 0.230 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec000000000000028b | 202.236 | 0.000 | n/a | 0.000 | 0.000 | 0.933 | 201.000 | 0.008 | n/a | 0.085 | 0.000 | n/a | n/a | 0.210 | 0.000 | 0.000 | 0.210 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000274 | 202.173 | 0.000 | n/a | 0.000 | 0.000 | 0.775 | 201.159 | 0.010 | n/a | 0.084 | 0.000 | n/a | n/a | 0.144 | 0.000 | 0.000 | 0.144 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000282 | 202.128 | 0.000 | n/a | 0.000 | 0.000 | 0.936 | 200.983 | 0.006 | n/a | 0.069 | 0.000 | n/a | n/a | 0.134 | 0.000 | 0.000 | 0.134 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000287 | 202.083 | 0.000 | n/a | 0.000 | 0.000 | 0.924 | 200.909 | 0.010 | n/a | 0.068 | 0.000 | n/a | n/a | 0.174 | 0.000 | 0.000 | 0.174 | gw-r/thread-50/journal/page | none observed |
| 829385578d4a11ec0000000000000eb8 | 202.074 | 0.000 | n/a | 0.000 | 0.000 | 0.814 | 201.050 | 0.065 | n/a | 0.042 | 0.000 | n/a | n/a | 0.103 | 0.000 | 0.000 | 0.103 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec000000000000028a | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 0.771 | 200.918 | 0.006 | n/a | 0.066 | 0.000 | n/a | n/a | 0.266 | 0.000 | 0.000 | 0.266 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000ed1 | 202.027 | 0.000 | n/a | 0.000 | 0.000 | 1.310 | 200.573 | 0.008 | n/a | 0.039 | 0.000 | n/a | n/a | 0.097 | 0.000 | 0.000 | 0.097 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000f0c | 201.959 | 0.000 | n/a | 0.000 | 0.000 | 0.724 | 200.966 | 0.014 | n/a | 0.068 | 0.000 | n/a | n/a | 0.187 | 0.000 | 0.000 | 0.187 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000f04 | 201.945 | 0.000 | n/a | 0.000 | 0.000 | 0.818 | 200.896 | 0.010 | n/a | 0.058 | 0.000 | n/a | n/a | 0.163 | 0.000 | 0.000 | 0.163 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000280 | 201.854 | 0.000 | n/a | 0.000 | 0.000 | 0.894 | 200.749 | 0.007 | n/a | 0.054 | 0.000 | n/a | n/a | 0.151 | 0.000 | 0.000 | 0.151 | gw-r/thread-45/journal/page | none observed |
| 829385578d4a11ec0000000000000273 | 201.841 | 0.000 | n/a | 0.000 | 0.000 | 0.663 | 200.927 | 0.007 | n/a | 0.060 | 0.000 | n/a | n/a | 0.185 | 0.000 | 0.000 | 0.185 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000ea4 | 201.835 | 0.000 | n/a | 0.000 | 0.000 | 0.783 | 200.817 | 0.008 | n/a | 0.059 | 0.000 | n/a | n/a | 0.169 | 0.000 | 0.000 | 0.169 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000286 | 201.830 | 0.000 | n/a | 0.000 | 0.000 | 0.558 | 201.045 | 0.010 | n/a | 0.082 | 0.000 | n/a | n/a | 0.136 | 0.000 | 0.000 | 0.136 | gw-r/thread-47/journal/page | none observed |
| 829385578d4a11ec0000000000000f03 | 201.822 | 0.000 | n/a | 0.000 | 0.000 | 0.686 | 200.844 | 0.013 | n/a | 0.063 | 0.000 | n/a | n/a | 0.217 | 0.000 | 0.000 | 0.217 | gw-r/thread-46/journal/page | none observed |
| 829385578d4a11ec0000000000000ec7 | 201.806 | 0.000 | n/a | 0.000 | 0.000 | 0.470 | 201.111 | 0.049 | n/a | 0.027 | 0.000 | n/a | n/a | 0.149 | 0.000 | 0.000 | 0.149 | gw-r/thread-49/journal/page | none observed |
| 829385578d4a11ec0000000000000ec8 | 201.793 | 0.000 | n/a | 0.000 | 0.000 | 1.007 | 200.622 | 0.008 | n/a | 0.041 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-48/journal/page | none observed |
| 829385578d4a11ec0000000000000272 | 201.787 | 0.000 | n/a | 0.000 | 0.000 | 0.495 | 201.078 | 0.009 | n/a | 0.090 | 0.000 | n/a | n/a | 0.115 | 0.000 | 0.000 | 0.115 | gw-r/thread-67/journal/page | none observed |
| 829385578d4a11ec0000000000000e96 | 201.765 | 0.000 | n/a | 0.000 | 0.000 | 0.749 | 200.847 | 0.011 | n/a | 0.058 | 0.000 | n/a | n/a | 0.100 | 0.000 | 0.000 | 0.100 | gw-r/thread-47/journal/page | none observed |

## Visibility limits

Logical read histograms include every finished read; fast reads use a fixed 1/1024 FNV sample, every read at least 50 ms is retained, and new recorder revisions also retain the actual top 20 per phase/thread. Historical runs without top-20 retention show the slowest retained reads. Logical read root wall includes named oracle and intentional straddle waits; target-bar service latency remains in ns-report.json. Worker resource series distinguish isolate heap and process RSS. Linux writer scheduler counters give nanosecond runtime/run-queue deltas for observed synchronous scopes and the sampled phase interval. Other thread telemetry uses /proc CPU ticks. Async request scopes do not have exclusive CPU attribution. GC during remote waits is an ambient overlay and is not charged to TypeScript or gateway own work. GC overlaps and independent thread work are pictured, not inferred from percentiles.

JFR GC/safepoint/thread-park/socket events, transactor callback metrics, PostgreSQL duration/checkpoint/autovacuum logs, pg_stat_activity/wal/io samples, cgroup throttling/pressure/memory/io and Mac CPU/swap are retained when available. Native JFR transaction-function spans, when present, bind the authored Triplex function to its exact peer-await span; the transactor column is this function wall time, not exclusive CPU. Remaining closed-source Datomic internals and individual Postgres statements cannot be causally split without a transaction identifier; the table deliberately leaves these shares unknown. Samples are not request-specific proof. See trace-run.json and collection-errors.txt for unavailable collectors.
